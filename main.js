import * as THREE from 'three';

// 导入模块
import { initThree, updateThree, renderThree, resetParticles, updateBackgroundColor, onWindowResize } from './modules/three.js';
import { initAudio, playHeartbeat, startAlarm, stopAlarm, setAudioEnabled, getAudioEnabled, getIsAlarming } from './modules/audio.js';
import { setupConnectButtons, updateStatus as updateBluetoothStatus, updateConnectButtons as updateBluetoothButtons, updateHeartRateDisplay as updateBluetoothHeartRate, handleHeartRate as handleBluetoothHeartRate, onDisconnected as onBluetoothDisconnected, disconnect as disconnectBluetooth, getConnected } from './modules/bluetooth.js';
import { registerHeartRateCallback, registerConnectionStatusCallback, getCurrentBPM, getLastDataTime, getPulseIntensity, setPulseIntensity, getLastBeatTime, setLastBeatTime } from './modules/heart-rate-manager.js';
import { initLogger, setLogLevel, setModuleLog, clearLogs, LOG_MODULES, LOG_LEVELS } from './modules/logger.js';
import { ecgData, ecgMaxPoints, ecgCanvas, ecgCtx, initECG, updateECGCanvas, clearECGToZero, generateECGValue, drawECG, addECGDataPoint } from './modules/ecg.js';
import { logDebug, getDOMElements } from './modules/utils.js';
import { initStyle, toggleStyle, getCurrentStyle, getBackgroundColor } from './modules/style-manager.js';

// 全局变量
let animationId = null;
let currentStyle = 'style1';
let currentMode = 'light'; // 默认为白天模式
let ecgPhase = 0;
let currentBgType = 'image'; // 默认为图片背景
let currentBgColor = '#000000'; // 默认为黑色背景
let currentBgImage = 'images/bg1.jpg'; // 默认为第一张背景图片

// DOM元素
let elements = {};

// 初始化函数
function init() {
    // 获取DOM元素
    elements = getDOMElements();
    
    // 设置初始模式类到body元素
    document.body.classList.add(`${currentMode}-mode`);
    
    // 初始化样式
    initStyle();
    
    // 初始化ECG
    initECG(currentStyle);
    
    // 初始化Three.js
    initThree('canvas-container', currentStyle);
    
    // 初始化日志模块
    const logContent = document.getElementById('logContent');
    if (logContent) {
        initLogger(logContent);
    }
    
    // 调试：检查elements对象
    console.log('init - elements:', elements);
    
    // 初始化心率显示
    updateBluetoothHeartRate(elements.bpmDisplay, elements.heartRateEl, '--');
    
    // 调试：检查updateBluetoothHeartRate调用
    console.log('init - updateBluetoothHeartRate called');
    
    // 注册心率数据更新回调
    registerHeartRateCallback((bpm) => {
        console.log('Heart rate callback called with bpm:', bpm);
        updateBluetoothHeartRate(elements.bpmDisplay, elements.heartRateEl, bpm !== null ? bpm : '--');
    });
    
    // 注册连接状态更新回调
    registerConnectionStatusCallback((isConnected, statusText) => {
        updateBluetoothStatus(elements.statusText, elements.connectionStatus, elements.statusDot, statusText, isConnected);
    });
    
    // 设置连接按钮
    setupConnectButtons(
        elements.connectBtn,
        elements.connectBtn2,
        initAudio,
        (text, isConnected) => updateBluetoothStatus(elements.statusText, elements.connectionStatus, elements.statusDot, text, isConnected),
        (text, isConnected) => updateBluetoothButtons(elements.connectBtn, elements.connectBtn2, text, isConnected),
        (bpm) => updateBluetoothHeartRate(elements.bpmDisplay, elements.heartRateEl, bpm),
        (type, data, highlight) => logDebug(elements.debugContent, elements.debugCount, type, data, highlight),
        (event) => handleBluetoothHeartRate(event, (bpm) => updateBluetoothHeartRate(elements.bpmDisplay, elements.heartRateEl, bpm), (type, data, highlight) => logDebug(elements.debugContent, elements.debugCount, type, data, highlight), () => stopAlarm(elements.alarmOverlay, elements.statusDot, elements.heartRateEl, (type, data, highlight) => logDebug(elements.debugContent, elements.debugCount, type, data, highlight))),
        () => onBluetoothDisconnected(
            (text, isConnected) => updateBluetoothStatus(elements.statusText, elements.connectionStatus, elements.statusDot, text, isConnected),
            (bpm) => updateBluetoothHeartRate(elements.bpmDisplay, elements.heartRateEl, bpm),
            (text, isConnected) => updateBluetoothButtons(elements.connectBtn, elements.connectBtn2, text, isConnected),
            (type, data, highlight) => logDebug(elements.debugContent, elements.debugCount, type, data, highlight),
            () => stopAlarm(elements.alarmOverlay, elements.statusDot, elements.heartRateEl, (type, data, highlight) => logDebug(elements.debugContent, elements.debugCount, type, data, highlight)),
            clearECGToZero
        )
    );
    
    // 声音开关交互
    [elements.soundToggle, elements.audioToggle].forEach(toggle => {
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                setAudioEnabled(e.target.checked);
            });
        }
    });
    
    // 设置默认背景图片
    if (currentBgType === 'image' && currentBgImage) {
        document.body.style.background = `url('${currentBgImage}') center/cover no-repeat`;
    }
    
    // 开始动画
    animate(0);
    
    // 初始化日志
    logDebug(elements.debugContent, elements.debugCount, 'INIT', '心宿系统初始化完成');
    logDebug(elements.debugContent, elements.debugCount, 'WAIT', '等待蓝牙设备连接...');
}

// 动画循环
function animate(time) {
    animationId = requestAnimationFrame(animate);
    
    const t = time * 0.001;
    
    // ECG 数据更新
    let ecgValue = 0;
    if (getConnected() && getCurrentBPM() !== null && getCurrentBPM() > 0) {
        ecgPhase += 0.016 * (getCurrentBPM() / 60);
        ecgValue = generateECGValue(ecgPhase, getCurrentBPM());
    }
    addECGDataPoint(ecgValue);
    
    // 心跳检测
    if (ecgValue > 0.6 && t - getLastBeatTime() > 0.5) {
        setLastBeatTime(t);
        setPulseIntensity(1);
        
        playHeartbeat();
        
        if (elements.heartRateEl) {
            elements.heartRateEl.classList.remove('alarm');
            elements.heartRateEl.classList.add('pulse');
            setTimeout(() => elements.heartRateEl.classList.remove('pulse'), 150);
        }
    }
    
    // 脉冲衰减
    setPulseIntensity(getPulseIntensity() * 0.95);
    
    // 警报检测（连接状态但5秒无数据）
    if (getConnected() && t - getLastDataTime() > 5) {
        startAlarm(elements.alarmOverlay, elements.statusDot, elements.heartRateEl, (type, data, highlight) => logDebug(elements.debugContent, elements.debugCount, type, data, highlight));
    } else {
        stopAlarm(elements.alarmOverlay, elements.statusDot, elements.heartRateEl, (type, data, highlight) => logDebug(elements.debugContent, elements.debugCount, type, data, highlight));
    }
    
    // 更新 Three.js
    updateThree(time, getPulseIntensity());
    
    // 绘制 ECG
    drawECG(currentStyle, getIsAlarming(), getPulseIntensity());
    
    // 渲染 Three.js
    renderThree();
}

// 样式切换功能
function handleToggleStyle() {
    console.log('handleToggleStyle - before:', currentStyle);
    
    currentStyle = toggleStyle(
        document.body,
        resetParticles,
        initECG,
        updateECGCanvas,
        onWindowResize
    );
    
    console.log('handleToggleStyle - after:', currentStyle);
    
    // 同步音频反馈开关状态
    const audioEnabled = getAudioEnabled();
    if (elements.soundToggle) {
        elements.soundToggle.checked = audioEnabled;
    }
    if (elements.audioToggle) {
        elements.audioToggle.checked = audioEnabled;
    }
    
    // 重新获取DOM元素，确保样式切换后能正确获取所有元素
    elements = getDOMElements();
    
    // 同步心率显示
    const currentBPM = getCurrentBPM();
    console.log('handleToggleStyle - currentBPM:', currentBPM);
    
    if (currentBPM !== null) {
        updateBluetoothHeartRate(elements.bpmDisplay, elements.heartRateEl, currentBPM);
    } else {
        updateBluetoothHeartRate(elements.bpmDisplay, elements.heartRateEl, '--');
    }
    
    console.log('handleToggleStyle - updateBluetoothHeartRate called');
}

// 设置功能
function setupSettings() {
    // 获取设置相关元素
    const settingsPanel = document.getElementById('settings-panel');
    const settingsBtn = document.getElementById('settingsBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const logLevelSelect = document.getElementById('logLevelSelect');
    const clearLogBtn = document.getElementById('clearLogBtn');
    
    // 模块日志复选框
    const moduleLogCheckboxes = {
        bluetooth: document.getElementById('logBluetooth'),
        audio: document.getElementById('logAudio'),
        ecg: document.getElementById('logECG'),
        three: document.getElementById('logThree'),
        style: document.getElementById('logStyle')
    };
    
    // 日志显示开关
    const logDisplayCheckbox = document.getElementById('logDisplay');
    const logPanel = document.getElementById('log-panel');
    
    // 界面设置元素
    const darkModeToggle = document.getElementById('darkModeToggle');
    const interfaceOptions = document.querySelectorAll('.interface-option');
    
    // 背景设置元素
    const bgTypeSelect = document.getElementById('bgTypeSelect');
    const bgColorPicker = document.getElementById('bgColorPicker');
    const bgImageUrl = document.getElementById('bgImageUrl');
    const bgLocalImageSelect = document.getElementById('bgLocalImageSelect');
    
    // 显示设置面板
    function showSettings() {
        if (settingsPanel) {
            settingsPanel.classList.add('show');
        }
    }
    
    // 隐藏设置面板
    function hideSettings() {
        if (settingsPanel) {
            settingsPanel.classList.remove('show');
        }
    }
    
    // 绑定设置按钮点击事件
    if (settingsBtn) {
        settingsBtn.addEventListener('click', showSettings);
    }
    
    // 绑定关闭按钮点击事件
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', hideSettings);
    }
    
    // 绑定日志级别变更事件
    if (logLevelSelect) {
        logLevelSelect.addEventListener('change', (e) => {
            setLogLevel(e.target.value);
        });
    }
    
    // 绑定模块日志复选框变更事件
    Object.entries(moduleLogCheckboxes).forEach(([module, checkbox]) => {
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                setModuleLog(module, e.target.checked);
            });
        }
    });
    
    // 绑定清空日志按钮点击事件
    if (clearLogBtn) {
        clearLogBtn.addEventListener('click', clearLogs);
    }
    
    // 绑定日志显示开关事件
    if (logDisplayCheckbox && logPanel) {
        // 初始化日志面板显示状态
        function updateLogPanelDisplay() {
            if (logDisplayCheckbox.checked) {
                logPanel.style.display = 'block';
            } else {
                logPanel.style.display = 'none';
            }
        }
        
        // 初始化显示状态
        updateLogPanelDisplay();
        
        // 绑定变更事件
        logDisplayCheckbox.addEventListener('change', updateLogPanelDisplay);
    }
    
    // 绑定设置导航切换事件
    const settingsNavItems = document.querySelectorAll('.settings-nav-item');
    settingsNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            if (section) {
                // 更新导航项状态
                settingsNavItems.forEach(navItem => navItem.classList.remove('active'));
                item.classList.add('active');
                
                // 显示对应的设置部分
                const sections = ['interface', 'background', 'logs'];
                sections.forEach(s => {
                    const sectionElement = document.getElementById(`${s}-section`);
                    if (sectionElement) {
                        sectionElement.style.display = s === section ? 'block' : 'none';
                    }
                });
            }
        });
    });
    
    // 绑定白天/黑夜模式切换事件
    if (darkModeToggle) {
        // 初始化darkModeToggle状态
        darkModeToggle.checked = currentMode === 'dark';
        
        darkModeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.classList.remove('light-mode');
                document.body.classList.add('dark-mode');
                currentMode = 'dark';
            } else {
                document.body.classList.remove('dark-mode');
                document.body.classList.add('light-mode');
                currentMode = 'light';
            }
            // 更新Three.js背景
            updateBackgroundColor();
            // 同步按钮UI
            updateButtonUI();
        });
    }
    
    // 绑定界面样式选择事件
    interfaceOptions.forEach(option => {
        option.addEventListener('click', () => {
            const style = option.dataset.style;
            if (style) {
                // 移除所有选项的选中状态
                interfaceOptions.forEach(opt => opt.classList.remove('selected'));
                // 添加当前选项的选中状态
                option.classList.add('selected');
                // 切换样式
                currentStyle = toggleStyle(
                    document.body,
                    resetParticles,
                    initECG,
                    updateECGCanvas,
                    onWindowResize
                );
                // 同步按钮UI
                updateButtonUI();
            }
        });
    });
    
    // 更新按钮UI函数
    function updateButtonUI() {
        const buttons = document.querySelectorAll('.connect-btn');
        buttons.forEach(button => {
            button.style.background = 'transparent';
            button.style.border = '1px solid var(--accent)';
            button.style.color = 'var(--fg)';
        });
    }
    
    // 初始化按钮UI
    updateButtonUI();
    
    // 初始化背景设置
    if (bgTypeSelect) {
        // 设置默认背景类型
        bgTypeSelect.value = currentBgType;
        // 显示或隐藏对应的设置项
        const bgColorGroup = document.querySelector('.bg-color-group');
        const bgImageGroup = document.querySelector('.bg-image-group');
        if (bgColorGroup && bgImageGroup) {
            if (currentBgType === 'color') {
                bgColorGroup.style.display = 'block';
                bgImageGroup.style.display = 'none';
            } else {
                bgColorGroup.style.display = 'none';
                bgImageGroup.style.display = 'block';
            }
        }
        
        // 绑定背景类型选择事件
        bgTypeSelect.addEventListener('change', (e) => {
            currentBgType = e.target.value;
            // 显示或隐藏对应的设置项
            const bgColorGroup = document.querySelector('.bg-color-group');
            const bgImageGroup = document.querySelector('.bg-image-group');
            if (bgColorGroup && bgImageGroup) {
                if (currentBgType === 'color') {
                    bgColorGroup.style.display = 'block';
                    bgImageGroup.style.display = 'none';
                    // 设置纯色背景
                    document.body.style.background = currentBgColor;
                    updateBackgroundColor(currentBgColor);
                } else {
                    bgColorGroup.style.display = 'none';
                    bgImageGroup.style.display = 'block';
                    // 设置图片背景
                    if (currentBgImage) {
                        document.body.style.background = `url('${currentBgImage}') center/cover no-repeat`;
                    }
                }
            }
        });
    }
    
    // 初始化本地图片选择器
    initLocalImageSelector();
    
    // 设置默认本地图片
    if (bgLocalImageSelect) {
        bgLocalImageSelect.value = currentBgImage;
    }
    
    // 绑定背景颜色选择事件
    if (bgColorPicker) {
        bgColorPicker.addEventListener('change', (e) => {
            currentBgColor = e.target.value;
            if (currentBgType === 'color') {
                document.body.style.background = currentBgColor;
                updateBackgroundColor(currentBgColor);
            }
        });
    }
    
    // 绑定背景图片URL输入事件
    if (bgImageUrl) {
        bgImageUrl.addEventListener('change', (e) => {
            currentBgImage = e.target.value;
            if (currentBgType === 'image' && currentBgImage) {
                document.body.style.background = `url('${currentBgImage}') center/cover no-repeat`;
            }
        });
    }
    
    // 加载本地图片
    function loadLocalImages() {
        // 这里可以添加加载本地图片的代码
        // 由于安全限制，浏览器无法直接访问本地文件系统
        // 可以通过input[type="file"]让用户选择图片
    }
    
    // 初始化本地图片选择器
    loadLocalImages();
    
    // 设置面板拖动功能
    let isDragging = false;
    let startX, startY;
    let startLeft, startTop;
    let dragFrameId = null;
    
    if (settingsPanel) {
        // 为设置面板头部添加拖动事件
        const settingsHeader = settingsPanel.querySelector('.settings-header');
        if (settingsHeader) {
            settingsHeader.addEventListener('mousedown', (e) => {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                
                // 获取当前位置
                const rect = settingsPanel.getBoundingClientRect();
                startLeft = rect.left;
                startTop = rect.top;
                
                // 防止文本选择
                e.preventDefault();
            });
        }
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                // 使用requestAnimationFrame优化拖动性能
                if (!dragFrameId) {
                    dragFrameId = requestAnimationFrame(() => {
                        const dx = e.clientX - startX;
                        const dy = e.clientY - startY;
                        
                        // 计算新位置
                        let newLeft = startLeft + dx;
                        let newTop = startTop + dy;
                        
                        // 限制拖动范围，防止拖出窗口
                        const panelWidth = settingsPanel.offsetWidth;
                        const panelHeight = settingsPanel.offsetHeight;
                        const windowWidth = window.innerWidth;
                        const windowHeight = window.innerHeight;
                        
                        newLeft = Math.max(10, Math.min(windowWidth - panelWidth - 10, newLeft));
                        newTop = Math.max(10, Math.min(windowHeight - panelHeight - 10, newTop));
                        
                        // 设置新位置
                        settingsPanel.style.left = `${newLeft}px`;
                        settingsPanel.style.top = `${newTop}px`;
                        settingsPanel.style.transform = 'none';
                        
                        dragFrameId = null;
                    });
                }
            }
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            if (dragFrameId) {
                cancelAnimationFrame(dragFrameId);
                dragFrameId = null;
            }
        });
    }
    
    // 日志面板功能
    const pinLogBtn = document.getElementById('pinLogBtn');
    const closeLogBtn = document.getElementById('closeLogBtn');
    let isLogDragging = false;
    let logStartX, logStartY;
    let logStartLeft, logStartTop;
    let logDragFrameId = null;
    let isPinned = false; // 移到前面定义
    
    if (pinLogBtn && closeLogBtn && logPanel) {
        // 为日志面板头部添加拖动事件
        const logHeader = logPanel.querySelector('.log-header');
        if (logHeader) {
            logHeader.addEventListener('mousedown', (e) => {
                // 如果面板被固定，则不允许拖动
                if (!isPinned) {
                    isLogDragging = true;
                    logStartX = e.clientX;
                    logStartY = e.clientY;
                    
                    // 获取当前位置
                    const rect = logPanel.getBoundingClientRect();
                    logStartLeft = rect.left;
                    logStartTop = rect.top;
                    
                    // 防止文本选择
                    e.preventDefault();
                }
            });
        }
        
        document.addEventListener('mousemove', (e) => {
            if (isLogDragging) {
                // 使用requestAnimationFrame优化拖动性能
                if (!logDragFrameId) {
                    logDragFrameId = requestAnimationFrame(() => {
                        const dx = e.clientX - logStartX;
                        const dy = e.clientY - logStartY;
                        
                        // 计算新位置
                        let newLeft = logStartLeft + dx;
                        let newTop = logStartTop + dy;
                        
                        // 限制拖动范围，防止拖出窗口
                        const panelWidth = logPanel.offsetWidth;
                        const panelHeight = logPanel.offsetHeight;
                        const windowWidth = window.innerWidth;
                        const windowHeight = window.innerHeight;
                        
                        // 获取详细信息栏的位置和高度
                        const footer = document.querySelector('footer');
                        let maxTop = windowHeight - panelHeight - 10;
                        
                        if (footer) {
                            // 计算详细信息栏的顶部位置
                            const footerRect = footer.getBoundingClientRect();
                            // 确保面板底部不会超过详细信息栏的顶部（分界线那里）
                            maxTop = footerRect.top - panelHeight - 10;
                        }
                        
                        newLeft = Math.max(10, Math.min(windowWidth - panelWidth - 10, newLeft));
                        newTop = Math.max(10, Math.min(maxTop, newTop));
                        
                        // 设置新位置
                        logPanel.style.left = `${newLeft}px`;
                        logPanel.style.top = `${newTop}px`;
                        logPanel.style.right = 'auto';
                        logPanel.style.bottom = 'auto';
                        
                        logDragFrameId = null;
                    });
                }
            }
        });
        
        document.addEventListener('mouseup', () => {
            isLogDragging = false;
            if (logDragFrameId) {
                cancelAnimationFrame(logDragFrameId);
                logDragFrameId = null;
            }
        });
        
        // 图钉功能
        pinLogBtn.addEventListener('click', () => {
            isPinned = !isPinned;
            if (isPinned) {
                pinLogBtn.textContent = '📌';
                pinLogBtn.classList.add('pinned');
            } else {
                pinLogBtn.textContent = '📎';
                pinLogBtn.classList.remove('pinned');
            }
        });
        
        // 关闭功能
        closeLogBtn.addEventListener('click', () => {
            if (logPanel) {
                logPanel.style.display = 'none';
                if (logDisplayCheckbox) {
                    logDisplayCheckbox.checked = false;
                }
            }
        });
    }
}

// 初始化本地图片选择器
function initLocalImageSelector() {
    const bgLocalImageSelect = document.getElementById('bgLocalImageSelect');
    if (bgLocalImageSelect) {
        // 添加本地图片选项
        const images = [
            { value: '', text: '选择本地图片' },
            { value: 'images/bg1.jpg', text: '背景 1' },
            { value: 'images/bg2.jpg', text: '背景 2' },
            { value: 'images/bg3.jpg', text: '背景 3' }
        ];
        
        // 清空现有的选项
        bgLocalImageSelect.innerHTML = '';
        
        images.forEach(image => {
            const option = document.createElement('option');
            option.value = image.value;
            option.textContent = image.text;
            bgLocalImageSelect.appendChild(option);
        });
        
        // 绑定选择事件
        bgLocalImageSelect.addEventListener('change', (e) => {
            const imageUrl = e.target.value;
            if (imageUrl) {
                currentBgImage = imageUrl;
                if (currentBgType === 'image') {
                    document.body.style.background = `url('${currentBgImage}') center/cover no-repeat`;
                }
            }
        });
    }
}

// 将handleToggleStyle暴露到全局作用域，以便HTML中的onclick可以调用
window.toggleStyle = handleToggleStyle;

// 将其他需要的函数暴露到全局作用域
window.setupSettings = setupSettings;

// 启动初始化 - 确保DOM完全加载后再执行
document.addEventListener('DOMContentLoaded', () => {
    init();
    setupSettings();
});

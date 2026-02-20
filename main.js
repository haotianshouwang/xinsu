import * as THREE from 'three';

// 导入模块
import { initThree, updateThree, renderThree, resetParticles, updateBackgroundColor, onWindowResize, setParticleEffect, setParticleColor, setParticleCount, setParticleSize } from './modules/three.js';
import { initAudio, playHeartbeat, startAlarm, stopAlarm, setAudioEnabled, getAudioEnabled, getIsAlarming } from './modules/audio.js';
import { setupConnectButtons, updateStatus as updateBluetoothStatus, updateConnectButtons as updateBluetoothButtons, updateHeartRateDisplay as updateBluetoothHeartRate, handleHeartRate as handleBluetoothHeartRate, onDisconnected as onBluetoothDisconnected, disconnect as disconnectBluetooth, getConnected } from './modules/bluetooth.js';
import { registerHeartRateCallback, registerConnectionStatusCallback, getCurrentBPM, getLastDataTime, getPulseIntensity, setPulseIntensity, getLastBeatTime, setLastBeatTime } from './modules/heart-rate-manager.js';
import { initLogger, setLogLevel, setModuleLog, clearLogs, LOG_MODULES, LOG_LEVELS } from './modules/logger.js';
import { ecgData, ecgMaxPoints, ecgCanvas, ecgCtx, initECG, updateECGCanvas, clearECGToZero, generateECGValue, drawECG, addECGDataPoint, setEcgConfig, getEcgConfig, randomizeEcgConfig } from './modules/ecg.js';
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
let originalBgType = 'image'; // 存储原始背景类型
let originalBgImage = 'images/bg1.jpg'; // 存储原始背景图片
let originalBgColor = '#000000'; // 存储原始背景颜色
let isNightModeBackground = false; // 标记是否为黑夜模式背景

// DOM元素
let elements = {};

// 更新心率显示位置
function updateHeartRatePosition(position) {
    const heartRateSection = document.querySelector('.heart-rate-section');
    if (heartRateSection) {
        // 重置所有位置类
        heartRateSection.classList.remove('position-top', 'position-bottom', 'position-left', 'position-right', 'position-center');
        // 添加新的位置类
        heartRateSection.classList.add(`position-${position}`);
    }
}

// 更新心率显示样式
function updateHeartRateStyle(style) {
    const heartRateDisplay = document.querySelector('.heart-rate-display');
    if (heartRateDisplay) {
        // 重置所有样式类
        heartRateDisplay.classList.remove('style-digital', 'style-analog', 'style-3d', 'style-pulse');
        // 添加新的样式类
        heartRateDisplay.classList.add(`style-${style}`);
    }
}

// 更新心率显示颜色
function updateHeartRateColor(color) {
    const bpmDisplay = document.getElementById('bpm-display');
    if (bpmDisplay) {
        bpmDisplay.style.color = color;
    }
}

// 更新心率显示字体大小
function updateHeartRateSize(size) {
    const bpmDisplay = document.getElementById('bpm-display');
    if (bpmDisplay) {
        bpmDisplay.style.fontSize = `${size}px`;
    }
}

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
    
    // 默认将心率显示位置设置为左侧
    updateHeartRatePosition('left');
    // 更新选择框的值
    const heartRatePosition = document.getElementById('heartRatePosition');
    if (heartRatePosition) {
        heartRatePosition.value = 'left';
    }
    
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
        updateBluetoothStatus(elements.statusText, elements.connectionStatus, elements.statusDot, statusText, isConnected, elements.statusIndicator);
    });
    
    // 设置连接按钮
    setupConnectButtons(
        elements.connectBtn,
        elements.connectBtn2,
        initAudio,
        (text, isConnected) => updateBluetoothStatus(elements.statusText, elements.connectionStatus, elements.statusDot, text, isConnected, elements.statusIndicator),
        (text, isConnected) => updateBluetoothButtons(elements.connectBtn, elements.connectBtn2, text, isConnected),
        (bpm) => updateBluetoothHeartRate(elements.bpmDisplay, elements.heartRateEl, bpm),
        (type, data, highlight) => logDebug(elements.debugContent, elements.debugCount, type, data, highlight),
        (event) => handleBluetoothHeartRate(event, (bpm) => updateBluetoothHeartRate(elements.bpmDisplay, elements.heartRateEl, bpm), (type, data, highlight) => logDebug(elements.debugContent, elements.debugCount, type, data, highlight), () => stopAlarm(elements.alarmOverlay, elements.statusDot, elements.heartRateEl, (type, data, highlight) => logDebug(elements.debugContent, elements.debugCount, type, data, highlight))),
        () => onBluetoothDisconnected(
            (text, isConnected) => updateBluetoothStatus(elements.statusText, elements.connectionStatus, elements.statusDot, text, isConnected, elements.statusIndicator),
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

// 样式切换功能 - 现在始终保持style1
function handleToggleStyle() {
    console.log('handleToggleStyle - currentStyle:', currentStyle);
    
    // 确保始终使用style1
    currentStyle = 'style1';
    
    // 重置粒子系统
    resetParticles(currentStyle);
    
    // 重新初始化ECG
    initECG(currentStyle);
    
    // 更新ECG画布
    updateECGCanvas();
    
    // 处理窗口大小调整
    onWindowResize();
    
    // 同步音频反馈开关状态
    const audioEnabled = getAudioEnabled();
    if (elements.soundToggle) {
        elements.soundToggle.checked = audioEnabled;
    }
    if (elements.audioToggle) {
        elements.audioToggle.checked = audioEnabled;
    }
    
    // 重新获取DOM元素
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
                const sections = ['interface', 'background', 'effects', 'ecg', 'heart-rate', 'theme', 'logs'];
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
                // 进入黑夜模式
                document.body.classList.remove('light-mode');
                document.body.classList.add('dark-mode');
                currentMode = 'dark';
                
                // 只有在非黑夜模式背景时才保存原始设置
                if (!isNightModeBackground) {
                    originalBgType = currentBgType;
                    originalBgImage = currentBgImage;
                    originalBgColor = currentBgColor;
                    console.log('进入黑夜模式 - 保存原始背景:', { originalBgType, originalBgImage, originalBgColor });
                }
                
                // 切换到黑色背景
                currentBgType = 'color';
                currentBgColor = '#000000';
                document.body.style.background = currentBgColor;
                updateBackgroundColor(currentBgColor);
                isNightModeBackground = true;
                console.log('进入黑夜模式 - 应用黑色背景');
                
                // 更新背景类型选择器
                const bgTypeSelect = document.getElementById('bgTypeSelect');
                if (bgTypeSelect) {
                    bgTypeSelect.value = currentBgType;
                    // 显示或隐藏对应的设置项
                    const bgColorGroup = document.querySelector('.bg-color-group');
                    const bgImageGroup = document.querySelector('.bg-image-group');
                    if (bgColorGroup && bgImageGroup) {
                        bgColorGroup.style.display = 'block';
                        bgImageGroup.style.display = 'none';
                    }
                }
            } else {
                // 退出黑夜模式，恢复原始设置
                document.body.classList.remove('dark-mode');
                document.body.classList.add('light-mode');
                currentMode = 'light';
                
                // 恢复原始背景设置
                currentBgType = originalBgType;
                currentBgImage = originalBgImage;
                currentBgColor = originalBgColor;
                isNightModeBackground = false;
                console.log('退出黑夜模式 - 恢复原始背景:', { currentBgType, currentBgImage, currentBgColor });
                
                // 重新应用原始背景
                if (currentBgType === 'image' && currentBgImage) {
                    document.body.style.background = `url('${currentBgImage}') center/cover no-repeat`;
                    console.log('退出黑夜模式 - 应用图片背景:', currentBgImage);
                } else if (currentBgType === 'color') {
                    document.body.style.background = currentBgColor;
                    console.log('退出黑夜模式 - 应用颜色背景:', currentBgColor);
                }
                
                // 更新Three.js背景
                updateBackgroundColor();
                
                // 更新背景类型选择器
                const bgTypeSelect = document.getElementById('bgTypeSelect');
                if (bgTypeSelect) {
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
                }
            }
            // 同步按钮UI
            updateButtonUI();
        });
    }
    
    // 绑定界面样式选择事件 - 现在始终使用style1
    interfaceOptions.forEach(option => {
        option.addEventListener('click', () => {
            const style = option.dataset.style;
            if (style) {
                // 移除所有选项的选中状态
                interfaceOptions.forEach(opt => opt.classList.remove('selected'));
                // 只选中style1选项
                const style1Option = document.querySelector('.interface-option[data-style="style1"]');
                if (style1Option) {
                    style1Option.classList.add('selected');
                }
                // 确保始终使用style1
                currentStyle = 'style1';
                // 重置粒子系统
                resetParticles(currentStyle);
                // 重新初始化ECG
                initECG(currentStyle);
                // 更新ECG画布
                updateECGCanvas();
                // 处理窗口大小调整
                onWindowResize();
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
        
        // 确保所有UI元素都使用正确的CSS变量
        const uiElements = document.querySelectorAll('.sound-control, .status-indicator, .logo');
        uiElements.forEach(element => {
            // 移除任何内联样式，让CSS变量生效
            element.style.color = '';
            element.style.background = '';
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
            // 更新原始背景设置（无论当前模式如何）
            originalBgType = currentBgType;
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
                    } else {
                        // 如果没有选择图片，使用默认图片
                        currentBgImage = 'images/bg1.jpg';
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
            // 更新原始背景设置（无论当前模式如何）
            originalBgColor = currentBgColor;
            originalBgType = 'color';
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
            // 更新原始背景设置（无论当前模式如何）
            originalBgImage = currentBgImage;
            originalBgType = 'image';
            if (currentBgType === 'image' && currentBgImage) {
                document.body.style.background = `url('${currentBgImage}') center/cover no-repeat`;
            }
        });
    }
    
    // 绑定壁纸上传事件
    if (document.getElementById('bgImageUpload')) {
        const bgImageUpload = document.getElementById('bgImageUpload');
        const wallpaperGrid = document.getElementById('wallpaperGrid');
        
        // 存储上传的壁纸
        let uploadedWallpapers = [];
        
        // 加载默认壁纸
        function loadDefaultWallpapers() {
            // 项目中的壁纸
            const projectWallpapers = [
                'images/bg1.jpg',
                'images/bg2.jpg',
                'images/bg3.jpg',
                'images/bg4.jpg',
                'images/bg5.jpg',
                'images/bg6.jpg',
                'images/bg7.jpg',
                'images/bg8.jpg',
                'images/bg9.jpg',
                'images/bg10.jpg'
            ];
            
            projectWallpapers.forEach((wallpaper, index) => {
                addWallpaperItem(wallpaper, `project-${index}`);
            });
        }
        
        // 添加壁纸项
        function addWallpaperItem(imageUrl, id) {
            const wallpaperItem = document.createElement('div');
            wallpaperItem.className = 'wallpaper-item';
            wallpaperItem.dataset.id = id;
            
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = '壁纸';
            
            const removeBtn = document.createElement('div');
            removeBtn.className = 'wallpaper-remove';
            removeBtn.textContent = '×';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                removeWallpaperItem(id);
            };
            
            wallpaperItem.appendChild(img);
            wallpaperItem.appendChild(removeBtn);
            
            wallpaperItem.onclick = () => {
                selectWallpaper(imageUrl);
                // 更新选中状态
                document.querySelectorAll('.wallpaper-item').forEach(item => {
                    item.classList.remove('selected');
                });
                wallpaperItem.classList.add('selected');
            };
            
            wallpaperGrid.appendChild(wallpaperItem);
            uploadedWallpapers.push({ id, url: imageUrl });
            
            // 检查是否需要折叠
            checkAndToggleCollapse();
        }
        
        // 移除壁纸项
        function removeWallpaperItem(id) {
            const wallpaperItem = document.querySelector(`.wallpaper-item[data-id="${id}"]`);
            if (wallpaperItem) {
                wallpaperItem.remove();
                uploadedWallpapers = uploadedWallpapers.filter(wallpaper => wallpaper.id !== id);
                checkAndToggleCollapse();
            }
        }
        
        // 选择壁纸
        function selectWallpaper(imageUrl) {
            currentBgImage = imageUrl;
            originalBgImage = imageUrl;
            originalBgType = 'image';
            if (currentBgType === 'image') {
                document.body.style.background = `url('${currentBgImage}') center/cover no-repeat`;
            }
        }
        
        // 检查并切换折叠状态
        function checkAndToggleCollapse() {
            // 移除现有的折叠按钮
            const existingCollapse = document.querySelector('.wallpaper-collapse');
            if (existingCollapse) {
                existingCollapse.remove();
            }
            
            // 如果壁纸数量超过8个，添加折叠按钮
            if (uploadedWallpapers.length > 8) {
                const collapseDiv = document.createElement('div');
                collapseDiv.className = 'wallpaper-collapse';
                
                const collapseBtn = document.createElement('button');
                collapseBtn.className = 'wallpaper-collapse-btn';
                collapseBtn.textContent = '显示全部壁纸';
                
                let isExpanded = false;
                collapseBtn.onclick = () => {
                    isExpanded = !isExpanded;
                    if (isExpanded) {
                        wallpaperGrid.style.maxHeight = '400px';
                        collapseBtn.textContent = '折叠壁纸';
                    } else {
                        wallpaperGrid.style.maxHeight = '250px';
                        collapseBtn.textContent = '显示全部壁纸';
                    }
                };
                
                collapseDiv.appendChild(collapseBtn);
                wallpaperGrid.parentNode.insertBefore(collapseDiv, wallpaperGrid.nextSibling);
            } else {
                // 确保所有壁纸都能显示
                wallpaperGrid.style.maxHeight = '250px';
            }
        }
        
        // 处理文件上传
        bgImageUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const imageUrl = event.target.result;
                    const id = `uploaded-${Date.now()}`;
                    // 添加到壁纸库，不直接应用
                    addWallpaperItem(imageUrl, id);
                    // 提示用户点击壁纸来应用
                    console.log('壁纸已添加到库中，请点击壁纸来应用');
                };
                reader.readAsDataURL(file);
            }
        });
        
        // 初始化加载默认壁纸
        loadDefaultWallpapers();
    }
    
    // 加载本地图片
    function loadLocalImages() {
        // 这里可以添加加载本地图片的代码
        // 由于安全限制，浏览器无法直接访问本地文件系统
        // 可以通过input[type="file"]让用户选择图片
    }
    
    // 绑定效果设置事件
    const particlesToggle = document.getElementById('particlesToggle');
    const particlesEffect = document.getElementById('particlesEffect');
    const particlesColor = document.getElementById('particlesColor');
    const particlesCount = document.getElementById('particlesCount');
    const particlesSize = document.getElementById('particlesSize');
    
    if (particlesToggle) {
        particlesToggle.addEventListener('change', (e) => {
            // 这里可以添加粒子效果开关的逻辑
            console.log('粒子效果:', e.target.checked);
            toggleParticles(e.target.checked);
        });
    }
    
    if (particlesEffect) {
        particlesEffect.addEventListener('change', (e) => {
            // 这里可以添加粒子效果选择的逻辑
            console.log('粒子效果:', e.target.value);
            setParticleEffect(e.target.value);
        });
    }
    
    if (particlesColor) {
        particlesColor.addEventListener('change', (e) => {
            // 这里可以添加粒子颜色的逻辑
            console.log('粒子颜色:', e.target.value);
            setParticleColor(e.target.value);
        });
    }
    
    if (particlesCount) {
        particlesCount.addEventListener('input', (e) => {
            // 这里可以添加粒子数量的逻辑
            console.log('粒子数量:', e.target.value);
            setParticleCount(parseInt(e.target.value));
            // 更新输入框的值
            const particlesCountInput = document.getElementById('particlesCountInput');
            if (particlesCountInput) {
                particlesCountInput.value = e.target.value;
            }
        });
    }
    
    // 绑定粒子数量输入框事件
    const particlesCountInput = document.getElementById('particlesCountInput');
    if (particlesCountInput) {
        particlesCountInput.addEventListener('input', (e) => {
            // 这里可以添加粒子数量的逻辑
            console.log('粒子数量:', e.target.value);
            setParticleCount(parseInt(e.target.value));
            // 更新滑块的值
            const particlesCount = document.getElementById('particlesCount');
            if (particlesCount) {
                particlesCount.value = e.target.value;
            }
        });
    }
    
    if (particlesSize) {
        particlesSize.addEventListener('input', (e) => {
            // 这里可以添加粒子大小的逻辑
            console.log('粒子大小:', e.target.value);
            setParticleSize(parseFloat(e.target.value));
        });
    }
    
    // 绑定ECG设置事件
    const ecgGridColor = document.getElementById('ecgGridColor');
    const ecgGridOpacity = document.getElementById('ecgGridOpacity');
    const ecgGridOpacityValue = document.getElementById('ecgGridOpacityValue');
    const ecgLineColor = document.getElementById('ecgLineColor');
    const ecgLineWidth = document.getElementById('ecgLineWidth');
    const ecgLineWidthValue = document.getElementById('ecgLineWidthValue');
    const ecgPWave = document.getElementById('ecgPWave');
    const ecgPWaveValue = document.getElementById('ecgPWaveValue');
    const ecgQWave = document.getElementById('ecgQWave');
    const ecgQWaveValue = document.getElementById('ecgQWaveValue');
    const ecgRWave = document.getElementById('ecgRWave');
    const ecgRWaveValue = document.getElementById('ecgRWaveValue');
    const ecgSWave = document.getElementById('ecgSWave');
    const ecgSWaveValue = document.getElementById('ecgSWaveValue');
    const ecgTWave = document.getElementById('ecgTWave');
    const ecgTWaveValue = document.getElementById('ecgTWaveValue');
    const ecgJitter = document.getElementById('ecgJitter');
    const ecgJitterValue = document.getElementById('ecgJitterValue');
    const ecgPreset = document.getElementById('ecgPreset');
    const ecgEffect = document.getElementById('ecgEffect');
    const ecgRandomBtn = document.getElementById('ecgRandomBtn');
    
    if (ecgGridColor) {
        ecgGridColor.addEventListener('change', (e) => {
            console.log('ECG表格颜色:', e.target.value);
            setEcgConfig({ gridColor: e.target.value });
        });
    }
    
    if (ecgGridOpacity && ecgGridOpacityValue) {
        ecgGridOpacity.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            ecgGridOpacityValue.textContent = value.toFixed(2);
            setEcgConfig({ gridOpacity: value });
            console.log('ECG表格明显度:', value);
        });
    }
    
    if (ecgLineColor) {
        ecgLineColor.addEventListener('change', (e) => {
            console.log('ECG线条颜色:', e.target.value);
            setEcgConfig({ lineColor: e.target.value });
        });
    }
    
    if (ecgLineWidth && ecgLineWidthValue) {
        ecgLineWidth.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            ecgLineWidthValue.textContent = value.toFixed(1);
            setEcgConfig({ lineWidth: value });
            console.log('ECG线条宽度:', value);
        });
    }
    
    if (ecgPWave && ecgPWaveValue) {
        ecgPWave.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            ecgPWaveValue.textContent = value.toFixed(2);
            setEcgConfig({ pWave: value });
            console.log('ECG P波幅度:', value);
        });
    }
    
    if (ecgQWave && ecgQWaveValue) {
        ecgQWave.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            ecgQWaveValue.textContent = value.toFixed(2);
            setEcgConfig({ qWave: value });
            console.log('ECG Q波幅度:', value);
        });
    }
    
    if (ecgRWave && ecgRWaveValue) {
        ecgRWave.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            ecgRWaveValue.textContent = value.toFixed(2);
            setEcgConfig({ rWave: value });
            console.log('ECG R波幅度:', value);
        });
    }
    
    if (ecgSWave && ecgSWaveValue) {
        ecgSWave.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            ecgSWaveValue.textContent = value.toFixed(2);
            setEcgConfig({ sWave: value });
            console.log('ECG S波幅度:', value);
        });
    }
    
    if (ecgTWave && ecgTWaveValue) {
        ecgTWave.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            ecgTWaveValue.textContent = value.toFixed(2);
            setEcgConfig({ tWave: value });
            console.log('ECG T波幅度:', value);
        });
    }
    
    if (ecgJitter && ecgJitterValue) {
        ecgJitter.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            ecgJitterValue.textContent = value.toFixed(2);
            setEcgConfig({ 抖动: value });
            console.log('ECG抖动强度:', value);
        });
    }
    
    if (ecgPreset) {
        ecgPreset.addEventListener('change', (e) => {
            const preset = e.target.value;
            setEcgConfig({ 预设: preset });
            console.log('ECG预设:', preset);
            // 更新所有波形值
            const config = getEcgConfig();
            if (ecgPWave) ecgPWave.value = config.pWave || 0.15;
            if (ecgPWaveValue) ecgPWaveValue.textContent = (config.pWave || 0.15).toFixed(2);
            if (ecgQWave) ecgQWave.value = config.qWave || -0.1;
            if (ecgQWaveValue) ecgQWaveValue.textContent = (config.qWave || -0.1).toFixed(2);
            if (ecgRWave) ecgRWave.value = config.rWave || 0.8;
            if (ecgRWaveValue) ecgRWaveValue.textContent = (config.rWave || 0.8).toFixed(2);
            if (ecgSWave) ecgSWave.value = config.sWave || -0.2;
            if (ecgSWaveValue) ecgSWaveValue.textContent = (config.sWave || -0.2).toFixed(2);
            if (ecgTWave) ecgTWave.value = config.tWave || 0.25;
            if (ecgTWaveValue) ecgTWaveValue.textContent = (config.tWave || 0.25).toFixed(2);
            if (ecgJitter) ecgJitter.value = config.抖动 || 0.05;
            if (ecgJitterValue) ecgJitterValue.textContent = (config.抖动 || 0.05).toFixed(2);
        });
    }
    
    if (ecgEffect) {
        ecgEffect.addEventListener('change', (e) => {
            const effect = e.target.value;
            setEcgConfig({ 效果: effect });
            console.log('ECG效果:', effect);
        });
    }
    
    if (ecgRandomBtn) {
        ecgRandomBtn.addEventListener('click', () => {
            const config = randomizeEcgConfig();
            // 更新UI
            if (ecgPreset) ecgPreset.value = config.预设;
            if (ecgPWave) ecgPWave.value = config.pWave || 0.15;
            if (ecgPWaveValue) ecgPWaveValue.textContent = (config.pWave || 0.15).toFixed(2);
            if (ecgQWave) ecgQWave.value = config.qWave || -0.1;
            if (ecgQWaveValue) ecgQWaveValue.textContent = (config.qWave || -0.1).toFixed(2);
            if (ecgRWave) ecgRWave.value = config.rWave || 0.8;
            if (ecgRWaveValue) ecgRWaveValue.textContent = (config.rWave || 0.8).toFixed(2);
            if (ecgSWave) ecgSWave.value = config.sWave || -0.2;
            if (ecgSWaveValue) ecgSWaveValue.textContent = (config.sWave || -0.2).toFixed(2);
            if (ecgTWave) ecgTWave.value = config.tWave || 0.25;
            if (ecgTWaveValue) ecgTWaveValue.textContent = (config.tWave || 0.25).toFixed(2);
            if (ecgJitter) ecgJitter.value = config.抖动 || 0.05;
            if (ecgJitterValue) ecgJitterValue.textContent = (config.抖动 || 0.05).toFixed(2);
            console.log('随机生成ECG配置:', config);
        });
    }
    
    // 绑定心率设置事件
    const heartRatePosition = document.getElementById('heartRatePosition');
    const heartRateStyle = document.getElementById('heartRateStyle');
    const heartRateColor = document.getElementById('heartRateColor');
    const heartRateSize = document.getElementById('heartRateSize');
    
    if (heartRatePosition) {
        heartRatePosition.addEventListener('change', (e) => {
            // 这里可以添加心率显示位置的逻辑
            const position = e.target.value;
            console.log('心率显示位置:', position);
            updateHeartRatePosition(position);
        });
    }
    
    if (heartRateStyle) {
        heartRateStyle.addEventListener('change', (e) => {
            // 这里可以添加心率显示样式的逻辑
            const style = e.target.value;
            console.log('心率显示样式:', style);
            updateHeartRateStyle(style);
        });
    }
    
    if (heartRateColor) {
        heartRateColor.addEventListener('change', (e) => {
            // 这里可以添加心率显示颜色的逻辑
            const color = e.target.value;
            console.log('心率显示颜色:', color);
            updateHeartRateColor(color);
        });
    }
    
    if (heartRateSize) {
        heartRateSize.addEventListener('input', (e) => {
            // 这里可以添加心率显示字体大小的逻辑
            const size = e.target.value;
            console.log('心率显示字体大小:', size);
            updateHeartRateSize(size);
        });
    }
    
    // 切换粒子效果显示/隐藏
    function toggleParticles(enabled) {
        const canvasContainer = document.getElementById('canvas-container');
        if (canvasContainer) {
            canvasContainer.style.display = enabled ? 'block' : 'none';
        }
        console.log('粒子效果已', enabled ? '启用' : '禁用');
    }
    
    // 绑定主题设置事件
    const themeColor = document.getElementById('themeColor');
    const secondaryColor = document.getElementById('secondaryColor');
    const footerToggle = document.getElementById('footerToggle');
    
    if (themeColor) {
        themeColor.addEventListener('change', (e) => {
            // 这里可以添加主题颜色的逻辑
            console.log('主题颜色:', e.target.value);
            // 更新CSS变量
            document.documentElement.style.setProperty('--accent', e.target.value);
        });
    }
    
    if (secondaryColor) {
        secondaryColor.addEventListener('change', (e) => {
            // 这里可以添加辅助颜色的逻辑
            console.log('辅助颜色:', e.target.value);
            // 更新CSS变量
            document.documentElement.style.setProperty('--fg', e.target.value);
        });
    }
    
    if (footerToggle) {
        footerToggle.addEventListener('change', (e) => {
            // 这里可以添加详细信息栏显示/隐藏的逻辑
            console.log('显示详细信息栏:', e.target.checked);
            const footer = document.querySelector('footer');
            if (footer) {
                footer.style.display = e.target.checked ? 'block' : 'none';
            }
        });
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
            if (isLogDragging && !isPinned) {
                // 使用requestAnimationFrame优化拖动性能
                if (!logDragFrameId) {
                    logDragFrameId = requestAnimationFrame(() => {
                        const dx = e.clientX - logStartX;
                        const dy = e.clientY - logStartY;
                        
                        // 计算新位置
                        let newLeft = logStartLeft + dx;
                        let newTop = logStartTop + dy;
                        
                        // 日志窗口拖动范围限制（与设置面板保持一致）
                        const panelWidth = logPanel.offsetWidth;
                        const panelHeight = logPanel.offsetHeight;
                        const windowWidth = window.innerWidth;
                        const windowHeight = window.innerHeight;
                        
                        // 限制拖动范围，防止拖出窗口（与设置面板保持一致，留10像素边距）
                        newLeft = Math.max(10, Math.min(windowWidth - panelWidth - 10, newLeft));
                        newTop = Math.max(10, Math.min(windowHeight - panelHeight - 10, newTop));
                        
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
        // 添加本地图片选项（加载更多图片）
        const images = [
            { value: '', text: '选择本地图片' },
            { value: 'images/bg1.jpg', text: '背景 1' },
            { value: 'images/bg2.jpg', text: '背景 2' },
            { value: 'images/bg3.jpg', text: '背景 3' },
            { value: 'images/bg4.jpg', text: '背景 4' },
            { value: 'images/bg5.jpg', text: '背景 5' },
            { value: 'images/bg6.jpg', text: '背景 6' },
            { value: 'images/bg7.jpg', text: '背景 7' },
            { value: 'images/bg8.jpg', text: '背景 8' },
            { value: 'images/bg9.jpg', text: '背景 9' },
            { value: 'images/bg10.jpg', text: '背景 10' }
        ];
        
        // 清空现有的选项
        bgLocalImageSelect.innerHTML = '';
        
        images.forEach(image => {
            const option = document.createElement('option');
            option.value = image.value;
            option.textContent = image.text;
            bgLocalImageSelect.appendChild(option);
        });
        
        // 为选择器添加样式，使其能显示图片预览
        bgLocalImageSelect.style.backgroundSize = '30px 30px';
        bgLocalImageSelect.style.backgroundPosition = '10px center';
        bgLocalImageSelect.style.backgroundRepeat = 'no-repeat';
        bgLocalImageSelect.style.paddingLeft = '50px';
        
        // 绑定选择事件
        bgLocalImageSelect.addEventListener('change', (e) => {
            const imageUrl = e.target.value;
            if (imageUrl) {
                currentBgImage = imageUrl;
                // 更新原始背景设置（无论当前模式如何）
                originalBgImage = currentBgImage;
                originalBgType = 'image';
                if (currentBgType === 'image') {
                    document.body.style.background = `url('${currentBgImage}') center/cover no-repeat`;
                }
                // 更新选择器的背景图片预览
                bgLocalImageSelect.style.backgroundImage = `url('${currentBgImage}')`;
            } else {
                // 重置选择器的背景图片
                bgLocalImageSelect.style.backgroundImage = 'none';
            }
        });
        
        // 初始化选择器的背景图片
        if (currentBgImage) {
            bgLocalImageSelect.value = currentBgImage;
            bgLocalImageSelect.style.backgroundImage = `url('${currentBgImage}')`;
        }
    }
}

// 保存当前背景设置
function saveBackgroundSettings() {
    // 这里可以添加本地存储逻辑，保存用户的背景设置
    // 例如：localStorage.setItem('backgroundSettings', JSON.stringify({ currentBgType, currentBgImage, currentBgColor }));
}

// 加载背景设置
function loadBackgroundSettings() {
    // 这里可以添加本地存储逻辑，加载用户的背景设置
    // 例如：const savedSettings = localStorage.getItem('backgroundSettings');
    // if (savedSettings) {
    //     const settings = JSON.parse(savedSettings);
    //     currentBgType = settings.currentBgType || currentBgType;
    //     currentBgImage = settings.currentBgImage || currentBgImage;
    //     currentBgColor = settings.currentBgColor || currentBgColor;
    // }
    
    // 应用当前背景设置
    if (currentBgType === 'image' && currentBgImage) {
        document.body.style.background = `url('${currentBgImage}') center/cover no-repeat`;
    } else if (currentBgType === 'color') {
        document.body.style.background = currentBgColor;
    }
    
    // 确保原始背景设置与当前设置一致
    originalBgType = currentBgType;
    originalBgImage = currentBgImage;
    originalBgColor = currentBgColor;
}

// 将handleToggleStyle暴露到全局作用域，以便HTML中的onclick可以调用
window.toggleStyle = handleToggleStyle;

// 将其他需要的函数暴露到全局作用域
window.setupSettings = setupSettings;

// 启动初始化 - 确保DOM完全加载后再执行
document.addEventListener('DOMContentLoaded', () => {
    init();
    // 初始化原始背景设置
    originalBgType = currentBgType;
    originalBgImage = currentBgImage;
    originalBgColor = currentBgColor;
    setupSettings();
    loadBackgroundSettings();
});

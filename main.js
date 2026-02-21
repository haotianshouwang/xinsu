import * as THREE from 'three';

// 导入模块
import { initThree, updateThree, renderThree, resetParticles, updateBackgroundColor, onWindowResize, setParticleEffect, setParticleColor, setParticleCount, setParticleSize, setParticleMultiColors, setEffectHeartRateConfig, setParticlesEnabled } from './modules/three.js';
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
let currentMultiColors = {}; // 当前多颜色效果的颜色值
// 上次切换效果的时间戳（用于防抖）
let lastEffectChangeTime = 0;
const effectChangeCooldown = 3000; // 3秒的冷却时间
// 效果与心率绑定配置
let effectHeartRateConfig = {
    enabled: true, // 启用心率绑定
    intensity: 1, // 绑定强度
    mode: 'pulse', // 触发模式: pulse(心跳脉冲), bpm(心率区间), constant(持续效果)
    lowBpmEffect: 'calm', // 低心率效果
    normalBpmEffect: 'normal', // 正常心率效果
    highBpmEffect: 'alert', // 高心率效果
    glowEffect: true, // 启发光效果
    glowColor: '#ff0000', // 发光颜色，默认红色
    glowIntensity: 2.0, // 发光强度，默认2.0（增强紧张感）
    glowMode: 'all' // 发光模式: all(整体), partial(部分), random(随机)
};
// 颜色独立设置标志
let colorIndependenceFlags = {
    particles: false, // 粒子颜色是否独立设置
    heartRate: false, // 心率颜色是否独立设置
    ecg: false // ECG颜色是否独立设置
};

// DOM元素
let elements = {};

// 工具函数：将十六进制颜色转换为RGB
function hexToRgb(hex) {
    // 移除#号
    hex = hex.replace(/^#/, '');
    
    // 处理缩写形式
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }
    
    // 解析RGB值
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    
    return { r, g, b };
}

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
    
    // 初始化效果与心率绑定配置
    setEffectHeartRateConfig(effectHeartRateConfig);
    
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
    [elements.soundToggle, elements.audioToggle, elements.audioToggleSetting].forEach(toggle => {
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                const isEnabled = e.target.checked;
                setAudioEnabled(isEnabled);
                
                // 同步所有音频开关状态
                if (elements.soundToggle) elements.soundToggle.checked = isEnabled;
                if (elements.audioToggle) elements.audioToggle.checked = isEnabled;
                if (elements.audioToggleSetting) elements.audioToggleSetting.checked = isEnabled;
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
    const hasData = getCurrentBPM() !== null && getCurrentBPM() > 0;
    
    if (hasData) {
        ecgPhase += 0.016 * (getCurrentBPM() / 60);
        ecgValue = generateECGValue(ecgPhase, getCurrentBPM());
        addECGDataPoint(ecgValue);
    } else {
        // 没有数据时，清空ECG数据并添加多个0值，确保画直线
        if (ecgData.length > 0 && ecgData.some(val => val !== 0)) {
            clearECGToZero();
        }
        addECGDataPoint(0);
    }
    
    // 心跳检测：只在有数据且不在报警状态时播放心跳声
    if (hasData && !getIsAlarming() && ecgValue > 0.6 && t - getLastBeatTime() > 0.5) {
        let pulseIntensity = 1;
        
        // 根据效果与心率绑定配置调整脉冲强度
        if (effectHeartRateConfig.enabled) {
            pulseIntensity *= effectHeartRateConfig.intensity;
        }
        
        // 无论心率绑定是否启用，都播放心跳音效和更新状态
        setLastBeatTime(t);
        setPulseIntensity(pulseIntensity);
        
        playHeartbeat();
        
        if (elements.heartRateEl) {
            elements.heartRateEl.classList.remove('alarm');
            elements.heartRateEl.classList.add('pulse');
            setTimeout(() => elements.heartRateEl.classList.remove('pulse'), 150);
        }
    }
    
    // 脉冲衰减
    setPulseIntensity(getPulseIntensity() * 0.95);
    
    // 初始化效果参数
    let effectIntensity = 1.0;
    let effectSpeed = 1.0;
    
    // 根据心率区间调整效果（如果启用）
    if (effectHeartRateConfig.enabled && effectHeartRateConfig.mode === 'bpm' && hasData) {
        const bpm = getCurrentBPM();
        
        // 根据心率区间和选择的效果类型调整参数
        let selectedEffect;
        if (bpm < 60) {
            selectedEffect = effectHeartRateConfig.lowBpmEffect;
        } else if (bpm > 100) {
            selectedEffect = effectHeartRateConfig.highBpmEffect;
        } else {
            selectedEffect = effectHeartRateConfig.normalBpmEffect;
        }
        
        // 根据效果类型调整参数
        switch (selectedEffect) {
            case 'calm':
                // 平静模式：节奏很慢，强度较低
                effectIntensity = 0.5;
                effectSpeed = 0.4;
                break;
            case 'normal':
                // 标准模式：节奏适中，强度适中
                effectIntensity = 1.0;
                effectSpeed = 1.0;
                break;
            case 'energetic':
                // 活力模式：节奏较快，强度较高
                effectIntensity = 1.8;
                effectSpeed = 1.6;
                break;
            case 'alert':
                // 警告模式：节奏很快，强度很高
                effectIntensity = 2.5;
                effectSpeed = 2.0;
                break;
            default:
                // 默认模式：标准参数
                effectIntensity = 1.0;
                effectSpeed = 1.0;
                break;
        }
        
        console.log('根据心率区间和效果类型调整效果:', {
            bpm: bpm,
            selectedEffect: selectedEffect,
            effectIntensity: effectIntensity,
            effectSpeed: effectSpeed
        });
    }
    
    // 警报检测：只有设备连接时才报警
    const hasRecentData = t - getLastDataTime() <= 5;
    const isConnected = getConnected();
    
    if (isConnected && (!hasData || !hasRecentData)) {
        startAlarm(elements.alarmOverlay, elements.statusDot, elements.heartRateEl, (type, data, highlight) => logDebug(elements.debugContent, elements.debugCount, type, data, highlight));
        
        // 当没有数据或数据过时，更新心率显示为"--"
        if (elements.bpmDisplay && (elements.bpmDisplay.textContent !== '--' && elements.bpmDisplay.textContent !== '0')) {
            updateBluetoothHeartRate(elements.bpmDisplay, elements.heartRateEl, '--');
        }
    } else {
        stopAlarm(elements.alarmOverlay, elements.statusDot, elements.heartRateEl, (type, data, highlight) => logDebug(elements.debugContent, elements.debugCount, type, data, highlight));
    }
    
    // 更新 Three.js
    // 当禁用心率绑定时，也禁用发光效果相关的动画
    const pulseIntensity = getPulseIntensity();
    // 只有在心率绑定启用时才应用脉冲强度
    const finalPulseIntensity = effectHeartRateConfig.enabled ? pulseIntensity : 0;
    updateThree(time, finalPulseIntensity, effectIntensity, effectSpeed);
    
    // 绘制 ECG
    drawECG(currentStyle, getIsAlarming(), pulseIntensity);
    
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
    if (elements.audioToggleSetting) {
        elements.audioToggleSetting.checked = audioEnabled;
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
            // 延迟一下确保DOM已经更新，然后重新初始化预览窗口
            setTimeout(() => {
                console.log('设置面板显示，重新初始化预览窗口');
                // 每次显示设置面板时都重新初始化预览窗口，确保canvas尺寸正确
                initPreviewWindow();
            }, 100);
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
                const sections = ['appearance', 'display', 'effects', 'heart-rate', 'ecg', 'audio', 'system'];
                sections.forEach(s => {
                    const sectionElement = document.getElementById(`${s}-section`);
                    if (sectionElement) {
                        sectionElement.style.display = s === section ? 'block' : 'none';
                    }
                });
            }
        });
    });
    
    // 绑定主题模式切换事件
    const themeModeRadios = document.querySelectorAll('input[name="theme-mode"]');
    themeModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const mode = e.target.value;
            if (mode === 'dark') {
                // 进入深色模式
                document.body.classList.remove('light-mode');
                document.body.classList.add('dark-mode');
                currentMode = 'dark';
                
                // 只有在非黑夜模式背景时才保存原始设置
                if (!isNightModeBackground) {
                    originalBgType = currentBgType;
                    originalBgImage = currentBgImage;
                    originalBgColor = currentBgColor;
                    console.log('进入深色模式 - 保存原始背景:', { originalBgType, originalBgImage, originalBgColor });
                }
                
                // 切换到黑色背景
                currentBgType = 'color';
                currentBgColor = '#000000';
                document.body.style.background = currentBgColor;
                updateBackgroundColor(currentBgColor);
                isNightModeBackground = true;
                console.log('进入深色模式 - 应用黑色背景');
                
                // 更新背景类型选择器
                updateBgTypeUI('color');
            } else if (mode === 'light') {
                // 进入浅色模式
                document.body.classList.remove('dark-mode');
                document.body.classList.add('light-mode');
                currentMode = 'light';
                
                // 恢复原始背景设置
                currentBgType = originalBgType;
                currentBgImage = originalBgImage;
                currentBgColor = originalBgColor;
                isNightModeBackground = false;
                console.log('进入浅色模式 - 恢复原始背景:', { currentBgType, currentBgImage, currentBgColor });
                
                // 重新应用原始背景
                if (currentBgType === 'image' && currentBgImage) {
                    document.body.style.background = `url('${currentBgImage}') center/cover no-repeat`;
                    console.log('进入浅色模式 - 应用图片背景:', currentBgImage);
                } else if (currentBgType === 'color') {
                    document.body.style.background = currentBgColor;
                    console.log('进入浅色模式 - 应用颜色背景:', currentBgColor);
                }
                
                // 更新Three.js背景
                updateBackgroundColor();
                
                // 更新背景类型选择器
                updateBgTypeUI(currentBgType);
            } else if (mode === 'auto') {
                // 自动模式：根据系统设置
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (prefersDark) {
                    document.body.classList.remove('light-mode');
                    document.body.classList.add('dark-mode');
                    currentMode = 'dark';
                } else {
                    document.body.classList.remove('dark-mode');
                    document.body.classList.add('light-mode');
                    currentMode = 'light';
                }
                console.log('自动模式 - 当前模式:', currentMode);
            }
            // 同步按钮UI
            updateButtonUI();
        });
    });
    
    // 绑定背景类型选择事件
    const bgTypeRadios = document.querySelectorAll('input[name="bg-type"]');
    bgTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const bgType = e.target.value;
            currentBgType = bgType;
            // 更新原始背景设置（无论当前模式如何）
            originalBgType = bgType;
            updateBgTypeUI(bgType);
        });
    });
    
    // 更新背景类型UI
    function updateBgTypeUI(bgType) {
        const bgColorGroup = document.querySelector('.bg-color-group');
        const bgImageGroup = document.querySelector('.bg-image-group');
        const bgTypeRadios = document.querySelectorAll('input[name="bg-type"]');
        
        // 更新radio按钮状态
        bgTypeRadios.forEach(radio => {
            radio.checked = radio.value === bgType;
        });
        
        // 显示或隐藏对应的设置项
        if (bgColorGroup && bgImageGroup) {
            if (bgType === 'color') {
                bgColorGroup.style.display = 'block';
                bgImageGroup.style.display = 'none';
                // 设置纯色背景
                if (!isNightModeBackground) {
                    document.body.style.background = currentBgColor;
                    updateBackgroundColor(currentBgColor);
                }
            } else {
                bgColorGroup.style.display = 'none';
                bgImageGroup.style.display = 'block';
                // 设置图片背景
                if (!isNightModeBackground && currentBgImage) {
                    document.body.style.background = `url('${currentBgImage}') center/cover no-repeat`;
                }
            }
        }
    }
    
    // 绑定心率显示位置切换事件
    const hrPositionRadios = document.querySelectorAll('input[name="hr-position"]');
    hrPositionRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const position = e.target.value;
            updateHeartRatePosition(position);
        });
    });
    
    // 绑定心率显示样式切换事件
    const hrStyleRadios = document.querySelectorAll('input[name="hr-style"]');
    hrStyleRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const style = e.target.value;
            updateHeartRateStyle(style);
        });
    });
    
    // 绑定颜色预设点击事件
    const colorPresets = document.querySelectorAll('.color-preset');
    colorPresets.forEach(preset => {
        // 设置预设按钮的背景颜色
        const color = preset.dataset.color;
        preset.style.backgroundColor = color;
        
        preset.addEventListener('click', () => {
            const themeColorInput = document.getElementById('themeColor');
            if (themeColorInput) {
                themeColorInput.value = color;
                document.body.style.setProperty('--accent', color);
                
                // 转换颜色为RGB格式，用于rgba()函数
                const rgbColor = hexToRgb(color);
                if (rgbColor) {
                    document.body.style.setProperty('--accent-rgb', `${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}`);
                }
                
                // 智能同步颜色：只有在没有独立设置过的情况下才同步
                // 更新粒子效果颜色
                if (!colorIndependenceFlags.particles && window.setParticleColor) {
                    window.setParticleColor(color);
                    // 更新粒子颜色选择器显示值
                    const particlesColor = document.getElementById('particlesColor');
                    if (particlesColor) {
                        particlesColor.value = color;
                    }
                }
                
                // 更新心率颜色
                if (!colorIndependenceFlags.heartRate) {
                    const heartRateColor = document.getElementById('heartRateColor');
                    if (heartRateColor) {
                        heartRateColor.value = color;
                        updateHeartRateColor(color);
                    }
                }
                
                // 更新ECG线条颜色
                if (!colorIndependenceFlags.ecg) {
                    const ecgLineColor = document.getElementById('ecgLineColor');
                    if (ecgLineColor) {
                        ecgLineColor.value = color;
                        setEcgConfig({ lineColor: color });
                    }
                }
            }
        });
    });
    
    // 绑定范围滑块值显示事件
    const rangeSliders = document.querySelectorAll('.range-slider');
    rangeSliders.forEach(slider => {
        const valueDisplay = slider.nextElementSibling;
        if (valueDisplay && valueDisplay.classList.contains('range-value')) {
            slider.addEventListener('input', (e) => {
                valueDisplay.textContent = e.target.value;
            });
        }
    });
    
    // 绑定重置设置按钮事件
    const resetSettingsBtn = document.getElementById('resetSettingsBtn');
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', () => {
            if (confirm('确定要重置所有设置为默认值吗？')) {
                // 重置主题模式
                document.getElementById('theme-light').checked = true;
                document.body.classList.remove('dark-mode');
                document.body.classList.add('light-mode');
                currentMode = 'light';
                
                // 重置背景设置
                currentBgType = 'image';
                currentBgImage = 'images/bg1.jpg';
                currentBgColor = '#000000';
                originalBgType = 'image';
                originalBgImage = 'images/bg1.jpg';
                originalBgColor = '#000000';
                isNightModeBackground = false;
                document.body.style.background = `url('${currentBgImage}') center/cover no-repeat`;
                updateBackgroundColor();
                updateBgTypeUI('image');
                
                // 重置主题颜色
                const themeColorInput = document.getElementById('themeColor');
                if (themeColorInput) {
                    themeColorInput.value = '#ff0033';
                    document.body.style.setProperty('--accent', '#ff0033');
                    document.body.style.setProperty('--accent-rgb', '255, 0, 51');
                    
                    // 重置粒子效果颜色，从粒子颜色选择器获取默认值
                    if (window.setParticleColor) {
                        const particlesColorInput = document.getElementById('particlesColor');
                        const defaultColor = particlesColorInput ? particlesColorInput.value : '#ffffff';
                        window.setParticleColor(defaultColor);
                    }
                }
                
                // 重置心率设置
                const hrPositionRadios = document.querySelectorAll('input[name="hr-position"]');
                hrPositionRadios.forEach(radio => {
                    radio.checked = radio.value === 'left';
                });
                updateHeartRatePosition('left');
                
                const hrStyleRadios = document.querySelectorAll('input[name="hr-style"]');
                hrStyleRadios.forEach(radio => {
                    radio.checked = radio.value === 'digital';
                });
                updateHeartRateStyle('digital');
                
                // 重置音频设置
                const audioToggle = document.getElementById('audioToggle');
                const audioToggleSetting = document.getElementById('audioToggleSetting');
                if (audioToggle) {
                    audioToggle.checked = true;
                }
                if (audioToggleSetting) {
                    audioToggleSetting.checked = true;
                }
                setAudioEnabled(true);
                
                // 重置系统设置
                const logLevelSelect = document.getElementById('logLevelSelect');
                if (logLevelSelect) {
                    logLevelSelect.value = 'basic';
                    setLogLevel('basic');
                }
                
                const logDisplayCheckbox = document.getElementById('logDisplay');
                if (logDisplayCheckbox) {
                    logDisplayCheckbox.checked = false;
                    const logPanel = document.getElementById('log-panel');
                    if (logPanel) {
                        logPanel.style.display = 'none';
                    }
                }
                
                // 重置ECG设置
                setEcgConfig({ 预设: '默认' });
                
                console.log('所有设置已重置为默认值');
            }
        });
    }
    
    // 更新按钮UI函数
    function updateButtonUI() {
        // 按钮样式现在由CSS变量控制，无需内联样式
    }
    
    // 初始化主题模式
    function initThemeMode() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            document.getElementById('theme-dark').checked = true;
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
            currentMode = 'dark';
        } else {
            document.getElementById('theme-light').checked = true;
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
            currentMode = 'light';
        }
    }
    
    // 初始化心率位置
    function initHeartRateSettings() {
        const hrPositionRadios = document.querySelectorAll('input[name="hr-position"]');
        hrPositionRadios.forEach(radio => {
            radio.checked = radio.value === 'left';
        });
        updateHeartRatePosition('left');
        
        const hrStyleRadios = document.querySelectorAll('input[name="hr-style"]');
        hrStyleRadios.forEach(radio => {
            radio.checked = radio.value === 'digital';
        });
        updateHeartRateStyle('digital');
    }
    
    // 初始化设置
    function initSettings() {
        // 初始化主题模式
        initThemeMode();
        
        // 初始化背景设置
        updateBgTypeUI(currentBgType);
        
        // 初始化心率设置
        initHeartRateSettings();
        
        // 初始化主题颜色
        const themeColorInput = document.getElementById('themeColor');
        if (themeColorInput) {
            themeColorInput.value = '#ff0033';
            document.body.style.setProperty('--accent', '#ff0033');
            // 初始化RGB值
            document.body.style.setProperty('--accent-rgb', '255, 0, 51');
            
            // 初始化粒子效果颜色，从粒子颜色选择器获取默认值
            if (window.setParticleColor) {
                const particlesColorInput = document.getElementById('particlesColor');
                const defaultColor = particlesColorInput ? particlesColorInput.value : '#ffffff';
                window.setParticleColor(defaultColor);
            }
        }
        
        // 初始化音频设置
        const audioToggle = document.getElementById('audioToggle');
        const audioToggleSetting = document.getElementById('audioToggleSetting');
        if (audioToggle) {
            audioToggle.checked = true;
        }
        if (audioToggleSetting) {
            audioToggleSetting.checked = true;
        }
        setAudioEnabled(true);
    }
    
    // 初始化设置
    initSettings();
    
    // 初始化本地图片选择器
    initLocalImageSelector();
    
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
    
    // 粒子颜色预设
    const particleColorPresets = [
        { name: '红色', value: '#ff0033' },
        { name: '蓝色', value: '#007bff' },
        { name: '绿色', value: '#28a745' },
        { name: '黄色', value: '#ffc107' },
        { name: '紫色', value: '#6f42c1' },
        { name: '粉色', value: '#e83e8c' },
        { name: '青色', value: '#17a2b8' },
        { name: '橙色', value: '#fd7e14' }
    ];
    
    // 初始化粒子颜色预设按钮
    function initParticleColorPresets() {
        const presetsContainer = document.getElementById('particleColorPresets');
        if (presetsContainer) {
            presetsContainer.innerHTML = '';
            particleColorPresets.forEach(preset => {
                const presetBtn = document.createElement('div');
                presetBtn.className = 'particle-color-preset';
                presetBtn.style.backgroundColor = preset.value;
                presetBtn.title = preset.name;
                presetBtn.addEventListener('click', () => {
                    particlesColor.value = preset.value;
                    particlesColor.dispatchEvent(new Event('change'));
                });
                presetsContainer.appendChild(presetBtn);
            });
        }
    }
    
    // 多颜色效果的颜色配置
    const multiColorEffects = {
        '星云': ['主色', '辅助色'],
        '波浪': ['主色', '辅助色'],
        '银河': ['主色', '辅助色'],
        '极光': ['主色', '辅助色', '第三色']
    };
    
    // 更新多颜色控制按钮
    function updateMultiColorControls(effectType) {
        const additionalContainer = document.getElementById('particleColorAdditional');
        if (!additionalContainer) return;
        
        // 检查是否是多颜色效果
        if (multiColorEffects[effectType]) {
            additionalContainer.style.display = 'block';
            
            // 获取当前粒子主色
            const mainColor = document.getElementById('particlesColor').value;
            
            // 为不同效果设置默认辅助色
            const defaultSecondaryColors = {
                '星云': '#880088',
                '波浪': '#00ffff',
                '银河': '#ffff00',
                '极光': '#00ffff'
            };
            
            // 为不同效果设置默认第三色
            const defaultTertiaryColors = {
                '极光': '#8800ff'
            };
            
            additionalContainer.innerHTML = `
                <h5>效果颜色</h5>
                ${multiColorEffects[effectType].map((colorName, index) => {
                    let defaultValue = '#ff0033';
                    if (index === 0) {
                        // 主色使用当前粒子颜色
                        defaultValue = mainColor;
                    } else if (index === 1) {
                        // 辅助色使用效果默认值
                        defaultValue = defaultSecondaryColors[effectType] || '#ff0033';
                    } else if (index === 2) {
                        // 第三色使用效果默认值
                        defaultValue = defaultTertiaryColors[effectType] || '#ff0033';
                    }
                    return `
                        <div class="particle-color-row">
                            <span class="particle-color-label">${colorName}</span>
                            <input type="color" 
                                   class="particle-color-picker"
                                   id="particleColor${index + 1}"
                                   value="${currentMultiColors[`color${index + 1}`] || defaultValue}">
                        </div>
                    `;
                }).join('')}
            `;
            
            // 绑定多颜色控制事件
            multiColorEffects[effectType].forEach((colorName, index) => {
                const colorPicker = document.getElementById(`particleColor${index + 1}`);
                if (colorPicker) {
                    colorPicker.addEventListener('change', (e) => {
                        currentMultiColors[`color${index + 1}`] = e.target.value;
                        // 更新粒子效果
                        updateParticleEffectWithMultiColors(effectType);
                    });
                }
            });
        } else {
            additionalContainer.style.display = 'none';
        }
    }
    
    // 使用多颜色更新粒子效果
function updateParticleEffectWithMultiColors(effectType) {
    // 这里可以根据效果类型和当前多颜色值更新粒子效果
    console.log('更新多颜色效果:', effectType, currentMultiColors);
    // 设置多颜色配置
    setParticleMultiColors(currentMultiColors);
    // 重置粒子系统以应用新颜色
    setParticleEffect(effectType);
    // 更新预览窗口
    updatePreviewEffect(effectType);
}

    // 初始化粒子颜色控制
    initParticleColorPresets();
    
    if (particlesColor) {
        particlesColor.addEventListener('change', (e) => {
            // 这里可以添加粒子颜色的逻辑
            console.log('粒子颜色:', e.target.value);
            setParticleColor(e.target.value);
            // 重置粒子系统以应用新颜色，确保渲染器能够立即反映变化
            const currentEffect = document.getElementById('particlesEffect').value;
            setParticleEffect(currentEffect);
            // 更新预览窗口
            updatePreviewEffect(currentEffect);
            // 设置粒子颜色独立标志
            colorIndependenceFlags.particles = true;
            
            // 如果当前是多颜色效果，更新多颜色控制中的主色
            if (multiColorEffects[currentEffect]) {
                // 重置当前多颜色配置，确保主色变化时更新辅助色
                currentMultiColors = {};
                updateMultiColorControls(currentEffect);
            }
        });
    }
    
    // 绑定心率颜色输入事件
    const heartRateColorInput = document.getElementById('heartRateColor');
    if (heartRateColorInput) {
        heartRateColorInput.addEventListener('change', (e) => {
            console.log('心率颜色:', e.target.value);
            updateHeartRateColor(e.target.value);
            // 设置心率颜色独立标志
            colorIndependenceFlags.heartRate = true;
        });
    }
    
    // 绑定ECG线条颜色输入事件
    const ecgLineColorInput = document.getElementById('ecgLineColor');
    if (ecgLineColorInput) {
        ecgLineColorInput.addEventListener('change', (e) => {
            console.log('ECG线条颜色:', e.target.value);
            setEcgConfig({ lineColor: e.target.value });
            // 设置ECG颜色独立标志
            colorIndependenceFlags.ecg = true;
        });
    }
    
    // 监听粒子效果类型变化
    if (particlesEffect) {
        particlesEffect.addEventListener('change', (e) => {
            const effectType = e.target.value;
            // 这里可以添加粒子效果选择的逻辑
            console.log('粒子效果:', effectType);
            setParticleEffect(effectType);
            // 重置当前多颜色配置，确保切换效果时使用新的默认值
            currentMultiColors = {};
            // 更新多颜色控制
            updateMultiColorControls(effectType);
            // 更新预览窗口效果
            updatePreviewEffect(effectType);
        });
    }
    
    // 初始化时更新多颜色控制
    const initialEffect = particlesEffect ? particlesEffect.value : '标准';
    updateMultiColorControls(initialEffect);
    
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
            // 更新预览窗口
            const currentEffect = document.getElementById('particlesEffect').value;
            updatePreviewEffect(currentEffect);
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
            // 更新预览窗口
            const currentEffect = document.getElementById('particlesEffect').value;
            updatePreviewEffect(currentEffect);
        });
    }
    
    if (particlesSize) {
        particlesSize.addEventListener('input', (e) => {
            // 这里可以添加粒子大小的逻辑
            console.log('粒子大小:', e.target.value);
            setParticleSize(parseFloat(e.target.value));
            // 更新输入框的值
            const particlesSizeInput = document.getElementById('particlesSizeInput');
            if (particlesSizeInput) {
                particlesSizeInput.value = e.target.value;
            }
            // 更新预览窗口
            const currentEffect = document.getElementById('particlesEffect').value;
            updatePreviewEffect(currentEffect);
        });
    }
    
    // 绑定粒子大小输入框事件
    const particlesSizeInput = document.getElementById('particlesSizeInput');
    if (particlesSizeInput) {
        particlesSizeInput.addEventListener('input', (e) => {
            // 这里可以添加粒子大小的逻辑
            console.log('粒子大小:', e.target.value);
            setParticleSize(parseFloat(e.target.value));
            // 更新滑块的值
            const particlesSize = document.getElementById('particlesSize');
            if (particlesSize) {
                particlesSize.value = e.target.value;
            }
            // 更新预览窗口
            const currentEffect = document.getElementById('particlesEffect').value;
            updatePreviewEffect(currentEffect);
        });
    }
    
    // 绑定效果与心率绑定控制事件
    const effectHeartRateToggle = document.getElementById('effectHeartRateToggle');
    if (effectHeartRateToggle) {
        effectHeartRateToggle.addEventListener('change', (e) => {
            effectHeartRateConfig.enabled = e.target.checked;
            console.log('效果与心率绑定:', effectHeartRateConfig.enabled);
        });
    }
    
    const effectHeartRateIntensity = document.getElementById('effectHeartRateIntensity');
    const effectHeartRateIntensityInput = document.getElementById('effectHeartRateIntensityInput');
    if (effectHeartRateIntensity) {
        effectHeartRateIntensity.addEventListener('input', (e) => {
            effectHeartRateConfig.intensity = parseFloat(e.target.value);
            if (effectHeartRateIntensityInput) {
                effectHeartRateIntensityInput.value = e.target.value;
            }
            console.log('效果与心率绑定强度:', effectHeartRateConfig.intensity);
        });
    }
    
    if (effectHeartRateIntensityInput) {
        effectHeartRateIntensityInput.addEventListener('input', (e) => {
            effectHeartRateConfig.intensity = parseFloat(e.target.value);
            if (effectHeartRateIntensity) {
                effectHeartRateIntensity.value = e.target.value;
            }
            console.log('效果与心率绑定强度:', effectHeartRateConfig.intensity);
        });
    }
    
    const effectHeartRateMode = document.getElementById('effectHeartRateMode');
    if (effectHeartRateMode) {
        effectHeartRateMode.addEventListener('change', (e) => {
            effectHeartRateConfig.mode = e.target.value;
            console.log('效果与心率绑定模式:', effectHeartRateConfig.mode);
            
            // 当模式改变时，保持当前的心率区间效果不变
            // 这样可以确保心率区间效果始终是心率绑定的表达效果，而不是粒子的效果类型
            console.log('切换触发模式后，心率区间效果保持不变:', {
                lowBpmEffect: effectHeartRateConfig.lowBpmEffect,
                normalBpmEffect: effectHeartRateConfig.normalBpmEffect,
                highBpmEffect: effectHeartRateConfig.highBpmEffect
            });
        });
    }
    
    const lowBpmEffect = document.getElementById('lowBpmEffect');
    if (lowBpmEffect) {
        lowBpmEffect.addEventListener('change', (e) => {
            effectHeartRateConfig.lowBpmEffect = e.target.value;
            console.log('低心率效果:', effectHeartRateConfig.lowBpmEffect);
        });
    }
    
    const normalBpmEffect = document.getElementById('normalBpmEffect');
    if (normalBpmEffect) {
        normalBpmEffect.addEventListener('change', (e) => {
            effectHeartRateConfig.normalBpmEffect = e.target.value;
            console.log('正常心率效果:', effectHeartRateConfig.normalBpmEffect);
        });
    }
    
    const highBpmEffect = document.getElementById('highBpmEffect');
    if (highBpmEffect) {
        highBpmEffect.addEventListener('change', (e) => {
            effectHeartRateConfig.highBpmEffect = e.target.value;
            console.log('高心率效果:', effectHeartRateConfig.highBpmEffect);
        });
    }
    
    // 发光效果设置
    const glowEffectToggle = document.getElementById('glowEffectToggle');
    if (glowEffectToggle) {
        glowEffectToggle.addEventListener('change', (e) => {
            effectHeartRateConfig.glowEffect = e.target.checked;
            console.log('发光效果:', effectHeartRateConfig.glowEffect);
            setEffectHeartRateConfig(effectHeartRateConfig);
        });
    }
    
    const glowColorPicker = document.getElementById('glowColorPicker');
    if (glowColorPicker) {
        glowColorPicker.addEventListener('change', (e) => {
            effectHeartRateConfig.glowColor = e.target.value;
            console.log('发光颜色:', effectHeartRateConfig.glowColor);
            setEffectHeartRateConfig(effectHeartRateConfig);
        });
    }
    
    const glowIntensity = document.getElementById('glowIntensity');
    const glowIntensityInput = document.getElementById('glowIntensityInput');
    if (glowIntensity) {
        glowIntensity.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            effectHeartRateConfig.glowIntensity = value;
            if (glowIntensityInput) {
                glowIntensityInput.value = value;
            }
            console.log('发光强度:', effectHeartRateConfig.glowIntensity);
            setEffectHeartRateConfig(effectHeartRateConfig);
        });
    }
    if (glowIntensityInput) {
        glowIntensityInput.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            effectHeartRateConfig.glowIntensity = value;
            if (glowIntensity) {
                glowIntensity.value = value;
            }
            console.log('发光强度:', effectHeartRateConfig.glowIntensity);
            setEffectHeartRateConfig(effectHeartRateConfig);
        });
    }
    
    // 发光模式设置
    const glowModeSelect = document.getElementById('glowModeSelect');
    if (glowModeSelect) {
        glowModeSelect.addEventListener('change', (e) => {
            effectHeartRateConfig.glowMode = e.target.value;
            console.log('发光模式:', effectHeartRateConfig.glowMode);
            setEffectHeartRateConfig(effectHeartRateConfig);
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
        // 调用setParticlesEnabled函数，控制渲染器是否渲染
        if (setParticlesEnabled) {
            setParticlesEnabled(enabled);
        }
        // 当禁用粒子效果时，移除所有粒子
        if (!enabled && resetParticles) {
            const currentStyle = document.body.className.includes('style1') ? 'style1' : 'style2';
            resetParticles(currentStyle);
        }
        console.log('粒子效果已', enabled ? '启用' : '禁用');
    }
    
    // 绑定主题设置事件
    const themeColor = document.getElementById('themeColor');
    const footerToggle = document.getElementById('footerToggle');
    
    if (themeColor) {
        themeColor.addEventListener('change', (e) => {
            // 这里可以添加主题颜色的逻辑
            console.log('主题颜色:', e.target.value);
            // 更新CSS变量
            document.body.style.setProperty('--accent', e.target.value);
            
            // 转换颜色为RGB格式，用于rgba()函数
            const rgbColor = hexToRgb(e.target.value);
            if (rgbColor) {
                document.body.style.setProperty('--accent-rgb', `${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}`);
            }
            
            // 智能同步颜色：只有在没有独立设置过的情况下才同步
            // 更新粒子效果颜色
            if (!colorIndependenceFlags.particles && window.setParticleColor) {
                window.setParticleColor(e.target.value);
                // 更新粒子颜色选择器显示值
                const particlesColor = document.getElementById('particlesColor');
                if (particlesColor) {
                    particlesColor.value = e.target.value;
                }
            }
            
            // 更新心率颜色
            if (!colorIndependenceFlags.heartRate) {
                const heartRateColor = document.getElementById('heartRateColor');
                if (heartRateColor) {
                    heartRateColor.value = e.target.value;
                    updateHeartRateColor(e.target.value);
                }
            }
            
            // 更新ECG线条颜色
            if (!colorIndependenceFlags.ecg) {
                const ecgLineColor = document.getElementById('ecgLineColor');
                if (ecgLineColor) {
                    ecgLineColor.value = e.target.value;
                    setEcgConfig({ lineColor: e.target.value });
                }
            }
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

// 将Three.js模块函数暴露到全局
window.setParticleEffect = setParticleEffect;
window.setParticleColor = setParticleColor;
window.setParticleCount = setParticleCount;
window.setParticleSize = setParticleSize;

// 预览窗口的Three.js场景
let previewScene = null;
let previewCamera = null;
let previewRenderer = null;
let previewParticles = null;

// 初始化预览窗口
function initPreviewWindow() {
    console.log('初始化预览窗口开始');
    const previewContainer = document.getElementById('previewContainer');
    if (!previewContainer) {
        console.error('预览容器不存在');
        return;
    }
    console.log('预览容器找到:', previewContainer);
    
    // 创建场景
    previewScene = new THREE.Scene();
    console.log('场景创建:', previewScene);
    
    // 创建相机
    let aspect = previewContainer.clientWidth / previewContainer.clientHeight;
    // 确保aspect不为0或NaN
    if (!aspect || isNaN(aspect)) {
        aspect = 1;
        console.warn('预览容器尺寸无效，使用默认aspect ratio 1');
    }
    console.log('预览容器尺寸:', previewContainer.clientWidth, 'x', previewContainer.clientHeight, 'aspect:', aspect);
    previewCamera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    previewCamera.position.z = 50;
    console.log('相机创建:', previewCamera);
    
    try {
        // 创建渲染器
        previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        console.log('渲染器创建:', previewRenderer);
        
        // 确保渲染器尺寸不为0
        let width = previewContainer.clientWidth || 300;
        let height = previewContainer.clientHeight || 200;
        console.log('渲染器实际尺寸:', width, 'x', height);
        previewRenderer.setSize(width, height);
        previewRenderer.setClearColor(0x000000, 0);
        console.log('渲染器尺寸设置完成');
        
        // 强制更新相机aspect ratio
        if (width > 0 && height > 0) {
            previewCamera.aspect = width / height;
            previewCamera.updateProjectionMatrix();
            console.log('相机aspect ratio更新:', previewCamera.aspect);
        }
        
        // 清除容器并添加渲染器
        previewContainer.innerHTML = '';
        const canvas = previewRenderer.domElement;
        // 确保canvas始终有正确的样式，即使容器尺寸为0
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = '1';
        // 强制设置canvas的最小尺寸，确保即使容器隐藏时也能渲染
        canvas.style.minWidth = '300px';
        canvas.style.minHeight = '200px';
        previewContainer.appendChild(canvas);
        console.log('渲染器DOM元素添加完成，canvas:', canvas);
        console.log('previewContainer现在的子元素数量:', previewContainer.children.length);
        console.log('previewContainer计算样式:', window.getComputedStyle(previewContainer));
        console.log('canvas计算样式:', window.getComputedStyle(canvas));
        
        // 初始创建粒子效果，使用当前选择的效果
        console.log('开始创建预览效果');
        const particlesEffectSelect = document.getElementById('particlesEffect');
        const currentEffect = particlesEffectSelect ? particlesEffectSelect.value : '标准';
        updatePreviewEffect(currentEffect);
        console.log('预览效果创建完成');
        console.log('当前粒子效果:', currentEffect);
        
        // 开始渲染循环
        function animate() {
            requestAnimationFrame(animate);
            
            if (previewParticles) {
                if (previewParticles.material.uniforms) {
                    // ShaderMaterial材质（大部分效果）
                    previewParticles.material.uniforms.uTime.value += 0.01;
                    
                    // 为律动星空效果添加脉冲动画
                    if (previewParticles.material.uniforms.uPulse) {
                        // 生成一个模拟的脉冲值，使律动星空效果看起来有动画
                        previewParticles.material.uniforms.uPulse.value = Math.sin(Date.now() * 0.003) * 0.5 + 0.5;
                    }
                } else if (previewParticles.material instanceof THREE.PointsMaterial) {
                    // PointsMaterial材质（如星空1效果）
                    // 应用旋转效果，模拟动画
                    previewParticles.rotation.y += 0.005;
                    previewParticles.rotation.x += 0.002;
                }
            }
            
            previewRenderer.render(previewScene, previewCamera);
        }
        
        animate();
        console.log('渲染循环开始');
        
        // 窗口大小变化时更新
        window.addEventListener('resize', () => {
            if (!previewCamera || !previewRenderer || !previewContainer) return;
            
            previewCamera.aspect = previewContainer.clientWidth / previewContainer.clientHeight;
            previewCamera.updateProjectionMatrix();
            previewRenderer.setSize(previewContainer.clientWidth, previewContainer.clientHeight);
        });
        
        console.log('预览窗口初始化完成');
    } catch (error) {
        console.error('预览窗口初始化错误:', error);
    }
}

// 更新预览效果
function updatePreviewEffect(effectType) {
    console.log('更新预览效果:', effectType);
    if (!previewScene) {
        console.error('预览场景不存在');
        return;
    }
    
    // 移除现有的粒子
    if (previewParticles) {
        console.log('移除现有粒子');
        previewScene.remove(previewParticles);
        previewParticles.geometry.dispose();
        previewParticles.material.dispose();
        previewParticles = null;
        console.log('现有粒子移除完成');
    }
    
    // 创建新的粒子效果
    const particleCount = 500; // 预览用较少的粒子数量以提高性能
    console.log('开始创建新效果，粒子数量:', particleCount);
    
    try {
        switch (effectType) {
            case '星云':
                console.log('创建星云效果');
                previewParticles = createPreviewNebulaEffect(particleCount);
                break;
            case '脉冲':
                console.log('创建脉冲效果');
                previewParticles = createPreviewPulseEffect(particleCount);
                break;
            case '波浪':
                console.log('创建波浪效果');
                previewParticles = createPreviewWaveEffect(particleCount);
                break;
            case '银河':
                console.log('创建银河效果');
                previewParticles = createPreviewGalaxyEffect(particleCount);
                break;
            case '萤火虫':
                console.log('创建萤火虫效果');
                previewParticles = createPreviewFirefliesEffect(particleCount);
                break;
            case '极光':
                console.log('创建极光效果');
                previewParticles = createPreviewAuroraEffect(particleCount);
                break;
            case '暴风雪':
                console.log('创建暴风雪效果');
                previewParticles = createPreviewBlizzardEffect(particleCount);
                break;
            case '律动星空':
                console.log('创建律动星空效果');
                previewParticles = createPreviewRhythmStarsEffect(particleCount);
                break;
            case '呼吸粒子':
                console.log('创建呼吸粒子效果');
                previewParticles = createPreviewBreathingParticlesEffect(particleCount);
                break;
            case '原始星空':
                console.log('创建原始星空效果');
                previewParticles = createPreviewOriginalStarsEffect(particleCount);
                break;
            case '原始粒子云':
                console.log('创建原始粒子云效果');
                previewParticles = createPreviewOriginalParticlesEffect(particleCount);
                break;
            case '星空1':
            case '样式1星空':
                console.log('创建星空1效果');
                previewParticles = createPreviewStyle1StarsEffect(particleCount);
                break;
            case '标准':
            default:
                console.log('创建标准星星效果');
                previewParticles = createPreviewStarsEffect(particleCount);
                break;
        }
        
        if (previewParticles) {
            console.log('粒子效果创建成功，添加到场景');
            previewScene.add(previewParticles);
            console.log('粒子效果添加完成');
        } else {
            console.error('粒子效果创建失败');
        }
    } catch (error) {
        console.error('创建预览效果错误:', error);
    }
}

// 创建预览用的星星效果
function createPreviewStarsEffect(count) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    
    const particlesColor = document.getElementById('particlesColor')?.value || '#ff0033';
    const color1 = new THREE.Color(particlesColor);
    const color2 = new THREE.Color(0xffffff);
    
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 100;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
        
        sizes[i] = Math.random() * 2 + 0.5;
        
        const mixedColor = color1.clone().lerp(color2, Math.random());
        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 },
            uSpeed: { value: 0.02 }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 aColor;
            varying vec3 vColor;
            uniform float uTime;
            uniform float uPulse;
            uniform float uSpeed;
            
            void main() {
                vColor = aColor;
                
                vec3 pos = position;
                float dist = length(pos);
                
                // 添加缓慢的旋转效果
                float rotationSpeed = uTime * 0.05;
                float cosAngle = cos(rotationSpeed);
                float sinAngle = sin(rotationSpeed);
                pos.xy = mat2(cosAngle, -sinAngle, sinAngle, cosAngle) * pos.xy;
                
                // 脉动效果
                float pulseWave = sin(dist * 0.05 - uTime * 3.0) * uPulse * 5.0;
                pos += normalize(pos) * pulseWave;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (100.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    return new THREE.Points(geometry, material);
}

// 创建预览用的星云效果
function createPreviewNebulaEffect(count) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    
    const particlesColor = document.getElementById('particlesColor')?.value || '#ff0033';
    const color1 = new THREE.Color(particlesColor);
    const color2 = new THREE.Color(currentMultiColors.color2 || '#880088');
    
    for (let i = 0; i < count; i++) {
        const r = 50 * Math.cbrt(Math.random());
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
        
        sizes[i] = Math.random() * 3 + 1;
        
        const mixedColor = color1.clone().lerp(color2, Math.random());
        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 aColor;
            varying vec3 vColor;
            uniform float uTime;
            
            void main() {
                vColor = aColor;
                
                vec3 pos = position;
                float flow = sin(length(pos) * 0.01 + uTime * 0.5) * 2.0;
                pos += normalize(pos) * flow;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (75.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha *= 0.6;
                
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    return new THREE.Points(geometry, material);
}

// 创建预览用的脉冲效果
function createPreviewPulseEffect(count) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    
    const particlesColor = document.getElementById('particlesColor')?.value || '#ff0033';
    const color = new THREE.Color(particlesColor);
    
    for (let i = 0; i < count; i++) {
        const r = 40 * Math.random();
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
        
        sizes[i] = Math.random() * 2 + 1;
        
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        
        phases[i] = Math.random() * Math.PI * 2;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 aColor;
            attribute float aPhase;
            varying vec3 vColor;
            uniform float uTime;
            
            void main() {
                vColor = aColor;
                
                vec3 pos = position;
                float pulse = sin(aPhase + uTime * 2.0) * 0.5 + 0.5;
                float scale = 1.0 + pulse * 0.5;
                pos *= scale;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (100.0 / -mvPosition.z) * scale;
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    return new THREE.Points(geometry, material);
}

// 创建预览用的波浪效果
function createPreviewWaveEffect(count) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    
    const particlesColor = document.getElementById('particlesColor')?.value || '#ff0033';
    const color1 = new THREE.Color(particlesColor);
    const color2 = new THREE.Color(currentMultiColors.color2 || '#00ffff');
    
    for (let i = 0; i < count; i++) {
        const r = 50 * Math.random();
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
        
        sizes[i] = Math.random() * 2 + 0.5;
        
        const mixedColor = color1.clone().lerp(color2, Math.random());
        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 aColor;
            varying vec3 vColor;
            uniform float uTime;
            
            void main() {
                vColor = aColor;
                
                vec3 pos = position;
                float wave = sin(length(pos) * 0.02 + uTime * 3.0) * 5.0;
                pos += normalize(pos) * wave;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (90.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    return new THREE.Points(geometry, material);
}

// 创建预览用的银河效果
function createPreviewGalaxyEffect(count) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    
    const particlesColor = document.getElementById('particlesColor')?.value || '#ff0033';
    const color1 = new THREE.Color(particlesColor);
    const color2 = new THREE.Color(currentMultiColors.color2 || '#ffff00');
    
    for (let i = 0; i < count; i++) {
        const radius = 60 * Math.sqrt(Math.random());
        const theta = Math.random() * Math.PI * 2;
        const z = (Math.random() - 0.5) * 25;
        
        positions[i * 3] = radius * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(theta);
        positions[i * 3 + 2] = z;
        
        sizes[i] = Math.random() * 2 + 0.5;
        
        const mixedColor = color1.clone().lerp(color2, Math.random());
        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 aColor;
            varying vec3 vColor;
            uniform float uTime;
            
            void main() {
                vColor = aColor;
                
                vec3 pos = position;
                float angle = uTime * 0.01;
                float cosAngle = cos(angle);
                float sinAngle = sin(angle);
                pos.xy = mat2(cosAngle, -sinAngle, sinAngle, cosAngle) * pos.xy;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (90.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    return new THREE.Points(geometry, material);
}

// 创建预览用的萤火虫效果
function createPreviewFirefliesEffect(count) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const flicker = new Float32Array(count);
    
    const particlesColor = document.getElementById('particlesColor')?.value || '#ffff00';
    const color = new THREE.Color(particlesColor);
    
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 75;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 75;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 75;
        
        sizes[i] = Math.random() * 1.5 + 0.5;
        
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        
        flicker[i] = Math.random();
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aFlicker', new THREE.BufferAttribute(flicker, 1));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 aColor;
            attribute float aFlicker;
            varying vec3 vColor;
            varying float vFlicker;
            uniform float uTime;
            
            void main() {
                vColor = aColor;
                vFlicker = aFlicker;
                
                vec3 pos = position;
                float moveX = sin(aFlicker * 10.0 + uTime * 0.5) * 0.5;
                float moveY = cos(aFlicker * 10.0 + uTime * 0.3) * 0.5;
                float moveZ = sin(aFlicker * 10.0 + uTime * 0.4) * 0.5;
                pos += vec3(moveX, moveY, moveZ);
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (100.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vFlicker;
            uniform float uTime;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float flickerIntensity = sin(vFlicker * 10.0 + uTime * 5.0) * 0.3 + 0.7;
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha *= flickerIntensity * 0.6;
                
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    return new THREE.Points(geometry, material);
}

// 创建预览用的极光效果
function createPreviewAuroraEffect(count) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    
    const particlesColor = document.getElementById('particlesColor')?.value || '#ff0033';
    const color1 = new THREE.Color(particlesColor);
    const color2 = new THREE.Color(currentMultiColors.color2 || '#00ffff');
    const color3 = new THREE.Color(currentMultiColors.color3 || '#8800ff');
    
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 100;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
        
        sizes[i] = Math.random() * 3 + 1;
        
        const mixedColor = color1.clone().lerp(color2, Math.random());
        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
        
        phases[i] = Math.random() * Math.PI * 2;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 aColor;
            attribute float aPhase;
            varying vec3 vColor;
            uniform float uTime;
            
            void main() {
                vColor = aColor;
                
                vec3 pos = position;
                float flow = sin(length(pos) * 0.02 + aPhase + uTime * 0.8) * 5.0;
                pos += normalize(pos) * flow;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (75.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha *= 0.4;
                
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    return new THREE.Points(geometry, material);
}

// 创建预览用的暴风雪效果
function createPreviewBlizzardEffect(count) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    
    const particlesColor = document.getElementById('particlesColor')?.value || '#ffffff';
    const color = new THREE.Color(particlesColor);
    
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 100;
        positions[i * 3 + 1] = Math.random() * 50 + 25;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
        
        sizes[i] = Math.random() * 1 + 0.5;
        
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        
        velocities[i * 3] = (Math.random() - 0.5) * 2;
        velocities[i * 3 + 1] = -Math.random() * 3 - 1;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 aColor;
            attribute vec3 aVelocity;
            varying vec3 vColor;
            uniform float uTime;
            
            void main() {
                vColor = aColor;
                
                vec3 pos = position;
                vec3 velocity = aVelocity;
                pos += velocity * uTime;
                
                // 循环效果
                if (pos.y < -50.0) {
                    pos.y += 100.0;
                    // 使用位置和时间来创建随机效果，避免使用Math.random()
                    float random = sin(pos.x * 0.1 + uTime * 0.1);
                    pos.x += random * 0.5;
                }
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (90.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    return new THREE.Points(geometry, material);
}

// 创建预览用的律动星空效果
function createPreviewRhythmStarsEffect(count) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 100;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
        
        sizes[i] = Math.random() * 2 + 0.5;
        
        const colorChoice = Math.random();
        if (colorChoice < 0.7) {
            colors[i * 3] = 1;
            colors[i * 3 + 1] = 1;
            colors[i * 3 + 2] = 1;
        } else if (colorChoice < 0.9) {
            colors[i * 3] = 0.4;
            colors[i * 3 + 1] = 0.4;
            colors[i * 3 + 2] = 0.4;
        } else {
            colors[i * 3] = 1;
            colors[i * 3 + 1] = 0.1;
            colors[i * 3 + 2] = 0.1;
        }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 aColor;
            varying vec3 vColor;
            uniform float uTime;
            uniform float uPulse;
            
            void main() {
                vColor = aColor;
                
                vec3 pos = position;
                float dist = length(pos);
                
                float pulseWave = sin(dist * 0.05 - uTime * 3.0) * uPulse * 5.0;
                pos += normalize(pos) * pulseWave;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (100.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    return new THREE.Points(geometry, material);
}

// 创建预览用的呼吸粒子效果
function createPreviewBreathingParticlesEffect(count) {
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 30 + Math.random() * 20;
        
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 }
        },
        vertexShader: `
            uniform float uTime;
            uniform float uPulse;
            
            void main() {
                vec3 pos = position;
                
                float breathe = sin(uTime * 0.5) * 2.0;
                pos *= 1.0 + breathe * 0.05;
                pos *= 1.0 + uPulse * 0.3;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = 3.0 * (50.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha *= 0.3;
                
                vec3 color = vec3(0.5);
                
                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    return new THREE.Points(geometry, material);
}

// 创建预览用的原始星空效果
function createPreviewOriginalStarsEffect(count) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    
    const particlesColor = document.getElementById('particlesColor')?.value || '#ffffff';
    const baseColor = new THREE.Color(particlesColor);
    const triggerColor = new THREE.Color('#ff0000'); // 固定红色触发颜色
    
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 100;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
        
        sizes[i] = Math.random() * 2 + 0.5;
        
        const colorChoice = Math.random();
        if (colorChoice < 0.7) {
            colors[i * 3] = baseColor.r;
            colors[i * 3 + 1] = baseColor.g;
            colors[i * 3 + 2] = baseColor.b;
        } else if (colorChoice < 0.9) {
            colors[i * 3] = 0.4;
            colors[i * 3 + 1] = 0.4;
            colors[i * 3 + 2] = 0.4;
        } else {
            colors[i * 3] = triggerColor.r;
            colors[i * 3 + 1] = triggerColor.g;
            colors[i * 3 + 2] = triggerColor.b;
        }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 aColor;
            varying vec3 vColor;
            uniform float uTime;
            
            void main() {
                vColor = aColor;
                
                vec3 pos = position;
                float dist = length(pos);
                float pulseWave = sin(dist * 0.05 - uTime * 3.0) * 0.5 * 5.0;
                pos += normalize(pos) * pulseWave;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (90.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha *= 0.6;
                
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    return new THREE.Points(geometry, material);
}

// 创建预览用的原始粒子云效果
function createPreviewOriginalParticlesEffect(count) {
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 30 + Math.random() * 20;
        
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particlesColor = document.getElementById('particlesColor')?.value || '#ffffff';
    const baseColor = new THREE.Color(particlesColor);
    const triggerColor = new THREE.Color('#ff0000'); // 固定红色触发颜色
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 },
            uBaseColor: { value: baseColor },
            uTriggerColor: { value: triggerColor }
        },
        vertexShader: `
            uniform float uTime;
            uniform float uPulse;
            
            void main() {
                vec3 pos = position;
                
                float breathe = sin(uTime * 0.5) * 2.0;
                pos *= 1.0 + breathe * 0.05;
                pos *= 1.0 + uPulse * 0.3;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = 3.0 * (90.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform float uPulse;
            uniform vec3 uBaseColor;
            uniform vec3 uTriggerColor;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha *= 0.3;
                
                vec3 color = mix(uBaseColor, uTriggerColor, uPulse);
                
                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    return new THREE.Points(geometry, material);
}

// 创建预览用的样式1星空效果
function createPreviewStyle1StarsEffect(count) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const particlesColor = document.getElementById('particlesColor')?.value || '#ff0033';
    const color1 = new THREE.Color(0xffffff); // 白
    const color2 = new THREE.Color(particlesColor); // 红

    for (let i = 0; i < count; i++) {
        // 随机分布在球体表面或内部
        const r = 40 * Math.cbrt(Math.random()); // 半径分布
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        // 颜色混合
        const mixedColor = color1.clone().lerp(color2, Math.random()); // 完全响应颜色变化
        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.5,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8
    });

    return new THREE.Points(geometry, material);
}

// 启动初始化 - 确保DOM完全加载后再执行
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded 事件触发，开始初始化');
    init();
    // 初始化原始背景设置
    originalBgType = currentBgType;
    originalBgImage = currentBgImage;
    originalBgColor = currentBgColor;
    setupSettings();
    loadBackgroundSettings();
    
    // 初始化预览窗口 - 延迟时间更长，确保所有DOM元素都已完全渲染
    console.log('计划初始化预览窗口');
    setTimeout(() => {
        console.log('执行预览窗口初始化');
        initPreviewWindow();
    }, 500);
});

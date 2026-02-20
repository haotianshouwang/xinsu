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
let ecgPhase = 0;

// DOM元素
let elements = {};

// 初始化函数
function init() {
    // 获取DOM元素
    elements = getDOMElements();
    
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
    const settingsBtn2 = document.getElementById('settingsBtn2');
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
    if (settingsBtn2) {
        settingsBtn2.addEventListener('click', showSettings);
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
}

// 将handleToggleStyle暴露到全局作用域，以便HTML中的onclick可以调用
window.toggleStyle = handleToggleStyle;

// 启动初始化 - 确保DOM完全加载后再执行
document.addEventListener('DOMContentLoaded', () => {
    init();
    setupSettings();
});

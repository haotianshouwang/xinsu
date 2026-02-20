import * as THREE from 'three';

// 导入模块
import { initThree, updateThree, renderThree, resetParticles, updateBackgroundColor, onWindowResize } from './modules/three.js';
import { initAudio, playHeartbeat, startAlarm, stopAlarm, setAudioEnabled, getAudioEnabled, getIsAlarming } from './modules/audio.js';
import { setupConnectButtons, updateStatus as updateBluetoothStatus, updateConnectButtons as updateBluetoothButtons, updateHeartRateDisplay as updateBluetoothHeartRate, handleHeartRate as handleBluetoothHeartRate, onDisconnected as onBluetoothDisconnected, disconnect as disconnectBluetooth, getConnected, getCurrentBPM, getLastDataTime, getPulseIntensity, setPulseIntensity, getLastBeatTime, setLastBeatTime } from './modules/bluetooth.js';
import { ecgData, ecgMaxPoints, ecgCanvas, ecgCtx, initECG, updateECGCanvas, clearECGToZero, generateECGValue, drawECG } from './modules/ecg.js';
import { logDebug, toggleStyle as toggleStyleUtil, getDOMElements } from './modules/utils.js';

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
    
    // 初始化ECG
    initECG(currentStyle);
    
    // 初始化Three.js
    initThree('canvas-container', currentStyle);
    
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
    ecgData.push(ecgValue);
    if (ecgData.length > ecgMaxPoints) {
        ecgData.shift();
    }
    
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
    const isStyle1 = currentStyle === 'style1';
    drawECG(isStyle1, getIsAlarming(), getPulseIntensity());
    
    // 渲染 Three.js
    renderThree();
}

// 样式切换功能
function toggleStyle() {
    currentStyle = toggleStyleUtil(
        document.body,
        null, // renderer 由 three.js 模块管理
        currentStyle,
        resetParticles,
        initECG,
        updateECGCanvas,
        onWindowResize
    );
    
    // 同步音频反馈开关状态
    const audioEnabled = getAudioEnabled();
    if (elements.soundToggle) {
        elements.soundToggle.checked = audioEnabled;
    }
    if (elements.audioToggle) {
        elements.audioToggle.checked = audioEnabled;
    }
}

// 将toggleStyle暴露到全局作用域，以便HTML中的onclick可以调用
window.toggleStyle = toggleStyle;

// 启动初始化 - 确保DOM完全加载后再执行
document.addEventListener('DOMContentLoaded', init);

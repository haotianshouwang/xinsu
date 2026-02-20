// 蓝牙相关常量
const HEART_RATE_SERVICE = 'heart_rate';
const HEART_RATE_CHARACTERISTIC = 'heart_rate_measurement';

// 导入模块
import { parseHeartRateMeasurement, isValidHeartRate, formatHeartRateData } from './heart-rate-parser.js';
import { updateHeartRate, updateConnectionStatus, incrementPacketCount } from './heart-rate-manager.js';
import { log, LOG_MODULES } from './logger.js';

// 蓝牙相关全局变量
let device = null;
let server = null;
let connected = false;

// 连接按钮事件
function setupConnectButtons(connectBtn, connectBtn2, initAudio, updateStatus, updateConnectButtons, onUpdateHeartRate, logDebug, onHeartRateChanged, onDisconnected) {
    [connectBtn, connectBtn2].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', async () => {
                // 用户手势：初始化音频并恢复上下文
                initAudio();
                if (window.audioContext && window.audioContext.state === 'suspended') {
                    await window.audioContext.resume();
                }

                if (connected) {
                    disconnect();
                    return;
                }

                try {
                    logDebug('SCAN', '正在扫描蓝牙设备...');
                    log(LOG_MODULES.BLUETOOTH, '正在扫描蓝牙设备...', 'basic');
                    updateStatus('扫描中...', false);
                    btn.disabled = true;

                    device = await navigator.bluetooth.requestDevice({
                        filters: [{ services: [HEART_RATE_SERVICE] }]
                    });

                    const deviceName = device.name || '未知设备';
                    logDebug('FOUND', `发现设备: ${deviceName}`);
                    log(LOG_MODULES.BLUETOOTH, `发现设备: ${deviceName}`, 'basic');
                    
                    device.addEventListener('gattserverdisconnected', onDisconnected);

                    updateStatus('连接中...', false);
                    logDebug('CONN', '正在连接 GATT 服务器...');
                    log(LOG_MODULES.BLUETOOTH, '正在连接 GATT 服务器...', 'basic');

                    server = await device.gatt.connect();
                    logDebug('CONN', 'GATT 连接成功');
                    log(LOG_MODULES.BLUETOOTH, 'GATT 连接成功', 'basic');

                    const service = await server.getPrimaryService(HEART_RATE_SERVICE);
                    logDebug('SERV', '获取心率服务成功');
                    log(LOG_MODULES.BLUETOOTH, '获取心率服务成功', 'detailed');

                    const char = await service.getCharacteristic(HEART_RATE_CHARACTERISTIC);
                    logDebug('CHAR', '获取心率特征值成功');
                    log(LOG_MODULES.BLUETOOTH, '获取心率特征值成功', 'detailed');

                    await char.startNotifications();
                    char.addEventListener('characteristicvaluechanged', onHeartRateChanged);
                    logDebug('SUBS', '订阅心率通知成功', true);
                    log(LOG_MODULES.BLUETOOTH, '订阅心率通知成功', 'basic');

                    connected = true;
                    // 使用心率数据管理模块更新连接状态
                    updateConnectionStatus(true, '已连接');
                    onUpdateHeartRate('--');
                    updateConnectButtons('断开连接', true);
                    updateStatus('已连接', true);
                    log(LOG_MODULES.BLUETOOTH, '设备连接成功', 'basic');

                } catch (err) {
                    console.error('连接失败：', err);
                    logDebug('FAIL', `错误: ${err.message}`, true);
                    log(LOG_MODULES.BLUETOOTH, `连接失败: ${err.message}`, 'basic');
                    updateStatus('连接失败', false);
                    updateConnectButtons('连接设备', false);
                    connected = false;
                }
            });
        }
    });
}

// 更新状态显示
function updateStatus(statusText, connectionStatus, statusDot, text, isConnected) {
    if (statusText) statusText.textContent = text;
    if (connectionStatus) connectionStatus.textContent = text;
    if (statusDot) {
        statusDot.classList.remove('connected', 'alarm');
        if (isConnected) {
            statusDot.classList.add('connected');
        }
    }
}

// 更新连接按钮
function updateConnectButtons(connectBtn, connectBtn2, text, isConnected) {
    [connectBtn, connectBtn2].forEach(btn => {
        if (btn) {
            btn.textContent = text;
            btn.disabled = false;
            if (isConnected) {
                btn.classList.add('connected');
            } else {
                btn.classList.remove('connected');
            }
        }
    });
}

// 更新心率显示
function updateHeartRateDisplay(bpmDisplay, heartRateEl, bpm) {
    // 调试：检查参数
    console.log('updateHeartRateDisplay - params:', {
        bpmDisplay: bpmDisplay,
        heartRateEl: heartRateEl,
        bpm: bpm
    });
    
    if (bpmDisplay) {
        bpmDisplay.textContent = bpm;
        console.log('updateHeartRateDisplay - updated bpmDisplay:', bpmDisplay.textContent);
    }
    if (heartRateEl) {
        heartRateEl.textContent = bpm;
        console.log('updateHeartRateDisplay - updated heartRateEl:', heartRateEl.textContent);
    }
}

// 处理心率数据
function handleHeartRate(event, onUpdateHeartRate, logDebug, stopAlarm) {
    try {
        const value = event.target.value;
        
        // 输出原始数据格式
        let rawData = 'Raw: ';
        for (let i = 0; i < value.byteLength; i++) {
            rawData += value.getUint8(i).toString(16).padStart(2, '0') + ' ';
        }
        
        // 使用统一的心率数据解析模块
        const heartRateData = parseHeartRateMeasurement(value);
        
        // 构建数据包字符串
        const dataStr = formatHeartRateData(heartRateData);
        
        // 输出原始格式和解析后的数据
        logDebug('DATA', `${dataStr} | ${rawData}`, true);
        log(LOG_MODULES.BLUETOOTH, `心率数据: ${dataStr} | ${rawData}`, 'detailed');
        
        // 验证心率值
        if (isValidHeartRate(heartRateData.bpm)) {
            // 使用心率数据管理模块更新数据
            updateHeartRate(heartRateData.bpm);
            incrementPacketCount();
            
            log(LOG_MODULES.BLUETOOTH, `心率: ${heartRateData.bpm} BPM`, 'basic');
            
            // 调用回调函数，确保所有心率显示都能更新
            onUpdateHeartRate(heartRateData.bpm);
        }
        
        // 收到数据时关闭警报
        stopAlarm();
    } catch (error) {
        console.error('处理心率数据时出错:', error);
        if (logDebug) {
            logDebug('ERROR', `处理心率数据时出错: ${error.message}`, true);
        }
        log(LOG_MODULES.BLUETOOTH, `处理心率数据时出错: ${error.message}`, 'basic');
    }
}

// 断开连接处理
function onDisconnected(updateStatus, onUpdateHeartRate, updateConnectButtons, logDebug, stopAlarm, clearECGToZero) {
    logDebug('DISC', '设备已断开连接', true);
    log(LOG_MODULES.BLUETOOTH, '设备已断开连接', 'basic');
    updateStatus('已断开', false);
    
    // 使用心率数据管理模块更新数据
    updateHeartRate(null);
    updateConnectionStatus(false, '已断开');
    
    // 调用回调函数，确保所有心率显示都能更新
    onUpdateHeartRate('--');
    
    updateConnectButtons('连接设备', false);
    connected = false;
    if (window.statusDot) window.statusDot.classList.remove('connected');
    stopAlarm();
    // 断开后心电图立即恢复为直线
    clearECGToZero();
    log(LOG_MODULES.BLUETOOTH, '断开连接处理完成', 'detailed');
}

function disconnect() {
    if (server) server.disconnect();
    // 断开连接后会触发gattserverdisconnected事件，调用onDisconnected
}

// 获取当前连接状态
function getConnected() {
    return connected;
}

export {
    HEART_RATE_SERVICE,
    HEART_RATE_CHARACTERISTIC,
    setupConnectButtons,
    updateStatus,
    updateConnectButtons,
    updateHeartRateDisplay,
    handleHeartRate,
    onDisconnected,
    disconnect,
    getConnected
};

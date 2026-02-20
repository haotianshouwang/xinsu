// 蓝牙相关常量
const HEART_RATE_SERVICE = 'heart_rate';
const HEART_RATE_CHARACTERISTIC = 'heart_rate_measurement';

// 蓝牙相关全局变量
let device = null;
let server = null;
let connected = false;
let currentBPM = null;
let lastBeatTime = 0;
let lastDataTime = 0;
let pulseIntensity = 0;
let packetCount = 0;

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
                    updateStatus('扫描中...', false);
                    btn.disabled = true;

                    device = await navigator.bluetooth.requestDevice({
                        filters: [{ services: [HEART_RATE_SERVICE] }]
                    });

                    logDebug('FOUND', `发现设备: ${device.name || '未知设备'}`);
                    
                    device.addEventListener('gattserverdisconnected', onDisconnected);

                    updateStatus('连接中...', false);
                    logDebug('CONN', '正在连接 GATT 服务器...');

                    server = await device.gatt.connect();
                    logDebug('CONN', 'GATT 连接成功');

                    const service = await server.getPrimaryService(HEART_RATE_SERVICE);
                    logDebug('SERV', '获取心率服务成功');

                    const char = await service.getCharacteristic(HEART_RATE_CHARACTERISTIC);
                    logDebug('CHAR', '获取心率特征值成功');

                    await char.startNotifications();
                    char.addEventListener('characteristicvaluechanged', onHeartRateChanged);
                    logDebug('SUBS', '订阅心率通知成功', true);

                    connected = true;
                    // 重置心率值和最后数据时间
                    currentBPM = null;
                    onUpdateHeartRate('--');
                    lastDataTime = performance.now() * 0.001;
                    updateConnectButtons('断开连接', true);
                    updateStatus('已连接', true);

                } catch (err) {
                    console.error('连接失败：', err);
                    logDebug('FAIL', `错误: ${err.message}`, true);
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
    if (bpmDisplay) bpmDisplay.textContent = bpm;
    if (heartRateEl) heartRateEl.textContent = bpm;
}

// 处理心率数据
function handleHeartRate(event, onUpdateHeartRate, logDebug, stopAlarm) {
    const value = event.target.value;
    const t = performance.now() * 0.001;
    lastDataTime = t;
    
    // 解析完整数据包
    const flags = value.getUint8(0);
    const bpm8 = value.getUint8(1);
    
    // 构建数据包字符串
    let dataStr = `Flags: 0x${flags.toString(16).padStart(2, '0')}`;
    dataStr += ` | BPM: ${bpm8}`;
    
    // 显示更多字节（如果有）
    if (value.byteLength > 2) {
        let extra = ' | Raw: ';
        for (let i = 0; i < value.byteLength; i++) {
            extra += value.getUint8(i).toString(16).padStart(2, '0') + ' ';
        }
        dataStr += extra;
    }
    
    logDebug('DATA', dataStr, true);
    
    if (bpm8 > 0 && bpm8 < 300) {
        currentBPM = bpm8;
        onUpdateHeartRate(bpm8);
    }
    
    // 收到数据时关闭警报
    stopAlarm();
}

// 断开连接处理
function onDisconnected(updateStatus, onUpdateHeartRate, updateConnectButtons, logDebug, stopAlarm, clearECGToZero) {
    logDebug('DISC', '设备已断开连接', true);
    updateStatus('已断开', false);
    onUpdateHeartRate('--');
    updateConnectButtons('连接设备', false);
    connected = false;
    currentBPM = null;
    if (window.statusDot) window.statusDot.classList.remove('connected');
    stopAlarm();
    // 断开后心电图立即恢复为直线
    clearECGToZero();
}

function disconnect() {
    if (server) server.disconnect();
    // 断开连接后会触发gattserverdisconnected事件，调用onDisconnected
}

// 获取当前连接状态
function getConnected() {
    return connected;
}

// 获取当前心率
function getCurrentBPM() {
    return currentBPM;
}

// 获取最后数据时间
function getLastDataTime() {
    return lastDataTime;
}

// 获取脉冲强度
function getPulseIntensity() {
    return pulseIntensity;
}

// 设置脉冲强度
function setPulseIntensity(intensity) {
    pulseIntensity = intensity;
}

// 获取最后心跳时间
function getLastBeatTime() {
    return lastBeatTime;
}

// 设置最后心跳时间
function setLastBeatTime(time) {
    lastBeatTime = time;
}

// 增加数据包计数
function incrementPacketCount() {
    packetCount++;
    return packetCount;
}

// 获取数据包计数
function getPacketCount() {
    return packetCount;
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
    getConnected,
    getCurrentBPM,
    getLastDataTime,
    getPulseIntensity,
    setPulseIntensity,
    getLastBeatTime,
    setLastBeatTime,
    incrementPacketCount,
    getPacketCount
};

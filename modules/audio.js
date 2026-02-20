// 音频相关全局变量
let audioContext = null;
let gainNode = null;
let alarmOscillator = null;
let alarmInterval = null;
let isAlarming = false;
let audioEnabled = false;

// 初始化音频
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
        gainNode.gain.value = 1;
    }
}

// 心跳音 (667Hz包络)
function playHeartbeat() {
    if (!audioEnabled) return;
    
    initAudio();
    
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    const osc = audioContext.createOscillator();
    const oscGain = audioContext.createGain();
    
    // 设置为667Hz QRS同步脉冲
    osc.type = 'sine';
    osc.frequency.value = 667;
    
    // 包络参数
    const now = audioContext.currentTime;
    const attackTime = 0.01;
    const sustainTime = 0.1;
    const releaseTime = 0.05;
    const maxGain = 0.5;
    
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(maxGain, now + attackTime);
    oscGain.gain.setValueAtTime(maxGain, now + attackTime + sustainTime);
    oscGain.gain.linearRampToValueAtTime(0, now + attackTime + sustainTime + releaseTime);
    
    osc.connect(oscGain);
    oscGain.connect(gainNode);
    
    osc.start(now);
    osc.stop(now + attackTime + sustainTime + releaseTime + 0.01);
}

// 警报音 (667Hz包络，每500ms重复)
function startAlarm(alarmOverlay, statusDot, heartRateEl, logDebug) {
    if (isAlarming) return;
    isAlarming = true;
    
    initAudio();
    
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    if (alarmOverlay) alarmOverlay.classList.add('active');
    if (statusDot) statusDot.classList.add('alarm');
    if (heartRateEl) heartRateEl.classList.add('alarm');
    
    if (logDebug) {
        logDebug('ALARM', '心率信号丢失 - 启动警报 (667Hz QRS脉冲)', true);
    }
    
    alarmInterval = setInterval(() => {
        if (!isAlarming || !audioEnabled) return;
        
        const osc = audioContext.createOscillator();
        const oscGain = audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = 667;
        
        const now = audioContext.currentTime;
        const attackTime = 0.01;
        const sustainTime = 0.1;
        const releaseTime = 0.05;
        const maxGain = 0.5;
        
        oscGain.gain.setValueAtTime(0, now);
        oscGain.gain.linearRampToValueAtTime(maxGain, now + attackTime);
        oscGain.gain.setValueAtTime(maxGain, now + attackTime + sustainTime);
        oscGain.gain.linearRampToValueAtTime(0, now + attackTime + sustainTime + releaseTime);
        
        osc.connect(oscGain);
        oscGain.connect(gainNode);
        
        osc.start(now);
        osc.stop(now + attackTime + sustainTime + releaseTime + 0.01);
        
    }, 500);
}

function stopAlarm(alarmOverlay, statusDot, heartRateEl, logDebug) {
    if (!isAlarming) return;
    isAlarming = false;
    
    if (alarmOverlay) alarmOverlay.classList.remove('active');
    if (statusDot) statusDot.classList.remove('alarm');
    if (heartRateEl) heartRateEl.classList.remove('alarm');
    
    if (alarmInterval) {
        clearInterval(alarmInterval);
        alarmInterval = null;
    }
    
    if (logDebug) {
        logDebug('INFO', '心率信号恢复 - 关闭警报');
    }
}

// 设置音频启用状态
function setAudioEnabled(enabled) {
    audioEnabled = enabled;
    if (audioEnabled) {
        initAudio();
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }
}

// 获取音频启用状态
function getAudioEnabled() {
    return audioEnabled;
}

// 获取警报状态
function getIsAlarming() {
    return isAlarming;
}

export {
    initAudio,
    playHeartbeat,
    startAlarm,
    stopAlarm,
    setAudioEnabled,
    getAudioEnabled,
    getIsAlarming
};

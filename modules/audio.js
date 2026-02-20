// 音频相关全局变量
let audioContext = null;
let gainNode = null;
let alarmOscillator = null;
let alarmInterval = null;
let isAlarming = false;
let audioEnabled = false;

// 导入日志管理模块
import { log, LOG_MODULES } from './logger.js';

// 初始化音频
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
        gainNode.gain.value = 1;
        log(LOG_MODULES.AUDIO, '音频上下文初始化成功', 'detailed');
    }
}

// 心跳音 (667Hz包络)
function playHeartbeat() {
    if (!audioEnabled) return;
    
    initAudio();
    
    if (audioContext.state === 'suspended') {
        audioContext.resume();
        log(LOG_MODULES.AUDIO, '音频上下文恢复', 'detailed');
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
    
    log(LOG_MODULES.AUDIO, '心跳音播放', 'detailed');
}

// 警报音 (667Hz包络，每500ms重复)
function startAlarm(alarmOverlay, statusDot, heartRateEl, logDebug) {
    // 如果没有参数且已经在报警状态，仅重新启动警报声音
    const isRestart = !alarmOverlay && isAlarming;
    
    if (!isRestart && isAlarming) return;
    
    if (!isRestart) {
        isAlarming = true;
        
        if (alarmOverlay) alarmOverlay.classList.add('active');
        if (statusDot) statusDot.classList.add('alarm');
        if (heartRateEl) heartRateEl.classList.add('alarm');
        
        if (logDebug) {
            logDebug('ALARM', '心率信号丢失 - 启动警报 (持续长音)', true);
        }
        
        log(LOG_MODULES.AUDIO, '警报启动', 'basic');
    }
    
    // 只有在音频启用时才初始化音频上下文和创建振荡器
    if (audioEnabled) {
        initAudio();
        
        if (audioContext.state === 'suspended') {
            audioContext.resume();
            log(LOG_MODULES.AUDIO, '音频上下文恢复', 'detailed');
        }
        
        // 停止现有的振荡器（如果有）
        if (alarmOscillator) {
            try {
                alarmOscillator.stop();
            } catch (e) {
                // 忽略已停止的振荡器错误
            }
            alarmOscillator = null;
        }
        
        // 创建持续的警报音振荡器
        alarmOscillator = audioContext.createOscillator();
        const oscGain = audioContext.createGain();
        
        // 方波，更像监护仪报警声
        alarmOscillator.type = 'square';
        // 频率设置为800Hz，尖锐明显
        alarmOscillator.frequency.value = 800;
        
        const now = audioContext.currentTime;
        const attackTime = 0.1;
        const maxGain = 0.4;
        
        // 平滑启动
        oscGain.gain.setValueAtTime(0, now);
        oscGain.gain.linearRampToValueAtTime(maxGain, now + attackTime);
        
        alarmOscillator.connect(oscGain);
        oscGain.connect(gainNode);
        
        alarmOscillator.start(now);
    }
    
    // 清除任何现有的间隔
    if (alarmInterval) {
        clearInterval(alarmInterval);
        alarmInterval = null;
    }
    
    // 设置一个定时器，确保警报持续运行
    alarmInterval = setInterval(() => {
        if (!isAlarming || !audioEnabled) return;
        
        // 检查振荡器是否仍在运行
        if (!alarmOscillator) {
            alarmOscillator = audioContext.createOscillator();
            const oscGain = audioContext.createGain();
            
            alarmOscillator.type = 'square';
            alarmOscillator.frequency.value = 800;
            
            const now = audioContext.currentTime;
            const attackTime = 0.1;
            const maxGain = 0.4;
            
            oscGain.gain.setValueAtTime(0, now);
            oscGain.gain.linearRampToValueAtTime(maxGain, now + attackTime);
            
            alarmOscillator.connect(oscGain);
            oscGain.connect(gainNode);
            
            alarmOscillator.start(now);
        }
    }, 1000);
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
    
    // 停止警报振荡器
    if (alarmOscillator) {
        try {
            alarmOscillator.stop();
        } catch (e) {
            // 忽略已停止的振荡器错误
        }
        alarmOscillator = null;
    }
    
    if (logDebug) {
        logDebug('INFO', '心率信号恢复 - 关闭警报');
    }
    
    log(LOG_MODULES.AUDIO, '警报停止', 'basic');
}

// 设置音频启用状态
function setAudioEnabled(enabled) {
    const wasEnabled = audioEnabled;
    audioEnabled = enabled;
    log(LOG_MODULES.AUDIO, `音频 ${enabled ? '启用' : '禁用'}`, 'basic');
    
    if (audioEnabled) {
        initAudio();
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
            log(LOG_MODULES.AUDIO, '音频上下文恢复', 'detailed');
        }
        
        // 如果从禁用切换到启用，并且当前正在报警，重新启动警报声音
        if (!wasEnabled && isAlarming) {
            log(LOG_MODULES.AUDIO, '音频启用 - 重新启动警报声音', 'basic');
            startAlarm(); // 无参数调用，仅重新启动警报声音
        }
    } else {
        // 当音频被禁用时，停止任何正在运行的警报声音
        if (alarmOscillator) {
            try {
                alarmOscillator.stop();
            } catch (e) {
                // 忽略已停止的振荡器错误
            }
            alarmOscillator = null;
            log(LOG_MODULES.AUDIO, '警报声音已停止（音频禁用）', 'basic');
        }
        // 清除警报间隔
        if (alarmInterval) {
            clearInterval(alarmInterval);
            alarmInterval = null;
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

// ECG 相关变量
export const ecgData = [];
export const ecgMaxPoints = 300;
export let ecgCanvas = null;
export let ecgCtx = null;

// 导入日志管理模块
import { log, LOG_MODULES } from './logger.js';

// ECG 显示样式配置
const ecgStyles = {
    style1: {
        grid: true,
        gridColor: 'rgba(255, 255, 255, 0.05)',
        gridSize: 40,
        gradient: (ctx, width) => {
            const gradient = ctx.createLinearGradient(0, 0, width, 0);
            gradient.addColorStop(0, 'rgba(255, 0, 51, 0)');
            gradient.addColorStop(0.8, 'rgba(255, 0, 51, 1)');
            gradient.addColorStop(1, '#fff');
            return gradient;
        },
        lineWidth: 2,
        alarmingLineWidth: 2.5
    },
    style2: {
        grid: false,
        gradient: (ctx, width) => {
            const gradient = ctx.createLinearGradient(0, 0, width, 0);
            gradient.addColorStop(0, 'rgba(255, 26, 26, 0.1)');
            gradient.addColorStop(0.7, 'rgba(255, 26, 26, 0.8)');
            gradient.addColorStop(1, '#ff1a1a');
            return gradient;
        },
        lineWidth: 2,
        alarmingLineWidth: 2.5
    }
};

// ============ 初始化 ECG Canvas ============
export function initECG(currentStyle) {
    // 根据当前样式选择正确的canvas元素
    if (currentStyle === 'style1') {
        ecgCanvas = document.getElementById('ecg-canvas-style1');
    } else {
        ecgCanvas = document.getElementById('ecg-canvas-style2');
    }
    
    if (!ecgCanvas) {
        console.error('ECG canvas not found');
        log(LOG_MODULES.ECG, 'ECG canvas not found', 'basic');
        return;
    }
    
    updateECGCanvas();
    ecgCtx = ecgCanvas.getContext('2d');
    
    // 只有在首次初始化时才清空数据
    // 样式切换时保持ECG数据的连续性
    if (ecgData.length === 0) {
        clearECGToZero();
    }
    
    log(LOG_MODULES.ECG, `ECG 初始化完成，样式: ${currentStyle}`, 'detailed');
}

// 更新ECG Canvas尺寸
export function updateECGCanvas() {
    if (!ecgCanvas) return;
    
    const rect = ecgCanvas.getBoundingClientRect();
    ecgCanvas.width = rect.width * window.devicePixelRatio;
    ecgCanvas.height = rect.height * window.devicePixelRatio;
    // 重置上下文，避免缩放因子累积
    if (ecgCtx) {
        ecgCtx = ecgCanvas.getContext('2d');
    }
    
    log(LOG_MODULES.ECG, `ECG Canvas 更新尺寸: ${ecgCanvas.width}x${ecgCanvas.height}`, 'detailed');
}

// ============ 清空ECG数据为直线 ============
export function clearECGToZero() {
    ecgData.length = 0;
    for (let i = 0; i < ecgMaxPoints; i++) {
        ecgData.push(0);
    }
    
    log(LOG_MODULES.ECG, 'ECG数据清空', 'detailed');
}

// ============ ECG 波形生成 ============
export function generateECGValue(phase, bpm) {
    // 确保bpm有效
    if (!bpm || bpm <= 0) return 0;
    const cycleLength = 60 / Math.max(30, bpm);
    const t = phase % cycleLength;
    
    const pWave = t < 0.1 ? 0.15 * Math.sin((t / 0.1) * Math.PI) : 0;
    const qStart = 0.12;
    const qWave = (t > qStart && t < qStart + 0.02) ? -0.1 * Math.sin(((t - qStart) / 0.02) * Math.PI) : 0;
    const rStart = 0.14;
    const rWave = (t > rStart && t < rStart + 0.04) ? 0.8 * Math.sin(((t - rStart) / 0.04) * Math.PI) : 0;
    const sStart = 0.18;
    const sWave = (t > sStart && t < sStart + 0.03) ? -0.2 * Math.sin(((t - sStart) / 0.03) * Math.PI) : 0;
    const tStart = 0.25;
    const tWave = (t > tStart && t < tStart + 0.12) ? 0.25 * Math.sin(((t - tStart) / 0.12) * Math.PI) : 0;
    
    const ecgValue = pWave + qWave + rWave + sWave + tWave;
    
    // 只在详细日志级别输出
    log(LOG_MODULES.ECG, `生成ECG值: ${ecgValue.toFixed(2)}, 心率: ${bpm} BPM`, 'detailed');
    
    return ecgValue;
}

// ============ 绘制 ECG ============
export function drawECG(currentStyle, isAlarming, pulseIntensity) {
    if (!ecgCtx || !ecgCanvas) return;
    
    const width = ecgCanvas.width / window.devicePixelRatio;
    const height = ecgCanvas.height / window.devicePixelRatio;
    const centerY = height / 2;
    
    // 获取当前样式配置
    const styleConfig = ecgStyles[currentStyle] || ecgStyles.style1;
    
    ecgCtx.clearRect(0, 0, width, height);
    
    // 绘制网格（如果样式配置要求）
    if (styleConfig.grid) {
        ecgCtx.strokeStyle = styleConfig.gridColor;
        ecgCtx.lineWidth = 1;
        ecgCtx.beginPath();
        const gridSize = styleConfig.gridSize;
        for(let x=0; x<width; x+=gridSize) { ecgCtx.moveTo(x,0); ecgCtx.lineTo(x, height); }
        for(let y=0; y<height; y+=gridSize) { ecgCtx.moveTo(0,y); ecgCtx.lineTo(width, y); }
        ecgCtx.stroke();
    }
    
    // 中线
    ecgCtx.strokeStyle = 'rgba(255, 26, 26, 0.1)';
    ecgCtx.lineWidth = 1;
    ecgCtx.beginPath();
    ecgCtx.moveTo(0, centerY);
    ecgCtx.lineTo(width, centerY);
    ecgCtx.stroke();
    
    // ECG 曲线
    const gradient = styleConfig.gradient(ecgCtx, width);
    
    ecgCtx.strokeStyle = isAlarming ? '#ff1a1a' : gradient;
    ecgCtx.lineWidth = isAlarming ? styleConfig.alarmingLineWidth : styleConfig.lineWidth;
    ecgCtx.lineCap = 'round';
    ecgCtx.lineJoin = 'round';
    
    ecgCtx.beginPath();
    
    const step = width / ecgMaxPoints;
    for (let i = 0; i < ecgData.length; i++) {
        const x = i * step;
        const y = centerY - ecgData[i] * (height * 0.35);
        
        if (i === 0) {
            ecgCtx.moveTo(x, y);
        } else {
            ecgCtx.lineTo(x, y);
        }
    }
    
    ecgCtx.stroke();
    
    // 当前点发光
    const lastX = (ecgData.length - 1) * step;
    const lastY = centerY - ecgData[ecgData.length - 1] * (height * 0.35);
    
    if (pulseIntensity > 0.3 || isAlarming) {
        const glowRadius = Math.max(1, isAlarming ? 30 : 20);
        const glowGradient = ecgCtx.createRadialGradient(lastX, lastY, 0, lastX, lastY, glowRadius);
        glowGradient.addColorStop(0, 'rgba(255, 26, 26, 0.8)');
        glowGradient.addColorStop(1, 'rgba(255, 26, 26, 0)');
        
        ecgCtx.fillStyle = glowGradient;
        ecgCtx.beginPath();
        ecgCtx.arc(lastX, lastY, glowRadius, 0, Math.PI * 2);
        ecgCtx.fill();
    }
    
    // 只在详细日志级别输出
    log(LOG_MODULES.ECG, `ECG 绘制完成，样式: ${currentStyle}, 警报状态: ${isAlarming}, 脉冲强度: ${pulseIntensity.toFixed(2)}`, 'detailed');
}

// 添加新的ECG数据点
export function addECGDataPoint(value) {
    ecgData.push(value);
    if (ecgData.length > ecgMaxPoints) {
        ecgData.shift();
    }
}

// 获取当前ECG数据
export function getECGData() {
    return ecgData;
}

// 设置ECG数据（用于测试或特殊情况）
export function setECGData(data) {
    ecgData.length = 0;
    ecgData.push(...data);
    if (ecgData.length > ecgMaxPoints) {
        ecgData.splice(0, ecgData.length - ecgMaxPoints);
    }
}
// ECG 相关变量
export const ecgData = [];
export const ecgMaxPoints = 300;
export let ecgCanvas = null;
export let ecgCtx = null;

// 导入日志管理模块
import { log, LOG_MODULES } from './logger.js';

// ECG 配置
let ecgConfig = {
    抖动: 0.05,
    预设: '默认',
    效果: '标准',
    gridColor: '#ffff00',
    gridOpacity: 0.1,
    lineColor: '#ff0033',
    lineWidth: 2,
    pWave: 0.15,
    qWave: -0.1,
    rWave: 0.8,
    sWave: -0.2,
    tWave: 0.25
};

// ECG 预设配置
const ecgPresets = {
    '默认': {
        pWave: 0.15,
        qWave: -0.1,
        rWave: 0.8,
        sWave: -0.2,
        tWave: 0.25,
        抖动: 0.05
    },
    '正常': {
        pWave: 0.12,
        qWave: -0.08,
        rWave: 0.7,
        sWave: -0.15,
        tWave: 0.2,
        抖动: 0.03
    },
    '心肌梗塞': {
        pWave: 0.08,
        qWave: -0.3,
        rWave: 0.4,
        sWave: -0.25,
        tWave: -0.15,
        抖动: 0.08
    },
    '干扰': {
        pWave: 0.2,
        qWave: -0.15,
        rWave: 0.9,
        sWave: -0.25,
        tWave: 0.3,
        抖动: 0.2
    }
};

// ECG 效果配置
const ecgEffects = {
    '标准': {
        lineStyle: 'smooth',
        glow: true,
        shadow: false
    },
    '科技感': {
        lineStyle: 'sharp',
        glow: true,
        shadow: true
    },
    '极简': {
        lineStyle: 'smooth',
        glow: false,
        shadow: false
    },
    '复古': {
        lineStyle: 'sharp',
        glow: false,
        shadow: true
    }
};

// ECG 显示样式配置
const ecgStyles = {
    style1: {
        grid: true,
        gridColor: 'rgba(255, 255, 255, 0.05)',
        gridSize: 40,
        gradient: (ctx, width) => {
            const gradient = ctx.createLinearGradient(0, 0, width, 0);
            // 使用与心率显示相同的颜色
            const color = getComputedStyle(document.documentElement).getPropertyValue('--heart-rate-color');
            // 将 CSS 颜色转换为 rgba
            const tempEl = document.createElement('div');
            tempEl.style.color = color;
            document.body.appendChild(tempEl);
            const computedColor = getComputedStyle(tempEl).color;
            document.body.removeChild(tempEl);
            
            // 提取 RGB 值
            const rgbMatch = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (rgbMatch) {
                const r = rgbMatch[1];
                const g = rgbMatch[2];
                const b = rgbMatch[3];
                gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
                gradient.addColorStop(0.8, `rgba(${r}, ${g}, ${b}, 1)`);
            } else {
                //  fallback to default color
                gradient.addColorStop(0, 'rgba(154, 205, 50, 0)');
                gradient.addColorStop(0.8, 'rgba(154, 205, 50, 1)');
            }
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

// 设置ECG配置
export function setEcgConfig(config) {
    ecgConfig = { ...ecgConfig, ...config };
    if (config.预设 && ecgPresets[config.预设]) {
        const preset = ecgPresets[config.预设];
        ecgConfig = { ...ecgConfig, ...preset };
    }
    // 确保所有必要的参数都存在
    if (config.pWave !== undefined) ecgConfig.pWave = config.pWave;
    if (config.qWave !== undefined) ecgConfig.qWave = config.qWave;
    if (config.rWave !== undefined) ecgConfig.rWave = config.rWave;
    if (config.sWave !== undefined) ecgConfig.sWave = config.sWave;
    if (config.tWave !== undefined) ecgConfig.tWave = config.tWave;
    if (config.gridColor !== undefined) ecgConfig.gridColor = config.gridColor;
    if (config.gridOpacity !== undefined) ecgConfig.gridOpacity = config.gridOpacity;
    if (config.lineColor !== undefined) ecgConfig.lineColor = config.lineColor;
    if (config.lineWidth !== undefined) ecgConfig.lineWidth = config.lineWidth;
}

// 获取ECG配置
export function getEcgConfig() {
    return ecgConfig;
}

// 随机生成ECG配置
export function randomizeEcgConfig() {
    const randomPreset = Object.keys(ecgPresets)[Math.floor(Math.random() * Object.keys(ecgPresets).length)];
    const random抖动 = (Math.random() * 0.2).toFixed(2);
    setEcgConfig({ 预设: randomPreset, 抖动: parseFloat(random抖动) });
    return ecgConfig;
}

// ============ 初始化 ECG Canvas ============
export function initECG(currentStyle) {
    // 使用统一的canvas元素
    ecgCanvas = document.getElementById('ecg-canvas');
    
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
    
    // 获取当前配置
    const config = ecgConfig;
    
    // 生成波形
    const pWave = t < 0.1 ? config.pWave * Math.sin((t / 0.1) * Math.PI) : 0;
    const qStart = 0.12;
    const qWave = (t > qStart && t < qStart + 0.02) ? config.qWave * Math.sin(((t - qStart) / 0.02) * Math.PI) : 0;
    const rStart = 0.14;
    const rWave = (t > rStart && t < rStart + 0.04) ? config.rWave * Math.sin(((t - rStart) / 0.04) * Math.PI) : 0;
    const sStart = 0.18;
    const sWave = (t > sStart && t < sStart + 0.03) ? config.sWave * Math.sin(((t - sStart) / 0.03) * Math.PI) : 0;
    const tStart = 0.25;
    const tWave = (t > tStart && t < tStart + 0.12) ? config.tWave * Math.sin(((t - tStart) / 0.12) * Math.PI) : 0;
    
    // 添加抖动
    const jitter = (Math.random() - 0.5) * config.抖动;
    const ecgValue = pWave + qWave + rWave + sWave + tWave + jitter;
    
    // 只在详细日志级别输出
    log(LOG_MODULES.ECG, `生成ECG值: ${ecgValue.toFixed(2)}, 心率: ${bpm} BPM, 预设: ${config.预设}, 抖动: ${config.抖动}`, 'detailed');
    
    return ecgValue;
}

// ============ 绘制 ECG ============
export function drawECG(currentStyle, isAlarming, pulseIntensity) {
    if (!ecgCtx || !ecgCanvas) return;
    
    const width = ecgCanvas.width / window.devicePixelRatio;
    const height = ecgCanvas.height / window.devicePixelRatio;
    const centerY = height / 2;
    
    // 获取当前样式配置和效果配置
    const styleConfig = ecgStyles[currentStyle] || ecgStyles.style1;
    const config = ecgConfig;
    const effect = ecgEffects[config.效果] || ecgEffects['标准'];
    
    ecgCtx.clearRect(0, 0, width, height);
    
    // 网格已通过CSS在.ecg-grid div中实现，不再在canvas上绘制重复网格
    
    // 中线
    ecgCtx.strokeStyle = 'rgba(255, 26, 26, 0.1)';
    ecgCtx.lineWidth = 1;
    ecgCtx.beginPath();
    ecgCtx.moveTo(0, centerY);
    ecgCtx.lineTo(width, centerY);
    ecgCtx.stroke();
    
    // ECG 曲线
    const gradient = styleConfig.gradient(ecgCtx, width);
    
    // 使用配置的线条颜色和宽度
    const lineColor = config.lineColor || '#ff0033';
    const lineWidth = config.lineWidth || 2;
    ecgCtx.strokeStyle = isAlarming ? '#ff1a1a' : lineColor;
    ecgCtx.lineWidth = isAlarming ? styleConfig.alarmingLineWidth : lineWidth;
    ecgCtx.lineCap = effect.lineStyle === 'sharp' ? 'square' : 'round';
    ecgCtx.lineJoin = effect.lineStyle === 'sharp' ? 'bevel' : 'round';
    
    // 添加阴影效果
    if (effect.shadow) {
        ecgCtx.shadowColor = 'rgba(255, 26, 26, 0.5)';
        ecgCtx.shadowBlur = 10;
        ecgCtx.shadowOffsetX = 0;
        ecgCtx.shadowOffsetY = 0;
    }
    
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
    
    // 重置阴影
    ecgCtx.shadowColor = 'transparent';
    ecgCtx.shadowBlur = 0;
    
    // 当前点发光
    const lastX = (ecgData.length - 1) * step;
    const lastY = centerY - ecgData[ecgData.length - 1] * (height * 0.35);
    
    if ((effect.glow && pulseIntensity > 0.3) || isAlarming) {
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
    log(LOG_MODULES.ECG, `ECG 绘制完成，样式: ${currentStyle}, 警报状态: ${isAlarming}, 脉冲强度: ${pulseIntensity.toFixed(2)}, 效果: ${config.效果}`, 'detailed');
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
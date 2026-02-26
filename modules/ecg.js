// ECG 相关变量
export const ecgData = [];
export const ecgMaxPoints = 600; // 增加点数以获得更平滑的波形
export let ecgCanvas = null;
export let ecgCtx = null;
let currentScanX = 0; // 当前扫描位置
let lastScanX = 0; // 上一次的扫描位置
const scanSpeed = 2.0; // 扫描速度（像素/帧）
let ecgBuffer = []; // ECG数据缓冲区

// 导入日志管理模块
import { log, LOG_MODULES } from './logger.js';

// ECG 配置
let ecgConfig = {
    抖动: 0.05,
    预设: '默认',
    效果: '标准',
    gridColor: '#ffff00',
    gridOpacity: 1,
    gridHeight: 200,
    lineColor: '#ff0033',
    lineWidth: 1,
    lineHeight: 0.5, // 线条高度位置，0.5为中间
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
        shadow: false,
        gradient: true
    },
    '科技感': {
        lineStyle: 'sharp',
        glow: true,
        shadow: true,
        gradient: true,
        pulseEffect: true
    },
    '极简': {
        lineStyle: 'smooth',
        glow: false,
        shadow: false,
        gradient: false
    },
    '复古': {
        lineStyle: 'sharp',
        glow: false,
        shadow: true,
        gradient: false
    },
    '霓虹': {
        lineStyle: 'smooth',
        glow: true,
        shadow: true,
        gradient: true,
        neonEffect: true
    },
    '未来': {
        lineStyle: 'sharp',
        glow: true,
        shadow: false,
        gradient: true,
        pulseEffect: true
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

// 更新ECG网格样式
function updateEcgGridStyle() {
    const gridElement = document.querySelector('.ecg-grid');
    const wrapperElement = document.querySelector('.ecg-wrapper');
    if (gridElement) {
        const color = ecgConfig.gridColor || '#ffff00';
        let opacity = ecgConfig.gridOpacity;
        if (opacity === undefined || opacity === null) opacity = 1;
        const gridHeight = ecgConfig.gridHeight || 200;
        
        // 将十六进制颜色转换为RGBA
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        // 更新表格高度
        if (wrapperElement) {
            wrapperElement.style.minHeight = `${gridHeight}px`;
            wrapperElement.style.maxHeight = `${gridHeight}px`;
        }
        
        // 计算网格大小，确保12条水平线，对称分布
        const lineCount = 12;
        const gridSize = gridHeight / (lineCount - 1);
        
        if (opacity <= 0) {
            // 透明度为0时完全隐藏网格
            gridElement.style.backgroundImage = 'none';
            // 同时隐藏wrapper的边框
            if (wrapperElement) {
                wrapperElement.style.borderTop = 'none';
                wrapperElement.style.borderBottom = 'none';
            }
        } else {
            // 正常显示网格，使用计算的网格大小
            gridElement.style.backgroundImage = `
                linear-gradient(rgba(${r}, ${g}, ${b}, ${opacity}) 1px, transparent 1px),
                linear-gradient(90deg, rgba(${r}, ${g}, ${b}, ${opacity}) 1px, transparent 1px)
            `;
            gridElement.style.backgroundSize = `${gridSize}px ${gridSize}px`;
            gridElement.style.backgroundPosition = '0 0, 0 0';
            // wrapper的边框使用网格颜色，确保线条粗细一致
            if (wrapperElement) {
                wrapperElement.style.borderTop = `1px solid rgba(${r}, ${g}, ${b}, ${opacity})`;
                wrapperElement.style.borderBottom = `1px solid rgba(${r}, ${g}, ${b}, ${opacity})`;
            }
        }
    }
}

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
    if (config.lineHeight !== undefined) ecgConfig.lineHeight = config.lineHeight;
    if (config.gridHeight !== undefined) ecgConfig.gridHeight = config.gridHeight;
    
    // 更新网格样式
    updateEcgGridStyle();
}

// 获取ECG配置
export function getEcgConfig() {
    return ecgConfig;
}

// 随机生成ECG配置
export function randomizeEcgConfig() {
    // 随机生成各项参数，不使用预设模板
    const randomConfig = {
        预设: '--',
        抖动: parseFloat((Math.random() * 0.2).toFixed(2)),
        pWave: parseFloat((Math.random() * 0.3).toFixed(2)),
        qWave: parseFloat((Math.random() * -0.4).toFixed(2)),
        rWave: parseFloat((Math.random() * 0.8 + 0.2).toFixed(2)), // 确保R波有足够幅度
        sWave: parseFloat((Math.random() * -0.4).toFixed(2)),
        tWave: parseFloat((Math.random() * 0.4 - 0.1).toFixed(2)) // 允许T波为负
    };
    setEcgConfig(randomConfig);
    return randomConfig;
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
    
    // 初始化时应用网格颜色
    updateEcgGridStyle();
    
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
    ecgBuffer.length = 0;
    currentScanX = 0;
    lastScanX = 0;
    
    for (let i = 0; i < ecgMaxPoints; i++) {
        ecgData.push(0);
        ecgBuffer.push(0);
    }
    
    if (ecgCtx && ecgCanvas) {
        // 清除整块画布（物理像素），保证与绘制坐标系一致
        ecgCtx.clearRect(0, 0, ecgCanvas.width, ecgCanvas.height);
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
    
    const dpr = window.devicePixelRatio || 1;
    const width = ecgCanvas.width / dpr;
    const height = ecgCanvas.height / dpr;
    
    // 使用逻辑坐标绘制，缩放以填满高分辨率 canvas，保证波形居中
    ecgCtx.save();
    ecgCtx.scale(dpr, dpr);
    
    // 获取当前样式配置和效果配置
    const styleConfig = ecgStyles[currentStyle] || ecgStyles.style1;
    const config = ecgConfig;
    const effect = ecgEffects[config.效果] || ecgEffects['标准'];
    
    // 使用配置的线条颜色和宽度
    const lineColor = config.lineColor || '#ff0033'; // 默认红色
    const lineWidth = config.lineWidth || 2;
    // 使用lineHeight配置控制线条垂直位置，0.5为中间
    const lineHeight = config.lineHeight || 0.5;
    const centerY = height * lineHeight;
    
    const step = width / ecgMaxPoints;
    const previousScanX = lastScanX;
    
    // 更新扫描位置 - 增加扫描速度以解决线条出表格后回来慢的问题
    currentScanX += scanSpeed * 1.5;
    if (currentScanX > width) {
        currentScanX = 0;
    }
    
    // 初始化时清空画布并填充初始数据
    if (ecgData.length === 0) {
        ecgCtx.clearRect(0, 0, width, height);
        // 初始化数据缓冲区并填充一些初始波形数据
        ecgBuffer.length = 0;
        for (let i = 0; i < ecgMaxPoints; i++) {
            // 生成一些初始波形数据，让第一次加载就有完整波形
            const phase = (i / ecgMaxPoints) * Math.PI * 2;
            const value = Math.sin(phase) * 0.3 + Math.sin(phase * 3) * 0.1;
            ecgBuffer.push(value);
        }
        // 直接绘制完整波形
        ecgCtx.strokeStyle = lineColor;
        ecgCtx.lineWidth = lineWidth;
        ecgCtx.lineCap = 'round';
        ecgCtx.lineJoin = 'round';
        ecgCtx.beginPath();
        let started = false;
        for (let i = 0; i < ecgBuffer.length; i++) {
            const x = i * step;
            const y = centerY - ecgBuffer[i] * (height * 0.35);
            if (!started) {
                ecgCtx.moveTo(x, y);
                started = true;
            } else {
                ecgCtx.lineTo(x, y);
            }
        }
        ecgCtx.stroke();
    }
    
    // 1. 清除旧的红点
    const clearWidth = 40;
    let clearStartX = previousScanX - clearWidth / 2;
    let clearEndX = previousScanX + clearWidth / 2;
    
    if (clearEndX > width && clearStartX < 0) {
        // 边界情况
        ecgCtx.clearRect(clearStartX, 0, width - clearStartX, height);
        ecgCtx.clearRect(0, 0, clearEndX, height);
    } else if (clearEndX > width) {
        // 跨右边界
        ecgCtx.clearRect(Math.max(0, clearStartX), 0, width - Math.max(0, clearStartX), height);
        ecgCtx.clearRect(0, 0, clearEndX - width, height);
    } else if (clearStartX < 0) {
        // 跨左边界
        ecgCtx.clearRect(0, 0, clearEndX, height);
        ecgCtx.clearRect(width + clearStartX, 0, -clearStartX, height);
    } else {
        // 正常情况
        ecgCtx.clearRect(Math.max(0, clearStartX), 0, Math.min(width, clearEndX) - Math.max(0, clearStartX), height);
    }
    
    // 2. 绘制完整波形（从0到扫描点位置）
    const drawEndIndex = Math.floor(currentScanX / step);
    
    if (drawEndIndex > 0) {
        // 绘制渐变效果
        if (effect.gradient) {
            const gradient = ecgCtx.createLinearGradient(0, 0, width, 0);
            const r = parseInt(lineColor.slice(1, 3), 16);
            const g = parseInt(lineColor.slice(3, 5), 16);
            const b = parseInt(lineColor.slice(5, 7), 16);
            
            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.3)`);
            gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 1)`);
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.3)`);
            
            ecgCtx.strokeStyle = gradient;
        } else {
            ecgCtx.strokeStyle = isAlarming ? '#ff0000' : lineColor;
        }
        
        // 设置线条宽度
        let currentLineWidth = isAlarming ? styleConfig.alarmingLineWidth : lineWidth;
        
        // 脉冲效果
        if (effect.pulseEffect && pulseIntensity > 0) {
            currentLineWidth *= (1 + pulseIntensity * 0.5);
        }
        
        ecgCtx.lineWidth = currentLineWidth;
        
        // 设置线条样式
        if (effect.lineStyle === 'sharp') {
            ecgCtx.lineCap = 'square';
            ecgCtx.lineJoin = 'bevel';
        } else {
            ecgCtx.lineCap = 'round';
            ecgCtx.lineJoin = 'round';
        }
        
        // 添加阴影效果
        if (effect.shadow) {
            // 根据效果类型调整阴影强度
            let shadowOpacity = 0.5;
            let shadowBlur = 8;
            
            if (config.效果 === '科技感') {
                shadowOpacity = 0.2;
                shadowBlur = 2;
            } else if (config.效果 === '霓虹') {
                shadowOpacity = 0.8;
                shadowBlur = 12;
            }
            
            ecgCtx.shadowColor = isAlarming ? `rgba(255, 0, 0, ${shadowOpacity})` : `rgba(${parseInt(lineColor.slice(1, 3), 16)}, ${parseInt(lineColor.slice(3, 5), 16)}, ${parseInt(lineColor.slice(5, 7), 16)}, ${shadowOpacity})`;
            ecgCtx.shadowBlur = shadowBlur;
            ecgCtx.shadowOffsetX = 0;
            ecgCtx.shadowOffsetY = 0;
        }
        
        // 霓虹效果
        if (effect.neonEffect) {
            // 先绘制一个更粗的发光轮廓
            ecgCtx.save();
            ecgCtx.strokeStyle = isAlarming ? '#ff0000' : lineColor;
            ecgCtx.lineWidth = currentLineWidth * 3;
            ecgCtx.globalAlpha = 0.3;
            
            ecgCtx.beginPath();
            let started = false;
            
            for (let i = 0; i <= drawEndIndex; i++) {
                const x = i * step;
                if (x > currentScanX) break; // 只画到扫描点位置
                
                const dataIdx = i;
                if (dataIdx >= 0 && dataIdx < ecgBuffer.length) {
                    const y = centerY - ecgBuffer[dataIdx] * (height * 0.35);
                    if (!started) {
                        ecgCtx.moveTo(x, y);
                        started = true;
                    } else {
                        ecgCtx.lineTo(x, y);
                    }
                }
            }
            
            ecgCtx.stroke();
            ecgCtx.restore();
        }
        
        // 绘制主线条
        ecgCtx.beginPath();
        let started = false;
        
        for (let i = 0; i <= drawEndIndex; i++) {
            const x = i * step;
            if (x > currentScanX) break; // 只画到扫描点位置
            
            const dataIdx = i;
            if (dataIdx >= 0 && dataIdx < ecgBuffer.length) {
                const y = centerY - ecgBuffer[dataIdx] * (height * 0.35);
                if (!started) {
                    ecgCtx.moveTo(x, y);
                    started = true;
                } else {
                    ecgCtx.lineTo(x, y);
                }
            }
        }
        
        ecgCtx.stroke();
        
        // 重置阴影
        ecgCtx.shadowColor = 'transparent';
        ecgCtx.shadowBlur = 0;
    }
    
    // 3. 绘制新的红点（扫描点）- 极简效果除外
    if (config.效果 !== '极简') {
        const redDotX = currentScanX;
        const redDotDataIdx = Math.floor(redDotX / step);
        let redDotY = centerY;
        
        if (redDotDataIdx >= 0 && redDotDataIdx < ecgBuffer.length) {
            redDotY = centerY - ecgBuffer[redDotDataIdx] * (height * 0.35);
        }
        
        // 绘制红点发光效果（更大更亮），使用线条颜色
        const glowRadius = isAlarming ? 25 : effect.neonEffect ? 30 : 15;
        const glowGradient = ecgCtx.createRadialGradient(redDotX, redDotY, 0, redDotX, redDotY, glowRadius);
        const dotColor = isAlarming ? '#ff0000' : lineColor;
        const r = parseInt(dotColor.slice(1, 3), 16);
        const g = parseInt(dotColor.slice(3, 5), 16);
        const b = parseInt(dotColor.slice(5, 7), 16);
        
        // 增强发光效果
        glowGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
        glowGradient.addColorStop(0.1, `rgba(${r}, ${g}, ${b}, 0.9)`);
        glowGradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.6)`);
        glowGradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.3)`);
        glowGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        
        ecgCtx.fillStyle = glowGradient;
        ecgCtx.beginPath();
        ecgCtx.arc(redDotX, redDotY, glowRadius, 0, Math.PI * 2);
        ecgCtx.fill();
        
        // 绘制外圈，使用线条颜色
        const outerRadius = isAlarming ? 10 : effect.neonEffect ? 12 : 6;
        ecgCtx.fillStyle = dotColor;
        ecgCtx.beginPath();
        ecgCtx.arc(redDotX, redDotY, outerRadius, 0, Math.PI * 2);
        ecgCtx.fill();
        
        // 绘制红点核心（更亮的白色中心）
        const innerRadius = isAlarming ? 5 : effect.neonEffect ? 6 : 3;
        ecgCtx.fillStyle = '#ffffff';
        ecgCtx.beginPath();
        ecgCtx.arc(redDotX, redDotY, innerRadius, 0, Math.PI * 2);
        ecgCtx.fill();
        
        // 脉冲效果
        if (effect.pulseEffect && pulseIntensity > 0) {
            // 绘制一个脉动的外圈
            ecgCtx.fillStyle = glowGradient;
            ecgCtx.globalAlpha = pulseIntensity * 0.5;
            ecgCtx.beginPath();
            ecgCtx.arc(redDotX, redDotY, glowRadius * (1 + pulseIntensity), 0, Math.PI * 2);
            ecgCtx.fill();
            ecgCtx.globalAlpha = 1;
        }
    }
    
    // 更新上一次的扫描位置
    lastScanX = currentScanX;
    
    ecgCtx.restore();
    
    // 绘制预览框
    updateECGPreview();
    
    // 只在详细日志级别输出
    log(LOG_MODULES.ECG, `ECG 绘制完成，样式: ${currentStyle}, 警报状态: ${isAlarming}, 脉冲强度: ${pulseIntensity.toFixed(2)}, 效果: ${config.效果}`, 'detailed');
}

// 添加新的ECG数据点
export function addECGDataPoint(value) {
    ecgData.push(value);
    if (ecgData.length > ecgMaxPoints) {
        ecgData.shift();
    }
    
    // 同时更新数据缓冲区
    if (!ecgCanvas) return;
    const width = ecgCanvas.width / window.devicePixelRatio;
    const step = width / ecgMaxPoints;
    
    // 找到当前扫描位置对应的数据索引并更新
    const scanIndex = Math.floor(currentScanX / step);
    if (scanIndex >= 0 && scanIndex < ecgBuffer.length) {
        ecgBuffer[scanIndex] = value;
    }
}

// 获取 ECG 数据
export function getECGData() {
    return [...ecgData];
}

// 设置 ECG 数据
export function setECGData(data) {
    ecgData = [...data];
}

// 更新 ECG 预览框
export function updateECGPreview() {
    const previewCanvas = document.getElementById('ecgEffectPreview');
    if (!previewCanvas || !ecgCanvas) return;
    
    const previewCtx = previewCanvas.getContext('2d');
    if (!previewCtx) return;
    
    // 清除预览画布
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    
    // 将主画布内容缩小绘制到预览画布
    previewCtx.drawImage(
        ecgCanvas,
        0, 0, ecgCanvas.width, ecgCanvas.height,
        0, 0, previewCanvas.width, previewCanvas.height
    );
}
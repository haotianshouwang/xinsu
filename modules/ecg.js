// ECG 相关变量
export const ecgData = [];
export const ecgMaxPoints = 300;
export let ecgCanvas = null;
export let ecgCtx = null;

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
        return;
    }
    
    updateECGCanvas();
    ecgCtx = ecgCanvas.getContext('2d');
    
    // 清空并初始化为直线
    ecgData.length = 0;
    for (let i = 0; i < ecgMaxPoints; i++) {
        ecgData.push(0);
    }
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
}

// ============ 清空ECG数据为直线 ============
export function clearECGToZero() {
    ecgData.length = 0;
    for (let i = 0; i < ecgMaxPoints; i++) {
        ecgData.push(0);
    }
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
    
    return pWave + qWave + rWave + sWave + tWave;
}

// ============ 绘制 ECG ============
export function drawECG(isStyle1, isAlarming, pulseIntensity) {
    if (!ecgCtx || !ecgCanvas) return;
    
    const width = ecgCanvas.width / window.devicePixelRatio;
    const height = ecgCanvas.height / window.devicePixelRatio;
    const centerY = height / 2;
    
    ecgCtx.clearRect(0, 0, width, height);
    
    // 绘制网格（样式1）
    if (isStyle1) {
        ecgCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ecgCtx.lineWidth = 1;
        ecgCtx.beginPath();
        const gridSize = 40;
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
    const gradient = ecgCtx.createLinearGradient(0, 0, width, 0);
    if (isStyle1) {
        gradient.addColorStop(0, 'rgba(255, 0, 51, 0)');
        gradient.addColorStop(0.8, 'rgba(255, 0, 51, 1)');
        gradient.addColorStop(1, '#fff');
    } else {
        gradient.addColorStop(0, 'rgba(255, 26, 26, 0.1)');
        gradient.addColorStop(0.7, 'rgba(255, 26, 26, 0.8)');
        gradient.addColorStop(1, '#ff1a1a');
    }
    
    ecgCtx.strokeStyle = isAlarming ? '#ff1a1a' : gradient;
    ecgCtx.lineWidth = isAlarming ? 2.5 : 2;
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
}
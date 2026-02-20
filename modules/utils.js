// 调试日志
export function logDebug(debugContent, debugCount, type, data, highlight = false) {
    if (!debugContent) return;
    
    const now = new Date();
    const time = now.toTimeString().split(' ')[0];
    
    const line = document.createElement('div');
    line.className = 'debug-line';
    line.innerHTML = `
        <span class="debug-time">${time}</span>
        <span class="debug-type">${type}</span>
        <span class="debug-data ${highlight ? 'highlight' : ''}">${data}</span>
    `;
    
    debugContent.insertBefore(line, debugContent.firstChild);
    
    // 限制日志条数
    while (debugContent.children.length > 50) {
        debugContent.removeChild(debugContent.lastChild);
    }
    
    // 更新数据包计数
    if (debugCount) {
        const packetCount = parseInt(debugCount.textContent) || 0;
        debugCount.textContent = `${packetCount + 1} packets`;
    }
}

// 样式切换功能
export function toggleStyle(body, renderer, currentStyle, resetParticles, initECG, updateECGCanvas, onWindowResize) {
    console.log('Toggle style function called');
    if (body.classList.contains('style1')) {
        console.log('Switching to style2');
        body.classList.remove('style1');
        body.classList.add('style2');
        // 更新Three.js渲染器背景颜色为样式2的背景色
        if (renderer) {
            console.log('Updating background to 0x050505');
            renderer.setClearColor(0x050505, 1);
        }
        // 重置粒子系统为样式2
        currentStyle = 'style2';
        resetParticles('style2');
        // 重新初始化ECG相关变量，使用新样式的canvas元素
        initECG('style2');
        updateECGCanvas();
    } else {
        console.log('Switching to style1');
        body.classList.remove('style2');
        body.classList.add('style1');
        // 更新Three.js渲染器背景颜色为样式1的背景色
        if (renderer) {
            console.log('Updating background to 0x000000');
            renderer.setClearColor(0x000000, 1);
        }
        // 重置粒子系统为样式1
        currentStyle = 'style1';
        resetParticles('style1');
        // 重新初始化ECG相关变量，使用新样式的canvas元素
        initECG('style1');
        updateECGCanvas();
    }
    // 确保3D场景大小正确
    onWindowResize();
    console.log('Style toggle completed');
    return currentStyle;
}

// 获取DOM元素
export function getDOMElements() {
    const elements = {
        connectBtn: document.getElementById('connectBtn'),
        connectBtn2: document.getElementById('connectBtn2'),
        statusText: document.getElementById('statusText'),
        statusDot: document.getElementById('statusDot'),
        statusIndicator: document.getElementById('statusIndicator'),
        heartRateEl: document.getElementById('bpm-display'), // 使用bpm-display作为heartRateEl
        bpmDisplay: document.getElementById('bpm-display'),
        bpmUnit: document.getElementById('bpm-unit'),
        connectionStatus: document.getElementById('connection-status'),
        soundToggle: document.getElementById('soundToggle'),
        audioToggle: document.getElementById('audioToggle'),
        canvasContainer: document.getElementById('canvas-container'),
        debugContent: document.getElementById('debugContent'),
        debugCount: document.getElementById('debugCount'),
        alarmOverlay: document.getElementById('alarmOverlay')
    };
    
    // 调试：检查heartRateEl是否获取成功
    console.log('getDOMElements - heartRateEl:', elements.heartRateEl);
    
    return elements;
}

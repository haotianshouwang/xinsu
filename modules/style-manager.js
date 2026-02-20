// 样式管理模块

// 导出当前样式
export let currentStyle = 'style1';

// 导入日志管理模块
import { log, LOG_MODULES } from './logger.js';

// 样式配置
export const styleConfig = {
    style1: {
        name: 'Style 1',
        description: 'Cyberpunk style with grid background',
        canvasId: 'ecg-canvas-style1',
        backgroundColor: 0x000000
    }
};

// 初始化样式
export function initStyle() {
    document.body.classList.add(currentStyle);
    log(LOG_MODULES.STYLE, `初始化样式: ${currentStyle}`, 'detailed');
}

// 切换样式 - 现在始终保持style1
export function toggleStyle(body, resetParticles, initECG, updateECGCanvas, onWindowResize) {
    const oldStyle = currentStyle;
    
    // 确保始终使用style1
    if (!body.classList.contains('style1')) {
        body.classList.remove('style2');
        body.classList.add('style1');
        currentStyle = 'style1';
    }
    
    log(LOG_MODULES.STYLE, `样式保持: ${currentStyle}`, 'basic');
    
    // 重置粒子系统
    if (resetParticles) {
        resetParticles(currentStyle);
    }
    
    // 重新初始化ECG
    if (initECG) {
        initECG(currentStyle);
    }
    
    // 更新ECG画布
    if (updateECGCanvas) {
        updateECGCanvas();
    }
    
    // 处理窗口大小调整
    if (onWindowResize) {
        onWindowResize();
    }
    
    return currentStyle;
}

// 获取当前样式
export function getCurrentStyle() {
    return currentStyle;
}

// 设置样式 - 现在始终使用style1
export function setStyle(styleName, body, resetParticles, initECG, updateECGCanvas, onWindowResize) {
    const oldStyle = currentStyle;
    
    // 始终使用style1，忽略传入的styleName
    const newStyle = 'style1';
    
    // 移除所有样式类
    Object.keys(styleConfig).forEach(style => {
        body.classList.remove(style);
    });
    
    // 添加style1样式类
    body.classList.add(newStyle);
    currentStyle = newStyle;
    
    log(LOG_MODULES.STYLE, `设置样式: ${oldStyle} → ${currentStyle}`, 'basic');
    
    // 重置粒子系统
    if (resetParticles) {
        resetParticles(currentStyle);
    }
    
    // 重新初始化ECG
    if (initECG) {
        initECG(currentStyle);
    }
    
    // 更新ECG画布
    if (updateECGCanvas) {
        updateECGCanvas();
    }
    
    // 处理窗口大小调整
    if (onWindowResize) {
        onWindowResize();
    }
    
    return currentStyle;
}

// 获取样式配置
export function getStyleConfig(styleName = currentStyle) {
    return styleConfig[styleName] || styleConfig.style1;
}

// 获取ECG画布ID
export function getECGCanvasId(styleName = currentStyle) {
    const config = getStyleConfig(styleName);
    return config.canvasId;
}

// 获取背景颜色
export function getBackgroundColor(styleName = currentStyle) {
    const config = getStyleConfig(styleName);
    return config.backgroundColor;
}

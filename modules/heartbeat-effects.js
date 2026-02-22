// 心跳联动效果模块

// 心跳联动效果配置
let heartbeatEffectConfig = {
    enabled: true,
    type: 'pulse', // pulse: 脉冲效果, scale: 缩放效果
    intensity: 1,
    color: '#ff0033'
};

// 发光效果配置
let glowEffectConfig = {
    enabled: true,
    color: '#ff0033',
    intensity: 0.5, // 默认强度设为0.5，不要太夸张
    blur: 8
};

// 3D效果配置
let threeDEffectConfig = {
    enabled: true,
    perspective: 1000,
    rotationX: 12,
    rotationY: -5,
    depth: 20
};

// 应用心跳联动效果
function applyHeartbeatEffect(element, pulseIntensity, style = 'default') {
    if (!element || !heartbeatEffectConfig.enabled) return;
    
    const intensity = pulseIntensity * heartbeatEffectConfig.intensity;
    const effectType = heartbeatEffectConfig.type;
    
    // 重置样式
    element.style.transition = 'all 0.3s ease';
    
    // 检测元素的样式类型
    let elementStyle = style;
    const parentElement = element.parentElement;
    if (parentElement) {
        // 检查父元素的类名，获取具体的样式类型
        if (parentElement.classList.contains('style-futuristic')) {
            elementStyle = 'futuristic';
        } else if (parentElement.classList.contains('style-neon')) {
            elementStyle = 'neon';
        } else if (parentElement.classList.contains('style-retro')) {
            elementStyle = 'retro';
        } else if (parentElement.classList.contains('style-minimal')) {
            elementStyle = 'minimal';
        } else if (parentElement.classList.contains('style-diode')) {
            elementStyle = 'diode';
        } else if (parentElement.classList.contains('style-digital')) {
            elementStyle = 'digital';
        } else if (parentElement.classList.contains('style-analog')) {
            elementStyle = 'analog';
        } else if (parentElement.classList.contains('style-3d')) {
            elementStyle = '3d';
        } else if (parentElement.classList.contains('style-pulse')) {
            elementStyle = 'pulse';
        }
    }
    
    // 确保即使没有检测到父元素样式类，也使用传入的style参数
    if (elementStyle === 'default' && style !== 'default') {
        elementStyle = style;
    }
    
    // 根据样式类型应用不同的心跳效果
    switch (elementStyle) {
        case 'futuristic':
            // 未来科技样式：快速脉冲
            if (intensity > 0.3) {
                element.style.transform = `scale(${1 + intensity * 0.2})`;
                element.style.transition = 'transform 0.1s ease-out';
            } else {
                element.style.transform = 'scale(1)';
                element.style.transition = 'transform 0.3s ease-out';
            }
            break;
        
        case 'neon':
            // 霓虹效果样式：强烈的脉冲+亮度变化
            if (intensity > 0.3) {
                element.style.transform = `scale(${1 + intensity * 0.3})`;
                element.style.opacity = `${0.8 + intensity * 0.2}`;
                element.style.transition = 'all 0.15s ease-out';
            } else {
                element.style.transform = 'scale(1)';
                element.style.opacity = '1';
                element.style.transition = 'all 0.4s ease-out';
            }
            break;
        
        case 'retro':
            // 复古风格样式：轻微的上下跳动
            if (intensity > 0.3) {
                element.style.transform = `translateY(-${intensity * 5}px)`;
                element.style.transition = 'transform 0.1s ease-out';
            } else {
                element.style.transform = 'translateY(0)';
                element.style.transition = 'transform 0.3s ease-out';
            }
            break;
        
        case 'minimal':
            // 极简风格样式：非常轻微的缩放
            if (intensity > 0.3) {
                element.style.transform = `scale(${1 + intensity * 0.1})`;
                element.style.transition = 'transform 0.2s ease-out';
            } else {
                element.style.transform = 'scale(1)';
                element.style.transition = 'transform 0.4s ease-out';
            }
            break;
        
        case 'diode':
            // 电子二极管样式：亮度变化+轻微缩放
            if (intensity > 0.3) {
                element.style.transform = `scale(${1 + intensity * 0.15})`;
                element.style.opacity = `${0.7 + intensity * 0.3}`;
                element.style.transition = 'all 0.1s ease-out';
            } else {
                element.style.transform = 'scale(1)';
                element.style.opacity = '0.8';
                element.style.transition = 'all 0.3s ease-out';
            }
            break;
        
        case 'digital':
            // 数字显示样式：快速的轻微缩放
            if (intensity > 0.3) {
                element.style.transform = `scale(${1 + intensity * 0.15})`;
                element.style.transition = 'transform 0.08s ease-out';
            } else {
                element.style.transform = 'scale(1)';
                element.style.transition = 'transform 0.3s ease-out';
            }
            break;
        
        case 'analog':
            // 模拟表盘样式：平滑的缩放
            if (intensity > 0.3) {
                element.style.transform = `scale(${1 + intensity * 0.2})`;
                element.style.transition = 'transform 0.2s ease-out';
            } else {
                element.style.transform = 'scale(1)';
                element.style.transition = 'transform 0.5s ease-out';
            }
            break;
        
        case '3d':
        case 'style2':
            // 3D样式：3D旋转+缩放
            if (intensity > 0.3) {
                const scale = 1 + intensity * 0.25;
                element.style.transform = `perspective(${threeDEffectConfig.perspective}px) rotateX(${threeDEffectConfig.rotationX}deg) rotateY(${threeDEffectConfig.rotationY}deg) scale(${scale})`;
                element.style.transition = 'transform 0.15s ease-out';
            } else {
                element.style.transform = `perspective(${threeDEffectConfig.perspective}px) rotateX(${threeDEffectConfig.rotationX}deg) rotateY(${threeDEffectConfig.rotationY}deg) scale(1)`;
                element.style.transition = 'transform 0.4s ease-out';
            }
            break;
        
        case 'pulse':
            // 标准脉冲样式
            if (intensity > 0.3) {
                element.style.transform = `scale(${1 + intensity * 0.2})`;
                element.style.transition = 'transform 0.15s ease-out';
            } else {
                element.style.transform = 'scale(1)';
                element.style.transition = 'transform 0.4s ease-out';
            }
            break;
        
        default:
            // 默认样式：标准脉冲
            if (intensity > 0.3) {
                element.style.transform = `scale(${1 + intensity * 0.2})`;
                element.style.transition = 'transform 0.15s ease-out';
            } else {
                element.style.transform = 'scale(1)';
                element.style.transition = 'transform 0.4s ease-out';
            }
            break;
    }
}

// 应用发光效果
function applyGlowEffect(element, intensity = 1, style = 'default') {
    if (!element || !glowEffectConfig.enabled) return;
    
    const color = glowEffectConfig.color;
    // 限制发光强度在0-1之间
    const normalizedIntensity = Math.max(0, Math.min(1, intensity));
    const glowIntensity = normalizedIntensity * glowEffectConfig.intensity;
    const blur = glowEffectConfig.blur * glowIntensity;
    
    // 检查父元素是否有特定样式
    const parentElement = element.parentElement;
    let elementStyle = style;
    
    if (parentElement) {
        // 检查父元素的类名，获取具体的样式类型
        if (parentElement.classList.contains('style-futuristic')) {
            elementStyle = 'futuristic';
        } else if (parentElement.classList.contains('style-neon')) {
            elementStyle = 'neon';
        } else if (parentElement.classList.contains('style-diode')) {
            elementStyle = 'diode';
        } else if (parentElement.classList.contains('style-3d') || parentElement.classList.contains('style2')) {
            elementStyle = '3d';
        }
    }
    
    // 确保即使没有检测到父元素样式类，也使用传入的style参数
    if (elementStyle === 'default' && style !== 'default') {
        elementStyle = style;
    }
    
    switch (elementStyle) {
        case 'futuristic':
            // 对于未来科技样式，使用非常柔和的发光效果，避免覆盖背景渐变
            element.style.textShadow = `
                0 0 ${blur * 0.1}px ${color}30,
                0 0 ${blur * 0.2}px ${color}20
            `;
            // 对于未来科技样式，不要重置color，保留其现有的背景渐变效果
            break;
        
        case 'neon':
            // 对于霓虹效果样式，使用更强的发光效果，增强霓虹感
            element.style.textShadow = `
                0 0 ${blur * 0.3}px ${color}90,
                0 0 ${blur * 0.8}px ${color}70,
                0 0 ${blur * 1.5}px ${color}50,
                0 0 ${blur * 3}px ${color}30
            `;
            // 确保字体颜色保持不变
            element.style.color = ''; // 重置为默认颜色
            break;
        
        case 'diode':
            // 对于电子二极管样式，使用模拟电子管的发光效果
            element.style.textShadow = `
                0 0 ${blur * 0.2}px ${color}80,
                0 0 ${blur * 0.5}px ${color}60
            `;
            // 确保字体颜色保持不变
            element.style.color = ''; // 重置为默认颜色
            break;
        
        case '3d':
            // 对于3D样式，使用有深度感的发光效果
            element.style.textShadow = `
                0 1px ${blur * 0.1}px ${color}80,
                0 2px ${blur * 0.3}px ${color}60,
                0 4px ${blur * 0.6}px ${color}40
            `;
            // 确保字体颜色保持不变
            element.style.color = ''; // 重置为默认颜色
            break;
        
        default:
            // 对于其他样式，使用正常的发光效果
            // 重新设计发光效果，创建在字体后面的层次感发光
            // 从内到外：最内层模糊小亮度高，外层模糊大亮度低
            element.style.textShadow = `
                0 0 ${blur * 0.2}px ${color}80,
                0 0 ${blur * 0.5}px ${color}60,
                0 0 ${blur * 1}px ${color}40,
                0 0 ${blur * 2}px ${color}20
            `;
            // 确保字体颜色保持不变
            element.style.color = ''; // 重置为默认颜色
            break;
    }
    
    // 确保发光效果在字体效果后面
    element.style.zIndex = '1';
}

// 应用3D效果
function apply3DEffect(element, style = 'default') {
    if (!element || !threeDEffectConfig.enabled) return;
    
    // 检测元素的样式类型
    let elementStyle = style;
    const parentElement = element.parentElement;
    if (parentElement && (parentElement.classList.contains('style-3d') || parentElement.classList.contains('style2'))) {
        elementStyle = '3d';
    }
    
    if (elementStyle === 'style2' || elementStyle === '3d') {
        // 为3D样式添加更强的立体感
        element.style.transform = `perspective(${threeDEffectConfig.perspective}px) rotateX(${threeDEffectConfig.rotationX}deg) rotateY(${threeDEffectConfig.rotationY}deg) scale(1)`;
        element.style.transformStyle = 'preserve-3d';
        element.style.backfaceVisibility = 'hidden';
        // 添加3D效果的其他属性
        element.style.boxShadow = `0 ${threeDEffectConfig.depth}px 20px rgba(0, 0, 0, 0.3)`;
        element.style.position = 'relative';
        element.style.display = 'inline-block';
    }
}

// 重置效果
function resetEffects(element) {
    if (!element) return;
    
    element.style.transform = 'scale(1)';
    element.style.textShadow = '';
    element.style.transition = 'all 0.3s ease';
}

// 更新心跳效果配置
function updateHeartbeatEffectConfig(config) {
    heartbeatEffectConfig = {
        ...heartbeatEffectConfig,
        ...config
    };
}

// 更新发光效果配置
function updateGlowEffectConfig(config) {
    glowEffectConfig = {
        ...glowEffectConfig,
        ...config
    };
}

// 更新3D效果配置
function updateThreeDEffectConfig(config) {
    threeDEffectConfig = {
        ...threeDEffectConfig,
        ...config
    };
}

// 获取心跳效果配置
function getHeartbeatEffectConfig() {
    return { ...heartbeatEffectConfig };
}

// 获取发光效果配置
function getGlowEffectConfig() {
    return { ...glowEffectConfig };
}

// 获取3D效果配置
function getThreeDEffectConfig() {
    return { ...threeDEffectConfig };
}

export {
    applyHeartbeatEffect,
    applyGlowEffect,
    apply3DEffect,
    resetEffects,
    updateHeartbeatEffectConfig,
    updateGlowEffectConfig,
    updateThreeDEffectConfig,
    getHeartbeatEffectConfig,
    getGlowEffectConfig,
    getThreeDEffectConfig
};
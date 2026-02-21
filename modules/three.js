import * as THREE from 'three';

// 导入日志管理模块
import { log, LOG_MODULES } from './logger.js';

// 全局变量
let scene = null;
let camera = null;
let renderer = null;
let stars = null;
let particles = null;
let canvasContainer = null;

// 粒子效果配置
let particleConfig = {

    效果: '星空1',
    color: '', // 从index.html中的粒子颜色选择器获取默认值
    colors: {}, // 多颜色效果的颜色配置
    数量: 2000,
    大小: 0.5
};

// 效果与心率绑定配置
let effectHeartRateConfig = {
    enabled: true,
    intensity: 1,
    mode: 'pulse',
    triggerColor: '#ff0000', // 默认红色，不与主题同步
    lowBpmEffect: 'pulse',
    normalBpmEffect: 'pulse',
    highBpmEffect: 'pulse',
    glowEffect: true, // 启发光效果
    glowColor: '#ff0000', // 发光颜色，默认红色
    glowIntensity: 1.0, // 发光强度，默认1.0
    glowMode: 'all', // 发光模式: all(整体), partial(部分), random(随机)
    effectIntensity: 1.0, // 效果强度
    effectSpeed: 1.0 // 效果节奏
};

// 粒子效果配置
const particleEffects = {
    '标准': {
        type: 'stars',
        count: 2000,
        size: 0.5,
        speed: 0.02
    },
    '星空1': {
        type: 'style1-stars',
        count: 4000,
        size: 0.5,
        speed: 0.02
    },
    '原始星空': {
        type: 'original-stars',
        count: 2000,
        size: 0.5,
        speed: 0.02
    },
    '律动星空': {
        type: 'rhythm-stars',
        count: 2000,
        size: 0.5,
        speed: 0.02
    },
    '星云': {
        type: 'nebula',
        count: 3000,
        size: 0.8,
        speed: 0.01
    },
    '银河': {
        type: 'galaxy',
        count: 4000,
        size: 0.4,
        speed: 0.015
    },
    '极光': {
        type: 'aurora',
        count: 3500,
        size: 0.7,
        speed: 0.02
    },
    '脉冲': {
        type: 'pulse',
        count: 1500,
        size: 1.0,
        speed: 0.03
    },
    '波浪': {
        type: 'wave',
        count: 2500,
        size: 0.6,
        speed: 0.025
    },
    '呼吸粒子': {
        type: 'breathing-particles',
        count: 500,
        size: 1.0,
        speed: 0.01
    },
    '萤火虫': {
        type: 'fireflies',
        count: 1000,
        size: 0.3,
        speed: 0.04
    },
    '暴风雪': {
        type: 'blizzard',
        count: 5000,
        size: 0.2,
        speed: 0.05
    },
    '原始粒子云': {
        type: 'original-particles',
        count: 500,
        size: 1.0,
        speed: 0.01
    }
};

// 初始化Three.js
function initThree(containerId, currentStyle) {
    canvasContainer = document.getElementById(containerId);
    if (!canvasContainer) {
        console.error('Canvas container not found');
        log(LOG_MODULES.THREE, 'Canvas container not found', 'basic');
        return;
    }

    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 50;
    
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // 设置透明背景，让HTML背景图片可见
    renderer.setClearColor(0x000000, 0);
    
    canvasContainer.appendChild(renderer.domElement);
    
    // 从index.html中的粒子颜色选择器获取默认颜色值
    const particlesColorInput = document.getElementById('particlesColor');
    if (particlesColorInput) {
        particleConfig.color = particlesColorInput.value;
        console.log('从粒子颜色选择器获取默认颜色:', particleConfig.color);
    } else {
        // 如果粒子颜色选择器不存在，使用白色作为默认值
        particleConfig.color = '#ffffff';
        console.log('粒子颜色选择器不存在，使用默认白色:', particleConfig.color);
    }
    
    // 根据配置创建粒子效果
    stars = createParticlesByEffect(particleConfig.效果);
    
    window.addEventListener('resize', onWindowResize);
    
    log(LOG_MODULES.THREE, `Three.js 初始化完成，样式: style1, 效果: ${particleConfig.效果}, 颜色: ${particleConfig.color}`, 'detailed');
}

// 创建不同类型的粒子效果
function createParticlesByEffect(effectType) {
    const effect = particleEffects[effectType] || particleEffects['标准'];
    // 使用particleConfig中的数量配置，如果没有则使用效果默认值
    const count = particleConfig.数量 || effect.count;
    
    switch (effect.type) {
        case 'nebula':
            return createNebulaEffect(count);
        case 'pulse':
            return createPulseEffect(count);
        case 'wave':
            return createWaveEffect(count);
        case 'galaxy':
            return createGalaxyEffect(count);
        case 'fireflies':
            return createFirefliesEffect(count);
        case 'aurora':
            return createAuroraEffect(count);
        case 'blizzard':
            return createBlizzardEffect(count);
        case 'rhythm-stars':
            return createRhythmStarsEffect(count);
        case 'breathing-particles':
            return createBreathingParticlesEffect(count);
        case 'original-stars':
            return createOriginalStarsEffect(count);
        case 'original-particles':
            return createOriginalParticlesEffect(count);
        case 'style1-stars':
            return createStarsStyle1Effect(count);
        case 'stars':
        default:
            return createStarsEffect(count);
    }
}

// 创建标准星星效果
function createStarsEffect(count) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    
    const color1 = new THREE.Color(particleConfig.color || '#ffffff');
    const color2 = new THREE.Color(0xffffff);
    
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 200;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
        
        sizes[i] = Math.random() * 2 + 0.5;
        
        // 颜色混合
        const mixedColor = color1.clone().lerp(color2, Math.random());
        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 },
            uSpeed: { value: 0.02 },
            uTriggerColor: { value: new THREE.Color(effectHeartRateConfig.triggerColor || '#ff0000') },
            uGlowEffect: { value: effectHeartRateConfig.glowEffect || true },
            uGlowColor: { value: new THREE.Color(effectHeartRateConfig.glowColor || '#ff0000') },
            uGlowIntensity: { value: effectHeartRateConfig.glowIntensity || 1.0 },
            uGlowMode: { value: (effectHeartRateConfig.glowMode === 'partial' ? 1 : effectHeartRateConfig.glowMode === 'random' ? 2 : 0) }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 aColor;
            varying vec3 vColor;
            varying float vPulse;
            varying vec3 vPosition;
            uniform float uTime;
            uniform float uPulse;
            uniform float uSpeed;
            
            void main() {
                vColor = aColor;
                vPosition = position;
                
                vec3 pos = position;
                float dist = length(pos);
                
                float pulseWave = sin(dist * 0.05 - uTime * 3.0) * uPulse * 5.0;
                pos += normalize(pos) * pulseWave;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (200.0 / -mvPosition.z) * (1.0 + uPulse * 0.5);
                gl_Position = projectionMatrix * mvPosition;
                
                vPulse = uPulse;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vPulse;
            varying vec3 vPosition;
            uniform vec3 uTriggerColor;
            uniform bool uGlowEffect;
            uniform vec3 uGlowColor;
            uniform float uGlowIntensity;
            uniform float uGlowMode;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha *= 0.6 + vPulse * 0.4;
                
                vec3 finalColor = vColor;
                
                // 只在发光效果启用时才应用颜色混合
                if (uGlowEffect && vPulse > 0.3) {
                    finalColor = mix(vColor, uTriggerColor, vPulse);
                }
                
                // 添加发光效果
                if (uGlowEffect && vPulse > 0.05) {
                    // 计算发光因子 - 使用更柔和的渐变
                    float glowFactor = smoothstep(0.05, 1.0, vPulse) * uGlowIntensity;
                    
                    // 根据发光模式计算是否应用发光
                    bool shouldGlow = true;
                    if (uGlowMode == 1.0) {
                        // 部分发光：距离中心较近的粒子发光
                        float particleDist = length(vPosition);
                        shouldGlow = particleDist < 60.0; // 恢复到原始范围
                    } else if (uGlowMode == 2.0) {
                        // 随机发光：基于粒子位置的哈希函数生成随机值
                        float random = fract(sin(dot(vPosition.xy, vec2(12.9898, 78.233))) * 43758.5453);
                        shouldGlow = random < 0.5; // 恢复到原始比例
                    }
                    
                    if (shouldGlow) {
                        // 更自然的颜色混合
                        finalColor = mix(finalColor, uGlowColor, min(1.0, glowFactor * 1.2));
                        // 更自然的透明度效果
                        alpha = max(alpha, min(1.0, glowFactor * 1.0));
                    }
                }
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    const points = new THREE.Points(geometry, material);
    scene.add(points);
    
    log(LOG_MODULES.THREE, `创建星星效果，粒子数量: ${count}`, 'detailed');
    return points;
}

// 创建星云效果
function createNebulaEffect(count) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const opacities = new Float32Array(count);
    
    const color1 = new THREE.Color(particleConfig.color || '#ffffff');
    const color2 = new THREE.Color(particleConfig.colors.color2 || 0x880088);
    
    for (let i = 0; i < count; i++) {
        // 星云分布
        const r = 100 * Math.cbrt(Math.random());
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
        
        sizes[i] = Math.random() * 3 + 1;
        
        // 颜色混合
        const mixedColor = color1.clone().lerp(color2, Math.random());
        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
        
        opacities[i] = Math.random() * 0.5 + 0.1;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 },
            uGlowEffect: { value: effectHeartRateConfig.glowEffect || true },
            uGlowColor: { value: new THREE.Color(effectHeartRateConfig.glowColor || '#ff0000') },
            uGlowIntensity: { value: effectHeartRateConfig.glowIntensity || 1.0 },
            uGlowMode: { value: (effectHeartRateConfig.glowMode === 'partial' ? 1 : effectHeartRateConfig.glowMode === 'random' ? 2 : 0) }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 aColor;
            attribute float aOpacity;
            varying vec3 vColor;
            varying float vOpacity;
            varying float vPulse;
            varying vec3 vPosition;
            uniform float uTime;
            uniform float uPulse;
            
            void main() {
                vColor = aColor;
                vOpacity = aOpacity;
                vPosition = position;
                
                vec3 pos = position;
                
                // 星云流动效果
                float flow = sin(length(pos) * 0.01 + uTime * 0.5) * 2.0;
                pos += normalize(pos) * flow;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (150.0 / -mvPosition.z) * (1.0 + uPulse * 0.3);
                gl_Position = projectionMatrix * mvPosition;
                
                vPulse = uPulse;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vOpacity;
            varying float vPulse;
            varying vec3 vPosition;
            uniform bool uGlowEffect;
            uniform vec3 uGlowColor;
            uniform float uGlowIntensity;
            uniform float uGlowMode;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha *= vOpacity * (1.0 + vPulse * 0.5);
                
                vec3 finalColor = vColor;
                
                // 添加发光效果
                if (uGlowEffect && vPulse > 0.05) {
                    // 计算发光因子 - 使用更柔和的渐变
                    float glowFactor = smoothstep(0.05, 1.0, vPulse) * uGlowIntensity;
                    
                    // 根据发光模式计算是否应用发光
                    bool shouldGlow = true;
                    if (uGlowMode == 1.0) {
                        // 部分发光：距离中心较近的粒子发光
                        float particleDist = length(vPosition);
                        shouldGlow = particleDist < 60.0;
                    } else if (uGlowMode == 2.0) {
                        // 随机发光：基于粒子位置的哈希函数生成随机值
                        float random = fract(sin(dot(vPosition.xy, vec2(12.9898, 78.233))) * 43758.5453);
                        shouldGlow = random < 0.5;
                    }
                    
                    if (shouldGlow) {
                        // 更自然的颜色混合
                        finalColor = mix(finalColor, uGlowColor, min(1.0, glowFactor * 1.2));
                        // 更自然的透明度效果
                        alpha = max(alpha, min(1.0, glowFactor * 1.0));
                    }
                }
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    const points = new THREE.Points(geometry, material);
    scene.add(points);
    
    log(LOG_MODULES.THREE, `创建星云效果，粒子数量: ${count}`, 'detailed');
    return points;
}

// 创建脉冲效果
function createPulseEffect(count) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    
    const color = new THREE.Color(particleConfig.color || '#ffffff');
    
    for (let i = 0; i < count; i++) {
        const r = 80 * Math.random();
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
        
        sizes[i] = Math.random() * 2 + 1;
        
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        
        phases[i] = Math.random() * Math.PI * 2;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 },
            uGlowEffect: { value: effectHeartRateConfig.glowEffect || true },
            uGlowColor: { value: new THREE.Color(effectHeartRateConfig.glowColor || '#ff0000') },
            uGlowIntensity: { value: effectHeartRateConfig.glowIntensity || 1.0 },
            uGlowMode: { value: (effectHeartRateConfig.glowMode === 'partial' ? 1 : effectHeartRateConfig.glowMode === 'random' ? 2 : 0) }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 aColor;
            attribute float aPhase;
            varying vec3 vColor;
            varying float vPulse;
            varying vec3 vPosition;
            uniform float uTime;
            uniform float uPulse;
            
            void main() {
                vColor = aColor;
                vPosition = position;
                
                vec3 pos = position;
                
                // 脉冲效果
                float pulse = sin(aPhase + uTime * 2.0) * 0.5 + 0.5;
                float scale = 1.0 + pulse * uPulse * 2.0;
                pos *= scale;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (200.0 / -mvPosition.z) * scale;
                gl_Position = projectionMatrix * mvPosition;
                
                vPulse = uPulse;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vPulse;
            varying vec3 vPosition;
            uniform bool uGlowEffect;
            uniform vec3 uGlowColor;
            uniform float uGlowIntensity;
            uniform float uGlowMode;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha *= 0.6 + vPulse * 0.4;
                
                vec3 finalColor = vColor;
                
                // 添加发光效果
                if (uGlowEffect && vPulse > 0.05) {
                    // 计算发光因子 - 使用更柔和的渐变
                    float glowFactor = smoothstep(0.05, 1.0, vPulse) * uGlowIntensity;
                    
                    // 根据发光模式计算是否应用发光
                    bool shouldGlow = true;
                    if (uGlowMode == 1.0) {
                        // 部分发光：距离中心较近的粒子发光
                        float particleDist = length(vPosition);
                        shouldGlow = particleDist < 60.0; // 恢复到原始范围
                    } else if (uGlowMode == 2.0) {
                        // 随机发光：基于粒子位置的哈希函数生成随机值
                        float random = fract(sin(dot(vPosition.xy, vec2(12.9898, 78.233))) * 43758.5453);
                        shouldGlow = random < 0.5; // 恢复到原始比例
                    }
                    
                    if (shouldGlow) {
                        // 更自然的颜色混合
                        finalColor = mix(finalColor, uGlowColor, min(1.0, glowFactor * 1.2));
                        // 更自然的透明度效果
                        alpha = max(alpha, min(1.0, glowFactor * 1.0));
                    }
                }
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    const points = new THREE.Points(geometry, material);
    scene.add(points);
    
    log(LOG_MODULES.THREE, `创建脉冲效果，粒子数量: ${count}`, 'detailed');
    return points;
}

// 创建波浪效果
function createWaveEffect(count) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    
    const color1 = new THREE.Color(particleConfig.color || '#ffffff');
    const color2 = new THREE.Color(particleConfig.colors.color2 || 0x00ffff);
    
    for (let i = 0; i < count; i++) {
        const r = 100 * Math.random();
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
        
        sizes[i] = Math.random() * 2 + 0.5;
        
        // 颜色混合
        const mixedColor = color1.clone().lerp(color2, Math.random());
        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 },
            uGlowEffect: { value: effectHeartRateConfig.glowEffect || true },
            uGlowColor: { value: new THREE.Color(effectHeartRateConfig.glowColor || '#ff0000') },
            uGlowIntensity: { value: effectHeartRateConfig.glowIntensity || 1.0 },
            uGlowMode: { value: (effectHeartRateConfig.glowMode === 'partial' ? 1 : effectHeartRateConfig.glowMode === 'random' ? 2 : 0) }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 aColor;
            varying vec3 vColor;
            varying float vPulse;
            varying vec3 vPosition;
            uniform float uTime;
            uniform float uPulse;
            
            void main() {
                vColor = aColor;
                vPosition = position;
                
                vec3 pos = position;
                
                // 波浪效果
                float wave = sin(length(pos) * 0.02 + uTime * 3.0) * 5.0;
                pos += normalize(pos) * wave;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (180.0 / -mvPosition.z) * (1.0 + uPulse * 0.4);
                gl_Position = projectionMatrix * mvPosition;
                
                vPulse = uPulse;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vPulse;
            varying vec3 vPosition;
            uniform bool uGlowEffect;
            uniform vec3 uGlowColor;
            uniform float uGlowIntensity;
            uniform float uGlowMode;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha *= 0.5 + vPulse * 0.3;
                
                vec3 finalColor = vColor;
                
                // 添加发光效果
                if (uGlowEffect && vPulse > 0.05) {
                    // 计算发光因子 - 使用更柔和的渐变
                    float glowFactor = smoothstep(0.05, 1.0, vPulse) * uGlowIntensity;
                    
                    // 根据发光模式计算是否应用发光
                    bool shouldGlow = true;
                    if (uGlowMode == 1.0) {
                        // 部分发光：距离中心较近的粒子发光
                        float particleDist = length(vPosition);
                        shouldGlow = particleDist < 60.0; // 恢复到原始范围
                    } else if (uGlowMode == 2.0) {
                        // 随机发光：基于粒子位置的哈希函数生成随机值
                        float random = fract(sin(dot(vPosition.xy, vec2(12.9898, 78.233))) * 43758.5453);
                        shouldGlow = random < 0.5; // 恢复到原始比例
                    }
                    
                    if (shouldGlow) {
                        // 更自然的颜色混合
                        finalColor = mix(finalColor, uGlowColor, min(1.0, glowFactor * 1.2));
                        // 更自然的透明度效果
                        alpha = max(alpha, min(1.0, glowFactor * 1.0));
                    }
                }
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    const points = new THREE.Points(geometry, material);
    scene.add(points);
    
    log(LOG_MODULES.THREE, `创建波浪效果，粒子数量: ${count}`, 'detailed');
    return points;
}

// 创建银河效果
function createGalaxyEffect(count) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const rotations = new Float32Array(count);
    
    const color1 = new THREE.Color(particleConfig.color || '#ffffff');
    const color2 = new THREE.Color(particleConfig.colors.color2 || 0xffff00);
    
    for (let i = 0; i < count; i++) {
        const radius = 120 * Math.sqrt(Math.random());
        const theta = Math.random() * Math.PI * 2;
        const z = (Math.random() - 0.5) * 50;
        
        positions[i * 3] = radius * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(theta);
        positions[i * 3 + 2] = z;
        
        sizes[i] = Math.random() * 2 + 0.5;
        
        // 颜色混合
        const mixedColor = color1.clone().lerp(color2, Math.random());
        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
        
        rotations[i] = Math.random() * Math.PI * 2;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aRotation', new THREE.BufferAttribute(rotations, 1));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 },
            uGlowEffect: { value: effectHeartRateConfig.glowEffect || true },
            uGlowColor: { value: new THREE.Color(effectHeartRateConfig.glowColor || '#ff0000') },
            uGlowIntensity: { value: effectHeartRateConfig.glowIntensity || 1.0 },
            uGlowMode: { value: (effectHeartRateConfig.glowMode === 'partial' ? 1 : effectHeartRateConfig.glowMode === 'random' ? 2 : 0) }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 aColor;
            attribute float aRotation;
            varying vec3 vColor;
            varying float vPulse;
            varying vec3 vPosition;
            uniform float uTime;
            uniform float uPulse;
            
            void main() {
                vColor = aColor;
                vPosition = position;
                
                vec3 pos = position;
                
                // 银河旋转效果
                float angle = aRotation + uTime * 0.01;
                float cosAngle = cos(angle);
                float sinAngle = sin(angle);
                pos.xy = mat2(cosAngle, -sinAngle, sinAngle, cosAngle) * pos.xy;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (180.0 / -mvPosition.z) * (1.0 + uPulse * 0.4);
                gl_Position = projectionMatrix * mvPosition;
                
                vPulse = uPulse;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vPulse;
            varying vec3 vPosition;
            uniform bool uGlowEffect;
            uniform vec3 uGlowColor;
            uniform float uGlowIntensity;
            uniform float uGlowMode;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha *= 0.6 + vPulse * 0.3;
                
                vec3 finalColor = vColor;
                
                // 添加发光效果
                if (uGlowEffect && vPulse > 0.05) {
                    // 计算发光因子 - 使用更柔和的渐变
                    float glowFactor = smoothstep(0.05, 1.0, vPulse) * uGlowIntensity;
                    
                    // 根据发光模式计算是否应用发光
                    bool shouldGlow = true;
                    if (uGlowMode == 1.0) {
                        // 部分发光：距离中心较近的粒子发光
                        float particleDist = length(vPosition);
                        shouldGlow = particleDist < 60.0; // 恢复到原始范围
                    } else if (uGlowMode == 2.0) {
                        // 随机发光：基于粒子位置的哈希函数生成随机值
                        float random = fract(sin(dot(vPosition.xy, vec2(12.9898, 78.233))) * 43758.5453);
                        shouldGlow = random < 0.5; // 恢复到原始比例
                    }
                    
                    if (shouldGlow) {
                        // 更自然的颜色混合
                        finalColor = mix(finalColor, uGlowColor, min(1.0, glowFactor * 1.2));
                        // 更自然的透明度效果
                        alpha = max(alpha, min(1.0, glowFactor * 1.0));
                    }
                }
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    const points = new THREE.Points(geometry, material);
    scene.add(points);
    
    log(LOG_MODULES.THREE, `创建银河效果，粒子数量: ${count}`, 'detailed');
    return points;
}

// 创建萤火虫效果
function createFirefliesEffect(count) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const flicker = new Float32Array(count);
    
    // 使用粒子配置中的颜色，如果没有则使用黄色
    const color = new THREE.Color(particleConfig.color || 0xffff00);
    
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 150;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 150;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 150;
        
        sizes[i] = Math.random() * 1.5 + 0.5;
        
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        
        flicker[i] = Math.random();
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aFlicker', new THREE.BufferAttribute(flicker, 1));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 },
            uGlowEffect: { value: effectHeartRateConfig.glowEffect || true },
            uGlowColor: { value: new THREE.Color(effectHeartRateConfig.glowColor || '#ff0000') },
            uGlowIntensity: { value: effectHeartRateConfig.glowIntensity || 1.0 },
            uGlowMode: { value: (effectHeartRateConfig.glowMode === 'partial' ? 1 : effectHeartRateConfig.glowMode === 'random' ? 2 : 0) }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 aColor;
            attribute float aFlicker;
            varying vec3 vColor;
            varying float vFlicker;
            varying float vPulse;
            varying vec3 vPosition;
            uniform float uTime;
            uniform float uPulse;
            
            void main() {
                vColor = aColor;
                vFlicker = aFlicker;
                vPosition = position;
                
                vec3 pos = position;
                
                // 萤火虫随机移动
                float moveX = sin(aFlicker * 10.0 + uTime * 0.5) * 0.5;
                float moveY = cos(aFlicker * 10.0 + uTime * 0.3) * 0.5;
                float moveZ = sin(aFlicker * 10.0 + uTime * 0.4) * 0.5;
                pos += vec3(moveX, moveY, moveZ);
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (200.0 / -mvPosition.z) * (1.0 + uPulse * 0.3);
                gl_Position = projectionMatrix * mvPosition;
                
                vPulse = uPulse;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vFlicker;
            varying float vPulse;
            varying vec3 vPosition;
            uniform float uTime;
            uniform bool uGlowEffect;
            uniform vec3 uGlowColor;
            uniform float uGlowIntensity;
            uniform float uGlowMode;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float flickerIntensity = sin(vFlicker * 10.0 + uTime * 5.0) * 0.3 + 0.7;
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha *= flickerIntensity * (0.6 + vPulse * 0.3);
                
                vec3 finalColor = vColor;
                
                // 添加发光效果
                if (uGlowEffect && vPulse > 0.05) {
                    // 计算发光因子 - 使用更柔和的渐变
                    float glowFactor = smoothstep(0.05, 1.0, vPulse) * uGlowIntensity;
                    
                    // 根据发光模式计算是否应用发光
                    bool shouldGlow = true;
                    if (uGlowMode == 1.0) {
                        // 部分发光：距离中心较近的粒子发光
                        float particleDist = length(vPosition);
                        shouldGlow = particleDist < 60.0;
                    } else if (uGlowMode == 2.0) {
                        // 随机发光：基于粒子位置的哈希函数生成随机值
                        float random = fract(sin(dot(vPosition.xy, vec2(12.9898, 78.233))) * 43758.5453);
                        shouldGlow = random < 0.5;
                    }
                    
                    if (shouldGlow) {
                        // 更自然的颜色混合
                        finalColor = mix(finalColor, uGlowColor, min(1.0, glowFactor * 1.2));
                        // 更自然的透明度效果
                        alpha = max(alpha, min(1.0, glowFactor * 1.0));
                    }
                }
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    const points = new THREE.Points(geometry, material);
    scene.add(points);
    
    log(LOG_MODULES.THREE, `创建萤火虫效果，粒子数量: ${count}`, 'detailed');
    return points;
}

// 创建极光效果
function createAuroraEffect(count) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    
    const color1 = new THREE.Color(particleConfig.color || '#ffffff');
    const color2 = new THREE.Color(particleConfig.colors.color2 || 0x00ffff);
    const color3 = new THREE.Color(particleConfig.colors.color3 || 0x8800ff);
    
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 200;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
        
        sizes[i] = Math.random() * 3 + 1;
        
        // 多色混合
        const t1 = Math.random();
        const t2 = Math.random();
        const mixedColor = color1.clone().lerp(color2, t1).lerp(color3, t2);
        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
        
        phases[i] = Math.random() * Math.PI * 2;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 },
            uGlowEffect: { value: effectHeartRateConfig.glowEffect || true },
            uGlowColor: { value: new THREE.Color(effectHeartRateConfig.glowColor || '#ff0000') },
            uGlowIntensity: { value: effectHeartRateConfig.glowIntensity || 1.0 },
            uGlowMode: { value: (effectHeartRateConfig.glowMode === 'partial' ? 1 : effectHeartRateConfig.glowMode === 'random' ? 2 : 0) }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 aColor;
            attribute float aPhase;
            varying vec3 vColor;
            varying float vPulse;
            varying vec3 vPosition;
            uniform float uTime;
            uniform float uPulse;
            
            void main() {
                vColor = aColor;
                vPosition = position;
                
                vec3 pos = position;
                
                // 极光流动效果
                float flow = sin(length(pos) * 0.02 + aPhase + uTime * 0.8) * 5.0;
                pos += normalize(pos) * flow;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (150.0 / -mvPosition.z) * (1.0 + uPulse * 0.3);
                gl_Position = projectionMatrix * mvPosition;
                
                vPulse = uPulse;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vPulse;
            varying vec3 vPosition;
            uniform bool uGlowEffect;
            uniform vec3 uGlowColor;
            uniform float uGlowIntensity;
            uniform float uGlowMode;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha *= 0.4 + vPulse * 0.3;
                
                vec3 finalColor = vColor;
                
                // 添加发光效果
                if (uGlowEffect && vPulse > 0.05) {
                    // 计算发光因子 - 使用更柔和的渐变
                    float glowFactor = smoothstep(0.05, 1.0, vPulse) * uGlowIntensity;
                    
                    // 根据发光模式计算是否应用发光
                    bool shouldGlow = true;
                    if (uGlowMode == 1.0) {
                        // 部分发光：距离中心较近的粒子发光
                        float particleDist = length(vPosition);
                        shouldGlow = particleDist < 60.0;
                    } else if (uGlowMode == 2.0) {
                        // 随机发光：基于粒子位置的哈希函数生成随机值
                        float random = fract(sin(dot(vPosition.xy, vec2(12.9898, 78.233))) * 43758.5453);
                        shouldGlow = random < 0.5;
                    }
                    
                    if (shouldGlow) {
                        // 更自然的颜色混合
                        finalColor = mix(finalColor, uGlowColor, min(1.0, glowFactor * 1.2));
                        // 更自然的透明度效果
                        alpha = max(alpha, min(1.0, glowFactor * 1.0));
                    }
                }
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    const points = new THREE.Points(geometry, material);
    scene.add(points);
    
    log(LOG_MODULES.THREE, `创建极光效果，粒子数量: ${count}`, 'detailed');
    return points;
}

// 创建暴风雪效果
function createBlizzardEffect(count) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    
    // 使用粒子配置中的颜色，如果没有则使用白色
    const color = new THREE.Color(particleConfig.color || 0xffffff);
    
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 200;
        positions[i * 3 + 1] = Math.random() * 100 + 50;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
        
        sizes[i] = Math.random() * 1 + 0.5;
        
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        
        velocities[i * 3] = (Math.random() - 0.5) * 2;
        velocities[i * 3 + 1] = -Math.random() * 3 - 1;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 },
            uGlowEffect: { value: effectHeartRateConfig.glowEffect || true },
            uGlowColor: { value: new THREE.Color(effectHeartRateConfig.glowColor || '#ff0000') },
            uGlowIntensity: { value: effectHeartRateConfig.glowIntensity || 1.0 },
            uGlowMode: { value: (effectHeartRateConfig.glowMode === 'partial' ? 1 : effectHeartRateConfig.glowMode === 'random' ? 2 : 0) }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 aColor;
            attribute vec3 aVelocity;
            varying vec3 vColor;
            varying float vPulse;
            varying vec3 vPosition;
            uniform float uTime;
            uniform float uPulse;
            
            void main() {
                vColor = aColor;
                vPosition = position;
                
                vec3 pos = position;
                
                // 雪花下落效果
                vec3 velocity = aVelocity * (1.0 + uPulse * 0.5);
                pos += velocity * uTime;
                
                // 雪花循环 - 使用数学方法避免if语句
                float yOffset = floor((pos.y + 100.0) / 200.0);
                pos.y -= yOffset * 200.0;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (180.0 / -mvPosition.z) * (1.0 + uPulse * 0.3);
                gl_Position = projectionMatrix * mvPosition;
                
                vPulse = uPulse;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vPulse;
            varying vec3 vPosition;
            uniform bool uGlowEffect;
            uniform vec3 uGlowColor;
            uniform float uGlowIntensity;
            uniform float uGlowMode;
            
            void main() {
                // 方块粒子效果
                float alpha = 1.0;
                alpha *= 0.8 + vPulse * 0.2;
                
                vec3 finalColor = vColor;
                
                // 添加发光效果
                if (uGlowEffect && vPulse > 0.05) {
                    // 计算发光因子 - 使用更柔和的渐变
                    float glowFactor = smoothstep(0.05, 1.0, vPulse) * uGlowIntensity;
                    
                    // 根据发光模式计算是否应用发光
                    bool shouldGlow = true;
                    if (uGlowMode == 1.0) {
                        // 部分发光：距离中心较近的粒子发光
                        float particleDist = length(vPosition);
                        shouldGlow = particleDist < 60.0;
                    } else if (uGlowMode == 2.0) {
                        // 随机发光：基于粒子位置的哈希函数生成随机值
                        float random = fract(sin(dot(vPosition.xy, vec2(12.9898, 78.233))) * 43758.5453);
                        shouldGlow = random < 0.5;
                    }
                    
                    if (shouldGlow) {
                        // 更自然的颜色混合
                        finalColor = mix(finalColor, uGlowColor, min(1.0, glowFactor * 1.2));
                        // 更自然的透明度效果
                        alpha = max(alpha, min(1.0, glowFactor * 1.0));
                    }
                }
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    const points = new THREE.Points(geometry, material);
    scene.add(points);
    
    log(LOG_MODULES.THREE, `创建暴风雪效果，粒子数量: ${count}`, 'detailed');
    return points;
}

// 创建律动星空效果
function createRhythmStarsEffect(count) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    
    const baseColor = new THREE.Color(particleConfig.color || '#ffffff');
    const secondaryColor = new THREE.Color(effectHeartRateConfig.triggerColor || '#ff0000');
    
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 200;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
        
        sizes[i] = Math.random() * 2 + 0.5;
        
        const colorChoice = Math.random();
        if (colorChoice < 0.7) {
            // 使用基础颜色（白色）
            colors[i * 3] = baseColor.r;
            colors[i * 3 + 1] = baseColor.g;
            colors[i * 3 + 2] = baseColor.b;
        } else if (colorChoice < 0.9) {
            // 使用灰色
            colors[i * 3] = 0.4;
            colors[i * 3 + 1] = 0.4;
            colors[i * 3 + 2] = 0.4;
        } else {
            // 使用触发颜色（红色）
            colors[i * 3] = secondaryColor.r;
            colors[i * 3 + 1] = secondaryColor.g;
            colors[i * 3 + 2] = secondaryColor.b;
        }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 },
            uTriggerColor: { value: new THREE.Color(effectHeartRateConfig.triggerColor || '#ff0000') },
            uGlowEffect: { value: effectHeartRateConfig.glowEffect || true },
            uGlowColor: { value: new THREE.Color(effectHeartRateConfig.glowColor || '#ff0000') },
            uGlowIntensity: { value: effectHeartRateConfig.glowIntensity || 1.0 },
            uGlowMode: { value: (effectHeartRateConfig.glowMode === 'partial' ? 1 : effectHeartRateConfig.glowMode === 'random' ? 2 : 0) }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 aColor;
            varying vec3 vColor;
            varying float vPulse;
            varying vec3 vPosition;
            uniform float uTime;
            uniform float uPulse;
            
            void main() {
                vColor = aColor;
                vPosition = position;
                
                vec3 pos = position;
                float dist = length(pos);
                
                float pulseWave = sin(dist * 0.05 - uTime * 3.0) * uPulse * 5.0;
                pos += normalize(pos) * pulseWave;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (200.0 / -mvPosition.z) * (1.0 + uPulse * 0.5);
                gl_Position = projectionMatrix * mvPosition;
                
                vPulse = uPulse;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vPulse;
            varying vec3 vPosition;
            uniform vec3 uTriggerColor;
            uniform bool uGlowEffect;
            uniform vec3 uGlowColor;
            uniform float uGlowIntensity;
            uniform float uGlowMode;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha *= 0.6 + vPulse * 0.4;
                
                vec3 finalColor = vColor;
                
                // 只在发光效果启用时才应用颜色混合
                if (uGlowEffect && vPulse > 0.3) {
                    finalColor = mix(vColor, uTriggerColor, vPulse);
                }
                
                // 添加发光效果
                if (uGlowEffect && vPulse > 0.05) {
                    // 计算发光因子 - 使用更柔和的渐变
                    float glowFactor = smoothstep(0.05, 1.0, vPulse) * uGlowIntensity;
                    
                    // 根据发光模式计算是否应用发光
                    bool shouldGlow = true;
                    if (uGlowMode == 1.0) {
                        // 部分发光：距离中心较近的粒子发光
                        float particleDist = length(vPosition);
                        shouldGlow = particleDist < 60.0;
                    } else if (uGlowMode == 2.0) {
                        // 随机发光：基于粒子位置的哈希函数生成随机值
                        float random = fract(sin(dot(vPosition.xy, vec2(12.9898, 78.233))) * 43758.5453);
                        shouldGlow = random < 0.5;
                    }
                    
                    if (shouldGlow) {
                        // 更自然的颜色混合
                        finalColor = mix(finalColor, uGlowColor, min(1.0, glowFactor * 1.2));
                        // 更自然的透明度效果
                        alpha = max(alpha, min(1.0, glowFactor * 1.0));
                    }
                }
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    const points = new THREE.Points(geometry, material);
    scene.add(points);
    
    log(LOG_MODULES.THREE, `创建律动星空效果，粒子数量: ${count}`, 'detailed');
    return points;
}

// 创建呼吸粒子效果
function createBreathingParticlesEffect(count) {
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 30 + Math.random() * 20;
        
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const baseColor = new THREE.Color(particleConfig.color || '#ffffff');
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 },
            uBaseColor: { value: baseColor },
            uTriggerColor: { value: new THREE.Color(effectHeartRateConfig.triggerColor || '#ff0000') },
            uGlowEffect: { value: effectHeartRateConfig.glowEffect || true },
            uGlowColor: { value: new THREE.Color(effectHeartRateConfig.glowColor || '#ff0000') },
            uGlowIntensity: { value: effectHeartRateConfig.glowIntensity || 1.0 },
            uGlowMode: { value: (effectHeartRateConfig.glowMode === 'partial' ? 1 : effectHeartRateConfig.glowMode === 'random' ? 2 : 0) }
        },
        vertexShader: `
            varying float vPulse;
            varying vec3 vPosition;
            uniform float uTime;
            uniform float uPulse;
            
            void main() {
                vPosition = position;
                
                vec3 pos = position;
                
                float breathe = sin(uTime * 0.5) * 2.0;
                pos *= 1.0 + breathe * 0.05;
                pos *= 1.0 + uPulse * 0.3;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = 3.0 * (100.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
                
                vPulse = uPulse;
            }
        `,
        fragmentShader: `
            varying float vPulse;
            varying vec3 vPosition;
            uniform vec3 uBaseColor;
            uniform vec3 uTriggerColor;
            uniform bool uGlowEffect;
            uniform vec3 uGlowColor;
            uniform float uGlowIntensity;
            uniform float uGlowMode;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha *= 0.3;
                
                vec3 color = mix(uBaseColor, uTriggerColor, vPulse);
                vec3 finalColor = color;
                
                // 添加发光效果
                if (uGlowEffect && vPulse > 0.05) {
                    // 计算发光因子 - 使用更柔和的渐变
                    float glowFactor = smoothstep(0.05, 1.0, vPulse) * uGlowIntensity;
                    
                    // 根据发光模式计算是否应用发光
                    bool shouldGlow = true;
                    if (uGlowMode == 1.0) {
                        // 部分发光：距离中心较近的粒子发光
                        float particleDist = length(vPosition);
                        shouldGlow = particleDist < 60.0;
                    } else if (uGlowMode == 2.0) {
                        // 随机发光：基于粒子位置的哈希函数生成随机值
                        float random = fract(sin(dot(vPosition.xy, vec2(12.9898, 78.233))) * 43758.5453);
                        shouldGlow = random < 0.5;
                    }
                    
                    if (shouldGlow) {
                        // 更自然的颜色混合
                        finalColor = mix(finalColor, uGlowColor, min(1.0, glowFactor * 1.2));
                        // 更自然的透明度效果
                        alpha = max(alpha, min(1.0, glowFactor * 1.0));
                    }
                }
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    const points = new THREE.Points(geometry, material);
    scene.add(points);
    
    log(LOG_MODULES.THREE, `创建呼吸粒子效果，粒子数量: ${count}`, 'detailed');
    return points;
}

// 创建 o.html 的星空效果 (Original Stars)
function createOriginalStarsEffect(count) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    
    const baseColor = new THREE.Color(particleConfig.color || '#ffffff');
    const secondaryColor = new THREE.Color(effectHeartRateConfig.triggerColor || '#ff0000');
    
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 200;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
        
        sizes[i] = Math.random() * 2 + 0.5;
        
        const colorChoice = Math.random();
        if (colorChoice < 0.7) {
            colors[i * 3] = baseColor.r;
            colors[i * 3 + 1] = baseColor.g;
            colors[i * 3 + 2] = baseColor.b;
        } else if (colorChoice < 0.9) {
            colors[i * 3] = 0.4;
            colors[i * 3 + 1] = 0.4;
            colors[i * 3 + 2] = 0.4;
        } else {
            colors[i * 3] = secondaryColor.r;
            colors[i * 3 + 1] = secondaryColor.g;
            colors[i * 3 + 2] = secondaryColor.b;
        }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 },
            uTriggerColor: { value: new THREE.Color(effectHeartRateConfig.triggerColor || '#ff0000') },
            uGlowEffect: { value: effectHeartRateConfig.glowEffect || true },
            uGlowColor: { value: new THREE.Color(effectHeartRateConfig.glowColor || '#ff0000') },
            uGlowIntensity: { value: effectHeartRateConfig.glowIntensity || 1.0 },
            uGlowMode: { value: (effectHeartRateConfig.glowMode === 'partial' ? 1 : effectHeartRateConfig.glowMode === 'random' ? 2 : 0) }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 aColor;
            varying vec3 vColor;
            varying float vPulse;
            varying vec3 vPosition;
            uniform float uTime;
            uniform float uPulse;
            
            void main() {
                vColor = aColor;
                vPosition = position;
                
                vec3 pos = position;
                float dist = length(pos);
                
                float pulseWave = sin(dist * 0.05 - uTime * 3.0) * uPulse * 5.0;
                pos += normalize(pos) * pulseWave;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (200.0 / -mvPosition.z) * (1.0 + uPulse * 0.5);
                gl_Position = projectionMatrix * mvPosition;
                
                vPulse = uPulse;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vPulse;
            varying vec3 vPosition;
            uniform vec3 uTriggerColor;
            uniform bool uGlowEffect;
            uniform vec3 uGlowColor;
            uniform float uGlowIntensity;
            uniform float uGlowMode;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha *= 0.6 + vPulse * 0.4;
                
                vec3 finalColor = vColor;
                if (vPulse > 0.3 && vColor.r > 0.9) {
                    finalColor = uTriggerColor;
                }
                
                // 添加发光效果
                if (uGlowEffect && vPulse > 0.05) {
                    // 计算发光因子 - 使用更柔和的渐变
                    float glowFactor = smoothstep(0.05, 1.0, vPulse) * uGlowIntensity;
                    
                    // 根据发光模式计算是否应用发光
                    bool shouldGlow = true;
                    if (uGlowMode == 1.0) {
                        // 部分发光：距离中心较近的粒子发光
                        float particleDist = length(vPosition);
                        shouldGlow = particleDist < 60.0;
                    } else if (uGlowMode == 2.0) {
                        // 随机发光：基于粒子位置的哈希函数生成随机值
                        float random = fract(sin(dot(vPosition.xy, vec2(12.9898, 78.233))) * 43758.5453);
                        shouldGlow = random < 0.5;
                    }
                    
                    if (shouldGlow) {
                        // 更自然的颜色混合
                        finalColor = mix(finalColor, uGlowColor, min(1.0, glowFactor * 1.2));
                        // 更自然的透明度效果
                        alpha = max(alpha, min(1.0, glowFactor * 1.0));
                    }
                }
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    const points = new THREE.Points(geometry, material);
    scene.add(points);
    
    log(LOG_MODULES.THREE, `创建 o.html 星空效果，粒子数量: ${count}`, 'detailed');
    return points;
}

// 创建 o.html 的粒子云效果 (Original Particles)
function createOriginalParticlesEffect(count) {
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 30 + Math.random() * 20;
        
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const baseColor = new THREE.Color(particleConfig.color || '#ffffff');
    const triggerColor = new THREE.Color(effectHeartRateConfig.triggerColor || '#ff0000');
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 },
            uBaseColor: { value: baseColor },
            uTriggerColor: { value: triggerColor },
            uGlowEffect: { value: effectHeartRateConfig.glowEffect || true },
            uGlowColor: { value: new THREE.Color(effectHeartRateConfig.glowColor || '#ff0000') },
            uGlowIntensity: { value: effectHeartRateConfig.glowIntensity || 1.0 },
            uGlowMode: { value: (effectHeartRateConfig.glowMode === 'partial' ? 1 : effectHeartRateConfig.glowMode === 'random' ? 2 : 0) }
        },
        vertexShader: `
            varying float vPulse;
            varying vec3 vPosition;
            uniform float uTime;
            uniform float uPulse;
            
            void main() {
                vPosition = position;
                
                vec3 pos = position;
                
                float breathe = sin(uTime * 0.5) * 2.0;
                pos *= 1.0 + breathe * 0.05;
                pos *= 1.0 + uPulse * 0.3;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = 3.0 * (100.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
                
                vPulse = uPulse;
            }
        `,
        fragmentShader: `
            varying float vPulse;
            varying vec3 vPosition;
            uniform vec3 uBaseColor;
            uniform vec3 uTriggerColor;
            uniform bool uGlowEffect;
            uniform vec3 uGlowColor;
            uniform float uGlowIntensity;
            uniform float uGlowMode;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha *= 0.3;
                
                vec3 color = mix(uBaseColor, uTriggerColor, vPulse);
                vec3 finalColor = color;
                
                // 添加发光效果
                if (uGlowEffect && vPulse > 0.05) {
                    // 计算发光因子 - 使用更柔和的渐变
                    float glowFactor = smoothstep(0.05, 1.0, vPulse) * uGlowIntensity;
                    
                    // 根据发光模式计算是否应用发光
                    bool shouldGlow = true;
                    if (uGlowMode == 1.0) {
                        // 部分发光：距离中心较近的粒子发光
                        float particleDist = length(vPosition);
                        shouldGlow = particleDist < 60.0;
                    } else if (uGlowMode == 2.0) {
                        // 随机发光：基于粒子位置的哈希函数生成随机值
                        float random = fract(sin(dot(vPosition.xy, vec2(12.9898, 78.233))) * 43758.5453);
                        shouldGlow = random < 0.5;
                    }
                    
                    if (shouldGlow) {
                        // 更自然的颜色混合
                        finalColor = mix(finalColor, uGlowColor, min(1.0, glowFactor * 1.2));
                        // 更自然的透明度效果
                        alpha = max(alpha, min(1.0, glowFactor * 1.0));
                    }
                }
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    const points = new THREE.Points(geometry, material);
    scene.add(points);
    
    log(LOG_MODULES.THREE, `创建 o.html 粒子云效果，粒子数量: ${count}`, 'detailed');
    return points;
}

// 创建样式1的星空 (index.html)
function createStarsStyle1() {
    const particleCount = 4000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const color1 = new THREE.Color(0xffffff); // 白
    const color2 = new THREE.Color(particleConfig.color || '#ffffff'); // 红

    for (let i = 0; i < particleCount; i++) {
        // 随机分布在球体表面或内部
        const r = 80 * Math.cbrt(Math.random()); // 半径分布
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        // 颜色混合
        const mixedColor = color1.clone().lerp(color2, Math.random()); // 完全响应颜色变化
        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: particleConfig.size || 0.5,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8
    });

    stars = new THREE.Points(geometry, material);
    scene.add(stars);
    
    log(LOG_MODULES.THREE, `创建样式1星空，粒子数量: ${particleCount}`, 'detailed');
}

// 创建 xin.html 的样式1星空效果 (Style1 Stars)
function createStarsStyle1Effect(count) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const color1 = new THREE.Color(0xffffff); // 白
    const color2 = new THREE.Color(particleConfig.color || '#ffffff'); // 红

    for (let i = 0; i < count; i++) {
        // 随机分布在球体表面或内部
        const r = 80 * Math.cbrt(Math.random()); // 半径分布
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        sizes[i] = Math.random() * 1 + 0.5;

        // 颜色混合
        const mixedColor = color1.clone().lerp(color2, Math.random()); // 完全响应颜色变化
        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 },
            uSpeed: { value: 0.02 },
            uTriggerColor: { value: new THREE.Color(effectHeartRateConfig.triggerColor || '#ff0000') },
            uGlowEffect: { value: effectHeartRateConfig.glowEffect || true },
            uGlowColor: { value: new THREE.Color(effectHeartRateConfig.glowColor || '#ff0000') },
            uGlowIntensity: { value: effectHeartRateConfig.glowIntensity || 2.0 },
            uGlowMode: { value: (effectHeartRateConfig.glowMode === 'partial' ? 1 : effectHeartRateConfig.glowMode === 'random' ? 2 : 0) }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 aColor;
            varying vec3 vColor;
            varying float vPulse;
            varying vec3 vPosition;
            uniform float uTime;
            uniform float uPulse;
            uniform float uSpeed;
            
            void main() {
                vColor = aColor;
                vPosition = position;
                
                vec3 pos = position;
                float dist = length(pos);
                
                float pulseWave = sin(dist * 0.05 - uTime * 3.0) * uPulse * 5.0;
                pos += normalize(pos) * pulseWave;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (200.0 / -mvPosition.z) * (1.0 + uPulse * 0.5);
                gl_Position = projectionMatrix * mvPosition;
                
                vPulse = uPulse;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vPulse;
            varying vec3 vPosition;
            uniform vec3 uTriggerColor;
            uniform bool uGlowEffect;
            uniform vec3 uGlowColor;
            uniform float uGlowIntensity;
            uniform float uGlowMode;
            
            void main() {
                // 方块粒子效果
                float alpha = 1.0;
                alpha *= 0.8 + vPulse * 0.2;
                
                vec3 finalColor = vColor;
                
                // 只在发光效果启用时才应用颜色混合
                if (uGlowEffect && vPulse > 0.3) {
                    finalColor = mix(vColor, uTriggerColor, vPulse);
                }
                
                // 添加发光效果
                if (uGlowEffect && vPulse > 0.05) {
                    // 计算发光因子 - 只在有心率数据时应用发光效果
                    float glowFactor = smoothstep(0.05, 1.0, vPulse) * uGlowIntensity;
                    
                    // 根据发光模式计算是否应用发光
                    bool shouldGlow = true;
                    if (uGlowMode == 1.0) {
                        // 部分发光：距离中心较近的粒子发光
                        float particleDist = length(vPosition);
                        shouldGlow = particleDist < 60.0;
                    } else if (uGlowMode == 2.0) {
                        // 随机发光：基于粒子位置的哈希函数生成随机值
                        float random = fract(sin(dot(vPosition.xy, vec2(12.9898, 78.233))) * 43758.5453);
                        shouldGlow = random < 0.5;
                    }
                    
                    if (shouldGlow) {
                        // 更自然的颜色混合
                        finalColor = mix(finalColor, uGlowColor, min(1.0, glowFactor * 1.2));
                        // 更自然的透明度效果
                        alpha = max(alpha, min(1.0, glowFactor * 1.0));
                    }
                }
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);
    
    log(LOG_MODULES.THREE, `创建样式1星空效果，粒子数量: ${count}`, 'detailed');
    return points;
}

// 创建星空
function createStars() {
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const colors = new Float32Array(starCount * 3);
    
    const baseColor = new THREE.Color(particleConfig.color || '#ffffff');
    const secondaryColor = new THREE.Color(effectHeartRateConfig.triggerColor || '#ff0000');
    
    for (let i = 0; i < starCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 200;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
        
        sizes[i] = Math.random() * 2 + 0.5;
        
        const colorChoice = Math.random();
        if (colorChoice < 0.7) {
            // 使用基础颜色（白色）
            colors[i * 3] = baseColor.r;
            colors[i * 3 + 1] = baseColor.g;
            colors[i * 3 + 2] = baseColor.b;
        } else if (colorChoice < 0.9) {
            // 使用灰色
            colors[i * 3] = 0.4;
            colors[i * 3 + 1] = 0.4;
            colors[i * 3 + 2] = 0.4;
        } else {
            // 使用触发颜色（红色）
            colors[i * 3] = secondaryColor.r;
            colors[i * 3 + 1] = secondaryColor.g;
            colors[i * 3 + 2] = secondaryColor.b;
        }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 aColor;
            varying vec3 vColor;
            varying float vPulse;
            uniform float uTime;
            uniform float uPulse;
            
            void main() {
                vColor = aColor;
                
                vec3 pos = position;
                float dist = length(pos);
                
                float pulseWave = sin(dist * 0.05 - uTime * 3.0) * uPulse * 5.0;
                pos += normalize(pos) * pulseWave;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (200.0 / -mvPosition.z) * (1.0 + uPulse * 0.5);
                gl_Position = projectionMatrix * mvPosition;
                
                vPulse = uPulse;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vPulse;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha *= 0.6 + vPulse * 0.4;
                
                vec3 finalColor = vColor;
                if (vPulse > 0.3 && vColor.r > 0.9) {
                    finalColor = vec3(1.0, 0.1, 0.1);
                }
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    stars = new THREE.Points(geometry, material);
    scene.add(stars);
    
    log(LOG_MODULES.THREE, `创建星空，星星数量: ${starCount}`, 'detailed');
}

// 创建粒子云
function createParticles() {
    const count = 500;
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 30 + Math.random() * 20;
        
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const baseColor = new THREE.Color(particleConfig.color || '#ffffff');
    const triggerColor = new THREE.Color(effectHeartRateConfig.triggerColor || '#ff0000');
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 },
            uBaseColor: { value: baseColor },
            uTriggerColor: { value: triggerColor }
        },
        vertexShader: `
            varying float vPulse;
            uniform float uTime;
            uniform float uPulse;
            
            void main() {
                vec3 pos = position;
                
                float breathe = sin(uTime * 0.5) * 2.0;
                pos *= 1.0 + breathe * 0.05;
                pos *= 1.0 + uPulse * 0.3;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = 3.0 * (100.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
                
                vPulse = uPulse;
            }
        `,
        fragmentShader: `
            varying float vPulse;
            uniform vec3 uBaseColor;
            uniform vec3 uTriggerColor;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha *= 0.3;
                
                vec3 color = mix(uBaseColor, uTriggerColor, vPulse);
                
                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    particles = new THREE.Points(geometry, material);
    scene.add(particles);
    
    log(LOG_MODULES.THREE, `创建粒子云，粒子数量: ${count}`, 'detailed');
}

// 窗口调整
function onWindowResize() {
    if (!camera || !renderer) return;
    
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 重置粒子系统 - 根据配置创建粒子效果
function resetParticles(style) {
    // 移除现有的粒子系统
    if (stars) {
        scene.remove(stars);
        stars.geometry.dispose();
        stars.material.dispose();
        stars = null;
    }
    if (particles) {
        scene.remove(particles);
        particles.geometry.dispose();
        particles.material.dispose();
        particles = null;
    }
    
    // 只有在粒子效果启用时才创建新的粒子效果
    if (particlesEnabled) {
        stars = createParticlesByEffect(particleConfig.效果);
    }
    
    log(LOG_MODULES.THREE, `重置粒子系统，样式: style1, 效果: ${particleConfig.效果}, 状态: ${particlesEnabled ? '启用' : '禁用'}`, 'detailed');
}

// 设置粒子效果
function setParticleEffect(effect) {
    particleConfig.效果 = effect;
    // 重置粒子系统以应用新效果
    if (scene) {
        const currentStyle = document.body.className.includes('style1') ? 'style1' : 'style2';
        resetParticles(currentStyle);
    }
    log(LOG_MODULES.THREE, `设置粒子效果: ${effect}`, 'detailed');
}

// 设置粒子颜色
function setParticleColor(color) {
    particleConfig.color = color;
    // 重置粒子系统以应用新颜色
    if (scene) {
        const currentStyle = document.body.className.includes('style1') ? 'style1' : 'style2';
        resetParticles(currentStyle);
    }
    log(LOG_MODULES.THREE, `设置粒子颜色: ${color}`, 'detailed');
}

// 设置粒子数量
function setParticleCount(count) {
    particleConfig.数量 = count;
    // 重置粒子系统以应用新数量
    if (scene) {
        const currentStyle = document.body.className.includes('style1') ? 'style1' : 'style2';
        resetParticles(currentStyle);
    }
    log(LOG_MODULES.THREE, `设置粒子数量: ${count}`, 'detailed');
}

// 设置粒子大小
function setParticleSize(size) {
    particleConfig.size = size;
    // 重置粒子系统以应用新大小
    if (scene) {
        const currentStyle = document.body.className.includes('style1') ? 'style1' : 'style2';
        resetParticles(currentStyle);
    }
    log(LOG_MODULES.THREE, `设置粒子大小: ${size}`, 'detailed');
}

// 设置多颜色效果的颜色配置
function setParticleMultiColors(colors) {
    particleConfig.colors = colors;
    // 重置粒子系统以应用新颜色
    if (scene) {
        const currentStyle = document.body.className.includes('style1') ? 'style1' : 'style2';
        resetParticles(currentStyle);
    }
    log(LOG_MODULES.THREE, `设置粒子多颜色配置: ${JSON.stringify(colors)}`, 'detailed');
}

// 获取粒子配置
function getParticleConfig() {
    return particleConfig;
}

// 更新Three.js场景
function updateThree(time, pulseIntensity, effectIntensity = 1.0, effectSpeed = 1.0) {
    if (!stars && !particles || !particlesEnabled) return;
    
    const t = time * 0.001;
    const pulse = Math.max(0, Math.min(1, pulseIntensity));
    
    // 更新星星和粒子
    if (stars) {
        if (stars.material.uniforms) {
            // ShaderMaterial材质（所有粒子效果）
            stars.material.uniforms.uTime.value = t;
            stars.material.uniforms.uPulse.value = pulse * effectIntensity;
            
            // 更新效果强度和节奏
            if (stars.material.uniforms.uSpeed) {
                stars.material.uniforms.uSpeed.value = 0.02 * effectSpeed;
            }
            
            // 确保使用统一的发光效果设置
            updateGlowEffectUniforms(stars);
        } else if (stars.material instanceof THREE.PointsMaterial) {
            // PointsMaterial材质（旧样式）
            // 应用缩放效果
            const scale = 1 + (pulse * 0.5 * effectIntensity);
            stars.scale.set(scale, scale, scale);
            
            // 应用透明度效果
            stars.material.opacity = 0.8 + (pulse * 0.3 * effectIntensity);
            
            // 应用大小效果
            stars.material.size = 0.3 + (pulse * 0.3 * effectIntensity);
        }
    }
    
    if (particles && particles.material.uniforms) {
        particles.material.uniforms.uTime.value = t;
        particles.material.uniforms.uPulse.value = pulse * effectIntensity;
        
        // 更新效果强度和节奏
        if (particles.material.uniforms.uSpeed) {
            particles.material.uniforms.uSpeed.value = 0.02 * effectSpeed;
        }
        
        // 确保使用统一的发光效果设置
        updateGlowEffectUniforms(particles);
    }
    
    // 旋转效果
    if (stars) {
        stars.rotation.y = t * 0.05 * effectSpeed;
        stars.rotation.x = t * 0.02 * effectSpeed;
    }
    
    if (particles) {
        particles.rotation.y = -t * 0.06 * effectSpeed;
    }
    
    // 只在详细日志级别输出
    log(LOG_MODULES.THREE, `更新Three.js场景，时间: ${t.toFixed(2)}, 脉冲强度: ${pulse.toFixed(2)}, 效果强度: ${effectIntensity.toFixed(2)}, 效果节奏: ${effectSpeed.toFixed(2)}, 发光效果: ${effectHeartRateConfig.glowEffect}`, 'detailed');
}

// 粒子效果启用状态
let particlesEnabled = true;

// 设置粒子效果启用状态
function setParticlesEnabled(enabled) {
    particlesEnabled = enabled;
    log(LOG_MODULES.THREE, `粒子效果已${enabled ? '启用' : '禁用'}`, 'detailed');
}

// 更新效果与心率绑定配置
function setEffectHeartRateConfig(config) {
    if (config) {
        effectHeartRateConfig = {
            ...effectHeartRateConfig,
            ...config
        };
        log(LOG_MODULES.THREE, `效果与心率绑定配置已更新`, 'detailed');
        
        // 当发光效果配置更新时，更新所有粒子效果的发光参数
        if (stars) {
            updateGlowEffectUniforms(stars);
        }
        if (particles) {
            updateGlowEffectUniforms(particles);
        }
    }
}

// 更新粒子效果的发光效果uniforms
function updateGlowEffectUniforms(object) {
    if (object && object.material && object.material.uniforms) {
        const uniforms = object.material.uniforms;
        
        if (uniforms.uGlowEffect) {
            uniforms.uGlowEffect.value = effectHeartRateConfig.glowEffect;
        }
        if (uniforms.uGlowColor) {
            uniforms.uGlowColor.value = new THREE.Color(effectHeartRateConfig.glowColor || '#ff0000');
        }
        if (uniforms.uGlowIntensity) {
            uniforms.uGlowIntensity.value = effectHeartRateConfig.glowIntensity || 1.0;
        }
        if (uniforms.uGlowMode) {
            uniforms.uGlowMode.value = (effectHeartRateConfig.glowMode === 'partial' ? 1 : effectHeartRateConfig.glowMode === 'random' ? 2 : 0);
        }
    }
}

// 渲染Three.js场景
function renderThree() {
    if (!renderer || !scene || !camera || !particlesEnabled) return;
    
    renderer.render(scene, camera);
    
    // 只在详细日志级别输出
    log(LOG_MODULES.THREE, '渲染Three.js场景', 'detailed');
}

// 更新背景颜色
function updateBackgroundColor(color) {
    if (renderer) {
        // 保持透明背景，让HTML背景图片可见
        renderer.setClearColor(color || 0x000000, 0);
    }
}

export {
    initThree,
    updateThree,
    renderThree,
    resetParticles,
    updateBackgroundColor,
    onWindowResize,
    setParticleEffect,
    setParticleColor,
    setParticleCount,
    setParticleSize,
    setParticleMultiColors,
    getParticleConfig,
    setParticlesEnabled,
    setEffectHeartRateConfig
};

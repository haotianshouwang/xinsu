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
    
    // 根据当前样式创建粒子系统
    if (currentStyle === 'style1') {
        createStarsStyle1();
    } else {
        createStars();
        createParticles();
    }
    
    window.addEventListener('resize', onWindowResize);
    
    log(LOG_MODULES.THREE, `Three.js 初始化完成，样式: ${currentStyle}`, 'detailed');
}

// 创建样式1的星空 (index.html)
function createStarsStyle1() {
    const particleCount = 4000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const color1 = new THREE.Color(0xffffff); // 白
    const color2 = new THREE.Color(0xff0033); // 红

    for (let i = 0; i < particleCount; i++) {
        // 随机分布在球体表面或内部
        const r = 80 * Math.cbrt(Math.random()); // 半径分布
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        // 颜色混合
        const mixedColor = color1.clone().lerp(color2, Math.random() * 0.3); // 大部分白，带点红
        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.3,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8
    });

    stars = new THREE.Points(geometry, material);
    scene.add(stars);
    
    log(LOG_MODULES.THREE, `创建样式1星空，粒子数量: ${particleCount}`, 'detailed');
}

// 创建星空
function createStars() {
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const colors = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 200;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
        
        sizes[i] = Math.random() * 2 + 0.5;
        
        const colorChoice = Math.random();
        if (colorChoice < 0.7) {
            colors[i * 3] = 1;
            colors[i * 3 + 1] = 1;
            colors[i * 3 + 2] = 1;
        } else if (colorChoice < 0.9) {
            colors[i * 3] = 0.4;
            colors[i * 3 + 1] = 0.4;
            colors[i * 3 + 2] = 0.4;
        } else {
            colors[i * 3] = 1;
            colors[i * 3 + 1] = 0.1;
            colors[i * 3 + 2] = 0.1;
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
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 }
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
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha *= 0.3;
                
                vec3 color = mix(vec3(0.5), vec3(1.0, 0.1, 0.1), vPulse);
                
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

// 重置粒子系统
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
    
    // 根据样式创建新的粒子系统
    if (style === 'style1') {
        // 样式1：index.html的粒子效果
        createStarsStyle1();
    } else {
        // 样式2：o.html的粒子效果
        createStars();
        createParticles();
    }
    
    log(LOG_MODULES.THREE, `重置粒子系统，样式: ${style}`, 'detailed');
}

// 更新Three.js场景
function updateThree(time, pulseIntensity) {
    if (!stars && !particles) return;
    
    const t = time * 0.001;
    const pulse = Math.max(0, Math.min(1, pulseIntensity));
    
    // 更新星星和粒子
    if (stars) {
        if (stars.material.uniforms) {
            // 样式2的粒子系统（ShaderMaterial）
            stars.material.uniforms.uTime.value = t;
            stars.material.uniforms.uPulse.value = pulse;
        } else if (stars.material instanceof THREE.PointsMaterial) {
            // 样式1的粒子系统（PointsMaterial）
            // 应用缩放效果
            const scale = 1 + (pulse * 0.3);
            stars.scale.set(scale, scale, scale);
            
            // 应用透明度效果
            stars.material.opacity = 0.8 + (pulse * 0.2);
            
            // 应用大小效果
            stars.material.size = 0.3 + (pulse * 0.2);
        }
    }
    
    if (particles && particles.material.uniforms) {
        particles.material.uniforms.uTime.value = t;
        particles.material.uniforms.uPulse.value = pulse;
    }
    
    // 旋转效果
    if (stars) {
        stars.rotation.y = t * 0.02;
        stars.rotation.x = t * 0.01;
    }
    
    if (particles) {
        particles.rotation.y = -t * 0.03;
    }
    
    // 只在详细日志级别输出
    log(LOG_MODULES.THREE, `更新Three.js场景，时间: ${t.toFixed(2)}, 脉冲强度: ${pulse.toFixed(2)}`, 'detailed');
}

// 渲染Three.js场景
function renderThree() {
    if (!renderer || !scene || !camera) return;
    
    renderer.render(scene, camera);
    
    // 只在详细日志级别输出
    log(LOG_MODULES.THREE, '渲染Three.js场景', 'detailed');
}

// 更新背景颜色
function updateBackgroundColor(color) {
    if (renderer) {
        renderer.setClearColor(color, 1);
    }
}

export {
    initThree,
    updateThree,
    renderThree,
    resetParticles,
    updateBackgroundColor,
    onWindowResize
};

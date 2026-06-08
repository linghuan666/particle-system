/**
 * Particle System - Three.js particle rendering with gesture-driven animation
 */
class ParticleSystem {
    constructor() {
        this.particleCount = 50000;
        this.currentShape = 'heart';
        this.currentColor = { r: 1.0, g: 0.3, b: 0.5 };
        this.userColorEnabled = false;

        // Animation state
        this.basePositions = null;      // shape positions (never modified by animation)
        this.targetPositions = null;    // computed each frame from base + spread/scale
        this.targetColors = null;
        this.velocities = null;
        this.currentPositions = null;
        this.spreadFactor = 0.5;
        this.targetSpread = 0.5;
        this.scaleFactor = 1.0;
        this.targetScale = 1.0;
        this.time = 0;
        this._spreadVelocity = 0;
        this._expandBlend = 0.0;
        this._brightnessBoost = 1.0;  // smoothed brightness

        // Tunable physics parameters
        this.expandOmega = 5.0;       // expansion spring speed
        this.contractOmega = 12.0;    // contraction spring speed
        this.contractZeta = 0.6;      // contraction damping (lower = more bounce)
        this.spreadInterp = 0.35;     // target position response speed

        // Three.js objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = null;
        this.geometry = null;
        this.material = null;
        this.mouse = { x: 0, y: 0 };

        this.shapeGenerators = {
            heart: generateHeart,
            flower: generateFlower,
            saturn: generateSaturn,
            icecream: generateIceCream,
            fireworks: generateFireworks
        };
    }

    init(container) {
        // Scene
        this.scene = new THREE.Scene();

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            60, window.innerWidth / window.innerHeight, 0.1, 1000
        );
        this.camera.position.set(0, 0.5, 5);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        container.appendChild(this.renderer.domElement);

        // Ambient light (not strictly needed for ShaderMaterial but good practice)
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));

        // Initialize particle geometry
        this.geometry = new THREE.BufferGeometry();
        this.currentPositions = new Float32Array(this.particleCount * 3);
        this.basePositions = new Float32Array(this.particleCount * 3);
        this.targetPositions = new Float32Array(this.particleCount * 3);
        this.targetColors = new Float32Array(this.particleCount * 3);
        this.velocities = new Float32Array(this.particleCount * 3);

        // Set initial random positions
        for (let i = 0; i < this.particleCount * 3; i += 3) {
            this.currentPositions[i] = (Math.random() - 0.5) * 2;
            this.currentPositions[i + 1] = Math.random() * 2;
            this.currentPositions[i + 2] = (Math.random() - 0.5) * 2;
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.currentPositions, 3));
        this.geometry.setAttribute('aTargetPosition', new THREE.BufferAttribute(this.targetPositions.slice(), 3));
        this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.targetColors.slice(), 3));

        // Shader material
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
                uSpreadFactor: { value: 0.5 },
                uScaleFactor: { value: 1.0 },
                uUserColor: { value: new THREE.Vector3(1.0, 0.3, 0.5) },
                uUseUserColor: { value: 0 },
                uBrightness: { value: 1.0 },
                uUserBrightness: { value: 0.8 },
                uMouse: { value: new THREE.Vector2(0, 0) }
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.particles = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.particles);

        // Load initial shape
        this.setShape('heart');

        // Mouse tracking (for shader)
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        // Orbit controls
        this._orbitState = {
            theta: Math.PI / 2,  // camera on Z axis = front view
            phi: Math.PI / 2,
            radius: 5,
            target: new THREE.Vector3(0, 0, 0),
            dragging: false,
            panning: false,
            lastX: 0,
            lastY: 0
        };
        this._setupOrbitControls(container);

        // Resize
        window.addEventListener('resize', () => this.onResize());
    }

    _setupOrbitControls(el) {
        const s = this._orbitState;
        const canvas = this.renderer.domElement;

        canvas.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            s.dragging = true;
            s.panning = e.ctrlKey;
            s.lastX = e.clientX;
            s.lastY = e.clientY;
            canvas.style.cursor = s.panning ? 'grab' : 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!s.dragging) return;
            const dx = e.clientX - s.lastX;
            const dy = e.clientY - s.lastY;
            s.lastX = e.clientX;
            s.lastY = e.clientY;

            if (s.panning) {
                // Pan: move target in camera-relative XY
                const panSpeed = 0.005 * s.radius;
                const right = new THREE.Vector3();
                const up = new THREE.Vector3();
                right.setFromMatrixColumn(this.camera.matrix, 0);
                up.setFromMatrixColumn(this.camera.matrix, 1);
                s.target.addScaledVector(right, -dx * panSpeed);
                s.target.addScaledVector(up, dy * panSpeed);
            } else {
                // Orbit: rotate around target
                s.theta -= dx * 0.005;
                s.phi -= dy * 0.005;
                s.phi = Math.max(0.1, Math.min(Math.PI - 0.1, s.phi));
            }
        });

        window.addEventListener('mouseup', () => {
            s.dragging = false;
            s.panning = false;
            canvas.style.cursor = '';
        });

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            s.radius *= 1 + e.deltaY * 0.001;
            s.radius = Math.max(1.5, Math.min(20, s.radius));
        }, { passive: false });

        // Double-click to reset camera
        canvas.addEventListener('dblclick', () => {
            this.resetCamera();
        });
    }

    _updateCamera() {
        const s = this._orbitState;
        const x = s.radius * Math.sin(s.phi) * Math.cos(s.theta);
        const y = s.radius * Math.cos(s.phi);
        const z = s.radius * Math.sin(s.phi) * Math.sin(s.theta);
        this.camera.position.set(
            s.target.x + x,
            s.target.y + y,
            s.target.z + z
        );
        this.camera.lookAt(s.target);
    }

    resetCamera() {
        const s = this._orbitState;
        s.theta = Math.PI / 2;
        s.phi = Math.PI / 2;
        s.radius = 5;
        s.target.set(0, 0, 0);
    }

    _computeTargets() {
        const base = this.basePositions;
        const targets = this.targetPositions;
        const count = this.particleCount;
        const spread = this.spreadFactor;
        const scale = this.scaleFactor;
        const time = this.time;

        // Non-linear burst: aggressive exponential
        const burst = spread * spread * spread * 4.0;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            const bx = base[i3];
            const by = base[i3 + 1];
            const bz = base[i3 + 2];

            // Scale
            let tx = bx * scale;
            let ty = by * scale;
            let tz = bz * scale;

            // Radial burst
            const dist = Math.sqrt(bx * bx + by * by + bz * bz) + 0.001;
            const nx = bx / dist;
            const ny = by / dist;
            const nz = bz / dist;

            // Explosive push: scales with both spread and base distance
            const push = burst * (0.3 + dist * 0.7);
            tx += nx * push;
            ty += ny * push;
            tz += nz * push;

            // Scatter only at high spread
            if (spread > 0.3) {
                const scatter = (spread - 0.3) * 0.4;
                const seed = i * 7.13;
                tx += Math.sin(seed + time * 0.8) * scatter;
                ty += Math.cos(seed * 1.3 + time * 0.6) * scatter;
                tz += Math.sin(seed * 0.7 + time * 0.9) * scatter;
            }

            targets[i3] = tx;
            targets[i3 + 1] = ty;
            targets[i3 + 2] = tz;
        }
    }

    setShape(shapeName) {
        if (shapeName === 'image') return; // Handled separately by loadImage

        this.currentShape = shapeName;
        const generator = this.shapeGenerators[shapeName];
        if (!generator) return;

        const shape = generator(this.particleCount);
        this._applyShapeData(shape);
    }

    _applyShapeData(shape) {
        const count = Math.min(shape.count, this.particleCount);

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            // Write to base positions (never modified by animation)
            this.basePositions[i3] = shape.positions[i3];
            this.basePositions[i3 + 1] = shape.positions[i3 + 1];
            this.basePositions[i3 + 2] = shape.positions[i3 + 2];

            if (this.userColorEnabled) {
                this.targetColors[i3] = this.currentColor.r;
                this.targetColors[i3 + 1] = this.currentColor.g;
                this.targetColors[i3 + 2] = this.currentColor.b;
            } else {
                this.targetColors[i3] = shape.colors[i3];
                this.targetColors[i3 + 1] = shape.colors[i3 + 1];
                this.targetColors[i3 + 2] = shape.colors[i3 + 2];
            }

            // Reset velocity for smooth transition
            this.velocities[i3] = 0;
            this.velocities[i3 + 1] = 0;
            this.velocities[i3 + 2] = 0;
        }

        // Hide unused particles (e.g. custom image with fewer particles than buffer)
        // Move them far off-screen so the vertex shader fades them to alpha=0
        for (let i = count; i < this.particleCount; i++) {
            const i3 = i * 3;
            this.basePositions[i3] = 0;
            this.basePositions[i3 + 1] = -9999;
            this.basePositions[i3 + 2] = 0;
            this.currentPositions[i3] = 0;
            this.currentPositions[i3 + 1] = -9999;
            this.currentPositions[i3 + 2] = 0;
            this.velocities[i3] = 0;
            this.velocities[i3 + 1] = 0;
            this.velocities[i3 + 2] = 0;
            this.targetColors[i3] = 0;
            this.targetColors[i3 + 1] = 0;
            this.targetColors[i3 + 2] = 0;
        }

        // Update buffer attributes
        this.geometry.attributes.aColor.array.set(this.targetColors);
        this.geometry.attributes.aColor.needsUpdate = true;
    }

    loadImage(imageData, width, height) {
        this.currentShape = 'image';
        this._lastImageData = { data: imageData, width, height };
        const shape = generateFromImage(imageData, width, height, this.particleCount);
        this._applyShapeData(shape);
    }

    setParticleColor(r, g, b) {
        this.currentColor = { r, g, b };
        this.userColorEnabled = true;
        this.material.uniforms.uUseUserColor.value = 1;
        this.material.uniforms.uUserColor.value.set(r, g, b);
    }

    resetColor() {
        this.userColorEnabled = false;
        this.material.uniforms.uUseUserColor.value = 0;
        // Re-apply current shape with original colors
        this.setShape(this.currentShape);
    }

    setSpread(value) {
        this.targetSpread = value;
    }

    setScale(value) {
        this.targetScale = value;
    }

    setSpreadVelocity(value) {
        // Smooth the velocity to avoid jitter
        this._spreadVelocity += (value - this._spreadVelocity) * 0.4;
    }

    setUserBrightness(value) {
        this.material.uniforms.uUserBrightness.value = value;
    }

    setExpandOmega(v) { this.expandOmega = v; }
    setContractOmega(v) { this.contractOmega = v; }
    setContractZeta(v) { this.contractZeta = v; }
    setSpreadInterp(v) { this.spreadInterp = v; }

    setParticleCount(newCount) {
        this.particleCount = newCount;
        // Recreate buffers
        this.currentPositions = new Float32Array(newCount * 3);
        this.basePositions = new Float32Array(newCount * 3);
        this.targetPositions = new Float32Array(newCount * 3);
        this.targetColors = new Float32Array(newCount * 3);
        this.velocities = new Float32Array(newCount * 3);

        // Random initial positions
        for (let i = 0; i < newCount * 3; i += 3) {
            this.currentPositions[i] = (Math.random() - 0.5) * 2;
            this.currentPositions[i + 1] = Math.random() * 2;
            this.currentPositions[i + 2] = (Math.random() - 0.5) * 2;
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.currentPositions, 3));
        this.geometry.setAttribute('aTargetPosition', new THREE.BufferAttribute(this.targetPositions.slice(), 3));
        this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.targetColors.slice(), 3));

        // Re-apply current shape
        if (this.currentShape === 'image' && this._lastImageData) {
            this.loadImage(this._lastImageData.data, this._lastImageData.width, this._lastImageData.height);
        } else {
            this.setShape(this.currentShape);
        }
    }

    update(deltaTime) {
        this.time += deltaTime;

        // Track spread direction smoothly
        const prevSpread = this.spreadFactor;
        this.spreadFactor += (this.targetSpread - this.spreadFactor) * 0.5;
        this.scaleFactor += (this.targetScale - this.scaleFactor) * 0.4;

        // Smooth blend: 1.0 = expanding, 0.0 = contracting
        const spreadDelta = this.spreadFactor - prevSpread;
        const expandTarget = spreadDelta > 0.001 ? 1.0 : 0.0;
        this._expandBlend += (expandTarget - this._expandBlend) * 0.1;

        // Smooth brightness: gentle compensation for visual dimming at high spread
        // The heavy lifting (overexposure prevention) is done by densityAlpha in the shader
        const targetBright = 1.0 + this.spreadFactor * 0.3 + (this.scaleFactor - 1.0) * 0.3;
        this._brightnessBoost += (targetBright - this._brightnessBoost) * 0.05;

        // Update uniforms
        this.material.uniforms.uTime.value = this.time;
        this.material.uniforms.uSpreadFactor.value = this.spreadFactor;
        this.material.uniforms.uScaleFactor.value = this.scaleFactor;
        this.material.uniforms.uBrightness.value = this._brightnessBoost;
        this.material.uniforms.uMouse.value.set(this.mouse.x, this.mouse.y);

        // Compute animated targets from base positions
        this._computeTargets();

        // Move particles toward targets
        this._animateParticles(deltaTime);

        // Update position buffer
        this.geometry.attributes.position.needsUpdate = true;
    }

    _animateParticles(dt) {
        const positions = this.currentPositions;
        const targets = this.targetPositions;
        const velocities = this.velocities;
        const count = this.particleCount;
        const time = this.time;
        const spread = this.spreadFactor;
        const blend = this._expandBlend;

        // Smooth interpolation between expanding and contracting physics
        const omega = this.contractOmega + (this.expandOmega - this.contractOmega) * blend;
        const zeta = this.contractZeta;
        const k = omega * omega;
        const c = 2 * zeta * omega;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;

            const tx = targets[i3];
            const ty = targets[i3 + 1];
            const tz = targets[i3 + 2];

            const dx = tx - positions[i3];
            const dy = ty - positions[i3 + 1];
            const dz = tz - positions[i3 + 2];

            // Spring-damper
            velocities[i3] += (dx * k - velocities[i3] * c) * dt;
            velocities[i3 + 1] += (dy * k - velocities[i3 + 1] * c) * dt;
            velocities[i3 + 2] += (dz * k - velocities[i3 + 2] * c) * dt;

            positions[i3] += velocities[i3] * dt;
            positions[i3 + 1] += velocities[i3 + 1] * dt;
            positions[i3 + 2] += velocities[i3 + 2] * dt;

            // Breathing: subtle per-particle jitter
            const seed = i * 1.73;
            const breathe = 0.02;
            positions[i3] += Math.sin(time * 3.7 + seed) * breathe * dt;
            positions[i3 + 1] += Math.cos(time * 4.1 + seed * 1.3) * breathe * dt;
            positions[i3 + 2] += Math.sin(time * 3.3 + seed * 0.7) * breathe * dt;

            // Spread turbulence
            if (spread > 0.01) {
                const turb = spread * 0.04;
                positions[i3] += Math.sin(time * 1.5 + i * 0.1) * turb * dt;
                positions[i3 + 1] += Math.cos(time * 1.2 + i * 0.13) * turb * dt;
                positions[i3 + 2] += Math.sin(time * 1.4 + i * 0.11) * turb * dt;
            }
        }
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
    }

    render() {
        this._updateCamera();
        this.renderer.render(this.scene, this.camera);
    }
}

// ─── Shaders ───────────────────────────────────────────────────────────────────
const vertexShader = `
    uniform float uTime;
    uniform float uPixelRatio;
    uniform float uSpreadFactor;
    uniform float uScaleFactor;
    uniform float uBrightness;
    uniform float uUserBrightness;
    uniform vec2 uMouse;
    attribute vec3 aTargetPosition;
    attribute vec3 aColor;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
        vColor = aColor;
        vec3 pos = position;
        // Gentle floating
        pos.y += sin(uTime * 0.5 + position.x * 2.0) * 0.02;
        pos.x += cos(uTime * 0.3 + position.z * 2.0) * 0.01;
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        float dist = length(mvPosition.xyz);
        // Size — bigger when expanded to compensate for additive blending dimming
        float baseSize = uPixelRatio * 10.0;
        float sizeBoost = 1.0 + uSpreadFactor * uSpreadFactor * 1.2 + (uScaleFactor - 1.0) * 0.3;
        gl_PointSize = baseSize * sizeBoost * uScaleFactor * (3.0 / max(dist, 0.1));
        gl_PointSize = clamp(gl_PointSize, 2.0, 48.0);
        // Alpha: distance fade × brightness × spread-based density compensation
        // When contracted (spread≈0): particles overlap → alpha very low to prevent overexposure
        // When expanded (spread≈1): particles sparse → alpha high for vivid display
        float densityAlpha = 0.15 + uSpreadFactor * uSpreadFactor * 0.85;
        vAlpha = smoothstep(25.0, 3.0, dist) * uUserBrightness * uBrightness * densityAlpha;
        // Mouse glow
        float mouseDist = length(pos.xy - uMouse * 3.0);
        vAlpha *= 0.9 + 0.1 * smoothstep(2.0, 0.0, mouseDist);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const fragmentShader = `
    varying vec3 vColor;
    varying float vAlpha;
    uniform float uTime;
    uniform vec3 uUserColor;
    uniform float uUseUserColor;
    void main() {
        // Soft circle shape
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float alpha = smoothstep(1.0, 0.3, d) * vAlpha;
        if (alpha < 0.01) discard;
        // Color
        vec3 color = mix(vColor, uUserColor, uUseUserColor);
        // Boost saturation and brightness for vivid image display
        float lum = dot(color, vec3(0.299, 0.587, 0.114));
        color = mix(vec3(lum), color, 1.3) * 1.2;
        // Hard clamp to prevent overexposure from additive blending
        color = min(color, vec3(1.0));
        // Subtle shimmer
        color += 0.05 * sin(uTime * 2.0 + gl_PointCoord.x * 10.0);
        gl_FragColor = vec4(color, alpha);
    }
`;

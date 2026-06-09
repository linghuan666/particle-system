/**
 * Main Application - Orchestrates particle system, hand tracking, and UI
 */
class App {
    constructor() {
        this.particleSystem = new ParticleSystem();
        this.handTracker = new HandTracker();
        this.clock = new THREE.Clock();
        this.handActive = false;
        this.panelCollapsed = false;

        // Per-shape defaults: particleCount & brightness
        this.shapeDefaults = {
            heart:     { count: 50000, brightness: 0.80 },
            flower:    { count: 50000, brightness: 0.90 },
            saturn:    { count: 50000, brightness: 0.85 },
            icecream:  { count: 50000, brightness: 0.85 },
            fireworks: { count: 50000, brightness: 1.00 },
            custom:    { count: 60000, brightness: 1.20 },
        };
    }

    async init() {
        // Init Three.js particle system
        this.particleSystem.init(document.getElementById('canvas-container'));

        // Setup UI
        this._setupUI();
        this._setupImageUpload();

        // Start animation loop
        this._animate();

        // Hide loading overlay
        setTimeout(() => {
            document.getElementById('loading-overlay').classList.add('hidden');
        }, 500);
    }

    // ─── UI Setup ──────────────────────────────────────────────────────────────
    _setupUI() {
        // Shape buttons
        document.querySelectorAll('.shape-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const shape = btn.dataset.shape;
                if (shape === 'custom') {
                    document.getElementById('image-upload').click();
                    return;
                }
                document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.particleSystem.setShape(shape);
                this._applyShapeDefaults(shape);
            });
        });

        // Color presets
        document.querySelectorAll('.color-preset').forEach(preset => {
            preset.addEventListener('click', () => {
                const hex = preset.dataset.color;
                const rgb = this._hexToRgb(hex);
                document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
                preset.classList.add('active');
                document.getElementById('color-picker').value = hex;
                this.particleSystem.setParticleColor(rgb.r, rgb.g, rgb.b);
            });
        });

        // Color picker
        document.getElementById('color-picker').addEventListener('input', (e) => {
            const rgb = this._hexToRgb(e.target.value);
            document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
            this.particleSystem.setParticleColor(rgb.r, rgb.g, rgb.b);
        });

        // Reset color button
        document.getElementById('reset-color-btn').addEventListener('click', () => {
            this.particleSystem.resetColor();
            document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
        });

        // Particle count slider
        const countSlider = document.getElementById('particle-count');
        const countValue = document.getElementById('particle-count-value');
        countSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            countValue.textContent = val.toLocaleString();
        });
        countSlider.addEventListener('change', (e) => {
            const val = parseInt(e.target.value);
            this.particleSystem.setParticleCount(val);
        });

        // Physics tuning sliders
        this._bindSlider('expand-omega', 'expand-omega-value', (v) => {
            this.particleSystem.expandOmega = v;
            console.log('expandOmega =', v);
            return v;
        });
        this._bindSlider('contract-omega', 'contract-omega-value', (v) => {
            this.particleSystem.contractOmega = v;
            console.log('contractOmega =', v);
            return v;
        });
        this._bindSlider('contract-zeta', 'contract-zeta-value', (v) => {
            this.particleSystem.contractZeta = v;
            console.log('contractZeta =', v);
            return v.toFixed(2);
        });
        this._bindSlider('spread-interp', 'spread-interp-value', (v) => {
            this.particleSystem.spreadInterp = v;
            console.log('spreadInterp =', v);
            return v.toFixed(2);
        });

        // Spread slider (manual)
        const spreadSlider = document.getElementById('spread-slider');
        const spreadValue = document.getElementById('spread-value');
        spreadSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            spreadValue.textContent = Math.round(val * 100) + '%';
            if (!this.handActive) {
                this.particleSystem.setSpread(val);
            }
        });

        // Brightness slider
        const brightnessSlider = document.getElementById('brightness-slider');
        const brightnessValue = document.getElementById('brightness-value');
        brightnessSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            brightnessValue.textContent = val.toFixed(2);
            this.particleSystem.setUserBrightness(val);
        });

        // Hand tracking button
        document.getElementById('hand-btn').addEventListener('click', () => this._toggleHandTracking());

        // Panel toggle
        document.getElementById('panel-toggle').addEventListener('click', () => {
            this.panelCollapsed = !this.panelCollapsed;
            document.querySelector('.panel-content').classList.toggle('collapsed', this.panelCollapsed);
            document.getElementById('panel-toggle').innerHTML = this.panelCollapsed
                ? '<svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>'
                : '<svg viewBox="0 0 24 24"><path d="M7 14l5-5 5 5z"/></svg>';
        });

        // Fullscreen
        document.getElementById('fullscreen-btn').addEventListener('click', () => this._toggleFullscreen());
        document.getElementById('reset-btn').addEventListener('click', () => this.particleSystem.resetCamera());

        // Keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if (e.key === 'f' || e.key === 'F') this._toggleFullscreen();
            if (e.key === 'h' || e.key === 'H') this._toggleHandTracking();
        });
    }

    // ─── Image Upload ──────────────────────────────────────────────────────────
    _setupImageUpload() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('image-upload');

        uploadArea.addEventListener('click', () => fileInput.click());

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--accent)';
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = '';
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '';
            if (e.dataTransfer.files.length > 0) {
                this._processImage(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this._processImage(e.target.files[0]);
            }
        });
    }

    _processImage(file) {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Draw to canvas to get pixel data
                const canvas = document.createElement('canvas');
                const maxSize = 256;
                let w = img.width;
                let h = img.height;

                if (w > maxSize || h > maxSize) {
                    const scale = maxSize / Math.max(w, h);
                    w = Math.floor(w * scale);
                    h = Math.floor(h * scale);
                }

                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                const imageData = ctx.getImageData(0, 0, w, h);

                this.particleSystem.loadImage(imageData.data, w, h);

                // Apply image defaults
                this._applyShapeDefaults('custom');

                // Update UI
                document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
                document.getElementById('custom-shape-btn').classList.add('active');
                document.getElementById('upload-area').querySelector('p').textContent = file.name;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // ─── Hand Tracking ─────────────────────────────────────────────────────────
    async _toggleHandTracking() {
        const btn = document.getElementById('hand-btn');
        const container = document.getElementById('hand-container');
        const status = document.getElementById('gesture-status');

        if (this.handActive) {
            this.handTracker.stop();
            this.handActive = false;
            btn.classList.remove('active');
            container.classList.remove('active');
            status.classList.remove('active');
            const val = parseFloat(document.getElementById('spread-slider').value);
            this.particleSystem.setSpread(val);
            btn.querySelector('span').textContent = 'Start Hand Tracking';
            return;
        }

        // Prevent double-click
        if (this._handLoading) return;
        this._handLoading = true;

        btn.classList.add('active');
        btn.querySelector('span').textContent = 'Loading model...';

        // Init only once
        if (!this.handTracker.isInitialized) {
            const video = document.getElementById('hand-video');
            const canvas = document.getElementById('hand-canvas');
            const success = await this.handTracker.init(video, canvas, (msg) => {
                btn.querySelector('span').textContent = msg;
            });
            if (!success) {
                this._handLoading = false;
                btn.querySelector('span').textContent = 'Load Failed - Retry';
                btn.classList.remove('active');
                // Allow retry by resetting init state
                this.handTracker.isInitialized = false;
                return;
            }
        }

        btn.querySelector('span').textContent = 'Starting camera...';
        const started = await this.handTracker.start();
        if (!started) {
            this._handLoading = false;
            btn.querySelector('span').textContent = 'Camera Denied';
            setTimeout(() => { btn.querySelector('span').textContent = 'Start Hand Tracking'; }, 2000);
            btn.classList.remove('active');
            return;
        }

        this._handLoading = false;
        this.handActive = true;
        btn.querySelector('span').textContent = 'Stop Hand Tracking';
        container.classList.add('active');
        status.classList.add('active');
    }

    _updateGestureUI() {
        if (!this.handActive) return;

        // Use interpolated values for smooth 60fps
        const gesture = this.handTracker.getInterpolated();

        // Update gesture dots (use raw for status)
        const raw = this.handTracker.gesture;
        const handDot = document.getElementById('gesture-hand');
        const pinchDot = document.getElementById('gesture-pinch');
        const openDot = document.getElementById('gesture-open');

        if (handDot) handDot.classList.toggle('active', raw.handDetected);
        if (pinchDot) pinchDot.classList.toggle('active', raw.isPinching);
        if (openDot) openDot.classList.toggle('active', raw.isOpen);

        // Apply interpolated gesture to particle system
        if (raw.handDetected) {
            this.particleSystem.setSpread(gesture.spreadFactor);
            this.particleSystem.setSpreadVelocity(gesture.spreadVelocity);
            this.particleSystem.setScale(gesture.scale);

            document.getElementById('spread-slider').value = gesture.spreadFactor;
            document.getElementById('spread-value').textContent = Math.round(gesture.spreadFactor * 100) + '%';
        }
    }

    // ─── Slider Helper ─────────────────────────────────────────────────────────
    _bindSlider(sliderId, valueId, callback) {
        const slider = document.getElementById(sliderId);
        const display = document.getElementById(valueId);
        if (!slider || !display) return;
        slider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            const formatted = callback(val);
            display.textContent = formatted;
        });
    }

    // ─── Apply per-shape defaults ──────────────────────────────────────────────
    _applyShapeDefaults(shape) {
        const defaults = this.shapeDefaults[shape];
        if (!defaults) return;

        // Update particle count
        const countSlider = document.getElementById('particle-count');
        const countValue = document.getElementById('particle-count-value');
        countSlider.value = defaults.count;
        countValue.textContent = defaults.count.toLocaleString();
        this.particleSystem.setParticleCount(defaults.count);

        // Update brightness
        const brightnessSlider = document.getElementById('brightness-slider');
        const brightnessValue = document.getElementById('brightness-value');
        brightnessSlider.value = defaults.brightness;
        brightnessValue.textContent = defaults.brightness.toFixed(2);
        this.particleSystem.setUserBrightness(defaults.brightness);
    }

    // ─── Fullscreen ────────────────────────────────────────────────────────────
    _toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    }

    // ─── Animation Loop ───────────────────────────────────────────────────────
    _animate() {
        requestAnimationFrame(() => this._animate());

        const delta = this.clock.getDelta();

        // Update particle system
        this.particleSystem.update(delta);

        // Update gesture UI
        this._updateGestureUI();

        // Render
        this.particleSystem.render();
    }

    // ─── Utilities ─────────────────────────────────────────────────────────────
    _hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255
        } : { r: 1, g: 1, b: 1 };
    }
}

// ─── Bootstrap ─────────────────────────────────────────────────────────────────
const app = new App();
window.addEventListener('DOMContentLoaded', () => app.init());

/**
 * Hand Tracker - MediaPipe Hands for gesture detection
 */
class HandTracker {
    constructor() {
        this.videoElement = null;
        this.canvasElement = null;
        this.canvasCtx = null;
        this.hands = null;
        this.camera = null;
        this.isInitialized = false;
        this.isTracking = false;
        this.showHand = true;

        // Gesture state
        this.gesture = {
            spreadFactor: 0.5,
            spreadVelocity: 0,   // how fast hand is opening/closing
            scale: 1.0,
            isOpen: false,
            isPinching: false,
            handDetected: false,
            smoothedPinch: 0.5,
            smoothedOpen: 0.5
        };

        // Smoothing (higher = faster response)
        this.smoothingFactor = 0.5;
        this._prevOpen = 0;
        this._smoothedVelocity = 0;

        // Interpolation state for smooth 60fps from low-fps MediaPipe
        this._prevSpread = 0.5;
        this._prevScale = 1.0;
        this._currSpread = 0.5;
        this._currScale = 1.0;
        this._lastUpdateTime = 0;
        this._updateInterval = 33; // ~30fps default
    }

    async init(videoEl, canvasEl, onProgress) {
        this.videoElement = videoEl;
        this.canvasElement = canvasEl;
        this.canvasCtx = canvasEl.getContext('2d');

        const reportProgress = (msg) => {
            console.log('[HandTracker]', msg);
            if (onProgress) onProgress(msg);
        };

        try {
            reportProgress('Loading model files...');

            this.hands = new Hands({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
                }
            });

            this.hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 1,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.5
            });

            this.hands.onResults((results) => this._onResults(results));

            // Pre-initialize the model with timeout
            reportProgress('Initializing model...');
            if (typeof this.hands.initialize === 'function') {
                const initPromise = this.hands.initialize();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Model init timeout')), 30000)
                );
                await Promise.race([initPromise, timeoutPromise]);
            }
            reportProgress('Model ready.');

            this.camera = new Camera(this.videoElement, {
                onFrame: async () => {
                    if (this.hands && this.isTracking) {
                        try {
                            await this.hands.send({ image: this.videoElement });
                        } catch (e) {
                            console.warn('Hand send error:', e);
                        }
                    }
                },
                width: 640,
                height: 480
            });

            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Hand tracker init failed:', error);
            reportProgress('Init failed: ' + error.message);
            return false;
        }
    }

    async start() {
        if (!this.isInitialized) return false;
        try {
            this.isTracking = true;
            await this.camera.start();
            return true;
        } catch (error) {
            console.error('Camera start failed:', error);
            this.isTracking = false;
            return false;
        }
    }

    stop() {
        if (this.camera) {
            this.camera.stop();
        }
        this.isTracking = false;
    }

    toggleHandVisualization() {
        this.showHand = !this.showHand;
        return this.showHand;
    }

    _onResults(results) {
        const canvas = this.canvasElement;
        const ctx = this.canvasCtx;

        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            this.gesture.handDetected = false;
            return;
        }

        this.gesture.handDetected = true;
        const landmarks = results.multiHandLandmarks[0];

        // Draw hand landmarks
        if (this.showHand) {
            this._drawHand(ctx, landmarks, canvas.width, canvas.height);
        }

        // Calculate gesture
        this._detectGesture(landmarks);
    }

    _drawHand(ctx, landmarks, w, h) {
        const connections = [
            [0,1],[1,2],[2,3],[3,4],
            [0,5],[5,6],[6,7],[7,8],
            [5,9],[9,10],[10,11],[11,12],
            [9,13],[13,14],[14,15],[15,16],
            [13,17],[17,18],[18,19],[19,20],
            [0,17]
        ];

        // Draw connections
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        connections.forEach(([a, b]) => {
            ctx.beginPath();
            ctx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
            ctx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
            ctx.stroke();
        });

        // Draw landmarks
        landmarks.forEach((lm, i) => {
            const x = lm.x * w;
            const y = lm.y * h;
            const isFingerTip = [4, 8, 12, 16, 20].includes(i);

            ctx.beginPath();
            ctx.arc(x, y, isFingerTip ? 6 : 3, 0, Math.PI * 2);
            ctx.fillStyle = isFingerTip ? 'rgba(100, 200, 255, 0.9)' : 'rgba(255, 255, 255, 0.7)';
            ctx.fill();
        });

        // Draw pinch indicator
        if (this.gesture.isPinching) {
            const thumb = landmarks[4];
            const index = landmarks[8];
            const mx = ((thumb.x + index.x) / 2) * w;
            const my = ((thumb.y + index.y) / 2) * h;

            ctx.beginPath();
            ctx.arc(mx, my, 15, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(100, 255, 200, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    _detectGesture(landmarks) {
        // Thumb tip (4) and index tip (8)
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];
        const wrist = landmarks[0];

        // Pinch distance (thumb to index)
        const pinchDist = this._distance(thumbTip, indexTip);
        const normalizedPinch = Math.min(1, pinchDist / 0.15);

        // Hand openness (average finger extension)
        const fingerDists = [
            this._distance(landmarks[5], middleTip),
            this._distance(landmarks[9], ringTip),
            this._distance(landmarks[13], pinkyTip)
        ];
        const avgFingerDist = fingerDists.reduce((a, b) => a + b, 0) / fingerDists.length;
        const openness = Math.min(1, avgFingerDist / 0.2);

        // Smooth values
        this.gesture.smoothedPinch += (normalizedPinch - this.gesture.smoothedPinch) * this.smoothingFactor;
        this.gesture.smoothedOpen += (openness - this.gesture.smoothedOpen) * this.smoothingFactor;

        // Detect gestures
        this.gesture.isPinching = pinchDist < 0.06;
        this.gesture.isOpen = openness > 0.6;

        // Map to particle controls
        const open = this.gesture.smoothedOpen;
        const newSpread = open * open * open * 1.5;
        const newScale = 0.3 + this.gesture.smoothedPinch * 1.4;

        // Store double-buffered values for frame interpolation
        const now = performance.now();
        if (this._lastUpdateTime > 0) {
            this._updateInterval = now - this._lastUpdateTime;
        }
        this._prevSpread = this._currSpread;
        this._prevScale = this._currScale;
        this._currSpread = newSpread;
        this._currScale = newScale;
        this._lastUpdateTime = now;

        this.gesture.spreadFactor = newSpread;
        this.gesture.scale = newScale;

        // Track hand opening velocity
        const rawVelocity = open - this._prevOpen;
        this._prevOpen = open;
        this._smoothedVelocity += (rawVelocity - this._smoothedVelocity) * 0.3;
        this.gesture.spreadVelocity = Math.abs(this._smoothedVelocity);
    }

    // Interpolated values for smooth 60fps rendering
    getInterpolated() {
        const now = performance.now();
        const elapsed = now - this._lastUpdateTime;
        const t = Math.min(1, elapsed / this._updateInterval);
        return {
            spreadFactor: this._prevSpread + (this._currSpread - this._prevSpread) * t,
            scale: this._prevScale + (this._currScale - this._prevScale) * t,
            spreadVelocity: this.gesture.spreadVelocity,
            handDetected: this.gesture.handDetected,
            isPinching: this.gesture.isPinching,
            isOpen: this.gesture.isOpen
        };
    }

    _distance(a, b) {
        return Math.sqrt(
            Math.pow(a.x - b.x, 2) +
            Math.pow(a.y - b.y, 2) +
            Math.pow((a.z || 0) - (b.z || 0), 2)
        );
    }

    getStatus() {
        return {
            tracking: this.isTracking,
            handDetected: this.gesture.handDetected,
            isPinching: this.gesture.isPinching,
            isOpen: this.gesture.isOpen,
            spreadFactor: this.gesture.spreadFactor,
            scale: this.gesture.scale
        };
    }
}

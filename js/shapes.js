/**
 * Shape definitions for particle system
 * Each shape returns { positions: Float32Array, colors: Float32Array, count: number }
 */

// ─── Heart ─────────────────────────────────────────────────────────────────────
function _heartF(x, y) {
    const x2 = x * x, y2 = y * y;
    return Math.pow(x2 + y2 - 1, 3) - x2 * y2 * y;
}

function generateHeart(count) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const tempColor = new THREE.Color();
    let placed = 0;

    while (placed < count) {
        const x = (Math.random() - 0.5) * 3;
        const y = (Math.random() - 0.33) * 3;
        const f = _heartF(x, y);

        if (f < 0) {
            const i3 = placed * 3;
            // Z depth: thick in center, thin at edges (follows heart outline)
            const depth = Math.sqrt(-f) * 0.25;
            const z = (Math.random() - 0.5) * 2 * depth;

            positions[i3] = x;
            positions[i3 + 1] = y;
            positions[i3 + 2] = z;

            const hue = 0.96 + Math.random() * 0.04;
            const sat = 0.85 + Math.random() * 0.1;
            const light = 0.6 + Math.random() * 0.05;
            tempColor.setHSL(hue % 1, sat, light);
            colors[i3] = tempColor.r;
            colors[i3 + 1] = tempColor.g;
            colors[i3 + 2] = tempColor.b;

            placed++;
        }
    }
    return { positions, colors, count };
}

// ─── Flower ────────────────────────────────────────────────────────────────────
function generateFlower(count) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const tempColor = new THREE.Color();
    const petalCount = 7;

    for (let i = 0; i < count; i++) {
        const part = Math.random();
        let x, y, z;

        if (part < 0.8) {
            // 3D petals - flipped 180° so concave side faces camera
            const petal = Math.floor(Math.random() * petalCount);
            const baseAngle = (petal / petalCount) * Math.PI * 2;
            const t = Math.random();
            const w = (Math.random() - 0.5) * 2;

            const petalLen = 1.3;
            const widthAtT = Math.sqrt(Math.max(0, 1 - t * t)) * 0.45;

            // Elevation: base away from camera, tips curve toward camera
            const elevation = (1 - t) * (-0.7) + t * 0.5;
            const lateralAngle = w * widthAtT * 0.8;

            const phi = Math.PI / 2 - elevation;
            const theta = baseAngle + lateralAngle;
            const r = t * petalLen + 0.2;

            x = r * Math.sin(phi) * Math.cos(theta);
            y = r * Math.sin(phi) * Math.sin(theta);
            z = r * Math.cos(phi);

            x += (Math.random() - 0.5) * 0.06;
            y += (Math.random() - 0.5) * 0.06;
            z += (Math.random() - 0.5) * 0.06;

            const hue = 0.94 + t * 0.06;
            tempColor.setHSL(hue % 1, 0.8, 0.6 + t * 0.25);
        } else {
            // Pistil - inside the concave petals (negative Z)
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * 0.25;
            x = Math.cos(a) * r;
            y = Math.sin(a) * r;
            z = -0.2 - Math.random() * 0.15;
            tempColor.setHSL(0.12, 0.95, 0.5 + Math.random() * 0.3);
        }

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        colors[i * 3] = tempColor.r;
        colors[i * 3 + 1] = tempColor.g;
        colors[i * 3 + 2] = tempColor.b;
    }

    return { positions, colors, count };
}

// ─── Saturn ────────────────────────────────────────────────────────────────────
function generateSaturn(count) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
        let x, y, z;
        const part = Math.random();

        if (part < 0.5) {
            // Planet body
            const phi = Math.acos(2 * Math.random() - 1);
            const theta = Math.random() * Math.PI * 2;
            const r = 0.8 + (Math.random() - 0.5) * 0.1;

            x = r * Math.sin(phi) * Math.cos(theta);
            y = r * Math.cos(phi) * 0.7;
            z = r * Math.sin(phi) * Math.sin(theta);

            const hue = 0.08 + Math.random() * 0.06;
            tempColor.setHSL(hue, 0.6, 0.55 + Math.random() * 0.3);
        } else if (part < 0.9) {
            // Ring
            const angle = Math.random() * Math.PI * 2;
            const ringR = 1.3 + Math.random() * 0.8;
            const ringWidth = (Math.random() - 0.5) * 0.15;

            x = Math.cos(angle) * ringR;
            y = ringWidth * 0.3;
            z = Math.sin(angle) * ringR;

            const hue = 0.06 + Math.random() * 0.08;
            tempColor.setHSL(hue, 0.5, 0.6 + Math.random() * 0.25);
        } else {
            // Ring particles
            const angle = Math.random() * Math.PI * 2;
            const ringR = 2.2 + Math.random() * 0.3;

            x = Math.cos(angle) * ringR;
            y = (Math.random() - 0.5) * 0.05;
            z = Math.sin(angle) * ringR;

            tempColor.setHSL(0.08, 0.4, 0.7 + Math.random() * 0.2);
        }

        // Tilt 15° around X axis
        const tilt = 0.26;
        const tiltedY = y * Math.cos(tilt) - z * Math.sin(tilt);
        const tiltedZ = y * Math.sin(tilt) + z * Math.cos(tilt);

        positions[i * 3] = x;
        positions[i * 3 + 1] = tiltedY;
        positions[i * 3 + 2] = tiltedZ;
        colors[i * 3] = tempColor.r;
        colors[i * 3 + 1] = tempColor.g;
        colors[i * 3 + 2] = tempColor.b;
    }
    return { positions, colors, count };
}

// ─── Ice Cream ────────────────────────────────────────────────────────────────
function generateIceCream(count) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
        let x, y, z;
        const part = Math.random();

        if (part < 0.45) {
            // Waffle cone: inverted taper
            const h = Math.random();
            const t = 1 - h;  // 1 at tip, 0 at top
            const radius = 0.15 + (1 - t) * 0.7;
            const angle = Math.random() * Math.PI * 2;
            // Waffle texture
            const waffleX = Math.sin(angle * 12 + h * 8) * 0.03;
            const waffleZ = Math.cos(angle * 12 + h * 8) * 0.03;

            x = Math.cos(angle) * radius + waffleX;
            y = -1.5 + h * 1.5;
            z = Math.sin(angle) * radius + waffleZ;

            // Waffle color: golden brown gradient
            tempColor.setHSL(0.08, 0.6, 0.55 + h * 0.15);
        } else if (part < 0.7) {
            // Bottom scoop: strawberry
            const phi = Math.acos(2 * Math.random() - 1);
            const theta = Math.random() * Math.PI * 2;
            const r = 0.55 + Math.random() * 0.05;
            x = r * Math.sin(phi) * Math.cos(theta);
            y = 0.3 + r * Math.cos(phi);
            z = r * Math.sin(phi) * Math.sin(theta);

            // Strawberry pink with specks
            tempColor.setHSL(0.95, 0.7, 0.65 + Math.random() * 0.2);
        } else if (part < 0.92) {
            // Top scoop: vanilla
            const phi = Math.acos(2 * Math.random() - 1);
            const theta = Math.random() * Math.PI * 2;
            const r = 0.5 + Math.random() * 0.05;
            x = r * Math.sin(phi) * Math.cos(theta) * 0.9;
            y = 1.2 + r * Math.cos(phi);
            z = r * Math.sin(phi) * Math.sin(theta) * 0.9;

            // Vanilla cream with slight yellow tint
            tempColor.setHSL(0.12, 0.3, 0.85 + Math.random() * 0.1);
        } else {
            // Cherry on top
            const phi = Math.acos(2 * Math.random() - 1);
            const theta = Math.random() * Math.PI * 2;
            const r = 0.12 + Math.random() * 0.03;
            x = r * Math.sin(phi) * Math.cos(theta);
            y = 1.8 + r * Math.cos(phi);
            z = r * Math.sin(phi) * Math.sin(theta);

            // Cherry red
            tempColor.setHSL(0.0, 0.85, 0.4 + Math.random() * 0.15);
        }

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        colors[i * 3] = tempColor.r;
        colors[i * 3 + 1] = tempColor.g;
        colors[i * 3 + 2] = tempColor.b;
    }

    // Center vertically (y range: -1.5 ~ 1.95, midpoint ~0.22)
    const centerY = 0.22;
    for (let i = 0; i < count; i++) {
        positions[i * 3 + 1] -= centerY;
    }

    return { positions, colors, count };
}

// ─── Fireworks ─────────────────────────────────────────────────────────────────
function generateFireworks(count) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const tempColor = new THREE.Color();

    const bursts = 4;
    const particlesPerBurst = Math.floor(count / bursts);

    for (let b = 0; b < bursts; b++) {
        const cx = (Math.random() - 0.5) * 5;
        const cy = -1 + Math.random() * 3;
        const cz = (Math.random() - 0.5) * 5;
        const burstHue = Math.random();
        const burstRadius = 2 + Math.random() * 2;

        const start = b * particlesPerBurst;
        const end = b === bursts - 1 ? count : start + particlesPerBurst;
        const burstCount = end - start;

        // Number of distinct spark rays
        const rays = 30 + Math.floor(Math.random() * 20);
        const sparksPerRay = Math.floor(burstCount * 0.6 / rays);
        const trailingCount = Math.floor(burstCount * 0.25);
        const centerCount = burstCount - rays * sparksPerRay - trailingCount;

        let idx = 0;

        // Spark rays: distinct lines radiating from center
        for (let ray = 0; ray < rays; ray++) {
            const phi = Math.acos(2 * Math.random() - 1);
            const theta = Math.random() * Math.PI * 2;
            const rayLen = burstRadius * (0.6 + Math.random() * 0.4);

            for (let s = 0; s < sparksPerRay && start + idx < end; s++, idx++) {
                const i = start + idx;
                const t = s / sparksPerRay; // 0=center, 1=tip
                const r = t * rayLen;

                positions[i * 3] = cx + r * Math.sin(phi) * Math.cos(theta);
                positions[i * 3 + 1] = cy + r * Math.cos(phi);
                positions[i * 3 + 2] = cz + r * Math.sin(phi) * Math.sin(theta);

                // Bright at tip, dim at center
                const tipBright = 0.5 + t * 0.5;
                const hueShift = (Math.random() - 0.5) * 0.06;
                tempColor.setHSL((burstHue + hueShift) % 1, 0.9, tipBright);
                colors[i * 3] = tempColor.r;
                colors[i * 3 + 1] = tempColor.g;
                colors[i * 3 + 2] = tempColor.b;
            }
        }

        // Trailing sparks falling down
        for (let t = 0; t < trailingCount && start + idx < end; t++, idx++) {
            const i = start + idx;
            const dropAngle = Math.random() * Math.PI * 2;
            const dropDist = Math.random() * 0.2;
            const dropLen = Math.random() * 3.5;

            positions[i * 3] = cx + Math.cos(dropAngle) * dropDist;
            positions[i * 3 + 1] = cy - dropLen;
            positions[i * 3 + 2] = cz + Math.sin(dropAngle) * dropDist;

            const fade = 1 - dropLen / 2;
            tempColor.setHSL(0.1, 0.9, 0.5 + fade * 0.4);
            colors[i * 3] = tempColor.r;
            colors[i * 3 + 1] = tempColor.g;
            colors[i * 3 + 2] = tempColor.b;
        }

        // Bright center
        for (let c = 0; c < centerCount && start + idx < end; c++, idx++) {
            const i = start + idx;
            const gr = Math.random() * 0.15;
            const ga = Math.random() * Math.PI * 2;
            positions[i * 3] = cx + Math.cos(ga) * gr;
            positions[i * 3 + 1] = cy + (Math.random() - 0.5) * 0.15;
            positions[i * 3 + 2] = cz + Math.sin(ga) * gr;

            tempColor.setHSL(burstHue, 0.3, 0.95);
            colors[i * 3] = tempColor.r;
            colors[i * 3 + 1] = tempColor.g;
            colors[i * 3 + 2] = tempColor.b;
        }
    }
    return { positions, colors, count };
}

// ─── Custom Image ──────────────────────────────────────────────────────────────
function generateFromImage(imageData, width, height, maxParticles) {
    // Collect all visible pixels
    const allPx = []; // each entry: [px, py, pz, r, g, b]

    // Maintain aspect ratio: scale longest side to ±2
    const maxDim = Math.max(width, height);
    const scaleX = 4.0 * (width / maxDim);
    const scaleY = 4.0 * (height / maxDim);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = imageData[idx] / 255;
            const g = imageData[idx + 1] / 255;
            const b = imageData[idx + 2] / 255;
            const a = imageData[idx + 3] / 255;

            if (a > 0.05 && (r + g + b) > 0.02) {
                allPx.push([
                    ((x / width) - 0.5) * scaleX,
                    (0.5 - (y / height)) * scaleY,
                    (Math.random() - 0.5) * 0.3,
                    r, g, b
                ]);
            }
        }
    }

    let selected;
    if (allPx.length === 0) {
        return {
            positions: new Float32Array(maxParticles * 3),
            colors: new Float32Array(maxParticles * 3),
            count: 0
        };
    } else if (allPx.length <= maxParticles) {
        // Fewer valid pixels than needed: use all + resample to fill
        selected = allPx.slice();
        while (selected.length < maxParticles) {
            const src = allPx[Math.floor(Math.random() * allPx.length)];
            selected.push([
                src[0] + (Math.random() - 0.5) * 0.02,
                src[1] + (Math.random() - 0.5) * 0.02,
                src[2] + (Math.random() - 0.5) * 0.02,
                src[3], src[4], src[5]
            ]);
        }
    } else {
        // More valid pixels than needed: Fisher-Yates partial shuffle
        selected = allPx;
        for (let i = 0; i < maxParticles; i++) {
            const j = i + Math.floor(Math.random() * (selected.length - i));
            const tmp = selected[i];
            selected[i] = selected[j];
            selected[j] = tmp;
        }
        selected.length = maxParticles;
    }

    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    for (let i = 0; i < maxParticles; i++) {
        const p = selected[i];
        positions[i * 3]     = p[0];
        positions[i * 3 + 1] = p[1];
        positions[i * 3 + 2] = p[2];
        colors[i * 3]     = p[3];
        colors[i * 3 + 1] = p[4];
        colors[i * 3 + 2] = p[5];
    }

    return { positions, colors, count: maxParticles };
}

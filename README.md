# 🎆 3D Particle System - Hand Gesture Control

A real-time 3D particle system powered by Three.js, with MediaPipe hand gesture control for interactive particle manipulation.

![Three.js](https://img.shields.io/badge/Three.js-r128-black?logo=three.js)
![MediaPipe](https://img.shields.io/badge/MediaPipe-Hands-blue)
![License](https://img.shields.io/badge/License-MIT-green)

**🌐 English | [中文](README_zh-CN.md)**

## ✨ Features

- **6 Particle Shapes** — Heart ❤️, Flower 🌸, Saturn 🪐, Ice Cream 🍦, Fireworks 🎇, Custom Image 🖼️
- **Hand Gesture Control** — Open hand to spread particles, pinch to scale
- **Spring-Damper Physics** — Smooth, elastic particle animation with tunable parameters
- **Custom Shaders** — Density-adaptive alpha, mouse glow, additive blending
- **Image to Particles** — Upload any image and convert it to a 3D particle cloud
- **Responsive UI** — Dark glassmorphism design, works on desktop and mobile

## 🚀 Quick Start

Simply open `index.html` in a modern browser:

```bash
# Or use any local server
npx serve .
python -m http.server 8000
```

> **Note:** Hand tracking requires camera access and an HTTPS connection (or localhost).

## 🎮 Controls

| Input | Action |
|-------|--------|
| **Mouse Drag** | Orbit rotate |
| **Ctrl + Drag** | Pan position |
| **Scroll** | Zoom in/out |
| **Double Click** | Reset camera |
| **F** | Toggle fullscreen |
| **H** | Toggle hand tracking |

### Hand Gestures

| Gesture | Effect |
|---------|--------|
| ✋ Open Hand | Spread particles outward |
| 🤏 Pinch | Scale particles |

## 📂 Project Structure

```
particle-system/
├── index.html              # Main page
├── css/
│   └── style.css           # Styles & responsive layout
└── js/
    ├── shapes.js           # Particle shape generators
    ├── particle-system.js  # Three.js rendering & physics engine
    ├── hand-tracker.js     # MediaPipe hand gesture detection
    └── app.js              # Application orchestrator & UI bindings
```

## ⚙️ Tunable Parameters

The control panel provides real-time adjustment of:

| Parameter | Description | Default |
|-----------|-------------|---------|
| **Particles** | Number of particles (10k - 100k) | 50,000 |
| **Brightness** | Overall particle brightness | 0.80 |
| **Spread** | Particle expansion factor | 50% |
| **Expand Speed** | Spring speed when expanding | 5 |
| **Contract Speed** | Spring speed when contracting | 12 |
| **Jelly Bounce** | Damping ratio (lower = more bounce) | 0.60 |
| **Response Speed** | Target position interpolation rate | 0.35 |

## 🛠️ Tech Stack

- **Three.js** — WebGL 3D rendering with custom vertex/fragment shaders
- **MediaPipe Hands** — Real-time 21-point hand landmark detection
- **Vanilla JS** — No build tools, no framework dependencies

## 📄 License

MIT

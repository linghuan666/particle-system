# 🎆 3D 粒子系统 - 手势控制

基于 Three.js 的实时 3D 粒子系统，支持 MediaPipe 手势识别进行交互式粒子操控。

![Three.js](https://img.shields.io/badge/Three.js-r128-black?logo=three.js)
![MediaPipe](https://img.shields.io/badge/MediaPipe-Hands-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Visitors](https://komarev.com/ghpvc/?username=linghuan666&repo=particle-system&label=Visitors&color=79C83D&style=flat)

**🌐 [English](README.md) | 中文**

## ✨ 功能特性

- **6 种粒子形状** — 心形 ❤️、花朵 🌸、土星 🪐、冰淇淋 🍦、烟花 🎇、自定义图片 🖼️
- **手势控制** — 张开手掌展开粒子，捏合手势缩放粒子
- **弹簧阻尼物理引擎** — 流畅的弹性粒子动画，支持参数微调
- **自定义着色器** — 密度自适应透明度、鼠标光晕、叠加混合
- **图片转粒子** — 上传任意图片，转换为 3D 粒子云
- **响应式 UI** — 暗色毛玻璃设计，支持桌面和移动端

## 🚀 快速开始

用现代浏览器直接打开 `index.html`：

```bash
# 或使用任意本地服务器
npx serve .
python -m http.server 8000
```

> **注意：** 手势追踪需要摄像头权限，且需要 HTTPS 连接（或 localhost）。

## 🎮 操作说明

| 操作 | 功能 |
|------|------|
| **鼠标拖拽** | 轨道旋转 |
| **Ctrl + 拖拽** | 平移位置 |
| **滚轮** | 缩放 |
| **双击** | 重置相机 |
| **F 键** | 切换全屏 |
| **H 键** | 切换手势追踪 |

### 手势操作

| 手势 | 效果 |
|------|------|
| ✋ 张开手掌 | 粒子向外扩散 |
| 🤏 捏合手势 | 缩放粒子 |

## 📂 项目结构

```
particle-system/
├── index.html              # 主页面
├── css/
│   └── style.css           # 样式与响应式布局
└── js/
    ├── shapes.js           # 粒子形状生成器
    ├── particle-system.js  # Three.js 渲染与物理引擎
    ├── hand-tracker.js     # MediaPipe 手势检测
    └── app.js              # 应用主逻辑与 UI 绑定
```

## ⚙️ 可调参数

控制面板支持实时调整以下参数：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| **粒子数量** | 粒子总数（1万 - 10万） | 50,000 |
| **亮度** | 粒子整体亮度 | 0.80 |
| **展开度** | 粒子扩散程度 | 50% |
| **展开速度** | 展开时的弹簧速度 | 5 |
| **收缩速度** | 收缩时的弹簧速度 | 12 |
| **果冻弹性** | 阻尼比（越低弹性越大） | 0.60 |
| **响应速度** | 目标位置插值速率 | 0.35 |

## 🛠️ 技术栈

- **Three.js** — WebGL 3D 渲染，自定义顶点/片段着色器
- **MediaPipe Hands** — 实时 21 点手部关键点检测
- **原生 JS** — 无构建工具，无框架依赖

## 📄 许可证

MIT

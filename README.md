<div align="center">

# 🖨️ PackSticker

**智能转印贴 / 贴纸排版工具**

一键上传图片，自动识别透明边缘，按纸张尺寸最优排列，导出即可送印。

[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)](https://vite.dev)
[![License](https://img.shields.io/badge/license-MIT-green)](#license)

[🚀 在线使用](#) · [功能介绍](#功能) · [本地运行](#本地开发) · [技术实现](#技术实现)

</div>

---

## 功能

### 🗂️ 图片管理
- 拖拽 / 点击上传，支持**批量上传整个文件夹**
- 支持 PNG、JPG、WebP 格式
- 自动检测透明通道，对透明 PNG **自动裁切四周空白边**

### 🧹 智能去背
| 模式 | 说明 | 适合场景 |
|------|------|---------|
| **AI 去背（高精）** | ISNet 完整模型，~80MB | 照片、复杂背景、人物 |
| **AI 去背（快速）** | ISNet 量化模型，~40MB | 普通照片 |
| **去白底** | 颜色洪水填充，零延迟 | 线稿、Logo、插画、**内部含白色的图案** |

> AI 去背内置**内部镂空修复**：去背后自动用 BFS 填充被不透明区域包围的透明孔洞（如额头、眼白），避免卡通图案出现空洞。

### 📐 排版模式
| 模式 | 逻辑 |
|------|------|
| **均衡排版** | 按图片面积均分纸张——小贴纸多印、大贴纸少印，每种图片占据大致相等的版面 |
| **塞满纸张** | 最大化总贴纸数量 |
| **手动设置** | 自行指定每张图的印刷数量 |

均衡模式支持**每张图单独微调数量**，旁边显示推荐值，可一键恢复自动。

### 🔲 纸张设置
- 内置 A4 / A5 / A6，支持自定义尺寸（mm）
- 分辨率可选 72 / 150 / **300（印刷标准）** / 600 DPI
- 间距、页边距独立调节
- 可开启**允许旋转**以提升排版密度

### 👁️ 实时预览
- 基于 Canvas 的实时排版预览，支持 HiDPI / Retina 屏锐利渲染
- 显示**纸张利用率**百分比（绿 ≥80% / 橙 ≥50% / 红 <50%）
- **白底 / 透明**预览切换，导出前直观确认透明区域

### 📤 导出
- **导出 PNG** — 透明背景，适合转印纸、贴纸膜
- **导出 PDF** — 白色背景，直接发给打印店

---

## 截图

> *(上传图片后自动排版，实时显示利用率)*

---

## 本地开发

**环境要求：** Node.js 18+

```bash
# 克隆仓库
git clone https://github.com/iriskumi/pack-sticker.git
cd pack-sticker

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开 http://localhost:5173 即可使用。

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

---

## 部署

### Cloudflare Pages / Vercel / Netlify

| 设置项 | 值 |
|--------|-----|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

推送到 GitHub 后自动触发重新部署。

> **注意：** AI 去背功能需要从 `staticimgly.com` 下载约 40–80MB 的 ONNX 模型文件，国内网络可能较慢。「去白底」功能完全本地运行，无需任何外部请求。

---

## 技术实现

### 排版算法 — MaxRects

自行实现 **MaxRects Best-Short-Side-Fit** 矩形装箱算法：

- 维护可用矩形列表，每次放置后切割剩余空间
- 剪枝删除被包含的冗余矩形
- 支持 `preserveOrder` 模式：均衡排版时按轮询顺序放置，避免大图垄断纸张

### 去背后处理 — BFS 内部镂空修复

```
1. 从图片四条边出发，BFS 扩散仅遍历 alpha < 15 的像素（真实背景）
2. 半透明抗锯齿像素（alpha 15–200）不参与扩散，不形成通往内部的"桥"
3. 未被标记的透明 / 半透明像素 = 内部孔洞 → 恢复为不透明
```

### 去白底 — 颜色洪水填充

```
1. 采样四个角落像素，确定背景颜色
2. BFS 从四条边扩散，仅删除与背景颜色距离 ≤ tolerance 的连通像素
3. 图案内部同色区域无法被扩散到，自然保留
```

### 依赖

| 库 | 用途 |
|----|------|
| [@imgly/background-removal](https://github.com/imgly/background-removal-js) | 浏览器端 AI 背景去除（ISNet / WebAssembly） |
| [jsPDF](https://github.com/parallax/jsPDF) | PDF 导出 |
| [React 18](https://react.dev) + [TypeScript](https://www.typescriptlang.org) | UI 框架 |
| [Vite 8](https://vite.dev) | 构建工具 |

---

## 项目结构

```
src/
├── types.ts                    # 类型定义
├── App.tsx                     # 主组件 & 状态管理
├── components/
│   ├── ImageUploader.tsx       # 拖拽上传 + 文件夹选择
│   ├── ImageCard.tsx           # 单张图片设置卡片
│   ├── CanvasSettings.tsx      # 排版模式 & 纸张设置
│   ├── CanvasPreview.tsx       # 实时 Canvas 预览
│   └── ExportPanel.tsx         # PNG / PDF 导出
└── utils/
    ├── maxrects.ts             # MaxRects 装箱算法
    ├── trimTransparency.ts     # 透明边裁切 & 内部孔洞修复 & 颜色去背
    ├── backgroundRemoval.ts    # AI 去背 + 孔洞修复封装
    └── canvasExport.ts         # 全分辨率渲染 & 文件导出
```

---

## License

MIT © [iriskumi](https://github.com/iriskumi)

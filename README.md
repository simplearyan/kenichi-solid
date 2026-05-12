# Kenichi Studio

A high-performance, professional web-based video editor prototype inspired by macOS aesthetics. Built with **SolidJS**, **TypeScript**, and **Tailwind CSS**.

## ✨ Features

-   **Modular UI Architecture**: A responsive three-panel workspace with toggleable sidebars and a bottom-docked timeline.
-   **High-Performance Rendering**: Decoupled Canvas engine with a dedicated requestAnimationFrame loop for smooth 60fps previews.
-   **Advanced Export Engine**: Background video rendering (HD, 2K, 4K) using Web Workers and WebCodecs via `mediabunny`.
-   **Export Control Center**: Full control over the rendering process with **Stop, Pause, and Resume** capabilities.
-   **Professional Toolset**: 
    -   **Source Modal**: Interactive media trimming with touch-friendly scrubbers.
    -   **Hierarchical Tracks**: Advanced track management with reordering, locking, and muting.
    -   **Ripple Editing**: Intelligent clip shifting and automatic splitting for seamless edits.
-   **Mobile-First Workspace**: Adaptive layout with a scrollable navigation bar for editing on any device.
-   **Multi-Track Audio Mixdown**: Offline audio rendering using `OfflineAudioContext` for perfectly synced multi-track exports.
-   **Media Ingestion**: Support for importing Video, Audio, and Images with automatic metadata extraction.
-   **Chroma Key & Pixel FX**: Real-time green screen removal and color correction filters (brightness, contrast).
-   **Motion Graphics**: Keyframeless animation system with `In`, `Out`, and `Loop` states (Fade, Slide, Zoom, Rotate, etc.).

## 🚀 Tech Stack

-   **Frontend**: [SolidJS](https://solidjs.com/) (Reactive UI)
*   **Language**: [TypeScript](https://www.typescriptlang.org/) (Type Safety)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Modern Aesthetics)
-   **Encoding**: [mediabunny](https://github.com/v8paddy/mediabunny) (WebCodecs/WASM Video Muxing)
-   **Archiving**: [JSZip](https://stuk.github.io/jszip/) (PNG Sequence Generation)
-   **Icons**: [Lucide Solid](https://lucide.dev/guide/packages/lucide-solid)
-   **Build Tool**: [Vite](https://vitejs.dev/)

## 🏗️ Project Structure

```text
kenichi-studio/
├── src/
│   ├── components/
│   │   ├── layout/       # Main workspace panels (Header, Panels, Grid)
│   │   └── modals/       # UI modals (Export, Source Ingestion)
│   ├── engine/
│   │   ├── Renderer.ts       # Core rendering loop (Main & Offscreen)
│   │   ├── ExportEngine.ts   # Background export orchestration
│   │   ├── AudioEngine.ts    # WebAudio context management
│   │   ├── LayerManager.ts   # Layer manipulation logic
│   │   └── LayerRegistry.ts  # DOM-to-Canvas node mapping
│   ├── store/                # Global SolidJS stores (projectStore)
│   ├── workers/              # Background Web Workers
│   │   ├── mediabunny.worker.ts # Video encoding (MP4/WebM/MOV)
│   │   └── zip.worker.ts        # PNG sequence archiving
│   ├── utils/                # Resizer, Math, and UI helpers
│   ├── assets/               # Static assets and fonts
│   └── index.tsx             # App entry point
├── public/                   # Public static files (Favicon, etc.)
└── index.html                # HTML template with SEO optimizations
```

## 🎞️ Export Capabilities

The **Kenichi Export Engine** is designed for pro-grade background rendering:
- **Headless Pipeline**: Renders to `OffscreenCanvas` without blocking the main UI thread.
- **Live Controls**: Interactive Stop/Pause/Resume during the rendering loop.
- **Formats**: Supports `MP4` (H.264), `WebM` (VP9), `MOV`, and lossless `PNG Sequences` (ZIP).
- **Resolutions**: Preset support for `720p`, `1080p`, `1440p (2K)`, and `2160p (4K)`.

## 📦 Version History

### **v1.4 - Mobile Studio & Export Control** (Current)
-   **Interactive Export**: Added Stop, Pause, and Resume buttons to the Export Modal.
-   **Mobile Workspace**: Scrollable navigation bar for small screens (Timeline, Media, Clips, Props, Text, Shapes).
-   **Unified Support**: Integrated Ko-fi support for project sustainability.
-   **Toolbar Optimization**: Context-aware timeline tools that adapt to screen size.

### **v1.3 - Professional Toolset**
-   **Source Modal**: Interactive media trimming with zoom-aware scrubbers.
-   **Track Hierarchy**: Drag-and-drop track reordering and track-level controls.
-   **Ripple Mode**: Intelligent clip shifting and professional splitting logic.
-   **Audio Mastery**: Advanced trim views and volume normalization.

### **v1.2 - Aesthetic Overhaul**
-   Professional macOS-inspired dark mode design.
-   Responsive three-panel architecture with resizable dividers.
-   Animated sidebar transitions and dock-style timeline.

### **v1.1 - Stability & Resilience**
-   Self-healing media registry for reliable rendering.
-   Wait-for-ready pipeline to prevent "Black Frame" glitches.
-   Improved async media loading and progress tracking.

### **v1.0 - Initial Foundation**
-   Multi-track timeline supporting Video, Audio, Image, and Text.
-   Media Pool for asset management and ingestion.
-   Basic clip properties (Scale, Position, Rotation).
-   Core Browser-based rendering engine.

## 🛠️ Getting Started

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

## 📜 License
MIT

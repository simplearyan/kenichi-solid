# Kenichi Studio

A high-performance, professional web-based video editor prototype inspired by macOS aesthetics. Built with **SolidJS**, **TypeScript**, and **Tailwind CSS**.

## ✨ Features

-   **Modular UI Architecture**: A responsive three-panel workspace with toggleable sidebars and a bottom-docked timeline.
-   **High-Performance Rendering**: Decoupled Canvas engine with a dedicated requestAnimationFrame loop for smooth 60fps previews.
-   **Advanced Export Engine**: Background video rendering (HD, 2K, 4K) using Web Workers and WebCodecs via `mediabunny`.
-   **Frame-Perfect Precision**: Hardware-tick synchronization ensures every frame is captured flawlessly, even on lower-end hardware.
-   **Multi-Track Audio Mixdown**: Offline audio rendering using `OfflineAudioContext` for perfectly synced multi-track exports.
-   **Fine-Grained Reactivity**: Powered by SolidJS stores for efficient, targeted UI updates.
-   **Resizable Workspace**: Drag-to-resize panels (Left, Right, and Timeline) using performant direct DOM manipulation.
-   **Media Ingestion**: Support for importing Video, Audio, and Images with automatic metadata extraction.
-   **Chroma Key & Pixel FX**: Real-time green screen removal and color correction filters (brightness, contrast).
-   **Motion Graphics**: Keyframeless animation system with `In`, `Out`, and `Loop` states (Fade, Slide, Zoom, Rotate, etc.).

## 🚀 Tech Stack

-   **Frontend**: [SolidJS](https://solidjs.com/) (Reactive UI)
-   **Language**: [TypeScript](https://www.typescriptlang.org/) (Type Safety)
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
- **Formats**: Supports `MP4` (H.264), `WebM` (VP9), `MOV`, and lossless `PNG Sequences` (ZIP).
- **Resolutions**: Preset support for `720p`, `1080p`, `1440p (2K)`, and `2160p (4K)`.
- **Sync Logic**: Uses `requestAnimationFrame` hardware-tick locking to ensure GPU textures are fully flushed before frame capture.

## 📸 Screenshots

![Kenichi Studio UI](file:///C:/Users/aryan/.gemini/antigravity/brain/da1aecaa-2285-45b9-93b9-bd03cd51a5e2/media__1778471830828.png)
*Professional macOS-inspired dark mode interface.*

![Timeline Editing](file:///C:/Users/aryan/.gemini/antigravity/brain/da1aecaa-2285-45b9-93b9-bd03cd51a5e2/media__1778472070516.png)
*Multi-track timeline with Video, Audio, Image, and Text layers.*

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

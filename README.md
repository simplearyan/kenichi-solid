# Kenichi Studio

A high-performance, professional web-based video editor prototype inspired by macOS aesthetics. Built with **SolidJS**, **TypeScript**, and **Tailwind CSS**.

## ✨ Features

-   **Modular UI Architecture**: A responsive three-panel workspace with toggleable sidebars and a bottom-docked timeline.
-   **High-Performance Rendering**: Decoupled Canvas engine with a dedicated requestAnimationFrame loop for smooth 60fps previews.
-   **Fine-Grained Reactivity**: Powered by SolidJS stores for efficient, targeted UI updates.
-   **Resizable Workspace**: Drag-to-resize panels (Left, Right, and Timeline) using performant direct DOM manipulation.
-   **Media Ingestion**: Support for importing Video, Audio, and Images with automatic metadata extraction (duration, resolution).
-   **Mobile Responsive**: Optimized layout for smaller screens with a tab-based navigation for workspace panels.
-   **Premium Aesthetics**: Modern dark mode UI with glassmorphism, smooth transitions, and custom-styled scrollbars/inputs.

## 🚀 Tech Stack

-   **Framework**: [SolidJS](https://solidjs.com/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Icons**: [Lucide Solid](https://lucide.dev/guide/packages/lucide-solid)
-   **Build Tool**: [Vite](https://vitejs.dev/)

## 🏗️ Project Structure

-   `src/components/layout/`: Core UI components (Header, WorkspaceGrid, Panels).
-   `src/store/`: Global state management using SolidJS `createStore`.
-   `src/engine/`: Core logic for rendering (Canvas), audio handling, and layer management.
-   `src/utils/`: Shared utilities like the resizer logic and math helpers.

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

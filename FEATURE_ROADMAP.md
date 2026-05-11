# Kenichi Studio Feature Roadmap

Based on the analysis of the `v1.5.5-trim-different-track.html` prototype, here is a comprehensive breakdown of all the features and underlying logic that need to be ported to the new `kenichi-studio` architecture.

## 1. Source Preview & Trimming (Modal)
- **Source Modal UI**: An overlay modal to preview selected media before adding it to the timeline.
- **Media-Specific Players**: 
  - Video player for standard playback.
  - Image viewer with pan and zoom (crop) capabilities (`srcCropX`, `srcCropY`, `srcCropScale`).
  - Waveform canvas for audio-only media (`generatePeaks`, `drawSourceWaveform`).
- **In/Out Trimming**: Logic to set `srcIn` and `srcOut` points, complete with visual markers on the source scrubber track.
- **Add to Timeline**: Action to inject the media into the `projectStore.layers` list, applying the selected trim and crop properties, and instantiating offscreen buffer canvases.

## 2. Timeline & Track Management
- **Dynamic Ruler**: A timeline ruler that adjusts its time steps based on a zoom level (`PIXELS_PER_SECOND`).
- **Track Rendering**: Visual representation of clips on the timeline (`tlTracksEl`), calculating their physical width (`duration * PIXELS_PER_SECOND`) and offset.
- **Playhead & Scrubbing**: A draggable playhead (`main-scrubber`) and timeline scroll area that syncs the `projectStore.currentTime` and forces all videos to seek accordingly.
- **Clip Interactions (Drag/Trim)**:
  - **Move**: Dragging the body of a clip to change its `startTime`.
  - **Trim Left/Right**: Dragging the edges of a clip to modify its `inPoint`, `duration`, and `startTime`.
- **Track Ordering**: Drag-and-drop logic on the timeline headers to reorder layers (`splice` array operations).
- **Toolbar Actions**: Split clip at playhead, Duplicate (Copy) clip, and Delete clip.

## 3. Layer Properties Inspector (Right Panel)
- **Active Layer Context**: The properties panel should dynamically reveal sections (Transform, Audio, Pixel, Text, Shape) based on the `type` of the active layer.
- **Two-Way Data Binding**: Inputs (sliders, color pickers, text fields) that immediately update the `layer.state` and trigger a `drawFrame()`.
- **Core Transform**: Scale, Rotation, Position X/Y, Radius.
- **Pixel FX**: Brightness, Contrast, Chroma Key (Color, Tolerance), Color Replace.
- **Audio FX**: Volume, Fade In/Out durations, Echo (Delay, Feedback).
- **Animation FX**: In/Out/Loop animations (e.g., zoomIn, slideRight, wiggle) with easing functions.
- **Text/Shape Props**: Content, Font, Colors, Stroke, Shadows.

## 4. Multi-Track Canvas Engine (Renderer)
- **Global Settings**: Resolution presets, custom aspect ratios, zoom fitting, and background colors/transparency grids.
- **Offscreen Buffering**: Video and Image layers use an offscreen `bufferCanvas` to allow for pixel manipulation and pre-cropping.
- **Pixel Manipulation Loop**: Direct `getImageData` iteration to execute Chroma Key and Color Replacement in real-time.
- **Animation Evaluator**: Real-time calculation of Alpha, Scale, Rotation, and Position offsets based on the layer's easing properties and the current elapsed time (`layerTime`).
- **Canvas Context Drawing**: Using `ctx.save()`, `ctx.translate()`, `ctx.rotate()`, `ctx.filter` (brightness/contrast), `ctx.clip()` (for radius), and `ctx.drawImage()`.

## 5. Web Audio Graph & Synchronization
- **Audio Routing**: Constructing a Web Audio API graph (`track -> gain -> echoMix -> delay -> feedback -> destination`) for each media layer.
- **Playback Synchronization**: The `renderLoop` logic (`dt` frame delta calculation) to advance `currentTime`.
- **Seek Throttling & Drift Correction**: Logic (`vid.playbackRate` adjustment) to ensure HTML5 `<video>` elements stay perfectly synced with the master `project.currentTime` during playback, or forcing a `vid.currentTime` seek if drift exceeds a threshold.

## 6. Project Globals & Utilities
- **Refresh Engine**: A "Hot-Swap" feature that safely destroys and rebuilds all video/audio elements and Web Audio graphs if the browser stalls or bugs out.
- **Global Mute**: A master toggle that overrides all layer volumes.
- **Add Text / Add Shape**: Quick actions to inject procedural layers into the timeline.

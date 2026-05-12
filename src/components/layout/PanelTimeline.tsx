import { onMount, onCleanup, For, Show, createEffect, type Component } from 'solid-js';
import { Scissors, Copy, Trash2, RefreshCcw, ZoomOut, ZoomIn, X, Eye, EyeOff, Lock, Unlock, Plus, Volume2, VolumeX, PanelLeftOpen, PanelRightOpen, Maximize2, LayoutGrid, FoldVertical, UnfoldVertical, LocateFixed, ChevronUp, ChevronDown } from 'lucide-solid';
import { projectStore, setProjectStore, updateLayer, removeLayer, addTrack, deleteTrack, moveTrack } from '../../store/projectStore';
import { audioEngine } from '../../engine/AudioEngine';
import { layerRegistry } from '../../engine/LayerRegistry';
import { setupResizer } from '../../utils/resizer';

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  // Fallback to a neutral blue-gray if hex is invalid, preventing "white clip" bugs
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '59, 130, 246';
};

const TrackWaveform: Component<{ layer: any; pixelsPerSecond: number }> = (props) => {
  let canvasRef!: HTMLCanvasElement;

  createEffect(() => {
    const layer = props.layer;
    const { mediaId, duration, inPoint, waveformStyle: style, audioAppearance: appearance, clipColor } = layer;
    const pxPerSec = props.pixelsPerSecond;
    if (layer.type !== 'audio' && layer.type !== 'video') return;
    if (!mediaId || !canvasRef) return;

    const media = projectStore.mediaPool[mediaId];
    if (!media || !media.peaks) return;

    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    // Resize internal resolution to match DOM size
    canvasRef.width = duration * pxPerSec;
    const w = canvasRef.width;
    const h = canvasRef.height;
    ctx.clearRect(0, 0, w, h);

    const totalDuration = media.duration || 1;

    const startIdx = Math.floor((inPoint / totalDuration) * media.peaks.length);
    const endIdx = Math.floor(((inPoint + duration) / totalDuration) * media.peaks.length);

    const visiblePeaks = media.peaks.slice(startIdx, endIdx);
    if (visiblePeaks.length === 0) return;

    const baseColor = clipColor || (layer.type === 'audio' ? '#10b981' : '#3b82f6');
    const isWaveformMode = appearance === 'waveform';
    
    // Waveform translucency logic
    const rgb = hexToRgb(baseColor);
    const waveColor = isWaveformMode 
      ? (style === 'clean' ? `rgb(${rgb})` : `rgba(${rgb}, 0.85)`) 
      : 'rgba(0, 0, 0, 0.45)';
    
    ctx.fillStyle = waveColor;
    ctx.globalAlpha = 1.0;

    const sampleSize = visiblePeaks.length;
    if (sampleSize === 0) return;

    if (style === 'clean') {
      // Razor-Sharp Continuous Path (The "Clean" look)
      ctx.beginPath();
      // Draw top half
      for (let x = 0; x <= w; x++) {
        const floatIdx = (x / w) * (sampleSize - 1);
        const i = Math.floor(floatIdx);
        const f = floatIdx - i;
        const p1 = visiblePeaks[i] || 0;
        const p2 = visiblePeaks[i + 1] || p1;
        const peak = p1 * (1 - f) + p2 * f;
        const ph = peak * h * 0.95;
        if (x === 0) ctx.moveTo(x, h / 2 - ph / 2);
        else ctx.lineTo(x, h / 2 - ph / 2);
      }
      // Draw bottom half (backwards)
      for (let x = w; x >= 0; x--) {
        const floatIdx = (x / w) * (sampleSize - 1);
        const i = Math.floor(floatIdx);
        const f = floatIdx - i;
        const p1 = visiblePeaks[i] || 0;
        const p2 = visiblePeaks[i + 1] || p1;
        const peak = p1 * (1 - f) + p2 * f;
        const ph = peak * h * 0.95;
        ctx.lineTo(x, h / 2 + ph / 2);
      }
      ctx.closePath();
      ctx.fill();
    } else if (style === 'viz') {
      // Interpolated Sharp Bars
      for (let x = 0; x < w; x++) {
        const floatIdx = (x / w) * (sampleSize - 1);
        const i = Math.floor(floatIdx);
        const f = floatIdx - i;
        const p1 = visiblePeaks[i] || 0;
        const p2 = visiblePeaks[i + 1] || p1;
        const peak = p1 * (1 - f) + p2 * f;
        
        const ph = Math.round(peak * h * 0.85);
        if (ph > 0) {
          ctx.fillRect(x, Math.round(h / 2 - ph / 2), 1, ph);
        }
      }
    } else {
      // Standard Bars with spacing
      const barSpacing = 4;
      const bw = 2;
      for (let x = 0; x < w; x += (bw + barSpacing)) {
        const sampleIdx = Math.floor((x / w) * sampleSize);
        const peak = visiblePeaks[sampleIdx] || 0;
        const ph = Math.round(peak * h * 0.75);
        if (ph > 0) {
          ctx.fillRect(x, Math.round(h / 2 - ph / 2), bw, ph);
        }
      }
    }
  });

  return (
    <canvas
      ref={canvasRef}
      height={40}
      class="absolute inset-0 w-full h-full pointer-events-none"
    ></canvas>
  );
};

export const PanelTimeline: Component = () => {
  let resizerRef: HTMLDivElement | undefined;
  let timelineAreaRef: HTMLDivElement | undefined;
  let trackListRef: HTMLDivElement | undefined;

  createEffect(() => {
    // Only auto-scroll if toggle is on
    if (!projectStore.followPlayhead || !timelineAreaRef) return;

    // We only want to auto-scroll if playing or if specifically jumping
    // Access signals to track them
    const pxPerSec = projectStore.pixelsPerSecond;
    const playheadPx = projectStore.currentTime * pxPerSec;
    const isPlaying = projectStore.isPlaying;

    if (isPlaying) {
      const viewportWidth = timelineAreaRef.clientWidth;
      const stopThreshold = viewportWidth * 0.8;

      // Continuous smooth scroll: if playhead is past 80%, scroll clips to keep it there
      if (playheadPx > stopThreshold) {
        timelineAreaRef.scrollLeft = playheadPx - stopThreshold;
      } else if (playheadPx < timelineAreaRef.scrollLeft) {
        // If playhead was manually moved or restarted behind the current view
        timelineAreaRef.scrollLeft = 0;
      }
    }
  });

  const handleTimelineScroll = () => {
    if (trackListRef && timelineAreaRef) {
      trackListRef.scrollTop = timelineAreaRef.scrollTop;

      // CRITICAL: Only reset audio engine on manual scroll.
      // Resetting 60fps during auto-scroll causes massive flicker and audio stutters.
      if (projectStore.isPlaying && !projectStore.followPlayhead) {
        audioEngine.reset(projectStore.currentTime);
      }
    }
  };

  let isDragging = false;
  let dragType: 'scrub' | 'move' | 'trim-left' | 'trim-right' | null = null;
  let dragLayerId: string | null = null;
  let dragStartX = 0;
  let dragStartProp = 0;
  let dragStartDuration = 0;
  let dragStartInPoint = 0;

  const onWindowPointerMove = (e: PointerEvent) => {
    if (!isDragging) return;
    const pxPerSec = projectStore.pixelsPerSecond;
    const dx = e.clientX - dragStartX;
    const dt = dx / pxPerSec;

    if (dragType === 'scrub') {
      let t = dragStartProp + dt;
      if (t < 0) t = 0;
      if (t > projectStore.duration) t = projectStore.duration;
      setProjectStore('currentTime', t);
    } else if (dragLayerId) {
      const layer = projectStore.layers.find(l => l.id === dragLayerId);
      if (!layer) return;

      if (dragType === 'move') {
        let newStart = dragStartProp + dt;
        if (newStart < 0) newStart = 0;
        updateLayer(dragLayerId, { startTime: newStart });
      } else if (dragType === 'trim-left') {
        let newStart = dragStartProp + dt;
        let newIn = dragStartInPoint + dt;
        let newDur = dragStartDuration - dt;
        
        if (newIn < 0) {
          const over = -newIn;
          newIn = 0;
          newStart += over;
          newDur -= over;
        }
        
        if (newDur < 0.1) {
          const over = 0.1 - newDur;
          newDur = 0.1;
          newStart -= over;
          newIn -= over;
        }
        
        updateLayer(dragLayerId, { startTime: newStart, inPoint: newIn, duration: newDur });
      } else if (dragType === 'trim-right') {
        const media = layer.mediaId ? projectStore.mediaPool[layer.mediaId] : null;
        const maxMediaDuration = media ? media.duration : Infinity;
        
        let newDur = dragStartDuration + dt;
        
        if (layer.inPoint + newDur > maxMediaDuration) {
          newDur = maxMediaDuration - layer.inPoint;
        }
        
        if (newDur < 0.1) newDur = 0.1;
        updateLayer(dragLayerId, { duration: newDur });
      }
    }
  };

  const onWindowPointerUp = () => {
    isDragging = false;
    dragType = null;
    dragLayerId = null;
  };

  onMount(() => {
    if (resizerRef) setupResizer(resizerRef, 'timeline');
    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
  });

  onCleanup(() => {
    window.removeEventListener('pointermove', onWindowPointerMove);
    window.removeEventListener('pointerup', onWindowPointerUp);
  });

  const startScrub = (e: PointerEvent) => {
    if (projectStore.isPlaying) setProjectStore('isPlaying', false);
    if ((e.target as HTMLElement).closest('.timeline-clip')) return;

    if (!timelineAreaRef) return;
    const rect = timelineAreaRef.getBoundingClientRect();
    const scrollLeft = timelineAreaRef.scrollLeft;
    const x = e.clientX - rect.left + scrollLeft;
    let t = x / projectStore.pixelsPerSecond;
    if (t < 0) t = 0;
    if (t > projectStore.duration) t = projectStore.duration;

    setProjectStore('currentTime', t);

    isDragging = true;
    dragType = 'scrub';
    dragStartX = e.clientX;
    dragStartProp = t;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const startLayerDrag = (e: PointerEvent, layerId: string, type: 'move' | 'trim-left' | 'trim-right') => {
    e.stopPropagation();
    if (projectStore.isPlaying) setProjectStore('isPlaying', false);

    const layer = projectStore.layers.find(l => l.id === layerId);
    if (!layer) return;

    setProjectStore('activeLayerId', layerId);
    isDragging = true;
    dragType = type;
    dragLayerId = layerId;
    dragStartX = e.clientX;
    dragStartProp = layer.startTime;
    dragStartDuration = layer.duration;
    dragStartInPoint = layer.inPoint;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const zoomIn = () => {
    setProjectStore('pixelsPerSecond', p => Math.min(500, p + 10));
  };
  const zoomOut = () => {
    setProjectStore('pixelsPerSecond', p => Math.max(10, p - 10));
  };

  const setZoom = (e: Event) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    setProjectStore('pixelsPerSecond', val);
  };

  const tickConfig = () => {
    const pps = projectStore.pixelsPerSecond;
    if (pps < 10) return { label: 120, minor: 30 };
    if (pps < 20) return { label: 60, minor: 15 };
    if (pps < 40) return { label: 10, minor: 2 };
    if (pps < 80) return { label: 5, minor: 1 };
    if (pps < 150) return { label: 2, minor: 0.5 };
    return { label: 1, minor: 0.1 };
  };

  const formatTime = (seconds: number) => {
    const totalS = Math.round(seconds);
    const m = Math.floor(totalS / 60);
    const s = totalS % 60;
    if (m === 0) return `${s}s`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  return (
    <div class="w-full h-full glass-panel bg-surface border border-border rounded-xl flex flex-col overflow-hidden relative touch-none">
      <div ref={resizerRef} class="resizer resizer-t" id="resizer-timeline"></div>

      <div class="h-10 border-b border-border bg-[#1a1a1a] flex items-center px-4 justify-between shrink-0">
        <div class="flex items-center gap-4 text-neutral-400">
          <button class="hover:text-white transition-colors" title="Split"><Scissors class="w-4 h-4" /></button>
          <button class="hover:text-white transition-colors" title="Copy"><Copy class="w-4 h-4" /></button>
          <button onClick={() => { if (projectStore.activeLayerId) { layerRegistry.remove(projectStore.activeLayerId); removeLayer(projectStore.activeLayerId); } }} class="hover:text-red-400 transition-colors" title="Delete Clip"><Trash2 class="w-4 h-4" /></button>
          <div class="w-px h-4 bg-[#333] mx-1"></div>
          <button onClick={addTrack} class="hover:text-green-400 transition-colors" title="Add Track"><Plus class="w-4 h-4" /></button>
          <button onClick={() => {
            layerRegistry.clear();
            projectStore.layers.forEach(l => layerRegistry.instantiate(l));
          }} class="hover:text-cyan-400 transition-colors" title="Refresh Engine"><RefreshCcw class="w-4 h-4" /></button>
          <div class="w-px h-4 bg-[#333] mx-1"></div>
          <div class="flex items-center gap-2" title="Timeline Zoom">
            <button onClick={zoomOut} class="hover:text-white transition-colors p-1" title="Zoom Out"><ZoomOut class="w-3.5 h-3.5" /></button>
            <input type="range" min="10" max="500" value={projectStore.pixelsPerSecond} onInput={setZoom} class="w-20 cursor-pointer accent-primary hidden md:block" />
            <button onClick={zoomIn} class="hover:text-white transition-colors p-1" title="Zoom In"><ZoomIn class="w-3.5 h-3.5" /></button>
          </div>
          <div class="w-px h-4 bg-[#333] mx-1 hidden md:block"></div>
          <div class="hidden md:flex items-center gap-1.5" title="Track Height">
            <button
              onClick={() => setProjectStore('trackHeight', h => Math.max(32, h - 8))}
              class="p-1 hover:bg-white/10 rounded transition-colors text-neutral-400 hover:text-white"
              title="Decrease Track Height"
            >
              <FoldVertical class="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setProjectStore('trackHeight', h => Math.min(120, h + 8))}
              class="p-1 hover:bg-white/10 rounded transition-colors text-neutral-400 hover:text-white"
              title="Increase Track Height"
            >
              <UnfoldVertical class="w-3.5 h-3.5" />
            </button>
          </div>
          <div class="w-px h-4 bg-[#333] mx-1"></div>
          <button
            onClick={() => setProjectStore('followPlayhead', p => !p)}
            class={`p-1.5 rounded-md hover:bg-[#2a2a2a] transition-all ${projectStore.followPlayhead ? 'text-[#05d590] bg-[#1a2a24]' : 'text-neutral-500 hover:text-neutral-300'}`}
            title="Follow Playhead"
          >
            <LocateFixed class="w-4 h-4" />
          </button>
        </div>

        <div class="hidden md:flex items-center gap-1">
          <button
            onClick={() => setProjectStore('layout', 'layout-default')}
            class={`p-1.5 rounded-md hover:bg-[#2a2a2a] transition-all ${projectStore.layout === 'layout-default' ? 'text-[#05d590] bg-[#1a2a24]' : 'text-neutral-500 hover:text-neutral-300'}`}
            title="Standard Layout"
          ><LayoutGrid class="w-4 h-4" /></button>

          <button
            onClick={() => setProjectStore('layout', 'layout-wide-left')}
            class={`p-1.5 rounded-md hover:bg-[#2a2a2a] transition-all ${projectStore.layout === 'layout-wide-left' ? 'text-[#05d590] bg-[#1a2a24]' : 'text-neutral-500 hover:text-neutral-300'}`}
            title="Expand Left"
          ><PanelLeftOpen class="w-4 h-4" /></button>

          <button
            onClick={() => setProjectStore('layout', 'layout-wide-right')}
            class={`p-1.5 rounded-md hover:bg-[#2a2a2a] transition-all ${projectStore.layout === 'layout-wide-right' ? 'text-[#05d590] bg-[#1a2a24]' : 'text-neutral-500 hover:text-neutral-300'}`}
            title="Expand Right"
          ><PanelRightOpen class="w-4 h-4" /></button>

          <button
            onClick={() => setProjectStore('layout', 'layout-full')}
            class={`p-1.5 rounded-md hover:bg-[#2a2a2a] transition-all ${projectStore.layout === 'layout-full' ? 'text-[#05d590] bg-[#1a2a24]' : 'text-neutral-500 hover:text-neutral-300'}`}
            title="Theater Mode"
          ><Maximize2 class="w-4 h-4" /></button>

          <div class="w-px h-4 bg-[#333] mx-1"></div>
          <button onClick={() => setProjectStore('showTimelinePanel', false)} class="text-neutral-500 hover:text-white transition-colors ml-1"><X class="w-4 h-4" /></button>
        </div>
      </div>

      <div class="flex flex-1 overflow-hidden relative bg-background">
        <div class="w-[100px] md:w-[140px] bg-surface border-r border-border flex flex-col shrink-0 z-10 overflow-y-hidden">
          <div class="h-8 border-b border-border bg-[#1e1e1e] shrink-0 flex items-center justify-center">
            <span class="text-[10px] font-bold text-neutral-500">TRACKS</span>
          </div>
          <div ref={trackListRef} class="flex-1 overflow-y-hidden no-scrollbar">
            <For each={projectStore.tracks}>
              {(track) => (
                <div
                  class={`border-b border-[#1a1a1a] flex flex-col justify-center px-2 shrink-0 cursor-pointer pointer-events-auto group ${projectStore.activeTrackId === track.id ? 'bg-[#2a2a2a]' : 'hover:bg-[#1f1f1f]'}`}
                  style={{ height: `${projectStore.trackHeight}px` }}
                  onClick={() => setProjectStore('activeTrackId', track.id)}
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-1">
                      <span class="text-[11px] text-white font-medium truncate max-w-[80px] block">{track.name}</span>
                      <div class="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); moveTrack(track.id, 'up'); }} class="p-0.5 hover:text-white text-neutral-500 transition-colors" title="Move Up"><Show when={ChevronUp}><ChevronUp class="w-3 h-3" /></Show></button>
                        <button onClick={(e) => { e.stopPropagation(); moveTrack(track.id, 'down'); }} class="p-0.5 hover:text-white text-neutral-500 transition-colors" title="Move Down"><Show when={ChevronDown}><ChevronDown class="w-3 h-3" /></Show></button>
                        <button onClick={(e) => { e.stopPropagation(); deleteTrack(track.id); }} class="p-0.5 hover:text-red-400 text-neutral-500 transition-colors" title="Delete Track"><Trash2 class="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 mt-1">
                    <button onClick={(e) => { e.stopPropagation(); setProjectStore('tracks', t => t.id === track.id, { hidden: !track.hidden }); }} class="text-neutral-500 hover:text-white" title="Toggle Visibility">
                      {track.hidden ? <EyeOff class="w-3 h-3" /> : <Eye class="w-3 h-3" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setProjectStore('tracks', t => t.id === track.id, { locked: !track.locked }); }} class="text-neutral-500 hover:text-white" title="Toggle Lock">
                      {track.locked ? <Lock class="w-3 h-3" /> : <Unlock class="w-3 h-3" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setProjectStore('tracks', t => t.id === track.id, { muted: !track.muted }); }} class="text-neutral-500 hover:text-white" title="Toggle Mute">
                      {track.muted ? <VolumeX class="w-3 h-3 text-red-400" /> : <Volume2 class="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>

        <div ref={timelineAreaRef} class="flex-1 relative overflow-x-auto overflow-y-auto custom-scrollbar" onScroll={handleTimelineScroll}>
          <div
            class="relative min-h-full"
            style={{ width: `${Math.max(1000, projectStore.duration * projectStore.pixelsPerSecond + 500)}px` }}
            onPointerDown={startScrub}
          >

            {/* Ruler */}
            <div
              class="h-8 border-b border-border bg-[#141414] sticky top-0 z-20 pointer-events-none text-[9px] font-medium text-neutral-500 select-none"
              style={{ width: `${projectStore.duration * projectStore.pixelsPerSecond + 1000}px` }}
            >
              <For each={Array.from({ length: Math.ceil(projectStore.duration / tickConfig().minor) + 1 })}>
                {(_, i) => {
                  const time = i() * tickConfig().minor;
                  const isMajor = Math.abs(time % tickConfig().label) < 0.001 || Math.abs(time % tickConfig().label - tickConfig().label) < 0.001;
                  return (
                    <div
                      class={`absolute top-0 bottom-0 border-l ${isMajor ? 'border-neutral-700 h-full' : 'border-neutral-800 h-1/2'} transition-all`}
                      style={{ left: `${time * projectStore.pixelsPerSecond}px` }}
                    >
                      <Show when={isMajor}>
                        <span class="pl-1.5 pt-1 block text-neutral-400 font-bold">{formatTime(time)}</span>
                      </Show>
                    </div>
                  );
                }}
              </For>
            </div>

            {/* Playhead */}
            <div class="absolute top-0 bottom-0 w-[1px] bg-[#ff3366] z-30 pointer-events-none" style={{ left: `${projectStore.currentTime * projectStore.pixelsPerSecond}px` }}>
              <div class="absolute top-0 -left-1.5 w-3 h-3.5 bg-[#ff3366] rounded-b-sm flex items-center justify-center">
                <div class="w-0.5 h-1.5 bg-black rounded-full"></div>
              </div>
            </div>

            {/* Tracks */}
            <div class="w-full flex flex-col relative z-10 touch-none">
              <For each={projectStore.tracks}>
                {(track) => (
                  <div
                    class="border-b border-[#2a2a2a] relative w-full shrink-0"
                    style={{ height: `${projectStore.trackHeight}px` }}
                  >
                    <For each={projectStore.layers.filter(l => l.trackId === track.id)}>
                      {(layer) => (
                            <div
                              class={`timeline-clip absolute top-1 bottom-1 rounded shadow-xl group border-2 transition-[border-color,ring,box-shadow,opacity] duration-150 cursor-pointer touch-none ${projectStore.activeLayerId === layer.id ? 'z-20 border-white ring-2 ring-white/20' : 'border-white/5'} ${track.locked || layer.locked ? 'opacity-50 pointer-events-none' : ''} ${track.hidden || layer.hidden ? 'opacity-30' : ''}`}
                              style={{
                                left: `${layer.startTime * projectStore.pixelsPerSecond}px`,
                                width: `${layer.duration * projectStore.pixelsPerSecond}px`,
                                'background-color': (layer.type === 'audio' || layer.type === 'video') 
                                  ? (layer.audioAppearance === 'clip' 
                                    ? (layer.clipColor && layer.clipColor !== '#ffffff' ? layer.clipColor : (layer.type === 'audio' ? '#10b981' : '#3b82f6'))
                                    : `rgba(${hexToRgb(layer.clipColor && layer.clipColor !== '#ffffff' ? layer.clipColor : (layer.type === 'audio' ? '#10b981' : '#3b82f6'))}, 0.15)`)
                                  : (layer.clipColor && layer.clipColor !== '#ffffff' ? layer.clipColor : (layer.type === 'image' ? '#7c3aed' : layer.type === 'text' ? '#d97706' : '#4b5563')),
                              }}
                              onPointerDown={(e) => startLayerDrag(e, layer.id, 'move')}
                            >
                            <div class="px-2 py-1 text-[10px] text-white font-bold truncate pointer-events-none select-none z-10 relative drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                              {layer.name}
                            </div>

                            {/* Waveform */}
                            <Show when={layer.type === 'audio' || layer.type === 'video'}>
                              <TrackWaveform layer={layer} pixelsPerSecond={projectStore.pixelsPerSecond} />
                            </Show>

                            {/* Trimming Handles */}
                            <div
                              class="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize bg-white/30 hover:bg-white/60 transition-colors z-20 rounded-l active:bg-white/80"
                              onPointerDown={(e) => startLayerDrag(e, layer.id, 'trim-left')}
                            >
                              <div class="absolute inset-y-2 left-1 w-0.5 bg-black/20 rounded-full"></div>
                            </div>
                            <div
                              class="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize bg-white/30 hover:bg-white/60 transition-colors z-20 rounded-r active:bg-white/80"
                              onPointerDown={(e) => startLayerDrag(e, layer.id, 'trim-right')}
                            >
                              <div class="absolute inset-y-2 right-1 w-0.5 bg-black/20 rounded-full"></div>
                            </div>
                          </div>
                        )}
                    </For>
                  </div>
                )}
              </For>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

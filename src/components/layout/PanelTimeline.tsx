import { onMount, onCleanup, For, Show, createEffect, type Component } from 'solid-js';
import { Scissors, Copy, Trash2, RefreshCcw, ZoomOut, ZoomIn, X, Eye, EyeOff, Lock, Unlock, Plus, Volume2, VolumeX, PanelLeftOpen, PanelRightOpen, Maximize2, LayoutGrid } from 'lucide-solid';
import { projectStore, setProjectStore, updateLayer, removeLayer, addTrack, deleteTrack } from '../../store/projectStore';
import { layerRegistry } from '../../engine/LayerRegistry';
import { setupResizer } from '../../utils/resizer';

const TrackWaveform: Component<{ layer: any; pixelsPerSecond: number }> = (props) => {
  let canvasRef!: HTMLCanvasElement;
  
  createEffect(() => {
    const layer = props.layer;
    const pxPerSec = props.pixelsPerSecond;
    if (layer.type !== 'audio' && layer.type !== 'video') return;
    if (!layer.mediaId || !canvasRef) return;
    
    const media = projectStore.mediaPool[layer.mediaId];
    if (!media || !media.peaks) return;

    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;
    
    // Resize internal resolution to match DOM size
    canvasRef.width = layer.duration * pxPerSec;
    const w = canvasRef.width;
    const h = canvasRef.height;
    ctx.clearRect(0,0,w,h);
    
    const duration = layer.duration; 
    const inPoint = layer.inPoint;
    const totalDuration = media.duration || 1;
    
    const startIdx = Math.floor((inPoint / totalDuration) * media.peaks.length);
    const endIdx = Math.floor(((inPoint + duration) / totalDuration) * media.peaks.length);
    
    const visiblePeaks = media.peaks.slice(startIdx, endIdx);
    if(visiblePeaks.length === 0) return;

    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.4;
    const barWidth = Math.max(1, w / visiblePeaks.length);
    
    for(let i=0; i<visiblePeaks.length; i++) {
      const ph = visiblePeaks[i] * h * 0.75;
      ctx.fillRect(i * barWidth, h/2 - ph/2, Math.max(1, barWidth - 1), ph);
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

  let isDragging = false;
  let dragType: 'scrub' | 'move' | 'trim-left' | 'trim-right' | null = null;
  let dragLayerId: string | null = null;
  let dragStartX = 0;
  let dragStartProp = 0;
  let dragStartDuration = 0;
  let dragStartInPoint = 0;

  const onWindowMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const pxPerSec = projectStore.pixelsPerSecond;
    const dx = e.clientX - dragStartX;
    const dt = dx / pxPerSec;

    if (dragType === 'scrub') {
      let t = dragStartProp + dt;
      if (t < 0) t = 0;
      if (t > projectStore.duration) t = projectStore.duration;
      setProjectStore('currentTime', t);
      // We will sync video engine time elsewhere (e.g. EngineCore)
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
        if (newDur < 0.1) {
          const over = 0.1 - newDur;
          newDur = 0.1;
          newStart -= over;
          newIn -= over;
        }
        if (newIn < 0) {
          const diff = 0 - newIn;
          newIn = 0;
          newStart += diff;
          newDur -= diff;
        }
        updateLayer(dragLayerId, { startTime: newStart, inPoint: newIn, duration: newDur });
      } else if (dragType === 'trim-right') {
        let newDur = dragStartDuration + dt;
        if (newDur < 0.1) newDur = 0.1;
        // Todo: Check max media duration bound
        updateLayer(dragLayerId, { duration: newDur });
      }
    }
  };

  const onWindowMouseUp = () => {
    isDragging = false;
    dragType = null;
    dragLayerId = null;
  };

  onMount(() => {
    if (resizerRef) setupResizer(resizerRef, 'timeline');
    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
  });

  onCleanup(() => {
    window.removeEventListener('mousemove', onWindowMouseMove);
    window.removeEventListener('mouseup', onWindowMouseUp);
  });

  const startScrub = (e: MouseEvent) => {
    // Only seek if clicking empty space or ruler, not clips
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
  };

  const startLayerDrag = (e: MouseEvent, layerId: string, type: 'move' | 'trim-left' | 'trim-right') => {
    e.stopPropagation();
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
  };

  const setZoom = (e: Event) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    setProjectStore('pixelsPerSecond', val);
  };


  
  const tickConfig = () => {
    const pps = projectStore.pixelsPerSecond;
    if (pps < 5) return { label: 120, minor: 30 };
    if (pps < 10) return { label: 60, minor: 15 };
    if (pps < 25) return { label: 10, minor: 2 };
    if (pps < 50) return { label: 5, minor: 1 };
    if (pps < 100) return { label: 2, minor: 0.5 };
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
    <div class="w-full h-full glass-panel bg-surface border border-border rounded-xl flex flex-col overflow-hidden relative">
      <div ref={resizerRef} class="resizer resizer-t" id="resizer-timeline"></div>
      
      <div class="h-10 border-b border-border bg-[#1a1a1a] flex items-center px-4 justify-between shrink-0">
        <div class="flex items-center gap-4 text-neutral-400">
          <button class="hover:text-white transition-colors" title="Split"><Scissors class="w-4 h-4" /></button>
          <button class="hover:text-white transition-colors" title="Copy"><Copy class="w-4 h-4" /></button>
          <button onClick={() => { if(projectStore.activeLayerId) { layerRegistry.remove(projectStore.activeLayerId); removeLayer(projectStore.activeLayerId); } }} class="hover:text-red-400 transition-colors" title="Delete Clip"><Trash2 class="w-4 h-4" /></button>
          <div class="w-px h-4 bg-[#333] mx-1"></div>
          <button onClick={addTrack} class="hover:text-green-400 transition-colors" title="Add Track"><Plus class="w-4 h-4" /></button>
          <button onClick={() => {
            layerRegistry.clear();
            projectStore.layers.forEach(l => layerRegistry.instantiate(l));
          }} class="hover:text-cyan-400 transition-colors" title="Refresh Engine"><RefreshCcw class="w-4 h-4" /></button>
          <div class="flex items-center gap-2" title="Timeline Zoom">
            <ZoomOut class="w-3.5 h-3.5" />
            <input type="range" min="2" max="500" value={projectStore.pixelsPerSecond} onInput={setZoom} class="w-20 cursor-pointer accent-primary" />
            <ZoomIn class="w-3.5 h-3.5" />
          </div>
          <div class="w-px h-4 bg-[#333] mx-1"></div>
          <div class="flex items-center gap-1.5" title="Track Height">
            <button 
              onClick={() => setProjectStore('trackHeight', h => Math.max(32, h - 8))} 
              class="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <Plus class="w-3.5 h-3.5 rotate-45" />
            </button>
            <button 
              onClick={() => setProjectStore('trackHeight', h => Math.min(120, h + 8))} 
              class="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <Plus class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        
        <div class="flex items-center gap-1">
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
            title="Full Width"
          ><Maximize2 class="w-4 h-4" /></button>

          <div class="w-px h-4 bg-[#333] mx-1"></div>
          <button onClick={() => setProjectStore('showTimelinePanel', false)} class="hidden md:block text-neutral-500 hover:text-white transition-colors ml-1"><X class="w-4 h-4" /></button>
        </div>
      </div>

      <div class="flex flex-1 overflow-hidden relative bg-background">
        <div class="w-[100px] md:w-[140px] bg-surface border-r border-border flex flex-col shrink-0 z-10 overflow-y-hidden">
          <div class="h-8 border-b border-border bg-[#1e1e1e] shrink-0 flex items-center justify-center">
            <span class="text-[10px] font-bold text-neutral-500">TRACKS</span>
          </div> 
          <div class="flex-1 overflow-y-auto custom-scrollbar no-scrollbar-x pointer-events-none">
            <For each={projectStore.tracks}>
              {(track) => (
                <div 
                  class={`border-b border-[#1a1a1a] flex flex-col justify-center px-2 shrink-0 cursor-pointer pointer-events-auto group ${projectStore.activeTrackId === track.id ? 'bg-[#2a2a2a]' : 'hover:bg-[#1f1f1f]'}`} 
                  style={{ height: `${projectStore.trackHeight}px` }}
                  onClick={() => setProjectStore('activeTrackId', track.id)}
                >
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] text-white font-medium truncate w-full block">{track.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); deleteTrack(track.id); }} class="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 text-neutral-500 transition-opacity"><Trash2 class="w-3 h-3" /></button>
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

        <div ref={timelineAreaRef} class="flex-1 relative overflow-x-auto overflow-y-auto custom-scrollbar">
          <div 
            class="relative min-h-full" 
            style={{ width: `${Math.max(1000, projectStore.duration * projectStore.pixelsPerSecond + 500)}px` }}
            onMouseDown={startScrub}
          >
            
            {/* Ruler */}
            <div class="h-8 border-b border-border bg-[#141414] sticky top-0 z-20 w-full pointer-events-none text-[9px] font-medium text-neutral-500 overflow-hidden select-none">
              <For each={Array.from({length: Math.ceil(projectStore.duration / tickConfig().minor) + 1})}>
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
            <div class="w-full flex flex-col relative z-10">
              <For each={projectStore.tracks}>
                {(track) => (
                  <div 
                    class="border-b border-[#2a2a2a] relative w-full shrink-0"
                    style={{ height: `${projectStore.trackHeight}px` }}
                  >
                    <For each={projectStore.layers.filter(l => l.trackId === track.id)}>
                      {(layer) => {
                        const getLayerColor = () => {
                          const isActive = projectStore.activeLayerId === layer.id;
                          let cls = isActive ? 'z-20 border-white/90 ring-1 ring-white/10' : 'border-white/10';
                          
                          switch (layer.type) {
                            case 'video': cls += ' bg-[#2563eb] hover:bg-[#3b82f6]'; break;
                            case 'audio': cls += ' bg-[#059669] hover:bg-[#10b981]'; break;
                            case 'image': cls += ' bg-[#7c3aed] hover:bg-[#8b5cf6]'; break;
                            case 'text': cls += ' bg-[#d97706] hover:bg-[#f59e0b]'; break;
                            default: cls += ' bg-[#4b5563] hover:bg-[#6b7280]';
                          }
                          return cls;
                        };
                        return (
                        <div 
                          class={`timeline-clip absolute top-1 bottom-1 rounded shadow-lg group border transition-all duration-150 ${getLayerColor()} ${track.locked || layer.locked ? 'opacity-50 pointer-events-none' : ''} ${track.hidden || layer.hidden ? 'opacity-30' : ''}`}
                          style={{ 
                            left: `${layer.startTime * projectStore.pixelsPerSecond}px`, 
                            width: `${layer.duration * projectStore.pixelsPerSecond}px` 
                          }}
                          onMouseDown={(e) => startLayerDrag(e, layer.id, 'move')}
                        >
                          <div class="px-2 py-1 text-[10px] text-white font-bold truncate pointer-events-none z-10 relative drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                            {layer.name}
                          </div>
                          
                          {/* Waveform */}
                          <Show when={layer.type === 'audio' || layer.type === 'video'}>
                             <TrackWaveform layer={layer} pixelsPerSecond={projectStore.pixelsPerSecond} />
                          </Show>
                          
                          {/* Trimming Handles */}
                          <div 
                            class="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/20 hover:bg-white/40 transition-colors z-20"
                            onMouseDown={(e) => startLayerDrag(e, layer.id, 'trim-left')}
                          ></div>
                          <div 
                            class="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/20 hover:bg-white/40 transition-colors z-20"
                            onMouseDown={(e) => startLayerDrag(e, layer.id, 'trim-right')}
                          ></div>
                        </div>
                        );
                      }}
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

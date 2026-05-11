import { onMount, onCleanup, For, type Component } from 'solid-js';
import { Scissors, Copy, Trash2, RefreshCcw, ZoomOut, ZoomIn, X, Eye, EyeOff, Lock, Unlock } from 'lucide-solid';
import { projectStore, setProjectStore, updateLayer, removeLayer } from '../../store/projectStore';
import { layerRegistry } from '../../engine/LayerRegistry';
import { setupResizer } from '../../utils/resizer';

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

  const steps = () => Math.ceil(projectStore.duration);

  return (
    <div class="w-full h-full glass-panel bg-surface border border-border rounded-xl flex flex-col overflow-hidden relative">
      <div ref={resizerRef} class="resizer resizer-t" id="resizer-timeline"></div>
      
      <div class="h-10 border-b border-border bg-[#1a1a1a] flex items-center px-4 justify-between shrink-0">
        <div class="flex items-center gap-4 text-neutral-400">
          <button class="hover:text-white transition-colors" title="Split"><Scissors class="w-4 h-4" /></button>
          <button class="hover:text-white transition-colors" title="Copy"><Copy class="w-4 h-4" /></button>
          <button onClick={() => { if(projectStore.activeLayerId) { layerRegistry.remove(projectStore.activeLayerId); removeLayer(projectStore.activeLayerId); } }} class="hover:text-red-400 transition-colors" title="Delete"><Trash2 class="w-4 h-4" /></button>
          <div class="w-px h-4 bg-[#333] mx-1"></div>
          <button class="hover:text-cyan-400 transition-colors" title="Refresh Engine"><RefreshCcw class="w-4 h-4" /></button>
          <div class="w-px h-4 bg-[#333] mx-1"></div>
          <div class="flex items-center gap-2" title="Timeline Zoom">
            <ZoomOut class="w-3.5 h-3.5" />
            <input type="range" min="10" max="200" value={projectStore.pixelsPerSecond} onInput={setZoom} class="w-20 cursor-pointer" />
            <ZoomIn class="w-3.5 h-3.5" />
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          {/* Layout controls omitted for brevity, keeping X button */}
          <button onClick={() => setProjectStore('showTimelinePanel', false)} class="hidden md:block text-neutral-500 hover:text-white transition-colors ml-2"><X class="w-4 h-4" /></button>
        </div>
      </div>

      <div class="flex flex-1 overflow-hidden relative bg-background">
        <div class="w-[100px] md:w-[140px] bg-surface border-r border-border flex flex-col shrink-0 z-10 overflow-y-hidden">
          <div class="h-8 border-b border-border bg-[#1e1e1e] shrink-0"></div> 
          <div class="flex-1 overflow-y-auto custom-scrollbar no-scrollbar-x">
            <For each={projectStore.layers}>
              {(layer) => (
                <div class={`h-12 border-b border-[#1a1a1a] flex flex-col justify-center px-2 shrink-0 cursor-pointer ${projectStore.activeLayerId === layer.id ? 'bg-primary/10' : ''}`} onClick={() => setProjectStore('activeLayerId', layer.id)}>
                  <span class="text-xs text-white truncate w-full block">{layer.name}</span>
                  <div class="flex items-center gap-2 mt-1">
                    <button onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { hidden: !layer.hidden }); }} class="text-neutral-500 hover:text-white">
                      {layer.hidden ? <EyeOff class="w-3 h-3" /> : <Eye class="w-3 h-3" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }); }} class="text-neutral-500 hover:text-white">
                      {layer.locked ? <Lock class="w-3 h-3" /> : <Unlock class="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>

        <div ref={timelineAreaRef} class="flex-1 relative overflow-x-auto overflow-y-auto custom-scrollbar" onMouseDown={startScrub}>
          <div class="relative min-h-full" style={{ width: `${Math.max(1000, projectStore.duration * projectStore.pixelsPerSecond + 500)}px` }}>
            
            {/* Ruler */}
            <div class="h-8 border-b border-border bg-[#1e1e1e] sticky top-0 z-20 w-full pointer-events-none text-[10px] text-neutral-500 overflow-hidden">
              <For each={Array.from({length: steps() + 5})}>
                {(_, i) => (
                  <div class="absolute top-0 bottom-0 border-l border-[#333] pl-1" style={{ left: `${i() * projectStore.pixelsPerSecond}px` }}>
                    {i()}s
                  </div>
                )}
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
              <For each={projectStore.layers}>
                {(layer) => (
                  <div class="h-12 border-b border-[#2a2a2a] relative w-full shrink-0">
                    <div 
                      class={`absolute top-1 bottom-1 rounded shadow-md group ${projectStore.activeLayerId === layer.id ? 'bg-primary border border-primary-foreground/30 z-20' : 'bg-[#3b82f6] border border-blue-400/30'} ${layer.locked ? 'opacity-50 pointer-events-none' : ''}`}
                      style={{ 
                        left: `${layer.startTime * projectStore.pixelsPerSecond}px`, 
                        width: `${layer.duration * projectStore.pixelsPerSecond}px` 
                      }}
                      onMouseDown={(e) => startLayerDrag(e, layer.id, 'move')}
                    >
                      <div class="px-2 py-1 text-[10px] text-white font-medium truncate pointer-events-none">
                        {layer.name}
                      </div>
                      
                      {/* Trimming Handles */}
                      <div 
                        class="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/20 hover:bg-white/40 transition-colors"
                        onMouseDown={(e) => startLayerDrag(e, layer.id, 'trim-left')}
                      ></div>
                      <div 
                        class="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/20 hover:bg-white/40 transition-colors"
                        onMouseDown={(e) => startLayerDrag(e, layer.id, 'trim-right')}
                      ></div>
                    </div>
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

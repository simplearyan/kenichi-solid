import { Show, onMount, onCleanup, type Component } from 'solid-js';
import { MonitorPlay, Play, Pause, Volume2, VolumeX } from 'lucide-solid';
import { projectStore, togglePlay, setProjectStore } from '../../store/projectStore';
import { renderer } from '../../engine/Renderer';
import { audioEngine } from '../../engine/AudioEngine';

export const PanelCenter: Component = () => {
  let canvasRef: HTMLCanvasElement | undefined;

  onMount(() => {
    if (canvasRef) {
      renderer.init(canvasRef);
    }
  });

  onCleanup(() => {
    renderer.stopLoop();
  });

  return (
    <main class="w-full h-full flex flex-col gap-2 relative">
      <div class="flex-1 glass-panel bg-surface border border-border rounded-lg md:rounded-xl flex items-center justify-center relative overflow-hidden p-1 md:p-2 min-h-0">
        <div id="stats-overlay" class="absolute top-3 left-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full px-3 py-1.5 z-10 flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-left-4 duration-500 pointer-events-none select-none">
          <div class="flex items-center gap-2">
            <div class={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(5,213,144,0.6)] ${projectStore.isPlaying ? 'bg-primary animate-pulse' : 'bg-neutral-600'}`} />
            <span class="text-[9px] font-black text-white uppercase tracking-tight">Preview</span>
          </div>
          
          <div class="w-px h-3 bg-white/10" />
          
          <div class="flex items-center gap-1.5">
            <span class="text-neutral-500 text-[8px] font-black uppercase tracking-widest">Res</span>
            <span class="text-white font-mono text-[10px] font-bold">
              {(() => {
                const h = parseInt(projectStore.proxyRes);
                const ar = projectStore.aspectRatio === '16/9' ? 16/9 : projectStore.aspectRatio === '9/16' ? 9/16 : 1;
                return `${Math.round(h * ar)}x${h}`;
              })()}
            </span>
          </div>

          <div class="w-px h-3 bg-white/10" />
          
          <div class="flex items-center gap-1.5">
            <span class="text-neutral-500 text-[8px] font-black uppercase tracking-widest">Perf</span>
            <span class={`font-mono text-[10px] font-bold transition-colors duration-300 ${projectStore.currentFPS < 24 ? 'text-red-400' : projectStore.currentFPS < 50 ? 'text-yellow-400' : 'text-primary'}`}>
               {projectStore.currentFPS} FPS
            </span>
          </div>
        </div>

        <Show when={projectStore.layers.length === 0}>
          <div id="empty-state" class="absolute inset-0 flex flex-col items-center justify-center text-neutral-600 z-10 pointer-events-none">
            <MonitorPlay class="w-10 h-10 md:w-12 md:h-12 mb-2 md:mb-3 opacity-50" />
            <p class="text-xs md:text-sm">Ready for playback</p>
          </div>
        </Show>

        <div id="canvas-container" class="w-full h-full flex items-center justify-center bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjMWExYTFhIi8+PHJlY3QgeD0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iIzA1MDUwNSIvPjxyZWN0IHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiMwNTA1MDUiLz48cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iIzFhMWExYSIvPjwvc3ZnPg==')] rounded-lg border border-border shadow-inner overflow-auto relative">
          <canvas 
            ref={canvasRef} 
            id="preview-canvas" 
            class={`object-contain transition-transform ${projectStore.zoomMode === 'fit' ? 'w-full h-full absolute inset-0' : ''}`}
            style={{ 
              transform: projectStore.zoomMode === 'fit' ? 'none' : `scale(${projectStore.zoomMode})`,
              "transform-origin": "center"
            }}
          ></canvas>
        </div>
      </div>

      <div class="h-[44px] md:h-[48px] glass-panel bg-surface border border-border rounded-lg md:rounded-xl flex items-center px-3 md:px-4 gap-3 md:gap-4 shrink-0 mt-1 md:mt-0">
        <button onClick={togglePlay} class="text-white transition-colors">
          <Show when={projectStore.isPlaying} fallback={<Play class="w-4 h-4 md:w-5 md:h-5 fill-current" />}>
            <Pause class="w-4 h-4 md:w-5 md:h-5 fill-current" />
          </Show>
        </button>

        <div class="font-mono text-primary text-[10px] md:text-xs font-medium w-auto md:w-16 shrink-0">
          {projectStore.currentTime.toFixed(1)}s
        </div>

        <div 
          class="flex-1 relative h-6 flex items-center cursor-pointer group select-none touch-none" 
          id="main-scrubber"
          onPointerDown={(e) => {
            audioEngine.init();
            const rect = e.currentTarget.getBoundingClientRect();
            const wasPlaying = projectStore.isPlaying;
            if (wasPlaying) setProjectStore('isPlaying', false);
            setProjectStore('isSeeking', true);

            const update = (ex: number) => {
              const x = Math.max(0, Math.min(rect.width, ex - rect.left));
              let time = (x / rect.width) * projectStore.duration;
              if (!Number.isFinite(time)) time = 0;
              
              setProjectStore('currentTime', time);
              
              // Keep audio state in sync without starting nodes during the scrub
              audioEngine.stopPlayback();
              audioEngine.reset(time);
            };
            
            update(e.clientX);
            e.currentTarget.setPointerCapture(e.pointerId);

            const onMove = (moveEvent: PointerEvent) => update(moveEvent.clientX);
            const onUp = () => {
              setProjectStore('isSeeking', false);
              if (wasPlaying) setProjectStore('isPlaying', true);
              window.removeEventListener('pointermove', onMove);
              window.removeEventListener('pointerup', onUp);
            };
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
          }}
        >
          <div class="w-full h-1 md:h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden border border-border">
            <div class="h-full bg-primary transition-all duration-75 pointer-events-none" style={{ width: `${(projectStore.currentTime / projectStore.duration) * 100}%` }}></div>
          </div>
          <div class="absolute w-2.5 h-2.5 md:w-3 md:h-3 bg-primary rounded-full shadow-[0_0_8px_rgba(5,213,144,0.6)] -ml-1.5 transform scale-0 group-hover:scale-100 transition-transform pointer-events-none" style={{ left: `${(projectStore.currentTime / projectStore.duration) * 100}%` }}></div>
        </div>

        <div class="font-mono text-neutral-500 text-[10px] md:text-xs font-medium w-auto md:w-12 shrink-0 text-right">
          {projectStore.duration.toFixed(1)}s
        </div>

        <div class="hidden sm:flex items-center gap-2 shrink-0 pl-2 border-l border-border">
          <button onClick={() => setProjectStore('globalMuted', !projectStore.globalMuted)} class="text-neutral-400 hover:text-white transition-colors" title="Global Mute">
            {projectStore.globalMuted ? <VolumeX class="w-4 h-4 md:w-4 md:h-4 text-red-400" /> : <Volume2 class="w-4 h-4 md:w-4 md:h-4" />}
          </button>
          <input 
            type="range" min="0" max="1" step="0.01" 
            value={projectStore.globalVolume}
            onInput={(e) => setProjectStore('globalVolume', parseFloat(e.currentTarget.value))}
            class="w-16 h-1 accent-primary cursor-pointer"
            title="Global Volume"
          />
        </div>
      </div>
    </main>
  );
};

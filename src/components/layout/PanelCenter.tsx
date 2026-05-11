import { Show, onMount, onCleanup, type Component } from 'solid-js';
import { MonitorPlay, Play, Pause, Volume2 } from 'lucide-solid';
import { projectStore, togglePlay } from '../../store/projectStore';
import { renderer } from '../../engine/Renderer';

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
        <div id="stats-overlay" class="absolute top-2 left-2 md:top-3 md:left-3 bg-background/80 text-primary font-mono text-[9px] md:text-[10px] px-2 py-1 rounded-md z-10 border border-primary/30 backdrop-blur-md flex items-center gap-2">
          <span>
            {projectStore.proxyRes === '480' ? '854x480' : projectStore.proxyRes === '720' ? '1280x720' : '1920x1080'}
          </span> 
          <span>|</span> 
          <span class="text-[#ff3366]">PROXY</span>
          <span>|</span>
          <span>{projectStore.fps} FPS</span>
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

        <div class="flex-1 relative h-6 flex items-center cursor-pointer group" id="main-scrubber">
          <div class="w-full h-1 md:h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden border border-border">
            <div class="h-full bg-primary transition-all duration-75 pointer-events-none" style={{ width: `${(projectStore.currentTime / projectStore.duration) * 100}%` }}></div>
          </div>
          <div class="absolute w-2.5 h-2.5 md:w-3 md:h-3 bg-primary rounded-full shadow-[0_0_8px_rgba(5,213,144,0.6)] -ml-1.5 transform scale-0 group-hover:scale-100 transition-transform pointer-events-none" style={{ left: `${(projectStore.currentTime / projectStore.duration) * 100}%` }}></div>
        </div>

        <div class="font-mono text-neutral-500 text-[10px] md:text-xs font-medium w-auto md:w-12 shrink-0 text-right">
          {projectStore.duration.toFixed(1)}s
        </div>

        <button class="hidden sm:block text-neutral-400 hover:text-white transition-colors shrink-0 pl-2 border-l border-border">
          <Volume2 class="w-4 h-4 md:w-4 md:h-4" />
        </button>
      </div>
    </main>
  );
};

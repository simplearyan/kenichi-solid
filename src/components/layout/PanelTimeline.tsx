import { onMount, type Component } from 'solid-js';
import { Scissors, Copy, Trash2, RefreshCcw, ZoomOut, ZoomIn, X } from 'lucide-solid';
import { projectStore, setProjectStore } from '../../store/projectStore';
import { setupResizer } from '../../utils/resizer';

export const PanelTimeline: Component = () => {
  let resizerRef: HTMLDivElement | undefined;

  onMount(() => {
    if (resizerRef) setupResizer(resizerRef, 'timeline');
  });
  return (
    <div class="w-full h-full glass-panel bg-surface border border-border rounded-xl flex flex-col overflow-hidden relative">
      <div ref={resizerRef} class="resizer resizer-t" id="resizer-timeline"></div>
      
      <div class="h-10 border-b border-border bg-[#1a1a1a] flex items-center px-4 justify-between shrink-0">
        <div class="flex items-center gap-4 text-neutral-400">
          <button class="hover:text-white transition-colors" title="Split"><Scissors class="w-4 h-4" /></button>
          <button class="hover:text-white transition-colors" title="Copy"><Copy class="w-4 h-4" /></button>
          <button class="hover:text-red-400 transition-colors" title="Delete"><Trash2 class="w-4 h-4" /></button>
          <div class="w-px h-4 bg-[#333] mx-1"></div>
          <button class="hover:text-cyan-400 transition-colors" title="Refresh Engine"><RefreshCcw class="w-4 h-4" /></button>
          <div class="w-px h-4 bg-[#333] mx-1"></div>
          <div class="flex items-center gap-2" title="Timeline Zoom">
            <ZoomOut class="w-3.5 h-3.5" />
            <input type="range" min="10" max="150" value="50" class="w-20 cursor-pointer" />
            <ZoomIn class="w-3.5 h-3.5" />
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <div class="hidden md:flex items-center gap-1 bg-background p-1 rounded border border-border">
            <button onClick={() => setProjectStore('layout', 'layout-default')} class={`p-1 rounded transition-colors ${projectStore.layout === 'layout-default' ? 'bg-[#262626] text-white' : 'hover:bg-[#262626] text-neutral-500'}`} title="Standard Layout">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>
            </button>
            <button onClick={() => setProjectStore('layout', 'layout-wide-left')} class={`p-1 rounded transition-colors ${projectStore.layout === 'layout-wide-left' ? 'bg-[#262626] text-white' : 'hover:bg-[#262626] text-neutral-500'}`} title="Extend Left">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 15h18"/><path d="M15 3v18"/><path d="M9 3v12"/></svg>
            </button>
            <button onClick={() => setProjectStore('layout', 'layout-wide-right')} class={`p-1 rounded transition-colors ${projectStore.layout === 'layout-wide-right' ? 'bg-[#262626] text-white' : 'hover:bg-[#262626] text-neutral-500'}`} title="Extend Right">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v12"/></svg>
            </button>
            <button onClick={() => setProjectStore('layout', 'layout-full')} class={`p-1 rounded transition-colors ${projectStore.layout === 'layout-full' ? 'bg-[#262626] text-white' : 'hover:bg-[#262626] text-neutral-500'}`} title="Extend Full Width">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 15h18"/><path d="M9 3v12"/><path d="M15 3v12"/></svg>
            </button>
          </div>
          <button onClick={() => setProjectStore('showTimelinePanel', false)} class="hidden md:block text-neutral-500 hover:text-white transition-colors ml-2"><X class="w-4 h-4" /></button>
        </div>
      </div>

      <div class="flex flex-1 overflow-hidden relative bg-background">
        <div class="w-[100px] md:w-[140px] bg-surface border-r border-border flex flex-col shrink-0 z-10 overflow-y-hidden">
          <div class="h-8 border-b border-border bg-[#1e1e1e] shrink-0"></div> 
          {/* Track Headers */}
        </div>

        <div class="flex-1 relative overflow-x-auto overflow-y-hidden custom-scrollbar">
          <div class="h-8 border-b border-border bg-[#1e1e1e] flex items-end px-2 text-[10px] text-neutral-500 sticky top-0 timeline-grid z-20 min-w-max w-[3000px]">
             {/* Ruler */}
          </div>

          <div class="relative min-w-max w-[3000px] timeline-grid h-full flex flex-col">
            <div class="absolute top-0 bottom-0 w-[1px] bg-[#ff3366] z-30 pointer-events-none" style={{ left: `${(projectStore.currentTime / projectStore.duration) * 100}%` }}>
              <div class="absolute top-0 -left-1.5 w-3 h-3.5 bg-[#ff3366] rounded-b-sm flex items-center justify-center">
                <div class="w-0.5 h-1.5 bg-black rounded-full"></div>
              </div>
            </div>
            {/* Tracks */}
          </div>
        </div>
      </div>
    </div>
  );
};

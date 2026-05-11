import { Show, onMount, type Component } from 'solid-js';
import { ArrowUp, ArrowDown, Copy, Trash2, Sliders } from 'lucide-solid';
import { projectStore, setProjectStore } from '../../store/projectStore';
import { setupResizer } from '../../utils/resizer';

export const PanelRight: Component = () => {
  let resizerRef: HTMLDivElement | undefined;

  onMount(() => {
    if (resizerRef) setupResizer(resizerRef, 'right');
  });
  return (
    <aside class="w-full h-full glass-panel bg-surface border border-border rounded-xl flex flex-col overflow-hidden relative">
      <div ref={resizerRef} class="resizer resizer-l" id="resizer-right"></div>
      
      <div class="flex border-b border-border px-2 pt-2 bg-[#1a1a1a]">
        <button 
          onClick={() => setProjectStore('rightPanelTab', 'layers')}
          class={`flex-1 pb-2 text-[11px] font-bold tracking-wider transition-colors border-b-2 ${projectStore.rightPanelTab === 'layers' ? 'text-primary border-primary' : 'text-neutral-500 hover:text-neutral-300 border-transparent'}`}
        >LAYERS</button>
        <button 
          onClick={() => setProjectStore('rightPanelTab', 'props')}
          class={`flex-1 pb-2 text-[11px] font-bold tracking-wider transition-colors border-b-2 ${projectStore.rightPanelTab === 'props' ? 'text-primary border-primary' : 'text-neutral-500 hover:text-neutral-300 border-transparent'}`}
        >PROPERTIES</button>
      </div>

      <Show when={projectStore.rightPanelTab === 'layers'}>
        <div class="flex-1 flex flex-col overflow-hidden">
          <div class="p-2 border-b border-border flex justify-between items-center bg-[#1a1a1a] z-10">
            <div class="flex items-center gap-1">
              <button class="p-1.5 hover:bg-[#2a2a2a] rounded text-neutral-400 hover:text-white transition-colors disabled:opacity-30" title="Move Up"><ArrowUp class="w-3.5 h-3.5" /></button>
              <button class="p-1.5 hover:bg-[#2a2a2a] rounded text-neutral-400 hover:text-white transition-colors disabled:opacity-30" title="Move Down"><ArrowDown class="w-3.5 h-3.5" /></button>
              <div class="w-px h-4 bg-[#333] mx-1"></div>
              <button class="p-1.5 hover:bg-[#2a2a2a] rounded text-neutral-400 hover:text-white transition-colors disabled:opacity-30" title="Duplicate"><Copy class="w-3.5 h-3.5" /></button>
              <button class="p-1.5 hover:bg-[#2a2a2a] rounded text-neutral-400 hover:text-red-400 transition-colors disabled:opacity-30" title="Delete"><Trash2 class="w-3.5 h-3.5" /></button>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
            <Show when={projectStore.layers.length === 0} fallback={<div>Layers will map here</div>}>
              <div class="text-center text-neutral-600 text-xs mt-4">No layers added</div>
            </Show>
          </div>
        </div>
      </Show>

      <Show when={projectStore.rightPanelTab === 'props'}>
        <div class="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-5 space-y-6">
          <Show when={!projectStore.activeLayerId} fallback={<div>Properties panel goes here based on active layer.</div>}>
            <div class="h-full flex flex-col items-center justify-center text-neutral-600 gap-2">
              <Sliders class="w-8 h-8" />
              <span class="text-xs text-center">Select a layer<br/>to edit properties</span>
            </div>
          </Show>
        </div>
      </Show>
    </aside>
  );
};

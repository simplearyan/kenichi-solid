import { Show, type Component } from 'solid-js';
import { Plus, Inbox, Type, Square, Circle, Shapes } from 'lucide-solid';
import { projectStore, setProjectStore } from '../../store/projectStore';

export const PanelLeft: Component = () => {
  return (
    <aside class="w-full h-full glass-panel bg-surface border border-border rounded-xl flex flex-col overflow-hidden relative">
      <div class="flex border-b border-border bg-[#1a1a1a] shrink-0">
        <button 
          onClick={() => setProjectStore('leftPanelTab', 'pool')}
          class={`flex-1 py-2 text-[10px] font-bold tracking-wider transition-colors border-b-2 ${projectStore.leftPanelTab === 'pool' ? 'text-primary border-primary' : 'text-neutral-500 hover:text-neutral-300 border-transparent'}`}
        >MEDIA</button>
        <button 
          onClick={() => setProjectStore('leftPanelTab', 'text')}
          class={`flex-1 py-2 text-[10px] font-bold tracking-wider transition-colors border-b-2 ${projectStore.leftPanelTab === 'text' ? 'text-primary border-primary' : 'text-neutral-500 hover:text-neutral-300 border-transparent'}`}
        >TEXT</button>
        <button 
          onClick={() => setProjectStore('leftPanelTab', 'shapes')}
          class={`flex-1 py-2 text-[10px] font-bold tracking-wider transition-colors border-b-2 ${projectStore.leftPanelTab === 'shapes' ? 'text-primary border-primary' : 'text-neutral-500 hover:text-neutral-300 border-transparent'}`}
        >SHAPES</button>
      </div>
      
      <div class="p-3 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 relative">
        <Show when={projectStore.leftPanelTab === 'pool'}>
          <div class="flex flex-col gap-3 h-full">
            <label for="video-upload" class="w-full py-2 bg-[#1e1e1e] hover:bg-[#2a2a2a] border border-border rounded-lg text-neutral-300 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm">
              <Plus class="w-4 h-4" /> Import Media
            </label>
            <input type="file" id="video-upload" accept="video/*,audio/*,image/*" class="hidden" multiple />
            <div class="space-y-2 flex-1 relative">
              <Show when={Object.keys(projectStore.mediaPool).length === 0}>
                <div class="absolute inset-0 flex flex-col items-center justify-center text-neutral-600 gap-2 pointer-events-none">
                  <Inbox class="w-8 h-8" />
                  <span class="text-xs">No media</span>
                </div>
              </Show>
              {/* Media pool items will map here */}
            </div>
          </div>
        </Show>

        <Show when={projectStore.leftPanelTab === 'text'}>
          <div class="flex flex-col gap-3 h-full">
            <button class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 rounded-lg text-white text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm">
              <Type class="w-4 h-4" /> Add Text Layer
            </button>
            <div class="flex-1 flex flex-col items-center justify-center text-neutral-600 gap-2 text-center px-4 pointer-events-none">
              <Type class="w-8 h-8 opacity-50" />
              <span class="text-xs">Add standard text<br/>or animated typography</span>
            </div>
          </div>
        </Show>

        <Show when={projectStore.leftPanelTab === 'shapes'}>
          <div class="flex flex-col gap-3 h-full">
            <button class="w-full py-2 bg-purple-600 hover:bg-purple-500 border border-purple-500 rounded-lg text-white text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm">
              <Square class="w-4 h-4" /> Add Rectangle
            </button>
            <button class="w-full py-2 bg-pink-600 hover:bg-pink-500 border border-pink-500 rounded-lg text-white text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm">
              <Circle class="w-4 h-4" /> Add Circle
            </button>
            <div class="flex-1 flex flex-col items-center justify-center text-neutral-600 gap-2 text-center px-4 pointer-events-none">
              <Shapes class="w-8 h-8 opacity-50" />
              <span class="text-xs">Generate pristine<br/>vector graphics</span>
            </div>
          </div>
        </Show>
      </div>
      <div class="resizer resizer-r" id="resizer-left"></div>
    </aside>
  );
};

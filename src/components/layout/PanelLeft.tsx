import { Show, onMount, For, type Component } from 'solid-js';
import { Plus, Inbox, Type, Square, Circle, Shapes, Music, Image as ImageIcon, Film, Eye, Trash2 } from 'lucide-solid';
import { projectStore, setProjectStore, addMediaToPool, removeMediaFromPool } from '../../store/projectStore';
import { setupResizer } from '../../utils/resizer';

export const PanelLeft: Component = () => {
  let resizerRef: HTMLDivElement | undefined;

  onMount(() => {
    if (resizerRef) setupResizer(resizerRef, 'left');
  });

  const handleFileUpload = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (!input.files) return;
    
    Array.from(input.files).forEach(file => {
      const id = Math.random().toString(36).substring(2, 11);
      const url = URL.createObjectURL(file);
      const isImage = file.type.startsWith('image');
      const isAudio = file.type.startsWith('audio');
      
      if (isImage) {
        const img = new Image();
        img.src = url;
        img.onload = () => {
          addMediaToPool({
            id, file, url, name: file.name, type: 'image',
            duration: 5.0, origW: img.naturalWidth, origH: img.naturalHeight
          });
        };
      } else {
        const tempMedia = document.createElement(isAudio ? 'audio' : 'video');
        tempMedia.src = url;
        tempMedia.onloadedmetadata = () => {
          let safeDur = tempMedia.duration;
          if (!isFinite(safeDur) || isNaN(safeDur)) safeDur = 10.0;
          
          addMediaToPool({
            id, file, url, name: file.name, type: isAudio ? 'audio' : 'video',
            duration: safeDur,
            origW: isAudio ? 0 : (tempMedia as HTMLVideoElement).videoWidth,
            origH: isAudio ? 0 : (tempMedia as HTMLVideoElement).videoHeight
          });
        };
      }
    });
    input.value = '';
  };
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
            <input type="file" id="video-upload" accept="video/*,audio/*,image/*" class="hidden" multiple onChange={handleFileUpload} />
            <div class="space-y-2 flex-1 relative">
              <Show when={Object.keys(projectStore.mediaPool).length === 0}>
                <div class="absolute inset-0 flex flex-col items-center justify-center text-neutral-600 gap-2 pointer-events-none">
                  <Inbox class="w-8 h-8" />
                  <span class="text-xs">No media</span>
                </div>
              </Show>
              <div class="flex flex-col gap-2">
                <For each={Object.values(projectStore.mediaPool)}>
                  {(media) => (
                    <div class="bg-[#1e1e1e] border border-border p-2 rounded-lg flex items-center justify-between group hover:border-primary transition-colors relative">
                      <div class="flex items-center gap-2 overflow-hidden w-full">
                        <div class={`w-8 h-8 bg-background rounded flex items-center justify-center shrink-0 ${media.type === 'audio' ? 'text-indigo-400' : media.type === 'image' ? 'text-purple-400' : 'text-neutral-500'}`}>
                          <Show when={media.type === 'audio'}><Music class="w-4 h-4" /></Show>
                          <Show when={media.type === 'image'}><ImageIcon class="w-4 h-4" /></Show>
                          <Show when={media.type === 'video'}><Film class="w-4 h-4" /></Show>
                        </div>
                        <div class="flex flex-col overflow-hidden flex-1">
                          <span class="text-xs font-medium text-white truncate" title={media.name}>{media.name}</span>
                          <span class="text-[9px] text-neutral-500">{media.duration.toFixed(1)}s</span>
                        </div>
                        <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button class="p-1.5 bg-[#2a2a2a] hover:bg-primary text-neutral-300 hover:text-black rounded transition-colors" title="Add to Timeline">
                            <Plus class="w-3 h-3" />
                          </button>
                          <button class="p-1.5 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-neutral-300 hover:text-white rounded transition-colors" title="Preview & Trim">
                            <Eye class="w-3 h-3" />
                          </button>
                          <button onClick={() => removeMediaFromPool(media.id)} class="p-1.5 bg-[#2a2a2a] hover:bg-red-500 text-neutral-300 hover:text-white rounded transition-colors" title="Delete Media">
                            <Trash2 class="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </For>
              </div>
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
      <div ref={resizerRef} class="resizer resizer-r" id="resizer-left"></div>
    </aside>
  );
};

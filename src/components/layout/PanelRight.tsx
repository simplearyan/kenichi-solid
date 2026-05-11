import { onMount, For, Show, type Component } from 'solid-js';
import { Layers, Sliders, Eye, EyeOff, Lock, Unlock, Settings2, Music, Type, Square, Film, Image as ImageIcon } from 'lucide-solid';
import { projectStore, setProjectStore, updateLayer } from '../../store/projectStore';
import { setupResizer } from '../../utils/resizer';

export const PanelRight: Component = () => {
  let resizerRef: HTMLDivElement | undefined;

  onMount(() => {
    if (resizerRef) setupResizer(resizerRef, 'right');
  });

  const activeLayer = () => projectStore.activeLayerId ? projectStore.layers.find(l => l.id === projectStore.activeLayerId) : null;

  const handlePropChange = (key: string, value: any) => {
    if (projectStore.activeLayerId) {
      updateLayer(projectStore.activeLayerId, { [key]: value });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'video': return <Film class="w-3.5 h-3.5" />;
      case 'audio': return <Music class="w-3.5 h-3.5" />;
      case 'image': return <ImageIcon class="w-3.5 h-3.5" />;
      case 'text': return <Type class="w-3.5 h-3.5" />;
      case 'shape': return <Square class="w-3.5 h-3.5" />;
      default: return <Layers class="w-3.5 h-3.5" />;
    }
  };

  return (
    <div class="hidden md:flex w-[280px] lg:w-[320px] h-full glass-panel bg-surface border border-border rounded-xl flex-col overflow-hidden shrink-0 relative">
      <div ref={resizerRef} class="resizer resizer-l" id="resizer-right"></div>
      
      <div class="h-12 border-b border-border bg-[#1a1a1a] flex items-center p-1 shrink-0">
        <div class="flex bg-black p-1 rounded-lg w-full">
          <button 
            onClick={() => setProjectStore('rightPanelTab', 'layers')}
            class={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${projectStore.rightPanelTab === 'layers' ? 'bg-[#2a2a2a] text-white shadow-sm' : 'text-neutral-500 hover:text-white hover:bg-[#1e1e1e]'}`}
          >
            <Layers class="w-3.5 h-3.5" />
            Layers
          </button>
          <button 
            onClick={() => setProjectStore('rightPanelTab', 'props')}
            class={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${projectStore.rightPanelTab === 'props' ? 'bg-[#2a2a2a] text-white shadow-sm' : 'text-neutral-500 hover:text-white hover:bg-[#1e1e1e]'}`}
          >
            <Settings2 class="w-3.5 h-3.5" />
            Properties
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto custom-scrollbar">
        <Show when={projectStore.rightPanelTab === 'layers'}>
          <div class="flex flex-col p-2 gap-1">
            <Show when={projectStore.layers.length === 0}>
              <div class="text-xs text-neutral-500 text-center py-8">No layers yet.</div>
            </Show>
            <For each={[...projectStore.layers].reverse()}>
              {(layer) => (
                <div 
                  class={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors border ${projectStore.activeLayerId === layer.id ? 'bg-primary/10 border-primary/30' : 'bg-[#1a1a1a] border-transparent hover:bg-[#222]'}`}
                  onClick={() => setProjectStore('activeLayerId', layer.id)}
                >
                  <div class="text-neutral-400">
                    {getIcon(layer.type)}
                  </div>
                  <span class="text-xs text-white truncate flex-1">{layer.name}</span>
                  <div class="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { hidden: !layer.hidden }); }} class="text-neutral-500 hover:text-white">
                      {layer.hidden ? <EyeOff class="w-3.5 h-3.5" /> : <Eye class="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }); }} class="text-neutral-500 hover:text-white">
                      {layer.locked ? <Lock class="w-3.5 h-3.5" /> : <Unlock class="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>

        <Show when={projectStore.rightPanelTab === 'props'}>
          <div class="flex flex-col">
            <Show when={activeLayer()} fallback={
              <div class="text-xs text-neutral-500 text-center py-8 flex flex-col items-center gap-2">
                <Sliders class="w-6 h-6 opacity-50" />
                Select a layer to edit properties.
              </div>
            }>
              {/* Properties Form */}
              <div class="p-4 flex flex-col gap-6">
                
                {/* Transform Section */}
                <Show when={activeLayer()?.type !== 'audio'}>
                  <div class="space-y-4">
                    <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                      <div class="w-1 h-3 bg-primary rounded-full"></div> Transform
                    </h3>
                    
                    <div class="grid grid-cols-2 gap-4">
                      <div class="space-y-1">
                        <label class="text-[10px] text-neutral-500 uppercase tracking-wider">Scale</label>
                        <div class="flex items-center bg-[#1a1a1a] border border-[#333] rounded px-2">
                          <input type="number" step="0.01" value={activeLayer()?.scale} onInput={(e) => handlePropChange('scale', parseFloat(e.currentTarget.value))} class="w-full bg-transparent text-xs text-white py-1 outline-none" />
                        </div>
                      </div>
                      <div class="space-y-1">
                        <label class="text-[10px] text-neutral-500 uppercase tracking-wider">Rotation</label>
                        <div class="flex items-center bg-[#1a1a1a] border border-[#333] rounded px-2">
                          <input type="number" step="1" value={activeLayer()?.rotation} onInput={(e) => handlePropChange('rotation', parseFloat(e.currentTarget.value))} class="w-full bg-transparent text-xs text-white py-1 outline-none" />
                        </div>
                      </div>
                      <div class="space-y-1">
                        <label class="text-[10px] text-neutral-500 uppercase tracking-wider">Position X</label>
                        <div class="flex items-center bg-[#1a1a1a] border border-[#333] rounded px-2">
                          <input type="number" step="1" value={activeLayer()?.posX} onInput={(e) => handlePropChange('posX', parseFloat(e.currentTarget.value))} class="w-full bg-transparent text-xs text-white py-1 outline-none" />
                        </div>
                      </div>
                      <div class="space-y-1">
                        <label class="text-[10px] text-neutral-500 uppercase tracking-wider">Position Y</label>
                        <div class="flex items-center bg-[#1a1a1a] border border-[#333] rounded px-2">
                          <input type="number" step="1" value={activeLayer()?.posY} onInput={(e) => handlePropChange('posY', parseFloat(e.currentTarget.value))} class="w-full bg-transparent text-xs text-white py-1 outline-none" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pixel FX Section */}
                  <div class="space-y-4">
                    <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                      <div class="w-1 h-3 bg-[#05d590] rounded-full"></div> Pixel FX
                    </h3>
                    
                    <div class="space-y-3">
                      <div class="space-y-1">
                        <div class="flex justify-between items-center text-[10px] text-neutral-500 uppercase tracking-wider">
                          <label>Brightness</label>
                          <span>{activeLayer()?.brightness}</span>
                        </div>
                        <input type="range" min="0" max="3" step="0.1" value={activeLayer()?.brightness} onInput={(e) => handlePropChange('brightness', parseFloat(e.currentTarget.value))} class="w-full" />
                      </div>
                      <div class="space-y-1">
                        <div class="flex justify-between items-center text-[10px] text-neutral-500 uppercase tracking-wider">
                          <label>Contrast</label>
                          <span>{activeLayer()?.contrast}</span>
                        </div>
                        <input type="range" min="0" max="3" step="0.1" value={activeLayer()?.contrast} onInput={(e) => handlePropChange('contrast', parseFloat(e.currentTarget.value))} class="w-full" />
                      </div>
                      
                      <div class="p-3 bg-[#1a1a1a] border border-[#333] rounded-lg space-y-3">
                        <div class="flex items-center justify-between">
                          <label class="text-xs text-white font-medium">Chroma Key</label>
                          <input type="checkbox" checked={activeLayer()?.chromaKey} onChange={(e) => handlePropChange('chromaKey', e.currentTarget.checked)} class="accent-[#05d590]" />
                        </div>
                        <Show when={activeLayer()?.chromaKey}>
                          <div class="grid grid-cols-2 gap-2">
                            <div class="space-y-1">
                              <label class="text-[10px] text-neutral-500 uppercase">Key Color</label>
                              <input type="color" value={activeLayer()?.chromaColor} onInput={(e) => handlePropChange('chromaColor', e.currentTarget.value)} class="w-full h-8 cursor-pointer rounded bg-transparent" />
                            </div>
                            <div class="space-y-1">
                              <label class="text-[10px] text-neutral-500 uppercase">Tolerance</label>
                              <input type="number" step="0.05" min="0" max="1" value={activeLayer()?.chromaTolerance} onInput={(e) => handlePropChange('chromaTolerance', parseFloat(e.currentTarget.value))} class="w-full h-8 bg-[#222] border border-[#444] rounded text-white text-xs px-2" />
                            </div>
                          </div>
                        </Show>
                      </div>
                    </div>
                  </div>
                </Show>

                {/* Audio FX Section */}
                <Show when={activeLayer()?.type === 'video' || activeLayer()?.type === 'audio'}>
                  <div class="space-y-4">
                    <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                      <div class="w-1 h-3 bg-[#f59e0b] rounded-full"></div> Audio FX
                    </h3>
                    
                    <div class="space-y-3">
                      <div class="space-y-1">
                        <div class="flex justify-between items-center text-[10px] text-neutral-500 uppercase tracking-wider">
                          <label>Volume</label>
                          <span>{Math.round(activeLayer()!.volume * 100)}%</span>
                        </div>
                        <input type="range" min="0" max="2" step="0.05" value={activeLayer()?.volume} onInput={(e) => handlePropChange('volume', parseFloat(e.currentTarget.value))} class="w-full accent-[#f59e0b]" />
                      </div>

                      <div class="p-3 bg-[#1a1a1a] border border-[#333] rounded-lg space-y-3">
                        <div class="flex items-center justify-between">
                          <label class="text-xs text-white font-medium">Echo Delay</label>
                          <input type="checkbox" checked={activeLayer()?.echo} onChange={(e) => handlePropChange('echo', e.currentTarget.checked)} class="accent-[#f59e0b]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Show>
                
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
};

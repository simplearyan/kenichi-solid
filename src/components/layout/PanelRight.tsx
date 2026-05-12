import { type Component, onMount, For, Show } from 'solid-js';
import { Layers, Sliders, Eye, EyeOff, Lock, Unlock, Settings2, Music, Type, Square, Film, Image as ImageIcon } from 'lucide-solid';
import { projectStore, setProjectStore, updateLayer } from '../../store/projectStore';
import { setupResizer } from '../../utils/resizer';
import { AudioTrimView } from '../common/AudioTrimView';

export const PanelRight: Component = () => {
  let resizerRef: HTMLDivElement | undefined;

  onMount(() => {
    if (resizerRef) setupResizer(resizerRef, 'right');
  });

  const activeLayer = () => projectStore.activeLayerId ? projectStore.layers.find(l => l.id === projectStore.activeLayerId) : null;
  const media = () => {
    const l = activeLayer();
    return l?.mediaId ? projectStore.mediaPool[l.mediaId] : null;
  };

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
    <div class="hidden md:flex w-full h-full glass-panel bg-surface border border-border rounded-xl flex-col overflow-hidden shrink-0 relative">
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
          <div class="flex flex-col-reverse p-2 gap-1">
            <Show when={projectStore.layers.length === 0}>
              <div class="text-xs text-neutral-500 text-center py-8">No layers yet.</div>
            </Show>
            <For each={projectStore.layers}>
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
                  <div class="space-y-5">
                    <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                      <div class="w-1 h-3 bg-[#f59e0b] rounded-full"></div> Audio & Trimming
                    </h3>
                    
                    <div class="space-y-4">
                      {/* Advanced Trim View */}
                      <AudioTrimView layerId={activeLayer()!.id} />

                      <div class="grid grid-cols-2 gap-3">
                        <div class="space-y-1.5">
                          <label class="text-[10px] text-neutral-500 uppercase tracking-wider">Trim In (s)</label>
                          <div class="bg-[#1a1a1a] border border-[#333] rounded px-2">
                            <input 
                              type="number" 
                              step="0.01" 
                              min="0"
                              max={(media()?.duration || 0) - 0.1}
                              value={activeLayer()?.inPoint.toFixed(2)} 
                              onInput={(e) => {
                                const val = parseFloat(e.currentTarget.value);
                                const mediaDur = media()?.duration || 0;
                                const currentDur = activeLayer()?.duration || 0;
                                let newIn = Math.max(0, Math.min(mediaDur - 0.1, val));
                                // Adjust duration if we go past media end
                                let newDur = Math.min(currentDur, mediaDur - newIn);
                                updateLayer(activeLayer()!.id, { inPoint: newIn, duration: newDur });
                              }} 
                              class="w-full bg-transparent text-xs text-white py-1.5 outline-none" 
                            />
                          </div>
                        </div>
                        <div class="space-y-1.5">
                          <label class="text-[10px] text-neutral-500 uppercase tracking-wider">Trim Out (s)</label>
                          <div class="bg-[#1a1a1a] border border-[#333] rounded px-2">
                            <input 
                              type="number" 
                              step="0.01"
                              min="0"
                              max={(media()?.duration || 0) - (activeLayer()?.inPoint || 0) - 0.1}
                              value={( (media()?.duration || 0) - (activeLayer()?.inPoint || 0) - (activeLayer()?.duration || 0) ).toFixed(2)} 
                              onInput={(e) => {
                                const trimOut = parseFloat(e.currentTarget.value);
                                const mediaDur = media()?.duration || 0;
                                const inPoint = activeLayer()?.inPoint || 0;
                                let newDur = Math.max(0.1, mediaDur - inPoint - trimOut);
                                handlePropChange('duration', newDur);
                              }} 
                              class="w-full bg-transparent text-xs text-white py-1.5 outline-none" 
                            />
                          </div>
                        </div>
                      </div>

                      <div class="space-y-2">
                        <div class="flex justify-between items-center text-[10px] text-neutral-500 uppercase tracking-wider">
                          <label>Volume</label>
                          <span class="text-[#f59e0b] font-bold">{Math.round(activeLayer()!.volume * 100)}%</span>
                        </div>
                        <input type="range" min="0" max="2" step="0.05" value={activeLayer()?.volume} onInput={(e) => handlePropChange('volume', parseFloat(e.currentTarget.value))} class="w-full accent-[#f59e0b]" />
                      </div>

                      <div class="grid grid-cols-2 gap-3 pt-2">
                        <div class="space-y-1.5">
                          <label class="text-[10px] text-neutral-500 uppercase tracking-wider">Waveform Style</label>
                          <select value={activeLayer()?.waveformStyle || 'standard'} onChange={(e) => handlePropChange('waveformStyle', e.currentTarget.value)} class="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-xs text-white outline-none">
                            <option value="standard">Standard</option>
                            <option value="viz">Viz</option>
                          </select>
                        </div>
                        <div class="space-y-1.5">
                          <label class="text-[10px] text-neutral-500 uppercase tracking-wider">Appearance Mode</label>
                          <select value={activeLayer()?.audioAppearance || 'waveform'} onChange={(e) => handlePropChange('audioAppearance', e.currentTarget.value)} class="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-xs text-white outline-none">
                            <option value="waveform">Waveform</option>
                            <option value="clip">Clip</option>
                          </select>
                        </div>
                      </div>

                      <div class="grid grid-cols-2 gap-3 pt-1">
                        <div class="space-y-1.5">
                          <label class="text-[10px] text-neutral-500 uppercase tracking-wider">Clip Color</label>
                          <div class="flex items-center gap-2 bg-[#1a1a1a] border border-[#333] rounded p-1">
                            <input type="color" value={activeLayer()?.clipColor || (activeLayer()?.type === 'audio' ? '#059669' : '#2563eb')} onInput={(e) => handlePropChange('clipColor', e.currentTarget.value)} class="w-full h-6 rounded cursor-pointer bg-transparent border-none" />
                          </div>
                        </div>
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

                {/* Text Formatting Section */}
                <Show when={activeLayer()?.type === 'text'}>
                  <div class="space-y-4">
                    <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                      <div class="w-1 h-3 bg-indigo-500 rounded-full"></div> Text Formatting
                    </h3>
                    
                    <div class="space-y-3">
                      <div class="space-y-1">
                        <label class="text-[10px] text-neutral-500 uppercase tracking-wider">Content</label>
                        <input type="text" value={activeLayer()?.textContent || ''} onInput={(e) => handlePropChange('textContent', e.currentTarget.value)} class="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-xs text-white outline-none" />
                      </div>
                      
                      <div class="grid grid-cols-2 gap-2">
                        <div class="space-y-1">
                          <label class="text-[10px] text-neutral-500 uppercase tracking-wider">Font Family</label>
                          <select value={activeLayer()?.fontFamily} onChange={(e) => handlePropChange('fontFamily', e.currentTarget.value)} class="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-xs text-white outline-none">
                            <option value="Inter">Inter</option>
                            <option value="Space Grotesk">Space Grotesk</option>
                            <option value="Montserrat">Montserrat</option>
                            <option value="Outfit">Outfit</option>
                            <option value="Plus Jakarta Sans">Plus Jakarta</option>
                            <option value="Rubik">Rubik</option>
                            <option value="Roboto">Roboto</option>
                            <option value="Playfair Display">Playfair Display</option>
                            <option value="Barlow Condensed">Barlow Cond</option>
                            <option value="JetBrains Mono">JetBrains Mono</option>
                          </select>
                        </div>
                        <div class="space-y-1">
                          <label class="text-[10px] text-neutral-500 uppercase tracking-wider">Weight</label>
                          <select value={activeLayer()?.fontWeight} onChange={(e) => handlePropChange('fontWeight', e.currentTarget.value)} class="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-xs text-white outline-none">
                            <option value="400">Regular</option>
                            <option value="500">Medium</option>
                            <option value="600">SemiBold</option>
                            <option value="700">Bold</option>
                            <option value="800">ExtraBold</option>
                          </select>
                        </div>
                      </div>

                      <div class="grid grid-cols-2 gap-2">
                        <div class="space-y-1">
                          <label class="text-[10px] text-neutral-500 uppercase tracking-wider">Size</label>
                          <input type="number" value={activeLayer()?.fontSize} onInput={(e) => handlePropChange('fontSize', parseFloat(e.currentTarget.value))} class="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-xs text-white outline-none" />
                        </div>
                        <div class="space-y-1">
                          <label class="text-[10px] text-neutral-500 uppercase tracking-wider">Spacing</label>
                          <input type="number" step="1" value={activeLayer()?.letterSpacing} onInput={(e) => handlePropChange('letterSpacing', parseFloat(e.currentTarget.value))} class="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-xs text-white outline-none" />
                        </div>
                      </div>

                      <div class="flex items-center justify-between p-2 bg-[#1a1a1a] border border-[#333] rounded-lg">
                        <label class="text-xs text-white font-medium">Text Color</label>
                        <input type="color" value={activeLayer()?.fillColor || '#ffffff'} onInput={(e) => handlePropChange('fillColor', e.currentTarget.value)} class="w-8 h-8 rounded cursor-pointer bg-transparent border-none" />
                      </div>
                      
                      <div class="flex items-center justify-between p-2 bg-[#1a1a1a] border border-[#333] rounded-lg">
                        <label class="text-xs text-white font-medium">Drop Shadow</label>
                        <input type="checkbox" checked={activeLayer()?.dropShadow} onChange={(e) => handlePropChange('dropShadow', e.currentTarget.checked)} class="accent-indigo-500" />
                      </div>
                    </div>
                  </div>
                </Show>

                {/* Animation FX Section */}
                <div class="space-y-4">
                  <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                    <div class="w-1 h-3 bg-pink-500 rounded-full"></div> Animation FX
                  </h3>
                  
                  <div class="space-y-3">
                    <div class="grid grid-cols-2 gap-2">
                      <div class="space-y-1">
                        <label class="text-[10px] text-neutral-500 uppercase tracking-wider">In Anim</label>
                        <select value={activeLayer()?.animIn || 'none'} onChange={(e) => handlePropChange('animIn', e.currentTarget.value)} class="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-xs text-white outline-none">
                          <option value="none">None</option>
                          <option value="fade">Fade In</option>
                          <option value="slideLeft">Slide Left</option>
                          <option value="zoomIn">Zoom In</option>
                          <option value="rotateIn">Rotate In</option>
                        </select>
                      </div>
                      <div class="space-y-1">
                        <label class="text-[10px] text-neutral-500 uppercase tracking-wider">Duration</label>
                        <input type="number" step="0.1" min="0.1" max="5.0" value={activeLayer()?.animInDuration || 1.0} onInput={(e) => handlePropChange('animInDuration', parseFloat(e.currentTarget.value))} class="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-xs text-white outline-none" />
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                      <div class="space-y-1">
                        <label class="text-[10px] text-neutral-500 uppercase tracking-wider">Out Anim</label>
                        <select value={activeLayer()?.animOut || 'none'} onChange={(e) => handlePropChange('animOut', e.currentTarget.value)} class="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-xs text-white outline-none">
                          <option value="none">None</option>
                          <option value="fade">Fade Out</option>
                          <option value="slideRight">Slide Right</option>
                          <option value="zoomOut">Zoom Out</option>
                          <option value="rotateOut">Rotate Out</option>
                        </select>
                      </div>
                      <div class="space-y-1">
                        <label class="text-[10px] text-neutral-500 uppercase tracking-wider">Duration</label>
                        <input type="number" step="0.1" min="0.1" max="5.0" value={activeLayer()?.animOutDuration || 1.0} onInput={(e) => handlePropChange('animOutDuration', parseFloat(e.currentTarget.value))} class="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-xs text-white outline-none" />
                      </div>
                    </div>

                    <div class="space-y-1">
                      <label class="text-[10px] text-neutral-500 uppercase tracking-wider">Loop Anim</label>
                      <select value={activeLayer()?.animLoop || 'none'} onChange={(e) => handlePropChange('animLoop', e.currentTarget.value)} class="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-xs text-white outline-none">
                        <option value="none">None</option>
                        <option value="pulse">Pulse</option>
                        <option value="wiggle">Wiggle</option>
                        <option value="float">Float</option>
                      </select>
                    </div>
                  </div>
                </div>
                
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
};

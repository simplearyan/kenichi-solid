import { type Component, onMount, For, Show, createSignal, createMemo } from 'solid-js';
import { 
  Layers, Sliders, Eye, EyeOff, Lock, Unlock, Settings2, Music, Type, 
  Square, Film, Image as ImageIcon, ChevronUp, ChevronDown, 
  Maximize, Zap, PlayCircle, ChevronRight 
} from 'lucide-solid';
import { projectStore, setProjectStore, updateLayer, moveTrack } from '../../store/projectStore';
import { setupResizer } from '../../utils/resizer';
import { AudioTrimView } from '../common/AudioTrimView';

const PropSlider: Component<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  color?: string;
  onChange: (val: number) => void;
}> = (props) => {
  let trackRef!: HTMLDivElement;

  const handlePointerDown = (e: PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    updateValue(e);

    const onPointerMove = (moveEvent: PointerEvent) => updateValue(moveEvent);
    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const updateValue = (e: PointerEvent) => {
    const rect = trackRef.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const rawVal = props.min + percent * (props.max - props.min);
    const steppedVal = Math.round(rawVal / props.step) * props.step;
    props.onChange(Number(steppedVal.toFixed(2)));
  };

  const progress = () => ((props.value - props.min) / (props.max - props.min)) * 100;

  return (
    <div class="space-y-2 group/slider">
      <div class="flex justify-between items-center text-[10px] text-neutral-500 uppercase tracking-widest font-bold">
        <label class="group-hover/slider:text-neutral-300 transition-colors">{props.label}</label>
        <span class={`${props.color || 'text-primary'} font-mono bg-white/5 px-1.5 py-0.5 rounded`}>{props.value}</span>
      </div>
      <div 
        ref={trackRef}
        class="relative h-1.5 bg-white/5 rounded-full cursor-pointer touch-none"
        onPointerDown={handlePointerDown}
      >
        <div 
          class={`absolute top-0 left-0 h-full rounded-full transition-all duration-75 ${props.color || 'bg-primary'}`}
          style={{ width: `${progress()}%` }}
        />
        <div 
          class="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.3)] border-2 border-surface transition-transform duration-150 active:scale-125"
          style={{ left: `calc(${progress()}% - 7px)` }}
        />
      </div>
    </div>
  );
};

const Section: Component<{
  title: string;
  icon: any;
  color?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: any;
  showOnMobile?: boolean;
}> = (props) => {
  return (
    <div class={`flex flex-col border-b border-white/[0.03] last:border-b-0 ${props.showOnMobile ? 'block' : 'hidden md:block'}`}>
      <button 
        onClick={props.onToggle}
        class={`flex items-center justify-between p-4 transition-colors group ${props.isOpen ? 'bg-white/[0.02]' : 'hover:bg-white/[0.04]'}`}
      >
        <div class="flex items-center gap-3">
          <div class={`transition-colors ${props.isOpen ? (props.color?.replace('bg-', 'text-') || 'text-primary') : 'text-neutral-500 group-hover:text-neutral-300'}`}>
            {props.icon}
          </div>
          <span class={`text-[10px] font-black uppercase tracking-[0.15em] transition-colors ${props.isOpen ? 'text-white' : 'text-neutral-500 group-hover:text-neutral-300'}`}>
            {props.title}
          </span>
        </div>
        <div class={`text-neutral-600 transition-transform ${props.isOpen ? 'rotate-90 text-neutral-400' : 'group-hover:text-neutral-400'}`}>
          <ChevronRight class="w-3.5 h-3.5" />
        </div>
      </button>
      <Show when={props.isOpen}>
        <div class="px-4 pb-6 pt-2">
          {props.children}
        </div>
      </Show>
    </div>
  );
};

export const PanelRight: Component = () => {
  let resizerRef: HTMLDivElement | undefined;
  const [activePropTab, setActivePropTab] = createSignal('transform');
  const [collapsed, setCollapsed] = createSignal<Record<string, boolean>>({
    transform: true,
    fx: true,
    audio: true,
    text: true,
    anim: true
  });

  const toggleSection = (id: string) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  };

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

  const categories = createMemo(() => {
    const layer = activeLayer();
    if (!layer) return [];
    
    const tabs = [
      { id: 'transform', name: 'Transform', icon: <Maximize class="w-3.5 h-3.5" /> },
    ];

    if (layer.type !== 'audio' && layer.type !== 'text') {
      tabs.push({ id: 'fx', name: 'Effects', icon: <Zap class="w-3.5 h-3.5" /> });
    }

    if (layer.type === 'video' || layer.type === 'audio') {
      tabs.push({ id: 'audio', name: 'Audio', icon: <Music class="w-3.5 h-3.5" /> });
    }

    if (layer.type === 'text') {
      tabs.push({ id: 'text', name: 'Text', icon: <Type class="w-3.5 h-3.5" /> });
    }

    tabs.push({ id: 'anim', name: 'Anim', icon: <PlayCircle class="w-3.5 h-3.5" /> });

    return tabs;
  });

  const isMobile = () => window.innerWidth < 768;

  return (
    <div class="flex w-full h-full glass-panel bg-surface border border-border rounded-xl flex-col overflow-hidden shrink-0 relative">
      <div ref={resizerRef} class="resizer resizer-l" id="resizer-right"></div>
      
      {/* Internal Toggle - Hidden on Mobile because global nav handles it */}
      <div class="hidden md:flex h-12 border-b border-border bg-[#1a1a1a] items-center p-1 shrink-0">
        <div class="flex bg-black p-1 rounded-lg w-full">
            <button 
            onClick={() => setProjectStore('rightPanelTab', 'layers')}
            class={`flex-1 flex items-center justify-center gap-2 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${projectStore.rightPanelTab === 'layers' ? 'bg-[#2a2a2a] text-white shadow-sm' : 'text-neutral-500 hover:text-white hover:bg-[#1e1e1e]'}`}
          >
            <Layers class="w-3.5 h-3.5" />
            Clips
          </button>
          <button 
            onClick={() => setProjectStore('rightPanelTab', 'props')}
            class={`flex-1 flex items-center justify-center gap-2 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${projectStore.rightPanelTab === 'props' ? 'bg-[#2a2a2a] text-white shadow-sm' : 'text-neutral-500 hover:text-white hover:bg-[#1e1e1e]'}`}
          >
            <Settings2 class="w-3.5 h-3.5" />
            Props
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto custom-scrollbar">
        {/* Clips Content */}
        <Show when={isMobile() ? projectStore.mobileTab === 'clips' : projectStore.rightPanelTab === 'layers'}>
          <div class="flex flex-col p-2 gap-4">
            <Show when={projectStore.layers.length === 0}>
              <div class="text-xs text-neutral-500 text-center py-8">No clips on timeline.</div>
            </Show>
            
            <For each={projectStore.tracks}>
              {(track) => (
                <div class="space-y-1">
                  <div class="flex items-center gap-2 px-1 py-1 text-[10px] font-bold text-neutral-500 uppercase tracking-widest border-b border-border/30 mb-2 group">
                    <span class="truncate">{track.name}</span>
                    <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                      <button onClick={(e) => { e.stopPropagation(); moveTrack(track.id, 'up'); }} class="hover:text-white transition-colors" title="Move Track Up"><ChevronUp class="w-3 h-3" /></button>
                      <button onClick={(e) => { e.stopPropagation(); moveTrack(track.id, 'down'); }} class="hover:text-white transition-colors" title="Move Track Down"><ChevronDown class="w-3 h-3" /></button>
                    </div>
                    <div class="flex-1 h-[1px] bg-border/20"></div>
                  </div>
                  
                  <div class="flex flex-col gap-1 pl-1">
                    <For each={projectStore.layers.filter(l => l.trackId === track.id)}>
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
                    <Show when={projectStore.layers.filter(l => l.trackId === track.id).length === 0}>
                       <div class="text-[10px] text-neutral-600 italic pl-2 py-1">Empty track</div>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>

        {/* Properties Content */}
        <Show when={isMobile() ? projectStore.mobileTab === 'props' : projectStore.rightPanelTab === 'props'}>
          <div class="flex flex-col h-full">
            <Show when={activeLayer()} fallback={
              <div class="text-xs text-neutral-500 text-center py-8 flex flex-col items-center gap-2">
                <Sliders class="w-6 h-6 opacity-50" />
                Select a layer to edit properties.
              </div>
            }>
              {/* Mobile Category Tab Bar */}
              <div class="flex md:hidden border-b border-border bg-black/20 overflow-x-auto no-scrollbar shrink-0">
                <For each={categories()}>
                  {(cat) => (
                    <button 
                      onClick={() => setActivePropTab(cat.id)}
                      class={`flex flex-col items-center gap-1.5 px-5 py-3 transition-all min-w-[70px] ${activePropTab() === cat.id ? 'text-primary' : 'text-neutral-500'}`}
                    >
                      {cat.icon}
                      <span class="text-[9px] font-bold uppercase tracking-tighter">{cat.name}</span>
                      <div class={`h-0.5 w-full rounded-full bg-primary mt-1 transition-all ${activePropTab() === cat.id ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`}></div>
                    </button>
                  )}
                </For>
              </div>

              {/* Accordion List */}
              <div class="flex flex-col h-full">
                
                {/* Transform Section */}
                <Section 
                  title="Transform" 
                  icon={<Maximize class="w-3.5 h-3.5" />} 
                  isOpen={collapsed().transform} 
                  onToggle={() => toggleSection('transform')}
                  showOnMobile={activePropTab() === 'transform'}
                >
                   <div class="space-y-5">
                      <PropSlider 
                        label="Scale"
                        value={activeLayer()?.scale || 1}
                        min={0} max={5} step={0.05}
                        onChange={(v) => handlePropChange('scale', v)}
                      />
                      <PropSlider 
                        label="Rotation"
                        value={activeLayer()?.rotation || 0}
                        min={0} max={360} step={1}
                        onChange={(v) => handlePropChange('rotation', v)}
                      />
                      
                      <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1">
                          <label class="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Position X</label>
                          <div class="flex items-center bg-black/40 border border-white/5 rounded-lg px-2 group-hover:border-white/10 focus-within:border-primary/50 transition-colors">
                            <input type="number" step="1" value={activeLayer()?.posX} onInput={(e) => handlePropChange('posX', parseFloat(e.currentTarget.value))} class="w-full bg-transparent text-xs text-white py-2 outline-none font-mono" />
                          </div>
                        </div>
                        <div class="space-y-1">
                          <label class="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Position Y</label>
                          <div class="flex items-center bg-black/40 border border-white/5 rounded-lg px-2 group-hover:border-white/10 focus-within:border-primary/50 transition-colors">
                            <input type="number" step="1" value={activeLayer()?.posY} onInput={(e) => handlePropChange('posY', parseFloat(e.currentTarget.value))} class="w-full bg-transparent text-xs text-white py-2 outline-none font-mono" />
                          </div>
                        </div>
                      </div>
                    </div>
                </Section>

                {/* Pixel FX Section */}
                <Show when={activeLayer()?.type !== 'audio' && activeLayer()?.type !== 'text'}>
                  <Section 
                    title="Pixel FX" 
                    icon={<Zap class="w-3.5 h-3.5" />} 
                    color="bg-[#05d590]"
                    isOpen={collapsed().fx} 
                    onToggle={() => toggleSection('fx')}
                    showOnMobile={activePropTab() === 'fx'}
                  >
                    <div class="space-y-5">
                      <PropSlider 
                        label="Brightness"
                        value={activeLayer()?.brightness || 1}
                        min={0} max={3} step={0.1}
                        onChange={(v) => handlePropChange('brightness', v)}
                      />
                      <PropSlider 
                        label="Contrast"
                        value={activeLayer()?.contrast || 1}
                        min={0} max={3} step={0.1}
                        onChange={(v) => handlePropChange('contrast', v)}
                      />
                      
                      <div class="p-4 bg-black/20 border border-white/5 rounded-xl space-y-4">
                        <div class="flex items-center justify-between">
                          <label class="text-[10px] text-white font-black uppercase tracking-widest">Chroma Key</label>
                          <button 
                            onClick={() => handlePropChange('chromaKey', !activeLayer()?.chromaKey)}
                            class={`w-8 h-4 rounded-full transition-colors relative ${activeLayer()?.chromaKey ? 'bg-primary' : 'bg-white/10'}`}
                          >
                            <div class={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${activeLayer()?.chromaKey ? 'left-4.5' : 'left-0.5'}`} />
                          </button>
                        </div>
                        <Show when={activeLayer()?.chromaKey}>
                          <div class="grid grid-cols-2 gap-4">
                            <div class="space-y-1">
                              <label class="text-[9px] text-neutral-500 uppercase tracking-widest font-bold">Key Color</label>
                              <input type="color" value={activeLayer()?.chromaColor} onInput={(e) => handlePropChange('chromaColor', e.currentTarget.value)} class="w-full h-8 cursor-pointer rounded-lg bg-white/5 border-none p-1" />
                            </div>
                            <div class="space-y-1">
                              <label class="text-[9px] text-neutral-500 uppercase tracking-widest font-bold">Tolerance</label>
                              <input type="number" step="0.05" min="0" max="1" value={activeLayer()?.chromaTolerance} onInput={(e) => handlePropChange('chromaTolerance', parseFloat(e.currentTarget.value))} class="w-full h-8 bg-black/40 border border-white/5 rounded-lg text-white text-xs px-2 font-mono outline-none focus:border-primary/50" />
                            </div>
                          </div>
                        </Show>
                      </div>
                    </div>
                  </Section>
                </Show>

                {/* Audio FX Section */}
                <Show when={activeLayer()?.type === 'video' || activeLayer()?.type === 'audio'}>
                  <Section 
                    title="Audio & Trimming" 
                    icon={<Music class="w-3.5 h-3.5" />} 
                    color="bg-[#f59e0b]"
                    isOpen={collapsed().audio} 
                    onToggle={() => toggleSection('audio')}
                    showOnMobile={activePropTab() === 'audio'}
                  >
                    <div class="space-y-6">
                      <AudioTrimView layerId={activeLayer()!.id} />

                      <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1">
                          <label class="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Trim In (s)</label>
                          <div class="bg-black/40 border border-white/5 rounded-lg px-2">
                            <input 
                              type="number" 
                              step="0.01" 
                              value={activeLayer()?.inPoint.toFixed(2)} 
                              onInput={(e) => updateLayer(activeLayer()!.id, { inPoint: parseFloat(e.currentTarget.value) })} 
                              class="w-full bg-transparent text-xs text-white py-2 outline-none font-mono" 
                            />
                          </div>
                        </div>
                        <div class="space-y-1">
                          <label class="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Duration (s)</label>
                          <div class="bg-black/40 border border-white/5 rounded-lg px-2">
                            <input 
                              type="number" 
                              step="0.01"
                              value={activeLayer()?.duration.toFixed(2)} 
                              onInput={(e) => handlePropChange('duration', parseFloat(e.currentTarget.value))} 
                              class="w-full bg-transparent text-xs text-white py-2 outline-none font-mono" 
                            />
                          </div>
                        </div>
                      </div>

                      <PropSlider 
                        label="Volume"
                        value={Math.round((activeLayer()?.volume || 1) * 100)}
                        min={0} max={200} step={1}
                        color="text-[#f59e0b]"
                        onChange={(v) => handlePropChange('volume', v / 100)}
                      />

                      <div class="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-xl">
                        <label class="text-[10px] text-white font-black uppercase tracking-widest">Clip Color</label>
                        <input type="color" value={activeLayer()?.clipColor || '#05d590'} onInput={(e) => handlePropChange('clipColor', e.currentTarget.value)} class="w-10 h-6 rounded cursor-pointer bg-white/5 border-none p-0.5" />
                      </div>
                    </div>
                  </Section>
                </Show>

                {/* Text Formatting Section */}
                <Show when={activeLayer()?.type === 'text'}>
                  <Section 
                    title="Text Style" 
                    icon={<Type class="w-3.5 h-3.5" />} 
                    color="bg-indigo-500"
                    isOpen={collapsed().text} 
                    onToggle={() => toggleSection('text')}
                    showOnMobile={activePropTab() === 'text'}
                  >
                    <div class="space-y-5">
                      <div class="space-y-1.5">
                        <label class="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Content</label>
                        <textarea value={activeLayer()?.textContent || ''} onInput={(e) => handlePropChange('textContent', e.currentTarget.value)} class="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-3 text-sm text-white outline-none min-h-[80px] focus:border-indigo-500/50 transition-colors" />
                      </div>
                      
                      <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1.5">
                          <label class="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Font</label>
                          <select value={activeLayer()?.fontFamily} onChange={(e) => handlePropChange('fontFamily', e.currentTarget.value)} class="w-full bg-black/40 border border-white/5 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-indigo-500/50">
                            <option value="Inter">Inter</option>
                            <option value="Outfit">Outfit</option>
                            <option value="Rubik">Rubik</option>
                            <option value="JetBrains Mono">JetBrains Mono</option>
                          </select>
                        </div>
                        <div class="space-y-1.5">
                          <label class="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Size</label>
                          <input type="number" value={activeLayer()?.fontSize} onInput={(e) => handlePropChange('fontSize', parseFloat(e.currentTarget.value))} class="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono focus:border-indigo-500/50" />
                        </div>
                      </div>

                      <div class="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-xl">
                        <label class="text-[10px] text-white font-black uppercase tracking-widest">Text Color</label>
                        <input type="color" value={activeLayer()?.fillColor || '#ffffff'} onInput={(e) => handlePropChange('fillColor', e.currentTarget.value)} class="w-10 h-6 rounded cursor-pointer bg-white/5 border-none p-0.5" />
                      </div>
                    </div>
                  </Section>
                </Show>

                {/* Animation FX Section */}
                <Section 
                  title="Animation FX" 
                  icon={<PlayCircle class="w-3.5 h-3.5" />} 
                  color="bg-pink-500"
                  isOpen={collapsed().anim} 
                  onToggle={() => toggleSection('anim')}
                  showOnMobile={activePropTab() === 'anim'}
                >
                  <div class="space-y-5">
                    <div class="grid grid-cols-2 gap-4">
                      <div class="space-y-1.5">
                        <label class="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">In Anim</label>
                        <select value={activeLayer()?.animIn || 'none'} onChange={(e) => handlePropChange('animIn', e.currentTarget.value)} class="w-full bg-black/40 border border-white/5 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-pink-500/50">
                          <option value="none">None</option>
                          <option value="fade">Fade In</option>
                          <option value="zoomIn">Zoom In</option>
                          <option value="slideLeft">Slide Left</option>
                        </select>
                      </div>
                      <div class="space-y-1.5">
                        <label class="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Duration</label>
                        <input type="number" step="0.1" value={activeLayer()?.animInDuration || 1.0} onInput={(e) => handlePropChange('animInDuration', parseFloat(e.currentTarget.value))} class="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono focus:border-pink-500/50" />
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                      <div class="space-y-1.5">
                        <label class="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Out Anim</label>
                        <select value={activeLayer()?.animOut || 'none'} onChange={(e) => handlePropChange('animOut', e.currentTarget.value)} class="w-full bg-black/40 border border-white/5 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-pink-500/50">
                          <option value="none">None</option>
                          <option value="fade">Fade Out</option>
                          <option value="zoomOut">Zoom Out</option>
                          <option value="rotateOut">Rotate Out</option>
                          <option value="slideRight">Slide Right</option>
                        </select>
                      </div>
                      <div class="space-y-1.5">
                        <label class="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Duration</label>
                        <input type="number" step="0.1" value={activeLayer()?.animOutDuration || 1.0} onInput={(e) => handlePropChange('animOutDuration', parseFloat(e.currentTarget.value))} class="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono focus:border-pink-500/50" />
                      </div>
                    </div>

                    <div class="space-y-1.5">
                      <label class="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Loop Anim</label>
                      <select value={activeLayer()?.animLoop || 'none'} onChange={(e) => handlePropChange('animLoop', e.currentTarget.value)} class="w-full bg-black/40 border border-white/5 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-pink-500/50">
                        <option value="none">None</option>
                        <option value="pulse">Pulse (Scale)</option>
                        <option value="wiggle">Wiggle (Rotation)</option>
                        <option value="float">Float (Y-Axis)</option>
                      </select>
                    </div>
                  </div>
                </Section>
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
};

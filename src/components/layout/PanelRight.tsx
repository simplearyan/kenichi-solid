import { type Component, onMount, For, Show, createSignal, createMemo } from 'solid-js';
import { 
  Layers, Sliders, Eye, EyeOff, Lock, Unlock, Settings2, Music, Type, 
  Square, Film, Image as ImageIcon, ChevronUp, ChevronDown, 
  Maximize, Zap, PlayCircle, ChevronRight, Palette
} from 'lucide-solid';
import { projectStore, setProjectStore, updateLayer, moveTrack } from '../../store/projectStore';
import { setupResizer } from '../../utils/resizer';
import { AudioTrimView } from '../common/AudioTrimView';

const PropSelect: Component<{
  label?: string;
  value: string | number;
  options: { label: string; value: string | number }[];
  onChange: (val: any) => void;
  class?: string;
}> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  let containerRef!: HTMLDivElement;

  const currentLabel = () => props.options.find(o => o.value === props.value)?.label || props.value;

  const handleOutsideClick = (e: MouseEvent) => {
    if (containerRef && !containerRef.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  onMount(() => {
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  });

  return (
    <div class={`space-y-1.5 relative ${props.class || ''}`} ref={containerRef}>
      <Show when={props.label}>
        <label class="text-[10px] text-neutral-500 uppercase tracking-widest font-bold ml-0.5">{props.label}</label>
      </Show>
      <button 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen()); }}
        class="w-full h-10 bg-black/40 border border-white/5 hover:border-white/10 hover:bg-black/60 rounded-xl px-3.5 flex items-center justify-between text-xs text-white transition-all outline-none focus:border-primary/50"
      >
        <span class="truncate font-medium">{currentLabel()}</span>
        <ChevronDown class={`w-3.5 h-3.5 text-neutral-500 transition-transform duration-200 ${isOpen() ? 'rotate-180' : ''}`} />
      </button>

      <Show when={isOpen()}>
        <div class="absolute left-0 right-0 top-full mt-1.5 bg-[#141414] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1.5 animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-xl">
          <For each={props.options}>
            {(opt) => (
              <button 
                onClick={() => { props.onChange(opt.value); setIsOpen(false); }}
                class={`w-full px-3.5 py-2.5 text-left text-xs transition-colors flex items-center justify-between ${props.value === opt.value ? 'bg-primary/10 text-primary font-bold' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
              >
                {opt.label}
                <Show when={props.value === opt.value}>
                  <div class="w-1.5 h-1.5 rounded-full bg-primary" />
                </Show>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

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
    
    const tabs = [];

    if (layer.type !== 'audio') {
      tabs.push({ id: 'transform', name: 'Transform', icon: <Maximize class="w-3.5 h-3.5" /> });
      tabs.push({ id: 'style', name: 'Styles', icon: <Palette class="w-3.5 h-3.5" /> });
    }

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
          <button 
            onClick={() => setProjectStore('rightPanelTab', 'project')}
            class={`flex-1 flex items-center justify-center gap-2 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${projectStore.rightPanelTab === 'project' ? 'bg-[#2a2a2a] text-white shadow-sm' : 'text-neutral-500 hover:text-white hover:bg-[#1e1e1e]'}`}
          >
            <Settings2 class="w-3.5 h-3.5" />
            Project
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto custom-scrollbar">
        {/* Project Content */}
        <Show when={isMobile() ? projectStore.mobileTab === 'props' && activePropTab() === 'project' : projectStore.rightPanelTab === 'project'}>
          <div class="flex flex-col h-full overflow-y-auto p-4 md:p-6 custom-scrollbar space-y-6">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                <Settings2 class="w-4 h-4" />
              </div>
              <div>
                <h2 class="text-sm font-black text-white uppercase tracking-tighter">Project Settings</h2>
                <p class="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Global configuration</p>
              </div>
            </div>

            <Section 
              title="Canvas Background" 
              icon={<Palette class="w-3.5 h-3.5" />} 
              color="bg-primary"
              isOpen={true} 
              onToggle={() => {}}
            >
              <div class="space-y-4 pt-1">
                <div class="grid grid-cols-6 gap-2">
                  <button 
                    onClick={() => setProjectStore('canvasBackground', 'transparent')}
                    class={`aspect-square rounded-lg border-2 transition-all relative overflow-hidden bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiMzMzMiLz48cmVjdCB4PSI0IiB5PSI0IiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMzMzIi8+PC9zdmc+')] ${projectStore.canvasBackground === 'transparent' ? 'border-primary' : 'border-white/5 hover:border-white/20'}`}
                    title="Transparent"
                  />
                  <For each={[
                    { name: 'Black', color: '#000000' },
                    { name: 'Dark Gray', color: '#1a1a1a' },
                    { name: 'Red', color: '#ff3366' },
                    { name: 'Yellow', color: '#ffcc00' },
                    { name: 'Green', color: '#05d590' }
                  ]}>
                    {(preset) => (
                      <button 
                        onClick={() => setProjectStore('canvasBackground', preset.color)}
                        class={`aspect-square rounded-lg border-2 transition-all ${projectStore.canvasBackground === preset.color ? 'border-primary' : 'border-white/5 hover:border-white/20'}`}
                        style={{ "background-color": preset.color }}
                        title={preset.name}
                      />
                    )}
                  </For>
                </div>
                
                <div class="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl">
                  <div class="flex items-center gap-2">
                    <label class="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Custom Color</label>
                    <span class="text-[10px] text-white font-mono opacity-50 uppercase">{projectStore.canvasBackground}</span>
                  </div>
                  <input 
                    type="color" 
                    value={projectStore.canvasBackground === 'transparent' ? '#000000' : projectStore.canvasBackground} 
                    onInput={(e) => setProjectStore('canvasBackground', e.currentTarget.value)} 
                    class="w-8 h-5 rounded cursor-pointer bg-transparent border-none p-0" 
                  />
                </div>
              </div>
            </Section>
          </div>
        </Show>

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
                <Show when={activeLayer()?.type !== 'audio'}>
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
                </Show>

                {/* Styles Section */}
                <Show when={activeLayer()?.type !== 'audio'}>
                  <Section 
                    title="Styles" 
                    icon={<Palette class="w-3.5 h-3.5" />} 
                    color="bg-indigo-500"
                    isOpen={collapsed().style} 
                    onToggle={() => toggleSection('style')}
                    showOnMobile={activePropTab() === 'style'}
                  >
                    <div class="space-y-5">
                      <Show when={activeLayer()?.type !== 'text'}>
                        <PropSlider 
                          label="Border Radius"
                          value={activeLayer()?.borderRadius || 0}
                          min={0} max={200} step={1}
                          onChange={(v) => handlePropChange('borderRadius', v)}
                        />
                      </Show>

                      <div class="space-y-4 pt-2 border-t border-white/5">
                        <div class="flex items-center justify-between">
                          <label class="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Drop Shadow</label>
                          <button 
                            onClick={() => handlePropChange('shadowEnabled', !activeLayer()?.shadowEnabled)}
                            class={`w-8 h-4 rounded-full transition-colors relative ${activeLayer()?.shadowEnabled ? 'bg-primary' : 'bg-white/10'}`}
                          >
                            <div class={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${activeLayer()?.shadowEnabled ? 'left-4.5' : 'left-0.5'}`} />
                          </button>
                        </div>

                        <Show when={activeLayer()?.shadowEnabled}>
                          <div class="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <PropSlider 
                              label="Shadow Blur"
                              value={activeLayer()?.shadowBlur ?? 20}
                              min={0} max={100} step={1}
                              onChange={(v) => handlePropChange('shadowBlur', v)}
                            />
                            <div class="grid grid-cols-2 gap-4">
                              <PropSlider 
                                label="Offset X"
                                value={activeLayer()?.shadowOffsetX ?? 0}
                                min={-100} max={100} step={1}
                                onChange={(v) => handlePropChange('shadowOffsetX', v)}
                              />
                              <PropSlider 
                                label="Offset Y"
                                value={activeLayer()?.shadowOffsetY ?? 10}
                                min={-100} max={100} step={1}
                                onChange={(v) => handlePropChange('shadowOffsetY', v)}
                              />
                            </div>
                            <div class="flex items-center justify-between p-3 bg-black/20 border border-white/5 rounded-xl">
                              <label class="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Shadow Color</label>
                              <input 
                                type="color" 
                                value={activeLayer()?.shadowColor || '#000000'} 
                                onInput={(e) => handlePropChange('shadowColor', e.currentTarget.value)} 
                                class="w-8 h-5 rounded cursor-pointer bg-transparent border-none p-0" 
                              />
                            </div>
                          </div>
                        </Show>
                      </div>
                    </div>
                  </Section>
                </Show>

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
                        <PropSelect 
                          label="Font"
                          value={activeLayer()?.fontFamily || 'Inter'}
                          options={[
                            { label: 'Inter', value: 'Inter' },
                            { label: 'Outfit', value: 'Outfit' },
                            { label: 'Rubik', value: 'Rubik' },
                            { label: 'JetBrains Mono', value: 'JetBrains Mono' }
                          ]}
                          onChange={(v) => handlePropChange('fontFamily', v)}
                        />
                        <PropSelect 
                          label="Weight"
                          value={activeLayer()?.fontWeight || '700'}
                          options={[
                            { label: 'Light', value: '300' },
                            { label: 'Regular', value: '400' },
                            { label: 'Medium', value: '500' },
                            { label: 'SemiBold', value: '600' },
                            { label: 'Bold', value: '700' },
                            { label: 'ExtraBold', value: '800' },
                            { label: 'Black', value: '900' }
                          ]}
                          onChange={(v) => handlePropChange('fontWeight', v)}
                        />
                      </div>

                      <div class="grid grid-cols-1 gap-4">
                        <div class="space-y-1.5">
                          <label class="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Font Size</label>
                          <input type="number" value={activeLayer()?.fontSize} onInput={(e) => handlePropChange('fontSize', parseFloat(e.currentTarget.value))} class="w-full h-10 bg-black/40 border border-white/5 rounded-xl px-3 text-xs text-white outline-none font-mono focus:border-indigo-500/50" />
                        </div>
                      </div>

                      <div class="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-xl">
                        <label class="text-[10px] text-white font-black uppercase tracking-widest">Text Color</label>
                        <input type="color" value={activeLayer()?.fillColor || '#ffffff'} onInput={(e) => handlePropChange('fillColor', e.currentTarget.value)} class="w-10 h-6 rounded cursor-pointer bg-white/5 border-none p-0.5" />
                      </div>

                      <PropSlider 
                        label="Letter Spacing"
                        value={activeLayer()?.letterSpacing || 0}
                        min={-10} max={50} step={1}
                        onChange={(v) => handlePropChange('letterSpacing', v)}
                      />
                    </div>
                  </Section>
                </Show>

                {/* Animation FX Section */}
                <Show when={activeLayer()?.type !== 'audio'}>
                  <Section 
                    title="Animation FX" 
                    icon={<PlayCircle class="w-3.5 h-3.5" />} 
                    color="bg-pink-500"
                    isOpen={collapsed().anim} 
                    onToggle={() => toggleSection('anim')}
                    showOnMobile={activePropTab() === 'anim'}
                  >
                    <div class="space-y-6">
                      {/* IN ANIMATION */}
                      <div class="space-y-4 p-4 bg-black/20 border border-white/5 rounded-2xl relative">
                        <div class="flex items-center gap-2 mb-1">
                          <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span class="text-[9px] font-black text-white uppercase tracking-widest">In Effect</span>
                        </div>
                        <div class="grid grid-cols-1 gap-4">
                          <PropSelect 
                            label="Effect"
                            value={activeLayer()?.animIn || 'none'}
                            options={[
                              { label: 'None', value: 'none' },
                              { label: 'Fade & Scale In', value: 'zoomIn' },
                              { label: 'Slide In From Left', value: 'slideLeft' },
                              { label: 'Slide In From Right', value: 'slideRight' },
                              { label: 'Typewriter', value: 'typewriter' },
                              { label: 'Typewriter+', value: 'typewriter+' },
                              { label: 'Fade In (Word)', value: 'fadeWord' },
                              { label: 'Bounce In (Word)', value: 'bounceWord' },
                              { label: 'Blur In', value: 'blurIn' },
                              { label: 'Rise Up', value: 'riseUp' },
                              { label: 'Rotate In', value: 'rotateIn' }
                            ]}
                            onChange={(v) => handlePropChange('animIn', v)}
                          />
                          <div class="grid grid-cols-2 gap-4">
                            <PropSelect 
                              label="Ease"
                              value={activeLayer()?.animInEase || 'easeOut'}
                              options={[
                                { label: 'Linear', value: 'linear' },
                                { label: 'Ease In', value: 'easeIn' },
                                { label: 'Ease Out', value: 'easeOut' },
                                { label: 'Ease In-Out', value: 'easeInOut' },
                                { label: 'Bounce', value: 'bounce' }
                              ]}
                              onChange={(v) => handlePropChange('animInEase', v)}
                            />
                            <div class="space-y-1.5">
                              <label class="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Duration (s)</label>
                              <input type="number" step="0.1" value={activeLayer()?.animInDuration || 1.0} onInput={(e) => handlePropChange('animInDuration', parseFloat(e.currentTarget.value))} class="w-full h-10 bg-black/40 border border-white/5 rounded-xl px-3 text-xs text-white outline-none font-mono focus:border-pink-500/50" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* OUT ANIMATION */}
                      <div class="space-y-4 p-4 bg-black/20 border border-white/5 rounded-2xl relative">
                        <div class="flex items-center gap-2 mb-1">
                          <div class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          <span class="text-[9px] font-black text-white uppercase tracking-widest">Out Effect</span>
                        </div>
                        <div class="grid grid-cols-1 gap-4">
                          <PropSelect 
                            label="Effect"
                            value={activeLayer()?.animOut || 'none'}
                            options={[
                              { label: 'None', value: 'none' },
                              { label: 'Fade Out', value: 'fade' },
                              { label: 'Fade & Scale Out', value: 'zoomOut' },
                              { label: 'Slide Down', value: 'slideDown' },
                              { label: 'Slide Left', value: 'slideLeft' },
                              { label: 'Slide Right', value: 'slideRight' },
                              { label: 'Blur Out', value: 'blurOut' },
                              { label: 'Rotate Out', value: 'rotateOut' }
                            ]}
                            onChange={(v) => handlePropChange('animOut', v)}
                          />
                          <div class="grid grid-cols-2 gap-4">
                            <PropSelect 
                              label="Ease"
                              value={activeLayer()?.animOutEase || 'easeOut'}
                              options={[
                                { label: 'Linear', value: 'linear' },
                                { label: 'Ease In', value: 'easeIn' },
                                { label: 'Ease Out', value: 'easeOut' },
                                { label: 'Ease In-Out', value: 'easeInOut' }
                              ]}
                              onChange={(v) => handlePropChange('animOutEase', v)}
                            />
                            <div class="space-y-1.5">
                              <label class="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Duration (s)</label>
                              <input type="number" step="0.1" value={activeLayer()?.animOutDuration || 1.0} onInput={(e) => handlePropChange('animOutDuration', parseFloat(e.currentTarget.value))} class="w-full h-10 bg-black/40 border border-white/5 rounded-xl px-3 text-xs text-white outline-none font-mono focus:border-pink-500/50" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* LOOP ANIMATION */}
                      <div class="space-y-4 p-4 bg-black/20 border border-white/5 rounded-2xl relative">
                        <div class="flex items-center gap-2 mb-1">
                          <div class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          <span class="text-[9px] font-black text-white uppercase tracking-widest">Continuous Loop</span>
                        </div>
                        <PropSelect 
                          label="Loop Type"
                          value={activeLayer()?.animLoop || 'none'}
                          options={[
                            { label: 'Static (None)', value: 'none' },
                            { label: 'Pulsing (Scale)', value: 'pulse' },
                            { label: 'Wiggle (Rotation)', value: 'wiggle' },
                            { label: 'Floating (Y-Axis)', value: 'float' },
                            { label: 'Jitter (Chaos)', value: 'jitter' }
                          ]}
                          onChange={(v) => handlePropChange('animLoop', v)}
                        />
                        <PropSlider 
                          label="Loop Speed"
                          value={activeLayer()?.animLoopSpeed || 1}
                          min={0.1} max={5} step={0.1}
                          onChange={(v) => handlePropChange('animLoopSpeed', v)}
                        />
                      </div>
                    </div>
                  </Section>
                </Show>
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
};

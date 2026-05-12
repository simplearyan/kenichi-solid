import { type Component, createSignal, For, onMount, Show } from 'solid-js';
import { LayoutGrid, PanelLeft, PanelBottom, PanelRight, Download, GitBranch, ArrowRightFromLine, Heart, ChevronDown } from 'lucide-solid';
import { projectStore, setProjectStore } from '../../store/projectStore';

const HeaderSelect: Component<{
  value: string | number;
  options: { label: string; value: string | number }[];
  onChange: (val: any) => void;
}> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  let containerRef!: HTMLDivElement;

  const currentLabel = () => props.options.find(o => o.value === props.value)?.label || props.value;

  const handleOutsideClick = (e: MouseEvent) => {
    if (containerRef && !containerRef.contains(e.target as Node)) setIsOpen(false);
  };

  onMount(() => {
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  });

  return (
    <div class="relative" ref={containerRef}>
      <button 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen()); }}
        class="flex items-center gap-1.5 hover:text-primary transition-colors py-1 outline-none"
      >
        <span class="text-white font-medium">{currentLabel()}</span>
        <ChevronDown class={`w-3 h-3 text-neutral-500 transition-transform ${isOpen() ? 'rotate-180' : ''}`} />
      </button>

      <Show when={isOpen()}>
        <div class="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1.5 min-w-[140px] backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-200">
          <For each={props.options}>
            {(opt) => (
              <button 
                onClick={() => { props.onChange(opt.value); setIsOpen(false); }}
                class={`w-full px-4 py-2 text-left text-[11px] transition-colors flex items-center justify-between ${props.value === opt.value ? 'bg-primary/10 text-primary font-bold' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
              >
                {opt.label}
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

export const Header: Component = () => {
  return (
    <header class="h-[44px] md:h-[48px] border-b border-border bg-[#141414] flex items-center justify-between px-3 md:px-5 shrink-0 z-20">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 bg-primary rounded flex items-center justify-center text-background shadow-[0_0_15px_rgba(5,213,144,0.3)]">
          <LayoutGrid class="w-3.5 h-3.5" />
        </div>
        <span class="font-bold text-white tracking-wide text-sm">KenichiStudio <span class="text-neutral-500 font-normal hidden sm:inline">Pro</span></span>
      </div>

      <div class="hidden md:flex items-center gap-6">
        <div class="flex items-center gap-6 text-[11px] font-medium text-neutral-400">
          <HeaderSelect 
            value={projectStore.proxyRes} 
            onChange={(v) => setProjectStore('proxyRes', v as any)}
            options={[
              { label: '240p Low', value: '240' },
              { label: '360p Med', value: '360' },
              { label: '480p Std', value: '480' },
              { label: '540p High', value: '540' },
              { label: '720p HD', value: '720' },
              { label: '1080p FHD', value: '1080' }
            ]}
          />
          <HeaderSelect 
            value={projectStore.aspectRatio} 
            onChange={(v) => setProjectStore('aspectRatio', v as any)}
            options={[
              { label: '16:9 Widescreen', value: '16/9' },
              { label: '9:16 Vertical', value: '9/16' },
              { label: '1:1 Square', value: '1/1' }
            ]}
          />
          <HeaderSelect 
            value={projectStore.zoomMode} 
            onChange={(v) => setProjectStore('zoomMode', v as any)}
            options={[
              { label: 'Fit View', value: 'fit' },
              { label: '25% Zoom', value: '0.25' },
              { label: '50% Zoom', value: '0.5' },
              { label: '75% Zoom', value: '0.75' },
              { label: '100% Zoom', value: '1' }
            ]}
          />
        </div>
        <div class="w-px h-5 bg-border mx-1"></div>
        <div class="flex items-center gap-1">
          <button 
            onClick={() => setProjectStore('showLeftPanel', p => !p)} 
            class={`p-1 rounded text-white transition-all ${projectStore.showLeftPanel ? 'bg-[#2a2a2a]' : 'bg-[#1e1e1e] hover:bg-[#2a2a2a]'}`}
          ><PanelLeft class="w-4 h-4" /></button>
          <button 
            onClick={() => setProjectStore('showTimelinePanel', p => !p)}
            class={`p-1 rounded text-white transition-all ${projectStore.showTimelinePanel ? 'bg-[#2a2a2a]' : 'bg-[#1e1e1e] hover:bg-[#2a2a2a]'}`}
          ><PanelBottom class="w-4 h-4" /></button>
          <button 
            onClick={() => setProjectStore('showRightPanel', p => !p)}
            class={`p-1 rounded text-white transition-all ${projectStore.showRightPanel ? 'bg-[#2a2a2a]' : 'bg-[#1e1e1e] hover:bg-[#2a2a2a]'}`}
          ><PanelRight class="w-4 h-4" /></button>
          <div class="w-px h-5 bg-border mx-1"></div>
          <button 
            onClick={() => setProjectStore('rippleEnabled', p => !p)}
            title="Ripple Edit (Push clips to the right)"
            class={`p-1 rounded transition-all flex items-center gap-1.5 px-2 ${projectStore.rippleEnabled ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-[#1e1e1e] text-neutral-400 hover:text-white border border-transparent'}`}
          >
            <ArrowRightFromLine class="w-4 h-4" />
            <span class="text-[10px] font-bold uppercase tracking-tight hidden lg:inline">Ripple</span>
          </button>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <a 
          href="https://github.com/simplearyan/kenichi-solid" 
          target="_blank" 
          rel="noopener noreferrer"
          class="text-neutral-400 hover:text-white transition-colors"
          title="View on GitHub"
        >
          <GitBranch class="w-4 h-4" />
        </a>
        <a 
          href="https://ko-fi.com/simplearyan" 
          target="_blank" 
          rel="noopener noreferrer"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#29abe0] text-white text-[10px] font-bold hover:bg-[#2499c9] transition-all shadow-sm active:scale-95"
          title="Support on Ko-fi"
        >
          <Heart class="w-3.5 h-3.5 fill-current" />
          <span class="hidden lg:inline">Support on Ko-fi</span>
        </a>
        <button 
          onClick={() => setProjectStore('exportModalOpen', true)}
          class="px-3 md:px-4 py-1 rounded bg-primary hover:bg-primaryHover text-background text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-[0_0_15px_rgba(5,213,144,0.2)]"
        >
          <Download class="w-3.5 h-3.5" /> Export
        </button>
      </div>
    </header>
  );
};

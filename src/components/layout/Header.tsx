import { type Component, createSignal, For, onMount, Show } from 'solid-js';
import { PanelLeft, PanelBottom, PanelRight, Download, GitBranch, ArrowRightFromLine, Heart, ChevronDown, Sun, Moon } from 'lucide-solid';
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
        <span class="text-textMain font-medium">{currentLabel()}</span>
        <ChevronDown class={`w-3 h-3 text-textMuted transition-transform ${isOpen() ? 'rotate-180' : ''}`} />
      </button>

      <Show when={isOpen()}>
        <div class="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden py-1.5 min-w-[140px] backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-200">
          <For each={props.options}>
            {(opt) => (
              <button 
                onClick={() => { props.onChange(opt.value); setIsOpen(false); }}
                class={`w-full px-4 py-2 text-left text-[11px] transition-colors flex items-center justify-between ${props.value === opt.value ? 'bg-primary/10 text-primary font-bold' : 'text-textMuted hover:text-textMain hover:bg-surfaceHover'}`}
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
    <header class="h-[44px] md:h-[48px] border-b border-border bg-surface flex items-center justify-between px-3 md:px-5 shrink-0 z-20 transition-colors duration-200">
      <div class="flex items-center gap-3 select-none group cursor-default">
        <div class="relative">
          <div class="w-8 h-8 bg-white rounded-[9px] flex items-center justify-center shadow-sm transition-transform group-hover:scale-105 duration-300">
            <span class="text-black font-extrabold text-[13px] tracking-tighter">KS</span>
          </div>
          <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#a855f7] border-2 border-surface rounded-full shadow-sm"></div>
        </div>
        <div class="flex items-center">
          <span class="font-extrabold text-textMain tracking-tight text-[16px]">Kenichi</span>
          <span class="font-light text-textMain tracking-tight text-[16px]">Studio</span>
        </div>
      </div>

      <div class="hidden md:flex items-center gap-6">
        <div class="flex items-center gap-6 text-[11px] font-medium text-textMuted">
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
            class={`p-1 rounded text-textMain transition-all ${projectStore.showLeftPanel ? 'bg-surfaceHover shadow-sm' : 'hover:bg-surfaceHover'}`}
          ><PanelLeft class="w-4 h-4" /></button>
          <button 
            onClick={() => setProjectStore('showTimelinePanel', p => !p)}
            class={`p-1 rounded text-textMain transition-all ${projectStore.showTimelinePanel ? 'bg-surfaceHover shadow-sm' : 'hover:bg-surfaceHover'}`}
          ><PanelBottom class="w-4 h-4" /></button>
          <button 
            onClick={() => setProjectStore('showRightPanel', p => !p)}
            class={`p-1 rounded text-textMain transition-all ${projectStore.showRightPanel ? 'bg-surfaceHover shadow-sm' : 'hover:bg-surfaceHover'}`}
          ><PanelRight class="w-4 h-4" /></button>
          <div class="w-px h-5 bg-border mx-1"></div>
          <button 
            onClick={() => setProjectStore('rippleEnabled', p => !p)}
            title="Ripple Edit (Push clips to the right)"
            class={`p-1 rounded transition-all flex items-center gap-1.5 px-2 ${projectStore.rippleEnabled ? 'bg-primary/20 text-primary border border-primary/30' : 'text-textMuted hover:text-textMain border border-transparent'}`}
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
          class="text-textMuted hover:text-textMain transition-colors"
          title="View on GitHub"
        >
          <GitBranch class="w-4 h-4" />
        </a>
        <button 
          onClick={() => setProjectStore('theme', t => t === 'light' ? 'dark' : 'light')}
          class="text-textMuted hover:text-textMain transition-colors p-1"
          title={projectStore.theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          <Show when={projectStore.theme === 'light'} fallback={<Sun class="w-4 h-4" />}>
            <Moon class="w-4 h-4" />
          </Show>
        </button>
        <a 
          href="https://ko-fi.com/simplearyan" 
          target="_blank" 
          rel="noopener noreferrer"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#ff5f5f] to-[#f06292] text-white text-[10px] font-bold hover:shadow-lg hover:shadow-red-500/20 transition-all shadow-sm active:scale-95"
          title="Support on Ko-fi"
        >
          <Heart class="w-3.5 h-3.5 fill-current" />
          <span class="hidden lg:inline uppercase tracking-wider">Support</span>
        </a>
        <button 
          onClick={() => setProjectStore('exportModalOpen', true)}
          class="px-3 md:px-4 py-1.5 rounded-lg bg-primary hover:bg-primaryHover text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-[0_4px_12px_rgba(59,130,246,0.3)] hover:shadow-[0_4px_15px_rgba(59,130,246,0.4)] active:scale-95"
        >
          <Download class="w-3.5 h-3.5" /> 
          <span class="uppercase tracking-tight">Export</span>
        </button>
      </div>
    </header>
  );
};

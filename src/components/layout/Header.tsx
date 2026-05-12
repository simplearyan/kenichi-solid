import { type Component } from 'solid-js';
import { LayoutGrid, PanelLeft, PanelBottom, PanelRight, Download, GitBranch } from 'lucide-solid';
import { projectStore, setProjectStore } from '../../store/projectStore';

export const Header: Component = () => {
  return (
    <header class="h-[44px] md:h-[48px] border-b border-border bg-[#141414] flex items-center justify-between px-3 md:px-5 shrink-0 z-20">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 bg-primary rounded flex items-center justify-center text-background shadow-[0_0_15px_rgba(5,213,144,0.3)]">
          <LayoutGrid class="w-3.5 h-3.5" />
        </div>
        <span class="font-bold text-white tracking-wide text-sm">KenichiStudio <span class="text-neutral-500 font-normal hidden sm:inline">Pro</span></span>
      </div>

      <div class="hidden md:flex items-center gap-5">
        <div class="flex items-center gap-3 text-xs font-medium text-neutral-400">
          <select 
            value={projectStore.proxyRes} 
            onChange={(e) => setProjectStore('proxyRes', e.currentTarget.value)}
            class="bg-transparent border-none outline-none text-white appearance-none cursor-pointer hover:text-primary transition-colors"
          >
            <option value="480">480p Proxy</option>
            <option value="720">720p HD</option>
            <option value="1080">1080p FHD</option>
          </select>
          <select 
            value={projectStore.aspectRatio} 
            onChange={(e) => setProjectStore('aspectRatio', e.currentTarget.value)}
            class="bg-transparent border-none outline-none text-white appearance-none cursor-pointer hover:text-primary transition-colors"
          >
            <option value="16/9">16:9 (Widescreen)</option>
            <option value="9/16">9:16 (Vertical)</option>
            <option value="1/1">1:1 (Square)</option>
          </select>
          <select 
            value={projectStore.zoomMode} 
            onChange={(e) => setProjectStore('zoomMode', e.currentTarget.value)}
            class="bg-transparent border-none outline-none text-white appearance-none cursor-pointer hover:text-primary transition-colors"
          >
            <option value="fit">Fit</option>
            <option value="0.25">25%</option>
            <option value="0.5">50%</option>
            <option value="0.75">75%</option>
            <option value="1">100%</option>
          </select>
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

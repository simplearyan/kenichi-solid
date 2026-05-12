import { createSignal, Show, type Component } from 'solid-js';
import { X, Download, Loader2, Heart, Pause, Play, Square, ExternalLink, ShieldCheck } from 'lucide-solid';
import { setProjectStore } from '../../store/projectStore';
import { exportProject, type ExportConfig } from '../../engine/ExportEngine';

const NativeAd: Component = () => {
  return (
    <div class="flex-1 flex flex-col bg-[#0d0d0d] rounded-xl border border-white/5 overflow-hidden group animate-in fade-in slide-in-from-right-4 duration-500">
      <div class="relative h-40 sm:h-48 overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800&h=600" 
          alt="Ad" 
          class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-transparent to-transparent"></div>
        <div class="absolute top-3 left-3 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded text-[8px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-1">
          <ShieldCheck class="w-2.5 h-2.5 text-primary" />
          Sponsored
        </div>
      </div>
      
      <div class="p-5 flex flex-col gap-3 flex-1">
        <div class="space-y-1">
          <h3 class="text-sm font-black text-white uppercase tracking-tight">Level Up Your Workflow</h3>
          <p class="text-[11px] text-neutral-500 leading-relaxed font-medium">
            Discover premium assets and advanced motion presets designed for the next generation of creators.
          </p>
        </div>
        
        <div class="mt-auto pt-2">
          <button class="w-full h-10 bg-primary hover:bg-primaryHover text-background text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest shadow-lg shadow-primary/10">
            Learn More <ExternalLink class="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const ExportModal: Component = () => {
  const [format, setFormat] = createSignal<ExportConfig['format']>('mp4');
  const [resolution, setResolution] = createSignal<ExportConfig['resolution']>('1080');
  const [fps, setFps] = createSignal<number>(30);
  
  const [isExporting, setIsExporting] = createSignal(false);
  const [isPaused, setIsPaused] = createSignal(false);
  let cancelled = false;

  const [progress, setProgress] = createSignal(0);
  const [statusText, setStatusText] = createSignal('');
  const [exportError, setExportError] = createSignal('');

  const handleExport = async () => {
    setIsExporting(true);
    setProjectStore('isExporting', true);
    setExportError('');
    setProgress(0);
    setStatusText('Starting export...');

    setIsPaused(false);
    cancelled = false;

    try {
      const result = await exportProject({
        format: format(),
        resolution: resolution(),
        fps: fps()
      }, (prog, status) => {
        setProgress(prog);
        setStatusText(status);
      }, {
        isPaused: () => isPaused(),
        isCancelled: () => cancelled
      });

      if (result) {
        const ext = format() === 'zip' ? 'zip' : format();
        const blob = result instanceof Blob ? result : new Blob([result], { type: format() === 'zip' ? 'application/zip' : `video/${format()}` });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Project_Export.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
        
        setStatusText('Export Complete!');
        setTimeout(() => {
            setProjectStore('exportModalOpen', false);
        }, 1500);
      }
    } catch (err: any) {
      console.error(err);
      setExportError(err.message || 'Export failed');
      setStatusText('Error');
    } finally {
      setIsExporting(false);
      setProjectStore('isExporting', false);
    }
  };

  return (
    <div class="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-8 touch-none transition-all duration-300">
      <div class={`bg-surface border border-border rounded-2xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300 shadow-2xl transition-all ${isExporting() ? 'max-w-4xl' : 'max-w-md'}`}>
        
        <div class="h-12 border-b border-border bg-[#141414] flex items-center justify-between px-4 shrink-0">
          <h2 class="font-bold text-white tracking-tight flex items-center gap-2">
            <div class="w-7 h-7 rounded bg-primary/10 flex items-center justify-center">
              <Download class="w-3.5 h-3.5 text-primary" />
            </div>
            Export Project
          </h2>
          <button 
            onClick={() => !isExporting() && setProjectStore('exportModalOpen', false)}
            disabled={isExporting()}
            class="text-neutral-500 hover:text-white p-1.5 rounded-md hover:bg-white/5 transition-all disabled:opacity-30"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="flex flex-col md:flex-row flex-1 min-h-0 bg-[#1a1a1a]">
          {/* Main Controls Panel */}
          <div class={`flex flex-col gap-4 p-5 transition-all duration-300 ${isExporting() ? 'md:w-[380px] md:border-r border-border/50' : 'w-full'}`}>
            
            {/* Hide settings on mobile while exporting to save space */}
            <div class={`${isExporting() ? 'hidden md:flex' : 'flex'} flex-col gap-4`}>
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-0.5">Format</label>
                <select 
                  value={format()} 
                  onChange={(e) => setFormat(e.currentTarget.value as any)}
                  disabled={isExporting()}
                  class="w-full h-11 bg-[#0a0a0a] border border-border rounded-xl px-3 text-sm text-white focus:border-primary/50 outline-none transition-all disabled:opacity-50 appearance-none cursor-pointer hover:bg-black transition-colors"
                >
                  <option value="mp4">MP4 Video (H.264)</option>
                  <option value="webm">WebM Video (VP9)</option>
                  <option value="mov">MOV Video</option>
                  <option value="zip">PNG Image Sequence (ZIP)</option>
                </select>
              </div>

              <div class="flex flex-col sm:flex-row gap-4">
                <div class="flex flex-col gap-1.5 flex-1">
                  <label class="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-0.5">Resolution</label>
                  <select 
                    value={resolution()} 
                    onChange={(e) => setResolution(e.currentTarget.value as any)}
                    disabled={isExporting()}
                    class="w-full h-11 bg-[#0a0a0a] border border-border rounded-xl px-3 text-sm text-white focus:border-primary/50 outline-none transition-all disabled:opacity-50 appearance-none cursor-pointer hover:bg-black transition-colors"
                  >
                    <option value="720">720p (HD)</option>
                    <option value="1080">1080p (FHD)</option>
                    <option value="1440">1440p (2K)</option>
                    <option value="2160">2160p (4K)</option>
                  </select>
                </div>
                <div class="flex flex-col gap-1.5 sm:w-[120px]">
                  <label class="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-0.5">Framerate</label>
                  <select 
                    value={fps()} 
                    onChange={(e) => setFps(parseInt(e.currentTarget.value))}
                    disabled={isExporting()}
                    class="w-full h-11 bg-[#0a0a0a] border border-border rounded-xl px-3 text-sm text-white focus:border-primary/50 outline-none transition-all disabled:opacity-50 appearance-none cursor-pointer hover:bg-black transition-colors"
                  >
                    <option value="24">24 FPS</option>
                    <option value="30">30 FPS</option>
                    <option value="60">60 FPS</option>
                  </select>
                </div>
              </div>
            </div>

            <Show when={isExporting()}>
              <div class="flex flex-col gap-4 p-5 bg-[#0a0a0a] rounded-2xl border border-white/5 mt-2">
                <div class="flex justify-between items-center text-[11px]">
                  <span class="text-white font-black uppercase tracking-widest flex items-center gap-2">
                    <Show when={!isPaused()} fallback={<Pause class="w-3.5 h-3.5 text-yellow-500 fill-current" />}>
                      <Loader2 class="w-3.5 h-3.5 animate-spin text-primary" />
                    </Show>
                    {statusText()}
                  </span>
                  <span class="text-primary font-mono font-bold text-xs">{progress().toFixed(0)}%</span>
                </div>
                <div class="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <div class="h-full bg-primary rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(5,213,144,0.3)]" style={{ width: `${progress()}%` }}></div>
                </div>
                
                <div class="flex items-center gap-2.5 mt-1">
                  <button 
                    onClick={() => setIsPaused(!isPaused())}
                    class="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-black transition-all active:scale-95 border border-white/5 uppercase tracking-wider"
                  >
                    <Show when={isPaused()} fallback={<><Pause class="w-3 h-3" /> PAUSE</>}>
                      <><Play class="w-3 h-3 fill-current" /> RESUME</>
                    </Show>
                  </button>
                  <button 
                    onClick={() => { cancelled = true; setIsPaused(false); }}
                    class="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-black transition-all active:scale-95 border border-red-500/10 uppercase tracking-wider"
                  >
                    <Square class="w-3 h-3 fill-current" /> STOP
                  </button>
                </div>
              </div>
            </Show>

            <Show when={exportError()}>
               <div class="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] text-center font-black tracking-widest uppercase">
                 {exportError()}
               </div>
            </Show>
          </div>

          {/* Native Ad Panel - Visible only during Export */}
          <Show when={isExporting()}>
            <div class="flex-1 p-5 md:p-6 bg-black/40 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-500 delay-150">
              <NativeAd />
            </div>
          </Show>
        </div>

        <Show when={!isExporting()}>
          <div class="px-4 pb-4 bg-[#1a1a1a]">
            <div class="p-3 bg-white/5 border border-white/5 rounded-xl flex flex-col xs:flex-row items-center justify-between gap-3">
              <div class="flex items-center gap-3 w-full xs:w-auto">
                <div class="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                  <Heart class="w-4.5 h-4.5 fill-current" />
                </div>
                <div class="flex flex-col">
                  <span class="text-[11px] text-white font-bold">Love Kenichi?</span>
                  <span class="text-[10px] text-neutral-500 font-medium">Keep the engine free.</span>
                </div>
              </div>
              <a 
                href="https://ko-fi.com/simplearyan" 
                target="_blank" 
                rel="noopener noreferrer"
                class="w-full xs:w-auto h-9 px-4 bg-primary hover:bg-primaryHover text-background text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 active:scale-95 uppercase tracking-wider"
              >
                <Heart class="w-3 h-3 fill-current" /> Support
              </a>
            </div>
          </div>
        </Show>

        <div class={`${isExporting() ? 'hidden md:flex' : 'flex'} p-4 bg-[#141414] border-t border-border flex-col-reverse xs:flex-row justify-end gap-2.5 shrink-0`}>
          <button 
            onClick={() => setProjectStore('exportModalOpen', false)}
            disabled={isExporting()}
            class="h-10 px-5 text-xs font-bold text-neutral-500 hover:text-white hover:bg-white/5 rounded-lg transition-all disabled:opacity-30"
          >
            CANCEL
          </button>
          <button 
            onClick={handleExport}
            disabled={isExporting()}
            class="h-10 px-7 bg-primary hover:bg-primaryHover text-background text-xs font-black rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            <Show when={isExporting()} fallback={<Download class="w-4 h-4" />}>
               <Loader2 class="w-4 h-4 animate-spin" />
            </Show>
            {isExporting() ? 'EXPORTING...' : 'EXPORT VIDEO'}
          </button>
        </div>
      </div>
    </div>
  );
};

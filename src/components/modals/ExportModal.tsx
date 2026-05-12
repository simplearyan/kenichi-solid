import { createSignal, Show, type Component } from 'solid-js';
import { X, Download, Loader2, Heart, Pause, Play, Square } from 'lucide-solid';
import { setProjectStore } from '../../store/projectStore';
import { exportProject, type ExportConfig } from '../../engine/ExportEngine';

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
    <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 touch-none">
      <div class="bg-surface border border-border rounded-xl w-[92vw] sm:w-full sm:max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
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

        <div class="p-4 flex flex-col gap-4 bg-[#1a1a1a]">
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-0.5">Format</label>
            <select 
              value={format()} 
              onChange={(e) => setFormat(e.currentTarget.value as any)}
              disabled={isExporting()}
              class="w-full h-10 bg-[#0a0a0a] border border-border rounded-lg px-3 text-sm text-white focus:border-primary/50 outline-none transition-all disabled:opacity-50 appearance-none cursor-pointer"
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
                class="w-full h-10 bg-[#0a0a0a] border border-border rounded-lg px-3 text-sm text-white focus:border-primary/50 outline-none transition-all disabled:opacity-50 appearance-none cursor-pointer"
              >
                <option value="720">720p (HD)</option>
                <option value="1080">1080p (FHD)</option>
                <option value="1440">1440p (2K)</option>
                <option value="2160">2160p (4K)</option>
              </select>
            </div>
            <div class="flex flex-col gap-1.5 sm:w-[110px]">
              <label class="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-0.5">Framerate</label>
              <select 
                value={fps()} 
                onChange={(e) => setFps(parseInt(e.currentTarget.value))}
                disabled={isExporting()}
                class="w-full h-10 bg-[#0a0a0a] border border-border rounded-lg px-3 text-sm text-white focus:border-primary/50 outline-none transition-all disabled:opacity-50 appearance-none cursor-pointer"
              >
                <option value="24">24 FPS</option>
                <option value="30">30 FPS</option>
                <option value="60">60 FPS</option>
              </select>
            </div>
          </div>

          <Show when={isExporting()}>
            <div class="flex flex-col gap-3 p-4 bg-[#0a0a0a] rounded-xl border border-white/5">
              <div class="flex justify-between items-center text-[11px]">
                <span class="text-white/70 font-medium flex items-center gap-2">
                  <Show when={!isPaused()} fallback={<Pause class="w-3 h-3 text-yellow-500" />}>
                    <Loader2 class="w-3 h-3 animate-spin text-primary" />
                  </Show>
                  {statusText()}
                </span>
                <span class="text-primary font-mono font-bold">{progress().toFixed(0)}%</span>
              </div>
              <div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div class="h-full bg-primary rounded-full transition-all duration-500 ease-out" style={{ width: `${progress()}%` }}></div>
              </div>
              
              <div class="flex items-center gap-2 mt-1">
                <button 
                  onClick={() => setIsPaused(!isPaused())}
                  class="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold transition-all active:scale-95 border border-white/5"
                >
                  <Show when={isPaused()} fallback={<><Pause class="w-3 h-3" /> PAUSE</>}>
                    <><Play class="w-3 h-3" /> RESUME</>
                  </Show>
                </button>
                <button 
                  onClick={() => { cancelled = true; setIsPaused(false); }}
                  class="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold transition-all active:scale-95 border border-red-500/10"
                >
                  <Square class="w-3 h-3 fill-current" /> STOP
                </button>
              </div>
            </div>
          </Show>

          <Show when={exportError()}>
             <div class="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[10px] text-center font-bold tracking-wider">
               {exportError().toUpperCase()}
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

        <div class="p-4 bg-[#141414] border-t border-border flex flex-col-reverse xs:flex-row justify-end gap-2.5 shrink-0">
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

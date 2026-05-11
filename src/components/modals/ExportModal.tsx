import { createSignal, Show, type Component } from 'solid-js';
import { X, Download, Loader2 } from 'lucide-solid';
import { projectStore, setProjectStore } from '../../store/projectStore';
import { exportProject, type ExportConfig } from '../../engine/ExportEngine';

export const ExportModal: Component = () => {
  const [format, setFormat] = createSignal<ExportConfig['format']>('mp4');
  const [resolution, setResolution] = createSignal<ExportConfig['resolution']>('1080');
  const [fps, setFps] = createSignal<number>(projectStore.fps || 30);
  
  const [isExporting, setIsExporting] = createSignal(false);
  const [progress, setProgress] = createSignal(0);
  const [statusText, setStatusText] = createSignal('');
  const [exportError, setExportError] = createSignal('');

  const handleExport = async () => {
    setIsExporting(true);
    setExportError('');
    setProgress(0);
    setStatusText('Starting export...');

    try {
      const result = await exportProject({
        format: format(),
        resolution: resolution(),
        fps: fps()
      }, (prog, status) => {
        setProgress(prog);
        setStatusText(status);
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
    }
  };

  return (
    <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div class="h-12 border-b border-border bg-[#141414] flex items-center justify-between px-4 shrink-0">
          <h2 class="font-bold text-white tracking-wide flex items-center gap-2">
            <Download class="w-4 h-4 text-primary" /> Export Project
          </h2>
          <button 
            onClick={() => !isExporting() && setProjectStore('exportModalOpen', false)}
            disabled={isExporting()}
            class="text-neutral-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="p-5 flex flex-col gap-5 bg-[#1a1a1a]">
          <div class="flex flex-col gap-2">
            <label class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Format</label>
            <select 
              value={format()} 
              onChange={(e) => setFormat(e.currentTarget.value as any)}
              disabled={isExporting()}
              class="w-full h-10 bg-[#0f0f0f] border border-border rounded-md px-3 text-sm text-white focus:border-primary outline-none transition-colors disabled:opacity-50"
            >
              <option value="mp4">MP4 Video (H.264)</option>
              <option value="webm">WebM Video (VP9)</option>
              <option value="mov">MOV Video</option>
              <option value="zip">PNG Image Sequence (ZIP)</option>
            </select>
          </div>

          <div class="flex gap-4">
            <div class="flex flex-col gap-2 flex-1">
              <label class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Resolution</label>
              <select 
                value={resolution()} 
                onChange={(e) => setResolution(e.currentTarget.value as any)}
                disabled={isExporting()}
                class="w-full h-10 bg-[#0f0f0f] border border-border rounded-md px-3 text-sm text-white focus:border-primary outline-none transition-colors disabled:opacity-50"
              >
                <option value="720">720p (HD)</option>
                <option value="1080">1080p (FHD)</option>
                <option value="1440">1440p (2K)</option>
                <option value="2160">2160p (4K)</option>
              </select>
            </div>
            <div class="flex flex-col gap-2 w-1/3">
              <label class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Framerate</label>
              <select 
                value={fps()} 
                onChange={(e) => setFps(parseInt(e.currentTarget.value))}
                disabled={isExporting()}
                class="w-full h-10 bg-[#0f0f0f] border border-border rounded-md px-3 text-sm text-white focus:border-primary outline-none transition-colors disabled:opacity-50"
              >
                <option value="24">24 FPS</option>
                <option value="30">30 FPS</option>
                <option value="60">60 FPS</option>
              </select>
            </div>
          </div>

          <Show when={isExporting()}>
            <div class="mt-2 flex flex-col gap-2 p-4 bg-[#2a2a2a] rounded-lg border border-border">
              <div class="flex justify-between items-center text-xs">
                <span class="text-white font-medium flex items-center gap-2">
                  <Loader2 class="w-3 h-3 animate-spin text-primary" /> {statusText()}
                </span>
                <span class="text-primary font-mono">{progress().toFixed(0)}%</span>
              </div>
              <div class="w-full h-2 bg-[#141414] rounded-full overflow-hidden">
                <div class="h-full bg-primary transition-all duration-300 ease-out" style={{ width: `${progress()}%` }}></div>
              </div>
            </div>
          </Show>

          <Show when={exportError()}>
             <div class="mt-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-xs text-center font-medium">
               {exportError()}
             </div>
          </Show>

        </div>

        <div class="p-4 bg-[#141414] border-t border-border flex justify-end gap-3 shrink-0">
          <button 
            onClick={() => setProjectStore('exportModalOpen', false)}
            disabled={isExporting()}
            class="px-5 py-2 text-sm font-medium text-white hover:bg-white/10 rounded-md transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            onClick={handleExport}
            disabled={isExporting()}
            class="px-6 py-2 bg-primary hover:bg-primaryHover text-background text-sm font-bold rounded-md shadow-[0_0_15px_rgba(5,213,144,0.3)] transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2"
          >
            <Show when={isExporting()} fallback={<Download class="w-4 h-4" />}>
               <Loader2 class="w-4 h-4 animate-spin" />
            </Show>
            {isExporting() ? 'Exporting...' : 'Export'}
          </button>
        </div>

      </div>
    </div>
  );
};

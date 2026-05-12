import { type Component, createEffect, onMount, onCleanup, createSignal, Show } from 'solid-js';
import { Play, Pause } from 'lucide-solid';
import { projectStore, updateLayer } from '../../store/projectStore';
import { audioEngine } from '../../engine/AudioEngine';

interface AudioTrimViewProps {
  layerId: string;
}

export const AudioTrimView: Component<AudioTrimViewProps> = (props) => {
  let canvasRef!: HTMLCanvasElement;
  let containerRef!: HTMLDivElement;
  
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [previewNode, setPreviewNode] = createSignal<any>(null);

  const layer = () => projectStore.layers.find(l => l.id === props.layerId);
  const media = () => layer()?.mediaId ? projectStore.mediaPool[layer()!.mediaId!] : null;

  const togglePreview = () => {
    const l = layer();
    if (!l || !l.mediaId) return;

    if (isPlaying()) {
      stopPreview();
    } else {
      startPreview();
    }
  };

  const startPreview = () => {
    const l = layer();
    if (!l || !l.mediaId) return;

    const buffer = audioEngine.getBuffer(l.id);
    if (!buffer) return;

    const ctx = audioEngine.init();
    if (!ctx) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    
    const gain = ctx.createGain();
    gain.gain.value = l.volume;
    
    source.connect(gain);
    gain.connect(ctx.destination);

    // Play only the trimmed portion
    source.start(0, l.inPoint, l.duration);
    
    setPreviewNode(source);
    setIsPlaying(true);

    source.onended = () => {
      setIsPlaying(false);
      setPreviewNode(null);
    };
  };

  const stopPreview = () => {
    const node = previewNode();
    if (node) {
      try { node.stop(); } catch(e) {}
    }
    setIsPlaying(false);
    setPreviewNode(null);
  };

  onCleanup(() => {
    stopPreview();
  });

  createEffect(() => {
    const m = media();
    const l = layer();
    if (!m || !m.peaks || !canvasRef) return;

    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    const w = canvasRef.width;
    const h = canvasRef.height;
    ctx.clearRect(0, 0, w, h);

    const peaks = m.peaks;
    const barWidth = w / peaks.length;
    const style = l!.waveformStyle || 'solid';
    const clipColor = l!.clipColor || (l!.type === 'audio' ? '#059669' : '#2563eb');

    // Draw background waveform (dimmed)
    ctx.fillStyle = '#333';
    ctx.globalAlpha = 0.5;
    renderWaveform(ctx, peaks, barWidth, h, style);
    ctx.globalAlpha = 1.0;

    // Draw highlighted trimmed area
    const inPos = (l!.inPoint / m.duration) * w;
    const durWidth = (l!.duration / m.duration) * w;
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(inPos, 0, durWidth, h);
    ctx.clip();
    
    ctx.fillStyle = clipColor;
    renderWaveform(ctx, peaks, barWidth, h, style);
    ctx.restore();

    // Draw markers
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.fillRect(inPos, 0, 2, h);
    ctx.fillRect(inPos + durWidth - 2, 0, 2, h);
    ctx.shadowBlur = 0;
  });

  const renderWaveform = (ctx: CanvasRenderingContext2D, peaks: number[], barWidth: number, h: number, style: string) => {
    for (let i = 0; i < peaks.length; i++) {
      const peak = peaks[i];
      const ph = peak * h * 0.85;
      const x = i * barWidth;

      if (style === 'mirrored') {
        ctx.fillRect(x, h / 2 - ph / 2, Math.max(1, barWidth - 0.5), ph / 2 - 1);
        ctx.fillRect(x, h / 2 + 1, Math.max(1, barWidth - 0.5), ph / 2 - 1);
      } else {
        ctx.fillRect(x, h / 2 - ph / 2, Math.max(1, barWidth - 0.5), ph);
      }
    }
    
    // Center line
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(peaks.length * barWidth, h / 2);
    ctx.stroke();
    ctx.restore();
  };

  const handleMouseDown = (e: MouseEvent, type: 'in' | 'out') => {
    const startX = e.clientX;
    const m = media();
    const l = layer();
    if (!m || !l) return;

    const initialIn = l.inPoint;
    const initialDur = l.duration;
    const rect = containerRef.getBoundingClientRect();

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dt = (dx / rect.width) * m.duration;

      if (type === 'in') {
        let newIn = Math.max(0, Math.min(initialIn + initialDur - 0.1, initialIn + dt));
        let newDur = initialDur - (newIn - initialIn);
        updateLayer(l.id, { inPoint: newIn, duration: newDur });
      } else {
        let newDur = Math.max(0.1, Math.min(m.duration - initialIn, initialDur + dt));
        updateLayer(l.id, { duration: newDur });
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div class="space-y-3">
      <div class="flex justify-between items-center mb-1">
        <label class="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">Advanced Trim</label>
        <button 
          onClick={togglePreview}
          class="p-1 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
        >
          {isPlaying() ? <Pause class="w-3 h-3 fill-current" /> : <Play class="w-3 h-3 fill-current ml-0.5" />}
        </button>
      </div>

      <div 
        ref={containerRef}
        class="h-20 bg-black/40 rounded-lg border border-white/5 relative overflow-hidden group"
      >
        <canvas 
          ref={canvasRef} 
          width={400} 
          height={80} 
          class="w-full h-full"
        ></canvas>

        {/* Trim Handles */}
        <div 
          class="absolute top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/10 flex items-center justify-center transition-colors group-hover:opacity-100 opacity-0"
          style={{ left: `${(layer()?.inPoint || 0) / (media()?.duration || 1) * 100}%`, transform: 'translateX(-50%)' }}
          onMouseDown={(e) => handleMouseDown(e, 'in')}
        >
          <div class="w-0.5 h-6 bg-white/50 rounded-full"></div>
        </div>
        
        <div 
          class="absolute top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/10 flex items-center justify-center transition-colors group-hover:opacity-100 opacity-0"
          style={{ left: `${((layer()?.inPoint || 0) + (layer()?.duration || 0)) / (media()?.duration || 1) * 100}%`, transform: 'translateX(-50%)' }}
          onMouseDown={(e) => handleMouseDown(e, 'out')}
        >
          <div class="w-0.5 h-6 bg-white/50 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

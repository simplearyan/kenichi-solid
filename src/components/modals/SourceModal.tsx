import { Show, createSignal, onMount, onCleanup, createEffect, type Component } from 'solid-js';
import { X, Play, Pause, Square, ZoomIn, ZoomOut, Maximize, Navigation, CheckCircle } from 'lucide-solid';
import { projectStore, closeSourceModal, updateSourceModalState } from '../../store/projectStore';

export const SourceModal: Component = () => {
  let videoRef!: HTMLVideoElement;
  let waveCanvasRef!: HTMLCanvasElement;
  let scrubberTrackRef!: HTMLDivElement;
  
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [currentTime, setCurrentTime] = createSignal(0);
  const [audioOnly, setAudioOnly] = createSignal(false);
  const [isDragging, setIsDragging] = createSignal(false);
  
  // Image pan/zoom state
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;

  let animFrameId: number;

  const media = () => projectStore.sourceMediaId ? projectStore.mediaPool[projectStore.sourceMediaId] : null;

  const duration = () => media()?.duration || 0;

  createEffect(() => {
    const m = media();
    if (m && videoRef) {
      if (m.type === 'video' || m.type === 'audio') {
        videoRef.src = m.url;
        setAudioOnly(m.type === 'audio');
      } else {
        setAudioOnly(false);
      }
    }
  });

  const drawWaveform = () => {
    const m = media();
    if (!m || !waveCanvasRef || !m.peaks) return;
    
    const w = waveCanvasRef.width = waveCanvasRef.offsetWidth;
    const h = waveCanvasRef.height = waveCanvasRef.offsetHeight;
    if (w === 0 || h === 0) return;

    const ctx = waveCanvasRef.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    
    const step = w / m.peaks.length;
    const inPx = (projectStore.srcIn / duration()) * w;
    const outPx = (projectStore.srcOut / duration()) * w;

    for (let i = 0; i < m.peaks.length; i++) {
      const x = i * step;
      const barW = Math.max(1, step - 1);
      const barH = Math.max(2, m.peaks[i] * h * 0.8);
      const y = (h - barH) / 2;
      
      if (x + barW / 2 >= inPx && x + barW / 2 <= outPx) {
        ctx.fillStyle = '#6366f1'; 
      } else {
        ctx.fillStyle = '#1e1b4b'; 
      }
      ctx.fillRect(x, y, barW, barH);
    }
  };

  createEffect(() => {
    if (projectStore.sourceModalOpen && media()?.type === 'audio') {
      // Need a small delay for canvas to size properly
      setTimeout(drawWaveform, 50);
    }
  });
  
  // Redraw waveform if trim changes
  createEffect(() => {
    projectStore.srcIn;
    projectStore.srcOut;
    if (audioOnly()) drawWaveform();
  });

  const loop = () => {
    if (videoRef && !videoRef.paused) {
      setCurrentTime(videoRef.currentTime);
      if (videoRef.currentTime >= projectStore.srcOut) {
        videoRef.pause();
        videoRef.currentTime = projectStore.srcIn;
        setIsPlaying(false);
      }
    }
    animFrameId = requestAnimationFrame(loop);
  };

  onMount(() => {
    animFrameId = requestAnimationFrame(loop);
  });

  onCleanup(() => {
    cancelAnimationFrame(animFrameId);
    if (videoRef) {
      videoRef.pause();
      videoRef.removeAttribute('src');
      videoRef.load();
    }
  });

  const handlePlayPause = () => {
    if (!videoRef) return;
    if (videoRef.paused) {
      if (videoRef.currentTime >= projectStore.srcOut) {
        videoRef.currentTime = projectStore.srcIn;
      }
      const p = videoRef.play();
      if (p !== undefined) {
        p.catch((e) => console.log('Play interrupted', e));
      }
      setIsPlaying(true);
    } else {
      videoRef.pause();
      setIsPlaying(false);
    }
  };

  const handleScrub = (e: MouseEvent) => {
    if (!scrubberTrackRef || !videoRef) return;
    const rect = scrubberTrackRef.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pos * duration();
    setCurrentTime(newTime);
    videoRef.currentTime = newTime;
  };

  const onScrubberMouseDown = (e: MouseEvent) => {
    setIsDragging(true);
    if (!videoRef.paused) {
      videoRef.pause();
      setIsPlaying(false);
    }
    handleScrub(e);
  };

  const onWindowMouseMove = (e: MouseEvent) => {
    if (isDragging()) {
      handleScrub(e);
    }
    if (isPanning) {
      const dx = e.clientX - panStartX;
      const dy = e.clientY - panStartY;
      updateSourceModalState({ srcCropX: dx, srcCropY: dy });
    }
  };

  const onWindowMouseUp = () => {
    setIsDragging(false);
    isPanning = false;
  };

  onMount(() => {
    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
  });

  onCleanup(() => {
    window.removeEventListener('mousemove', onWindowMouseMove);
    window.removeEventListener('mouseup', onWindowMouseUp);
  });

  const handleImageMouseDown = (e: MouseEvent) => {
    isPanning = true;
    panStartX = e.clientX - projectStore.srcCropX;
    panStartY = e.clientY - projectStore.srcCropY;
  };

  const handleImageWheel = (e: WheelEvent) => {
    e.preventDefault();
    const scaleChange = e.deltaY * -0.001;
    const newScale = Math.max(0.1, Math.min(projectStore.srcCropScale + scaleChange, 10));
    updateSourceModalState({ srcCropScale: newScale });
  };

  const handleSetIn = () => {
    const t = media()?.type === 'image' ? 0 : currentTime();
    let newIn = t;
    let newOut = projectStore.srcOut;
    if (newIn > newOut) newOut = duration();
    updateSourceModalState({ srcIn: newIn, srcOut: newOut });
  };

  const handleSetOut = () => {
    const t = media()?.type === 'image' ? duration() : currentTime();
    let newOut = t;
    let newIn = projectStore.srcIn;
    if (newOut < newIn) newIn = 0;
    updateSourceModalState({ srcIn: newIn, srcOut: newOut });
  };

  const addToTimeline = () => {
    const m = media();
    if (!m) return;
    
    // We mock adding to timeline for now until layers are fully implemented
    console.log("Adding to timeline", {
      mediaId: m.id,
      inPoint: projectStore.srcIn,
      duration: projectStore.srcOut - projectStore.srcIn,
      cropX: projectStore.srcCropX,
      cropY: projectStore.srcCropY,
      cropScale: projectStore.srcCropScale
    });
    closeSourceModal();
  };

  return (
    <div class="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div class="bg-[#1e1e1e] border border-border w-full max-w-4xl rounded-xl flex flex-col overflow-hidden shadow-2xl">
          
          <div class="h-12 border-b border-border bg-[#1a1a1a] flex items-center justify-between px-4 shrink-0">
            <h2 class="text-sm font-semibold text-white flex items-center gap-2">
              <Navigation class="w-4 h-4 text-indigo-400" />
              Source Preview <span class="text-neutral-500 font-normal ml-2">/ {media()?.name}</span>
            </h2>
            <button onClick={closeSourceModal} class="text-neutral-400 hover:text-white p-1 rounded-md hover:bg-[#2a2a2a] transition-colors">
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="w-full aspect-video bg-black relative flex items-center justify-center overflow-hidden shrink-0" 
               onWheel={media()?.type === 'image' ? handleImageWheel : undefined}>
            <Show when={media()?.type !== 'image'}>
              <video 
                ref={videoRef}
                class={`max-w-full max-h-full object-contain ${audioOnly() ? 'hidden' : ''}`}
                playsinline
                onEnded={() => setIsPlaying(false)}
              />
              <Show when={audioOnly()}>
                <canvas ref={waveCanvasRef} class="absolute inset-0 w-full h-full pointer-events-none opacity-80"></canvas>
              </Show>
            </Show>
            <Show when={media()?.type === 'image'}>
              <img 
                src={media()?.url} 
                class="max-w-full max-h-full object-contain cursor-move select-none"
                style={{ transform: `translate(${projectStore.srcCropX}px, ${projectStore.srcCropY}px) scale(${projectStore.srcCropScale})` }}
                onMouseDown={handleImageMouseDown}
                draggable="false"
              />
              <div class="absolute top-4 right-4 bg-black/60 backdrop-blur border border-white/10 rounded px-2 py-1 flex items-center gap-2 text-xs text-neutral-300">
                <ZoomIn class="w-3 h-3" /> Scroll to zoom
                <div class="w-px h-3 bg-white/20 mx-1"></div>
                <Maximize class="w-3 h-3" /> Drag to pan
              </div>
            </Show>
          </div>

          <div class="h-24 bg-[#1a1a1a] border-t border-border flex flex-col px-4 py-2 shrink-0 select-none relative">
            <div 
              ref={scrubberTrackRef} 
              class={`h-6 relative group cursor-pointer ${media()?.type === 'image' ? 'opacity-30 pointer-events-none' : ''}`}
              onMouseDown={media()?.type !== 'image' ? onScrubberMouseDown : undefined}
            >
              <div class="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 bg-[#2a2a2a] rounded overflow-hidden">
                <div class="absolute top-0 bottom-0 bg-white/5" style={{ left: '0%', width: '100%' }}></div>
                <div class="absolute top-0 bottom-0 bg-indigo-500/30 border-x border-indigo-500/50" 
                     style={{ 
                       left: `${(projectStore.srcIn / duration()) * 100}%`, 
                       width: `${((projectStore.srcOut - projectStore.srcIn) / duration()) * 100}%` 
                     }}></div>
                <div class="absolute top-0 bottom-0 bg-[#05d590]" style={{ width: `${(currentTime() / duration()) * 100}%` }}></div>
              </div>
              <div class="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow border border-neutral-300 transition-transform group-hover:scale-125" style={{ left: `calc(${(currentTime() / duration()) * 100}% - 6px)` }}></div>
              <div class="absolute top-1/2 -translate-y-1/2 w-1.5 h-3 bg-indigo-400 cursor-ew-resize hover:bg-white transition-colors z-10" style={{ left: `calc(${(projectStore.srcIn / duration()) * 100}% - 3px)` }}></div>
              <div class="absolute top-1/2 -translate-y-1/2 w-1.5 h-3 bg-indigo-400 cursor-ew-resize hover:bg-white transition-colors z-10" style={{ left: `calc(${(projectStore.srcOut / duration()) * 100}% - 3px)` }}></div>
            </div>

            <div class="flex items-center justify-between mt-2">
              <div class="flex items-center gap-2">
                <button 
                  onClick={handlePlayPause}
                  disabled={media()?.type === 'image'}
                  class="w-8 h-8 rounded bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  <Show when={!isPlaying()} fallback={<Pause class="w-4 h-4 fill-current" />}>
                    <Play class="w-4 h-4 fill-current ml-0.5" />
                  </Show>
                </button>
                <div class="text-xs font-mono text-neutral-400 ml-2">
                  <span>{media()?.type === 'image' ? '0.0' : currentTime().toFixed(1)}s</span>
                  <span class="text-neutral-600 mx-1">/</span>
                  <span>{duration().toFixed(1)}s</span>
                </div>
              </div>
              
              <div class="flex items-center gap-2">
                <button onClick={handleSetIn} class="px-3 py-1.5 bg-[#2a2a2a] hover:bg-indigo-900/50 border border-transparent hover:border-indigo-500/50 text-neutral-300 hover:text-white rounded text-xs font-medium transition-colors">
                  Set In
                </button>
                <button onClick={handleSetOut} class="px-3 py-1.5 bg-[#2a2a2a] hover:bg-indigo-900/50 border border-transparent hover:border-indigo-500/50 text-neutral-300 hover:text-white rounded text-xs font-medium transition-colors">
                  Set Out
                </button>
              </div>

              <div class="flex items-center">
                <button onClick={addToTimeline} class="px-4 py-1.5 bg-[#05d590] hover:bg-[#04b077] text-black rounded text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-[#05d590]/20">
                  <CheckCircle class="w-3.5 h-3.5" />
                  Add to Timeline
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

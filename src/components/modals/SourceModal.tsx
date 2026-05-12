import { Show, createSignal, onMount, onCleanup, createEffect, type Component } from 'solid-js';
import { X, Play, Pause, ZoomIn, Maximize, Navigation, CheckCircle } from 'lucide-solid';
import { projectStore, closeSourceModal, updateSourceModalState, addLayer } from '../../store/projectStore';
import { layerRegistry } from '../../engine/LayerRegistry';

export const SourceModal: Component = () => {
  let videoRef!: HTMLVideoElement;
  let waveCanvasRef!: HTMLCanvasElement;
  let scrubberTrackRef!: HTMLDivElement;

  const [isPlaying, setIsPlaying] = createSignal(false);
  const [currentTime, setCurrentTime] = createSignal(0);
  const [audioOnly, setAudioOnly] = createSignal(false);

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

  const onHandleMouseDown = (e: MouseEvent, type: 'in' | 'out' | 'move') => {
    e.stopPropagation();
    const dragStartX = e.clientX;
    const dragStartIn = projectStore.srcIn;
    const dragStartOut = projectStore.srcOut;

    const onMove = (moveEvent: MouseEvent) => {
      const rect = scrubberTrackRef.getBoundingClientRect();
      const dx = moveEvent.clientX - dragStartX;
      const dt = (dx / rect.width) * duration();

      if (type === 'in') {
        const newIn = Math.max(0, Math.min(projectStore.srcOut - 0.1, dragStartIn + dt));
        updateSourceModalState({ srcIn: newIn });
      } else if (type === 'out') {
        const newOut = Math.max(projectStore.srcIn + 0.1, Math.min(duration(), dragStartOut + dt));
        updateSourceModalState({ srcOut: newOut });
      } else if (type === 'move') {
        const dur = dragStartOut - dragStartIn;
        let newIn = Math.max(0, Math.min(duration() - dur, dragStartIn + dt));
        updateSourceModalState({ srcIn: newIn, srcOut: newIn + dur });
      }
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onScrubberMouseDown = (e: MouseEvent) => {
    if (!videoRef.paused) {
      videoRef.pause();
      setIsPlaying(false);
    }
    handleScrub(e);

    const onMove = (moveEvent: MouseEvent) => {
      handleScrub(moveEvent);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleImageMouseDown = (e: MouseEvent) => {
    isPanning = true;
    panStartX = e.clientX - projectStore.srcCropX;
    panStartY = e.clientY - projectStore.srcCropY;

    const onMove = (moveEvent: MouseEvent) => {
      if (isPanning) {
        const dx = moveEvent.clientX - panStartX;
        const dy = moveEvent.clientY - panStartY;
        updateSourceModalState({ srcCropX: dx, srcCropY: dy });
      }
    };

    const onUp = () => {
      isPanning = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
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

    const layerId = addLayer({
      name: m.name,
      type: m.type,
      mediaId: m.id,
      startTime: projectStore.currentTime,
      duration: projectStore.srcOut - projectStore.srcIn,
      inPoint: projectStore.srcIn,
      hidden: false,
      locked: false,
      scale: projectStore.srcCropScale,
      rotation: 0,
      posX: projectStore.srcCropX,
      posY: projectStore.srcCropY,
      radius: 0,
      brightness: 1,
      contrast: 1,
      chromaKey: false,
      chromaColor: '#00ff00',
      chromaTolerance: 0.1,
      colorReplace: false,
      replaceFromColor: '#ff0000',
      replaceToColor: '#0000ff',
      volume: 1,
      fadeIn: 0,
      fadeOut: 0,
      echo: false,
      echoDelay: 0.5,
      echoFeedback: 0.5
    });

    const layerState = projectStore.layers.find(l => l.id === layerId);
    if (layerState) {
      layerRegistry.instantiate(layerState);
    }

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
              <div class="absolute inset-0 bg-indigo-500/5 group/audio">
                <canvas ref={waveCanvasRef} class="absolute inset-0 w-full h-full opacity-80"></canvas>

                {/* Specialized Audio Trim Handles (Over Waveform) */}
                <div
                  class="absolute inset-0 cursor-crosshair"
                  onMouseDown={(e) => {
                    if (e.target === e.currentTarget) onScrubberMouseDown(e);
                  }}
                >
                  {/* Draggable Mid-Area */}
                  <div
                    class="absolute top-0 bottom-0 bg-indigo-500/20 border-x border-indigo-400/30 cursor-move transition-colors hover:bg-indigo-500/30"
                    style={{
                      left: `${(projectStore.srcIn / duration()) * 100}%`,
                      width: `${((projectStore.srcOut - projectStore.srcIn) / duration()) * 100}%`
                    }}
                    onMouseDown={(e) => onHandleMouseDown(e, 'move')}
                  />

                  {/* Playhead */}
                  <div
                    class="absolute top-0 bottom-0 w-px bg-[#05d590] shadow-[0_0_8px_rgba(5,213,144,0.8)] z-20 pointer-events-none"
                    style={{ left: `${(currentTime() / duration()) * 100}%` }}
                  />

                  {/* Clean Trim Handles */}
                  <div
                    class="absolute top-0 bottom-0 w-4 -ml-2 cursor-ew-resize flex items-center justify-center group/h z-30"
                    style={{ left: `${(projectStore.srcIn / duration()) * 100}%` }}
                    onMouseDown={(e) => onHandleMouseDown(e, 'in')}
                  >
                    <div class="w-1 h-12 bg-white rounded-full shadow-xl transition-transform group-hover/h:scale-x-150"></div>
                  </div>

                  <div
                    class="absolute top-0 bottom-0 w-4 -ml-2 cursor-ew-resize flex items-center justify-center group/h z-30"
                    style={{ left: `${(projectStore.srcOut / duration()) * 100}%` }}
                    onMouseDown={(e) => onHandleMouseDown(e, 'out')}
                  >
                    <div class="w-1 h-12 bg-white rounded-full shadow-xl transition-transform group-hover/h:scale-x-150"></div>
                  </div>
                </div>
              </div>
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
            {/* Simple Standard Scrubber */}
            <div class="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-[#252525] rounded-full overflow-hidden border border-white/5">
              {/* Trim Selection Range (Indigo) */}
              <div
                class="absolute top-0 bottom-0 bg-indigo-500/30"
                style={{
                  left: `${(projectStore.srcIn / duration()) * 100}%`,
                  width: `${((projectStore.srcOut - projectStore.srcIn) / duration()) * 100}%`
                }}
              ></div>

              {/* Progress Fill (Green - Primary) */}
              <div 
                class="h-full bg-primary" 
                style={{ width: `${(currentTime() / duration()) * 100}%` }}
              ></div>
            </div>

            {/* Trim Markers (Indigo) */}
            <div class="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-indigo-400 z-10" style={{ left: `${(projectStore.srcIn / duration()) * 100}%` }}></div>
            <div class="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-indigo-400 z-10" style={{ left: `${(projectStore.srcOut / duration()) * 100}%` }}></div>

            {/* Persistent Vertical Playhead Line (White) */}
            <div 
              class="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-white z-20 pointer-events-none transition-opacity"
              style={{ 
                left: `calc(${(currentTime() / duration()) * 100}% - 1px)`,
                opacity: isPlaying() ? 1 : 0.8
              }}
            ></div>

            <div 
              class="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border border-neutral-400 scale-0 group-hover:scale-100 transition-transform pointer-events-none z-30" 
              style={{ left: `calc(${(currentTime() / duration()) * 100}% - 6px)` }}
            ></div>
          </div>

          <div class="flex items-center justify-between mt-2">
            <div class="flex items-center gap-4">
              <button
                onClick={handlePlayPause}
                disabled={media()?.type === 'image'}
                class="w-8 h-8 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white flex items-center justify-center transition-all disabled:opacity-50"
              >
                <Show when={!isPlaying()} fallback={<Pause class="w-4 h-4 fill-current" />}>
                  <Play class="w-4 h-4 fill-current ml-0.5" />
                </Show>
              </button>
              <div class="flex flex-col">
                <div class="text-[10px] font-mono text-neutral-400">
                  {currentTime().toFixed(1)}s <span class="text-neutral-600">/ {duration().toFixed(1)}s</span>
                </div>
                <Show when={media()?.type !== 'image'}>
                  <div class="text-[9px] text-primary/70 font-bold uppercase tracking-wider">
                    Trim: {(projectStore.srcOut - projectStore.srcIn).toFixed(1)}s
                  </div>
                </Show>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <div class="flex items-center bg-[#121212] rounded p-1 border border-white/5 gap-1">
                <div class="flex flex-col items-center px-2">
                  <span class="text-[8px] text-neutral-500 font-bold uppercase mb-0.5">In</span>
                  <input
                    type="number" step="0.1" min="0" max={projectStore.srcOut}
                    value={projectStore.srcIn.toFixed(1)}
                    onInput={(e) => updateSourceModalState({ srcIn: parseFloat(e.currentTarget.value) || 0 })}
                    class="bg-transparent text-white text-[10px] font-mono w-12 text-center focus:outline-none border-b border-white/5 hover:border-white/20 transition-colors"
                  />
                </div>
                <div class="w-px h-6 bg-white/10 self-center mx-1"></div>
                <div class="flex flex-col items-center px-2">
                  <span class="text-[8px] text-neutral-500 font-bold uppercase mb-0.5">Out</span>
                  <input
                    type="number" step="0.1" min={projectStore.srcIn} max={duration()}
                    value={projectStore.srcOut.toFixed(1)}
                    onInput={(e) => updateSourceModalState({ srcOut: parseFloat(e.currentTarget.value) || duration() })}
                    class="bg-transparent text-white text-[10px] font-mono w-12 text-center focus:outline-none border-b border-white/5 hover:border-white/20 transition-colors"
                  />
                </div>
              </div>

              <div class="flex bg-[#121212] rounded p-1 border border-white/5 ml-1">
                <button onClick={handleSetIn} class="px-3 py-1 hover:bg-white/5 text-neutral-400 hover:text-white rounded text-[10px] font-bold uppercase transition-colors">
                  Mark In
                </button>
                <button onClick={handleSetOut} class="px-3 py-1 hover:bg-white/5 text-neutral-400 hover:text-white rounded text-[10px] font-bold uppercase transition-colors">
                  Mark Out
                </button>
              </div>

              <button onClick={addToTimeline} class="ml-2 px-4 py-1.5 bg-[#05d590] hover:bg-[#04b077] text-black rounded text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-[#05d590]/20 active:scale-95">
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

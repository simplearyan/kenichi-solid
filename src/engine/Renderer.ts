import { projectStore, setCurrentTime, setProjectStore } from '../store/projectStore';
import { layerRegistry } from './LayerRegistry';
import { audioEngine } from './AudioEngine';

export class Renderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private reqAnimFrameId: number | null = null;
  private lastTime = performance.now();
  private fpsLastTime = performance.now();
  private frameCount = 0;
  private visibilityMap = new Map<string, boolean>();
  private wasPlaying = false;
  private syncFramesRemaining = 0;
  private stallTracker = new Map<string, number>();

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.resize(1920, 1080);
    this.startLoop();
  }

  resize(width: number, height: number) {
    if (!this.canvas) return;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  startLoop() {
    this.lastTime = performance.now();
    const loop = (time: number) => {
      const dt = (time - this.lastTime) / 1000;
      this.lastTime = time;

      if (projectStore.isPlaying) {
        if (!this.wasPlaying) {
          // Playback just started, sync hardware clock
          audioEngine.startClock(projectStore.currentTime);
        }
        
        const preciseTime = audioEngine.getPreciseTime();
        if (preciseTime !== null) {
          if (preciseTime >= projectStore.duration) {
            audioEngine.startClock(0);
            setCurrentTime(0);
          } else {
            setCurrentTime(preciseTime);
            audioEngine.updateVolumes();
          }
        } else {
          // Fallback to software clock if audio context failed
          // Attempt to re-init/resume if stalled
          if (this.frameCount % 60 === 0) audioEngine.init();

          let newTime = projectStore.currentTime + dt;
          if (newTime >= projectStore.duration) {
            newTime = 0; // Loop back
          }
          setCurrentTime(newTime);
        }
      } else if (this.wasPlaying) {
        // Transition from play -> stop
        audioEngine.stopPlayback();
      }
      
      this.wasPlaying = projectStore.isPlaying;

      this.render();

      this.frameCount++;
      if (time - this.fpsLastTime >= 1000) {
        setProjectStore('fps', this.frameCount);
        this.frameCount = 0;
        this.fpsLastTime = time;
      }

      this.reqAnimFrameId = requestAnimationFrame(loop);
    };
    this.reqAnimFrameId = requestAnimationFrame(loop);
  }

  stopLoop() {
    if (this.reqAnimFrameId) {
      cancelAnimationFrame(this.reqAnimFrameId);
    }
  }

  private applyChromaKey(ctx: CanvasRenderingContext2D, w: number, h: number, hex: string, tolerance: number) {
    if (!w || !h) return;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Hex to RGB
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return;
    const tr = parseInt(result[1], 16);
    const tg = parseInt(result[2], 16);
    const tb = parseInt(result[3], 16);

    const maxDist = 442; // sqrt(255^2 * 3)
    const threshold = tolerance * maxDist;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const dist = Math.sqrt((r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2);
      if (dist < threshold) {
        data[i + 3] = 0; // Transparent
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  render() {
    if (!this.canvas || projectStore.isExporting) return;

    let baseW = 1920;
    let baseH = 1080;
    if (projectStore.aspectRatio === '9/16') {
      baseW = 1080;
      baseH = 1920;
    } else if (projectStore.aspectRatio === '1/1') {
      baseW = 1080;
      baseH = 1080;
    }

    let targetWidth = baseW;
    let targetHeight = baseH;
    let arRatio = baseW / baseH;

    if (projectStore.proxyRes === '480') {
      targetHeight = 480;
      targetWidth = Math.round(480 * arRatio);
    } else if (projectStore.proxyRes === '720') {
      targetHeight = 720;
      targetWidth = Math.round(720 * arRatio);
    } else {
      targetHeight = baseH;
      targetWidth = baseW;
    }

    if (this.canvas.width !== targetWidth || this.canvas.height !== targetHeight) {
      this.resize(targetWidth, targetHeight);
    }

    const playbackStarted = projectStore.isPlaying && !this.wasPlaying;
    if (playbackStarted) {
      this.syncFramesRemaining = 60; // Increased to 1s to ensure stability during warm-up
    }
    this.wasPlaying = projectStore.isPlaying;
    
    if (this.syncFramesRemaining > 0) this.syncFramesRemaining--;

    this.renderFrame(this.ctx as any, targetWidth, targetHeight, projectStore.currentTime, playbackStarted || this.syncFramesRemaining > 0);
  }

  public renderFrame(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, targetWidth: number, targetHeight: number, time: number, forceSync = false) {
    if (!ctx) return;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    let baseW = 1920;
    let baseH = 1080;
    if (projectStore.aspectRatio === '9/16') {
      baseW = 1080;
      baseH = 1920;
    } else if (projectStore.aspectRatio === '1/1') {
      baseW = 1080;
      baseH = 1080;
    }

    // Apply global proxy scale so internal rendering always acts like baseW x baseH space
    const globalScaleX = targetWidth / baseW;
    const globalScaleY = targetHeight / baseH;

    ctx.save();
    ctx.scale(globalScaleX, globalScaleY);

    const W = baseW;
    const H = baseH;

    // NEW: Render Track by Track (Top Track = Foreground)
    // We reverse the tracks so the bottom-most track is rendered FIRST (Background)
    // and the top-most track (Track 1) is rendered LAST (Foreground)
    const sortedTracks = [...projectStore.tracks].reverse();

    for (const track of sortedTracks) {
      if (track.hidden) continue;

      const trackLayers = projectStore.layers.filter(l => l.trackId === track.id);
      
      for (const layer of trackLayers) {
        if (layer.hidden) continue;

        const isVisible = time >= layer.startTime && time < layer.startTime + layer.duration;
        const localTime = time - layer.startTime + layer.inPoint;

        const nodes = layerRegistry.get(layer.id);
        if (layer.type !== 'text' && !nodes) continue;

        // Sync Audio/Video Playback
        if (layer.type === 'video' || layer.type === 'audio') {
          const media = layer.type === 'video' ? nodes?.videoEl : nodes?.audioEl;
          
          if (media) {
            this.visibilityMap.set(layer.id, isVisible);

            if (isVisible) {
              const drift = media.currentTime - localTime;
              const absDrift = Math.abs(drift);
              
              if (!projectStore.isPlaying) {
                // SCRUBBING/IDLE: Hard seek visuals
                if (absDrift > 0.05) media.currentTime = localTime;
                media.playbackRate = 1.0;
                if (!media.paused) media.pause();
              } else {
                // PLAYING: Video visual sync only
                if (absDrift > 0.3 || forceSync) {
                  media.currentTime = localTime;
                  media.playbackRate = 1.0;
                } else if (absDrift > 0.02) {
                  const nudgeFactor = Math.min(0.05, absDrift * 0.2);
                  media.playbackRate = drift > 0 ? (1.0 - nudgeFactor) : (1.0 + nudgeFactor);
                } else {
                  media.playbackRate = 1.0;
                }

                if (media.paused && layer.type === 'video') {
                  media.play().catch(() => { });
                }
              }
            } else {
              if (!media.paused) {
                media.pause();
                media.playbackRate = 1.0;
              }
            }
          }
        }

        // Evaluate Keyframeless Animations
        let animAlpha = 1;
        let animScale = 1;
        let animRot = 0;
        let animX = 0;
        let animY = 0;

        const layerTime = time - layer.startTime; // Time since layer start

        if (isVisible) {
          // In Animation
          if (layer.animIn && layer.animIn !== 'none' && layerTime < (layer.animInDuration || 1)) {
            let p = layerTime / (layer.animInDuration || 1);
            p = 1 - Math.pow(1 - p, 3); // easeOutCubic

            if (layer.animIn === 'fade') animAlpha = p;
            else if (layer.animIn === 'slideLeft') { animX = -W * (1 - p); animAlpha = p; }
            else if (layer.animIn === 'zoomIn') { animScale = p; animAlpha = p; }
            else if (layer.animIn === 'rotateIn') { animRot = (1 - p) * Math.PI; animScale = p; animAlpha = p; }
          }

          // Out Animation
          let timeFromEnd = layer.duration - layerTime;
          if (layer.animOut && layer.animOut !== 'none' && timeFromEnd < (layer.animOutDuration || 1)) {
            let p = timeFromEnd / (layer.animOutDuration || 1);
            p = 1 - Math.pow(1 - p, 3); // easeOutCubic (reversed since it's going backwards from end)

            if (layer.animOut === 'fade') animAlpha *= p;
            else if (layer.animOut === 'slideRight') { animX += W * (1 - p); animAlpha *= p; }
            else if (layer.animOut === 'zoomOut') { animScale *= p; animAlpha *= p; }
            else if (layer.animOut === 'rotateOut') { animRot += (1 - p) * Math.PI; animScale *= p; animAlpha *= p; }
          }

          // Loop Animation
          if (layer.animLoop && layer.animLoop !== 'none') {
            if (layer.animLoop === 'pulse') animScale *= 1 + Math.sin(layerTime * Math.PI * 2) * 0.05;
            else if (layer.animLoop === 'wiggle') animRot += Math.sin(layerTime * Math.PI * 4) * 0.05;
            else if (layer.animLoop === 'float') animY += Math.sin(layerTime * Math.PI * 2) * 20;
          }
        }

        // Visual Rendering
        if (isVisible && (layer.type === 'video' || layer.type === 'image')) {
          const sourceMedia = layer.type === 'video' ? nodes?.videoEl : nodes?.imgEl;
          const bCtx = nodes?.bufferCtx;
          const bCvs = nodes?.bufferCanvas;

          if (sourceMedia && bCtx && bCvs && bCvs.width > 0 && bCvs.height > 0) {
            ctx.save();
            ctx.globalAlpha = animAlpha;

            ctx.translate(W / 2 + layer.posX + animX, H / 2 + layer.posY + animY);
            ctx.rotate((layer.rotation * Math.PI) / 180 + animRot);
            ctx.scale(layer.scale * animScale, layer.scale * animScale);

            let filterStr = '';
            if (layer.brightness !== 1) filterStr += `brightness(${layer.brightness}) `;
            if (layer.contrast !== 1) filterStr += `contrast(${layer.contrast}) `;
            if (filterStr) ctx.filter = filterStr.trim();

            const canDraw = layer.type === 'image' || (layer.type === 'video' && (sourceMedia as HTMLVideoElement).readyState >= 2);

            if (canDraw) {
              // Reset stall count for this layer
              this.stallTracker.delete(layer.id);

              if (layer.chromaKey) {
                bCtx.clearRect(0, 0, bCvs.width, bCvs.height);
                bCtx.drawImage(sourceMedia, 0, 0, bCvs.width, bCvs.height);
                this.applyChromaKey(bCtx, bCvs.width, bCvs.height, layer.chromaColor, layer.chromaTolerance);
                ctx.drawImage(bCvs, -bCvs.width / 2, -bCvs.height / 2);
              } else {
                ctx.drawImage(sourceMedia, -bCvs.width / 2, -bCvs.height / 2, bCvs.width, bCvs.height);
              }
            } else if (layer.type === 'video' && isVisible) {
              // TRACK STALLS: If video is visible but not ready
              const stallCount = (this.stallTracker.get(layer.id) || 0) + 1;
              this.stallTracker.set(layer.id, stallCount);

              // If stalled for > 120 frames (~2 seconds at 60fps), trigger auto-recovery
              if (stallCount > 120) {
                console.warn(`[Renderer] Auto-recovering stalled layer: ${layer.id}`);
                layerRegistry.remove(layer.id);
                layerRegistry.instantiate(layer);
                this.stallTracker.delete(layer.id); // Reset after recovery attempt
              }
            }
            ctx.restore();
          }
        }

        if (isVisible && layer.type === 'text') {
          ctx.save();
          ctx.globalAlpha = animAlpha;

          ctx.translate(W / 2 + layer.posX + animX, H / 2 + layer.posY + animY);
          ctx.rotate((layer.rotation * Math.PI) / 180 + animRot);
          ctx.scale(layer.scale * animScale, layer.scale * animScale);

          const text = layer.textContent || 'HELLO WORLD';
          ctx.font = `${layer.fontWeight || '700'} ${layer.fontSize || 120}px "${layer.fontFamily || 'Inter'}"`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          if (layer.dropShadow) {
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 5;
          }

          if (layer.letterSpacing) {
            (ctx as any).letterSpacing = `${layer.letterSpacing}px`;
          }

          ctx.fillStyle = layer.fillColor || '#ffffff';
          ctx.fillText(text, 0, 0);

          if (layer.strokeWidth) {
            ctx.lineWidth = layer.strokeWidth;
            ctx.strokeStyle = layer.strokeColor || '#000000';
            ctx.strokeText(text, 0, 0);
          }

          ctx.restore();
        }
      }
    }

    ctx.restore(); // Restore global scale
  }
}

export const renderer = new Renderer();

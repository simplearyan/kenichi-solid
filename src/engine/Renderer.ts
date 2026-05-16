import { projectStore, setCurrentTime, setProjectStore } from '../store/projectStore';
import { layerRegistry } from './LayerRegistry';
import { audioEngine } from './AudioEngine';

export class Renderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private reqAnimFrameId: number | null = null;
  private lastTime = performance.now();
  private fpsLastTime = performance.now();
  private lastFpsUpdate = 0;
  private framesThisSecond = 0;
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
    this.lastFpsUpdate = this.lastTime;
    const loop = (time: number) => {
      const dt = (time - this.lastTime) / 1000;
      this.lastTime = time;

      this.framesThisSecond++;
      if (time - this.lastFpsUpdate >= 1000) {
        setProjectStore('currentFPS', Math.round((this.framesThisSecond * 1000) / (time - this.lastFpsUpdate)));
        this.framesThisSecond = 0;
        this.lastFpsUpdate = time;
      }

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

    if (projectStore.proxyRes === '240') {
      targetHeight = 240;
      targetWidth = Math.round(240 * arRatio);
    } else if (projectStore.proxyRes === '360') {
      targetHeight = 360;
      targetWidth = Math.round(360 * arRatio);
    } else if (projectStore.proxyRes === '480') {
      targetHeight = 480;
      targetWidth = Math.round(480 * arRatio);
    } else if (projectStore.proxyRes === '540') {
      targetHeight = 540;
      targetWidth = Math.round(540 * arRatio);
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

    this.renderFrame(this.ctx as any, targetWidth, targetHeight, projectStore.currentTime, playbackStarted || projectStore.isSeeking || this.syncFramesRemaining > 0);
  }

  public renderFrame(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, targetWidth: number, targetHeight: number, time: number, forceSync = false) {
    if (!ctx) return;

    if (projectStore.canvasBackground === 'transparent') {
      ctx.clearRect(0, 0, targetWidth, targetHeight);
    } else {
      ctx.fillStyle = projectStore.canvasBackground || '#000000';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }

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

        let nodes = layerRegistry.get(layer.id);
        
        // AUTO-INSTANTIATE: If layer is visible but not in registry, create it immediately
        if (isVisible && !nodes) {
          layerRegistry.instantiate(layer);
          nodes = layerRegistry.get(layer.id);
        }

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
                // SCRUBBING/IDLE: Hard seek visuals for immediate feedback
                // INCREASED THRESHOLD: 0.12s tolerance to avoid flicker on Pause
                if (absDrift > 0.12 || forceSync) media.currentTime = localTime;
                media.playbackRate = 1.0;
                if (!media.paused) media.pause();
              } else {
                // PLAYING: Video visual sync with smoothing
                if (absDrift > 0.5 || forceSync) {
                  media.currentTime = localTime;
                  media.playbackRate = 1.0;
                } else if (absDrift > 0.02) {
                  const nudgeFactor = Math.min(0.08, absDrift * 0.25);
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

        const Easing: Record<string, (t: number) => number> = {
          linear: (t) => t,
          easeIn: (t) => t * t * t,
          easeOut: (t) => 1 - Math.pow(1 - t, 3),
          easeInOut: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
          bounce: (t) => {
            const n1 = 7.5625; const d1 = 2.75;
            if (t < 1 / d1) return n1 * t * t;
            else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
            else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
            else return n1 * (t -= 2.625 / d1) * t + 0.984375;
          }
        };

        const layerTime = time - layer.startTime; // Time since layer start

        if (isVisible) {
          // In Animation
          if (layer.animIn && layer.animIn !== 'none' && layerTime < (layer.animInDuration || 1)) {
            const easeFunc = Easing[layer.animInEase || 'easeOut'] || Easing.easeOut;
            let p = easeFunc(Math.max(0, Math.min(1, layerTime / (layer.animInDuration || 1))));

            if (layer.animIn === 'fade') animAlpha = p;
            else if (layer.animIn === 'slideLeft') { animX = -500 * (1 - p); animAlpha = p; }
            else if (layer.animIn === 'slideRight') { animX = 500 * (1 - p); animAlpha = p; }
            else if (layer.animIn === 'zoomIn') { animScale = p; animAlpha = p; }
            else if (layer.animIn === 'riseUp') { animY = 100 * (1 - p); animAlpha = p; }
            else if (layer.animIn === 'blurIn') { animAlpha = p; } // Handled in filter
            else if (layer.animIn === 'rotateIn') { animRot = (1 - p) * Math.PI * 0.5; animScale = p; animAlpha = p; }
          }

          // Out Animation
          let timeFromEnd = layer.duration - layerTime;
          if (layer.animOut && layer.animOut !== 'none' && timeFromEnd < (layer.animOutDuration || 1)) {
            const easeFunc = Easing[layer.animOutEase || 'easeOut'] || Easing.easeOut;
            let p = easeFunc(Math.max(0, Math.min(1, timeFromEnd / (layer.animOutDuration || 1))));

            if (layer.animOut === 'fade') animAlpha *= p;
            else if (layer.animOut === 'slideLeft') { animX -= 500 * (1 - p); animAlpha *= p; }
            else if (layer.animOut === 'slideRight') { animX += 500 * (1 - p); animAlpha *= p; }
            else if (layer.animOut === 'slideDown') { animY += 200 * (1 - p); animAlpha *= p; }
            else if (layer.animOut === 'zoomOut') { animScale *= p; animAlpha *= p; }
            else if (layer.animOut === 'blurOut') { animAlpha *= p; }
            else if (layer.animOut === 'rotateOut') { animRot += (1 - p) * Math.PI * 0.5; animScale *= p; animAlpha *= p; }
          }

          // Loop Animation
          if (layer.animLoop && layer.animLoop !== 'none') {
            const loopSpeed = layer.animLoopSpeed || 1;
            if (layer.animLoop === 'pulse') animScale *= 1 + Math.sin(layerTime * Math.PI * 2 * loopSpeed) * 0.05;
            else if (layer.animLoop === 'wiggle') animRot += Math.sin(layerTime * Math.PI * 4 * loopSpeed) * 0.05;
            else if (layer.animLoop === 'float') animY += Math.sin(layerTime * Math.PI * 2 * loopSpeed) * 20;
            else if (layer.animLoop === 'jitter') {
              animX += (Math.random() - 0.5) * 5 * loopSpeed;
              animY += (Math.random() - 0.5) * 5 * loopSpeed;
            }
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
            const exp = (layer.exposure ?? 1) * (layer.brightness ?? 1);
            const con = (layer.contrast ?? 1) + (layer.whites ?? 0) - (layer.blacks ?? 0);
            const wht = (layer.whites ?? 0) * 0.5;
            const blk = (layer.blacks ?? 0) * 0.5;

            if (exp !== 1 || wht !== 0 || blk !== 0) filterStr += `brightness(${exp + wht + blk}) `;
            if (con !== 1) filterStr += `contrast(${con}) `;
            if ((layer.saturation ?? 1) !== 1) filterStr += `saturate(${layer.saturation}) `;
            
            // In/Out Blur effects
            if (layer.animIn === 'blurIn' && layerTime < (layer.animInDuration || 1)) {
              const p = layerTime / (layer.animInDuration || 1);
              filterStr += `blur(${20 * (1 - p)}px) `;
            }
            let timeFromEnd = layer.duration - layerTime;
            if (layer.animOut === 'blurOut' && timeFromEnd < (layer.animOutDuration || 1)) {
              const p = timeFromEnd / (layer.animOutDuration || 1);
              filterStr += `blur(${20 * (1 - p)}px) `;
            }

            ctx.filter = filterStr.trim() || 'none';

            const x = -bCvs.width / 2;
            const y = -bCvs.height / 2;
            const w = bCvs.width;
            const h = bCvs.height;
            const r = layer.borderRadius ?? 0;

            if (layer.shadowEnabled) {
              const resScale = targetWidth / 1920;
              ctx.shadowColor = layer.shadowColor || 'rgba(0,0,0,0.5)';
              ctx.shadowBlur = (layer.shadowBlur || 20) * resScale;
              ctx.shadowOffsetX = (layer.shadowOffsetX || 0) * resScale;
              ctx.shadowOffsetY = (layer.shadowOffsetY || 10) * resScale;

              // If we have border radius, we must cast shadow using a dummy shape 
              // because clipping the image later will hide the shadow if it's on the same draw call.
              if (r > 0) {
                ctx.beginPath();
                ctx.roundRect(x, y, w, h, r);
                ctx.fillStyle = '#000000'; // Opaque caster
                ctx.fill();
                ctx.shadowColor = 'transparent'; // Disable shadow for actual image draw to avoid double-rendering
              }
            }

            const isVideo = layer.type === 'video';
            const isReady = !isVideo || (sourceMedia as HTMLVideoElement).readyState >= 2;

            if (isReady) {
              // Reset stall count
              this.stallTracker.delete(layer.id);

              // Update Buffer (Persistent per-layer)
              bCtx.clearRect(0, 0, bCvs.width, bCvs.height);
              bCtx.drawImage(sourceMedia, 0, 0, bCvs.width, bCvs.height);
              
              if (layer.chromaKey) {
                this.applyChromaKey(bCtx, bCvs.width, bCvs.height, layer.chromaColor, layer.chromaTolerance);
              }
            } else if (isVisible && isVideo) {
              // Track stalls for recovery
              const stallCount = (this.stallTracker.get(layer.id) || 0) + 1;
              this.stallTracker.set(layer.id, stallCount);
              if (stallCount > 120) {
                console.warn(`[Renderer] Recovery: ${layer.id}`);
                layerRegistry.remove(layer.id);
                layerRegistry.instantiate(layer);
                this.stallTracker.delete(layer.id);
              }
            }

            // GHOSTING: Always draw the buffer. If not ready, it holds the last good frame.
            if (r > 0) {
              ctx.beginPath();
              ctx.roundRect(x, y, w, h, r);
              ctx.clip();
            }
            ctx.drawImage(bCvs, -bCvs.width / 2, -bCvs.height / 2, bCvs.width, bCvs.height);

            // WHITE BALANCE (Temp & Tint) - Optimized soft-light blend
            const temp = layer.temperature ?? 0;
            const tint = layer.tint ?? 0;
            if (temp !== 0 || tint !== 0) {
              ctx.save();
              ctx.globalCompositeOperation = 'soft-light';
              ctx.globalAlpha = Math.max(Math.abs(temp), Math.abs(tint)) * 0.4;
              
              let r = 128, g = 128, b = 128;
              if (temp > 0) { r += 100; g += 40; b -= 40; } // Warm/Orange shift
              else if (temp < 0) { r -= 40; g += 20; b += 100; } // Cool/Blue shift
              
              if (tint > 0) { r += 60; g -= 60; b += 60; } // Magenta shift
              else if (tint < 0) { r -= 60; g += 60; b -= 60; } // Green shift
              
              ctx.fillStyle = `rgb(${Math.max(0, Math.min(255, r))}, ${Math.max(0, Math.min(255, g))}, ${Math.max(0, Math.min(255, b))})`;
              ctx.fillRect(x, y, w, h);
              ctx.restore();
            }

            // VIGNETTE EFFECT (Rendered on top of filters to stay sharp)
            if ((layer.vignette ?? 0) > 0) {
              const vignetteIntensity = layer.vignette ?? 0;
              const vignetteGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.sqrt(x * x + y * y));
              vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
              vignetteGrad.addColorStop(0.6, `rgba(0,0,0,${vignetteIntensity * 0.2})`);
              vignetteGrad.addColorStop(1, `rgba(0,0,0,${vignetteIntensity})`);
              ctx.fillStyle = vignetteGrad;
              ctx.filter = 'none'; // Vignette shouldn't be affected by filters
              ctx.fillRect(x, y, w, h);
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

          if (layer.shadowEnabled) {
            const resScale = targetWidth / 1920;
            ctx.shadowColor = layer.shadowColor || 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = (layer.shadowBlur || 20) * resScale;
            ctx.shadowOffsetX = (layer.shadowOffsetX || 0) * resScale;
            ctx.shadowOffsetY = (layer.shadowOffsetY || 10) * resScale;
          }

          if (layer.letterSpacing) {
            (ctx as any).letterSpacing = `${layer.letterSpacing}px`;
          }

          // Advanced Text Effects (Typewriter, Word-based)
          const isInAnim = layer.animIn && layer.animIn !== 'none' && layerTime < (layer.animInDuration || 1);

          if (isInAnim && (layer.animIn === 'typewriter' || layer.animIn === 'typewriter+')) {
            const p = layerTime / (layer.animInDuration || 1);
            const chars = Array.from(text);
            const visibleCharsCount = Math.floor(chars.length * p);
            ctx.fillStyle = layer.fillColor || '#ffffff';
            ctx.fillText(chars.slice(0, visibleCharsCount).join(''), 0, 0);
          } else if (isInAnim && (layer.animIn === 'fadeWord' || layer.animIn === 'bounceWord')) {
            const words = text.split(' ');
            const p = layerTime / (layer.animInDuration || 1);
            const totalWords = words.length;
            
            // Measuring total width to center words manually
            const wordMetrics = words.map(w => ctx.measureText(w).width);
            const spaceWidth = ctx.measureText(' ').width;
            const totalWidth = wordMetrics.reduce((a, b) => a + b, 0) + (words.length - 1) * spaceWidth;
            
            let currentX = -totalWidth / 2;
            words.forEach((word, i) => {
              const wordStart = (i / totalWords) * 0.5; // Stagger over first 50% of duration
              const wordP = Math.max(0, Math.min(1, (p - wordStart) / 0.5));
              
              ctx.save();
              const wordEase = layer.animIn === 'bounceWord' ? Easing.bounce(wordP) : Easing.easeOut(wordP);
              ctx.globalAlpha *= (layer.animIn === 'fadeWord' ? wordP : (wordP > 0 ? 1 : 0));
              if (layer.animIn === 'bounceWord') {
                ctx.translate(currentX + wordMetrics[i] / 2, -50 * (1 - wordEase));
              } else {
                ctx.translate(currentX + wordMetrics[i] / 2, 0);
              }
              ctx.fillText(word, 0, 0);
              ctx.restore();
              currentX += wordMetrics[i] + spaceWidth;
            });
          } else {
            ctx.fillStyle = layer.fillColor || '#ffffff';
            ctx.fillText(text, 0, 0);
            if (layer.strokeWidth) {
              ctx.lineWidth = layer.strokeWidth;
              ctx.strokeStyle = layer.strokeColor || '#000000';
              ctx.strokeText(text, 0, 0);
            }
          }

          ctx.restore();
        }

        if (isVisible && layer.type === 'shape') {
          ctx.save();
          ctx.globalAlpha = animAlpha;

          ctx.translate(W / 2 + layer.posX + animX, H / 2 + layer.posY + animY);
          ctx.rotate((layer.rotation * Math.PI) / 180 + animRot);
          ctx.scale(layer.scale * animScale, layer.scale * animScale);

          const w = 400; // Standard base size for shapes
          const h = 400;
          const x = -w / 2;
          const y = -h / 2;

          if (layer.shadowEnabled) {
            const resScale = targetWidth / 1920;
            ctx.shadowColor = layer.shadowColor || 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = (layer.shadowBlur || 20) * resScale;
            ctx.shadowOffsetX = (layer.shadowOffsetX || 0) * resScale;
            ctx.shadowOffsetY = (layer.shadowOffsetY || 10) * resScale;
          }

          ctx.fillStyle = layer.fillColor || '#ffffff';
          
          if (layer.shapeType === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Default: Rectangle
            const r = layer.radius || 0;
            ctx.beginPath();
            if (r > 0) ctx.roundRect(x, y, w, h, r);
            else ctx.rect(x, y, w, h);
            ctx.fill();
          }

          ctx.restore();
        }
      }
    }

    ctx.restore(); // Restore global scale
  }
}

export const renderer = new Renderer();

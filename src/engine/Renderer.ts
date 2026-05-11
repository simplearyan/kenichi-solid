import { projectStore, setCurrentTime, setProjectStore } from '../store/projectStore';
import { layerRegistry } from './LayerRegistry';

export class Renderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private reqAnimFrameId: number | null = null;
  private lastTime = performance.now();
  private fpsLastTime = performance.now();
  private frameCount = 0;

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
        let newTime = projectStore.currentTime + dt;
        if (newTime >= projectStore.duration) {
          newTime = 0; // Loop back
        }
        setCurrentTime(newTime);
      }

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

    this.renderFrame(this.ctx as any, targetWidth, targetHeight, projectStore.currentTime);
  }

  public renderFrame(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, targetWidth: number, targetHeight: number, time: number) {
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

    for (let i = 0; i < projectStore.layers.length; i++) {
      const layer = projectStore.layers[i];
      if (layer.hidden) continue;

      const isVisible = time >= layer.startTime && time < layer.startTime + layer.duration;
      const localTime = time - layer.startTime + layer.inPoint;

      const nodes = layerRegistry.get(layer.id);
      if (layer.type !== 'text' && !nodes) continue;

      // Sync Audio/Video Playback
      if (layer.type === 'video' || layer.type === 'audio') {
        const media = layer.type === 'video' ? nodes?.videoEl : nodes?.audioEl;
        const track = projectStore.tracks.find(t => t.id === layer.trackId);

        if (media && track) {
          const trackVol = track.muted ? 0 : track.volume;
          const globalVol = projectStore.globalMuted ? 0 : projectStore.globalVolume;
          media.volume = Math.max(0, Math.min(1, layer.volume * trackVol * globalVol));

          if (isVisible) {
            // Use a wider tolerance (250ms) to avoid jitter during playback
            if (Math.abs(media.currentTime - localTime) > 0.25) {
              media.currentTime = localTime;
            }
            if (projectStore.isPlaying) {
              if (media.paused) media.play().catch(() => { });
            } else {
              if (!media.paused) media.pause();
            }
          } else {
            if (!media.paused) media.pause();
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
            if (layer.chromaKey) {
              bCtx.clearRect(0, 0, bCvs.width, bCvs.height);
              bCtx.drawImage(sourceMedia, 0, 0, bCvs.width, bCvs.height);
              this.applyChromaKey(bCtx, bCvs.width, bCvs.height, layer.chromaColor, layer.chromaTolerance);
              ctx.drawImage(bCvs, -bCvs.width / 2, -bCvs.height / 2);
            } else {
              ctx.drawImage(sourceMedia, -bCvs.width / 2, -bCvs.height / 2, bCvs.width, bCvs.height);
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

    ctx.restore(); // Restore global scale
  }
}

export const renderer = new Renderer();

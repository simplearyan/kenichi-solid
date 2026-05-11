import { projectStore, setCurrentTime } from '../store/projectStore';
import { layerRegistry } from './LayerRegistry';

export class Renderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private reqAnimFrameId: number | null = null;
  private lastTime = performance.now();

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
      const g = data[i+1];
      const b = data[i+2];
      const dist = Math.sqrt((r-tr)**2 + (g-tg)**2 + (b-tb)**2);
      if (dist < threshold) {
        data[i+3] = 0; // Transparent
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  render() {
    if (!this.ctx || !this.canvas) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, W, H);

    const time = projectStore.currentTime;

    for (let i = 0; i < projectStore.layers.length; i++) {
      const layer = projectStore.layers[i];
      if (layer.hidden) continue;

      const isVisible = time >= layer.startTime && time < layer.startTime + layer.duration;
      const localTime = time - layer.startTime + layer.inPoint;

      const nodes = layerRegistry.get(layer.id);
      if (!nodes) continue;

      // Sync Audio/Video Playback
      if (layer.type === 'video' || layer.type === 'audio') {
        const media = layer.type === 'video' ? nodes.videoEl : nodes.audioEl;
        if (media) {
          if (isVisible) {
            // Drift correction
            if (Math.abs(media.currentTime - localTime) > 0.1) {
              media.currentTime = localTime;
            }
            if (projectStore.isPlaying) {
              if (media.paused) media.play().catch(()=>{});
            } else {
              if (!media.paused) media.pause();
            }
          } else {
            if (!media.paused) media.pause();
          }
        }
        
        // Sync Audio FX
        if (nodes.gainNode) {
          nodes.gainNode.gain.value = projectStore.globalMuted ? 0 : layer.volume;
        }
        if (nodes.echoMixNode) {
          nodes.echoMixNode.gain.value = layer.echo ? 1.0 : 0.0;
        }
      }

      // Visual Rendering
      if (isVisible && (layer.type === 'video' || layer.type === 'image')) {
        const sourceMedia = layer.type === 'video' ? nodes.videoEl : nodes.imgEl;
        const bCtx = nodes.bufferCtx;
        const bCvs = nodes.bufferCanvas;

        if (sourceMedia && bCtx && bCvs && bCvs.width > 0 && bCvs.height > 0) {
          // 1. Draw to offscreen buffer
          bCtx.clearRect(0, 0, bCvs.width, bCvs.height);
          
          if (layer.type === 'video' && (sourceMedia as HTMLVideoElement).readyState >= 2) {
             bCtx.drawImage(sourceMedia, 0, 0, bCvs.width, bCvs.height);
          } else if (layer.type === 'image') {
             bCtx.drawImage(sourceMedia, 0, 0, bCvs.width, bCvs.height);
          }

          // 2. Apply Pixel FX Proxy
          if (layer.chromaKey) {
            this.applyChromaKey(bCtx, bCvs.width, bCvs.height, layer.chromaColor, layer.chromaTolerance);
          }

          // 3. Draw onto main canvas with transforms
          this.ctx.save();
          
          // Move to center of screen + custom position
          this.ctx.translate(W/2 + layer.posX, H/2 + layer.posY);
          this.ctx.rotate((layer.rotation * Math.PI) / 180);
          this.ctx.scale(layer.scale, layer.scale);
          
          // Apply brightness/contrast
          let filterStr = '';
          if (layer.brightness !== 1) filterStr += `brightness(${layer.brightness}) `;
          if (layer.contrast !== 1) filterStr += `contrast(${layer.contrast}) `;
          if (filterStr) this.ctx.filter = filterStr.trim();

          // Draw the buffer centered
          this.ctx.drawImage(bCvs, -bCvs.width/2, -bCvs.height/2);

          this.ctx.restore();
        }
      }
    }
  }
}

export const renderer = new Renderer();

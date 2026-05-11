import { projectStore, type LayerState } from '../store/projectStore';
import { audioEngine } from './AudioEngine';

export interface LayerNodes {
  videoEl?: HTMLVideoElement;
  audioEl?: HTMLAudioElement;
  imgEl?: HTMLImageElement;
  bufferCanvas?: HTMLCanvasElement;
  bufferCtx?: CanvasRenderingContext2D | null;
}

class LayerRegistryManager {
  private registry = new Map<string, LayerNodes>();

  register(id: string, nodes: LayerNodes) {
    this.registry.set(id, nodes);
  }

  get(id: string) {
    return this.registry.get(id);
  }

  instantiate(layer: LayerState) {
    if (this.registry.has(layer.id)) return;
    const nodes: LayerNodes = {};
    const media = layer.mediaId ? projectStore.mediaPool[layer.mediaId] : null;

    if (media) {
      if (media.type === 'video') {
        const v = document.createElement('video');
        v.src = media.url;
        v.playsInline = true;
        v.load();
        nodes.videoEl = v;
        document.getElementById('hidden-media-container')?.appendChild(v);
      } else if (media.type === 'audio') {
        const a = document.createElement('audio');
        a.src = media.url;
        a.load();
        nodes.audioEl = a;
        document.getElementById('hidden-media-container')?.appendChild(a);
      } else if (media.type === 'image') {
        const img = new Image();
        img.src = media.url;
        nodes.imgEl = img;
      }
      
      if (media.type === 'video' || media.type === 'image') {
        const cvs = document.createElement('canvas');
        cvs.width = media.origW || 1920;
        cvs.height = media.origH || 1080;
        nodes.bufferCanvas = cvs;
        nodes.bufferCtx = cvs.getContext('2d', { willReadFrequently: true });
      }
    }
    
    // Todo: Handle text/shape instantiation if needed
    
    this.register(layer.id, nodes);
  }

  remove(id: string) {
    const nodes = this.registry.get(id);
    if (!nodes) return;

    if (nodes.videoEl) {
      nodes.videoEl.pause();
      nodes.videoEl.removeAttribute('src');
      nodes.videoEl.load();
      nodes.videoEl.remove();
    }
    
    if (nodes.audioEl) {
      nodes.audioEl.pause();
      nodes.audioEl.removeAttribute('src');
      nodes.audioEl.load();
      nodes.audioEl.remove();
    }

    this.registry.delete(id);
  }

  clear() {
    for (const key of this.registry.keys()) {
      this.remove(key);
    }
  }
}

export const layerRegistry = new LayerRegistryManager();

import { projectStore, type LayerState } from '../store/projectStore';
import { audioEngine } from './AudioEngine';

export interface LayerNodes {
  videoEl?: HTMLVideoElement;
  audioEl?: HTMLAudioElement;
  imgEl?: HTMLImageElement;
  bufferCanvas?: HTMLCanvasElement;
  bufferCtx?: CanvasRenderingContext2D | null;
  
  // Audio Routing
  sourceNode?: MediaElementAudioSourceNode;
  gainNode?: GainNode;
  echoDelayNode?: DelayNode;
  echoFeedbackNode?: GainNode;
  echoMixNode?: GainNode;
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
        v.crossOrigin = 'anonymous';
        v.playsInline = true;
        v.load();
        nodes.videoEl = v;
      } else if (media.type === 'audio') {
        const a = document.createElement('audio');
        a.src = media.url;
        a.crossOrigin = 'anonymous';
        a.load();
        nodes.audioEl = a;
      } else if (media.type === 'image') {
        const img = new Image();
        img.src = media.url;
        img.crossOrigin = 'anonymous';
        nodes.imgEl = img;
      }
      
      if (media.type === 'video' || media.type === 'audio') {
        audioEngine.init();
        if (audioEngine.ctx) {
          const el = nodes.videoEl || nodes.audioEl!;
          nodes.sourceNode = audioEngine.ctx.createMediaElementSource(el);
          nodes.gainNode = audioEngine.ctx.createGain();
          nodes.echoMixNode = audioEngine.ctx.createGain();
          nodes.echoDelayNode = audioEngine.ctx.createDelay(5.0);
          nodes.echoFeedbackNode = audioEngine.ctx.createGain();

          nodes.sourceNode.connect(nodes.gainNode);
          nodes.gainNode.connect(nodes.echoMixNode);
          nodes.gainNode.connect(nodes.echoDelayNode);
          nodes.echoDelayNode.connect(nodes.echoFeedbackNode);
          nodes.echoFeedbackNode.connect(nodes.echoDelayNode);
          nodes.echoDelayNode.connect(nodes.echoMixNode);
          nodes.echoMixNode.connect(audioEngine.ctx.destination);
          
          nodes.gainNode.gain.value = layer.volume;
          nodes.echoMixNode.gain.value = layer.echo ? 1.0 : 0.0;
        }
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
    }
    
    if (nodes.audioEl) {
      nodes.audioEl.pause();
      nodes.audioEl.removeAttribute('src');
      nodes.audioEl.load();
    }

    if (nodes.sourceNode) nodes.sourceNode.disconnect();
    if (nodes.gainNode) nodes.gainNode.disconnect();
    if (nodes.echoDelayNode) nodes.echoDelayNode.disconnect();
    if (nodes.echoFeedbackNode) nodes.echoFeedbackNode.disconnect();
    if (nodes.echoMixNode) nodes.echoMixNode.disconnect();

    this.registry.delete(id);
  }

  clear() {
    for (const key of this.registry.keys()) {
      this.remove(key);
    }
  }
}

export const layerRegistry = new LayerRegistryManager();

import { projectStore } from '../store/projectStore';

export interface ActiveNode {
  id: string;
  source: AudioBufferSourceNode;
  gain: GainNode;
}

export class AudioEngine {
  public ctx: AudioContext | null = null;
  private bufferRegistry = new Map<string, AudioBuffer>();
  private activeNodes: ActiveNode[] = [];
  
  private playbackStartAudioTime = 0;
  private playbackStartTimelineTime = 0;
  private heartbeatNode: OscillatorNode | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'interactive'
      });
    }
    
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (!this.heartbeatNode && this.ctx) {
      this.heartbeatNode = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      gain.gain.value = 0.000001; 
      this.heartbeatNode.connect(gain);
      gain.connect(this.ctx.destination);
      this.heartbeatNode.start();
    }
    
    return this.ctx;
  }

  // --- Buffer Management ---

  async storeBuffer(id: string, url: string) {
    const ctx = this.init();
    if (!ctx) return;
    
    try {
      const res = await fetch(url);
      const arrayBuffer = await res.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      this.bufferRegistry.set(id, audioBuffer);
      console.log(`[AudioEngine] Decoded buffer for ${id}`);
    } catch (e) {
      console.error(`[AudioEngine] Failed to decode ${id}`, e);
    }
  }

  getBuffer(id: string) {
    return this.bufferRegistry.get(id);
  }

  // --- Playback Control ---

  startClock(currentTimelineTime: number) {
    this.init();
    if (!this.ctx) return;
    
    if (this.ctx.state !== 'running') {
      this.ctx.resume();
    }

    this.playbackStartAudioTime = this.ctx.currentTime;
    this.playbackStartTimelineTime = currentTimelineTime;

    // Schedule all visible audio buffers
    this.scheduleAll(currentTimelineTime);
  }

  refreshScheduling() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const currentTime = this.getPreciseTime();
    if (currentTime !== null) {
      this.scheduleAll(currentTime);
    }
  }

  private scheduleAll(startTime: number) {
    this.stopPlayback();
    if (!this.ctx) return;

    const layers = projectStore.layers;
    const tracks = projectStore.tracks;

    for (const layer of layers) {
      if (layer.type !== 'audio' && layer.type !== 'video') continue;
      if (layer.hidden) continue;

      const buffer = this.getBuffer(layer.id);
      if (!buffer) continue;

      const track = tracks.find(t => t.id === layer.trackId);
      if (!track || track.hidden) continue;

      // Calculate when to play
      // layer.startTime: when the clip starts in the project
      // layer.inPoint: where we start inside the audio file
      
      const clipEnd = layer.startTime + layer.duration;
      if (clipEnd <= startTime) continue; // Already passed

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      const gain = this.ctx.createGain();
      const trackVol = track.muted ? 0 : track.volume;
      const globalVol = projectStore.globalMuted ? 0 : projectStore.globalVolume;
      gain.gain.value = layer.volume * trackVol * globalVol;

      source.connect(gain);
      gain.connect(this.ctx.destination);

      // Timing math
      const delay = Math.max(0, layer.startTime - startTime);
      const timeInClip = Math.max(0, startTime - layer.startTime);
      const offsetInFile = layer.inPoint + timeInClip;
      const durationToPlay = layer.duration - timeInClip;

      if (durationToPlay > 0) {
        source.start(this.ctx.currentTime + delay, offsetInFile, durationToPlay);
        this.activeNodes.push({ id: layer.id, source, gain });
      }
    }
  }

  stopPlayback() {
    this.activeNodes.forEach(node => {
      try {
        node.source.stop();
        node.source.disconnect();
        node.gain.disconnect();
      } catch (e) {}
    });
    this.activeNodes = [];
  }

  updateVolumes() {
    if (!this.ctx) return;
    const layers = projectStore.layers;
    const tracks = projectStore.tracks;

    this.activeNodes.forEach(node => {
      const layer = layers.find(l => l.id === node.id);
      if (!layer) return;
      const track = tracks.find(t => t.id === layer.trackId);
      if (!track) return;

      const trackVol = track.muted ? 0 : track.volume;
      const globalVol = projectStore.globalMuted ? 0 : projectStore.globalVolume;
      const targetVol = layer.volume * trackVol * globalVol;
      
      // Use ramp for smoother volume changes
      node.gain.gain.setTargetAtTime(targetVol, this.ctx!.currentTime, 0.05);
    });
  }

  getPreciseTime() {
    if (!this.ctx || this.ctx.state !== 'running') return null;
    return this.playbackStartTimelineTime + (this.ctx.currentTime - this.playbackStartAudioTime);
  }

  reset(currentTimelineTime: number) {
    if (this.ctx) {
      this.playbackStartAudioTime = this.ctx.currentTime;
      this.playbackStartTimelineTime = currentTimelineTime;
    }
  }
}

export const audioEngine = new AudioEngine();



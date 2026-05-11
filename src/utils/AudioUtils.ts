import { audioEngine } from '../engine/AudioEngine';

export const generatePeaks = async (url: string, buckets: number = 200): Promise<number[]> => {
  try {
    audioEngine.init();
    if (!audioEngine.ctx) return [];
    
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    const decoded = await audioEngine.ctx.decodeAudioData(buf);
    const channel = decoded.getChannelData(0);
    const step = Math.ceil(channel.length / buckets);
    const peaks: number[] = [];
    
    for(let i=0; i<buckets; i++) {
      let max = 0;
      for(let j=0; j<step && (i*step+j)<channel.length; j++) {
        max = Math.max(max, Math.abs(channel[i*step+j]));
      }
      peaks.push(max);
    }
    return peaks;
  } catch(e) {
    console.warn("Waveform gen failed:", e);
    return [];
  }
};

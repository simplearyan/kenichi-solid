import { projectStore } from '../store/projectStore';
import { renderer } from './Renderer';
import { layerRegistry } from './LayerRegistry';

export interface ExportConfig {
  format: 'mp4' | 'webm' | 'mov' | 'zip';
  resolution: '720' | '1080' | '1440' | '2160';
  fps: number;
}

import ZipWorker from '../workers/zip.worker.ts?worker';
import MediaWorker from '../workers/mediabunny.worker.ts?worker';

export const exportProject = async (config: ExportConfig, onProgress: (progress: number, status: string) => void) => {
  const aspectRatioStr = projectStore.aspectRatio;
  let aspectX = 16, aspectY = 9;
  if (aspectRatioStr === '9/16') { aspectX = 9; aspectY = 16; }
  else if (aspectRatioStr === '1/1') { aspectX = 1; aspectY = 1; }

  let targetH = parseInt(config.resolution);
  let targetW = Math.round(targetH * (aspectX / aspectY));
  
  const worker = config.format === 'zip' ? new ZipWorker() : new MediaWorker();
  
  onProgress(0, 'Initializing Web Worker...');
  
  worker.postMessage({
    type: 'CONFIG',
    data: {
      width: targetW,
      height: targetH,
      fps: config.fps,
      format: config.format,
      bitrate: targetH >= 2160 ? 40000000 : targetH >= 1440 ? 20000000 : targetH >= 1080 ? 10000000 : 5000000,
      hasAudio: config.format !== 'zip'
    }
  });

  await new Promise((resolve, reject) => {
    const handler = (e: MessageEvent) => { 
        if (e.data.type === 'READY') { 
            worker.removeEventListener('message', handler); 
            resolve(true); 
        } else if (e.data.type === 'ERROR') {
            worker.removeEventListener('message', handler); 
            reject(new Error(e.data.error));
        }
    };
    worker.addEventListener('message', handler);
  });

  const sampleRate = 48000;
  const duration = projectStore.duration;
  
  if (config.format !== 'zip') {
    onProgress(0, 'Rendering Offline Audio Mixdown...');
    try {
      const offlineCtx = new OfflineAudioContext(2, Math.ceil(sampleRate * duration), sampleRate);
      
      for (const layer of projectStore.layers) {
        if (layer.hidden || (layer.type !== 'audio' && layer.type !== 'video')) continue;
        const track = projectStore.tracks.find(t => t.id === layer.trackId);
        if (!track || track.hidden || track.muted) continue;
        
        const mediaId = layer.mediaId;
        const media = projectStore.mediaPool[mediaId || ''];
        if (!media) continue;
        
        const response = await fetch(media.url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);
        
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        
        const gain = offlineCtx.createGain();
        gain.gain.value = layer.volume * track.volume * projectStore.globalVolume;
        
        source.connect(gain);
        gain.connect(offlineCtx.destination);
        
        source.start(layer.startTime, layer.inPoint, layer.duration);
      }
      
      const renderedBuffer = await offlineCtx.startRendering();
      onProgress(0, 'Sending Audio Data to Worker...');
      
      const length = renderedBuffer.length;
      const CHUNK_FRAMES = sampleRate; 
      
      for (let i = 0; i < length; i += CHUNK_FRAMES) {
        const chunkFrames = Math.min(CHUNK_FRAMES, length - i);
        const planarData = new Float32Array(chunkFrames * 2);
        
        planarData.set(renderedBuffer.getChannelData(0).subarray(i, i + chunkFrames), 0);
        if (renderedBuffer.numberOfChannels > 1) {
            planarData.set(renderedBuffer.getChannelData(1).subarray(i, i + chunkFrames), chunkFrames);
        } else {
            planarData.set(renderedBuffer.getChannelData(0).subarray(i, i + chunkFrames), chunkFrames);
        }
        
        worker.postMessage({
            type: 'ENCODE_AUDIO_CHUNK',
            data: {
                format: 'f32-planar',
                sampleRate: sampleRate,
                numberOfFrames: chunkFrames,
                numberOfChannels: 2,
                timestamp: Math.round((i / sampleRate) * 1000000), 
                buffer: planarData
            }
        }, [planarData.buffer]);
      }
    } catch (err) {
      console.warn("Audio Mixdown Error:", err);
    }
  }

  const totalFrames = Math.ceil(duration * config.fps);
  const canvas = new OffscreenCanvas(targetW, targetH);
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error("Could not get OffscreenCanvas context");

  for (let f = 0; f < totalFrames; f++) {
    const t = f / config.fps;
    onProgress(Math.round((f / totalFrames) * 100), `Rendering Frame ${f + 1} of ${totalFrames}`);

    const promises: Promise<any>[] = [];
    for (const layer of projectStore.layers) {
      if (layer.hidden) continue;
      const track = projectStore.tracks.find(tr => tr.id === layer.trackId);
      if (track && (track.hidden || track.muted)) {
        // Skip hidden tracks but ensure they are removed from registry if not needed
        continue;
      }
      
      if (t >= layer.startTime && t < layer.startTime + layer.duration) {
         // Ensure layer is instantiated
         let nodes = layerRegistry.get(layer.id);
         if (!nodes) {
           layerRegistry.instantiate(layer);
           nodes = layerRegistry.get(layer.id);
         }

         if (nodes && layer.type === 'video' && nodes.videoEl) {
           const vid = nodes.videoEl;
           const localT = t - layer.startTime + layer.inPoint;
           
           // Seek and Wait
           vid.currentTime = localT;
           promises.push(new Promise(r => {
             const onSeeked = () => { 
               vid.removeEventListener('seeked', onSeeked); 
               // Small delay to ensure texture is uploaded
               setTimeout(() => r(true), 16); 
             };
             if (vid.readyState >= 2 && Math.abs(vid.currentTime - localT) < 0.01) {
               r(true);
             } else {
               vid.addEventListener('seeked', onSeeked);
               // Safety timeout
               setTimeout(() => { vid.removeEventListener('seeked', onSeeked); r(true); }, 1000);
             }
           }));
         } else if (nodes && layer.type === 'image' && nodes.imgEl) {
            const img = nodes.imgEl;
            if (!img.complete) {
              promises.push(new Promise(r => {
                img.onload = () => r(true);
                img.onerror = () => r(true);
                setTimeout(r, 1000); // Safety
              }));
            }
         }
      }
    }
    await Promise.all(promises);

    // CRITICAL: Yield to the browser rendering pipeline to flush textures to the GPU
    // This gives low-end PCs enough time to properly decode the frame and make it available for drawImage
    await new Promise(r => setTimeout(r, 25));

    renderer.renderFrame(ctx, targetW, targetH, t);
    
    const bitmap = await createImageBitmap(canvas);
    
    let frameDoneHandler: any;
    const p = new Promise(r => {
       frameDoneHandler = (e: MessageEvent) => { if (e.data.type === 'FRAME_DONE') r(true); };
       worker.addEventListener('message', frameDoneHandler);
    });
    
    worker.postMessage({
      type: 'ENCODE_FRAME',
      data: {
        bitmap,
        timestamp: Math.round(t * 1000000),
        duration: Math.round((1 / config.fps) * 1000000)
      }
    }, [bitmap]);
    
    await p;
    worker.removeEventListener('message', frameDoneHandler);
  }

  onProgress(100, 'Finalizing Encoding...');
  
  const finalPromise = new Promise<any>((resolve, reject) => {
    worker.onmessage = (e) => {
      if (e.data.type === 'COMPLETE') resolve(e.data.data);
      else if (e.data.type === 'ERROR') reject(new Error(e.data.error));
    };
  });
  
  worker.postMessage({ type: 'FINALIZE' });
  const result = await finalPromise;
  
  worker.terminate();
  return result;
};

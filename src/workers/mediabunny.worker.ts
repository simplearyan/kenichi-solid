/// <reference lib="webworker" />
import {
    Output,
    BufferTarget,
    Mp4OutputFormat,
    WebMOutputFormat,
    MovOutputFormat,
    VideoSampleSource,
    VideoSample,
    AudioSampleSource,
    AudioSample
} from 'mediabunny';

let output: Output | null = null;
let target: BufferTarget | null = null;
let videoSource: VideoSampleSource | null = null;
let audioSource: AudioSampleSource | null = null;

let pendingFrames = 0;
let lastProgressUpdate = 0;

const sendProgress = (force = false) => {
    const now = Date.now();
    if (force || now - lastProgressUpdate > 50) {
        self.postMessage({ type: 'PROGRESS', data: { queueSize: pendingFrames } });
        lastProgressUpdate = now;
    }
};

const taskQueue: any[] = [];
let isProcessing = false;

const processQueue = async () => {
    if (isProcessing || taskQueue.length === 0) return;
    isProcessing = true;
    try {
        while (taskQueue.length > 0) {
            const data = taskQueue.shift();
            
            if (data.type === 'video') {
                const { bitmap, timestamp, duration } = data;
                try {
                    if (!videoSource) throw new Error("Video Source not initialized");
                    const frame = new VideoFrame(bitmap, { timestamp: Math.round(timestamp), duration: duration ? Math.round(duration) : undefined });
                    const sample = new VideoSample(frame);
                    try { await videoSource.add(sample); } 
                    finally { sample.close(); frame.close(); bitmap.close(); }
                    self.postMessage({ type: 'FRAME_DONE' });
                } catch (err: any) {
                    self.postMessage({ type: 'ERROR', error: err.message });
                }
                pendingFrames--;
                sendProgress(true);
            } else if (data.type === 'audio') {
                try {
                    if (!audioSource) throw new Error("Audio Source not initialized");
                    
                    // audioData needs to be an AudioData instance (WebCodecs)
                    // The main thread creates the AudioData object and sends it.
                    // Wait, AudioData is transferable? Actually AudioData cannot be directly sent via postMessage in all browsers.
                    // Instead, main thread should send the buffer (Float32Array) and we construct AudioData here.
                    const audioData = new AudioData({
                        format: data.format,
                        sampleRate: data.sampleRate,
                        numberOfFrames: data.numberOfFrames,
                        numberOfChannels: data.numberOfChannels,
                        timestamp: data.timestamp,
                        data: data.buffer
                    });
                    const sample = new AudioSample(audioData);
                    try { await audioSource.add(sample); }
                    finally { sample.close(); audioData.close(); }
                    self.postMessage({ type: 'AUDIO_CHUNK_DONE' });
                } catch(err: any) {
                    self.postMessage({ type: 'ERROR', error: err.message });
                }
            }
        }
    } finally {
        isProcessing = false;
    }
};

self.onmessage = async (e: MessageEvent) => {
    const { type, data } = e.data;
    try {
        if (type === 'CONFIG') {
            const config = data;
            target = new BufferTarget();

            let format;
            if (config.format === 'webm') format = new WebMOutputFormat();
            else if (config.format === 'mov') format = new MovOutputFormat();
            else format = new Mp4OutputFormat();

            output = new Output({ target, format });

            const codec = config.format === 'webm' ? 'vp9' : 'avc';

            videoSource = new VideoSampleSource({
                width: config.width,
                height: config.height,
                frameRate: config.fps,
                codec: codec,
                bitrate: config.bitrate || 6000000
            } as any);
            await output.addVideoTrack(videoSource);

            if (config.hasAudio) {
                audioSource = new AudioSampleSource({
                    sampleRate: config.sampleRate || 48000,
                    numberOfChannels: 2,
                    codec: 'aac',
                    bitrate: 192000
                } as any);
                await output.addAudioTrack(audioSource);
            }

            await output.start();
            self.postMessage({ type: 'READY' });
        }
        else if (type === 'ENCODE_FRAME') {
            pendingFrames++;
            sendProgress();
            taskQueue.push({ type: 'video', ...data });
            processQueue();
        }
        else if (type === 'ENCODE_AUDIO_CHUNK') {
            taskQueue.push({ type: 'audio', ...data });
            processQueue();
        }
        else if (type === 'FINALIZE') {
            const drainQueue = async () => {
                while (taskQueue.length > 0 || isProcessing) await new Promise(r => setTimeout(r, 50));
            };
            await drainQueue();

            try {
                if (videoSource) await videoSource.close();
                if (audioSource) await audioSource.close();
                if (output) await output.finalize();

                let attempts = 0;
                while (!target?.buffer && attempts < 100) {
                    await new Promise(r => setTimeout(r, 100));
                    attempts++;
                }

                if (target && target.buffer) {
                    (self as any).postMessage({ type: 'COMPLETE', data: target.buffer }, [target.buffer]);
                } else {
                    throw new Error("Export failed: Buffer empty after finalize.");
                }
            } catch (err: any) {
                self.postMessage({ type: 'ERROR', error: `Finalize Error: ${err.message}` });
            }
        }
    } catch (err: any) {
        self.postMessage({ type: 'ERROR', error: err.message });
    }
};

import JSZip from 'jszip';

let zip: JSZip | null = null;
let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let frameCount = 0;

self.onmessage = async (e: MessageEvent) => {
    const { type, data } = e.data;
    try {
        if (type === 'CONFIG') {
            zip = new JSZip();
            frameCount = 0;
            canvas = new OffscreenCanvas(data.width, data.height);
            ctx = canvas.getContext('2d');
            self.postMessage({ type: 'READY' });
        } 
        else if (type === 'ENCODE_FRAME') {
            const { bitmap } = data;
            if (!ctx || !canvas || !zip) return;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(bitmap, 0, 0);
            
            const blob = await canvas.convertToBlob({ type: 'image/png' });
            const filename = `frame_${String(frameCount).padStart(5, '0')}.png`;
            zip.file(filename, blob);
            
            frameCount++;
            bitmap.close();
            
            self.postMessage({ type: 'FRAME_DONE' });
        } 
        else if (type === 'FINALIZE') {
            self.postMessage({ type: 'LOG', message: 'Generating ZIP archive...' });
            if (!zip) return;
            const content = await zip.generateAsync({ type: 'blob' });
            self.postMessage({ type: 'COMPLETE', data: content });
        }
    } catch (err: any) {
        self.postMessage({ type: 'ERROR', error: err.message });
    }
};

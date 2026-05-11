export class Renderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private reqAnimFrameId: number | null = null;

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize(1920, 1080); // Default Full HD resolution
    this.startLoop();
  }

  resize(width: number, height: number) {
    if (!this.canvas) return;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  startLoop() {
    const loop = () => {
      this.render();
      this.reqAnimFrameId = requestAnimationFrame(loop);
    };
    loop();
  }

  stopLoop() {
    if (this.reqAnimFrameId) {
      cancelAnimationFrame(this.reqAnimFrameId);
    }
  }

  render() {
    if (!this.ctx || !this.canvas) return;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background
    this.ctx.fillStyle = '#000000'; // Default to black background
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // TODO: Loop through layers from projectStore and draw them
  }
}

export const renderer = new Renderer();

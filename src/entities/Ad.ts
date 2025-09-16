import { AdsConfig } from '../types/config';

export class Ad {
  public x: number;
  public y: number;
  public text: string;
  public speed: number;
  public alpha: number;
  private config: AdsConfig;
  private creationTime: number;

  constructor(x: number, y: number, text: string, config: AdsConfig) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.config = config;
    this.speed = config.fallSpeed;
    this.alpha = config.style.alpha;
    this.creationTime = Date.now();
  }

  public update(deltaTime: number): void {
    // Move downward
    this.y += this.speed * (deltaTime / 16); // Normalize for 60fps
  }

  public isOffScreen(canvasHeight: number): boolean {
    return this.y > canvasHeight + 50; // Add some margin
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    
    // Set font and styling
    ctx.font = `${this.config.style.fontSize}px "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = this.alpha;
    
    // Draw outline
    if (this.config.style.outlineWidth > 0) {
      ctx.strokeStyle = this.config.style.outlineColor;
      ctx.lineWidth = this.config.style.outlineWidth;
      ctx.strokeText(this.text, this.x, this.y);
    }
    
    // Draw text
    ctx.fillStyle = this.config.style.color;
    ctx.fillText(this.text, this.x, this.y);
    
    ctx.restore();
  }

  public getWidth(ctx: CanvasRenderingContext2D): number {
    ctx.save();
    ctx.font = `${this.config.style.fontSize}px "Segoe UI", Arial, sans-serif`;
    const width = ctx.measureText(this.text).width;
    ctx.restore();
    return width;
  }
}

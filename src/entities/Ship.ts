import { GameConfig } from '../types/config';

export class Ship {
  public x: number;
  public y: number;
  public width: number = 64;
  public height: number = 64;
  private image: HTMLImageElement | null = null;
  private imageLoaded: boolean = false;
  private config: GameConfig;

  constructor(x: number, y: number, config: GameConfig) {
    this.x = x;
    this.y = y;
    this.config = config;
    this.loadImage();
  }

  private loadImage() {
    this.image = new Image();
    this.image.onload = () => {
      this.imageLoaded = true;
      // Use actual image dimensions or config target size
      this.width = this.config.ship.spriteTargetPx;
      this.height = this.config.ship.spriteTargetPx;
    };
    this.image.onerror = () => {
      console.warn('Failed to load ship image, using fallback');
      this.imageLoaded = false;
    };
    this.image.src = this.config.ship.skins.default;
  }

  public update(deltaTime: number, movementX: number, movementY: number, canvasWidth: number, canvasHeight: number) {
    // Move based on input and speed
    const speed = this.config.ship.moveSpeed;
    this.x += movementX * speed * deltaTime;
    this.y += movementY * speed * deltaTime;

    // Keep ship within bounds
    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;
    
    this.x = Math.max(halfWidth, Math.min(canvasWidth - halfWidth, this.x));
    this.y = Math.max(halfHeight, Math.min(canvasHeight - halfHeight, this.y));
  }

  public render(ctx: CanvasRenderingContext2D) {
    if (this.imageLoaded && this.image) {
      // Draw the actual ship image
      ctx.drawImage(
        this.image,
        this.x - this.width / 2,
        this.y - this.height / 2,
        this.width,
        this.height
      );
    } else {
      // Fallback: draw a simple triangle
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.fillStyle = '#00AAFF';
      ctx.beginPath();
      ctx.moveTo(0, -this.height / 2);
      ctx.lineTo(-this.width / 2, this.height / 2);
      ctx.lineTo(this.width / 2, this.height / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}

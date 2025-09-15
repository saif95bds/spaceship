import { GameConfig } from '../types/config';

export class Projectile {
  public x: number;
  public y: number;
  public width: number = 8;
  public height: number = 16;
  public speed: number;
  public alive: boolean = true;
  private image: HTMLImageElement | null = null;
  private imageLoaded: boolean = false;
  private config: GameConfig;

  constructor(x: number, y: number, config: GameConfig) {
    this.x = x;
    this.y = y;
    this.config = config;
    this.speed = config.projectile.speed;
    this.loadImage();
  }

  private loadImage() {
    this.image = new Image();
    this.image.onload = () => {
      this.imageLoaded = true;
    };
    this.image.onerror = () => {
      console.warn('Failed to load projectile image, using fallback');
      this.imageLoaded = false;
    };
    this.image.src = this.config.projectile.sprite;
  }

  public update(deltaTime: number, canvasHeight: number) {
    // Move upward
    this.y -= this.speed * deltaTime;
    
    // Remove if off screen
    if (this.y + this.height < 0) {
      this.alive = false;
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    if (this.imageLoaded && this.image) {
      // Draw the projectile image
      ctx.drawImage(
        this.image,
        this.x - this.width / 2,
        this.y - this.height / 2,
        this.width,
        this.height
      );
    } else {
      // Fallback: draw a simple rectangle
      ctx.fillStyle = '#00FFFF';
      ctx.fillRect(
        this.x - this.width / 2,
        this.y - this.height / 2,
        this.width,
        this.height
      );
    }
  }

  public getCollisionRadius(): number {
    return Math.min(this.width, this.height) / 2;
  }
}

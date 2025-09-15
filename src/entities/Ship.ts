import { GameConfig } from '../types/config';
import { Projectile } from './Projectile';

export class Ship {
  public x: number;
  public y: number;
  public width: number = 64;
  public height: number = 64;
  public lives: number;
  private image: HTMLImageElement | null = null;
  private imageLoaded: boolean = false;
  private config: GameConfig;
  private lastFireTime: number = 0;
  private fireInterval: number; // Time between shots in milliseconds
  private invincible: boolean = false;
  private invincibilityEndTime: number = 0;
  private invincibilityDuration: number = 2000; // 2 seconds of invincibility

  constructor(x: number, y: number, config: GameConfig) {
    this.x = x;
    this.y = y;
    this.config = config;
    this.lives = config.ship.lives.start;
    this.fireInterval = 1000 / config.projectile.fireRate; // Convert rate to interval
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

  public update(deltaTime: number, movementX: number, movementY: number, canvasWidth: number, canvasHeight: number, currentTime: number): Projectile | null {
    // Update invincibility
    if (this.invincible && currentTime >= this.invincibilityEndTime) {
      this.invincible = false;
    }

    // Move based on input and speed
    const speed = this.config.ship.moveSpeed;
    this.x += movementX * speed * deltaTime;
    this.y += movementY * speed * deltaTime;

    // Keep ship within bounds
    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;
    
    this.x = Math.max(halfWidth, Math.min(canvasWidth - halfWidth, this.x));
    this.y = Math.max(halfHeight, Math.min(canvasHeight - halfHeight, this.y));

    // Auto-fire projectiles
    if (this.config.ship.autoFire && currentTime - this.lastFireTime >= this.fireInterval) {
      this.lastFireTime = currentTime;
      // Create projectile at ship position, slightly above
      return new Projectile(this.x, this.y - this.height / 2 - 10, this.config);
    }

    return null;
  }

  public render(ctx: CanvasRenderingContext2D) {
    // Flash effect during invincibility
    if (this.invincible) {
      const flashRate = 8; // Flashes per second
      const flashTime = Date.now() / (1000 / flashRate);
      if (Math.floor(flashTime) % 2 === 0) {
        return; // Skip rendering (creates flashing effect)
      }
    }

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

  public getCollisionRadius(): number {
    return (Math.min(this.width, this.height) / 2) * this.config.ship.collision.radiusScale;
  }

  public takeDamage(currentTime: number): boolean {
    if (this.invincible) {
      return false; // No damage if invincible
    }
    
    this.lives--;
    this.invincible = true;
    this.invincibilityEndTime = currentTime + this.invincibilityDuration;
    
    return this.lives <= 0; // Return true if ship is destroyed
  }

  public isInvincible(): boolean {
    return this.invincible;
  }

  public canTakeDamage(): boolean {
    return !this.invincible;
  }
}

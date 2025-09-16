import { GameConfig } from '../types/config';
import { Projectile } from './Projectile';
import { logger } from '../utils/Logger';

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
  private barrels: number = 1; // Number of barrels/cannons
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
      logger.assets('Failed to load ship image, using fallback');
      this.imageLoaded = false;
    };
    this.image.src = this.config.ship.skins.default;
  }

  public update(deltaTime: number, movementX: number, movementY: number, canvasWidth: number, canvasHeight: number, currentTime: number, projectileFactory?: (x: number, y: number) => Projectile, touchTarget?: { x: number; y: number } | null): Projectile[] {
    // Update invincibility
    if (this.invincible && currentTime >= this.invincibilityEndTime) {
      this.invincible = false;
    }

    // Move based on input and speed
    const speed = this.config.ship.moveSpeed;
    
    // Use responsive touch movement for mobile
    if (touchTarget) {
      // Clamp touch target to valid ship center positions
      const halfWidth = this.width / 2;
      const halfHeight = this.height / 2;
      const clampedTarget = {
        x: Math.max(halfWidth, Math.min(canvasWidth - halfWidth, touchTarget.x)),
        y: Math.max(halfHeight, Math.min(canvasHeight - halfHeight, touchTarget.y))
      };
      
      // Calculate direction to clamped touch target
      const dx = clampedTarget.x - this.x;
      const dy = clampedTarget.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Use speed-based movement with smooth acceleration for mobile
      const minDistance = 3; // Smaller dead zone for more responsiveness
      
      if (distance > minDistance) {
        // Normalize direction
        const normalizedX = dx / distance;
        const normalizedY = dy / distance;
        
        // Use faster speed for mobile touch - 2.5x desktop speed for responsiveness
        const touchSpeed = speed * 2.5;
        
        // Apply distance-based speed scaling
        // Close targets: slower for precision, distant targets: full speed
        const speedScale = Math.min(1, distance / 50); // Scale up to 50 pixels distance
        const finalSpeed = touchSpeed * Math.max(0.3, speedScale); // Minimum 30% speed
        
        // Apply movement with frame-independent speed
        this.x += normalizedX * finalSpeed * deltaTime;
        this.y += normalizedY * finalSpeed * deltaTime;
      }
    } else {
      // Use regular movement for keyboard/mouse input
      this.x += movementX * speed * deltaTime;
      this.y += movementY * speed * deltaTime;
    }

    // Keep ship within bounds
    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;
    
    this.x = Math.max(halfWidth, Math.min(canvasWidth - halfWidth, this.x));
    this.y = Math.max(halfHeight, Math.min(canvasHeight - halfHeight, this.y));

    // Auto-fire projectiles
    if (this.config.ship.autoFire && currentTime - this.lastFireTime >= this.fireInterval) {
      this.lastFireTime = currentTime;
      
      const projectiles: Projectile[] = [];
      const shipTop = this.y - this.height / 2 - 10;
      
      const createProjectile = projectileFactory || ((x, y) => new Projectile(x, y, this.config));
      
      if (this.barrels === 1) {
        // Single barrel - center
        projectiles.push(createProjectile(this.x, shipTop));
      } else {
        // Multiple barrels - spread across ship width
        const barrelSpacing = this.width / (this.barrels + 1);
        const startX = this.x - this.width / 2 + barrelSpacing;
        
        for (let i = 0; i < this.barrels; i++) {
          const barrelX = startX + (i * barrelSpacing);
          projectiles.push(createProjectile(barrelX, shipTop));
        }
      }
      
      return projectiles;
    }

    return [];
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

  public setFireRate(fireRate: number) {
    this.fireInterval = 1000 / fireRate; // Convert rate to interval
  }

  public setBarrels(barrels: number) {
    this.barrels = barrels;
    logger.debug(`Ship barrels set to: ${this.barrels}`);
  }

  public resetToDefault() {
    this.barrels = 1;
    this.fireInterval = 1000 / this.config.projectile.fireRate;
    this.updateSkin(0);
    logger.debug(`Ship reset to default configuration`);
  }

  public updateSkin(rapidFireLevel: number) {
    if (!this.image) return;
    
    if (rapidFireLevel === 0) {
      this.image.src = this.config.ship.skins.default;
      logger.debug(`Ship skin: default`);
    } else {
      const skinKey = rapidFireLevel.toString() as keyof typeof this.config.ship.skins.rapidFire;
      if (this.config.ship.skins.rapidFire[skinKey]) {
        this.image.src = this.config.ship.skins.rapidFire[skinKey];
        logger.debug(`Ship skin: rapidFire level ${rapidFireLevel} - ${this.image.src}`);
      } else {
        logger.warn(`No skin available for rapidFire level ${rapidFireLevel}`);
      }
    }
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

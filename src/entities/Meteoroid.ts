import { MeteoroidConfig } from '../types/config';

export class Meteoroid {
  public x: number;
  public y: number;
  public vx: number; // Horizontal velocity
  public vy: number; // Vertical velocity
  public size: number;
  public speed: number;
  public rotation: number = 0;
  public rotationSpeed: number;
  public hp: number;
  private baseHp: number; // Store original HP
  public sizeType: 'L' | 'M' | 'S';
  public meteoroidType: string;
  private image: HTMLImageElement;
  private imageLoaded: boolean = false;
  private config: MeteoroidConfig;
  private fireTrail: { x: number; y: number; age: number }[] = [];
  private maxSpeed: number;
  private frameCount: number = 0;
  private baseSpeed: number; // Store original speed
  private baseVx: number; // Store original horizontal velocity
  private baseVy: number; // Store original vertical velocity
  private angularFallDegrees: number; // Store angular fall configuration
  public speedMultiplier: number = 1.0;
  public hpBonus: number = 0; // Additional HP from difficulty scaling

  constructor(x: number, y: number, sizeType: 'L' | 'M' | 'S', config: MeteoroidConfig, angularFallDegrees: number = 0, hpBonus: number = 0) {
    this.x = x;
    this.y = y;
    this.sizeType = sizeType;
    this.config = config;
    this.meteoroidType = config.id;
    
    // Set size based on type (L=64px, M=48px, S=32px for visual reference)
    const sizeMap = { L: 64, M: 48, S: 32 };
    this.size = sizeMap[sizeType];
    
    // Set properties based on config and size type
    this.baseHp = config.hp[sizeType];
    this.hpBonus = hpBonus;
    this.hp = this.baseHp + this.hpBonus; // Initialize with base HP + bonus
    this.baseSpeed = config.speed.min + Math.random() * (config.speed.max - config.speed.min);
    this.speed = this.baseSpeed; // Initialize with base speed
    this.maxSpeed = config.speed.max;
    this.rotationSpeed = (config.spin.min + Math.random() * (config.spin.max - config.spin.min)) * (Math.PI / 180) * 0.016; // Convert degrees to radians per frame
    
    // Store angular fall configuration
    this.angularFallDegrees = angularFallDegrees;
    
    // Calculate angular movement
    // Convert degrees to radians and add some randomness (-15% to +15% of the angle)
    const randomVariation = (Math.random() - 0.5) * 0.3; // -15% to +15%
    const finalAngleDegrees = angularFallDegrees * (1 + randomVariation);
    const angleRadians = finalAngleDegrees * (Math.PI / 180);
    
    // Randomly choose left or right direction
    const direction = Math.random() < 0.5 ? -1 : 1;
    
    // Calculate velocity components (positive Y is downward)
    this.baseVx = Math.sin(angleRadians) * this.baseSpeed * direction;
    this.baseVy = Math.cos(angleRadians) * this.baseSpeed; // cos for downward component
    
    // Initialize current velocities
    this.vx = this.baseVx;
    this.vy = this.baseVy;
    
    // Load meteoroid sprite based on size
    this.image = new Image();
    this.image.onload = () => {
      this.imageLoaded = true;
      // Import logger dynamically to avoid circular dependencies
      import('../utils/Logger').then(({ logger }) => {
        logger.assets(`✅ Successfully loaded ${this.meteoroidType} sprite: ${config.images[sizeType]}`);
      });
    };
    this.image.onerror = () => {
      // Import logger dynamically to avoid circular dependencies
      import('../utils/Logger').then(({ logger }) => {
        logger.warn(`❌ Failed to load meteoroid sprite: ${config.images[sizeType]}`);
      });
    };
    // Import logger dynamically to avoid circular dependencies
    import('../utils/Logger').then(({ logger }) => {
      logger.assets(`🔄 Loading ${this.meteoroidType} sprite: ${config.images[sizeType]}`);
    });
    this.image.src = config.images[sizeType];
  }

  update(): void {
    // Apply speed multiplier to current speed and velocity components
    this.speed = this.baseSpeed * this.speedMultiplier;
    this.vx = this.baseVx * this.speedMultiplier;
    this.vy = this.baseVy * this.speedMultiplier;
    
    // Move using velocity components
    this.x += this.vx;
    this.y += this.vy;
    
    // Rotate the meteoroid
    this.rotation += this.rotationSpeed;
    
    this.frameCount++;
    
        // Add fire trail for fast-moving meteoroids
    if (this.isFastMoving()) {
      this.fireTrail.unshift({ x: this.x, y: this.y, age: 0 });
      
      // Keep trail length manageable - shorter for elegant appearance
      const maxAge = 50;
      this.fireTrail = this.fireTrail.filter(point => {
        point.age++;
        return point.age < maxAge;
      });
    } else {
      // Standard trail for other meteoroids
      this.fireTrail.unshift({ x: this.x, y: this.y, age: 0 });
      
      // Keep trail length manageable
      this.fireTrail = this.fireTrail.filter(point => {
        point.age++;
        return point.age < 35;
      });
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Render fire trail first (behind the meteoroid)
    if (this.isFastMoving()) {
      this.renderFireTrail(ctx);
    }
    
    ctx.save();
    
    // Translate to meteoroid center for rotation
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    
    // Add fire glow around fast meteoroids (thinner front layer)
    if (this.isFastMoving()) {
      // Enhanced comet head glow for fast meteoroids - bright teardrop shape
      ctx.save();
      
      // Create the bright comet head - more circular for the meteoroid itself
      const headGradient = ctx.createRadialGradient(0, 0, this.size / 10, 0, 0, this.size * 0.7);
      headGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)'); // Bright white-hot center
      headGradient.addColorStop(0.2, 'rgba(255, 255, 200, 0.8)'); // Hot white-yellow
      headGradient.addColorStop(0.4, 'rgba(255, 240, 150, 0.7)'); // Bright yellow
      headGradient.addColorStop(0.6, 'rgba(255, 200, 100, 0.5)'); // Golden
      headGradient.addColorStop(0.8, 'rgba(255, 150, 60, 0.3)'); // Orange
      headGradient.addColorStop(1, 'rgba(255, 100, 30, 0)'); // Transparent orange edge
      ctx.fillStyle = headGradient;
      ctx.beginPath();
      ctx.arc(0, 0, this.size * 0.7, 0, Math.PI * 2);
      ctx.fill();
      
      // Add secondary atmospheric glow extending backwards
      ctx.save();
      ctx.scale(0.8, 1.2); // Slightly elongated backwards
      const atmosphereGradient = ctx.createRadialGradient(0, 0, this.size / 8, 0, this.size * 0.3, this.size * 1.0);
      atmosphereGradient.addColorStop(0, 'rgba(255, 200, 100, 0.3)'); // Golden center
      atmosphereGradient.addColorStop(0.4, 'rgba(255, 150, 60, 0.2)'); // Orange
      atmosphereGradient.addColorStop(0.7, 'rgba(255, 100, 30, 0.1)'); // Deep orange
      atmosphereGradient.addColorStop(1, 'rgba(200, 50, 20, 0)'); // Transparent red edge
      ctx.fillStyle = atmosphereGradient;
      ctx.beginPath();
      ctx.arc(0, 0, this.size * 1.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      
      ctx.restore();
    }
    
    if (this.imageLoaded) {
      // Draw the loaded image centered
      ctx.drawImage(
        this.image,
        -this.size / 2,
        -this.size / 2,
        this.size,
        this.size
      );
    } else {
      // Fallback: draw a gray circle with rocky texture
      const baseColor = this.isFastMoving() ? '#aa6666' : '#666666'; // Reddish tint for fast meteoroids
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Add some rocky details
      ctx.fillStyle = this.isFastMoving() ? '#885555' : '#555555';
      ctx.beginPath();
      ctx.arc(-this.size / 6, -this.size / 6, this.size / 8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(this.size / 6, this.size / 8, this.size / 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Add fireball effect on top of meteoroid when moving at 90% max speed
    if (this.isFastMoving()) {
      ctx.save();
      
      // Create flickering fire effect on top
      const fireRadius = this.size * 0.4;
      const flickerIntensity = 0.8 + Math.sin(this.frameCount * 0.3) * 0.2; // Flickering between 0.6 and 1.0
      
      // Main fire gradient
      const fireGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, fireRadius);
      fireGradient.addColorStop(0, `rgba(255, 255, 200, ${0.9 * flickerIntensity})`); // Hot white center
      fireGradient.addColorStop(0.3, `rgba(255, 200, 100, ${0.8 * flickerIntensity})`); // Yellow-orange
      fireGradient.addColorStop(0.6, `rgba(255, 120, 60, ${0.6 * flickerIntensity})`); // Orange
      fireGradient.addColorStop(0.8, `rgba(255, 60, 30, ${0.4 * flickerIntensity})`); // Red-orange
      fireGradient.addColorStop(1, `rgba(200, 30, 10, 0)`); // Transparent red edge
      
      ctx.fillStyle = fireGradient;
      ctx.beginPath();
      ctx.arc(0, 0, fireRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Add small flame particles around the edge
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + this.frameCount * 0.1;
        const distance = fireRadius * 0.7;
        const particleX = Math.cos(angle) * distance;
        const particleY = Math.sin(angle) * distance;
        const particleSize = (this.size * 0.1) * (0.5 + Math.sin(this.frameCount * 0.4 + i) * 0.3);
        
        const particleGradient = ctx.createRadialGradient(particleX, particleY, 0, particleX, particleY, particleSize);
        particleGradient.addColorStop(0, `rgba(255, 200, 100, ${0.6 * flickerIntensity})`);
        particleGradient.addColorStop(0.7, `rgba(255, 100, 30, ${0.4 * flickerIntensity})`);
        particleGradient.addColorStop(1, 'rgba(200, 50, 20, 0)');
        
        ctx.fillStyle = particleGradient;
        ctx.beginPath();
        ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    }
    
    ctx.restore();
  }

  private renderFireTrail(ctx: CanvasRenderingContext2D): void {
    if (this.fireTrail.length === 0) return;
    
    ctx.save();
    
    // Draw trail from oldest to newest
    for (let i = 0; i < this.fireTrail.length; i++) {
      const point = this.fireTrail[i];
      const maxAge = this.isFastMoving() ? 50 : 35; // Shorter trails for fast meteoroids - more elegant
      const progress = point.age / maxAge;
      
      // Enhanced effects for fast-moving meteoroids - directional comet trail
      if (this.isFastMoving()) {
        const alpha = (1 - progress) * 0.9;
        
        // Calculate movement direction for trail alignment
        const dx = this.vx;
        const dy = this.vy;
        const angle = Math.atan2(dy, dx);
        
        // Calculate distance from meteoroid center along movement direction
        const distanceFromHead = Math.sqrt(
          Math.pow(point.x - this.x, 2) + Math.pow(point.y - this.y, 2)
        );
        const maxDistance = this.size * 1.5; // Shorter trail length
        
        // Size varies based on distance - thinner overall for elegance
        const distanceFactor = Math.max(0.3, 1 - (distanceFromHead / maxDistance));
        const size = (1 - progress) * this.size * 0.5 * distanceFactor; // Much thinner (0.5 vs 0.9)
        
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(angle); // Align with movement direction
        
        // Create directional ellipse shape - thin and elongated in movement direction
        const elongation = 1.8; // Stretch along movement direction
        const compression = 0.4; // Compress perpendicular to movement
        ctx.scale(elongation, compression);
        
        // Enhanced gradient for directional comet effect
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
        
        // Colors transition from bright at head to deep at tail
        const headIntensity = Math.max(0.4, distanceFactor);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * headIntensity})`); // White-hot center
        gradient.addColorStop(0.2, `rgba(255, 240, 180, ${alpha * headIntensity * 0.9})`); // Hot yellow
        gradient.addColorStop(0.4, `rgba(255, 200, 120, ${alpha * headIntensity * 0.7})`); // Golden
        gradient.addColorStop(0.7, `rgba(255, 120, 60, ${alpha * headIntensity * 0.5})`); // Orange
        gradient.addColorStop(1, `rgba(180, 60, 30, 0)`); // Transparent red edge
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // Add subtle sparkle effect for fast meteoroids
        if (i < this.fireTrail.length * 0.2) { // Only for newest 20% of trail
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
          ctx.beginPath();
          ctx.arc(point.x + Math.sin(point.age * 0.4) * 1.5, point.y + Math.cos(point.age * 0.3) * 1, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Standard trail for other meteoroids
        const alpha = (1 - progress) * 0.8;
        const size = (1 - progress) * this.size * 0.6;
        
        const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, size);
        gradient.addColorStop(0, `rgba(255, 255, 200, ${alpha})`);
        gradient.addColorStop(0.3, `rgba(255, 220, 150, ${alpha * 0.8})`);
        gradient.addColorStop(0.6, `rgba(255, 180, 100, ${alpha * 0.6})`);
        gradient.addColorStop(0.8, `rgba(220, 120, 60, ${alpha * 0.4})`);
        gradient.addColorStop(1, `rgba(150, 60, 30, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.restore();
  }

  private isFastMoving(): boolean {
    // Check if meteoroid is moving at 90% or more of the maximum speed
    return this.speed >= this.maxSpeed * 0.9;
  }

  // Update speed multiplier for difficulty scaling
  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = multiplier;
  }

  // Update HP bonus for difficulty scaling
  setHpBonus(bonus: number): void {
    // Only update if the bonus has actually changed
    if (this.hpBonus !== bonus) {
      const hpDifference = bonus - this.hpBonus;
      this.hpBonus = bonus;
      this.hp += hpDifference; // Add the difference instead of resetting
    }
  }

  // Check if meteoroid is off-screen (below canvas or outside horizontal bounds)
  isOffScreen(canvasHeight: number, canvasWidth: number = 0): boolean {
    // Check if below screen
    if (this.y - this.size / 2 > canvasHeight) {
      return true;
    }
    
    // Check if outside horizontal bounds (with some margin for angular movement)
    if (canvasWidth > 0) {
      const margin = this.size; // Allow one meteoroid-width margin
      if (this.x + this.size / 2 < -margin || this.x - this.size / 2 > canvasWidth + margin) {
        return true;
      }
    }
    
    return false;
  }

  // Get collision radius for collision detection
  getCollisionRadius(): number {
    return this.size / 2;
  }

  // Handle taking damage
  takeDamage(damage: number): boolean {
    this.hp -= damage;
    return this.hp <= 0; // Return true if meteoroid is destroyed
  }

  // Check if meteoroid is destroyed
  isDestroyed(): boolean {
    return this.hp <= 0;
  }

  // Get meteoroids that this one should split into (if any)
  getConfig(): MeteoroidConfig {
    return this.config;
  }

  getSplitMeteoroids(): Meteoroid[] {
    const splitConfig = this.config.split[this.sizeType];
    if (!splitConfig) {
      return []; // No splitting for this size/type
    }

    const [count, newSizeType] = splitConfig;
    const newMeteoroids: Meteoroid[] = [];

    for (let i = 0; i < count; i++) {
      // Create new meteoroid at slightly offset position
      const angle = (Math.PI * 2 * i) / count; // Distribute evenly in circle
      const offset = this.size * 0.3;
      const newX = this.x + Math.cos(angle) * offset;
      const newY = this.y + Math.sin(angle) * offset;
      
      const newMeteoroid = new Meteoroid(newX, newY, newSizeType as 'L' | 'M' | 'S', this.config, this.angularFallDegrees, this.hpBonus);
      // Give split meteoroids a slight velocity away from center
      newMeteoroid.speed *= 0.8; // Slightly slower than parent
      newMeteoroids.push(newMeteoroid);
    }

    return newMeteoroids;
  }
}

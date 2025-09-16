import { MeteoroidConfig } from '../types/config';

export class Meteoroid {
  public x: number;
  public y: number;
  public size: number;
  public speed: number;
  public rotation: number = 0;
  public rotationSpeed: number;
  public hp: number;
  public sizeType: 'L' | 'M' | 'S';
  public meteoroidType: string;
  private image: HTMLImageElement;
  private imageLoaded: boolean = false;
  private config: MeteoroidConfig;
  private fireTrail: { x: number; y: number; age: number }[] = [];
  private maxSpeed: number;
  private frameCount: number = 0;

  constructor(x: number, y: number, sizeType: 'L' | 'M' | 'S', config: MeteoroidConfig) {
    this.x = x;
    this.y = y;
    this.sizeType = sizeType;
    this.config = config;
    this.meteoroidType = config.id;
    
    // Set size based on type (L=64px, M=48px, S=32px for visual reference)
    const sizeMap = { L: 64, M: 48, S: 32 };
    this.size = sizeMap[sizeType];
    
    // Set properties based on config and size type
    this.hp = config.hp[sizeType];
    this.speed = config.speed.min + Math.random() * (config.speed.max - config.speed.min);
    this.maxSpeed = config.speed.max;
    this.rotationSpeed = (config.spin.min + Math.random() * (config.spin.max - config.spin.min)) * (Math.PI / 180) * 0.016; // Convert degrees to radians per frame
    
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
    // Move downward
    this.y += this.speed;
    
    // Rotate the meteoroid
    this.rotation += this.rotationSpeed;
    
    this.frameCount++;
    
    // Add fire trail for fireball meteoroids (always) or fast meteoroids
    if (this.isFireball()) {
      // Create vertical teardrop comet shape - multiple trail points at different distances
      const trailPoints = [
        { distance: 0.3, spread: 0.2 }, // Close to meteoroid, narrow
        { distance: 0.6, spread: 0.4 }, // Medium distance, wider
        { distance: 1.0, spread: 0.6 }, // Far from meteoroid, widest
        { distance: 1.5, spread: 0.8 }, // Very far, creating the long tail
        { distance: 2.0, spread: 0.9 }, // Extreme distance for dramatic tail
      ];
      
      // Generate multiple trail points per frame for dense comet effect
      for (const point of trailPoints) {
        // Add some randomness to make it look natural
        if (Math.random() < 0.8) { // 80% chance to add each point
          this.fireTrail.push({
            x: this.x + (Math.random() - 0.5) * this.size * point.spread,
            y: this.y - this.size * point.distance, // Negative Y creates upward trail
            age: 0
          });
        }
      }
      
      // Add extra density for the core trail
      if (this.frameCount % 2 === 0) {
        this.fireTrail.push({
          x: this.x + (Math.random() - 0.5) * this.size * 0.3,
          y: this.y - this.size * 0.8, // Core trail point
          age: 0
        });
      }
    } else if (this.isFastMoving() && this.frameCount % 1 === 0) {
      // Standard trail for fast-moving non-fireball meteoroids
      this.fireTrail.push({
        x: this.x + (Math.random() - 0.5) * this.size * 0.6,
        y: this.y - this.size * 0.4, // Also make standard trails go upward
        age: 0
      });
    }
    
    // Update and remove old trail points
    for (let i = this.fireTrail.length - 1; i >= 0; i--) {
      this.fireTrail[i].age++;
      // Fireball trails last much longer for dramatic comet effect (80 frames vs 35 for standard)
      const maxAge = this.isFireball() ? 80 : 35;
      if (this.fireTrail[i].age > maxAge) {
        this.fireTrail.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Render fire trail first (behind the meteoroid)
    if (this.isFastMoving() || this.isFireball()) {
      this.renderFireTrail(ctx);
    }
    
    ctx.save();
    
    // Translate to meteoroid center for rotation
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    
    // Add fire glow around fast meteoroids and fireballs (thinner front layer)
    if (this.isFastMoving() || this.isFireball()) {
      if (this.isFireball()) {
        // Enhanced comet head glow for fireball meteoroids - bright teardrop shape
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
      } else {
        // Standard glow for fast meteoroids - also made thinner
        const gradient = ctx.createRadialGradient(0, 0, this.size / 8, 0, 0, this.size * 0.6);
        gradient.addColorStop(0, 'rgba(255, 240, 150, 0.4)'); // Reduced opacity
        gradient.addColorStop(0.4, 'rgba(255, 180, 100, 0.3)');
        gradient.addColorStop(0.7, 'rgba(255, 120, 60, 0.15)');
        gradient.addColorStop(1, 'rgba(200, 80, 40, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
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
    
    ctx.restore();
  }

  private renderFireTrail(ctx: CanvasRenderingContext2D): void {
    if (this.fireTrail.length === 0) return;
    
    ctx.save();
    
    // Draw trail from oldest to newest
    for (let i = 0; i < this.fireTrail.length; i++) {
      const point = this.fireTrail[i];
      const maxAge = this.isFireball() ? 80 : 35; // Fireball trails last much longer for dramatic comet effect
      const progress = point.age / maxAge;
      
      // Enhanced effects for fireball meteoroids - vertical teardrop comet
      if (this.isFireball()) {
        const alpha = (1 - progress) * 1.0;
        
        // Calculate distance from meteoroid center for teardrop effect
        const distanceFromHead = Math.abs(point.y - this.y);
        const maxDistance = this.size * 2.0;
        
        // Size varies based on distance - larger at the head, tapering to tail
        const distanceFactor = Math.max(0.2, 1 - (distanceFromHead / maxDistance));
        const size = (1 - progress) * this.size * 0.9 * distanceFactor;
        
        ctx.save();
        ctx.translate(point.x, point.y);
        
        // Create vertical teardrop shape - taller and narrower as we go back
        const verticalStretch = 1 + (distanceFromHead / maxDistance) * 2; // More stretched further back
        const horizontalSqueeze = Math.max(0.4, 1 - (distanceFromHead / maxDistance) * 0.6); // Narrower further back
        ctx.scale(horizontalSqueeze, verticalStretch);
        
        // Enhanced gradient for teardrop comet effect
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
        
        // Colors transition from white-hot at head to deep red at tail
        const headIntensity = Math.max(0.3, distanceFactor);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * headIntensity})`); // White-hot center
        gradient.addColorStop(0.1, `rgba(255, 255, 200, ${alpha * headIntensity * 0.9})`); // Hot white-yellow
        gradient.addColorStop(0.2, `rgba(255, 240, 150, ${alpha * headIntensity * 0.8})`); // Bright yellow
        gradient.addColorStop(0.4, `rgba(255, 200, 100, ${alpha * headIntensity * 0.7})`); // Golden
        gradient.addColorStop(0.6, `rgba(255, 150, 60, ${alpha * headIntensity * 0.6})`); // Orange
        gradient.addColorStop(0.8, `rgba(255, 100, 30, ${alpha * headIntensity * 0.4})`); // Deep orange
        gradient.addColorStop(1, `rgba(200, 50, 20, 0)`); // Transparent red edge
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // Add extra sparkle effect for fireballs
        if (i < this.fireTrail.length * 0.3) { // Only for newest 30% of trail
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
          ctx.beginPath();
          ctx.arc(point.x + Math.sin(point.age * 0.5) * 3, point.y + Math.cos(point.age * 0.3) * 2, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Standard trail for other meteoroids
        const alpha = (1 - progress) * 0.9;
        const size = (1 - progress) * this.size * 0.7;
        
        const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, size);
        gradient.addColorStop(0, `rgba(255, 255, 200, ${alpha})`);
        gradient.addColorStop(0.2, `rgba(255, 245, 150, ${alpha * 0.9})`);
        gradient.addColorStop(0.4, `rgba(255, 200, 100, ${alpha * 0.8})`);
        gradient.addColorStop(0.6, `rgba(255, 150, 80, ${alpha * 0.7})`);
        gradient.addColorStop(0.8, `rgba(220, 100, 50, ${alpha * 0.5})`);
        gradient.addColorStop(1, `rgba(150, 50, 20, 0)`);
        
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

  private isFireball(): boolean {
    // Check if meteoroid is a fireball type
    return this.meteoroidType === 'fireball';
  }

  // Check if meteoroid is off-screen (below canvas)
  isOffScreen(canvasHeight: number): boolean {
    return this.y - this.size / 2 > canvasHeight;
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
      
      const newMeteoroid = new Meteoroid(newX, newY, newSizeType as 'L' | 'M' | 'S', this.config);
      // Give split meteoroids a slight velocity away from center
      newMeteoroid.speed *= 0.8; // Slightly slower than parent
      newMeteoroids.push(newMeteoroid);
    }

    return newMeteoroids;
  }
}

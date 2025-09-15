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
    };
    this.image.onerror = () => {
      console.warn(`[Meteoroid] Failed to load meteoroid sprite: ${config.images[sizeType]}`);
    };
    this.image.src = config.images[sizeType];
  }

  update(): void {
    // Move downward
    this.y += this.speed;
    
    // Rotate the meteoroid
    this.rotation += this.rotationSpeed;
    
    this.frameCount++;
    
    // Add fire trail for fast meteoroids (90% of max speed)
    if (this.isFastMoving() && this.frameCount % 1 === 0) { // Add trail point every frame for denser trail
      this.fireTrail.push({
        x: this.x + (Math.random() - 0.5) * this.size * 0.6, // Wider randomness for broader trail
        y: this.y + this.size * 0.4, // Trail starts slightly behind the meteoroid
        age: 0
      });
    }
    
    // Update and remove old trail points
    for (let i = this.fireTrail.length - 1; i >= 0; i--) {
      this.fireTrail[i].age++;
      if (this.fireTrail[i].age > 35) { // Trail lasts longer (35 frames instead of 20)
        this.fireTrail.splice(i, 1);
      }
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
      // Thinner outer glow with warmer colors
      const gradient = ctx.createRadialGradient(0, 0, this.size / 6, 0, 0, this.size * 0.8);
      gradient.addColorStop(0, 'rgba(255, 240, 150, 0.6)'); // Reduced intensity warm yellow center
      gradient.addColorStop(0.4, 'rgba(255, 180, 100, 0.4)'); // Golden orange
      gradient.addColorStop(0.7, 'rgba(255, 120, 60, 0.2)'); // Warm orange
      gradient.addColorStop(1, 'rgba(200, 80, 40, 0)'); // Transparent warm edge
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, this.size * 0.8, 0, Math.PI * 2);
      ctx.fill();
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
      const progress = point.age / 35; // Trail lasts 35 frames now
      const alpha = (1 - progress) * 0.9;
      const size = (1 - progress) * this.size * 0.7; // Larger trail size for wider effect
      
      // Create warm fire gradient with more yellow tones
      const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, size);
      gradient.addColorStop(0, `rgba(255, 255, 200, ${alpha})`); // Warm white-yellow center
      gradient.addColorStop(0.2, `rgba(255, 245, 150, ${alpha * 0.9})`); // Bright warm yellow
      gradient.addColorStop(0.4, `rgba(255, 200, 100, ${alpha * 0.8})`); // Golden yellow
      gradient.addColorStop(0.6, `rgba(255, 150, 80, ${alpha * 0.7})`); // Warm orange
      gradient.addColorStop(0.8, `rgba(220, 100, 50, ${alpha * 0.5})`); // Deep orange
      gradient.addColorStop(1, `rgba(150, 50, 20, 0)`); // Transparent warm brown edge
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }

  private isFastMoving(): boolean {
    // Check if meteoroid is moving at 90% or more of the maximum speed
    return this.speed >= this.maxSpeed * 0.9;
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

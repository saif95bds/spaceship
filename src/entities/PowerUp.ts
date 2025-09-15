import { GameConfig } from '../types/config';

export type PowerUpType = '+1life' | 'rapidFire' | 'scoreMultiplier';

export class PowerUp {
  public x: number;
  public y: number;
  public width: number = 32;
  public height: number = 32;
  public type: PowerUpType;
  public speed: number;
  private image: HTMLImageElement | null = null;
  private imageLoaded: boolean = false;
  private config: GameConfig;

  constructor(x: number, y: number, type: PowerUpType, config: GameConfig) {
    console.log(`[DEBUG] Creating PowerUp: type=${type}, position=(${x.toFixed(1)}, ${y.toFixed(1)})`);
    this.x = x;
    this.y = y;
    this.type = type;
    this.config = config;
    this.speed = config.powerUps.speed;
    this.loadImage();
  }

  private loadImage() {
    // Skip image loading entirely for now since assets don't exist
    // Force use of fallback rendering
    console.log(`[DEBUG] Skipping image loading for ${this.type}, using fallback rendering`);
    this.imageLoaded = false;
    this.image = null;
  }

  public update(deltaTime: number) {
    // Move downward slowly
    const movement = this.speed * (deltaTime / 16);
    this.y += movement;
    if (Math.random() < 0.01) { // Log occasionally to avoid spam
      console.log(`[DEBUG] PowerUp ${this.type} update: y=${this.y.toFixed(1)}, movement=${movement.toFixed(2)}`);
    }
  }

  public isOffScreen(canvasHeight: number): boolean {
    return this.y > canvasHeight + this.height;
  }

  public getRadius(): number {
    // Use the same radius as visual rendering for consistent collision detection
    const baseRadius = Math.min(this.width, this.height) / 2 * 0.8;
    return Math.max(baseRadius, 20); // Match the visual radius used in rendering
  }

  public render(ctx: CanvasRenderingContext2D) {
    const isVisible = this.y > -this.height/2 && this.y < ctx.canvas.height + this.height/2;
    // Only log occasionally to avoid spam
    if (Math.random() < 0.02) {
      console.log(`[DEBUG] PowerUp.render: ${this.type} at (${this.x.toFixed(1)}, ${this.y.toFixed(1)}), imageLoaded: ${this.imageLoaded}, visible: ${isVisible}`);
    }
    if (this.imageLoaded && this.image) {
      // Draw power-up image
      console.log(`[DEBUG] Drawing image at (${(this.x - this.width / 2).toFixed(1)}, ${(this.y - this.height / 2).toFixed(1)}) size: ${this.width}x${this.height}`);
      ctx.drawImage(
        this.image,
        this.x - this.width / 2,
        this.y - this.height / 2,
        this.width,
        this.height
      );
    } else {
      // Fallback: draw colored circle with text
      if (Math.random() < 0.05) { // Occasional debug logging
        console.log(`[DEBUG] Fallback render: ${this.type} at (${this.x.toFixed(1)}, ${this.y.toFixed(1)}), radius: ${this.getRadius()}`);
      }
      ctx.save();
      
      // Make power-ups more visible with larger radius
      const radius = Math.max(this.getRadius(), 20); // Minimum 20px radius
      
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
      
      // Color code by type with better visibility
      switch (this.type) {
        case '+1life':
          ctx.fillStyle = '#FF4444'; // Bright red for life
          break;
        case 'rapidFire':
          ctx.fillStyle = '#00FFFF'; // Cyan for rapid fire
          break;
        case 'scoreMultiplier':
          ctx.fillStyle = '#FFD700'; // Gold for score multiplier
          break;
      }
      
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3; // Thicker border
      ctx.stroke();
      
      // Draw type indicator with better visibility
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px Arial'; // Larger, bold font
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Add text shadow for better visibility
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      
      let text = '';
      switch (this.type) {
        case '+1life':
          text = '♥';
          break;
        case 'rapidFire':
          text = '⚡';
          break;
        case 'scoreMultiplier':
          text = 'x2';
          break;
      }
      
      // Draw text with outline
      ctx.strokeText(text, this.x, this.y);
      ctx.fillText(text, this.x, this.y);
      ctx.restore();
    }
  }
}
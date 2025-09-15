import { GameConfig } from '../types/config';
import { Ship } from '../entities/Ship';

interface Star {
  x: number;
  y: number;
  brightness: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

export class RenderSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: GameConfig;
  private stars: Star[] = [];
  private time: number = 0;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, config: GameConfig) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.config = config;
    this.generateStarfield();
  }

  private generateStarfield() {
    this.stars = [];
    const density = this.config.background.fallback.density;
    const numStars = Math.floor(this.canvas.width * this.canvas.height * density);

    for (let i = 0; i < numStars; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        brightness: Math.random() * 0.8 + 0.2, // 0.2 to 1.0
        twinkleSpeed: Math.random() * 2 + 0.5, // 0.5 to 2.5
        twinklePhase: Math.random() * Math.PI * 2
      });
    }
  }

  public onResize() {
    // Regenerate starfield when canvas size changes
    this.generateStarfield();
  }

  public render(ship: Ship, deltaTime: number) {
    this.time += deltaTime;
    this.clearCanvas();
    
    // Layer 1: Background
    this.renderBackground();
    
    // Layer 2: Entities
    this.renderEntities(ship);
    
    // Layer 3: HUD
    this.renderHUD();
  }

  private clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private renderBackground() {
    // Fill with dark space background
    this.ctx.fillStyle = '#0a0a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Render starfield
    this.ctx.fillStyle = '#ffffff';
    for (const star of this.stars) {
      // Calculate twinkling effect
      const twinkle = Math.sin(this.time * star.twinkleSpeed + star.twinklePhase) * 0.3 + 0.7;
      const alpha = star.brightness * twinkle;
      
      this.ctx.globalAlpha = alpha;
      this.ctx.fillRect(star.x, star.y, 1, 1);
      
      // Add a subtle glow for brighter stars
      if (star.brightness > 0.7) {
        this.ctx.globalAlpha = alpha * 0.3;
        this.ctx.fillRect(star.x - 0.5, star.y - 0.5, 2, 2);
      }
    }
    
    this.ctx.globalAlpha = 1.0; // Reset alpha
  }

  private renderEntities(ship: Ship) {
    // Render ship
    ship.render(this.ctx);
    
    // Future: meteoroids, projectiles, power-ups will be rendered here
  }

  private renderHUD() {
    // HUD placeholder text
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '20px Arial, sans-serif';
    this.ctx.textAlign = 'left';
    
    // Score (top-right area)
    this.ctx.textAlign = 'right';
    this.ctx.fillText('Score: 0', this.canvas.width - 20, 30);
    
    // Controls help (bottom)
    this.ctx.textAlign = 'center';
    this.ctx.font = '14px Arial, sans-serif';
    this.ctx.fillStyle = '#aaaaaa';
    this.ctx.fillText('Arrow Keys or WASD to move', this.canvas.width / 2, this.canvas.height - 40);
    this.ctx.fillText('Touch and drag on mobile', this.canvas.width / 2, this.canvas.height - 20);
    
    // Reset text alignment
    this.ctx.textAlign = 'left';
  }
}

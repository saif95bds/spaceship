import { GameConfig } from '../types/config';
import { Ship } from '../entities/Ship';
import { Projectile } from '../entities/Projectile';
import { Meteoroid } from '../entities/Meteoroid';
import { PowerUp } from '../entities/PowerUp';
import { ParticleSystem } from './particles';

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
  private backgroundImage: HTMLImageElement | null = null;
  private backgroundImageLoaded: boolean = false;
  private backgroundImageFailed: boolean = false;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, config: GameConfig) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.config = config;
    this.generateStarfield();
    this.loadBackgroundImage();
  }

  private loadBackgroundImage() {
    if (this.config.background.image) {
      console.log(`[RenderSystem] Loading background image: ${this.config.background.image}`);
      
      this.backgroundImage = new Image();
      
      this.backgroundImage.onload = () => {
        console.log(`[RenderSystem] ✅ Background image loaded successfully: ${this.config.background.image}`);
        this.backgroundImageLoaded = true;
        this.backgroundImageFailed = false;
      };
      
      this.backgroundImage.onerror = () => {
        console.warn(`[RenderSystem] ❌ Failed to load background image: ${this.config.background.image}`);
        console.warn(`[RenderSystem] 🔄 Falling back to procedural starfield`);
        this.backgroundImageLoaded = false;
        this.backgroundImageFailed = true;
      };
      
      this.backgroundImage.src = this.config.background.image;
    } else {
      console.log(`[RenderSystem] No background image configured, using fallback: ${this.config.background.fallback.type}`);
    }
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

  public render(
    ship: Ship, 
    projectiles: Projectile[], 
    meteoroids: Meteoroid[], 
    powerUps: PowerUp[], 
    particleSystem: ParticleSystem, 
    deltaTime: number,
    score: number = 0,
    rapidFireLevel: number = 0,
    scoreMultiplier: number = 1,
    scoreMultiplierEndTime: number = 0
  ) {
    this.time += deltaTime;
    this.clearCanvas();
    
    // Layer 1: Background
    this.renderBackground();
    
    // Layer 2: Entities and Effects
    this.renderEntities(ship, projectiles, meteoroids, powerUps, particleSystem);
    
    // Layer 3: HUD
    this.renderHUD(ship, score, rapidFireLevel, scoreMultiplier, scoreMultiplierEndTime);
  }

  private clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private renderBackground() {
    if (this.backgroundImageLoaded && this.backgroundImage) {
      // Render custom background image
      this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
    } else {
      // Fill with dark space background
      this.ctx.fillStyle = '#0a0a1a';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Render starfield fallback
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
  }

  private renderEntities(ship: Ship, projectiles: Projectile[], meteoroids: Meteoroid[], powerUps: PowerUp[], particleSystem: ParticleSystem) {
    // Render meteoroids (behind other entities)
    for (const meteoroid of meteoroids) {
      meteoroid.render(this.ctx);
    }

    // Render power-ups
    if (powerUps.length > 0 && Math.random() < 0.1) { // Reduce debug spam
      console.log(`[DEBUG] Rendering ${powerUps.length} power-up(s)`);
    }
    for (const powerUp of powerUps) {
      powerUp.render(this.ctx);
    }

    // Render projectiles
    for (const projectile of projectiles) {
      projectile.render(this.ctx);
    }

    // Render particles (explosions, impacts)
    particleSystem.render(this.ctx);

    // Render ship (on top of everything else)
    ship.render(this.ctx);
  }

  private renderHUD(
    ship: Ship, 
    score: number = 0, 
    rapidFireLevel: number = 0, 
    scoreMultiplier: number = 1, 
    scoreMultiplierEndTime: number = 0
  ) {
    // HUD text styling
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '20px Arial, sans-serif';
    this.ctx.textAlign = 'left';
    
    // Lives (top-left) - show red heart symbols
    const heartSymbol = '♥';
    let livesDisplay = '';
    for (let i = 0; i < ship.lives; i++) {
      livesDisplay += heartSymbol;
      if (i < ship.lives - 1) livesDisplay += ' '; // Add space between hearts
    }
    this.ctx.fillStyle = '#ff0000'; // Red color for hearts
    this.ctx.fillText(livesDisplay, 20, 30);
    this.ctx.fillStyle = '#ffffff'; // Reset to white for other text
    
    // Score (top-right area)
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`Score: ${score}`, this.canvas.width - 20, 30);
    
    // Power-up indicators (top-center)
    this.ctx.textAlign = 'center';
    const centerX = this.canvas.width / 2;
    let yOffset = 30;
    
    // Rapid Fire indicator
    if (rapidFireLevel > 0) {
      this.ctx.fillStyle = '#ffff00'; // Yellow
      this.ctx.fillText(`⚡ Rapid Fire Lvl ${rapidFireLevel}`, centerX - 100, yOffset);
      this.ctx.fillStyle = '#ffffff';
    }
    
    // Score Multiplier indicator with countdown
    if (scoreMultiplier > 1 && scoreMultiplierEndTime > 0) {
      const remainingTime = Math.max(0, (scoreMultiplierEndTime - Date.now()) / 1000);
      this.ctx.fillStyle = '#ffd700'; // Gold
      this.ctx.fillText(`★ ${scoreMultiplier}x Score (${remainingTime.toFixed(1)}s)`, centerX + 100, yOffset);
      this.ctx.fillStyle = '#ffffff';
    }
    
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

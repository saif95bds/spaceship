import { GameConfig } from '../types/config';
import { Ship } from '../entities/Ship';
import { Projectile } from '../entities/Projectile';
import { Meteoroid } from '../entities/Meteoroid';
import { PowerUp } from '../entities/PowerUp';
import { ParticleSystem } from './particles';
import { DebugSystem } from './DebugSystem';
import { logger } from '../utils/Logger';

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
  private showTutorial: boolean = true;
  private tutorialStartTime: number = Date.now();
  
  // Screen shake
  private shakeIntensity: number = 0;
  private shakeDuration: number = 0;
  private shakeTimer: number = 0;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, config: GameConfig) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.config = config;
    this.generateStarfield();
    this.loadBackgroundImage();
  }

  private loadBackgroundImage() {
    if (this.config.background.image) {
      logger.assets(`Loading background image: ${this.config.background.image}`);
      
      this.backgroundImage = new Image();
      
      this.backgroundImage.onload = () => {
        logger.assets(`✅ Background image loaded successfully: ${this.config.background.image}`);
        this.backgroundImageLoaded = true;
        this.backgroundImageFailed = false;
      };
      
      this.backgroundImage.onerror = () => {
        logger.warn(`❌ Failed to load background image: ${this.config.background.image}`);
        logger.warn(`🔄 Falling back to procedural starfield`);
        this.backgroundImageLoaded = false;
        this.backgroundImageFailed = true;
      };
      
      this.backgroundImage.src = this.config.background.image;
    } else {
      logger.assets(`No background image configured, using fallback: ${this.config.background.fallback.type}`);
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

  public addScreenShake(intensity: number, duration: number) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
    this.shakeTimer = this.shakeDuration;
  }

  private updateScreenShake(deltaTime: number) {
    if (this.shakeTimer > 0) {
      this.shakeTimer -= deltaTime;
      if (this.shakeTimer <= 0) {
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
      }
    }
  }

  private getShakeOffset(): { x: number; y: number } {
    const debugSystem = DebugSystem.getInstance();
    if (this.shakeTimer <= 0 || debugSystem.shouldReduceMotion()) {
      return { x: 0, y: 0 };
    }
    
    const progress = this.shakeTimer / this.shakeDuration;
    const currentIntensity = this.shakeIntensity * progress;
    
    return {
      x: (Math.random() - 0.5) * currentIntensity * 2,
      y: (Math.random() - 0.5) * currentIntensity * 2
    };
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
    this.updateScreenShake(deltaTime);
    this.clearCanvas();
    
    // Apply screen shake offset (if not in reduce motion mode)
    const shakeOffset = this.getShakeOffset();
    this.ctx.save();
    this.ctx.translate(shakeOffset.x, shakeOffset.y);
    
    // Layer 1: Background
    this.renderBackground();
    
    // Layer 2: Entities and Effects
    this.renderEntities(ship, projectiles, meteoroids, powerUps, particleSystem);
    
    // Layer 3: HUD
    this.renderHUD(ship, score, rapidFireLevel, scoreMultiplier, scoreMultiplierEndTime);
    
    // Restore transform before UI overlays
    this.ctx.restore();
    
    // Layer 4: Tutorial Overlay (if active)
    if (this.showTutorial) {
      this.renderTutorialOverlay();
    }
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
      logger.debug(`Rendering ${powerUps.length} power-up(s)`);
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
    this.ctx.save();
    
    // Responsive HUD Layout constants
    const isSmallScreen = this.canvas.width < 600;
    const padding = isSmallScreen ? 15 : 20;
    const hudHeight = isSmallScreen ? 50 : 60;
    const heartSize = isSmallScreen ? 20 : 24;
    const iconSize = isSmallScreen ? 28 : 32;
    
    // === TOP-LEFT: Lives as Heart Icons ===
    this.renderLives(ship.lives, padding, 40, heartSize);
    
    // === TOP-RIGHT: Score ===
    this.renderScore(score, this.canvas.width - padding, 40);
    
    // === TOP-CENTER: Power-up Status with Icons ===
    this.renderPowerUpStatus(rapidFireLevel, scoreMultiplier, scoreMultiplierEndTime, this.canvas.width / 2, 40, iconSize);
    
    // === BOTTOM: Control Instructions (smaller, less intrusive) ===
    this.renderControlInstructions();
    
    this.ctx.restore();
  }

  private renderLives(lives: number, x: number, y: number, heartSize: number) {
    this.ctx.save();
    
    // Draw individual heart icons
    for (let i = 0; i < Math.min(lives, 5); i++) { // Cap at 5 hearts max
      const heartX = x + i * (heartSize + 8);
      this.renderHeartIcon(heartX, y, heartSize, true); // Filled heart
    }
    
    // Draw empty hearts for remaining slots up to max
    const maxLives = this.config.ship.lives.max || 5;
    for (let i = lives; i < maxLives; i++) {
      const heartX = x + i * (heartSize + 8);
      this.renderHeartIcon(heartX, y, heartSize, false); // Empty heart
    }
    
    this.ctx.restore();
  }

  private renderHeartIcon(x: number, y: number, size: number, filled: boolean) {
    this.ctx.save();
    this.ctx.translate(x, y);
    
    // Draw heart shape
    const scale = size / 20; // Base size of 20px
    this.ctx.scale(scale, scale);
    
    this.ctx.beginPath();
    this.ctx.moveTo(0, -3);
    this.ctx.bezierCurveTo(-5, -10, -15, -5, 0, 5);
    this.ctx.bezierCurveTo(15, -5, 5, -10, 0, -3);
    this.ctx.closePath();
    
    if (filled) {
      // Filled heart with gradient
      const gradient = this.ctx.createLinearGradient(-8, -8, 8, 8);
      gradient.addColorStop(0, '#ff6b6b');
      gradient.addColorStop(1, '#ee5a52');
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
      
      // Subtle highlight
      this.ctx.strokeStyle = '#ffaaaa';
      this.ctx.lineWidth = 0.5;
      this.ctx.stroke();
    } else {
      // Empty heart outline
      this.ctx.strokeStyle = '#666666';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }

  private renderScore(score: number, x: number, y: number) {
    this.ctx.save();
    const isSmallScreen = this.canvas.width < 600;
    this.ctx.font = `bold ${isSmallScreen ? '20px' : '24px'} "Segoe UI", Arial, sans-serif`;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'middle';
    
    // Add subtle shadow
    this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
    this.ctx.shadowBlur = 2;
    this.ctx.shadowOffsetX = 1;
    this.ctx.shadowOffsetY = 1;
    
    this.ctx.fillText(`Score: ${score.toLocaleString()}`, x, y);
    this.ctx.restore();
  }

  private renderPowerUpStatus(rapidFireLevel: number, scoreMultiplier: number, scoreMultiplierEndTime: number, centerX: number, y: number, iconSize: number) {
    this.ctx.save();
    
    let xOffset = 0;
    const spacing = iconSize + 20;
    
    // Count active power-ups to center them
    let activePowerUps = 0;
    if (rapidFireLevel > 0) activePowerUps++;
    if (scoreMultiplier > 1 && scoreMultiplierEndTime > 0) activePowerUps++;
    
    const startX = centerX - (activePowerUps * spacing) / 2 + iconSize / 2;
    
    // Rapid Fire indicator with icon
    if (rapidFireLevel > 0) {
      this.renderPowerUpIcon(startX + xOffset, y, '⚡', '#00FFFF', `RF ${rapidFireLevel}`, 0);
      xOffset += spacing;
    }
    
    // Score Multiplier indicator with countdown
    if (scoreMultiplier > 1 && scoreMultiplierEndTime > 0) {
      const remainingTime = Math.max(0, (scoreMultiplierEndTime - Date.now()) / 1000);
      const progress = remainingTime / 10; // Assuming 10 second duration
      this.renderPowerUpIcon(startX + xOffset, y, '★', '#FFD700', `${scoreMultiplier}x`, progress);
      xOffset += spacing;
    }
    
    this.ctx.restore();
  }

  private renderPowerUpIcon(x: number, y: number, symbol: string, color: string, label: string, progress: number) {
    this.ctx.save();
    
    const radius = 20;
    
    // Background circle
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
    this.ctx.fill();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // Progress indicator (if applicable)
    if (progress > 0) {
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius + 3, -Math.PI / 2, -Math.PI / 2 + (progress * 2 * Math.PI));
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
    }
    
    // Icon symbol
    this.ctx.font = 'bold 20px Arial';
    this.ctx.fillStyle = color;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(symbol, x, y - 2);
    
    // Label below
    this.ctx.font = 'bold 12px Arial';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(label, x, y + radius + 15);
    
    this.ctx.restore();
  }

  private renderControlInstructions() {
    this.ctx.save();
    this.ctx.font = '12px "Segoe UI", Arial, sans-serif';
    this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'bottom';
    
    this.ctx.fillText('Move: Arrow Keys / WASD / Touch & Drag', this.canvas.width / 2, this.canvas.height - 25);
    this.ctx.fillText('Auto-Fire: Enabled', this.canvas.width / 2, this.canvas.height - 10);
    
    this.ctx.restore();
  }

  public dismissTutorial() {
    this.showTutorial = false;
  }

  public isTutorialActive(): boolean {
    return this.showTutorial;
  }

  private renderTutorialOverlay() {
    this.ctx.save();
    
    // Semi-transparent dark overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Responsive tutorial panel
    const isSmallScreen = this.canvas.width < 600 || this.canvas.height < 500;
    const panelWidth = Math.min(isSmallScreen ? 350 : 400, this.canvas.width - 40);
    const panelHeight = isSmallScreen ? 220 : 250;
    const panelX = (this.canvas.width - panelWidth) / 2;
    const panelY = (this.canvas.height - panelHeight) / 2;
    
    // Panel background with rounded corners
    this.ctx.fillStyle = 'rgba(20, 30, 50, 0.95)';
    this.ctx.strokeStyle = '#4a90e2';
    this.ctx.lineWidth = 2;
    
    this.ctx.beginPath();
    this.ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 15);
    this.ctx.fill();
    this.ctx.stroke();
    
    // Tutorial content
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // Title (responsive font size)
    this.ctx.font = `bold ${isSmallScreen ? '22px' : '28px'} "Segoe UI", Arial, sans-serif`;
    this.ctx.fillText('Welcome to Space Defender!', panelX + panelWidth / 2, panelY + (isSmallScreen ? 40 : 50));
    
    // Instructions (responsive font size)
    this.ctx.font = `${isSmallScreen ? '14px' : '18px'} "Segoe UI", Arial, sans-serif`;
    const centerX = panelX + panelWidth / 2;
    let yPos = panelY + (isSmallScreen ? 75 : 90);
    const lineSpacing = isSmallScreen ? 25 : 30;
    
    this.ctx.fillText('🎮 Move with Arrow Keys or WASD', centerX, yPos);
    yPos += lineSpacing;
    this.ctx.fillText('📱 Touch and drag on mobile devices', centerX, yPos);
    yPos += lineSpacing;
    this.ctx.fillText('🔫 Auto-fire is enabled - just focus on moving!', centerX, yPos);
    yPos += lineSpacing;
    this.ctx.fillText('⭐ Collect power-ups to enhance your ship', centerX, yPos);
    
    // Dismiss instruction with pulsing effect
    const pulseAlpha = 0.6 + 0.4 * Math.sin(Date.now() * 0.005);
    this.ctx.fillStyle = `rgba(255, 255, 255, ${pulseAlpha})`;
    this.ctx.font = `${isSmallScreen ? '14px' : '16px'} "Segoe UI", Arial, sans-serif`;
    this.ctx.fillText('Click anywhere or press any key to start!', centerX, panelY + panelHeight - (isSmallScreen ? 25 : 30));
    
    this.ctx.restore();
  }
}

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
  
  // Screen flash
  private flashIntensity: number = 0;
  private flashDuration: number = 0;
  private flashTimer: number = 0;
  
  // Static fireworks
  private staticFireworks: Array<{
    x: number;
    y: number;
    timer: number;
    size: number;
    particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      color: string;
      size: number;
      trail: Array<{ x: number; y: number; alpha: number }>;
      type: 'burst' | 'sparkle' | 'willow' | 'crackle';
      brightness: number;
    }>;
    phase: 'launch' | 'burst' | 'fade';
    phaseTimer: number;
    fireworkType: 'chrysanthemum' | 'willow' | 'peony' | 'crackle' | 'multicolor';
  }> = [];
  
  private fireworksImage: HTMLImageElement | null = null;
  private fireworksImageLoaded = false;
  private retryButtonBounds: { x: number; y: number; width: number; height: number } | null = null;

  constructor(canvas: HTMLCanvasElement, config: GameConfig) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = config;
    this.showTutorial = true;
    this.time = 0;
    this.loadFireworksImage();
  }

  private loadFireworksImage() {
    if (!this.config.debug.fireworksImagePath) {
      this.fireworksImageLoaded = false;
      return;
    }

    this.fireworksImage = new Image();
    this.fireworksImage.onload = () => {
      this.fireworksImageLoaded = true;
    };
    this.fireworksImage.onerror = () => {
      this.fireworksImageLoaded = false;
      this.fireworksImage = null;
    };
    this.fireworksImage.src = this.config.debug.fireworksImagePath;
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

  public addScreenFlash(intensity: number, duration: number) {
    this.flashIntensity = Math.max(this.flashIntensity, Math.min(intensity, 1.0)); // Cap at 100%
    this.flashDuration = Math.max(this.flashDuration, duration);
    this.flashTimer = this.flashDuration;
  }

  public addStaticFireworks(x: number, y: number, size: number) {
    if (!this.config.debug.showStaticFireworks) return;
    
    // Choose random firework type
    const fireworkTypes: ('chrysanthemum' | 'willow' | 'peony' | 'crackle' | 'multicolor')[] = 
      ['chrysanthemum', 'willow', 'peony', 'crackle', 'multicolor'];
    const fireworkType = fireworkTypes[Math.floor(Math.random() * fireworkTypes.length)];
    
    this.staticFireworks.push({
      x,
      y,
      timer: this.config.debug.staticFireworksDuration,
      size,
      particles: [],
      phase: 'launch',
      phaseTimer: 0,
      fireworkType
    });
    
    // Initialize particles for this firework
    this.initializeFireworkParticles(this.staticFireworks[this.staticFireworks.length - 1]);
  }

  private initializeFireworkParticles(firework: any) {
    const burstCount = Math.floor(firework.size / 3) + 15; // More particles for better effect
    
    // Color palettes for different firework types
    const colorPalettes = {
      chrysanthemum: [
        ['#ff1744', '#ff4569', '#ff7a8a', '#ffb3ba'], // Red shades
        ['#2196f3', '#42a5f5', '#64b5f6', '#90caf9'], // Blue shades
        ['#4caf50', '#66bb6a', '#81c784', '#a5d6a7'], // Green shades
        ['#ff9800', '#ffb74d', '#ffcc02', '#fff176']  // Golden shades
      ],
      willow: [
        ['#8bc34a', '#9ccc65', '#aed581', '#c5e1a5'], // Green willow
        ['#ffeb3b', '#fff176', '#fff59d', '#fff9c4']  // Golden willow
      ],
      peony: [
        ['#e91e63', '#ec407a', '#f06292', '#f8bbd9'], // Pink peony
        ['#9c27b0', '#ab47bc', '#ba68c8', '#ce93d8']  // Purple peony
      ],
      crackle: [
        ['#ffffff', '#ffeb3b', '#ffc107', '#ff8f00']  // White to gold crackle
      ],
      multicolor: [
        ['#f44336', '#e91e63', '#9c27b0', '#673ab7'], // Red to purple
        ['#3f51b5', '#2196f3', '#03a9f4', '#00bcd4'], // Blue spectrum
        ['#009688', '#4caf50', '#8bc34a', '#cddc39'], // Teal to lime
        ['#ffeb3b', '#ffc107', '#ff9800', '#ff5722']  // Yellow to orange
      ]
    };
    
    const palette = colorPalettes[firework.fireworkType as keyof typeof colorPalettes] || colorPalettes.chrysanthemum;
    const selectedColors = palette[Math.floor(Math.random() * palette.length)];
    
    // Create particles based on firework type
    for (let i = 0; i < burstCount; i++) {
      const angle = (Math.PI * 2 * i) / burstCount + (Math.random() - 0.5) * 0.3;
      const speed = this.getFireworkSpeed(firework.fireworkType, firework.size);
      const life = this.getFireworkLife(firework.fireworkType);
      const particleSize = Math.random() * 3 + 2;
      const color = selectedColors[Math.floor(Math.random() * selectedColors.length)];
      
      firework.particles.push({
        x: firework.x,
        y: firework.y,
        vx: Math.cos(angle) * speed * (0.7 + Math.random() * 0.6),
        vy: Math.sin(angle) * speed * (0.7 + Math.random() * 0.6),
        life: life,
        maxLife: life,
        color: color,
        size: particleSize,
        trail: [],
        type: this.getParticleType(firework.fireworkType),
        brightness: 0.8 + Math.random() * 0.4
      });
    }
    
    // Add extra sparkles for certain types
    if (firework.fireworkType === 'crackle' || firework.fireworkType === 'multicolor') {
      const sparkleCount = Math.floor(burstCount * 0.5);
      for (let i = 0; i < sparkleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 80;
        
        firework.particles.push({
          x: firework.x + (Math.random() - 0.5) * 30,
          y: firework.y + (Math.random() - 0.5) * 30,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.8 + Math.random() * 0.4,
          maxLife: 1.2,
          color: '#ffffff',
          size: 1 + Math.random() * 2,
          trail: [],
          type: 'sparkle',
          brightness: 1.0
        });
      }
    }
  }

  private getFireworkSpeed(type: string, size: number): number {
    const baseSpeed = 80 + size * 1.5;
    switch (type) {
      case 'chrysanthemum': return baseSpeed * 1.2;
      case 'willow': return baseSpeed * 0.8;
      case 'peony': return baseSpeed * 1.0;
      case 'crackle': return baseSpeed * 1.4;
      case 'multicolor': return baseSpeed * 1.1;
      default: return baseSpeed;
    }
  }

  private getFireworkLife(type: string): number {
    switch (type) {
      case 'chrysanthemum': return 1.5 + Math.random() * 0.5;
      case 'willow': return 2.2 + Math.random() * 0.8;
      case 'peony': return 1.2 + Math.random() * 0.3;
      case 'crackle': return 1.0 + Math.random() * 0.4;
      case 'multicolor': return 1.8 + Math.random() * 0.6;
      default: return 1.5;
    }
  }

  private getParticleType(fireworkType: string): 'burst' | 'sparkle' | 'willow' | 'crackle' {
    switch (fireworkType) {
      case 'willow': return 'willow';
      case 'crackle': return 'crackle';
      default: return 'burst';
    }
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

  private updateScreenFlash(deltaTime: number) {
    if (this.flashTimer > 0) {
      this.flashTimer -= deltaTime;
      if (this.flashTimer <= 0) {
        this.flashIntensity = 0;
        this.flashDuration = 0;
      }
    }
  }

  private updateStaticFireworks(deltaTime: number) {
    for (let i = this.staticFireworks.length - 1; i >= 0; i--) {
      const firework = this.staticFireworks[i];
      firework.timer -= deltaTime;
      firework.phaseTimer += deltaTime;
      
      // Update phase
      if (firework.phase === 'launch' && firework.phaseTimer > 0.1) {
        firework.phase = 'burst';
        firework.phaseTimer = 0;
      } else if (firework.phase === 'burst' && firework.phaseTimer > 0.3) {
        firework.phase = 'fade';
        firework.phaseTimer = 0;
      }
      
      // Update all particles
      for (let j = firework.particles.length - 1; j >= 0; j--) {
        const particle = firework.particles[j];
        
        // Update position
        particle.x += particle.vx * deltaTime;
        particle.y += particle.vy * deltaTime;
        
        // Apply gravity for willow effect
        if (particle.type === 'willow') {
          particle.vy += 120 * deltaTime; // Gravity effect
          particle.vx *= 0.98; // Air resistance
        }
        
        // Update life
        particle.life -= deltaTime;
        
        // Update trail
        if (particle.trail.length > 0) {
          particle.trail.forEach(trailPoint => {
            trailPoint.alpha *= 0.95; // Fade trail
          });
          particle.trail = particle.trail.filter(point => point.alpha > 0.1);
        }
        
        // Add new trail point
        if (particle.life > 0 && particle.trail.length < 8) {
          particle.trail.push({
            x: particle.x,
            y: particle.y,
            alpha: particle.life / particle.maxLife
          });
        }
        
        // Remove dead particles
        if (particle.life <= 0) {
          firework.particles.splice(j, 1);
        }
      }
      
      // Remove firework if time is up or no particles left
      if (firework.timer <= 0 || firework.particles.length === 0) {
        this.staticFireworks.splice(i, 1);
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
    scoreMultiplierEndTime: number = 0,
    gameOver: boolean = false,
    currentGameTime: number = 0
  ) {
    this.time += deltaTime;
    this.updateScreenShake(deltaTime);
    this.updateScreenFlash(deltaTime);
    this.updateStaticFireworks(deltaTime);
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
    this.renderHUD(ship, score, rapidFireLevel, scoreMultiplier, scoreMultiplierEndTime, currentGameTime);
    
    // Restore transform before UI overlays
    this.ctx.restore();
    
    // Layer 4: Screen Flash Overlay
    this.renderScreenFlash();
    
    // Layer 5: Static Fireworks Overlay
    this.renderStaticFireworks();
    
    // Layer 6: Tutorial Overlay (if active)
    if (this.showTutorial) {
      this.renderTutorialOverlay();
    }
    
    // Layer 7: Game Over Overlay (if game is over)
    if (gameOver) {
      this.renderGameOverOverlay(score, currentGameTime);
    }
  }

  private clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private renderScreenFlash() {
    if (this.flashTimer > 0) {
      // Calculate fade-out alpha based on remaining time
      const fadeProgress = this.flashTimer / this.flashDuration;
      const alpha = this.flashIntensity * fadeProgress;
      
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.restore();
    }
  }

  private renderStaticFireworks() {
    if (!this.config.debug.showStaticFireworks || this.staticFireworks.length === 0) return;
    
    this.ctx.save();
    
    for (const firework of this.staticFireworks) {
      // Use PNG image if available and loaded, otherwise render animated particles
      if (this.fireworksImageLoaded && this.fireworksImage) {
        this.renderPNGFirework(firework);
      } else {
        this.renderAnimatedFirework(firework);
      }
    }
    
    this.ctx.restore();
  }

  private renderPNGFirework(firework: { x: number; y: number; timer: number; size: number }) {
    if (!this.fireworksImage) return;
    
    // Scale the PNG based on meteoroid size and user configuration
    const baseScale = (60 + firework.size * 2) / 100; // Base scale from meteoroid size
    const finalScale = baseScale * this.config.debug.fireworksImageScale; // Apply user scale
    const scaledWidth = this.fireworksImage.width * finalScale;
    const scaledHeight = this.fireworksImage.height * finalScale;
    
    // Center the image on the firework position
    const drawX = firework.x - scaledWidth / 2;
    const drawY = firework.y - scaledHeight / 2;
    
    this.ctx.drawImage(
      this.fireworksImage,
      drawX,
      drawY,
      scaledWidth,
      scaledHeight
    );
  }

  private renderAnimatedFirework(firework: any) {
    for (const particle of firework.particles) {
      const lifeProgress = particle.life / particle.maxLife;
      const alpha = Math.min(lifeProgress * particle.brightness, 1.0);
      
      // Render particle trail
      if (particle.trail.length > 1) {
        this.ctx.strokeStyle = particle.color;
        this.ctx.lineWidth = Math.max(particle.size * 0.5, 1);
        this.ctx.lineCap = 'round';
        
        for (let i = 1; i < particle.trail.length; i++) {
          const trailAlpha = particle.trail[i].alpha * alpha * 0.6;
          this.ctx.globalAlpha = trailAlpha;
          
          this.ctx.beginPath();
          this.ctx.moveTo(particle.trail[i-1].x, particle.trail[i-1].y);
          this.ctx.lineTo(particle.trail[i].x, particle.trail[i].y);
          this.ctx.stroke();
        }
      }
      
      // Render main particle
      this.ctx.globalAlpha = alpha;
      
      // Different rendering based on particle type
      switch (particle.type) {
        case 'burst':
          this.renderBurstParticle(particle);
          break;
        case 'willow':
          this.renderWillowParticle(particle);
          break;
        case 'sparkle':
          this.renderSparkleParticle(particle);
          break;
        case 'crackle':
          this.renderCrackleParticle(particle);
          break;
      }
    }
  }

  private renderBurstParticle(particle: any) {
    // Create a glowing burst particle
    const gradient = this.ctx.createRadialGradient(
      particle.x, particle.y, 0,
      particle.x, particle.y, particle.size * 2
    );
    gradient.addColorStop(0, particle.color);
    gradient.addColorStop(0.7, particle.color + '88');
    gradient.addColorStop(1, particle.color + '00');
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Inner bright core
    this.ctx.fillStyle = particle.color;
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private renderWillowParticle(particle: any) {
    // Willow particles are elongated and fade downward
    this.ctx.fillStyle = particle.color;
    this.ctx.beginPath();
    this.ctx.ellipse(particle.x, particle.y, particle.size * 0.5, particle.size * 1.5, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private renderSparkleParticle(particle: any) {
    // Sparkle particles twinkle
    const sparkleIntensity = 0.5 + 0.5 * Math.sin(Date.now() * 0.01 + particle.x);
    this.ctx.globalAlpha *= sparkleIntensity;
    
    this.ctx.fillStyle = particle.color;
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Add cross sparkle effect
    this.ctx.strokeStyle = particle.color;
    this.ctx.lineWidth = 1;
    const sparkleSize = particle.size * 3;
    
    this.ctx.beginPath();
    this.ctx.moveTo(particle.x - sparkleSize, particle.y);
    this.ctx.lineTo(particle.x + sparkleSize, particle.y);
    this.ctx.moveTo(particle.x, particle.y - sparkleSize);
    this.ctx.lineTo(particle.x, particle.y + sparkleSize);
    this.ctx.stroke();
  }

  private renderCrackleParticle(particle: any) {
    // Crackle particles have sharp, jagged edges
    this.ctx.fillStyle = particle.color;
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1;
    
    const spikes = 6;
    const innerRadius = particle.size * 0.5;
    const outerRadius = particle.size * 1.5;
    
    this.ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (i * Math.PI) / spikes;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = particle.x + Math.cos(angle) * radius;
      const y = particle.y + Math.sin(angle) * radius;
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
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
    scoreMultiplierEndTime: number = 0,
    gameTime: number = 0
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
    
    // === TOP-RIGHT: Score and Time ===
    this.renderScore(score, this.canvas.width - padding, 25);
    this.renderGameTime(gameTime, this.canvas.width - padding, 50);
    
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

  private renderGameTime(gameTime: number, x: number, y: number) {
    this.ctx.save();
    const isSmallScreen = this.canvas.width < 600;
    this.ctx.font = `bold ${isSmallScreen ? '16px' : '18px'} "Segoe UI", Arial, sans-serif`;
    this.ctx.fillStyle = '#aaaaaa';
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'middle';
    
    // Add subtle shadow
    this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
    this.ctx.shadowBlur = 2;
    this.ctx.shadowOffsetX = 1;
    this.ctx.shadowOffsetY = 1;
    
    // Format time as MM:SS
    const totalSeconds = Math.floor(gameTime / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    this.ctx.fillText(`Time: ${timeString}`, x, y);
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

  private renderGameOverOverlay(finalScore: number, gameOverTime: number) {
    this.ctx.save();
    
    // Semi-transparent dark overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Game Over panel
    const panelWidth = Math.min(400, this.canvas.width * 0.8);
    const panelHeight = Math.min(300, this.canvas.height * 0.6);
    const panelX = (this.canvas.width - panelWidth) / 2;
    const panelY = (this.canvas.height - panelHeight) / 2;
    
    // Panel background with border
    this.ctx.fillStyle = 'rgba(20, 20, 40, 0.95)';
    this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    
    this.ctx.strokeStyle = '#ff4444';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
    
    // Game Over title
    this.ctx.fillStyle = '#ff4444';
    this.ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
    this.ctx.textAlign = 'center';
    const centerX = panelX + panelWidth / 2;
    this.ctx.fillText('GAME OVER', centerX, panelY + 60);
    
    // Final score
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
    this.ctx.fillText(`Final Score: ${finalScore}`, centerX, panelY + 120);
    
    // Survival time
    const survivalTime = Math.floor(gameOverTime / 1000);
    const minutes = Math.floor(survivalTime / 60);
    const seconds = survivalTime % 60;
    const timeText = minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`;
    
    this.ctx.font = '18px "Segoe UI", Arial, sans-serif';
    this.ctx.fillText(`Survival Time: ${timeText}`, centerX, panelY + 160);
    
    // Retry button
    const buttonWidth = 150;
    const buttonHeight = 40;
    const buttonX = centerX - buttonWidth / 2;
    const buttonY = panelY + 200;
    
    // Button background with hover effect
    this.ctx.fillStyle = '#4CAF50';
    this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    // Button border
    this.ctx.strokeStyle = '#45a049';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    // Button text
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('RETRY', centerX, buttonY + buttonHeight / 2 + 6);
    
    // Store button bounds for click detection
    this.retryButtonBounds = {
      x: buttonX,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight
    };
    
    this.ctx.restore();
  }

  public isRetryButtonClicked(mouseX: number, mouseY: number): boolean {
    if (!this.retryButtonBounds) return false;
    
    return mouseX >= this.retryButtonBounds.x &&
           mouseX <= this.retryButtonBounds.x + this.retryButtonBounds.width &&
           mouseY >= this.retryButtonBounds.y &&
           mouseY <= this.retryButtonBounds.y + this.retryButtonBounds.height;
  }
}

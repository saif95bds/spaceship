export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

import { ParticlePool } from './ParticlePool.js';
import { logger } from '../utils/Logger';

export class ParticleSystem {
  private particles: Particle[] = [];
  private particlePool: ParticlePool;

  constructor() {
    this.particlePool = ParticlePool.getInstance();
  }

  // Create impact particles when projectile hits meteoroid
  createImpactEffect(x: number, y: number, count: number = 16) {
    logger.particles(`Impact effect: ${count} particles`);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 50 + Math.random() * 100; // Slower so they're more visible
      const life = 2.0 + Math.random() * 1.0; // 2.0-3.0 seconds - much longer lasting
      const size = 5 + Math.random() * 10; // Much larger particles (5-15 pixels)
      
      // More colorful impact - alternating bright colors
      const impactColors = ['#ffffff', '#ffdd00', '#ff6600', '#ff0066', '#66ff00', '#0066ff'];
      const color = impactColors[i % impactColors.length];
      
      const particle = this.particlePool.acquire(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        life, size, color
      );
      this.particles.push(particle);
    }
  }

  // Create explosion effect when meteoroid is destroyed
  createExplosionEffect(x: number, y: number, meteoroidSize: number) {
    // Create a more dramatic explosion with multiple layers
    const baseCount = Math.max(12, Math.floor(meteoroidSize / 2)); // Minimum 12 particles, scale with size
    const extraCount = Math.floor(meteoroidSize / 3); // Additional particles for larger meteoroids
    const totalCount = baseCount + extraCount;
    
    for (let i = 0; i < totalCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const isMainExplosion = i < baseCount;
      
      if (isMainExplosion) {
        // Main explosion particles - fast, bright, larger
        const speed = 60 + Math.random() * 120;
        const life = 1.0 + Math.random() * 0.8; // 1.0-1.8 seconds
        const size = 2 + Math.random() * 6; // Larger particles
        const color = ['#ffdd44', '#ff8844', '#ff4444', '#ffaa22'][Math.floor(Math.random() * 4)]; // Brighter colors
        
        const particle = this.particlePool.acquire(
          x + (Math.random() - 0.5) * meteoroidSize * 0.3,
          y + (Math.random() - 0.5) * meteoroidSize * 0.3,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          life, size, color
        );
        this.particles.push(particle);
      } else {
        // Secondary sparks - slower, smaller, trailing effect
        const speed = 20 + Math.random() * 60;
        const life = 0.6 + Math.random() * 0.8; // 0.6-1.4 seconds
        const size = 1 + Math.random() * 3;
        const color = ['#aa6644', '#886644', '#664444', '#444444'][Math.floor(Math.random() * 4)]; // Darker trailing colors
        
        const particle = this.particlePool.acquire(
          x + (Math.random() - 0.5) * meteoroidSize * 0.7,
          y + (Math.random() - 0.5) * meteoroidSize * 0.7,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          life, size, color
        );
        this.particles.push(particle);
      }
    }
  }

  // Create damage burst effect for meteoroid hits (whether destroyed or not)
  createDamageBurst(x: number, y: number, meteoroidSize: number, isDestroyed: boolean) {
    const intensity = isDestroyed ? 1.5 : 1.0; // More dramatic if destroyed
    const count = Math.floor((meteoroidSize / 6) * intensity); // Scale with size and destruction
    const baseCount = Math.max(8, count); // Minimum 8 particles
    
    logger.particles(`Damage burst: ${baseCount} particles - Size: ${meteoroidSize}, Destroyed: ${isDestroyed}`);
    
    // Create colorful burst particles like the reference image
    for (let i = 0; i < baseCount; i++) {
      const angle = (Math.PI * 2 * i) / baseCount + (Math.random() - 0.5) * 0.4;
      const speed = (30 + Math.random() * 60) * intensity; // Slower
      const life = (1.5 + Math.random() * 1.5) * intensity; // 1.5-3.0 seconds - much longer
      const size = (4 + Math.random() * 8) * intensity; // Much larger (4-12 pixels)
      
      // Vibrant colors inspired by the reference image
      const colors = [
        '#ff0080', '#ff4000', '#ff8000', '#ffff00', // Magentas, reds, oranges, yellows
        '#80ff00', '#00ff40', '#00ff80', '#00ffff', // Greens, cyans
        '#0080ff', '#4000ff', '#8000ff', '#ff00ff'  // Blues, purples, magentas
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      const particle = this.particlePool.acquire(
        x + (Math.random() - 0.5) * meteoroidSize * 0.2,
        y + (Math.random() - 0.5) * meteoroidSize * 0.2,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        life, size, color
      );
      this.particles.push(particle);
    }
  }

  // Create additional firework burst for large meteoroid destruction
  createFireworkBurst(x: number, y: number, meteoroidSize: number) {
    // Only create burst for larger meteoroids
    if (meteoroidSize < 30) return;
    
    const burstCount = Math.floor(meteoroidSize / 8); // Scale with size
    
    for (let i = 0; i < burstCount; i++) {
      const angle = (Math.PI * 2 * i) / burstCount + (Math.random() - 0.5) * 0.3;
      const speed = 80 + Math.random() * 100;
      const life = 1.2 + Math.random() * 0.8; // 1.2-2.0 seconds - longer lasting
      const size = 3 + Math.random() * 5; // Large particles
      const color = ['#ffffff', '#ffff44', '#ffaa44', '#ff6644'][Math.floor(Math.random() * 4)]; // Very bright colors
      
      const particle = this.particlePool.acquire(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        life, size, color
      );
      this.particles.push(particle);
    }
  }

  update(deltaTime: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Update position
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      
      // Update life
      particle.life += deltaTime;
      
      // Apply gravity/deceleration
      particle.vy += 100 * deltaTime; // Gravity
      particle.vx *= 0.98; // Air resistance
      particle.vy *= 0.98;
      
      // Remove dead particles and return to pool
      if (particle.life >= particle.maxLife) {
        this.particlePool.release(particle);
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const particle of this.particles) {
      const progress = particle.life / particle.maxLife;
      const alpha = Math.max(0.1, (1 - progress) * 1.0); // Higher alpha, minimum 0.1
      const size = particle.size * Math.max(0.3, 1 - progress * 0.3); // Don't shrink as much
      
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
      ctx.fill();
      
      // Add a bright outline for better visibility
      ctx.globalAlpha = alpha * 0.5;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      ctx.restore();
    }
    
    // Debug: Log particle count occasionally
    if (this.particles.length > 0) {
      logger.debugRandom(0.01, `Rendering ${this.particles.length} particles`);
    }
  }

  getParticleCount(): number {
    return this.particles.length;
  }
}

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

export class ParticleSystem {
  private particles: Particle[] = [];

  // Create impact particles when projectile hits meteoroid
  createImpactEffect(x: number, y: number, count: number = 8) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 50 + Math.random() * 100;
      
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.3, // 0.5-0.8 seconds
        size: 2 + Math.random() * 3,
        color: Math.random() > 0.5 ? '#ffaa44' : '#ff6644' // Orange/red colors
      });
    }
  }

  // Create explosion effect when meteoroid is destroyed
  createExplosionEffect(x: number, y: number, meteoroidSize: number) {
    const count = Math.floor(meteoroidSize / 4); // More particles for larger meteoroids
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 80;
      
      this.particles.push({
        x: x + (Math.random() - 0.5) * meteoroidSize * 0.5,
        y: y + (Math.random() - 0.5) * meteoroidSize * 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.5, // 0.8-1.3 seconds
        size: 1 + Math.random() * 4,
        color: ['#ffaa44', '#ff6644', '#aa4444', '#666666'][Math.floor(Math.random() * 4)]
      });
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
      
      // Remove dead particles
      if (particle.life >= particle.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const particle of this.particles) {
      const progress = particle.life / particle.maxLife;
      const alpha = (1 - progress) * 0.8;
      const size = particle.size * (1 - progress * 0.5);
      
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  getParticleCount(): number {
    return this.particles.length;
  }
}

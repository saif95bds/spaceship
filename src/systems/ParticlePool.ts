import { ObjectPool } from '../utils/ObjectPool.js';
import { Particle } from './particles.js';

export class ParticlePool {
  private static instance: ParticlePool;
  private pool: ObjectPool<Particle>;

  private constructor() {
    this.pool = new ObjectPool<Particle>(
      // Factory function - create new particle
      () => ({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 0,
        size: 0,
        color: '#ffffff'
      }),
      // Reset function - reset particle properties
      (particle: Particle) => {
        particle.x = 0;
        particle.y = 0;
        particle.vx = 0;
        particle.vy = 0;
        particle.life = 0;
        particle.maxLife = 0;
        particle.size = 0;
        particle.color = '#ffffff';
      },
      50, // Initial size
      300 // Maximum size for many particles
    );
  }

  public static getInstance(): ParticlePool {
    if (!ParticlePool.instance) {
      ParticlePool.instance = new ParticlePool();
    }
    return ParticlePool.instance;
  }

  public acquire(x: number, y: number, vx: number, vy: number, life: number, size: number, color: string): Particle {
    const particle = this.pool.acquire();
    particle.x = x;
    particle.y = y;
    particle.vx = vx;
    particle.vy = vy;
    particle.life = life;
    particle.maxLife = life;
    particle.size = size;
    particle.color = color;
    return particle;
  }

  public release(particle: Particle): void {
    this.pool.release(particle);
  }

  public getStats(): { available: number; maxSize: number } {
    return this.pool.getStats();
  }
}
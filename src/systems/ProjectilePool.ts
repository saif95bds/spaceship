import { Projectile } from '../entities/Projectile';
import { GameConfig } from '../types/config';
import { ObjectPool } from '../utils/ObjectPool';

/**
 * Projectile pool manager for performance optimization
 */
export class ProjectilePool {
  private pool: ObjectPool<Projectile>;
  private config: GameConfig;

  constructor(config: GameConfig) {
    this.config = config;
    
    // Create object pool for projectiles
    this.pool = new ObjectPool<Projectile>(
      () => new Projectile(0, 0, this.config), // Create function
      (projectile) => {
        // Reset function - prepare projectile for reuse
        projectile.alive = false; // Mark as not alive until reused
      },
      20, // Initial pool size
      100 // Max pool size
    );
  }

  /**
   * Get a projectile from the pool, initialized at the given position
   */
  public acquire(x: number, y: number): Projectile {
    const projectile = this.pool.acquire();
    projectile.reset(x, y);
    return projectile;
  }

  /**
   * Return a projectile to the pool for reuse
   */
  public release(projectile: Projectile): void {
    this.pool.release(projectile);
  }

  /**
   * Get pool statistics for debugging
   */
  public getStats(): { available: number; maxSize: number } {
    return this.pool.getStats();
  }

  /**
   * Clear the pool
   */
  public clear(): void {
    this.pool.clear();
  }
}
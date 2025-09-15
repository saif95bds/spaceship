import { Ship } from '../entities/Ship';
import { Projectile } from '../entities/Projectile';
import { Meteoroid } from '../entities/Meteoroid';

export interface CollisionResult {
  type: 'projectile-meteoroid' | 'ship-meteoroid';
  projectileIndex?: number;
  meteoroidIndex: number;
  damage?: number;
}

export class CollisionSystem {
  // Circle-circle collision detection
  private static checkCircleCollision(
    x1: number, y1: number, radius1: number,
    x2: number, y2: number, radius2: number
  ): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (radius1 + radius2);
  }

  // Check projectile-meteoroid collisions
  static checkProjectileCollisions(
    projectiles: Projectile[], 
    meteoroids: Meteoroid[]
  ): CollisionResult[] {
    const collisions: CollisionResult[] = [];

    for (let p = 0; p < projectiles.length; p++) {
      const projectile = projectiles[p];
      
      for (let m = 0; m < meteoroids.length; m++) {
        const meteoroid = meteoroids[m];
        
        if (this.checkCircleCollision(
          projectile.x, projectile.y, projectile.getCollisionRadius(),
          meteoroid.x, meteoroid.y, meteoroid.getCollisionRadius()
        )) {
          collisions.push({
            type: 'projectile-meteoroid',
            projectileIndex: p,
            meteoroidIndex: m,
            damage: 1 // Projectiles deal 1 damage
          });
        }
      }
    }

    return collisions;
  }

  // Check ship-meteoroid collisions
  static checkShipCollisions(
    ship: Ship,
    meteoroids: Meteoroid[]
  ): CollisionResult[] {
    const collisions: CollisionResult[] = [];

    for (let m = 0; m < meteoroids.length; m++) {
      const meteoroid = meteoroids[m];
      
      if (this.checkCircleCollision(
        ship.x, ship.y, ship.getCollisionRadius(),
        meteoroid.x, meteoroid.y, meteoroid.getCollisionRadius()
      )) {
        collisions.push({
          type: 'ship-meteoroid',
          meteoroidIndex: m
        });
      }
    }

    return collisions;
  }
}

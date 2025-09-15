import { Ship } from '../entities/Ship';
import { Projectile } from '../entities/Projectile';
import { Meteoroid } from '../entities/Meteoroid';
import { PowerUp } from '../entities/PowerUp';

export interface CollisionResult {
  type: 'projectile-meteoroid' | 'ship-meteoroid';
  projectileIndex?: number;
  meteoroidIndex: number;
  damage?: number;
}

export interface PowerUpCollisionResult {
  type: 'ship-powerup';
  powerUpIndex: number;
}

export interface ProjectilePowerUpCollisionResult {
  type: 'projectile-powerup';
  projectileIndex: number;
  powerUpIndex: number;
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

  // Check ship-powerup collisions
  static checkPowerUpCollisions(
    ship: Ship,
    powerUps: PowerUp[]
  ): PowerUpCollisionResult[] {
    const collisions: PowerUpCollisionResult[] = [];

    for (let p = 0; p < powerUps.length; p++) {
      const powerUp = powerUps[p];
      
      if (this.checkCircleCollision(
        ship.x, ship.y, ship.getCollisionRadius(),
        powerUp.x, powerUp.y, powerUp.getRadius()
      )) {
        collisions.push({
          type: 'ship-powerup',
          powerUpIndex: p
        });
      }
    }

    return collisions;
  }

  // Check projectile-powerup collisions
  static checkProjectilePowerUpCollisions(
    projectiles: Projectile[],
    powerUps: PowerUp[]
  ): ProjectilePowerUpCollisionResult[] {
    const collisions: ProjectilePowerUpCollisionResult[] = [];

    for (let p = 0; p < projectiles.length; p++) {
      const projectile = projectiles[p];
      
      for (let pu = 0; pu < powerUps.length; pu++) {
        const powerUp = powerUps[pu];
        
        if (this.checkCircleCollision(
          projectile.x, projectile.y, projectile.getCollisionRadius(),
          powerUp.x, powerUp.y, powerUp.getRadius()
        )) {
          collisions.push({
            type: 'projectile-powerup',
            projectileIndex: p,
            powerUpIndex: pu
          });
        }
      }
    }

    return collisions;
  }
}

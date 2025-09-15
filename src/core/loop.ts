// Fixed-step update (60Hz) and variable render

import { InputSystem } from '../systems/input';
import { RenderSystem } from '../systems/render';
import { CollisionSystem } from '../systems/collision';
import { ParticleSystem } from '../systems/particles';
import { Ship } from '../entities/Ship';
import { Projectile } from '../entities/Projectile';
import { Meteoroid } from '../entities/Meteoroid';
import { GameConfig } from '../types/config';

const FIXED_STEP = 1000 / 60; // 60Hz in ms

export function startGameLoop(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D | null, config: GameConfig) {
  if (!ctx) return;

  let lastUpdate = performance.now();
  let accumulator = 0;

  // Initialize systems and entities
  const inputSystem = new InputSystem(canvas);
  const renderSystem = new RenderSystem(canvas, ctx, config);
  const particleSystem = new ParticleSystem();
  const ship = new Ship(canvas.width / 2, canvas.height - 100, config);
  const projectiles: Projectile[] = [];
  const meteoroids: Meteoroid[] = [];
  
  // Meteoroid spawning variables
  let lastMeteorospawnTime = 0;
  const meteoroidSpawnRate = config.spawn.basePerSecond; // meteoroids per second

  // Handle canvas resize
  window.addEventListener('resize', () => {
    renderSystem.onResize();
  });

  function update(dt: number, currentTime: number) {
    const input = inputSystem.getInputState();
    
    if (!input.isPaused) {
      // Update ship and handle auto-fire
      const newProjectile = ship.update(dt, input.movement.x, input.movement.y, canvas.width, canvas.height, currentTime);
      if (newProjectile) {
        projectiles.push(newProjectile);
      }

      // Spawn meteoroids
      if (currentTime - lastMeteorospawnTime > (1000 / meteoroidSpawnRate)) {
        spawnMeteoroid();
        lastMeteorospawnTime = currentTime;
      }

      // Update projectiles
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        projectile.update(dt, canvas.height);
        
        // Remove dead projectiles
        if (!projectile.alive) {
          projectiles.splice(i, 1);
        }
      }

      // Update meteoroids
      for (let i = meteoroids.length - 1; i >= 0; i--) {
        const meteoroid = meteoroids[i];
        meteoroid.update();
        
        // Remove meteoroids that are off-screen
        if (meteoroid.isOffScreen(canvas.height)) {
          meteoroids.splice(i, 1);
        }
      }

      // Handle collisions
      handleCollisions(currentTime);

      // Update particles
      particleSystem.update(dt);
    }
  }

  function selectMeteoruidType() {
    // Calculate total weight
    const totalWeight = config.meteoroids.reduce((sum, m) => sum + m.weight, 0);
    
    // Select random meteoroid based on weights
    let random = Math.random() * totalWeight;
    for (const meteoroidConfig of config.meteoroids) {
      random -= meteoroidConfig.weight;
      if (random <= 0) {
        return meteoroidConfig;
      }
    }
    
    // Fallback to first meteoroid if something goes wrong
    return config.meteoroids[0];
  }

  function spawnMeteoroid() {
    // Choose a random meteoroid config based on weights
    const meteoroidConfig = selectMeteoruidType();
    
    // Choose a random size (weighted towards smaller sizes, larger meteoroids spawn less often)
    const sizes: ('L' | 'M' | 'S')[] = ['L', 'M', 'S'];
    const sizeWeights = [0.2, 0.4, 0.4]; // 20% L, 40% M, 40% S
    const rand = Math.random();
    let size: 'L' | 'M' | 'S' = 'M';
    
    if (rand < sizeWeights[0]) size = 'L';
    else if (rand < sizeWeights[0] + sizeWeights[1]) size = 'M';
    else size = 'S';
    
    // Spawn position: random X from top strip with safety radius around ship
    const safetyRadius = config.spawn.margin;
    let x: number;
    let attempts = 0;
    const maxAttempts = 10;
    
    // Try to find a safe spawn position away from ship
    do {
      x = Math.random() * canvas.width;
      attempts++;
    } while (Math.abs(x - ship.x) < safetyRadius && attempts < maxAttempts);
    
    const y = -config.spawn.margin; // Start above screen (use margin from config)
    
    const meteoroid = new Meteoroid(x, y, size, meteoroidConfig);
    
    // Debug logging to verify type weighting and safety margin
    console.log(`Spawned ${meteoroidConfig.id} meteoroid (${size}) at (${x.toFixed(1)}, ${y}) - Ship at (${ship.x.toFixed(1)}, ${ship.y.toFixed(1)}) - Distance: ${Math.abs(x - ship.x).toFixed(1)}px`);
    
    meteoroids.push(meteoroid);
  }

  function handleCollisions(currentTime: number) {
    // Check projectile-meteoroid collisions
    const projectileCollisions = CollisionSystem.checkProjectileCollisions(projectiles, meteoroids);
    
    // Process projectile collisions (in reverse order to handle array modifications)
    for (let i = projectileCollisions.length - 1; i >= 0; i--) {
      const collision = projectileCollisions[i];
      const meteoroidIndex = collision.meteoroidIndex;
      const projectileIndex = collision.projectileIndex!;
      
      // Damage the meteoroid
      const meteoroid = meteoroids[meteoroidIndex];
      const projectile = projectiles[projectileIndex];
      const isDestroyed = meteoroid.takeDamage(collision.damage!);
      
      // Create impact effect at collision point
      particleSystem.createImpactEffect(projectile.x, projectile.y);
      
      // Remove the projectile
      projectiles.splice(projectileIndex, 1);
      
      if (isDestroyed) {
        // Create explosion effect
        particleSystem.createExplosionEffect(meteoroid.x, meteoroid.y, meteoroid.size);
        
        // Handle meteoroid splitting
        const splitMeteoroids = meteoroid.getSplitMeteoroids();
        
        // Remove the destroyed meteoroid
        meteoroids.splice(meteoroidIndex, 1);
        
        // Add split meteoroids
        meteoroids.push(...splitMeteoroids);
        
        // TODO: Add score points
      }
    }

    // Check ship-meteoroid collisions (only if ship can take damage)
    if (ship.canTakeDamage()) {
      const shipCollisions = CollisionSystem.checkShipCollisions(ship, meteoroids);
      
      for (const collision of shipCollisions) {
        const meteoroidIndex = collision.meteoroidIndex;
        
        // Ship takes damage and becomes invincible
        const gameOver = ship.takeDamage(currentTime);
        
        // Remove the meteoroid that hit the ship
        meteoroids.splice(meteoroidIndex, 1);
        
        if (gameOver) {
          console.log("Game Over! Ship destroyed.");
          // TODO: Handle game over state
        }
        
        break; // Only handle one collision per frame
      }
    }
  }

  function render(dt: number) {
    if (!ctx) return;
    renderSystem.render(ship, projectiles, meteoroids, particleSystem, dt);
  }

  function loop(now: number) {
    const deltaTime = (now - lastUpdate) / 1000;
    accumulator += now - lastUpdate;
    lastUpdate = now;
    while (accumulator >= FIXED_STEP) {
      update(FIXED_STEP / 1000, now);
      accumulator -= FIXED_STEP;
    }
    render(deltaTime);
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

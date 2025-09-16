// Fixed-step update (60Hz) and variable render

import { InputSystem } from '../systems/input';
import { RenderSystem } from '../systems/render';
import { CollisionSystem, PowerUpCollisionResult, ProjectilePowerUpCollisionResult } from '../systems/collision';
import { ParticleSystem } from '../systems/particles';
import { Ship } from '../entities/Ship';
import { Projectile } from '../entities/Projectile';
import { Meteoroid } from '../entities/Meteoroid';
import { PowerUp, PowerUpType } from '../entities/PowerUp';
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
  const powerUps: PowerUp[] = [];
  
  // Game state
  let score = 0;
  let rapidFireLevel = 0;
  let scoreMultiplier = 1;
  let scoreMultiplierEndTime = 0;
  
  // Spawning variables
  let lastMeteorospawnTime = 0;
  let lastPowerUpSpawnTime = 0;
  const meteoroidSpawnRate = config.spawn.basePerSecond; // meteoroids per second
  const powerUpSpawnIntervalMs = config.powerUps.spawnFrequencySeconds * 1000;
  
  console.log(`[DEBUG] Game initialized - Power-up spawn interval: ${powerUpSpawnIntervalMs}ms (${config.powerUps.spawnFrequencySeconds}s)`);
  console.log(`[DEBUG] Meteoroid spawn rate: ${meteoroidSpawnRate}/s`);

  // Handle canvas resize
  window.addEventListener('resize', () => {
    renderSystem.onResize();
  });

  function update(dt: number, currentTime: number) {
    const input = inputSystem.getInputState();
    
    // Debug power-up timing every 5 seconds
    if (currentTime % 5000 < 100) {
      const timeSinceLastPowerUp = currentTime - lastPowerUpSpawnTime;
      console.log(`[DEBUG] Current time: ${currentTime.toFixed(0)}ms, Time since last power-up: ${timeSinceLastPowerUp.toFixed(0)}ms, Spawn interval: ${powerUpSpawnIntervalMs}ms, Power-ups active: ${powerUps.length}`);
    }
    
    if (!input.isPaused) {
      // Update ship and handle auto-fire
      const newProjectiles = ship.update(dt, input.movement.x, input.movement.y, canvas.width, canvas.height, currentTime);
      if (newProjectiles.length > 0) {
        projectiles.push(...newProjectiles);
        if (newProjectiles.length > 1) {
          console.log(`[DEBUG] Fired ${newProjectiles.length} projectiles (multi-barrel)`);
        }
      }

      // Spawn meteoroids
      if (currentTime - lastMeteorospawnTime > (1000 / meteoroidSpawnRate)) {
        spawnMeteoroid();
        lastMeteorospawnTime = currentTime;
      }

      // Spawn power-ups occasionally
      if (currentTime - lastPowerUpSpawnTime > powerUpSpawnIntervalMs) {
        console.log(`[DEBUG] Spawning power-up at time ${currentTime}, interval: ${powerUpSpawnIntervalMs}ms, last spawn: ${lastPowerUpSpawnTime}`);
        try {
          spawnPowerUp();
          console.log(`[DEBUG] Power-up spawned successfully. Total power-ups: ${powerUps.length}`);
          lastPowerUpSpawnTime = currentTime;
        } catch (error) {
          console.error('[ERROR] Failed to spawn power-up:', error);
        }
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

      // Update power-ups
      for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        try {
          powerUp.update(dt);
          
          // Remove power-ups that are off-screen
          if (powerUp.isOffScreen(canvas.height)) {
            console.log(`[DEBUG] Removing off-screen power-up: ${powerUp.type} at y=${powerUp.y.toFixed(1)}`);
            powerUps.splice(i, 1);
          }
        } catch (error) {
          console.error(`[ERROR] Failed to update power-up at index ${i}:`, error);
          // Remove problematic power-up to prevent hanging
          powerUps.splice(i, 1);
        }
      }

      // Update score multiplier timer
      if (scoreMultiplierEndTime > 0 && currentTime >= scoreMultiplierEndTime) {
        scoreMultiplier = 1;
        scoreMultiplierEndTime = 0;
        console.log('Score multiplier expired');
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

  function spawnPowerUp() {
    // Choose random power-up type
    const types: PowerUpType[] = ['+1life', 'rapidFire', 'scoreMultiplier'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    // Spawn position: random X across screen width, above screen
    const x = Math.random() * canvas.width;
    const y = -50;
    
    console.log(`[DEBUG] Canvas dimensions: ${canvas.width}x${canvas.height}, spawning at (${x.toFixed(1)}, ${y})`);
    
    const powerUp = new PowerUp(x, y, randomType, config);
    powerUps.push(powerUp);
    
    console.log(`Spawned ${randomType} power-up at (${x.toFixed(1)}, ${y}). Total power-ups: ${powerUps.length}`);
  }

  function handleCollisions(currentTime: number) {
    // Check projectile-meteoroid collisions
    const projectileCollisions = CollisionSystem.checkProjectileCollisions(projectiles, meteoroids);
    
    // Check ship-powerup collisions
    const powerUpCollisions = CollisionSystem.checkPowerUpCollisions(ship, powerUps);
    
    // Check projectile-powerup collisions
    const projectilePowerUpCollisions = CollisionSystem.checkProjectilePowerUpCollisions(projectiles, powerUps);
    
    // Debug collision detection (reduced frequency)
    if (powerUps.length > 0 && Math.random() < 0.001) {
      const nearestPowerUp = powerUps[0];
      const distance = Math.sqrt((ship.x - nearestPowerUp.x) ** 2 + (ship.y - nearestPowerUp.y) ** 2);
      const requiredDistance = ship.getCollisionRadius() + nearestPowerUp.getRadius();
      console.log(`[DEBUG] Ship at (${ship.x.toFixed(1)}, ${ship.y.toFixed(1)}), PowerUp at (${nearestPowerUp.x.toFixed(1)}, ${nearestPowerUp.y.toFixed(1)})`);
    }
    
    // Process projectile collisions with safety checks
    for (let i = projectileCollisions.length - 1; i >= 0; i--) {
      const collision = projectileCollisions[i];
      const meteoroidIndex = collision.meteoroidIndex;
      const projectileIndex = collision.projectileIndex!;
      
      // Safety checks to prevent crashes
      if (meteoroidIndex >= meteoroids.length || meteoroidIndex < 0) {
        console.warn(`[WARNING] Invalid meteoroid index: ${meteoroidIndex}, array length: ${meteoroids.length}`);
        continue;
      }
      if (projectileIndex >= projectiles.length || projectileIndex < 0) {
        console.warn(`[WARNING] Invalid projectile index: ${projectileIndex}, array length: ${projectiles.length}`);
        continue;
      }
      
      const meteoroid = meteoroids[meteoroidIndex];
      const projectile = projectiles[projectileIndex];
      
      if (!meteoroid || !projectile) {
        console.warn(`[WARNING] Missing entities - Meteoroid: ${!!meteoroid}, Projectile: ${!!projectile}`);
        continue;
      }
      
      try {
        // Damage the meteoroid
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
          
          // Add score points based on meteoroid type and size
          let baseScore = meteoroid.meteoroidType === 'basalt' ? 10 : 
                         meteoroid.meteoroidType === 'ice' ? 15 : 
                         meteoroid.meteoroidType === 'fireball' ? 25 : 20; // Metal = 20, Fireball = 25
          
          // Double points for fireball meteoroids
          if (meteoroid.meteoroidType === 'fireball') {
            baseScore *= 2; // 50 points for fireball
          }
          
          const sizeMultiplier = meteoroid.sizeType === 'L' ? 3 : meteoroid.sizeType === 'M' ? 2 : 1;
          const points = baseScore * sizeMultiplier * scoreMultiplier;
          score += points;
          console.log(`+${points} points! Total: ${score} (${scoreMultiplier}x multiplier)`);
          
          // Get meteoroid config for splitting
          const meteoroidConfig = meteoroid.getConfig();
        }
      } catch (error) {
        console.error(`[ERROR] Failed to process projectile-meteoroid collision:`, error);
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

    // Process power-up collisions
    if (powerUpCollisions.length > 0) {
      console.log(`[DEBUG] *** POWER-UP COLLISION DETECTED! Processing ${powerUpCollisions.length} collision(s) ***`);
    }
    for (let i = powerUpCollisions.length - 1; i >= 0; i--) {
      const collision = powerUpCollisions[i];
      const powerUpIndex = collision.powerUpIndex;
      const powerUp = powerUps[powerUpIndex];
      
      console.log(`[DEBUG] *** COLLECTING POWER-UP: ${powerUp.type} at index ${powerUpIndex} ***`);
      
      // Apply power-up effect
      applyPowerUpEffect(powerUp.type, currentTime);
      
      // Remove the power-up
      powerUps.splice(powerUpIndex, 1);
      console.log(`[DEBUG] *** POWER-UP COLLECTED! Remaining power-ups: ${powerUps.length} ***`);
    }

    // Process projectile-powerup collisions with safety checks
    if (projectilePowerUpCollisions.length > 0) {
      console.log(`[DEBUG] *** PROJECTILE-POWER-UP COLLISION! Processing ${projectilePowerUpCollisions.length} collision(s) ***`);
    }
    
    // Sort collisions by indices (highest first) to prevent index invalidation
    projectilePowerUpCollisions.sort((a, b) => {
      if (a.powerUpIndex !== b.powerUpIndex) {
        return b.powerUpIndex - a.powerUpIndex;
      }
      return b.projectileIndex - a.projectileIndex;
    });
    
    for (let i = 0; i < projectilePowerUpCollisions.length; i++) {
      const collision = projectilePowerUpCollisions[i];
      const powerUpIndex = collision.powerUpIndex;
      const projectileIndex = collision.projectileIndex;
      
      // Safety checks to prevent crashes
      if (powerUpIndex >= powerUps.length || powerUpIndex < 0) {
        console.warn(`[WARNING] Invalid powerUp index: ${powerUpIndex}, array length: ${powerUps.length}`);
        continue;
      }
      if (projectileIndex >= projectiles.length || projectileIndex < 0) {
        console.warn(`[WARNING] Invalid projectile index: ${projectileIndex}, array length: ${projectiles.length}`);
        continue;
      }
      
      const powerUp = powerUps[powerUpIndex];
      const projectile = projectiles[projectileIndex];
      
      if (!powerUp || !projectile) {
        console.warn(`[WARNING] Missing entities - PowerUp: ${!!powerUp}, Projectile: ${!!projectile}`);
        continue;
      }
      
      console.log(`[DEBUG] *** SHOOTING POWER-UP: ${powerUp.type} at index ${powerUpIndex} ***`);
      
      try {
        // Apply power-up effect
        applyPowerUpEffect(powerUp.type, currentTime);
        
        // Remove both the power-up and the projectile (highest indices first)
        if (powerUpIndex >= projectileIndex) {
          powerUps.splice(powerUpIndex, 1);
          projectiles.splice(projectileIndex, 1);
        } else {
          projectiles.splice(projectileIndex, 1);
          powerUps.splice(powerUpIndex, 1);
        }
        
        console.log(`[DEBUG] *** POWER-UP SHOT! Remaining power-ups: ${powerUps.length}, projectiles: ${projectiles.length} ***`);
      } catch (error) {
        console.error(`[ERROR] Failed to process projectile-powerup collision:`, error);
      }
    }
  }

  function applyPowerUpEffect(type: PowerUpType, currentTime: number) {
    switch (type) {
      case '+1life':
        if (ship.lives < config.ship.lives.max) {
          ship.lives++;
          console.log(`+1 Life! Lives: ${ship.lives}/${config.ship.lives.max}`);
        } else {
          console.log(`Already at max lives (${config.ship.lives.max})`);
        }
        break;
        
      case 'rapidFire':
        if (rapidFireLevel < config.powerUps.rapidFire.maxLevel) {
          rapidFireLevel++;
          // Update ship fire rate and barrel count
          const levelConfig = config.powerUps.rapidFire.levels[rapidFireLevel.toString() as keyof typeof config.powerUps.rapidFire.levels];
          ship.setFireRate(levelConfig.fireRate);
          ship.setBarrels(levelConfig.barrels);
          console.log(`Rapid Fire Level ${rapidFireLevel}! Fire rate: ${levelConfig.fireRate}, Barrels: ${levelConfig.barrels}`);
          
          // Update ship skin based on rapid fire level
          ship.updateSkin(rapidFireLevel);
        } else {
          console.log(`Already at max rapid fire level (${config.powerUps.rapidFire.maxLevel})`);
        }
        break;
        
      case 'scoreMultiplier':
        scoreMultiplier = config.powerUps.scoreMultiplier.mult;
        scoreMultiplierEndTime = currentTime + config.powerUps.scoreMultiplier.durationMs;
        console.log(`Score Multiplier ${scoreMultiplier}x for ${config.powerUps.scoreMultiplier.durationMs / 1000}s!`);
        break;
    }
  }

  function render(dt: number, currentTime: number) {
    if (!ctx) return;
    renderSystem.render(ship, projectiles, meteoroids, powerUps, particleSystem, dt, score, rapidFireLevel, scoreMultiplier, scoreMultiplierEndTime);
  }

  function loop(now: number) {
    try {
      const deltaTime = (now - lastUpdate) / 1000;
      accumulator += now - lastUpdate;
      lastUpdate = now;
      
      // Prevent infinite loops by limiting accumulator
      if (accumulator > 1000) {
        console.warn('[WARNING] Accumulator exceeded 1000ms, resetting to prevent hanging');
        accumulator = FIXED_STEP;
      }
      
      let updateCount = 0;
      while (accumulator >= FIXED_STEP && updateCount < 10) {
        update(FIXED_STEP / 1000, now);
        accumulator -= FIXED_STEP;
        updateCount++;
      }
      
      if (updateCount >= 10) {
        console.warn('[WARNING] Update loop ran 10 times, potential performance issue');
      }
      
      render(deltaTime, now);
      requestAnimationFrame(loop);
    } catch (error) {
      console.error('[CRITICAL ERROR] Game loop crashed:', error);
      if (error instanceof Error) {
        console.error('Stack trace:', error.stack);
      }
      // Try to restart the loop after a delay
      setTimeout(() => {
        console.log('[RECOVERY] Attempting to restart game loop...');
        requestAnimationFrame(loop);
      }, 1000);
    }
  }

  requestAnimationFrame(loop);
}

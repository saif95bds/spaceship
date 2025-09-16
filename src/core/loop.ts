// Fixed-step update (60Hz) and variable render

import { InputSystem } from '../systems/input';
import { RenderSystem } from '../systems/render';
import { CollisionSystem, PowerUpCollisionResult, ProjectilePowerUpCollisionResult } from '../systems/collision';
import { ParticleSystem } from '../systems/particles';
import { ProjectilePool } from '../systems/ProjectilePool';
import { ParticlePool } from '../systems/ParticlePool';
import { DebugSystem } from '../systems/DebugSystem';
import { Ship } from '../entities/Ship';
import { Projectile } from '../entities/Projectile';
import { Meteoroid } from '../entities/Meteoroid';
import { PowerUp, PowerUpType } from '../entities/PowerUp';
import { GameConfig } from '../types/config';
import { logger, configureLogging } from '../utils/Logger';

const FIXED_STEP = 1000 / 60; // 60Hz in ms

export function startGameLoop(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D | null, config: GameConfig) {
  if (!ctx) return;

  // Configure logging based on game config
  configureLogging({
    enabled: config.logging.console_log_enabled,
    categories: {
      debug: config.logging.console_log_enabled,
      collision: config.logging.debug_collision,
      particles: config.logging.debug_particles,
      assets: config.logging.debug_assets,
      performance: config.logging.debug_performance,
      warning: config.logging.show_warnings,
      error: config.logging.show_errors
    }
  });

  let lastUpdate = performance.now();
  let accumulator = 0;

  // Initialize systems and entities
  const inputSystem = new InputSystem(canvas);
  const renderSystem = new RenderSystem(canvas, ctx, config);
  const particleSystem = new ParticleSystem();
  const projectilePool = new ProjectilePool(config);
  const particlePool = ParticlePool.getInstance();
  const debugSystem = DebugSystem.getInstance();
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
  
  logger.debug(`Game initialized - Power-up spawn interval: ${powerUpSpawnIntervalMs}ms (${config.powerUps.spawnFrequencySeconds}s)`);
  logger.debug(`Meteoroid spawn rate: ${meteoroidSpawnRate}/s`);

  // Handle canvas resize
  window.addEventListener('resize', () => {
    renderSystem.onResize();
  });

  function update(dt: number, currentTime: number) {
    const input = inputSystem.getInputState();
    
    // Update debug system with FPS
    debugSystem.updateFPS(dt);
    
    // Handle tutorial dismissal
    if (renderSystem.isTutorialActive()) {
      // Dismiss tutorial on any input
      if (input.movement.x !== 0 || input.movement.y !== 0 || 
          inputSystem.hasAnyKeyPressed() || inputSystem.consumeMouseClick()) {
        renderSystem.dismissTutorial();
        logger.debug('Tutorial dismissed by user input');
      }
      // Don't update game logic while tutorial is active
      return;
    }
    
    // Debug power-up timing every 5 seconds
    if (currentTime % 5000 < 100) {
      const timeSinceLastPowerUp = currentTime - lastPowerUpSpawnTime;
      logger.debug(`Current time: ${currentTime.toFixed(0)}ms, Time since last power-up: ${timeSinceLastPowerUp.toFixed(0)}ms, Spawn interval: ${powerUpSpawnIntervalMs}ms, Power-ups active: ${powerUps.length}`);
    }
    
    if (!input.isPaused) {
      // Update ship and handle auto-fire with projectile pool
      const newProjectiles = ship.update(dt, input.movement.x, input.movement.y, canvas.width, canvas.height, currentTime, 
        (x, y) => projectilePool.acquire(x, y));
      if (newProjectiles.length > 0) {
        projectiles.push(...newProjectiles);
        if (newProjectiles.length > 1) {
          logger.debug(`Fired ${newProjectiles.length} projectiles (multi-barrel)`);
        }
      }

      // Spawn meteoroids
      if (currentTime - lastMeteorospawnTime > (1000 / meteoroidSpawnRate)) {
        spawnMeteoroid();
        lastMeteorospawnTime = currentTime;
      }

      // Spawn power-ups occasionally
      if (currentTime - lastPowerUpSpawnTime > powerUpSpawnIntervalMs) {
        logger.debug(`Spawning power-up at time ${currentTime}, interval: ${powerUpSpawnIntervalMs}ms, last spawn: ${lastPowerUpSpawnTime}`);
        try {
          spawnPowerUp();
          logger.debug(`Power-up spawned successfully. Total power-ups: ${powerUps.length}`);
          lastPowerUpSpawnTime = currentTime;
        } catch (error) {
          logger.error('Failed to spawn power-up:', error);
        }
      }

      // Update projectiles
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        projectile.update(dt, canvas.height);
        
        // Remove dead projectiles and return to pool
        if (!projectile.alive) {
          projectilePool.release(projectile);
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
            logger.debug(`Removing off-screen power-up: ${powerUp.type} at y=${powerUp.y.toFixed(1)}`);
            powerUps.splice(i, 1);
          }
        } catch (error) {
          logger.error(`Failed to update power-up at index ${i}:`, error);
          // Remove problematic power-up to prevent hanging
          powerUps.splice(i, 1);
        }
      }

      // Update score multiplier timer
      if (scoreMultiplierEndTime > 0 && currentTime >= scoreMultiplierEndTime) {
        scoreMultiplier = 1;
        scoreMultiplierEndTime = 0;
        logger.debug('Score multiplier expired');
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
    logger.debug(`Spawned ${meteoroidConfig.id} meteoroid (${size}) at (${x.toFixed(1)}, ${y}) - Ship at (${ship.x.toFixed(1)}, ${ship.y.toFixed(1)}) - Distance: ${Math.abs(x - ship.x).toFixed(1)}px`);
    
    meteoroids.push(meteoroid);
  }

  function spawnPowerUp() {
    // Choose random power-up type
    const types: PowerUpType[] = ['+1life', 'rapidFire', 'scoreMultiplier'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    // Spawn position: random X across screen width, above screen
    const x = Math.random() * canvas.width;
    const y = -50;
    
    logger.debug(`Canvas dimensions: ${canvas.width}x${canvas.height}, spawning at (${x.toFixed(1)}, ${y})`);
    
    const powerUp = new PowerUp(x, y, randomType, config);
    powerUps.push(powerUp);
    
    logger.debug(`Spawned ${randomType} power-up at (${x.toFixed(1)}, ${y}). Total power-ups: ${powerUps.length}`);
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
      logger.debug(`Ship at (${ship.x.toFixed(1)}, ${ship.y.toFixed(1)}), PowerUp at (${nearestPowerUp.x.toFixed(1)}, ${nearestPowerUp.y.toFixed(1)})`);
    }
    
    // Sort collisions by meteoroid index in descending order to prevent index shifting issues
    projectileCollisions.sort((a, b) => b.meteoroidIndex - a.meteoroidIndex);
    
    let processedCollisions = 0;
    // Process projectile collisions with safety checks  
    for (let i = 0; i < projectileCollisions.length; i++) {
      const collision = projectileCollisions[i];
      const meteoroidIndex = collision.meteoroidIndex;
      const projectileIndex = collision.projectileIndex!;
      
      // Safety checks to prevent crashes
      if (meteoroidIndex >= meteoroids.length || meteoroidIndex < 0) {
        logger.warn(`Invalid meteoroid index: ${meteoroidIndex}, array length: ${meteoroids.length} (after sort)`);
        continue;
      }
      if (projectileIndex >= projectiles.length || projectileIndex < 0) {
        logger.warn(`Invalid projectile index: ${projectileIndex}, array length: ${projectiles.length}`);
        continue;
      }
      
      const meteoroid = meteoroids[meteoroidIndex];
      const projectile = projectiles[projectileIndex];
      
      if (!meteoroid || !projectile) {
        logger.warn(`Missing entities - Meteoroid: ${!!meteoroid}, Projectile: ${!!projectile}`);
        continue;
      }
      
      try {
        // Damage the meteoroid
        const isDestroyed = meteoroid.takeDamage(collision.damage!);
        
        // Create impact effect at collision point
        particleSystem.createImpactEffect(projectile.x, projectile.y);
        
        // Create additional damage burst effect for all hits (destroyed or not)
        particleSystem.createDamageBurst(meteoroid.x, meteoroid.y, meteoroid.size, isDestroyed);
        
        processedCollisions++;
        
        // Debug logging (reduced frequency)
        logger.debugRandom(0.1, `${meteoroid.meteoroidType} collision - Size: ${meteoroid.size} - Destroyed: ${isDestroyed}`);
        
        // Add light screen shake for all hits (more for destruction)
        if (!isDestroyed) {
          const lightShake = Math.min(meteoroid.size / 20, 3); // Light shake for hits
          renderSystem.addScreenShake(lightShake, 0.1); // 100ms
        }
        
        // Remove the projectile and return to pool
        projectilePool.release(projectile);
        projectiles.splice(projectileIndex, 1);
      
        if (isDestroyed) {
          // Create explosion effect
          particleSystem.createExplosionEffect(meteoroid.x, meteoroid.y, meteoroid.size);
          
          // Add additional firework burst for larger meteoroids
          particleSystem.createFireworkBurst(meteoroid.x, meteoroid.y, meteoroid.size);
          
          // Add screen shake based on meteoroid size
          const shakeIntensity = Math.min(meteoroid.size / 8, 12); // Scale with size, max 12 pixels
          const shakeDuration = Math.min(0.15 + (meteoroid.size / 100), 0.4); // 150ms-400ms based on size
          renderSystem.addScreenShake(shakeIntensity, shakeDuration);
          
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
          logger.debug(`+${points} points! Total: ${score} (${scoreMultiplier}x multiplier)`);
          
          // Get meteoroid config for splitting
          const meteoroidConfig = meteoroid.getConfig();
        }
      } catch (error) {
        logger.error(`Failed to process projectile-meteoroid collision:`, error);
      }
    }
    
    // Log collision processing summary (only when there were collisions)
    if (projectileCollisions.length > 0) {
      logger.collision(`Processed ${processedCollisions}/${projectileCollisions.length} projectile collisions`);
    }

    // Check ship-meteoroid collisions (only if ship can take damage)
    if (ship.canTakeDamage()) {
      const shipCollisions = CollisionSystem.checkShipCollisions(ship, meteoroids);
      
      for (const collision of shipCollisions) {
        const meteoroidIndex = collision.meteoroidIndex;
        const meteoroid = meteoroids[meteoroidIndex];
        
        // Create dramatic collision effect
        particleSystem.createExplosionEffect(meteoroid.x, meteoroid.y, meteoroid.size);
        particleSystem.createFireworkBurst(meteoroid.x, meteoroid.y, meteoroid.size);
        
        // Strong screen shake for ship collision
        const shakeIntensity = Math.min(meteoroid.size / 6, 15); // Stronger shake for ship hit
        renderSystem.addScreenShake(shakeIntensity, 0.5); // Longer duration
        
        // Ship takes damage and becomes invincible
        const gameOver = ship.takeDamage(currentTime);
        
        // Remove the meteoroid that hit the ship
        meteoroids.splice(meteoroidIndex, 1);
        
        if (gameOver) {
          logger.debug("Game Over! Ship destroyed.");
          // TODO: Handle game over state
        }
        
        break; // Only handle one collision per frame
      }
    }

    // Process power-up collisions
    if (powerUpCollisions.length > 0) {
      logger.debug(`*** POWER-UP COLLISION DETECTED! Processing ${powerUpCollisions.length} collision(s) ***`);
    }
    for (let i = powerUpCollisions.length - 1; i >= 0; i--) {
      const collision = powerUpCollisions[i];
      const powerUpIndex = collision.powerUpIndex;
      const powerUp = powerUps[powerUpIndex];
      
      logger.debug(`*** COLLECTING POWER-UP: ${powerUp.type} at index ${powerUpIndex} ***`);
      
      // Apply power-up effect
      applyPowerUpEffect(powerUp.type, currentTime);
      
      // Remove the power-up
      powerUps.splice(powerUpIndex, 1);
      logger.debug(`*** POWER-UP COLLECTED! Remaining power-ups: ${powerUps.length} ***`);
    }

    // Process projectile-powerup collisions with safety checks
    if (projectilePowerUpCollisions.length > 0) {
      logger.debug(`*** PROJECTILE-POWER-UP COLLISION! Processing ${projectilePowerUpCollisions.length} collision(s) ***`);
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
        logger.warn(`Invalid powerUp index: ${powerUpIndex}, array length: ${powerUps.length}`);
        continue;
      }
      if (projectileIndex >= projectiles.length || projectileIndex < 0) {
        logger.warn(`Invalid projectile index: ${projectileIndex}, array length: ${projectiles.length}`);
        continue;
      }
      
      const powerUp = powerUps[powerUpIndex];
      const projectile = projectiles[projectileIndex];
      
      if (!powerUp || !projectile) {
        logger.warn(`Missing entities - PowerUp: ${!!powerUp}, Projectile: ${!!projectile}`);
        continue;
      }
      
      logger.debug(`*** SHOOTING POWER-UP: ${powerUp.type} at index ${powerUpIndex} ***`);
      
      try {
        // Apply power-up effect
        applyPowerUpEffect(powerUp.type, currentTime);
        
        // Remove both the power-up and the projectile (highest indices first)
        if (powerUpIndex >= projectileIndex) {
          powerUps.splice(powerUpIndex, 1);
          projectilePool.release(projectile);
          projectiles.splice(projectileIndex, 1);
        } else {
          projectilePool.release(projectile);
          projectiles.splice(projectileIndex, 1);
          powerUps.splice(powerUpIndex, 1);
        }
        
        logger.debug(`*** POWER-UP SHOT! Remaining power-ups: ${powerUps.length}, projectiles: ${projectiles.length} ***`);
      } catch (error) {
        logger.error(`Failed to process projectile-powerup collision:`, error);
      }
    }
  }

  function applyPowerUpEffect(type: PowerUpType, currentTime: number) {
    switch (type) {
      case '+1life':
        if (ship.lives < config.ship.lives.max) {
          ship.lives++;
          logger.debug(`+1 Life! Lives: ${ship.lives}/${config.ship.lives.max}`);
        } else {
          logger.debug(`Already at max lives (${config.ship.lives.max})`);
        }
        break;
        
      case 'rapidFire':
        if (rapidFireLevel < config.powerUps.rapidFire.maxLevel) {
          rapidFireLevel++;
          // Update ship fire rate and barrel count
          const levelConfig = config.powerUps.rapidFire.levels[rapidFireLevel.toString() as keyof typeof config.powerUps.rapidFire.levels];
          ship.setFireRate(levelConfig.fireRate);
          ship.setBarrels(levelConfig.barrels);
          logger.debug(`Rapid Fire Level ${rapidFireLevel}! Fire rate: ${levelConfig.fireRate}, Barrels: ${levelConfig.barrels}`);
          
          // Update ship skin based on rapid fire level
          ship.updateSkin(rapidFireLevel);
        } else {
          logger.debug(`Already at max rapid fire level (${config.powerUps.rapidFire.maxLevel})`);
        }
        break;
        
      case 'scoreMultiplier':
        scoreMultiplier = config.powerUps.scoreMultiplier.mult;
        scoreMultiplierEndTime = currentTime + config.powerUps.scoreMultiplier.durationMs;
        logger.debug(`Score Multiplier ${scoreMultiplier}x for ${config.powerUps.scoreMultiplier.durationMs / 1000}s!`);
        break;
    }
  }

  function render(dt: number, currentTime: number) {
    if (!ctx) return;
    renderSystem.render(ship, projectiles, meteoroids, powerUps, particleSystem, dt, score, rapidFireLevel, scoreMultiplier, scoreMultiplierEndTime);
    
    // Render debug information
    if (debugSystem.shouldShowFPS() || debugSystem.shouldShowObjectPoolStats()) {
      const projectileStats = projectilePool.getStats();
      const particleStats = particlePool.getStats();
      debugSystem.renderDebugInfo(ctx, projectileStats, particleStats);
    }
    
    // Render collision rings for debug
    if (debugSystem.shouldShowCollisionRings()) {
      // Ship collision ring
      debugSystem.renderCollisionRing(ctx, ship.x, ship.y, ship.getCollisionRadius(), '#00ff00');
      
      // Meteoroid collision rings
      meteoroids.forEach(meteoroid => {
        debugSystem.renderCollisionRing(ctx, meteoroid.x, meteoroid.y, meteoroid.getCollisionRadius(), '#ff0000');
      });
      
      // Projectile collision rings
      projectiles.forEach(projectile => {
        debugSystem.renderCollisionRing(ctx, projectile.x, projectile.y, projectile.getCollisionRadius(), '#0000ff');
      });
      
      // Power-up collision rings
      powerUps.forEach(powerUp => {
        debugSystem.renderCollisionRing(ctx, powerUp.x, powerUp.y, powerUp.getRadius(), '#ffff00');
      });
    }
  }

  function loop(now: number) {
    try {
      const deltaTime = (now - lastUpdate) / 1000;
      accumulator += now - lastUpdate;
      lastUpdate = now;
      
      // Prevent infinite loops by limiting accumulator
      if (accumulator > 1000) {
        logger.performance('Accumulator exceeded 1000ms, resetting to prevent hanging');
        accumulator = FIXED_STEP;
      }
      
      let updateCount = 0;
      while (accumulator >= FIXED_STEP && updateCount < 10) {
        update(FIXED_STEP / 1000, now);
        accumulator -= FIXED_STEP;
        updateCount++;
      }
      
      if (updateCount >= 10) {
        logger.performance('Update loop ran 10 times, potential performance issue');
      }
      
      render(deltaTime, now);
      requestAnimationFrame(loop);
    } catch (error) {
      logger.error('Game loop crashed:', error);
      if (error instanceof Error) {
        logger.error('Stack trace:', error.stack);
      }
      // Try to restart the loop after a delay
      setTimeout(() => {
        logger.debug('Attempting to restart game loop...');
        requestAnimationFrame(loop);
      }, 1000);
    }
  }

  requestAnimationFrame(loop);
}

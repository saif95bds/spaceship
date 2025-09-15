import { GameConfig } from '../types/config';
import defaultConfigJson from './default.json';

function validateConfig(config: GameConfig): GameConfig {
  // Validate lives
  if (config.ship.lives.start > config.ship.lives.max) {
    throw new Error('Ship start lives cannot exceed max lives');
  }
  if (config.ship.lives.max > 5) {
    throw new Error('Ship max lives cannot exceed 5');
  }
  
  // Validate fire rate
  if (config.projectile.fireRate <= 0) {
    throw new Error('Fire rate must be greater than 0');
  }
  
  // Validate spawn rate
  if (config.spawn.basePerSecond <= 0) {
    throw new Error('Base spawn rate must be greater than 0');
  }
  
  // Validate drift values
  if (config.drift.A0 < 0 || config.drift.Amax < 0) {
    throw new Error('Drift amplitudes must be non-negative');
  }
  if (config.drift.k <= 0) {
    throw new Error('Drift rate constant must be positive');
  }
  
  // Validate power-up levels
  if (config.powerUps.rapidFire.maxLevel < 1 || config.powerUps.rapidFire.maxLevel > 10) {
    throw new Error('Rapid fire max level must be between 1 and 10');
  }
  
  // Validate score multiplier duration
  if (config.powerUps.scoreMultiplier.durationMs <= 0) {
    throw new Error('Score multiplier duration must be positive');
  }
  
  return config;
}

export function loadConfig(): GameConfig {
  try {
    const config = defaultConfigJson as unknown as GameConfig;
    return validateConfig(config);
  } catch (error) {
    console.error('Config validation failed:', error);
    throw error;
  }
}

export function getDefaultConfig(): GameConfig {
  return loadConfig();
}

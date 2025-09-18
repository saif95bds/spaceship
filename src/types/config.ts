export interface ShipConfig {
  controlMode: string;
  autoFire: boolean;
  moveSpeed: number;
  lives: {
    start: number;
    max: number;
  };
  skins: {
    default: string;
    rapidFire: {
      [level: string]: string;
    };
  };
  collision: {
    radiusScale: number;
    ring: {
      enabled: boolean;
      alphaMin: number;
      alphaMax: number;
      pulseHz: number;
      colorByState: {
        default: string;
        rapidFire: string;
        scoreMultiplier: string;
        "+1life": string;
      };
      showOnStartMs: number;
      alwaysShow: boolean;
      debugOnly: boolean;
    };
  };
  spriteTargetPx: number;
}

export interface ProjectileConfig {
  speed: number;
  fireRate: number;
  sprite: string;
  impactFx: {
    enabled: boolean;
    particles: boolean;
    flash: boolean;
    durationMs: number;
  };
}

export interface SpawnConfig {
  arcDegrees: {
    start: number;
    end: number;
  };
  margin: number;
  basePerSecond: number;
  rateRamp: {
    type: string;
    k: number;
  };
}

export interface MeteoroidConfig {
  id: string;
  images: {
    L: string;
    M: string;
    S: string;
  };
  hp: {
    L: number;
    M: number;
    S: number;
  };
  split: {
    L: [number, string] | null;
    M: [number, string] | null;
    S: null;
  };
  speed: {
    min: number;
    max: number;
  };
  spin: {
    min: number;
    max: number;
  };
  weight: number;
  collision: {
    radiusScale: number;
  };
}

export interface DriftConfig {
  A0: number;
  Amax: number;
  k: number;
  omegaRange: [number, number];
}

export interface MeteoroidMovementConfig {
  angularFallDegrees: number;
}

export interface PowerUpConfig {
  spawnFrequencySeconds: number;
  speed: number;
  resetOnDeath: boolean;
  "+1life": {
    enabled: boolean;
  };
  rapidFire: {
    maxLevel: number;
    skins: {
      [level: string]: string;
    };
    levels: {
      [level: string]: {
        fireRate: number;
        barrels: number;
      };
    };
  };
  scoreMultiplier: {
    mult: number;
    durationMs: number;
    showCountdown: boolean;
  };
}

export interface CollisionConfig {
  mode: string;
  radiusScale: number;
  enabledPairs: {
    "projectile:meteoroid": boolean;
    "ship:meteoroid": boolean;
    "ship:powerup": boolean;
    "meteoroid:meteoroid": boolean;
    "meteoroid:powerup": boolean;
    "powerup:powerup": boolean;
  };
}

export interface AssetsConfig {
  autoScaleDown: boolean;
  maxSpriteSizePx: number;
  policy: string;
}

export interface BackgroundConfig {
  image: string | null;
  fallback: {
    type: string;
    density: number;
  };
}

export interface AdsConfig {
  enabled: boolean;
  spawnIntervalSeconds: number;
  fallSpeed: number;
  texts: string[];
  style: {
    fontSize: number;
    color: string;
    outlineColor: string;
    outlineWidth: number;
    alpha: number;
  };
}

export interface SoundFileEntry {
  primary: string;
  fallbacks?: string[];
  synthesize?: boolean;
}

export interface SoundFilesConfig {
  fire: SoundFileEntry;
  explosion: SoundFileEntry;
}

export interface SoundFireRatesConfig {
  basic: number;
  base_rf1: number;
  base_rf2: number;
  base_rf3: number;
  base_rf4: number;
  [key: string]: number;
}

export interface SoundVolumesConfig {
  fire: number;
  explosionLarge: number;
  explosionMedium: number;
  explosionSmall: number;
}

export interface SoundConfig {
  enabled: boolean;
  masterVolume: number;
  showHudToggle: boolean;
  files: SoundFilesConfig;
  fireRates: SoundFireRatesConfig;
  volumes: SoundVolumesConfig;
}

export interface LoggingConfig {
  console_log_enabled: boolean;
  debug_collision: boolean;
  debug_particles: boolean;
  debug_assets: boolean;
  debug_performance: boolean;
  show_warnings: boolean;
  show_errors: boolean;
}

export interface CanvasConfig {
  maxWidth: number;
  maxHeight: number;
  aspectRatio: string; // e.g., "4:5" for portrait
}

export interface DebugConfig {
  showStaticFireworks: boolean;
  staticFireworksDuration: number;
  fireworksImagePath: string;
  fireworksImageScale: number;
}

export interface DifficultyConfig {
  make_it_difficult: boolean;
  delayBeforeIncreaseSeconds: number;
  speedIncreaseIntervalSeconds: number;
  speedMultiplierPerIncrease: number;
  maxSpeedMultiplier: number;
  hpIncreaseIntervalSeconds: number;
  hpIncreaseAmount: number;
  maxHpIncrease: number;
}

export interface GameConfig {
  logging: LoggingConfig;
  debug: DebugConfig;
  difficulty: DifficultyConfig;
  canvas: CanvasConfig;
  ship: ShipConfig;
  projectile: ProjectileConfig;
  spawn: SpawnConfig;
  meteoroidMovement: MeteoroidMovementConfig;
  meteoroids: MeteoroidConfig[];
  drift: DriftConfig;
  powerUps: PowerUpConfig;
  collision: CollisionConfig;
  assets: AssetsConfig;
  background: BackgroundConfig;
  ads: AdsConfig;
  sound: SoundConfig;
}

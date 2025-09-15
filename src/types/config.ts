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

export interface CanvasConfig {
  maxWidth: number;
  maxHeight: number;
  aspectRatio: string; // e.g., "4:5" for portrait
}

export interface GameConfig {
  canvas: CanvasConfig;
  ship: ShipConfig;
  projectile: ProjectileConfig;
  spawn: SpawnConfig;
  meteoroids: MeteoroidConfig[];
  drift: DriftConfig;
  powerUps: PowerUpConfig;
  collision: CollisionConfig;
  assets: AssetsConfig;
  background: BackgroundConfig;
}

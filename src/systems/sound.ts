import { SoundConfig } from '../types/config';

type SoundKey = 'fire' | 'explosion';

const MAX_POOL_SIZE = 6;

function supportsAudio(): boolean {
  return typeof window !== 'undefined' && typeof Audio !== 'undefined';
}

function getMimeType(path: string): string | undefined {
  const extension = path.split('.').pop()?.toLowerCase();
  if (!extension) {
    return undefined;
  }

  switch (extension) {
    case 'wav':
      return 'audio/wav';
    case 'mp3':
      return 'audio/mpeg';
    case 'ogg':
      return 'audio/ogg';
    default:
      return undefined;
  }
}

export class SoundSystem {
  private enabled: boolean;
  private masterVolume: number; // 0-10 scale
  private readonly audioSupported: boolean;
  private readonly sources: Record<SoundKey, string | null> = {
    fire: null,
    explosion: null
  };
  private readonly pools: Record<SoundKey, HTMLAudioElement[]> = {
    fire: [],
    explosion: []
  };
  private lastFireTime = 0;

  constructor(private readonly config: SoundConfig, initialEnabled: boolean, initialVolume: number) {
    this.audioSupported = supportsAudio();
    this.masterVolume = this.clampVolume(initialVolume);
    this.enabled = this.audioSupported && initialEnabled;

    if (this.audioSupported) {
      this.sources.fire = this.resolveSource(config.files.fire);
      this.sources.explosion = this.resolveSource(config.files.explosion);

      if (!this.sources.fire && !this.sources.explosion) {
        // If nothing is available, disable sound silently.
        this.enabled = false;
      }
    } else {
      this.enabled = false;
    }
  }

  private clampVolume(volume: number): number {
    if (Number.isNaN(volume)) {
      return 0;
    }
    return Math.max(0, Math.min(10, volume));
  }

  private resolveSource(entry: SoundConfig['files']['fire']): string | null {
    const candidates = [entry.primary, ...(entry.fallbacks ?? [])].filter(Boolean);
    if (candidates.length === 0) {
      return null;
    }

    const audio = new Audio();

    for (const candidate of candidates) {
      const mime = getMimeType(candidate);
      if (!mime || audio.canPlayType(mime) !== '') {
        return candidate;
      }
    }

    // As a fallback, return the first candidate even if canPlayType reported false.
    return candidates[0] ?? null;
  }

  private acquireAudio(key: SoundKey): HTMLAudioElement | null {
    if (!this.audioSupported) {
      return null;
    }

    const source = this.sources[key];
    if (!source) {
      return null;
    }

    const pool = this.pools[key];

    for (const audio of pool) {
      if (audio.paused || audio.ended) {
        if (!audio.paused) {
          audio.pause();
        }
        audio.currentTime = 0;
        return audio;
      }
    }

    if (pool.length >= MAX_POOL_SIZE) {
      const audio = pool[0];
      audio.pause();
      audio.currentTime = 0;
      return audio;
    }

    const audio = new Audio(source);
    audio.preload = 'auto';
    pool.push(audio);
    return audio;
  }

  private getNormalizedMasterVolume(): number {
    return this.masterVolume / 10;
  }

  private applyVolume(baseVolume: number): number {
    const normalizedBase = Math.max(0, Math.min(1, baseVolume));
    return Math.max(0, Math.min(1, normalizedBase * this.getNormalizedMasterVolume()));
  }

  private stopAll() {
    if (!this.audioSupported) {
      return;
    }

    for (const key of Object.keys(this.pools) as SoundKey[]) {
      for (const audio of this.pools[key]) {
        audio.pause();
        audio.currentTime = 0;
      }
    }
  }

  private canPlay(): boolean {
    return this.audioSupported && this.enabled;
  }

  private getFireCooldown(rapidFireLevel: number): number {
    const key = rapidFireLevel <= 0
      ? 'basic'
      : `base_rf${Math.min(rapidFireLevel, 4)}`;
    const fallback = this.config.fireRates.basic;
    const raw = this.config.fireRates[key] ?? fallback;
    return Math.max(30, raw);
  }

  public setEnabled(enabled: boolean): void {
    const shouldEnable = this.audioSupported && enabled;
    if (this.enabled === shouldEnable) {
      return;
    }
    this.enabled = shouldEnable;

    if (!this.enabled) {
      this.stopAll();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setMasterVolume(volume: number): void {
    this.masterVolume = this.clampVolume(volume);
  }

  public playFire(rapidFireLevel: number): void {
    if (!this.canPlay()) {
      return;
    }

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const cooldown = this.getFireCooldown(rapidFireLevel);

    if (now - this.lastFireTime < cooldown) {
      return;
    }

    this.lastFireTime = now;

    const audio = this.acquireAudio('fire');
    if (!audio) {
      return;
    }

    audio.volume = this.applyVolume(this.config.volumes.fire);
    audio.playbackRate = 1;

    try {
      audio.currentTime = 0;
      void audio.play();
    } catch (error) {
      console.warn('Failed to play fire sound:', error);
    }
  }

  public playExplosion(sizeType: 'L' | 'M' | 'S'): void {
    if (!this.canPlay()) {
      return;
    }

    const audio = this.acquireAudio('explosion');
    if (!audio) {
      return;
    }

    const baseVolume = sizeType === 'L'
      ? this.config.volumes.explosionLarge
      : sizeType === 'M'
        ? this.config.volumes.explosionMedium
        : this.config.volumes.explosionSmall;

    audio.volume = this.applyVolume(baseVolume);
    audio.playbackRate = sizeType === 'S' ? 1.25 : sizeType === 'M' ? 1.1 : 1;

    try {
      audio.currentTime = 0;
      void audio.play();
    } catch (error) {
      console.warn('Failed to play explosion sound:', error);
    }
  }
}

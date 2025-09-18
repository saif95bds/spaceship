import { SoundConfig } from '../types/config';

type SoundKey = 'fire' | 'explosion';

type AudioContextClass = typeof AudioContext;

function getAudioContextConstructor(): AudioContextClass | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const ctor = window.AudioContext || (window as any).webkitAudioContext;
  return typeof ctor === 'function' ? ctor : null;
}

export class SoundSystem {
  private enabled: boolean;
  private masterVolume: number; // 0-10 scale
  private readonly audioSupported: boolean;
  private readonly sourceCandidates: Record<SoundKey, string[]> = {
    fire: [],
    explosion: []
  };
  private readonly currentSourceIndex: Record<SoundKey, number> = {
    fire: 0,
    explosion: 0
  };
  private readonly buffers: Record<SoundKey, AudioBuffer | null> = {
    fire: null,
    explosion: null
  };
  private readonly loadingPromises: Record<SoundKey, Promise<AudioBuffer | null> | null> = {
    fire: null,
    explosion: null
  };
  private readonly failed: Record<SoundKey, boolean> = {
    fire: false,
    explosion: false
  };
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private lastFireTime = 0;

  constructor(private readonly config: SoundConfig, initialEnabled: boolean, initialVolume: number) {
    this.audioSupported = getAudioContextConstructor() !== null;
    this.masterVolume = this.clampVolume(initialVolume);
    this.enabled = this.audioSupported && initialEnabled;

    if (this.audioSupported) {
      this.sourceCandidates.fire = this.collectCandidates(this.config.files.fire);
      this.sourceCandidates.explosion = this.collectCandidates(this.config.files.explosion);
    } else {
      this.enabled = false;
    }
  }

  private collectCandidates(entry: SoundConfig['files']['fire']): string[] {
    const candidates = [entry.primary, ...(entry.fallbacks ?? [])].filter((value): value is string => Boolean(value));
    return candidates;
  }

  private getCurrentSource(key: SoundKey): string | null {
    const candidates = this.sourceCandidates[key];
    if (candidates.length === 0) {
      return null;
    }
    const index = Math.min(this.currentSourceIndex[key], candidates.length - 1);
    return candidates[index] ?? null;
  }

  private advanceSource(key: SoundKey) {
    const candidates = this.sourceCandidates[key];
    if (this.currentSourceIndex[key] < candidates.length - 1) {
      this.currentSourceIndex[key] += 1;
    }
  }

  private clampVolume(volume: number): number {
    if (Number.isNaN(volume)) {
      return 0;
    }
    return Math.max(0, Math.min(10, volume));
  }

  private ensureContext(): AudioContext | null {
    if (!this.audioSupported) {
      return null;
    }

    if (!this.context) {
      const Ctor = getAudioContextConstructor();
      if (!Ctor) {
        return null;
      }
      this.context = new Ctor();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.enabled ? this.getNormalizedMasterVolume() : 0;
      this.masterGain.connect(this.context.destination);
    }

    if (this.context.state === 'suspended') {
      void this.context.resume().catch(() => {
        /* ignore resume failure */
      });
    }

    return this.context;
  }

  private getNormalizedMasterVolume(): number {
    return this.masterVolume / 10;
  }

  private applyVolume(baseVolume: number): number {
    if (!this.enabled) {
      return 0;
    }
    const normalizedBase = Math.max(0, Math.min(1, baseVolume));
    return Math.max(0, Math.min(1, normalizedBase * this.getNormalizedMasterVolume()));
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

  private loadBuffer(key: SoundKey): Promise<AudioBuffer | null> {
    if (!this.audioSupported) {
      return Promise.resolve(null);
    }

    if (this.buffers[key]) {
      return Promise.resolve(this.buffers[key]);
    }

    if (this.loadingPromises[key]) {
      return this.loadingPromises[key]!;
    }

    if (this.failed[key]) {
      return Promise.resolve(null);
    }

    const sourcePath = this.getCurrentSource(key);
    if (!sourcePath) {
      this.failed[key] = true;
      return Promise.resolve(null);
    }

    const context = this.ensureContext();
    if (!context) {
      this.failed[key] = true;
      return Promise.resolve(null);
    }

    const promise = fetch(sourcePath)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch sound asset: ${sourcePath}`);
        }
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => context.decodeAudioData(arrayBuffer))
      .then((buffer) => {
        this.buffers[key] = buffer;
        return buffer;
      })
      .catch((error) => {
        console.warn(`Failed to load sound buffer for ${key}:`, error);
        this.advanceSource(key);
        const nextSource = this.getCurrentSource(key);
        this.loadingPromises[key] = null;
        if (!nextSource) {
          this.failed[key] = true;
          return null;
        }
        return this.loadBuffer(key);
      })
      .finally(() => {
        this.loadingPromises[key] = null;
      });

    this.loadingPromises[key] = promise;
    return promise;
  }

  private playBuffer(key: SoundKey, baseVolume: number, playbackRate: number): void {
    if (!this.canPlay()) {
      return;
    }

    const context = this.ensureContext();
    if (!context || !this.masterGain) {
      return;
    }

    this.loadBuffer(key).then((buffer) => {
      if (!buffer) {
        return;
      }

      if (!this.enabled) {
        return;
      }

      const source = context.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = playbackRate;

      const gainNode = context.createGain();
      gainNode.gain.value = this.applyVolume(baseVolume);

      source.connect(gainNode);
      gainNode.connect(this.masterGain!);

      try {
        source.start();
      } catch (error) {
        console.warn(`Failed to play ${key} sound:`, error);
      }
    });
  }

  public setEnabled(enabled: boolean): void {
    const shouldEnable = this.audioSupported && enabled;
    if (this.enabled === shouldEnable) {
      return;
    }
    this.enabled = shouldEnable;

    if (this.masterGain) {
      this.masterGain.gain.value = shouldEnable ? this.getNormalizedMasterVolume() : 0;
    }

    if (shouldEnable) {
      this.ensureContext();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setMasterVolume(volume: number): void {
    this.masterVolume = this.clampVolume(volume);
    if (this.masterGain && this.enabled) {
      this.masterGain.gain.value = this.getNormalizedMasterVolume();
    }
  }

  public playFire(rapidFireLevel: number): void {
    if (!this.enabled || !this.audioSupported) {
      return;
    }

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const cooldown = this.getFireCooldown(rapidFireLevel);

    if (now - this.lastFireTime < cooldown) {
      return;
    }

    this.lastFireTime = now;
    this.playBuffer('fire', this.config.volumes.fire, 1);
  }

  public playExplosion(sizeType: 'L' | 'M' | 'S'): void {
    if (!this.enabled || !this.audioSupported) {
      return;
    }

    const baseVolume = sizeType === 'L'
      ? this.config.volumes.explosionLarge
      : sizeType === 'M'
        ? this.config.volumes.explosionMedium
        : this.config.volumes.explosionSmall;

    const playbackRate = sizeType === 'S' ? 1.25 : sizeType === 'M' ? 1.1 : 1;
    this.playBuffer('explosion', baseVolume, playbackRate);
  }

}

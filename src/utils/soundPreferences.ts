export interface SoundPreferences {
  enabled: boolean;
  volume: number;
}

const COOKIE_NAME = 'soundPreferences';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

function isBrowserEnvironment(): boolean {
  return typeof document !== 'undefined';
}

export function loadSoundPreferences(): SoundPreferences | null {
  if (!isBrowserEnvironment()) {
    return null;
  }

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [rawName, ...rest] = cookie.trim().split('=');
    if (rawName === COOKIE_NAME) {
      try {
        const value = decodeURIComponent(rest.join('='));
        const parsed = JSON.parse(value);
        if (typeof parsed.enabled === 'boolean') {
          const volume = typeof parsed.volume === 'number' ? parsed.volume : 10;
          return {
            enabled: parsed.enabled,
            volume
          };
        }
      } catch (error) {
        // Ignore malformed cookie
        console.warn('Failed to parse sound preferences cookie:', error);
        return null;
      }
    }
  }

  return null;
}

export function saveSoundPreferences(preferences: SoundPreferences): void {
  if (!isBrowserEnvironment()) {
    return;
  }

  try {
    const value = encodeURIComponent(JSON.stringify(preferences));
    document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}`;
  } catch (error) {
    console.warn('Failed to save sound preferences cookie:', error);
  }
}

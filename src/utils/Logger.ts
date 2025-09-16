/**
 * Configurable logging system for the spaceship game
 * Allows enabling/disabling console logs globally or by category
 */

interface LogConfig {
  enabled: boolean;
  categories: {
    debug: boolean;
    collision: boolean;
    particles: boolean;
    assets: boolean;
    performance: boolean;
    warning: boolean;
    error: boolean;
  };
}

class Logger {
  private static instance: Logger;
  private config: LogConfig = {
    enabled: true, // Master toggle
    categories: {
      debug: false,     // General debug messages
      collision: false, // Collision detection logs
      particles: false, // Particle system logs
      assets: false,    // Asset loading logs
      performance: false, // Performance monitoring logs
      warning: true,    // Warning messages (usually keep enabled)
      error: true       // Error messages (usually keep enabled)
    }
  };

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Configure logging settings
   */
  public configure(config: Partial<LogConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.categories) {
      this.config.categories = { ...this.config.categories, ...config.categories };
    }
  }

  /**
   * Set master logging enabled/disabled
   */
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Enable/disable specific log category
   */
  public setCategoryEnabled(category: keyof LogConfig['categories'], enabled: boolean): void {
    this.config.categories[category] = enabled;
  }

  /**
   * Get current configuration
   */
  public getConfig(): LogConfig {
    return { ...this.config };
  }

  /**
   * Check if logging is enabled for a category
   */
  private shouldLog(category: keyof LogConfig['categories']): boolean {
    return this.config.enabled && this.config.categories[category];
  }

  // Logging methods for different categories
  public debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  public collision(message: string, ...args: any[]): void {
    if (this.shouldLog('collision')) {
      console.log(`[COLLISION] ${message}`, ...args);
    }
  }

  public particles(message: string, ...args: any[]): void {
    if (this.shouldLog('particles')) {
      console.log(`[PARTICLES] ${message}`, ...args);
    }
  }

  public assets(message: string, ...args: any[]): void {
    if (this.shouldLog('assets')) {
      console.log(`[ASSETS] ${message}`, ...args);
    }
  }

  public performance(message: string, ...args: any[]): void {
    if (this.shouldLog('performance')) {
      console.log(`[PERFORMANCE] ${message}`, ...args);
    }
  }

  public warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warning')) {
      console.warn(`[WARNING] ${message}`, ...args);
    }
  }

  public error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  // Convenience methods for common patterns
  public debugIf(condition: boolean, message: string, ...args: any[]): void {
    if (condition) {
      this.debug(message, ...args);
    }
  }

  public debugRandom(probability: number, message: string, ...args: any[]): void {
    if (Math.random() < probability) {
      this.debug(message, ...args);
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export configuration helper
export const configureLogging = (config: Partial<LogConfig>) => {
  logger.configure(config);
};

// Export quick enable/disable functions
export const enableAllLogging = () => logger.setEnabled(true);
export const disableAllLogging = () => logger.setEnabled(false);

export const enableDebugLogging = () => {
  logger.setCategoryEnabled('debug', true);
  logger.setCategoryEnabled('collision', true);
  logger.setCategoryEnabled('particles', true);
  logger.setCategoryEnabled('assets', true);
  logger.setCategoryEnabled('performance', true);
};

export const disableDebugLogging = () => {
  logger.setCategoryEnabled('debug', false);
  logger.setCategoryEnabled('collision', false);
  logger.setCategoryEnabled('particles', false);
  logger.setCategoryEnabled('assets', false);
  logger.setCategoryEnabled('performance', false);
};
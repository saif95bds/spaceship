interface DebugConfig {
  showCollisionRings: boolean;
  showFPS: boolean;
  showObjectPoolStats: boolean;
  reduceMotion: boolean;
}

export class DebugSystem {
  private static instance: DebugSystem;
  private config: DebugConfig = {
    showCollisionRings: false,
    showFPS: false,
    showObjectPoolStats: false,
    reduceMotion: false
  };

  private fpsHistory: number[] = [];
  private lastFpsUpdate = 0;
  private currentFPS = 0;

  private constructor() {
    // Initialize debug system
    this.setupKeyboardListeners();
  }

  public static getInstance(): DebugSystem {
    if (!DebugSystem.instance) {
      DebugSystem.instance = new DebugSystem();
    }
    return DebugSystem.instance;
  }

  private setupKeyboardListeners(): void {
    document.addEventListener('keydown', (event) => {
      // Debug toggles (use F-keys to avoid conflicts)
      switch (event.code) {
        case 'F1':
          event.preventDefault();
          this.toggleCollisionRings();
          break;
        case 'F2':
          event.preventDefault();
          this.toggleFPS();
          break;
        case 'F3':
          event.preventDefault();
          this.toggleObjectPoolStats();
          break;
        case 'F4':
          event.preventDefault();
          this.toggleReduceMotion();
          break;
      }
    });
  }

  public toggleCollisionRings(): void {
    this.config.showCollisionRings = !this.config.showCollisionRings;
    console.log(`Debug: Collision rings ${this.config.showCollisionRings ? 'ON' : 'OFF'} (F1)`);
  }

  public toggleFPS(): void {
    this.config.showFPS = !this.config.showFPS;
    console.log(`Debug: FPS counter ${this.config.showFPS ? 'ON' : 'OFF'} (F2)`);
  }

  public toggleObjectPoolStats(): void {
    this.config.showObjectPoolStats = !this.config.showObjectPoolStats;
    console.log(`Debug: Object pool stats ${this.config.showObjectPoolStats ? 'ON' : 'OFF'} (F3)`);
  }

  public toggleReduceMotion(): void {
    this.config.reduceMotion = !this.config.reduceMotion;
    console.log(`Debug: Reduce motion ${this.config.reduceMotion ? 'ON' : 'OFF'} (F4)`);
  }

  public shouldShowCollisionRings(): boolean {
    return this.config.showCollisionRings;
  }

  public shouldShowFPS(): boolean {
    return this.config.showFPS;
  }

  public shouldShowObjectPoolStats(): boolean {
    return this.config.showObjectPoolStats;
  }

  public shouldReduceMotion(): boolean {
    return this.config.reduceMotion;
  }

  public updateFPS(deltaTime: number): void {
    const currentTime = performance.now();
    const fps = 1 / deltaTime;
    
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > 60) {
      this.fpsHistory.shift();
    }

    // Update FPS display every 250ms
    if (currentTime - this.lastFpsUpdate > 250) {
      this.currentFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
      this.lastFpsUpdate = currentTime;
    }
  }

  public getCurrentFPS(): number {
    return this.currentFPS;
  }

  public renderDebugInfo(ctx: CanvasRenderingContext2D, projectilePoolStats?: any, particlePoolStats?: any): void {
    if (!this.config.showFPS && !this.config.showObjectPoolStats) return;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 200, this.config.showObjectPoolStats ? 100 : 50);

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px monospace';
    let yOffset = 30;

    if (this.config.showFPS) {
      ctx.fillText(`FPS: ${Math.round(this.currentFPS)}`, 20, yOffset);
      yOffset += 20;
    }

    if (this.config.showObjectPoolStats && projectilePoolStats) {
      ctx.fillText(`Projectiles: ${projectilePoolStats.available}/${projectilePoolStats.maxSize}`, 20, yOffset);
      yOffset += 15;
    }

    if (this.config.showObjectPoolStats && particlePoolStats) {
      ctx.fillText(`Particles: ${particlePoolStats.available}/${particlePoolStats.maxSize}`, 20, yOffset);
      yOffset += 15;
    }

    ctx.restore();
  }

  public renderCollisionRing(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string = '#ff0000'): void {
    if (!this.config.showCollisionRings) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
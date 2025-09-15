export interface InputState {
  movement: {
    x: number; // -1 to 1
    y: number; // -1 to 1
  };
  isPaused: boolean;
}

export class InputSystem {
  private keys: Set<string> = new Set();
  private touchStartPos: { x: number; y: number } | null = null;
  private currentTouchPos: { x: number; y: number } | null = null;
  private isPaused = false;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupKeyboardListeners();
    this.setupTouchListeners();
  }

  private setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
      this.keys.add(e.code.toLowerCase());
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
      this.keys.delete(e.code.toLowerCase());
    });
  }

  private setupTouchListeners() {
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.touchStartPos = { x: touch.clientX, y: touch.clientY };
      this.currentTouchPos = { x: touch.clientX, y: touch.clientY };
      this.isPaused = false;
    });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (this.touchStartPos) {
        const touch = e.touches[0];
        this.currentTouchPos = { x: touch.clientX, y: touch.clientY };
      }
    });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.touchStartPos = null;
      this.currentTouchPos = null;
      this.isPaused = true; // Pause on lift as per requirements
    });
  }

  public getInputState(): InputState {
    let x = 0;
    let y = 0;

    // Keyboard input
    if (this.keys.has('arrowleft') || this.keys.has('a') || this.keys.has('keya')) {
      x -= 1;
    }
    if (this.keys.has('arrowright') || this.keys.has('d') || this.keys.has('keyd')) {
      x += 1;
    }
    if (this.keys.has('arrowup') || this.keys.has('w') || this.keys.has('keyw')) {
      y -= 1;
    }
    if (this.keys.has('arrowdown') || this.keys.has('s') || this.keys.has('keys')) {
      y += 1;
    }

    // Touch input (drag joystick)
    if (this.touchStartPos && this.currentTouchPos) {
      const dx = this.currentTouchPos.x - this.touchStartPos.x;
      const dy = this.currentTouchPos.y - this.touchStartPos.y;
      
      // Normalize touch input to -1 to 1 range
      const maxDistance = 100; // Max drag distance in pixels
      x = Math.max(-1, Math.min(1, dx / maxDistance));
      y = Math.max(-1, Math.min(1, dy / maxDistance));
    }

    // Normalize diagonal movement
    if (x !== 0 && y !== 0) {
      const magnitude = Math.sqrt(x * x + y * y);
      x /= magnitude;
      y /= magnitude;
    }

    return {
      movement: { x, y },
      isPaused: this.isPaused
    };
  }
}

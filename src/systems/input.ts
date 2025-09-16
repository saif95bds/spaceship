export interface InputState {
  movement: {
    x: number; // -1 to 1
    y: number; // -1 to 1
  };
  isPaused: boolean;
  touchTarget?: { x: number; y: number } | null; // Absolute touch position for smooth fast following
}

export class InputSystem {
  private keys: Set<string> = new Set();
  private currentTouchPos: { x: number; y: number } | null = null;
  private previousTouchPos: { x: number; y: number } | null = null;
  private touchMovementDelta: { x: number; y: number } = { x: 0, y: 0 };
  private isPaused = false;
  private canvas: HTMLCanvasElement;
  private mouseClicked: boolean = false;
  private mousePosition: { x: number; y: number } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupKeyboardListeners();
    this.setupTouchListeners();
    this.setupMouseListeners();
  }

  private setupMouseListeners() {
    this.canvas.addEventListener('click', (e) => {
      this.mouseClicked = true;
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      
      this.mousePosition = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    });
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
      const rect = this.canvas.getBoundingClientRect();
      
      // Convert to canvas coordinates with proper scaling
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      
      this.currentTouchPos = { 
        x: (touch.clientX - rect.left) * scaleX, 
        y: (touch.clientY - rect.top) * scaleY 
      };
      this.previousTouchPos = { ...this.currentTouchPos };
      this.touchMovementDelta = { x: 0, y: 0 };
      this.isPaused = false;
    });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (this.currentTouchPos) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        
        // Store previous position
        this.previousTouchPos = { ...this.currentTouchPos };
        // Update current position with proper canvas coordinates and scaling
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        this.currentTouchPos = { 
          x: (touch.clientX - rect.left) * scaleX, 
          y: (touch.clientY - rect.top) * scaleY 
        };
        // Calculate movement delta (keep for any fallback systems)
        this.touchMovementDelta = {
          x: this.currentTouchPos.x - this.previousTouchPos.x,
          y: this.currentTouchPos.y - this.previousTouchPos.y
        };
      }
    });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      
      // Handle touch end as a click for button interactions
      if (this.currentTouchPos) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        this.mouseClicked = true;
        this.mousePosition = {
          x: this.currentTouchPos.x,
          y: this.currentTouchPos.y
        };
      }
      
      this.currentTouchPos = null;
      this.previousTouchPos = null;
      this.touchMovementDelta = { x: 0, y: 0 };
      this.isPaused = true; // Pause on finger lift as per requirements
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

    // Touch input - provide absolute position for smooth following
    let touchTarget: { x: number; y: number } | null = null;
    if (this.currentTouchPos) {
      // Touch position is already in canvas coordinates
      touchTarget = {
        x: this.currentTouchPos.x,
        y: this.currentTouchPos.y
      };
      
      // Don't use delta-based movement for touch - it interferes with smooth following
      // The ship will use touchTarget directly for position-based movement
    }

    // Normalize diagonal movement
    if (x !== 0 && y !== 0) {
      const magnitude = Math.sqrt(x * x + y * y);
      x /= magnitude;
      y /= magnitude;
    }

    return {
      movement: { x, y },
      isPaused: this.isPaused,
      touchTarget: touchTarget
    };
  }

  public hasAnyKeyPressed(): boolean {
    return this.keys.size > 0;
  }

  public hasAnyInput(): boolean {
    return this.keys.size > 0 || this.currentTouchPos !== null || this.mouseClicked;
  }

  public consumeMouseClick(): boolean {
    const clicked = this.mouseClicked;
    this.mouseClicked = false;
    return clicked;
  }

  public getMousePosition(): { x: number; y: number } | null {
    return this.mousePosition;
  }
}

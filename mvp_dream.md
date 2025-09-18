# Spaceship Asteroids-like Web Game — MVP Dream Requirements (v2.0)

> **For GenAI Development:** This document is optimized for AI-assisted development. It includes precise technical specifications, corrected contradictions from v1.3, and incorporates lessons learned from the actual implementation.

## 1) Vision & Goals

**Goal:** Create a lightweight, responsive, web-based arcade shooter inspired by *Asteroids*. The ship auto-fires upward while the player only moves the ship within screen bounds using keyboard or touch input.

**Success Criteria:**
- Maintain 60 FPS on mid-range devices (with graceful degradation)
- One-handed mobile controls with responsive touch movement
- Compelling "one more try" gameplay loop
- Fully configurable via JSON for easy reskinning

**Technical Foundation:**
- TypeScript + Vite build system
- HTML5 Canvas 2D rendering
- Object pooling for performance
- Frame-rate independent game logic

---

## 2) Core Architecture

### 2.1 Project Structure
```
src/
├── core/
│   └── loop.ts           # Main game loop with fixed timestep
├── systems/
│   ├── input.ts          # Input handling (keyboard + touch)
│   ├── render.ts         # Rendering system with screen shake
│   ├── collision.ts      # Circle-based collision detection
│   └── particles.ts      # Particle system with object pooling
├── entities/
│   ├── Ship.ts           # Player ship with auto-fire
│   ├── Meteoroid.ts      # Meteoroids with visual effects
│   ├── Projectile.ts     # Bullets with pooling
│   └── PowerUp.ts        # Power-up pickups
├── data/
│   ├── config.ts         # Config loading and types
│   └── default.json      # All game configuration
└── utils/
    └── Logger.ts         # Debugging and performance logging
```

### 2.2 Configuration-Driven Design
- **All values in `src/data/default.json`**
- No hardcoded gameplay values in code
- Asset paths, speeds, HP values, spawn rates all configurable
- Easy reskinning through config changes only

---

## 3) Gameplay Systems

### 3.1 Movement & Controls

**Desktop:**
- Move: `←/→/↑/↓` or `WASD`
- Pause: `P`

**Mobile:**
- **Direct touch positioning** (ship follows finger location)
- **2.5x faster speed** than desktop for responsiveness
- **Coordinate scaling** for different screen sizes
- **Pause on finger lift** (as specified)

**Critical Implementation Details:**
```typescript
// Touch coordinate scaling (ESSENTIAL for mobile)
const scaleX = canvas.width / rect.width;
const scaleY = canvas.height / rect.height;
const gameCoords = {
  x: (touch.clientX - rect.left) * scaleX,
  y: (touch.clientY - rect.top) * scaleY
};

// Speed-based movement (NOT interpolation)
const touchSpeed = baseSpeed * 2.5; // Mobile needs faster speed
const distance = Math.sqrt(dx*dx + dy*dy);
if (distance > 3) { // Small dead zone
  ship.x += (dx/distance) * touchSpeed * deltaTime;
  ship.y += (dy/distance) * touchSpeed * deltaTime;
}
```

### 3.2 Auto-Fire System
- Ship fires automatically upward at configurable rate
- **Multiple barrels** for rapid-fire power-up (2-5 barrels)
- **Projectile pooling** for performance
- **Rate scaling** with rapid-fire levels

### 3.3 Collision System
- **Circle-based collision** only (simple and fast)
- **Enabled pairs:** projectile↔meteoroid, ship↔meteoroid, ship↔powerup, projectile↔powerup
- **Disabled pairs:** meteoroid↔meteoroid, meteoroid↔powerup, powerup↔powerup
- **Configurable radius scaling** per entity type

---

## 4) Entities Specification

### 4.1 Ship
```typescript
class Ship {
  // Properties
  lives: number;           // 3 default, max 5
  speed: number;           // 480 pixels/second
  fireRate: number;        // 2.0 shots/second default
  barrels: number;         // 1-5 based on rapid-fire level
  
  // Visual states
  currentSkin: string;     // Changes with rapid-fire level
  collisionRing: boolean;  // UX indicator (configurable)
  invincibilityFrames: number; // I-frames after taking damage
}
```

**Key Behaviors:**
- Direct movement (no inertia/momentum)
- Auto-fire with configurable rate and barrel count
- Visual skin changes during rapid-fire
- Collision ring for UX (drawn in code, NOT baked in sprite)

### 4.2 Meteoroids
**IMPORTANT CORRECTION:** Only 3 types implemented (NOT 4+ as original spec claimed):

```json
{
  "meteoroids": [
    {
      "id": "basalt",        // Standard rock - 1.0 weight
      "hp": {"L": 3, "M": 2, "S": 1},
      "speed": {"min": 1, "max": 3},
      "split": {"L": [2, "M"], "M": [2, "S"], "S": null}
    },
    {
      "id": "ice",           // Faster, weaker - 0.7 weight  
      "hp": {"L": 2, "M": 1, "S": 1},
      "speed": {"min": 2, "max": 4},
      "split": {"L": [3, "M"], "M": [2, "S"], "S": null}
    },
    {
      "id": "metal",         // Slower, stronger - 0.5 weight
      "hp": {"L": 4, "M": 3, "S": 2},
      "speed": {"min": 1, "max": 2},
      "split": {"L": [2, "M"], "M": [2, "S"], "S": null}
    }
  ]
}
```

**Visual Effects:**
- **Fast meteoroids (≥90% max speed)** get fire trails and glow effects
- **Fire trails** are directional, thin, and shorter (50 frames max)
- **Particle bursts** on destruction with vibrant colors
- **Screen shake** on impacts (stronger for larger meteoroids)

**Movement:**
- **Angular fall** at 15° from vertical (NOT straight down)
- **Difficulty scaling** increases speed and HP over time
- **Spawning** from top edge with safety margins

### 4.3 Power-Ups (Exactly 3 Types)

```json
{
  "powerUps": {
    "+1life": {
      "enabled": true       // Add 1 life (max 5 total)
    },
    "rapidFire": {
      "maxLevel": 4,        // Levels 1-4
      "levels": {
        "1": {"fireRate": 6.0, "barrels": 2},
        "2": {"fireRate": 8.0, "barrels": 3}, 
        "3": {"fireRate": 10.0, "barrels": 4},
        "4": {"fireRate": 12.0, "barrels": 5}
      },
      "skins": {            // Ship visual changes per level
        "1": "assets/ships/base_rf1.png",
        "2": "assets/ships/base_rf2.png",
        "3": "assets/ships/base_rf3.png", 
        "4": "assets/ships/base_rf4.png"
      }
    },
    "scoreMultiplier": {
      "mult": 2.0,          // 2x score multiplier
      "durationMs": 10000,  // 10 seconds duration
      "showCountdown": true // HUD countdown timer
    }
  }
}
```

**Power-up Behaviors:**
- **Shooting power-ups** also collects them (intentional design)
- **Rapid-fire stacks** up to level 4
- **Reset on death** is configurable
- **Visual countdown** for score multiplier

---

## 5) Visual Effects System

### 5.1 Particle System
**Performance-Critical Implementation:**
```typescript
class ParticleSystem {
  private particles: Particle[] = [];
  private particlePool: Particle[] = [];
  
  // Object pooling prevents memory leaks
  acquire(): Particle { 
    return this.pool.pop() || new Particle(); 
  }
  
  release(particle: Particle): void {
    particle.reset();
    this.pool.push(particle);
  }
}
```

**Effect Types:**
- **Impact effects** - Small burst on projectile hits
- **Explosion effects** - Large burst when meteoroid destroyed  
- **Damage bursts** - Colorful particles for all hits
- **Firework bursts** - Celebration effects with PNG fallback
- **Mega bursts** - Extra dramatic for large meteoroids

### 5.2 Fire Trail System
**For Fast Meteoroids (≥90% max speed):**
```typescript
if (meteoroid.isFastMoving()) {
  // Render directional fire trail
  // - 50 frame max length (NOT 80 as originally specified)
  // - Thin particles (0.5x size, NOT 0.9x)
  // - Aligned with movement direction
  // - Elliptical shape (1.8x elongation, 0.4x compression)
}
```

### 5.3 Screen Effects
- **Screen shake** on impacts (magnitude scales with meteoroid size)
- **Static fireworks** with PNG fallback system
- **Flash effects** on collisions
- **Reduced motion** support for accessibility

---

## 6) Difficulty Progression

### 6.1 Time-Based Scaling
```json
{
  "difficulty": {
    "delayBeforeIncreaseSeconds": 30,
    "speedIncreaseIntervalSeconds": 2,
    "speedMultiplierPerIncrease": 1.5,
    "maxSpeedMultiplier": 10.0,
    "hpIncreaseIntervalSeconds": 60,
    "hpIncreaseAmount": 1,
    "maxHpIncrease": 5
  }
}
```

**Progressive Changes:**
- **Speed multiplier** increases every 2 seconds (up to 10x)
- **HP bonus** increases every 60 seconds (up to +5 HP)
- **Spawn rate** increases exponentially over time
- **All scaling** starts 30 seconds after game begins

### 6.2 Spawn System
- **Top-edge spawning** only (NOT arc-based as originally specified)
- **Safety margins** prevent unfair spawns near player
- **Type weighting** system for meteoroid selection
- **Progressive spawn rate** with exponential growth

---

## 7) Audio & UI Systems

### 7.1 HUD Elements
- **Score** with current multiplier indicator
- **Lives** as heart icons (max 5)
- **Power-up timers** with visual countdown
- **Game over overlay** with retry button

### 7.2 Game Over & Retry
**Critical Mobile Fix:**
```typescript
// Handle both mouse AND touch events for retry button
canvas.addEventListener('touchend', (e) => {
  if (touchPos) {
    // Convert touch to click for button detection
    mouseClicked = true;
    mousePosition = { x: touchPos.x, y: touchPos.y };
  }
});
```

---

## 8) Performance Optimizations

### 8.1 Object Pooling
- **Projectiles** - Reuse bullet objects
- **Particles** - Prevent memory leaks from effects
- **Limited particle count** - Max 500 active particles

### 8.2 Frame-Rate Independence
```typescript
// All movement MUST use deltaTime
entity.x += velocity * deltaTime;
entity.rotation += rotationSpeed * deltaTime;

// Fixed timestep for game logic
const FIXED_STEP = 16; // 16ms = ~60 FPS
while (accumulator >= FIXED_STEP) {
  update(FIXED_STEP / 1000);
  accumulator -= FIXED_STEP;
}
```

### 8.3 Conditional Rendering
- **Fire trails** only for fast meteoroids
- **Complex effects** only when visible
- **LOD system** for particle density

---

## 9) Build & Deployment

### 9.1 Build Pipeline
```bash
#!/bin/bash
set -euo pipefail

rm -rf ./dist
npm run build
cd dist && zip -r ../spaceship.zip * && cd ..

echo "✅ Ready for itch.io upload: spaceship.zip"
```

### 9.2 Production Fixes
```typescript
// Suppress dev server errors in production
if (!window.location.host.includes('localhost')) {
  const originalError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    if (message.includes('WebSocket connection')) return;
    originalError.apply(console, args);
  };
}
```

### 9.3 Vite Configuration
```typescript
// vite.config.ts
export default defineConfig({
  base: './',  // ESSENTIAL for itch.io deployment
});
```

---

## 10) Common Implementation Pitfalls

### 10.1 Mobile Touch Issues
❌ **Wrong:** Using interpolation for touch movement
✅ **Right:** Speed-based movement with coordinate scaling

❌ **Wrong:** Mouse-only button interactions  
✅ **Right:** Both mouse AND touch event handlers

### 10.2 Visual Effects Problems
❌ **Wrong:** Memory leaks from unlimited particles
✅ **Right:** Object pooling with particle limits

❌ **Wrong:** Hard-coded effect parameters
✅ **Right:** Configurable effects with performance scaling

### 10.3 Coordinate System Issues
❌ **Wrong:** Using clientX/Y directly
✅ **Right:** Scale coordinates to canvas dimensions

### 10.4 Performance Issues
❌ **Wrong:** Creating new objects every frame
✅ **Right:** Object pooling and reuse

❌ **Wrong:** Frame-rate dependent movement
✅ **Right:** deltaTime-based calculations

---

## 11) Testing Checklist

### 11.1 Desktop Testing
- [ ] Keyboard movement (WASD + arrows)
- [ ] Auto-fire functionality
- [ ] Power-up collection and effects
- [ ] Game over and retry button
- [ ] Performance at 60 FPS

### 11.2 Mobile Testing  
- [ ] Touch movement responsiveness
- [ ] Coordinate accuracy across screen sizes
- [ ] Retry button touch functionality
- [ ] Pause on finger lift
- [ ] Performance on mid-range devices

### 11.3 Visual Effects
- [ ] Fire trails on fast meteoroids
- [ ] Particle effects on impacts
- [ ] Screen shake on collisions
- [ ] PNG fireworks fallback working
- [ ] No memory leaks during long play

---

## 12) Configuration Reference

### 12.1 Essential Config Values
```json
{
  "ship": {
    "moveSpeed": 480,           // Desktop speed
    "lives": {"start": 3, "max": 5}
  },
  "spawn": {
    "basePerSecond": 1,         // Starting spawn rate
    "rateRamp": {"type": "exp", "k": 0.06}
  },
  "meteoroidMovement": {
    "angularFallDegrees": 15    // NOT straight down
  },
  "powerUps": {
    "spawnFrequencySeconds": 5,
    "resetOnDeath": false       // Configurable rapid-fire reset
  }
}
```

### 12.2 Performance Tuning
```json
{
  "collision": {
    "mode": "circle",           // Only supported mode
    "radiusScale": 0.92
  },
  "assets": {  
    "maxSpriteSizePx": 256,     // Auto-scaling for performance
    "autoScaleDown": true
  }
}
```

---

## 13) Key Differences from v1.3

### 13.1 Corrections Made
1. **Meteoroid types:** 3 implemented (basalt, ice, metal) - NOT 4+ as originally specified
2. **Spawning:** Top-edge only - NOT arc-based as originally documented  
3. **Movement:** Angular fall at 15° - NOT straight down as some sections implied
4. **Fire effects:** Speed-based (≥90% max speed) - NOT separate "fireball" type
5. **Mobile controls:** Direct positioning - NOT delta-based as originally described

### 13.2 Technical Insights Added
1. **Object pooling** requirements for performance
2. **Coordinate scaling** essential for mobile compatibility  
3. **Touch event handling** for UI interactions
4. **Frame-rate independence** implementation details
5. **Memory management** for particle systems

### 13.3 Build Process Clarified
1. **Production error suppression** for clean deployment
2. **Vite configuration** requirements for itch.io
3. **Asset scaling** for performance optimization
4. **Deployment pipeline** with proper error handling

---

## 14) Implementation Priority Order

### Phase 1: Core Systems
1. Project scaffolding (Vite + TypeScript)
2. Basic game loop with fixed timestep
3. Configuration loading system
4. Canvas setup and basic rendering

### Phase 2: Basic Gameplay
1. Ship entity with movement
2. Input system (keyboard first)
3. Auto-fire and projectile system
4. Basic collision detection

### Phase 3: Core Entities  
1. Meteoroid system with 3 types
2. Angular movement implementation
3. HP and damage system
4. Basic particle effects

### Phase 4: Power-ups & Polish
1. Power-up system (3 types)
2. HUD and scoring
3. Game over and restart
4. Visual effects optimization

### Phase 5: Mobile & Polish
1. Touch input system with scaling
2. Mobile-specific optimizations
3. Performance tuning
4. Build pipeline for deployment

This phased approach ensures core functionality first, then adds complexity incrementally while maintaining a working game at each stage.

---

**End of MVP Dream Requirements v2.0**

*This document represents the corrected, optimized specification based on actual implementation experience. It eliminates contradictions, clarifies ambiguities, and provides specific technical guidance for AI-assisted development.*
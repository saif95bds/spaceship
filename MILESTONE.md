Project: Spaceship Asteroids-like Web Game (MVP)
Purpose: Build step-by-step.

Milestone 1 — Project Scaffold

Goal: Basic Vite + TypeScript project with empty canvas and loop.

Setup Vite with TypeScript.

Add index.html with full-window canvas.

Create src/main.ts that initializes the canvas and resizes it on window resize.

Add src/core/loop.ts with a fixed-step update (60Hz) and variable render.

Config vite.config.ts with base: './' for itch.io deployment.

✅ Acceptance: Running npm run dev shows a black canvas updating at 60 FPS.

Milestone 2 — Config System

Goal: Define typed JSON-driven config.

Add src/types/config.ts with GameConfig interface matching the requirements doc.

Add src/data/config.ts that loads JSON (default.json) and applies defaults.

Validate ranges (e.g., lives ≤ 5, fireRate > 0).

✅ Acceptance: Console.log shows a typed config object with defaults applied.

Milestone 3 — Input System

Goal: Keyboard + touch input.

src/systems/input.ts:

Keyboard: Arrows + WASD.

Mobile: drag joystick; pause on lift.

Emit normalized ship movement vector.

✅ Acceptance: A ship (base.png) moves around canvas with input.

Milestone 4 — Rendering Layer

Goal: Draw order and fallback background.

src/systems/render.ts:

Background: starfield procedural fallback.

Entities: ship placeholder.

HUD placeholder text (score=0).

Use clear layering: background → entities → HUD.

✅ Acceptance: See a ship sprite and starfield background.

Milestone 5 — Entities & Collision

Goal: Add ship, meteoroid, projectile entities with collisions.

src/entities/Ship.ts, Meteoroid.ts, Projectile.ts.

Circle–circle collisions (radiusScale).

Projectile vs Meteoroid: animate impact.

Ship vs Meteoroid: lose 1 life.

✅ Acceptance: Projectiles hit rocks and destroy them, ship loses life on collision.

Milestone 6 — Spawning & Drift

Goal: Implement meteoroid spawning and difficulty ramp.

Spawn arc (10→2 o’clock).

Drift formula from doc (driftAmp).

Increase spawn rate + speed over time.

✅ Acceptance: Rocks spawn at top and drift; difficulty ramps smoothly.

Milestone 7 — Power-Ups (3 Types)

Goal: Implement +1 Life, Rapid Fire, Score Multiplier.

Pickup spawns occasionally.

+1 Life capped at 5.

Rapid Fire: level-based skins + faster fire. Configurable reset-on-death.

Score Multiplier: 3s default, HUD countdown visible.

✅ Acceptance: Picking up power-ups changes gameplay, HUD updates correctly.

Milestone 8 — HUD & UX Polish

Goal: Structured HUD.

Top-left: lives as hearts (≤5).

Top-center: power-up icons with timers.

Top-right: score.

Tutorial overlay: “Move with arrows/touch. Auto-fire enabled.”

✅ Acceptance: HUD shows hearts, score, power-up countdowns.

Milestone 9 — Performance & Polish

Goal: Optimize.

Object pools for projectiles/particles.

Debug toggles (draw collision rings).

Reduce Motion disables screen shake.

✅ Acceptance: Stable 60 FPS with many meteoroids/projectiles.

Milestone 10 — Deployment

Goal: Itch.io playable build.

Ensure vite.config.ts uses relative paths.

npm run build → zip /dist contents.

Upload to itch.io → mark as “play in browser”.

✅ Acceptance: Game runs in itch.io browser.
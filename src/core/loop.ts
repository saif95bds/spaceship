// Fixed-step update (60Hz) and variable render

import { InputSystem } from '../systems/input';
import { RenderSystem } from '../systems/render';
import { Ship } from '../entities/Ship';
import { GameConfig } from '../types/config';

const FIXED_STEP = 1000 / 60; // 60Hz in ms

export function startGameLoop(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D | null, config: GameConfig) {
  if (!ctx) return;

  let lastUpdate = performance.now();
  let accumulator = 0;

  // Initialize systems and entities
  const inputSystem = new InputSystem(canvas);
  const renderSystem = new RenderSystem(canvas, ctx, config);
  const ship = new Ship(canvas.width / 2, canvas.height - 100, config);

  // Handle canvas resize
  window.addEventListener('resize', () => {
    renderSystem.onResize();
  });

  function update(dt: number) {
    const input = inputSystem.getInputState();
    
    if (!input.isPaused) {
      ship.update(dt, input.movement.x, input.movement.y, canvas.width, canvas.height);
    }
  }

  function render(dt: number) {
    if (!ctx) return;
    renderSystem.render(ship, dt);
  }

  function loop(now: number) {
    const deltaTime = (now - lastUpdate) / 1000;
    accumulator += now - lastUpdate;
    lastUpdate = now;
    while (accumulator >= FIXED_STEP) {
      update(FIXED_STEP / 1000);
      accumulator -= FIXED_STEP;
    }
    render(deltaTime);
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

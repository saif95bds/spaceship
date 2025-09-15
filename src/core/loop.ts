// Fixed-step update (60Hz) and variable render

const FIXED_STEP = 1000 / 60; // 60Hz in ms

export function startGameLoop(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D | null) {
  let lastUpdate = performance.now();
  let accumulator = 0;

  function update(dt: number) {
    // Game update logic goes here
  }

  function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Spaceship Arcade Shooter', canvas.width / 2, canvas.height / 2);
  }

  function loop(now: number) {
    accumulator += now - lastUpdate;
    lastUpdate = now;
    while (accumulator >= FIXED_STEP) {
      update(FIXED_STEP / 1000);
      accumulator -= FIXED_STEP;
    }
    render();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

import { startGameLoop } from './core/loop';
import { loadConfig } from './data/config';

// Load config first
const config = loadConfig();
console.log('[DEBUG] Loaded config:', config);

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');

if (!canvas) {
  console.error('[ERROR] Canvas element not found!');
  throw new Error('Canvas element not found');
}

if (!ctx) {
  console.error('[ERROR] Failed to get 2D context!');
  throw new Error('Failed to get 2D context');
}

function resizeCanvas() {
  const maxWidth = config.canvas.maxWidth;
  const maxHeight = config.canvas.maxHeight;
  
  // Get available screen space
  const availableWidth = window.innerWidth;
  const availableHeight = window.innerHeight;
  
  // Calculate dimensions respecting max limits
  let canvasWidth = Math.min(availableWidth, maxWidth);
  let canvasHeight = Math.min(availableHeight, maxHeight);
  
  // Maintain aspect ratio if needed
  const targetRatio = maxWidth / maxHeight;
  const currentRatio = canvasWidth / canvasHeight;
  
  if (currentRatio > targetRatio) {
    // Too wide, adjust width
    canvasWidth = canvasHeight * targetRatio;
  } else if (currentRatio < targetRatio) {
    // Too tall, adjust height
    canvasHeight = canvasWidth / targetRatio;
  }
  
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  
  // Center the canvas
  canvas.style.position = 'fixed';
  canvas.style.left = '50%';
  canvas.style.top = '50%';
  canvas.style.transform = 'translate(-50%, -50%)';
  canvas.style.border = '2px solid #333';
}

console.log('[DEBUG] Starting game initialization...');
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

try {
  console.log('[DEBUG] Starting game loop...');
  startGameLoop(canvas, ctx, config);
  console.log('[DEBUG] Game loop started successfully');
} catch (error) {
  console.error('[CRITICAL ERROR] Failed to start game:', error);
  if (error instanceof Error) {
    console.error('Stack trace:', error.stack);
  }
}

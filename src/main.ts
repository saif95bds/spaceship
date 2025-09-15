import { startGameLoop } from './core/loop';
import { loadConfig } from './data/config';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');

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
}// Load and log config for Milestone 2 acceptance
const config = loadConfig();
console.log('Loaded config:', config);

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

startGameLoop(canvas, ctx, config);

import { startGameLoop } from './core/loop';
import { loadConfig } from './data/config';
import { logger } from './utils/Logger';

// Suppress development server WebSocket errors in production
if (typeof window !== 'undefined' && !window.location.host.includes('localhost')) {
  const originalError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    if (message.includes('WebSocket connection') || 
        message.includes('Could not establish connection') ||
        message.includes('message port closed')) {
      return; // Suppress these development-related errors
    }
    originalError.apply(console, args);
  };
}

// Load config first
const config = loadConfig();
logger.debug('Loaded config:', config);

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');

if (!canvas) {
  logger.error('Canvas element not found!');
  throw new Error('Canvas element not found');
}

if (!ctx) {
  logger.error('Failed to get 2D context!');
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

logger.debug('Starting game initialization...');
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

try {
  logger.debug('Starting game loop...');
  startGameLoop(canvas, ctx, config);
  logger.debug('Game loop started successfully');
} catch (error) {
  logger.error('Failed to start game:', error);
  if (error instanceof Error) {
    logger.error('Stack trace:', error.stack);
  }
}

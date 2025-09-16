# Configurable Logging System

The game now includes a comprehensive configurable logging system that allows you to control console output through the game configuration.

## Configuration

All logging settings are controlled through the `logging` section in `src/data/default.json`:

```json
{
  "logging": {
    "console_log_enabled": false,    // Master toggle for all debug logging
    "debug_collision": false,        // Collision detection debug logs
    "debug_particles": false,        // Particle system debug logs  
    "debug_assets": false,          // Asset loading debug logs
    "debug_performance": false,     // Performance monitoring logs
    "show_warnings": true,          // Warning messages (recommended: true)
    "show_errors": true            // Error messages (recommended: true)
  }
}
```

## Usage Examples

### Enable All Debug Logging
Set `console_log_enabled: true` to enable all debug categories:
```json
"console_log_enabled": true
```

### Enable Specific Debug Categories
You can enable specific debugging categories:
```json
{
  "console_log_enabled": true,
  "debug_collision": true,     // Show collision detection logs
  "debug_particles": false,    // Hide particle system logs
  "debug_assets": true,        // Show asset loading logs
  "debug_performance": true    // Show performance monitoring
}
```

### Production Mode
For production, disable all debug logging but keep warnings and errors:
```json
{
  "console_log_enabled": false,
  "show_warnings": true,
  "show_errors": true
}
```

## Log Categories

The logging system supports these categories:

- **debug**: General debug information (game state, initialization)
- **collision**: Collision detection debugging
- **particles**: Particle system debugging  
- **assets**: Asset loading status and errors
- **performance**: Performance monitoring and warnings
- **warn**: Warning messages
- **error**: Error messages

## Logger Usage in Code

The logger is used throughout the codebase:

```typescript
import { logger } from '../utils/Logger';

// Different log levels
logger.debug('General debug information');
logger.collision('Collision detection details');
logger.particles('Particle system status');
logger.assets('Asset loading progress');
logger.performance('Performance metrics');
logger.warn('Warning message');
logger.error('Error message');
```

## Benefits

1. **Performance**: Disabled logging has minimal performance impact
2. **Debugging**: Easy to enable specific debug categories when needed
3. **Production**: Clean console output in production builds
4. **Flexibility**: Granular control over what gets logged
5. **Consistency**: Unified logging interface throughout the codebase

## Migration from console.log

The entire codebase has been migrated from direct `console.log` calls to use the configurable logger system. This provides better control and organization of debug output.
# Game Configuration Guide

## Meteoroid Behavior Configuration

### Spawn Rate
- **Location**: `spawn.basePerSecond` in `/src/data/default.json`
- **Current Value**: `2.5` (meteoroids per second)
- **Description**: Controls how frequently meteoroids spawn
- **Recommended Range**: `1.0` to `5.0`
  - `1.0` = Slow, relaxed gameplay
  - `2.5` = Moderate challenge (current)
  - `5.0` = Fast-paced, intense gameplay

### Meteoroid Speed
- **Location**: `meteoroids[0].speed` in `/src/data/default.json`
- **Current Values**: `{ "min": 30, "max": 80 }`
- **Description**: Controls how fast meteoroids fall (pixels per second)
- **Recommended Ranges**:
  - Slow: `{ "min": 20, "max": 60 }`
  - Medium: `{ "min": 30, "max": 80 }` (current)
  - Fast: `{ "min": 60, "max": 120 }`

### Quick Tweaks for Different Gameplay Styles

#### Relaxed Mode
```json
"basePerSecond": 1.5,
"speed": { "min": 20, "max": 50 }
```

#### Moderate Mode (Current)
```json
"basePerSecond": 2.5,
"speed": { "min": 30, "max": 80 }
```

#### Intense Mode
```json
"basePerSecond": 4.0,
"speed": { "min": 50, "max": 100 }
```

## Other Tweakable Parameters

### Projectile Fire Rate
- **Location**: `projectile.fireRate` 
- **Current**: `3.0` shots per second
- **Range**: `1.0` to `10.0`

### Ship Movement Speed
- **Location**: `ship.moveSpeed`
- **Current**: `480` pixels per second
- **Range**: `200` to `800`

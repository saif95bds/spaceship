# itch.io Asset Loading Fix

## Problem
When deployed to itch.io, the game was failing to load assets with 403 Forbidden errors because:
- Assets were using absolute paths (`/assets/...`)
- itch.io hosts games in subdirectories like `https://html-classic.itch.zone/html/[game-id]/`
- Absolute paths tried to access the root domain instead of the game's specific directory
- CORS policies prevented loading resources outside the game's directory

## Solution
Changed all asset paths from absolute to relative:

### Before (Absolute Paths - Broken on itch.io)
```json
"/assets/ships/base.png"
"/assets/rocks/basalt_l.png"
"/assets/projectiles/basic.svg"
"/assets/backgrounds/nebula.png"
```

### After (Relative Paths - Works on itch.io)
```json
"assets/ships/base.png"
"assets/rocks/basalt_l.png"
"assets/projectiles/basic.svg"
"assets/backgrounds/nebula.png"
```

## Files Updated
- `src/data/default.json` - All asset path references changed from `/assets/...` to `assets/...`

## Assets Fixed
✅ Ship skins (default + rapid fire levels)
✅ Projectile sprites
✅ All meteoroid images (basalt, ice, metal, fireball - L/M/S sizes)
✅ Power-up rapid fire skins
✅ Background image

## Next Steps
1. **Rebuild the project**: Run `npm run build` to generate new dist files
2. **Upload to itch.io**: Upload the new build with corrected asset paths
3. **Test**: Verify that all sprites now load correctly on itch.io

## Why This Works
- Relative paths resolve correctly regardless of the hosting subdirectory
- `assets/rocks/basalt_l.png` will work whether hosted at:
  - `localhost:3000/assets/rocks/basalt_l.png` (local dev)
  - `https://html-classic.itch.zone/html/[game-id]/assets/rocks/basalt_l.png` (itch.io)

The fix ensures compatibility with itch.io's hosting structure while maintaining local development functionality.
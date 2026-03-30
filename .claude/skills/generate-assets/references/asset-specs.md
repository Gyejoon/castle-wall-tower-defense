# Asset Specifications

Detailed specs for every asset in Grid Line Defense PvP.

## Table of Contents

1. [Tiles](#1-tiles)
2. [Towers](#2-towers)
3. [Units](#3-units)
4. [Projectiles](#4-projectiles)
5. [VFX](#5-vfx)
6. [UI](#6-ui)

---

## 1. Tiles

### grid-floor.png (64x32, 2 variants side-by-side)
- **Left 32x32**: Dark tile (`#12121e`) with subtle 1px inner edge highlight (`#252538` at 30% opacity)
- **Right 32x32**: Slightly lighter tile (`#161625`) with same edge treatment
- Used as checkerboard pattern across the 20x20 grid
- No outer border (grid lines drawn separately)

### spawn-tile.png (32x32)
- Base: green (`#2cb67d`) glow gradient from center, fading to transparent
- Icon: right-pointing arrow (triangle) in bright green, centered
- Subtle pulsing glow ring at edges

### exit-tile.png (32x32)
- Base: pink (`#e53170`) glow gradient from center
- Icon: X mark in bright pink, centered
- Same glow treatment as spawn

---

## 2. Towers

All towers: 32x32 static sprite + 128x32 fire animation (4 frames)

### Tower Visual Structure
- **Base platform**: Dark circle (`#0a0a14`) centered at bottom, 20px diameter
- **Colored outline**: 1px outline matching tower color
- **Top shape**: Distinctive shape per tower type (see table)
- **Barrel/emitter**: Small protrusion pointing right (attack direction)

### Base Towers (Tier 1)

| Tower | Color | Shape | Visual Description |
|-------|-------|-------|--------------------|
| laser | `#e2b714` (gold) | diamond | Diamond crystal on base, thin barrel pointing right |
| plasma | `#2cb67d` (green) | hexagon | Hexagonal chamber, wide barrel with green glow |
| emp | `#7f5af0` (purple) | circle | Sphere with electric arcs, antenna on top |
| shield | `#00ccff` (cyan) | shield | Shield-shaped emitter, no barrel, cyan ring around base |

### Fusion Towers (Tier 2)

| Tower | Color | Shape | Visual Description |
|-------|-------|-------|--------------------|
| twin_laser | `#e2b714` | star | Star shape, dual barrels, golden glow |
| disruptor | `#7f5af0` | star | Star shape, purple energy core, wavering outline |
| nova_cannon | `#2cb67d` | star | Star shape, large central orb, green pulse |
| fortress | `#00ccff` | star | Star shape, thick armor plating, shield aura |
| stasis_field | `#94a1b2` (gray) | star | Star shape, time-distortion effect (gray swirl) |

### Fire Animation Frames (128x32, 4 frames each)

| Frame | Description |
|-------|-------------|
| 0 | Idle (same as static sprite) |
| 1 | Charge — glow intensifies, color brightens 20% |
| 2 | Fire — bright white flash at barrel, projectile emerging |
| 3 | Cooldown — residual glow fading, slight recoil |

**Shield tower exception**: Uses "pulse" animation instead of fire:
- Frame 0: Idle
- Frame 1: Ring expanding from center
- Frame 2: Ring at full radius, bright
- Frame 3: Ring fading out

---

## 3. Units

All units: 128x32 walk cycle (4 frames), 32x32 per frame.

### Unit Visual Identity

| Unit | Color | Size | Shape | Walk Animation |
|------|-------|------|-------|----------------|
| scout_drone | `#72f1b8` | 16x16 centered | Small triangle/arrow | Propeller blur alternating top/bottom |
| battle_robot | `#5b8cff` | 22x24 | Square body, head notch | Leg alternation (left/right step) |
| heavy_walker | `#ff8c42` | 26x28 | Thick hexagon body | Two legs alternating, heavy bounce |
| stealth_drone | `#b388ff` | 18x18 | Diamond shape | Shimmer/flicker between frames |
| titan | `#ff4757` | 30x30 | Large octagon | Inner core glow rotation, slow stride |

### Walk Cycle Frames

| Frame | Motion |
|-------|--------|
| 0 | Neutral stance |
| 1 | Right step / hover up |
| 2 | Neutral (mirrored weight) |
| 3 | Left step / hover down |

Each unit has:
- 2px shadow ellipse beneath (black, 30% opacity)
- No HP bar baked in (rendered dynamically by Phaser)

### unit-death.png (128x32, 4 frames, shared)
- Frame 0: Unit flashes white
- Frame 1: Outline breaks apart (pixels scatter outward)
- Frame 2: Scattered pixels fade, small explosion center
- Frame 3: Smoke wisps, nearly transparent

---

## 4. Projectiles

### laser-beam.png (32x8)
- Horizontal gold (`#e2b714`) beam with white (`#fffffe`) core line
- 1px glow edges in lighter gold
- Single static image (movement via Phaser tween)

### plasma-bolt.png (16x16)
- Green (`#2cb67d`) energy ball, 8px diameter
- Soft radial glow halo (4px extra radius)
- White center pixel

### emp-pulse.png (32x32)
- Purple (`#7f5af0`) ring, 2px thick, 12px radius
- Slight inner glow
- Used as expanding ring effect (scaled via Phaser tween)

### hit-flash.png (64x16, 4 frames at 16x16)
- Frame 0: White cross/star burst
- Frame 1: Expanding ring
- Frame 2: Ring + fading sparks
- Frame 3: Sparse sparks, mostly transparent

---

## 5. VFX

### explosion-sm.png (128x32, 4 frames at 32x32)
- Frame 0: White-hot center (4px), orange ring
- Frame 1: Orange expanding, red edges
- Frame 2: Red/dark orange, smoke beginning
- Frame 3: Gray smoke wisps fading

### explosion-lg.png (256x64, 4 frames at 64x64)
- Same sequence as small but double size
- More detail: inner shockwave ring visible
- For titan deaths and nova_cannon hits

### shield-bubble.png (32x32)
- Translucent cyan (`#00ccff`) circle, 24px diameter
- 1px bright white highlight arc (top-left quadrant)
- 20% opacity fill, 80% opacity outline
- Static image (can be alpha-tweened by Phaser)

### spawn-portal.png (128x32, 4 frames at 32x32)
- Frame 0: Small green (`#2cb67d`) dot at center
- Frame 1: Swirling ring forming
- Frame 2: Full portal ring, particle sparks
- Frame 3: Portal active, subtle rotation hint

---

## 6. UI

### tower-icons.png (128x32, 4 icons at 32x32)
- 4 base tower icons in order: laser, plasma, emp, shield
- Each icon: simplified tower silhouette on transparent background
- Uses tower color, outlined style (not filled)
- For sidebar tower selection panel

### unit-icons.png (160x32, 5 icons at 32x32)
- 5 unit icons in order: scout_drone, battle_robot, heavy_walker, stealth_drone, titan
- Each icon: simplified unit silhouette in unit color
- For unit send panel

### hp-bar.png (32x4)
- Left-to-right gradient: green (`#2cb67d`) → gold (`#e2b714`) → red (`#e53170`)
- Used as texture for unit HP bars (cropped by Phaser based on HP%)

### cursor-place.png (32x32)
- Purple (`#7f5af0`) square outline, 2px thick, dashed pattern
- Subtle inner glow
- For tower placement hover indicator

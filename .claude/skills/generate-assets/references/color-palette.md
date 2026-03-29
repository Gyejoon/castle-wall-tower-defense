# Color Palette

Strict color palette for Grid Line Defense PvP assets. Only use these colors (plus transparency and calculated alpha blends).

## Core Colors

| Name | Hex | Usage |
|------|-----|-------|
| dark | `#1a1a2e` | Primary background |
| darkAlt | `#16161a` | Panel backgrounds |
| gridDark | `#12121e` | Dark checkerboard tile |
| gridLight | `#161625` | Light checkerboard tile |
| gridLine | `#1e1e30` | Grid line overlay |
| purple | `#7f5af0` | Accent, EMP tower, Disruptor |
| green | `#2cb67d` | Success, Plasma tower, Nova Cannon, spawn |
| pink | `#e53170` | Danger, exit marker |
| gold | `#e2b714` | Gold currency, Laser tower, Twin Laser |
| cyan | `#00ccff` | Info, Shield tower, Fortress |
| white | `#fffffe` | Text, highlights, flash effects |
| gray | `#94a1b2` | Secondary text, Stasis Field tower |

## Tower Color Map

| Tower ID | Color | Hex |
|----------|-------|-----|
| laser | gold | `#e2b714` |
| plasma | green | `#2cb67d` |
| emp | purple | `#7f5af0` |
| shield | cyan | `#00ccff` |
| twin_laser | gold | `#e2b714` |
| disruptor | purple | `#7f5af0` |
| nova_cannon | green | `#2cb67d` |
| fortress | cyan | `#00ccff` |
| stasis_field | gray | `#94a1b2` |

## Unit Color Map

| Unit ID | Hex | Description |
|---------|-----|-------------|
| scout_drone | `#72f1b8` | Mint green |
| battle_robot | `#5b8cff` | Blue |
| heavy_walker | `#ff8c42` | Orange |
| stealth_drone | `#b388ff` | Light purple |
| titan | `#ff4757` | Red |

## VFX Colors (used in fire/explosion effects)

| Name | Hex | Usage |
|------|-----|-------|
| orange | `#ff8c42` | Fire mid-tone, explosion ring |
| red | `#ff4757` | Explosion edges, damage flash |

## Utility Colors (derived, for effects only)

| Purpose | Hex | Usage |
|---------|-----|-------|
| Tower base | `#0a0a14` | Dark platform under towers |
| Edge highlight | `#252538` | Tile inner edge (30% opacity) |
| Shadow | `#000000` | Unit shadow (30% opacity) |
| Flash | `#ffffff` | Attack flash, death flash |

## Rules

1. Never introduce colors outside this palette
2. Use alpha/opacity for glow effects, not new colors
3. Lighter/darker variants: blend palette color with white/black at specified alpha
4. Fire effects use: white core → gold/green → orange → gray smoke
5. Explosion effects use: white → orange → red → gray

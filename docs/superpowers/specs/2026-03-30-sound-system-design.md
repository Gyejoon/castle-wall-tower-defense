# Sound System Enhancement Design

## Context

Grid Line Defense PvP has a minimal procedural sound system (`SoundGenerator.ts`) using raw Web Audio API. It covers 7 sounds (tower attacks x7, unit death, wave start, pressure attack/select, match victory/defeat) but 3 are defined without being called. 23 game events have no sound at all — tower placement, selling, UI interactions, wave completion, gold changes, pressure choices, breach alerts, etc.

This design extends `SoundGenerator` with multi-layer synthesis (noise, FM, filters, ADSR envelopes) and adds 23 new SFX covering all missing game events, while keeping the zero-dependency procedural approach.

## Architecture

### Current State

```
SoundGenerator
  play(recipe: SoundRecipe)  →  Oscillator → GainNode → destination
```

Single oscillator, linear gain decay. No noise, no filters, no layering.

### Target State

```
SoundGenerator
├── play(recipe)              — existing (single oscillator, backward compat)
├── playLayered(layers[])     — NEW: multiple sound sources in parallel
├── playNoise(config)         — NEW: noise buffer + filter + envelope
├── playSequence(notes[])     — NEW: timed note sequence (fanfares)
│
├── Master chain:
│   individual sounds → categoryGain(sfx|ui) → masterGain → compressor → destination
│
├── Helpers:
│   createNoiseBuffer(type, duration)  — white/pink/brown noise
│   createADSR(gain, adsr)            — attack/decay/sustain/release envelope
│   createFMPair(carrier, mod)        — FM synthesis oscillator pair
│
└── Throttle:
    throttleMap: Map<string, number>   — per-key last-play timestamp
    shouldThrottle(key, ms): boolean
```

### Key Design Decisions

1. **No external dependencies** — Pure Web Audio API. ZzFX designer used offline for sound experimentation only.
2. **Category gain nodes** — `sfxGain` and `uiGain` allow independent volume control. Connected through `masterGain` → `DynamicsCompressorNode` → `destination`.
3. **Backward compatible** — Existing `play(recipe)` unchanged. New methods are additive.
4. **Lazy AudioContext** — Existing pattern kept. Context created on first sound, handles mobile autoplay restrictions.

## Sound Catalog (23 new + 7 improved)

### UI Sounds (6 new)

| Method | Synthesis | Freq | Duration | Description |
|--------|-----------|------|----------|-------------|
| `playUIClick()` | sine pulse | 1200Hz | 30ms | Button/tower select |
| `playUIHover()` | sine pulse, low vol | 1000Hz | 15ms | Tile hover (throttled 150ms) |
| `playUIError()` | square 2-tap | 200Hz | 80ms x2 | Insufficient gold, invalid placement |
| `playUIConfirm()` | rising 2-tone sine | 800→1200Hz | 60ms | Purchase confirm |
| `playUICancel()` | falling 2-tone | 600→400Hz | 60ms | Sell/cancel |
| `playUITabSwitch()` | triangle tick | 900Hz | 20ms | Tab switch |

### Tower System (4 new)

| Method | Synthesis | Description |
|--------|-----------|-------------|
| `playTowerPlaced()` | FM bell (carrier 600Hz, mod 1200Hz, index decaying) | Construction complete. Satisfying resonant ding. |
| `playTowerSold()` | Falling triangle (1000→500Hz) + short noise burst | Sell/refund. |
| `playTowerUpgraded()` | 3-note ascending arpeggio (C5-E5-G5, square, 60ms each) | Upgrade confirmation. |
| `playTowerAttack()` improved | **laser/twin_laser**: add high-freq noise tail (10ms). **plasma/nova_cannon**: add brown noise sub-layer for rumble. **emp/disruptor**: add 5Hz detune between two oscillators for electric wobble. **fortress**: add gentle FM overtone. | More distinct per-tower identity. |

### Gameplay SFX (8 new)

| Method | Synthesis | Description |
|--------|-----------|-------------|
| `playWaveComplete()` | 3-note ascending chord (sine) + high noise shimmer | Wave cleared celebration. |
| `playBuildPhaseStart()` | Soft alert tone (500Hz sine, 200ms, gentle attack) | Build phase begins. |
| `playCountdownTick()` | Sharp tick (1500Hz sine, 20ms). Only plays at t <= 3. | Final countdown warning. |
| `playUnitSpawned()` | Pop: white noise burst (30ms) + 800Hz sine | Unit appears. Throttled 500ms global. |
| `playBreach()` | Warning: square 300Hz with LFO wobble + noise | Unit reaches exit. |
| `playGoldEarned()` | Coin pickup: B5→E6 square, 2-tone rising | Bounty collected. Throttled 300ms. |
| `playGoldSpent()` | Soft debit: 600→400Hz triangle, 50ms | Gold deducted. |
| `playHPLoss()` | Impact: brown noise burst + 100Hz sine thud | Player takes damage. |

### Pressure System (3 new)

| Method | Synthesis | Description |
|--------|-----------|-------------|
| `playPressureDefense()` | FM burst (carrier 600Hz, short decay) | Defense bonus earned. |
| `playPressureInvest()` | Rising tone (400→800Hz sine, 150ms) | Investment made. |
| `playPressureGhostApplied()` | Eerie: 200Hz + detuned 205Hz (beat freq 5Hz) | Opponent's pressure applied. |

### Match Results (2 improved)

| Method | Change | Description |
|--------|--------|-------------|
| `playMatchVictory()` | 3-note → 5-note fanfare (C5-E5-G5-C6-E6) + noise cymbal crash | Fuller victory celebration. |
| `playMatchDefeat()` | Single tone → 3-note descending (G4-Eb4-C4) + brown noise rumble | More impactful defeat. |

## Throttling Strategy

| Sound Category | Throttle | Key | Reason |
|----------------|----------|-----|--------|
| Tower attacks | 200ms per tower type | `tower_{type}` | Existing, prevents rapid-fire overlap |
| Unit spawn | 500ms global | `unitSpawn` | Mass spawn waves |
| Unit death | 100ms global | `unitDeath` | Chain kills |
| Gold earned | 300ms global | `goldEarned` | Consecutive bounties |
| UI hover | 150ms global | `uiHover` | Mouse movement |
| All others | No throttle | — | Low frequency events |

## Integration Points

### Already Defined, Need Calls Added

| Sound | File | Where to Call |
|-------|------|---------------|
| `playMatchVictory()` | Game.ts | Match end when player wins |
| `playMatchDefeat()` | Game.ts | Match end when player loses |
| `playPressureSelect()` | PressureSystem.ts | `setChoice()` method |

### New Sound Triggers

| Sound | File | Where to Trigger |
|-------|------|-----------------|
| `playTowerPlaced()` | Game.ts | After successful tower placement |
| `playUIError()` | Game.ts | Tower placement failed (insufficient gold, invalid tile) |
| `playTowerSold()` | Game.ts | Tower sell action |
| `playWaveComplete()` | WaveSystem.ts | All units cleared in wave |
| `playBuildPhaseStart()` | WaveSystem.ts | Building phase timer starts |
| `playCountdownTick()` | WaveSystem.ts | Last 3 seconds of countdown |
| `playUnitSpawned()` | UnitSystem.ts | Unit created (throttled) |
| `playBreach()` | Game.ts | Unit reaches exit |
| `playHPLoss()` | Game.ts | Player HP decremented |
| `playGoldEarned()` | Game.ts | Gold added from bounty |
| `playGoldSpent()` | Game.ts | Gold deducted for purchase |
| `playUIClick()` | Game.ts | Keyboard tower select (1-4) |
| `playUIHover()` | Game.ts | Pointer over valid tile |
| `playPressureDefense()` | PressureSystem.ts | Defense bonus applied |
| `playPressureInvest()` | PressureSystem.ts | Investment cost applied |
| `playPressureGhostApplied()` | PressureSystem.ts | Ghost pressure received |

## Files to Modify

| File | Changes |
|------|---------|
| `packages/phaser-game/src/audio/SoundGenerator.ts` | Extend with multi-layer synthesis, noise, FM, ADSR, master chain, 23 new methods, throttling |
| `packages/phaser-game/src/scenes/Game.ts` | Add sound triggers for tower place/sell, match end, gold, HP, breach, UI interactions |
| `packages/phaser-game/src/systems/WaveSystem.ts` | Add sound triggers for wave complete, build phase, countdown |
| `packages/phaser-game/src/systems/UnitSystem.ts` | Add sound trigger for unit spawn |
| `packages/phaser-game/src/systems/PressureSystem.ts` | Add sound triggers for pressure choices |

## Verification

1. **Build**: `bun run build` passes without errors
2. **Type check**: `bun run typecheck` passes
3. **Manual test**: Play the game in browser and verify:
   - Every tower placement makes a bell sound
   - Failed placement makes an error buzz
   - Selling a tower plays the sell sound
   - Wave completion plays celebration chime
   - Countdown last 3 seconds have ticks
   - Victory/defeat have enhanced fanfares
   - Pressure choices play feedback sounds
   - Unit breach plays warning
   - Gold changes play coin/debit sounds
   - No sound spam during mass events (throttling works)
   - UI hover/click sounds are subtle and non-annoying
4. **Lint**: `bun run lint` passes

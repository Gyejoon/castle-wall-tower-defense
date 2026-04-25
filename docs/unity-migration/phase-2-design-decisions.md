---
phase: 2
status: authoritative
date: 2026-04-25
related_plan: docs/superpowers/plans/2026-04-24-unity-phase-2-poc-vertical-slice.md
related_spec: docs/superpowers/specs/2026-04-24-unity-migration-design.md
supersedes_plan_when_conflicting: true
---

# Phase 2 — PoC Vertical Slice Design Decisions

This document consolidates the Phase 2 pre-plan agent consultations (Unity Architect, Technical Artist, Game Designer) and resolves PoC scope discrepancies surfaced during baseline analysis. It is the **authoritative reference** for Tasks 2–6 of `2026-04-24-unity-phase-2-poc-vertical-slice.md`. Where this document and the plan disagree, **this document wins** (per `phase-1-design-decisions.md` precedent).

## Source consultations

- **Unity Architect** — Slice2 minimal-system pattern (events / collections / prefab split / construction order / anti-pattern watchlist).
- **Technical Artist** — `PixelPerfectCamera` config, camera stack ordering, subpixel-drift verification, letterbox treatment, URP 2D renderer settings.
- **Game Designer** — Static-analysis baseline of wave-1 numeric invariants from `packages/phaser-game/src/systems/{Wave,Tower,Unit,Energy}System.ts` and shared data files. Output is a **bounded estimate** + flagged unknowns; runtime validation deferred to Task 7.

---

## 1. Unity Architect — Minimal Systems Decisions

### 1.1 Inter-system messaging in Slice2

**Decision: Plain C# `event Action<T>` exposed on each Minimal system, wired by `Slice2SceneController` (or `MinimalReplayRunner`) at construction time. NOT SO event channels, NOT `static GameEvents`.**

Rationale: Phase 2 systems are pure C# containers — they cannot author or `RegisterListener` against an SO without dragging `ScriptableObject.CreateInstance` into the headless replay runner, which adds Unity engine dependencies the parity test should not need. A `static GameEvents` class is worse: it leaks state across replay runs (the parity test runs N fixtures back-to-back), is impossible to reset deterministically, and is a singleton anti-pattern this project rejects. Plain C# events constructed per-instance auto-clean when the system goes out of scope, are zero-alloc after subscribe, and trivially testable. **Phase 3 escape hatch:** when MB consumers (HUD, VFX) appear outside Slice2, promote high-traffic events (`OnEnergyChanged`, `OnWaveStarted`) to SO `IntEventChannelSO` — that migration is a one-line change at the publisher because both expose `event Action<int>` shape.

```csharp
public sealed class MinimalEnergySystem {
    public event Action<int> OnEnergyChanged;
    public event Action<int> OnEnergySpent;
    public int Energy { get; private set; }
    public bool TrySpend(int amount) { /* ...raise OnEnergySpent... */ }
}
```

### 1.2 Tower/Unit collection storage

**Decision: Plain `List<TowerInstance>` for iteration + sidecar `Dictionary<GridCell, TowerInstance>` for O(1) cell lookup, both owned by `MinimalTowerSystem`. Same shape for `MinimalUnitSystem` minus the dict. NO `RuntimeSet<T>` SO.**

Rationale: `RuntimeSet<T>` shines when entities self-register from prefab `OnEnable` — exactly the workflow that does NOT exist in headless replay. A `RuntimeSet` SO that the replay runner has to `CreateInstance` and reset between fixtures is friction without payoff. Plain collections owned by the system match the "system constructs and owns its entities" model and make replay trivially deterministic. At N≤30 towers iteration cost is irrelevant; the dict gives O(1) for placement-collision checks. **Phase 3:** if cross-scene observability is needed, add a thin optional `TowerRuntimeSet : ScriptableObject` the system pushes to — additive, non-invasive.

```csharp
public sealed class MinimalTowerSystem {
    private readonly List<TowerInstance> _towers = new(32);
    private readonly Dictionary<GridCell, TowerInstance> _byCell = new(32);
    public IReadOnlyList<TowerInstance> Towers => _towers;
    public bool TryGetAt(GridCell c, out TowerInstance t) => _byCell.TryGetValue(c, out t);
}
```

### 1.3 Prefab-vs-runtime-instantiate split

**Decision: Two parallel representations. `TowerInstance` and `UnitInstance` are *plain C# classes* (POCOs) holding runtime state. In scene mode, a separate `TowerView` MB on a prefab observes one POCO and renders it. In headless mode, no view is created. Prefabs loaded via direct `[SerializeField] GameObject` reference on `Slice2SceneController` (NOT Addressables) for Phase 2's two prefabs.**

Rationale: Making `TowerInstance` a MonoBehaviour is the trap that makes the headless replay runner impossible. Splitting state (POCO) from view (MB) means `MinimalTowerSystem` operates on POCOs identically in both modes, and the parity assertion `kills == 5` runs against the exact same simulation code that ships to WebGL. Addressables for two prefabs is overkill; Phase 3 promotes when prefab count grows. **Critical invariant: simulation must NEVER read from view; data flows POCO → View only.**

```csharp
public sealed class TowerInstance {              // POCO, headless-safe
    public TowerDefSO Def; public GridCell Cell;
    public float CooldownRemaining; public int ShotsFired;
}
public sealed class TowerView : MonoBehaviour {  // scene-only
    public void Bind(TowerInstance state) { /* sprite, range circle */ }
    public void Tick() { /* read state, update transform */ }
}
```

### 1.4 Construction order and lifetime

```
Scene mode (Slice2SceneController.Awake):
  GameDatabase.Active (already loaded by GameBootstrap)
        │
        ▼
  MinimalGridManager(map: db.map)
        │
        ▼
  MinimalEnergySystem(cfg: db.energy)
        │
        ├──► MinimalUnitSystem(grid, db.units)
        │         │
        │         ▼
        ├──► MinimalTowerSystem(grid, db.towers, units)  // attacks need units
        │         │
        │         ▼
        └──► MinimalWaveSystem(units, db.waves)          // spawns into units
                  │
                  ▼
        Slice2SceneController.Update() drives Tick(dt) in fixed order:
          Energy → Wave → Units → Towers → Views
```

Headless (`MinimalReplayRunner.Run`): identical construction graph minus Views. Runner owns the tick loop, stepping a fixed 16.67ms `dt` and feeding fixture-scheduled events into `MinimalTowerSystem.Place(...)`. **One owner of tick per mode.** POCOs and systems are GC'd when the scene unloads / runner method returns; no statics, no `DontDestroyOnLoad`.

### 1.5 Anti-pattern watchlist

1. **`FindObjectOfType<MinimalTowerSystem>()` from PlacementController or HUD.** PlacementController and Slice2HudController must receive system references via `Slice2SceneController.Wire(...)` at Awake. Zero `Find*` calls — the parity runner has no scene to find against.
2. **Putting simulation state on the View MB.** State lives only on `TowerInstance` POCO. View is a pure observer with `Bind(state)` + `Tick()` reading from state.
3. **Static `GameTime.Now` or `Time.time` reads inside Minimal systems.** All systems take `Tick(float dt)`; never read `Time.deltaTime` internally. Same for `Random` — pass an `IRng` or `System.Random(seed)` through the constructor; never `UnityEngine.Random`.
4. **Mutating `TowerDefSO.damage` for buffs.** SOs are assets — runtime mutation persists. Apply buffs onto `TowerInstance.RuntimeDamage` (copied from def at place-time), never the def itself.
5. **Letting `MinimalWaveSystem` know about Towers.** Dependency arrow is Wave → Units → Towers, never bidirectional. Violation here becomes the cyclic dependency that blocks Phase 3 parallelization.
6. **`Coroutine` or `async void` inside Minimal systems.** Both are non-deterministic under fixed-dt replay. Use explicit timers (`float spawnCountdown`) decremented in `Tick(dt)`.

---

## 2. Technical Artist — PixelPerfectCamera + Render Decisions

### 2.1 PixelPerfectCamera component values (Slice2 Main Camera)

| Property | Value | Why |
|---|---|---|
| Reference Resolution X | **512** (PoC override; see §4) | Match Phaser logical width for 8-col PoC. As-shipped Phaser is 9 cols × 48 px = 432 logical, but PoC plan uses 8 cols × 64 px = 512. |
| Reference Resolution Y | **1152** | Match Phaser logical height (18 rows × 64 px). |
| Assets PPU | **64** | Tile = 64 px = 1 world unit. Matches `spritePixelsPerUnit = 64f` in Phase 1 `SpriteImportPostprocessor`. |
| Upscale Render Texture | **Off** | iPhone 12 native is non-integer ratio to 512×1152 (~2.197×); URT either crops or reintroduces fractional sampling. Off = single Point-sample to backbuffer. |
| Pixel Snapping | **On** | Snaps SpriteRenderer vertex position to PPU grid every frame. Required to prevent 0.5-px tile seams. |
| Crop Frame X / Y | **None** | Pillarbox/Letterbox bake bars into RT — costs fillrate and produces true black instead of brand `#1a1a2e`. Let HTML canvas `object-fit: contain` handle bars. |
| Stretch Fill | **Off** | On = non-uniform scale = rectangular tiles. |
| Filter Mode (per-sprite) | **Point** | Bilinear blurs 64-px pixel art. Already enforced in `SpriteImportPostprocessor`. |

### 2.2 Camera stack ordering (URP 2D + UI Toolkit)

UI Toolkit `PanelSettings` with `Render Mode = Screen Space - Overlay` does NOT require its own camera — it composites after camera rendering. **Slice2 uses ONE camera total**: Main Camera, Render Type = Base, Renderer = URP-2D-Renderer, Projection = Orthographic, Size = `1152 / (2 × 64) = 9`, PixelPerfectCamera attached. Culling Mask excludes UI layer. PanelSettings Sort Order = 0. **Do not add an Overlay camera** — common cargo-cult that wastes a clear+blit.

### 2.3 No-subpixel-drift verification recipe (60 sec)

1. Open `Slice2_PoC.unity`, set Game view to **Free Aspect → 1170×2532** (iPhone 12 native), Scale = 1. Confirm PixelPerfectCamera "Current Pixel Ratio" reads integer or 1:1.
2. Place `tower_archer` at grid coords → world position **must be exactly cell-center with no trailing decimals beyond `.5`**.
3. Pan Main Camera by `(+1/64, 0, 0)` — toggle Pixel Snapping off then on; tower must visibly **jump**. If it doesn't, snapping is not engaged.
4. Spawn 1 orc walking left along a row. Record 5s @ 60 fps via Recorder. Frame-step: orc edges must move in **integer logical-pixel increments**. Any "shimmer" = drift.
5. Place a **1-tile checkerboard** spanning playfield. Look for half-pixel seams — any visible vertical line between cols = atlas Padding/Extrude regression.
6. Resize Game view 1170×2532 → 1080×2400 → 828×1792. Tile size must remain constant integer ratio; no 1-px gap at HUD/playfield boundary.
7. Frame Debugger: gameplay should be **1 SRP Batch** (atlas-shared) + 1 UI Toolkit pass. >2 sprite batches = atlas/material breakage.

### 2.4 Letterbox/pillarbox treatment

**Phaser legacy** (`packages/phaser-game/src/config.ts`): `Scale.FIT` + `CENTER_BOTH` keeps internal logical buffer fixed and uniformly scales `<canvas>` CSS size; bars come from host page background `#1a1a2e`, not Phaser.

**Unity matches exactly**:
- Crop Frame = None (per §2.1).
- WebGL template `<canvas>` gets `object-fit: contain` + parent container `background: #1a1a2e`.
- Do NOT scale gameplay area to fill (non-uniform stretch) or zoom-to-fill (clips HUD rows).
- iPad 4:3 produces large bars (~25% top+bottom) — accepted per spec; phone-first game.

### 2.5 URP 2D Renderer settings to verify (Slice2)

| Setting | Expected | Why |
|---|---|---|
| Renderer Feature stack | **Empty** | Each feature = extra blit. PoC needs zero. |
| Light 2D usage | **None** in scene | Phase 2 has no lighting. |
| Anti-aliasing (MSAA) | **Disabled (1×)** | MSAA on point-filtered pixel art = wasted bandwidth + softens edges. |
| Post Processing | **Off** (Camera + URP Asset) | Banned in PoC. Saves the post-process pass entirely. |
| HDR | **Off** (URP Asset + Camera) | Pixel art is sRGB LDR; HDR doubles RT bandwidth and breaks Point-filter on some mobile GPUs. |
| Render Scale | **1.0** | ≠1.0 reintroduces non-integer scale blit. |
| Depth/Opaque Texture | **Both Off** | 2D scene with no shaders sampling either. On = wasted RT alloc on WebGL (~8 MB at 1170×2532). |

---

## 3. Game Designer — Wave-1 Numeric Invariants (Static Analysis)

> **Persona note.** Wave 1 in the shipped Phaser build is the player's "first success" beat — `WAVE_SCALING[0]` is `{ hp: 1.0, speed: 1.0 }` (`packages/shared/src/constants/waves.ts:33`). The Phase 2 PoC fixture (5 "orcs", one archer at col=3, row=14) is a **simplification**, not the actual shipped Wave 1. Numbers below cover BOTH the as-shipped logic and the PoC adaptation, with explicit deltas flagged.

### 3.1 Archer stats
- **damage**: `20` per shot, base. Effective = `baseDamage × enhancementStatMultiplier(level)`; at level 1 multiplier = 1.0, so effective = **20**. (`packages/shared/src/constants/towers.ts:48`, `packages/shared/src/constants/meta.ts:21-23,62-64`)
- **attack interval**: `attackSpeed: 1.0` shots/sec → interval `1000 / 1.0 = 1000ms`. (`towers.ts:48`, `packages/phaser-game/src/towers/BaseTower.ts:46-53`)
- **range**: `4` cells, compared as Euclidean grid-distance squared (`rangeCells*rangeCells = 16`). (`towers.ts:48`, `BaseTower.ts:57-60`, `packages/phaser-game/src/towers/targeting/NearestInRange.ts:7,17-20`)
- **targeting policy**: NearestInRange — closest unit by squared grid distance, ties broken by iteration order; ignores HP and path progress. (`NearestInRange.ts:4-25`)
- **projectile flight time**: NOT instant. `projectileSpeed: 8` cells/sec. TTL = `Math.round(distGrid / 8 × 1000)` clamped to `[40ms, 500ms]`. Damage applies on impact via `pendingDamage` → `damageEventsBuffer`. (`towers.ts:48`, `packages/phaser-game/src/towers/projectiles/ArrowEmitter.ts:25-37,44-63`, `packages/phaser-game/src/systems/TowerSystem.ts:618-635`)
- **Armor pierce**: archer DOES armor-pierce (`armorPierce = !tower.def.stats.special`, archer `special` undefined). (`ArrowEmitter.ts:45`, `packages/phaser-game/src/towers/families/ArcherFamilyTower.ts:21-25`)

### 3.2 Orc stats (PoC unit = `battle_robot`, "오크 전사")
- HP 80, speed 1.5 tiles/s, armor 5, neutral, bounty 12. (`packages/shared/src/constants/units.ts:30-38`)
- Stage-level scaling at level 1 → band 1 → multipliers 1.0 (`packages/shared/src/constants/scaling.ts:13,20-22,28-39`). Wave 1 `WAVE_SCALING[0]` = 1.0/1.0 (`waves.ts:33`). Final HP = 80, speed = 1.5 t/s, armor = 5.
- **Path on `main_long`**: spawn `(0,0)`, exit `(4,0)`. Generated by `generateLeftDescent + generateBottomTraverse + generateRightAscent` (`maps.ts:49-160`). **Length ≈ 78 cells**; spawn-to-exit at 1.5 t/s ≈ **52s**.
- **Damage to base on reach**: `WaveSystem`/`UnitSystem` emit `reachedExit` (`UnitSystem.ts:698-699`); per-unit damage value lives in `CoreOrchestrator`/`CastleWallSystem`, **not in the four ported systems**. Flag for runtime validation.

### 3.3 Wave 1 spawn schedule
- **As-shipped** (`packages/shared/src/data/waves.ts:62-97`): 1 group, `scout_drone × 30`, kind `'normal'`, `delayAfterClearSec: 3`. ⚠️ Plan's "5 orcs" is a PoC override, NOT what `generateWaves(50)[0]` returns.
- **Spawn interval**: `UnitSystem.spawnIntervalMs = 300ms` default (`UnitSystem.ts:98`); `Game.ts:273` sets PLAYER spawns to 1000ms but enemy keeps 300ms. So cadence = **1 unit per 300ms** from the same lane queue (`UnitSystem.ts:677-685`).
- **Spawn cell**: lane[0] = path[0] = `(0,0)` (`UnitSystem.ts:202-205`, `maps.ts:229`).
- **Prep before first spawn**: `INITIAL_PREP_MS = 5000ms` (`meta.ts:67`, `WaveSystem.ts:79-84`). Wave 1 begins spawning at t = 5000ms.
- **PoC (5 orcs)**: assuming same 300ms cadence, last spawn at `t_prep + 4 × 300 = 6200ms`.

### 3.4 Energy economy (wave 1)
- **Starting**: `INITIAL_ENERGY = 40` (`packages/shared/src/constants/energy.ts:7`).
- **Regen**: `ENERGY_PER_SECOND = 1` (`energy.ts:5`); delta clamped 5s, capped at `ENERGY_CAP = 200` (`packages/phaser-game/src/systems/EnergySystem.ts:25-31`).
- **Cost to place 1 archer**: `cost: TIER_COST[1] = 20` (`towers.ts:9-10,52`). ⚠️ Plan's HUD says "⚡10" — that's a Phase-2 PoC override; **as-shipped cost is 20**.
- **Regen during prep**: `WaveSystem.ts:79-83` comment says "prep 중에는 에너지는 증가하지 않는다." Actual gating call is in `CoreOrchestrator` (not in the four ported systems) — confirm by Phaser run.
- **Energy peak (1 archer at t=100ms, 60s scenario)**: starting 40, spend 20 → 20. Regen 59.9s × 1/s ≈ 60. Peak = `min(20 + 60, 200) ≈ 80`. If regen gated during prep: peak ≈ **75**. Bound: **75–80**.

### 3.5 Derived invariants for the fixture (seed=12345, 60s, place archer at PoC-grid (col=3, row=14) at t=100ms)
- **kills**: archer DPS vs orc HP. Damage_per_hit_armor_pierced = `floor(20 - 0) = 20` (armor-pierce). 1 shot/s → 20 dps. Orc HP 80 → **4 shots = 4s per orc kill**. With 5 orcs spawning over 1.2s, archer needs ~`5 × 4 = 20s` of fire. **Expected: 5** if range covers orc path. ⚠️ See §4 — placement legality at (3,14) on `main_long` fails; PoC uses a different map.
- **totalDamage**: armor-piercing 20 vs 80hp → 4 hits × 20 = 80 per orc, 5 orcs → **400**. Upper bound = 400 (no respawn in 1 wave).
- **waveClearMs**: first kill at `t_firstSpawn + 4s ≈ t=4000ms` post-spawn; last kill = first-spawn + (4 × 300ms cadence) + (4s per orc, serialized single-target) ≈ `1200 + 4000 + 4 × 4000 = 21200ms` worst case. **Bound: 12000–22000ms** post-first-spawn (add 5000ms prep if included).
- **energyPeak**: see §3.4. **75–80**.

### 3.6 Determinism notes
- **WaveSystem**: no RNG — deterministic state machine on `delta` (`WaveSystem.ts:90-176`).
- **TowerSystem**: no RNG — targeting deterministic, damage deterministic (`TowerSystem.ts:507-534`).
- **UnitSystem**: RNG present (`private rng: () => number = Math.random`, `UnitSystem.ts:95`) but only consumed by `CCStateManager`. Wave 1 with 1 archer applies no CC → **RNG not consumed**. Replay seed (12345) only matters when CC towers are added (post-PoC).
- **EnergySystem**: pure arithmetic, no RNG (`EnergySystem.ts:1-68`).
- **FP ordering**: damage `Math.round`'ed (`TowerSystem.ts:514,529`) and floored at apply (`UnitSystem.ts:483`). Integer-stable for archer L1 vs battle_robot armor 5.

### 3.7 Invariants NOT derivable from source alone
1. Damage to base on reach (lives in CoreOrchestrator/CastleWallSystem, outside read set).
2. Energy regen during prep (gating in CoreOrchestrator).
3. Whether (3,14) is a legal placement on Phase 2 PoC map (see §4).
4. Exact `waveClearMs` (depends on projectile flight time, cadence, pathfinding).
5. PoC unit identity — `battle_robot` vs custom "orc" SO (plan ambiguous).
6. Wave-1 spawn interval used in PoC (300ms default vs custom).

→ Treat §3.5 numbers as **bounds**, not point-equalities. Task 7 validates against actual Phaser run before locking the fixture's `expected` block.

---

## 4. Open questions / PoC overrides — IMPLEMENTER DECISIONS

The plan and the Phaser source disagree in 5 places. These MUST be resolved before Task 2's fixture or Task 3's MinimalGridManager freezes a contract.

| # | Topic | Plan says | Phaser source says | Resolution for Phase 2 |
|---|---|---|---|---|
| OQ-1 | Grid columns | **8** cols × 18 rows | **9** cols × 18 rows (`maps.ts:37`) | **Use 8 cols for PoC.** Document as "PoC simplification — Phase 3 promotes to 9 cols matching shipped". `MapLayoutSO` for Slice2 = stripped 8×18 variant (NOT `main_long`). |
| OQ-2 | Map id | "8×18 grid" (no id) | `main_long` is the only registered map | **Create `slice2_poc` MapLayoutSO**, 8×18, simple straight-or-L path that does NOT cross (3,14). Path proposal: spawn `(0,0)` → descend col 0 to row 17 → traverse row 17 to col 7 → ascend col 7 to row 0 → exit `(7,0)`. Total ≈ 33 cells; spawn-to-exit at 1.5 t/s ≈ 22s. |
| OQ-3 | Archer placement | `(col=3, row=14)` | (3,14) is on `main_long` path → blocked | With OQ-2's slice2_poc path, (3,14) is buildable. **Keep (3,14)**. Verify `MinimalGridManager.IsBlocked((3,14)) == false` in Task 3 EditMode test. |
| OQ-4 | Archer cost | "Place Archer (⚡10)" | `TIER_COST[1] = 20` | **Use ⚡20** (matches source). Plan's "⚡10" is wrong; correct in `Slice2Hud.uxml` button label. |
| OQ-5 | PoC unit | "orc" | No "orc" SO; `battle_robot` ("오크 전사") is the closest ID-match unit | **Use `battle_robot`** (HP 80, speed 1.5 t/s, armor 5). Document fixture as `unitId: "battle_robot"` not `"orc"`. |

**Also flagged for Task 7 runtime validation (not blocking earlier tasks):**
- Energy regen during prep (need to confirm Phaser actually gates regen, since gating logic isn't in WaveSystem itself).
- Damage-to-base on `reachedExit` (need value for Phase 3 base-HP wiring; Phase 2 HUD shows base HP but PoC orcs may all die before reaching base).

---

## 5. Cross-cutting summary — guidance for Task 2/3 implementer

1. **POCO + View split is non-negotiable.** `TowerInstance`/`UnitInstance` are plain C# classes. If the implementer writes `class TowerInstance : MonoBehaviour`, the headless replay runner is blocked and Task 6 fails.
2. **All systems take `Tick(float dt)`.** No internal `Time.deltaTime`. No `Coroutine`. No `WaitForSeconds`. Decrement explicit float timers.
3. **All RNG is injected.** `System.Random(12345)` passed to UnitSystem at construction. Never `UnityEngine.Random`. Replay seed flows from fixture → runner → systems.
4. **Construction order = Grid → Energy → Units → Towers → Waves.** Tick order = Energy → Wave → Units → Towers → Views.
5. **Use plain C# events for inter-system messaging.** Not SO channels, not static class. Subscribe in `Slice2SceneController.Awake()` after construction.
6. **PoC map = `slice2_poc` MapLayoutSO, 8×18, straight L-path avoiding (3,14).** Do NOT reuse `main_long`.
7. **Archer cost = ⚡20** (not the plan's ⚡10). PoC unit = `battle_robot`.
8. **Fixture metric bounds, not point values:**
   - `kills: 5` (point — lower bound on success)
   - `totalDamage: 400 ± 5%` (i.e., 380–420)
   - `waveClearMs: 12000–22000` post-first-spawn (broad bound; tighten in Task 7 with real Phaser run)
   - `energyPeak: 75–80` (depending on prep-regen gating)
9. **Anti-pattern watchlist (§1.5)** is a code-review checklist for the spec-compliance reviewer subagent.

---

## 6. References

- Plan: `docs/superpowers/plans/2026-04-24-unity-phase-2-poc-vertical-slice.md`
- Spec: `docs/superpowers/specs/2026-04-24-unity-migration-design.md`
- Phase 1 baseline: `docs/unity-migration/phase-1-design-decisions.md`
- Phaser systems read: `packages/phaser-game/src/systems/{Wave,Tower,Unit,Energy,Pathfinding}System.ts`
- Phaser data read: `packages/shared/src/constants/{towers,units,energy,waves,scaling,maps,meta}.ts`, `packages/shared/src/data/waves.ts`
- Subagent persona files: `.claude/agents/{unity-architect,technical-artist,game-designer}.md`

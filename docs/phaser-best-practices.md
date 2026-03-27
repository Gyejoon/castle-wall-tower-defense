# Phaser.js 100 Best Practices (Phaser 3.80+ / 3.87)

Comprehensive guide organized by 20 categories. All practices are actionable and specific to Phaser 3.x.

---

## 1. Project Structure & Architecture (Practices 1-5)

**1. Use the official Phaser + Vite + TypeScript template as your starting point.**
Clone `phaserjs/template-vite-ts` for standalone games or `phaserjs/template-react-ts` for React integration. These templates include hot-reloading, proper TypeScript config, and production build scripts out of the box.

```bash
# Standalone
git clone https://github.com/phaserjs/template-vite-ts.git
# React integration
git clone https://github.com/phaserjs/template-react-ts.git
```

**2. Organize your source code by feature/domain, not by file type.**
Instead of flat folders like `sprites/`, `scenes/`, `utils/`, group by game domain:

```
src/
├── game/
│   ├── config.ts          # Phaser.Types.Core.GameConfig
│   ├── EventBus.ts        # Cross-boundary event emitter
│   └── main.ts            # new Phaser.Game(config)
├── scenes/
│   ├── Boot.ts            # Minimal boot, load loading-screen assets
│   ├── Preloader.ts       # Load all game assets, show progress bar
│   ├── MainMenu.ts
│   ├── Game.ts
│   └── HUD.ts             # Parallel scene for UI overlay
├── entities/
│   ├── towers/            # Tower classes, configs, pools
│   ├── units/             # Unit classes, AI, pools
│   └── projectiles/
├── systems/               # ECS-style systems or managers
│   ├── GridManager.ts
│   ├── PathfindingSystem.ts
│   └── WaveManager.ts
├── shared/                # Types, constants (or import from monorepo)
└── utils/
```

**3. In a monorepo, keep Phaser as a dependency of the game package only.**
Your shared types package should have zero runtime dependencies. The web-shell (React) should import Phaser types only if needed via `import type`. Keep the Phaser runtime isolated to the game package.

```json
// packages/phaser-game/package.json
{
  "dependencies": {
    "phaser": "^3.87.0"
  }
}
// packages/shared/package.json -- NO phaser dependency
// packages/web-shell/package.json -- NO phaser dependency (only loads the built game)
```

**4. Define your Phaser GameConfig in a dedicated typed file, not inline.**
This enables reuse across environments (dev, test, production) and keeps the config discoverable.

```typescript
// src/game/config.ts
import { Types } from 'phaser';

export const gameConfig: Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 640,
  height: 640,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: import.meta.env.DEV },
  },
  scene: [], // Scenes added programmatically
};
```

**5. Use a strict tsconfig.json with Phaser's type definitions.**
Enable `strict: true`, set `moduleResolution: "bundler"` for Vite compatibility, and ensure Phaser types are resolved automatically (they ship in the `phaser` npm package under `types/`).

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["phaser"]
  }
}
```

---

## 2. Scene Management (Practices 6-10)

**6. Use a Boot -> Preloader -> Menu -> Game scene chain.**
Boot loads only the assets needed for the loading screen (a logo, a progress bar sprite). Preloader loads everything else and shows progress. This prevents a blank screen during loading.

```typescript
// Boot.ts
export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    this.load.image('logo', 'assets/logo.png');
  }
  create() {
    this.scene.start('Preloader');
  }
}
```

**7. Pass data between scenes using the `init()` method, not global variables.**
`this.scene.start('Game', { level: 3, difficulty: 'hard' })` passes data to the target scene's `init(data)` method. This keeps data flow explicit and traceable.

```typescript
// Launching:
this.scene.start('Game', { level: 3, score: 1500 });

// Receiving:
export class Game extends Phaser.Scene {
  init(data: { level: number; score: number }) {
    this.currentLevel = data.level;
    this.score = data.score;
  }
}
```

**8. Use parallel scenes for HUD/UI overlays instead of mixing UI into the game scene.**
Launch the HUD scene alongside the game scene. This separates game logic from UI rendering and allows the HUD camera to remain static while the game camera scrolls.

```typescript
create() {
  this.scene.launch('HUD', { lives: 3 });
  // HUD runs in parallel, rendered on top
}
```

**9. Use the Game Registry for persistent cross-scene data (score, currency, settings).**
`this.registry.set('gold', 500)` is accessible from any scene. Listen for changes with `this.registry.events.on('changedata-gold', callback)`.

```typescript
// In any scene:
this.registry.set('gold', this.registry.get('gold') - towerCost);

// In HUD scene:
this.registry.events.on('changedata-gold', (_parent: any, value: number) => {
  this.goldText.setText(`Gold: ${value}`);
});
```

**10. Use a custom EventEmitter for decoupled scene-to-scene communication.**
Create a shared EventEmitter instance (not tied to any scene) for events that span multiple scenes. This avoids tight coupling between scenes.

```typescript
// src/game/EventBus.ts
import { Events } from 'phaser';
export const EventBus = new Events.EventEmitter();

// In Game scene:
EventBus.emit('tower-placed', { x: 5, y: 10, type: 'laser' });

// In HUD scene:
EventBus.on('tower-placed', (data) => { /* update UI */ });
```

---

## 3. Game Loop & Performance (Practices 11-15)

**11. Always multiply movement by `delta` for frame-rate independent behavior.**
The `update(time, delta)` method receives delta in milliseconds. Divide by 1000 if you work in units-per-second.

```typescript
update(time: number, delta: number) {
  const dt = delta / 1000; // seconds
  this.enemy.x += this.enemy.speed * dt;
}
```

**12. Use Phaser's built-in delta smoothing; do not disable it without reason.**
Phaser smooths delta values to prevent spikes after tab switches. Leave `fps.smoothStep: true` (default) enabled. Only set a target FPS (`fps.target: 60`) if you need to cap frame rate for consistency.

**13. Avoid creating objects inside the `update()` loop.**
Never call `new`, `this.add.sprite()`, or allocate arrays/objects in `update()`. Pre-allocate in `create()` and reuse via object pooling. Object creation in update is the #1 cause of GC stutter.

```typescript
// BAD:
update() {
  const pos = new Phaser.Math.Vector2(this.x, this.y); // allocation every frame
}

// GOOD:
private _tempVec = new Phaser.Math.Vector2();
update() {
  this._tempVec.set(this.x, this.y); // reuse
}
```

**14. Use `this.time.addEvent()` for periodic actions instead of frame-counting in `update()`.**
Timer events are cleaner than manual counters and automatically respect scene pause/resume.

```typescript
this.time.addEvent({
  delay: 2000,           // ms
  callback: this.spawnWave,
  callbackScope: this,
  loop: true,
});
```

**15. Limit physics calculations to objects that need them.**
Disable physics bodies on inactive or off-screen objects. For a tower defense, towers do not need physics bodies -- only projectiles and units need them for collision detection.

```typescript
// Disable body when off-screen or pooled
bullet.body.enable = false;
bullet.setActive(false).setVisible(false);
```

---

## 4. Asset Management (Practices 16-22)

**16. Use texture atlases instead of individual image files.**
Pack sprites into atlases with TexturePacker or free tools like Shoebox. One atlas draw call vs. N individual image draw calls is a massive WebGL performance win.

```typescript
// preload
this.load.atlas('towers', 'assets/towers.png', 'assets/towers.json');
// usage
this.add.sprite(x, y, 'towers', 'laser_tower_01');
```

**17. Load assets only in Preloader scenes, never in `update()`.**
The Phaser Loader is designed for `preload()` or explicit `this.load.start()` calls. Loading assets during gameplay causes frame drops.

**18. Use `this.load.on('progress', callback)` to build a loading bar.**
Show loading progress to the user during the Preloader scene.

```typescript
preload() {
  const bar = this.add.rectangle(320, 320, 0, 30, 0x00ff00);
  this.load.on('progress', (value: number) => {
    bar.width = 400 * value;
  });
  // ... load all assets
}
```

**19. Use `this.load.setPath()` to set a base path and keep load calls clean.**

```typescript
preload() {
  this.load.setPath('assets/');
  this.load.image('tile_grass', 'tiles/grass.png');
  this.load.atlas('units', 'units/units.png', 'units/units.json');
}
```

**20. Use audio sprites (combined audio files) to reduce HTTP requests.**
Similar to texture atlases, audio sprites combine multiple sounds into one file with a JSON marker map.

```typescript
this.load.audioSprite('sfx', 'audio/sfx.json', ['audio/sfx.ogg', 'audio/sfx.mp3']);
// play
this.sound.playAudioSprite('sfx', 'explosion');
```

**21. Provide multiple audio formats (ogg + mp3) for cross-browser compatibility.**
Not all browsers support the same codecs. Phaser picks the first supported format.

```typescript
this.load.audio('bgm', ['audio/bgm.ogg', 'audio/bgm.mp3']);
```

**22. Destroy textures and clear caches when transitioning between major game sections.**
For large games, call `this.textures.remove(key)` for assets no longer needed to free GPU memory.

---

## 5. Physics (Practices 23-27)

**23. Default to Arcade Physics; only use Matter.js when you need complex shapes.**
Arcade Physics uses an RTree for fast spatial queries and handles AABB/circle collisions efficiently. Matter.js is significantly more expensive. For a grid-based tower defense, Arcade is almost always sufficient.

```typescript
// GameConfig
physics: {
  default: 'arcade',
  arcade: {
    gravity: { x: 0, y: 0 }, // top-down: no gravity
    debug: false,
  },
}
```

**24. Use Static Bodies for immovable objects (towers, walls, obstacles).**
Static bodies skip velocity calculations entirely, reducing physics overhead.

```typescript
const tower = this.physics.add.staticImage(x, y, 'tower');
```

**25. Use collision categories/groups to reduce unnecessary collision checks.**
If projectiles should only hit enemies (not towers or other projectiles), use `setCollisionGroup()` and `setCollidesWith()`.

```typescript
// With Arcade, use separate groups + specific overlap checks:
this.physics.add.overlap(this.bulletGroup, this.enemyGroup, this.onBulletHitEnemy, undefined, this);
// This only checks bullet-vs-enemy, not bullet-vs-bullet
```

**26. Disable debug rendering in production.**
Physics debug drawing is expensive. Conditionally enable it based on environment.

```typescript
arcade: {
  debug: import.meta.env.DEV, // false in production
}
```

**27. For range detection in tower defense, use `Phaser.Math.Distance.Between()` instead of physics overlap circles.**
Simple distance checks are cheaper than creating physics bodies just for range detection.

```typescript
update() {
  for (const enemy of this.enemies.getChildren()) {
    const dist = Phaser.Math.Distance.Between(tower.x, tower.y, enemy.x, enemy.y);
    if (dist <= tower.range) {
      tower.target = enemy;
      break;
    }
  }
}
```

---

## 6. Input Handling (Practices 28-32)

**28. Use Phaser's unified pointer system for cross-device compatibility.**
Phaser merges mouse and touch into one `pointer` API. Listen for `pointerdown`, `pointerup`, `pointermove` -- they work identically on desktop and mobile.

```typescript
this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
  const gridX = Math.floor(pointer.worldX / TILE_SIZE);
  const gridY = Math.floor(pointer.worldY / TILE_SIZE);
  this.placeTower(gridX, gridY);
});
```

**29. For grid-based games, convert pointer world coordinates to grid coordinates in a single utility function.**

```typescript
function worldToGrid(worldX: number, worldY: number, tileSize: number): { col: number; row: number } {
  return {
    col: Math.floor(worldX / tileSize),
    row: Math.floor(worldY / tileSize),
  };
}
```

**30. Use `this.input.keyboard.addKeys()` for multiple key bindings.**

```typescript
const keys = this.input.keyboard!.addKeys({
  up: Phaser.Input.Keyboard.KeyCodes.W,
  down: Phaser.Input.Keyboard.KeyCodes.S,
  pause: Phaser.Input.Keyboard.KeyCodes.ESC,
  speed: Phaser.Input.Keyboard.KeyCodes.SPACE,
}) as Record<string, Phaser.Input.Keyboard.Key>;
```

**31. Enable input on Game Objects explicitly -- it is off by default.**
Call `gameObject.setInteractive()` to enable click/tap detection. Use hit areas for non-rectangular shapes.

```typescript
tower.setInteractive({ useHandCursor: true });
tower.on('pointerdown', () => this.showTowerMenu(tower));
```

**32. For drag-and-drop tower placement, use Phaser's built-in drag events.**

```typescript
this.input.setDraggable(towerGhost);
this.input.on('drag', (pointer, obj, dragX, dragY) => {
  obj.x = Math.round(dragX / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
  obj.y = Math.round(dragY / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
});
```

---

## 7. UI/HUD (Practices 33-37)

**33. Use BitmapText instead of Text for frequently updated displays (score, gold, wave counter).**
BitmapText is rendered from a pre-made texture and is extremely fast under WebGL. Regular `Text` objects re-rasterize a canvas texture every time the text changes.

```typescript
// Preload a bitmap font
this.load.bitmapFont('pixel', 'fonts/pixel.png', 'fonts/pixel.xml');
// Create
this.goldText = this.add.bitmapText(10, 10, 'pixel', 'Gold: 500', 16);
// Update (fast, no texture rebuild)
this.goldText.setText(`Gold: ${newGold}`);
```

**34. Use a DOM overlay (React/HTML) for complex UI; use in-game Phaser objects for HUD elements that move with the game world.**
Menus, modals, shop screens, and tooltips are better as HTML/React components overlaid on the canvas. Health bars, range indicators, and floating damage numbers should be Phaser objects.

**35. For a React + Phaser setup, let React own all UI state and Phaser own all game state.**
React renders menus, lobby, settings. Phaser renders the game canvas. Communication goes through the EventBus.

**36. Use `setScrollFactor(0)` on HUD elements in the game scene if you are not using a separate HUD scene.**
This pins them to the screen regardless of camera scroll.

```typescript
const goldText = this.add.bitmapText(10, 10, 'pixel', 'Gold: 500', 16);
goldText.setScrollFactor(0);
goldText.setDepth(1000); // Ensure it renders on top
```

**37. Use Nine-Slice sprites for resizable UI panels and buttons.**
Phaser 3.60+ supports `this.add.nineslice()` natively, allowing you to create panels that scale without distorting corners.

```typescript
const panel = this.add.nineslice(400, 300, 'ui-panel', undefined, 300, 200, 16, 16, 16, 16);
```

---

## 8. Audio (Practices 38-42)

**38. Always handle the Web Audio context unlock requirement.**
Mobile browsers require a user gesture before audio can play. Phaser handles this automatically by default, but verify by listening for the `unlocked` event on the sound manager.

```typescript
if (this.sound.locked) {
  this.sound.once('unlocked', () => {
    this.playBackgroundMusic();
  });
} else {
  this.playBackgroundMusic();
}
```

**39. Use `pauseOnBlur: true` (default) to auto-suspend audio when the tab is not active.**
This prevents audio from playing in the background and saves resources. Only set `pauseOnBlur: false` if you have a specific reason (e.g., a music player game).

**40. Use Phaser's Spatial Audio for positional sound effects.**
Since Phaser 3.60, you can set `spatialSound: true` on sounds and position them in 2D space. Call `sound.setPosition(x, y)` and `this.sound.setListenerPosition(camX, camY)`.

```typescript
const explosion = this.sound.add('explosion', { spatialSound: true });
explosion.setPosition(enemy.x, enemy.y);
explosion.play();
```

**41. Keep background music as a separate, globally managed sound instance.**
Use `this.sound.add('bgm', { loop: true, volume: 0.3 })` in the Boot or Preloader scene and persist it across scenes. Do not recreate it per scene.

**42. Provide volume controls and a mute toggle accessible from any screen.**
Store volume preferences in `localStorage` and apply them via `this.sound.volume = savedVolume` at game start.

---

## 9. State Management (Practices 43-47)

**43. Separate game state (model) from visual representation (view).**
Keep a pure data model for your grid, towers, units, and wave state. The Phaser scene reads this model and creates/updates sprites accordingly. This enables testing the model without Phaser.

```typescript
// Pure data model (testable without Phaser)
interface GridState {
  cells: CellType[][];
  towers: Map<string, TowerData>;
  units: UnitData[];
}

// Phaser scene reads and visualizes this
class GameScene extends Phaser.Scene {
  private state: GridState;
}
```

**44. Use bitECS for complex games with many entities.**
bitECS is the ECS library being adopted for Phaser 4 development. It provides cache-friendly, high-performance entity management. It works well alongside Phaser 3 today.

```typescript
import { createWorld, defineComponent, defineQuery, addEntity, addComponent } from 'bitecs';

const Position = defineComponent({ x: Types.f32, y: Types.f32 });
const Health = defineComponent({ current: Types.i32, max: Types.i32 });

const world = createWorld();
const eid = addEntity(world);
addComponent(world, Position, eid);
Position.x[eid] = 100;
```

**45. Implement save/load by serializing your data model to JSON, not Phaser objects.**
Phaser Game Objects have circular references and cannot be serialized. Keep a clean data model that can be `JSON.stringify()`-ed.

```typescript
function saveGame(state: GridState): void {
  localStorage.setItem('save', JSON.stringify(state));
}
function loadGame(): GridState {
  return JSON.parse(localStorage.getItem('save')!);
}
```

**46. Use Zustand, Jotai, or a simple pub/sub store for React-side state that needs to sync with Phaser.**
Do not try to use React state inside Phaser. Use the EventBus to push state changes from Phaser to the React store and vice versa.

**47. For multiplayer games, treat the server state as the source of truth and Phaser as a rendering client.**
The client should interpolate/extrapolate server state for smooth visuals, but never trust local state for game logic.

---

## 10. Tilemaps & Grid-Based Games (Practices 48-53)

**48. For a programmatic grid (not Tiled), use a 2D array as your data structure and render with Graphics or Sprites.**

```typescript
const GRID_W = 20, GRID_H = 20, TILE_SIZE = 32;
const grid: number[][] = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(0));

// Render
for (let row = 0; row < GRID_H; row++) {
  for (let col = 0; col < GRID_W; col++) {
    this.add.rectangle(
      col * TILE_SIZE + TILE_SIZE / 2,
      row * TILE_SIZE + TILE_SIZE / 2,
      TILE_SIZE - 1, TILE_SIZE - 1,
      grid[row][col] === 0 ? 0x2d2d2d : 0x00ff00
    );
  }
}
```

**49. For Tiled-based maps, use `this.make.tilemap()` with JSON exports and separate layers for ground, obstacles, and decorations.**

```typescript
const map = this.make.tilemap({ key: 'level1' });
const tileset = map.addTilesetImage('terrain', 'terrain-img');
const ground = map.createLayer('Ground', tileset!);
const walls = map.createLayer('Walls', tileset!);
walls!.setCollisionByProperty({ collides: true });
```

**50. Use EasyStar.js or a custom A* for grid-based pathfinding.**
EasyStar integrates cleanly with Phaser tilemaps. Feed it a 2D cost array derived from your grid.

```typescript
import EasyStar from 'easystarjs';

const finder = new EasyStar.js();
finder.setGrid(gridCostArray);
finder.setAcceptableTiles([0]); // 0 = walkable
finder.findPath(startX, startY, endX, endY, (path) => {
  if (path) this.moveUnitAlongPath(unit, path);
});
finder.calculate();
```

**51. For large maps, consider navmeshes instead of A* for 5x-150x faster pathfinding.**
The `phaser-navmesh` plugin by Mike Westhad converts walkable areas into a navigation mesh, dramatically reducing search nodes.

**52. Cache pathfinding results when the grid does not change.**
In a tower defense, recalculate paths only when a tower is placed or removed, not every frame.

```typescript
private cachedPath: { col: number; row: number }[] | null = null;

onTowerPlaced() {
  this.cachedPath = null; // Invalidate
}

getPath(): Path {
  if (!this.cachedPath) {
    this.cachedPath = this.pathfinder.findPath(spawn, exit);
  }
  return this.cachedPath;
}
```

**53. Mark tiles as walkable/blocked using a property on the tile data, not by checking sprite existence.**
Keep a `walkable: boolean` grid parallel to (or part of) your tilemap data. This is faster and decouples logic from rendering.

---

## 11. Object Pooling & Memory Management (Practices 54-58)

**54. Use `Phaser.GameObjects.Group` with `classType` and `maxSize` as your object pool.**
Groups are Phaser's built-in pooling mechanism.

```typescript
this.bulletPool = this.add.group({
  classType: Bullet,
  maxSize: 100,
  runChildUpdate: true, // calls update() on active children
});

// Acquire from pool
const bullet = this.bulletPool.get(x, y, 'bullet') as Bullet;
if (bullet) {
  bullet.fire(target);
}
```

**55. Deactivate pooled objects with `setActive(false).setVisible(false)` and disable their physics body.**

```typescript
despawn() {
  this.setActive(false);
  this.setVisible(false);
  if (this.body) {
    (this.body as Phaser.Physics.Arcade.Body).stop();
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
  }
}
```

**56. Use `group.get()` which automatically reuses inactive members before creating new ones.**
This is the core of Phaser's pool pattern. `get()` returns the first inactive member, or creates a new one if the pool is not at max size.

**57. Pre-warm pools in `create()` by spawning and immediately deactivating objects.**

```typescript
for (let i = 0; i < 50; i++) {
  const bullet = this.bulletPool.get(0, 0, 'bullet') as Bullet;
  bullet.despawn(); // immediately return to pool
}
```

**58. Never rely on `destroy()` in hot paths -- prefer deactivation.**
`destroy()` triggers GC and event listener cleanup. In frequently spawned/despawned entities (bullets, particles, damage numbers), always use pool recycling instead.

---

## 12. Animation (Practices 59-63)

**59. Define all animations globally in the Preloader scene, not per-sprite.**
Phaser's AnimationManager is global. Define once, use everywhere.

```typescript
// In Preloader.create()
this.anims.create({
  key: 'enemy_walk',
  frames: this.anims.generateFrameNames('units', {
    prefix: 'scout_walk_',
    start: 0,
    end: 5,
    zeroPad: 2,
  }),
  frameRate: 10,
  repeat: -1,
});
```

**60. Use texture atlas frames for animations instead of separate sprite sheet files.**
Atlas-based animations are more efficient (single texture bind) and easier to manage.

**61. Use tweens for non-sprite-sheet animations (movement, scaling, fading, UI transitions).**

```typescript
this.tweens.add({
  targets: tower,
  scaleX: 1.2,
  scaleY: 1.2,
  duration: 100,
  yoyo: true,
  ease: 'Sine.easeInOut',
});
```

**62. Chain tweens with `onComplete` or use tween chains for complex sequences.**

```typescript
this.tweens.chain({
  targets: enemy,
  tweens: [
    { x: 200, duration: 500 },
    { y: 400, duration: 300 },
    { alpha: 0, duration: 200 },
  ],
  onComplete: () => enemy.despawn(),
});
```

**63. For skeletal animation (Spine), use the official Phaser Spine plugin and load Spine assets in preload.**
Only include the Spine plugin if your game actually uses skeletal animation -- it adds significant bundle size.

---

## 13. Camera System (Practices 64-68)

**64. Set camera bounds to prevent scrolling beyond the game world.**

```typescript
this.cameras.main.setBounds(0, 0, GRID_W * TILE_SIZE, GRID_H * TILE_SIZE);
```

**65. Use `camera.startFollow()` with lerp for smooth following.**

```typescript
this.cameras.main.startFollow(player, true, 0.1, 0.1);
// lerp values < 1 create a smooth "easing" follow effect
```

**66. Implement pinch-to-zoom and scroll-wheel zoom for strategy/TD games.**

```typescript
this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
  const cam = this.cameras.main;
  cam.zoom = Phaser.Math.Clamp(cam.zoom - deltaY * 0.001, 0.5, 2);
});
```

**67. Use `camera.shake()` for impact feedback, with short duration and low intensity.**

```typescript
this.cameras.main.shake(150, 0.005); // 150ms, very subtle
```

**68. Use a separate camera for the HUD (or a separate HUD scene) to prevent HUD elements from zooming/scrolling with the main camera.**

```typescript
// In a single-scene approach:
const hudCam = this.cameras.add(0, 0, 640, 640);
hudCam.ignore(this.gameLayer); // Only sees HUD objects
this.cameras.main.ignore(this.hudLayer); // Main cam ignores HUD
```

---

## 14. Networking & Multiplayer (Practices 69-73)

**69. Use a lightweight EventBus to decouple network messages from game logic.**
Network events go through the bus; game systems subscribe. This makes it easy to swap transport layers (WebSocket, WebRTC, mock).

```typescript
// NetworkManager.ts
socket.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  EventBus.emit(`net:${msg.type}`, msg.payload);
};

// GameScene.ts
EventBus.on('net:unit-spawned', (data) => { this.spawnEnemyUnit(data); });
```

**70. Run game logic on the server (authoritative server pattern) for competitive multiplayer.**
The client sends inputs; the server simulates and broadcasts state. The client interpolates between server snapshots for smooth rendering.

**71. Implement client-side prediction for the local player's actions.**
Apply the player's tower placement immediately on the client, then reconcile when the server confirms or rejects.

**72. Use binary protocols (MessagePack, FlatBuffers) instead of JSON for high-frequency state updates.**
JSON parsing is expensive at 30-60 messages/second. Binary formats are 2-10x smaller and faster to decode.

**73. Implement a reconnection strategy with state reconciliation.**
On disconnect, attempt reconnect with exponential backoff. On reconnect, request the full game state snapshot from the server to resync.

---

## 15. Testing (Practices 74-78)

**74. Separate pure game logic from Phaser dependencies for easy unit testing.**
If your pathfinding, damage calculation, and wave logic are pure TypeScript functions/classes, you can test them with Vitest/Jest without mocking Phaser at all.

```typescript
// src/systems/DamageCalc.ts -- ZERO Phaser imports
export function calculateDamage(attack: number, defense: number): number {
  return Math.max(1, attack - defense);
}

// tests/DamageCalc.test.ts
import { calculateDamage } from '../src/systems/DamageCalc';
test('minimum damage is 1', () => {
  expect(calculateDamage(5, 100)).toBe(1);
});
```

**75. Use Vitest (not Jest) for Phaser + Vite projects -- it shares the Vite config and requires no extra setup for TypeScript/ESM.**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
});
```

**76. Mock Phaser's canvas and WebGL context in test setup.**

```typescript
// tests/setup.ts
import 'vitest-canvas-mock'; // or jest-canvas-mock
// Mock requestAnimationFrame
global.requestAnimationFrame = (cb) => setTimeout(cb, 0) as any;
```

**77. Test scene transitions and data passing by instantiating scenes programmatically in tests.**
You can create a headless Phaser.Game in tests with `type: Phaser.HEADLESS` to test scene logic without rendering.

```typescript
const game = new Phaser.Game({
  type: Phaser.HEADLESS,
  scene: [TestScene],
  callbacks: {
    postBoot: () => { /* run assertions */ },
  },
});
```

**78. Use integration tests for critical game flows (place tower -> path recalculates -> units reroute).**
These tests exercise multiple systems together. Keep them separate from unit tests and run them less frequently.

---

## 16. Build & Deployment (Practices 79-83)

**79. Use Vite as your bundler -- it is the officially recommended tool for Phaser 3.**
Vite offers faster dev server startup, HMR, and simpler config than Webpack for Phaser projects.

**80. Strip unused renderers to reduce bundle size.**
If you only target WebGL (the vast majority of modern browsers), exclude the Canvas renderer:

```typescript
// vite.config.ts
export default defineConfig({
  define: {
    'WEBGL_RENDERER': true,
    'CANVAS_RENDERER': false,
  },
});
```

**81. Use Phaser's custom build system for maximum bundle size reduction.**
The `phaserjs/custom-build` repo lets you include only the Phaser modules you use. A minimal build can be as small as ~150KB min+gz vs. ~400KB for the full build.

**82. Enable gzip/brotli compression on your static file server.**
Phaser's minified JS compresses extremely well. Brotli typically achieves 20-30% better compression than gzip for JavaScript.

**83. Put large assets (audio, texture atlases) on a CDN with cache headers.**
Use content-hashed filenames (Vite does this by default for imports) and set long `Cache-Control` headers.

---

## 17. Mobile Optimization (Practices 84-88)

**84. Use `Phaser.Scale.FIT` with `autoCenter: CENTER_BOTH` for responsive mobile scaling.**

```typescript
scale: {
  mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  width: 640,
  height: 960, // portrait for mobile TD
}
```

**85. Handle device pixel ratio (DPR) to avoid blurry rendering on Retina/HiDPI screens.**
Either render at native resolution by multiplying canvas size by `window.devicePixelRatio`, or provide @2x assets. Be cautious -- higher DPR means more pixels to fill per frame.

```typescript
// Option A: Let Phaser handle it (default behavior)
// Option B: Explicit control
const dpr = Math.min(window.devicePixelRatio, 2); // Cap at 2x
// Adjust game config width/height accordingly
```

**86. Make touch targets at least 48x48px per WCAG guidelines.**
UI buttons and interactive grid cells should be large enough for fingers. For a 32px grid, consider making the interactive hit area larger than the visual tile.

**87. Handle orientation changes by listening to `this.scale.on('resize', callback)`.**

```typescript
this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
  this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
  // Reposition UI elements
});
```

**88. Reduce draw calls on mobile: use fewer texture atlases (ideally one or two), avoid excessive particle counts, and use simpler shaders.**
Mobile GPUs are fill-rate limited. Keep your total unique textures per frame under 8-10 for smooth 60fps.

---

## 18. Debug & Dev Tools (Practices 89-92)

**89. Add an FPS counter during development using Phaser's built-in metrics or the `phaser-debug-tool` Chrome extension.**

```typescript
// Simple FPS display
create() {
  this.fpsText = this.add.text(10, 10, '', { fontSize: '14px', color: '#00ff00' });
  this.fpsText.setScrollFactor(0).setDepth(9999);
}
update() {
  this.fpsText.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`);
}
```

**90. Enable Arcade Physics debug mode only in development.**
Set `arcade: { debug: true }` to see collision bodies, velocity vectors, and overlap areas rendered on screen.

**91. Use the Phaser Debug Tool browser extension for real-time scene inspection.**
It provides: scene list, display list inspection, game object property editing, FPS monitoring, and texture viewing. Install from the Chrome Web Store.

**92. Log all EventBus events during development with a global listener.**

```typescript
if (import.meta.env.DEV) {
  const originalEmit = EventBus.emit.bind(EventBus);
  EventBus.emit = (event: string, ...args: any[]) => {
    console.log(`[EventBus] ${event}`, ...args);
    return originalEmit(event, ...args);
  };
}
```

---

## 19. TypeScript-Specific Patterns (Practices 93-97)

**93. Create typed event maps for type-safe event emitting and listening.**
Phaser's EventEmitter is untyped by default. Wrap it with a typed interface.

```typescript
interface GameEvents {
  'tower-placed': { col: number; row: number; type: string };
  'unit-killed': { unitId: string; reward: number };
  'wave-started': { waveNumber: number };
}

class TypedEventBus {
  private emitter = new Phaser.Events.EventEmitter();

  emit<K extends keyof GameEvents>(event: K, data: GameEvents[K]) {
    this.emitter.emit(event, data);
  }

  on<K extends keyof GameEvents>(event: K, fn: (data: GameEvents[K]) => void, context?: any) {
    this.emitter.on(event, fn, context);
  }

  off<K extends keyof GameEvents>(event: K, fn: (data: GameEvents[K]) => void) {
    this.emitter.off(event, fn);
  }
}
```

**94. Use `import type` for Phaser types in non-game packages to avoid pulling Phaser into your bundle.**

```typescript
// In shared types package:
import type { Types } from 'phaser';
// This is erased at compile time, no runtime import
```

**95. Type your scene `init()` data with an interface.**

```typescript
interface GameSceneData {
  level: number;
  difficulty: 'easy' | 'normal' | 'hard';
  playerGold: number;
}

class GameScene extends Phaser.Scene {
  init(data: GameSceneData) {
    // TypeScript enforces correct data shape
  }
}
```

**96. Use `satisfies` for GameConfig to get type checking while preserving literal types.**

```typescript
const config = {
  type: Phaser.AUTO,
  width: 640,
  height: 640,
  scene: [Boot, Preloader, Game],
} satisfies Phaser.Types.Core.GameConfig;
```

**97. Create typed wrappers for `this.registry` get/set to avoid stringly-typed access.**

```typescript
const REGISTRY_KEYS = {
  GOLD: 'gold',
  LIVES: 'lives',
  WAVE: 'wave',
} as const;

function getGold(scene: Phaser.Scene): number {
  return scene.registry.get(REGISTRY_KEYS.GOLD) ?? 0;
}

function setGold(scene: Phaser.Scene, value: number): void {
  scene.registry.set(REGISTRY_KEYS.GOLD, value);
}
```

---

## 20. React + Phaser Integration Patterns (Practices 98-100)

**98. Use the official `phaserjs/template-react-ts` EventBus pattern for bidirectional communication.**
The pattern: React and Phaser share a single `EventBus` (Phaser EventEmitter instance). Phaser emits game events; React listens and updates UI. React emits UI commands; Phaser listens and executes.

```typescript
// EventBus.ts (shared singleton)
import { Events } from 'phaser';
export const EventBus = new Events.EventEmitter();

// In React component:
useEffect(() => {
  const handler = (data: { gold: number }) => setGold(data.gold);
  EventBus.on('gold-changed', handler);
  return () => { EventBus.off('gold-changed', handler); };
}, []);

// From React to Phaser:
const handleUpgrade = () => EventBus.emit('upgrade-tower', { towerId });

// In Phaser scene:
EventBus.on('upgrade-tower', (data) => { this.upgradeTower(data.towerId); });
```

**99. Mount Phaser in a React `useRef` container and manage the game lifecycle with `useEffect`.**
Create the Phaser.Game instance on mount, destroy it on unmount. Never create multiple game instances.

```typescript
const PhaserGame: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && !gameRef.current) {
      gameRef.current = new Phaser.Game({
        ...gameConfig,
        parent: containerRef.current,
      });
    }
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={containerRef} id="game-container" />;
};
```

**100. Emit a `current-scene-ready` event from Phaser scenes so React knows which scene is active and can render the appropriate UI.**

```typescript
// In each Phaser scene's create():
create() {
  // ... game setup
  EventBus.emit('current-scene-ready', this); // pass scene reference
}

// In React:
const [currentScene, setCurrentScene] = useState<string>('');
useEffect(() => {
  const handler = (scene: Phaser.Scene) => {
    setCurrentScene(scene.scene.key);
  };
  EventBus.on('current-scene-ready', handler);
  return () => { EventBus.off('current-scene-ready', handler); };
}, []);

// Conditionally render UI based on active scene
return (
  <>
    <div ref={containerRef} />
    {currentScene === 'Game' && <GameHUD />}
    {currentScene === 'MainMenu' && <MainMenuUI />}
  </>
);
```

---

## Sources

- [How I optimized my Phaser 3 action game -- in 2025](https://phaser.io/news/2025/03/how-i-optimized-my-phaser-3-action-game-in-2025)
- [Phaser + TypeScript + Vite Template](https://phaser.io/news/2024/01/phaser-vite-typescript-template)
- [Official Phaser 3 + React TypeScript Template](https://github.com/phaserjs/template-react-ts)
- [How to Communicate Between Scenes in Phaser 3](https://phaser.io/news/2021/07/how-to-communicate-between-scenes-in-phaser-3)
- [Cross Scene Communication (official docs)](https://docs.phaser.io/phaser/concepts/scenes/cross-scene-communication)
- [Game Optimization with Object Pools in Phaser 3](https://blog.ourcade.co/posts/2020/phaser-3-optimization-object-pool-class/)
- [Web Audio Best Practices for Games in Phaser 3](https://blog.ourcade.co/posts/2020/phaser-3-web-audio-best-practices-games/)
- [Pathfinding and Phaser 3 (EasyStar)](https://www.dynetisgames.com/2018/03/06/pathfinding-easystar-phaser-3/)
- [phaser-navmesh plugin](https://github.com/mikewesthad/navmesh)
- [Grid Movement Plugin for Phaser 3](https://phaser.discourse.group/t/phaser-3-grid-movement-plugin/9262)
- [Testing Phaser Games with Vitest](https://dev.to/davidmorais/testing-phaser-games-with-vitest-3kon)
- [Phaser 3 Custom Build repo](https://github.com/phaserjs/custom-build)
- [Phaser Debug Tool extension](https://github.com/Ariorh1337/phaser-debug-tool)
- [Building a Phaser 3 Game with ECS and React](https://blog.ourcade.co/posts/2023/building-phaser-3-ecs-game-with-reactjs/)
- [Phaser v3.87 released](https://phaser.io/news/2024/11/phaser-v387-and-v400-released)
- [Phaser v3.80 WebGL context loss/restore](https://phaser.io/news/2024/02/phaser-3.80.0-released)
- [Phaser Scenes (official docs)](https://docs.phaser.io/phaser/concepts/scenes)
- [Phaser Cameras (official docs)](https://docs.phaser.io/phaser/concepts/cameras)
- [Phaser Audio (official docs)](https://docs.phaser.io/phaser/concepts/audio)
- [Phaser Input (official docs)](https://docs.phaser.io/phaser/concepts/input)
- [Phaser Arcade Physics (official docs)](https://docs.phaser.io/phaser/concepts/physics/arcade)
- [Matter Physics Collision Filtering](https://blog.ourcade.co/posts/2020/phaser-3-matter-physics-collision-filter/)
- [BitmapText (official docs)](https://docs.phaser.io/phaser/concepts/gameobjects/bitmap-text)
- [Phaser Loader (official docs)](https://docs.phaser.io/phaser/concepts/loader)
- [Phaser TimeStep (official docs)](https://docs.phaser.io/api-documentation/class/core-timestep)
- [How to Create a Responsive Game for Any Screen Size with Phaser 3](https://www.xjavascript.com/blog/how-to-create-a-responsive-game-for-any-screen-size-with-phaser-3/)
- [Multiplayer Phaser 3 with Socket.io](https://gamedevacademy.org/create-a-basic-multiplayer-game-in-phaser-3-with-socket-io-part-1/)
- [Tower Defense Game with Phaser 3](https://gamedevacademy.org/how-to-make-tower-defense-game-with-phaser-3/)
- [Phaser EventEmitter typings issue #7249](https://github.com/phaserjs/phaser/issues/7249)

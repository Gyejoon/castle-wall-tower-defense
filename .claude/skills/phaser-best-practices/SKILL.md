---
name: phaser-best-practices
description: |
  Phaser.js 게임 아키텍처 패턴과 best practices 가이드. 시스템 설계, 씬 구조, TypedEventBus,
  게임 루프 순서, 메모리 관리, 클린업, 테스팅 전략을 안내한다. Phaser.js 프로젝트 작업,
  게임 시스템 생성, React+Phaser 통합, 게임 루프 구현 시 반드시 참고할 것.
  "phaser", "game system", "scene", "game loop", "tower defense", "EventBus",
  "Phaser cleanup", "게임 엔진", "그리드 게임" 등의 키워드에 트리거된다.
---

# Phaser.js Best Practices

이 프로젝트의 Phaser.js 아키텍처 패턴을 정리한 가이드. 새로운 시스템, 씬, 이벤트를 추가할 때 이 패턴을 따른다.

---

## 1. Scene Chain

씬은 `Boot → Preloader → Game` 순서로 체이닝한다.

- **Boot**: `this.scene.start('Preloader')`만 호출. 로직 없음.
- **Preloader**: 에셋 로딩. Graphics 기반 렌더링이면 바로 `this.scene.start('Game')`.
- **Game**: 모든 시스템 초기화 + 게임 루프 실행의 메인 씬.

Game 씬의 `create()`에서 반드시 shutdown 클린업을 등록한다:

```typescript
create() {
  // ... 시스템 초기화 ...
  this.events.on('shutdown', this.cleanup, this);
  // ... 나머지 설정 ...
}
```

이 패턴을 빠뜨리면 씬 재시작 시 이벤트 리스너가 중복 등록되어 메모리 누수가 발생한다.

---

## 2. System Architecture

게임 로직은 독립적인 **시스템 클래스**로 분리한다. 씬은 시스템의 오케스트레이터일 뿐이다.

### 설계 원칙

- **Scene-agnostic**: 시스템 생성자는 `Phaser.Scene`을 받는다. `GameScene`이 아님.
  이렇게 해야 시스템이 씬 간에 재사용 가능하다.
- **Dependency injection**: 시스템이 필요한 다른 시스템은 생성자로 주입받는다.
- **Data ownership**: 각 시스템이 자신의 엔티티 Map을 소유한다. 공유 가변 상태 없음.
- **Pure algorithm extraction**: 핵심 알고리즘은 클래스와 별개의 순수 함수로 export한다.
  클래스는 캐싱/라이프사이클만 래핑. 순수 함수는 Phaser 없이 테스트 가능.

```typescript
// 좋음: scene-agnostic + DI
class TowerSystem {
  constructor(
    scene: Phaser.Scene,           // Phaser.Scene, NOT GameScene
    gridManager: GridManager,       // DI
    pathfinding: PathfindingSystem, // DI
  ) {}
}

// 좋음: 순수 알고리즘을 별도 함수로 export
export function findPath(grid: number[][], start: Position, end: Position): Position[] | null {
  // A* 알고리즘 — Phaser 의존성 없음
}

export class PathfindingSystem {
  private cachedPath: Position[] | null = null;

  findPath(grid: number[][], start: Position, end: Position): Position[] | null {
    if (this.cachedPath) return this.cachedPath;
    this.cachedPath = findPath(grid, start, end); // 순수 함수 호출
    return this.cachedPath;
  }

  invalidateCache(): void {
    this.cachedPath = null;
  }
}
```

### 초기화 순서 (`scene.create()`)

순서가 중요하다. 의존성이 없는 시스템부터 생성한다:

1. 데이터 전용 시스템 생성 (GridManager, PathfindingSystem)
2. 렌더링 시스템 생성 — `scene`이 필요함 (TowerSystem, UnitSystem)
3. `this.events.on('shutdown', this.cleanup, this)` 등록
4. Graphics 객체 생성
5. 초기 상태 계산 (경로 등)
6. Input 핸들러 등록
7. EventBus 리스너 등록
8. `EventBus.emit('game-ready')` — 마지막에 호출

`game-ready`를 마지막에 emit하는 이유: React UI가 이 이벤트를 받고 게임과 상호작용을 시작하기 때문에, 모든 시스템이 준비된 후에만 보내야 한다.

### 시스템에 필수 구현

모든 시스템은 `destroy()` 메서드를 구현한다:

```typescript
destroy(): void {
  for (const entity of this.entities.values()) {
    entity.graphics.destroy(); // Phaser 객체 파괴
  }
  this.entities.clear(); // 컬렉션 비우기
}
```

---

## 3. TypedEventBus

React와 Phaser는 같은 JS 런타임에서 TypedEventBus를 통해 통신한다.

### 구조

```typescript
// GameEventMap: 모든 이벤트와 페이로드 타입 정의
export interface GameEventMap {
  // Game → React (상태 업데이트)
  'game-ready': undefined;
  'tower-placed': { col: number; row: number; towerId: string; success: boolean };
  'gold-changed': { gold: number };

  // React → Game (유저 액션)
  'request-place-tower': { col: number; row: number; towerDefId: string };
  'request-send-unit': { unitDefId: string; count: number };
}
```

### 명명 규칙

| 방향 | 접두사 | 예시 |
|---|---|---|
| React → Game (커맨드) | `request-*` | `request-place-tower`, `request-send-unit` |
| Game → React (상태) | 서술형 | `tower-placed`, `gold-changed`, `game-over` |
| 내부 라이프사이클 | 서술형 | `current-scene-ready` |

### 리스너 등록/해제

EventBus.off()로 정확히 제거하려면 **named function reference**를 사용해야 한다.
익명 람다로 등록하면 cleanup에서 제거할 수 없어 메모리 누수가 발생한다.

```typescript
// 좋음: named reference 저장
private onPlaceTower!: (data: { col: number; row: number; towerDefId: string }) => void;

create() {
  this.onPlaceTower = (data) => {
    this.handlePlaceTower(data.col, data.row, data.towerDefId);
  };
  EventBus.on('request-place-tower', this.onPlaceTower);
}

cleanup() {
  EventBus.off('request-place-tower', this.onPlaceTower); // 정확히 제거됨
}

// 나쁨: 익명 람다 — off()로 제거 불가
EventBus.on('request-place-tower', (data) => { ... }); // ← 누수
```

### 새 이벤트 추가 시 체크리스트

1. `GameEventMap`에 이벤트 이름 + 페이로드 타입 추가
2. emit하는 쪽에서 정확한 타입으로 emit
3. 수신 쪽에서 named reference로 on/off 등록
4. cleanup에서 off 호출 확인

---

## 4. Game Loop: 결정적 업데이트 순서

`update(time, delta)` 안에서 시스템 업데이트 순서는 게임 동작의 정확성을 결정한다.
순서를 바꾸면 한 프레임 지연이나 유령 데미지 같은 미묘한 버그가 생긴다.

### 정규 순서

```typescript
update(time: number, delta: number) {
  if (this.gameOver) return; // 1. 조기 종료

  // 2. 관찰: 현재 상태 수집
  const unitPositions = this.unitSystem.getUnitPositions();

  // 3. 행동: 시스템이 효과를 계산하고 데이터를 반환
  const damageEvents = this.towerSystem.update(time, delta, unitPositions);

  // 4. 결과 적용: 씬이 시스템 간 효과를 전달
  for (const evt of damageEvents) {
    this.unitSystem.applyDamage(evt.unitId, evt.damage);
  }

  // 5. 진행: 시뮬레이션 전진
  const { reachedExit } = this.unitSystem.update(time, delta);

  // 6. 후처리: 게임 상태 변경
  for (const unitId of reachedExit) {
    this.playerHp -= 1;
    if (this.playerHp <= 0) {
      this.gameOver = true;
      return;
    }
  }
}
```

### 핵심 규칙

- **시스템은 데이터를 반환한다.** 다른 시스템을 직접 변경하지 않는다.
  `towerSystem.update()` → `DamageEvent[]` 반환 → 씬이 `unitSystem.applyDamage()` 호출.
  시스템 간 직접 호출은 순환 의존성과 순서 버그를 만든다.

- **`time` vs `delta` 사용 구분:**
  - `time` (게임 시작 이후 ms): 쿨다운, 간격 타이머 → `time - lastAttackTime < interval`
  - `delta` (이전 프레임 이후 ms): 이동, 애니메이션 → `speed * (delta / 1000)`

- **버퍼 재사용:** 매 프레임 `new Array()` 대신 기존 배열을 `length = 0`으로 리셋.

```typescript
// 좋음: 버퍼 재사용
private damageEventsBuffer: DamageEvent[] = [];

update(...) {
  this.damageEventsBuffer.length = 0; // 할당 없이 리셋
  // ... push events ...
  return this.damageEventsBuffer;
}
```

---

## 5. Memory & Performance

### Graphics 객체 재사용

Graphics 객체는 한 번 생성하고 `clear()` + 다시 그리기한다. 매 프레임 destroy + 재생성하면
GC 압박과 프레임 드랍이 발생한다.

```typescript
// 좋음: clear + redraw
this.attackGraphics.clear();
// ... 다시 그리기 ...

// 나쁨: destroy + recreate
this.attackGraphics.destroy();
this.attackGraphics = this.add.graphics(); // ← 매 프레임 새 객체
```

### In-place 배열 컴팩션

TTL이 있는 임시 객체(공격 라인, 파티클 등)는 `filter()`로 새 배열을 만들지 말고
write pointer로 제자리 컴팩션한다. 핫 루프에서 할당을 제거한다.

```typescript
let write = 0;
for (let i = 0; i < this.attackLines.length; i++) {
  const line = this.attackLines[i];
  line.ttl -= delta;
  if (line.ttl <= 0) continue; // 죽은 요소 건너뜀
  // ... 렌더링 ...
  this.attackLines[write++] = line; // 살아있는 요소 앞으로 이동
}
this.attackLines.length = write; // 배열 잘라내기
```

### Entity 저장: Map

엔티티는 `Map<string, T>`로 저장한다. ID 기반 O(1) 조회가 가능하고,
삭제 시 배열 shift 없이 `Map.delete()`로 처리한다.

```typescript
private towers: Map<string, TowerInstance> = new Map();
private units: Map<string, UnitInstance> = new Map();
```

핫 루프에서 `Array.find()` 금지. 엔티티가 많아지면 O(n) 탐색이 병목이 된다.

### 캐시 무효화

자동 감시(watch) 대신 명시적 `invalidateCache()` 호출을 사용한다.
예측 가능하고 디버깅하기 쉽다.

```typescript
// 타워 배치 후:
this.pathfinding.invalidateCache();
const path = this.pathfinding.findPath(walkGrid, spawn, exit);
```

### 거리 계산

타겟팅 루프에서 `Math.sqrt()` 대신 제곱 거리를 비교한다:

```typescript
const dx = towerX - unitX;
const dy = towerY - unitY;
const distSq = dx * dx + dy * dy;
if (distSq <= rangeSq) { ... } // rangeSq = (range * TILE_SIZE) ** 2
```

---

## 6. Cleanup Protocol

메모리 누수를 방지하려면 3계층 클린업을 반드시 따른다.

### Layer 1: Scene 클린업

`shutdown` 이벤트 핸들러에서 실행. 씬이 멈출 때 호출된다.

```typescript
private cleanup() {
  // 1. EventBus 리스너 해제 (먼저!)
  EventBus.off('request-place-tower', this.onPlaceTower);
  EventBus.off('request-send-unit', this.onSendUnit);

  // 2. 시스템 파괴 (다음)
  this.towerSystem.destroy();
  this.unitSystem.destroy();
}
```

순서: EventBus off → system destroy. 시스템이 destroy 중에 이벤트를 emit할 수 있으므로
리스너를 먼저 해제한다.

### Layer 2: System `destroy()`

각 시스템이 자기 자신을 정리한다:

```typescript
destroy(): void {
  // 1. Phaser 객체 파괴
  for (const tower of this.towers.values()) {
    tower.graphics.destroy();
  }
  // 2. 컬렉션 비우기
  this.towers.clear();
  this.attackGraphics.destroy();
  this.attackLines = [];
}
```

시스템은 EventBus.off()를 호출하지 않는다 — 그것은 씬의 책임이다.

### Layer 3: React 컴포넌트 클린업

`useEffect` return에서 실행:

```typescript
return () => {
  EventBus.off('game-ready', onReady);    // 1. 특정 리스너 해제
  gameRef.current?.destroy(true);          // 2. Phaser 인스턴스 파괴
  EventBus.removeAllListeners();           // 3. 남은 리스너 전체 제거
  gameRef.current = null;                  // 4. 참조 초기화
  setGameReady(false);                     // 5. 스토어 리셋
};
```

`removeAllListeners()`는 game.destroy() 이후에 호출한다. destroy가 마지막 이벤트를 emit할 수 있기 때문이다.

---

## 7. React ↔ Phaser 통합

### PhaserGame 컴포넌트 패턴

```typescript
export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return; // 이중 초기화 방지

    gameRef.current = startGame(containerRef.current);
    // ... EventBus 리스너 등록 ...

    return () => { /* cleanup */ };
  }, [/* stable deps only */]);

  return <div ref={containerRef} id="game-container" />;
}
```

### 상태 동기화 규칙

- **게임이 진실의 원천**: 시뮬레이션 상태 (HP, 골드, 유닛 위치)는 Phaser가 관리.
- **Zustand가 UI 거울**: React UI에 필요한 상태만 EventBus로 전달 → Zustand 저장.
- **단방향 커맨드**: React는 `request-*` 이벤트로 요청만 하고, 결과는 Game이 판단 후 상태 이벤트로 알림.

```
React UI → EventBus.emit('request-place-tower', {...})
         → GameScene handles → validates → executes
         → EventBus.emit('tower-placed', { success: true })
         → React listener → Zustand store update → UI re-render
```

### startGame 래퍼

게임 config를 export하되, `startGame(parent)` 래퍼로 감싸서 parent element를 주입한다:

```typescript
export function startGame(parentElement?: string | HTMLElement): Phaser.Game {
  return new Phaser.Game({
    ...gameConfig,
    parent: parentElement ?? gameConfig.parent,
  });
}
```

---

## 8. Testing Strategy

### 무엇을 테스트하는가

| 대상 | 테스트? | 이유 |
|---|---|---|
| 순수 알고리즘 (`findPath`) | O | Phaser 없이 테스트 가능 |
| 데이터 전용 시스템 (`GridManager`) | O | 생성자에 Phaser.Scene 없음 |
| 캐싱 동작 (`PathfindingSystem`) | O | 캐시/무효화 사이클 검증 |
| 렌더링 코드 (Graphics draw) | X | 시각적 출력, 자동화 어려움 |
| Input 핸들러 | X | Phaser 이벤트 시스템 필요 |
| EventBus 와이어링 | X | 통합/수동 테스트 |

**판단 기준:** 함수 시그니처에 `Phaser.*` 타입이 없으면 유닛 테스트한다. 있으면 통합/수동.

### 테스트 헬퍼 패턴

테스트 보일러플레이트를 줄이는 헬퍼 함수:

```typescript
function makeGrid(width: number, height: number, blocked: [number, number][] = []): number[][] {
  const grid = Array.from({ length: height }, () => Array(width).fill(0));
  for (const [x, y] of blocked) {
    grid[y][x] = 1;
  }
  return grid;
}
```

### 테스트 스타일

- 테스트마다 새 인스턴스 생성 (shared state 없음)
- 동작 기반 테스트 (구현 디테일 아님)
- 캐시 테스트: `.toBe()` (참조 동등성)로 캐시된 결과 확인
- 경계 조건 명시적 테스트 (spawn point에 타워 배치 방지 등)

---

## 9. Config & Constants

### 구조

- **공유 상수**: `@gld/shared` 패키지의 `constants/` 디렉토리.
  `GRID_WIDTH`, `TILE_SIZE`, `INITIAL_GOLD` 등 모든 매직 넘버를 여기에 정의.
- **타워/유닛 정의**: 데이터 드리븐. `BASE_TOWERS`, `UNITS` 등 typed 배열.
- **GridConfig**: `DEFAULT_GRID_CONFIG`으로 기본값 제공, 테스트에서 오버라이드 가능.

```typescript
export const DEFAULT_GRID_CONFIG: GridConfig = {
  width: GRID_WIDTH,
  height: GRID_HEIGHT,
  spawnPoint: { x: 0, y: 10 },
  exitPoint: { x: 19, y: 10 },
};

// 시스템 생성자에서:
constructor(config: GridConfig = DEFAULT_GRID_CONFIG) { ... }
```

### 인라인 허용 범위

**로직 상수**: 반드시 named constant. `if (gold < 100)` → `if (gold < towerDef.cost)`.

**렌더 상수**: 색상(`0x7f5af0`), 알파(`0.2`), 사이즈 비율(`TILE_SIZE * 0.35`)은 인라인 OK.
이것들은 시각적 튜닝이지 게임 로직이 아니다.

---

## 10. Quick Reference

| 결정 | 선택 | 이유 |
|---|---|---|
| Graphics vs Sprites | 프로토타입에선 Graphics | 에셋 없이 즉시 렌더링, 절차적 형태 |
| 시스템 생성자 인자 | `Phaser.Scene` | `GameScene` 아닌 범용 타입으로 재사용성 확보 |
| 엔티티 저장 | `Map<string, T>` | O(1) ID 조회, 핫 루프에서 성능 |
| 시스템 간 통신 | `update()` 반환값 | 공유 가변 상태 없음, 순서 명확 |
| 이벤트 명명 | `request-*` / 서술형 | 방향성 명확, 타입 안전 |
| 테스트 대상 | 순수 함수만 | Phaser 목킹 불필요, 높은 신뢰도 |
| 캐시 무효화 | 명시적 `invalidateCache()` | 예측 가능, 디버깅 용이 |
| 핫 루프 배열 | In-place 컴팩션 | GC 압박 제거 |
| 쿨다운 타이밍 | `time` (절대값) | 프레임 레이트 분산에 영향 없음 |
| 이동 보간 | `delta` (프레임 델타) | 부드러운 이동 |
| 경로 변경 시 유닛 | 새 경로의 최근접점으로 리맵 | 텔레포트 방지, 자연스러운 전환 |

### 새 시스템 추가 체크리스트

1. [ ] `Phaser.Scene`을 생성자 인자로 (NOT `GameScene`)
2. [ ] 의존 시스템은 DI로 주입
3. [ ] `Map<string, T>`로 엔티티 저장
4. [ ] `destroy()` 메서드: Phaser 객체 파괴 + 컬렉션 비우기
5. [ ] `update()` 메서드: 부수효과 대신 데이터 반환
6. [ ] GameScene `create()`에서 올바른 순서로 초기화
7. [ ] GameScene `cleanup()`에서 `destroy()` 호출
8. [ ] 순수 알고리즘은 별도 함수로 export → 테스트 작성

# Archer Tower Arrow Projectile Design

## Context

궁수탑(archer tower)이 내부적으로 `laser` 타입으로 구현되어 있어, 공격 시 레이저 빔이 발사된다.
이름과 동작이 불일치하므로, 화살 투사체로 전환하고 관련 에셋/사운드/코드를 일관되게 정리한다.

## 변경 요약

| 영역 | Before | After |
|------|--------|-------|
| 내부 타입 | `laser` / `twin_laser` | `archer` / `twin_archer` |
| 투사체 렌더링 | 즉시 빔 (직선) | 화살 스프라이트 + 낮은 포물선 비행 |
| 발사 애니메이션 | 노란 빔 발사 VFX | 활시위 당기고 놓는 동작 |
| 사운드 | 1200→800Hz sawtooth (레이저) | 400→200Hz triangle (활시위) |
| 에셋 파일명 | `laser.png`, `laser-fire.png` 등 | `archer.png`, `archer-fire.png` 등 |

---

## 1. 투사체 렌더링 — 'arrow' 스타일

### 변경 파일
- `packages/phaser-game/src/systems/TowerSystem.ts`

### 설계

`attackLines`의 `style` 타입에 `'arrow'`를 추가한다.

```typescript
style: 'beam' | 'arc' | 'arrow';
```

**스타일 결정 로직 변경** (line 358):
```typescript
// Before
const style = this.hasSplash(special) ? 'arc' : 'beam';

// After
const style = this.hasSplash(special) ? 'arc'
  : (def.type === 'archer' || def.type === 'twin_archer') ? 'arrow'
  : 'beam';
```

**arrow 렌더링** (line 462 부근, 새 분기):
- 포물선 높이: `15px` (arc의 40px보다 낮음 — 화살의 낮은 비행 궤적)
- `projectile-arrow` 텍스처를 `scene.add.image`로 생성하여 비행
- 진행 방향으로 회전: `Math.atan2(dy_next, dx_next)`
- TTL: 80ms (기존과 동일)

**구현 방식**: Graphics 프리미티브 대신 Phaser Image 사용.
- 매 프레임 새 Image를 생성하면 성능 문제가 있으므로, **오브젝트 풀**을 사용한다.
- `arrowPool: Phaser.GameObjects.Image[]` — 최대 16개 사전 생성
- 발사 시 풀에서 꺼내어 위치/회전/알파 설정, TTL 만료 시 비활성화하여 풀로 반환

```typescript
// arrow 렌더링 pseudo-code
if (line.style === 'arrow') {
  const t = 1 - line.ttl / 80;
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  const px = line.x1 + dx * t;
  const py = line.y1 + dy * t - Math.sin(t * Math.PI) * 15; // 낮은 arc
  
  // 회전 각도 (접선 방향)
  const nextT = Math.min(t + 0.05, 1);
  const nx = line.x1 + dx * nextT;
  const ny = line.y1 + dy * nextT - Math.sin(nextT * Math.PI) * 15;
  const angle = Math.atan2(ny - py, nx - px);
  
  arrow.setPosition(px, py);
  arrow.setRotation(angle);
  arrow.setAlpha(alpha);
  arrow.setVisible(true);
}
```

### 화살 풀 관리

- `initArrowPool()`: TowerSystem 생성 시 16개 Image 사전 생성, `setVisible(false)`
- attackLines에 `arrowIndex?: number` 필드 추가하여 풀 인덱스 추적
- 발사 시 비활성 화살을 풀에서 할당, TTL 만료 시 반환

---

## 2. 리네이밍 (laser → archer)

### 변경 범위 (132+ 참조)

**타입/상수 (핵심):**
- `packages/shared/src/types/tower.ts` — TowerType에서 `'laser'` → `'archer'`, `'twin_laser'` → `'twin_archer'`
- `packages/shared/src/constants/towers.ts` — id/type 변경
- `packages/shared/src/constants/meta.ts` — DEFAULT_STARTER_IDS
- `packages/shared/src/constants/deck.ts` — 기본 덱 구성

**게임 로직:**
- `packages/phaser-game/src/systems/TowerSystem.ts` — 스타일 분기, 코멘트
- `packages/phaser-game/src/audio/SoundGenerator.ts` — 사운드 레시피 키, 조건문

**에셋:**
- `packages/web-shell/public/assets/asset-manifest.json` — 모든 laser 관련 키/경로
- `scripts/generate-assets/shared.ts` — PALETTE.laser → PALETTE.archer
- `scripts/generate-assets/generate-projectiles.ts` — 파일명, 매니페스트 키
- `scripts/generate-assets/generate-towers.ts` — twin_laser case
- `scripts/generate-assets/generate-ui.ts` — PALETTE 참조
- `scripts/generate-assets/generate-stage-icons.ts` — PALETTE 참조
- `scripts/generate-assets/generate-castle-wall.ts` — PALETTE 참조
- `scripts/generate-assets/ai-config.ts` — 타워 설명

**스토어:**
- `packages/web-shell/src/stores/gameStore.ts` — DEFAULT_DECK_IDS

**테스트 (전체):**
- `packages/phaser-game/tests/` — TowerSystemCombat, TowerSystemPlacement, preloadAssets, combatVfx, DeckSystem
- `packages/web-shell/tests/` — gameStore, GamePage
- `packages/web-shell/src/stores/__tests__/` — metaStore, metaStore-migration
- `packages/shared/tests/` — manifest, assetManifest, deckBuilder
- `scripts/generate-assets/__tests__/` — ai-config

**에셋 파일 리네이밍:**
- `towers/laser.png` → `towers/archer.png` (+ .webp)
- `towers/laser-fire.png` → `towers/archer-fire.png` (+ .webp)
- `towers/twin_laser.png` → `towers/twin_archer.png` (+ .webp)
- `towers/twin_laser-fire.png` → `towers/twin_archer-fire.png` (+ .webp)
- `projectiles/laser-beam.png` → `projectiles/arrow.png` (+ .webp)

---

## 3. 에셋 변경

### 화살 스프라이트 (projectile-arrow)
- 기존 `laser-beam.png` (32x8, 화살 모양)을 그대로 재활용
- `generate-projectiles.ts`에서 파일명과 매니페스트 키만 변경

### 발사 애니메이션 (tower-archer-fire)
- `generate-towers.ts`에서 새로 생성
- 8프레임, 64x80 스프라이트시트
- 프레임 구성:
  1-2: 탑 상단에 활 모양 나타남
  3-4: 활시위 당기는 동작 (활이 뒤로 휨)
  5: 화살 발사 순간 (밝은 플래시)
  6-8: 활 원위치 + 잔여 모션 블러
- 색상: 궁수탑 색상(#c8a04a) 기반

### 타워 정적 스프라이트 (tower-archer)
- 기존 `laser.png` 재활용 (중세풍 석탑 — 궁수탑으로 적절)
- 파일명만 변경

---

## 4. 사운드 변경

### 변경 파일
- `packages/phaser-game/src/audio/SoundGenerator.ts`

### 사운드 레시피
```typescript
// Before
laser: { frequency: 1200, endFrequency: 800, duration: 60, type: 'sawtooth', volume: 0.12 }

// After
archer: { frequency: 400, endFrequency: 200, duration: 80, type: 'triangle', volume: 0.12 }
```

- triangle wave: 부드러운 "퉁" 소리 (활시위)
- 400→200Hz 하강: 시위를 놓았을 때의 진동 감쇠
- 80ms: 약간 더 긴 여운

twin_archer도 동일 패턴, 약간 더 높은 pitch (500→250Hz).

---

## 5. metaStore 마이그레이션

`metaStore`에 저장된 사용자 데이터(덱, 컬렉션)에 `'laser'`/`'twin_laser'`가 포함되어 있을 수 있다.
localStorage 마이그레이션이 필요하다.

### 변경 파일
- `packages/web-shell/src/stores/metaStore.ts`

### 마이그레이션 로직
persist middleware의 migrate 함수에서:
- `selectedDeck` 배열 내 `'laser'` → `'archer'`, `'twin_laser'` → `'twin_archer'`
- `collection` 배열 내 `defId: 'laser'` → `defId: 'archer'` 등

---

## 검증 방법

1. **빌드 확인**: `pnpm build` — 타입 에러 없음
2. **전체 테스트**: `pnpm test` — 모든 테스트 통과
3. **에셋 생성**: `pnpm generate-assets` — archer 관련 에셋 정상 생성
4. **브라우저 확인**: 게임 실행 후 궁수탑 배치 → 화살이 포물선으로 날아가는지 확인
5. **사운드 확인**: 발사 시 활시위 소리 재생 확인
6. **마이그레이션**: localStorage에 laser 데이터가 있는 상태에서 로드 → archer로 변환 확인

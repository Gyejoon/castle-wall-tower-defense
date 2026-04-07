# HUD를 Phaser 캔버스 내부로 마이그레이션

## Context

현재 게임 HUD(TopHud, BossHpBar, DeckDock)가 React 컴포넌트로 구현되어 GamePage에서 flex column으로 배치된다. 이로 인해:
- 보스 HP바가 나타나면 게임 캔버스가 줄어듦
- DeckDock이 하단 110px를 고정 차지하여 캔버스 영역 감소
- 모바일 게임으로서 스크롤바가 노출되는 문제

이 변경은 모든 게임 HUD를 Phaser 캔버스 내부 UIScene으로 이동하고, 웹 스크롤바를 숨겨 네이티브 게임 느낌을 강화한다.

## 범위

1. **웹 스크롤바 숨기기** — 전체 앱에서 스크롤바 비노출
2. **UIScene 신규 생성** — GameScene과 병렬 실행되는 HUD 전용 씬
3. **TopHud → Phaser** — HP, 에너지, 웨이브 정보, 속도 토글
4. **BossHpBar → Phaser** — 보스 등장 시 캔버스 상단에 반투명 오버레이
5. **DeckDock → Phaser** — 카드 덱 선택 UI를 Phaser interactive 객체로
6. **GamePage 단순화** — React에서 TopHud, DeckDock 제거
7. **gameStore 정리** — Phaser로 이동한 상태를 React Store에서 제거

## 범위 밖

- GameOverScreen, TutorialOverlay, BossWarningOverlay, ToastNotification → React 유지
- 로비 UI 변경 없음
- 게임 로직/밸런스 변경 없음

---

## 아키텍처

### Scene 구조

```
Boot → Preloader → GameScene
                 ↳ UIScene (parallel, 투명 배경)
```

- UIScene은 GameScene의 `create()`에서 `this.scene.launch('UIScene')` 으로 시작
- UIScene은 GameScene 위에 레이어링 (별도 카메라, 게임 줌/패닝에 영향 안 받음)
- UIScene 배경은 투명 — GameScene이 아래에 보임

### 파일 구조

```
packages/phaser-game/src/
├── scenes/
│   ├── Game.ts          # 기존 — UIScene launch 추가
│   └── UIScene.ts       # 신규
├── ui/                  # 신규 디렉토리
│   ├── TopHudUI.ts      # Phaser Container: HP, 에너지, 웨이브, 속도토글
│   ├── BossHpBarUI.ts   # Phaser Container: 보스 HP바
│   └── DeckDockUI.ts    # Phaser Container: 카드 덱
```

### UIScene 내부 레이아웃

| 영역 | 위치 | depth | 내용 |
|------|------|-------|------|
| TopHud | 상단 36px | 100 | HP, 에너지바, 웨이브/타이머, 속도토글 |
| BossHpBar | 상단 42px 아래, 좌우 12% 마진 | 90 | 보스명, 페이즈, HP바, 수치 (조건부 표시) |
| DeckDock | 하단 90px | 80 | 카드 4장, 선택 상태, 에너지 비용 |

### 이벤트 흐름 변경

**현재:**
```
GameScene → EventBus → useGameEvents → gameStore → React Component
```

**변경 후:**
```
GameScene → EventBus → UIScene (직접 업데이트)
```

UIScene이 EventBus를 직접 리스닝하여 Phaser 오브젝트를 업데이트한다. React gameStore에서 아래 상태를 제거:
- `lives`, `energy` → UIScene TopHudUI가 직접 관리
- `combatHud` (timerLabel, phase, bossWarning) → UIScene TopHudUI
- `bossHp` (hp, maxHp, phase, visible) → UIScene BossHpBarUI
- `deckCards`, `selectedCardIndex` → UIScene DeckDockUI
- `gameSpeed` → UIScene TopHudUI

**React에 남는 상태:**
- `runStatus` — GameOverScreen, 로비 전환에 필요
- `gameReady` — 로딩 오버레이
- `toast` — ToastNotification
- `bossWarningVisible` — BossWarningOverlay
- `gameOverStats` — GameOverScreen
- `runId` — PhaserGame 재생성 key

### DeckDock 터치 처리

- 각 카드는 Phaser Container + setInteractive()
- 카드 영역 터치 시 `input.stopPropagation()` → 게임 맵 클릭으로 전파 안됨
- 선택된 카드: 금색 테두리 + glow tween
- 에너지 부족 카드: alpha 0.4
- 카드 선택 → EventBus.emit('request-select-tower') 유지 (GameScene이 리스닝)
- 카드 선택 해제 → EventBus.emit('request-clear-tower-selection') 유지

### TopHud 속도 토글

- Phaser Text로 "1x ▶" / "2x ▶▶" 표시
- setInteractive() + pointerdown으로 토글
- EventBus.emit('request-set-speed', { multiplier: 1 | 2 }) → 기존 이벤트 계약 그대로 사용

### BossHpBar 렌더링

- Phaser Graphics로 HP바 렌더링 (fill rect)
- Phaser Text로 보스명, 페이즈, HP 수치
- Phase 2 시 tween 맥박 애니메이션
- `boss-hp-update` 이벤트 시 Graphics.clear() + 재드로우
- `boss-defeated` 시 Container.setVisible(false)

### DeckDock 카드 이미지

- 현재 React에서 `<img src="assets/towers/xxx.webp">` 사용
- Phaser에서는 Preloader에서 이미 로드된 tower 텍스처를 사용
- 카드 아이콘: `this.add.image(x, y, towerTextureKey)` — 이미 Preloader에서 로드됨
- 텍스처 키는 DeckSystem의 카드 데이터에서 가져옴

---

## 스크롤바 숨기기

`packages/web-shell/src/styles/global.css`에서:

```css
/* 기존 pixel-style scrollbar 스타일 제거하고 */
::-webkit-scrollbar {
  display: none;
}
* {
  scrollbar-width: none; /* Firefox */
}
```

스크롤 기능은 유지하되 스크롤바 시각 요소만 숨긴다.

---

## GamePage 변경

변경 전:
```tsx
<TopHud ... />
<div className="relative w-full flex-1 min-h-0 overflow-hidden">
  <PhaserGame />
  ...overlays...
</div>
<DeckDock />
```

변경 후:
```tsx
<div className="relative w-full h-full overflow-hidden">
  <PhaserGame />
  ...overlays (Tutorial, BossWarning, Toast, GameOver)...
</div>
```

- flex column 3단 → 단일 전체화면 캔버스
- TopHud, DeckDock import 및 렌더링 제거
- gameStore에서 제거된 상태 selector도 제거

---

## 수정 대상 파일

| 파일 | 변경 내용 |
|------|----------|
| `packages/web-shell/src/styles/global.css` | 스크롤바 숨김 |
| `packages/phaser-game/src/scenes/UIScene.ts` | **신규** — HUD 씬 |
| `packages/phaser-game/src/ui/TopHudUI.ts` | **신규** — 상단 HUD |
| `packages/phaser-game/src/ui/BossHpBarUI.ts` | **신규** — 보스 HP바 |
| `packages/phaser-game/src/ui/DeckDockUI.ts` | **신규** — 카드 덱 |
| `packages/phaser-game/src/config.ts` | scene 배열에 UIScene 추가 (Phaser가 씬을 알아야 launch 가능) |
| `packages/phaser-game/src/scenes/Game.ts` | UIScene launch 추가 |
| `packages/phaser-game/src/index.ts` | UIScene export |
| `packages/web-shell/src/pages/GamePage.tsx` | TopHud, DeckDock 제거, 레이아웃 단순화 |
| `packages/web-shell/src/components/game/TopHud.tsx` | **삭제** |
| `packages/web-shell/src/components/game/BossHpBar.tsx` | **삭제** |
| `packages/web-shell/src/components/game/DeckDock.tsx` | **삭제** |
| `packages/web-shell/src/stores/gameStore.ts` | 이동된 상태 제거 |
| `packages/web-shell/src/hooks/useGameEvents.ts` | 이동된 이벤트 핸들러 제거 |
| `packages/shared/src/types/events.ts` | 이벤트 타입 변경 없음 (EventBus 계약 유지) |

---

## 검증 방법

1. `bun build:web` — 빌드 성공 확인
2. `bun lint` — 린트 통과
3. `bun test` — 기존 테스트 통과
4. 브라우저에서 확인:
   - 로비: 스크롤바 안 보임 (CollectionTab 스크롤은 동작)
   - 게임 시작: 캔버스가 전체 화면 차지
   - TopHud: HP, 에너지, 웨이브, 속도토글 정상 표시
   - 보스 웨이브: HP바가 캔버스 상단에 반투명으로 표시, 맵 안 가림
   - DeckDock: 카드 선택/해제, 에너지 부족 표시, 터치가 맵 클릭과 충돌 안 함
   - GameOver/Tutorial/Toast: 기존대로 React overlay 동작

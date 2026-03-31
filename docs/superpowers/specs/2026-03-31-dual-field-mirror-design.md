# AI 필드 완전 미러 — 싱글 캔버스, 듀얼 그리드

## Context

현재 AI 상대는 `AIOpponent.ts`에서 인메모리로만 구동되고 시각화가 없다. 플레이어는 AI가 뭘 하는지 텍스트(HP/골드/타워수)로만 파악 가능. 킹덤 러쉬 스타일의 PvP 경험을 위해 AI 필드를 플레이어 필드와 동일한 Phaser 캔버스 안에서 완전히 렌더링한다.

## 핵심 결정 사항

- **싱글 Phaser.Game, 싱글 GameScene** — 두 개의 캔버스가 아님
- **타일로 구분** — UI 구분선/테두리 없음. AI 맵은 어두운 톤 타일셋, 내 맵은 밝은 녹색 타일셋
- **동일 크기** — AI 필드와 내 필드 동일 크기로 위아래 배치
- **인게임 HUD** — 타워 구매, 웨이브 시작, 초기화 버튼을 Phaser 내부에 배치. React 전술 독 제거

## 레이아웃

```
하나의 Phaser 캔버스 (세로로 2배 확장)
┌──────────────────────────────┐
│                              │
│   AI 맵 (어두운 톤 타일셋)     │  자동 플레이, 인터랙션 없음
│   AI 타워, AI 유닛 렌더링      │
│                              │
│   내 맵 (밝은 녹색 타일셋)     │  터치/클릭 인터랙션
│   내 타워, 적 유닛 렌더링      │
│                              │
│  [타워구매 50G] [웨이브] [초기화] │  Phaser 내부 HUD
└──────────────────────────────┘
```

두 맵 사이에 경계선 없이 자연스럽게 이어짐. 색감 차이로만 진영 구분.

## 아키텍처

### 1. 듀얼 GridManager

```
GameScene
├── playerGridManager  (하단, 기존 위치)
├── aiGridManager      (상단, playerGrid 위쪽으로 수직 오프셋)
```

- 동일한 `GridManager` 클래스 사용, 오프셋만 다름
- 맵 데이터는 동일한 `FOREST_GATE_MAP` 사용
- AI 그리드의 y 오프셋 = -(맵 높이 * ISO_TILE_H + 간격)

### 2. 듀얼 게임 시스템

각 필드마다 독립적인 시스템 인스턴스:

| 시스템 | 플레이어 | AI |
|--------|---------|-----|
| GridManager | playerGridManager | aiGridManager |
| TowerSystem | playerTowerSystem | aiTowerSystem |
| UnitSystem | playerUnitSystem | aiUnitSystem |
| WaveSystem | playerWaveSystem | aiWaveSystem |
| PathfindingSystem | playerPathfinding | aiPathfinding |

### 3. AI 로직

현재 `AIOpponent.ts`의 로직을 그대로 가져오되, 실제 Phaser 시스템 위에서 구동:
- 빌딩 페이즈: 골드로 랜덤 타워 구매 + 빈 배치점에 자동 배치
- 전투 페이즈: `aiTowerSystem.update()` + `aiUnitSystem.update()` 호출
- 웨이브 진행: 플레이어 웨이브와 동기화

### 4. 킬 트랜스퍼

같은 씬 내에서 직접 호출:
- 플레이어 유닛 킬 → `aiUnitSystem.spawnTransferUnit(unitDefId)`
- AI 유닛 킬 → `playerUnitSystem.spawnTransferUnit(unitDefId)`

### 5. 타일셋 변형 (AI 어두운 톤)

`generate-tileset.ts`에 AI 전용 어두운 변형 타일셋 추가:
- 기존 풀/나무/바위 색상에 명도 -30~40%, 채도 약간 감소
- 별도 PNG 생성: `tileset-dark.png`
- AI 필드 렌더링 시 어두운 타일셋 사용

`generate-tiles.ts`에도 어두운 iso 타일 변형 추가:
- `grid-floor-dark.png`, `path-tile-dark.png` 등

### 6. 인게임 HUD

Phaser DOM Element 또는 Graphics + Text로 하단에 버튼 배치:
- **타워 구매 {cost}G** — `EventBus.emit('request-buy-random-tower')`
- **웨이브 시작** — `EventBus.emit('request-start-wave')`  
- **초기화** — `resetRun()`

React `GamePage.tsx`에서:
- 전술 독 섹션 전체 제거
- AI 상대 정보 바 제거 (캔버스 내에서 보이므로)
- 상단 헤더(HP/골드/웨이브)는 유지 또는 캔버스 내부로 이동

### 7. 카메라

- Phaser 카메라 bounds를 두 그리드를 모두 포함하도록 확장
- `aspectRatio`를 약 3:4 또는 동적으로 조절 (두 맵이 세로로 쌓이므로)

## 수정 대상 파일

| 파일 | 변경 |
|------|------|
| `packages/phaser-game/src/scenes/Game.ts` | 듀얼 그리드 + 듀얼 시스템 + AI 로직 + 인게임 HUD |
| `packages/phaser-game/src/systems/AIOpponent.ts` | Phaser 기반으로 리팩토링 또는 제거 |
| `packages/phaser-game/src/config.ts` | 캔버스 크기 조정 |
| `packages/web-shell/src/pages/GamePage.tsx` | 전술 독 제거, 레이아웃 단순화 |
| `scripts/generate-assets/generate-tileset.ts` | 어두운 톤 AI 타일셋 생성 |
| `scripts/generate-assets/generate-tiles.ts` | 어두운 iso 타일 변형 |
| `scripts/generate-assets/generate-map.ts` | AI 맵 JSON 생성 (어두운 타일셋 참조) |
| `packages/phaser-game/src/scenes/Preloader.ts` | 어두운 타일셋/타일 로드 추가 |

## 검증

1. 게임 시작 시 두 맵이 위아래로 보이는지 확인
2. AI가 자동으로 타워를 구매/배치하는지 확인
3. 웨이브 시작 시 양쪽 필드에서 유닛이 이동하는지 확인
4. 킬 트랜스퍼가 동작하는지 확인 (내가 킬 → AI 필드에 유닛 추가 스폰)
5. 인게임 HUD 버튼 동작 확인
6. AI 맵이 어두운 톤으로 구분되는지 확인

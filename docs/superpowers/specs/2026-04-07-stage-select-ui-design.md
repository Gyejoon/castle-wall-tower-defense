# 스테이지 선택 UI 디자인

## Context

기존 HomeTab에서 맵 3개가 가로 스크롤 카드로 나열되고 바로 "게임 시작" 버튼을 누르면 게임이 시작되던 흐름을,
월드맵 기반의 스테이지 선택 → 상세 정보 확인 → 게임 시작의 3단계 흐름으로 리디자인했다.
스테이지 선택 UI는 **React DOM**으로 구현하여 선명한 텍스트 렌더링과 접근성을 확보한다.
Phaser는 실제 게임(GameScene)에서만 사용한다.

## 전체 흐름

```
HomeTab(React)  →  WorldMapPage(React)  →  StageDetailPage(React)  →  GamePage(Phaser)
"성벽 막기" 클릭     월드맵 노드 탐색         상세 정보 + 덱 선택          실제 게임
```

### 상태 전환 (runStatus)

```
lobby → stageSelect → stageDetail → building → running → victory/defeat → lobby
```

- `enterStageSelect()` — 로비 → 월드맵
- `enterStageDetail(mapId)` — 월드맵 → 상세 (선택한 맵 ID 저장)
- `resetRun()` — 상세 → 게임 시작 (building 상태)
- `enterLobby()` — 어디서든 → 로비 복귀

## 1. 로비 HomeTab

- 기존 맵 선택 카드, 덱 미리보기 UI 제거
- 단일 PixelButton(gold variant): "성벽 막기" + 검 아이콘(icon-sword.webp)
- 클릭 시 `enterStageSelect()` 호출

## 2. 월드맵 화면 (WorldMapPage)

### 레이아웃

- React DOM 풀스크린 페이지 (max-width: 430px 모바일 셸)
- 배경: 영역별 미세 radial-gradient (숲=초록, 용암=적, 폭풍=청) + stars-overlay
- 각 맵이 **카드 노드**로 절대 좌표 배치, 노드 간 **SVG 골드 점선 경로**로 연결

### 헤더

- 좌측: 화살표 아이콘(icon-arrow-left.webp) + "돌아가기" (absolute 배치)
- 중앙: "스테이지 선택" (정확한 센터 정렬, justify-center)
- 우측: "Lv.N" 플레이어 레벨 뱃지 (absolute 배치)

### 노드 구성

각 노드는 140px 폭 카드:

| 요소 | 설명 |
|------|------|
| 썸네일 | 맵 썸네일 이미지 (80px 높이, pixelated 렌더링) |
| 이름 | 맵 이름 텍스트 (9px, Press Start 2P) |
| 레벨 | 권장 레벨 `Lv.N` 뱃지 (7px) |
| 클리어 뱃지 | ✓ 골드 뱃지 (progress.stagesCleared 포함 시) |

- 잠긴 노드: grayscale + opacity 45% + ✕ 텍스트 심볼 + "Lv.N 해금" danger 색상
- 해금 노드: 테마 컬러 보더 + inner border accent + hover 시 float-up 효과
- 보상배수, 난이도 별은 표시하지 않음

### 인터랙션

- 해금 노드 hover → scale(1.06) + translateY(-3px) CSS transition
- 해금 노드 클릭 → `enterStageDetail(mapId)` 호출
- 잠긴 노드 → disabled, cursor-not-allowed

### 데이터 매핑

- `MAP_REGISTRY`의 맵들 → 노드
- `isMapUnlocked(map, playerLevel)` → 잠금 여부
- `progress.stagesCleared` → ✓ 뱃지

## 3. 스테이지 상세 화면 (StageDetailPage)

### 레이아웃

위에서 아래로 세로 배치 (flex column, scrollable):

#### 헤더
- 화살표 아이콘 + "월드맵" 뒤로가기 / 중앙 "스테이지 정보"

#### 히어로 영역
- 맵 썸네일 이미지 (scale-150 확대 + 그래디언트 오버레이)
- 맵 이름 (15px title) + 권장 레벨 뱃지 (10px label)

#### 정보 카드 (2×2 그리드)

| 카드 | 값 | 데이터 소스 |
|------|----|-------------|
| 최대 경험치 | `getMaxXpForMap(mapId)` | `stageInfo.ts` |
| 최대 골드 | `getMaxGoldForMap(mapId)` | `stageInfo.ts` |
| 웨이브 | 총 웨이브 수 + 보스 포함 여부 | `waves.ts` |
| 경로 | 레인 수 | `MapLayout.paths` |

#### 클리어 기록
- 프로그레스바 (`progress.highestWave[mapId]` / totalWaves)

#### 출전 덱
- 4슬롯 미리보기: 타워 스프라이트(webp) + 이름 + 에너지 비용(icon-energy.webp)
- 편집 아이콘(icon-edit.webp) + "편집" 버튼 → 기존 React DeckEditSheet 오버레이 (EventBus 불필요, 직접 상태 관리)

#### 게임 시작 버튼
- PixelButton(gold): 검 아이콘(icon-sword.webp) + "게임 시작"
- 컨텐츠 하단 또는 화면 하단에 위치 (flex spacer)
- 클릭 시 `resetRun()` → GamePage(Phaser) 진입

## 4. 아이콘 에셋

`scripts/generate-assets/generate-stage-icons.ts`로 생성, 16×16 픽셀 아트:

| 아이콘 | 파일 | 용도 |
|--------|------|------|
| icon-energy | `assets/ui/icon-energy.webp` | ⚡ 대체. TopHud, DeckDock, DeckEditSheet, StageDetailPage |
| icon-sword | `assets/ui/icon-sword.webp` | ⚔ 대체. HomeTab "성벽 막기", StageDetailPage "게임 시작" |
| icon-arrow-left | `assets/ui/icon-arrow-left.webp` | ← 대체. WorldMapPage, StageDetailPage 뒤로가기 |
| icon-edit | `assets/ui/icon-edit.webp` | ▸ 대체. StageDetailPage 덱 편집 버튼 |

모든 아이콘은 `[image-rendering:pixelated]`로 렌더링하여 픽셀 아트 미학 유지.

## 5. 아키텍처 결정

1. **React DOM으로 구현** (Phaser 아님): Canvas 해상도/텍스트 렌더링 품질 문제로 전환. Phaser는 GameScene에서만 사용.
2. **덱 편집은 기존 React DeckEditSheet 재사용**: DRY 원칙. Phaser DeckEditScene 미생성.
3. **같은 Phaser 인스턴스 없음**: GamePage가 별도로 마운트/언마운트. 스테이지 선택과 게임이 별개 React 페이지.
4. **이모지 완전 제거**: 모든 아이콘을 `generate-stage-icons.ts`로 생성한 픽셀 에셋으로 교체.

## 6. 구현 파일 목록

| 파일 | 변경 |
|------|------|
| `packages/web-shell/src/stores/gameStore.ts` | RunStatus 확장 (stageSelect, stageDetail) + enterStageSelect/enterStageDetail |
| `packages/web-shell/src/App.tsx` | runStatus별 React 라우팅 (lobby/stageSelect/stageDetail/game) |
| `packages/web-shell/src/components/lobby/tabs/HomeTab.tsx` | 단일 "성벽 막기" 골드 버튼 |
| `packages/web-shell/src/pages/WorldMapPage.tsx` | **신규** — 월드맵 |
| `packages/web-shell/src/pages/StageDetailPage.tsx` | **신규** — 상세 화면 |
| `packages/web-shell/src/pages/StageSelectPage.tsx` | **신규** — Phaser 브릿지 (미사용, dead code) |
| `packages/phaser-game/src/EventBus.ts` | 이벤트 타입 추가 (stage-select 관련) |
| `packages/phaser-game/src/config.ts` | WorldMapScene, StageDetailScene 등록 (미사용) |
| `packages/phaser-game/src/scenes/WorldMapScene.ts` | **신규** — Phaser 월드맵 (미사용, React로 전환) |
| `packages/phaser-game/src/scenes/StageDetailScene.ts` | **신규** — Phaser 상세 (미사용, React로 전환) |
| `packages/shared/src/constants/stageInfo.ts` | **신규** — getMaxXpForMap, getMaxGoldForMap |
| `scripts/generate-assets/generate-stage-icons.ts` | **신규** — 4종 픽셀 아이콘 생성 |

## 7. 검증 결과

1. ✅ HomeTab "성벽 막기" 클릭 → WorldMapPage 정상 렌더링
2. ✅ 각 노드의 잠금/해금 상태가 플레이어 레벨에 따라 정확
3. ✅ 노드 클릭 → StageDetailPage 전환
4. ✅ 상세 화면의 최대 XP/골드/웨이브/경로 수 데이터 정확
5. ✅ 클리어 기록이 progress.highestWave와 일치
6. ✅ 덱 편집 → DeckEditSheet 오버레이 정상 동작
7. ✅ "게임 시작" → GamePage(Phaser) 정상 진입
8. ✅ "뒤로가기" 전체 경로: 상세→월드맵→로비 정상 복귀
9. ✅ 이모지 완전 제거, 픽셀 아이콘 전면 적용
10. ✅ 빌드 통과, 301개 테스트 통과, 콘솔 에러 0

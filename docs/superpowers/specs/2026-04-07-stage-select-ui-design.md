# 스테이지 선택 UI 디자인

## Context

현재 HomeTab에서 맵 3개가 가로 스크롤 카드로 나열되고, 바로 "게임 시작" 버튼을 누르면 게임이 시작된다.
이 흐름이 허접해보이므로, 월드맵 기반의 스테이지 선택 → 상세 정보 확인 → 게임 시작의 3단계 흐름으로 리디자인한다.
전체 스테이지 선택 UI는 **Phaser Scene**으로 구현하여 카메라 zoom 전환 등 게임다운 연출을 살린다.

## 전체 흐름

```
HomeTab(React)  →  WorldMapScene(Phaser)  →  StageDetailScene(Phaser)  →  GameScene(Phaser)
"게임 시작" 클릭     월드맵 노드 탐색          상세 정보 + 덱 선택           실제 게임
```

### 진입/이탈

- HomeTab에서 "게임 시작" 버튼 클릭 → `runStatus`를 `'stageSelect'` 등 새 상태로 변경 → App.tsx에서 Phaser 마운트 (WorldMapScene)
- WorldMapScene "뒤로가기" → `runStatus: 'lobby'`로 복귀 → React LobbyPage 렌더링
- StageDetailScene "게임 시작" → `resetRun()` 호출 → GameScene 시작

## 1. 월드맵 화면 (WorldMapScene)

### 레이아웃

- 전체 화면 Phaser Scene, 배경은 영역별 컬러 그래디언트 (숲=초록, 용암=적, 폭풍=청)
- 각 맵이 **노드**로 배치, 노드 간 **점선 경로**로 연결
- 장식: 반짝이는 별 파티클

### 노드 구성

각 노드에 표시하는 정보:

| 요소 | 설명 |
|------|------|
| 아이콘 | 맵 테마 아이콘 (원형 배경, 테마 컬러 그래디언트) |
| 이름 | 맵 이름 텍스트 |
| 레벨 | 권장 레벨 `Lv.N` (unlockLevel 기반) |
| 클리어 뱃지 | ✓ 뱃지 (progress.stagesCleared에 포함된 경우) |

- 보상배수, 난이도 별은 표시하지 않음 — 스테이지가 많아질 때 레벨 숫자만으로 충분
- 잠긴 노드: 반투명 + 🔒 아이콘 + "Lv.N 해금" 텍스트

### 인터랙션

- 노드 hover/tap → `scale(1.1)` tween
- 해금된 노드 클릭 → 카메라 **zoom-in + pan** → StageDetailScene 전환
- 잠긴 노드 클릭 → 흔들림 tween + "Lv.N 필요" 토스트
- 상단 "← 돌아가기" → fade-out → HomeTab 복귀

### 데이터 매핑

- `MAP_REGISTRY`의 맵들 → 노드
- `isMapUnlocked(map, playerLevel)` → 잠금 여부
- `progress.stagesCleared` → ✓ 뱃지

## 2. 스테이지 상세 화면 (StageDetailScene)

### 레이아웃

위에서 아래로 세로 배치:

#### 히어로 영역
- 맵 테마 배경색 + 아이콘 + 맵 이름 + 권장 레벨 뱃지

#### 정보 카드 (2×2 그리드)

| 카드 | 값 | 데이터 소스 |
|------|----|-------------|
| 최대 경험치 | `battleXp(totalWaves, true) × rewardMultiplier` | `meta.ts`, `maps.ts` |
| 최대 골드 | 전 몬스터 bounty 합 × rewardMultiplier | `waves.ts`, `units.ts`, `maps.ts` |
| 웨이브 | 총 웨이브 수 (보스 포함 여부 표기) | `waves.ts` |
| 경로 | 레인 수 | `MapLayout.paths` |

#### 클리어 기록
- 최고 달성 웨이브 프로그레스바 (`progress.highestWave[mapId]` / totalWaves)

#### 출전 덱
- 4슬롯 미리보기: 타워 아이콘 + 이름 + 에너지 비용
- "편집" 버튼 → Phaser 내 덱 편집 UI (별도 팝업 또는 씬)

#### 게임 시작 버튼
- 큰 골드 톤 버튼, 클릭 시 fade-out → GameScene 시작

### 전환 애니메이션

| 전환 | 연출 |
|------|------|
| 월드맵 → 상세 | 카메라 zoom-in + pan to 선택 노드 |
| 상세 → 월드맵 | 카메라 zoom-out 복귀 |
| 상세 → 게임 | fade-out → GameScene launch |

## 3. 덱 편집 (Phaser)

- 기존 React `DeckEditSheet` 대신 Phaser로 새 구현
- StageDetailScene 위에 팝업/오버레이 형태
- 보유 타워 목록에서 4슬롯에 드래그 또는 탭으로 배치
- 데이터: `metaStore.collection`, `gameStore.selectedDeck`
- EventBus로 React metaStore와 동기화

## 4. 구현 범위 — 기존 코드 변경

### gameStore.ts
- `runStatus`에 `'stageSelect'` 상태 추가 (또는 별도 상태 관리)
- 스테이지 선택 진입/이탈 액션 추가

### App.tsx
- `runStatus === 'stageSelect'` 일 때 Phaser 마운트 (WorldMapScene)

### HomeTab.tsx
- 기존 맵 선택 카드, 덱 미리보기 UI 제거
- "게임 시작" 버튼만 남기고 클릭 시 `stageSelect` 상태로 전환

### phaser-game 패키지
- 새 Scene 추가: `WorldMapScene`, `StageDetailScene`
- 기존 `Boot → Preloader → GameScene` 파이프라인에 월드맵 경로 추가
- 덱 편집 UI 구현

### shared 패키지
- 최대 골드 계산 유틸 함수 추가 (웨이브별 bounty 합산)

## 5. 검증 방법

1. HomeTab에서 "게임 시작" 클릭 → WorldMapScene이 정상 렌더링되는지 확인
2. 각 노드의 잠금/해금 상태가 플레이어 레벨에 따라 올바른지 확인
3. 노드 클릭 → zoom-in → StageDetailScene 전환 애니메이션 확인
4. 상세 화면의 최대 XP/골드/웨이브/경로 수가 정확한지 데이터 검증
5. 클리어 기록이 progress.highestWave와 일치하는지 확인
6. 덱 편집이 정상 동작하고 metaStore와 동기화되는지 확인
7. 상세 화면 "게임 시작" → GameScene 정상 진입 확인
8. "뒤로가기"로 월드맵 → HomeTab 복귀가 정상인지 확인
9. 모바일(375px) 해상도에서 레이아웃 확인

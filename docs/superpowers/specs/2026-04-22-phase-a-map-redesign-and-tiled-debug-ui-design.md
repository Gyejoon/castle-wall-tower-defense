# Phase A 맵 리디자인 및 Tiled 디버그 UI 설계

## Context

현재 Phase A 전장은 [packages/shared/src/constants/maps.ts](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/shared/src/constants/maps.ts:1)의 `PHASE_A_LONG_MAP`와 [packages/web-shell/public/assets/maps/phase-a-long.json](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/web-shell/public/assets/maps/phase-a-long.json:1), 그리고 [packages/phaser-game/src/scenes/Game.ts](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/phaser-game/src/scenes/Game.ts:539)의 렌더링 로직이 결합해서 만든 구조다.

지금 전장의 문제는 세 가지다.

1. 세로 모드인데도 좌우 폭을 충분히 쓰지 못해 화면이 가운데로 모여 보인다.
2. 길, 타워 배치 지대, 성벽의 높이 차가 약해서 맵이 평평하고 싸구려처럼 보인다.
3. 전투 템포가 빨라서 전장의 구조와 공성전 분위기를 읽기 전에 상황이 지나간다.

이번 작업은 단순 비주얼 수정이 아니다. 맵의 인상, 전투 템포, 그리고 이후 유지보수 방식까지 같이 고친다.

---

## 목표

- 세로 모드를 유지하면서도 좌우 폭을 강하게 확장한다.
- "긴 전장", "왕복/꺾임이 읽히는 요새형 동선", "성벽을 지키는 탑다운 공성전 분위기"를 유지한다.
- 경로는 지금보다 더 길어져야 한다. 전투 템포는 의도적으로 느려져야 한다.
- buildable 총량은 현재와 거의 같게 유지한다. 넓어진 면적을 그대로 배치 칸으로 열지 않는다.
- 시각 맵은 Tiled에서 편집 가능하게 만들고, 밸런스 규칙은 코드가 계속 관리한다.
- `tiled-for-agent`의 디버그 페이지에 레이어 상태와 간단한 맵 미리보기를 붙여 확인 루프를 짧게 만든다.

---

## 설계 결정

| 항목 | 선택 | 이유 |
|------|------|------|
| 전장 구조 변경 범위 | 경로 구조 포함 전체 재설계 | 현재 맵의 핵심 문제는 구조와 실루엣이 동시에 약하기 때문 |
| 유지할 플레이 감각 | 긴 전장 + 요새형 왕복 동선 + 공성전 분위기 전부 유지 | 사용자가 절대 유지해야 할 요소로 명시 |
| 화면 기준 | 세로 모드 유지 | 가로 모드 전환이 아니라 세로 화면 안에서 좌우 활용 확대가 목적 |
| 폭 확장 강도 | 강한 확장 | "거의 새 맵처럼 느껴지는 수준"까지 허용됨 |
| 분위기 | 석조 요새 + 자연 지형 혼합 | 성채와 자연 지형이 동시에 읽히는 방향 선호 |
| buildable 총량 | 현재와 거의 동일 | 밸런스 붕괴 방지 |
| 경로 길이 / 템포 | 현재보다 더 길게, 더 느리게 | 지금은 너무 빨라서 정신없다는 피드백 반영 |
| 소스 오브 트루스 | 혼합형 | 시각 맵은 Tiled, 밸런스 규칙은 코드로 유지하는 것이 가장 관리가 쉬움 |
| 디버그 UI 범위 | 상태 + 미리보기 | 브라우저 편집기까지는 과하고, 검수용 미리보기는 꼭 필요 |

---

## 제안 전장 구조

### 요약

기존 `9x18` 전장을 `12x20` 수준으로 확장한다.

- 현재: `9x18`, path `89`, buildable `67`
- 목표: `12x20`, path `115~125`, buildable `64~68`

즉, 보이는 전장은 확실히 커지지만 배치 가능한 총량은 거의 그대로 유지한다.

### 실루엣

기본 구조는 `쌍둥이 성루 회랑`이다.

- 좌우에 큰 성루형 날개를 둔다.
- 중앙은 성채/절벽/자연 지형이 섞인 비buildable 구역으로 둔다.
- 경로는 좌우 회랑을 길게 왕복하면서 하단 또는 중앙 횡단부를 크게 사용한다.
- 최종 출구는 성벽/성문 감각이 강하게 읽히는 위치에 둔다.

### 높이감

전장은 최소 3레벨로 읽혀야 한다.

1. `road_low`
   적이 실제로 지나가는 가장 낮은 레벨
2. `platform_high`
   타워를 올리는 주 전투 지대
3. `wall_mass` / `wall_trim`
   성벽과 성문이 보이는 최상단 구조물

이 차이를 `platform_high`와 `cliff_faces`로 명확히 보여줘야 한다. 단순 색 차이만으로는 부족하다.

### 좌우 폭 활용 방식

좌우로 넓어진 공간을 전부 buildable로 열지 않는다.

- 일부는 성루 매스
- 일부는 절벽/협곡 면
- 일부는 나무, 바위, 관목, 깃발 같은 장식 회랑

즉, "넓어 보이는 것"과 "실제로 타워를 놓을 수 있는 것"을 분리한다.

### 템포

맵이 더 길어지면서 웨이브 체감은 지금보다 느려져야 한다.

이건 버그가 아니라 의도다. 현재는 전투가 너무 빨라 전장의 구조가 읽히지 않는다. 새 맵은 전장의 장면성과 적 이동 리듬이 플레이어에게 보이도록 설계한다.

---

## Tiled와 코드의 역할 분리

이번 작업은 `완전 Tiled 기준`이 아니라 `혼합형`으로 간다.

### Tiled가 관리하는 것

- 지형 레이아웃
- 바닥, 길, 고지대, 절벽, 성벽, 장식의 시각 구성
- 장식 오브젝트 배치
- 맵 실루엣과 장면 연출

### 코드가 관리하는 것

- `path`
- `buildablePoints`
- `blockedPlacementPoints`
- `spawnPoint`
- `exitPoint`
- 웨이브 템포와 밸런스에 직접 영향 주는 이동 동선

### 이유

현재 구조는 [packages/shared/src/constants/maps.ts](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/shared/src/constants/maps.ts:1)가 밸런스 규칙을 중심으로 이미 잘 고정돼 있다. 이걸 전부 Tiled로 옮기면 이번 작업 범위를 넘고, 시스템 안정성도 떨어진다.

반면 시각 반복 작업을 계속 코드로만 하는 것도 비효율적이다. 그래서 "보이는 전장"만 Tiled로 빼는 게 가장 현실적이다.

---

## 파일 구조 제안

### grid-line-defense-pvp

- 새 시각 맵 파일
  - `packages/web-shell/public/assets/maps/phase-a-long-v2.tmj`
- 코드 규칙
  - [packages/shared/src/constants/maps.ts](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/shared/src/constants/maps.ts:1)에 `PHASE_A_LONG_MAP_V2` 추가 또는 기존 `PHASE_A_LONG_MAP` 교체
- Phaser 렌더링
  - [packages/phaser-game/src/scenes/Game.ts](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/phaser-game/src/scenes/Game.ts:539)에서 새 Tiled 시각 레이어를 읽어 렌더링 강화

### tiled-for-agent

- 디버그 페이지 강화
  - `tools/tiled-agent-orchestrator/public/index.html`
  - 필요 시 프런트엔드 보조 스크립트 추가
- snapshot 기반 캔버스 미리보기
  - tile layer, object layer, path/buildable/obstacle overlay를 간단 렌더링

---

## Tiled 레이어 구조

이건 Tiled의 공식 용어가 아니라, 이번 맵을 관리하기 쉽게 나눈 역할별 레이어다.

- `ground_base`
  - 맵의 맨바닥. 흙, 잔디, 바닥 패턴
- `road_low`
  - 적이 지나는 길. 낮은 레벨
- `platform_high`
  - 타워를 두는 높은 전투 지대
- `cliff_faces`
  - 높은 지대의 옆면. 고저차를 읽게 만드는 레이어
- `wall_mass`
  - 성벽과 큰 석조 덩어리의 본체
- `wall_trim`
  - 성문, 난간, 벽 모서리 같은 마감 디테일
- `foliage_low`
  - 낮은 수풀과 바닥 근처 자연물
- `decorations`
  - 나무, 바위, 깃발, 부서진 구조물 같은 장식 오브젝트 레이어

핵심은 이거다.

- 플레이 규칙은 코드가 관리
- Tiled 레이어는 "맵이 좋아 보이게 하는 시각 정보"를 관리

---

## 런타임 연결 방식

### 데이터 흐름

1. Tiled에서 시각 맵 `phase-a-long-v2.tmj`를 편집한다.
2. 게임은 이 파일에서 지형 레이어와 장식 오브젝트를 읽는다.
3. 실제 경로와 buildable cap은 `PHASE_A_LONG_MAP_V2`가 계속 책임진다.
4. Phaser는 시각 정보와 규칙 정보를 합쳐 최종 전장을 렌더링한다.

### 기대 효과

- 비주얼 반복 수정이 쉬워진다.
- 밸런스는 코드에서 계속 통제된다.
- "맵이 커졌더니 타워 칸이 너무 늘어남" 같은 사고를 구조적으로 방지할 수 있다.

---

## Tiled Agent 디버그 UI 범위

이번 작업에서 `tiled-for-agent`는 브라우저 편집기까지 가지 않는다. 대신 "확인과 검수"에 강한 디버그 UI로 확장한다.

### 포함

- 현재 `session / document / revision` 표시
- 레이어 목록, 레이어 타입, visible 상태 표시
- object count, tileset 정보, diagnostics 표시
- 간단한 2D 캔버스 미리보기
- `path / buildable / obstacle` 오버레이 토글

### 제외

- 브라우저 내 직접 편집
- 브러시/드래그/선택 툴
- Tiled 데스크톱 대체 수준의 기능

### 이유

이번 요청의 핵심은 "맵을 바꾼 뒤 바로 좋아졌는지 볼 수 있는 것"이다. 상태 패널만으로는 부족하고, 그렇다고 웹 편집기까지 만드는 건 과하다. 그래서 `상태 + 미리보기`가 맞다.

---

## 구현 순서

### 1. 맵 리디자인

`grid-line-defense-pvp`에서 새 전장 구조를 만든다.

- `12x20` 수준으로 확장
- 쌍둥이 성루 회랑 실루엣
- 석조 요새 + 자연 지형 혼합
- path 연장
- buildable 총량 유지

### 2. 런타임 연결

- Tiled 맵 파일 추가
- 코드 맵 상수 업데이트
- Phaser가 새 시각 맵을 읽도록 연결

### 3. 디버그 UI 강화

`tiled-for-agent` 디버그 페이지에

- session 정보
- 레이어 상태
- diagnostics
- 캔버스 미리보기
- 오버레이 토글

을 추가한다.

### 4. 사용법 정리

- 새 맵 파일을 Tiled에서 여는 방법
- 저장 후 게임에서 반영 확인하는 방법
- Tiled Agent로 snapshot/미리보기 보는 방법

까지 문서화한다.

---

## 수용 기준

### 맵 품질

- 좌우 폭이 현재보다 확실히 커 보여야 한다.
- 길 아래 / 전투 지대 위 / 성벽 최상단의 높이 차가 읽혀야 한다.
- 성벽과 자연 지형이 함께 보이는 공성전 분위기가 살아야 한다.

### 게임성

- buildable 총량은 현재와 거의 같아야 한다.
- path 길이는 늘어나야 한다.
- 전투 템포는 지금보다 느려져야 한다.
- 어디에 타워를 놔도 오래 쓸모 있는 긴 전장 감각은 유지되어야 한다.

### 도구성

- 새 맵 파일을 Tiled에서 직접 열 수 있어야 한다.
- 저장 후 게임 레포에서 바로 반영 확인 가능해야 한다.
- `tiled-for-agent` 디버그 페이지에서 레이어 상태와 간단 미리보기를 확인할 수 있어야 한다.

---

## 리스크와 대응

### 리스크 1. 맵은 커졌는데 빌드 칸이 너무 많아짐

대응:
- 넓어진 좌우를 성벽, 절벽, 장식 회랑으로 소화
- buildable은 코드 상수로 캡 유지

### 리스크 2. 시각 맵과 코드 경로가 어긋남

대응:
- Tiled는 시각용, 코드는 규칙용이라는 경계를 문서화
- 디버그 UI에 path/buildable/obstacle overlay를 넣어 어긋남을 즉시 확인

### 리스크 3. 높이감은 생겼는데 readability가 나빠짐

대응:
- `cliff_faces`와 `wall_trim`은 실루엣과 경계 가독성을 우선
- 장식은 중심 전투 영역을 가리지 않게 low/high depth를 분리

---

## 구현 전 확인 사항

- 이 설계는 두 저장소를 함께 수정하는 작업이다.
  - `grid-line-defense-pvp`
  - `tiled-for-agent`
- Tiled 파일은 시각 원본이고, 게임 밸런스는 코드가 유지한다.
- 디버그 UI는 검수용 범위만 포함한다.

이 세 가지를 끝까지 흔들지 않는 것이 이번 작업의 핵심이다.

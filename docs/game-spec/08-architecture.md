# 08 — 코드 아키텍처 레퍼런스

> **Last Updated:** 2026-05-06 (v4.0 — minimal launch architecture)
> **Scope:** 현재 제품 런타임은 Phaser, 향후 Unity WebGL 전환은 유지한다. v1 스펙 감량은 아키텍처 확장을 줄이기 위한 기준이다.

---

## 1. Package Structure

```text
@gld/shared
  -> @gld/phaser-game
  -> web-shell
  -> tools-app
  -> unity-game
```

| 패키지 | 역할 | v1 정책 |
|--------|------|---------|
| `@gld/shared` | 타입, 상수, 밸런스 데이터 | engine-neutral source |
| `@gld/phaser-game` | 현재 playable runtime | v1 출시 기준 |
| `web-shell` | React shell, HUD, lobby, Zustand | v1 제품 surface |
| `tools-app` | 로컬 개발 도구 | production surface 아님 |
| `unity-game` | Unity WebGL 전환 PoC | 유지, 기능 확장보다 parity 우선 |

`@gld/shared`를 가능한 한 단일 규칙 원천으로 유지한다. Unity 전환 시 tower/unit/wave/map 데이터를 JSON export로 공유한다.

---

## 2. Active Runtime Path

v1 제품 기준 경로:

```text
React web-shell
  -> PhaserGame mount
  -> Game scene
  -> GridManager / PathfindingSystem
  -> TowerSystem / UnitSystem / WaveSystem / EnergySystem
  -> CoreOrchestrator
  -> EventBus back to React HUD
```

### CoreOrchestrator Responsibility

| 책임 | 정책 |
|------|------|
| 기본 소환 | T1 draw |
| tier 가챠 | T2/T3/T4 energy roll |
| 합성 | family/tier validation |
| 카드 적용 | run-scoped modifier |
| 광고 hook | rewarded result 수신 |
| 리롤 방지 | cancelled draw cache 유지 |

CoreOrchestrator가 커질수록 유지보수 비용이 늘어난다. v1에서는 신규 BM, 신규 메타, 신규 모드를 여기에 추가하지 않는다.

---

## 3. Legacy Surface Policy

정식 모드 이전 코드 경로가 일부 남아 있을 수 있다. v1 active spec은 아래를 사용하지 않는다.

| Legacy surface | v1 정책 |
|----------------|---------|
| DeckSystem | main_long에서는 빈 덱/호환 shell로만 취급 |
| GimmickSystem | 신규 기믹 추가 금지 |
| WorldMap / StageSelect | 제품 surface에서 제외 |
| Missions / Achievements | 제외 |
| grade / awakening | 신규 성장축에서 제외 |
| star rating | 제외 |

legacy 코드는 안전하게 제거할 수 있을 때 별도 PR에서 정리한다. 기능 확장 목적으로 재활성화하지 않는다.

---

## 4. EventBus Contract

React와 Phaser는 EventBus로만 실시간 통신한다.

### Game -> React

| 이벤트 | 용도 |
|--------|------|
| `game-ready` | scene create 완료 |
| `energy-changed` | energy HUD 갱신 |
| `tower-placed` | 배치 결과 |
| `tower-summoned` | 소환 성공 |
| `towers-merged` | 합성 성공 |
| `merge-failed` | 합성 실패 |
| `wave-started` | wave HUD |
| `wave-completed` | wave 종료 |
| `boss-warning` | 보스 진입 |
| `boss-hp-update` | 보스 HP HUD |
| `upgrade-choice-ready` | 3카드 선택 |
| `upgrade-applied` | 카드 적용 |
| `game-over` | 결과 화면 |

### React -> Game

| 이벤트 | 용도 |
|--------|------|
| `request-summon-tower` | 기본 소환 |
| `request-gacha-summon` | tier 가챠 |
| `request-merge-towers` | 합성 |
| `request-enter-move-mode` | 이동 모드 |
| `request-move-tower` | 이동 |
| `request-sell-tower` | 판매 |
| `request-family-upgrade` | 패밀리 강화 |
| `request-apply-upgrade` | 카드 선택 |
| `request-set-speed` | 속도 변경 |
| `request-reset-run` | 재시작 |

이벤트를 추가할 때는 `packages/phaser-game/src/EventBus.ts`의 `GameEventMap`과 React 수신/발신 지점을 함께 갱신한다.

---

## 5. State Layers

| Layer | 수명 | 저장 내용 |
|-------|------|-----------|
| Phaser systems | frame/run | 유닛, 타워, wave, combat state |
| `gameStore` | run | HUD, runStatus, energy, HP, toasts |
| `metaProgressStore` | persistent | 최고 기록, 설정, 간단 메타 |
| localStorage | persistent | v1 save snapshot |

v1에서는 새로운 global store를 늘리지 않는다.

---

## 6. Run State Machine

```text
lobby -> building -> running -> victory
                         -> defeat
victory/defeat -> lobby or resetRun
```

| 전이 | 트리거 |
|------|--------|
| `lobby -> building` | 전투 시작 |
| `building -> running` | wave started |
| `running -> victory` | v1에서는 선택. endless면 거의 사용하지 않음 |
| `running -> defeat` | HP 0 또는 boss leak |
| `defeat -> running` | rewarded continue 성공, 런당 1회 |

---

## 7. Wave State Machine

```text
prep -> spawning -> combat/boss -> waiting -> next wave
                                      -> ended
```

| phase | 정책 |
|-------|------|
| `prep` | 시작 준비, 짧게 유지 |
| `spawning` | 유닛 생성 |
| `combat` | 일반 wave |
| `boss` | 보스 wave, 카드 보상 트리거 |
| `waiting` | 다음 wave 전 짧은 대기 |
| `ended` | 디버그/상한 처리 |

v1 UX 기준은 wave 15 안쪽이다. 50 wave는 데이터 상한으로만 취급한다.

---

## 8. Cleanup Order

shutdown 시 기본 순서:

```text
EventBus off
input/controller destroy
CoreOrchestrator destroy
sound reset
damage numbers destroy
TowerSystem destroy
UnitSystem destroy
WaveSystem destroy
EnergySystem reset
renderers destroy
```

EventBus를 먼저 끊어 destroy된 system에 request가 닿지 않게 한다.

---

## 9. Unity Transition Architecture

Unity 전환은 유지한다.

| 항목 | 원칙 |
|------|------|
| URL | `/unity/?slice=poc` 또는 별도 gated route |
| Shared data | `@gld/shared` -> JSON export |
| Scope | Phaser v1 최소 루프 parity |
| Not included | 신규 BM, 신규 map, 신규 meta |
| Decision gate | Unity가 같은 루프를 더 안정적으로 유지할 수 있는지 |

Unity Phase 2 PoC는 full EventBus parity를 요구하지 않는다. 먼저 순수 게임 루프 parity를 맞추고, 이후 React shell 통합 방식을 결정한다.

---

## 10. Architecture Parking Lot

아래는 v1 active architecture가 아니다.

- 서버 저장
- 실시간/비동기 PVP
- leaderboard
- season reset
- shop catalog backend
- mission scheduler
- return user campaign
- AI personalization

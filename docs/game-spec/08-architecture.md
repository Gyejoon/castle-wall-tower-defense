# 08 — 코드 아키텍처 레퍼런스

> **Last Updated:** 2026-05-09 (v5.0 — central wall checkpoint architecture)
> **Scope:** v1 active loop는 Unity WebGL 기준으로 중앙 성벽, 4속성 슬롯, Act checkpoint를 검증한다. Phaser/랜덤 합성 루프는 legacy/parking lot로 내린다.

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
Unity Root scene
  -> GridManager / PathfindingSystem
  -> WallSystem / TowerSlotSystem / PlayerTacticSystem
  -> UnitSystem / WaveSystem / EnergySystem
  -> CoreOrchestrator checkpoint reward flow
  -> GameEvents -> Unity UI Toolkit HUD
```

### CoreOrchestrator Responsibility

| 책임 | 정책 |
|------|------|
| Act 시작 | wave 1/6/11/16 진입 이벤트 |
| checkpoint | wave 5/10/15/20 boss clear 후 3개 reward 제공 |
| reward 적용 | tower slot / wall / skill / global card 적용 후 다음 Act 진행 |
| 광고 hook | checkpoint reward reroll 수신 |
| legacy 보호 | summon/gacha/merge 이벤트는 active loop에서 사용하지 않음 |

CoreOrchestrator가 커질수록 유지보수 비용이 늘어난다. v1에서는 신규 BM, 신규 메타, 신규 모드를 여기에 추가하지 않는다.

### Unity HUD Layout Tuning

Unity HUD는 상단 에너지, WAVE, 일시정지, x3 버튼만 노출한다. 하단 액션, 좌측 진행도, 성벽 메뉴 버튼은 v1 HUD surface에서 제거한다. 위치/크기/간격은 `Assets/Resources/UI/HudLayoutConfig.asset`의 `HudLayoutConfigSO`에서 조정하며, 레퍼런스 이미지 정렬 작업은 C# 하드코딩 대신 이 에셋의 Inspector 값을 우선 수정한다. Editor Play Mode에서는 `enableDragEditing`이 켜져 있으면 상단 좌측 묶음과 우측 버튼 묶음을 Game View에서 직접 드래그해 위치를 저장할 수 있고, `Ctrl/Cmd+Z`로 되돌릴 수 있다. `GameHudController`는 런타임에 해당 에셋을 `Resources.Load("UI/HudLayoutConfig")`로 읽고, 에셋이 없을 때만 내부 기본값으로 fallback한다.

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
| request-summon-tower / request-gacha-summon / request-merge-towers | legacy/parking lot |

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
| `act-started` | Act 1~4 시작 |
| `checkpoint-ready` | boss clear 후 reward 3택 표시 |
| `checkpoint-applied` | reward 선택 적용 |
| `wall-state-changed` | 성벽 HP/수리/자동 공격 상태 |
| `wall-auto-attacked` | 성벽 자동 공격 발사/피격 FX |
| `tactic-state-changed` | 사용자 스킬 해금/쿨다운/레벨 |
| `tower-slot-upgraded` | 4속성 슬롯 등장/승급 |
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
| `request-apply-checkpoint-reward` | checkpoint reward 선택 |
| `request-cast-tactic` | force move / freeze 사용 |
| `request-repair-wall` | 성벽 수리 |
| `request-set-speed` | 속도 변경 |
| `request-reset-run` | 재시작 |

이벤트를 추가할 때는 `packages/phaser-game/src/EventBus.ts`의 `GameEventMap`과 React 수신/발신 지점을 함께 갱신한다.

Unity v1은 `GLD.Core.GameEvents`에 동등한 typed contract를 둔다.

| Type | 역할 |
|------|------|
| `ActDef` | Act index, startWave, endWave |
| `CheckpointReward` | reward id/type/title/target |
| `TowerSlotState` | family, tier, unlocked, grid position |
| `WallState` | maxHp/currentHp/repair cooldown/auto attack |
| `PlayerTacticState` | force move/freeze unlock, level, cooldown |

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

v1 UX 기준은 wave 20까지다. 50 wave는 데이터 상한으로만 취급한다.

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

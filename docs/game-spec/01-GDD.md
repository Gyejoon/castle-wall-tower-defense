# Game Design Document (GDD)

> **Last Updated:** 2026-04-14 (v2 — Phase A 피벗 적용)
> **Source:** Obsidian `ai/product/specs/일반모드 게임 설계 문서.md` + Phase A Core Loop Pivot plan (PR #170)
> 수치 변경은 [02-balance-sheet.md](./02-balance-sheet.md) 참조. BM은 [03-business-model.md](./03-business-model.md) 참조.
>
> **v2 피벗 노트 (2026-04-14)**: 4타워 덱 시스템에서 **픽셀 중세 랜덤 타워 합성 디펜스**로 코어 루프 피벗. 보유 풀에서 랜덤 1성 소환 + 같은 등급 두 타워 드래그 합성으로 등급을 올리는 구조 (Random Dice 류 8년 검증 장르). Phase A Core 시스템(SummonPoolSystem, RandomSummonSystem, MergeSystem, PhaseAOrchestrator)이 PR #170으로 머지되어 `phase_a_long` 전용 맵 + 로비 `[LAB]` 런치 버튼에서 실제 end-to-end 플레이 가능. 기존 W1~W3 레거시 스테이지(24개)는 4타워 덱 흐름으로 **완전 비파괴**. 본 문서의 §1, §3, §4, §5, §10은 v2 방향을 반영하며, 레거시 4타워 시스템의 운명은 Phase A "한 판 더" 플레이 검증 결과에 따라 Phase B 시점에 결정된다.

---

## 1. Game Definition

### 한 줄 정의 (v2)

> 픽셀 중세 랜덤 타워 합성 디펜스. 보유 풀에서 에너지를 써 랜덤 1성 타워를 소환하고, 같은 등급 두 개를 합성해 빌드를 만들어 wave를 버틴다.

### 기본 정보 (v2)

| 항목 | 내용 |
|------|------|
| Title | 영웅 (코드네임, 변경 가능) |
| Genre | 픽셀 중세 Random Tower Defense + Merge |
| Platform | Mobile Web (App In Toss) |
| Player Count | Single (비동기 PVP seam — leaderboard / ghost replay — 은 미래 가능성만 인정) |
| Camera/View | Top-down / Portrait Long Field (Phase A: 8×24 grid, S-curve path) |
| Input | Touch — 소환 버튼 + 타워 2회 탭으로 합성 |
| Session Length | 5~10분 |
| Core Fantasy | 보유 타워 풀에서 운명을 뽑아 합성으로 강해진 빌드를 만들어 wave를 막는 지휘관 |
| Core Fun | 랜덤 소환 슬롯머신 도파민 + 합성/등급업 도파민 + 보드 위 빌드 결정 + wave 대응 + 픽셀 중세 톤 |
| Win Condition | 생존 (Phase A `phase_a_s1`: 50 wave 무한 에스컬레이션, 보스 10 wave마다 교대 출현. 실질적으로 wave 15~35에서 자연 패배) |
| Lose Condition | 기지 HP 0 (적이 경로 끝 도달 시 -1) 또는 보스 leak 즉시 패배 |

**레거시 4타워 덱 시스템** (W1~W3 24스테이지): 이전 v1 GDD 정의대로 동작하며, Phase A 피벗 검증 기간 동안 비파괴로 유지된다. 최종 폐기 또는 병존 여부는 Phase B 시점에 결정.

---

## 2. User Frame

| 항목 | 내용 |
|------|------|
| 타깃 유저 | 짧은 세션 캐주얼 TD + 타워 수집/성장을 함께 원하는 유저 |
| 숙련도 | 캐주얼~미드코어 |
| 기대 감정 | 시원함, 긴장감, 전략적 만족감, 수집 성취감 |
| 첫 세션 목표 | 10초 내 "즉시 시작 → 배치 → 방어" 이해, 5분 내 첫 보스 경험 |
| 재방문 이유 | 새로운 배치 판단 + 골드/컬렉션/레벨 성장 + 더 높은 웨이브 돌파 |

---

## 3. Core Loop / Meta Loop (v2)

**Phase A Core Loop (신규 — `phase_a_long` 맵 전용)**
```
로비 홈 탭 → [LAB] Phase A 버튼 → phase_a_s1 스테이지 진입 → prep 5초
  → [반복] 에너지 = 킬 보상 (+1, 5배수 wave ×2) → 소환 버튼 탭 (⚡20) → 랜덤 1성 타워 드로우 → 유저가 빈 칸 탭해 배치 → scale 펀치 VFX
        → 같은 타워 + 같은 등급 두 칸 차례 탭 → request-merge-towers → MergeSystem validation
              → 성공 시 한 칸 사라지고 다른 칸 등급 ↑ + scale 펀치 + 골드 tint flash
              → 실패 시 한국어 토스트 (다른 타워 / 다른 등급 / 최고 등급 / 잘못된 칸)
        → wave 진입 → 자동 전투 → 웨이브 클리어 +5 에너지
  → wave 무한 에스컬레이션 (HP·속도 선형 증가, 30마리/wave, 보스 10 wave마다) → 패배 시 결과 화면 → 로비
```

**레거시 Core Loop (W1~W3 24스테이지, v1)**
```
로비 → 월드맵 → 스테이지 상세(덱 확인) → 게임 → 에너지 축적 → 4타워 중 선택 배치 → 10웨이브/보스 → 결과 → 보상
```

**Meta Loop (Phase A 기준 — 대부분 OFF)**
```
플레이 → 보유 타워 풀 확장 (가챠 또는 클리어 보상)
       → 다음 런에서 더 다양한 합성 빌드 가능
```

Phase A의 메타 강화 / 별 등급 / 승급 / 150레벨 / 일일 미션 등 레거시 메타 시스템은 **인게임 합성이 진행감을 흡수**한다는 가정으로 일시 비활성. 어느 메타를 살릴지는 Phase C에서 재설계한다. 레거시 스테이지에서는 기존 메타 루프가 그대로 작동한다.

---

## 4. Core Systems (v2)

### Phase A 신규 시스템 (v2 — `phase_a_long` 맵 전용)

| 시스템 | 정의 | 핵심 파라미터 |
|--------|------|-------------|
| SummonPoolSystem | 보유 타워 풀 런타임 관리. `draw()`, `replacePool()`, `reset()` | `initialPool` (Phase A: `[archer, plasma, emp, nova_cannon, flame_tower]`), injectable `rng` |
| RandomSummonSystem | 빈 buildable 타일 선택 + 풀에서 draw 컴포지션. `requestSummon(ctx)` | `SummonPlacementContext` (`listBuildableTiles`, `isOccupied`) |
| MergeSystem | 순수 합성 validation. `tryMerge(ctx, fromCol, fromRow, toCol, toRow)` → discriminated union | `MergeContext.getTowerAt`, `nextGrade()` |
| PhaseAOrchestrator | SummonPool + MergeSystem owning + TowerSystem 어댑터 + EventBus 리스너 (idempotent off→on) + EnergySystem gating. 2-step 소환: draw → 유저 배치 | `PHASE_A_SUMMON_COST = 20`, `PhaseAEnergyApi` 구조적 surface |

**핵심 메커니즘 변경**
- **Placement (v2)**: 직접 배치 → **랜덤 소환 + 자동 빈 칸 배치**. 유저는 어디에 놓을지 선택하지 않음, 어떤 타워가 나올지도 선택하지 않음. 유일한 결정은 언제 소환할지 + 무엇을 합성할지.
- **Tower Upgrade (v2)**: 영구 메타 강화 → **인게임 합성 등급** (`normal → rare → unique → epic`). 같은 타워 같은 등급 2개 → 1개로 병합 + 1등급 ↑. max-grade(`epic`) 도달 시 더 이상 합성 불가. 합성 시 sprite texture 재설정 + `effectiveDamage` 재계산.
- **Energy Economy (v2)**: 킬 보상 기반. 몬스터 처치당 +1 에너지 (5배수 wave에서는 ×2). 시간 리젠(1/sec) 비활성, 웨이브 클리어 보너스 비활성. **소환당 20 에너지**. 초기 40 → 2회 무료 소환. 이후 킬 효율로 에너지 축적 → 소환 가능. 30킬/wave × +1 = 30 에너지/wave → 소환 1.5회분.
- **Tower Sell (v2)**: 비활성화. 합성으로 불필요한 타워를 소비한다는 가정.

### 레거시 시스템 (v1 — W1~W3 24스테이지에서 그대로 작동)

| 시스템 | 정의 | 핵심 파라미터 |
|--------|------|-------------|
| Combat | 타워 자동 공격 + 적 고정 경로 이동 실시간 방어 | damage, armor, attackSpeed, target priority |
| Movement | 적은 spawn→exit 세로 레인 이동, 탭으로 배치 | speed, path rules, blocked path prevention |
| Placement (legacy) | 에너지 소비해 4타워 카드 중 1개 선택 → buildable tile 배치 | 초기 40, 1/sec 축적, 웨이브 클리어 +5, 공격형 10 / CC형 20 |
| Tower Sell (legacy) | 배치된 타워 탭 → 판매 패널 → 에너지 50% 환급 | `TowerSystem.calcRefund()` 단일 출처 |
| Element | 화/수/번개/무 속성 상성 | element_type, matchup_multiplier (0.7x/1.0x/1.3x) |
| Gacha/Box | 상자에서 히든 타워 획득 | box_type, cost, rate_table, pity(50회) |
| Upgrade (legacy) | 골드 소비 레벨업 + 등급 승급 (확률 기반) | level, grade, stat growth |
| Boss/Encounter | `wave.kind === 'boss' \|\| unitDef.bossBehaviorId`. 월드별 보스: orc_warlord(W1), forge_master(W2), corrupted_archmage(W3) | boss timing, warning telegraph, phase, reward |
| GimmickSystem | 월드별 고유 기믹 (용광로 폭발, 마력 폭주 등) | gimmick_id, active_tiles, intensity_by_star |

**공존 방식**: `GameScene.create()`에서 `currentMap.id === PHASE_A_MAP_ID` 분기로 PhaseAOrchestrator 생성 여부를 결정. Phase A 맵에서는 DeckSystem을 빈 덱으로 생성해 4타워 덱 흐름을 자연스럽게 skip.

---

## 5. Content Plan (v2)

### Phase A 콘텐츠 (v2)

| 분류 | 수량 | 비고 |
|------|------|------|
| 소환 풀 타워 | 5종 (`archer`, `plasma`, `emp`, `nova_cannon`, `flame_tower`) | 역할 커버: 단일/에너지/CC/스플래시/DOT |
| 등급 단계 | 4단계 (`normal → rare → unique → epic`) | 기존 `TowerGrade` 재활용, 텍스처도 기존 에셋 |
| 맵 | 1종 (`phase_a_long`, 8×24 long portrait) | 4-sweep S-curve, 55 path cells, ~131 buildable |
| 스테이지 | 1종 (`phase_a_s1`) | hidden world `phase_a_lab` (order 99, WORLD_ORDER 밖), 로비 `[LAB]` 버튼 진입 |
| 웨이브 | 50 (endless, 보스 10 wave마다) | 30마리/wave, 1초 간격 스폰. 보스: orc_warlord ↔ forge_master 교대 |
| 적 유형 | 3종 재활용 (`scout_drone`, `battle_robot`, `heavy_walker`) + 보스 1종 | 신규 유닛 없음, 레거시 자산 100% 재활용 |

**Phase B 확장 예정 (Phase A 플레이 검증 통과 후)**
- 소환 풀을 19종 전체로 확장
- 맵 3~5개 추가 (각각 다른 path 모양)
- 액티브 스킬 1~2개 (Overdrive 우선, #145)
- 기믹 1~2개 + 대응 수단 (#154)

### ★ 별 등급 시스템 (레거시)

W1~W3 레거시 스테이지에만 작동. Phase A 스테이지는 ★ 비활성 (selectedStar=1 고정).
- ★1(정복)/★2(정예)/★3(지옥) 3단계 난이도
- ★1: 기본 1.0×, 생존 조건
- ★2: HP 2.5×, 방어 1.5×, 속도 1.2×, CC 저항 20%, HP 50%+ 유지
- ★3: HP 5.0×, 방어 2.5×, 속도 1.4×, CC 저항 40%, HP 80%+ 유지

### 레거시 콘텐츠 (v1 — W1~W3)

| 분류 | 수량 | 해금 조건 |
|------|------|---------|
| 타워 | 18종 × 5티어 | 기본 풀 + 가챠 획득 |
| 적 유형 | 9종 (W1: scout_drone, battle_robot, heavy_walker, stealth_drone, dragon / W2: flame_imp, lava_golem / W3: arcane_mage, mana_shield) | 월드별 제공 |
| 보스 | 월드별 보스 3종 (orc_warlord, forge_master, corrupted_archmage) — 2페이즈 | 보스 스테이지(s8): boss 웨이브 10 |
| 스테이지 | 3월드 × 8스테이지 = 24스테이지 | 기본 / LV.3 / LV.7 |
| 웨이브 | 10웨이브 구조 (보스 1회, 최종 웨이브) | — |

---

## 6. Balance (요약)

> 상세 수치는 [02-balance-sheet.md](./02-balance-sheet.md) 참조.

### 타워 18종 (역할군별)

| 역할군 | 에너지 비용 | 특성 | 패시브 |
|--------|----------|------|-------|
| 집중 공격형 | 10 | 단일 타겟 고데미지 | armor pierce |
| 다중 공격형 | 10 | splash 50% | — |
| 슬로우 | 20 | 쿨타임 기반, 중복 불가 | — |
| 스턴 | 20 | 쿨타임 기반, 중복 불가 | — |

### 타워 전체 목록

| id | name | tier | element | role |
|----|------|------|---------|------|
| archer | 궁수 탑 | 1 | 무 | 집중 공격형 |
| plasma | 투석기 | 1 | 무 | 다중 공격형 |
| emp | 서리 마탑 | 1 | 수 | 슬로우 |
| shield | 성기사 제단 | 1 | 무 | 스턴 |
| twin_archer | 쌍궁 탑 | 2 | 무 | 집중 공격형 |
| disruptor | 눈보라 탑 | 2 | 수 | 슬로우 |
| nova_cannon | 공성 대포 | 2 | 화 | 다중 공격형 |
| fortress | 수호 탑 | 2 | 무 | 스턴 |
| stasis_field | 빙하 제단 | 3 | 수 | 슬로우 |
| flame_tower | 화염 탑 | 3 | 화 | 집중 공격형 |
| wind_spire | 바람의 첨탑 | 3 | 번개 | 다중 공격형 |
| earth_golem | 대지 골렘 | 3 | 무 | 집중 공격형 |
| holy_shrine | 신성 제단 | 4 | 무 | 스턴 |
| dragon_nest | 용의 둥지 | 4 | 화 | 다중 공격형 |
| arcane_spire | 비전 첨탑 | 4 | 번개 | 집중 공격형 |
| world_tree | 세계수 | 4 | 무 | 슬로우 |
| celestial | 천상의 탑 | 5 | 번개 | 다중 공격형 |
| divine_throne | 신의 옥좌 | 5 | 무 | 스턴 |

### 속성 상성표

| 공격 \ 방어 | 화 | 수 | 번개 | 무 |
|------------|----|----|------|-----|
| 화 | 1.0x | 0.7x | 1.3x | 1.0x |
| 수 | 1.3x | 1.0x | 0.7x | 1.0x |
| 번개 | 0.7x | 1.3x | 1.0x | 1.0x |
| 무 | 1.0x | 1.0x | 1.0x | 1.0x |

### 적 유닛 (9종 + 보스 3종)

#### W1 숲의 문 (일반)

| id | name | element | hp | speed | armor | bounty | 특성 |
|----|------|---------|-----|-------|-------|--------|------|
| scout_drone | 고블린 정찰병 | 무 | 30 | 3.0 | 0 | 5 | — |
| battle_robot | 오크 전사 | 무 | 80 | 1.5 | 5 | 12 | — |
| heavy_walker | 돌 트롤 | 화 | 200 | 0.8 | 12 | 25 | — |
| stealth_drone | 그림자 암살자 | 번개 | 50 | 2.5 | 0 | 18 | — |
| dragon | 고대 드래곤 | 화 | 500 | 0.5 | 25 | 60 | **비행** (충돌 면제) |

#### W2 용광로 (추가)

| id | name | element | hp | speed | armor | bounty | 특성 |
|----|------|---------|-----|-------|-------|--------|------|
| flame_imp | 화염 임프 | 화 | 80 | 2.2 | 0 | 12 | — |
| lava_golem | 용암 골렘 | 화 | 900 | 0.6 | 30 | 80 | — |

#### W3 폭풍 성채 (추가)

| id | name | element | hp | speed | armor | bounty | 특성 |
|----|------|---------|-----|-------|-------|--------|------|
| arcane_mage | 마법사 유닛 | 번개 | 180 | 1.0 | 5 | 30 | ranged_tower_attack (사거리 2, 데미지 25, 쿨 3초) |
| mana_shield | 마력 방패병 | 번개 | 250 | 0.9 | 10 | 45 | damage_shield (방패 HP 300) |

#### 보스 유닛

| id | name | element | hp | speed | armor | bounty | bossBehaviorId | 특수 능력 |
|----|------|---------|-----|-------|-------|--------|----------------|----------|
| orc_warlord | 오크 전쟁 대장 | 무 | 4,000 | 0.8 | 20 | 300 | orc_warlord | HP 50% 이하 시 battle_robot 4마리 소환 |
| forge_master | 단조장의 군주 | 화 | 12,000 | 0.7 | 35 | 500 | forge_master | 10초마다 랜덤 타워 5초 비활성화 |
| corrupted_archmage | 타락한 대마법사 | 번개 | 25,000 | 0.8 | 30 | 800 | corrupted_archmage | 스폰 시 클론 소환, CC 면역 |

> dragon은 `flying: true`로 지상 물리 충돌에서 면제. 다른 유닛을 통과하여 이동.

### 물리 충돌 시스템

몬스터 간 물리 충돌은 **비활성화** 상태이다. `sweepCollisions()`는 즉시 반환하며, 스폰 차단 로직도 제거되어 유닛이 서로를 통과하여 이동한다.

> 코드: `packages/phaser-game/src/systems/UnitSystem.ts` (sweepCollisions — disabled)

### 웨이브 구성 — STAGE_WAVES 기반

레거시 맵별 웨이브 배열은 제거되었다. 모든 웨이브 정의는 `STAGE_WAVES` (스테이지 키: `w{world}_s{stage}`) 단일 원천으로 관리된다. 각 월드에 8개 스테이지, 마지막 스테이지(s8)가 보스 스테이지이다.

#### 공통 웨이브 패턴 (s8 보스 스테이지 기준)

| wave | kind | 역할 |
|------|------|------|
| 1~9 | normal | 일반 적 조합, 난이도 점진 상승 |
| **10** | **boss** | 최종 보스 (boss-warning 이벤트 emit 후 스폰) |

비보스 스테이지(s1~s7)는 5~9웨이브 구성이며 보스 없이 normal 웨이브만 포함한다.

### 웨이브별 스케일링 (WAVE_SCALING)

웨이브 진행에 따라 몬스터 HP/속도에 배수 적용. 초반 완만, 후반 가파름.

| Wave | HP 배수 | 속도 배수 |
|------|---------|----------|
| 1-2 | 1.0× | 1.0× |
| 3 | 1.1× | 1.0× |
| 4 | 1.2× | 1.0× |
| 5 | 1.5× | 1.05× |
| 6 | 1.8× | 1.05× |
| 7 | 2.2× | 1.1× |
| 8 | 2.6× | 1.1× |
| 9 | 3.0× | 1.15× |
| 10 | 3.5× | 1.15× |

### 웨이브 제한 시간

| 항목 | 값 |
|------|-----|
| MAX_WAVE_DURATION_MS | 30,000 (30초) |
| 타이머 만료 시 | 잔존 몬스터 유지한 채 다음 웨이브 즉시 스폰 |
| 마지막 웨이브(보스전) | 타이머 면제 (무제한) |

> 코드: `packages/shared/src/constants/waves.ts`, `packages/phaser-game/src/systems/WaveSystem.ts`

### 맵별 난이도 배수 (difficultyHpMult)

| 맵 | HP 배수 | 보상 배수 |
|----|---------|----------|
| forest_gate | 1.0× | 1× |
| lava_fortress | 1.3× | 2× |
| storm_citadel | 1.6× | 3× |

**HP 적용 순서:** base × difficultyHpMult × WAVE_SCALING × FINAL_BOSS(마지막 웨이브 보스에만 1.5×)

---

## 7. Level Design

| 항목 | 내용 |
|------|------|
| Objective | 성문이 무너지기 전에 10웨이브 + 보스 2회 생존 |
| Map Structure | 세로형 단일 필드 / 고정 레인 / buildable tile 분리 |
| Danger Points | 고속 러시, 고장갑 탱커, 보스 웨이브(10) |
| Difficulty Spike | 웨이브 8~9 (고밀도), 웨이브 10 (최종 보스) |
| Boss Leak Rule | boss-kind 웨이브(웨이브 10)에서 보스가 경로 끝 도달 시 HP 관계없이 즉시 패배 |
| Checkpoint | 없음 — 실패 시 즉시 재도전 또는 로비 복귀 |

### 보스 연출 시퀀스

| 타이밍 | 연출 |
|--------|------|
| 웨이브 1~9 (normal) | 일반 웨이브 진행 |
| 웨이브 10 진입 시 | boss-warning 이벤트 emit + "WARNING" 표시 |
| 웨이브 10 보스 스폰 | 강화 보스 (FINAL_BOSS_HP_MULTIPLIER 1.5×) + 호위 동시 스폰 + 흔들림 |
| 최종 클리어 | 슬로모션 + "STAGE CLEAR" + 보상 팝업 |

---

## 8. UI / UX

### UI 구조

- **HUD**: HP, 에너지, 웨이브 카운터, 보스 경고, 결과 오버레이, 나가기 버튼, 배속 토글
  - HP 변화 시 scale flash 애니메이션 (250ms ease-out, 초기 마운트 시 스킵)
  - 부유 데미지 넘버 (Phaser Text 오브젝트 풀 24개, 600ms ease-out-quad 부유)
- **ProfileBar** (로비 상단): 아바타/닉네임/Lv, XP 바, 골드 잔액, 다이아 잔액
- **Lobby**: BottomTabBar 3탭 (Home·Collection·Settings) + Home 탭 우측 상단 플로팅 아이콘 (Missions·Achievements). 각 아이콘에 수령 가능 카운트 뱃지(`-top-1 -right-1`, `bg-danger`, `text-[8px] font-pixel`, `warningPulse 1.6s` 애니메이션, `aria-label`에 카운트 포함, `useClaimableCounts` 훅이 `metaStore`에서 `current >= target && !claimed` 집계). Home 탭에 단일 "성벽 막기" 골드 버튼. Collection 탭(전쟁탁자)에 출전덱 4슬롯 미리보기 + 편집 버튼
- **WorldMapPage** (스테이지 선택): 세로 카드 리스트 레이아웃. 각 카드는 좌측 64×64 landmark 썸네일 + 중앙 맵 이름(subtitle 13px) + 해금조건/추천 레벨(label 10px) + 별 진행도(★1/★2/★3 10×10 아이콘) + 우측 진입 화살표(해금 시만). 해금/잠금 상태 시각 구분: 해금=맵별 theme borderColor + accent 텍스트, 잠금=border #4a3a20 + opacity 45% + grayscale + 🔒 오버레이. 카드 간 간격 8px, 카드 내부 패딩 12px, 썸네일-정보 간격 12px (8/16/32/64 그리드 리듬). 터치 타겟 카드 전체 ≥ 88×358px (44×44 기준 초과). 상단 고정 헤더("스테이지 선택" + 좌측 돌아가기 + 우측 Lv 뱃지). 월드맵 괴리감 해소 및 맵 목록 스캔 용이성 우선.
- **StageDetailPage** (스테이지 상세): 히어로 썸네일 + 정보 카드(최대 XP/골드/웨이브/경로) + 클리어 기록 프로그레스바 + 2배속 가이드(클리어 완료 시 "▶▶ 클리어 완료 — 2배속 플레이 가능" 표시) + 출전 덱 4슬롯 미리보기 + 게임 시작
- **Deck/Build Panel (DeckEditSheet)**: 상단 고정 4슬롯 프리뷰(border-dashed 빈 슬롯, 루비 보석 × 아이콘으로 개별 제거) + 하단 스크롤 티어별 소유 타워 리스트(2열 그리드). 슬롯 탭 = × 아이콘, 리스트 탭 = 추가 (모드 혼동 방지). 확인 버튼 하단 고정.
- **Tower Sell Panel**: 배치된 타워 탭 시 하단 중앙에 표시 (타워 이름 + "판매 E+N" danger 버튼)
- **Exit Modal**: "나가기" 텍스트 버튼 탭 → 확인 모달 (게임 일시정지, "나가기"/"계속하기")
- **Result Screen**: 방어 성공/실패, 재도전, 로비 복귀. 현재 스테이지 이름 표시. 승리 시 "다음 스테이지" 버튼 (다음 스테이지 ★1로 이동)
- **Tutorial Overlay**: 첫 세션 5단계 (step 1~2만 강제)

### LoadingScreen & 페이지 전환

- **LoadingScreen** (Suspense fallback): 2단 타이포 계층
  - 타이틀: `font-pixel text-[15px] text-accent tracking-[0.16em]`, `>_` 터미널 프리픽스
  - 서브카피: `font-pixel text-[10px] text-text-secondary tracking-[0.1em]`, `matchmaking-dots` 3-dot 애니메이션
  - 레이아웃: `w-full h-full flex flex-col items-center pt-[40dvh]` (엄지 도달 영역, 불투명 `bg-bg`로 lazy chunk 로드 중 플래시 방지)
  - context별 카피:
    | context | 타이틀 | 서브카피 |
    |---------|--------|----------|
    | map | `>_ 월드맵 로딩` | `작전 지역 스캔 중` |
    | stage | `>_ 작전 브리핑` | `스테이지 정보 수신 중` |
    | battle | `>_ 전장 구축` | `타워 배치 준비` |
- **GamePage 부팅 오버레이**: LoadingScreen과 **동일한 시각 언어**
  - 타이틀 `>_ 전투 개시` + 서브카피 `그리드 초기화 중`
  - 반투명 배경(`rgba(26, 18, 8, 0.76)`)으로 그리드가 살짝 비침 → lazy chunk 로드 → Phaser 부팅 사이의 단절감 제거
- **페이지 전환 애니메이션**: `fadeSlideIn 220ms ease-out` (opacity 0→1 + translateY -4→0)
  - App.tsx 래퍼에 `key={phase}` 부여 (phase = `lobby|map|stage|battle`)
  - 주의: `key={runStatus}` 금지 — `building/running/victory/defeat`가 모두 GamePage이므로 `runStatus`를 키로 쓰면 전투 중 GamePage가 unmount되어 Phaser scene이 재초기화된다
  - `prefers-reduced-motion` 대응 (global.css 라인 291-294)

### iOS 사운드

iOS Safari/Chrome은 사용자 제스처 없이 AudioContext를 시작할 수 없음.
첫 `pointerdown`/`touchstart`/`click`에서 `await soundGenerator.unlock()` 호출 (async, try-catch 래핑).
unlock 후 저장된 SFX 볼륨을 오디오 엔진에 재적용. `visibilitychange`로 탭 전환 후 복귀 시에도 `await` 재개.
리스너는 `await` 전에 선제거하여 단일 제스처의 중복 이벤트(pointerdown+touchstart+click) 동시 호출 방지.
GamePage, StageSelectPage 모두 마운트 시 저장된 SFX 볼륨을 오디오 엔진에 초기 적용.

### 디자인 시스템

> 상세 컨텍스트는 `.impeccable.md` 참조. 아래는 구현 수준 요약.

**색상 토큰** (`packages/shared/src/constants/ui-colors.ts`)

| 토큰 | 값 | 용도 |
|------|-----|------|
| bg | #1a1208 | 기본 배경 |
| panel | #2a2010 | 패널 배경 |
| border | #4a3a20 | 테두리 |
| accent | #c8a04a | 주요 액션/강조 |
| success | #7ab648 | 성공 피드백 |
| danger | #c03020 | 위험/경고 |
| gold | #f0d060 | 통화/강조 |
| info | #5bc8e8 | 정보/수 속성 |
| text | #f0e8d8 | 기본 텍스트 |
| textSecondary | #a09070 | 보조 텍스트 |
| gradeUnique | #9060e0 | unique 등급 |
| tierBright | #ffe870 | tier 5 라벨 |
| bossPhase1 | #c87020 | 보스 1페이즈 HP |

**토큰 아키텍처**: `@gld/shared`의 `ui-colors.ts`가 단일 진실 원천.
- `UI_COLORS` (hex string) — React DOM용
- `PHASER_COLORS` (0x number) — Phaser Canvas용
- `web-shell/styles/tokens.ts`의 `colors`는 `UI_COLORS`를 re-export
- `global.css`의 `@theme` CSS 변수는 Tailwind v4용 복사본 (필수 중복)

**타이포그래피 스케일** (Press Start 2P / Galmuri11)

| 역할 | 크기 | 용도 |
|------|------|------|
| caption | 8px | 부가 정보, 서브라벨 |
| label | 10px | 통화량, 스탯 값, 작은 라벨 |
| body | 11px | 기본 본문, 리스트, 설정 |
| subtitle | 13px | 섹션 제목, 카드 이름 |
| title | 15px | 화면 제목, 주요 CTA |

**터치 타겟**: 모든 인터랙티브 요소 최소 44×44px. PixelButton, select, close 버튼 포함.

### ★ 등급 UI 색상 매핑
| 별 등급 | 배경색 | 테두리색 | 토큰 |
|---------|--------|---------|------|
| ★1 | success/10% | success #7ab648 | success |
| ★2 | accent/10% | accent #c8a04a | accent |
| ★3 | danger/10% | danger #c03020 | danger |

★ 선택 버튼: 최소 48×48px 터치 영역

**통화 아이콘**: 이모지 대신 인라인 SVG 픽셀 아이콘 사용 (`CurrencyIcon.tsx`).
- 다이아몬드: info (#5bc8e8) 계열 12×12 SVG
- 골드 코인: gold (#f0d060) + accent (#c8a04a) 12×12 SVG

**스타일링**: Tailwind v4 className + @theme 토큰. 동적 값만 inline style prop.

### 튜토리얼 시퀀스

| step | trigger | 플레이어 액션 | 완료 조건 |
|------|---------|------------|---------|
| 1 | 첫 게임 시작 | 타워 카드 탭 | 타워 선택 |
| 2 | 타워 선택 직후 | 타일에 탭 배치 | 첫 배치 완료 |
| 3 | 배치 완료 | 없음 (자동 진행) | 웨이브 1 시작 |
| 4 | 웨이브 1 중 처치 | 추가 배치 | 두 번째 타워 배치 |
| 5 | 웨이브 3 도달 | — | 자동 해제 |

---

## 9. Settings Matrix

| setting_key | default | range/options | saved_to | 런타임 동기화 |
|-------------|---------|---------------|---------|-------------|
| bgm_volume | 0.7 | 0~1 | localStorage | Zustand → SoundGenerator |
| sfx_volume | 0.8 | 0~1 | localStorage | Zustand → SoundGenerator (`setMasterVolume` 직접 호출) |
| screen_shake | on | on/off | localStorage | Zustand → registry → Phaser (`screenShake !== false` 체크) |
| colorblind_mode | off | off/protan/deutan/tritan | localStorage | Zustand → CSS filter |

### 설정 동기화 아키텍처

```
SettingsTab (React) → gameStore.toggle*() / set*()
    → Zustand subscribe (PhaserGame.tsx / StageSelectPage.tsx)
        → game.registry.set('screenShake', value)
            → Phaser 씬에서 registry.get() 조회 후 기능 적용/스킵

sfxVolume 특수 경로:
    gameStore.setSfxVolume(v) → soundGenerator.setMasterVolume(v) 직접 호출
    GamePage/StageSelectPage 마운트 시에도 저장된 볼륨 초기 적용

screenShake 동기화:
    gameStore.toggleScreenShake() → metaStore.updateSettings({ screenShake }) 영속화
    gameStore 초기값: metaStore.settings.screenShake ?? true
    PhaserGame.tsx: registry.set('screenShake', value) + subscribe
    Game.ts showBossWarningOverlay(): registry.get('screenShake') !== false → shake 조건 실행
```

모든 설정은 로비에서 변경 가능하며, 게임 중에도 실시간 반영된다. 전역 스크롤바는 CSS에서 숨김 처리 (`scrollbar-width: none`).

---

## 10. 게임 정체성 (Edge Point) (v2)

> 이 게임은 일반적인 모바일 TD와 달리 **랜덤 소환 슬롯머신 + 인게임 합성 도파민 + 픽셀 중세 자산**을 5~10분 세션에서 밀도 있게 반복시켜, Random Dice 류 검증 루프에 한국 모바일 특유의 중세 세로형 감성을 덧입힌다. "어떤 타워가 뽑힐까 → 같은 거 두 개 맞춰서 합성 → 등급 올라가는 순간의 번쩍임" 세 박자를 매 소환마다 돌린다.

※ **랜덤 소환의 결정 재미**: 유저는 어디에 놓을지 / 어떤 타워를 뽑을지 둘 다 통제하지 못한다. 유일한 결정은 **언제 소환할지 + 무엇을 합성할지**. 이 제약이 짧은 세션에서 피로를 낮추고 슬롯머신 기대감을 강화한다.

※ **합성 진행감이 메타 강화를 흡수**: 영구 메타 강화(별, 승급, 150레벨) 없이도 한 판 안에서 `normal → epic`까지 빌드가 성장하는 느낌을 준다. 메타 P2W 의존도가 자연스럽게 낮아진다.

※ **레거시 ★ 시스템은 W1~W3에서만 유지**: Phase A는 단일 난이도. 본인 플레이 검증 후 Phase C에서 메타 재설계 시 ★ 시스템의 운명이 결정된다.

**점검 질문**
- 5분 1세션 후 "한 판 더" 즉시 누르고 싶은가 (Phase A 핵심 Go/No-Go 게이트)
- 합성 / 등급업 / 적 클리어 도파민이 명확히 느껴지는가
- 픽셀 + 중세 톤이 랜덤 소환 메커니즘과 잘 어울리는가
- 첫 5분 안에 Random Dice와 다른 차별점(path 기반 레인 + 픽셀 중세)이 체감되는가

---

## 11. 변경 이력

| 날짜 | 항목 | 변경 내용 |
|------|------|---------|
| 2026-04-07 | 최초 작성 | Obsidian GDD 기반 |
| 2026-04-07 | §8 UI/UX | 디자인 시스템 섹션 신설 (색상 토큰 13종, 타이포 5단계, 터치 타겟, HUD 애니메이션, 데미지 넘버, CurrencyIcon SVG) |
| 2026-04-07 | §8, §9 | 토큰 아키텍처(단일 원천 + re-export), 설정 런타임 동기화 경로, HUD flash 초기 마운트 스킵 |
| 2026-04-07 | §4, §6, §7, §8 | 웨이브 재설계(초반 완만→후반 가파름), WAVE_SCALING 10단계, difficultyHpMult 맵별 차등(1/1.3/1.6), 타워 판매(50%), 게임 나가기(확인 모달+일시정지), 보스 leak 즉시 패배, iOS AudioContext unlock, 덱 편집 버그 수정 |
| 2026-04-08 | §8, §9 | 월드맵 px 고정 레이아웃(430×640)+권장 스테이지 자동 스크롤, 클리어 배지 픽셀 아트 에셋, 2배속 가이드 UI, SFX→soundGenerator 연결, screenShake metaStore 영속화+registry 동기화, iOS async unlock(try-catch+리스너 선제거), 전역 스크롤바 숨김 |
| 2026-04-09 | §8 UI/UX | FloatingNavButtons 수령 가능 뱃지(`useClaimableCounts` + warningPulse), LoadingScreen 2단 타이포(`>_` 터미널 프리픽스, context별 카피), GamePage 부팅 오버레이 통일, 페이지 전환 `fadeSlideIn 220ms`(`key={phase}`로 GamePage 안정성 보장), 폰트/이미지 preload(Galmuri11 woff2 link preload, Press Start 2P CSS @import→HTML link, UI 이미지 17개 boot 시점 사전 로드) |
| 2026-04-09 | §8, §10 | WorldMapPage를 세로 카드 리스트로 재정의(이슈 #94). 5초 prep 페이즈를 모든 전투에 도입(이슈 #93, 에너지 증가 정지). 10연 가차 순차 등장 애니메이션(이슈 #83). 타워 사거리 오버레이(이슈 #103). 덱 편집 상단 고정 4슬롯 + 루비 보석 제거 아이콘(이슈 #85). |
| 2026-04-11 | §4, §5, §6, §7, §8 | 에너지 시스템 오버홀(초기 40, 킬 보상 제거, 웨이브 클리어 +5, 마지막 보스전 리젠/클리어 보상 비활성화). 웨이브 30초 타이머(마지막 웨이브 면제). 몬스터 충돌 비활성화. 보스 판정 `wave.kind === 'boss' \|\| unitDef.bossBehaviorId`. 보스 leak 즉시패배 boss-kind 웨이브에서만. FINAL_BOSS_HP_MULTIPLIER 마지막 웨이브에만 적용. STAGE_WAVES 단일 원천(레거시 배열 제거). 승리 시 "다음 스테이지" 버튼 + 현재 스테이지 이름 표시. |
| 2026-04-12 | §1, §4, §8, §9 | 타워 배치를 드래그 앤 드롭에서 탭 선택 → 그리드 탭 배치로 전환(HTML5 Drag API + 터치 롱프레스 폴백 제거, 고스트 추적 제거). `damage_numbers` 설정 제거(항상 표시) 및 `showDamageNumbers` 런타임 동기화 경로 제거. 튜토리얼 step 2 "드래그 배치"→"탭 배치". |
| 2026-04-14 | §1, §3, §4, §5, §10 | **v2 Phase A 피벗 적용**. 픽셀 중세 랜덤 타워 합성 디펜스로 코어 루프 전환. SummonPoolSystem / MergeSystem / PhaseAOrchestrator 신규 시스템. `phase_a_long` 맵(8×24 U-turn 왕복) + `phase_a_s1` 스테이지(50 wave endless, 보스 10 wave마다) + hidden `phase_a_lab` 월드 추가. 소환당 에너지 20 (킬 보상 +1, 5배수 wave ×2), 시간 리젠 비활성. 2-step 소환(드로우 → 유저 배치). 5종 풀 랜덤 소환 + 같은 등급 2개 합성. PhaseAHud(React) + 3배속 + 웨이브 타이머 HUD. PR #170. |

# Game Design Document (GDD)

> **Last Updated:** 2026-04-20 (v3.1 — 정식 모드 안정화 + 4 버그 픽스)
> **Source:** 최초 전환 계획 `docs/superpowers/plans/2026-04-17-phase-a-sole-mode.md` (historical)
> 수치 변경은 [02-balance-sheet.md](./02-balance-sheet.md) 참조. BM은 [03-business-model.md](./03-business-model.md) 참조.
>
> **v3 노트 (2026-04-20)**: 2026-04-14 피벗으로 도입된 랜덤 소환 + 합성 루프를 **게임의 유일한 정식 모드**로 확정. 기존 시나리오 모드 (W1~W3 24 스테이지, 덱 편성, 월드맵, 임무/업적)는 모두 제거됨. 타워 시스템은 `grade` 기반에서 `family`+`tier(1~6)` 모델로 전환. 4 계열(archer/siege/frost/stun) × 4 tier + hybrid tier-5×2 + ultimate tier-6 = 총 19 타워. 인게임 가챠 (T2/T3/T4), 로그라이크 6 카드, 메타 루프 스텁, BM 스텁 (AdService + 이어서 하기), 9×18×48px 맵 (모바일 세로 최적화), HUD 전면 재설계 (하단 액션바 + TowerActionSheet + SummonRevealOverlay + PauseModal), CC 가드레일 (ccResistance / MIN_MOVE_SPEED / stun immunity) 포함. Save schema v6→v7→v8 (grade→tier 변환 + 시나리오 필드 purge).
>
> **v3.1 노트 (2026-04-20)**: 정식 모드 안정화 4종 버그 픽스. (1) 소환/가챠 재요청 시 draw 캐시 (풀+가챠 양쪽). (2) 보스 HP HUD에 소수점 제거 (`Math.floor`, 생존 중 최소 1 clamp). (3) waves > 10 HP 스케일을 지수(×1.12)에서 선형(`HP_SLOPE=0.55`)으로 전환해 계단식 보스 HP 점프 제거. (4) Phaser `Scale.NONE`으로 내부 해상도 432×960 고정 + 모바일 세로형 표준 레이아웃 (React shell은 `100dvh + max-w-[430px] + flex-col`, HUD는 네이티브 DOM 크기 + `safe-area-inset-top`, 캔버스가 flex-1 슬롯을 채움). 기기별 타워/몬스터 비율은 캔버스 내부 좌표계에서 보존. PR #175.

---

## 1. Game Definition

### 한 줄 정의 (v3)

> Grid Line Defense — 랜덤 합성 타워 디펜스. 4 가문 타워를 랜덤 소환하고 합성해 tier 1~6로 키워 wave를 버틴다.

### 기본 정보 (v3)

| 항목 | 내용 |
|------|------|
| Title | Grid Line Defense |
| Genre | 픽셀 중세 Random Tower Defense + Merge |
| Platform | Mobile Web (App In Toss) |
| Player Count | Single |
| Camera/View | Top-down / Portrait Long Field (**9×18 grid, 48px 타일**, U-turn path + 중앙 프리미엄 배치 지대) |
| Input | Touch — 소환·가챠 버튼 + 타워 2회 탭으로 합성 |
| Session Length | 5~10분 |
| Core Fantasy | 랜덤으로 뽑은 4 가문 타워를 합성해 tier 6 "세계의 끝"까지 키우는 지휘관 |
| Core Fun | 랜덤 소환 도파민 + 합성/승급 도파민 + 보스 웨이브 로그라이크 강화 선택 + 픽셀 중세 톤 |
| Win Condition | 생존 (50 wave 무한 에스컬레이션, 보스 10 wave마다 출현). 실질적 자연 패배 wave 15~35. |
| Lose Condition | 기지 HP 0 (적이 exitPoint 도달 시 -1) 또는 보스 leak 즉시 패배 |
| Modes | **단일 정식 모드**. 시나리오 / 월드 / 덱 개념 없음. |

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

## 3. Core Loop / Meta Loop (v3)

**In-battle Loop**
```
마당 홈 탭 → "전투 시작" → 맵 `phase_a_long` 진입 → prep countdown
  → [반복] 에너지 수급: +1/sec 베이스 + 킬당 +1 + 보스 킬 +20 + 30초 내 fast-clear +20 (ENERGY_MAX=200)
        ├─ 기본 소환 ⚡20 → 랜덤 T1 (archer/nova_cannon/emp/shield 중 1) → 빈 칸 탭해 배치
        └─ 인게임 가챠 ⚡40/80/160 → T2(60%) / T3(20%) / T4(5%) 시도, 실패 시 T1 폴백
        → 같은 tier 1~3 같은 family 2개 합성 → tier+1 승급 (archer+archer → wind_spire 등)
        → tier 4 혼합 합성 → hybrid_ab (archer+siege) / hybrid_cd (frost+stun)
        → hybrid_ab + hybrid_cd → ultimate (tier 6 세계의 끝)
        → 타워 인게임 enhance: 탭 → 골드 소비 → Lv+1 (L10 cap, +15% 데미지/레벨)
        → wave 진입 → 자동 전투
  → 보스 웨이브 클리어 시 로그라이크 3카드 중 1 선택 (런 한정 스택) → 광고 보고 리롤 옵션
  → wave 무한 에스컬레이션 → 패배 시 "광고 보고 이어서 하기" (1회 한정, +5 HP) or 로비 복귀
```

**Meta Loop (shell 수준, 영구 강화 퍽은 후속 단계)**
```
플레이 → 런 종료 시 글로벌 공격력 % / 패밀리 퍽 / 영구 강화 누적 (localStorage persist)
       → 다음 런에서 TowerSystem.setGlobalModifiers({ atkPct }) 주입
       → 메타 강화 페이지는 전쟁탁자 탭에서 진입
```

**BM Loop (stub 수준)**
```
광고 시청 → MockAdService('rewarded')
  - 로그라이크 리롤: 광고 1회 → 3카드 재추첨
  - 이어서 하기: 게임오버 시 광고 1회 → +5 HP + wave 재개 (런당 1회)
```

---

## 4. Core Systems (v3)

### 타워 모델: family × tier (4 계열 × 4 티어 + hybrid × 2 + ultimate × 1 = 19종)

`grade` 시스템 (normal/rare/unique/epic)은 **제거**. 모든 타워는 `family: TowerFamily`와 `tier: 1~6`으로 식별된다.

| Family | 역할 | T1 | T2 | T3 | T4 | 색상 |
|--------|------|----|----|----|----|------|
| archer | 단일 대상 빠른 공격 | archer | wind_spire | flame_tower | arcane_spire | #c8a04a (gold) |
| siege | 스플래시 중심 | nova_cannon | fortress | earth_golem | celestial | #8b4513 (brown) |
| frost | 슬로우 + 약한 데미지 | emp | stasis_field | disruptor | world_tree | #5bc8e8 (cyan) |
| stun | 스턴 + 약한 데미지 | shield | twin_archer | holy_shrine | divine_throne | #f0d060 (gold) |
| hybrid | T5 복합 | — | — | — | — | #9060e0 (purple) |
| ultimate | T6 최종 | — | — | — | — | #ffe870 (rainbow-gold) |

**제거된 타워**: `plasma`, `dragon_nest` (Phase 1 마이그레이션 때 purge).

### 합성 규칙 (`MERGE_CHAIN` / `resolveMerge`)

- **T1~T3 동계열 합성**: 같은 family, 같은 tier 2개 → family의 다음 tier (예: archer + archer → wind_spire)
- **T4 혼합 합성** (cross-family only — 같은 family T4 2개는 불가):
  - arcane_spire + celestial → **hybrid_ab** (tier 5)
  - world_tree + divine_throne → **hybrid_cd** (tier 5)
- **T5 ultimate 합성**:
  - hybrid_ab + hybrid_cd → **ultimate** (tier 6 세계의 끝)

모든 commute 키 (`B+A`)도 `MERGE_CHAIN`에 등록. ultimate 이후 `max-tier`로 거절.

### 시스템

| 시스템 | 정의 | 핵심 파라미터 |
|--------|------|-------------|
| SummonPoolSystem | T1 4종 (archer/nova_cannon/emp/shield) 균등 draw | `PHASE_A_SUMMON_COST = 20` (legacy const name), injectable `rng` |
| GachaSystem | T2/T3/T4 시도. 실패 시 T1 폴백. `tier_odds_up` 로그라이크 스택 반영 (cap 10) | `INGAME_GACHA.tier2/3/4` (cost, successRate) |
| MergeSystem | family/tier 기반 validation. `resolveMerge` 호출 | `tryMerge(a, b) → {kind: 'success'\|'failure'}` |
| PhaseAOrchestrator | 소환/가챠/합성/강화/로그라이크/광고 전체 파이프라인. `pendingSummon` 큐 + **풀/가챠 양쪽 취소·배치실패 리롤 방지** (`cancelledPoolDraw` + `cancelledGachaDraw` 캐시) | `PHASE_A_MAX_CONTINUES_PER_RUN = 1` (legacy const name) |
| EnergySystem | +1/sec 베이스 + 킬 에너지 + 보스 보너스. `ENERGY_MAX = 200` | CC 가드레일 2 참조 |
| GoldSystem | run-scoped 골드 풀. 킬 bounty로 축적, 타워 인게임 강화 소비 | `inBattleEnhanceCost(level)` 150% 성장 |
| UnitSystem | `ccResistance` (boss 0.5~0.7), 슬로우/스턴 duration × (1 - ccResistance), `MIN_MOVE_SPEED = 0.15`, 2초 stun immunity | |

### 로그라이크 강화 (6 카드, 보스 웨이브 클리어 시)

보스 wave clear 트리거 (이전: `slotIndex % 10 === 0` — v3에서 `wave-completed.phase === 'boss'`). 3장 랜덤 카드 중 1장 선택. 중복 스택 허용, 런 한정. 광고 보고 리롤 옵션.

| ID | 이름 | 효과 | 스택 | 적용 지점 |
|---|---|---|---|---|
| `dmg_up` | 공격력 증폭 | +20% 데미지 | multiply | TowerSystem.calculateDamage |
| `crit_dmg` | 치명의 일격 | +25%p 크리 데미지 | add | TowerSystem (Phase 12 proper crit migration TODO) |
| `energy_harvest` | 에너지 수확 | 킬당 +1 에너지 | add | Game.ts kill 핸들러 |
| `energy_regen` | 에너지 재생 | 5초마다 +2 에너지 | add (interval 5000, amount 2) | EnergySystem.tickExtra |
| `effect_amp` | 상태효과 증폭 | 슬로우/스턴 +25% 지속 | multiply | Game.processCombatField |
| `tier_odds_up` | 운의 가호 | 가챠 성공률 +5%p | add (cap 10 stacks → +50%p max, min(0.95, base+bonus)) | GachaSystem.rollTier |

### 인게임 타워 강화 (골드 소비)

TowerActionSheet에서 "강화" 버튼 → request-enhance-tower → PhaseAOrchestrator가 GoldSystem.spend(cost) → TowerSystem.enhanceTower(col, row) → level+1.
- `BASE_ENHANCE_COST = 50`, 성장 1.5× 기하 (레벨당 5 단위 round)
- `MAX_IN_BATTLE_LEVEL = 10`
- damage × (1 + 0.15 × (level - 1)) — base 대비 L10 = ×2.35

### 메커니즘 주요 변경

- **소환 취소 / 배치 실패 시 towerId 유지**: 리롤 꼼수 방지. 풀 소환은 `cancelledPoolDraw`, 가챠는 `cancelledGachaDraw`(towerId + targetTier) 캐시 보존. 재요청 시 동일 tier면 캐시 재사용(가챠는 비용 재지불, 풀은 배치 시 지불), 다른 tier 가챠 버튼을 누르면 캐시 폐기 + 새 roll (유저의 명시적 탈출구). 배치 실패(차단/점유)도 동일 캐시 경로로 보존되어 재소환 리롤 불가.
- **Placement**: 랜덤 소환 + 사용자가 빈 buildable 탭해 배치. 경로 차단 검증 (pathfinding).
- **Tower Sell**: 타워 선택 → "판매" → sellValue 환불. tier별 sell value.
- **Tower Move**: 타워 선택 → "이동" → 빈 buildable 탭해 재배치.
- **In-battle Enhance**: 골드로 개별 타워 Lv+1 (L10 cap).

---

## 5. Content Plan (v3)

### 콘텐츠

| 분류 | 수량 | 비고 |
|------|------|------|
| 소환 풀 타워 | 4종 T1 (archer, nova_cannon, emp, shield) | 4 family 각 1개, 균등 draw |
| 합성 가능 타워 | 15종 (T2~T6) | T1 4×3 base promo + T5 hybrid×2 + T6 ultimate |
| **총 타워 수** | **19** | 4 family × 4 tier + 2 hybrid (T5) + 1 ultimate (T6) |
| 맵 | 1종 (`phase_a_long`, **9×18 grid, 48px 타일**) | U-turn path + 중앙 col 4 프리미엄 배치 지대, 5개 장애물 (col 4 row 2/5/8/11/14) |
| 스테이지 | 단일 (선택 UI 없음) | 로비 "전투 시작" 버튼 → 바로 진입 |
| 웨이브 | 50 endless (보스 10 wave마다) | 30마리/wave, 보스 wave clear 시 로그라이크 3카드 선택 |
| 적 유형 | 3종 + 보스 (기존 유닛 재사용) | CC 가드레일 반영 (boss ccResistance 0.5~0.7) |

### 메타 / BM 스텁

| 분류 | 상태 | 비고 |
|------|------|------|
| 메타 강화 페이지 | shell 수준 | 글로벌 공격력 % + 4 family 퍽 카운트 표시. 퍽 선택 UX, 영구 강화 구매 UX는 후속 단계 |
| AdService | stub 수준 (MockAdService) | 항상 `rewarded` 반환 (500ms delay). 리롤, 이어서 하기 2개 placement |
| 이어서 하기 | 런당 1회 한정 | HP +5 복원, wave 타이머 재시작, 타워/업그레이드 상태 유지 |
| 광고 리롤 | 로그라이크 3카드 화면 | 재추첨 |

### 제거된 콘텐츠 (정식 모드 전환 시)

- **시나리오 모드**: W1 Forest / W2 Forge / W3 Tower + 24 stages — 전부 제거
- **덱 편성**: 4타워 덱 개념 제거. 정식 모드는 랜덤 소환 기반
- **월드 기믹**: GimmickSystem (용광로 폭발, 마력 폭주 등) 제거
- **임무 / 업적**: 시나리오 전용. 퍽 기반 메타 루프로 대체 예정
- **★ 별 등급**: 스테이지 개념 자체가 없으므로 제거
- **제거된 타워**: plasma, dragon_nest (family/tier 모델에 맞지 않아 purge)

---

## 6. Balance (요약)

> 상세 수치는 [02-balance-sheet.md](./02-balance-sheet.md) 참조.

### 19 타워 전체 목록 (family × tier)

| id | name | family | tier | damage | range | aspd | special |
|----|------|--------|------|--------|-------|------|---------|
| archer | 궁수탑 | archer | 1 | 20 | 4.0 | 1.0 | — |
| wind_spire | 바람첨탑 | archer | 2 | 35 | 4.5 | 1.2 | — |
| flame_tower | 화염탑 | archer | 3 | 60 | 5.0 | 1.3 | — |
| arcane_spire | 비전첨탑 | archer | 4 | 100 | 5.5 | 1.5 | — |
| nova_cannon | 투석기 | siege | 1 | 30 | 3.5 | 0.5 | splash 1.2 |
| fortress | 공성대포 | siege | 2 | 55 | 4.0 | 0.6 | splash 1.5 |
| earth_golem | 대지골렘 | siege | 3 | 90 | 4.5 | 0.7 | splash 1.8 |
| celestial | 천상의탑 | siege | 4 | 150 | 5.0 | 0.8 | splash 2.2 |
| emp | 눈보라탑 | frost | 1 | 8 | 3.5 | 0.8 | slow 30% |
| stasis_field | 서리마탑 | frost | 2 | 14 | 4.0 | 0.9 | slow 45% |
| disruptor | 빙하제단 | frost | 3 | 24 | 4.5 | 1.0 | slow 60% |
| world_tree | 세계수 | frost | 4 | 40 | 5.0 | 1.1 | slow 75% |
| shield | 성기사제단 | stun | 1 | 5 | 3.0 | 0.5 | stun 300ms |
| twin_archer | 수호탑 | stun | 2 | 10 | 3.5 | 0.6 | stun 500ms |
| holy_shrine | 신성제단 | stun | 3 | 18 | 4.0 | 0.7 | stun 800ms |
| divine_throne | 신의 옥좌 | stun | 4 | 30 | 4.5 | 0.8 | stun 1200ms |
| hybrid_ab | 비전포성 | hybrid | 5 | 200 | 6.0 | 1.4 | splash 1.6 |
| hybrid_cd | 동결의군림 | hybrid | 5 | 80 | 5.5 | 1.2 | slow 80% + stun 600ms |
| ultimate | 세계의 끝 | ultimate | 6 | 500 | 7.0 | 1.6 | splash 2.5 + slow 90% + stun 1500ms |

**frost / stun 타워 설계 원칙**: 약한 데미지 + 강한 상태 효과. 순수 utility 아님.

**제거된 타워**: plasma, dragon_nest (family/tier 모델 불일치로 purge).

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
| orc_warlord | 오크 전쟁 대장 | 무 | 2,000 | 0.8 | 10 | 300 | orc_warlord | HP 50% 이하 시 battle_robot 4마리 소환 |
| forge_master | 단조장의 군주 | 화 | 5,000 | 0.7 | 15 | 500 | forge_master | 10초마다 랜덤 타워 5초 비활성화 |
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

### 웨이브별 스케일링 (WAVE_SCALING + `getWaveScaling`)

웨이브 진행에 따라 몬스터 HP/속도에 배수 적용. slots 1-10은 테이블, slots 11+는 **선형 공식** (이전 `×1.12` 지수에서 v3.1 픽스로 변경).

#### Slots 1-10 (`WAVE_SCALING` 테이블)

| Wave | HP 배수 | 속도 배수 |
|------|---------|----------|
| 1-2 | 1.0× | 1.0× |
| 3 | 1.2× | 1.0× |
| 4 | 1.4× | 1.0× |
| 5 | 1.6× | 1.05× |
| 6 | 1.9× | 1.05× |
| 7 | 2.3× | 1.1× |
| 8 | 2.7× | 1.1× |
| 9 | 3.2× | 1.15× |
| 10 | 3.8× | 1.15× |

#### Slots 11+ (`getWaveScaling` 선형)

```
HP_SLOPE = 0.55
hp    = WAVE_SCALING[10].hp + (slot - 10) × HP_SLOPE
speed = min(WAVE_SCALING[10].speed + (slot - 10) × 0.03, 2.2)
```

예: W20 HP = 3.8 + 10 × 0.55 = **9.30**, W30 = **14.80**, W40 = **20.30**, W50 = **25.80**. 이전 `×1.12^over` 공식은 W50에서 354× 까지 폭증해 W20→W30 구간에서 계단식 점프 (×7.8→×15.5) 발생 → 선형으로 평탄화.

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

## 8. UI / UX (v3)

### 논리 해상도 & 레이아웃 (v3.1 B4 픽스, mobile portrait standard)

Phaser **캔버스 내부** 해상도는 `Scale.NONE`으로 432×960 고정 — 어떤 기기에서 렌더되든 스프라이트의 상대 크기가 동일하다. 이전 `Scale.FIT` + `h-dvh` 조합은 기기별 부모 CSS 크기에 따라 canvas CSS 크기를 비례 재조정해 시각적 비율이 드리프트했다.

**스프라이트 렌더 크기 (setDisplaySize)** — 타일 48×48 기준으로 타워·몬스터가 타일을 과도하게 오버플로우하지 않도록 조정:

| 종류 | 소스 프레임 | 렌더 크기 | vs 타일 |
|------|-------------|-----------|---------|
| 타워 | 64×80 | **48×60** | 1.0W × 1.25H (타일 폭 정확, 머리 peek) |
| 몬스터 (일반) | 40×48 | **32×40** | 0.67W × 0.83H (타일 안에 수렴) |
| 몬스터 (보스) | 60×72 | **48×56** | 1.0W × 1.17H (타일 폭 + 존재감) |

소스 스프라이트시트 프레임은 원본 해상도 유지(에셋 regenerate 불필요); Phaser `setDisplaySize`가 픽셀 보간 없이 정확한 정수 비율로 다운스케일한다.

레이아웃은 **모바일 2D 세로형 표준**을 따른다 — HUD는 자연 DOM 크기 / flex-1 canvas 영역 / 안전영역 패딩. CSS transform 스케일 wrapper는 사용하지 않는다(초기 구현 시 전체 레이아웃을 스케일하는 접근이 Galaxy S25 등 중간 뷰포트에서 헤더 HUD를 상태바와 충돌시켜 폐기).

- **Phaser**: `scale.mode = Phaser.Scale.NONE`, `autoCenter = NO_CENTER` — 내부 bitmap 432×960 고정
- **React shell (`GamePage`)**: `data-testid="game-portrait-shell"`, `width: 100% max-w-[430px]`, `height: 100dvh`, `flex-col`
- **TopHud**: `shrink-0`, `paddingTop: max(0, env(safe-area-inset-top))` — 펀치홀 / 상태바 회피
- **게임 영역 (flex-1)**: `#game-container`가 남은 공간을 채우고, 내부 canvas는 `width/height: 100%`로 슬롯에 스트레치. 캔버스 내부는 uniform 스케일(좌표계 보존)
- **PhaseAHud**: `shrink-0`, `paddingBottom: max(8px, env(safe-area-inset-bottom))` — 홈 인디케이터 회피
- **터치 이벤트**: 네이티브 DOM 크기 유지라 별도 보정 불필요

### HUD 구조

- **TopHud (상단 정보 배지)**: HP 20, ⚡{energy} badge with ring, `웨이브 N/50 - {timer}s` 또는 `준비 N`
- **하단 액션바** (safe-area-inset-bottom padding):
  - **소환 ⚡20** (primary CTA, `flex-[2]`, accent 색)
  - **T2 ⚡40 60%** (gacha T2)
  - **T3 ⚡80 20%** (gacha T3, disabled when energy < 80)
  - **T4 ⚡160 5%** (gacha T4, disabled when energy < 160)
  - **메뉴 ☰** (60px fixed, 누르면 PauseModal)
- **TowerActionSheet (플로팅)**: 타워 선택 시 bottom-[120px]에 floating 패널. 5 버튼 (합성 / 이동 / 판매 +{sellValue} / 강화 Lv{n+1} 💰{cost} / ✕). 각 min-h 52px.
- **SummonRevealOverlay (코너 토스트)**: `phase-a-summon-ready` 이벤트 시 우상단 top-[52px] right-[8px]에 작은 카드 (max-w-180px) 2초 노출. `pointer-events-none` (맵 터치 차단 X). Slide-in from right 150ms.
- **UpgradePickOverlay (전체 오버레이)**: 보스 wave clear 시 3카드 + 광고 리롤 버튼. 카드 선택 시 PhaseAOrchestrator.applyUpgrade → activeUpgrades 스택.
- **PauseModal**: 메뉴 버튼 → scene.pause() + "게임으로 돌아가기" / "나가기" 버튼. 나가기 확인 후 enterLobby.
- **GameOverScreen**: victory/defeat 배너 (success/danger 색) + 스탯 그리드 (wavesCleared/towersPlaced/timeSurvivedSec/goldEarned) + 3 버튼:
  - "🎬 광고 보고 이어서 하기" (defeat만, 런당 1회)
  - "다시 시작"
  - "로비로"
- **Merge-mode 배너**: TowerActionSheet 합성 버튼 → `enter-merge-mode` → "합성할 타워를 탭하세요" 상단 배너 + ESC/cancel. 두 번째 타워 탭 시 `request-merge-towers` emit.

### 보스 HP HUD (v3.1 B2 픽스)

`BossHpBar` 컴포넌트는 `boss-hp-update` 이벤트의 payload를 그대로 렌더한다. 내부적으로 HP가 float 누산이라 HUD에 소수점이 노출되던 문제를 두 지점에서 차단:

- **Source (UnitSystem)**: `boss-hp-update` emit 시 `hp: Math.max(0, Math.floor(unit.data.hp))` — payload에 정수 보장
- **Render (BossHpBar)**: `{Math.floor(entry.hp)}/{Math.floor(entry.maxHp)}` — 소스가 바뀌어도 안전

### 로비 구조

- **TopHud ProfileBar**: 아바타 + Commander + Lv + 전투력, 우측에 골드/다이아 ResourceChip
- **BottomTabBar 3탭**: 전쟁탁자 / 마당 (기본) / 설정
- **마당 (HomeTab)**: Cinematic Keyart (성 실루엣, 달, 횃불, 안개) + NEXT UP CTA 카드 (pulse "⚔ 전투 시작")
- **전쟁탁자 (CollectionTab)**: 최상단 "⚒ 메타 강화" 엔트리 + 보유 타워 그리드 + 소환의 제단 (gacha)
- **메타 강화 (MetaForgePage)**: 전쟁탁자에서 진입. 글로벌 공격력 % + 4 family 퍽 카운트
- **설정 (SettingsTab)**: BGM/SFX 볼륨, 화면 흔들림, 색맹 모드

### 제거된 UI (정식 모드 전환 시)

- ~~WorldMapPage / StageDetailPage / StageSelectPage~~
- ~~DeckDock / DeckEditSheet~~ (정식 모드는 랜덤 소환 기반)
- ~~MissionsTab / AchievementPage~~
- ~~Home 탭 플로팅 아이콘 (임무/업적 뱃지)~~

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

## 10. 게임 정체성 (Edge Point) (v3)

> Grid Line Defense는 **랜덤 소환 슬롯머신 + 인게임 합성 도파민 + 픽셀 중세 자산**을 단일 정식 모드로 응축한다. 시나리오/월드/덱 없이 한 판 5~10분 루프에 집중. "어떤 타워가 뽑힐까 → family/tier 맞춰서 합성 → ultimate 도달하는 쾌감" 세 박자를 매 소환·가챠마다 돌린다.

※ **랜덤 소환 + 가챠 2중 레이어**: 기본 소환은 T1 균등 랜덤, 인게임 가챠는 에너지로 T2/T3/T4 시도 (60/20/5% 성공률). 로그라이크 `tier_odds_up` 카드로 확률을 올려가는 진행감.

※ **합성 체인 5 단계**: T1→T4 family promotion → T4 cross-family → hybrid T5 → ultimate T6. 같은 family T4 2개는 합성 불가 (반드시 다른 family 필요) — 플레이어가 어떤 hybrid를 노릴지 결정하게 만드는 전략 축.

※ **메타 최소화**: 영구 메타는 글로벌 공격력 + 패밀리 퍽만 (shell 수준). 한 판 안에서 ultimate까지 도달하는 감각이 주된 진행감. P2W 의존도 자연 저하.

※ **BM은 광고 리워드 2곳**: 로그라이크 리롤 + 이어서 하기. 양쪽 모두 "한 번 더 뽑고 싶다/한 번 더 돌고 싶다" 감정 지점에 정확히 붙음.

**점검 질문**
- 5분 1세션 후 "한 판 더" 즉시 누르고 싶은가 (핵심 Go/No-Go 게이트)
- T4 도달 / hybrid 생성 / ultimate 조합 도파민이 명확히 느껴지는가
- 픽셀 + 중세 톤이 랜덤 소환·합성 메커니즘과 잘 어울리는가
- 첫 5분 안에 Random Dice와 다른 차별점(path 기반 레인 + family 합성 트리 + 픽셀 중세)이 체감되는가

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
| 2026-04-20 | §1, §3, §4, §5, §6, §8, §10 | **v3 정식 모드 승격**. 시나리오(W1~W3) / 덱 / 월드 / 임무 / 업적 완전 제거. Title "Grid Line Defense" 확정. 타워 grade → family+tier (4×4 + 2 hybrid T5 + 1 ultimate T6 = 19종). plasma/dragon_nest purge. 인게임 가챠 (T2/T3/T4). 로그라이크 6 카드 (dmg_up/crit_dmg/energy_harvest/energy_regen/effect_amp/tier_odds_up) 보스 웨이브 트리거. 메타 루프 shell (globalAtkPct + family perks, localStorage). BM 스텁 (MockAdService + 이어서 하기 1회). 9×18×48px 맵 + 5 obstacles + cinematic keyart lobby. HUD 재설계 (하단 액션바 + TowerActionSheet + SummonRevealOverlay 코너 토스트 + PauseModal). CC 가드레일 (ccResistance 0.5~0.7, MIN_MOVE_SPEED=0.15, 2s stun immunity). 인게임 타워 enhance (GoldSystem + BASE_ENHANCE_COST=50, MAX_LV=10). Save v6→v7→v8 (grade→tier + 시나리오 필드 purge). Plan: `docs/superpowers/plans/2026-04-17-phase-a-sole-mode.md`. |
| 2026-04-20 | §1 헤더, §4, §6, §8, §10 | **v3.1 정식 모드 안정화 4 버그 픽스** (PR #175). (B1) 풀·가챠 양쪽 재소환 리롤 차단 — `cancelledGachaDraw` 캐시 추가, 배치 실패도 동일 캐시 경로 보존, 다른 tier 가챠는 캐시 폐기 + 새 roll. §4 PhaseAOrchestrator 행 + §4 "메커니즘 주요 변경" 2 항목 업데이트. (B2) 보스 HP HUD 소수점 제거 — UnitSystem `Math.floor` + BossHpBar `Math.floor` 이중 가드. 생존 보스는 `Math.max(1, floor(hp))`로 최소 1 clamp (cubic 리뷰 P2). §8 "보스 HP HUD" 소섹션 신설. (B3) waves > 10 HP 스케일을 지수(×1.12)에서 선형(HP_SLOPE=0.55)으로 전환 — W10→W50 배율 354× → 6.8×, 계단식 보스 HP 점프 제거. §6 WAVE_SCALING에 slots 11+ 선형 공식 블록 추가. (B4) Phaser `Scale.NONE` + 내부 해상도 432×960 고정. **레이아웃은 모바일 세로형 표준**: React shell `100dvh + max-w-[430px] + flex-col`, HUD는 네이티브 DOM 크기 + safe-area-inset-top, 캔버스가 flex-1 슬롯을 채움. CSS transform scale wrapper + `useViewportScale` 훅 접근은 초기 시도 후 Galaxy S25 등 중간 뷰포트에서 헤더 HUD가 상태바와 충돌해 폐기. §8 "논리 해상도 & 레이아웃" 소섹션 신설. 용어 정리: "Phase A" → "정식 모드" 전반 치환 (map/event id 등 코드 상수는 유지). |

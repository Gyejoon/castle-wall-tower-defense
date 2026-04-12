# 밸런스 시트

> **Last Updated:** 2026-04-12  
> **Source:** Obsidian `ai/product/specs/게임 밸런스 시트.md`  
> 수치가 변경될 때마다 이 문서를 먼저 업데이트하고, 코드(`missions.ts`, `gacha.ts`)에 반영한다.

---

## 1. 다이아몬드 경제 (Diamond Economy)

### 획득 경로 (Inflow)

| 소스 | 하루 획득량 | 주간 획득량 | 비고 |
|------|----------|----------|------|
| 일일 미션 완료 (4개) | 최대 60 💎 | 420 💎 | reach_wave 15 + place_towers 10 + defeat_boss 30 + 출석 5 |
| 주간 미션 완료 (4개) | — | 최대 260 💎 | clear_stage 80 + place_towers 50 + defeat_boss 100 + 출석 30 |
| 무료 상자 (일 1회) | 0 (타워 획득) | — | 다이아 직접 지급 없음 |
| **주간 합계 (전 미션 완료)** | | **~680 💎** | 일일 420 + 주간 260 |

### 소비 경로 (Outflow)

| 소비처 | 비용 | 기대 획득 |
|--------|------|---------|
| 다이아 상자 1개 | 100 💎 | 히든 타워 1개 |
| 다이아 상자 10개 | 900 💎 | 히든 타워 10개 + tier3+ 1개 보장 |
| 천장(pity) 도달 | 최대 50연차 = 5000 💎 | tier5 전설 확정 |

### 10연차 적립 기간

| 시나리오 | 주간 획득 | 10연차(900 💎) 소요 |
|---------|---------|----------------|
| 캐주얼 (일 1~2판) | ~250 💎 | 약 3.6주 |
| 미드코어 (일 3판) | ~450 💎 | 약 2주 |
| 코어 (전 미션 완료) | ~600 💎 | 약 1.5주 |

---

## 2. 가챠 확률표

> 코드 위치: `packages/shared/src/constants/gacha.ts`

| tier | 이름 | 확률 | 10연차 보장 |
|------|------|------|----------|
| 1 | 일반 | 40% | — |
| 2 | 레어 | 35% | — |
| 3 | 유니크 | 18% | **최소 1개 보장** |
| 4 | 에픽 | 6% | — |
| 5 | 전설 | 1% | — |

### 천장(Pity) 시스템

| 항목 | 값 |
|------|---|
| 천장 기준 | 50연차 tier4 이하 시 다음 상자에서 tier5 확정 |
| pity 카운터 리셋 조건 | tier5 획득 시 |
| 코드 위치 | `PITY_THRESHOLD = 50` (`gacha.ts:14`) |

### 기댓값 (100회 기준)

| tier | 기대 획득 수 |
|------|-----------|
| 1 (일반) | 40개 |
| 2 (레어) | 35개 |
| 3 (유니크) | 18개 |
| 4 (에픽) | 6개 |
| 5 (전설) | 1~2개 |

---

## 3. 미션 밸런스

> 코드 위치: `packages/shared/src/constants/missions.ts`

### 리셋 기준

| 항목 | 기준 | 표시 포맷 |
|------|------|---------|
| 일일 미션 리셋 | 매일 KST 00:00 | `~일 ~시 ~분 남음` |
| 주간 미션 리셋 | 매주 월요일 KST 00:00 | `~일 ~시 ~분 남음` |

> KST = UTC+9. 서버/저장 값은 UTC ISO8601, UI 표시는 KST.

### 일일 미션

> 1판 기준: reach_wave ~10, place_towers ~15~18, defeat_boss ~2

| 미션 타입 | 목표 범위 | 보상 | 달성 소요 |
|---------|---------|------|---------|
| reach_wave | [50, 80] | 15 💎 | 5~8판 |
| place_towers | [100, 200] | 10 💎 | 6~11판 |
| defeat_boss | [10, 10] 고정 | 30 💎 | 5판 |
| attendance | [1, 1] 고정 | 5 💎 | 앱 오픈 시 자동 |

### 주간 미션

| 미션 타입 | 목표 범위 | 보상 | 달성 소요 (7일) |
|---------|---------|------|--------------|
| clear_stage | [30, 50] | 80 💎 | 하루 4~7판 |
| place_towers | [200, 300] | 50 💎 | 하루 2~3판 |
| defeat_boss | [30, 50] | 100 💎 | 하루 2~4판 |
| attendance | [5, 5] 고정 | 30 💎 | 5일 출석 |

---

## 4. 상자 쿨타임

> 코드 위치: `packages/shared/src/constants/gacha.ts` — `GACHA_COSTS`

| 상자 종류 | 비용 | 쿨타임 | 일 한도 |
|---------|------|-------|-------|
| 무료 상자 | 0 💎 | 24h | 1회 |
| 광고 상자 | 광고 시청 | 8h | 3회 |
| 다이아 1개 | 100 💎 | 없음 | 무제한 |
| 다이아 10개 | 900 💎 | 없음 | 무제한 |

---

## 5. 세션 경제

### 에너지 시스템

> 코드 위치: `packages/shared/src/constants/energy.ts`

| 항목 | 값 | 비고 |
|------|-----|------|
| INITIAL_ENERGY | 40 | 게임 시작 시 초기 에너지 |
| ENERGY_PER_SEC | 1 | 자연 재생 (prep 페이즈 중 정지) |
| ENERGY_CAP | 100 | 최대 에너지 |
| ENERGY_PER_WAVE_CLEAR | 5 | 웨이브 클리어 시 보너스 (보스 웨이브 포함 전 웨이브 적용) |
| 킬 보상 | 없음 | ENERGY_PER_KILL, ENERGY_PER_BOSS_KILL 제거됨 |

> 에너지 리젠과 웨이브 클리어 보상은 **모든 웨이브(마지막 보스 웨이브 포함)** 에서 동일하게 작동한다. 이전에는 마지막 보스 웨이브에서 리젠+클리어 보상이 비활성화되었으나, 보스전 배치/업그레이드 유연성을 위해 제거됨.

### 웨이브 타이머

| 항목 | 값 |
|------|-----|
| MAX_WAVE_DURATION_MS | 30,000 (30초) |
| 타이머 만료 시 | 잔존 몬스터 유지 + 다음 웨이브 즉시 스폰 |
| 마지막 웨이브 | 타이머 면제 (보스전 무제한) |

> 코드 위치: `packages/shared/src/constants/waves.ts`, `packages/phaser-game/src/systems/WaveSystem.ts`

### 1판 플레이 기댓값

| 항목 | 획득량 | 비고 |
|------|-------|------|
| 골드 (클리어) | ~1000G | 웨이브 보상 + 보스 보너스 |
| 골드 (실패) | ~400~600G | 웨이브별 가변 |
| 타워 배치 수 | 15~20회 | 초기 에너지 40 + 자연 재생 기준 |

### 주간 플레이 패턴

| 플레이어 타입 | 하루 판수 | 주간 💎 | 10연차 적립 |
|------------|--------|--------|---------|
| 라이트 | 1판 | ~150 💎 | 6주 |
| 캐주얼 | 2판 | ~300 💎 | 3주 |
| 미드코어 | 3판 | ~500 💎 | 1.8주 |
| 코어 | 5판+ | ~600 💎 | 1.5주 |

---

## 6. 타워 스탯 (상세)

> 전체 스탯: GDD §6-1 참조

### 레벨 강화 성장 (flat 4%/lv)

`enhancementStatMultiplier(L) = 1 + (L − 1) × 0.04`

| Level | Multiplier |
|-------|-----------|
| 1     | 1.00      |
| 10    | 1.36      |
| 20    | 1.76      |
| 30    | 2.16      |
| 50    | 2.96      |

> 2026-04-12: 기존의 구간별(LV.1~10 +2/lv 등) 아키타입별 성장 설계는 미구현 상태로 drift 되어 있었다. 스턴 타워의 cooldown/duration 스케일링(`stunCooldownMultiplier`, `stunDurationMultiplier`)은 별도 함수로 유지된다.
>
> 등급별 최대 레벨: normal=20, rare=30, unique=50, epic=50 (`GRADE_MAX_LEVEL`).

### 타워 등급 시스템

> 코드 위치: `packages/shared/src/constants/meta.ts` — `GRADE_MAX_LEVEL`, `GRADE_BONUS`, `GRADE_COST_MULT`, `PROMOTION_CONFIG`

**등급별 최대 레벨 / 강화비 배수 / 스탯 보너스**

| 등급 | 최대 레벨 | 강화비 배수 | GRADE_BONUS | 스탯 배수 |
|------|---------|---------|-------------|-----------|
| normal | 20 | ×1.0 | 0     | ×1.0  |
| rare   | 30 | ×2.0 | +0.8  | ×1.8  |
| unique | 50 | ×4.0 | +3.5  | ×4.5  |
| epic   | 50 | ×8.0 | +13.0 | ×14.0 |

**강화 비용 공식 (quadratic)**

`enhancementCost(L, tier, grade) = floor((100 + 40L + 3L²) × TIER_COST_MULT[tier] × GRADE_COST_MULT[grade])`

| Level | Tier1 Normal | Tier3 Normal | Tier5 Normal |
|-------|--------------|--------------|--------------|
| 1     | 143          | 286          | 715          |
| 10    | 800          | 1,600        | 4,000        |
| 20    | 2,100        | 4,200        | 10,500       |
| 30    | 4,000        | 8,000        | 20,000       |
| 50    | 9,600        | 19,200       | 48,000       |

- `TIER_COST_MULT = [0, 1, 1.5, 2, 3, 5]`
- `GRADE_COST_MULT`: normal ×1.0, rare ×2.0, unique ×4.0, epic ×8.0

> **승급 파워 게이트** (코드 테스트로 보증): normal L20 (1.76) < rare L1 (1.80), rare L30 (3.888) < unique L1 (4.50), unique L50 (13.32) < epic L1 (14.00).

### 타워 승급 확률

| 현재 → 목표 | 확률 | 필요 레벨 | 골드 비용 | 실패 시 |
|----------|------|---------|--------|-------|
| 일반 → 레어 | 80% | LV.20 | 500G | 골드 소실, 레벨 유지 |
| 레어 → 유니크 | 50% | LV.30 | 2000G | 골드 소실, 레벨 유지 |
| 유니크 → 에픽 | 25% | LV.50 | 8000G | 골드 소실, 레벨 유지 |

---

## 7. 적 armor 수치

> 코드 위치: `packages/shared/src/constants/units.ts`

| 유닛 | 이름 | armor | 비고 |
|------|------|-------|------|
| scout_drone | 고블린 정찰병 | 0 | 변경 없음 (약한 적) |
| battle_robot | 오크 전사 | 5 | (구: 2) 초반부터 armor 체감 |
| heavy_walker | 돌 트롤 | 12 | (구: 5) 중반 armor 체크 역할 |
| stealth_drone | 그림자 암살자 | 0 | 변경 없음 (속도형) |
| dragon | 고대 드래곤 | 25 | (구: 10) 보스전 방어 무시 필수화 |

### 방어 무시 (Armor Pierce) 메커니즘

> 코드 위치: `packages/phaser-game/src/systems/TowerSystem.ts:418` (`const armorPierce = !special`)

- `special`이 없는 공격형 타워 → **방어 무시** (armor를 0으로 취급)
- `special`이 있는 타워 (splash, slow 등) → armor 감산 적용
- 데미지 공식: `damage = rawDamage - armor` (결과 ≤ 0 → **MISS**, HP 감소 없음)
- 모든 데미지는 정수로 표시된다 (`Math.floor` 적용).

> **MISS 처리**: armor 감산 후 데미지가 0 이하가 되면 해당 공격은 MISS로 처리되어 HP 감소가 발생하지 않는다 (이전에는 `Math.max(1, ...)`로 최소 1 데미지 보장). 방어 무시 대상이 아닌 타워가 고armor 적을 공격할 때 dmg=0 상황이 발생할 수 있다.

**방어 무시 대상 타워** (special 없는 공격형):

| Tier | ID | 이름 |
|------|-----|------|
| T1 | archer | 궁수 탑 |
| T2 | twin_archer | 쌍궁 탑 |
| T3 | flame_tower | 화염 탑 |
| T3 | wind_spire | 바람의 첨탑 |
| T3 | earth_golem | 대지 골렘 |
| T4 | arcane_spire | 비전 첨탑 |

dragon_nest(T4), celestial(T5)는 splash → 방어 무시 없음 (웨이브 클리어 특화, 의도된 디자인).

### Lv.1 기준 DPS 비교 (archer vs plasma)

| 적 | armor | archer DPS (방어 무시) | plasma DPS (armor 적용) |
|----|-------|---------------------|----------------------|
| scout_drone | 0 | 15.0 | 20.0 |
| battle_robot | 5 | 15.0 | 16.0 |
| heavy_walker | 12 | 15.0 | 10.4 |
| dragon | 25 | 15.0 | 0 (MISS — armor ≥ rawDamage) |

### 보스 CC 저항 (Boss CC Resistance)

| 보스 | bossCcResist | 효과 | 밸런스 근거 |
|------|-------------|------|-----------|
| orc_warlord (W1) | 0.5 | stun/slow 50% 확률 무효 | 첫 보스, CC 학습 허용 |
| forge_master (W2) | 0.7 | stun/slow 70% 확률 무효 | 용광로 기믹과 CC 중첩 방지 |
| corrupted_archmage (W3) | 0.7 | stun/slow 이론상 30% 통과 (실제 W3 밴드 누적 0.9 저항 → 10% 적용) | CC 완전 면역 해제 (2026-04-12), 스턴 덱 유효성 확보 |

> ★2/★3 스타 등급의 CC 저항(20%/40%)과 합산된다.
> forge_master ★2 = 0.7 + 0.2 = 0.9 ; corrupted_archmage ★2 = 0.7 + 0.2 = 0.9 ; ★3 = min(0.7 + 0.4, 1.0) = 1.0 (완전 면역, `UnitSystem.ts` 에서 clamp)

---

## 8. 적 스케일링

| 구간 | HP 배율 | armor 배율 | speed 배율 | bounty 배율 | 특수효과 면역 |
|------|--------|----------|---------|-----------|------------|
| LV.1~10 | ×1 | ×1 | ×1 | ×1 | 0% |
| LV.11~20 | ×6 | ×4 | ×1.15 | ×3 | 10% |
| LV.21~30 | ×30 | ×12 | ×1.35 | ×8 | 20% |

> 2026-04-12: 이전 ×8/×5/×1.2, ×50/×20/×1.5 에서 완화. Pure PVE 생존 커브로 재조정. W3 파이널 보스 HP = `base 25000 × BAND_MULTIPLIERS[3].hp 30 × WAVE_SCALING[10].hp 3.5 × FINAL_BOSS_HP_MULTIPLIER 1.5 = 3,937,500` (`difficultyHpMult` 제외 기준; storm_citadel ×1.6 적용 시 in-game 6,300,000). 이전 8,750,000, −55%.
> `FINAL_BOSS_HP_MULTIPLIER`: 2 → **1.5** (`packages/shared/src/constants/boss.ts`).

---

## 9. ★ 별 등급 밸런스

| 항목 | ★1 정복 | ★2 정예 | ★3 지옥 |
|------|---------|---------|---------|
| HP 배수 | 1.0× | 2.5× | 5.0× |
| 방어 배수 | 1.0× | 1.5× | 2.5× |
| 속도 배수 | 1.0× | 1.2× | 1.4× |
| CC 저항 | 0% | 20% | 40% |
| 클리어 조건 | 생존 | HP 50%+ | HP 80%+ |
| 골드 보상 | 1× | 2.5× | 5× |
| XP 보상 | 1× | 2× | 3× |
| 각성석 드롭 | 0 | 1 | 3 |
| 퍼펙트(HP 100%) 보너스 | — | — | 각성석 +2 |

### ★ 해금 조건
- ★1: 월드 진입 시 자동
- ★2: 해당 맵 ★1 클리어
- ★3: 해당 맵 ★2 클리어

## 10. 전투력 공식

> 코드 위치: `packages/shared/src/utils/combatPower.ts`
> 2026-04-12: issue #81 해결을 위해 피어싱 분기 + 레퍼런스 아머 모델로 재작성.

### 분기 구조

| 타워 종류 | 판단 기준 | DPS 경로 |
|-----------|-----------|----------|
| 피어싱 공격형 | `!special` (특수효과 없음) | `dmg × Lmult × Gmult × AS` |
| 비피어싱 공격형 | `splash` / `slow_*` / `stun_*` 중 하나 | `max(0, dmg × Lmult × Gmult − REFERENCE_ARMOR) × AS` |
| 순 유틸리티 | `damage === 0` | `UTILITY_BASE[key]` (없으면 10) |
| 하이브리드 | `damage > 0 && (slow_* \|\| splash)` | 위 DPS + 0.5 × UTILITY_BASE |

최종: `round((dpsPower + utilityValue) × awakenMult)`.

### 상수

- `REFERENCE_ARMOR = 6` — 중반 적의 전형 아머 (비피어싱 타워 체감 보정).
- `enhancementStatMultiplier(L) = 1 + (L − 1) × 0.04` (참고 §6).
- `GRADE_BONUS`: normal 0 / rare 0.8 / unique 3.5 / epic 13.0 (참고 §6).
- `AWAKENING_MULTIPLIER = [1.0, 1.2, 1.5, 2.0]` (0~3각성).

### UTILITY_BASE

| Key | Weight | 소유 타워 |
|-----|--------|-----------|
| stun | 15 | shield, fortress |
| stun_aoe | 25 | (T2~T3 일부) |
| stun_aoe_extended | 40 | holy_shrine |
| stun_aoe_global | 80 | divine_throne |
| slow_30 | 10 | emp |
| slow_30_aoe | 20 | disruptor |
| slow_40_aoe | 28 | world_tree |
| slow_50_splash | 22 | stasis_field |

> 폴백: 알 수 없는 유틸리티 키 → 10.

### 알려진 한계

- 원소 매치업(±30%) 미반영 — 코드는 in-game 에서만 적용됨. 후속 작업 예정 (issue #81 follow-up).
- splash 50% 감쇠 / 범위 데미지의 군중 밀도 의존성 미반영.

### 출전덱 합산

전투력은 전체 보유 컬렉션이 아닌 **출전덱(selectedDeck) 4타워** 만 합산한다. 덱 변경 시 즉시 재계산되며, 전투력 업적 진행도도 함께 갱신된다.

### 전투력 마일스톤 (2026-04-12 재조정 후)

| 전투력 | 프로필 프레임 색상 |
|--------|-----------------|
| 0-999 | border #4a3a20 |
| 1K-1,999 | success #7ab648 |
| 2K-9,999 | accent #c8a04a |
| 10K-19,999 | gold #f0d060 + glow |
| 20K-99,999 | gradeUnique #9060e0 + glow |
| 100K+ | tierBright #ffe870 + pulse |

> 마일스톤 임계값은 새 GRADE_BONUS (epic 13.0) 와 4%/lv 커브에 맞춰 약 2× 상향 (peak 파워 22.23× → 41.44×). UI 코드(프로필 프레임 계산) 는 별도 후속 PR 로 추적.

## 11. 승급 레벨 리셋

승급 성공 시 타워 레벨이 1로 리셋된다.

| 현재 → 목표 | 확률 | 필요 레벨 | 골드 비용 | 성공 시 | 실패 시 |
|----------|------|---------|--------|--------|-------|
| 일반 → 레어 | 80% | LV.20 | 500G | Lv.1 리셋 | 골드 소실, 레벨 유지 |
| 레어 → 유니크 | 50% | LV.30 | 2000G | Lv.1 리셋 | 골드 소실, 레벨 유지 |
| 유니크 → 에픽 | 25% | LV.50 | 8000G | Lv.1 리셋 | 골드 소실, 레벨 유지 |

---

## 12. 변경 이력

| 날짜 | 항목 | 변경 내용 | 이유 |
|------|------|---------|------|
| 2026-04-06 | 최초 작성 | Phase 4 구현 후 첫 밸런스 문서화 | — |
| 2026-04-06 | 주간 미션 재설계 | use_element 추가, clear_stage [3,4]→[30,50], defeat_boss [5,7]→[30,50] | 주 3회+ 전제 난이도 |
| 2026-04-06 | 출석 체크 미션 추가 | 일일 5💎, 주간 30💎 | 앱 오픈 최소 보상 보장 |
| 2026-04-06 | 전체 미션 10x 상향 | reach_wave→[50,80], place_towers→[100,200] 등 | 기존 1~2판으로 달성 가능 → 너무 쉬움 |
| 2026-04-07 | 적 armor 상향 | battle_robot 2→5, heavy_walker 5→12, dragon 10→25 | splash vs 집중형 전략 선택 발생 |
| 2026-04-07 | forest_gate 웨이브 3 조정 | heavy_walker ×1 추가, battle_robot ×4→×3 | 웨이브 3에서 armor 체감 학습 유도 |
| 2026-04-07 | TowerBottomSheet 방어 무시 UI 추가 | 집중 공격형 타워에 "방어 무시 - 적용" 표시 | 방어 무시 메커니즘 인지 개선 |
| 2026-04-08 | MAX_TOWER_LEVEL 50 | 30→50 확장, LV.31~50 구간 추가 (구체적 성장은 미정) | unique→epic 승급 게이트(LV.50) 지원 |
| 2026-04-08 | 승급 레벨 게이트 구현 | 코드에 requiredLevel 20/30/50 체크 추가, UI 잠금 표시 | GDD 스펙 반영 |
| 2026-04-08 | 물리 충돌 시스템 | 지상 유닛 겹침 방지, CC 연쇄, 비행 면제(dragon) | 전술 깊이 증가, CC 타워 가치 상승 |
| 2026-04-08 | 웨이브 테마 배치 | 3맵 10웨이브를 아키타입 테마로 재구성 (속도/탱크/혼합/보스) | 덱 다양성 요구, 전략적 변주 |
| 2026-04-08 | 타워 판매 UI 개선 | "E+5" → 에너지 아이콘+숫자 (DeckDock/TopHud 패턴 통일) | 시각적 일관성 |
| 2026-04-09 | arcane_spire 너프 | damage 50→35, range 6→5 (DPS 75→52.5) | T4 최고 사거리+관통+DPS 3박자로 정답 타워 고정. wind_spire(T3)와 근접한 수치로 재조정 (#104) |
| 2026-04-09 | divine_throne 쿨다운 너프 | stun_aoe_global cooldownMs 5000→7000 | 글로벌 2초 스턴을 5초마다 → 7초마다. 글로벌 컨셉 유지한 채 빈도만 너프 (#103) |
| 2026-04-09 | 스턴 타워 레벨 성장 공식 신설 | shield/fortress/holy_shrine/divine_throne 모두 cooldown -29%, duration +40% @LV.50 | 기존 스턴 타워는 레벨업 효과 미정의 → 실질 성장률 0. `stunCooldownMultiplier`/`stunDurationMultiplier` 도입 (#99) |
| 2026-04-09 | 속성 상성 §13 섹션 추가 + UI CC 뱃지 | 밸런스 시트에 ELEMENT_MATCHUP 문서화, TowerBottomSheet에 CC duration/cooldown/aoe + range 999 "전체 맵" 뱃지 | 스펙 단일 진실 원천 유지, UI 가시성 개선 (#105, #103) |
| 2026-04-11 | 에너지 시스템 오버홀 | INITIAL_ENERGY 10→40, 킬 보상(ENERGY_PER_KILL/ENERGY_PER_BOSS_KILL) 제거, ENERGY_PER_WAVE_CLEAR=5 신설, 마지막 보스 웨이브 리젠+클리어 보상 비활성화 | 에너지 관리 단순화, 전략적 초기 배치 강화 |
| 2026-04-11 | 웨이브 30초 타이머 | MAX_WAVE_DURATION_MS=30000, 만료 시 잔존 몬스터 유지+다음 웨이브 즉시 스폰, 마지막 웨이브 면제 | 세션 길이 보장, 거북한 플레이 방지 |
| 2026-04-11 | 웨이브 패턴 재구성 | pre_boss 완전 제거. WaveSlotKind = 'normal' \| 'boss'. wave 1~9: normal, wave 10: boss. STAGE_WAVES 단일 원천, 레거시 배열 제거 | 보스 경고 타이밍 단순화 |
| 2026-04-11 | 보스 판정 로직 변경 | isBoss = wave.kind === 'boss' \|\| unitDef.bossBehaviorId. 보스 leak 즉시패배 boss-kind 웨이브에서만. FINAL_BOSS_HP_MULTIPLIER 마지막 웨이브에만 적용 | 하드코딩 titan 제거, 다양한 보스 지원 |
| 2026-04-11 | titan→dragon rename | 일반 유닛 ID titan을 dragon으로 전면 변경 | 최종보스 전용 예약 → 일반 비행 유닛으로 재정의 |
| 2026-04-11 | W2/W3 유닛 추가 | flame_imp, lava_golem (W2), arcane_mage, mana_shield (W3) | 월드별 고유 적 조합 |
| 2026-04-11 | 월드별 보스 3종 추가 | orc_warlord(W1), forge_master(W2), corrupted_archmage(W3) | bossBehaviorId 기반 보스 AI |
| 2026-04-12 | 보스 웨이브 에너지 시스템 통일 | 마지막 보스 웨이브에서 에너지 리젠 + ENERGY_PER_WAVE_CLEAR 비활성화 제거. 전 웨이브 동일 적용 | 보스전 중 타워 배치/업그레이드 유연성 확보, 예외 케이스 제거 (DRIFT-2) |
| 2026-04-12 | armor 데미지 공식 MISS 전환 | `Math.max(1, rawDamage - armor)` → `rawDamage - armor` (0 이하 시 MISS). 최종 데미지 `Math.floor` 정수화 | 최소 1 데미지 보장 제거로 armor 전략성 강화, 소수점 데미지 표기 버그 수정 |
| 2026-04-12 | 타워 승급 시스템 개선 (#52) | 등급별 최대 레벨 (normal=20/rare=30/unique=50/epic=50), GRADE_BONUS (0/+70%/+250%/+800% — 이후 #81 에서 재조정됨, 아래 행 참고), GRADE_COST_MULT (1x/2x/4x/8x). 승급 확률 20/10/5% → 80/50/25% | 승급 후 Lv.1이 이전 등급 만렙보다 강하도록 재밸런스, 승급 성공률 현실화 |
| 2026-04-12 | 밸런스 대수정 (#81, #111) | (1) 전투력: 피어싱 분기 + REFERENCE_ARMOR=6 도입, UTILITY_BASE 확장. (2) 강화: 비용 `(100+40L+3L²)`, 효율 4%/lv. (3) GRADE_BONUS: rare 0.7→0.8, unique 2.5→3.5, epic 8.0→13.0 (승급 게이트 유지). (4) 적 스케일 band2 ×8/×5/×1.2 → ×6/×4/×1.15, band3 ×50/×20/×1.5 → ×30/×12/×1.35. (5) FINAL_BOSS_HP_MULTIPLIER 2→1.5. (6) corrupted_archmage bossCcResist 1.0→0.7. | 전투력 표시-in game 괴리 해소, pure PVE 생존 커브 확보, 승급 체감 상향 |

---

## 13. 속성 상성 (Element Matchup)

> 코드 위치: `packages/shared/src/constants/elements.ts` — `ELEMENT_MATCHUP`

| 공격 \ 방어 | fire | water | lightning | neutral |
|---|---|---|---|---|
| fire | ×1.0 | **×0.7** | ×1.3 | ×1.0 |
| water | ×1.3 | ×1.0 | **×0.7** | ×1.0 |
| lightning | **×0.7** | ×1.3 | ×1.0 | ×1.0 |
| neutral | ×1.0 | ×1.0 | ×1.0 | ×1.0 |

### 상성 관계 요약
- **fire ↔ water**: water 우세 (물이 불을 끈다)
- **water ↔ lightning**: lightning 우세 (전기가 물을 친다)
- **lightning ↔ fire**: fire 우세 (불이 번개를 삼킨다)
- **neutral**: 모든 속성에 ×1.0 (유불리 없음)

### 데미지 계산 순서
1. 기본 데미지 = `baseDamage × enhancementStatMultiplier(level) × (1 + GRADE_BONUS[grade])`
2. 속성 배수 적용 = `× getElementMultiplier(tower.element, enemy.element)`
3. splash 스플래시 감쇠 = `× 0.5` (splash 대상에만)
4. armor 감산 = `result - enemy.armor` (단 §7 방어 무시 대상 타워 제외. 0 이하 시 MISS 처리, HP 감소 없음)
5. 정수 변환 = `Math.floor(result)` — 최종 데미지는 정수로 적용/표시됨

### 타워 속성 분포
| 속성 | 타워 ID |
|------|---------|
| fire | plasma(중립 → 현재 neutral), nova_cannon, flame_tower, dragon_nest |
| water | emp, disruptor, stasis_field |
| lightning | wind_spire, arcane_spire, celestial |
| neutral | 그 외 (archer, twin_archer, earth_golem, shield, fortress, holy_shrine, world_tree, divine_throne) |

> plasma는 현재 `element: 'neutral'`로 정의되어 있어 상성 적용 없음. 속성 부여는 별도 밸런싱 검토 필요.

---

## 14. 미결 이슈

- [ ] `missions.ts` — use_element 추가, 범위 조정 코드 반영
- [ ] use_element 주간 속성 랜덤 지정 기능 (매주 화/수/번개 중 1개)
- [ ] 다이아 출석 보상 구현 (Phase 5)
- [ ] 광고 상자 실제 광고 연동 (Phase 5)

# 밸런스 시트

> **Last Updated:** 2026-05-09 (v5.0 — central wall checkpoint balance)
> **Scope:** v1 출시 밸런스는 평균 6~8분, 20 wave / Act 1~4, 중앙 성벽, 4속성 슬롯, checkpoint reward, 선택형 광고 2곳만 다룬다.
> **Out of Scope:** 다이아 경제, 외부 상자 가챠, 일일/주간 미션, 별 등급, grade 승급, 각성, 서버 기반 시즌 경제, 랜덤 합성 active loop.

---

## 1. Balance Goals

| 항목 | 목표 |
|------|------|
| 평균 세션 | 6~8분 |
| 첫 보스 도달 | 2~3분 |
| 초보 패배 | Act 2 |
| 익숙한 유저 패배 | Act 3~4 |
| v1 콘텐츠 완주 | Act 4 / wave 20 |
| 의사결정 빈도 | 평시 수리/스킬, 보스 후 checkpoint reward |
| 핵심 보상 | 슬롯 등장/승급, 성벽 강화, 스킬 강화, 전역 카드 |

50 wave는 데이터 상한/디버그 구간으로 유지할 수 있지만, v1 밸런스 기준은 wave 20까지다. wave 5/10/15/20은 boss checkpoint다.

---

## 2. Energy Economy

| 항목 | 값 | 비고 |
|------|-----|------|
| `ENERGY_INITIAL` | 40 | 초반 수리/스킬 실수 완충 |
| `ENERGY_PER_SECOND` | 1 | 기본 재생 |
| `ENERGY_MAX` | 200 | 수리/스킬과 checkpoint 보상 경제 수용 |
| `ENERGY_PER_KILL` | 1 | 처치가 전술 사용 여유와 연결됨 |
| `ENERGY_PER_BOSS_KILL` | 20 | 보스 처치 보상 |
| `ENERGY_PER_BOSS_FAST_CLEAR` | 20 | 빠른 보스 처치 보상 |
| `FAST_CLEAR_THRESHOLD_MS` | 30,000 | 보스 스폰 후 기준 |

### Soft Cap

| 조건 | 재생율 |
|------|--------|
| energy < 100 | +1/sec |
| energy >= 100 | +0.5/sec |

### One-Wave Expected Inflow

| 항목 | 기대값 |
|------|--------|
| 일반 wave 처치 | 약 +20~30 |
| 30초 생존 | +30 |
| 보스 처치 | +20~40 |

초반 wave에서 energy가 너무 빨리 쌓이면 성벽 수리 판단이 사라진다. 너무 느리면 스킬을 눌러볼 여지가 없다. v1 튜닝은 “플레이어가 수리/스킬을 항상 쓰고 싶지만 항상 충분하지는 않은 상태”를 목표로 한다.

---

## 3. Active V1 Wall / Slot / Skill Economy

### Wall

| 값 | v1 기준 | 설명 |
|----|---------|------|
| `wall.maxHp` | 20 | 기존 HP HUD를 성벽 HP로 대체 |
| `wall.instantRepairCharges` | 0 start, checkpoint/random reward로 +1 | 성벽 클릭 메뉴의 즉시 수리 자원 |
| `wall.repairCost` | 25 energy | legacy/manual tuning guardrail. v1 메뉴에서는 즉시 수리권을 우선 사용 |
| `wall.repairAmount` | 5 HP | legacy/manual tuning guardrail |
| `wall.repairCooldownSec` | 12초 | legacy/manual tuning guardrail |
| `wall.autoAttackDamage` | 75 | 타워가 비어 있어도 Act 1 boss까지 진행되게 하는 성벽 기본 화력 |
| `wall.autoAttackIntervalSec` | 0.5초 | 자동 공격은 첫 checkpoint 전 기본 방어 수단 |
| `wall.autoAttackRange` | 5.0 cells | 성벽 주변 압박 대응 범위 |
| `wall.damageUpgradeCost` | 45 energy, 이후 +15 | 성벽 메뉴 공격력 강화 |
| `wall.speedUpgradeCost` | 50 energy, 이후 +20 | 성벽 메뉴 공격 속도 강화 |
| `wall.rangeUpgradeCost` | 40 energy, 이후 +15 | 성벽 메뉴 공격 범위 강화 |

### Tower Slots

| Slot | Family | 시작 상태 | 보상 적용 |
|------|--------|-----------|-----------|
| 1 | archer | locked | 등장 시 T1, 이후 같은 family 보상으로 tier/effect 강화 |
| 2 | siege | locked | 등장 시 T1, 이후 같은 family 보상으로 tier/effect 강화 |
| 3 | frost | locked | 등장 시 T1, 이후 같은 family 보상으로 tier/effect 강화 |
| 4 | stun | locked | 등장 시 T1, 이후 같은 family 보상으로 tier/effect 강화 |

각 슬롯은 family가 고정되어 중복 배치가 불가능하다. tower reward는 새 타워를 뽑는 소환이 아니라 슬롯 상태를 갱신하는 보상이다.

### Player Tactics

| Skill | 초기 상태 | v1 기준 |
|-------|-----------|---------|
| force move | locked | 해금 후 범위 내 적을 경로 뒤쪽으로 밀어냄 |
| freeze | locked | 해금 후 범위 내 적을 정지/빙결 |

boss에는 기존 `ccResistance`와 stun immunity window가 그대로 적용된다.

---

## 4. Legacy Summon and In-Run Gacha

| 액션 | 비용 | 성공률 | 실패 |
|------|------|--------|------|
| 기본 소환 | 20 | 100% | 없음 |
| T2 시도 | 40 | 60% | T1 |
| T3 시도 | 80 | 20% | T1 |
| T4 시도 | 160 | 5% | T1 |

`tier_odds_up` 카드:

- 스택당 +5%p
- 최대 10스택
- 최종 성공률 상한 95%

이 확률은 legacy/parking lot이다. v1 active balance 검증에는 사용하지 않는다.

---

## 4. Tower Stats

v1 타워 모델은 `family + tier`만 사용한다.

| id | family | tier | damage | range | aspd | special |
|----|--------|------|--------|-------|------|---------|
| archer | archer | 1 | 20 | 4.0 | 1.0 | - |
| wind_spire | archer | 2 | 35 | 4.5 | 1.2 | - |
| flame_tower | archer | 3 | 60 | 5.0 | 1.3 | - |
| arcane_spire | archer | 4 | 100 | 5.5 | 1.5 | - |
| nova_cannon | siege | 1 | 30 | 3.5 | 0.5 | splash 1.2 |
| fortress | siege | 2 | 55 | 4.0 | 0.6 | splash 1.5 |
| earth_golem | siege | 3 | 90 | 4.5 | 0.7 | splash 1.8 |
| celestial | siege | 4 | 150 | 5.0 | 0.8 | splash 2.2 |
| emp | frost | 1 | 8 | 3.5 | 0.8 | slow 30% |
| stasis_field | frost | 2 | 14 | 4.0 | 0.9 | slow 45% |
| disruptor | frost | 3 | 24 | 4.5 | 1.0 | slow 60% |
| world_tree | frost | 4 | 40 | 5.0 | 1.1 | slow 75% |
| shield | stun | 1 | 5 | 3.0 | 0.5 | stun 300ms |
| twin_archer | stun | 2 | 10 | 3.5 | 0.6 | stun 500ms |
| holy_shrine | stun | 3 | 18 | 4.0 | 0.7 | stun 800ms |
| divine_throne | stun | 4 | 30 | 4.5 | 0.8 | stun 1200ms |
| hybrid_ab | hybrid | 5 | 200 | 6.0 | 1.4 | splash 1.6 |
| hybrid_cd | hybrid | 5 | 80 | 5.5 | 1.2 | slow 80% + stun 600ms |
| ultimate | ultimate | 6 | 500 | 7.0 | 1.6 | splash 2.5 + slow 90% + stun 1500ms |

### Merge Chain

| 조건 | 결과 |
|------|------|
| same family + same tier, T1~T3 | next tier |
| archer T4 + siege T4 | `hybrid_ab` |
| frost T4 + stun T4 | `hybrid_cd` |
| `hybrid_ab + hybrid_cd` | `ultimate` |

---

## 5. Family Upgrade

패밀리 강화는 run-scoped energy 소비 시스템이다. v1 필수 축은 아니므로 합성과 보스 카드보다 앞서면 안 된다.

| 항목 | 정책 |
|------|------|
| 대상 | archer, siege, frost, stun |
| 비용 | `familyUpgradeCost(level)` 기준 |
| 레벨 상한 | `MAX_FAMILY_UPGRADE_LEVEL` 기준 |
| 효과 | 해당 family damage buff |

튜닝 가이드:

- 강화가 “합성보다 정답”이 되면 비용을 올린다.
- 강화 버튼 설명은 튜토리얼에서 제외한다.
- v1 플레이테스트에서 조작 피로가 크면 접거나 숨긴다.

---

## 6. Enemy and Wave Scaling

### Enemy Pool

v1은 보유 12종 전체를 억지로 쓰지 않는다. 초반 판독성을 우선한다.

| 역할 | 추천 유닛 |
|------|-----------|
| 빠른 약체 | scout_drone, flame_imp |
| 일반 체력 | battle_robot, arcane_mage |
| 탱커 | heavy_walker, lava_golem |
| 특수/압박 | stealth_drone, mana_shield |
| 보스 | orc_warlord, forge_master, corrupted_archmage 중 2~3종 |

### Wave Shape

| 구간 | 설계 의도 |
|------|-----------|
| 1~3 | 기본 소환과 배치 학습 |
| 4~5 | 첫 보스, 첫 카드 선택 |
| 6~10 | 합성 판단과 카드 효과 체감 |
| 11~15 | 중반 조합 완성, 2~3번째 카드 선택 |
| 16~20 | 최종 압박, T5/T6 도전, v1 콘텐츠 완주 |
| 21+ | 숙련자/확장/디버그 |

### Scaling

기존 `WAVE_SCALING`과 slots 11+ 선형 공식은 유지하되, v1 테스트 기준은 wave 20까지다.

```text
HP_SLOPE = 0.55
hp    = WAVE_SCALING[10].hp + (slot - 10) x HP_SLOPE
speed = min(WAVE_SCALING[10].speed + (slot - 10) x 0.03, 2.2)
```

---

## 7. CC Guardrails

| 항목 | 값 | 이유 |
|------|-----|------|
| boss `ccResistance` | 0.5~0.7 | 보스 영구 봉쇄 방지 |
| `MIN_MOVE_SPEED` | 0.15 | slow로 완전 정지 방지 |
| `STUN_IMMUNITY_WINDOW_MS` | 2000 | stun chain 방지 |
| `MAIN_LONG_UNIT_SPEED_MULTIPLIER` | 0.55 | 일러스트 맵 표시 속도 보정 |

CC 카드는 강해도 된다. 대신 보스가 멈춰서 게임이 끝나는 조합은 막아야 한다.

---

## 8. Checkpoint Reward Pool

보스 wave 5/10/15/20 클리어 후 3개 reward 중 1개를 고른다. 같은 화면 안에서 reward id는 중복되면 안 된다.

| Reward group | 예시 | v1 정책 |
|--------------|------|---------|
| tower upgrade | archer/siege/frost/stun 슬롯 등장 또는 승급 | 유지 |
| wall upgrade | 즉시 수리권, 이후 성벽 메뉴에서 energy로 공격력/속도/범위 강화 | 유지 |
| skill upgrade | force move, freeze 해금/강화 | 유지 |
| global card | damage/economy/effect amp | 유지 |

---

## 9. Legacy Run Upgrade Cards

| ID | 효과 | v1 정책 |
|----|------|---------|
| `dmg_up` | damage +20% | 유지 |
| `energy_harvest` | kill energy +1 | 유지 |
| `energy_regen` | 5초마다 +2 energy | 유지 |
| `tier_odds_up` | gacha 성공률 +5%p | 유지 |
| `effect_amp` | slow/stun 지속 +25% | 조건부 유지 |
| `crit_dmg` | crit damage +25%p | 보류 권장 |

카드는 설명을 읽지 않아도 효과가 예상되어야 한다. v1에서 카드가 6개보다 많아지면 안 된다.

---

## 10. Removed From Active Balance

아래 항목은 v1 밸런스 문서에서 활성 기준으로 다루지 않는다.

- 다이아몬드 경제
- 무료/광고/다이아 상자
- 10연차 보장과 천장
- 일일/주간 미션 보상
- grade 성장과 승급 확률
- 각성석
- 별 등급 난이도
- 전투력 공식
- 출전덱 합산
- 속성 상성 기반 장기 메타
- 기본 소환 중심 경제
- tier gacha 중심 성장
- 동일 타워 2개 합성
- 6개 자유 배치칸

필요하면 후속 시즌 또는 유료화 실험 문서로 새로 작성한다.

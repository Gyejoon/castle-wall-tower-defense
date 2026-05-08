# 밸런스 시트

> **Last Updated:** 2026-05-06 (v4.0 — minimal launch balance)
> **Scope:** v1 출시 밸런스는 평균 6~8분, 20 wave 콘텐츠 아크, 단일 맵, 단일 전투 재화, 선택형 광고 2곳만 다룬다.
> **Out of Scope:** 다이아 경제, 외부 상자 가챠, 일일/주간 미션, 별 등급, grade 승급, 각성, 서버 기반 시즌 경제.

---

## 1. Balance Goals

| 항목 | 목표 |
|------|------|
| 평균 세션 | 6~8분 |
| 첫 보스 도달 | 2~3분 |
| 초보 패배 | wave 10~12 |
| 익숙한 유저 패배 | wave 16~20 |
| v1 콘텐츠 완주 | wave 20 |
| 소환 빈도 | 초반 10~20초마다 의사결정 발생 |
| 핵심 보상 | 더 높은 tier 합성, 보스 카드 선택, 최고 wave 갱신 |

50 wave는 데이터 상한/디버그 구간으로 유지할 수 있지만, v1 밸런스 기준은 wave 20까지다.

---

## 2. Energy Economy

| 항목 | 값 | 비고 |
|------|-----|------|
| `ENERGY_INITIAL` | 40 | 시작 즉시 2회 기본 소환 가능 |
| `ENERGY_PER_SECOND` | 1 | 기본 재생 |
| `ENERGY_MAX` | 200 | T4 시도 비용 수용 |
| `ENERGY_PER_KILL` | 1 | 처치가 소환 빈도와 연결됨 |
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

초반 wave에서 energy가 너무 빨리 쌓이면 버튼 판단이 사라진다. 너무 느리면 랜덤 합성 재미가 죽는다. v1 튜닝은 “플레이어가 항상 소환하고 싶지만 항상 충분하지는 않은 상태”를 목표로 한다.

---

## 3. Summon and In-Run Gacha

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

v1에서 이 확률은 BM이 아니라 런 안의 리스크/보상 버튼이다. 유료 재화와 연결하지 않는다.

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

## 8. Run Upgrade Cards

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

## 9. Removed From Active Balance

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

필요하면 후속 시즌 또는 유료화 실험 문서로 새로 작성한다.

# 밸런스 시트

> **Last Updated:** 2026-04-09  
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

### 1판 플레이 기댓값

| 항목 | 획득량 | 비고 |
|------|-------|------|
| 골드 (클리어) | ~1000G | 웨이브 보상 + 보스 보너스 |
| 골드 (실패) | ~400~600G | 웨이브별 가변 |
| 타워 배치 수 | 15~20회 | 에너지 360/판 기준 |

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

### 레벨 강화 구간별 성장

| 구간 | 집중 공격형 | 다중 공격형 | 슬로우 | 스턴 |
|------|----------|----------|------|------|
| LV.1~10 | atk +2/lv | atk +3/lv | cooldown -2%/lv | cooldown -1%/lv (누적 -9%) |
| LV.11~20 | atk +5%/lv | splash_radius +3%/lv | slow_duration +3%/lv | cd -1%/lv + duration +2%/lv |
| LV.21~30 | armor_pen +1/lv | atk +8%/lv | target_count +1 @25,30 | cooldown -1%/lv (누적 -29%) |
| LV.31~50 | (미정) | (미정) | (미정) | duration +1%/lv (누적 dur +40%) |

> **스턴 타워 LV.50 최종 배수**: cooldown ×0.71 (-29%), duration ×1.4 (+40%)
> 코드 위치: `packages/shared/src/constants/meta.ts` — `stunCooldownMultiplier`, `stunDurationMultiplier`
> 적용 대상:
> - **Passive 스턴 타워** (shield T1 / holy_shrine T4 / divine_throne T5, `attackSpeed=0`): cooldown + duration 양쪽 스케일 적용
> - **Active 스턴 타워** (fortress T2, `attackSpeed=1.0`): duration 스케일만 적용. 발동 cadence는 `attackInterval = 1000/attackSpeed`로 결정되며 `CC_AURA_CONFIGS.cooldownMs`는 참조하지 않음. 별도 cooldown 스케일은 attackSpeed 재설계가 필요하여 후속 세션에서 처리

> MAX_TOWER_LEVEL = 50. unique→epic 승급에 LV.50 필요.

### 타워 승급 확률

| 현재 → 목표 | 확률 | 필요 레벨 | 골드 비용 | 실패 시 |
|----------|------|---------|--------|-------|
| 일반 → 레어 | 20% | LV.20 | 500G | 골드 소실, 레벨 유지 |
| 레어 → 유니크 | 10% | LV.30 | 2000G | 골드 소실, 레벨 유지 |
| 유니크 → 에픽 | 5% | LV.50 | 8000G | 골드 소실, 레벨 유지 |

---

## 7. 적 armor 수치

> 코드 위치: `packages/shared/src/constants/units.ts`

| 유닛 | 이름 | armor | 비고 |
|------|------|-------|------|
| scout_drone | 고블린 정찰병 | 0 | 변경 없음 (약한 적) |
| battle_robot | 오크 전사 | 5 | (구: 2) 초반부터 armor 체감 |
| heavy_walker | 돌 트롤 | 12 | (구: 5) 중반 armor 체크 역할 |
| stealth_drone | 그림자 암살자 | 0 | 변경 없음 (속도형) |
| titan | 고대 드래곤 | 25 | (구: 10) 보스전 방어 무시 필수화 |

### 방어 무시 (Armor Pierce) 메커니즘

> 코드 위치: `packages/phaser-game/src/systems/TowerSystem.ts:275`

- `special`이 없는 공격형 타워 → **방어 무시** (armor를 0으로 취급)
- `special`이 있는 타워 (splash, slow 등) → armor 감산 적용
- 데미지 공식: `damage = Math.max(1, rawDamage - armor)`

**방어 무시 대상 타워** (special 없는 공격형):

| Tier | ID | 이름 |
|------|-----|------|
| T1 | laser | 궁수 탑 |
| T2 | twin_laser | 쌍궁 탑 |
| T3 | flame_tower | 화염 탑 |
| T3 | wind_spire | 바람의 첨탑 |
| T3 | earth_golem | 대지 골렘 |
| T4 | arcane_spire | 비전 첨탑 |

dragon_nest(T4), celestial(T5)는 splash → 방어 무시 없음 (웨이브 클리어 특화, 의도된 디자인).

### Lv.1 기준 DPS 비교 (laser vs plasma)

| 적 | armor | laser DPS (방어 무시) | plasma DPS (armor 적용) |
|----|-------|---------------------|----------------------|
| scout_drone | 0 | 15.0 | 20.0 |
| battle_robot | 5 | 15.0 | 16.0 |
| heavy_walker | 12 | 15.0 | 10.4 |
| titan | 25 | 15.0 | 0.8 (min1) |

---

## 8. 적 스케일링

| 구간 | HP 배율 | armor 배율 | speed 배율 | bounty 배율 | 특수효과 면역 |
|------|--------|----------|---------|-----------|------------|
| LV.1~10 | ×1 | ×1 | ×1 | ×1 | 0% |
| LV.11~20 | ×8 | ×5 | ×1.2 | ×3 | 10% |
| LV.21~30 | ×50 | ×20 | ×1.5 | ×8 | 20% |

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

```
전투력 = Σ (출전덱 4타워에 대해: basePower × 등급배수 × 레벨배수 × 각성배수)

basePower:
  - 공격 타워: damage × attackSpeed (DPS 기반)
  - 서포트 타워: 유틸리티 가중치 (stun 15, stun_aoe_extended 40, stun_aoe_global 80, slow_30_aoe 20, 기타 10)

등급배수: normal 1.0 / rare 1.1 / unique 1.25 / epic 1.45
레벨배수: 1 + (level - 1) × 0.03
각성배수: 0각성 1.0 / 1각성 1.2 / 2각성 1.5 / 3각성 2.0
```

> 전투력은 전체 보유 컬렉션이 아닌 **출전덱(selectedDeck) 4타워**만 합산한다.
> 덱 변경 시 즉시 재계산되며, 전투력 업적 진행도도 함께 갱신된다.

### 전투력 마일스톤
| 전투력 | 프로필 프레임 색상 |
|--------|-----------------|
| 0-499 | border #4a3a20 |
| 500-999 | success #7ab648 |
| 1K-4,999 | accent #c8a04a |
| 5K-9,999 | gold #f0d060 + glow |
| 10K-49,999 | gradeUnique #9060e0 + glow |
| 50K+ | tierBright #ffe870 + pulse |

## 11. 승급 레벨 리셋

승급 성공 시 타워 레벨이 1로 리셋된다.

| 현재 → 목표 | 확률 | 필요 레벨 | 골드 비용 | 성공 시 | 실패 시 |
|----------|------|---------|--------|--------|-------|
| 일반 → 레어 | 20% | LV.20 | 500G | Lv.1 리셋 | 골드 소실, 레벨 유지 |
| 레어 → 유니크 | 10% | LV.30 | 2000G | Lv.1 리셋 | 골드 소실, 레벨 유지 |
| 유니크 → 에픽 | 5% | LV.50 | 8000G | Lv.1 리셋 | 골드 소실, 레벨 유지 |

---

## 12. 변경 이력

| 날짜 | 항목 | 변경 내용 | 이유 |
|------|------|---------|------|
| 2026-04-06 | 최초 작성 | Phase 4 구현 후 첫 밸런스 문서화 | — |
| 2026-04-06 | 주간 미션 재설계 | use_element 추가, clear_stage [3,4]→[30,50], defeat_boss [5,7]→[30,50] | 주 3회+ 전제 난이도 |
| 2026-04-06 | 출석 체크 미션 추가 | 일일 5💎, 주간 30💎 | 앱 오픈 최소 보상 보장 |
| 2026-04-06 | 전체 미션 10x 상향 | reach_wave→[50,80], place_towers→[100,200] 등 | 기존 1~2판으로 달성 가능 → 너무 쉬움 |
| 2026-04-07 | 적 armor 상향 | battle_robot 2→5, heavy_walker 5→12, titan 10→25 | splash vs 집중형 전략 선택 발생 |
| 2026-04-07 | forest_gate 웨이브 3 조정 | heavy_walker ×1 추가, battle_robot ×4→×3 | 웨이브 3에서 armor 체감 학습 유도 |
| 2026-04-07 | TowerBottomSheet 방어 무시 UI 추가 | 집중 공격형 타워에 "방어 무시 - 적용" 표시 | 방어 무시 메커니즘 인지 개선 |
| 2026-04-08 | MAX_TOWER_LEVEL 50 | 30→50 확장, LV.31~50 구간 추가 (구체적 성장은 미정) | unique→epic 승급 게이트(LV.50) 지원 |
| 2026-04-08 | 승급 레벨 게이트 구현 | 코드에 requiredLevel 20/30/50 체크 추가, UI 잠금 표시 | GDD 스펙 반영 |
| 2026-04-08 | 물리 충돌 시스템 | 지상 유닛 겹침 방지, CC 연쇄, 비행 면제(titan) | 전술 깊이 증가, CC 타워 가치 상승 |
| 2026-04-08 | 웨이브 테마 배치 | 3맵 10웨이브를 아키타입 테마로 재구성 (속도/탱크/혼합/보스) | 덱 다양성 요구, 전략적 변주 |
| 2026-04-08 | 타워 판매 UI 개선 | "E+5" → 에너지 아이콘+숫자 (DeckDock/TopHud 패턴 통일) | 시각적 일관성 |
| 2026-04-09 | arcane_spire 너프 | damage 50→35, range 6→5 (DPS 75→52.5) | T4 최고 사거리+관통+DPS 3박자로 정답 타워 고정. wind_spire(T3)와 근접한 수치로 재조정 (#104) |
| 2026-04-09 | divine_throne 쿨다운 너프 | stun_aoe_global cooldownMs 5000→7000 | 글로벌 2초 스턴을 5초마다 → 7초마다. 글로벌 컨셉 유지한 채 빈도만 너프 (#103) |
| 2026-04-09 | 스턴 타워 레벨 성장 공식 신설 | shield/fortress/holy_shrine/divine_throne 모두 cooldown -29%, duration +40% @LV.50 | 기존 스턴 타워는 레벨업 효과 미정의 → 실질 성장률 0. `stunCooldownMultiplier`/`stunDurationMultiplier` 도입 (#99) |
| 2026-04-09 | 속성 상성 §14 섹션 추가 + UI CC 뱃지 | 밸런스 시트에 ELEMENT_MATCHUP 문서화, TowerBottomSheet에 CC duration/cooldown/aoe + range 999 "전체 맵" 뱃지 | 스펙 단일 진실 원천 유지, UI 가시성 개선 (#105, #103) |

---

## 14. 속성 상성 (Element Matchup)

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
4. armor 감산 = `Math.max(1, result - enemy.armor)` (단 §7 방어 무시 대상 타워 제외)

### 타워 속성 분포
| 속성 | 타워 ID |
|------|---------|
| fire | plasma(중립 → 현재 neutral), nova_cannon, flame_tower, dragon_nest |
| water | emp, disruptor, stasis_field |
| lightning | wind_spire, arcane_spire, celestial |
| neutral | 그 외 (archer, twin_archer, earth_golem, shield, fortress, holy_shrine, world_tree, divine_throne) |

> plasma는 현재 `element: 'neutral'`로 정의되어 있어 상성 적용 없음. 속성 부여는 별도 밸런싱 검토 필요.

---

## 13. 미결 이슈

- [ ] `missions.ts` — use_element 추가, 범위 조정 코드 반영
- [ ] use_element 주간 속성 랜덤 지정 기능 (매주 화/수/번개 중 1개)
- [ ] 다이아 출석 보상 구현 (Phase 5)
- [ ] 광고 상자 실제 광고 연동 (Phase 5)

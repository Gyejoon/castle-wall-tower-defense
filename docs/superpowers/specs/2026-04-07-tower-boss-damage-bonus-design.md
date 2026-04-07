# 집중 공격형 타워 보스 추가 데미지 시스템

## 배경

현재 투석기(plasma, splash 공격형)가 궁수탑(laser, 단일 공격형)보다 단일 타겟 DPS도 높고 범위 공격까지 가능해서 궁수탑을 사용할 이유가 없음. 궁수탑 라인의 원래 의도는 **보스 공격 특화**였으나, 이를 뒷받침하는 메커니즘이 없었음.

## 설계

### 적용 대상

splash가 없는 모든 공격형 타워 (조건: `attackSpeed > 0 && special에 'splash' 미포함`)

해당 타워 목록:
| Tier | ID | 이름 |
|------|-----|------|
| T1 | laser | 궁수 탑 |
| T2 | twin_laser | 쌍궁 탑 |
| T3 | flame_tower | 화염 탑 |
| T3 | wind_spire | 바람의 첨탑 |
| T3 | earth_golem | 대지 골렘 |
| T4 | arcane_spire | 비전 첨탑 |

### 보스 추가 데미지 공식

```
bossDamageBonus = BOSS_BONUS_BASE[grade] + (level - 1) × 0.005
```

| 등급 | 기본 보너스 | Lv.1 | Lv.10 | Lv.20 | Lv.30 |
|------|-----------|------|-------|-------|-------|
| normal | 40% | 40.0% | 44.5% | 49.5% | 54.5% |
| rare | 45% | 45.0% | 49.5% | 54.5% | 59.5% |
| unique | 50% | 50.0% | 54.5% | 59.5% | 64.5% |
| epic | 60% | 60.0% | 64.5% | 69.5% | 74.5% |

### 전투 적용

`TowerSystem.ts`의 데미지 계산에서 타겟이 보스(titan)일 때:

```
finalDamage = baseDamage × levelMultiplier × gradeMultiplier × elementMatchup × (1 + bossDamageBonus)
```

보스 판별: `unitDef.id === 'titan'` (현재 유일한 보스 유닛)

### 밸런스 검증

**T1 laser vs plasma 보스전 DPS:**

| 상태 | 궁수탑 보스DPS | 투석기 DPS | 우위 |
|------|-------------|----------|------|
| 일반 Lv.1 | 21.0 | 20.0 | +5% |
| 일반 Lv.10 | 27.6 | 25.4 | +9% |
| 레어 Lv.10 | 29.6 | 27.9 | +6% |
| 유니크 Lv.20 | 42.7 | 31.7 | +35% |
| 에픽 Lv.30 | 57.0 | 42.0 | +36% |

**T4 arcane_spire vs dragon_nest 보스전 DPS:**

| 상태 | 비전첨탑 보스DPS | 용둥지 DPS | 우위 |
|------|--------------|----------|------|
| 일반 Lv.1 | 105.0 | 80.0 | +31% |
| 에픽 Lv.30 | 190.0 | 116.0 | +64% |

## UI 변경

### 타워 강화 화면 (TowerBottomSheet.tsx)

기존 4개 스탯 아래에 **보스 추가 데미지** 스탯을 5번째로 추가.

- **라벨**: "보스 추뎀"
- **값**: 현재 보너스 % (예: "44.5%")
- **색상**: `#c87020` (bossPhase1 — 보스 전용 주황색)
- **조건**: 해당 타워가 보스 보너스 대상일 때만 표시
- **강화 시**: 다음 레벨의 보스 보너스 %도 함께 표시 (기존 공격력 강화 미리보기와 동일 패턴)

## 수정 파일

| 파일 | 변경 내용 |
|------|---------|
| `packages/shared/src/constants/meta.ts` | `BOSS_BONUS_BASE` 상수, `getBossDamageBonus()` 함수 추가 |
| `packages/shared/src/types/tower.ts` | 필요 시 보스 보너스 관련 타입 추가 |
| `packages/phaser-game/src/systems/TowerSystem.ts` | 데미지 계산에 보스 보너스 적용 |
| `packages/web-shell/src/components/lobby/tabs/collection/TowerBottomSheet.tsx` | 보스 추뎀 StatDisplay 추가 |
| `docs/game-spec/02-balance-sheet.md` | 보스 추가 데미지 섹션 추가 |

## 검증 방법

1. **단위 테스트**: `getBossDamageBonus()` 함수 — 등급/레벨별 올바른 % 반환 확인
2. **전투 테스트**: TowerSystem 테스트에서 보스 타겟 시 추가 데미지 적용 확인
3. **UI 확인**: 타워 강화 화면에서 보스 추뎀 스탯 표시 확인 (브라우저)
4. **비대상 타워 확인**: splash 타워(plasma 등)에는 보스 추뎀이 표시되지 않는 것 확인

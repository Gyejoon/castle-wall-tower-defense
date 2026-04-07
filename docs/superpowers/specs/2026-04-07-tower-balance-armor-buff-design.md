# 타워 밸런스 패치 — armor 시스템 강화 + UI 인지 개선

> 코드에서 armor pierce = "방어 무시"로 통칭

## 배경

투석기(splash)가 궁수탑(단일)보다 우월해 궁수탑 사용 이유가 없는 문제.
CEO 리뷰(Claude + Codex 합의) 결과, 방어 무시 메커니즘이 이미 작동 중이나:
1. **적의 armor 수치가 너무 낮아** 체감 불가
2. **UI에서 방어 무시가 표시되지 않아** 인지 불가

기존 시스템을 활용하여 새 시스템 없이 밸런스를 개선한다.

## 기존 메커니즘 (이미 구현됨)

### armor pierce 규칙
- `TowerSystem.ts:275`: `const armorPierce = !special;`
- special이 없는 타워 → 방어 무시 (armor를 0으로 취급)
- special이 있는 타워(splash, slow 등) → armor 감산 적용

### 데미지 공식
- `UnitSystem.ts`: `damage = Math.max(1, rawDamage - armor)`
- armor pierce 시: `damage = Math.max(1, rawDamage - 0)` = rawDamage

### 방어 무시 대상 타워 (special 없는 공격형)
| Tier | ID | 이름 |
|------|-----|------|
| T1 | laser | 궁수 탑 |
| T2 | twin_laser | 쌍궁 탑 |
| T3 | flame_tower | 화염 탑 |
| T3 | wind_spire | 바람의 첨탑 |
| T3 | earth_golem | 대지 골렘 |
| T4 | arcane_spire | 비전 첨탑 |

**주의**: dragon_nest(T4), celestial(T5)는 splash라 방어 무시 없음 → 의도된 디자인 (웨이브 클리어 특화)

## 설계

### 1. 적 armor 수치 조정

**파일**: `packages/shared/src/constants/units.ts`

| 유닛 | 현재 armor | 변경 armor | 이유 |
|------|----------|----------|------|
| scout_drone | 0 | 0 | 변경 없음 (약한 적) |
| battle_robot | 2 | 5 | 초반부터 armor 체감 |
| heavy_walker | 5 | 12 | 중반 armor 체크 역할 |
| stealth_drone | 0 | 0 | 변경 없음 (속도형) |
| titan | 10 | 25 | 보스전 방어 무시 필수화 |

### 밸런스 검증 (Lv.1)

| 적 | armor | laser DPS (방어 무시) | plasma DPS (armor 적용) | 차이 |
|----|-------|---------------------|----------------------|------|
| scout_drone | 0 | 15.0 | 20.0 | splash +33% |
| battle_robot | 5 | 15.0 | 16.0 | 거의 동등 |
| heavy_walker | 12 | 15.0 | 10.4 | **laser +44%** |
| titan | 25 | 15.0 | **0.8** (min1) | **laser 19x** |

→ 약한 적: splash 유리 / 강한 적: 방어 무시 압도 = **전략적 선택 발생**

### Lv.20 스케일링 (armor ×5)
- titan armor: 25×5 = 125 → splash는 사실상 0 데미지
- heavy_walker armor: 12×5 = 60 → splash 피해 대폭 감소

### Lv.30 스케일링 (armor ×20)
- titan armor: 25×20 = 500 → splash 완전 무효
- 집중 공격형만 유효 → 고레벨에서 방어 무시 필수

### 2. 웨이브 구성 조정 (forest_gate만)

**파일**: `packages/shared/src/constants/waves.ts`

```
웨이브 3 (현재): battle_robot ×4, scout_drone ×4
웨이브 3 (변경): heavy_walker ×1, battle_robot ×3, scout_drone ×4
```

웨이브 3에서 처음으로 "이 적은 splash로 안 죽는다" 체험 유도.
lava_fortress, storm_citadel은 이미 heavy_walker가 초반에 등장하므로 변경 불필요.

### 3. 타워 강화 UI에 "방어 무시" 표시

**파일**: `packages/web-shell/src/components/lobby/tabs/collection/TowerBottomSheet.tsx`

- 기존 4개 StatDisplay (공격력, 공속, 사거리, 속성) 아래에 5번째 추가
- 조건: `!def.stats.special && def.stats.attackSpeed > 0` (방어 무시 대상 타워만)
- 라벨: "방어 무시"
- 값: "적용"
- 색상: `#a0a8b0` (메탈릭 실버 — 장갑/금속 연상. bossPhase1 #c87020과 충돌 방지)

`StatDisplay` 컴포넌트 재사용: `packages/web-shell/src/components/lobby/tabs/collection/StatDisplay.tsx`

## 수정 파일

| 파일 | 변경 내용 |
|------|---------|
| `packages/shared/src/constants/units.ts` | battle_robot(2→5), heavy_walker(5→12), titan(10→25) armor 상향 |
| `packages/shared/src/constants/waves.ts` | forest_gate 웨이브 3에 heavy_walker ×1 추가, battle_robot ×4→×3 |
| `packages/web-shell/src/components/lobby/tabs/collection/TowerBottomSheet.tsx` | "방어 무시" StatDisplay 추가 |
| `docs/game-spec/02-balance-sheet.md` | armor 수치 변경 + 방어 무시 메커니즘 문서화 |

## 검증 방법

1. `pnpm test` — 전체 테스트 통과 (armor 수치 변경 반영)
2. `pnpm dev` → 타워 강화 화면에서 "방어 무시" 표시 확인
   - splash 타워(plasma): 표시 없음
   - 집중 공격형(laser): "방어 무시 - 적용" 표시
3. 게임 플레이:
   - 웨이브 3 heavy_walker가 splash 타워에 오래 버티는지 확인
   - 웨이브 5 titan에서 집중형 vs splash DPS 차이 체감 확인

## 리뷰 이력

### CEO 리뷰 (Claude + Codex 합의)
- 원래 계획: 보스 추가 데미지 % 시스템 신규 추가
- 리뷰 결과: armor pierce가 이미 존재 → 새 시스템은 복잡도만 증가
- 수정: 기존 armor pierce를 살리는 방향 (armor 값 조정 + UI 인지)

### Design 리뷰
- 색상 #c87020 → #a0a8b0 (bossPhase1 충돌 방지)
- 라벨: "장갑 관통" → "방어 무시" (유저 피드백)
- 5번째 스탯 행: 320px에서 오버플로우 테스트 필요

### Eng 리뷰
- dragon_nest/celestial은 splash → 방어 무시 없음 → 의도된 디자인 (유저 확인)
- 웨이브 3 heavy_walker 1마리: 적절한 학습 포인트
- 기존 테스트 업데이트 필요 (armor 수치 변경)

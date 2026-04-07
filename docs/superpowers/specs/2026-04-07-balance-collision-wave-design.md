# 게임 밸런스 & 물리 충돌 & 웨이브 테마 설계

**Date**: 2026-04-07
**Branch**: lio/rain-pen
**Status**: Approved (autoplan reviewed)

---

## 1. 개요

4가지 문제를 해결하는 통합 설계:
1. 승급에 레벨 게이트 없음 → GDD 스펙대로 20/30/50 게이트 추가
2. 몬스터 겹침 → 1D path-based 물리 충돌 시스템 도입
3. CC 연쇄 없음 → 충돌 시스템의 자연스러운 부산물로 해결
4. 웨이브 단조로움 → 아키타입 테마별 웨이브 재구성

---

## 2. 승급 레벨 게이트

### 변경 사항

| 항목 | Before | After |
|------|--------|-------|
| MAX_TOWER_LEVEL | 30 | 50 |
| normal→rare 게이트 | 없음 | Lv.20 |
| rare→unique 게이트 | 없음 | Lv.30 |
| unique→epic 게이트 | 없음 | Lv.50 |

### 파일

- `packages/shared/src/constants/meta.ts` — PROMOTION_CONFIG에 `requiredLevel` 추가, MAX_TOWER_LEVEL 50
- `packages/web-shell/src/stores/meta/collectionSlice.ts` — `promoteTower()`에 레벨 체크, `'level_too_low'` 반환
- `packages/web-shell/src/components/lobby/tabs/collection/TowerBottomSheet.tsx` — UI 표시

### UI 스펙

레이아웃 순서 (TowerBottomSheet 승급 섹션):
1. 현재 등급 → 다음 등급
2. **레벨 진행도**: "Lv.14 / 20 — 6레벨 더 필요" (danger #c03020, Press Start 2P 10px)
3. 성공 확률
4. 골드 비용
5. 승급 버튼 (레벨 미달 시 비활성화)

접근성: 색상(#c03020) + 자물쇠 아이콘 이중 표시 (colorblind 대응)

### 상태 테이블

| 상태 | 조건 | UI |
|------|------|-----|
| idle | 레벨 충족 + 골드 충분 | 활성 버튼 |
| level_too_low | 레벨 미달 | 비활성 버튼 + 진행도 텍스트 + warning 토스트 |
| no_gold | 골드 부족 | 비활성 버튼 + 비용 빨간 표시 |
| promoting | 시도 중 | 롤 애니메이션 (기존) |
| success | 성공 | 등급 변경 + success 토스트 |
| fail | 실패 | fail 토스트 + 골드 차감 (기존) |

---

## 3. 물리 충돌 시스템

### 핵심 개념: 1D Path Collision

모든 유닛이 동일 경로(레인)를 따르므로 위치를 단일 스칼라 `pathProgress`로 표현.
충돌 판정이 2D → 1D로 축소되어 단순하고 성능 좋음.

```
pathProgress = pathIndex + (segment 내 fractional 비율)
예: pathIndex=2, 70% 진행 → pathProgress = 2.7
```

### 알고리즘 (O(n) amortized)

**데이터 구조: Lane-sorted arrays**
- `Map<laneIndex, UnitInstance[]>` pathProgress 내림차순 유지
- 스폰 시 배열 맨 뒤 push (pathProgress=0)
- 사망/exit 시 splice out
- 유닛은 앞으로만 이동 → 상대 순서 불변 → sort 불필요

**단일 sweep (사후 보정)**
- 프레임마다 레인별 배열을 front→back sweep
- `arr[i-1].pathProgress - arr[i].pathProgress < MIN_SEP`이면 뒤 유닛을 뒤로 밀기
- `setUnitPathProgress()`: 스칼라 → 월드 좌표 역변환

기존 Plan의 속도 클램핑(getFrontUnitInLane O(n²)) 제거.
sweep이 매 프레임 보정하므로 60fps에서 1프레임 겹침은 시각적으로 보이지 않음.

### 상수

```typescript
COLLISION_RADIUS = 0.4   // 타일
MIN_SEPARATION = 0.8     // 2 * COLLISION_RADIUS
SPAWN_BLOCK_TIMEOUT = 2000 // ms — 스폰 차단 최대 대기
```

### 스폰 차단

스폰 지점(pathProgress < MIN_SEPARATION)에 유닛이 있으면 스폰 연기.
**최대 2초 대기** 후 강제 스폰 (무한 대기 방지).

### 비행 유닛

- `UnitDef`에 `flying?: boolean` 필드 추가
- titan에 `flying: true` 설정
- 모든 충돌 로직에서 `flying: true`인 유닛 제외
- 비행 유닛은 다른 유닛을 통과하고, 다른 유닛도 비행 유닛을 무시

### 비주얼 가이드

- 정체 시 유닛은 **idle-walk 애니메이션 유지** (즉각 정지 금지)
- **부드러운 감속(lerp)** — 갑자기 멈추는 게 아니라 서서히 감속
- CC pile-up: 앞 유닛 스턴 → 뒤 유닛들이 차례로 감속하며 줄 서기

### CC 연쇄 (자연 발생)

물리 충돌의 부산물:
1. 앞 유닛 stun → pathProgress 고정
2. 뒤 유닛 속도 클램핑 → MIN_SEPARATION 거리에서 정지
3. 연쇄적으로 뒤 유닛들도 정체
4. 스턴 해제 → 앞 유닛 이동 재개 → 공간 생김 → 뒤 유닛 자연 이동

마법 타워의 가치가 급상승: stun 1기 = 경로 전체 정체 유발.

### 성능

O(n) amortized. ~30유닛 기준 프레임당 ~30 연산.
- getFrontUnitInLane O(n²) 제거 → lane-sorted array O(1) lookup
- 매 프레임 sort 제거 → 순서 불변 활용
- 단일 sweep O(k) per lane

### 파일

- `packages/shared/src/types/unit.ts` — `flying?: boolean` 추가
- `packages/shared/src/constants/units.ts` — titan에 `flying: true`
- `packages/phaser-game/src/systems/UnitSystem.ts` — pathProgress, 충돌 로직 전체

### `UnitSystem.update()` 수정 구조

```
update(time, delta):
  1. 스폰 로직 (기존 + 스폰 차단 + 2초 타임아웃)
  2. dt = delta / 1000
  3. 유닛별 이동 루프:
     - CC tick-down (기존)
     - 스턴 체크 (기존)
     - 속도 계산 (기존)
     - 위치 업데이트 (기존)
     - NEW: pathProgress 계산
  4. NEW: sweepCollisions() — lane-sorted array front→back sweep
  return { reachedExit }
```

---

## 4. 웨이브 테마 배치

### 설계 원칙

1. 웨이브마다 명확한 아키타입 테마 (speed rush, tank, mixed, boss)
2. 빠른 유닛 = 낮은 HP/armor, 느린 유닛 = 높은 HP/armor (보스 예외)
3. 다양한 타워 조합을 요구하여 덱 시스템 가치 상승
4. 맵별 정체성: forest=입문, lava=탱크, storm=스피드

### WAVE_SCALING (변경 없음)

```
Wave 1-2: 1.0× HP, 1.0× speed
Wave 3:   1.1× HP, 1.0× speed
Wave 4:   1.2× HP, 1.0× speed
Wave 5:   1.5× HP, 1.05× speed (BOSS)
Wave 6:   1.8× HP, 1.05× speed
Wave 7:   2.2× HP, 1.1× speed
Wave 8:   2.6× HP, 1.1× speed
Wave 9:   3.0× HP, 1.15× speed (pre_boss)
Wave 10:  3.5× HP, 1.15× speed (FINAL BOSS)
```

### forest_gate (입문)

| Wave | 테마 | Kind | 구성 | 의도 |
|------|------|------|------|------|
| 1 | Scout 소개 | normal | scout_drone ×4 | DPS 체크 |
| 2 | Speed Rush | normal | scout_drone ×8 | 물량 테스트 |
| 3 | Tank 소개 | normal | battle_robot ×3, heavy_walker ×1 | armor 소개 |
| 4 | 스텔스 정찰 | normal | stealth_drone ×4, scout_drone ×3 | 속도+회피 |
| 5 | 미니보스 | boss | titan ×1 | 단일 보스 체크 |
| 6 | Speed 러시 | normal | scout_drone ×6, stealth_drone ×3 | 보스 후 속도 러시 |
| 7 | 장갑 벽 | normal | heavy_walker ×3, battle_robot ×2 | 지속 딜+CC |
| 8 | 혼합 전술 | normal | scout×4, battle×3, stealth×2 | 덱 밸런스 |
| 9 | 최종 돌격 | pre_boss | heavy×3, battle×4, stealth×2 | 보스 전 시련 |
| 10 | Dragon's Fury | boss | titan ×1, heavy×2, battle×3 | 최종 전투 |

### lava_fortress (탱크 중심)

| Wave | 테마 | Kind | 구성 | 의도 |
|------|------|------|------|------|
| 1 | 정찰 | normal | scout_drone ×5 | 쉬운 오프닝 |
| 2 | 철갑 행군 | normal | battle×4, heavy×1 | 초반 탱크 |
| 3 | Speed 견제 | normal | scout×5, stealth×3 | 탱크 빌드 견제 |
| 4 | 장갑 종대 | normal | heavy×3, battle×3 | 본격 armor |
| 5 | 용암 수호자 | boss | titan ×1, heavy×2 | 보스+호위 |
| 6 | 그림자 타격 | normal | stealth×6, scout×4 | 보스 후 속도 |
| 7 | 강철 벽 | normal | heavy×4, battle×2 | 최강 armor |
| 8 | 혼돈 파도 | normal | scout×4, battle×3, heavy×2, stealth×3 | 전부 |
| 9 | 마그마 선봉 | pre_boss | heavy×4, battle×4, stealth×2 | 혼합 시련 |
| 10 | 분화 | boss | titan ×1, heavy×3, battle×4 | 탱크 호위 보스 |

### storm_citadel (스피드/스텔스 중심)

| Wave | 테마 | Kind | 구성 | 의도 |
|------|------|------|------|------|
| 1 | 바람 정찰 | normal | scout_drone ×6 | 대규모 스웜 |
| 2 | 번개 타격 | normal | stealth×5, scout×3 | 초반 스텔스 |
| 3 | 천둥 수비 | normal | battle×4, heavy×1 | 탱크 인터루드 |
| 4 | 질풍 | normal | scout×8, stealth×4 | 대규모 속도 |
| 5 | 폭풍 타이탄 | boss | titan ×2, stealth×3 | 듀얼 보스 |
| 6 | 유령 습격 | normal | stealth×7, scout×5 | 최대 스텔스 |
| 7 | 공성 파괴자 | normal | heavy×3, battle×4 | 탱크 반전 |
| 8 | 폭풍 | normal | scout×6, stealth×4, battle×3 | 속도+혼합 |
| 9 | 폭풍의 눈 | pre_boss | battle×5, heavy×3, stealth×4 | 전 아키타입 |
| 10 | 종말 | boss | titan ×2, heavy×3, battle×4, stealth×3 | 최종 결전 |

### 파일

- `packages/shared/src/constants/waves.ts` — WAVE_DEFS 3맵 교체

---

## 5. 테스트 계획

### 승급 게이트
- promoteTower returns 'level_too_low' when level < requiredLevel
- Boundary: Lv.19 → fail, Lv.20 → proceed to RNG
- 기존 승급 테스트 레벨 설정 업데이트

### 물리 충돌
- pathProgress 정확한 계산
- Speed clamping: 뒤 유닛이 앞 유닛 추월 불가
- resolveCollisions: 겹침 → MIN_SEPARATION으로 분리
- Flying 유닛(titan) 충돌 면제
- 스폰 차단 + 2초 타임아웃
- Empty lane no-op
- CC cascade: stun → pile-up → release

### 웨이브 구성
- 모든 unitId 유효, count > 0
- 맵당 10웨이브, boss at 5/10, pre_boss at 9

---

## 6. 검증

### 빌드
```bash
npx tsc --noEmit -p packages/shared
npx tsc --noEmit -p packages/phaser-game
npx tsc --noEmit -p packages/web-shell
```

### 테스트
```bash
npx vitest run packages/shared/tests/
npx vitest run packages/web-shell/src/stores/__tests__/
npx vitest run packages/phaser-game/tests/
```

### 수동
1. 로비 → 컬렉션 → 레벨 1 타워 승급 → "Lv.14/20 필요" 확인
2. 게임 → 웨이브 → 몬스터 겹침 없음 확인
3. CC → 앞 유닛 stun → 뒤 유닛 idle-walk 정체 확인
4. 보스 → 다른 유닛 통과 확인
5. 스폰존 CC 차단 → 2초 후 강제 스폰 확인

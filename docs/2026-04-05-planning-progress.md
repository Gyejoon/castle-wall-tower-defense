# 일반모드 게임 Planning 진행 상태

> Obsidian 원문: `towerDefense/ai/product/planning/일반모드 게임 planning.md`
> 이 문서는 repo에서 진행 상태를 추적하는 파생 문서.

---

## Phase 0: 기반 교정 — ✅ 완료 (2026-04-05 기준)

| 항목 | Planning 상태 | 실제 상태 | 비고 |
|------|-------------|----------|------|
| 에너지 시스템 구현 | ✅ | ✅ | `EnergySystem.ts`, 1/sec, cap 100 |
| 골드→에너지 전환 | ❌ 미구현 | ✅ **완료** | `TowerDef.cost`가 이미 에너지 기반 (10/20), gold 필드 없음 |
| 속성 필드 추가 (타워) | ❌ 미구현 | ✅ **완료** | `TowerDef.element: ElementType` 존재 |
| 적 속성 추가 | ❌ 미구현 | ✅ **완료** | `UnitDef.element` 존재 |
| 속성 상성 계산 | ❌ 미구현 | ✅ **완료** | `TowerSystem`에 `getElementMultiplier()` 적용 |
| 웨이브 10개 재정의 | ✅ | ✅ | `WAVE_DEFS` 10개 |
| PVP 잔재 정리 | ✅ | ✅ | 테스트 파일에 1건 흔적만 잔존 |

### Planning 문서 "완료" 목록 정정

| Planning 문서 기재 | 실제 | 비고 |
|------------------|------|------|
| `MergeSystem.ts` ✅ | ❌ **파일 없음** | 랜덤 롤/합성 → 덱 시스템으로 전환됨 |
| `RandomTowerSystem.ts` ✅ | ❌ **파일 없음** | 동일 |
| `TowerDragController` ✅ | ❌ **파일 없음** | 포인터 클릭 배치로 변경 |
| 12×8 그리드 ✅ | **8×18** 세로 모드 | 세로 모바일 레이아웃으로 변경 |

---

## Phase 1: 핵심 전투 완성 — 🔨 진행 예정

| 항목 | 상태 | 구현 계획 |
|------|------|----------|
| 4타워 덱 시스템 | ❌ 부분 (DEFAULT_DECK 고정) | Task 2-3 |
| 보스 행동 시스템 | ❌ (titan은 고HP 일반유닛) | Task 4-5 |
| 보스 경고 연출 | ❌ (toast만) | Task 6 |
| 보스 체력바 | ❌ | Task 6 |
| 결과 화면 | ⚠️ 기본 (통계 없음, 하드코딩 0G) | Task 7 |
| 적 스케일링 | ❌ | Task 1, 8 |

---

## Phase 2~5: 미착수

Phase 2 (메타 성장 루프), Phase 3 (콘텐츠 확장), Phase 4 (참여 시스템), Phase 5 (수익화) — 미착수.
단, Phase 3의 "멀티 스테이지" 중 맵 정의는 이미 3개 완료 (forest_gate, lava_fortress, storm_citadel).

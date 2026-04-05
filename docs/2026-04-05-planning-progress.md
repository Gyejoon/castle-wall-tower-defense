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

## Phase 1: 핵심 전투 완성 — ✅ 완료 (2026-04-05)

| 항목 | Planning 항목 | 실제 상태 | 구현 파일 |
|------|-------------|----------|----------|
| 4타워 덱 시스템 | 로비 덱 빌더 UI, DeckStore, 전투 씬에 덱 제한 적용 | ✅ **완료** | `DeckEditSheet.tsx`, `gameStore.ts` (selectedDeck + localStorage), `HomeTab.tsx` (프리뷰), `Game.ts` (buildDeckCards 연동) |
| 보스 행동 시스템 | titan 이동/공격/페이즈 전환, 호위 동반 스폰 | ✅ **완료** | `UnitSystem.ts` (2페이즈 전환, 무적 1s, phase2 속도 1.3x), `WaveSystem.ts` (isBoss/hpMultiplier), `boss.ts` (BOSS_CONFIG) |
| 보스 경고 연출 | WARNING 텍스트, 화면 어둡게 | ✅ **완료** | `GamePage.tsx` (WARNING 오버레이 1.5s + @keyframes pulse) |
| 보스 체력바 | 보스 전용 HP bar UI | ✅ **완료** | `BossHpBar.tsx` (phase 1 주황/phase 2 빨간+pulse, 이름+HP바+phase 표시) |
| 결과 화면 | 방어 성공/실패 + 골드 요약 + 재도전/로비 | ✅ **완료** | `GamePage.tsx` (wavesCleared/towersPlaced/timeSurvivedSec + goldEarned 골드 요약), `Game.ts` (bounty→goldEarned 누적) |
| 적 스케일링 | 스테이지 레벨 구간별 HP/armor/speed/bounty 배율 | ✅ **완료** | `scaling.ts` (scaleUnitStats + bountyMultiplier), `UnitSystem.ts` (setStageLevel + CC immunity + bounty 스케일링) |

### 추가 구현 (Planning 문서에 없지만 구현된 것)

| 항목 | 설명 |
|------|------|
| 덱 빌드 유틸 | `buildDeckCards()`, `towerToRole()` — 타워 ID → DeckCardDef 변환 |
| 보스 이벤트 | `boss-phase-change`, `boss-hp-update`, `boss-defeated` EventBus 이벤트 |
| 골드 추적 | 적 처치 bounty → goldEarned 누적, 결과 화면에 "획득 골드: {N}G" 표시 |
| bounty 스케일링 | GDD 6-2-1: LV.1-10 x1, LV.11-20 x3, LV.21-30 x8 bounty 배율 적용 |
| 웨이브 10 보스 HP x2 | `FINAL_BOSS_HP_MULTIPLIER = 2` 적용 |
| 보스 1샷 불사 방지 | phase 전환은 `hp > 0`일 때만 발생, 원킬 허용 |
| 보스 CC 틴트 보존 | slow/stun 해제 시 phase 2 빨간 틴트 유지 (`restoreUnitTint`) |
| CC 면역 테스트 가능 | `setRng()` 주입으로 `Math.random` 대체 |

### 테스트 커버리지

- shared: 76 tests PASS (scaling 6 + deckBuilder 8 + 기존 62)
- phaser-game: 127 tests PASS (boss phase 5 + CC immunity 3 + 기존 119)
- web-shell: GamePage 6 tests PASS
- QA 브라우저 테스트: 로비→덱편집→게임→패배→결과→로비 전체 플로우 통과, 콘솔 에러 0

---

## Phase 2: 메타 성장 루프 — 🔨 다음 단계

| 항목 | 상태 |
|------|------|
| 저장 시스템 (localStorage) | ❌ |
| 타워 컬렉션 관리 | ❌ (CollectionTab은 mock 데이터) |
| 타워 강화 (레벨업) | ❌ |
| 타워 승급 (등급 변환) | ❌ |
| 프로필 성장 (레벨, XP) | ❌ |
| 골드 경제 | ❌ |

## Phase 3~5: 미착수

- Phase 3 (콘텐츠 확장): 맵 정의 3개 완료, 스테이지 선택 UI 완료, 웨이브 구성/해금 조건 미구현
- Phase 4 (참여 시스템): 튜토리얼 기본 구현됨 (TutorialSystem.ts), 가챠 스켈레톤 존재 (GachaScreen.tsx)
- Phase 5 (수익화): 미착수

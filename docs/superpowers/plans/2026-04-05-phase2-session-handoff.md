# Phase 2 Meta Growth Loop — Session Handoff

> 이 문서는 Phase 2 구현 상태를 기록하는 컨텍스트 문서.

## 현재 상태

- **브랜치:** `feature/holistic-crowberry`
- **Phase 0-1:** 완료 검증됨 (209 tests passing)
- **Phase 2:** 구현 완료, QA 통과

### 완료된 작업

| Task | 상태 | 내용 |
|------|------|------|
| Task 0: GDD 정정 | **완료** | 20→10웨이브, 5→4속성, gold→energy, 12x8→8x18 정정. 커밋됨. |
| Task 1: Save Types & Meta Formulas | **완료** | `save.ts`, `meta.ts`, 테스트 12건. xpToNextLevel Lv10 기대값 705→955 수정. |
| Task 2: metaStore | **완료** | Zustand 영속 스토어, 500ms debounce, try/catch, flushSave (beforeunload/visibilitychange), save migration pipeline. 19 tests. |
| Task 3: 전투 종료 연동 | **완료** | GamePage onGameOver → addGold/addXp/recordBattle/updateHighestWave |
| Task 4: ProfileBar | **완료** | MOCK_PROFILE → useMetaStore, XP 프로그레스 바, gold counter tick-down (easeOutCubic 500ms) |
| Task 5: HomeTab | **완료** | MOCK_PROFILE → useMetaStore, PVP 잔재 제거 (승/패/승률/연승 스트립, AI연습/전적 버튼, 우편/공지 오버레이) |
| Task 6: 덱/설정 이관 | **완료** | gameStore → metaStore 위임, legacy deck migration |
| Task 7: CollectionTab | **완료** | 18 real towers, 실제 에셋 이미지 표시, 속성/특수 한글화 |
| Task 8: 타워 강화 UI | **완료** | cost + stat preview, enhanceTower reason string 반환 |
| Task 9: 타워 승급 UI | **완료** | roll animation (CSS keyframes), grade border colors |
| Task 10: 전투 effective stats | **완료** | TowerSystem collection 주입, getEffectiveStats 적용 |
| Task 11: Mock 삭제 | **완료** | mockLobbyData.ts 삭제, 테스트 업데이트 |
| QA | **완료** | 1건 발견(바텀시트 스탯 미갱신), 수정 후 95/100 |
| RAL Review | **통과** | 45/50 (Runtime 10, Spec 9, Test 10, IndReview 8, Adversarial 8) |

### 추가 구현 (리뷰 후)

| 항목 | 상태 | 내용 |
|------|------|------|
| Gold counter tick-down | **완료** | ProfileBar useAnimatedGold 훅 (rAF + easeOutCubic 500ms) |
| enhanceTower reason string | **완료** | boolean → 'success' \| 'max_level' \| 'no_gold' \| 'not_found' |
| Save migration pipeline | **완료** | SAVE_MIGRATIONS 레지스트리 + migrateSave 체인 |
| Quota exceeded 통보 | **완료** | gld-save-error CustomEvent + App.tsx toast 수신 |
| PhaserGame deps 수정 | **완료** | selectedDeck를 useMetaStore.getState()로 직접 읽기 |
| PVP 잔재 제거 | **완료** | 승패 스트립, AI연습/전적 버튼, 우편/공지, trophy 아이콘 |
| UI 텍스트 변경 | **완료** | PVE생존→성벽 막기, 즉시 시작→게임 시작, 속성/특수 한글화 |
| 폰트 크기 전역 +4px | **완료** | 모든 fontSize +4px, body 기본 17px |
| 실제 에셋 이미지 적용 | **완료** | CollectionTab, HomeTab 덱 프리뷰, DeckEditSheet 전부 tower asset 이미지 |
| 덱 편집 보유 타워만 표시 | **완료** | 미보유 타워 목록 제외, 꼬인 데이터 자동 필터링 |
| 덱 편집 전체화면 수정 | **완료** | 불투명 배경 + maxWidth 430px |
| DESIGN.md UX Writing | **완료** | 사용자 대면 텍스트 영어 금지 룰 추가 |

### 미완료 / Deferred

| 항목 | 사유 |
|------|------|
| Multi-tab save 충돌 | 모바일 단일 탭 사용이 표준, CEO 리뷰에서 deferred |
| Cloud save sync | Phase 4+ |
| Pity system | Phase 4+ |

## 커밋 이력

| SHA | 메시지 |
|-----|--------|
| 93c6129 | docs: align GDD with current implementation |
| 2f8d31e | feat: Phase 2 meta growth loop — save, enhance, promote, real data |
| 4181743 | fix(qa): ISSUE-001 — bottom sheet stats not updating after enhance |

## 핵심 파일 참조

| 파일 | 역할 |
|------|------|
| `packages/shared/src/types/save.ts` | SaveData 스키마, TowerGrade 타입 |
| `packages/shared/src/constants/meta.ts` | XP/강화/승급 공식, createDefaultSave |
| `packages/web-shell/src/stores/metaStore.ts` | Zustand 영속 스토어 + save migration + flush |
| `packages/web-shell/src/components/lobby/tabs/CollectionTab.tsx` | 18 real towers + 강화/승급 UI |
| `packages/web-shell/src/components/lobby/DeckEditSheet.tsx` | 보유 타워 기반 덱 편집 |
| `packages/web-shell/src/components/lobby/ProfileBar.tsx` | gold tick-down + XP bar |
| `packages/web-shell/src/components/lobby/tabs/HomeTab.tsx` | 성벽 막기 CTA |
| `packages/web-shell/src/pages/GamePage.tsx` | 전투 보상 적립 |
| `packages/phaser-game/src/systems/TowerSystem.ts` | effective stats 적용 |
| `DESIGN.md` | UX Writing 원칙 (영어 금지) |

# Phase 2 Meta Growth Loop — Session Handoff

> 이 문서는 다음 세션에서 Phase 2 구현을 이어가기 위한 컨텍스트 문서.

## 현재 상태

- **브랜치:** `feature/holistic-crowberry`
- **Phase 0-1:** 완료 검증됨 (209 tests passing)
- **Phase 2 계획:** 승인됨, `docs/superpowers/plans/2026-04-05-phase2-meta-growth-loop.md`

### 완료된 작업

| Task | 상태 | 내용 |
|------|------|------|
| Task 0: GDD 정정 | **완료** | 20→10웨이브, 5→4속성, gold→energy, 12x8→8x18 정정. 커밋됨. |

### 미완료 작업 (Task 1~11)

| Task | 상태 | 요약 |
|------|------|------|
| Task 1 | 미시작 | Save types + meta formulas (`save.ts`, `meta.ts`, tests) |
| Task 2 | 미시작 | metaStore (Zustand 영속 스토어, 500ms debounce, try/catch) |
| Task 3 | 미시작 | 전투 종료 → metaStore 골드/XP 적립 |
| Task 4 | 미시작 | ProfileBar → useMetaStore + XP 프로그레스 바 |
| Task 5 | 미시작 | HomeTab → useMetaStore |
| Task 6 | 미시작 | 덱/설정 영속화 metaStore 이관 |
| Task 7 | 미시작 | CollectionTab 전면 재작성 (18 real towers) |
| Task 8 | 미시작 | 타워 강화 UI + 골드 카운터 애니메이션 |
| Task 9 | 미시작 | 타워 승급 UI + 롤 애니메이션 |
| Task 10 | 미시작 | 전투 시 강화/승급 스탯 실적용 (TowerSystem) |
| Task 11 | 미시작 | Mock 삭제 + 최종 검증 |

## 다음 세션 시작 방법

```
이 계획 실행해줘: docs/superpowers/plans/2026-04-05-phase2-meta-growth-loop.md
Task 0은 완료됨. Task 1부터 시작.
```

또는 subagent-driven-development 사용:
```
/writing-plans
docs/superpowers/plans/2026-04-05-phase2-meta-growth-loop.md 실행. Task 0 완료, Task 1부터.
```

## 리뷰에서 나온 핵심 주의사항

### Codex CEO 리뷰 (전략적 경고)
1. **저장 != 리텐션** — 메타 시스템은 인프라일 뿐, 재플레이 동기는 Phase 3-4에서
2. **스탯 인플레 주의** — `getEffectiveStats` 배율 보수적 유지 (max 2.71x)
3. **경제 수치 미검증** — 구현 후 플레이테스트로 수치 조정 필수

### 엔지니어링 추가사항 (승인됨)
1. metaStore auto-save에 **500ms debounce** 적용
2. localStorage write에 **try/catch** (quota exceeded 대응)
3. ProfileBar에 **XP 프로그레스 바** 추가
4. collection을 Phaser scene에 **init data**로 전달 (registry 대신)
5. 승급 시 **롤 애니메이션** (1s 깜빡임 → 성공 펄스/실패 흔들림)
6. 강화 시 **골드 카운터 틱다운** (500ms easeOutCubic)

### 디자인 참고
- 등급 보더 색상: normal=기본, rare=#5bc8e8, unique=#9060e0, epic=#f0d060+glow
- XP 바: 3px 높이, gold 색상, 레벨 텍스트 아래
- 기존 디자인 시스템: `DESIGN.md`, tokens: `packages/web-shell/src/styles/tokens.ts`

## 핵심 파일 참조

| 파일 | 역할 |
|------|------|
| `packages/shared/src/constants/towers.ts` | 18타워 정의 (ALL_TOWERS) |
| `packages/shared/src/types/tower.ts` | TowerDef, ElementType 타입 |
| `packages/web-shell/src/stores/gameStore.ts` | 현재 Zustand 스토어 (덱 localStorage 포함) |
| `packages/web-shell/src/data/mockLobbyData.ts` | 삭제 대상 mock 데이터 |
| `packages/web-shell/src/pages/GamePage.tsx:94-106` | onGameOver 핸들러 (골드 적립 포인트) |
| `packages/web-shell/src/components/lobby/ProfileBar.tsx` | MOCK_PROFILE 사용 중 |
| `packages/web-shell/src/components/lobby/tabs/CollectionTab.tsx` | MOCK_TOWERS 사용 중 |
| `packages/web-shell/src/components/lobby/tabs/HomeTab.tsx` | MOCK_PROFILE 사용 중 |
| `packages/phaser-game/src/systems/TowerSystem.ts:59-99` | placeTower — level:1 하드코딩 |
| `packages/web-shell/src/App.tsx` | 앱 마운트 포인트 |

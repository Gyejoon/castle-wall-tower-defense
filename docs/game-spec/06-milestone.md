# MileStone

> **Last Updated:** 2026-04-20 (v3.1 — 정식 모드 안정화 4 버그 픽스)
> **Source:** 최초 전환 계획 `docs/superpowers/plans/2026-04-17-phase-a-sole-mode.md` (historical)
> 스프린트 완료 또는 계획 변경 시 이 문서를 업데이트한다.

상태 태그: ⬜ 예정 / 🔄 진행 중 / ✅ 완료 / ❌ 보류 / 📦 archived (구현됐지만 정식 모드 전환으로 비활성화)

---

## 출시 전 (Pre-Launch)

### Planning (현재 단계)

**현재 위치: 정식 모드 안정화(v3.1) ✅ — 5분 플레이 Go/No-Go 검증 대기**

2026-04-17부터 이전 프로토타입 트랙을 **게임의 유일한 정식 모드**로 승격. 시나리오 모드(W1~W3), 덱 편성, 월드맵, 임무/업적을 완전 제거하고 타워를 grade → family+tier 모델로 재설계. 인게임 가챠, 로그라이크 6 카드, 메타 루프 shell, BM 스텁(AdService + 이어서 하기), 9×18×64px 맵, HUD 전면 재설계, CC 가드레일까지 R1으로 포함. 2026-04-20 PR #175에서 4종 안정화 픽스 반영 (B1 리롤 차단 / B2 HP 정수 / B3 선형 스케일 / B4 고정 해상도). 2026-04-21 v4에서 코드 전반의 "Phase A" 식별자를 Core/Main/Game 네이밍으로 전면 치환.

#### 정식 모드 R1 트랙 (2026-04-17~)

구현 Phase 번호(1~12)는 2026-04-17 전환 계획 문서의 작업 단계 식별자이며, 현재 정식 모드의 서브-모드나 런타임 구분이 아님.

| Track | 이름 | 상태 | 비고 |
|-------|------|------|------|
| R0 | 스펙 v3 작성 (01-GDD / 02-balance / 06-milestone / 07-asset-definition) | ✅ | 2026-04-20 v3.1 업데이트 포함 |
| R1 | 시나리오 모드 제거 (월드/스테이지/덱/임무/업적/기믹) | ✅ | 계획 Phase 6 — WorldMapPage, StageSelectPage, DeckDock, MissionsTab 삭제 |
| R1 | 타워 family/tier 모델 (19종) + grade purge + plasma/dragon_nest 제거 | ✅ | 계획 Phase 1 — MergeSystem 재작성, Save v6→v7 마이그레이션 |
| R1 | MergeSystem v3 (same-family T1~T3, hybrid T4 pair, ultimate) | ✅ | 계획 Phase 2 |
| R1 | 에너지 v3 (kill/boss/fast-clear, ENERGY_MAX=200) + GameEventMap 확장 | ✅ | 계획 Phase 3 + 4.0 |
| R1 | 로그라이크 6 카드 + 보스 웨이브 트리거 + 광고 리롤 | ✅ | 계획 Phase 4 — dmg_up/crit_dmg/energy_harvest/energy_regen/effect_amp/tier_odds_up |
| R1 | 인게임 가챠 (T2/T3/T4) + 소환 큐 + cancel-no-reroll | ✅ | 계획 Phase 5 |
| R1 | 9×18×64px 맵 + 5 obstacles + dirt/grass platform 렌더링 + 톤다운 | ✅ | 계획 Phase 7 + PR #173 포팅 (Save v7→v8), v3.3에서 576×1152 정렬 |
| R1 | HUD 재설계 (하단 액션바 + TowerActionSheet + SummonRevealOverlay 코너 토스트 + PauseModal + @theme 토큰) | ✅ | 계획 Phase 8 + UX 개선 |
| R1 | **메타 루프 shell** — metaProgressStore (Zustand persist), TowerSystem.setGlobalModifiers, MetaForgePage | ✅ | 계획 Phase 9 — 사용자 결정으로 R1 포함 |
| R1 | **BM 스텁** — AdService interface + MockAdService + "이어서 하기" 1회 한정 + continue-run 파이프라인 | ✅ | 계획 Phase 10 — 사용자 결정으로 R1 포함 |
| R1 | hybrid/ultimate 플레이스홀더 에셋 + aura VFX + 합성 reveal punch | ✅ | 계획 Phase 11 |
| R1 | CC 가드레일 (ccResistance, MIN_MOVE_SPEED=0.15, 2s stun immunity) | ✅ | 계획 Phase 11 |
| R1 | Cinematic keyart 로비 (성 실루엣·달·횃불) + NEXT UP CTA 카드 | ✅ | PR 디자인 프로토타입 "Option C" 포팅 |
| R1 | 인게임 타워 강화 (GoldSystem + 골드 소비 Lv+1, L10 cap) | ✅ | Post-ship fix — 사용자 피드백 #4 |
| R1 | 공성 projectile VFX 회귀 fix + 타워 idle tween 복원 + 취소 꼼수 방지 | ✅ | Post-ship fix |
| R1 | **v3.1 안정화 4 버그 픽스 (PR #175)** — B1 풀·가챠 양쪽 재소환 리롤 차단 / B2 보스 HP 정수 guard (생존 시 min 1 clamp) / B3 선형 HP 스케일 (HP_SLOPE=0.55) / B4 Phaser Scale.NONE + 모바일 세로형 표준 레이아웃 (100dvh + max-w-[430px] + flex-col + safe-area-inset-top) | ✅ | 로컬 플레이테스트 회귀 커밋 |
| R1 | **모바일 5분 플레이 Go/No-Go 검증** | ⬜ | **핵심 게이트** |
| R2 | 타워 인게임 업그레이드 UX 확장 (골드 경제 밸런싱) | ⬜ | R1 통과 시 |
| R2 | 메타 퍽 선택 UX 구현 (퍽 카드 drop 조건 + 선택 UI) | ⬜ | R1 통과 시 |
| R2 | 맵 2~3 종 추가 (각각 다른 obstacle 패턴 + path shape) | ⬜ | R1 통과 시 |
| R2 | 사운드 + FTUE 튜토리얼 | ⬜ | 소프트 론치 전 |
| R3 | 실제 광고 SDK 연동 (MockAdService → 실 프로바이더) | ⬜ | 소프트 론치 후 |
| R3 | 다이아 경제 재진입 (시나리오 BM 요소 일부 재활용) | ⬜ | 소프트 론치 후 |
| R3 | 비동기 PVP seam (leaderboard / ghost replay / 주간 랭킹) | ⬜ | 실시간 PVP는 폐기 확정 |

**R1 No-Go 시 (모바일 5분 후 "한 판 더" 안 나옴)**: 장르 자체 재검토. Random TD 장르가 본인 게임에 안 맞는다는 결정을 해야 할 시점.

#### 구 시나리오 트랙 📦 archived (정식 모드 전환 시 제거됨)

정식 모드 승격에 따라 아래 시스템은 **전부 제거**됨. 참조용 기록만 남김. 아래 "Phase 0~5"는 archived된 구 시나리오 트랙의 단계 식별자.

| Phase | 이름 | 운명 |
|-------|------|---------|
| Phase 0 | 기반 교정 (에너지·속성·웨이브) | 📦 에너지 경제만 정식 모드 v3로 이전, 속성 상성 일부 유지 |
| Phase 1 | 핵심 전투 완성 (덱·보스·결과) | 📦 덱 제거, 보스·GameOverScreen은 정식 모드 v3로 재설계 |
| Phase 2 | 메타 성장 루프 (저장·강화·승급·컬렉션) | 📦 grade 승급 제거, 컬렉션은 전쟁탁자로 축소. 메타 shell이 일부 대체 |
| Phase 3 | 콘텐츠 확장 (W1~W3 24 스테이지) | 📦 전부 제거 — 스테이지/월드맵 삭제 |
| Phase 4 | 참여 시스템 (튜토리얼·가챠·미션) | 📦 튜토리얼·미션 제거, 다이아 가챠는 인게임 가챠와 별개로 보류 |
| Phase 5 | 수익화 & 운영 | 📦 BM 스텁이 일부 대체. 다이아/오퍼는 R3로 이연 |

---

### 단기 (1~4주, 2026-04~05)

#### 5분 Go/No-Go Gate 이후 할 일 (R1 말단)

| # | 항목 | 우선순위 | 상태 |
|---|------|---------|------|
| 1 | 모바일 실기기 5분 Go/No-Go 플레이 (핵심 게이트) | P0 | ⬜ |
| 2 | R1 수량 밸런싱 (ENERGY_MAX=200 + 킬 에너지 조합 실측) | P1 | ⬜ |
| 3 | 인게임 강화 골드 경제 밸런스 (bounty vs cost 곡선) | P1 | ⬜ |
| 4 | hybrid/ultimate 전용 아트 교체 (현재 T4 placeholder) | P2 | ⬜ |
| 5 | SFX 연결 (소환·합성·가챠 성공/실패·강화·보스킬·게임오버) | P2 | ⬜ |

#### 📦 Archived (구 시나리오 트랙에 있었으나 정식 모드 전환 시 제거)

- ~~시작 에너지 0 → 10~~ (v3: `ENERGY_INITIAL = 40`)
- ~~스테이지 선택 UI (월드맵→상세→게임)~~ (삭제)
- ~~사냥터별 골드/XP 차등~~ (단일 맵이라 N/A)
- ~~다이아몬드 경제 / 오퍼 카탈로그~~ (시나리오 BM 트랙은 R3로 이연)

---

### 중기 (1~3개월, 2026-05~07)

| 항목 | 내용 | 상태 |
|------|------|------|
| 텔레메트리 구현 | GDD §12-3 이벤트 맵 전체 | ⬜ |
| 게임 프리즈/메모리 누수 해결 | 실기기 프로파일링 | ⬜ |
| 에셋 전체 개선 (Batch 3~5) | 멀티 스테이지 타일셋, 가챠 UI | ⬜ |
| Supabase 서버 저장 동기화 | localStorage → 서버 동기화 | ⬜ |
| 시즌/이벤트 시스템 기반 | 시즌별 기록 리셋 구조 | ⬜ |
| 앱인토스 제출 준비 | 스토어 등록, 심사 대응 | ⬜ |
| **소프트 론치** | 제한된 유저 대상 출시 | ⬜ |

---

## 출시 후 (Post-Launch)

### 단기 (출시 후 1개월)

| 항목 | 내용 | 상태 |
|------|------|------|
| D1/D7 Retention 측정 | 목표치 설정 및 개선 | ⬜ |
| 핫픽스 대응 | Sentry 기반 크래시 즉시 대응 | ⬜ |
| 밸런스 긴급 패치 | 클리어율·이탈 구간 분석 후 수치 조정 | ⬜ |
| 첫 이벤트 웨이브 | 한정 적 구성 | ⬜ |

---

### 중기 (출시 후 3~6개월)

| 항목 | 내용 | 상태 |
|------|------|------|
| 신규 스테이지 1개 추가 | lava_fortress 또는 storm_citadel 완성 | ⬜ |
| 코스메틱 확장 | 로비 스킨 / 타워 스킨 추가 | ⬜ |
| 복귀 유저 케어 | 7일+ 미접속 복귀 보상 | ⬜ |
| 월간 성장 패스 | Subscription BM 테스트 | ⬜ |
| 출석 보상 강화 | 다이아 5~20/일 실제 지급 | ⬜ |

---

### 장기 (출시 후 6개월+)

| 항목 | 내용 | 상태 |
|------|------|------|
| 스테이지 3종 완비 | forest + lava + storm 모두 운영 | ⬜ |
| 시즌 콘텐츠 체계화 | 분기별 시즌, 시즌 한정 타워 | ⬜ |
| 도전 모드 | 고난도 웨이브 / 특수 조건 | ⬜ |
| 글로벌 확장 검토 | 다국어 지원 | ⬜ |
| AI Native 기능 | 개인화 난이도 조정, 배치 힌트 | ⬜ |

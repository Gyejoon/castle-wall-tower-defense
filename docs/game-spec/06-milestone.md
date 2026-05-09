# Milestone

> **Last Updated:** 2026-05-06 (v4.0 — minimal release roadmap)
> **Decision:** Unity 전환은 유지한다. 단, v1 출시는 최소 재미 검증과 낮은 유지보수를 우선한다.

상태 태그: 예정 / 진행 / 완료 / 보류

---

## 1. Current Position

현재 게임은 단일 정식 모드의 핵심 루프가 이미 있다.

완료된 핵심:

- 단일 맵 `main_long`
- `main_long` 중앙 성벽 콘셉트
- 20 wave / wave 5,10,15,20 boss arc
- 성벽 HP를 player HP로 쓰는 방어 목표
- 4속성 family 데이터
- 보스 후 checkpoint reward 선택으로 전환 예정
- 선택형 광고 stub
- localStorage 메타 shell
- Phaser 런타임
- Unity Phase 2 PoC

다음 목표는 기능 추가가 아니라 **스펙 감량 후 5분 Go/No-Go 검증**이다.

---

## 2. Pre-Launch R1: Minimal Fun Gate

| 항목 | 우선순위 | 상태 |
|------|----------|------|
| game-spec v4 최소 출시 스펙 정리 | P0 | 진행 |
| 모바일 5분 플레이 Go/No-Go | P0 | 예정 |
| Act 1~4 / wave 1~20 기준 난이도 튜닝 | P0 | 예정 |
| 성벽 수리/자동 공격 검증 | P0 | 예정 |
| 4속성 슬롯 등장/승급 검증 | P0 | 예정 |
| 사용자 스킬 2종(force move/freeze) 검증 | P0 | 예정 |
| checkpoint reward 3택/리롤 검증 | P0 | 예정 |
| 첫 보스 2~3분 도달 튜닝 | P0 | 예정 |
| 결과 화면 재시작 흐름 확인 | P1 | 예정 |
| 광고 없이 정상 진행 확인 | P1 | 예정 |
| 선택형 광고 stub UX 확인 | P1 | 예정 |
| 모바일 프리즈/메모리 smoke test | P1 | 예정 |

R1에서 하지 않는 것:

- 신규 맵
- 신규 상점
- 일일/주간 미션
- 외부 가챠/천장
- 서버 저장
- 시즌 이벤트
- PVP/랭킹

---

## 3. R2: Soft Launch Readiness

R1 Go 판정 이후에만 진행한다.

| 항목 | 우선순위 | 상태 |
|------|----------|------|
| FTUE 4단계 정리 | P0 | 예정 |
| 사운드 최소 연결 | P1 | 예정 |
| Sentry 또는 최소 오류 로깅 | P1 | 예정 |
| App In Toss 제출 준비 | P1 | 예정 |
| 실제 rewarded ad provider 연결 | P1 | 예정 |
| v1 build budget 확인 | P2 | 예정 |

---

## 4. Unity Track

Unity 전환은 별도 트랙으로 유지한다. Phaser v1 스펙보다 기능을 늘리지 않는다.

| 단계 | 목표 | 상태 |
|------|------|------|
| Unity Phase 2 PoC | 1 archer + wave-1 units + placement + HUD | 완료 |
| Shared data export 정리 | tower/unit/wave/map data를 Unity가 읽을 수 있게 유지 | 예정 |
| Minimal loop parity | 성벽, 4속성 슬롯, 웨이브, HP, energy 재현 | 진행 |
| Act checkpoint parity | wave 5/10/15/20 checkpoint reward 재현 | 예정 |
| Tactic parity | force move / freeze 스킬 재현 | 예정 |
| Migration decision | Phaser 대비 성능/유지보수 판단 | 예정 |

Unity 전환 중에도 신규 BM, 신규 맵, 신규 메타 시스템은 추가하지 않는다.

---

## 5. Post-Launch

출시 후에도 운영 부담이 낮은 순서로만 확장한다.

| 항목 | 조건 |
|------|------|
| 밸런스 패치 | final wave 분포가 목표와 크게 다를 때 |
| 광고 placement 조정 | opt-in이 너무 낮거나 게임 흐름을 방해할 때 |
| 신규 카드 1~2개 | 기존 카드가 충분히 이해된 뒤 |
| 코스메틱 | 핵심 loop가 유지되고 에셋 여력이 있을 때 |
| 신규 맵 | v1 retention이 확인된 뒤 |

---

## 6. Parking Lot

아래는 로드맵이 아니라 보류 목록이다.

- 다이아 경제
- 상자/천장
- 일일/주간 미션
- 출석 보상
- 서버 저장
- 랭킹
- ghost replay
- 시즌 이벤트
- 월간 패스
- 복귀 유저 보상
- 다국어
- AI 개인화

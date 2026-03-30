# Palace 개랜타디 — 게임 리디자인 스펙

## 1. 개요

"왕국의 방어선 (Grid Line Defense PvP)"을 **"팔라스 개인랜덤타워디펜스 (Palace 개랜타디)"**로 전면 리디자인한다.

**핵심 변환:**
- 고스트 배틀 비동기 PvP → 1:1 개인 랜덤 타워디펜스 (AI 상대)
- 세로형 20×20 그리드 → 가로형 12×8 아이소메트릭 2.5D 그리드
- 수동 타워 선택 → 랜덤 구매 + 드래그 합성
- 레퍼런스: 스타크래프트 개랜타디, Random Dice, Rush Royale

---

## 2. 게임 메카닉

### 2.1 랜덤 타워 구매
- 고정 비용 50G로 랜덤 타워 구매
- 구매 즉시 타워가 "현재 들고 있는 타워"로 설정 → 그리드 클릭으로 배치
- 가중치 확률:

| 티어 | 이름 | 확률 | 별 표시 |
|------|------|------|---------|
| T1 | Common | 60% | ★ |
| T2 | Rare | 25% | ★★ |
| T3 | Heroic | 10% | ★★★ |
| T4 | Legendary | 4% | ★★★★ |
| T5 | God | 1% | ★★★★★ |

- 천장 시스템: Common 5연속 시 다음 구매는 Rare+ 보장

### 2.2 합성(머지) 시스템
- **같은 ID의 타워** 2개를 드래그하여 합성 (예: 궁수 탑 + 궁수 탑, 티어도 동일해야 함)
- 결과: **다음 티어의 랜덤 타워** 1개 생성
- God 티어(T5)는 합성 불가 (최대 티어)
- 합성 시 원래 두 타워 제거, 새 타워가 드래그 대상 위치에 배치
- VFX: 합성 글로우 → 파티클 버스트 → 새 타워 등장

### 2.3 킬 트랜스퍼
- 내 필드에서 유닛 처치 시, 해당 유닛이 **상대 필드에 HP 50%로 스폰**
- 출구 도달 유닛은 전송되지 않음 (데미지만 줌)
- 전송된 유닛은 현재 웨이브 유닛과 함께 진행

### 2.4 웨이브 시스템
- 총 20웨이브
- 빌드 페이즈: 1웨이브 25초, 이후 15초
- 양쪽 동일 웨이브 타이머 공유
- 난이도 커브: Easy(1-5) → Medium(6-10) → Hard(11-15) → Very Hard(16-20)

### 2.5 승패 조건
- HP 0 → 패배 (상대 승리)
- 20웨이브 전부 생존 시: HP 많은 쪽 승리 (동점: 골드)

### 2.6 AI 상대
- 빌드 페이즈마다 골드가 허용하는 만큼 랜덤 타워 구매
- 유효 위치에 랜덤 배치
- 20% 확률로 합성 가능 시 합성 시도
- 가끔 랜덤 이모트 전송

---

## 3. 타워 정의

### 3.1 T1 Common (기존 4종 유지)

| ID | 이름 | 공격력 | 사거리 | 공속 | 특수 | 기존ID |
|----|------|--------|--------|------|------|--------|
| archer | 궁수 탑 | 10 | 3 | 1.5 | — | laser |
| catapult | 투석기 | 25 | 2 | 0.8 | splash | plasma |
| frost | 서리 마탑 | 5 | 4 | 1.0 | slow 30% | emp |
| paladin | 성기사 제단 | 0 | 2 | 0 | boost 20% | shield |

> 참고: 구현 시 기존 ID(laser, plasma, emp, shield)를 유지할지, 새 ID로 변경할지는 구현 단계에서 결정. 에셋 파일명도 함께 변경 필요.

### 3.2 T2 Rare (기존 fusion 5종 재분류)

| ID | 이름 | 공격력 | 사거리 | 공속 | 특수 |
|----|------|--------|--------|------|------|
| twin_archer | 쌍궁 탑 | 25 | 4 | 2.0 | — |
| blizzard | 눈보라 탑 | 15 | 5 | 1.2 | slow 50% splash |
| siege_cannon | 공성 대포 | 60 | 3 | 0.4 | aoe 2tile |
| guardian | 수호 탑 | 15 | 3 | 1.0 | boost 40% |
| glacier | 빙하 제단 | 0 | 3 | 0 | freeze 2s cd 8s |

### 3.3 T3 Heroic (신규 4종)

| ID | 이름 | 공격력 | 사거리 | 공속 | 특수 |
|----|------|--------|--------|------|------|
| flame_tower | 화염 탑 | 40 | 3 | 1.5 | burn 5dps 3s |
| wind_spire | 바람 첨탑 | 20 | 5 | 2.5 | chain 3targets |
| earth_golem | 대지 골렘 | 80 | 2 | 0.5 | stun 1s |
| holy_shrine | 신성 제단 | 0 | 3 | 0 | heal_tower 5hp/s |

### 3.4 T4 Legendary (신규 3종)

| ID | 이름 | 공격력 | 사거리 | 공속 | 특수 |
|----|------|--------|--------|------|------|
| dragon_nest | 드래곤 둥지 | 100 | 4 | 0.8 | splash + burn |
| arcane_spire | 마법 첨탑 | 50 | 6 | 1.5 | ignore_armor |
| world_tree | 세계수 | 30 | 4 | 1.0 | boost_all_30% |

### 3.5 T5 God (신규 2종)

| ID | 이름 | 공격력 | 사거리 | 공속 | 특수 |
|----|------|--------|--------|------|------|
| celestial | 천상의 탑 | 200 | 5 | 1.0 | splash + slow + burn |
| divine_throne | 신의 왕좌 | 0 | 전체 | 0 | boost_all_50% + heal_tower |

**총 18종 타워** (T1:4 + T2:5 + T3:4 + T4:3 + T5:2)

---

## 4. 유닛 (기존 5종 유지)

| ID | 이름 | HP | 속도 | 아머 | 바운티 | 특수 |
|----|------|-----|------|------|--------|------|
| scout_drone | 고블린 정찰병 | 30 | 3.0 | 0 | 5G | — |
| battle_robot | 오크 전사 | 80 | 1.5 | 2 | 12G | — |
| heavy_walker | 돌 트롤 | 200 | 0.8 | 5 | 25G | — |
| stealth_drone | 그림자 암살자 | 50 | 2.5 | 0 | 18G | invisible |
| titan | 고대 드래곤 | 500 | 0.5 | 10 | 60G | boss regen |

---

## 5. UI 구조

### 5.1 화면 레이아웃
- **풀스크린 내 필드** — 12×8 아이소메트릭 2.5D 그리드
- **탭 전환** (우상단):
  - 내 필드 (기본)
  - 상대 필드 (읽기 전용 + 킬 트랜스퍼 알림)
  - 합성 가이드 (티어 진행도)

### 5.2 HUD (캔버스 위 플로팅)
- 좌상단: WAVE n/20
- 중상단: 🪙 골드, ❤️ HP
- 우상단: BUILD 타이머 (빌드 페이즈 시)
- 좌상단 2행: NEXT 웨이브 프리뷰

### 5.3 하단 소환 패널
- 좌측: **소환 버튼** (🎲 50G) — 베벨/엠보싱 골드 버튼, 눌림 효과
- 중앙: **덱 슬롯 5개** — 구매한 미배치 타워 표시 (움푹 파인 슬롯)
- 우측: 채팅(💬) + 이모트(😊) 버튼

### 5.4 비주얼 스타일
- 나무/돌 텍스처 그라데이션 패널 (flat CSS 금지)
- 골드 트림 테두리, 베벨 버튼
- 모든 텍스트에 1-2px 검정 아웃라인
- Press Start 2P 픽셀 폰트
- 색상: 어두운 나무 갈색(#1a0e06~#3a2a18), 에이징 골드(#d4a843), 크림(#f0e6d0)

---

## 6. 2.5D 아이소메트릭 맵

### 6.1 그리드
- 12열 × 8행 다이아몬드 타일
- 타일 크기: 48×24px (반 높이 아이소메트릭) + 깊이 12px
- 3면 렌더링: 상면(잔디/흙), 좌면(어둡게), 우면(더 어둡게)

### 6.2 경로
- 스폰: (0, 4) 좌측 → 출구: (11, 4) 우측
- A* 패스파인딩, 흙 타일로 경로 표시
- 점선 오버레이 + 스폰/출구 마커

### 6.3 타워 렌더링
- 아이소메트릭 기단 (다이아몬드)
- 성벽 본체 + 돌 줄무늬 + 창문
- 뾰족한 지붕 + 깃발
- 티어별 글로우, 별표, 크기 차등
- 그림자 + 지면 글로우

### 6.4 장식
- 그리드 외곽 나무
- 잔디 터프트 랜덤 배치
- 비네팅 (화면 가장자리 어둡게)

---

## 7. 소셜 기능

### 7.1 퀵 이모트 (6종)
- "좋아요! 💪", "으악! 😱", "GG 😎", "ㅋㅋ 👍", "기다려! ✋", "와... 🤩"
- 선택 시 내 필드 위에 말풍선으로 플로팅 (4초 후 페이드)
- AI 상대도 가끔 랜덤 이모트 전송

### 7.2 채팅
- 텍스트 입력 → 말풍선 표시
- AI 모드에서는 비활성 (이모트만)

---

## 8. 이벤트 버스 변경

### 제거
- `pressure-choice-made`, `ghost-pressure-applied`, `ghost-battle-result`
- `request-pressure-choice`, `start-ghost-battle`

### 추가
- `request-buy-random-tower`: undefined
- `random-tower-rolled`: { towerDef: TowerDef }
- `tower-merge-started`: { fromPos: Position, toPos: Position }
- `tower-merged`: { fromPos: Position, toPos: Position, newTowerDef: TowerDef }
- `tower-merge-failed`: { reason: string }
- `kill-transfer`: { unitDef: UnitDef, toPlayer: string }
- `send-emote`: { emoteId: string }
- `emote-received`: { emoteId: string, playerId: string }

---

## 9. 코드 변경 요약

### 삭제 (7 파일)
- `GhostRecorder.ts`, `GhostPlayer.ts`, `PressureSystem.ts`
- `fetchRandomGhost.ts`, `PressurePanel.tsx`, `MatchSummary.tsx`
- `ghost.ts` (타입)

### 수정 (핵심 10+ 파일)
- `grid.ts` — 12×8 그리드 상수
- `towers.ts` — 18종 타워 (5티어)
- `waves.ts` — 20웨이브 정의
- `config.ts` — 가로형 캔버스 크기
- `Game.ts` — 듀얼 그리드, 랜덤/합성/킬트랜스퍼 연동
- `EventBus.ts` — 이벤트 타입 교체
- `GridManager.ts` — offsetX 지원
- `TowerSystem.ts` — 합성 메서드
- `gameStore.ts` — 고스트 state 제거, 새 state 추가
- `GamePage.tsx` — 탭 레이아웃, 소환 패널
- `LobbyPage.tsx` — 리네이밍 + 리디자인

### 신규 (5 파일)
- `RandomTowerSystem.ts`
- `MergeSystem.ts`
- `KillTransferSystem.ts`
- `AIOpponent.ts`
- `EmotePanel.tsx`

### 에셋 생성 확장
- `generate-towers.ts` — T3~T5 타워 스프라이트 추가
- `generate-tiles.ts` — 2.5D 아이소메트릭 타일

---

## 10. 기술 리스크

| 리스크 | 완화 |
|--------|------|
| 듀얼 GridManager 좌표 변환 | offsetX 유닛 테스트 |
| 모바일 드래그 합성 UX | Phaser 내장 드래그 이벤트 활용 |
| 랜덤 불공정 | 천장 시스템 (5연속 Common 후 Rare+ 보장) |
| 12×8 그리드가 좁을 수 있음 | 테스트 후 14×9로 확장 가능 |

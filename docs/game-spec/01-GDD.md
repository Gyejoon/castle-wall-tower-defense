# Game Design Document (GDD)

> **Last Updated:** 2026-04-07  
> **Source:** Obsidian `ai/product/specs/일반모드 게임 설계 문서.md`  
> 수치 변경은 [02-balance-sheet.md](./02-balance-sheet.md) 참조. BM은 [03-business-model.md](./03-business-model.md) 참조.

---

## 1. Game Definition

### 한 줄 정의

> 모바일 세로형 Tower Defense + RPG. 4개 타워를 에너지 관리하며 배치해 10웨이브 + 보스 2회를 버티고, 전투 보상으로 컬렉션과 성장을 확장한다.

### 기본 정보

| 항목 | 내용 |
|------|------|
| Title | 영웅 |
| Genre | 세로형 Tower Defense + RPG |
| Platform | Mobile Web (App In Toss) |
| Player Count | Single |
| Camera/View | Top-down / Portrait Single Field |
| Input | Touch / Drag |
| Session Length | 5~7분 |
| Core Fantasy | 성문을 지키는 지휘관 — 타워 배치 → 끝까지 생존 |
| Core Fun | 배치 전략, 에너지 관리, 4타워 운영, 웨이브 대응, 성장 보상 |
| Win Condition | 10웨이브 생존 / 최종 보스(웨이브 10) 돌파 / 기지 방어 성공 |
| Lose Condition | 기지 HP 0 |

---

## 2. User Frame

| 항목 | 내용 |
|------|------|
| 타깃 유저 | 짧은 세션 캐주얼 TD + 타워 수집/성장을 함께 원하는 유저 |
| 숙련도 | 캐주얼~미드코어 |
| 기대 감정 | 시원함, 긴장감, 전략적 만족감, 수집 성취감 |
| 첫 세션 목표 | 10초 내 "즉시 시작 → 배치 → 방어" 이해, 5분 내 첫 보스 경험 |
| 재방문 이유 | 새로운 배치 판단 + 골드/컬렉션/레벨 성장 + 더 높은 웨이브 돌파 |

---

## 3. Core Loop / Meta Loop

**Core Loop**
```
로비 진입 → 즉시 시작 → 에너지 축적 → 4타워 중 선택 배치 → 웨이브/보스 대응 → 전투 결과 → 보상 획득
```

**Meta Loop**
```
플레이 → 골드/보상 획득 → 타워 강화 → 프로필 성장 → 더 어려운 스테이지/웨이브 도전
```

---

## 4. Core Systems

| 시스템 | 정의 | 핵심 파라미터 |
|--------|------|-------------|
| Combat | 타워 자동 공격 + 적 고정 경로 이동 실시간 방어 | damage, armor, attackSpeed, target priority |
| Movement | 적은 spawn→exit 세로 레인 이동, 드래그로 배치 | speed, path rules, blocked path prevention |
| Placement | 에너지 소비해 4타워 카드 중 1개 선택 → buildable tile 배치 | 에너지 1/sec 자동 축적, 공격형 10 / CC형 20 |
| Element | 화/수/번개/무 속성 상성으로 데미지 배율 적용 | element_type, matchup_multiplier (0.7x/1.0x/1.3x) |
| Gacha/Box | 상자에서 히든 타워 획득 (무료/광고/다이아) | box_type, cost, rate_table, pity(50회) |
| Upgrade | 골드 소비 레벨업 + 등급 승급 (확률 기반) | level, grade, stat growth |
| Boss/Encounter | 웨이브 5, 10에 보스 등장 — 세션 피크 | boss timing, warning telegraph, phase, reward |

---

## 5. Content Plan

| 분류 | 수량 | 해금 조건 |
|------|------|---------|
| 타워 | 18종 × 5티어 | 기본 풀 + 가챠 획득 |
| 적 유형 | 5종 (scout, warrior, troll, assassin, titan) | 기본 제공 |
| 보스 | titan (2페이즈) | 웨이브 5, 10 도달 |
| 스테이지 | 3개 (forest_gate, lava_fortress, storm_citadel) | 기본 / LV.3 / LV.7 |
| 웨이브 | 10웨이브 구조 (보스 2회) | — |

---

## 6. Balance (요약)

> 상세 수치는 [02-balance-sheet.md](./02-balance-sheet.md) 참조.

### 타워 18종 (역할군별)

| 역할군 | 에너지 비용 | 특성 | 패시브 |
|--------|----------|------|-------|
| 집중 공격형 | 10 | 단일 타겟 고데미지 | armor pierce |
| 다중 공격형 | 10 | splash 50% | — |
| 슬로우 | 20 | 쿨타임 기반, 중복 불가 | — |
| 스턴 | 20 | 쿨타임 기반, 중복 불가 | — |

### 타워 전체 목록

| id | name | tier | element | role |
|----|------|------|---------|------|
| laser | 궁수 탑 | 1 | 무 | 집중 공격형 |
| plasma | 투석기 | 1 | 무 | 다중 공격형 |
| emp | 서리 마탑 | 1 | 수 | 슬로우 |
| shield | 성기사 제단 | 1 | 무 | 스턴 |
| twin_laser | 쌍궁 탑 | 2 | 무 | 집중 공격형 |
| disruptor | 눈보라 탑 | 2 | 수 | 슬로우 |
| nova_cannon | 공성 대포 | 2 | 화 | 다중 공격형 |
| fortress | 수호 탑 | 2 | 무 | 스턴 |
| stasis_field | 빙하 제단 | 3 | 수 | 슬로우 |
| flame_tower | 화염 탑 | 3 | 화 | 집중 공격형 |
| wind_spire | 바람의 첨탑 | 3 | 번개 | 다중 공격형 |
| earth_golem | 대지 골렘 | 3 | 무 | 집중 공격형 |
| holy_shrine | 신성 제단 | 4 | 무 | 스턴 |
| dragon_nest | 용의 둥지 | 4 | 화 | 다중 공격형 |
| arcane_spire | 비전 첨탑 | 4 | 번개 | 집중 공격형 |
| world_tree | 세계수 | 4 | 무 | 슬로우 |
| celestial | 천상의 탑 | 5 | 번개 | 다중 공격형 |
| divine_throne | 신의 옥좌 | 5 | 무 | 스턴 |

### 속성 상성표

| 공격 \ 방어 | 화 | 수 | 번개 | 무 |
|------------|----|----|------|-----|
| 화 | 1.0x | 0.7x | 1.3x | 1.0x |
| 수 | 1.3x | 1.0x | 0.7x | 1.0x |
| 번개 | 0.7x | 1.3x | 1.0x | 1.0x |
| 무 | 1.0x | 1.0x | 1.0x | 1.0x |

### 적 5종

| id | name | element | hp | speed | armor | bounty |
|----|------|---------|-----|-------|-------|--------|
| scout_drone | 고블린 정찰병 | 무 | 30 | 3.0 | 0 | 5 |
| battle_robot | 오크 전사 | 무 | 80 | 1.5 | 2 | 12 |
| heavy_walker | 돌 트롤 | 화 | 200 | 0.8 | 5 | 25 |
| stealth_drone | 그림자 암살자 | 번개 | 50 | 2.5 | 0 | 18 |
| titan | 고대 드래곤 | 화 | 500 | 0.5 | 10 | 60 |

### 웨이브 구성 (forest_gate)

| wave | 구성 | 골드 보상 |
|------|------|---------|
| 1 | scout_drone × 6 | 30 |
| 2 | scout_drone × 6 + battle_robot × 2 | 50 |
| 3 | battle_robot × 4 + scout_drone × 4 | 70 |
| 4 | battle_robot × 4 + stealth_drone × 3 | 90 |
| **5** | **titan × 1 + battle_robot × 3** | **150** |
| 6 | heavy_walker × 3 + stealth_drone × 4 | 100 |
| 7 | battle_robot × 4 + heavy_walker × 2 + scout_drone × 4 | 120 |
| 8 | stealth_drone × 6 + heavy_walker × 3 | 130 |
| 9 | heavy_walker × 4 + battle_robot × 4 + stealth_drone × 4 | 150 |
| **10** | **titan × 1 + heavy_walker × 3 + stealth_drone × 4** | **250 + 클리어 보너스** |

---

## 7. Level Design

| 항목 | 내용 |
|------|------|
| Objective | 성문이 무너지기 전에 10웨이브 + 보스 2회 생존 |
| Map Structure | 세로형 단일 필드 / 고정 레인 / buildable tile 분리 |
| Danger Points | 고속 러시, 고장갑 탱커, 보스 웨이브(5, 10) |
| Difficulty Spike | 웨이브 5 (1차 보스), 웨이브 8~9 (고밀도), 웨이브 10 (최종 보스) |
| Checkpoint | 없음 — 실패 시 즉시 재도전 또는 로비 복귀 |

### 보스 연출 시퀀스

| 타이밍 | 연출 |
|--------|------|
| 웨이브 4 클리어 직후 | "WARNING" 1.5초 + 배경 어두워짐 |
| 웨이브 5 보스 스폰 | 등장 연출 + 화면 흔들림 + BGM 전환 |
| 웨이브 5 보스 처치 | 골드 팝업 + "BOSS CLEAR" |
| 웨이브 9 클리어 직후 | "FINAL BOSS" + 화면 붉은 전환 |
| 웨이브 10 보스 스폰 | 강화 보스 + 호위 동시 스폰 + 흔들림 |
| 최종 클리어 | 슬로모션 + "STAGE CLEAR" + 보상 팝업 |

---

## 8. UI / UX

### UI 구조

- **HUD**: HP, Gold, 웨이브 카운터, 보스 경고, 결과 오버레이
- **ProfileBar** (로비 상단): 아바타/닉네임/Lv, XP 바, 골드 잔액, 다이아 잔액
- **Lobby**: Home 탭 (즉시 시작 CTA), Collection 탭, Settings 탭
- **Deck/Build Panel**: 보유 타워 컬렉션, 4개 카드 선택 → 에너지 배치
- **Result Screen**: 방어 성공/실패, 재도전, 로비 복귀
- **Tutorial Overlay**: 첫 세션 5단계 (step 1~2만 강제)

### 튜토리얼 시퀀스

| step | trigger | 플레이어 액션 | 완료 조건 |
|------|---------|------------|---------|
| 1 | 첫 게임 시작 | 타워 카드 탭 | 타워 선택 |
| 2 | 타워 선택 직후 | 타일에 드래그 배치 | 첫 배치 완료 |
| 3 | 배치 완료 | 없음 (자동 진행) | 웨이브 1 시작 |
| 4 | 웨이브 1 중 처치 | 추가 배치 | 두 번째 타워 배치 |
| 5 | 웨이브 3 도달 | — | 자동 해제 |

---

## 9. Settings Matrix

| setting_key | default | range/options | saved_to |
|-------------|---------|---------------|---------|
| bgm_volume | 0.7 | 0~1 | localStorage |
| sfx_volume | 0.8 | 0~1 | localStorage |
| screen_shake | on | on/off | localStorage |
| colorblind_mode | off | off/protan/deutan/tritan | localStorage |
| damage_numbers | on | on/off | localStorage |

---

## 10. 게임 정체성 (Edge Point)

> 이 게임은 일반적인 모바일 TD와 달리 세로형 single-field + 즉시 시작 + 10웨이브 밀도 높은 생존 구조와 4개 고정 타워의 에너지 관리 + 메타 컬렉션 확장 루프 때문에 5~7분의 짧은 세션에서 긴장감과 성장 성취를 동시에 강하게 느낀다.

**점검 질문**
- 이 게임을 한 문장으로 기억하게 만드는 포인트가 있는가?
- 첫 5분 안에 차별점이 체감되는가?
- 경쟁작 대비 버릴 수 없는 특징이 있는가?

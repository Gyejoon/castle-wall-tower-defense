# Game Design Document (GDD)

> **Last Updated:** 2026-04-08  
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
| Lose Condition | 기지 HP 0 또는 보스 leak (보스가 경로 끝 도달 시 즉시 패배) |

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
로비 진입 → 성벽 막기 → 월드맵(스테이지 선택) → 스테이지 상세(덱 확인) → 게임 시작 → 에너지 축적 → 4타워 중 선택 배치 → 웨이브/보스 대응 → 전투 결과 → 보상 획득
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
| Tower Sell | 배치된 타워 탭 → 판매 패널 → 에너지 50% 환급 | `TowerSystem.calcRefund()` 단일 출처 |
| Element | 화/수/번개/무 속성 상성으로 데미지 배율 적용 | element_type, matchup_multiplier (0.7x/1.0x/1.3x) |
| Gacha/Box | 상자에서 히든 타워 획득 (무료/광고/다이아) | box_type, cost, rate_table, pity(50회) |
| Upgrade | 골드 소비 레벨업 + 등급 승급 (확률 기반) | level, grade, stat growth |
| Boss/Encounter | 웨이브 5, 10에 보스 등장 — 세션 피크 | boss timing, warning telegraph, phase, reward |
| GimmickSystem | 월드별 고유 기믹 처리 (용광로 폭발, 마력 폭주, 묘지 부활, 역병 확산, 마왕의 시련). 타일 상태 변경 → 타워 비활성화/버프. ★ 등급에 따라 기믹 강도 차등 | gimmick_id, active_tiles, intensity_by_star |

---

## 5. Content Plan

| 분류 | 수량 | 해금 조건 |
|------|------|---------|
| 타워 | 18종 × 5티어 | 기본 풀 + 가챠 획득 |
| 적 유형 | 5종 (scout, warrior, troll, assassin, titan) | 기본 제공 |
| 보스 | titan (2페이즈) | 웨이브 5, 10 도달 |
| 스테이지 | 3개 (forest_gate, lava_fortress, storm_citadel) | 기본 / LV.3 / LV.7 |
| 웨이브 | 10웨이브 구조 (보스 2회) | — |

### ★ 별 등급 시스템 (M1)
- 각 스테이지에 ★1(정복)/★2(정예)/★3(지옥) 3단계 난이도
- ★1: 기본 1.0×, 생존 조건
- ★2: HP 2.5×, 방어 1.5×, 속도 1.2×, CC 저항 20%, HP 50%+ 유지
- ★3: HP 5.0×, 방어 2.5×, 속도 1.4×, CC 저항 40%, HP 80%+ 유지

### 콘텐츠 확장 로드맵
- M1: 기존 3스테이지 × ★3 = 9 클리어 목표 (현재)
- M2+: 6월드 × 8스테이지 = 48스테이지 × ★3 = 144 클리어 목표 (향후)
- 적 타입: 기존 5종 + 월드별 신규 (M2+에서 순차 추가)

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

| id | name | element | hp | speed | armor | bounty | 특성 |
|----|------|---------|-----|-------|-------|--------|------|
| scout_drone | 고블린 정찰병 | 무 | 30 | 3.0 | 0 | 5 | — |
| battle_robot | 오크 전사 | 무 | 80 | 1.5 | 2 | 12 | — |
| heavy_walker | 돌 트롤 | 화 | 200 | 0.8 | 5 | 25 | — |
| stealth_drone | 그림자 암살자 | 번개 | 50 | 2.5 | 0 | 18 | — |
| titan | 고대 드래곤 | 화 | 500 | 0.5 | 10 | 60 | **비행** (충돌 면제) |

> titan은 `flying: true`로 지상 물리 충돌에서 면제. 다른 유닛을 통과하여 이동.

### 물리 충돌 시스템

지상 유닛은 서로 겹칠 수 없다. 1D 경로 기반 충돌로 자연스러운 줄 서기와 CC 연쇄가 발생한다.

| 항목 | 값 |
|------|-----|
| MIN_SEPARATION | 0.8 타일 |
| 알고리즘 | Lane-sorted array + front→back sweep (O(n) amortized) |
| 비행 면제 | `flying: true` 유닛은 충돌 무시 (titan) |
| 스폰 차단 | 스폰 지점에 2+ 유닛 정체 시 스폰 연기, 최대 2초 후 강제 스폰 |
| CC 연쇄 | 앞 유닛 stun/slow 시 뒤 유닛이 물리적으로 정체 (별도 CC 전파 없음) |
| 감속 방식 | lerp 0.3 — 부드러운 감속, 즉각 정지 없음 |

> 코드: `packages/phaser-game/src/systems/UnitSystem.ts` (sweepCollisions, setUnitPathProgress)

### 웨이브 구성 — 아키타입 테마 배치

각 맵은 고유 테마가 있으며, 웨이브마다 명확한 아키타입(속도/탱크/혼합/보스)을 배치한다.

#### forest_gate (입문 — 아키타입 학습)

| wave | kind | 테마 | 구성 | 의도 |
|------|------|------|------|------|
| 1 | normal | Scout 소개 | scout_drone × 4 | DPS 체크 |
| 2 | normal | Speed Rush | scout_drone × 8 | 물량 테스트 |
| 3 | normal | Tank 소개 | heavy_walker ×1 + battle_robot ×3 + scout_drone ×4 | armor 소개 |
| 4 | normal | 스텔스 정찰 | stealth_drone ×4 + scout_drone ×3 | 속도+회피 |
| **5** | **boss** | 미니보스 | **titan × 1** | 단일 보스 체크 |
| 6 | normal | Speed 러시 | scout_drone ×6 + stealth_drone ×3 | 보스 후 속도 러시 |
| 7 | normal | 장갑 벽 | heavy_walker ×3 + battle_robot ×2 | 지속 딜+CC |
| 8 | normal | 혼합 전술 | scout_drone ×4 + battle_robot ×3 + stealth_drone ×2 | 덱 밸런스 |
| 9 | pre_boss | 최종 돌격 | heavy_walker ×3 + battle_robot ×4 + stealth_drone ×2 | 보스 전 시련 |
| **10** | **boss** | Dragon's Fury | **titan ×1 + heavy_walker ×2 + battle_robot ×3** | 최종 전투 |

#### lava_fortress (탱크 중심 — 지속 딜/CC 필요)

| wave | kind | 테마 | 구성 |
|------|------|------|------|
| 1 | normal | 정찰 | scout_drone ×5 |
| 2 | normal | 철갑 행군 | battle_robot ×4 + heavy_walker ×1 |
| 3 | normal | Speed 견제 | scout_drone ×5 + stealth_drone ×3 |
| 4 | normal | 장갑 종대 | heavy_walker ×3 + battle_robot ×3 |
| **5** | **boss** | 용암 수호자 | **titan ×1 + heavy_walker ×2** |
| 6 | normal | 그림자 타격 | stealth_drone ×6 + scout_drone ×4 |
| 7 | normal | 강철 벽 | heavy_walker ×4 + battle_robot ×2 |
| 8 | normal | 혼돈 파도 | scout ×4 + battle ×3 + heavy ×2 + stealth ×3 |
| 9 | pre_boss | 마그마 선봉 | heavy_walker ×4 + battle_robot ×4 + stealth_drone ×2 |
| **10** | **boss** | 분화 | **titan ×1 + heavy_walker ×3 + battle_robot ×4** |

#### storm_citadel (스피드/스텔스 중심 — 빠른 타게팅 필요)

| wave | kind | 테마 | 구성 |
|------|------|------|------|
| 1 | normal | 바람 정찰 | scout_drone ×6 |
| 2 | normal | 번개 타격 | stealth_drone ×5 + scout_drone ×3 |
| 3 | normal | 천둥 수비 | battle_robot ×4 + heavy_walker ×1 |
| 4 | normal | 질풍 | scout_drone ×8 + stealth_drone ×4 |
| **5** | **boss** | 폭풍 타이탄 | **titan ×2 + stealth_drone ×3** |
| 6 | normal | 유령 습격 | stealth_drone ×7 + scout_drone ×5 |
| 7 | normal | 공성 파괴자 | heavy_walker ×3 + battle_robot ×4 |
| 8 | normal | 폭풍 | scout ×6 + stealth ×4 + battle ×3 |
| 9 | pre_boss | 폭풍의 눈 | battle ×5 + heavy ×3 + stealth ×4 |
| **10** | **boss** | 종말 | **titan ×2 + heavy ×3 + battle ×4 + stealth ×3** |

### 웨이브별 스케일링 (WAVE_SCALING)

웨이브 진행에 따라 몬스터 HP/속도에 배수 적용. 초반 완만, 후반 가파름.

| Wave | HP 배수 | 속도 배수 |
|------|---------|----------|
| 1-2 | 1.0× | 1.0× |
| 3 | 1.1× | 1.0× |
| 4 | 1.2× | 1.0× |
| 5 | 1.5× | 1.05× |
| 6 | 1.8× | 1.05× |
| 7 | 2.2× | 1.1× |
| 8 | 2.6× | 1.1× |
| 9 | 3.0× | 1.15× |
| 10 | 3.5× | 1.15× |

### 맵별 난이도 배수 (difficultyHpMult)

| 맵 | HP 배수 | 보상 배수 |
|----|---------|----------|
| forest_gate | 1.0× | 1× |
| lava_fortress | 1.3× | 2× |
| storm_citadel | 1.6× | 3× |

**HP 적용 순서:** base × Band스케일링 × difficultyHpMult × WAVE_SCALING × FINAL_BOSS(Wave10만 2×)

---

## 7. Level Design

| 항목 | 내용 |
|------|------|
| Objective | 성문이 무너지기 전에 10웨이브 + 보스 2회 생존 |
| Map Structure | 세로형 단일 필드 / 고정 레인 / buildable tile 분리 |
| Danger Points | 고속 러시, 고장갑 탱커, 보스 웨이브(5, 10) |
| Difficulty Spike | 웨이브 5 (1차 보스), 웨이브 8~9 (고밀도), 웨이브 10 (최종 보스) |
| Boss Leak Rule | 보스가 경로 끝 도달 시 HP 관계없이 즉시 패배 |
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

- **HUD**: HP, 에너지, 웨이브 카운터, 보스 경고, 결과 오버레이, 나가기 버튼, 배속 토글
  - HP 변화 시 scale flash 애니메이션 (250ms ease-out, 초기 마운트 시 스킵)
  - 부유 데미지 넘버 (Phaser Text 오브젝트 풀 24개, 600ms ease-out-quad 부유)
  - `showDamageNumbers` 설정 런타임 동기화: Zustand → `game.registry` → Phaser `changedata` 이벤트
- **ProfileBar** (로비 상단): 아바타/닉네임/Lv, XP 바, 골드 잔액, 다이아 잔액
- **Lobby**: BottomTabBar 3탭 (Home·Collection·Settings) + Home 탭 우측 상단 플로팅 아이콘 (Missions·Achievements). 각 아이콘에 수령 가능 카운트 뱃지(`-top-1 -right-1`, `bg-danger`, `text-[8px] font-pixel`, `warningPulse 1.6s` 애니메이션, `aria-label`에 카운트 포함, `useClaimableCounts` 훅이 `metaStore`에서 `current >= target && !claimed` 집계). Home 탭에 단일 "성벽 막기" 골드 버튼. Collection 탭(전쟁탁자)에 출전덱 4슬롯 미리보기 + 편집 버튼
- **WorldMapPage** (스테이지 선택): 맵 썸네일 카드 노드 + SVG 골드 점선 경로, 잠금/해금 상태 표시, 권장 레벨 뱃지, 별 진행도 표시(★1/★2/★3 활성 별 아이콘), 보상 배율 배지(x2/x3). 고정 px 좌표(430×640) 레이아웃으로 노드 간격과 화살표 길이 일정 유지. 마운트 시 권장 스테이지(첫 미클리어 해금 스테이지)로 자동 스크롤.
- **StageDetailPage** (스테이지 상세): 히어로 썸네일 + 정보 카드(최대 XP/골드/웨이브/경로) + 클리어 기록 프로그레스바 + 2배속 가이드(클리어 완료 시 "▶▶ 클리어 완료 — 2배속 플레이 가능" 표시) + 출전 덱 4슬롯 미리보기 + 게임 시작
- **Deck/Build Panel**: 보유 타워 컬렉션, 4개 카드 선택 → 에너지 배치
- **Tower Sell Panel**: 배치된 타워 탭 시 하단 중앙에 표시 (타워 이름 + "판매 E+N" danger 버튼)
- **Exit Modal**: "나가기" 텍스트 버튼 탭 → 확인 모달 (게임 일시정지, "나가기"/"계속하기")
- **Result Screen**: 방어 성공/실패, 재도전, 로비 복귀
- **Tutorial Overlay**: 첫 세션 5단계 (step 1~2만 강제)

### LoadingScreen & 페이지 전환

- **LoadingScreen** (Suspense fallback): 2단 타이포 계층
  - 타이틀: `font-pixel text-[15px] text-accent tracking-[0.16em]`, `>_` 터미널 프리픽스
  - 서브카피: `font-pixel text-[10px] text-text-secondary tracking-[0.1em]`, `matchmaking-dots` 3-dot 애니메이션
  - 레이아웃: `w-full h-full flex flex-col items-center pt-[40dvh]` (엄지 도달 영역, 불투명 `bg-bg`로 lazy chunk 로드 중 플래시 방지)
  - context별 카피:
    | context | 타이틀 | 서브카피 |
    |---------|--------|----------|
    | map | `>_ 월드맵 로딩` | `작전 지역 스캔 중` |
    | stage | `>_ 작전 브리핑` | `스테이지 정보 수신 중` |
    | battle | `>_ 전장 구축` | `타워 배치 준비` |
- **GamePage 부팅 오버레이**: LoadingScreen과 **동일한 시각 언어**
  - 타이틀 `>_ 전투 개시` + 서브카피 `그리드 초기화 중`
  - 반투명 배경(`rgba(26, 18, 8, 0.76)`)으로 그리드가 살짝 비침 → lazy chunk 로드 → Phaser 부팅 사이의 단절감 제거
- **페이지 전환 애니메이션**: `fadeSlideIn 220ms ease-out` (opacity 0→1 + translateY -4→0)
  - App.tsx 래퍼에 `key={phase}` 부여 (phase = `lobby|map|stage|battle`)
  - 주의: `key={runStatus}` 금지 — `building/running/victory/defeat`가 모두 GamePage이므로 `runStatus`를 키로 쓰면 전투 중 GamePage가 unmount되어 Phaser scene이 재초기화된다
  - `prefers-reduced-motion` 대응 (global.css 라인 291-294)

### iOS 사운드

iOS Safari/Chrome은 사용자 제스처 없이 AudioContext를 시작할 수 없음.
첫 `pointerdown`/`touchstart`/`click`에서 `await soundGenerator.unlock()` 호출 (async, try-catch 래핑).
unlock 후 저장된 SFX 볼륨을 오디오 엔진에 재적용. `visibilitychange`로 탭 전환 후 복귀 시에도 `await` 재개.
리스너는 `await` 전에 선제거하여 단일 제스처의 중복 이벤트(pointerdown+touchstart+click) 동시 호출 방지.
GamePage, StageSelectPage 모두 마운트 시 저장된 SFX 볼륨을 오디오 엔진에 초기 적용.

### 디자인 시스템

> 상세 컨텍스트는 `.impeccable.md` 참조. 아래는 구현 수준 요약.

**색상 토큰** (`packages/shared/src/constants/ui-colors.ts`)

| 토큰 | 값 | 용도 |
|------|-----|------|
| bg | #1a1208 | 기본 배경 |
| panel | #2a2010 | 패널 배경 |
| border | #4a3a20 | 테두리 |
| accent | #c8a04a | 주요 액션/강조 |
| success | #7ab648 | 성공 피드백 |
| danger | #c03020 | 위험/경고 |
| gold | #f0d060 | 통화/강조 |
| info | #5bc8e8 | 정보/수 속성 |
| text | #f0e8d8 | 기본 텍스트 |
| textSecondary | #a09070 | 보조 텍스트 |
| gradeUnique | #9060e0 | unique 등급 |
| tierBright | #ffe870 | tier 5 라벨 |
| bossPhase1 | #c87020 | 보스 1페이즈 HP |

**토큰 아키텍처**: `@gld/shared`의 `ui-colors.ts`가 단일 진실 원천.
- `UI_COLORS` (hex string) — React DOM용
- `PHASER_COLORS` (0x number) — Phaser Canvas용
- `web-shell/styles/tokens.ts`의 `colors`는 `UI_COLORS`를 re-export
- `global.css`의 `@theme` CSS 변수는 Tailwind v4용 복사본 (필수 중복)

**타이포그래피 스케일** (Press Start 2P / Galmuri11)

| 역할 | 크기 | 용도 |
|------|------|------|
| caption | 8px | 부가 정보, 서브라벨 |
| label | 10px | 통화량, 스탯 값, 작은 라벨 |
| body | 11px | 기본 본문, 리스트, 설정 |
| subtitle | 13px | 섹션 제목, 카드 이름 |
| title | 15px | 화면 제목, 주요 CTA |

**터치 타겟**: 모든 인터랙티브 요소 최소 44×44px. PixelButton, select, close 버튼 포함.

### ★ 등급 UI 색상 매핑
| 별 등급 | 배경색 | 테두리색 | 토큰 |
|---------|--------|---------|------|
| ★1 | success/10% | success #7ab648 | success |
| ★2 | accent/10% | accent #c8a04a | accent |
| ★3 | danger/10% | danger #c03020 | danger |

★ 선택 버튼: 최소 48×48px 터치 영역

**통화 아이콘**: 이모지 대신 인라인 SVG 픽셀 아이콘 사용 (`CurrencyIcon.tsx`).
- 다이아몬드: info (#5bc8e8) 계열 12×12 SVG
- 골드 코인: gold (#f0d060) + accent (#c8a04a) 12×12 SVG

**스타일링**: Tailwind v4 className + @theme 토큰. 동적 값만 inline style prop.

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

| setting_key | default | range/options | saved_to | 런타임 동기화 |
|-------------|---------|---------------|---------|-------------|
| bgm_volume | 0.7 | 0~1 | localStorage | Zustand → SoundGenerator |
| sfx_volume | 0.8 | 0~1 | localStorage | Zustand → SoundGenerator (`setMasterVolume` 직접 호출) |
| screen_shake | on | on/off | localStorage | Zustand → registry → Phaser (`screenShake !== false` 체크) |
| colorblind_mode | off | off/protan/deutan/tritan | localStorage | Zustand → CSS filter |
| damage_numbers | on | on/off | localStorage | Zustand → registry → Phaser changedata |

### 설정 동기화 아키텍처

```
SettingsTab (React) → gameStore.toggle*() / set*()
    → Zustand subscribe (PhaserGame.tsx / StageSelectPage.tsx)
        → game.registry.set('showDamageNumbers' | 'screenShake', value)
            → Phaser 씬에서 registry.get() 조회 후 기능 적용/스킵

sfxVolume 특수 경로:
    gameStore.setSfxVolume(v) → soundGenerator.setMasterVolume(v) 직접 호출
    GamePage/StageSelectPage 마운트 시에도 저장된 볼륨 초기 적용

screenShake 동기화:
    gameStore.toggleScreenShake() → metaStore.updateSettings({ screenShake }) 영속화
    gameStore 초기값: metaStore.settings.screenShake ?? true
    PhaserGame.tsx: registry.set('screenShake', value) + subscribe
    Game.ts showBossWarningOverlay(): registry.get('screenShake') !== false → shake 조건 실행
```

모든 설정은 로비에서 변경 가능하며, 게임 중에도 실시간 반영된다. 전역 스크롤바는 CSS에서 숨김 처리 (`scrollbar-width: none`).

---

## 10. 게임 정체성 (Edge Point)

> 이 게임은 일반적인 모바일 TD와 달리 세로형 single-field + 즉시 시작 + 10웨이브 밀도 높은 생존 구조와 4개 고정 타워의 에너지 관리 + 메타 컬렉션 확장 루프 때문에 5~7분의 짧은 세션에서 긴장감과 성장 성취를 동시에 강하게 느낀다.

※ ★ 시스템은 5-7분 세션 밀도를 유지하면서 같은 스테이지의 반복 도전 가치를 추가한다. ★3 조건은 HP 80%로, 무피격이 아닌 "거의 완벽한 플레이"를 요구한다.

**점검 질문**
- 이 게임을 한 문장으로 기억하게 만드는 포인트가 있는가?
- 첫 5분 안에 차별점이 체감되는가?
- 경쟁작 대비 버릴 수 없는 특징이 있는가?

---

## 11. 변경 이력

| 날짜 | 항목 | 변경 내용 |
|------|------|---------|
| 2026-04-07 | 최초 작성 | Obsidian GDD 기반 |
| 2026-04-07 | §8 UI/UX | 디자인 시스템 섹션 신설 (색상 토큰 13종, 타이포 5단계, 터치 타겟, HUD 애니메이션, 데미지 넘버, CurrencyIcon SVG) |
| 2026-04-07 | §8, §9 | 토큰 아키텍처(단일 원천 + re-export), 설정 런타임 동기화 경로, HUD flash 초기 마운트 스킵 |
| 2026-04-07 | §4, §6, §7, §8 | 웨이브 재설계(초반 완만→후반 가파름), WAVE_SCALING 10단계, difficultyHpMult 맵별 차등(1/1.3/1.6), 타워 판매(50%), 게임 나가기(확인 모달+일시정지), 보스 leak 즉시 패배, iOS AudioContext unlock, 덱 편집 버그 수정 |
| 2026-04-08 | §8, §9 | 월드맵 px 고정 레이아웃(430×640)+권장 스테이지 자동 스크롤, 클리어 배지 픽셀 아트 에셋, 2배속 가이드 UI, SFX→soundGenerator 연결, screenShake metaStore 영속화+registry 동기화, iOS async unlock(try-catch+리스너 선제거), 전역 스크롤바 숨김 |
| 2026-04-09 | §8 UI/UX | FloatingNavButtons 수령 가능 뱃지(`useClaimableCounts` + warningPulse), LoadingScreen 2단 타이포(`>_` 터미널 프리픽스, context별 카피), GamePage 부팅 오버레이 통일, 페이지 전환 `fadeSlideIn 220ms`(`key={phase}`로 GamePage 안정성 보장), 폰트/이미지 preload(Galmuri11 woff2 link preload, Press Start 2P CSS @import→HTML link, UI 이미지 17개 boot 시점 사전 로드) |

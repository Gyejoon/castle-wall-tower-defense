# Game Design Document (GDD)

> **Last Updated:** 2026-05-09 (v5.0 — central wall checkpoint loop)
> **Decision:** v1 핵심 루프를 중앙 성벽 방어 + 4속성 슬롯 + 5-wave Act checkpoint 구조로 재정의한다.
> **Goal:** `main_long` 하나로, 성벽을 지키며 Act마다 보상을 고르는 6~8분짜리 모바일 방어 런을 검증한다.

---

## 1. Game Definition

| 항목 | 내용 |
|------|------|
| Title | Grid Line Defense |
| Genre | Mobile portrait central-wall tower defense |
| Platform | Mobile Web / App In Toss |
| Player Count | Single |
| Session Length | 평균 6~8분, 20 wave 완주 시 8~10분 |
| Core Fantasy | 중앙 성벽을 지키는 지휘관이 되어 4속성 방어 슬롯과 전술 스킬로 적의 진입을 막는다 |
| Core Fun | 성벽 HP 압박, Act 보스 돌파, 체크포인트 보상 선택, 4속성 슬롯 성장 |
| Mode | 단일 정식 모드 |
| Map | `main_long` 1종, 9x18 논리 그리드, 중앙 성벽 + 성벽 주변 4속성 슬롯 |
| Runtime | Unity WebGL 전환 트랙을 v1 검증 대상으로 승격한다 |

### Design Pillars

1. **성벽 방어가 목적**: 플레이어의 주 목표는 중앙 성벽 HP를 지키며 Act 4까지 버티는 것이다.
2. **엄지 조작 우선**: 하단 버튼과 타워 탭만으로 핵심 플레이가 가능해야 한다.
3. **5-wave 호흡**: wave 5/10/15/20 보스 뒤 checkpoint reward로 선택 피로를 나눈다.
4. **작은 콘텐츠로 반복성 확보**: 맵을 늘리지 않고 4속성 슬롯, 성벽, 스킬, roguelike 보상 조합으로 변주를 만든다.

---

## 2. Target Player

| 항목 | 내용 |
|------|------|
| 상황 | 출퇴근, 대기 시간, 짧은 휴식 |
| 숙련도 | 캐주얼 중심, 성벽 HP와 스킬 버튼을 빠르게 이해 |
| 첫 세션 목표 | 30초 안에 성벽/4슬롯/스킬을 이해, 2~3분 안에 첫 checkpoint 경험 |
| 재방문 이유 | 최고 Act 갱신, checkpoint 보상 조합, 성벽 HP 잔량 기록 |

---

## 3. V1 Scope

### In Scope

| 분류 | v1 포함 |
|------|---------|
| 모드 | 단일 정식 모드 |
| 맵 | `main_long` 1개 |
| 타워 | 4속성 슬롯: archer / siege / frost / stun. 각 슬롯은 보상으로 등장/승급 |
| 적 | 현재 보유 몬스터 에셋 내에서 6~8종 사용 |
| 보스 | 현재 보유 보스 중 2~3종 순환 |
| 전투 재화 | energy |
| 런 강화 | 보스 클리어 후 checkpoint reward 3개 중 1개 선택 |
| 광고 | 선택형 보상 광고 2곳: 이어하기, checkpoint reward 리롤 |
| 저장 | localStorage 기반 최고 기록/설정/간단 메타 |
| Unity | v1 core-loop 검증 대상 |

### Out of Scope for V1

아래 항목은 출시 전 필수 스펙이 아니다. 문서와 코드에 남아 있더라도 v1 제품 목표에서는 제외한다.

| 제외 항목 | 이유 |
|-----------|------|
| 다이아 상자 / 외부 유료 가챠 / 천장 | 운영과 밸런스 비용이 크고 현재 목표 수익화에 과함 |
| 일일/주간 미션 | 반복 운영 부담이 큼 |
| 출석 보상 / 시즌 / 이벤트 | 지속 운영 전제가 필요 |
| 별 등급 / 스테이지 클리어 랭크 | 단일 endless 모드와 충돌 |
| 덱 편성 / 월드맵 / 스테이지 선택 | Act/Checkpoint가 한 런 안의 구간을 대체 |
| grade 승급 / 각성 / 조각 | 메타 경제 복잡도가 큼 |
| 서버 저장 / 랭킹 / PVP | 유지보수와 부정행위 대응 비용이 큼 |
| 신규 맵 2~3종 | v1 재미 검증 전에는 제작하지 않음 |

---

## 4. Core Loop

```text
로비 -> 전투 시작
  -> 중앙 성벽과 4속성 슬롯 확인
  -> wave 자동 전투, 필요 시 수리/스킬 사용
  -> 웨이브 자동 전투
  -> wave 5/10/15/20 보스 처치 시 checkpoint reward 선택
  -> 타워 슬롯/성벽/스킬/전역 카드 중 하나를 강화
  -> 다음 Act로 진행
  -> 패배 시 기록 저장, 선택형 광고로 1회 이어하기 가능
```

### Session Target

| 항목 | 목표 |
|------|------|
| 첫 보스 도달 | 2~3분, wave 5 checkpoint |
| 일반 패배 지점 | 초보 Act 2, 익숙한 유저 Act 3~4 |
| 한 판 종료 | 평균 6~8분, 숙련 완주는 8~10분 |
| 재시작 마찰 | 결과 화면에서 1탭 |

v1의 활성 콘텐츠 아크는 20 wave이며, `Act 1~4`가 각각 5 wave를 가진다. wave 5/10/15/20은 보스 checkpoint다. 50 wave 데이터는 밸런스/디버그 확장으로만 유지한다.

---

## 5. Core Systems

### Tower Slot Model

v1 active spec은 기존 6칸 랜덤 합성을 사용하지 않는다. 성벽 주변 4개 고정 슬롯만 사용하며, 각 슬롯은 서로 다른 family 하나만 허용한다.

| Slot | Family | 시작 역할 | 성장 방향 |
|------|--------|-----------|-----------|
| 1 | archer | 단일 대상 빠른 공격 | 공격 속도/치명/관통 |
| 2 | siege | 단일 대상 강한 공격 | 폭발/범위 피해 |
| 3 | frost | 단일 대상 약한 공격 | slow/빙결 보조 |
| 4 | stun | 단일 대상 약한 공격 | stun/차단 보조 |

타워는 중복 배치가 아니라 checkpoint reward로 등장/승급한다. 같은 family 보상을 다시 고르면 해당 슬롯의 tier 또는 특수 효과가 강화된다.

### Act And Checkpoint

| Act | Wave | Checkpoint |
|-----|------|------------|
| Act 1 | 1~5 | wave 5 boss clear |
| Act 2 | 6~10 | wave 10 boss clear |
| Act 3 | 11~15 | wave 15 boss clear |
| Act 4 | 16~20 | wave 20 boss clear / run result |

checkpoint reward는 항상 3개 선택지를 제공한다. 선택지는 중복되지 않아야 하며, 아래 pool에서 나온다.

| Reward group | 효과 |
|--------------|------|
| tower upgrade | 비어 있는 family 슬롯 등장 또는 기존 슬롯 tier/특수 효과 강화 |
| wall upgrade | 성벽 max HP, 수리 효율, 자동 공격 강화 |
| skill upgrade | 사용자 스킬 해금/강화 |
| global roguelike card | run-scoped 전역 공격/경제/효과 증폭 |

### Wall And Tactics

중앙 성벽은 player HP의 실제 표현이다. 적이 경로 끝에 도달하면 성벽 HP가 감소한다. 플레이어는 energy를 써서 수리할 수 있으나, 수리 비용과 쿨다운 때문에 무한 유지가 불가능해야 한다.

사용자 스킬 v1은 2종으로 시작한다.

| Skill | 효과 | Guardrail |
|-------|------|-----------|
| force move | 지정 범위 적을 경로 뒤쪽으로 밀어냄 | boss `ccResistance`로 효과 감소 |
| freeze | 지정 범위 적을 정지/빙결 | boss `ccResistance`와 stun immunity window를 우회하지 않음 |

### Legacy Parking Lot

아래는 v1 active loop가 아니다. 호환 코드가 남아 있더라도 신규 UX/검증 기준에서 제외한다.

- 기본 소환
- tier 가챠
- 6개 배치칸
- 동일 타워 합성
- T5/T6 hybrid merge

### Run Upgrade Cards

v1 카드 수는 4~6개면 충분하다. 보스 처치 후 3장 중 1장 선택한다.

| ID | v1 판정 | 이유 |
|----|---------|------|
| `dmg_up` | 유지 | 가장 이해하기 쉬운 성장 |
| `energy_harvest` | 유지 | 소환 빈도를 늘려 재미에 직접 연결 |
| `energy_regen` | 유지 | 안정적인 선택지 |
| `tier_odds_up` | 유지 | 인게임 가챠와 직접 연결 |
| `effect_amp` | 선택 | CC 밸런스 부담이 있으면 제외 가능 |
| `crit_dmg` | 보류 권장 | crit 시스템이 명확하지 않으면 유지비 증가 |

### Family Upgrade

현재 HUD에는 archer/siege/frost/stun 패밀리별 energy 강화 버튼이 있다. v1에서는 보조 시스템으로 유지하되, 핵심 재미는 소환/합성/보스 카드에 둔다.

권장 v1 정책:

- 신규 강화 UX 확장 금지
- 튜토리얼에서 설명하지 않음
- 강화가 합성보다 정답이 되면 비용을 올림
- 조작 피로가 크면 접거나 숨기는 후보로 둠

---

## 6. Level and Wave Design

### Recommended V1 Wave Shape

| 구간 | 목표 |
|------|------|
| wave 1~3 | 소환/배치/합성 학습 |
| wave 4~5 | 첫 보스 또는 중간 압박 |
| wave 6~10 | 카드 선택 효과 체감 |
| wave 11~15 | 중반 조합 완성, 2~3번째 카드 선택 |
| wave 16~20 | 최종 압박, T5/T6 도전, v1 콘텐츠 완주 |
| wave 21+ | 숙련자/디버그/확장 구간 |

### Boss Rule

- 보스가 도착하면 즉시 패배하는 규칙은 유지한다.
- 보스는 긴장감을 만들되, 첫 보스는 대부분의 유저가 경험해야 한다.
- 보스 처치가 카드 선택 트리거다.
- v1 권장 보스 타이밍은 wave 5 / 10 / 15 / 20이다.

### Map Rule

`main_long` 단일 맵을 유지한다.

- 6개 고정 배치칸만 사용
- 경로와 배치 좌표는 기존 `MapLayout`/`placementAnchors` 기준 유지
- 신규 맵은 v1 Go/No-Go 통과 전 제작하지 않음

---

## 7. UI / UX

### Game HUD

| 영역 | v1 유지 |
|------|---------|
| 상단 좌측 | energy, wave, countdown. 전투 중 상단 HP 배지는 표시하지 않음 |
| 상단 우측 | 햄버거 설정 버튼 1개만 표시. 설정 overlay에서 x1/x2/x3, 재개, 포기를 선택한다. 전투 중간 상태 배지는 표시하지 않음 |
| 좌측 전투 스택 | 공격/wave 진행 배지와 보스 보상 카드 preview |
| 하단 좌측 | 원형 밀치기, 정지 전술 버튼. 풀폭 하단 액션바는 사용하지 않음 |
| 하단 우측 | 성벽 메뉴 버튼 없음. 성벽 직접 클릭으로만 성벽 메뉴 진입 |
| 타워 선택 | merge, move, sell, close |
| 성벽 선택 | 중앙 성벽 메뉴 overlay. 즉시 수리권, 공격력 강화, 공격 속도 강화, 공격 범위 강화를 제공한다. overlay 바깥 클릭 시 닫히며 하단 전술 버튼은 고정 위치 유지 |
| 필드 표시 | 성벽 위 HP 수치/바, 모든 활성 몬스터 위 HP bar |
| 보스 후 | 3카드 선택, 광고 리롤 |
| 패배 후 | 다시 시작, 로비로, 광고 이어하기 |

### Lobby

v1 로비는 작아야 한다.

| 영역 | 정책 |
|------|------|
| Home | 전투 시작 CTA 중심 |
| Collection / War Table | 보유 타워 관찰과 메타 shell만 유지 |
| Settings | BGM/SFX, screen shake, colorblind |
| Shop | v1 제외 |
| Mission | v1 제외 |
| World Map | v1 제외 |

### FTUE

최소 4단계로 충분하다.

| Step | 완료 조건 |
|------|-----------|
| 1 | 기본 소환 버튼 탭 |
| 2 | 빈 배치칸에 타워 배치 |
| 3 | 같은 family/tier 타워 2개 합성 |
| 4 | 첫 보스 후 카드 선택 |

---

## 8. Monetization

v1 수익화 목표는 운영비 보조다. 강제 광고와 유료 성장 경제는 넣지 않는다.

| Placement | 정책 |
|-----------|------|
| Continue | 패배 후 런당 1회, rewarded ad |
| Card Reroll | 보스 카드 화면에서 선택형 rewarded ad |
| Remove Ads | 후속 검토 |
| IAP / Diamond / Subscription | v1 제외 |

---

## 9. Unity Transition

Unity 전환은 유지한다. 다만 제품 스펙을 키우는 이유가 되어서는 안 된다.

| 단계 | 원칙 |
|------|------|
| Phaser v1 | 현재 playable 제품 검증과 출시 기준 |
| Unity PoC | 동일한 최소 루프를 재현: 1맵, 소환, 배치, 웨이브, HP, energy |
| Unity Migration | Phaser와 기능 동등성을 맞춘 뒤 런타임 교체 판단 |
| Shared Data | tower/unit/wave 수치는 `@gld/shared` 또는 export JSON을 단일 원천으로 유지 |

Unity 전환 중에도 신규 BM, 신규 맵, 신규 메타 시스템은 추가하지 않는다.

---

## 10. Go / No-Go

v1에서 볼 지표는 많지 않아야 한다.

| 질문 | 기준 |
|------|------|
| 5분 뒤 다시 시작을 누르는가 | 핵심 Go/No-Go |
| 첫 보스를 3분 안에 보는가 | 초반 이해도 |
| T3/T4 또는 T5 합성이 한 판 안에 보이는가 | 합성 도파민 |
| 조작이 답답하지 않은가 | 지하철 캐주얼 적합성 |
| 광고를 안 봐도 게임이 성립하는가 | 수익화 안전선 |

---

## 11. Parking Lot

v1 이후에만 검토한다.

- 다이아 경제
- 상자/천장/컬렉션 가챠
- 일일/주간 미션
- 출석 보상
- 시즌 이벤트
- 서버 저장
- 랭킹/PVP/ghost replay
- 신규 맵
- 코스메틱 상점
- 복귀 유저 보상

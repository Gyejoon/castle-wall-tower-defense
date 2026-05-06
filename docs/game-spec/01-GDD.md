# Game Design Document (GDD)

> **Last Updated:** 2026-05-06 (v4.0 — minimal launch scope)
> **Decision:** Unity 전환은 유지한다. 다만 v1 출시는 Phaser 런타임을 기준으로 검증하고, Unity는 병행 이행 트랙으로 관리한다.
> **Goal:** 리소스를 최소화하면서 지하철에서 6~8분 동안 하기 편한 캐주얼 랜덤 합성 타워디펜스를 출시한다.

---

## 1. Game Definition

| 항목 | 내용 |
|------|------|
| Title | Grid Line Defense |
| Genre | Mobile portrait random merge tower defense |
| Platform | Mobile Web / App In Toss |
| Player Count | Single |
| Session Length | 평균 6~8분, 20 wave 완주 시 8~10분 |
| Core Fantasy | 랜덤으로 나온 4가문 타워를 합성해 한 판 안에서 강력한 최종 타워까지 키운다 |
| Core Fun | 소환 도파민, 합성 도파민, 보스 후 3카드 선택, 최고 wave 갱신 |
| Mode | 단일 정식 모드 |
| Map | `main_long` 1종, 9x18 논리 그리드, 6개 고정 배치칸 |
| Runtime | v1 운영은 Phaser, 향후 Unity WebGL 전환 유지 |

### Design Pillars

1. **한 판 안에서 완결**: 메인 재미는 영구 성장보다 런 중 소환/합성/카드 선택에서 나온다.
2. **엄지 조작 우선**: 하단 버튼과 타워 탭만으로 핵심 플레이가 가능해야 한다.
3. **낮은 운영비**: 시즌, 서버 경제, 복잡한 LiveOps 없이도 유지 가능해야 한다.
4. **작은 콘텐츠로 반복성 확보**: 맵과 타워 수를 늘리기보다 랜덤 소환과 합성 경로로 변주를 만든다.

---

## 2. Target Player

| 항목 | 내용 |
|------|------|
| 상황 | 출퇴근, 대기 시간, 짧은 휴식 |
| 숙련도 | 캐주얼 중심, 랜덤 디펜스 경험자는 빠르게 이해 |
| 첫 세션 목표 | 30초 안에 소환/배치 이해, 3분 안에 첫 보스 경험 |
| 재방문 이유 | 최고 wave 갱신, 더 높은 tier 합성, 보스 카드 조합 실험 |

---

## 3. V1 Scope

### In Scope

| 분류 | v1 포함 |
|------|---------|
| 모드 | 단일 정식 모드 |
| 맵 | `main_long` 1개 |
| 타워 | 19종: 4 family x 4 tier + hybrid 2 + ultimate 1 |
| 적 | 현재 보유 몬스터 에셋 내에서 6~8종 사용 |
| 보스 | 현재 보유 보스 중 2~3종 순환 |
| 전투 재화 | energy |
| 런 강화 | 보스 클리어 후 3카드 중 1장 선택 |
| 광고 | 선택형 보상 광고 2곳: 이어하기, 카드 리롤 |
| 저장 | localStorage 기반 최고 기록/설정/간단 메타 |
| Unity | Phaser v1과 별도 트랙으로 PoC/전환 준비 유지 |

### Out of Scope for V1

아래 항목은 출시 전 필수 스펙이 아니다. 문서와 코드에 남아 있더라도 v1 제품 목표에서는 제외한다.

| 제외 항목 | 이유 |
|-----------|------|
| 다이아 상자 / 외부 유료 가챠 / 천장 | 운영과 밸런스 비용이 크고 현재 목표 수익화에 과함 |
| 일일/주간 미션 | 반복 운영 부담이 큼 |
| 출석 보상 / 시즌 / 이벤트 | 지속 운영 전제가 필요 |
| 별 등급 / 스테이지 클리어 랭크 | 단일 endless 모드와 충돌 |
| 덱 편성 / 월드맵 / 스테이지 선택 | 랜덤 소환 정식 모드와 충돌 |
| grade 승급 / 각성 / 조각 | 메타 경제 복잡도가 큼 |
| 서버 저장 / 랭킹 / PVP | 유지보수와 부정행위 대응 비용이 큼 |
| 신규 맵 2~3종 | v1 재미 검증 전에는 제작하지 않음 |

---

## 4. Core Loop

```text
로비 -> 전투 시작
  -> 기본 소환 또는 tier 가챠 버튼으로 타워 획득
  -> 6개 배치칸 중 하나에 배치
  -> 같은 family/tier 타워를 합성
  -> 웨이브 자동 전투
  -> 보스 처치 시 3장 카드 중 1장 선택
  -> 더 높은 wave와 더 높은 tier를 노림
  -> 패배 시 기록 저장, 선택형 광고로 1회 이어하기 가능
```

### Session Target

| 항목 | 목표 |
|------|------|
| 첫 보스 도달 | 2~3분 |
| 일반 패배 지점 | 초보 wave 10~12, 익숙한 유저 wave 16~20 |
| 한 판 종료 | 평균 6~8분, 숙련 완주는 8~10분 |
| 재시작 마찰 | 결과 화면에서 1탭 |

v1의 활성 콘텐츠 아크는 20 wave다. 50 wave 데이터는 밸런스/디버그 상한으로 유지할 수 있지만, UX와 난이도 튜닝은 wave 20까지를 기준으로 한다.

---

## 5. Core Systems

### Tower Model

`grade`가 아니라 `family + tier`가 타워 정체성의 기준이다.

| Family | 역할 | T1 | T2 | T3 | T4 |
|--------|------|----|----|----|----|
| archer | 단일 대상 빠른 공격 | archer | wind_spire | flame_tower | arcane_spire |
| siege | 범위 피해 | nova_cannon | fortress | earth_golem | celestial |
| frost | slow + 약한 데미지 | emp | stasis_field | disruptor | world_tree |
| stun | stun + 약한 데미지 | shield | twin_archer | holy_shrine | divine_throne |

추가 타워:

| Tier | ID | 조건 |
|------|----|------|
| T5 | hybrid_ab | archer T4 + siege T4 |
| T5 | hybrid_cd | frost T4 + stun T4 |
| T6 | ultimate | hybrid_ab + hybrid_cd |

### Merge Rule

- T1~T3: 같은 family, 같은 tier 2개 -> 다음 tier
- T4: 지정된 cross-family 조합만 T5로 합성
- T5: `hybrid_ab + hybrid_cd` -> T6
- T6 이후 합성 없음

### Summon and Energy

| 액션 | 비용 | 결과 |
|------|------|------|
| 기본 소환 | 20 energy | T1 4종 균등 랜덤 |
| T2 시도 | 40 energy | 성공 시 T2, 실패 시 T1 |
| T3 시도 | 80 energy | 성공 시 T3, 실패 시 T1 |
| T4 시도 | 160 energy | 성공 시 T4, 실패 시 T1 |

소환 취소나 배치 실패는 리롤 기회가 아니어야 한다. 기존 `cancelledPoolDraw` / `cancelledGachaDraw` 정책을 유지한다.

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
| 상단 | HP, energy, wave, countdown |
| 하단 | summon, T2, T3, T4, menu |
| 타워 선택 | merge, move, sell, close |
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

# GDD Filled Draft

> 기준: 현재 저장소의 pure PVE / portrait / single-player survival TD 방향성만 반영
> 주의: 템플릿 구조는 바꾸지 않고, 비어 있던 내용을 채워 넣을 수 있도록 초안 형태로 정리함

---

## 1. Game Definition

### 1-1. 한 줄 정의

```markdown
이 게임은 모바일 세로 게임형 Tower Defense + RPG 게임이며,
플레이어는 랜덤하게 획득한 타워를 전략적으로 배치해
20웨이브와 2회의 보스를 버티며 기지를 방어하고,
전투 보상으로 타워 컬렉션과 성장을 확장해 더 높은 난도에 도전한다.
```

### 1-2. 기본 정보 표

| 항목 | 내용 |
| --- | --- |
| Title | 영웅 |
| Genre | 세로형 Tower Defense + RPG |
| Platform | Web / Mobile Web / Desktop |
| Player Count | Single |
| Camera/View | Top-down / Portrait Single Field |
| Input | Touch / Mouse Drag |
| Session Length | 8~10분 |
| Core Fantasy | 성문을 지키는 지휘관이 되어 타워를 배치하고 끝까지 생존하는 판타지 |
| Core Fun | 배치 전략, 랜덤 타워 선택, 웨이브 대응, 성장 보상 |
| Win Condition | 20웨이브 생존 / 최종 보스 및 sudden death 구간 돌파 / 기지 방어 성공 |
| Lose Condition | 기지 HP 0 |

---

## 2. User Frame

### 2-1. 질문

| 항목 | 질문 |
| --- | --- |
| 타깃 유저 | 짧은 세션의 캐주얼 TD를 좋아하면서, 전투 보상과 타워 수집/성장을 함께 원하는 유저 |
| 플레이 맥락 | 로비에서 즉시 시작해 짧고 밀도 높은 전투를 플레이하고, 종료 후 골드와 성장 보상을 통해 타워 컬렉션을 넓히며 다음 스테이지나 더 높은 난도에 재도전한다. 인게임에서는 랜덤 타워 획득, 배치 위치 선정, 범위/감속/버프 시너지 운영이 핵심이다. |
| 숙련도 | 캐주얼~미드코어 |
| 기대 감정 | 시원함, 긴장감, 전략적 만족감, 수집 성취감 |
| 첫 세션 목표 | 10초 안에 “즉시 시작 → 타워 배치 → 방어” 흐름을 이해하고, 5분 안에 첫 보스 경고와 전투 성취를 경험하게 한다. |
| 재방문 이유 | 전투마다 새로운 배치 판단이 생기고, 골드/컬렉션/레벨 성장을 통해 더 강한 타워 조합을 만들 수 있으며, 더 높은 웨이브와 보스 구간을 돌파하는 장기 성취가 누적된다. |

---

## 3. Core Loop / Meta Loop

### 3-1. Core Loop

```markdown
로비 진입 → 즉시 시작 → 랜덤 타워 획득 → 타워 배치 → 웨이브/보스 대응 → 전투 결과 → 보상 획득
```

### 3-2. Meta Loop

```markdown
플레이 → 골드/보상 획득 → 타워 컬렉션 확장 → 프로필 성장 → 더 어려운 스테이지/웨이브 도전
```

---

## 4. Core Systems

| 시스템 | 정의 | 필수 결정 항목 |
| --- | --- | --- |
| Combat | 타워가 자동 공격하고 적은 고정 경로를 따라 이동하는 실시간 방어 전투 | damage, armor, attackSpeed, hit feedback, target priority |
| Movement | 적은 spawn에서 exit까지 세로형 레인을 따라 이동하며, 플레이어는 드래그로 타워를 배치 | speed, path rules, collision, blocked path prevention |
| Spawn/Summon | 전투 중 골드를 사용해 랜덤 타워를 획득하고 buildable tile에 배치 | cost 50, random tier odds, pity 5, placement limits |
| Upgrade | 전투 성과와 메타 보상으로 더 높은 티어와 강한 컬렉션을 확보 | level, rarity, tower unlock, stat growth |
| Progression | 프로필 레벨, 골드, 타워 컬렉션, 전적을 누적해 장기 성장을 만든다 | currency, unlock flow, collection expansion, level cap |
| Boss/Encounter | 20웨이브 구조에서 2회의 보스와 후반 sudden death 구간이 난도 피크를 만든다 | boss timing, warning telegraph, phase pressure, reward |
| Failure/Success | HP를 지키면 승리, HP 0이면 실패. 종료 후 재도전 또는 로비 복귀 | retry flow, result screen, clear reward, fail feedback |

---

## 5. Content Plan

### 5-1. 콘텐츠 분류

- 플레이어 프로필 / 레벨 / 골드 / 전적
- 타워 컬렉션 / 티어 / 역할군
- 적 패밀리
- 보스 목록
- 스테이지 테마
- 기지/성문 방어 콘텐츠
- 튜토리얼 콘텐츠
- 이벤트 / 도전 모드 / 고난도 웨이브

### 5-2. 콘텐츠 로드맵 표

| 분류 | ID | 설명 | 해금 조건 | 우선순위 | 비고 |
| --- | --- | --- | --- | --- | --- |
| character | profile_commander | 플레이어 프로필, 레벨, 전적, 골드 관리 축 | 기본 제공 | 상 | 로비 핵심 축 |
| tower | tower_base_set | 기본 전투용 타워 18종, 5티어 컬렉션 | 기본 풀 + 전투 보상 확장 | 상 | 코어 콘텐츠 |
| enemy | enemy_core_family | 정찰형/중장갑/탱커/암살형/보스 적 패밀리 | 기본 제공 | 상 | 웨이브 핵심 |
| boss | boss_titan_cycle | 2회 보스 경고 후 등장하는 titan 보스 | 중반/후반 웨이브 도달 | 상 | 세션 피크 |
| wave | wave_20_survival | 20웨이브 + sudden death 생존 구조 | 기본 제공 | 상 | 메인 모드 |

---

## 6. Balance Sheets

### 6-1. Character / Tower / Weapon Master

| id | name | role | hp | atk | atk_speed | range | cost | special |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| laser | 궁수 탑 | 기본 단일 딜러 | - | 10 | 1.5 | 3 | 50 | 기본 원거리 공격 |
| plasma | 투석기 | 범위 딜러 | - | 25 | 0.8 | 2 | 50 | splash |
| emp | 서리 마탑 | 감속 제어 | - | 5 | 1.0 | 4 | 50 | slow_30% |
| shield | 성기사 제단 | 버퍼 | - | 0 | 0 | 2 | 50 | boost_adjacent_20% |
| twin_laser | 쌍궁 탑 | 고속 단일 딜러 | - | 25 | 2.0 | 4 | unlocked | 빠른 연속 공격 |
| disruptor | 눈보라 탑 | 광역 감속 | - | 15 | 1.2 | 5 | unlocked | slow_50%_splash |
| nova_cannon | 공성 대포 | 고화력 범위 딜러 | - | 60 | 0.4 | 3 | unlocked | splash |
| fortress | 수호 탑 | 고급 버퍼 | - | 15 | 1.0 | 3 | unlocked | boost_adjacent_40% |
| stasis_field | 빙하 제단 | 광역 제어 | - | 0 | 0 | 3 | unlocked | slow_30% |
| flame_tower | 화염 탑 | 지속 화력 | - | 40 | 1.5 | 3 | unlocked | 고화력 화염 공격 |
| wind_spire | 바람의 첨탑 | 장거리 연사 | - | 20 | 2.5 | 5 | unlocked | 고속 견제 |
| earth_golem | 대지 골렘 | 근중거리 중화기 | - | 80 | 0.5 | 2 | unlocked | 고중량 일격 |
| holy_shrine | 신성 제단 | 광역 버퍼 | - | 0 | 0 | 3 | unlocked | boost_adjacent_20% |
| dragon_nest | 용의 둥지 | 상위 범위 딜러 | - | 100 | 0.8 | 4 | unlocked | splash |
| arcane_spire | 비전 첨탑 | 장거리 마법 딜러 | - | 50 | 1.5 | 6 | unlocked | 장거리 화력 |
| world_tree | 세계수 | 상위 버퍼 | - | 30 | 1.0 | 4 | unlocked | boost_adjacent_40% |
| celestial | 천상의 탑 | 최종 광역 딜러 | - | 200 | 1.0 | 5 | unlocked | splash |
| divine_throne | 신의 옥좌 | 최종 지원 타워 | - | 0 | 0 | 999 | unlocked | boost_adjacent_40% |

#### 역할군 전투 규칙

| 역할군 | 패시브 | 근거 |
| --- | --- | --- |
| 집중 공격형 | **armor pierce** — 대상의 armor를 무시 | flat armor 시스템에서 hit당 데미지가 낮은 집중 공격형이 고armor 보스에게 오히려 약해지는 역설 해결. 보스킬러 역할 보장 |
| 다중 공격형 | splash — 착탄점 주변 50% 데미지 | 일반몹 군집 처리 특화 |
| 슬로우 | 이동속도 감소 (중복 불가) | 지역 제어 |
| 스턴 | 이동 정지 (중복 불가) | 지역 제어 |

### 6-2. Enemy Master

| id | name | hp | speed | armor | bounty | trait |
| --- | --- | --- | --- | --- | --- | --- |
| scout_drone | 고블린 정찰병 | 30 | 3.0 | 0 | 5 | 빠른 초반 러시 |
| battle_robot | 오크 전사 | 80 | 1.5 | 2 | 12 | 균형형 중장갑 |
| heavy_walker | 돌 트롤 | 200 | 0.8 | 5 | 25 | 고체력 탱커 |
| stealth_drone | 그림자 암살자 | 50 | 2.5 | 0 | 18 | 빠른 돌파형 |
| titan | 고대 드래곤 | 500 | 0.5 | 10 | 60 | 보스 / 고위협 |

### 6-3. Boss Master

| id | name | hp | phase_count | key_pattern | weak_point | reward |
| --- | --- | --- | --- | --- | --- | --- |
| titan | 고대 드래곤 | 500 | 2 | 저속 고체력 압박 + 후속 웨이브 동반 등장 | 장거리 집중 화력과 감속 조합에 약함 | 대량 골드, 클리어 진척, 보스 돌파 성취 |

### 6-4. Stage / Level Sheet

| stage_id | theme | objective | hazards | target_duration | difficulty_band |
| --- | --- | --- | --- | --- | --- |
| forest_gate | 숲의 성문 | 성문 방어 / 20웨이브 생존 | 좁은 레인, 경로 차단 불가, 후반 러시 | 8~10분 | 입문~중급 |

### 6-5. Wave / Encounter Sheet

| stage_id | wave | enemy_id | count | spawn_interval | reward | difficulty_target |
| --- | --- | --- | --- | --- | --- | --- |
| forest_gate | 1 | scout_drone | 6 | short | low gold | 튜토리얼 전투 이해 |
| forest_gate | 2 | scout_drone + battle_robot | 8 + 1 | short | low gold | 기본 배치 적응 |
| forest_gate | 3~7 | battle_robot / heavy_walker / stealth_drone mix | 점진 증가 | medium | medium gold | 역할군 대응 학습 |
| forest_gate | 8 | stealth_drone + battle_robot | 5 + 8 | medium | medium gold | 보스 전 경고 압박 |
| forest_gate | 9 | titan | 1 | boss spawn | high gold | 첫 보스 돌파 |
| forest_gate | 10~14 | mixed mid game wave | 증가 | medium | medium gold | 중반 조합 검증 |
| forest_gate | 15 | titan + heavy_walker + stealth_drone | 1 + 2 + 4 | boss mix | high gold | 후반 피크 |
| forest_gate | 16~18 | titan / heavy_walker / battle_robot mix | 대량 | medium | high gold | 고난도 유지 |
| forest_gate | 19 | sudden_death wave 1 | 55 total | fast | clear near end | 최종 생존 압박 |
| forest_gate | 20 | sudden_death wave 2 | 37 total incl. titan 4 | fast | clear reward | 최종 클리어 시험 |

### 6-6. Economy Source / Sink

| currency | source | amount | sink | amount |
| --- | --- | --- | --- | --- |
| gold | 초기 지급 | 200 | 랜덤 타워 구매 | 50 |
| gold | 적 처치 보상 | 5~60 | 전투 중 추가 전력 확보 | 반복 소비 |
| gold | 웨이브/보스 돌파 성과 | stage dependent | 메타 성장 / 해금 비용 | 누적 소비 |

### 6-7. Difficulty Budget

| stage_id | target_dps | target_survival | expected_gold | allowed_mistakes | clear_rate_target |
| --- | --- | --- | --- | --- | --- |
| forest_gate | 초반 단일딜 확보 → 중반 광역/감속/버프 조합 → 후반 집중 화력 필요 | 20웨이브 / HP 20 방어 | 초반 운영 가능 수준의 골드 순환 | 초반 2~3회, 후반 1~2회 실수 허용 | 첫 스테이지 기준 35~45% |

---

## 7. Level Design

| 항목 | 설명 |
| --- | --- |
| Objective | 성문이 무너지기 전에 20웨이브와 보스 구간을 생존한다 |
| Map Structure | 세로형 단일 필드 / 고정 지그재그 레인 / buildable tile 분리 |
| Danger Points | 빠른 적 러시, 고장갑 탱커, 보스 웨이브, sudden death 대량 압박 |
| Visibility | spawn에서 exit까지 경로가 명확하게 읽히고, 배치 가능 타일이 직관적으로 구분되어야 한다 |
| Difficulty Spike | 1차 보스 전(8~9 wave), 2차 보스 전후(14~15 wave), sudden death(19~20 wave) |
| Checkpoint | 세션 중 체크포인트는 없고, 실패 시 즉시 재도전 또는 로비 복귀 |

### 레벨 설계 체크리스트

- 플레이 목표가 즉시 이해되는가
- 위험 요소가 시각적으로 읽히는가
- 오브젝트 밀도가 과하지 않은가
- 실패 원인이 납득 가능한가
- 난이도 상승이 계단식으로 느껴지는가

---

## 8. UI / UX

### 8-1. UI 구조

- **HUD**
  - HP
  - Gold
  - Timer / current wave slot
  - 보스 경고
  - 결과 오버레이
- **Main Menu**
  - 로비 Home 탭
  - 즉시 시작 CTA
- **Settings**
  - 효과음
  - 화면 흔들림
  - 데미지 숫자
- **Pause**
  - 나가기 확인
  - 전투 중 이탈 confirm
- **Inventory / Deck / Build Panel**
  - 보유 타워 컬렉션
  - 티어/속성/설명 확인
  - 전투 중 랜덤 타워 획득 후 배치
- **Result Screen**
  - 방어 성공 / 방어 실패
  - 다시 시작
  - 로비로 돌아가기
- **Tutorial Overlay**
  - 첫 세션에서는 최소 안내 중심
  - “즉시 시작 → 타워 배치 → 방어”의 빠른 이해를 우선

### 8-2. 피드백 규칙

| 피드백 유형 | 표현 방식 |
| --- | --- |
| Hit | projectile line / flash / damage number / sfx |
| Critical | stronger flash / brighter color / heavier hit sound |
| Reward | gold popup / clear text / reward sound |
| Warning | boss warning text / red tint / alarm cue |
| Interaction | drag preview / placement highlight / invalid placement feedback |

---

## 9. Settings Matrix

| setting_key | category | default | range/options | saved_to | live_apply | accessibility |
| --- | --- | --- | --- | --- | --- | --- |
| bgm_volume | audio | 0.7 | 0~1 | localStorage | yes | no |
| sfx_volume | audio | 0.8 | 0~1 | localStorage | yes | no |
| screen_shake | gameplay | on | on/off | localStorage | yes | yes |
| colorblind_mode | accessibility | off | off/protan/deutan/tritan | localStorage | yes | yes |
| damage_numbers | gameplay | on | on/off | localStorage | yes | yes |

---

## 10. Edge Point

### 작성 프레임

```markdown
우리 게임은 일반적인 모바일 TD와 달리
세로형 single-field에서 즉시 시작되는 짧은 생존 구조와
랜덤 타워 획득 + 전략 배치 + 메타 컬렉션 확장 루프 때문에
플레이어가 긴장감과 성장 성취를 동시에 강하게 느낀다.
```

### 점검 질문

- 이 게임을 한 문장으로 기억하게 만드는 포인트가 있는가?
- 스크린샷 한 장만 봐도 정체성이 드러나는가?
- 첫 5분 안에 차별점이 체감되는가?
- 경쟁작 대비 버릴 수 없는 특징이 있는가?

---

## 11. BM

### 11-1. BM 구조 표

| BM 종류 | 예시 | 주의점 |
| --- | --- | --- |
| Premium | 광고 제거 패키지 / 스타터 팩 | 진입장벽이 되지 않게 한다 |
| IAP | 골드 팩 / 성장 재화 / 스타터 번들 | 전투 밸런스를 무너뜨리는 pay-to-win 금지 |
| Ads | 전투 후 보상형 광고 / 추가 골드 | 강제 광고 금지, 세션 몰입 유지 |
| Cosmetic | 로비 스킨 / 타워 스킨 / 이펙트 스킨 | 밸런스 영향 없음 |
| Subscription | 월간 성장 패스 / 출석 강화 | 보상 과잉으로 격차가 커지지 않게 한다 |

### 11-2. Offer Catalog

| sku_id | offer_type | contents | price | placement | trigger | cooldown |
| --- | --- | --- | --- | --- | --- | --- |
| starter_gold_pack | starter | 초반 골드 + 기본 스킨 | low | 로비 홈 | 첫 3세션 이내 | 72h |
| revive_bundle | utility | 실패 직후 재도전 지원 패키지 | low | 결과 화면 | stage fail | 24h |
| weekly_collection_pack | progression | 컬렉션 성장 재화 + 보너스 골드 | medium | 상점 / 우편 | 주간 접속 | 7d |
| cosmetic_castle_theme | cosmetic | 로비/전장 테마 스킨 | medium | 컬렉션 / 상점 | 특정 레벨 달성 | none |

### BM 체크리스트

- 과금이 코어 재미를 해치지 않는가
- 광고 노출이 피로감을 주지 않는가
- no-pay 유저도 게임이 성립하는가
- 구매 타이밍이 자연스러운가

---

## 12. LiveOps / KPI

### 12-1. 운영 구조

- 일일 미션: 특정 웨이브 도달, 타워 N회 배치, 보스 1회 돌파
- 주간 미션: 누적 클리어 수, 특정 타워 계열 사용
- 이벤트: 한정 웨이브, 특정 적 강화 시즌
- 출석: 일일 골드, 성장 재화, 컬렉션 보너스
- 시즌: 시즌별 최고 웨이브/클리어 기록
- 복귀 유저 케어: 복귀 보상, 초반 성장 가속

### 12-2. KPI 예시

| KPI | 정의 |
| --- | --- |
| D1 / D7 Retention | 다음 날 / 7일 후 복귀율 |
| Session Length | 평균 플레이 시간 |
| Retry Rate | 실패 후 즉시 재도전 비율 |
| Conversion Rate | 결제 전환율 |
| ARPPU | 결제 유저 평균 매출 |
| Ad Views per DAU | 유저당 광고 시청량 |
| Boss Reach Rate | 첫 보스 / 두 번째 보스 도달율 |
| Wave 20 Clear Rate | 최종 클리어율 |

### 12-3. Telemetry Event Map

| event_name | fire_when | parameters | primary_kpi |
| --- | --- | --- | --- |
| game_start | run 시작 시 | stage_id, mode, run_id | DAU |
| tower_placed | 타워 배치 시 | tower_id, x, y, wave_slot | core engagement |
| random_tower_rolled | 랜덤 타워 획득 시 | tower_id, tier, cost | economy / randomness |
| boss_warning | 보스 경고 시 | stage_id, slot_index | encounter reach |
| game_over | 전투 종료 시 | result, reason, final_slot | clear rate |
| stage_clear | 스테이지 클리어 시 | stage_id, time, hp_remaining | progression |
| purchase_offer | 상품 구매 시 | sku_id, price | conversion |
| ad_reward_claim | 광고 보상 수령 시 | placement_id, reward | ad monetization |

---

## 13. 최종 체크리스트

### 기획

- 코어 루프가 한 문장으로 설명되는가: **즉시 시작 → 랜덤 타워 배치 → 20웨이브 생존 → 보상 성장**
- TD와 RPG 축이 모두 살아 있는가: **전투 전략 + 컬렉션/레벨/보상 성장**
- 유저 프레임이 분명한가: **짧은 세션을 선호하는 캐주얼~미드코어 TD 유저**
- 전투 전략과 메타 성장의 연결이 자연스러운가: **전투 보상으로 컬렉션/성장을 확장**
- 파밍/육성/도전 루프가 반복 가능한가: **골드/컬렉션/더 높은 웨이브 도전**
- 밸런스 표가 존재하는가: **타워/적/보스/웨이브 수치 존재**
- 콘텐츠 확장 구조가 정의됐는가: **타워, 적, 보스, 이벤트, 시즌 확장 가능**
- BM 금지선이 정리됐는가: **pay-to-win 금지, 강제 광고 금지**

### 제작 전 확인

- 시스템 간 용어가 통일됐는가: **wave / boss / sudden death / gold / collection**
- ID 규칙이 정해졌는가: **tower_id, enemy_id, stage_id 기반**
- 저장 데이터 구조를 고려했는가: **profile / collection / settings / progress**
- 수집과 육성 UI 흐름이 정리됐는가: **로비 → 컬렉션 → 전투 → 결과 → 성장**
- rarity / level / stat 성장 규칙이 정의됐는가: **5티어, 프로필 레벨, 타워 컬렉션 성장**
- KPI 이벤트를 설계했는가: **game_start, tower_placed, random_tower_rolled, game_over, stage_clear 등**

# 데이터 Structure

> **Last Updated:** 2026-05-06 (v4.0 — minimal local save)
> **Scope:** v1은 localStorage 기반 단일 기기 저장을 기준으로 한다. 서버 동기화와 랭킹은 후속 검토다.

---

## 1. Save Policy

| 항목 | 정책 |
|------|------|
| 저장 위치 | localStorage |
| 서버 동기화 | v1 제외 |
| 계정/로그인 | v1 제외 |
| 마이그레이션 | 기존 save v8 읽기/정리 유지 |
| 핵심 저장값 | 최고 wave, 플레이 횟수, 간단 메타, 설정 |

기존 코드에 남은 legacy field는 마이그레이션 호환용으로 둘 수 있다. 새 v1 기능은 legacy field에 의존하지 않는다.

---

## 2. Active V1 Save Shape

```json
{
  "schemaVersion": 8,
  "profile": {
    "playerId": "local",
    "displayName": "Commander",
    "totalPlayCount": 0,
    "highestWave": 0,
    "highestActReached": 0,
    "highestCheckpointWave": 0,
    "bestWallHpRemaining": 0,
    "bestTowerFamiliesBuilt": [],
    "bestTimeSurvivedSec": 0
  },
  "meta": {
    "globalAtkPct": 0,
    "familyPerks": {
      "archer": 0,
      "siege": 0,
      "frost": 0,
      "stun": 0
    }
  },
  "ads": {
    "lastContinueRunAt": null,
    "lastCheckpointRerollAt": null
  },
  "settings": {
    "bgmVolume": 0.7,
    "sfxVolume": 0.8,
    "screenShake": true,
    "colorblindMode": "off"
  },
  "tutorial": {
    "completed": false
  }
}
```

실제 코드가 snake_case를 유지하는 경우 기존 key를 보존한다. 이 문서는 활성 제품 스펙을 설명하며, 코드 변경 없이 key rename을 요구하지 않는다.

---

## 3. Save Timing

| 이벤트 | 저장 대상 |
|--------|-----------|
| 전투 종료 | play count, highest wave, highest act, best wall HP, built tower families, survival time |
| 메타 강화 변경 | `meta` |
| 설정 변경 | `settings` |
| 튜토리얼 완료 | `tutorial.completed` |
| 앱 백그라운드 | 전체 snapshot flush |

---

## 4. Removed From Active Save

아래 저장값은 v1 스펙에서 활성 기능이 아니다.

| 필드/개념 | 처리 |
|-----------|------|
| diamond | 신규 획득/소비 없음 |
| gacha pity | 외부 상자 가챠 제외 |
| missions | 제외 |
| stage clear records | 단일 endless 모드에서는 제외 |
| stage stars | 제외 |
| grade / awakening / duplicate count | 신규 v1 성장축에서 제외 |
| selectedDeck | 덱 편성 제외 |
| server user id | 서버 동기화 전까지 제외 |
| mid-run checkpoint snapshot | v1 checkpoint는 런 내부 보상/호흡 지점이며 영구 이어하기 지점이 아님 |

---

## 5. Runtime Events Worth Persisting

전투 중 모든 이벤트를 저장하지 않는다. 결과 요약만 저장한다.

| 값 | 이유 |
|----|------|
| `finalWave` | 최고 기록 |
| `highestActReached` | Act 진행도 |
| `highestCheckpointWave` | checkpoint 도달 |
| `bestWallHpRemaining` | 성벽 방어 품질 |
| `bestTowerFamiliesBuilt` | 4속성 슬롯 성장 기록 |
| `timeSurvivedSec` | 세션 길이 |
| `towersSummoned` | 경제 튜닝 참고 |
| `bossesDefeated` | 보스 도달/처치 확인 |

---

## 6. Minimal Telemetry Contract

텔레메트리는 v1 출시 후 필요 시 붙인다. 서버/SDK 없이도 로컬 QA 로그로 먼저 검증할 수 있어야 한다.

| event_name | fire_when | params |
|------------|-----------|--------|
| `game_start` | 런 시작 | `run_id` |
| `boss_reached` | 보스 스폰 | `wave` |
| `checkpoint_reward_selected` | checkpoint reward 선택 | `reward_id`, `reward_type`, `wave`, `act` |
| `game_over` | 런 종료 | `final_wave`, `reason`, `time_sec` |
| `ad_reward_claim` | 광고 보상 성공 | `placement_id` |

구매 이벤트, stage clear 이벤트, mission 이벤트는 v1에서 제외한다.

---

## 7. Unity Data Bridge

Unity 전환을 위해 게임 규칙 데이터는 가능한 한 engine-neutral 형태로 유지한다.

| 데이터 | 원천 |
|--------|------|
| tower definitions | `@gld/shared` 또는 JSON export |
| unit definitions | `@gld/shared` 또는 JSON export |
| wave scaling | `@gld/shared` 또는 JSON export |
| map anchors | `main_long` layout data |
| save summary | localStorage schema와 동등한 JSON |

Unity PoC는 전체 save를 이식하기보다, 먼저 tower/unit/wave/map 데이터를 읽어 같은 최소 루프를 재현한다.

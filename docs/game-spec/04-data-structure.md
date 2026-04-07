# 데이터 Structure

> **Last Updated:** 2026-04-07  
> **Source:** Obsidian `ai/product/specs/일반모드 게임 설계 문서.md` §13  
> 스키마가 변경될 때 이 문서를 먼저 업데이트한다.

---

## 1. Save Data 스키마

현재 저장 방식: `localStorage` (서버 동기화 미구현, Phase 5 예정)

```json
{
  "profile": {
    "player_id": "string",
    "display_name": "string",
    "level": 1,
    "xp": 0,
    "gold": 0,
    "diamond": 0,
    "created_at": "ISO8601",
    "total_play_count": 0,
    "total_clear_count": 0,
    "highest_wave": 0
  },
  "collection": {
    "towers": {
      "<tower_id>": {
        "owned": true,
        "level": 1,
        "grade": "normal",
        "is_hidden": false
      }
    },
    "gacha_pity_count": 0
  },
  "progress": {
    "stages": {
      "<stage_id>": {
        "cleared": false,
        "best_time": null,
        "best_hp_remaining": null,
        "clear_count": 0
      }
    },
    "tutorial_completed": false,
    "daily_free_box_claimed_at": null,
    "daily_ad_box_count": 0,
    "daily_reset_at": "ISO8601"
  },
  "settings": {
    "bgm_volume": 0.7,
    "sfx_volume": 0.8,
    "screen_shake": true,
    "damage_numbers": true,
    "colorblind_mode": "off"
  }
}
```

---

## 2. 저장 시점

| 이벤트 | 저장 대상 |
|--------|---------|
| 전투 종료 (승/패) | profile (xp, gold, play_count), progress (stage clear) |
| 타워 승급 시도 | collection (grade, gold 차감) |
| 상자 오픈 | collection (tower 추가), profile (diamond 차감), gacha_pity |
| 설정 변경 | settings |
| 앱 백그라운드 전환 | 전체 스냅샷 |

---

## 3. 타워 ID 목록

> `<tower_id>` 유효값 (18종)

```
laser, plasma, emp, shield,
twin_laser, disruptor, nova_cannon, fortress,
stasis_field, flame_tower, wind_spire, earth_golem,
holy_shrine, dragon_nest, arcane_spire, world_tree,
celestial, divine_throne
```

---

## 4. 스테이지 ID 목록

> `<stage_id>` 유효값

| stage_id | 이름 | 해금 조건 |
|---------|------|---------|
| forest_gate | 숲의 성문 | 기본 제공 |
| lava_fortress | 용암 요새 | 프로필 LV.3 |
| storm_citadel | 폭풍 성채 | 프로필 LV.7 |

---

## 5. 열거형 (Enum)

### grade

```typescript
type TowerGrade = 'normal' | 'rare' | 'unique' | 'epic' | 'legendary';
```

### colorblind_mode

```typescript
type ColorblindMode = 'off' | 'protan' | 'deutan' | 'tritan';
```

### element

```typescript
type ElementType = 'fire' | 'water' | 'lightning' | 'neutral';
```

---

## 6. 텔레메트리 이벤트 맵

> Phase 5에서 구현 예정. 코드 위치 TBD.

| event_name | fire_when | parameters | primary_kpi |
|------------|----------|-----------|------------|
| game_start | run 시작 시 | stage_id, mode, run_id | DAU |
| tower_placed | 타워 배치 시 | tower_id, x, y, wave_slot | core engagement |
| energy_spent | 에너지 소비 배치 시 | tower_id, energy_cost, wave_slot | economy |
| boss_warning | 보스 경고 시 | stage_id, slot_index | encounter reach |
| game_over | 전투 종료 시 | result, reason, final_slot | clear rate |
| stage_clear | 스테이지 클리어 시 | stage_id, time, hp_remaining | progression |
| purchase_offer | 상품 구매 시 | sku_id, price | conversion |
| ad_reward_claim | 광고 보상 수령 시 | placement_id, reward | ad monetization |

---

## 7. React ↔ Phaser 설정 동기화

게임 설정(`showDamageNumbers` 등)은 React Zustand store에서 관리하고, Phaser로 실시간 전파한다.

```
[React] gameStore.toggleDamageNumbers()
    ↓ Zustand subscribe (PhaserGame.tsx)
[Bridge] game.registry.set('showDamageNumbers', value)
    ↓ Phaser DataManager changedata 이벤트
[Phaser] DamageNumberSystem.setEnabled(value)
```

| 구간 | 구현 파일 | 메커니즘 |
|------|---------|---------|
| 초기값 전달 | `PhaserGame.tsx` | `game.registry.set()` at mount |
| 런타임 동기화 | `PhaserGame.tsx` | `useGameStore.subscribe()` → `registry.set()` |
| Phaser 수신 | `Game.ts` | `game.registry.events.on('changedata-KEY')` |
| 정리 | `PhaserGame.tsx` | `unsubscribe()` at unmount |

---

## 8. 버전 관리 전략

- 스키마 변경 시 `localStorage`의 `schema_version` 필드를 업데이트한다.
- 마이그레이션 로직은 `packages/web-shell/src/stores/` 내 별도 함수로 관리한다.
- 서버 동기화 추가 시 conflict resolution 전략: last-write-wins (초기), 이후 merge 전략 검토.

---

## 8. 변경 이력

| 날짜 | 항목 | 변경 내용 |
|------|------|---------|
| 2026-04-07 | 최초 작성 | GDD §13 기반 |
| 2026-04-07 | §7 | React↔Phaser 설정 동기화 아키텍처 추가 |

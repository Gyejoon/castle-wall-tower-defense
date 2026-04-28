# Monster Sprite Dark Fairy Medieval Redesign

## Context

현재 몬스터 에셋은 절차 생성 픽셀 스프라이트로 구성되어 있고, 정식 모드 필드가 Tiny Swords 기반의 숲/모래/중세 톤으로 리워크되면서 몬스터도 같은 톤으로 정리할 필요가 있다.

사용자는 "현재 몬스터 에셋들을 좀더 예쁘게, 우리 컨셉에 맞게" 변경을 요청했고, 브라우저 비교판에서 `B / Dark Fairy Medieval` 방향을 선택했다.

## Goal

- 40x48 일반 유닛 프레임 규격과 96x96 보스 규격을 유지한다.
- 기존 walk/idle/death 애니메이션 계약을 유지한다.
- 각 일반 몬스터가 작은 모바일 화면에서도 한눈에 읽히는 대표 실루엣을 갖게 한다.
- 필드/타워와 충돌하지 않도록 색은 탁한 자연색을 기본으로 하고, 마법색은 눈/균열/무기 포인트에 제한한다.
- 생성 스크립트와 산출물을 함께 갱신해 재생성 가능성을 보존한다.

## Visual Direction

`Dark Fairy Medieval`: 숲속 침입자, 낡은 갑주, 돌/이끼, 그림자 마법을 중심으로 한 다크 동화풍.

| Unit | Readable Motif | Polish Target |
|------|----------------|---------------|
| `scout_drone` | 약탈 보따리 + 노란 눈 + 낡은 후드 | 등짐/막대/동전 포인트를 정돈하고 작은 체형을 더 귀엽지만 수상하게 만든다 |
| `battle_robot` | 반쪽 강탈 갑주 + 큰 도끼 + 뿔/이빨 | 좌우 비대칭 갑주 대비를 키우고 눈/도끼/어깨 실루엣을 강화한다 |
| `heavy_walker` | 이끼 낀 돌 거인 + 곤봉 | 어깨 덩어리, 균열, 이끼, 곤봉을 더 명확히 해 큰 유닛으로 읽히게 한다 |
| `stealth_drone` | 후드 망령 + 보라 눈 + 안개 하체 | 하체 연기와 망토 가장자리의 형태를 보강해 단순한 보라 덩어리로 보이지 않게 한다 |
| `dragon` / boss | 고대 화염 드래곤 | 기존 보스감은 유지하되 일반 몬스터 팔레트와 연결되는 어두운 적대 톤을 유지한다 |

## Implementation Scope

- Modify:
  - `scripts/generate-assets/units/goblin-scavenger.ts`
  - `scripts/generate-assets/units/orc-veteran.ts`
  - `scripts/generate-assets/units/stone-troll.ts`
  - `scripts/generate-assets/units/shadow-assassin.ts`
  - `scripts/generate-assets/generate-units.ts` if shared polish helpers are needed
  - `docs/game-spec/07-asset-definition.md`
- Regenerate only unit sprites under `packages/web-shell/public/assets/units/`.
- Do not run full `bun generate:assets`, because unrelated ComfyUI-backed assets can be replaced in environments without ComfyUI.

## Quality Gates

- Generated PNG and WebP assets both exist for affected unit sprites.
- Spritesheet dimensions remain unchanged:
  - walk: 320x48, 8 frames
  - idle/death: 240x48, 6 frames
  - boss: 768x96, 8 frames
- Runtime asset keys do not change.
- Unit generation succeeds without readability gate fallback for the primary four units.
- Visual preview at browser scale shows no blank frames, clipped bodies, or unreadable silhouettes.

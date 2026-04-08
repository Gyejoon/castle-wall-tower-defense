# Ancient Dragon Boss Asset Redesign

## Context

현재 보스 몬스터 "고대 드래곤"의 에셋이 드래곤답지 않다.
원형 몸체 + 작은 삼각형 날개로 "날개 달린 오렌지색 공" 형태.
중세풍 고대 드래곤의 위엄과 공포감을 표현하도록 전면 재설계한다.

## Scope

보스 에셋 2종만 재설계:
- `titan-boss.png` (768x96, 8프레임) — Phase 1
- `titan-boss-rage.png` (768x96, 8프레임) — Phase 2

일반 유닛 `titan.png` (320x48)은 이번 스코프에서 제외.

## Design

### View & Direction

- **탑다운 정면 뷰** (다른 유닛과 시점 통일)
- **머리: 아래(진행방향)**, **꼬리: 위(뒤쪽)** — 몬스터가 위→아래로 이동하므로
- 날개는 좌우로 대칭 펼침

### Anatomy (96x96px)

```
       꼬리 스페이드 (상단 끝)
           |
       꼬리 (S자 흔들림, ~30px)
           |
      등 가시 (6개)
    ┌──────┼──────┐
    │   날개(좌)  몸체  날개(우)   │  ← 좌우 ~34px씩 뻗음
    └──────┼──────┘
       다리 (4개, 옆으로)
           |
       목 (연결부)
           |
     뿔(좌)  머리  뿔(우)  ← 뿔은 위쪽(뒤)으로 휘어짐
         눈(좌) 눈(우)
           |
        주둥이 (아래, 뾰족)
         콧구멍
           |
       화염 브레스 (아래쪽으로)
```

### Color Palette (Dark & Evil)

| Part | Color | Hex |
|------|-------|-----|
| Body deep (darkest) | 거의 블랙 | `#1a0404` |
| Body dark | 매우 어두운 레드 | `#2a0808` |
| Body base | 기본 몸체 | `#3a0e0e` |
| Body mid | 중간톤 | `#4a1212` |
| Body light | 하이라이트 | `#5a1818` |
| Belly | 배 비늘 | `#602020` |
| Belly glow | 배 용암 글로우 | `#803020` |
| Wing bone | 날개 뼈대 | `#200404` |
| Wing membrane | 날개 막 | `#180303` (alpha 0.67) |
| Spine/Ridge | 등 가시 | `#1a0e04` |
| Horn | 뿔 | `#2a1a0a` |
| Claw | 발톱 | `#0a0402` |
| Eye (normal) | 황금 | `#e0b040` |
| Eye (rage) | 붉은 글로우 | `#ff1010` |
| Fire core | 불꽃 코어 | `#ffe060` |
| Fire orange | 불꽃 주황 | `#e07020` |
| Fire red | 불꽃 빨강 | `#c03020` |

### Animation (8-Frame Walk Cycle)

**프레임 0-7, sin 기반 애니메이션:**

| Element | Motion | Amplitude | Phase Offset |
|---------|--------|-----------|-------------|
| Wing flap | 비대칭 (다운 빠르게, 업 느리게) | +6/-4 px | 0 |
| Wing spread | 미세 확장/수축 | ±8% | 0 |
| Tail swing | S자 좌우 | ±6px, ±4px | π*0.6, π |
| Head bob | 상하 | ±1px | 2x speed |
| Body bob | 상하 | ±0.5px | 2x speed |
| Breath scale | 확장/수축 | ±2% | 2x speed |
| Leg walk | 4다리 교차 | ±3px | 0, π |
| Fire breath | 4프레임 주기 분출 | 5-7px length | frame % 4 |

### Phase 1 (Normal) vs Phase 2 (Rage)

| Feature | Phase 1 | Phase 2 (Rage) |
|---------|---------|----------------|
| Eye color | `#e0b040` (황금) | `#ff1010` (빨강), 글로우 반경 7px |
| Fire color | `#e07020` (오렌지) | `#c03020` (레드) |
| Fire length | 5px | 7px |
| Belly glow | alpha 0.15, 맥동 ±0.05 | alpha 0.35, 맥동 ±0.1 |
| Wing membrane | `#180303` alpha 0.67 | `#2a0606` alpha 0.8, 내부 레드 글로우 |
| Body overlay | 없음 | `rgba(140,20,10,0.1)` 전체 틴트 |
| Lava cracks | 없음 | 몸체에 용암 균열선 5개, alpha 0.25 |
| Body edge glow | 없음 | 레드 아웃라인 글로우 |
| Tail fire | 없음 | 꼬리 끝 화염 잔광 |

### Drawing Order (back to front)

1. Fire aura (ground glow)
2. Shadow (ellipse)
3. Tail + tail spines + tail spade
4. Wings (left, right) — membrane + bones + tips
5. Back legs (2)
6. Body ellipse + spine ridge + scale texture + belly glow
7. Spine ridges (6)
8. Front legs (2)
9. Neck connection
10. Head + horns + eyes + nostrils
11. Fire breath + smoke particles
12. Rage overlay (if phase 2)

## Implementation Notes

### Files to Modify

- `scripts/generate-assets/generate-units.ts` — `drawBossFrame()`, `drawBossDragon()` 재작성
- `scripts/generate-assets/shared.ts` — 새 팔레트 색상 추가 (optional, 인라인 가능)

### Constraints

- `@napi-rs/canvas` 픽셀 드로잉 API 사용 (`setPixel`, `drawLine`, `fillCircle`, `drawRect`, `addGlow`, `drawPolygon`)
- Canvas API의 `beginPath/fill/stroke`, `createRadialGradient` 등은 `@napi-rs/canvas`에서도 지원
- 출력: 768x96 PNG (8프레임 x 96x96)
- 가독성 게이트: 불투명도 커버리지 13~52%
- Rage 버전은 `applyColorTint()` 기존 로직 유지 가능하지만, 용암 균열 등 추가 이펙트는 `drawBossFrame(rage=true)` 내에서 처리

### Existing Functions to Reuse

- `makeCanvas(w, h)` — 캔버스 생성
- `saveCanvas(canvas, path)` — PNG 저장
- `hexToRgba(hex, alpha)` — 색상 변환
- `setPixel`, `drawRect`, `drawCircle`, `fillCircle`, `drawLine` — 기본 드로잉
- `addGlow(ctx, cx, cy, radius, color, alpha)` — 글로우 이펙트
- `drawIsoShadow` — 그림자
- `walkPhase(frame)` — 프레임 위상 계산
- `applyColorTint()` — rage 틴트 (기존 방식 유지 시)

## Verification

1. `bun run scripts/generate-assets/generate-all.ts` 실행
2. `packages/web-shell/public/assets/units/titan-boss.png` 이미지 확인
3. `packages/web-shell/public/assets/units/titan-boss-rage.png` 이미지 확인
4. 가독성 게이트 통과 확인 (콘솔 에러 없음)
5. 개발 서버에서 보스 웨이브 도달 후 인게임 확인
6. Phase 1 → Phase 2 전환 시 시각적 차이 확인

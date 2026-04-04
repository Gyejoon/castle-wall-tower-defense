# Game Asset Production Roadmap

## 1. Context & Goals

PVP→PVE 피벗 이후, 에셋 파이프라인에 PVP 잔재가 남아있고 PVE 핵심 시각 요소(속성, 보스, 등급, 멀티 스테이지, 가챠)가 부재하다. 이 spec은 현재 ~234개 에셋을 ~329개로 확장하는 전체 로드맵을 정의한다.

**목표**: 6개 Batch에 걸쳐 PVP 잔재 제거(−10) + PVE 핵심 에셋 105개 추가 → 순 +95
**파이프라인**: @napi-rs/canvas 절차적 픽셀 아트 전용
**타일셋**: Tiny Swords 스타일 확장

---

## 2. 공통 사양

### 파이프라인

| 항목 | 값 |
|---|---|
| 도구 | `@napi-rs/canvas` (TypeScript, 서버사이드) |
| 스크립트 위치 | `scripts/generate-assets/` |
| 출력 경로 | `packages/web-shell/public/assets/` |
| 포맷 | PNG (원본) + WebP (런타임, `convert-webp.ts`) |
| 매니페스트 | `asset-manifest.json` (자동 생성) |

### 해상도 규칙

| 대상 | 해상도 | 비고 |
|---|---|---|
| 타워/유닛/타일 | 64×64px | base resolution |
| 보스 | 96×96px | 확대 스케일 |
| Spritesheet | 256×64px | 4프레임 가로 연결 |
| Pivot | center (0.5, 0.5) | 모든 스프라이트 |
| Trim | 불허 | 고정 프레임 크기 유지 |

### 속성 색상

| 속성 | 1차 색상 | 적용 |
|---|---|---|
| 화(Fire) | `#e74c3c` | 타워 악센트, 적 틴트, 투사체 |
| 수(Water) | `#3498db` | 타워 악센트, 적 틴트, 투사체 |
| 번개(Lightning) | `#f39c12` | 타워 악센트, 적 틴트, 투사체 |
| 무(Neutral) | `#c8a04a` | 기본 색상 |

### 티어별 시각 규칙

| Tier | 크기 배율 | 글로우 |
|---|---|---|
| 1 일반 | 1.0x | 없음 |
| 2 레어 | 1.05x | 약한 외곽선 |
| 3 유니크 | 1.10x | 속성 색 글로우 |
| 4 에픽 | 1.15x | 메탈릭 + 오라 |
| 5 전설 | 1.20x | 방사형 + 파티클 |

### 팔레트

`scripts/generate-assets/shared.ts`의 `PALETTE` 상수 사용. 중세 자연 테마 60+ 색상.

---

## 3. Batch 0 — PVP 정리 (−10 에셋)

> Phase 0 지원. 즉시 실행.

### 작업

1. PVP 전용 에셋 식별: `pressure-*`, `ghost-*`, `match-draw`, `match-victory`, `match-defeat`
2. 매니페스트에서 deprecated 태깅 (즉시 삭제 아님)
3. `generate-pressure-ui.ts` — `generate-all.ts`에서 제거
4. `generate-match-ui.ts` — PVE 결과 화면으로 전환 판단 (Batch 1에서 교체)

### Generator 변경

| 생성기 | 액션 |
|---|---|
| `generate-pressure-ui.ts` | 폐기 (`generate-all.ts`에서 제거) |
| `generate-match-ui.ts` | deprecated 태깅 (Batch 1에서 `generate-result-ui.ts`로 대체) |

---

## 4. Batch 1 — 속성/보스/결과 (+25 에셋)

> Phase 0~1 지원. 핵심 전투 시각 요소.

### 에셋 목록

| 에셋 | 수량 | 해상도 | 설명 |
|---|---|---|---|
| 속성 뱃지 오버레이 | 4종 (화/수/번개/무) | 16×16 | 타워/적 위에 표시 |
| 속성별 투사체 변형 | 3종 (화/수/번개) | 256×64 | 기존 투사체 + 속성 색상 |
| 속성별 히트 플래시 | 3종 | 256×64 | 속성 색상 히트 이펙트 |
| titan 보스 스프라이트 | 1종 | 96×96 (static) | 확대 드래곤 |
| titan phase 2 변형 | 1종 | 96×96 | 분노 상태 색상 변화 |
| 보스 경고 텍스트 | 2종 | 256×64 | "WARNING", "FINAL BOSS" |
| 보스 텔레그래프 마커 | 1종 | 64×64 | 위험 구역 표시 |
| 보스 사망 FX | 1종 | 256×64 (4frame) | 보스 전용 소멸 |
| 방어 성공 화면 | 1종 | 256×128 | "STAGE CLEAR" |
| 방어 실패 화면 | 1종 | 256×128 | "DEFENSE FAILED" |
| 에너지 게이지 | 1종 | 128×16 | 에너지 바 |
| 보스 HP바 | 1종 | 256×16 | 보스 전용 체력바 |

### Generator 변경

| 생성기 | 액션 | 변경 내용 |
|---|---|---|
| `generate-towers.ts` | 수정 | 속성 색상 악센트 추가 (element → 색상 매핑) |
| `generate-units.ts` | 수정 | 속성 틴팅 추가, titan 보스 스케일 옵션 |
| `generate-projectiles.ts` | 수정 | 속성별 투사체 변형 3종 추가 |
| `generate-vfx.ts` | 수정 | 보스 FX, 속성 히트 플래시 추가 |
| `generate-ui.ts` | 수정 | 에너지 게이지, 보스 HP바 추가 |
| `generate-result-ui.ts` | **신규** | PVE 결과 화면 (match-ui 대체) |

---

## 5. Batch 2 — 등급/강화 UI (+20 에셋)

> Phase 2 지원. 메타 성장 시각 요소.

### 에셋 목록

| 에셋 | 수량 | 해상도 | 설명 |
|---|---|---|---|
| 등급 프레임 | 5종 (일반~전설) | 72×72 | 타워 카드 테두리 |
| 승급 글로우 오버레이 | 3종 (레어/유니크/에픽) | 72×72 | 승급 시 발광 |
| 레벨 뱃지 | 1종 (숫자 합성) | 24×24 | 레벨 표시 |
| 타워 카드 배경 | 5종 (등급별) | 80×120 | 컬렉션 카드 |
| 강화 버튼 | 3상태 | 120×40 | 가능/불가/완료 |
| 승급 버튼 | 2상태 | 120×40 | 가능/불가 |
| 성공/실패 이펙트 | 2종 | 256×64 (4frame) | 강화/승급 결과 |

### Generator 변경

| 생성기 | 액션 |
|---|---|
| `generate-rarity-frames.ts` | **신규** — 등급 프레임, 글로우, 카드 배경 |
| `generate-ui.ts` | 수정 — 강화/승급 버튼 추가 |
| `generate-vfx.ts` | 수정 — 강화/승급 이펙트 추가 |

---

## 6. Batch 3 — 멀티 스테이지 (+30 에셋)

> Phase 3 지원. 새 맵 테마.

### 에셋 목록

| 에셋 | 수량 | 설명 |
|---|---|---|
| lava_fortress 타일셋 | 1세트 | 붉은/주황 화산 팔레트, Tiny Swords 스타일 |
| lava_fortress 경로 타일 | 1세트 | 용암 경로 |
| lava_fortress 장식 | 4~6종 | 용암 바위, 화산 분출구, 잔해 |
| lava_fortress 타일맵 | 1 JSON | Tiled 포맷, 2경로 |
| storm_citadel 타일셋 | 1세트 | 짙은 파랑/보라 전기 팔레트, Tiny Swords 스타일 |
| storm_citadel 경로 타일 | 1세트 | 번개 경로 |
| storm_citadel 장식 | 4~6종 | 번개 기둥, 폭풍 잔해, 결정체 |
| storm_citadel 타일맵 | 1 JSON | Tiled 포맷, 3경로 |
| 스테이지 선택 썸네일 | 3종 | 128×96 미리보기 |
| 잠금/해제 아이콘 | 2종 | 32×32 |

### Generator 변경

| 생성기 | 액션 | 변경 내용 |
|---|---|---|
| `generate-tiles.ts` | 수정 | 멀티 팔레트 지원 (forest/lava/storm) |
| `generate-tileset.ts` | 수정 | 테마별 타일셋 생성 |
| `generate-map.ts` | 수정 | 멀티 스테이지 맵 생성, 다중 경로 지원 |
| `generate-ui.ts` | 수정 | 스테이지 선택 썸네일, 잠금 아이콘 |

### Tiny Swords 확장 전략

새 타일셋은 기존 Tiny Swords 팔레트를 색상 변환하여 시각적 일관성을 유지한다:
- `forest_gate`: 기존 Tiny Swords 그대로 (초록/갈색)
- `lava_fortress`: 붉은/주황 re-coloring
- `storm_citadel`: 짙은 파랑/보라 re-coloring

---

## 7. Batch 4 — 튜토리얼/가챠 (+15 에셋)

> Phase 4 지원. 온보딩과 수집 시각 요소.

### 에셋 목록

| 에셋 | 수량 | 설명 |
|---|---|---|
| 하이라이트 프레임 | 1종 | 튜토리얼 대상 강조 |
| 화살표 표시기 | 4방향 | 튜토리얼 안내 |
| 힌트 말풍선 | 1종 | 텍스트 컨테이너 |
| 무료 상자 | 1종 | 일반 상자 스프라이트 |
| 광고 상자 | 1종 | 광고 아이콘 상자 |
| 다이아 상자 | 1종 | 보석 장식 상자 |
| 프리미엄 상자 | 1종 | 최고급 장식 상자 |
| 상자 열기 애니메이션 | 1종 | 256×64 (4frame) |
| 등급 공개 FX | 5종 (등급별) | 등급 색상 이펙트 |
| "NEW!" 뱃지 | 1종 | 24×24 |

### Generator 변경

| 생성기 | 액션 |
|---|---|
| `generate-tutorial-ui.ts` | **신규** — 하이라이트, 화살표, 말풍선 |
| `generate-gacha-ui.ts` | **신규** — 상자 스프라이트, 열기 애니, 뱃지 |
| `generate-vfx.ts` | 수정 — 등급별 공개 FX |

---

## 8. Batch 5 — 상점/미션 (+15 에셋)

> Phase 5 지원. 수익화 UI.

### 에셋 목록

| 에셋 | 수량 | 설명 |
|---|---|---|
| 골드 아이콘 | 1종 | 화폐 표시 |
| 다이아몬드 아이콘 | 1종 | 프리미엄 화폐 |
| 오퍼 카드 배경 | 3종 (가격대별) | 상점 상품 카드 |
| 구매 버튼 | 2상태 | 가능/불가 |
| 미션 아이콘 | 4~6종 | 일일/주간 미션 유형별 |
| 완료 체크마크 | 1종 | 미션 완료 표시 |
| 광고 버튼 | 1종 | 광고 시청 CTA |

### Generator 변경

| 생성기 | 액션 |
|---|---|
| `generate-ui.ts` | 수정 — 화폐 아이콘, 버튼, 미션 UI |

---

## 9. Generator 총괄 매트릭스

### 수정 대상 (8개)

| 생성기 | Batch | 주요 변경 |
|---|---|---|
| `generate-towers.ts` | 1 | 속성 색상 악센트 |
| `generate-units.ts` | 1 | 속성 틴팅, 보스 스케일 |
| `generate-projectiles.ts` | 1 | 속성별 변형 |
| `generate-vfx.ts` | 1, 2, 4 | 보스/강화/가챠 FX |
| `generate-ui.ts` | 1, 2, 3, 5 | PVE UI 전반 |
| `generate-tiles.ts` | 3 | 멀티 팔레트 |
| `generate-tileset.ts` | 3 | 멀티 테마 |
| `generate-map.ts` | 3 | 멀티 스테이지 |

### 신규 (4개)

| 생성기 | Batch | 용도 |
|---|---|---|
| `generate-result-ui.ts` | 1 | PVE 결과 화면 (match-ui 대체) |
| `generate-rarity-frames.ts` | 2 | 등급 프레임, 카드 배경 |
| `generate-tutorial-ui.ts` | 4 | 튜토리얼 오버레이 |
| `generate-gacha-ui.ts` | 4 | 가챠/상자 UI |

### 폐기 (2개)

| 생성기 | Batch | 사유 |
|---|---|---|
| `generate-pressure-ui.ts` | 0 | PVP 잔재 |
| `generate-match-ui.ts` | 0→1 | PVE 결과 UI로 대체 |

---

## 10. generate-all.ts 업데이트 계획

각 Batch 완료 시:
1. 새 생성기를 `generate-all.ts`의 `Promise.all` 병렬 실행 목록에 추가
2. 폐기 생성기를 목록에서 제거
3. `convert-webp.ts`가 새 PNG를 처리하는지 확인
4. `asset-manifest.json`에 새 에셋이 정상 등록되는지 확인

---

## 11. 품질 검증 체크포인트

### Batch 완료 시마다

- `bun run scripts/generate-assets/generate-all.ts` 실행 성공
- 새 에셋이 `public/assets/`에 생성됨
- WebP 변환 완료 (모든 PNG에 .webp 쌍)
- `asset-manifest.json`에 누락 없이 등록
- 게임 크기에서 시각적 가독성 확인 (64×64 기준)
- 키 충돌 없음

### 전체 완료 시

- 역할 silhouette 구분 가능
- 속성 색상 즉시 읽힘
- 티어/등급 시각 체감
- Phaser에서 정상 로드 (콘솔 에러 없음)
- 모든 PNG에 WebP 쌍 존재

---

## 12. 에셋 인벤토리 현황표

### 현재 (234개)

| 카테고리 | 파일 수 | 생성기 | 상태 |
|---|---|---|---|
| 타워 스태틱 | 18 | `generate-towers.ts` | 완료 |
| 타워 공격 애니 | 18 | `generate-towers.ts` | 완료 |
| 유닛 walk | 5 | `generate-units.ts` | 완료 |
| 유닛 death | 1 | `generate-units.ts` | 완료 |
| 투사체 | 4 | `generate-projectiles.ts` | 부분 |
| VFX | 4 | `generate-vfx.ts` | 부분 |
| UI | ~34 | `generate-ui.ts` 외 | PVP 혼재 |
| UI 모바일 | ~44 | `generate-ui-mobile.ts` | 완료 |
| 타일 | tileset | `generate-tiles/tileset.ts` | forest만 |
| 맵 | 1 JSON | `generate-map.ts` | forest만 |
| 아이콘 | ~8 | `generate-icons.ts` | 완료 |
| vendor | Tiny Swords | N/A | 완료 |

### 최종 목표 (~329개)

| Batch | 변동 | 누적 |
|---|---|---|
| 현재 | — | 234 |
| B0: PVP 정리 | −10 | 224 |
| B1: 속성/보스/결과 | +25 | 249 |
| B2: 등급/강화 | +20 | 269 |
| B3: 멀티 스테이지 | +30 | 299 |
| B4: 튜토리얼/가챠 | +15 | 314 |
| B5: 상점/미션 | +15 | 329 |

---

## Verification

각 Batch 구현 후 검증 방법:

```bash
# 1. 에셋 생성 실행
bun run scripts/generate-assets/generate-all.ts

# 2. 에셋 파일 확인
ls -la packages/web-shell/public/assets/

# 3. 매니페스트 확인
cat packages/web-shell/public/assets/asset-manifest.json | bun -e "console.log(JSON.parse(await Bun.stdin.text()).length)"

# 4. WebP 변환 확인
find packages/web-shell/public/assets -name "*.png" | while read f; do [ -f "${f%.png}.webp" ] || echo "MISSING: ${f%.png}.webp"; done

# 5. 게임 실행 후 콘솔 에러 확인
bun dev:web
# 브라우저에서 http://localhost:3000 접속, 콘솔 에러 없음 확인

# 6. 린트/테스트
bun lint
bun test
```

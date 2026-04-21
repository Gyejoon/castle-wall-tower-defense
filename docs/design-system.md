# Design System

> **임시 위치**: 플랜은 `docs/game-spec/09-design-system.md`를 지정했지만
> `protect-files.sh` 훅이 game-spec 쓰기를 차단한다. 유저가 "스펙 업데이트"를
> 명시하면 이 파일을 `docs/game-spec/09-design-system.md`로 이동한다.

게임 전반의 시각 언어를 단일 진실 공급원(SSOT)으로 관리한다. 이 문서는 토큰 인벤토리, 프리미티브 API, Do/Don't 체크리스트를 다룬다. 모든 UI 작업은 이 문서의 규칙을 따른다.

## 파일 레이아웃

```
packages/shared/src/design/        ← SSOT
├── palette.ts      core / state / element / tier / surface 색상
├── typography.ts   display/h1/h2/body/label/caption 스케일
├── spacing.ts      4px base (xs..3xl)
├── radius.ts       none..pill
├── elevation.ts    픽셀 스타일 섀도 5단 + overlayDim 4단
├── zIndex.ts       board/hud/floating/overlay/modal/toast
├── motion.ts       duration 4단 + easing 4종 + preset 5종
└── tokens.ts       위 전부 barrel

packages/web-shell/src/components/ds/  ← React 프리미티브
├── Button.tsx      variant × size × state
├── Card.tsx        panel / framed / keyart × intent
├── Badge.tsx       pill / tag / counter × intent (tier-N, element-X)
├── Panel.tsx       title + body + actions slot
├── Overlay.tsx     intent: pause / result / choice / reveal
├── Sheet.tsx       bottom / top / right 앵커 + backdrop
└── __demos__/DesignSystemGallery.tsx   — `?ds=1`로 접근

packages/phaser-game/src/ui/           ← Phaser 헬퍼
├── tokens.ts       0x-format 색 어댑터, px 스페이싱, textStyle 프리셋
├── drawPanel.ts    Graphics에 프레임 그리기
├── drawBadge.ts    Graphics에 뱃지 그리기
└── textStyles.ts   TextStyle 프리셋 + makeTextStyle 헬퍼
```

## 토큰 인벤토리

### 색상 (`@gld/shared` → `core`, `state`, `element`, `tier`, `surface`)

| 그룹 | 토큰 | 값 | 용례 |
|------|------|------|------|
| core | bg | #1a1208 | 페이지 배경 |
| core | panel | #2a2010 | 카드·패널 배경 |
| core | border | #4a3a20 | 기본 보더 |
| core | accent | #c8a04a | 기본 강조 (primary 버튼, 하이라이트) |
| core | success | #7ab648 | 성공 상태 (잔디 틴트) |
| core | danger | #c03020 | 실패 상태, 적 표기 |
| core | gold | #f0d060 | 프리미엄 강조 (골드 버튼, 테두리) |
| core | info | #5bc8e8 | 정보 배지, 얼음 속성 |
| core | text | #f0e8d8 | 본문 텍스트 |
| core | textSecondary | #a09070 | 보조 텍스트, 캡션 |
| state | hover | #e0b860 | 인터랙티브 hover 링 |
| state | focus | #ffcf66 | focus-visible ring |
| state | warning | #c88c40 | 경고 (비파괴적) |
| state | pressed | #7a5a10 | 버튼 눌림 섀도 (#c8a04a dark) |
| element | fire/water/lightning/earth/neutral | primary+glow 쌍 | 속성 배지, 타워 틴트 |
| tier | 1..6 | primary/dark/bright 쌍 | 타워 등급, 합성 경로 |
| surface | panelElevated | #352818 | 상위 레이어 카드 |
| surface | panelSunken | #1f1608 | 인셋 (스탯바 트랙 등) |

### 타이포그래피 (`typography.ts`)

| 스케일 | family | size | line-height | weight | 용례 |
|--------|--------|------|-------------|--------|------|
| display40 | Press Start 2P | 40px | 1.1 | 700 | 게임오버 배너, 승리 타이틀 |
| display32 | Press Start 2P | 32px | 1.15 | 700 | 큰 숫자 카운터 |
| h1 | Galmuri11 | 24px | 1.25 | 700 | 페이지 제목 |
| h2 | Galmuri11 | 20px | 1.3 | 700 | 섹션 제목 |
| body16 | Galmuri11 | 16px | 1.4 | 400 | 기본 본문 |
| body14 | Galmuri11 | 14px | 1.4 | 400 | 보조 본문 |
| label12 | Galmuri11 | 12px | 1.2 | 700 | 버튼, 탭 라벨 |
| caption10 | Galmuri11 | 10px | 1.2 | 400 | 뱃지, 캡션 |

### 스페이싱 (`spacing.ts`)

4px base: `xs=4`, `sm=8`, `md=12`, `lg=16`, `xl=24`, `2xl=32`, `3xl=48`.
React는 Tailwind `p-md`, `gap-sm` 클래스로 소비. Phaser는 `spacingPx.md` 숫자로 소비.

### 라운드 (`radius.ts`)

`none=0`, `xs=2`, `sm=4`, `md=6`, `lg=8`, `xl=12`, `pill=9999`.
픽셀 아트 스타일이므로 `md` 이상은 DOM 오버레이에만. 대부분은 `sm`.

### 엘리베이션 (`elevation.ts`)

픽셀 스타일 solid drop shadow. 블러 없음. 레벨 0(평면)부터 4(모달)까지.
`overlayDim`: soft / default / heavy / cinematic — 오버레이 배경 딤 강도.

### Z-index (`zIndex.ts`)

**6단 강제.** `z-[N]` 리터럴 금지.
board(0) → hud(10) → floating(20) → overlay(30) → modal(40) → toast(50).

### 모션 (`motion.ts`)

duration: fast(120ms) / base(220ms) / slow(360ms) / cinematic(650ms).
easing: standard / emphatic / decelerate / stepwise.
preset: interactive / ui / overlay / punch / cinematic.

## 프리미티브 API

자세한 시그니처는 `packages/web-shell/src/components/ds/*.tsx` 소스 참조.

- `<Button variant size loading block />` — 3D 픽셀 섀도, 눌림 offset, focus 링.
- `<Card variant={panel|framed|keyart} intent highlight>` — 3종 시각 레이어.
- `<Badge variant={pill|tag|counter} intent icon>` — intent에 `tier-1..6`, `element-fire..` 지원.
- `<Panel title actions>` — Card 기반 제목+본문+액션 레이아웃.
- `<Overlay intent={pause|result|choice|reveal} dismissOnBackdrop>` — 전체 화면 딤.
- `<Sheet anchor={bottom|top|right} backdrop panel={...}>` — floating 시트.

### Phaser

```ts
import { drawPanel, drawBadge, makeTextStyle } from '@gld/phaser-game/ui';
drawPanel(g, { x, y, width, height, intent: 'accent' });
drawBadge(g, { x, y, width: 24, height: 12, intent: 'tier-3' });
const style = makeTextStyle('h1', 'gold', { stroke: '#000', strokeThickness: 2 });
```

## Do / Don't

**Do**
- 새 코드는 `@gld/shared`에서 토큰을 import. 색/간격/라운드/섀도 리터럴 금지.
- z-index는 반드시 `zIndex.*`에서 꺼내 쓰기. `z-[N]` 리터럴 금지.
- 버튼은 `<Button>`만. DOM `<button>`은 `<Button>`이 못 표현하는 예외에만.
- 새 패널 패턴 발견 시 `Card` variant 확장 PR을 먼저.

**Don't**
- `#[0-9a-f]{3,6}` 리터럴을 ds/ 외부 tsx에 쓰지 말 것.
- `z-[N]`, `p-[N]px` 같은 임의 숫자 유틸리티 금지.
- Tailwind `@theme` 외부에서 `--color-*`, `--spacing-*` 재정의 금지.
- ComfyUI 기반 에셋은 `bun generate:assets`로 덮어쓰지 말 것. 유저 요청 시에만 실행.

## 마이그레이션 현황

| 영역 | 상태 |
|------|------|
| 토큰 SSOT (`design/*`) | Phase 1 완료 |
| Tailwind `@theme` 확장 | Phase 1 완료 |
| `ui-colors.ts` 어댑터 | Phase 1 완료 |
| `PHASER_COLORS` 어댑터 | Phase 1 완료 |
| `scripts/generate-assets/shared.ts` core/element/tier | Phase 1 완료 |
| ds/ 프리미티브 6개 + Gallery | Phase 2 완료 |
| PixelButton/PixelPanel wrap | Phase 2 완료 |
| CurrencyIcon 토큰화 | Phase 2 완료 |
| Phaser `ui/drawPanel`, `drawBadge`, `textStyles` | Phase 2 완료 |
| 로비 (HomeTab/ProfileBar/CollectionTab/BottomTabBar) | Phase 3-A 미진행 |
| 게임 HUD (TopHud/PhaseAHud) | Phase 3-B 미진행 |
| 오버레이 (TowerActionSheet/Upgrade/Summon/Pause/GameOver) | Phase 3-C 진행 중 |
| Phaser in-canvas HUD (data indicator, wave warning) | Phase 3-D 미진행 |
| 절차적 에셋 5-tone 셰이딩 | Phase 3-E (유저 요청 시만) |

## 버전 기록

- 2026-04-20 — v0.1: Phase 1·2 초기 구축. 토큰 SSOT + 6 프리미티브 + Phaser helpers + 갤러리.

## 참고

- 갤러리: `bun dev:web` → `http://localhost:3000/?ds=1`
- 디자인 스킬: `.claude/skills/game-ui-design/SKILL.md`
- 에셋 규칙: `docs/game-spec/07-asset-definition.md`

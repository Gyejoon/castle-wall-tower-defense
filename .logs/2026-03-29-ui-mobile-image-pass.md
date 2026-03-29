# 2026-03-29 UI Mobile Image Pass

## 컨텍스트

- 요청: `grid-line-defense-pvp` 저장소의 모바일 세로형 버티컬 슬라이스에 맞는 네온 택티컬 SF 이미지 3종 생성
- 요구 산출물:
  - 로비 키아트
  - 전술 도크 배경
  - CTA 포인트 아트
- 제약:
  - built-in `image_gen` 도구가 이 세션에 없음
  - 기존 파일 덮어쓰기 금지
  - 생성 결과를 실제 UI에 연결

## 생성 방식

- built-in `image_gen` 미노출로 인해 `@napi-rs/canvas` 기반 절차 생성으로 대체
- 생성 스크립트:
  - `scripts/generate-assets/generate-ui-mobile.ts`
- 검토용 보드:
  - `.logs/artifacts/ui-mobile-variant-board-v20260329.png`
- 생성 메타데이터:
  - `.logs/artifacts/ui-mobile-generation-v20260329.json`

## 프롬프트 / 브리프

### Lobby Keyart

- `a`
  - `vertical neon tactical corridor with clean title space, cyan-magenta lane grid, lower defensive towers, top and bottom cores, premium mobile key art`
- `b`
  - `vertical tactical command vista with wider lane, stronger magenta pressure, brighter gold core, cinematic sci-fi defense poster for mobile lobby`
- `c`
  - `clean tactical poster with sharper radar overlays, narrow corridor, colder cyan instrumentation, negative space reserved for logo lockup`

### Tactical Dock Background

- `a`
  - `quiet premium mobile tactical dock with restrained cyan edge light, dark compartment grid, low-noise center area for controls`
- `b`
  - `mobile sci-fi tactics panel with compartment bays, cyan-violet edge accent, subtle radar sweep, premium HUD surface`
- `c`
  - `heavier cyan command console with radar sweep geometry, layered dark glass panels, still readable under overlaid buttons`

### CTA Point Art

- `a`
  - `compact off-center cyan and magenta energy crossfire, transparent-friendly tactical CTA accent with readable center zone`
- `b`
  - `three-node tactical energy flare with gold orbital ring, premium mobile CTA accent, controlled brightness and transparent falloff`
- `c`
  - `magenta-led energy nexus with cyan relay line, low-noise premium start button accent, diagonal motion and transparent edges`

## 선택한 결과 파일

- 로비 키아트
  - `packages/web-shell/public/assets/ui-mobile/lobby-keyart-v20260329-b.png`
  - 선택 이유: 세로 구도 균형이 가장 좋고, 하단 타워 군집과 상단 압력이 명확해서 로비용 키아트로 가장 읽기 쉬웠다.
- 전술 도크 배경
  - `packages/web-shell/public/assets/ui-mobile/tactical-dock-bg-v20260329-a.png`
  - 선택 이유: 컨트롤 가독성을 해치지 않으면서도 네온 패널 톤을 유지했다.
- CTA 포인트 아트
  - `packages/web-shell/public/assets/ui-mobile/cta-point-art-v20260329-c.png`
  - 선택 이유: 마젠타/시안 대비가 가장 선명했고 버튼군 뒤에 포인트로 쓰기 적합했다.

## 폐기한 변형

- 로비 키아트
  - `packages/web-shell/public/assets/ui-mobile/lobby-keyart-v20260329-a.png`
  - `packages/web-shell/public/assets/ui-mobile/lobby-keyart-v20260329-c.png`
- 전술 도크 배경
  - `packages/web-shell/public/assets/ui-mobile/tactical-dock-bg-v20260329-b.png`
  - `packages/web-shell/public/assets/ui-mobile/tactical-dock-bg-v20260329-c.png`
- CTA 포인트 아트
  - `packages/web-shell/public/assets/ui-mobile/cta-point-art-v20260329-a.png`
  - `packages/web-shell/public/assets/ui-mobile/cta-point-art-v20260329-b.png`

## 적용 내용

- `packages/web-shell/src/assets/uiMobileArt.ts`
  - 채택된 UI 모바일 아트 경로 상수 추가
- `packages/web-shell/src/pages/LobbyPage.tsx`
  - 중간 히어로 패널 배경에 `lobby-keyart-v20260329-b.png` 연결
  - 하단 `START RUN` CTA 패널 배경에 `cta-point-art-v20260329-c.png` 연결
- `packages/web-shell/src/pages/GamePage.tsx`
  - 전술 도크 컨테이너 배경에 `tactical-dock-bg-v20260329-a.png` 연결
  - 하단 `START WAVE` / `RESET` 액션 행 배경에 `cta-point-art-v20260329-c.png` 연결

## 메모

- 이 패스는 실제 AI 이미지 생성이 아니라 절차적 캔버스 생성이다.
- built-in `image_gen`이 다시 제공되는 세션이 열리면, 본 로그의 프롬프트를 그대로 사용해 고해상도 재생성 패스를 진행할 수 있다.

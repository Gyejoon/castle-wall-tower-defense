# 2026-03-29 Mobile Vertical Slice Log

## 컨텍스트

- 작업 경로: `/Users/lio/Documents/personal/github/grid-line-defense-pvp`
- 목표: 기존 프로토타입을 모바일 세로형 싱글 플레이 버티컬 슬라이스로 승격
- 사용자 결정:
  - 싱글 버티컬 슬라이스 범위
  - 모바일 세로 화면 기준, 데스크톱은 동일 프레임 미러
  - 네온 택티컬 SF 비주얼
  - 합성 타워 제외, 기본 4타워 집중

## 초기 진단

- 기존 `bun test`는 통과 상태였다.
- 기존 `bun build:web`는 통과했지만 단일 대형 청크 경고가 있었다.
- 390x844에서 기존 UI는 보드 폭이 약 802px로 남고 사이드패널이 화면 밖으로 밀려 모바일 플레이가 불가능했다.
- 전투 중에도 타워 배치가 가능했고, 선택은 `col=-1,row=-1` 센티널 이벤트로 처리되고 있었다.

## OpenAI Docs 참고

- 이미지 생성 도구 가이드:
  [developers.openai.com/api/docs/guides/tools-image-generation](https://developers.openai.com/api/docs/guides/tools-image-generation/)
- `gpt-image-1.5` 프롬프트 구조 가이드:
  [developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide/#2-prompting-fundamentals](https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide/#2-prompting-fundamentals)
- 이번 세션에는 built-in `image_gen` 도구가 노출되지 않아 AI 생성 이미지는 실제 생산하지 못했다.
- 대신 해당 가이드의 프롬프트 구조를 바탕으로 추후 생성용 프롬프트를 아래에 기록했다.

## 구현 요약

### UI / UX

- `LobbyPage`를 모바일 세로형 타이틀 화면으로 재구성
- `GamePage`를 상단 HUD + 정사각형 보드 + 하단 전술 도크 구조로 재구성
- `App.tsx`에서 `GamePage` 지연 로딩 적용
- 파비콘 연결 추가

### 상태 / 계약

- `PlacementFailureReason` 공유 타입 추가
- `request-select-tower`, `request-clear-tower-selection` 이벤트 추가
- `tower-placed`에 `reason` 추가
- `gameStore`를 `runStatus`, `placementFeedback`, `runId`, `resetRun`, `enterLobby` 중심으로 재구성

### Phaser 런타임

- `combat` 단계 배치 차단 추가
- 기존 타일/마커/타워/유닛 자산을 실제 런타임에 연결
- `TowerSystem`을 이미지 기반 렌더링으로 전환
- `UnitSystem`을 애니메이션 스프라이트 + HP 바 렌더링으로 전환
- `PhaserGame` cleanup에서 전역 EventBus 리스너 전체 삭제 제거

## 실행 명령과 결과

### 테스트

```bash
bun test
```

- 결과: `42 pass`, `0 fail`

### 빌드

```bash
bun build:web
```

- 결과: 성공
- 참고: `dist/assets/GamePage-Clr1_spQ.js`가 약 `1.5 MB`로 여전히 chunk size warning이 남아 있다.

## Playwright QA 메모

### 모바일 390x844

- 로비 첫 화면: 브랜드, 설명, 핵심 포인트, CTA가 모두 첫 뷰포트 안에 보임
- 게임 화면: 보드와 도크가 동시에 보이며 문서 스크롤 없음
- 보드 치수: `342 x 342`
- 도크 버튼과 CTA가 모두 초기 뷰포트에 포함됨
- 건설 단계에서 타워 배치 확인
- 전투 중 동일 선택 상태로 보드 클릭 시 `Build phase only...` 실패 피드백 확인

### 데스크톱 1600x900

- 세로형 모바일 쉘이 중앙에 유지됨
- 문서 스크롤 없음
- 브라우저 콘솔 에러 없음

## 스크린샷 증적

- 모바일 로비: `.logs/artifacts/mobile-lobby.png`
- 모바일 전투 차단 피드백: `.logs/artifacts/mobile-feedback.png`
- 데스크톱 세로형 쉘: `.logs/artifacts/desktop-shell.png`

## imagegen 프롬프트 초안

### 1. 로비 키아트

```text
Use case: stylized-concept
Asset type: mobile game lobby hero
Primary request: create a neon tactical sci-fi battlefield key art for a vertical mobile tower defense title screen
Scene/backdrop: dark futuristic corridor battlefield with glowing grid lines and a single defense lane
Subject: two opposing neon cores at the ends of the lane and a compact cluster of defense towers near the player side
Style/medium: polished stylized 2D game concept art, readable at small mobile sizes
Composition/framing: vertical composition with clear negative space in the upper-middle area for title text
Lighting/mood: electric cyan, magenta, and gold glow over a dark navy background
Color palette: deep navy base, purple shadow tones, cyan and magenta highlights, gold accent
Constraints: no text, no watermark, no logos, keep the center lane visually clean
Avoid: UI frames, extra characters, cluttered background details
```

### 2. 전술 도크 배경판

```text
Use case: ui-mockup
Asset type: mobile HUD dock background
Primary request: create a clean rectangular HUD panel background for a mobile sci-fi strategy game
Scene/backdrop: transparent or near-black panel surface
Subject: futuristic tactical panel with subtle grid texture and restrained edge glow
Style/medium: high-contrast game UI surface, premium mobile HUD
Composition/framing: centered panel texture with quiet middle area for overlaid controls
Lighting/mood: restrained cyan-purple ambient glow
Color palette: charcoal, deep navy, cyan edge light, soft violet rim
Constraints: no text, no icons, no embedded controls, no watermark
Avoid: heavy gradients, ornamental chrome, photoreal textures
```

### 3. CTA 패널 포인트 아트

```text
Use case: ui-mockup
Asset type: call-to-action accent panel
Primary request: create a compact neon tactical energy flare graphic that can sit behind a start button section
Scene/backdrop: dark transparent-friendly background
Subject: a subtle intersecting field of cyan and magenta energy nodes
Style/medium: sleek stylized game UI accent art
Composition/framing: low-noise composition with the brightest area off-center so button text remains readable
Lighting/mood: energetic but controlled
Constraints: no text, no watermark, no logos
Avoid: characters, weapons, full-scene art, strong center bloom
```

## 한계 / 후속 메모

- 이번 세션에서는 built-in `image_gen` 도구가 제공되지 않아 AI 생성 UI 비주얼은 실제 파일로 추가하지 못했다.
- 대신 저장소에 이미 있던 타워/유닛/타일 자산을 런타임에 실제 연결했고, 누락된 AI 생성 표면은 코드 기반 스타일링으로 대체했다.
- 다음 후속 작업으로는 `GamePage` 청크 분리, AI 생성 UI 배경판 생산, 결과 오버레이의 모션 강화가 적절하다.

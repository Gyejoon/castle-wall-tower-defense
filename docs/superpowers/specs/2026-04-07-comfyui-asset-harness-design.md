# ComfyUI 에셋 생성 파이프라인 (Harness) 설계

> 생성일: 2026-04-07

## Context

현재 `scripts/generate-assets/ai-generate-*.ts` 파이프라인은 부분 구현 상태다:
- 타일 4종, 타워 9/18종만 ComfyUI 지원
- 유닛은 PixelLab API 의존
- 맵(lava, storm), 보스, 구조물, 지형 에셋 전부 미구현
- 애니메이션은 단일 패스 4프레임 spritesheet (품질 제한적)

**목표:** ComfyUI + AnimateDiff 기반의 새로운 harness를 `scripts/comfyui-harness/`에 구축하여, YAML 설정 파일로 6종 에셋(맵/지형/구조물/타워/유닛/보스)을 배치 생성하는 체계적 파이프라인을 만든다.

## 결정 사항

| 항목 | 결정 |
|------|------|
| 구조 | 기존 ai-generate-* 확장 아닌, 새 harness 리빌드 |
| 애니메이션 | AnimateDiff (C) — 동영상 생성 → 프레임 추출 |
| 우선순위 | Phase 1: 맵/지형/구조물 → Phase 2: 타워 → Phase 3: 유닛/보스 |
| 맵 범위 | 3개 전부 AI 리메이크 (forest, lava, storm) + 확장 가능 |
| 해상도 | 128px 기본, 보스 256px |
| 프레임 수 | 8프레임 (기존 4프레임에서 상향) |
| 실행 방식 | YAML 설정 파일 기반 배치 실행 |
| 워크플로우 | 하이브리드 — master 기본 + boss/tileable 전용 오버라이드 |
| 후처리 | 풀 파이프라인 (팔레트+아웃라인+배경제거+ControlNet 일관성+품질 검증) |

## 디렉토리 구조

```
scripts/comfyui-harness/
├── configs/                          # YAML 설정 파일
│   ├── maps/
│   │   ├── forest_gate.yaml
│   │   ├── lava_fortress.yaml
│   │   └── storm_citadel.yaml
│   ├── towers.yaml
│   ├── units.yaml
│   └── bosses.yaml
│
├── workflows/                        # ComfyUI 워크플로우 템플릿
│   ├── master.ts                     # 공통 AnimateDiff 워크플로우
│   ├── boss.ts                       # 보스 전용 (고해상도, 더 많은 스텝)
│   └── tileable.ts                   # 타일 전용 (심리스 타일링)
│
├── pipeline/                         # 실행 파이프라인
│   ├── config-loader.ts              # YAML 파싱 + 검증
│   ├── workflow-builder.ts           # 설정 → ComfyUI 워크플로우 변환
│   ├── comfyui-client.ts             # API 클라이언트
│   ├── post-process.ts               # 다운스케일→팔레트→아웃라인→배경제거
│   ├── quality-check.ts              # 프레임 떨림 감지, 팔레트 위반 체크
│   ├── spritesheet-assembler.ts      # 프레임 → spritesheet 조립
│   └── manifest-updater.ts           # asset-manifest.json 업데이트
│
├── harness.ts                        # CLI 진입점
└── types.ts                          # 공유 타입 정의
```

## 실행 흐름

```
[YAML Config] → [config-loader] 파싱+검증
                      ↓
              [workflow-builder] 에셋별 워크플로우 선택
                 ├── workflow_override: boss → boss.ts
                 ├── workflow_override: tileable → tileable.ts
                 └── 기본 → master.ts
                      ↓
              [comfyui-client] ComfyUI API 호출 (AnimateDiff)
                      ↓
              [post-process] 5단계 후처리
                 ├── 1. 다운스케일 (512→128/256, nearest-neighbor)
                 ├── 2. 팔레트 퀀타이즈 (CIE LAB 거리, 맵 테마별 20-30색)
                 ├── 3. 아웃라인 추가 (1px 검정 외곽선)
                 ├── 4. 배경 투명화 (코너 샘플링, 유사색 제거)
                 └── 5. ControlNet 프레임 일관성 보정 (편차 초과 시만)
                      ↓
              [quality-check] 자동 검증
                 ├── 팔레트 위반율 < 5%
                 ├── 프레임간 구조 떨림(SSIM) < 임계값
                 ├── 투명 배경 비율 정상 범위
                 └── 실패 시 재생성 (최대 3회)
                      ↓
              [spritesheet-assembler] 8프레임 가로 조립
                      ↓
              [manifest-updater] asset-manifest.json 머지
```

## YAML 설정 구조

### 맵 설정 (maps/*.yaml)

```yaml
meta:
  id: forest_gate
  name: "숲의 관문"
  theme: "medieval fantasy forest, lush green canopy, moss-covered stone"

style:
  prompt_prefix: "pixel art, isometric view, 45 degree angle, medieval fantasy forest"
  negative: "blurry, modern, sci-fi, neon, realistic, photorealistic, 3D render"
  palette:
    primary: ["#2d5a1e", "#4a7a2e", "#6b9e3a"]
    accent: ["#8b6914", "#a0522d", "#654321"]
    highlight: ["#c8e6c9", "#f5f5dc"]
  seed: 42

generation:
  checkpoint: "dreamshaper_8.safetensors"
  steps: 25
  cfg_scale: 7
  width: 512
  height: 512

animation:
  motion_module: "mm_sd_v15_v2.ckpt"
  frames: 8
  fps: 14

output:
  base_size: 128
  format: "png"
  spritesheet: true

assets:
  terrain:
    - id: grass-floor
      prompt: "grass floor tile, seamless, dark green texture"
      frames: 1
      tileable: true
      workflow_override: tileable

    - id: dirt-path
      prompt: "worn dirt path, stone edges, footprints"
      frames: 8

  structures:
    - id: oak-tree-large
      prompt: "large oak tree, thick trunk, swaying leaves"
      frames: 8
      size: 256

    - id: stone-wall
      prompt: "mossy stone wall, ivy growing, cracks"
      frames: 1

  decorations:
    - id: mushroom-cluster
      prompt: "glowing mushroom cluster, bioluminescent"
      frames: 4
```

### 보스 설정 (bosses.yaml)

```yaml
meta:
  id: bosses
  name: "보스 에셋"

style:
  prompt_prefix: "pixel art, isometric view, 45 degree angle, epic boss monster"
  negative: "blurry, modern, cute, chibi, simple"

generation:
  checkpoint: "dreamshaper_8.safetensors"
  steps: 35
  cfg_scale: 8

animation:
  frames: 8
  fps: 12

output:
  base_size: 256

assets:
  bosses:
    - id: titan-dragon
      prompt: "ancient fire dragon, massive wings, scales glowing with ember"
      workflow_override: boss
      animations:
        - { state: idle, prompt_suffix: "idle stance, wings folded, breathing smoke" }
        - { state: attack, prompt_suffix: "fire breath attack, wings spread" }
        - { state: phase2, prompt_suffix: "enraged, glowing red cracks, fury" }
        - { state: death, prompt_suffix: "collapsing, fading to embers" }
```

## 워크플로우 템플릿

### Master (기본)
- CheckpointLoader → CLIPTextEncode(+/-) → AnimateDiff Loader → KSampler → VAEDecode → 8프레임 출력
- 타워, 유닛, 일반 구조물, 데코레이션에 사용

### Boss (전용)
- Master + ControlNet Lineart (실루엣 일관성 강제)
- steps: 35, cfg: 8, 출력 256px
- 상태별(idle/attack/phase2/death) 각각 생성

### Tileable (타일 전용)
- AnimateDiff 없이 정적 이미지
- 심리스 타일링 검증 포함
- 지형 타일(grass, dirt, stone)에 사용

### workflow-builder 로직
```typescript
function selectWorkflow(asset, mapStyle): ComfyUIWorkflow {
  if (asset.workflow_override === 'boss') return buildBossWorkflow(asset, mapStyle);
  if (asset.workflow_override === 'tileable') return buildTileableWorkflow(asset, mapStyle);
  return buildMasterWorkflow(asset, mapStyle);
}
```

## 출력 구조

```
packages/web-shell/public/assets/
├── maps/
│   ├── forest_gate/
│   │   ├── terrain/
│   │   │   ├── grass-floor.png        (128×128, 정적)
│   │   │   └── dirt-path.png          (1024×128, 8프레임)
│   │   ├── structures/
│   │   │   ├── oak-tree-large.png     (2048×256, 8프레임)
│   │   │   └── stone-wall.png         (128×128, 정적)
│   │   └── decorations/
│   │       └── mushroom-cluster.png   (512×128, 4프레임)
│   ├── lava_fortress/
│   │   └── ...
│   └── storm_citadel/
│       └── ...
├── towers/
│   └── laser/
│       ├── laser.png                  (128×128, 정적)
│       └── laser-fire.png             (1024×128, 8프레임)
├── units/
│   └── scout_drone.png                (1024×128, 8프레임)
└── bosses/
    └── titan-dragon/
        ├── idle.png                   (2048×256, 8프레임)
        ├── attack.png                 (2048×256, 8프레임)
        ├── phase2.png                 (2048×256, 8프레임)
        └── death.png                  (2048×256, 8프레임)
```

## Manifest 엔트리 예시

```json
{
  "key": "map-forest_gate-structure-oak-tree-large",
  "type": "spritesheet",
  "path": "assets/maps/forest_gate/structures/oak-tree-large.png",
  "frameWidth": 256,
  "frameHeight": 256,
  "frameCount": 8,
  "section": "preload"
}
```

- 기존 에셋 키 충돌 시 덮어쓰기
- section 자동 추론: 맵 에셋→preload, 보스→boss prefetch

## CLI 인터페이스

```bash
# 맵 하나 전체 생성
bun run comfyui-harness generate --config configs/maps/forest_gate.yaml

# 특정 에셋만 재생성
bun run comfyui-harness generate --config configs/maps/forest_gate.yaml --only oak-tree-large

# 보스 전체 생성
bun run comfyui-harness generate --config configs/bosses.yaml

# 전체 배치
bun run comfyui-harness generate-all

# 품질 검증만
bun run comfyui-harness audit --config configs/maps/forest_gate.yaml

# 드라이런
bun run comfyui-harness generate --config configs/bosses.yaml --dry-run
```

## ComfyUI 환경 요구사항

| 모델 | 경로 | 용도 |
|------|------|------|
| dreamshaper_8.safetensors | models/checkpoints/ | 이미지 생성 |
| mm_sd_v15_v2.ckpt | models/animatediff_models/ | 애니메이션 모션 |
| control_v11p_sd15_lineart.pth | models/controlnet/ | 프레임 일관성 |

커스텀 노드: ComfyUI-AnimateDiff-Evolved, comfyui_controlnet_aux, ComfyUI-VideoHelperSuite

## 기존 코드와의 관계

- `scripts/generate-assets/` — 기존 절차적 파이프라인. 그대로 유지 (UI, VFX 등 ComfyUI 불필요 에셋용)
- `scripts/comfyui-harness/` — 새 AI 파이프라인. 맵/타워/유닛/보스 전담
- 공유: `packages/shared/src/assets/manifest.ts` (매니페스트 타입), `shared.ts` (팔레트 상수)

## 구현 우선순위

- **Phase 1:** harness 코어 (config-loader, workflow-builder, comfyui-client, post-process, CLI)
- **Phase 2:** 맵/지형/구조물 configs + 생성 테스트 (forest → lava → storm)
- **Phase 3:** 타워 18종 config + 생성
- **Phase 4:** 유닛 5종 + 보스 config + 생성

## 검증 방법

1. `bun run comfyui-harness generate --config configs/maps/forest_gate.yaml --dry-run` — 워크플로우 JSON 출력 확인
2. ComfyUI 실행 상태에서 단일 에셋 생성 → 후처리 결과 육안 확인
3. `bun run comfyui-harness audit` — 품질 검증 패스 확인
4. 생성된 spritesheet를 Phaser Preloader에서 로드 → 애니메이션 재생 확인
5. `asset-manifest.json` 정합성 검증

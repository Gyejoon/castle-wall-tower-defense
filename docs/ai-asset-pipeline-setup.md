# AI Asset Pipeline Setup Guide

## Overview

AI 기반 2.5D 에셋 생성 파이프라인. ComfyUI(타일/타워)와 PixelLab(유닛)을 사용합니다.
현재 스크립트는 Claude MCP 도구를 직접 호출하지 않고, ComfyUI/PixelLab HTTP API를 사용합니다. MCP 설정은 Claude에서 수동 실험할 때만 선택 사항입니다.

## Prerequisites

- Bun runtime (이미 설치됨)
- `@napi-rs/canvas` (이미 설치됨)

## 1. ComfyUI Setup (타일 & 타워 생성)

### Install ComfyUI

```bash
# Clone ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI.git ~/ComfyUI
cd ~/ComfyUI

# Install dependencies (Mac Apple Silicon)
pip install torch torchvision torchaudio
pip install -r requirements.txt

# Start ComfyUI
python main.py --force-fp16
```

### Required Models

`~/ComfyUI/models/` 디렉토리에 다운로드:

| Model | Path | Download |
|-------|------|----------|
| Retro Diffusion Isometric | `checkpoints/rd_pro__isometric.safetensors` | [Replicate](https://replicate.com/retro-diffusion) |
| ControlNet Tile | `controlnet/control_v11f1e_sd15_tile.pth` | [HuggingFace](https://huggingface.co/lllyasviel/ControlNet-v1-1) |
| ControlNet Canny | `controlnet/control_v11p_sd15_canny.pth` | [HuggingFace](https://huggingface.co/lllyasviel/ControlNet-v1-1) |
| IP-Adapter Plus | `ipadapter/ip-adapter-plus_sd15.safetensors` | [HuggingFace](https://huggingface.co/h94/IP-Adapter) |

### MCP Server Config

`~/.claude/settings.json`에 추가:

```json
{
  "mcpServers": {
    "comfyui": {
      "command": "npx",
      "args": ["-y", "comfyui-mcp"],
      "env": {
        "COMFYUI_URL": "http://localhost:8188"
      }
    }
  }
}
```

## 2. PixelLab Setup (유닛 생성)

### API Key

1. https://www.pixellab.ai 가입
2. API Key 발급 (Pixel Apprentice tier: $12/month)
3. 환경변수 설정:

```bash
export PIXELLAB_API_KEY="your-api-key-here"
```

### MCP Server Config (Optional)

PixelLab MCP를 직접 사용하려면:

```json
{
  "mcpServers": {
    "pixellab": {
      "command": "npx",
      "args": ["-y", "@pixellab/mcp-server"],
      "env": {
        "PIXELLAB_API_KEY": "${PIXELLAB_API_KEY}"
      }
    }
  }
}
```

## 3. Running the Pipeline

### Full Pipeline

```bash
bun run scripts/generate-assets/ai-generate-all.ts
```

### Individual Components

```bash
# Tiles only (requires ComfyUI)
bun run scripts/generate-assets/ai-generate-tiles.ts

# Towers only (requires ComfyUI)
bun run scripts/generate-assets/ai-generate-towers.ts

# Units only (requires PixelLab API key)
bun run scripts/generate-assets/ai-generate-units.ts
```

### Current Runtime Coverage

- Tiles: AI 타일 4종을 생성한 뒤 런타임용 `assets/tileset.png`로 재조합
- Towers: `Preloader.ts`가 `ALL_TOWERS` 전체 정적 스프라이트를 preload
- Tower fire spritesheets: 아직 게임 런타임에서 사용하지 않음
- Units: PixelLab 결과를 기존 32x32 / 4-frame 포맷으로 후처리

### Environment Variables

| Variable | Required For | Default |
|----------|-------------|---------|
| `COMFYUI_URL` | Tiles, Towers | `http://localhost:8188` |
| `PIXELLAB_API_KEY` | Units | (none) |

## Important: Tile Integration

AI-generated tiles are saved as individual PNGs (`assets/tiles/*.png`).
`ai-generate-all.ts` now also composes these files into the runtime tileset at `assets/tileset.png`, which matches the existing Tiled JSON contract.

Current mapping:
1. `grid-floor.png` → grass light/dark slots
2. `path-tile.png` → straight/corner path slots
3. `spawn-tile.png` → spawn slot
4. `exit-tile.png` → exit slot

This keeps `forest-gate.json` and `Preloader.ts` working without runtime code changes.

## 4. Post-Processing

모든 AI 생성 에셋은 자동으로 후처리됩니다:

1. **Nearest-neighbor resize** → 32x32 (픽셀아트 보존)
2. **Palette mapping** → `shared.ts` PALETTE 색상으로 통일
3. **Spritesheet assembly** → 4프레임 = 128x32 (기존 포맷 호환)
4. **Manifest update** → `asset-manifest.json` 자동 업데이트
5. **Palette audit** → 모든 픽셀이 팔레트 내에 있는지 검증

## 5. Graceful Degradation

- ComfyUI가 꺼져있으면 타일/타워 생성을 스킵하고 경고만 출력
- PixelLab API 키가 없으면 유닛 생성을 스킵
- 기존 프로시저럴 에셋은 기존 `asset-manifest.json` 엔트리를 유지
- 타일 4종이 모두 생성된 경우에만 런타임용 `assets/tileset.png`를 다시 합성
- 기존 `bun run scripts/generate-assets/generate-all.ts`는 그대로 동작

## File Structure

```
scripts/generate-assets/
├── ai-config.ts           # 프롬프트, 모델 설정, 에셋 파라미터
├── ai-post-process.ts     # 팔레트 매핑, 리사이즈, 스프라이트시트
├── ai-generate-tiles.ts   # ComfyUI 타일 생성
├── ai-generate-towers.ts  # ComfyUI 타워 생성
├── ai-generate-units.ts   # PixelLab 유닛 생성
├── ai-generate-all.ts     # 오케스트레이터
├── shared.ts              # 기존 팔레트 (AI 파이프라인에서 재사용)
└── generate-all.ts        # 기존 프로시저럴 생성 (변경 없음)
```

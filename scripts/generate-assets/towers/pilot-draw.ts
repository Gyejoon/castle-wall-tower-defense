import type { SKRSContext2D } from '@napi-rs/canvas';
import {
  PALETTE,
  drawIsoShadow,
  drawRect,
  fillCircle,
  drawCircle,
  setPixel,
  drawLine,
  addGlow,
  hexToRgba,
} from '../shared';

// ── Local helpers (shared across pilot draw functions) ──────────────

/** Stepped stone base — 3-tier iso platform */
function drawSteppedStoneBase(
  ctx: SKRSContext2D,
  cx: number,
  baseY: number,
  hw: number,
  steps: number,
): void {
  for (let s = 0; s < steps; s++) {
    const stepHw = hw - s * 4;
    const stepY = baseY - s * 4;
    const hh = Math.round(stepHw / 2.5);
    // Top face
    for (let dy = -hh; dy <= hh; dy++) {
      const ratio = 1 - Math.abs(dy) / hh;
      const w = Math.round(stepHw * ratio);
      for (let dx = -w; dx <= w; dx++) {
        setPixel(ctx, cx + dx, stepY + dy, s === 0 ? PALETTE.stoneDark : PALETTE.stoneLight);
      }
    }
    // Left depth
    for (let d = 1; d <= 3; d++) {
      for (let row = 0; row <= hh; row++) {
        const ratio = 1 - row / hh;
        const w = Math.round(stepHw * ratio);
        for (let dx = -w; dx < 0; dx++) {
          setPixel(ctx, cx + dx, stepY + row + d, PALETTE.stoneDark);
        }
      }
    }
    // Right depth
    for (let d = 1; d <= 3; d++) {
      for (let row = 0; row <= hh; row++) {
        const ratio = 1 - row / hh;
        const w = Math.round(stepHw * ratio);
        for (let dx = 0; dx <= w; dx++) {
          setPixel(ctx, cx + dx, stepY + row + d, PALETTE.stone);
        }
      }
    }
  }
}

/** Barrel-shaped tower body with 3-shade vertical shading */
function drawTowerBarrel(
  ctx: SKRSContext2D,
  cx: number,
  topY: number,
  halfW: number,
  height: number,
): void {
  for (let y = 0; y < height; y++) {
    // Slight barrel bulge — widest at 40% height
    const t = y / height;
    const bulge = 1 + 0.08 * Math.sin(t * Math.PI);
    const w = Math.round(halfW * bulge);
    for (let dx = -w; dx <= w; dx++) {
      // 3-shade: left=dark, center=light, right=mid
      const shade = dx < -w * 0.3 ? PALETTE.stoneDark : dx > w * 0.3 ? PALETTE.stone : PALETTE.stoneLight;
      setPixel(ctx, cx + dx, topY + y, shade);
    }
  }
}

/** 4-notch battlements on top of barrel */
function drawBattlements(
  ctx: SKRSContext2D,
  cx: number,
  topY: number,
  halfW: number,
  notches: number,
): void {
  const merlonW = Math.round((halfW * 2) / (notches * 2 - 1));
  const merlonH = 6;
  for (let i = 0; i < notches; i++) {
    const mx = cx - halfW + i * merlonW * 2;
    drawRect(ctx, mx, topY - merlonH, merlonW, merlonH, PALETTE.stone);
    drawRect(ctx, mx, topY - merlonH, merlonW, 1, PALETTE.stoneLight);
  }
}

/** Narrow arrow slit */
function drawArrowSlit(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  drawRect(ctx, x, y, w, h, '#1a1208');
  setPixel(ctx, x, y, PALETTE.stoneDark);
  setPixel(ctx, x + w - 1, y + h - 1, PALETTE.stoneDark);
}

/** Flag pole with pennant */
function drawFlagPole(
  ctx: SKRSContext2D,
  x: number,
  topY: number,
  poleH: number,
  flagColor: string,
): void {
  drawLine(ctx, x, topY, x, topY + poleH, PALETTE.wood);
  // Pennant (triangular)
  for (let dy = 0; dy < 8; dy++) {
    const w = 8 - dy;
    drawRect(ctx, x + 1, topY + dy + 1, w, 1, flagColor);
  }
  setPixel(ctx, x, topY, PALETTE.woodLight);
}

/** Highlight line along an edge */
function drawEdgeHighlight(
  ctx: SKRSContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  alpha: number,
): void {
  drawLine(ctx, x1, y1, x2, y2, hexToRgba(color, alpha));
}

// ── Hexagonal / furnace helpers (flame_tower) ──

/** Dark volcanic base with cracks */
function drawLavaBase(ctx: SKRSContext2D, cx: number, baseY: number, hw: number): void {
  const hh = Math.round(hw / 2.5);
  for (let dy = -hh; dy <= hh; dy++) {
    const ratio = 1 - Math.abs(dy) / hh;
    const w = Math.round(hw * ratio);
    for (let dx = -w; dx <= w; dx++) {
      setPixel(ctx, cx + dx, baseY + dy, '#2b0f08');
    }
  }
  for (let d = 1; d <= 5; d++) {
    for (let row = 0; row <= hh; row++) {
      const ratio = 1 - row / hh;
      const w = Math.round(hw * ratio);
      for (let dx = -w; dx < 0; dx++) setPixel(ctx, cx + dx, baseY + row + d, '#1a0804');
      for (let dx = 0; dx <= w; dx++) setPixel(ctx, cx + dx, baseY + row + d, '#3a1609');
    }
  }
  // Orange cracks in base
  drawLine(ctx, cx - 8, baseY + 2, cx - 14, baseY + 6, hexToRgba('#c54120', 0.6));
  drawLine(ctx, cx + 5, baseY + 1, cx + 12, baseY + 5, hexToRgba('#f5b23b', 0.4));
}

/** Hex body — tall hex prism silhouette */
function drawHexBody(
  ctx: SKRSContext2D,
  cx: number,
  topY: number,
  halfW: number,
  height: number,
  colors: [string, string, string],
): void {
  for (let y = 0; y < height; y++) {
    const t = y / height;
    // Hex cross-section: wider at 33% and 66%
    const hexBulge = 1 + 0.12 * (Math.sin(t * Math.PI * 2) * 0.5 + 0.5);
    const w = Math.round(halfW * hexBulge);
    for (let dx = -w; dx <= w; dx++) {
      const shade = dx < -w * 0.3 ? colors[0] : dx > w * 0.3 ? colors[2] : colors[1];
      setPixel(ctx, cx + dx, topY + y, shade);
    }
  }
}

/** Open furnace mouth at the top */
function drawForgeMouth(ctx: SKRSContext2D, cx: number, y: number, hw: number): void {
  for (let dy = 0; dy < 6; dy++) {
    const w = hw - dy;
    for (let dx = -w; dx <= w; dx++) {
      setPixel(ctx, cx + dx, y + dy, '#0a0200');
    }
  }
  // Red glow inside
  addGlow(ctx, cx, y + 3, 8, '#c54120', 0.5);
}

/** Multi-layered static flame tongues */
function drawStaticFlame(
  ctx: SKRSContext2D,
  cx: number,
  topY: number,
  hw: number,
  colors: [string, string, string],
): void {
  const tongues = [
    { dx: 0, h: hw, w: 6 },
    { dx: -6, h: hw * 0.7, w: 4 },
    { dx: 5, h: hw * 0.8, w: 5 },
    { dx: -3, h: hw * 0.5, w: 3 },
  ];
  for (const t of tongues) {
    for (let y = 0; y < t.h; y++) {
      const taper = 1 - y / t.h;
      const w = Math.max(1, Math.round(t.w * taper));
      const colorIdx = y < t.h * 0.3 ? 2 : y < t.h * 0.6 ? 1 : 0;
      for (let dx = -w; dx <= w; dx++) {
        setPixel(ctx, cx + t.dx + dx, topY + (t.h - y), colors[colorIdx]);
      }
    }
  }
}

/** Irregular heat cracks on body surface */
function drawHeatCracks(
  ctx: SKRSContext2D,
  cx: number,
  startY: number,
  halfW: number,
  count: number,
): void {
  const crackData = [
    { x1: -8, y1: 0, x2: -12, y2: 14 },
    { x1: 6, y1: 4, x2: 10, y2: 18 },
    { x1: -2, y1: 8, x2: 4, y2: 24 },
  ];
  for (let i = 0; i < Math.min(count, crackData.length); i++) {
    const c = crackData[i];
    drawLine(ctx, cx + c.x1, startY + c.y1, cx + c.x2, startY + c.y2, hexToRgba('#c54120', 0.6));
    // Glow along crack
    setPixel(ctx, cx + c.x2, startY + c.y2, hexToRgba('#f5b23b', 0.5));
  }
}

// ── Dragon nest helpers ──

/** Stacked rock ring for nest wall */
function drawNestStackedRocks(
  ctx: SKRSContext2D,
  cx: number,
  baseY: number,
  hw: number,
  layers: number,
): void {
  for (let layer = 0; layer < layers; layer++) {
    const layerHw = hw - layer * 3;
    const layerY = baseY - layer * 8;
    const hh = Math.round(layerHw / 3);
    // Elliptical rock ring
    for (let dy = -hh; dy <= hh; dy++) {
      for (let dx = -layerHw; dx <= layerHw; dx++) {
        if ((dx * dx) / (layerHw * layerHw) + (dy * dy) / (hh * hh) <= 1) {
          const inner = (dx * dx) / ((layerHw - 4) * (layerHw - 4)) + (dy * dy) / (Math.max(1, hh - 2) * Math.max(1, hh - 2));
          if (inner > 1 || layer === 0) {
            const shade = dx < 0 ? '#5a4a3a' : '#8a7a6a';
            setPixel(ctx, cx + dx, layerY + dy, shade);
          }
        }
      }
    }
    // Rock texture spots
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const rx = Math.round(cx + (layerHw - 2) * Math.cos(a));
      const ry = Math.round(layerY + (hh - 1) * Math.sin(a));
      setPixel(ctx, rx, ry, '#3a2a1a');
    }
  }
}

/** Dark interior fill */
function drawNestInterior(ctx: SKRSContext2D, cx: number, y: number, hw: number, color: string): void {
  const hh = Math.round(hw / 3);
  for (let dy = -hh; dy <= hh; dy++) {
    for (let dx = -hw; dx <= hw; dx++) {
      if ((dx * dx) / (hw * hw) + (dy * dy) / (hh * hh) <= 1) {
        setPixel(ctx, cx + dx, y + dy, color);
      }
    }
  }
}

/** Rising steam wisps */
function drawSteam(ctx: SKRSContext2D, cx: number, y: number, count: number): void {
  const positions = [
    { dx: -8, dy: 0 }, { dx: 4, dy: -4 }, { dx: -2, dy: -8 },
    { dx: 10, dy: -2 }, { dx: -6, dy: -12 }, { dx: 6, dy: -10 },
    { dx: 0, dy: -16 }, { dx: -4, dy: -6 }, { dx: 8, dy: -14 },
    { dx: 2, dy: -18 }, { dx: -10, dy: -8 }, { dx: 12, dy: -6 },
  ];
  for (let i = 0; i < Math.min(count, positions.length); i++) {
    const p = positions[i];
    const alpha = 0.15 + (i % 3) * 0.05;
    fillCircle(ctx, cx + p.dx, y + p.dy, 2, hexToRgba('#ffffff', alpha));
  }
}

/** Glowing dragon egg */
function drawDragonEgg(
  ctx: SKRSContext2D,
  cx: number,
  cy: number,
  r: number,
  darkColor: string,
  lightColor: string,
): void {
  // Egg body (slightly taller than wide)
  for (let dy = -r - 2; dy <= r; dy++) {
    const t = (dy + r + 2) / (r * 2 + 2);
    const ew = Math.round(r * Math.sin(t * Math.PI) * 0.9);
    for (let dx = -ew; dx <= ew; dx++) {
      const shade = dx < 0 ? darkColor : lightColor;
      setPixel(ctx, cx + dx, cy + dy, shade);
    }
  }
  // Specular highlight
  setPixel(ctx, cx - 1, cy - r, '#ffffff');
  setPixel(ctx, cx, cy - r + 1, hexToRgba('#ffffff', 0.6));
  // Spots
  setPixel(ctx, cx + 1, cy + 1, hexToRgba(darkColor, 0.7));
  setPixel(ctx, cx - 2, cy - 1, hexToRgba(lightColor, 0.5));
}

/** Bone fragment */
function drawBoneFragment(ctx: SKRSContext2D, x: number, y: number, len: number): void {
  drawLine(ctx, x, y, x + len, y - 3, '#c8c0b0');
  drawLine(ctx, x, y + 1, x + len, y - 2, '#a0988a');
  // Joint knobs
  fillCircle(ctx, x, y, 2, '#c8c0b0');
  fillCircle(ctx, x + len, y - 3, 2, '#c8c0b0');
}

/** Egg glow overlay */
function drawEggGlow(
  ctx: SKRSContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  alpha: number,
): void {
  addGlow(ctx, cx, cy, r, color, alpha);
}

// ── Wind spire helpers ──

/** Marble platform base */
function drawMarbleBase(
  ctx: SKRSContext2D,
  cx: number,
  baseY: number,
  hw: number,
  steps: number,
): void {
  for (let s = 0; s < steps; s++) {
    const stepHw = hw - s * 3;
    const stepY = baseY - s * 3;
    const hh = Math.round(stepHw / 3);
    for (let dy = -hh; dy <= hh; dy++) {
      const ratio = 1 - Math.abs(dy) / hh;
      const w = Math.round(stepHw * ratio);
      for (let dx = -w; dx <= w; dx++) {
        setPixel(ctx, cx + dx, stepY + dy, s === 0 ? '#a8b5c0' : '#e8ecef');
      }
    }
    for (let d = 1; d <= 2; d++) {
      for (let row = 0; row <= Math.round(stepHw / 3); row++) {
        const ratio = 1 - row / Math.round(stepHw / 3);
        const w = Math.round(stepHw * ratio);
        for (let dx = -w; dx < 0; dx++) setPixel(ctx, cx + dx, stepY + row + d, '#8a9aa4');
        for (let dx = 0; dx <= w; dx++) setPixel(ctx, cx + dx, stepY + row + d, '#c0d0d8');
      }
    }
  }
}

/** Thin tapered spire body */
function drawThinSpire(
  ctx: SKRSContext2D,
  cx: number,
  topY: number,
  halfW: number,
  height: number,
  lightColor: string,
  darkColor: string,
): void {
  for (let y = 0; y < height; y++) {
    const t = y / height;
    const w = Math.max(2, Math.round(halfW * (1 - t * 0.6)));
    for (let dx = -w; dx <= w; dx++) {
      const shade = dx < 0 ? darkColor : lightColor;
      setPixel(ctx, cx + dx, topY + y, shade);
    }
  }
}

/** Small vertical windows */
function drawSpireWindows(ctx: SKRSContext2D, cx: number, startY: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const y = startY + i * 16;
    drawRect(ctx, cx - 1, y, 3, 6, '#4a6a7a');
    setPixel(ctx, cx, y, '#6bd4d0');
  }
}

/** Windmill 4-blade static silhouette */
function drawWindmillBlades(ctx: SKRSContext2D, cx: number, cy: number, r: number): void {
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 8;
    const tipX = Math.round(cx + r * Math.cos(angle));
    const tipY = Math.round(cy + r * Math.sin(angle));
    drawLine(ctx, cx, cy, tipX, tipY, '#e8ecef');
    // Blade width
    const perpX = Math.round(3 * Math.cos(angle + Math.PI / 2));
    const perpY = Math.round(3 * Math.sin(angle + Math.PI / 2));
    const midX = Math.round(cx + (r * 0.5) * Math.cos(angle));
    const midY = Math.round(cy + (r * 0.5) * Math.sin(angle));
    drawLine(ctx, midX + perpX, midY + perpY, tipX, tipY, '#c0d0d8');
  }
  // Hub
  fillCircle(ctx, cx, cy, 3, '#a8b5c0');
  setPixel(ctx, cx, cy, '#e8ecef');
}

/** Swirling cloud bands */
function drawSwirlClouds(
  ctx: SKRSContext2D,
  cx: number,
  y: number,
  hw: number,
  count: number,
): void {
  for (let i = 0; i < count; i++) {
    const cloudY = y + i * 12;
    const cloudHw = hw - i * 4;
    for (let dx = -cloudHw; dx <= cloudHw; dx++) {
      const alpha = 0.15 + 0.1 * Math.cos((dx / cloudHw) * Math.PI);
      setPixel(ctx, cx + dx, cloudY, hexToRgba('#f0faff', alpha));
      setPixel(ctx, cx + dx, cloudY + 1, hexToRgba('#f0faff', alpha * 0.6));
    }
  }
}

/** Wind trail effect at base */
function drawWindTrails(ctx: SKRSContext2D, cx: number, y: number, hw: number, color: string): void {
  for (let i = 0; i < 3; i++) {
    const trailY = y + i * 3;
    const trailHw = hw - i * 6;
    for (let dx = -trailHw; dx <= trailHw; dx++) {
      const alpha = 0.2 * (1 - Math.abs(dx) / trailHw);
      setPixel(ctx, cx + dx, trailY, hexToRgba(color, alpha));
    }
  }
}

// ── Arcane spire helpers ──

/** Dark stone base for arcane */
function drawDarkStoneBase(
  ctx: SKRSContext2D,
  cx: number,
  baseY: number,
  hw: number,
  darkColor: string,
  midColor: string,
): void {
  const hh = Math.round(hw / 3);
  for (let dy = -hh; dy <= hh; dy++) {
    const ratio = 1 - Math.abs(dy) / hh;
    const w = Math.round(hw * ratio);
    for (let dx = -w; dx <= w; dx++) {
      setPixel(ctx, cx + dx, baseY + dy, midColor);
    }
  }
  for (let d = 1; d <= 4; d++) {
    for (let row = 0; row <= hh; row++) {
      const ratio = 1 - row / hh;
      const w = Math.round(hw * ratio);
      for (let dx = -w; dx < 0; dx++) setPixel(ctx, cx + dx, baseY + row + d, darkColor);
      for (let dx = 0; dx <= w; dx++) setPixel(ctx, cx + dx, baseY + row + d, midColor);
    }
  }
}

/** Wizard tower cylindrical body with cone roof */
function drawWizardBody(
  ctx: SKRSContext2D,
  cx: number,
  topY: number,
  halfW: number,
  height: number,
  darkColor: string,
  midColor: string,
): void {
  for (let y = 0; y < height; y++) {
    const t = y / height;
    const w = Math.round(halfW * (1 - t * 0.15));
    for (let dx = -w; dx <= w; dx++) {
      const shade = dx < -w * 0.3 ? darkColor : dx > w * 0.3 ? midColor : '#3a2058';
      setPixel(ctx, cx + dx, topY + y, shade);
    }
  }
}

/** Cone roof */
function drawConeRoof(
  ctx: SKRSContext2D,
  cx: number,
  topY: number,
  halfW: number,
  height: number,
  color: string,
): void {
  for (let y = 0; y < height; y++) {
    const t = y / height;
    const w = Math.round(halfW * t);
    for (let dx = -w; dx <= w; dx++) {
      setPixel(ctx, cx + dx, topY + (height - y), color);
    }
  }
}

/** Glowing magic window */
function drawMagicWindow(ctx: SKRSContext2D, cx: number, y: number, color: string): void {
  drawRect(ctx, cx - 2, y, 4, 6, '#0a0a1a');
  // Arch top
  setPixel(ctx, cx - 1, y - 1, '#0a0a1a');
  setPixel(ctx, cx, y - 1, '#0a0a1a');
  setPixel(ctx, cx + 1, y - 1, '#0a0a1a');
  // Inner glow
  drawRect(ctx, cx - 1, y + 1, 2, 4, color);
  addGlow(ctx, cx, y + 3, 4, color, 0.3);
}

/** Floating magic orb */
function drawFloatingOrb(
  ctx: SKRSContext2D,
  cx: number,
  cy: number,
  r: number,
  primaryColor: string,
  glowColor: string,
): void {
  addGlow(ctx, cx, cy, r + 4, primaryColor, 0.25);
  fillCircle(ctx, cx, cy, r, primaryColor);
  // Inner gradient
  fillCircle(ctx, cx - 1, cy - 1, Math.max(1, r - 2), glowColor);
  setPixel(ctx, cx - 1, cy - 2, '#ffffff');
}

/** Orbiting rune symbol */
function drawOrbitRune(ctx: SKRSContext2D, cx: number, cy: number, color: string): void {
  // Small 4-point rune symbol
  setPixel(ctx, cx, cy - 2, color);
  setPixel(ctx, cx - 1, cy, color);
  setPixel(ctx, cx + 1, cy, color);
  setPixel(ctx, cx, cy + 2, color);
  setPixel(ctx, cx, cy, color);
  // Glow
  addGlow(ctx, cx, cy, 3, color, 0.3);
}

// ── World tree helpers ──

/** Exposed root tendrils */
function drawExposedRoots(ctx: SKRSContext2D, cx: number, baseY: number, hw: number, count: number): void {
  const roots = [
    { x1: -10, y1: 0, x2: -hw + 2, y2: 8 },
    { x1: 8, y1: -2, x2: hw - 4, y2: 6 },
    { x1: -4, y1: 2, x2: -hw + 10, y2: 12 },
  ];
  for (let i = 0; i < Math.min(count, roots.length); i++) {
    const r = roots[i];
    drawLine(ctx, cx + r.x1, baseY + r.y1, cx + r.x2, baseY + r.y2, '#4a3018');
    drawLine(ctx, cx + r.x1, baseY + r.y1 + 1, cx + r.x2, baseY + r.y2 + 1, '#7a5828');
    // Root end knob
    fillCircle(ctx, cx + r.x2, baseY + r.y2, 2, '#4a3018');
  }
}

/** Gnarled tree trunk with bark texture */
function drawGnarledTrunk(
  ctx: SKRSContext2D,
  cx: number,
  topY: number,
  halfW: number,
  height: number,
  darkColor: string,
  lightColor: string,
): void {
  for (let y = 0; y < height; y++) {
    const t = y / height;
    // Organic irregular width
    const wobble = Math.sin(y * 0.4) * 2;
    const w = Math.round(halfW * (0.8 + 0.2 * t) + wobble);
    for (let dx = -w; dx <= w; dx++) {
      const shade = dx < -w * 0.3 ? darkColor : dx > w * 0.3 ? lightColor : '#5a4020';
      setPixel(ctx, cx + dx, topY + y, shade);
    }
    // Bark texture (every 4 pixels)
    if (y % 4 === 0) {
      setPixel(ctx, cx - 3, topY + y, '#3a2010');
      setPixel(ctx, cx + 4, topY + y, '#3a2010');
    }
  }
}

/** Small rune on trunk */
function drawTrunkRune(ctx: SKRSContext2D, cx: number, y: number, color: string): void {
  drawLine(ctx, cx - 2, y, cx + 2, y, color);
  drawLine(ctx, cx, y - 2, cx, y + 2, color);
  setPixel(ctx, cx, y, '#ffffff');
}

/** Multi-layered foliage crown */
function drawFoliageCrown(
  ctx: SKRSContext2D,
  cx: number,
  cy: number,
  r: number,
  colors: [string, string, string],
): void {
  // Bottom layer (darkest, widest)
  fillCircle(ctx, cx, cy + 4, r, colors[0]);
  // Middle layer
  fillCircle(ctx, cx, cy, r - 4, colors[1]);
  // Top layer (brightest, smallest)
  fillCircle(ctx, cx - 2, cy - 4, r - 10, colors[2]);
  // Extra small blobs for organic look
  fillCircle(ctx, cx + 8, cy - 2, 6, colors[1]);
  fillCircle(ctx, cx - 10, cy + 2, 5, colors[0]);
}

/** Sparkle dots inside foliage */
function drawLifeSparkles(
  ctx: SKRSContext2D,
  cx: number,
  cy: number,
  r: number,
  count: number,
  color: string,
): void {
  const positions = [
    { dx: -6, dy: -8 }, { dx: 8, dy: -4 }, { dx: -12, dy: 2 },
    { dx: 4, dy: 6 }, { dx: -2, dy: -12 }, { dx: 10, dy: 4 },
    { dx: -8, dy: -2 }, { dx: 14, dy: -6 },
  ];
  for (let i = 0; i < Math.min(count, positions.length); i++) {
    const p = positions[i];
    setPixel(ctx, cx + p.dx, cy + p.dy, color);
    setPixel(ctx, cx + p.dx + 1, cy + p.dy, hexToRgba(color, 0.5));
  }
}

// ── Celestial helpers ──

/** Galaxy orb with radial gradient */
function drawGalaxyOrb(
  ctx: SKRSContext2D,
  cx: number,
  cy: number,
  r: number,
  darkColor: string,
  midColor: string,
  brightColor: string,
): void {
  // Outer ring
  fillCircle(ctx, cx, cy, r, darkColor);
  // Mid ring
  fillCircle(ctx, cx, cy, r - 3, midColor);
  // Core
  fillCircle(ctx, cx, cy, r - 6, brightColor);
  // Specular
  setPixel(ctx, cx - 2, cy - 3, '#ffffff');
  setPixel(ctx, cx - 1, cy - 2, hexToRgba('#ffffff', 0.6));
}

/** Nebula noise dots */
function drawNebulaNoise(
  ctx: SKRSContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  count: number,
): void {
  // Deterministic pseudo-random positions using seed
  let seed = 42;
  for (let i = 0; i < count; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const angle = (seed / 0x7fffffff) * Math.PI * 2;
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const dist = (seed / 0x7fffffff) * r;
    const px = Math.round(cx + dist * Math.cos(angle));
    const py = Math.round(cy + dist * Math.sin(angle));
    const alpha = 0.3 + (i % 3) * 0.2;
    setPixel(ctx, px, py, hexToRgba(color, alpha));
  }
}

/** Twinkle star (4-point) */
function drawTwinkleStar(
  ctx: SKRSContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
  coreColor: string,
): void {
  // Vertical arm
  for (let d = -size; d <= size; d++) {
    const alpha = 1 - Math.abs(d) / size;
    setPixel(ctx, cx, cy + d, hexToRgba(color, alpha));
  }
  // Horizontal arm
  for (let d = -size; d <= size; d++) {
    const alpha = 1 - Math.abs(d) / size;
    setPixel(ctx, cx + d, cy, hexToRgba(color, alpha));
  }
  // Core
  setPixel(ctx, cx, cy, coreColor);
}

// ── Divine throne helpers ──

/** Marble steps (3-tier iso platform) */
function drawMarbleSteps(
  ctx: SKRSContext2D,
  cx: number,
  baseY: number,
  hw: number,
  steps: number,
  lightColor: string,
  darkColor: string,
): void {
  for (let s = 0; s < steps; s++) {
    const stepHw = hw - s * 6;
    const stepY = baseY - s * 5;
    const hh = Math.round(stepHw / 3);
    for (let dy = -hh; dy <= hh; dy++) {
      const ratio = 1 - Math.abs(dy) / hh;
      const w = Math.round(stepHw * ratio);
      for (let dx = -w; dx <= w; dx++) {
        setPixel(ctx, cx + dx, stepY + dy, lightColor);
      }
    }
    for (let d = 1; d <= 3; d++) {
      for (let row = 0; row <= hh; row++) {
        const ratio = 1 - row / hh;
        const w = Math.round(stepHw * ratio);
        for (let dx = -w; dx < 0; dx++) setPixel(ctx, cx + dx, stepY + row + d, darkColor);
        for (let dx = 0; dx <= w; dx++) setPixel(ctx, cx + dx, stepY + row + d, lightColor);
      }
    }
  }
}

/** Halo disc with radial glow */
function drawHaloDisc(
  ctx: SKRSContext2D,
  cx: number,
  cy: number,
  r: number,
  innerColor: string,
  outerColor: string,
): void {
  addGlow(ctx, cx, cy, r + 6, outerColor, 0.2);
  // Disc outline
  drawCircle(ctx, cx, cy, r, innerColor);
  drawCircle(ctx, cx, cy, r - 1, outerColor);
  // Fill with subtle gradient
  for (let dr = r - 2; dr > 0; dr--) {
    const alpha = 0.08 + 0.04 * (dr / r);
    drawCircle(ctx, cx, cy, dr, hexToRgba(innerColor, alpha));
  }
}

/** Angel wing pair silhouette */
function drawAngelWingPair(
  ctx: SKRSContext2D,
  cx: number,
  cy: number,
  span: number,
  wingH: number,
  lightColor: string,
  darkColor: string,
): void {
  const halfSpan = Math.round(span / 2);
  // Left wing
  for (let i = 0; i < wingH; i++) {
    const t = i / wingH;
    const w = Math.round(halfSpan * Math.sin(t * Math.PI));
    for (let dx = -w; dx <= 0; dx++) {
      const alpha = 0.4 + 0.4 * (1 - Math.abs(dx) / Math.max(1, w));
      setPixel(ctx, cx + dx - 4, cy + i - wingH / 2, hexToRgba(lightColor, alpha));
    }
  }
  // Right wing
  for (let i = 0; i < wingH; i++) {
    const t = i / wingH;
    const w = Math.round(halfSpan * Math.sin(t * Math.PI));
    for (let dx = 0; dx <= w; dx++) {
      const alpha = 0.4 + 0.4 * (1 - Math.abs(dx) / Math.max(1, w));
      setPixel(ctx, cx + dx + 4, cy + i - wingH / 2, hexToRgba(darkColor, alpha));
    }
  }
  // Feather highlight streaks
  for (let f = 0; f < 3; f++) {
    const fy = cy - wingH / 2 + 4 + f * 6;
    drawLine(ctx, cx - halfSpan + f * 4, fy, cx - 8, fy - 2, hexToRgba('#ffffff', 0.3));
    drawLine(ctx, cx + halfSpan - f * 4, fy, cx + 8, fy - 2, hexToRgba('#ffffff', 0.3));
  }
}

/** Golden throne body (tall back, armrests) */
function drawGoldenThrone(
  ctx: SKRSContext2D,
  cx: number,
  topY: number,
  halfW: number,
  height: number,
  lightColor: string,
  darkColor: string,
): void {
  // Tall backrest
  for (let y = 0; y < height; y++) {
    const t = y / height;
    const w = Math.round(halfW * (t < 0.4 ? 0.6 + t : 1 - (t - 0.4) * 0.3));
    for (let dx = -w; dx <= w; dx++) {
      const shade = dx < -w * 0.3 ? darkColor : dx > w * 0.3 ? lightColor : '#e8c050';
      setPixel(ctx, cx + dx, topY + y, shade);
    }
  }
  // Seat cushion
  drawRect(ctx, cx - halfW, topY + Math.round(height * 0.65), halfW * 2, 4, darkColor);
}

/** Armrests */
function drawThroneArmrests(ctx: SKRSContext2D, cx: number, y: number, halfW: number, color: string): void {
  // Left armrest
  drawRect(ctx, cx - halfW - 4, y, 6, 10, color);
  drawRect(ctx, cx - halfW - 4, y, 6, 2, hexToRgba('#ffffff', 0.3));
  // Right armrest
  drawRect(ctx, cx + halfW - 2, y, 6, 10, color);
  drawRect(ctx, cx + halfW - 2, y, 6, 2, hexToRgba('#ffffff', 0.3));
  // Armrest sphere tops
  fillCircle(ctx, cx - halfW - 1, y, 3, color);
  fillCircle(ctx, cx + halfW + 1, y, 3, color);
}

// ══════════════════════════════════════════════════════════════
// ██  Pilot draw functions — 128×160 high-quality sprites  ██
// ══════════════════════════════════════════════════════════════

export function drawArcherHQ(ctx: SKRSContext2D, ox: number, oy: number): void {
  const cx = ox + 64;
  const baseY = oy + 132;
  // Shadow
  drawIsoShadow(ctx, cx, baseY + 10, 38, 12, 0.45);
  // Stepped stone base (3 tiers)
  drawSteppedStoneBase(ctx, cx, baseY, 40, 3);
  // Tower barrel body — 3-shade vertical shading
  drawTowerBarrel(ctx, cx, oy + 36, 22, 92);
  // Battlements (4 notches)
  drawBattlements(ctx, cx, oy + 36, 22, 4);
  // Arrow slits
  drawArrowSlit(ctx, cx - 3, oy + 74, 3, 10);
  drawArrowSlit(ctx, cx + 9, oy + 82, 3, 8);
  drawArrowSlit(ctx, cx - 6, oy + 98, 2, 8);
  // Flag pole + red pennant
  drawFlagPole(ctx, cx + 12, oy + 8, 24, '#c03020');
  // Edge highlight
  drawEdgeHighlight(ctx, cx - 22, oy + 36, cx - 22, oy + 128, PALETTE.stoneLight, 0.4);
  // Window detail
  drawRect(ctx, cx + 2, oy + 60, 5, 8, '#1a1208');
  drawRect(ctx, cx + 3, oy + 61, 3, 6, hexToRgba(PALETTE.magicGold, 0.15));
  // Stone brick lines
  for (let i = 0; i < 8; i++) {
    const y = oy + 44 + i * 12;
    drawLine(ctx, cx - 18, y, cx + 18, y, hexToRgba(PALETTE.stoneDark, 0.3));
  }
}

export function drawFlameTowerHQ(ctx: SKRSContext2D, ox: number, oy: number): void {
  const cx = ox + 64;
  const baseY = oy + 132;
  drawIsoShadow(ctx, cx, baseY + 10, 42, 13, 0.55);
  drawLavaBase(ctx, cx, baseY, 44);
  drawHexBody(ctx, cx, oy + 44, 26, 88, ['#2b0f08', '#5b2512', '#3a1609']);
  drawForgeMouth(ctx, cx, oy + 38, 18);
  drawStaticFlame(ctx, cx, oy + 20, 22, ['#c54120', '#f5b23b', '#ffe27a']);
  drawHeatCracks(ctx, cx, oy + 80, 24, 3);
  drawEdgeHighlight(ctx, cx - 24, oy + 44, cx - 24, oy + 130, '#c54120', 0.35);
  // Extra: molten glow at cracks
  addGlow(ctx, cx - 8, oy + 90, 6, '#f5b23b', 0.2);
  addGlow(ctx, cx + 6, oy + 100, 5, '#c54120', 0.15);
}

export function drawDragonNestHQ(ctx: SKRSContext2D, ox: number, oy: number): void {
  const cx = ox + 64;
  const baseY = oy + 130;
  drawIsoShadow(ctx, cx, baseY + 12, 44, 14, 0.5);
  drawNestStackedRocks(ctx, cx, baseY, 46, 3);
  drawNestInterior(ctx, cx, oy + 90, 32, '#2b1a0a');
  drawSteam(ctx, cx, oy + 74, 12);
  // Eggs (different sizes and colors)
  drawDragonEgg(ctx, cx - 10, oy + 96, 10, '#c04a28', '#f2a13a');
  drawDragonEgg(ctx, cx + 10, oy + 100, 8, '#7a2a12', '#d97a20');
  drawDragonEgg(ctx, cx, oy + 88, 7, '#4a1a08', '#b85a15');
  // Bone fragments
  drawBoneFragment(ctx, cx - 20, oy + 114, 10);
  drawBoneFragment(ctx, cx + 18, oy + 112, 8);
  // Egg glow
  drawEggGlow(ctx, cx - 10, oy + 96, 12, '#ffdc80', 0.35);
  drawEggGlow(ctx, cx + 10, oy + 100, 8, '#ffa040', 0.25);
}

export function drawWindSpireHQ(ctx: SKRSContext2D, ox: number, oy: number): void {
  const cx = ox + 64;
  const baseY = oy + 134;
  drawIsoShadow(ctx, cx, baseY + 8, 32, 10, 0.35);
  drawMarbleBase(ctx, cx, baseY, 28, 3);
  drawThinSpire(ctx, cx, oy + 44, 14, 88, '#e8ecef', '#a8b5c0');
  drawSpireWindows(ctx, cx, oy + 58, 3);
  drawWindmillBlades(ctx, cx, oy + 32, 22);
  drawSwirlClouds(ctx, cx, oy + 72, 28, 2);
  drawWindTrails(ctx, cx, baseY - 4, 24, '#6bd4d0');
}

export function drawArcaneSpireHQ(ctx: SKRSContext2D, ox: number, oy: number): void {
  const cx = ox + 64;
  const baseY = oy + 134;
  drawIsoShadow(ctx, cx, baseY + 8, 34, 11, 0.45);
  drawDarkStoneBase(ctx, cx, baseY, 32, '#2a1a3e', '#4a3068');
  drawWizardBody(ctx, cx, oy + 48, 20, 86, '#2a1a3e', '#4a3068');
  drawConeRoof(ctx, cx, oy + 32, 22, 16, '#1a0a2e');
  drawMagicWindow(ctx, cx - 6, oy + 70, '#a855f7');
  drawMagicWindow(ctx, cx + 6, oy + 82, '#a855f7');
  drawMagicWindow(ctx, cx, oy + 100, '#d8b4fe');
  drawFloatingOrb(ctx, cx, oy + 18, 6, '#a855f7', '#d8b4fe');
  drawOrbitRune(ctx, cx - 16, oy + 28, '#d8b4fe');
  drawOrbitRune(ctx, cx + 16, oy + 22, '#d8b4fe');
  drawOrbitRune(ctx, cx + 4, oy + 12, '#d8b4fe');
  addGlow(ctx, cx, oy + 18, 14, '#a855f7', 0.35);
}

export function drawWorldTreeHQ(ctx: SKRSContext2D, ox: number, oy: number): void {
  const cx = ox + 64;
  const baseY = oy + 140;
  drawIsoShadow(ctx, cx, baseY + 6, 40, 12, 0.4);
  drawExposedRoots(ctx, cx, baseY, 38, 3);
  drawGnarledTrunk(ctx, cx, oy + 80, 22, 56, '#4a3018', '#7a5828');
  drawTrunkRune(ctx, cx, oy + 108, '#8fe08f');
  drawFoliageCrown(ctx, cx, oy + 42, 44, ['#2d5f2d', '#4ca04c', '#8fe08f']);
  drawLifeSparkles(ctx, cx, oy + 42, 44, 6, '#ffffff');
}

export function drawCelestialHQ(ctx: SKRSContext2D, ox: number, oy: number): void {
  const cx = ox + 64;
  const cy = oy + 80;
  // Floating — no ground shadow, soft glow residue below
  addGlow(ctx, cx, oy + 140, 26, '#5a3ab0', 0.2);
  // Outer aura layers
  addGlow(ctx, cx, cy, 44, '#2a1a5e', 0.25);
  addGlow(ctx, cx, cy, 32, '#5a3ab0', 0.35);
  addGlow(ctx, cx, cy, 22, '#2a1a5e', 0.5);
  // Galaxy orb
  drawGalaxyOrb(ctx, cx, cy, 18, '#0a0820', '#2a1a5e', '#5a3ab0');
  drawNebulaNoise(ctx, cx, cy, 18, '#ffffff', 12);
  // Orbiting stars
  const starPositions: Array<[number, number, number]> = [
    [cx - 32, cy - 10, 3],
    [cx + 30, cy - 4, 2],
    [cx - 20, cy + 28, 2],
    [cx + 28, cy + 22, 3],
    [cx + 4, cy - 34, 2],
  ];
  for (const [x, y, size] of starPositions) {
    drawTwinkleStar(ctx, x, y, size, '#fde68a', '#ffffff');
  }
}

export function drawDivineThroneHQ(ctx: SKRSContext2D, ox: number, oy: number): void {
  const cx = ox + 64;
  const baseY = oy + 148;
  drawIsoShadow(ctx, cx, baseY + 4, 46, 14, 0.55);
  drawMarbleSteps(ctx, cx, baseY, 44, 3, '#f0ece0', '#b8a878');
  drawHaloDisc(ctx, cx, oy + 46, 38, '#fde68a', '#c09028');
  drawAngelWingPair(ctx, cx, oy + 40, 52, 22, '#ffffff', '#f0ece0');
  drawGoldenThrone(ctx, cx, oy + 86, 26, 34, '#fde68a', '#c09028');
  drawThroneArmrests(ctx, cx, oy + 100, 22, '#c09028');
  // Golden glow overlay
  addGlow(ctx, cx, oy + 70, 40, '#fde68a', 0.35);
  addGlow(ctx, cx, oy + 46, 26, '#ffffff', 0.3);
}

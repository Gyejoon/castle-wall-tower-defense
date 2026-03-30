import { createCanvas, type Canvas, type SKRSContext2D } from '@napi-rs/canvas';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { basename, dirname, extname } from 'path';

const OUTPUT_DIR = 'packages/web-shell/public/assets/ui-mobile';
const LOG_ARTIFACT_DIR = '.logs/artifacts';
const VERSION_TAG = 'v20260329';

type AssetKind = 'lobby-keyart' | 'tactical-dock-bg' | 'cta-point-art';

type GeneratedVariant = {
  asset: AssetKind;
  variant: string;
  prompt: string;
  filePath: string;
  publicPath: string;
  width: number;
  height: number;
  canvas: Canvas;
};

type LobbyConfig = {
  title: string;
  horizon: number;
  laneTopWidth: number;
  laneBottomWidth: number;
  cyanBias: number;
  magentaBias: number;
  goldBias: number;
  tilt: number;
  scanAlpha: number;
};

type DockConfig = {
  title: string;
  edgeGlow: string;
  gridAngle: number;
  compartmentCount: number;
  radarSweep: boolean;
  accentDensity: number;
};

type CtaConfig = {
  title: string;
  primary: string;
  secondary: string;
  orbit: boolean;
  burst: number;
  beamTilt: number;
};

type VariantSpec<T> = {
  asset: AssetKind;
  variant: string;
  prompt: string;
  width: number;
  height: number;
  config: T;
  paint: (ctx: SKRSContext2D, width: number, height: number, config: T) => void;
};

function makeCanvas(width: number, height: number) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  return { canvas, ctx };
}

function ensureDir(path: string) {
  mkdirSync(path, { recursive: true });
}

function saveCanvas(canvas: Canvas, filePath: string) {
  ensureDir(dirname(filePath));
  writeFileSync(filePath, canvas.toBuffer('image/png'));
  console.log(`wrote ${filePath}`);
}

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function uniquePath(basePath: string) {
  if (!existsSync(basePath)) return basePath;
  const extension = extname(basePath);
  const stem = basePath.slice(0, -extension.length);
  let index = 2;
  while (existsSync(`${stem}-${index}${extension}`)) index += 1;
  return `${stem}-${index}${extension}`;
}

function slugFor(asset: AssetKind, variant: string) {
  return `${asset}-${VERSION_TAG}-${variant}.png`;
}

function fillBackground(ctx: SKRSContext2D, width: number, height: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#050814');
  gradient.addColorStop(0.45, '#08101d');
  gradient.addColorStop(1, '#04060f');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(width * 0.68, height * 0.18, 0, width * 0.68, height * 0.18, width * 0.5);
  glow.addColorStop(0, 'rgba(0, 214, 255, 0.16)');
  glow.addColorStop(0.5, 'rgba(0, 214, 255, 0.05)');
  glow.addColorStop(1, 'rgba(0, 214, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  const magentaGlow = ctx.createRadialGradient(width * 0.24, height * 0.78, 0, width * 0.24, height * 0.78, width * 0.55);
  magentaGlow.addColorStop(0, 'rgba(255, 46, 168, 0.14)');
  magentaGlow.addColorStop(0.55, 'rgba(255, 46, 168, 0.05)');
  magentaGlow.addColorStop(1, 'rgba(255, 46, 168, 0)');
  ctx.fillStyle = magentaGlow;
  ctx.fillRect(0, 0, width, height);
}

function addVignette(ctx: SKRSContext2D, width: number, height: number, strength = 0.8) {
  const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.12, width / 2, height / 2, Math.max(width, height) * 0.72);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(0.58, 'rgba(0,0,0,0.08)');
  vignette.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

function addNoise(ctx: SKRSContext2D, width: number, height: number, density: number, color: string) {
  ctx.fillStyle = color;
  const count = Math.floor(width * height * density);
  for (let i = 0; i < count; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() > 0.92 ? 2 : 1;
    ctx.fillRect(x, y, size, size);
  }
}

function addScanlines(ctx: SKRSContext2D, width: number, height: number, alpha: number) {
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  for (let y = 0; y < height; y += 6) {
    ctx.fillRect(0, y, width, 1);
  }
}

function drawGlowLine(ctx: SKRSContext2D, fromX: number, fromY: number, toX: number, toY: number, color: string, width: number, glow: number) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = width;
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  ctx.restore();
}

function drawHexNode(ctx: SKRSContext2D, x: number, y: number, radius: number, stroke: string, fill: string) {
  ctx.save();
  ctx.beginPath();
  for (let index = 0; index < 6; index += 1) {
    const angle = -Math.PI / 2 + (Math.PI / 3) * index;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.shadowColor = stroke;
  ctx.shadowBlur = 24;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawPerspectiveGrid(
  ctx: SKRSContext2D,
  width: number,
  height: number,
  horizonY: number,
  tilt: number,
  color: string,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;

  const vanishingX = width * (0.5 + tilt);
  for (let x = -width * 0.2; x <= width * 1.2; x += width / 12) {
    ctx.beginPath();
    ctx.moveTo(x, height);
    ctx.lineTo(vanishingX, horizonY);
    ctx.stroke();
  }

  for (let step = 0; step < 14; step += 1) {
    const t = step / 13;
    const y = horizonY + (height - horizonY) * t * t;
    ctx.beginPath();
    ctx.moveTo(width * 0.08 + tilt * width * 0.2 * (1 - t), y);
    ctx.lineTo(width * 0.92 + tilt * width * 0.2 * (1 - t), y);
    ctx.stroke();
  }

  ctx.restore();
}

function fillLane(
  ctx: SKRSContext2D,
  width: number,
  height: number,
  horizonY: number,
  topWidth: number,
  bottomWidth: number,
  tilt: number,
  leftGlow: string,
  rightGlow: string,
) {
  const centerTopX = width * (0.5 + tilt * 0.4);
  const centerBottomX = width * 0.5;
  const topHalf = width * topWidth * 0.5;
  const bottomHalf = width * bottomWidth * 0.5;

  ctx.save();
  const laneGradient = ctx.createLinearGradient(0, horizonY, 0, height);
  laneGradient.addColorStop(0, 'rgba(16, 22, 39, 0.25)');
  laneGradient.addColorStop(0.38, 'rgba(8, 19, 35, 0.54)');
  laneGradient.addColorStop(1, 'rgba(5, 8, 16, 0.92)');
  ctx.fillStyle = laneGradient;
  ctx.beginPath();
  ctx.moveTo(centerTopX - topHalf, horizonY);
  ctx.lineTo(centerTopX + topHalf, horizonY);
  ctx.lineTo(centerBottomX + bottomHalf, height);
  ctx.lineTo(centerBottomX - bottomHalf, height);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  drawGlowLine(ctx, centerTopX - topHalf, horizonY, centerBottomX - bottomHalf, height, leftGlow, 4, 24);
  drawGlowLine(ctx, centerTopX + topHalf, horizonY, centerBottomX + bottomHalf, height, rightGlow, 4, 24);

  ctx.save();
  ctx.globalAlpha = 0.42;
  for (let step = 0; step < 10; step += 1) {
    const t = step / 9;
    const y = horizonY + (height - horizonY) * t * t;
    const halfWidth = topHalf + (bottomHalf - topHalf) * t;
    drawGlowLine(
      ctx,
      centerBottomX - halfWidth,
      y,
      centerBottomX + halfWidth,
      y,
      step % 2 === 0 ? withAlpha(leftGlow, 0.65) : withAlpha(rightGlow, 0.65),
      1.2,
      12,
    );
  }
  ctx.restore();
}

function drawCore(ctx: SKRSContext2D, x: number, y: number, radius: number, primary: string, secondary: string) {
  ctx.save();
  const glow = ctx.createRadialGradient(x, y, radius * 0.18, x, y, radius * 3.4);
  glow.addColorStop(0, withAlpha(primary, 0.85));
  glow.addColorStop(0.22, withAlpha(primary, 0.45));
  glow.addColorStop(0.5, withAlpha(secondary, 0.18));
  glow.addColorStop(1, withAlpha(secondary, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(x - radius * 4, y - radius * 4, radius * 8, radius * 8);

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha(primary, 0.18);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = primary;
  ctx.shadowColor = primary;
  ctx.shadowBlur = 30;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, radius * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = secondary;
  ctx.fill();
  ctx.restore();
}

function drawTowerCluster(ctx: SKRSContext2D, centerX: number, baseY: number, accent: string, count: number) {
  const offsets = [-140, -60, 28, 118, 190];
  for (let index = 0; index < count; index += 1) {
    const x = centerX + offsets[index];
    const height = 64 + index * 8;
    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 24;
    ctx.fillStyle = withAlpha('#06111c', 0.92);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - 26, baseY);
    ctx.lineTo(x - 16, baseY - height);
    ctx.lineTo(x + 16, baseY - height);
    ctx.lineTo(x + 26, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(x, baseY - height + 10, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = withAlpha('#fff3c8', 0.9);
    ctx.beginPath();
    ctx.moveTo(x, baseY - height + 10);
    ctx.lineTo(x + 24, baseY - height - 14);
    ctx.stroke();
    ctx.restore();
  }
}

function drawCornerBrackets(ctx: SKRSContext2D, width: number, height: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;

  const margin = 28;
  const size = 90;
  const corners: Array<[number, number, number, number, number, number]> = [
    [margin, margin + size, margin, margin, margin, margin + size],
    [width - margin - size, width - margin, margin, margin, width - margin, margin + size],
    [margin, margin + size, height - margin, height - margin, margin, height - margin - size],
    [
      width - margin - size,
      width - margin,
      height - margin,
      height - margin,
      width - margin,
      height - margin - size,
    ],
  ];

  for (const [x1, x2, y1, y2, x3, y3] of corners) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.stroke();
  }

  ctx.restore();
}

function paintLobbyKeyart(ctx: SKRSContext2D, width: number, height: number, config: LobbyConfig) {
  fillBackground(ctx, width, height);
  const cyan = '#00d6ff';
  const magenta = '#ff2ea8';
  const gold = '#ffd24d';
  const horizonY = height * config.horizon;

  drawPerspectiveGrid(ctx, width, height, horizonY, config.tilt, withAlpha(cyan, 0.18 + config.cyanBias * 0.12));
  fillLane(ctx, width, height, horizonY, config.laneTopWidth, config.laneBottomWidth, config.tilt, cyan, magenta);

  drawCore(ctx, width * 0.5, height * 0.18, 34 + config.magentaBias * 8, magenta, '#ffffff');
  drawCore(ctx, width * 0.5, height * 0.85, 42 + config.goldBias * 10, gold, '#ffffff');

  drawTowerCluster(ctx, width * 0.5, height * 0.76, cyan, 4);

  drawGlowLine(ctx, width * 0.2, height * 0.68, width * 0.8, height * 0.42, withAlpha(gold, 0.62), 2.5, 22);
  drawGlowLine(ctx, width * 0.76, height * 0.78, width * 0.31, height * 0.54, withAlpha(magenta, 0.5), 2, 18);

  drawHexNode(ctx, width * 0.22, height * 0.22, 34, cyan, 'rgba(0, 214, 255, 0.06)');
  drawHexNode(ctx, width * 0.78, height * 0.28, 26, magenta, 'rgba(255, 46, 168, 0.05)');
  drawHexNode(ctx, width * 0.84, height * 0.78, 18, gold, 'rgba(255, 210, 77, 0.05)');

  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  ctx.fillRect(width * 0.19, height * 0.08, width * 0.62, height * 0.16);
  ctx.restore();

  addNoise(ctx, width, height, 0.0008, 'rgba(255,255,255,0.08)');
  addScanlines(ctx, width, height, config.scanAlpha);
  drawCornerBrackets(ctx, width, height, withAlpha(cyan, 0.38));
  addVignette(ctx, width, height, 0.88);
}

function roundedRectPath(ctx: SKRSContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function paintDockBackground(ctx: SKRSContext2D, width: number, height: number, config: DockConfig) {
  ctx.clearRect(0, 0, width, height);

  const panelGradient = ctx.createLinearGradient(0, 0, 0, height);
  panelGradient.addColorStop(0, 'rgba(7, 12, 22, 0.98)');
  panelGradient.addColorStop(0.48, 'rgba(8, 14, 26, 0.96)');
  panelGradient.addColorStop(1, 'rgba(4, 8, 17, 0.98)');

  roundedRectPath(ctx, 0, 0, width, height, 40);
  ctx.fillStyle = panelGradient;
  ctx.fill();

  const edge = config.edgeGlow;
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = withAlpha(edge, 0.55);
  ctx.shadowColor = edge;
  ctx.shadowBlur = 26;
  roundedRectPath(ctx, 8, 8, width - 16, height - 16, 34);
  ctx.stroke();
  ctx.restore();

  const centerGradient = ctx.createRadialGradient(width * 0.5, height * 0.55, 0, width * 0.5, height * 0.55, width * 0.7);
  centerGradient.addColorStop(0, 'rgba(10, 18, 34, 0.44)');
  centerGradient.addColorStop(0.6, 'rgba(8, 14, 26, 0.12)');
  centerGradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = centerGradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(width * 0.5, height * 0.5);
  ctx.rotate(config.gridAngle);
  ctx.translate(-width * 0.5, -height * 0.5);
  ctx.strokeStyle = 'rgba(130, 157, 197, 0.09)';
  ctx.lineWidth = 1;
  for (let x = -width; x < width * 2; x += 36) {
    ctx.beginPath();
    ctx.moveTo(x, -height);
    ctx.lineTo(x, height * 2);
    ctx.stroke();
  }
  for (let y = -height; y < height * 2; y += 36) {
    ctx.beginPath();
    ctx.moveTo(-width, y);
    ctx.lineTo(width * 2, y);
    ctx.stroke();
  }
  ctx.restore();

  const compartmentWidth = 160;
  const innerMargin = 34;
  for (let index = 0; index < config.compartmentCount; index += 1) {
    const x = innerMargin + index * (compartmentWidth + 28);
    if (x + compartmentWidth > width - innerMargin) break;
    ctx.save();
    roundedRectPath(ctx, x, height * 0.24, compartmentWidth, height * 0.52, 24);
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.05 + index * 0.015})`;
    ctx.stroke();
    ctx.restore();
  }

  for (let index = 0; index < Math.floor(config.accentDensity * 10); index += 1) {
    const y = 44 + index * 36;
    drawGlowLine(ctx, 50, y, 120 + index * 22, y, withAlpha(edge, 0.45), 1.6, 12);
    drawGlowLine(ctx, width - 50, height - y, width - 170 - index * 20, height - y, withAlpha('#7c8fb7', 0.3), 1.2, 8);
  }

  if (config.radarSweep) {
    ctx.save();
    ctx.translate(width * 0.84, height * 0.3);
    ctx.strokeStyle = withAlpha(edge, 0.22);
    ctx.lineWidth = 1.6;
    for (let radius = 40; radius <= 120; radius += 24) {
      ctx.beginPath();
      ctx.arc(0, 0, radius, Math.PI * 0.15, Math.PI * 1.7);
      ctx.stroke();
    }
    const sweepGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 120);
    sweepGradient.addColorStop(0, withAlpha(edge, 0.22));
    sweepGradient.addColorStop(0.4, withAlpha(edge, 0.1));
    sweepGradient.addColorStop(1, withAlpha(edge, 0));
    ctx.fillStyle = sweepGradient;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 120, -0.1, 0.65);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  addNoise(ctx, width, height, 0.0005, 'rgba(255,255,255,0.05)');
  addScanlines(ctx, width, height, 0.018);
}

function paintCtaPointArt(ctx: SKRSContext2D, width: number, height: number, config: CtaConfig) {
  ctx.clearRect(0, 0, width, height);

  const midY = height * 0.52;
  const centerX = width * 0.58;
  const leftX = width * 0.24;
  const rightX = width * 0.82;

  const baseGlow = ctx.createRadialGradient(centerX, midY, 0, centerX, midY, width * 0.34);
  baseGlow.addColorStop(0, withAlpha(config.primary, 0.2));
  baseGlow.addColorStop(0.38, withAlpha(config.secondary, 0.12));
  baseGlow.addColorStop(1, withAlpha(config.primary, 0));
  ctx.fillStyle = baseGlow;
  ctx.fillRect(0, 0, width, height);

  drawGlowLine(ctx, leftX, midY + 30, centerX, midY - 18, withAlpha(config.primary, 0.8), 6, 28);
  drawGlowLine(ctx, centerX, midY - 18, rightX, midY + config.beamTilt, withAlpha(config.secondary, 0.82), 6, 28);
  drawGlowLine(ctx, leftX + 70, midY - 90, rightX - 34, midY + 88, 'rgba(255, 255, 255, 0.28)', 2, 16);

  for (let index = 0; index < config.burst; index += 1) {
    const t = index / Math.max(1, config.burst - 1);
    const x = leftX + (rightX - leftX) * t;
    const y = midY + Math.sin(t * Math.PI * 2) * 42;
    drawCore(ctx, x, y, 10 + (index % 3) * 2, index % 2 === 0 ? config.primary : config.secondary, '#ffffff');
  }

  if (config.orbit) {
    ctx.save();
    ctx.translate(centerX, midY);
    ctx.strokeStyle = withAlpha('#ffd24d', 0.42);
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ffd24d';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.ellipse(0, 0, 170, 72, -0.24, Math.PI * 0.12, Math.PI * 1.78);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1.4;
  for (let index = 0; index < 9; index += 1) {
    const x = 80 + index * 120;
    ctx.beginPath();
    ctx.moveTo(x, 30);
    ctx.lineTo(x + 36, height - 34);
    ctx.stroke();
  }
  ctx.restore();

  addNoise(ctx, width, height, 0.00055, 'rgba(255,255,255,0.08)');
}

const lobbyVariants: Array<VariantSpec<LobbyConfig>> = [
  {
    asset: 'lobby-keyart',
    variant: 'a',
    prompt:
      'vertical neon tactical corridor with clean title space, cyan-magenta lane grid, lower defensive towers, top and bottom cores, premium mobile key art',
    width: 900,
    height: 1400,
    config: {
      title: 'corridor-overwatch',
      horizon: 0.22,
      laneTopWidth: 0.08,
      laneBottomWidth: 0.48,
      cyanBias: 0.7,
      magentaBias: 0.55,
      goldBias: 0.3,
      tilt: -0.03,
      scanAlpha: 0.028,
    },
    paint: paintLobbyKeyart,
  },
  {
    asset: 'lobby-keyart',
    variant: 'b',
    prompt:
      'vertical tactical command vista with wider lane, stronger magenta pressure, brighter gold core, cinematic sci-fi defense poster for mobile lobby',
    width: 900,
    height: 1400,
    config: {
      title: 'pressure-column',
      horizon: 0.25,
      laneTopWidth: 0.11,
      laneBottomWidth: 0.58,
      cyanBias: 0.46,
      magentaBias: 0.82,
      goldBias: 0.58,
      tilt: 0.02,
      scanAlpha: 0.022,
    },
    paint: paintLobbyKeyart,
  },
  {
    asset: 'lobby-keyart',
    variant: 'c',
    prompt:
      'clean tactical poster with sharper radar overlays, narrow corridor, colder cyan instrumentation, negative space reserved for logo lockup',
    width: 900,
    height: 1400,
    config: {
      title: 'radar-approach',
      horizon: 0.2,
      laneTopWidth: 0.07,
      laneBottomWidth: 0.42,
      cyanBias: 0.88,
      magentaBias: 0.36,
      goldBias: 0.22,
      tilt: -0.06,
      scanAlpha: 0.03,
    },
    paint: paintLobbyKeyart,
  },
];

const dockVariants: Array<VariantSpec<DockConfig>> = [
  {
    asset: 'tactical-dock-bg',
    variant: 'a',
    prompt:
      'quiet premium mobile tactical dock with restrained cyan edge light, dark compartment grid, low-noise center area for controls',
    width: 1280,
    height: 720,
    config: {
      title: 'quiet-grid',
      edgeGlow: '#00d6ff',
      gridAngle: -0.12,
      compartmentCount: 5,
      radarSweep: false,
      accentDensity: 0.6,
    },
    paint: paintDockBackground,
  },
  {
    asset: 'tactical-dock-bg',
    variant: 'b',
    prompt:
      'mobile sci-fi tactics panel with compartment bays, cyan-violet edge accent, subtle radar sweep, premium HUD surface',
    width: 1280,
    height: 720,
    config: {
      title: 'bay-panel',
      edgeGlow: '#6f7bff',
      gridAngle: -0.08,
      compartmentCount: 4,
      radarSweep: true,
      accentDensity: 0.72,
    },
    paint: paintDockBackground,
  },
  {
    asset: 'tactical-dock-bg',
    variant: 'c',
    prompt:
      'heavier cyan command console with radar sweep geometry, layered dark glass panels, still readable under overlaid buttons',
    width: 1280,
    height: 720,
    config: {
      title: 'command-surface',
      edgeGlow: '#1ee3ff',
      gridAngle: -0.16,
      compartmentCount: 3,
      radarSweep: true,
      accentDensity: 0.9,
    },
    paint: paintDockBackground,
  },
];

const ctaVariants: Array<VariantSpec<CtaConfig>> = [
  {
    asset: 'cta-point-art',
    variant: 'a',
    prompt:
      'compact off-center cyan and magenta energy crossfire, transparent-friendly tactical CTA accent with readable center zone',
    width: 1280,
    height: 560,
    config: {
      title: 'crossfire',
      primary: '#00d6ff',
      secondary: '#ff2ea8',
      orbit: false,
      burst: 4,
      beamTilt: -36,
    },
    paint: paintCtaPointArt,
  },
  {
    asset: 'cta-point-art',
    variant: 'b',
    prompt:
      'three-node tactical energy flare with gold orbital ring, premium mobile CTA accent, controlled brightness and transparent falloff',
    width: 1280,
    height: 560,
    config: {
      title: 'orbital-burst',
      primary: '#ffd24d',
      secondary: '#00d6ff',
      orbit: true,
      burst: 3,
      beamTilt: 26,
    },
    paint: paintCtaPointArt,
  },
  {
    asset: 'cta-point-art',
    variant: 'c',
    prompt:
      'magenta-led energy nexus with cyan relay line, low-noise premium start button accent, diagonal motion and transparent edges',
    width: 1280,
    height: 560,
    config: {
      title: 'nexus-link',
      primary: '#ff2ea8',
      secondary: '#00d6ff',
      orbit: true,
      burst: 5,
      beamTilt: 54,
    },
    paint: paintCtaPointArt,
  },
];

function renderVariant<T>(spec: VariantSpec<T>): GeneratedVariant {
  const { canvas, ctx } = makeCanvas(spec.width, spec.height);
  spec.paint(ctx, spec.width, spec.height, spec.config);
  const fileName = slugFor(spec.asset, spec.variant);
  const filePath = uniquePath(`${OUTPUT_DIR}/${fileName}`);
  saveCanvas(canvas, filePath);
  return {
    asset: spec.asset,
    variant: spec.variant,
    prompt: spec.prompt,
    filePath,
    publicPath: filePath.replace('packages/web-shell/public/', ''),
    width: spec.width,
    height: spec.height,
    canvas,
  };
}

function createBoard(variants: GeneratedVariant[]) {
  const columns = 3;
  const slotWidth = 460;
  const slotHeight = 520;
  const gutter = 26;
  const boardWidth = columns * slotWidth + (columns + 1) * gutter;
  const rows = Math.ceil(variants.length / columns);
  const boardHeight = rows * slotHeight + (rows + 1) * gutter + 120;
  const { canvas, ctx } = makeCanvas(boardWidth, boardHeight);

  const bg = ctx.createLinearGradient(0, 0, 0, boardHeight);
  bg.addColorStop(0, '#050816');
  bg.addColorStop(1, '#080c14');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, boardWidth, boardHeight);

  ctx.fillStyle = '#f4f7ff';
  ctx.font = '28px sans-serif';
  ctx.fillText(`UI Mobile Variant Board ${VERSION_TAG}`, gutter, 54);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '18px sans-serif';
  ctx.fillText('Generated without built-in image_gen; procedural canvas fallback', gutter, 84);

  variants.forEach((variant, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = gutter + column * (slotWidth + gutter);
    const y = 120 + gutter + row * (slotHeight + gutter);
    const innerHeight = slotHeight - 84;

    roundedRectPath(ctx, x, y, slotWidth, slotHeight, 28);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.stroke();

    ctx.drawImage(variant.canvas as any, x + 16, y + 16, slotWidth - 32, innerHeight - 16);

    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.fillText(`${variant.asset} / ${variant.variant}`, x + 18, y + innerHeight + 24);

    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = '14px sans-serif';
    ctx.fillText(basename(variant.filePath), x + 18, y + innerHeight + 48);
  });

  const boardPath = uniquePath(`${LOG_ARTIFACT_DIR}/ui-mobile-variant-board-${VERSION_TAG}.png`);
  saveCanvas(canvas, boardPath);
  return boardPath;
}

async function main() {
  ensureDir(OUTPUT_DIR);
  ensureDir(LOG_ARTIFACT_DIR);

  const variants = [
    ...lobbyVariants.map(renderVariant),
    ...dockVariants.map(renderVariant),
    ...ctaVariants.map(renderVariant),
  ];

  const boardPath = createBoard(variants);
  const metadataPath = uniquePath(`${LOG_ARTIFACT_DIR}/ui-mobile-generation-${VERSION_TAG}.json`);
  const metadata = {
    generatedAt: new Date().toISOString(),
    versionTag: VERSION_TAG,
    boardPath,
    variants: variants.map(({ canvas: _canvas, ...variant }) => variant),
  };
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`wrote ${metadataPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

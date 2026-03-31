import { createCanvas, type Canvas, type SKRSContext2D } from '@napi-rs/canvas';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { basename, dirname, extname } from 'path';

const OUTPUT_DIR = 'packages/web-shell/public/assets/ui-mobile';
const LOG_ARTIFACT_DIR = '.logs/artifacts';
const VERSION_TAG = 'v20260329';
const VERSION_TAG_LOBBY = 'v20260331';

type AssetKind = 'lobby-keyart' | 'tactical-dock-bg' | 'cta-point-art';

type LobbyAssetKind =
  | 'courtyard-bg'
  | 'wartable-bg'
  | 'lordchamber-bg'
  | 'home-tab-icon-active'
  | 'home-tab-icon-inactive'
  | 'collection-tab-icon-active'
  | 'collection-tab-icon-inactive'
  | 'settings-tab-icon-active'
  | 'settings-tab-icon-inactive'
  | 'profile-avatar'
  | 'coin-icon'
  | 'trophy-icon';

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

/* ─── Living Castle Lobby ─── Design Tokens ─── */
const T = {
  bg: '#1a1208',
  panel: '#2a2010',
  border: '#4a3a20',
  accent: '#c8a04a',
  success: '#7ab648',
  danger: '#c03020',
  gold: '#f0d060',
  info: '#5bc8e8',
  text: '#f0e8d8',
  textSecondary: '#a09070',
} as const;

type CourtyardConfig = { title: string };
type WartableConfig = { title: string };
type LordchamberConfig = { title: string };
type TabIconConfig = { shape: 'home' | 'collection' | 'settings'; active: boolean };
type ProfileAvatarConfig = { title: string };
type CurrencyIconConfig = { shape: 'coin' | 'trophy' };

type LobbyVariantSpec<T> = {
  asset: LobbyAssetKind;
  variant: string;
  prompt: string;
  width: number;
  height: number;
  config: T;
  paint: (ctx: SKRSContext2D, width: number, height: number, config: T) => void;
};

function lobbySlugFor(asset: LobbyAssetKind, variant: string) {
  return `${asset}-${VERSION_TAG_LOBBY}-${variant}.png`;
}

/* ─── Paint: Courtyard Background ─── */
function paintCourtyardBg(ctx: SKRSContext2D, width: number, height: number, _config: CourtyardConfig) {
  // Night sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#0d1a2a');
  sky.addColorStop(0.4, '#14233a');
  sky.addColorStop(0.75, '#1a1208');
  sky.addColorStop(1, T.bg);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Stars — ~30 dots with varying opacity
  for (let i = 0; i < 32; i++) {
    const sx = Math.random() * width;
    const sy = Math.random() * height * 0.55;
    const starAlpha = 0.3 + Math.random() * 0.5;
    const starSize = Math.random() > 0.7 ? 2 : 1;
    ctx.fillStyle = `rgba(255, 255, 255, ${starAlpha})`;
    ctx.fillRect(sx, sy, starSize, starSize);
  }

  // Moon glow — subtle
  const moonX = width * 0.75;
  const moonY = height * 0.08;
  const moonGlow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 60);
  moonGlow.addColorStop(0, 'rgba(200, 200, 220, 0.18)');
  moonGlow.addColorStop(0.5, 'rgba(180, 180, 210, 0.06)');
  moonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = moonGlow;
  ctx.fillRect(moonX - 60, moonY - 60, 120, 120);

  // Castle wall silhouette — top 30%
  const wallTop = height * 0.12;
  const wallBottom = height * 0.35;
  ctx.fillStyle = '#0a0f1a';

  // Left tower
  ctx.fillRect(0, wallTop, width * 0.12, wallBottom - wallTop);
  // Left wall
  ctx.beginPath();
  ctx.moveTo(width * 0.12, wallTop + 20);
  ctx.lineTo(width * 0.12, wallBottom);
  ctx.lineTo(width * 0.35, wallBottom);
  ctx.lineTo(width * 0.35, wallTop + 40);
  ctx.closePath();
  ctx.fill();

  // Right tower
  ctx.fillRect(width * 0.88, wallTop, width * 0.12, wallBottom - wallTop);
  // Right wall
  ctx.beginPath();
  ctx.moveTo(width * 0.65, wallTop + 40);
  ctx.lineTo(width * 0.65, wallBottom);
  ctx.lineTo(width * 0.88, wallBottom);
  ctx.lineTo(width * 0.88, wallTop + 20);
  ctx.closePath();
  ctx.fill();

  // Crenellations on left wall
  for (let i = 0; i < 4; i++) {
    const cx = width * 0.14 + i * (width * 0.05);
    ctx.fillStyle = '#0a0f1a';
    ctx.fillRect(cx, wallTop + 30, width * 0.025, 14);
  }
  // Crenellations on right wall
  for (let i = 0; i < 4; i++) {
    const cx = width * 0.67 + i * (width * 0.05);
    ctx.fillStyle = '#0a0f1a';
    ctx.fillRect(cx, wallTop + 30, width * 0.025, 14);
  }

  // Wall highlight edges
  ctx.strokeStyle = withAlpha(T.border, 0.3);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, wallTop);
  ctx.lineTo(width * 0.12, wallTop);
  ctx.lineTo(width * 0.12, wallTop + 20);
  ctx.lineTo(width * 0.35, wallTop + 40);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(width * 0.65, wallTop + 40);
  ctx.lineTo(width * 0.88, wallTop + 20);
  ctx.lineTo(width * 0.88, wallTop);
  ctx.lineTo(width, wallTop);
  ctx.stroke();

  // Castle gate — centered arch
  const gateX = width * 0.38;
  const gateWidth = width * 0.24;
  const gateTop = wallBottom - height * 0.12;
  ctx.fillStyle = '#0a0f1a';
  ctx.fillRect(gateX, gateTop + 20, gateWidth, wallBottom - gateTop - 20);
  // Arch top
  ctx.beginPath();
  ctx.arc(gateX + gateWidth / 2, gateTop + 20, gateWidth / 2, Math.PI, 0);
  ctx.fill();

  // Warm glow from inside gate
  const gateGlow = ctx.createRadialGradient(
    gateX + gateWidth / 2, wallBottom, 0,
    gateX + gateWidth / 2, wallBottom - 20, gateWidth * 0.7,
  );
  gateGlow.addColorStop(0, withAlpha(T.accent, 0.2));
  gateGlow.addColorStop(0.4, withAlpha(T.accent, 0.1));
  gateGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gateGlow;
  ctx.fillRect(gateX - 20, gateTop, gateWidth + 40, wallBottom - gateTop + 40);

  // Gate inner warm fill
  ctx.save();
  ctx.fillStyle = withAlpha(T.accent, 0.15);
  ctx.fillRect(gateX + 4, gateTop + 24, gateWidth - 8, wallBottom - gateTop - 24);
  ctx.beginPath();
  ctx.arc(gateX + gateWidth / 2, gateTop + 20, gateWidth / 2 - 4, Math.PI, 0);
  ctx.fill();
  ctx.restore();

  // Torches — left of gate
  const torchLeftX = gateX - 18;
  const torchRightX = gateX + gateWidth + 18;
  const torchY = gateTop + 10;
  for (const tx of [torchLeftX, torchRightX]) {
    // Torch stick
    ctx.fillStyle = '#3a2a10';
    ctx.fillRect(tx - 2, torchY, 4, 30);

    // Flame glow
    const flameGlow = ctx.createRadialGradient(tx, torchY - 4, 0, tx, torchY - 4, 36);
    flameGlow.addColorStop(0, withAlpha(T.gold, 0.6));
    flameGlow.addColorStop(0.3, withAlpha(T.gold, 0.25));
    flameGlow.addColorStop(0.6, withAlpha('#ff8020', 0.1));
    flameGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = flameGlow;
    ctx.fillRect(tx - 40, torchY - 40, 80, 80);

    // Flame core
    ctx.fillStyle = withAlpha('#ffe0a0', 0.9);
    ctx.beginPath();
    ctx.arc(tx, torchY - 4, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Grass area — bottom 25%
  const grassTop = height * 0.75;
  const grass = ctx.createLinearGradient(0, grassTop, 0, height);
  grass.addColorStop(0, '#1a2a10');
  grass.addColorStop(0.5, '#152208');
  grass.addColorStop(1, '#0f1a08');
  ctx.fillStyle = grass;
  ctx.fillRect(0, grassTop, width, height - grassTop);

  // Grass texture — small vertical lines
  for (let i = 0; i < 80; i++) {
    const gx = Math.random() * width;
    const gy = grassTop + Math.random() * (height - grassTop);
    ctx.strokeStyle = withAlpha('#2a3a18', 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + (Math.random() - 0.5) * 3, gy - 3 - Math.random() * 4);
    ctx.stroke();
  }

  // Cobblestone path hint — center bottom area
  const pathLeft = width * 0.32;
  const pathRight = width * 0.68;
  const pathTop = wallBottom;
  ctx.fillStyle = withAlpha('#2a2218', 0.4);
  ctx.beginPath();
  ctx.moveTo(gateX + 4, pathTop);
  ctx.lineTo(gateX + gateWidth - 4, pathTop);
  ctx.lineTo(pathRight, height);
  ctx.lineTo(pathLeft, height);
  ctx.closePath();
  ctx.fill();

  // Cobblestone lines
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const cy = pathTop + (height - pathTop) * t;
    const leftEdge = gateX + 4 + (pathLeft - gateX - 4) * t;
    const rightEdge = gateX + gateWidth - 4 + (pathRight - gateX - gateWidth + 4) * t;
    ctx.strokeStyle = withAlpha('#3a3020', 0.2);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftEdge, cy);
    ctx.lineTo(rightEdge, cy);
    ctx.stroke();
  }

  // Ambient light from torches cast on ground
  for (const tx of [torchLeftX, torchRightX]) {
    const groundGlow = ctx.createRadialGradient(tx, grassTop, 0, tx, grassTop, 80);
    groundGlow.addColorStop(0, withAlpha(T.gold, 0.08));
    groundGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = groundGlow;
    ctx.fillRect(tx - 80, grassTop - 40, 160, 120);
  }

  // Noise and vignette
  addNoise(ctx, width, height, 0.0006, 'rgba(255, 255, 255, 0.04)');
  addVignette(ctx, width, height, 0.85);
}

/* ─── Paint: War Table Background ─── */
function paintWartableBg(ctx: SKRSContext2D, width: number, height: number, _config: WartableConfig) {
  // Dark wood gradient background
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, T.panel);
  bg.addColorStop(0.5, '#221a0c');
  bg.addColorStop(1, T.bg);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Wood grain texture — horizontal lines
  for (let y = 0; y < height; y += 8) {
    ctx.strokeStyle = withAlpha('#3a2a14', 0.12 + Math.random() * 0.08);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y + Math.random() * 3);
    ctx.lineTo(width, y + Math.random() * 3);
    ctx.stroke();
  }

  // Shelves/wall details — top area
  for (let i = 0; i < 3; i++) {
    const sy = 40 + i * 55;
    ctx.strokeStyle = withAlpha(T.border, 0.3);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width * 0.05, sy);
    ctx.lineTo(width * 0.95, sy);
    ctx.stroke();
    // Shelf shadow
    ctx.fillStyle = withAlpha('#000000', 0.1);
    ctx.fillRect(width * 0.05, sy, width * 0.9, 6);
  }

  // Wooden table surface
  const tableX = width * 0.08;
  const tableY = height * 0.32;
  const tableW = width * 0.84;
  const tableH = height * 0.48;
  ctx.fillStyle = '#3a3018';
  ctx.fillRect(tableX, tableY, tableW, tableH);
  ctx.strokeStyle = withAlpha(T.border, 0.5);
  ctx.lineWidth = 2;
  ctx.strokeRect(tableX, tableY, tableW, tableH);

  // Table wood grain
  for (let y = tableY; y < tableY + tableH; y += 6) {
    ctx.strokeStyle = withAlpha('#4a3a1a', 0.15);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tableX + 4, y + Math.random() * 2);
    ctx.lineTo(tableX + tableW - 4, y + Math.random() * 2);
    ctx.stroke();
  }

  // Parchment map on table
  const mapX = tableX + tableW * 0.12;
  const mapY = tableY + tableH * 0.1;
  const mapW = tableW * 0.76;
  const mapH = tableH * 0.8;
  ctx.fillStyle = withAlpha('#d4c8a0', 0.12);
  ctx.fillRect(mapX, mapY, mapW, mapH);
  ctx.strokeStyle = withAlpha('#b0a070', 0.15);
  ctx.lineWidth = 1;
  ctx.strokeRect(mapX, mapY, mapW, mapH);

  // Map grid lines
  for (let i = 1; i < 6; i++) {
    ctx.strokeStyle = withAlpha('#b0a070', 0.07);
    ctx.beginPath();
    ctx.moveTo(mapX + (mapW / 6) * i, mapY);
    ctx.lineTo(mapX + (mapW / 6) * i, mapY + mapH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mapX, mapY + (mapH / 6) * i);
    ctx.lineTo(mapX + mapW, mapY + (mapH / 6) * i);
    ctx.stroke();
  }

  // Tower miniatures on the map — 4 small tower silhouettes
  const towerPositions = [
    { x: mapX + mapW * 0.2, y: mapY + mapH * 0.3 },
    { x: mapX + mapW * 0.5, y: mapY + mapH * 0.2 },
    { x: mapX + mapW * 0.75, y: mapY + mapH * 0.55 },
    { x: mapX + mapW * 0.35, y: mapY + mapH * 0.7 },
  ];
  for (const tp of towerPositions) {
    ctx.fillStyle = withAlpha(T.accent, 0.7);
    // Tower base
    ctx.fillRect(tp.x - 4, tp.y, 8, 12);
    // Tower top
    ctx.beginPath();
    ctx.moveTo(tp.x - 6, tp.y);
    ctx.lineTo(tp.x, tp.y - 8);
    ctx.lineTo(tp.x + 6, tp.y);
    ctx.closePath();
    ctx.fill();
    // Glow dot
    ctx.fillStyle = withAlpha(T.gold, 0.5);
    ctx.beginPath();
    ctx.arc(tp.x, tp.y - 5, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Candle glow — 2 warm light sources
  const candlePositions = [
    { x: tableX + 30, y: tableY + 20 },
    { x: tableX + tableW - 30, y: tableY + 20 },
  ];
  for (const cp of candlePositions) {
    // Candle stick
    ctx.fillStyle = '#5a4a30';
    ctx.fillRect(cp.x - 2, cp.y, 4, 16);

    // Warm glow
    const candleGlow = ctx.createRadialGradient(cp.x, cp.y - 4, 0, cp.x, cp.y - 4, 80);
    candleGlow.addColorStop(0, withAlpha(T.gold, 0.35));
    candleGlow.addColorStop(0.3, withAlpha(T.gold, 0.15));
    candleGlow.addColorStop(0.7, withAlpha('#ff8020', 0.05));
    candleGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = candleGlow;
    ctx.fillRect(cp.x - 80, cp.y - 84, 160, 168);

    // Flame
    ctx.fillStyle = withAlpha('#ffe0a0', 0.85);
    ctx.beginPath();
    ctx.arc(cp.x, cp.y - 4, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Noise and vignette
  addNoise(ctx, width, height, 0.0005, 'rgba(255, 255, 255, 0.03)');
  addVignette(ctx, width, height, 0.8);
}

/* ─── Paint: Lord Chamber Background ─── */
function paintLordchamberBg(ctx: SKRSContext2D, width: number, height: number, _config: LordchamberConfig) {
  // Rich dark interior gradient
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, T.bg);
  bg.addColorStop(0.5, '#2a1a10');
  bg.addColorStop(1, T.bg);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Stone wall texture
  for (let y = 0; y < height; y += 16) {
    for (let x = 0; x < width; x += 24) {
      const offset = (Math.floor(y / 16) % 2) * 12;
      ctx.strokeStyle = withAlpha('#2a2018', 0.1);
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x + offset, y, 24, 16);
    }
  }

  // Banners/tapestries — 2 vertical rectangles on sides
  const bannerW = width * 0.1;
  const bannerH = height * 0.4;
  const bannerTop = height * 0.12;
  // Left banner
  ctx.fillStyle = withAlpha(T.danger, 0.25);
  ctx.fillRect(width * 0.08, bannerTop, bannerW, bannerH);
  ctx.strokeStyle = withAlpha(T.gold, 0.3);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(width * 0.08, bannerTop, bannerW, bannerH);
  // Banner emblem — simple cross
  const lbCx = width * 0.08 + bannerW / 2;
  const lbCy = bannerTop + bannerH * 0.4;
  ctx.strokeStyle = withAlpha(T.gold, 0.4);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(lbCx, lbCy - 15);
  ctx.lineTo(lbCx, lbCy + 15);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(lbCx - 10, lbCy);
  ctx.lineTo(lbCx + 10, lbCy);
  ctx.stroke();

  // Right banner
  ctx.fillStyle = withAlpha(T.danger, 0.25);
  ctx.fillRect(width * 0.82, bannerTop, bannerW, bannerH);
  ctx.strokeStyle = withAlpha(T.gold, 0.3);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(width * 0.82, bannerTop, bannerW, bannerH);
  const rbCx = width * 0.82 + bannerW / 2;
  const rbCy = bannerTop + bannerH * 0.4;
  ctx.strokeStyle = withAlpha(T.gold, 0.4);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rbCx, rbCy - 15);
  ctx.lineTo(rbCx, rbCy + 15);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rbCx - 10, rbCy);
  ctx.lineTo(rbCx + 10, rbCy);
  ctx.stroke();

  // Throne silhouette — centered, ornate shape
  const throneX = width * 0.5;
  const throneBase = height * 0.65;
  const throneTop = height * 0.2;
  // Throne back — tall rectangle with pointed top
  ctx.fillStyle = withAlpha('#1a1008', 0.9);
  ctx.beginPath();
  ctx.moveTo(throneX - 40, throneBase);
  ctx.lineTo(throneX - 50, throneTop + 60);
  ctx.lineTo(throneX - 35, throneTop + 20);
  ctx.lineTo(throneX - 20, throneTop);
  ctx.lineTo(throneX, throneTop - 15);
  ctx.lineTo(throneX + 20, throneTop);
  ctx.lineTo(throneX + 35, throneTop + 20);
  ctx.lineTo(throneX + 50, throneTop + 60);
  ctx.lineTo(throneX + 40, throneBase);
  ctx.closePath();
  ctx.fill();

  // Throne border outlines
  ctx.strokeStyle = withAlpha(T.border, 0.5);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(throneX - 40, throneBase);
  ctx.lineTo(throneX - 50, throneTop + 60);
  ctx.lineTo(throneX - 35, throneTop + 20);
  ctx.lineTo(throneX - 20, throneTop);
  ctx.lineTo(throneX, throneTop - 15);
  ctx.lineTo(throneX + 20, throneTop);
  ctx.lineTo(throneX + 35, throneTop + 20);
  ctx.lineTo(throneX + 50, throneTop + 60);
  ctx.lineTo(throneX + 40, throneBase);
  ctx.stroke();

  // Throne seat
  ctx.fillStyle = withAlpha('#2a1a0a', 0.8);
  ctx.fillRect(throneX - 35, throneBase - 30, 70, 30);
  ctx.strokeStyle = withAlpha(T.border, 0.4);
  ctx.strokeRect(throneX - 35, throneBase - 30, 70, 30);

  // Throne armrests
  ctx.fillStyle = withAlpha('#2a1a0a', 0.7);
  ctx.fillRect(throneX - 55, throneBase - 50, 18, 50);
  ctx.fillRect(throneX + 37, throneBase - 50, 18, 50);
  ctx.strokeStyle = withAlpha(T.border, 0.35);
  ctx.strokeRect(throneX - 55, throneBase - 50, 18, 50);
  ctx.strokeRect(throneX + 37, throneBase - 50, 18, 50);

  // Gold trim details — thin accent lines
  ctx.strokeStyle = withAlpha(T.gold, 0.35);
  ctx.lineWidth = 1;
  // Horizontal gold line across top
  ctx.beginPath();
  ctx.moveTo(width * 0.05, height * 0.08);
  ctx.lineTo(width * 0.95, height * 0.08);
  ctx.stroke();
  // Floor gold line
  ctx.beginPath();
  ctx.moveTo(width * 0.1, height * 0.72);
  ctx.lineTo(width * 0.9, height * 0.72);
  ctx.stroke();
  // Vertical column lines
  ctx.strokeStyle = withAlpha(T.gold, 0.2);
  ctx.beginPath();
  ctx.moveTo(width * 0.22, height * 0.08);
  ctx.lineTo(width * 0.22, height * 0.72);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(width * 0.78, height * 0.08);
  ctx.lineTo(width * 0.78, height * 0.72);
  ctx.stroke();

  // Candlelight — warm ambient glow centered above throne
  const candleGlow = ctx.createRadialGradient(throneX, throneTop - 40, 0, throneX, throneTop, 120);
  candleGlow.addColorStop(0, withAlpha(T.gold, 0.2));
  candleGlow.addColorStop(0.4, withAlpha(T.gold, 0.08));
  candleGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = candleGlow;
  ctx.fillRect(throneX - 120, throneTop - 140, 240, 280);

  // Crown/jewel on throne top
  ctx.fillStyle = withAlpha(T.gold, 0.7);
  ctx.beginPath();
  ctx.arc(throneX, throneTop - 10, 4, 0, Math.PI * 2);
  ctx.fill();

  // Floor area — darker
  ctx.fillStyle = withAlpha('#0f0a04', 0.5);
  ctx.fillRect(0, height * 0.72, width, height * 0.28);

  // Red carpet hint
  ctx.fillStyle = withAlpha(T.danger, 0.08);
  ctx.fillRect(width * 0.38, height * 0.65, width * 0.24, height * 0.35);

  // Noise and vignette
  addNoise(ctx, width, height, 0.0005, 'rgba(255, 255, 255, 0.03)');
  addVignette(ctx, width, height, 0.82);
}

/* ─── Paint: Tab Icons (32×32) ─── */
function paintTabIcon(ctx: SKRSContext2D, width: number, height: number, config: TabIconConfig) {
  ctx.clearRect(0, 0, width, height);
  const color = config.active ? T.gold : withAlpha(T.textSecondary, 0.6);

  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const cx = width / 2;
  const cy = height / 2;

  if (config.shape === 'home') {
    // Castle/home icon — simple house with turrets
    ctx.beginPath();
    // Roof peak
    ctx.moveTo(cx, 4);
    ctx.lineTo(cx + 12, 14);
    ctx.lineTo(cx + 10, 14);
    ctx.lineTo(cx + 10, 26);
    ctx.lineTo(cx + 4, 26);
    ctx.lineTo(cx + 4, 20);
    ctx.lineTo(cx - 4, 20);
    ctx.lineTo(cx - 4, 26);
    ctx.lineTo(cx - 10, 26);
    ctx.lineTo(cx - 10, 14);
    ctx.lineTo(cx - 12, 14);
    ctx.closePath();
    ctx.fill();
    // Turret left
    ctx.fillRect(cx - 12, 10, 4, 6);
    // Turret right
    ctx.fillRect(cx + 8, 10, 4, 6);
  } else if (config.shape === 'collection') {
    // Scroll/book icon
    ctx.beginPath();
    // Book body
    ctx.moveTo(cx - 10, 6);
    ctx.lineTo(cx + 8, 6);
    ctx.lineTo(cx + 10, 8);
    ctx.lineTo(cx + 10, 26);
    ctx.lineTo(cx - 10, 26);
    ctx.closePath();
    ctx.fill();
    // Page lines
    ctx.strokeStyle = config.active ? '#1a1208' : '#2a2218';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const ly = 12 + i * 4;
      ctx.beginPath();
      ctx.moveTo(cx - 6, ly);
      ctx.lineTo(cx + 6, ly);
      ctx.stroke();
    }
    // Spine
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 10, 6);
    ctx.lineTo(cx - 10, 26);
    ctx.stroke();
  } else {
    // Gear/settings icon
    const outerR = 11;
    const innerR = 7;
    const teeth = 8;
    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
      const angle1 = (Math.PI * 2 * i) / teeth;
      const angle2 = (Math.PI * 2 * (i + 0.35)) / teeth;
      const angle3 = (Math.PI * 2 * (i + 0.5)) / teeth;
      const angle4 = (Math.PI * 2 * (i + 0.85)) / teeth;
      if (i === 0) {
        ctx.moveTo(cx + Math.cos(angle1) * outerR, cy + Math.sin(angle1) * outerR);
      } else {
        ctx.lineTo(cx + Math.cos(angle1) * outerR, cy + Math.sin(angle1) * outerR);
      }
      ctx.lineTo(cx + Math.cos(angle2) * outerR, cy + Math.sin(angle2) * outerR);
      ctx.lineTo(cx + Math.cos(angle3) * innerR, cy + Math.sin(angle3) * innerR);
      ctx.lineTo(cx + Math.cos(angle4) * innerR, cy + Math.sin(angle4) * innerR);
    }
    ctx.closePath();
    ctx.fill();
    // Inner circle cutout
    ctx.fillStyle = config.active ? withAlpha('#1a1208', 0.8) : withAlpha('#1a1208', 0.6);
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ─── Paint: Profile Avatar (48×48) ─── */
function paintProfileAvatar(ctx: SKRSContext2D, width: number, height: number, _config: ProfileAvatarConfig) {
  ctx.clearRect(0, 0, width, height);
  const cx = width / 2;
  const cy = height / 2;

  // Background circle
  ctx.fillStyle = withAlpha(T.panel, 0.8);
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = withAlpha(T.gold, 0.6);
  ctx.lineWidth = 2;
  ctx.stroke();

  // Knight helmet silhouette
  ctx.fillStyle = withAlpha(T.border, 0.9);
  // Helmet dome
  ctx.beginPath();
  ctx.arc(cx, cy - 4, 12, Math.PI, 0);
  ctx.lineTo(cx + 12, cy + 6);
  ctx.lineTo(cx + 8, cy + 10);
  ctx.lineTo(cx - 8, cy + 10);
  ctx.lineTo(cx - 12, cy + 6);
  ctx.closePath();
  ctx.fill();

  // Visor slit
  ctx.fillStyle = withAlpha(T.accent, 0.6);
  ctx.fillRect(cx - 8, cy - 2, 16, 3);

  // Helmet crest — gold accent
  ctx.strokeStyle = withAlpha(T.gold, 0.8);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 16);
  ctx.lineTo(cx, cy - 10);
  ctx.stroke();

  // Gold trim on helmet edge
  ctx.strokeStyle = withAlpha(T.gold, 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy - 4, 12, Math.PI, 0);
  ctx.stroke();
}

/* ─── Paint: Currency Icons (24×24) ─── */
function paintCurrencyIcon(ctx: SKRSContext2D, width: number, height: number, config: CurrencyIconConfig) {
  ctx.clearRect(0, 0, width, height);
  const cx = width / 2;
  const cy = height / 2;

  if (config.shape === 'coin') {
    // Gold coin
    ctx.fillStyle = T.gold;
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();

    // Inner ring
    ctx.strokeStyle = withAlpha('#c8a020', 1);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.stroke();

    // Dollar/G symbol
    ctx.fillStyle = '#a08020';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('G', cx, cy + 1);

    // Shine highlight
    ctx.fillStyle = withAlpha('#ffffff', 0.4);
    ctx.beginPath();
    ctx.arc(cx - 3, cy - 3, 3, 0, Math.PI * 2);
    ctx.fill();

    // Edge shadow
    ctx.strokeStyle = withAlpha('#806010', 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Trophy cup
    ctx.fillStyle = T.accent;

    // Cup body
    ctx.beginPath();
    ctx.moveTo(cx - 7, 4);
    ctx.lineTo(cx + 7, 4);
    ctx.lineTo(cx + 5, 14);
    ctx.lineTo(cx - 5, 14);
    ctx.closePath();
    ctx.fill();

    // Cup handles
    ctx.strokeStyle = T.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx - 8, 8, 4, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 8, 8, 4, Math.PI * 0.5, -Math.PI * 0.5);
    ctx.stroke();

    // Stem
    ctx.fillStyle = T.accent;
    ctx.fillRect(cx - 1.5, 14, 3, 4);

    // Base
    ctx.fillRect(cx - 5, 18, 10, 2);

    // Shine
    ctx.fillStyle = withAlpha('#ffffff', 0.3);
    ctx.fillRect(cx - 3, 6, 2, 5);
  }
}

/* ─── Lobby Variant Specs ─── */

const courtyardVariants: Array<LobbyVariantSpec<CourtyardConfig>> = [
  {
    asset: 'courtyard-bg',
    variant: 'a',
    prompt: 'castle courtyard at night with torches, gate arch, cobblestone path, stars, medieval fantasy mobile lobby background',
    width: 430,
    height: 800,
    config: { title: 'courtyard-night' },
    paint: paintCourtyardBg,
  },
];

const wartableVariants: Array<LobbyVariantSpec<WartableConfig>> = [
  {
    asset: 'wartable-bg',
    variant: 'a',
    prompt: 'dark war room with wooden table, parchment map, tower miniatures, candle glow, medieval strategy planning room',
    width: 430,
    height: 800,
    config: { title: 'wartable-strategy' },
    paint: paintWartableBg,
  },
];

const lordchamberVariants: Array<LobbyVariantSpec<LordchamberConfig>> = [
  {
    asset: 'lordchamber-bg',
    variant: 'a',
    prompt: 'dark lord chamber with ornate throne, red banners, gold trim, candlelight, medieval fantasy throne room',
    width: 430,
    height: 800,
    config: { title: 'lordchamber-throne' },
    paint: paintLordchamberBg,
  },
];

const tabIconVariants: Array<LobbyVariantSpec<TabIconConfig>> = [
  {
    asset: 'home-tab-icon-active', variant: 'a',
    prompt: 'active home/castle tab icon, gold, 32x32 pixel art',
    width: 32, height: 32,
    config: { shape: 'home', active: true },
    paint: paintTabIcon,
  },
  {
    asset: 'home-tab-icon-inactive', variant: 'a',
    prompt: 'inactive home/castle tab icon, muted, 32x32 pixel art',
    width: 32, height: 32,
    config: { shape: 'home', active: false },
    paint: paintTabIcon,
  },
  {
    asset: 'collection-tab-icon-active', variant: 'a',
    prompt: 'active collection/scroll tab icon, gold, 32x32 pixel art',
    width: 32, height: 32,
    config: { shape: 'collection', active: true },
    paint: paintTabIcon,
  },
  {
    asset: 'collection-tab-icon-inactive', variant: 'a',
    prompt: 'inactive collection/scroll tab icon, muted, 32x32 pixel art',
    width: 32, height: 32,
    config: { shape: 'collection', active: false },
    paint: paintTabIcon,
  },
  {
    asset: 'settings-tab-icon-active', variant: 'a',
    prompt: 'active settings/gear tab icon, gold, 32x32 pixel art',
    width: 32, height: 32,
    config: { shape: 'settings', active: true },
    paint: paintTabIcon,
  },
  {
    asset: 'settings-tab-icon-inactive', variant: 'a',
    prompt: 'inactive settings/gear tab icon, muted, 32x32 pixel art',
    width: 32, height: 32,
    config: { shape: 'settings', active: false },
    paint: paintTabIcon,
  },
];

const profileAvatarVariants: Array<LobbyVariantSpec<ProfileAvatarConfig>> = [
  {
    asset: 'profile-avatar', variant: 'a',
    prompt: 'knight helmet profile avatar with gold accent, 48x48 pixel art',
    width: 48, height: 48,
    config: { title: 'knight-helmet' },
    paint: paintProfileAvatar,
  },
];

const currencyIconVariants: Array<LobbyVariantSpec<CurrencyIconConfig>> = [
  {
    asset: 'coin-icon', variant: 'a',
    prompt: 'gold coin with shine highlight, 24x24 pixel art currency icon',
    width: 24, height: 24,
    config: { shape: 'coin' },
    paint: paintCurrencyIcon,
  },
  {
    asset: 'trophy-icon', variant: 'a',
    prompt: 'trophy cup with accent color, 24x24 pixel art currency icon',
    width: 24, height: 24,
    config: { shape: 'trophy' },
    paint: paintCurrencyIcon,
  },
];

function renderLobbyVariant<T>(spec: LobbyVariantSpec<T>): GeneratedVariant {
  const { canvas, ctx } = makeCanvas(spec.width, spec.height);
  spec.paint(ctx, spec.width, spec.height, spec.config);
  const fileName = lobbySlugFor(spec.asset, spec.variant);
  const filePath = uniquePath(`${OUTPUT_DIR}/${fileName}`);
  saveCanvas(canvas, filePath);
  return {
    asset: spec.asset as unknown as AssetKind,
    variant: spec.variant,
    prompt: spec.prompt,
    filePath,
    publicPath: filePath.replace('packages/web-shell/public/', ''),
    width: spec.width,
    height: spec.height,
    canvas,
  };
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

  // Living Castle lobby assets
  const lobbySceneVariants = [
    ...courtyardVariants.map(renderLobbyVariant),
    ...wartableVariants.map(renderLobbyVariant),
    ...lordchamberVariants.map(renderLobbyVariant),
    ...tabIconVariants.map(renderLobbyVariant),
    ...profileAvatarVariants.map(renderLobbyVariant),
    ...currencyIconVariants.map(renderLobbyVariant),
  ];

  variants.push(...lobbySceneVariants);

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

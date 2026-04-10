import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'fs';

const OUT_DIR = 'packages/web-shell/public/assets/structures';

function drawWallStone(): Buffer {
  const canvas = createCanvas(32, 32);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#6c6b68';
  ctx.fillRect(0, 8, 32, 20);
  ctx.strokeStyle = '#2f2e2c';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 8.5, 31, 19);
  ctx.fillStyle = '#8a8985';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(1 + i * 8, 10, 6, 6);
    ctx.fillRect(1 + i * 8 + 4, 18, 6, 6);
  }
  return canvas.toBuffer('image/png');
}

function drawObelisk(): Buffer {
  const canvas = createCanvas(32, 64);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2a1838';
  ctx.beginPath();
  ctx.moveTo(16, 4);
  ctx.lineTo(26, 60);
  ctx.lineTo(6, 60);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#c8a04a';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#3a2848';
  ctx.beginPath();
  ctx.moveTo(16, 4);
  ctx.lineTo(16, 60);
  ctx.lineTo(6, 60);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#9060e0';
  ctx.fillRect(14, 14, 4, 4);
  ctx.fillRect(14, 24, 4, 4);
  ctx.fillRect(14, 34, 4, 4);
  return canvas.toBuffer('image/png');
}

function drawBrokenTower(): Buffer {
  const canvas = createCanvas(32, 64);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#7a7066';
  ctx.fillRect(8, 20, 16, 40);
  ctx.fillStyle = '#9a8f82';
  ctx.fillRect(10, 22, 12, 4);
  ctx.fillRect(10, 30, 12, 4);
  ctx.fillStyle = '#3a3630';
  ctx.fillRect(14, 38, 4, 12);
  ctx.fillStyle = '#5a5048';
  ctx.fillRect(6, 18, 20, 4);
  return canvas.toBuffer('image/png');
}

export async function generateStructures() {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(`${OUT_DIR}/wall-stone.png`, drawWallStone());
  writeFileSync(`${OUT_DIR}/obelisk.png`, drawObelisk());
  writeFileSync(`${OUT_DIR}/broken-tower.png`, drawBrokenTower());
  console.log('  wrote structure sprites →', OUT_DIR);
}

if (import.meta.main) {
  await generateStructures();
}

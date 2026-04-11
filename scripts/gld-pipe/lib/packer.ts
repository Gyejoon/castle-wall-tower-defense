/** Simple shelf-based bin packer for texture atlases */

export interface PackRect {
  key: string;
  w: number;
  h: number;
}

export interface PackedRect extends PackRect {
  x: number;
  y: number;
}

export interface PackResult {
  width: number;
  height: number;
  rects: PackedRect[];
  utilization: number;
}

/** Pack rectangles into a power-of-2 atlas using shelf algorithm */
export function shelfPack(rects: PackRect[], padding: number = 1): PackResult {
  // Sort by height descending for better shelf packing
  const sorted = [...rects].sort((a, b) => b.h - a.h);

  // Try increasing atlas sizes until everything fits
  for (let size = 256; size <= 4096; size *= 2) {
    const result = tryPack(sorted, size, size, padding);
    if (result) return result;
  }

  // Fallback: try non-square
  for (let w = 256; w <= 8192; w *= 2) {
    for (let h = 256; h <= 8192; h *= 2) {
      const result = tryPack(sorted, w, h, padding);
      if (result) return result;
    }
  }

  throw new Error(`Cannot pack ${rects.length} rects into any reasonable atlas size`);
}

function tryPack(
  rects: PackRect[],
  maxW: number,
  maxH: number,
  padding: number,
): PackResult | null {
  const placed: PackedRect[] = [];
  let shelfY = 0;
  let shelfH = 0;
  let cursorX = 0;

  for (const rect of rects) {
    // Reject rects that exceed atlas bounds entirely
    if (rect.w + padding > maxW || rect.h + padding > maxH) return null;

    const pw = rect.w + padding;
    const ph = rect.h + padding;

    // Does it fit on current shelf?
    if (cursorX + pw > maxW) {
      // New shelf
      shelfY += shelfH + padding;
      shelfH = 0;
      cursorX = 0;
    }

    if (shelfY + ph > maxH) return null; // Doesn't fit

    placed.push({ ...rect, x: cursorX, y: shelfY });
    cursorX += pw;
    shelfH = Math.max(shelfH, ph);
  }

  const usedH = shelfY + shelfH;
  const totalArea = maxW * maxH;
  const usedArea = rects.reduce((s, r) => s + r.w * r.h, 0);

  return {
    width: maxW,
    height: nearestPow2(usedH),
    rects: placed,
    utilization: usedArea / totalArea,
  };
}

function nearestPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

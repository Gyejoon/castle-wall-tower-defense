/** Color conversion & distance utilities (CIE76 ΔE in Lab space) */

export interface RGB { r: number; g: number; b: number }
export interface Lab { L: number; a: number; b: number }

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

/** sRGB → CIE XYZ (D65) */
function rgbToXyz(rgb: RGB): { x: number; y: number; z: number } {
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;
  r = r > 0.04045 ? ((r + 0.055) / 1.055) ** 2.4 : r / 12.92;
  g = g > 0.04045 ? ((g + 0.055) / 1.055) ** 2.4 : g / 12.92;
  b = b > 0.04045 ? ((b + 0.055) / 1.055) ** 2.4 : b / 12.92;
  r *= 100; g *= 100; b *= 100;
  return {
    x: r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
    y: r * 0.2126729 + g * 0.7151522 + b * 0.0721750,
    z: r * 0.0193339 + g * 0.1191920 + b * 0.9503041,
  };
}

/** CIE XYZ → CIE Lab (D65) */
function xyzToLab(xyz: { x: number; y: number; z: number }): Lab {
  const refX = 95.047, refY = 100.0, refZ = 108.883;
  let x = xyz.x / refX;
  let y = xyz.y / refY;
  let z = xyz.z / refZ;
  const f = (t: number) => t > 0.008856 ? t ** (1 / 3) : 7.787 * t + 16 / 116;
  x = f(x); y = f(y); z = f(z);
  return { L: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
}

export function rgbToLab(rgb: RGB): Lab {
  return xyzToLab(rgbToXyz(rgb));
}

/** CIE76 ΔE — perceptual color distance */
export function deltaE(c1: Lab, c2: Lab): number {
  return Math.sqrt(
    (c1.L - c2.L) ** 2 + (c1.a - c2.a) ** 2 + (c1.b - c2.b) ** 2
  );
}

/** Find closest palette color for a given RGB */
export function findClosestPaletteColor(
  rgb: RGB,
  paletteLab: { hex: string; lab: Lab }[],
): { hex: string; distance: number } {
  let minDist = Infinity;
  let closest = paletteLab[0].hex;
  const lab = rgbToLab(rgb);
  for (const p of paletteLab) {
    const d = deltaE(lab, p.lab);
    if (d < minDist) { minDist = d; closest = p.hex; }
  }
  return { hex: closest, distance: minDist };
}

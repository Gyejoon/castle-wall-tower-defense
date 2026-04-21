/**
 * Asset specs for the forge pipeline. Each entry declares how to polish a
 * canvas-generated PNG: what palette to enforce, rim/shadow strengths, noise
 * params, and (for sheets) frame dimensions for centroid-drift auditing.
 *
 * 정식 모드 MVP scope: archer tower (all 4 grades) × (static, fire sheet).
 * Other assets default to `polish: canvas-only` and skip the forge chain.
 */

export type AssetPolishLevel = 'canvas-only' | 'libresprite-polished';

export interface PolishParams {
  palette: boolean;
  rimLight: { strength: number; shadow: number };
  noise: { density: number; seed: number };
  animation?: { frameW: number; frameH: number; frameCount: number };
}

export interface AssetSpec {
  id: string;
  sourcePath: string; // relative to repo root
  destPath: string; // relative to repo root
  polish: PolishParams;
}

// 동일 asset-id는 항상 동일 seed → accept 재생산 보장.
function seedOf(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const GRADES = ['normal', 'rare', 'unique', 'epic'] as const;
type Grade = (typeof GRADES)[number];

function archerStatic(grade: Grade): AssetSpec {
  const suffix = grade === 'normal' ? '' : `-${grade}`;
  const id = `archer${suffix}`;
  const rel = `packages/web-shell/public/assets/towers/archer${suffix}.png`;
  return {
    id,
    sourcePath: rel,
    destPath: rel,
    polish: {
      palette: true,
      rimLight: { strength: 40, shadow: 30 },
      noise: { density: 0.25, seed: seedOf(id) },
    },
  };
}

function archerFire(grade: Grade): AssetSpec {
  const suffix = grade === 'normal' ? '' : `-${grade}`;
  const id = `archer${suffix}-fire`;
  const rel = `packages/web-shell/public/assets/towers/archer${suffix}-fire.png`;
  return {
    id,
    sourcePath: rel,
    destPath: rel,
    polish: {
      palette: true,
      rimLight: { strength: 30, shadow: 20 },
      noise: { density: 0.15, seed: seedOf(id) },
      animation: { frameW: 64, frameH: 80, frameCount: 8 },
    },
  };
}

export const ASSET_SPECS: Record<string, AssetSpec> = Object.fromEntries(
  GRADES.flatMap((g) => [archerStatic(g), archerFire(g)]).map((s) => [s.id, s]),
);

export function listAssetIds(): string[] {
  return Object.keys(ASSET_SPECS);
}

export function resolveAssetIds(selector: string): string[] {
  if (selector === 'all' || selector === '*') return listAssetIds();
  if (ASSET_SPECS[selector]) return [selector];
  // prefix 매칭: "archer" → 모든 archer-* 변형.
  const prefix = `${selector}-`;
  const matches = listAssetIds().filter(
    (id) => id === selector || id.startsWith(prefix),
  );
  return matches;
}

import {
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  copyFileSync,
  writeFileSync,
  mkdirSync,
} from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { resolveAssetIds, ASSET_SPECS } from '../lib/asset-specs';

const REPO_ROOT = process.cwd();
const STAGING_ROOT = join(REPO_ROOT, 'staging/assets');

interface ReviewOptions {
  selectors: string[];
}

function readMetadata(stagingDir: string): Record<string, unknown> | null {
  const p = join(stagingDir, 'metadata.json');
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function atomicCopy(src: string, dst: string) {
  mkdirSync(dirname(dst), { recursive: true });
  const tmp = `${dst}.tmp-${Date.now()}`;
  copyFileSync(src, tmp);
  renameSync(tmp, dst);
}

// accept는 완료된 forge가 필요하지만 reject는 반쯤 쓰인 staging에서도 복구 가능해야 한다.
function resolveSelectors(
  selectors: string[],
  mode: 'accept' | 'reject',
): string[] {
  const out = new Set<string>();
  for (const s of selectors) {
    for (const id of resolveAssetIds(s)) {
      const dir = join(STAGING_ROOT, id);
      const exists =
        mode === 'accept'
          ? existsSync(join(dir, 'metadata.json'))
          : existsSync(dir);
      if (exists) out.add(id);
    }
  }
  return [...out];
}

export async function runAccept(opts: ReviewOptions): Promise<void> {
  const ids = resolveSelectors(opts.selectors, 'accept');
  if (ids.length === 0) {
    console.log('accept: no staged assets match selector');
    return;
  }
  const manifestPath = join(REPO_ROOT, 'packages/web-shell/public/assets/asset-manifest.json');
  let manifest: {
    generated?: string;
    assets: Array<Record<string, unknown>>;
  } | null = null;
  if (existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch {
      manifest = null;
    }
  }

  let manifestTouched = false;
  for (const id of ids) {
    const spec = ASSET_SPECS[id];
    if (!spec) {
      console.log(`  ✗ ${id}: no spec registered`);
      continue;
    }
    const stagingDir = join(STAGING_ROOT, id);
    const polished = join(stagingDir, 'polished.png');
    if (!existsSync(polished)) {
      console.log(`  ✗ ${id}: polished.png missing`);
      continue;
    }
    const destAbs = resolve(REPO_ROOT, spec.destPath);
    atomicCopy(polished, destAbs);
    const meta = readMetadata(stagingDir) ?? {};
    writeFileSync(
      join(stagingDir, 'metadata.json'),
      JSON.stringify({ ...meta, status: 'accepted', acceptedAt: new Date().toISOString() }, null, 2),
    );
    if (manifest?.assets) {
      const manifestKey = id;
      const entry = manifest.assets.find(
        (e) => e.key === manifestKey || e.path?.toString().endsWith(`/${id}.png`),
      );
      if (entry && entry.polish !== 'libresprite-polished') {
        entry.polish = 'libresprite-polished';
        manifestTouched = true;
      }
    }
    console.log(`  ✓ ${id} → ${relative(REPO_ROOT, destAbs)}`);
  }

  if (manifestTouched && manifest) {
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`  ✓ patched polish levels in asset-manifest.json`);
  }
}

export async function runReject(opts: ReviewOptions): Promise<void> {
  const ids = resolveSelectors(opts.selectors, 'reject');
  if (ids.length === 0) {
    console.log('reject: no staged assets match selector');
    return;
  }
  for (const id of ids) {
    const stagingDir = join(STAGING_ROOT, id);
    if (!existsSync(stagingDir)) {
      console.log(`  - ${id}: nothing to reject`);
      continue;
    }
    rmSync(stagingDir, { recursive: true, force: true });
    console.log(`  ✓ ${id}: staging cleared`);
  }
}

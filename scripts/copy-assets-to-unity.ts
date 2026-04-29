/**
 * copy-assets-to-unity.ts
 *
 * One-shot script: mirrors packages/web-shell/public/assets/**\/*.png
 * into packages/unity-game/Assets/Art/Sprites/**\/*.png.
 *
 * Folder remapping rules (per design-decisions doc §3 Q3-1):
 *   units/    → units_core/  (default)
 *             → units_boss/  (if filename matches boss pattern)
 *   ui/       → ui_hud/      (all files; user splits ui_lobby in Phase 0b)
 *   ui-mobile/ → ui_mobile/  (preserve as-is; different atlas)
 *   icons/    → SKIP         (PWA app icons, not game sprites)
 *
 * Also skips *.webp files (Unity can't import WebP as Sprite).
 * Idempotent: re-running overwrites existing PNGs.
 */

import { existsSync, mkdirSync, copyFileSync } from "fs";
import { join, relative, basename, dirname } from "path";
import { readdirSync, statSync } from "fs";

const REPO_ROOT = join(import.meta.dir, "..");
const SRC_ROOT = join(REPO_ROOT, "packages/web-shell/public/assets");
const DST_ROOT = join(
  REPO_ROOT,
  "packages/unity-game/Assets/Art/Sprites"
);

// PWA icons to skip (exact filenames)
const SKIP_ICONS = new Set([
  "icon-192.png",
  "icon-512.png",
  "icon-512-maskable.png",
]);

/**
 * Returns true if the unit filename matches the boss pattern.
 * Criteria per design-decisions doc Q3-1:
 *   boss | dragon-boss | dragon_idle | dragon_death | dragon-boss-rage
 * Note: dragon.png (regular walk cycle) does NOT match → units_core.
 */
function isBossUnitFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  // Explicit boss patterns from design-decisions doc
  if (lower.includes("boss")) return true;
  if (lower.includes("dragon_idle")) return true;
  if (lower.includes("dragon_death")) return true;
  return false;
}

/**
 * Given a path relative to SRC_ROOT, return the corresponding path
 * relative to DST_ROOT (applying the folder remapping rules).
 * Returns null if the file should be skipped.
 */
function remapPath(relPath: string): string | null {
  const parts = relPath.split("/");
  const topFolder = parts[0];
  const filename = parts[parts.length - 1];

  // Skip icons folder entirely
  if (topFolder === "icons") return null;

  // Skip WebP files
  if (filename.toLowerCase().endsWith(".webp")) return null;

  // Only process PNG files
  if (!filename.toLowerCase().endsWith(".png")) return null;

  // Skip the specific PWA icon filenames wherever they appear
  if (SKIP_ICONS.has(filename)) return null;

  if (topFolder === "units") {
    // Split units/ → units_core/ or units_boss/
    const subFolder = isBossUnitFilename(filename) ? "units_boss" : "units_core";
    const remainingParts = parts.slice(1); // could be just [filename] or deeper
    return join(subFolder, ...remainingParts);
  }

  if (topFolder === "ui") {
    // All ui/ → ui_hud/ (Phase 0b: user manually moves lobby sprites to ui_lobby/)
    const remainingParts = parts.slice(1);
    return join("ui_hud", ...remainingParts);
  }

  if (topFolder === "ui-mobile") {
    // Preserve as ui_mobile/ (hyphen → underscore for Unity folder naming)
    const remainingParts = parts.slice(1);
    return join("ui_mobile", ...remainingParts);
  }

  // All other folders: preserve structure as-is
  return relPath;
}

/** Recursively collect all files under a directory. */
function walkDir(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...walkDir(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

export async function copyAssets(): Promise<void> {
  const allFiles = walkDir(SRC_ROOT);

  let copied = 0;
  let skippedIcons = 0;
  let skippedWebp = 0;
  let skippedOther = 0;
  const uiFiles: string[] = [];

  for (const srcFile of allFiles) {
    const relPath = relative(SRC_ROOT, srcFile).replace(/\\/g, "/");
    const filename = basename(srcFile);
    const topFolder = relPath.split("/")[0];
    const ext = filename.toLowerCase();

    // Count skipped WebP regardless of folder
    if (ext.endsWith(".webp")) {
      skippedWebp++;
      continue;
    }

    // Count skipped icons
    if (topFolder === "icons" || SKIP_ICONS.has(filename)) {
      skippedIcons++;
      continue;
    }

    // Only process PNGs from here
    if (!ext.endsWith(".png")) {
      skippedOther++;
      continue;
    }

    const dstRel = remapPath(relPath);
    if (dstRel === null) {
      // Already counted above; shouldn't reach here for non-icon/non-webp
      skippedOther++;
      continue;
    }

    const dstFile = join(DST_ROOT, dstRel);

    // Track ui/ files for the summary
    if (topFolder === "ui") {
      uiFiles.push(filename);
    }

    // Ensure destination directory exists
    const dstDir = dirname(dstFile);
    if (!existsSync(dstDir)) {
      mkdirSync(dstDir, { recursive: true });
    }

    copyFileSync(srcFile, dstFile);
    copied++;
  }

  // Sort ui files for readable output
  uiFiles.sort();

  console.log("\n=== copy-assets-to-unity summary ===");
  console.log(`Copied ${copied} PNGs to ${DST_ROOT}`);
  console.log(`Skipped ${skippedIcons} PWA icons (icon-192/512/512-maskable)`);
  console.log(`Skipped ${skippedWebp} WebP files`);
  if (skippedOther > 0) {
    console.log(`Skipped ${skippedOther} other non-PNG files`);
  }

  console.log(`\nui/ → ui_hud/  (${uiFiles.length} files — user splits ui_lobby in Phase 0b):`);
  for (const f of uiFiles) {
    console.log(`  ${f}`);
  }

  // List destination subdirs
  console.log("\nDestination layout:");
  try {
    const { readdirSync: rds, statSync: sts } = await import("fs");
    for (const entry of rds(DST_ROOT).sort()) {
      const isDir = sts(join(DST_ROOT, entry)).isDirectory();
      console.log(`  Assets/Art/Sprites/${entry}${isDir ? "/" : ""}`);
    }
  } catch {
    // ignore
  }

  console.log("\nDone. Re-run after adding new assets to web-shell (idempotent).");
}

if (import.meta.main) {
  await copyAssets();
}

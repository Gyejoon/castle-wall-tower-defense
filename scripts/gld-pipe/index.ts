#!/usr/bin/env bun
/**
 * gld-pipe — 2D Asset Pipeline CLI for Grid Line Defense
 *
 * Usage:
 *   bun gld-pipe audit [--checks palette,contrast] [--verbose]
 *   bun gld-pipe pack  [--dry-run] [--sections ui,icons]
 *   bun gld-pipe scale [--factor 2] [--include towers,units] [--dry-run]
 *   bun gld-pipe convert [--quality 90] [--force] [--dry-run]
 *   bun gld-pipe forge <id> [<id>...] [--seed n] [--force]
 *   bun gld-pipe accept <id> [<id>...]
 *   bun gld-pipe reject <id> [<id>...]
 */

import { runAudit } from './commands/audit';
import { runPack } from './commands/pack';
import { runScale } from './commands/scale';
import { runConvert } from './commands/convert';
import { runForge } from './commands/forge';
import { runAccept, runReject } from './commands/review';

const args = process.argv.slice(2);
const command = args[0];

function getFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

function getOption(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  const val = args[idx + 1];
  if (val.startsWith('--')) return undefined; // Avoid treating another flag as a value
  return val;
}

function getListOption(name: string): string[] | undefined {
  const val = getOption(name);
  return val ? val.split(',') : undefined;
}

// Positional args (anything that isn't a flag or an option value).
function positional(tail: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tail.length; i++) {
    const tok = tail[i];
    if (tok.startsWith('--')) {
      // Skip value of known options that take a value.
      if (tok === '--seed') i++;
      continue;
    }
    out.push(tok);
  }
  return out;
}

async function main() {
  console.log('━━━ gld-pipe ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  switch (command) {
    case 'audit':
      await runAudit({
        checks: getListOption('checks'),
        verbose: getFlag('verbose'),
      });
      break;

    case 'pack':
      await runPack({
        dryRun: getFlag('dry-run'),
        sections: getListOption('sections'),
      });
      break;

    case 'scale':
      await runScale({
        factor: Number(getOption('factor') ?? '2'),
        include: getListOption('include'),
        dryRun: getFlag('dry-run'),
      });
      break;

    case 'convert':
      await runConvert({
        quality: Number(getOption('quality') ?? '90'),
        force: getFlag('force'),
        dryRun: getFlag('dry-run'),
      });
      break;

    case 'forge':
      await runForge({
        selectors: positional(args.slice(1)),
        seed: getOption('seed') ? Number(getOption('seed')) : undefined,
        force: getFlag('force'),
      });
      break;

    case 'accept':
      await runAccept({ selectors: positional(args.slice(1)) });
      break;

    case 'reject':
      await runReject({ selectors: positional(args.slice(1)) });
      break;

    default:
      console.log(`
  Usage: bun gld-pipe <command> [options]

  Commands:
    audit     Palette compliance, contrast, unused assets, file sizes, color density
    pack      Pack sprites into texture atlases (Phaser JSON Hash format)
    scale     Upscale pixel art with EPX/Scale2x (2x or 4x)
    convert   PNG → WebP conversion with incremental mode
    forge     Polish canvas-generated PNGs via LibreSprite chain → staging/
    accept    Move a staged polished asset into public/assets (atomic)
    reject    Delete a staged asset

  Options:
    audit:
      --checks <list>     Comma-separated: palette,contrast,unused,size,density
      --verbose           Show detailed info per issue

    pack:
      --dry-run           Preview without writing files
      --sections <list>   Sections to pack (default: ui,icons,mobile)

    scale:
      --factor <n>        Scale factor: 2 or 4 (default: 2)
      --include <list>    Only scale paths containing these strings
      --dry-run           Preview without writing files

    convert:
      --quality <n>       WebP quality 0-100 (default: 90)
      --force             Re-convert even if WebP is newer
      --dry-run           Preview without writing files

    forge:
      <id> [<id>...]      Asset ids (e.g. archer, archer-rare, archer-fire)
                          Use "all" to forge every known asset.
      --seed <n>          Override the per-asset texture-noise seed
      --force             Re-forge even if staging/ already has metadata.json

    accept | reject:
      <id> [<id>...]      Staged asset ids to accept into public/assets or delete
`);
      break;
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

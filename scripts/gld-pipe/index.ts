#!/usr/bin/env bun
/**
 * gld-pipe — 2D Asset Pipeline CLI for Grid Line Defense
 *
 * Usage:
 *   bun gld-pipe audit [--checks palette,contrast] [--verbose]
 *   bun gld-pipe pack  [--dry-run] [--sections ui,icons]
 *   bun gld-pipe scale [--factor 2] [--include towers,units] [--dry-run]
 *   bun gld-pipe convert [--quality 90] [--force] [--dry-run]
 */

import { runAudit } from './commands/audit';
import { runPack } from './commands/pack';
import { runScale } from './commands/scale';
import { runConvert } from './commands/convert';

const args = process.argv.slice(2);
const command = args[0];

function getFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

function getOption(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

function getListOption(name: string): string[] | undefined {
  const val = getOption(name);
  return val ? val.split(',') : undefined;
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

    default:
      console.log(`
  Usage: bun gld-pipe <command> [options]

  Commands:
    audit     Palette compliance, contrast, unused assets, file sizes, color density
    pack      Pack sprites into texture atlases (Phaser JSON Hash format)
    scale     Upscale pixel art with EPX/Scale2x (2x or 4x)
    convert   PNG → WebP conversion with incremental mode

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
`);
      break;
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

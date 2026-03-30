import sharp from 'sharp';
import { readdirSync, statSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

const ASSETS_DIR = 'packages/web-shell/public/assets';
const QUALITY = 90;

function findPngFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...findPngFiles(full));
    } else if (entry.endsWith('.png')) {
      files.push(full);
    }
  }
  return files;
}

export async function convertToWebP(): Promise<{ converted: number; savedBytes: number }> {
  const pngFiles = findPngFiles(ASSETS_DIR);
  let converted = 0;
  let savedBytes = 0;

  for (const pngPath of pngFiles) {
    const webpPath = pngPath.replace(/\.png$/, '.webp');
    const dir = dirname(webpPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const pngSize = statSync(pngPath).size;

    await sharp(pngPath)
      .webp({ quality: QUALITY, nearLossless: true })
      .toFile(webpPath);

    const webpSize = statSync(webpPath).size;
    savedBytes += pngSize - webpSize;
    converted++;
  }

  return { converted, savedBytes };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  convertToWebP().then(({ converted, savedBytes }) => {
    console.log(`Converted ${converted} files to WebP`);
    console.log(`Saved ${(savedBytes / 1024).toFixed(1)}KB`);
  });
}

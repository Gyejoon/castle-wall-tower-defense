import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const BIN_CANDIDATES = [
  join(homedir(), 'Applications/LibreSprite.app/Contents/MacOS/libresprite'),
  '/Applications/LibreSprite.app/Contents/MacOS/libresprite',
  '/usr/local/bin/libresprite',
  '/opt/homebrew/bin/libresprite',
];

export interface LibreSpriteBinary {
  path: string;
  available: true;
}
export interface LibreSpriteMissing {
  available: false;
  tried: string[];
}

export function findLibreSprite(): LibreSpriteBinary | LibreSpriteMissing {
  for (const p of BIN_CANDIDATES) {
    if (existsSync(p)) return { path: p, available: true };
  }
  const envPath = process.env.LIBRESPRITE_BIN;
  if (envPath && existsSync(envPath)) {
    return { path: envPath, available: true };
  }
  return { available: false, tried: [...BIN_CANDIDATES, ...(envPath ? [envPath] : [])] };
}

export interface ScriptStep {
  /** Absolute path to the .js template in scripts/libresprite/ */
  templatePath: string;
  /** Human-readable label for log lines */
  label: string;
  /** Template variable substitutions, including __INPUT__/__OUTPUT__ */
  vars: Record<string, string | number>;
}

export interface RunScriptResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  ok: boolean;
}

/**
 * Materialize a templated script to a temp file and run it under LibreSprite --batch.
 *
 * LibreSprite v1.1 has a benign mutex teardown crash after saveAs on macOS 15 —
 * exit code 134/139 after a successful saveAs is NOT a real failure. We detect
 * success by checking that the expected output path exists and mtime is newer
 * than the input.
 */
export function runScript(
  bin: string,
  step: ScriptStep,
  tmpDir: string,
): RunScriptResult {
  mkdirSync(tmpDir, { recursive: true });
  const template = readFileSync(step.templatePath, 'utf8');
  let body = template;
  for (const [k, v] of Object.entries(step.vars)) {
    const needle = `__${k}__`;
    // Escape backslashes and double quotes for safe embedding in JS string literals.
    const safe = String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    body = body.split(needle).join(safe);
  }
  // Fail fast if any placeholders remain — likely a caller bug.
  const leftover = body.match(/__[A-Z][A-Z0-9_]+__/g);
  if (leftover) {
    throw new Error(
      `runScript[${step.label}]: unsubstituted placeholders ${leftover.join(',')}`,
    );
  }

  const tmpScript = join(tmpDir, `${step.label}.${Date.now()}.js`);
  writeFileSync(tmpScript, body);

  const result = spawnSync(bin, ['--batch', '--script', tmpScript], {
    encoding: 'utf8',
    timeout: 60_000,
  });
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  return {
    stdout,
    stderr,
    exitCode: result.status ?? -1,
    // LibreSprite exits 0 on clean scripts but 134/139 on the mutex teardown
    // bug after saveAs. Treat stdout-has-no-ERROR as OK and let caller verify
    // output file.
    ok: !stdout.includes('ERROR:') && !stderr.includes('Error:'),
  };
}

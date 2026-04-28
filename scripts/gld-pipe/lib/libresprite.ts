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

export class LibreSpriteSpawnError extends Error {
  constructor(
    message: string,
    readonly cause: NodeJS.ErrnoException | undefined,
  ) {
    super(message);
    this.name = 'LibreSpriteSpawnError';
  }
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
  templatePath: string;
  label: string;
  vars: Record<string, string | number>;
}

export interface RunScriptResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  ok: boolean;
}

// LibreSprite 1.1은 macOS 15에서 saveAs 성공 후 mutex teardown 크래시(134/139)를 내므로
// exit code만으로 실패 판단 불가. 호출자가 output 파일 존재/mtime으로 성공 판정한다.
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
    // JS 문자열 리터럴 임베딩을 위한 이스케이프.
    const safe = String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    body = body.split(needle).join(safe);
  }
  // 미치환 플레이스홀더가 남으면 호출자 버그.
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
  const spawnError = result.error as NodeJS.ErrnoException | undefined;
  if (spawnError && (spawnError.code === 'ENOENT' || spawnError.code === 'EACCES')) {
    throw new LibreSpriteSpawnError(
      `libresprite spawn failed (${spawnError.code}): ${bin}`,
      spawnError,
    );
  }
  // macOS 15 mutex-shutdown은 saveAs 후 SIGABRT/SIGSEGV를 보내는데 spawnError는 없다 → ok 유지.
  // 진짜 실패는 timeout 또는 status null + signal 존재로 감지.
  const timedOut = spawnError?.code === 'ETIMEDOUT';
  const killedMidRun =
    result.signal !== null && result.signal !== undefined && result.status === null;
  const scriptError = stdout.includes('ERROR:') || stderr.includes('Error:');
  return {
    stdout,
    stderr,
    exitCode: result.status ?? -1,
    ok: !timedOut && !killedMidRun && !scriptError,
  };
}

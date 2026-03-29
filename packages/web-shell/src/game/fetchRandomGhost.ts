import type { GhostRecord } from '@gld/shared';

const GHOST_FILES = ['ghost-aggressive.json', 'ghost-defensive.json', 'ghost-economic.json'];

export const GHOST_FETCH_ERROR_MESSAGE = '고스트 데이터를 불러올 수 없습니다.';

export async function fetchRandomGhost(): Promise<GhostRecord> {
  const pick = GHOST_FILES[Math.floor(Math.random() * GHOST_FILES.length)];
  const response = await fetch(`/ghosts/${pick}`);

  if (!response.ok) {
    throw new Error(`Failed to load ghost: ${response.status}`);
  }

  return response.json() as Promise<GhostRecord>;
}

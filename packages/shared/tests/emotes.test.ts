import { describe, it, expect } from 'vitest';
import { EMOTES } from '../src/constants/emotes';

describe('EMOTES', () => {
  it('should have at least one emote', () => {
    expect(EMOTES.length).toBeGreaterThan(0);
  });

  it('should have unique ids', () => {
    const ids = EMOTES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each emote should have required fields', () => {
    for (const emote of EMOTES) {
      expect(emote.id).toBeTruthy();
      expect(emote.text).toBeTruthy();
      expect(emote.emoji).toBeTruthy();
    }
  });
});

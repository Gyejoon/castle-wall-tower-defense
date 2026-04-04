import { describe, expect, it } from 'vitest';
import { getElementDamageMultiplier, type ElementType } from '../src/constants/elements';

describe('getElementDamageMultiplier', () => {
  it('fire → water = 1.5x (advantage)', () => {
    expect(getElementDamageMultiplier('fire', 'water')).toBe(1.5);
  });

  it('water → lightning = 1.5x (advantage)', () => {
    expect(getElementDamageMultiplier('water', 'lightning')).toBe(1.5);
  });

  it('lightning → fire = 1.5x (advantage)', () => {
    expect(getElementDamageMultiplier('lightning', 'fire')).toBe(1.5);
  });

  it('water → fire = 0.75x (disadvantage)', () => {
    expect(getElementDamageMultiplier('water', 'fire')).toBe(0.75);
  });

  it('lightning → water = 0.75x (disadvantage)', () => {
    expect(getElementDamageMultiplier('lightning', 'water')).toBe(0.75);
  });

  it('fire → lightning = 0.75x (disadvantage)', () => {
    expect(getElementDamageMultiplier('fire', 'lightning')).toBe(0.75);
  });

  it('same element = 1x', () => {
    const elements: ElementType[] = ['fire', 'water', 'lightning'];
    for (const el of elements) {
      expect(getElementDamageMultiplier(el, el)).toBe(1);
    }
  });

  it('neutral attacker = 1x against all', () => {
    const elements: ElementType[] = ['fire', 'water', 'lightning', 'neutral'];
    for (const el of elements) {
      expect(getElementDamageMultiplier('neutral', el)).toBe(1);
    }
  });

  it('neutral defender = 1x from all', () => {
    const elements: ElementType[] = ['fire', 'water', 'lightning', 'neutral'];
    for (const el of elements) {
      expect(getElementDamageMultiplier(el, 'neutral')).toBe(1);
    }
  });
});

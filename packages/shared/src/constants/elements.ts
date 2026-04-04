export type ElementType = 'fire' | 'water' | 'lightning' | 'neutral';

const ADVANTAGE_MULTIPLIER = 1.5;
const DISADVANTAGE_MULTIPLIER = 0.75;

const ADVANTAGE_MAP: Record<ElementType, ElementType | null> = {
  fire: 'water',
  water: 'lightning',
  lightning: 'fire',
  neutral: null,
};

export function getElementDamageMultiplier(
  attackerElement: ElementType,
  defenderElement: ElementType,
): number {
  if (attackerElement === 'neutral' || defenderElement === 'neutral') return 1;
  if (ADVANTAGE_MAP[attackerElement] === defenderElement) return ADVANTAGE_MULTIPLIER;
  if (ADVANTAGE_MAP[defenderElement] === attackerElement) return DISADVANTAGE_MULTIPLIER;
  return 1;
}

export const ELEMENT_TINT_COLORS: Record<ElementType, number> = {
  fire: 0xe74c3c,
  water: 0x3498db,
  lightning: 0xf39c12,
  neutral: 0xc8a04a,
};

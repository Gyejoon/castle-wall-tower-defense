/**
 * Design-system primitive barrel.
 *
 * Prefer importing from `../ds` in all new UI code:
 *   import { Button, Card, Badge, Panel, Overlay, Sheet } from '../ds';
 *
 * `ui/PixelButton`, `ui/PixelPanel`, `ui/CurrencyIcon` remain as backwards-compat
 * wrappers for existing imports; new code should not reach for them.
 */

export type { BadgeIntent, BadgeProps, BadgeVariant } from './Badge';
export { Badge } from './Badge';
export type { ButtonProps, ButtonSize, ButtonVariant } from './Button';
export { Button } from './Button';
export type { CardIntent, CardProps, CardVariant } from './Card';
export { Card } from './Card';
export type { OverlayIntent, OverlayProps } from './Overlay';
export { Overlay } from './Overlay';
export type { PanelProps } from './Panel';
export { Panel } from './Panel';
export type { SheetAnchor, SheetProps } from './Sheet';
export { Sheet } from './Sheet';

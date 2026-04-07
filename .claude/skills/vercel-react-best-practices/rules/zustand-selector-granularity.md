---
title: Zustand Selector Granularity
impact: HIGH
impactDescription: prevents cascading re-renders from frequent game state updates
tags: zustand, state-management, rerender, selector, performance
---

## Zustand Selector Granularity

Subscribe to individual primitives from Zustand stores, not entire objects or the full store. In a game context, Phaser emits frequent state updates (energy, wave, countdown) via EventBus → Zustand. Broad selectors cause every subscribed component to re-render on every tick.

**Incorrect (subscribes to entire store — re-renders on ANY state change):**

```tsx
function DeckDock() {
  const store = useGameStore() // or useGameStore(s => s)
  return <div>{store.energy}</div>
}
```

**Incorrect (object selector — new object every call, always re-renders):**

```tsx
function DeckDock() {
  const { energy, deckCards } = useGameStore(s => ({
    energy: s.energy,
    deckCards: s.deckCards,
  }))
  return <div>{energy}</div>
}
```

**Correct (individual primitive selectors):**

```tsx
function DeckDock() {
  const energy = useGameStore(s => s.energy)
  const deckCards = useGameStore(s => s.deckCards)
  return <div>{energy}</div>
}
```

**For derived values, use `useShallow` or compute inline:**

```tsx
import { useShallow } from 'zustand/react/shallow'

function WaveInfo() {
  const { wave, wavePhase } = useGameStore(
    useShallow(s => ({ wave: s.wave, wavePhase: s.wavePhase }))
  )
  return <span>Wave {wave} — {wavePhase}</span>
}
```

The rule: one `useGameStore(s => s.field)` call per field, unless you need multiple fields together — then use `useShallow`.

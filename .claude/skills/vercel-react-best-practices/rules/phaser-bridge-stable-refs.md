---
title: Ref-Stable Callbacks Across React-Phaser Boundary
impact: CRITICAL
impactDescription: prevents re-registration of EventBus listeners on every render
tags: phaser, react, useRef, useCallback, eventbus, stable-reference
---

## Ref-Stable Callbacks Across React-Phaser Boundary

When React callbacks are passed to the Phaser EventBus (or any Phaser system), they must be ref-stable. Otherwise, every render re-registers the listener, causing duplicates or stale closures.

**Incorrect (callback recreated each render, registered in effect with missing deps):**

```tsx
function GameHud() {
  const [gold, setGold] = useState(0)

  useEffect(() => {
    const handler = (amount: number) => setGold(g => g + amount)
    EventBus.on('gold-earned', handler)
    return () => EventBus.off('gold-earned', handler)
  }, []) // setGold is stable, but pattern is fragile if handler uses other state
}
```

**Correct (useCallback or inline stable setter):**

```tsx
function GameHud() {
  const [gold, setGold] = useState(0)

  useEffect(() => {
    const handler = (amount: number) => setGold(g => g + amount)
    EventBus.on('gold-earned', handler)
    return () => EventBus.off('gold-earned', handler)
  }, []) // OK because setGold is guaranteed stable by React
}
```

**For complex handlers that depend on multiple state values, use a ref:**

```tsx
function GameHud() {
  const multiplier = useGameStore(s => s.goldMultiplier)
  const handlerRef = useRef<(amount: number) => void>()

  handlerRef.current = (amount: number) => {
    setGold(g => g + amount * multiplier)
  }

  useEffect(() => {
    const handler = (amount: number) => handlerRef.current?.(amount)
    EventBus.on('gold-earned', handler)
    return () => EventBus.off('gold-earned', handler)
  }, [])
}
```

This ensures the EventBus subscription is registered once, while the handler always sees the latest `multiplier` value.

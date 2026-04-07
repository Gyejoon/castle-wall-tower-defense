---
title: EventBus Listener Cleanup in React Components
impact: CRITICAL
impactDescription: prevents memory leaks and ghost listeners across game restarts
tags: phaser, react, eventbus, cleanup, useEffect
---

## EventBus Listener Cleanup in React Components

When React components subscribe to the Phaser EventBus, listeners must be cleaned up in the `useEffect` return. Use named references (not inline arrows) so `off()` removes the exact handler.

**Incorrect (listener leaks on unmount):**

```tsx
useEffect(() => {
  EventBus.on('game-ready', () => setGameReady(true))
  // no cleanup
}, [])
```

**Incorrect (off receives different function reference):**

```tsx
useEffect(() => {
  EventBus.on('game-ready', () => setGameReady(true))
  return () => {
    EventBus.off('game-ready', () => setGameReady(true)) // different arrow!
  }
}, [])
```

**Correct (named reference for on/off pair):**

```tsx
useEffect(() => {
  const onReady = () => setGameReady(true)
  EventBus.on('game-ready', onReady)
  return () => {
    EventBus.off('game-ready', onReady)
  }
}, [setGameReady])
```

**StrictMode consideration:** In React 18 StrictMode, effects run twice. If the component manages a Phaser game instance, guard `destroy()` with `container.isConnected` to distinguish phantom cleanup from real unmount:

```tsx
return () => {
  EventBus.off('game-ready', onReady)
  if (!container.isConnected) {
    gameRef.current?.destroy(true)
    gameRef.current = null
  }
}
```

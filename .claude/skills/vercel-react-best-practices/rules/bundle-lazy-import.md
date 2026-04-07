---
title: React.lazy for Heavy Components
impact: CRITICAL
impactDescription: directly affects TTI and initial bundle size
tags: bundle, lazy-import, code-splitting, react-lazy
---

## React.lazy for Heavy Components

Use `React.lazy()` + `Suspense` to lazy-load large components not needed on initial render. This is the Vite/SPA equivalent of `next/dynamic`.

**Incorrect (GachaScreen bundles with main chunk):**

```tsx
import { GachaScreen } from './components/GachaScreen'

function App() {
  return showGacha ? <GachaScreen /> : <LobbyPage />
}
```

**Correct (GachaScreen loads on demand):**

```tsx
import { lazy, Suspense } from 'react'

const GachaScreen = lazy(() => import('./components/GachaScreen'))

function App() {
  return showGacha ? (
    <Suspense fallback={<LoadingSpinner />}>
      <GachaScreen />
    </Suspense>
  ) : (
    <LobbyPage />
  )
}
```

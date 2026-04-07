---
name: vercel-react-best-practices
description: Vite + React SPA 성능 최적화 가이드라인. Vercel Engineering의 React best practices를 이 프로젝트(Vite + React + Phaser)에 맞게 적응한 버전. React 컴포넌트 작성, 리뷰, 리팩토링 시 참조한다.
user-invocable: false
license: MIT
metadata:
  author: vercel (adapted for GLD project)
  version: "1.0.0"
---

# Vercel React Best Practices (Vite + React SPA 적응판)

Vercel Engineering의 React 성능 최적화 가이드에서 이 프로젝트에 해당하는 규칙만 추린 버전이다. Next.js/SSR/RSC 전용 규칙은 제거하고, Phaser-React 브릿지 패턴 3개를 추가했다.

총 35개 규칙, 6개 카테고리, CRITICAL → LOW 임팩트 순.

## 프로젝트 컨텍스트

- **번들러**: Vite (SSR 없음, SPA)
- **상태 관리**: Zustand (`useGameStore`, `useMetaStore`)
- **게임 엔진**: Phaser.js — React 컴포넌트가 EventBus로 Phaser와 통신
- **패키지**: `web-shell`(React UI), `phaser-game`(게임 로직), `shared`(공유 타입)

## 규칙 카테고리

| 우선순위 | 카테고리 | 임팩트 | prefix |
|----------|----------|--------|--------|
| 1 | Async 패턴 | CRITICAL | `async-` |
| 2 | 번들 사이즈 | CRITICAL | `bundle-` |
| 3 | 리렌더 최적화 | MEDIUM | `rerender-` |
| 4 | 렌더링 성능 | MEDIUM | `rendering-` |
| 5 | JavaScript 성능 | LOW-MEDIUM | `js-` |
| 6 | Advanced + Phaser-React 브릿지 | HIGH-LOW | `advanced-`, `phaser-bridge-`, `zustand-` |

## Quick Reference

### 1. Async 패턴 (CRITICAL, 3개)

- `async-defer-await` — await를 실제 사용 분기로 이동
- `async-parallel` — 독립 작업에 Promise.all() 사용
- `async-dependencies` — 부분 의존성에 better-all 사용

### 2. 번들 사이즈 (CRITICAL, 4개)

- `bundle-barrel-imports` — barrel 파일 우회, 직접 import
- `bundle-lazy-import` — React.lazy + Suspense로 무거운 컴포넌트 지연 로딩
- `bundle-conditional` — 기능 활성화 시에만 모듈 로딩
- `bundle-preload` — hover/focus 시 preload로 체감 속도 향상

### 3. 리렌더 최적화 (MEDIUM, 7개)

- `rerender-defer-reads` — 콜백에서만 쓰는 state를 구독하지 않기
- `rerender-memo` — 비싼 연산을 메모이즈된 컴포넌트로 추출
- `rerender-dependencies` — effect에서 primitive 의존성 사용
- `rerender-derived-state` — raw 값 대신 파생 boolean 구독
- `rerender-functional-setstate` — 안정적 콜백을 위한 함수형 setState
- `rerender-lazy-state-init` — 비싼 초기값에 함수 전달
- `rerender-transitions` — 비긴급 업데이트에 startTransition 사용

### 4. 렌더링 성능 (MEDIUM, 3개)

- `rendering-hoist-jsx` — 정적 JSX를 컴포넌트 밖으로 호이스팅
- `rendering-conditional-render` — `&&` 대신 삼항 연산자로 조건부 렌더링
- `rendering-content-visibility` — 긴 리스트에 content-visibility 사용

### 5. JavaScript 성능 (LOW-MEDIUM, 13개)

- `js-batch-dom-css` — CSS 변경을 클래스나 cssText로 일괄 처리
- `js-index-maps` — 반복 조회에 Map 구축
- `js-cache-property-access` — 루프에서 객체 프로퍼티 캐싱
- `js-cache-function-results` — 모듈 레벨 Map으로 함수 결과 캐싱
- `js-cache-storage` — localStorage/sessionStorage 읽기 캐싱
- `js-combine-iterations` — filter/map을 하나의 루프로 합치기
- `js-length-check-first` — 비싼 비교 전에 배열 길이 확인
- `js-early-exit` — 함수에서 early return
- `js-hoist-regexp` — RegExp 생성을 루프 밖으로 호이스팅
- `js-min-max-loop` — sort 대신 루프로 min/max 찾기
- `js-set-map-lookups` — O(1) 조회에 Set/Map 사용
- `js-tosorted-immutable` — 불변성을 위한 toSorted() 사용
- `client-event-listeners` — 전역 이벤트 리스너 중복 방지

### 6. Advanced + Phaser-React 브릿지 (5개)

- `advanced-event-handler-refs` — 이벤트 핸들러를 ref에 저장
- `advanced-use-latest` — stable callback ref를 위한 useLatest
- `phaser-bridge-cleanup` — ⚠️ EventBus 리스너의 useEffect cleanup
- `phaser-bridge-stable-refs` — ⚠️ React-Phaser 경계 콜백의 ref 안정성
- `zustand-selector-granularity` — ⚠️ Zustand selector 세분화

⚠️ = 프로젝트 특화 규칙 (원본에 없음)

## 사용 방법

개별 규칙 파일에서 상세 설명과 코드 예시 확인:

```
rules/async-parallel.md
rules/phaser-bridge-cleanup.md
rules/zustand-selector-granularity.md
```

각 규칙 파일 구성:
- 왜 중요한지 설명
- 잘못된 코드 예시
- 올바른 코드 예시

## 원본과 차이

| 구분 | 원본 (Vercel) | 이 버전 |
|------|--------------|---------|
| 규칙 수 | 69 | 35 |
| Next.js/SSR | 포함 | 제거 |
| Phaser 브릿지 | 없음 | 3개 추가 |
| Zustand | 없음 | 1개 추가 |
| 대상 | Next.js + React | Vite + React SPA |

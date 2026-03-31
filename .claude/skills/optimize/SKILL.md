---
name: optimize
description: 로딩 속도, 렌더링, 애니메이션, 이미지, 번들 크기 전반에 걸쳐 UI 성능 문제를 진단하고 수정합니다. 느림, 버벅거림, 끊김, 성능, 번들 크기, 로딩 시간, 더 빠르고 부드러운 경험을 원할 때 사용하세요.
user-invocable: true
argument-hint: "[대상]"
---

성능 문제를 파악하고 수정하여 더 빠르고 부드러운 사용자 경험을 만듭니다.

## 성능 문제 평가

현재 성능을 파악하고 문제를 식별합니다:

1. **현재 상태 측정**:
   - **코어 웹 바이탈(Core Web Vitals)**: LCP, FID/INP, CLS 점수
   - **로딩 시간**: 인터랙티브 시간, 첫 콘텐츠풀 페인트(First Contentful Paint)
   - **번들 크기**: JavaScript, CSS, 이미지 크기
   - **런타임 성능**: 프레임레이트, 메모리 사용량, CPU 사용량
   - **네트워크**: 요청 수, 페이로드 크기, 워터폴

2. **병목 지점 식별**:
   - 무엇이 느린가? (초기 로드? 인터랙션? 애니메이션?)
   - 원인이 무엇인가? (큰 이미지? 비용이 큰 JavaScript? 레이아웃 스래싱(layout thrashing)?)
   - 얼마나 심각한가? (인지 가능? 짜증나는 수준? 차단 수준?)
   - 누가 영향을 받는가? (전체 사용자? 모바일만? 느린 연결?)

**핵심**: 전후를 반드시 측정하세요. 섣부른 최적화는 시간 낭비입니다. 실제로 중요한 것만 최적화하세요.

## 최적화 전략

체계적인 개선 계획을 수립합니다:

### 로딩 성능

**이미지 최적화**:
- 최신 포맷 사용 (WebP, AVIF)
- 적절한 크기 (300px 표시에 3000px 이미지를 로드하지 않기)
- 스크롤 아래 이미지에 지연 로딩(lazy loading)
- 반응형 이미지 (`srcset`, `picture` 요소)
- 이미지 압축 (80-85% 품질이면 보통 구분 불가)
- 더 빠른 전달을 위해 CDN 사용

```html
<img 
  src="hero.webp"
  srcset="hero-400.webp 400w, hero-800.webp 800w, hero-1200.webp 1200w"
  sizes="(max-width: 400px) 400px, (max-width: 800px) 800px, 1200px"
  loading="lazy"
  alt="Hero image"
/>
```

**JavaScript 번들 줄이기**:
- 코드 분할(code splitting) — 라우트 기반, 컴포넌트 기반
- 트리 쉐이킹(tree shaking) — 사용하지 않는 코드 제거
- 사용하지 않는 의존성 제거
- 비핵심 코드 지연 로딩
- 대형 컴포넌트에 동적 임포트(dynamic import) 사용

```javascript
// 무거운 컴포넌트 지연 로딩
const HeavyChart = lazy(() => import('./HeavyChart'));
```

**CSS 최적화**:
- 사용하지 않는 CSS 제거
- 크리티컬 CSS 인라인, 나머지 비동기
- CSS 파일 최소화
- 독립 영역에 CSS containment 사용

**폰트 최적화**:
- `font-display: swap` 또는 `optional` 사용
- 폰트 서브셋(subset) — 필요한 문자만
- 크리티컬 폰트 프리로드(preload)
- 적절한 경우 시스템 폰트 사용
- 로딩하는 폰트 두께 제한

```css
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap; /* 폴백을 즉시 표시 */
  unicode-range: U+0020-007F; /* 기본 라틴 문자만 */
}
```

**로딩 전략 최적화**:
- 핵심 리소스 먼저 (비핵심은 async/defer)
- 핵심 애셋 프리로드
- 다음 페이지 프리페치(prefetch)
- 오프라인/캐싱을 위한 서비스 워커
- 멀티플렉싱을 위한 HTTP/2 또는 HTTP/3

### 렌더링 성능

**레이아웃 스래싱 방지**:
```javascript
// ❌ 나쁨: 읽기와 쓰기를 번갈아 실행 (리플로우 유발)
elements.forEach(el => {
  const height = el.offsetHeight; // 읽기 (레이아웃 강제)
  el.style.height = height * 2; // 쓰기
});

// ✅ 좋음: 읽기를 모아서, 그다음 쓰기를 모아서
const heights = elements.map(el => el.offsetHeight); // 전부 읽기
elements.forEach((el, i) => {
  el.style.height = heights[i] * 2; // 전부 쓰기
});
```

**렌더링 최적화**:
- 독립 영역에 CSS `contain` 속성 사용
- DOM 깊이 최소화 (얕을수록 빠름)
- DOM 크기 줄이기 (요소 수 줄이기)
- 긴 리스트에 `content-visibility: auto` 사용
- 매우 긴 리스트에 가상 스크롤링 (react-window, react-virtualized)

**페인트 및 컴포지트(Composite) 줄이기**:
- 애니메이션에 transform과 opacity 사용 (GPU 가속)
- 레이아웃 속성 애니메이션 피하기 (width, height, top, left)
- 비용이 큰 것으로 알려진 작업에만 will-change 아껴서 사용
- 페인트 영역 최소화 (작을수록 빠름)

### 애니메이션 성능

**GPU 가속**:
```css
/* ✅ GPU 가속 (빠름) */
.animated {
  transform: translateX(100px);
  opacity: 0.5;
}

/* ❌ CPU 바운드 (느림) */
.animated {
  left: 100px;
  width: 300px;
}
```

**부드러운 60fps**:
- 프레임당 16ms 목표 (60fps)
- JS 애니메이션에 `requestAnimationFrame` 사용
- 스크롤 핸들러 디바운스/스로틀
- 가능하면 CSS 애니메이션 사용
- 애니메이션 중 오래 걸리는 JavaScript 피하기

**IntersectionObserver**:
```javascript
// 요소가 뷰포트에 들어오는 것을 효율적으로 감지
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // 요소가 보임, 지연 로딩 또는 애니메이션 실행
    }
  });
});
```

### React/프레임워크 최적화

**React 전용**:
- 비용이 큰 컴포넌트에 `memo()` 사용
- 비용이 큰 계산에 `useMemo()`와 `useCallback()`
- 긴 리스트 가상화
- 라우트 코드 분할
- 렌더에서 인라인 함수 생성 피하기
- React DevTools Profiler 사용

**프레임워크 공통**:
- 리렌더링 최소화
- 비용이 큰 작업 디바운스
- 계산된 값 메모이제이션
- 라우트와 컴포넌트 지연 로딩

### 네트워크 최적화

**요청 줄이기**:
- 작은 파일 결합
- 아이콘에 SVG 스프라이트 사용
- 작은 핵심 애셋 인라인
- 사용하지 않는 서드파티 스크립트 제거

**API 최적화**:
- 페이지네이션 사용 (전부 로드하지 않기)
- 필요한 필드만 요청하는 GraphQL
- 응답 압축 (gzip, brotli)
- HTTP 캐싱 헤더
- 정적 애셋에 CDN

**느린 연결 최적화**:
- 연결 상태에 따른 적응형 로딩 (navigator.connection)
- 낙관적 UI 업데이트
- 요청 우선순위 지정
- 점진적 향상

## 코어 웹 바이탈 최적화

### 최대 콘텐츠풀 페인트 (LCP < 2.5초)
- 히어로 이미지 최적화
- 크리티컬 CSS 인라인
- 핵심 리소스 프리로드
- CDN 사용
- 서버 사이드 렌더링

### 첫 입력 지연 (FID < 100ms) / INP (< 200ms)
- 긴 작업 분할
- 비핵심 JavaScript 지연
- 무거운 계산에 웹 워커(Web Worker) 사용
- JavaScript 실행 시간 줄이기

### 누적 레이아웃 이동 (CLS < 0.1)
- 이미지와 비디오에 치수 설정
- 기존 콘텐츠 위에 콘텐츠 삽입하지 않기
- CSS `aspect-ratio` 속성 사용
- 광고/임베드 공간 예약
- 레이아웃 이동을 유발하는 애니메이션 피하기

```css
/* 이미지 공간 예약 */
.image-container {
  aspect-ratio: 16 / 9;
}
```

## 성능 모니터링

**사용할 도구**:
- Chrome DevTools (Lighthouse, Performance 패널)
- WebPageTest
- 코어 웹 바이탈 (Chrome UX Report)
- 번들 분석기 (webpack-bundle-analyzer)
- 성능 모니터링 (Sentry, DataDog, New Relic)

**핵심 지표**:
- LCP, FID/INP, CLS (코어 웹 바이탈)
- 인터랙티브 시간 (TTI)
- 첫 콘텐츠풀 페인트 (FCP)
- 총 차단 시간 (TBT)
- 번들 크기
- 요청 수

**중요**: 실제 기기와 실제 네트워크 환경에서 측정하세요. 빠른 연결의 데스크톱 Chrome은 대표성이 없습니다.

**절대 하지 말 것**:
- 측정 없이 최적화 (섣부른 최적화)
- 성능을 위해 접근성 희생
- 최적화하면서 기능 망가뜨리기
- will-change를 남발 (새 레이어 생성, 메모리 사용)
- 스크롤 위 콘텐츠를 지연 로딩
- 주요 문제를 무시하면서 미세 최적화에 집중 (가장 큰 병목부터 최적화)
- 모바일 성능 잊기 (보통 더 느린 기기, 더 느린 연결)

## 개선 검증

최적화가 효과가 있었는지 테스트합니다:

- **전후 지표**: Lighthouse 점수 비교
- **실사용자 모니터링**: 실제 사용자의 개선 사항 추적
- **다양한 기기**: 저사양 안드로이드에서 테스트, 최신 아이폰만이 아닌
- **느린 연결**: 3G로 스로틀링하여 경험 테스트
- **회귀 없음**: 기능이 여전히 작동하는지 확인
- **사용자 인지**: *체감상* 더 빨라졌는가?

기억하세요: 성능은 기능입니다. 빠른 경험은 더 반응적이고, 더 세련되고, 더 전문적으로 느껴집니다. 체계적으로 최적화하고, 냉정하게 측정하고, 사용자가 체감하는 성능을 우선시하세요.

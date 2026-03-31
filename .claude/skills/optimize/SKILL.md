---
name: optimize
description: "로딩 속도, 렌더링, 애니메이션, 이미지, 번들 크기 전반의 UI 성능 문제를 진단하고 수정한다. '느려', '버벅거려', '끊겨', '로딩이 오래 걸려', '번들이 너무 커', '이미지 무거워', '스크롤이 뚝뚝 끊겨', '첫 화면이 안 뜨는데', '모바일에서 더 느려', 'Lighthouse 점수 올려줘', 'LCP 개선해줘', 'CLS 문제 있어' 등 성능/속도/부드러움 관련 요청이면 반드시 이 스킬 사용."
user-invocable: true
argument-hint: "[대상]"
---

성능 문제를 파악하고 수정하여 더 빠르고 부드러운 사용자 경험을 만든다.

## 성능 문제 평가

1. **현재 상태 측정**:
   - **코어 웹 바이탈**: LCP, FID/INP, CLS
   - **로딩 시간**: TTI, FCP
   - **번들 크기**: JS, CSS, 이미지
   - **런타임**: 프레임레이트, 메모리, CPU
   - **네트워크**: 요청 수, 페이로드, 워터폴

2. **병목 지점 식별**: 무엇이 느린가?(초기 로드? 인터랙션? 애니메이션?) 원인이 무엇인가?(큰 이미지? 무거운 JS? 레이아웃 스래싱?) 누가 영향을 받는가?(전체? 모바일만?)

전후를 반드시 측정한다. 측정 없는 최적화는 시간 낭비다 — 실제로 느린 부분만 최적화한다.

## 최적화 전략

### 로딩 성능

**이미지 최적화**:
```html
<img 
  src="hero.webp"
  srcset="hero-400.webp 400w, hero-800.webp 800w, hero-1200.webp 1200w"
  sizes="(max-width: 400px) 400px, (max-width: 800px) 800px, 1200px"
  loading="lazy"
  alt="Hero image"
/>
```
최신 포맷(WebP, AVIF). 표시 크기에 맞는 이미지(300px에 3000px 로드하지 않기). 스크롤 아래 이미지에 lazy loading. 80-85% 압축 품질이면 육안으로 구분 불가. CDN 사용.

**JavaScript 번들 줄이기**: 코드 분할(라우트/컴포넌트 기반). 트리 쉐이킹. 미사용 의존성 제거. 대형 컴포넌트에 동적 임포트:
```javascript
const HeavyChart = lazy(() => import('./HeavyChart'));
```

**CSS 최적화**: 미사용 CSS 제거. 크리티컬 CSS 인라인, 나머지 비동기. CSS containment.

**폰트 최적화**: `font-display: swap` 또는 `optional`. 필요한 문자만 서브셋. 크리티컬 폰트 프리로드. 폰트 두께 수를 제한한다 — 각 두께가 별도 다운로드이기 때문이다:
```css
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap;
  unicode-range: U+0020-007F;
}
```

**로딩 전략**: 핵심 리소스 먼저(비핵심은 async/defer). 핵심 애셋 프리로드. 다음 페이지 프리페치. HTTP/2 또는 HTTP/3.

### 렌더링 성능

**레이아웃 스래싱 방지** — DOM 읽기와 쓰기를 번갈아 하면 매번 리플로우가 강제된다:
```javascript
// 나쁨: 읽기-쓰기 번갈아 실행
elements.forEach(el => {
  const height = el.offsetHeight; // 읽기 (리플로우 강제)
  el.style.height = height * 2;  // 쓰기
});

// 좋음: 읽기를 모아서, 그 다음 쓰기를 모아서
const heights = elements.map(el => el.offsetHeight);
elements.forEach((el, i) => {
  el.style.height = heights[i] * 2;
});
```

**렌더링 최적화**: CSS `contain` 속성. DOM 깊이와 크기 최소화. 긴 리스트에 `content-visibility: auto`. 매우 긴 리스트에 가상 스크롤링(react-window 등).

**페인트/컴포지트**: 애니메이션에 transform과 opacity 사용(GPU 가속). width/height/top/left 애니메이션은 피한다 — 매 프레임 레이아웃 재계산을 유발하기 때문이다. `will-change`는 실제로 비용이 큰 작업에만 아껴서 사용한다 — 남발하면 새 레이어마다 GPU 메모리를 소비한다.

### 애니메이션 성능

```css
/* GPU 가속 (빠름) */
.animated { transform: translateX(100px); opacity: 0.5; }

/* CPU 바운드 (느림) — 매 프레임 레이아웃 재계산 */
.animated { left: 100px; width: 300px; }
```

프레임당 16ms 목표(60fps). JS 애니메이션에 `requestAnimationFrame`. 스크롤 핸들러 디바운스/스로틀. 가능하면 CSS 애니메이션 사용.

### React/프레임워크 최적화

비용이 큰 컴포넌트에 `memo()`. 비용이 큰 계산에 `useMemo()`/`useCallback()`. 긴 리스트 가상화. 라우트 코드 분할. React DevTools Profiler로 리렌더링 추적.

### 네트워크 최적화

**요청 줄이기**: 작은 파일 결합. SVG 스프라이트. 미사용 서드파티 스크립트 제거.

**API 최적화**: 페이지네이션(전부 로드하지 않기). 필요한 필드만 요청. 응답 압축(gzip, brotli). HTTP 캐싱 헤더. 정적 애셋에 CDN.

**느린 연결**: `navigator.connection`으로 적응형 로딩. 낙관적 UI 업데이트. 요청 우선순위 지정.

## 코어 웹 바이탈 최적화

### LCP < 2.5초
히어로 이미지 최적화. 크리티컬 CSS 인라인. 핵심 리소스 프리로드. CDN. SSR.

### FID < 100ms / INP < 200ms
긴 작업 분할. 비핵심 JS 지연. 무거운 계산에 Web Worker.

### CLS < 0.1
이미지/비디오에 치수 설정. 기존 콘텐츠 위에 삽입하지 않기. `aspect-ratio` 속성. 광고/임베드 공간 예약:
```css
.image-container { aspect-ratio: 16 / 9; }
```

## 피해야 할 접근과 그 이유

측정 없이 최적화하면 안 된다 — 실제 병목이 아닌 곳에 시간을 쓰게 된다. Lighthouse나 Performance 패널로 먼저 측정한다.

성능을 위해 접근성을 희생하면 안 된다 — 둘 다 달성할 수 있다.

스크롤 위(above-the-fold) 콘텐츠를 lazy loading하면 안 된다 — 사용자가 처음 보는 영역이므로 즉시 로드해야 한다. lazy loading은 스크롤 아래에만 적용한다.

미세 최적화에 집중하면서 주요 병목을 무시하면 안 된다 — 3MB 이미지가 있는데 CSS 선택자를 최적화하는 것은 의미가 없다.

모바일 성능을 잊으면 안 된다 — 보통 더 느린 기기, 더 느린 연결이다. 저사양 안드로이드 기기에서 테스트한다.

## 개선 검증

- **전후 지표**: Lighthouse 점수 비교
- **실사용자 모니터링**: 실제 사용자의 개선 추적
- **다양한 기기**: 저사양 안드로이드에서 테스트
- **느린 연결**: 3G 스로틀링 테스트
- **회귀 없음**: 기능이 여전히 작동하는지 확인
- **사용자 인지**: 체감상 더 빨라졌는가?

성능은 기능이다. 빠른 경험은 더 반응적이고 전문적으로 느껴진다.

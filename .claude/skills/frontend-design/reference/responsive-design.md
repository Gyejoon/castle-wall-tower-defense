# 반응형 디자인

## 모바일 퍼스트: 올바르게 작성하기

모바일용 기본 스타일로 시작하고, `min-width` 쿼리로 복잡성을 쌓아 올려라. 데스크톱 퍼스트(`max-width`)는 모바일이 불필요한 스타일을 먼저 로드하게 만든다.

## 브레이크포인트: 콘텐츠 기반

기기 크기를 쫓지 말라—콘텐츠가 어디서 깨지는지를 기준으로 하라. 좁게 시작하고, 디자인이 깨질 때까지 넓힌 다음, 그 지점에 브레이크포인트를 추가하라. 세 개의 브레이크포인트면 대부분 충분하다 (640, 768, 1024px). 브레이크포인트 없이 유동적 값을 원하면 `clamp()`를 사용하라.

## 입력 방식 감지, 화면 크기만으로 판단하지 말라

**화면 크기가 입력 방식을 알려주지 않는다.** 터치스크린이 있는 노트북, 키보드가 있는 태블릿—pointer와 hover 쿼리를 사용하라:

```css
/* 정밀 포인터 (마우스, 트랙패드) */
@media (pointer: fine) {
  .button { padding: 8px 16px; }
}

/* 부정확 포인터 (터치, 스타일러스) */
@media (pointer: coarse) {
  .button { padding: 12px 20px; }  /* 더 큰 터치 타겟 */
}

/* 기기가 호버를 지원할 때 */
@media (hover: hover) {
  .card:hover { transform: translateY(-2px); }
}

/* 기기가 호버를 지원하지 않을 때 (터치) */
@media (hover: none) {
  .card { /* 호버 상태 없음 - 대신 active 사용 */ }
}
```

**핵심**: 기능을 호버에 의존하지 말라. 터치 사용자는 호버할 수 없다.

## 안전 영역(Safe Area): 노치 처리

최신 스마트폰에는 노치, 둥근 모서리, 홈 인디케이터가 있다. `env()`를 사용하라:

```css
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* 폴백 포함 */
.footer {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}
```

**viewport-fit 활성화**를 메타 태그에 추가하라:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

## 반응형 이미지: 제대로 구현하기

### 너비 서술자(width descriptor)가 있는 srcset

```html
<img
  src="hero-800.jpg"
  srcset="
    hero-400.jpg 400w,
    hero-800.jpg 800w,
    hero-1200.jpg 1200w
  "
  sizes="(max-width: 768px) 100vw, 50vw"
  alt="히어로 이미지"
>
```

**동작 원리**:
- `srcset`은 실제 너비(`w` 서술자)와 함께 사용 가능한 이미지를 나열한다
- `sizes`는 이미지가 표시될 너비를 브라우저에 알려준다
- 브라우저가 뷰포트 너비와 기기 픽셀 비율(device pixel ratio)을 기반으로 최적의 파일을 선택한다

### 아트 디렉션(art direction)을 위한 Picture 요소

해상도가 아닌 다른 크롭/구도가 필요할 때:

```html
<picture>
  <source media="(min-width: 768px)" srcset="wide.jpg">
  <source media="(max-width: 767px)" srcset="tall.jpg">
  <img src="fallback.jpg" alt="...">
</picture>
```

## 레이아웃 적응 패턴

**내비게이션**: 세 단계—모바일에서 햄버거 + 드로어, 태블릿에서 수평 컴팩트, 데스크톱에서 라벨 포함 전체 표시. **테이블**: `display: block`과 `data-label` 속성을 사용하여 모바일에서 카드로 변환. **점진적 공개(progressive disclosure)**: 모바일에서 접을 수 있는 콘텐츠에 `<details>/<summary>` 사용.

## 테스트: 개발자 도구만 믿지 말라

개발자 도구의 기기 에뮬레이션은 레이아웃에는 유용하지만 다음을 놓친다:

- 실제 터치 인터랙션
- 실제 CPU/메모리 제약
- 네트워크 지연 패턴
- 폰트 렌더링 차이
- 브라우저 크롬/키보드 표시

**최소한 다음에서 테스트하라**: 실제 iPhone 한 대, 실제 Android 한 대, 해당되면 태블릿. 저가 Android 폰은 시뮬레이터에서 절대 발견할 수 없는 성능 문제를 드러낸다.

---

**피해야 할 것**: 데스크톱 퍼스트 디자인. 기능 감지 대신 기기 감지. 모바일/데스크톱 분리 코드베이스. 태블릿과 가로 모드 무시. 모든 모바일 기기가 고성능이라는 가정.

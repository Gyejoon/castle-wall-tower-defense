# 타이포그래피

## 고전 타이포그래피 원칙

### 수직 리듬(vertical rhythm)

줄 높이(line-height)가 모든 수직 간격의 기본 단위여야 한다. 본문 텍스트가 `16px`에서 `line-height: 1.5`이면 (= 24px), 간격 값은 24px의 배수여야 한다. 이것이 무의식적 조화를 만든다—텍스트와 공간이 수학적 기반을 공유한다.

### 모듈러 스케일(modular scale)과 계층 구조

흔한 실수: 너무 가까운 폰트 크기를 너무 많이 쓰는 것 (14px, 15px, 16px, 18px...). 이렇게 하면 계층 구조가 흐려진다.

**더 적은 크기로 더 큰 대비를 만들라.** 5단계 시스템이면 대부분 충분하다:

| 역할 | 일반적 비율 | 용도 |
|------|------------|------|
| xs | 0.75rem | 캡션, 법적 고지 |
| sm | 0.875rem | 보조 UI, 메타데이터 |
| base | 1rem | 본문 텍스트 |
| lg | 1.25-1.5rem | 소제목, 리드 텍스트 |
| xl+ | 2-4rem | 헤드라인, 히어로 텍스트 |

인기 있는 비율: 1.25 (장3도, major third), 1.333 (완전4도, perfect fourth), 1.5 (완전5도, perfect fifth). 하나를 선택하고 일관되게 쓰라.

### 가독성과 줄 길이(measure)

문자 기반 줄 길이에는 `ch` 단위를 사용하라 (`max-width: 65ch`). 줄 높이는 줄 길이와 반비례한다—좁은 열은 더 촘촘한 행간이, 넓은 열은 더 넓은 행간이 필요하다.

**잘 알려지지 않은 사실**: 어두운 배경에 밝은 텍스트는 줄 높이를 늘려야 한다. 인지되는 굵기가 가벼워지므로 텍스트에 더 많은 여유 공간이 필요하다. 일반 줄 높이에 0.05-0.1을 더하라.

## 폰트 선택과 조합

### 차별화된 폰트 선택

**보이지 않는 기본값을 피하라**: Inter, Roboto, Open Sans, Lato, Montserrat. 이것들은 어디에나 있어서 디자인이 평범하게 느껴진다. 개성이 목표가 아닌 문서나 도구에는 괜찮지만—차별화된 디자인을 원한다면 다른 곳을 찾아라.

**더 나은 Google Fonts 대안**:
- Inter 대신 → **Instrument Sans**, **Plus Jakarta Sans**, **Outfit**
- Roboto 대신 → **Onest**, **Figtree**, **Urbanist**
- Open Sans 대신 → **Source Sans 3**, **Nunito Sans**, **DM Sans**
- 에디토리얼/프리미엄 느낌 → **Fraunces**, **Newsreader**, **Lora**

**시스템 폰트는 과소평가되어 있다**: `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui`는 네이티브처럼 보이고, 즉시 로드되며, 가독성이 높다. 성능이 개성보다 중요한 앱에서 고려하라.

### 조합 원칙

**잘 알려지지 않은 진실**: 두 번째 폰트가 필요 없는 경우가 많다. 잘 선택된 한 폰트 패밀리를 여러 굵기로 쓰면 두 서체가 경쟁하는 것보다 더 깔끔한 계층 구조를 만든다. 진정한 대비가 필요할 때만 두 번째 폰트를 추가하라 (예: 디스플레이 헤드라인 + 본문 세리프).

조합할 때는 여러 축에서 대비시켜라:
- 세리프 + 산세리프 (구조적 대비)
- 기하학적 + 휴머니스트 (성격적 대비)
- 좁은 디스플레이 + 넓은 본문 (비율 대비)

**비슷하지만 동일하지 않은 폰트를 절대 조합하지 말라** (예: 두 개의 기하학적 산세리프). 명확한 계층 구조 없이 시각적 긴장감만 만든다.

### 웹 폰트 로딩

레이아웃 시프트 문제: 폰트가 늦게 로드되면 텍스트가 재배치되고 콘텐츠가 점프한다. 해결법:

```css
/* 1. 가시성을 위해 font-display: swap 사용 */
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2') format('woff2');
  font-display: swap;
}

/* 2. 시프트를 최소화하기 위해 폴백 메트릭 맞추기 */
@font-face {
  font-family: 'CustomFont-Fallback';
  src: local('Arial');
  size-adjust: 105%;        /* x-height에 맞게 크기 조정 */
  ascent-override: 90%;     /* 어센더 높이 맞추기 */
  descent-override: 20%;    /* 디센더 깊이 맞추기 */
  line-gap-override: 10%;   /* 줄 간격 맞추기 */
}

body {
  font-family: 'CustomFont', 'CustomFont-Fallback', sans-serif;
}
```

[Fontaine](https://github.com/unjs/fontaine) 같은 도구가 이 오버라이드를 자동으로 계산해준다.

## 현대 웹 타이포그래피

### 유동 타이포그래피(fluid typography)

`clamp(min, preferred, max)`를 통한 유동 타이포그래피는 뷰포트에 따라 텍스트를 부드럽게 확대/축소한다. 중간 값(예: `5vw + 1rem`)이 확대/축소 속도를 제어한다—vw가 높을수록 빠르게 변한다. 작은 화면에서 0으로 축소되지 않도록 rem 오프셋을 추가하라.

**유동 타이포그래피 적합한 곳**: 텍스트가 레이아웃을 지배하고 뷰포트 크기에 따라 여유가 필요한 마케팅/콘텐츠 페이지의 제목과 디스플레이 텍스트.

**고정 `rem` 스케일 적합한 곳**: 앱 UI, 대시보드, 데이터가 밀집된 인터페이스. 주요 앱 디자인 시스템(Material, Polaris, Primer, Carbon) 중 제품 UI에서 유동 타이포그래피를 쓰는 곳은 없다—고정 스케일에 선택적 브레이크포인트 조정이 컨테이너 기반 레이아웃에 필요한 공간적 예측 가능성을 제공한다. 본문 텍스트도 마케팅 페이지에서조차 고정이어야 한다. 뷰포트 간 크기 차이가 유동화할 만큼 크지 않기 때문이다.

### OpenType 기능

대부분의 개발자는 이 기능이 존재하는지 모른다. 세련됨을 위해 사용하라:

```css
/* 데이터 정렬을 위한 고정폭 숫자 */
.data-table { font-variant-numeric: tabular-nums; }

/* 올바른 분수 표기 */
.recipe-amount { font-variant-numeric: diagonal-fractions; }

/* 약어를 위한 작은 대문자 */
abbr { font-variant-caps: all-small-caps; }

/* 코드에서 합자 비활성화 */
code { font-variant-ligatures: none; }

/* 커닝 활성화 (보통 기본값이지만 명시적으로) */
body { font-kerning: normal; }
```

폰트가 지원하는 기능은 [Wakamai Fondue](https://wakamaifondue.com/)에서 확인할 수 있다.

## 타이포그래피 시스템 아키텍처

토큰 이름은 값(`--font-size-16`)이 아닌 의미적으로(`--text-body`, `--text-heading`) 지정하라. 폰트 스택, 크기 스케일, 굵기, 줄 높이, 자간(letter-spacing)을 토큰 시스템에 포함하라.

## 접근성 고려사항

잘 문서화된 대비 비율 외에도 다음을 고려하라:

- **줌을 절대 비활성화하지 말라**: `user-scalable=no`는 접근성을 해친다. 200% 줌에서 레이아웃이 깨진다면 레이아웃을 수정하라.
- **폰트 크기에 rem/em을 사용하라**: 사용자의 브라우저 설정을 존중한다. 본문 텍스트에 `px`을 절대 쓰지 말라.
- **본문 텍스트 최소 16px**: 이보다 작으면 눈이 피로해지고 모바일에서 WCAG를 충족하지 못한다.
- **적절한 터치 타겟**: 텍스트 링크에는 44px 이상의 탭 타겟을 만드는 padding이나 줄 높이가 필요하다.

---

**피해야 할 것**: 프로젝트당 2-3개 이상의 폰트 패밀리. 폴백 폰트 정의를 건너뛰는 것. 폰트 로딩 성능 무시(FOUT/FOIT). 장식용 폰트를 본문에 사용하는 것.

# 인터랙션 디자인

## 8가지 인터랙티브 상태

모든 인터랙티브 요소는 다음 상태를 설계해야 한다:

| 상태 | 시점 | 시각적 처리 |
|------|------|------------|
| **기본(Default)** | 대기 상태 | 기본 스타일링 |
| **호버(Hover)** | 포인터가 위에 있을 때 (터치 제외) | 미세한 들어올림, 색상 변화 |
| **포커스(Focus)** | 키보드/프로그래밍 포커스 | 눈에 보이는 링 (아래 참조) |
| **활성(Active)** | 누르는 중 | 눌린 느낌, 더 어둡게 |
| **비활성(Disabled)** | 상호작용 불가 | 투명도 감소, 포인터 없음 |
| **로딩(Loading)** | 처리 중 | 스피너, 스켈레톤 |
| **오류(Error)** | 유효하지 않은 상태 | 빨간 테두리, 아이콘, 메시지 |
| **성공(Success)** | 완료됨 | 초록 체크, 확인 메시지 |

**흔한 누락**: 호버는 설계하면서 포커스는 빠뜨리거나, 그 반대. 둘은 다르다. 키보드 사용자는 호버 상태를 절대 볼 수 없다.

## 포커스 링: 제대로 구현하기

**대체 없이 `outline: none`을 절대 쓰지 말라.** 접근성 위반이다. 대신 `:focus-visible`을 사용하여 키보드 사용자에게만 포커스를 표시하라:

```css
/* 마우스/터치에서 포커스 링 숨기기 */
button:focus {
  outline: none;
}

/* 키보드에서 포커스 링 표시 */
button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

**포커스 링 디자인**:
- 높은 대비 (인접 색상 대비 최소 3:1)
- 2-3px 두께
- 요소 바깥에 오프셋 (안쪽이 아님)
- 모든 인터랙티브 요소에서 일관성 유지

## 폼 디자인: 알려지지 않은 핵심

**플레이스홀더는 라벨이 아니다**—입력 시 사라진다. 항상 눈에 보이는 `<label>` 요소를 사용하라. **blur 시 유효성 검사**를 하고, 매 키 입력마다 하지 마라 (예외: 비밀번호 강도). 오류는 필드 **아래에** 배치하고 `aria-describedby`로 연결하라.

## 로딩 상태

**낙관적 업데이트(optimistic update)**: 성공을 즉시 보여주고, 실패 시 롤백한다. 저위험 액션(좋아요, 팔로우)에 사용하고, 결제나 파괴적 액션에는 사용하지 않는다. **스켈레톤 화면 > 스피너**—콘텐츠 형태를 미리 보여주어 일반 스피너보다 빠르게 느껴진다.

## 모달: inert 방식

모달에서 포커스 가두기(focus trapping)는 복잡한 JavaScript가 필요했다. 이제 `inert` 속성을 사용한다:

```html
<!-- 모달이 열려 있을 때 -->
<main inert>
  <!-- 모달 뒤의 콘텐츠는 포커스되거나 클릭될 수 없음 -->
</main>
<dialog open>
  <h2>모달 제목</h2>
  <!-- 포커스가 모달 안에 유지됨 -->
</dialog>
```

또는 네이티브 `<dialog>` 요소를 사용한다:

```javascript
const dialog = document.querySelector('dialog');
dialog.showModal();  // 포커스 가두기와 함께 열림, Escape로 닫힘
```

## Popover API

툴팁, 드롭다운, 비모달 오버레이에는 네이티브 popover를 사용하라:

```html
<button popovertarget="menu">메뉴 열기</button>
<div id="menu" popover>
  <button>옵션 1</button>
  <button>옵션 2</button>
</div>
```

**장점**: 라이트 디스미스(light-dismiss, 바깥 클릭으로 닫기), 올바른 스태킹, z-index 충돌 없음, 기본적으로 접근성 지원.

## 드롭다운과 오버레이 위치 지정

`overflow: hidden`이나 `overflow: auto`가 있는 컨테이너 안에서 `position: absolute`로 렌더링된 드롭다운은 잘린다. 이것이 생성 코드에서 가장 흔한 드롭다운 버그다.

### CSS 앵커 포지셔닝(Anchor Positioning)

최신 솔루션은 CSS Anchor Positioning API를 사용하여 JavaScript 없이 오버레이를 트리거에 연결한다:

```css
.trigger {
  anchor-name: --menu-trigger;
}

.dropdown {
  position: fixed;
  position-anchor: --menu-trigger;
  position-area: block-end span-inline-end;
  margin-top: 4px;
}

/* 아래에 공간이 없으면 위로 뒤집기 */
@position-try --flip-above {
  position-area: block-start span-inline-end;
  margin-bottom: 4px;
}
```

드롭다운이 `position: fixed`를 사용하므로 상위 요소의 `overflow` 클리핑을 벗어난다. `@position-try` 블록이 뷰포트 경계를 자동으로 처리한다. **브라우저 지원**: Chrome 125+, Edge 125+. Firefox와 Safari는 아직 미지원—해당 브라우저용 폴백을 사용하라.

### Popover + 앵커 조합

Popover API와 앵커 포지셔닝을 결합하면 스태킹, 라이트 디스미스, 접근성, 올바른 위치 지정을 하나의 패턴으로 해결할 수 있다:

```html
<button popovertarget="menu" class="trigger">열기</button>
<div id="menu" popover class="dropdown">
  <button>옵션 1</button>
  <button>옵션 2</button>
</div>
```

`popover` 속성은 요소를 **최상위 레이어(top layer)**에 배치하여 z-index나 overflow와 상관없이 모든 콘텐츠 위에 표시된다. 포탈이 필요 없다.

### 포탈 / 텔레포트 패턴

컴포넌트 프레임워크에서는 드롭다운을 문서 루트에 렌더링하고 JavaScript로 위치를 지정한다:

- **React**: `createPortal(dropdown, document.body)`
- **Vue**: `<Teleport to="body">`
- **Svelte**: 포탈 라이브러리 사용 또는 `document.body`에 마운트

트리거의 `getBoundingClientRect()`에서 위치를 계산한 후 `position: fixed`와 `top`, `left` 값을 적용한다. 스크롤과 리사이즈 시 재계산하라.

### Fixed 포지셔닝 폴백

앵커 포지셔닝을 지원하지 않는 브라우저에서는 수동 좌표와 함께 `position: fixed`로 overflow 클리핑을 방지한다:

```css
.dropdown {
  position: fixed;
  /* top/left는 트리거의 getBoundingClientRect()로 JS에서 설정 */
}
```

렌더링 전에 뷰포트 경계를 확인하라. 드롭다운이 하단을 넘치면 트리거 위로 뒤집고, 오른쪽을 넘치면 트리거의 오른쪽에 정렬하라.

### 안티패턴

- **`overflow: hidden` 안에서 `position: absolute`** - 드롭다운이 잘린다. `position: fixed` 또는 최상위 레이어를 사용하라.
- **`z-index: 9999` 같은 임의의 z-index 값** - 의미 있는 z-index 스케일을 사용하라: `dropdown (100) -> sticky (200) -> modal-backdrop (300) -> modal (400) -> toast (500) -> tooltip (600)`.
- **부모의 스태킹 컨텍스트에서 벗어날 수단 없이 드롭다운 마크업을 인라인으로 렌더링하기**. `popover`(최상위 레이어), 포탈, 또는 `position: fixed`를 사용하라.

## 파괴적 액션: 확인보다 되돌리기

**되돌리기(undo)가 확인 대화상자보다 낫다**—사용자는 확인 대화상자를 무심코 클릭한다. UI에서 즉시 제거하고, 되돌리기 토스트를 보여주고, 토스트 만료 후 실제로 삭제하라. 확인 대화상자는 진정으로 되돌릴 수 없는 액션(계정 삭제), 비용이 큰 액션, 또는 일괄 작업에서만 사용하라.

## 키보드 내비게이션 패턴

### 로빙 탭인덱스(Roving Tabindex)

컴포넌트 그룹(탭, 메뉴 항목, 라디오 그룹)에서는 하나의 항목만 탭 가능하고, 화살표 키로 그룹 내부를 이동한다:

```html
<div role="tablist">
  <button role="tab" tabindex="0">탭 1</button>
  <button role="tab" tabindex="-1">탭 2</button>
  <button role="tab" tabindex="-1">탭 3</button>
</div>
```

화살표 키가 항목 간에 `tabindex="0"`을 이동시킨다. Tab 키는 다음 컴포넌트 전체로 이동한다.

### 건너뛰기 링크(Skip Link)

키보드 사용자가 내비게이션을 건너뛸 수 있도록 건너뛰기 링크(`<a href="#main-content">본문으로 건너뛰기</a>`)를 제공하라. 화면 밖에 숨기고 포커스 시 표시한다.

## 제스처 발견 가능성

스와이프하여 삭제(swipe-to-delete)와 같은 제스처는 보이지 않는다. 존재를 알려주라:

- **부분 노출**: 가장자리에서 삭제 버튼이 살짝 보이게
- **온보딩**: 첫 사용 시 코치 마크
- **대안**: 항상 눈에 보이는 폴백을 제공 ("삭제"가 있는 메뉴)

제스처를 액션의 유일한 수행 방법으로 의존하지 말라.

---

**피해야 할 것**: 대체 없이 포커스 인디케이터를 제거하는 것. 플레이스홀더 텍스트를 라벨로 사용하는 것. 44x44px 미만의 터치 타겟. 일반적인 오류 메시지. ARIA/키보드 지원 없는 커스텀 컨트롤.

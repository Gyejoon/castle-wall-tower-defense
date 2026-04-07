# HUD 리디자인 + 가챠 UI Implementation Plan

**Goal:** 전투 HUD를 리디자인하고, 가챠(뽑기) 화면을 새로 구현한다.

**Architecture:** React DOM UI + Phaser Canvas 하이브리드. HUD는 React 오버레이, 가챠 연출은 Phaser 파티클.

**Tech Stack:** TypeScript, React 18, Phaser 3, Zustand, EventBus

---

## Task 1: 전투 HUD 리디자인

### 현재 문제
- HP바와 골드 표시가 너무 작아서 전투 중 확인이 어려움
- 웨이브 카운터가 상단 중앙에 있어서 엄지 도달 불가

### 변경 사항

**상단 바 (React DOM)**
- HP: 좌측 상단, 적색 바 + 숫자
- 골드: 우측 상단, 금색 아이콘 + 숫자
- 웨이브: 중앙 상단, "Wave 3/10" 형태

**하단 독 (React DOM)**
- 타워 선택 슬롯 4개 (빌드 페이즈에서만 표시)
- 전투 페이즈에서는 독이 축소되어 스킬 버튼 1개만 표시

**게임 영역 (Phaser Canvas)**
- 타워 범위 표시 원 (투명 녹색)
- 유닛 체력바 (Phaser Graphics)
- 데미지 넘버 (Phaser Text, 떠오르며 사라짐)

### UI 세부사항
- 적절한 폰트와 색상으로 디자인
- 깔끔한 카드 형태의 레이아웃
- 모달로 세부 정보 표시

---

## Task 2: 가챠 화면

### 화면 구성
- 뽑기 버튼 (1회 / 10회)
- 결과 카드 표시 영역
- 보유 다이아몬드 표시
- pity 카운터

### 연출
- 뽑기 시 화면 전환 효과
- 카드 공개 애니메이션
- 등급별 파티클 이펙트 (SSR은 금빛 폭발)

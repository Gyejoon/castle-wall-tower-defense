# Game Spec 문서 인덱스

> **Last Updated:** 2026-05-06
> **Current Spec:** v4.0 minimal launch scope

이 폴더는 Grid Line Defense의 활성 제품 스펙을 관리한다. v4.0 기준 목표는 **최소 리소스로 출시 가능한 캐주얼 랜덤 합성 타워디펜스**다.

Unity 전환은 유지한다. 단, Unity 전환은 별도 런타임 이행 트랙이며 v1 제품 스펙을 키우는 근거가 아니다.

---

## 문서 목록

| 파일 | 역할 |
|------|------|
| [01-GDD.md](./01-GDD.md) | 게임 정의, v1 범위, 핵심 루프, UI, Unity 전환 원칙 |
| [02-balance-sheet.md](./02-balance-sheet.md) | v1 세션/energy/소환/타워/wave/card 밸런스 |
| [03-business-model.md](./03-business-model.md) | 선택형 광고 2곳 중심의 최소 BM |
| [04-data-structure.md](./04-data-structure.md) | localStorage 중심 최소 저장 구조와 Unity data bridge |
| [05-operations.md](./05-operations.md) | 낮은 유지보수 운영 스택과 QA 기준 |
| [06-milestone.md](./06-milestone.md) | 최소 출시 로드맵과 Unity 전환 트랙 |
| [07-asset-definition.md](./07-asset-definition.md) | 현재 에셋 동결, 신규 제작 보류, Unity asset note |
| [08-architecture.md](./08-architecture.md) | Phaser v1 active path와 Unity 전환 아키텍처 |

---

## Active V1 Scope

v1에 포함한다:

- 단일 정식 모드
- 단일 맵 `main_long`
- 랜덤 소환
- family/tier 합성
- 보스 후 3카드 선택
- 선택형 rewarded ad: 이어하기, 카드 리롤
- localStorage 저장
- Phaser v1 운영
- Unity 전환 준비

v1에서 제외한다:

- 다이아 상자/천장
- 일일/주간 미션
- 별 등급
- grade 승급/각성/조각
- 덱 편성
- 월드맵/스테이지 선택
- 서버 저장
- 시즌/이벤트/LiveOps
- 랭킹/PVP
- 신규 맵 제작

---

## 운용 원칙

1. 기능 추가보다 5분 Go/No-Go 검증을 우선한다.
2. 새 시스템은 “지하철에서 한 손으로 한 판 더”에 기여할 때만 추가한다.
3. 운영비를 만들기 위해 운영비가 드는 시스템을 넣지 않는다.
4. Unity 전환은 유지하되, Phaser v1 최소 루프와 동일한 범위에서 parity를 맞춘다.
5. 레거시 문구를 다시 활성 스펙으로 복구하지 않는다. 필요한 경우 Parking Lot에 둔다.

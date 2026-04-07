# Game Spec 문서 인덱스

> **Last Updated:** 2026-04-07

이 폴더는 게임의 모든 설계 결정을 담는 **단일 원천 문서** 집합이다.

## 문서 목록

| 파일 | 역할 | 주요 업데이트 트리거 |
|------|------|-----------------|
| [01-GDD.md](./01-GDD.md) | 게임 정의, 코어 루프, 시스템, 콘텐츠 플랜, UI | 게임 메커닉/시스템 변경 |
| [02-balance-sheet.md](./02-balance-sheet.md) | 수치 밸런스 (화폐, 가챠, 미션, 타워, 적) | 수치 튜닝, 가챠 확률 변경 |
| [03-business-model.md](./03-business-model.md) | BM 구조, 상점, 광고, 구독, KPI | 수익화 정책 변경 |
| [04-data-structure.md](./04-data-structure.md) | Save Data 스키마, 텔레메트리 이벤트 | 저장 구조/스키마 변경 |
| [05-operations.md](./05-operations.md) | 운영 스택, LiveOps, 모니터링 | 툴 추가·변경, 운영 정책 변경 |
| [06-milestone.md](./06-milestone.md) | Phase 로드맵, 단기/중기/장기 계획 | 스프린트 완료, 계획 변경 |
| [07-asset-definition.md](./07-asset-definition.md) | 에셋 사양, 인벤토리, 파이프라인 | 에셋 추가·변경 |

## 운용 원칙

1. **문서가 코드보다 먼저다.** 수치, 시스템, BM을 바꾸기 전에 이 폴더의 해당 문서를 먼저 업데이트한다.
2. **구현 후 코드와 문서가 다르면 문서를 교정한다.**
3. **모든 에이전트 구현 작업은 이 폴더를 기준으로 시작한다.**
4. Obsidian vault(`game-planning/towerDefense/`)는 원천 아이디어 저장소다. 수정하지 않는다.

## 원천 소스 매핑

| 문서 | Obsidian 소스 |
|------|--------------|
| 01-GDD | `ai/product/specs/일반모드 게임 설계 문서.md` |
| 02-balance-sheet | `ai/product/specs/게임 밸런스 시트.md` |
| 03-business-model | GDD §11 BM |
| 04-data-structure | GDD §13 Save Data Schema |
| 05-operations | `운영용 툴.md` + GDD §12 LiveOps |
| 06-milestone | `ai/product/planning/일반모드 게임 planning.md` |
| 07-asset-definition | `ai/product/specs/게임 에셋 제작 specs.md` |

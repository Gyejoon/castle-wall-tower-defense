# A* 패스파인딩 최적화 Implementation Plan

**Goal:** 현재 A* 패스파인딩 알고리즘의 성능을 개선하여 유닛 50개 이상 동시 경로 계산 시 프레임 드롭을 방지한다.

**Architecture:** @gld/phaser-game의 PathfindingSystem을 수정. shared 패키지의 그리드 유틸리티 함수 최적화.

**Tech Stack:** TypeScript, Phaser 3, Vitest

---

## Scope Note

이 플랜은 순수 로직 최적화만 다룬다:
- 경로 캐싱 (동일 출발-도착 쌍)
- Binary heap 우선순위 큐 도입
- Hierarchical pathfinding (그리드를 4x4 클러스터로 분할)

UI 변경 없음. 시각적 변경 없음.

---

## Task 1: Binary Heap Priority Queue

**Files:**
- Create: `packages/phaser-game/src/utils/BinaryHeap.ts`
- Modify: `packages/phaser-game/src/systems/PathfindingSystem.ts`

현재 배열 기반 open list를 binary heap으로 교체.
O(n) → O(log n) 탐색.

## Task 2: Path Cache

**Files:**
- Modify: `packages/phaser-game/src/systems/PathfindingSystem.ts`

동일 (start, end, gridState) 해시에 대해 캐시된 경로 반환.
gridState가 변경되면 (타워 배치/제거) 캐시 무효화.
LRU 캐시, 최대 100개 엔트리.

## Task 3: 테스트

- pathfinding 벤치마크 테스트 추가
- 50유닛 동시 경로 계산 < 16ms 목표

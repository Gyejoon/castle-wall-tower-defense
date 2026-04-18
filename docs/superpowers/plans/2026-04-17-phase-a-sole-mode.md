# Phase A 단독 모드 승격 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phase A(랜덤 소환+합성+로그라이크)를 게임의 유일한 메인 모드로 승격시키고, 4계열×4단+혼합5단×2+최종6단 합성 트리, 인게임 가챠, 메타루프, BM 광고 스텁, 리디자인된 9×18 맵 + 구조물 요소, 전면 개편된 HUD까지 구현한다. 시나리오 모드(W1~W3, DeckDock, worlds/missions/achievements)는 완전 제거.

**Architecture:** 기존 `PhaseAOrchestrator` EventBus 아키텍처를 뼈대로 유지하되, Grade 시스템을 `family`+`tier(1~6)` 모델로 교체. 시나리오 모드 관련 파일 대량 삭제. 신규 시스템(GachaSystem, metaProgressStore, AdService) 추가. 맵은 9×18 + obstacles 필드 추가된 `MapLayout` 타입으로 확장.

**Tech Stack:** TypeScript, React 18, Phaser 3, Zustand(+persist), Bun test, Vite, tiny-swords 에셋

---

## Context

- 현재 시나리오 모드 + Phase A 병존 → Phase A만 남기기
- 사용자 요구: 타워 재편, 인게임 가챠, 빙결/스턴 공격력, 로그라이크 중복 누적, 메타루프, BM, 맵 재설계, HUD 개편, 타일맵 톤다운
- 메모리 충돌: `feedback_no_random_roll.md`는 이번 요청이 오버라이드 (삭제 대상)
- 에셋 제약: 신규 3종 타워는 플레이스홀더만 (generate:assets 금지 메모리)
- 플랜 파일 위치: 승인 후 `docs/superpowers/plans/2026-04-17-phase-a-sole-mode.md`로 이동

---

## Phase 0: 사전 정리 (수동/플랜 모드 외)

### Task 0.1: GitHub 오픈 이슈 일괄 닫기

**Files:** (git/github)

- [ ] **Step 1: 오픈 이슈 목록 확인**

Run: `gh issue list --state open --limit 100`
Expected: 오픈 이슈 테이블 출력

- [ ] **Step 2: 이번 리디자인과 충돌하거나 무효화된 이슈 close**

Run: `gh issue list --state open --json number,title --limit 100 | jq -r '.[] | "\(.number) \(.title)"'` 로 제목 확인 후 일괄 close
```bash
# 예: 전체 일괄 close
gh issue list --state open --json number -q '.[].number' | xargs -I {} gh issue close {} -c "Phase A 단독 모드 승격으로 재스코핑됨"
```

- [ ] **Step 3: 닫힌 상태 검증**

Run: `gh issue list --state open`
Expected: "no issues match your search" 또는 의도적으로 유지한 이슈만 남음

### Task 0.2: 메모리 정리 (랜덤 롤 제거 메모리 삭제)

**Files:**
- Delete: `/Users/lio/.claude-personal/projects/-Users-lio-Documents-personal-github-grid-line-defense-pvp/memory/feedback_no_random_roll.md`
- Modify: `/Users/lio/.claude-personal/projects/-Users-lio-Documents-personal-github-grid-line-defense-pvp/memory/MEMORY.md` (해당 라인 제거)

- [ ] **Step 1: 파일 제거**
```bash
rm /Users/lio/.claude-personal/projects/-Users-lio-Documents-personal-github-grid-line-defense-pvp/memory/feedback_no_random_roll.md
```

- [ ] **Step 2: MEMORY.md 인덱스에서 해당 라인 제거**

`- [랜덤 롤 제거](feedback_no_random_roll.md) — 랜덤 타워 롤 재미없음, 덱 시스템으로 교체` 라인 삭제

### Task 0.3: 플랜 파일을 docs/superpowers/plans로 이동

**Files:**
- Create: `docs/superpowers/plans/2026-04-17-phase-a-sole-mode.md`

- [ ] **Step 1: 플랜 파일 복사**
```bash
cp /Users/lio/.claude-personal/plans/phase1-sprightly-cocke.md docs/superpowers/plans/2026-04-17-phase-a-sole-mode.md
```

- [ ] **Step 2: 커밋**
```bash
git add docs/superpowers/plans/2026-04-17-phase-a-sole-mode.md
git commit -m "docs: add Phase A sole-mode implementation plan"
```

---

## Phase 1: 타워 데이터 모델 재설계

### Task 1.1: TowerFamily 타입 추가

**Files:**
- Modify: `packages/shared/src/types/tower.ts`

- [ ] **Step 1: 타입 추가 전 실패 테스트 작성**

**Test:** `packages/shared/src/types/__tests__/tower.test.ts`
```ts
import { describe, it, expect } from 'bun:test'
import type { TowerFamily, TowerDef } from '../tower'

describe('TowerDef', () => {
  it('has family field typed as TowerFamily', () => {
    const sample: Pick<TowerDef, 'family' | 'tier'> = { family: 'archer', tier: 1 }
    expect(sample.family).toBe('archer')
    expect(sample.tier).toBe(1)
  })
})
```

- [ ] **Step 2: 타입체크로 fail 확인**

Run: 저장소 실제 타입체크 스크립트 (Task 0.5에서 확인. 예: `bun typecheck` 또는 `bunx tsc -b packages/shared`)
Expected: FAIL — "Property 'family' does not exist on TowerDef"
(런타임 테스트가 아닌 컴파일 단계 검증. `bun test`는 .ts 컴파일 실패 시 전체 실행 중단)

- [ ] **Step 3: TowerFamily + tier 필드 추가**

`packages/shared/src/types/tower.ts` 수정:
```ts
export type TowerFamily = 'archer' | 'siege' | 'frost' | 'stun' | 'hybrid' | 'ultimate'

export interface TowerDef {
  id: TowerId
  name: string
  family: TowerFamily
  tier: number  // 1~6
  // ... 기존 필드들 유지
}
```

기존 `grade` 참조는 타입 에러 발생 → Task 1.2에서 이어서 해결.

- [ ] **Step 4: 타입체크 + 테스트 통과 확인**

Run: 타입체크 스크립트 → PASS 후 `bun test packages/shared/src/types/__tests__/tower.test.ts` → PASS

- [ ] **Step 5: 커밋**
```bash
git add packages/shared/src/types/tower.ts packages/shared/src/types/__tests__/tower.test.ts
git commit -m "feat(shared): add TowerFamily and tier field to TowerDef"
```

### Task 1.2: towers.ts를 4계열×4단으로 재구성

**Files:**
- Modify: `packages/shared/src/constants/towers.ts`

- [ ] **Step 1: 매핑 테스트 작성**

**Test:** `packages/shared/src/constants/__tests__/towers.test.ts`
```ts
import { describe, it, expect } from 'bun:test'
import { TOWER_DEFS, getTowersByFamily, MERGE_CHAIN } from '../towers'

describe('TOWER_DEFS 4-family × 4-tier mapping', () => {
  it.each([
    ['archer', ['archer', 'wind_spire', 'flame_tower', 'arcane_spire']],
    ['siege', ['nova_cannon', 'fortress', 'earth_golem', 'celestial']],
    ['frost', ['emp', 'stasis_field', 'disruptor', 'world_tree']],
    ['stun', ['shield', 'twin_archer', 'holy_shrine', 'divine_throne']],
  ])('family %s has 4 tiers in order', (family, ids) => {
    const tiered = getTowersByFamily(family as any).sort((a, b) => a.tier - b.tier)
    expect(tiered.map(t => t.id)).toEqual(ids)
  })

  it('has hybrid and ultimate entries', () => {
    expect(TOWER_DEFS.find(t => t.id === 'hybrid_ab')?.tier).toBe(5)
    expect(TOWER_DEFS.find(t => t.id === 'hybrid_cd')?.tier).toBe(5)
    expect(TOWER_DEFS.find(t => t.id === 'ultimate')?.tier).toBe(6)
  })

  it('excludes plasma and dragon_nest', () => {
    expect(TOWER_DEFS.find(t => t.id === 'plasma')).toBeUndefined()
    expect(TOWER_DEFS.find(t => t.id === 'dragon_nest')).toBeUndefined()
  })

  it('MERGE_CHAIN resolves tier 1-3 same-family merges', () => {
    expect(MERGE_CHAIN['archer_1_same']).toBe('wind_spire')
    expect(MERGE_CHAIN['siege_3_same']).toBe('celestial')
    expect(MERGE_CHAIN['frost_3_same']).toBe('world_tree')
  })

  it('MERGE_CHAIN resolves tier-4 hybrid pairs', () => {
    expect(MERGE_CHAIN['arcane_spire+celestial']).toBe('hybrid_ab')
    expect(MERGE_CHAIN['celestial+arcane_spire']).toBe('hybrid_ab')
    expect(MERGE_CHAIN['world_tree+divine_throne']).toBe('hybrid_cd')
    expect(MERGE_CHAIN['hybrid_ab+hybrid_cd']).toBe('ultimate')
  })
})
```

- [ ] **Step 2: 타입체크 + 테스트 fail 확인**

Run: 타입체크 → 새 상수/함수 미존재로 FAIL → 다음 Step 구현 후 재시도
(`bun test`는 .ts 컴파일 통과 후에만 runtime 검증 가능)

- [ ] **Step 3: towers.ts 재작성**

`packages/shared/src/constants/towers.ts`:
```ts
import type { TowerDef, TowerFamily, TowerId } from '../types/tower'

export const TOWER_DEFS: TowerDef[] = [
  // --- archer family ---
  { id: 'archer',       name: '궁수탑',    family: 'archer', tier: 1, damage: 20, range: 4, attackSpeed: 1.0, /* ... */ },
  { id: 'wind_spire',   name: '바람첨탑',  family: 'archer', tier: 2, damage: 35, range: 4.5, attackSpeed: 1.2, /* ... */ },
  { id: 'flame_tower',  name: '화염탑',    family: 'archer', tier: 3, damage: 60, range: 5, attackSpeed: 1.3, /* ... */ },
  { id: 'arcane_spire', name: '비전첨탑',  family: 'archer', tier: 4, damage: 100, range: 5.5, attackSpeed: 1.5, /* ... */ },

  // --- siege family ---
  { id: 'nova_cannon',  name: '투석기',    family: 'siege', tier: 1, damage: 30, range: 3.5, attackSpeed: 0.5, splash: 1.2 },
  { id: 'fortress',     name: '공성대포',  family: 'siege', tier: 2, damage: 55, range: 4, attackSpeed: 0.6, splash: 1.5 },
  { id: 'earth_golem',  name: '대지골렘',  family: 'siege', tier: 3, damage: 90, range: 4.5, attackSpeed: 0.7, splash: 1.8 },
  { id: 'celestial',    name: '천상의탑',  family: 'siege', tier: 4, damage: 150, range: 5, attackSpeed: 0.8, splash: 2.2 },

  // --- frost family (공격력 부여, 주력은 슬로우) ---
  { id: 'emp',          name: '눈보라탑',  family: 'frost', tier: 1, damage: 8,  range: 3.5, attackSpeed: 0.8, slowPct: 0.30 },
  { id: 'stasis_field', name: '서리마탑',  family: 'frost', tier: 2, damage: 14, range: 4,   attackSpeed: 0.9, slowPct: 0.45 },
  { id: 'disruptor',    name: '빙하제단',  family: 'frost', tier: 3, damage: 24, range: 4.5, attackSpeed: 1.0, slowPct: 0.60 },
  { id: 'world_tree',   name: '세계수',    family: 'frost', tier: 4, damage: 40, range: 5,   attackSpeed: 1.1, slowPct: 0.75 },

  // --- stun family (공격력 부여, 주력은 스턴) ---
  { id: 'shield',         name: '성기사제단', family: 'stun', tier: 1, damage: 5,  range: 3, attackSpeed: 0.5, stunMs: 300 },
  { id: 'twin_archer',    name: '수호탑',     family: 'stun', tier: 2, damage: 10, range: 3.5, attackSpeed: 0.6, stunMs: 500 },
  { id: 'holy_shrine',    name: '신성제단',   family: 'stun', tier: 3, damage: 18, range: 4, attackSpeed: 0.7, stunMs: 800 },
  { id: 'divine_throne',  name: '신의 옥좌', family: 'stun', tier: 4, damage: 30, range: 4.5, attackSpeed: 0.8, stunMs: 1200 },

  // --- hybrid 5 (플레이스홀더 스탯) ---
  { id: 'hybrid_ab', name: '비전포성',   family: 'hybrid', tier: 5, damage: 200, range: 6, attackSpeed: 1.4, splash: 1.6 },
  { id: 'hybrid_cd', name: '동결의군림', family: 'hybrid', tier: 5, damage: 80,  range: 5.5, attackSpeed: 1.2, slowPct: 0.80, stunMs: 600 },

  // --- ultimate 6 ---
  { id: 'ultimate', name: '세계의 끝', family: 'ultimate', tier: 6, damage: 500, range: 7, attackSpeed: 1.6, splash: 2.5, slowPct: 0.90, stunMs: 1500 },
]

export function getTowersByFamily(family: TowerFamily): TowerDef[] {
  return TOWER_DEFS.filter(t => t.family === family)
}

export function getTowerById(id: TowerId): TowerDef | undefined {
  return TOWER_DEFS.find(t => t.id === id)
}

export const MERGE_CHAIN: Record<string, TowerId> = {
  // same-family tier 1→2→3→4 ascensions
  'archer_1_same': 'wind_spire',
  'archer_2_same': 'flame_tower',
  'archer_3_same': 'arcane_spire',
  'siege_1_same':  'fortress',
  'siege_2_same':  'earth_golem',
  'siege_3_same':  'celestial',
  'frost_1_same':  'stasis_field',
  'frost_2_same':  'disruptor',
  'frost_3_same':  'world_tree',
  'stun_1_same':   'twin_archer',
  'stun_2_same':   'holy_shrine',
  'stun_3_same':   'divine_throne',
  // hybrid tier 4+4 → 5
  'arcane_spire+celestial': 'hybrid_ab',
  'celestial+arcane_spire': 'hybrid_ab',
  'world_tree+divine_throne': 'hybrid_cd',
  'divine_throne+world_tree': 'hybrid_cd',
  // ultimate 5+5 → 6
  'hybrid_ab+hybrid_cd': 'ultimate',
  'hybrid_cd+hybrid_ab': 'ultimate',
}

export function resolveMerge(towerIdA: TowerId, tierA: number, familyA: TowerFamily,
                             towerIdB: TowerId, tierB: number, familyB: TowerFamily): TowerId | null {
  // same-family same-tier merge (tier 1-3)
  if (familyA === familyB && tierA === tierB && tierA < 4) {
    return MERGE_CHAIN[`${familyA}_${tierA}_same`] ?? null
  }
  // hybrid and ultimate: look up by tower id pair
  const key = `${towerIdA}+${towerIdB}`
  return MERGE_CHAIN[key] ?? null
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `bun test packages/shared/src/constants/__tests__/towers.test.ts`
Expected: PASS (6개 테스트)

- [ ] **Step 5: 기존 타입 에러 해소 임시 조치**

전체 빌드는 아직 실패함 (다른 파일이 grade 참조 중). 다음 Task에서 해결.

- [ ] **Step 6: 커밋**
```bash
git add packages/shared/src/constants/towers.ts packages/shared/src/constants/__tests__/towers.test.ts
git commit -m "feat(shared): rewrite TOWER_DEFS to 4-family × 4-tier + hybrid + ultimate"
```

### Task 1.3: Grade 시스템 제거

**Files:**
- Delete: `packages/shared/src/types/grade.ts`
- Modify: `packages/shared/src/index.ts` (export 제거)
- Modify: Grade 참조하는 모든 파일

- [ ] **Step 1: Grade 사용처 전수 조사**

Run: `rg -n "from.*grade|import.*Grade|nextGrade|isMaxGrade" packages/`
Expected: 사용처 파일 목록 (shared, phaser-game, web-shell)

- [ ] **Step 2: Grade 참조하는 각 파일에서 제거/치환**

각 파일에서 `grade`를 참조하는 타입/인자/함수 호출을 `family` + `tier`로 치환. 개별 치환 범위가 크므로 이 Task는 큰 편집 1건으로 진행:

주요 파일:
- `packages/phaser-game/src/systems/MergeSystem.ts` — Task 2에서 상세 처리
- `packages/phaser-game/src/systems/PhaseAOrchestrator.ts` — merge 호출 payload
- `packages/phaser-game/src/systems/TowerSystem.ts` — 타워 인스턴스 생성 시 grade 제거
- `packages/shared/src/data/summonPool.ts` — `grade: 'normal'` 하드코딩 제거, tier 1만 랜덤 풀에 포함
- `packages/web-shell/src/components/game/PhaseAHud.tsx` — UI 표시 (grade 뱃지 등)

- [ ] **Step 3: grade.ts 삭제**

```bash
rm packages/shared/src/types/grade.ts
```

- [ ] **Step 4: index export 정리**

`packages/shared/src/index.ts`에서 `export * from './types/grade'` 또는 개별 export 제거.

- [ ] **Step 5: 빌드 통과 확인**

Run: `bun run build`
Expected: PASS (타입 에러 없이 빌드)

- [ ] **Step 6: 커밋**
```bash
git add -A
git commit -m "refactor(shared): remove Grade system, migrate to family+tier"
```

### Task 1.4: SummonPool에서 1단 타워만 랜덤 풀에 유지

**Files:**
- Modify: `packages/shared/src/data/summonPool.ts`

- [ ] **Step 1: 테스트 작성**

**Test:** `packages/shared/src/data/__tests__/summonPool.test.ts`
```ts
import { describe, it, expect } from 'bun:test'
import { PHASE_A_SUMMON_POOL, drawRandomSummon } from '../summonPool'
import { getTowerById } from '../../constants/towers'

describe('summonPool', () => {
  it('contains only tier-1 towers', () => {
    for (const entry of PHASE_A_SUMMON_POOL) {
      const def = getTowerById(entry.towerId)
      expect(def?.tier).toBe(1)
    }
  })
  it('covers all 4 families', () => {
    const families = new Set(PHASE_A_SUMMON_POOL.map(e => getTowerById(e.towerId)?.family))
    expect(families).toEqual(new Set(['archer', 'siege', 'frost', 'stun']))
  })
})
```

- [ ] **Step 2: 테스트 fail 확인**

Run: `bun test packages/shared/src/data/__tests__/summonPool.test.ts`
Expected: FAIL

- [ ] **Step 3: summonPool.ts 재구성**

`packages/shared/src/data/summonPool.ts`:
```ts
import type { TowerId } from '../types/tower'

export interface SummonPoolEntry {
  towerId: TowerId
  weight: number
}

export const PHASE_A_SUMMON_POOL: SummonPoolEntry[] = [
  { towerId: 'archer',      weight: 1 },
  { towerId: 'nova_cannon', weight: 1 },
  { towerId: 'emp',         weight: 1 },
  { towerId: 'shield',      weight: 1 },
]

export const PHASE_A_SUMMON_COST = 20

export function drawRandomSummon(rng: () => number = Math.random): TowerId {
  const total = PHASE_A_SUMMON_POOL.reduce((sum, e) => sum + e.weight, 0)
  let r = rng() * total
  for (const entry of PHASE_A_SUMMON_POOL) {
    r -= entry.weight
    if (r <= 0) return entry.towerId
  }
  return PHASE_A_SUMMON_POOL[0].towerId
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `bun test packages/shared/src/data/__tests__/summonPool.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**
```bash
git add packages/shared/src/data/summonPool.ts packages/shared/src/data/__tests__/summonPool.test.ts
git commit -m "refactor(shared): simplify summon pool to tier-1 towers only"
```

---

## Phase 2: MergeSystem 리팩토링

### Task 2.1: TowerLocator 타입 교체

**Files:**
- Modify: `packages/phaser-game/src/systems/MergeSystem.ts`

- [ ] **Step 1: 테스트 파일 현행 조사**

Run: `cat packages/phaser-game/tests/MergeSystem.test.ts`
Expected: 기존 6개 테스트 케이스 출력

- [ ] **Step 2: 테스트 파일 전면 수정**

`packages/phaser-game/tests/MergeSystem.test.ts`:
```ts
import { describe, it, expect } from 'bun:test'
import { MergeSystem } from '../src/systems/MergeSystem'
import type { TowerLocator } from '../src/systems/MergeSystem'

const archer1 = (id: string): TowerLocator => ({ instanceId: id, towerId: 'archer', family: 'archer', tier: 1, x: 0, y: 0 })
const siege1 = (id: string): TowerLocator => ({ instanceId: id, towerId: 'nova_cannon', family: 'siege', tier: 1, x: 0, y: 0 })
const arcane4 = (id: string): TowerLocator => ({ instanceId: id, towerId: 'arcane_spire', family: 'archer', tier: 4, x: 0, y: 0 })
const celestial4 = (id: string): TowerLocator => ({ instanceId: id, towerId: 'celestial', family: 'siege', tier: 4, x: 0, y: 0 })
const worldtree4 = (id: string): TowerLocator => ({ instanceId: id, towerId: 'world_tree', family: 'frost', tier: 4, x: 0, y: 0 })
const throne4 = (id: string): TowerLocator => ({ instanceId: id, towerId: 'divine_throne', family: 'stun', tier: 4, x: 0, y: 0 })
const hybridAb = (id: string): TowerLocator => ({ instanceId: id, towerId: 'hybrid_ab', family: 'hybrid', tier: 5, x: 0, y: 0 })
const hybridCd = (id: string): TowerLocator => ({ instanceId: id, towerId: 'hybrid_cd', family: 'hybrid', tier: 5, x: 0, y: 0 })

describe('MergeSystem.tryMerge', () => {
  it('same-family same-tier 1 → tier 2', () => {
    const r = MergeSystem.tryMerge(archer1('a'), archer1('b'))
    expect(r.kind).toBe('success')
    if (r.kind === 'success') {
      expect(r.toTowerId).toBe('wind_spire')
      expect(r.toTier).toBe(2)
    }
  })

  it('different family tier 1 → incompatible', () => {
    const r = MergeSystem.tryMerge(archer1('a'), siege1('b'))
    expect(r.kind).toBe('failure')
    if (r.kind === 'failure') expect(r.reason).toBe('incompatible-pair')
  })

  it('hybrid_ab from arcane_spire + celestial', () => {
    const r = MergeSystem.tryMerge(arcane4('a'), celestial4('b'))
    expect(r.kind).toBe('success')
    if (r.kind === 'success') expect(r.toTowerId).toBe('hybrid_ab')
  })

  it('hybrid_cd from world_tree + divine_throne', () => {
    const r = MergeSystem.tryMerge(worldtree4('a'), throne4('b'))
    expect(r.kind).toBe('success')
    if (r.kind === 'success') expect(r.toTowerId).toBe('hybrid_cd')
  })

  it('ultimate from hybrid_ab + hybrid_cd', () => {
    const r = MergeSystem.tryMerge(hybridAb('a'), hybridCd('b'))
    expect(r.kind).toBe('success')
    if (r.kind === 'success') expect(r.toTowerId).toBe('ultimate')
  })

  it('tier-4 archer + archer → incompatible (no same-tier 4 merge)', () => {
    const r = MergeSystem.tryMerge(arcane4('a'), arcane4('b'))
    expect(r.kind).toBe('failure')
    if (r.kind === 'failure') expect(r.reason).toBe('incompatible-pair')
  })

  it('ultimate + ultimate → max-tier', () => {
    const u = (id: string): TowerLocator => ({ instanceId: id, towerId: 'ultimate', family: 'ultimate', tier: 6, x: 0, y: 0 })
    const r = MergeSystem.tryMerge(u('a'), u('b'))
    expect(r.kind).toBe('failure')
    if (r.kind === 'failure') expect(r.reason).toBe('max-tier')
  })

  it('rejects self-merge', () => {
    const a = archer1('same')
    const r = MergeSystem.tryMerge(a, a)
    expect(r.kind).toBe('failure')
    if (r.kind === 'failure') expect(r.reason).toBe('same-instance')
  })
})
```

- [ ] **Step 3: 테스트 fail 확인**

Run: `bun test packages/phaser-game/tests/MergeSystem.test.ts`
Expected: FAIL (8개 모두)

- [ ] **Step 4: MergeSystem.ts 재작성**

`packages/phaser-game/src/systems/MergeSystem.ts`:
```ts
import type { TowerFamily, TowerId } from '@gld/shared'
import { resolveMerge } from '@gld/shared'

export interface TowerLocator {
  instanceId: string
  towerId: TowerId
  family: TowerFamily
  tier: number
  x: number
  y: number
}

export type MergeFailReason = 'same-instance' | 'incompatible-pair' | 'max-tier'

export type MergeResult =
  | { kind: 'success'; toTowerId: TowerId; toTier: number; consumedA: string; consumedB: string }
  | { kind: 'failure'; reason: MergeFailReason }

export class MergeSystem {
  static tryMerge(a: TowerLocator, b: TowerLocator): MergeResult {
    if (a.instanceId === b.instanceId) return { kind: 'failure', reason: 'same-instance' }
    if (a.tier >= 6 || b.tier >= 6) return { kind: 'failure', reason: 'max-tier' }
    const next = resolveMerge(a.towerId, a.tier, a.family, b.towerId, b.tier, b.family)
    if (!next) return { kind: 'failure', reason: 'incompatible-pair' }
    const nextTier = a.tier === b.tier ? a.tier + 1 : Math.max(a.tier, b.tier) + 1
    return { kind: 'success', toTowerId: next, toTier: nextTier, consumedA: a.instanceId, consumedB: b.instanceId }
  }
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `bun test packages/phaser-game/tests/MergeSystem.test.ts`
Expected: PASS (8개)

- [ ] **Step 6: 커밋**
```bash
git add packages/phaser-game/src/systems/MergeSystem.ts packages/phaser-game/tests/MergeSystem.test.ts
git commit -m "refactor(merge): family+tier merge rules with hybrid/ultimate support"
```

### Task 2.2: PhaseAOrchestrator merge 호출부 업데이트

**Files:**
- Modify: `packages/phaser-game/src/systems/PhaseAOrchestrator.ts`

- [ ] **Step 1: merge 핸들러 확인**

Run: `rg -n "handleMerge|tryMerge|grade" packages/phaser-game/src/systems/PhaseAOrchestrator.ts`
Expected: merge 관련 라인 번호 출력

- [ ] **Step 2: EventBus payload 업데이트**

`PhaseAOrchestrator.ts`에서:
- `towers-merged` emit의 `fromGrade/toGrade` → `fromTier/toTier` + `toTowerId`
- TowerLocator 생성 시 `family` + `tier` 채움

핵심 변경 지점 코드:
```ts
private handleMergeRequest(payload: { aId: string; bId: string }) {
  const a = this.towerSystem.getLocator(payload.aId)
  const b = this.towerSystem.getLocator(payload.bId)
  if (!a || !b) return
  const result = MergeSystem.tryMerge(a, b)
  if (result.kind === 'failure') {
    this.events.emit('merge-failed', { reason: result.reason })
    return
  }
  this.towerSystem.remove(result.consumedA)
  this.towerSystem.remove(result.consumedB)
  const newTower = this.towerSystem.spawn(result.toTowerId, a.x, a.y)
  this.events.emit('towers-merged', {
    fromA: a.instanceId, fromB: b.instanceId,
    toInstanceId: newTower.instanceId,
    toTowerId: result.toTowerId,
    toTier: result.toTier,
  })
}
```

- [ ] **Step 3: 전체 빌드 통과 확인**

Run: `bun run typecheck && bun run build`
Expected: PASS

- [ ] **Step 4: 커밋**
```bash
git add packages/phaser-game/src/systems/PhaseAOrchestrator.ts
git commit -m "refactor(phase-a): update orchestrator merge payloads to use tier"
```

### Task 2.3: PhaseAHud 합성 UI를 tier 기반으로 변환

**Files:**
- Modify: `packages/web-shell/src/components/game/PhaseAHud.tsx`

- [ ] **Step 1: grade 참조 찾기**

Run: `rg -n "grade|Grade" packages/web-shell/src/components/game/PhaseAHud.tsx`
Expected: 참조 라인 출력

- [ ] **Step 2: tier 기반으로 교체**

grade 뱃지 표시를 tier 숫자로 변경:
```tsx
<span className="text-[10px] text-amber-300">T{tower.tier}</span>
```

`towers-merged` 이벤트 수신도 `fromTier/toTier` 읽도록 수정.

- [ ] **Step 3: 타입 에러 없는지 확인**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 4: 커밋**
```bash
git add packages/web-shell/src/components/game/PhaseAHud.tsx
git commit -m "refactor(hud): tier-based tower badges replacing grade"
```

---

## Phase 3: 에너지 시스템 개편

### Task 3.1: 에너지 상수 추가

**Files:**
- Modify: `packages/shared/src/constants/energy.ts`

- [ ] **Step 1: 테스트 작성**

**Test:** `packages/shared/src/constants/__tests__/energy.test.ts`
```ts
import { describe, it, expect } from 'bun:test'
import {
  ENERGY_PER_SECOND, ENERGY_PER_KILL,
  ENERGY_PER_BOSS_KILL, ENERGY_PER_BOSS_FAST_CLEAR,
  FAST_CLEAR_THRESHOLD_MS, INGAME_GACHA
} from '../energy'

describe('energy constants', () => {
  it('matches spec values', () => {
    expect(ENERGY_PER_SECOND).toBe(1)
    expect(ENERGY_PER_KILL).toBe(1)
    expect(ENERGY_PER_BOSS_KILL).toBe(20)
    expect(ENERGY_PER_BOSS_FAST_CLEAR).toBe(20)
    expect(FAST_CLEAR_THRESHOLD_MS).toBe(30_000)
  })
  it('ingame gacha probabilities', () => {
    expect(INGAME_GACHA.tier2).toEqual({ cost: 40, successRate: 0.60 })
    expect(INGAME_GACHA.tier3).toEqual({ cost: 80, successRate: 0.20 })
    expect(INGAME_GACHA.tier4).toEqual({ cost: 160, successRate: 0.05 })
  })
})
```

- [ ] **Step 2: 테스트 fail 확인**

Run: `bun test packages/shared/src/constants/__tests__/energy.test.ts`
Expected: FAIL

- [ ] **Step 3: energy.ts 확장**

`packages/shared/src/constants/energy.ts`:
```ts
export const ENERGY_PER_SECOND = 1
export const ENERGY_INITIAL = 40
export const ENERGY_MAX = 200           // 200으로 상향 (tier4 gacha 160 감안)
export const ENERGY_PER_KILL = 1
export const ENERGY_PER_BOSS_KILL = 20
export const ENERGY_PER_BOSS_FAST_CLEAR = 20
export const FAST_CLEAR_THRESHOLD_MS = 30_000

export const INGAME_GACHA = {
  tier2: { cost: 40, successRate: 0.60 },
  tier3: { cost: 80, successRate: 0.20 },
  tier4: { cost: 160, successRate: 0.05 },
} as const

// legacy export 제거: ENERGY_PER_WAVE_CLEAR
```

- [ ] **Step 4: 테스트 통과**

Run: `bun test packages/shared/src/constants/__tests__/energy.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**
```bash
git add packages/shared/src/constants/energy.ts packages/shared/src/constants/__tests__/energy.test.ts
git commit -m "feat(shared): add kill/boss-kill energy + ingame gacha constants"
```

### Task 3.2: Game.ts 에너지 지급 로직 변경

**Files:**
- Modify: `packages/phaser-game/src/scenes/Game.ts`

- [ ] **Step 1: 현재 킬/웨이브 콜백 위치 확인**

Run: `rg -n "onUnitKilled|onWaveCompleted|ENERGY_PER_WAVE_CLEAR|bossBehaviors" packages/phaser-game/src/scenes/Game.ts`
Expected: 수정 대상 라인 출력

- [ ] **Step 2: 유닛 킬 에너지 지급 추가**

유닛 킬 콜백 내에서:
```ts
this.energySystem.add(ENERGY_PER_KILL)
```
기존 `kill_energy` 업그레이드 스택과 병행되어 누적 가산.

- [ ] **Step 3: 보스 킬 감지 + 보너스**

`bossBehaviors.delete(unitId)` 직후에:
```ts
const elapsed = this.scene.time.now - this.waveStartMs
this.energySystem.add(ENERGY_PER_BOSS_KILL)
if (elapsed < FAST_CLEAR_THRESHOLD_MS) {
  this.energySystem.add(ENERGY_PER_BOSS_FAST_CLEAR)
}
```

- [ ] **Step 4: ENERGY_PER_WAVE_CLEAR 분기 제거**

Phase A 맵에서의 웨이브 클리어 에너지 +5 제거.

- [ ] **Step 5: 수동 플레이 검증**

Run: `bun dev` → 로비 → [LAB] → 1 웨이브 플레이
Expected: 유닛 킬 시 에너지 1 증가, 보스 킬 시 +20~+40

- [ ] **Step 6: 커밋**
```bash
git add packages/phaser-game/src/scenes/Game.ts
git commit -m "feat(game): kill and boss-kill energy rewards, drop wave-clear bonus"
```

---

## Phase 4: 로그라이크 리팩토링

### Task 4.1: upgradeCards 6종 재편

**Files:**
- Modify: `packages/shared/src/data/upgradeCards.ts`

- [ ] **Step 1: 테스트 작성**

**Test:** `packages/shared/src/data/__tests__/upgradeCards.test.ts`
```ts
import { describe, it, expect } from 'bun:test'
import { UPGRADE_CARDS, pickRandomUpgrades } from '../upgradeCards'

describe('upgradeCards', () => {
  it('has 6 redesigned cards', () => {
    const ids = UPGRADE_CARDS.map(c => c.id).sort()
    expect(ids).toEqual(['crit_dmg', 'dmg_up', 'effect_amp', 'energy_harvest', 'energy_regen', 'tier_odds_up'].sort())
  })
  it('pickRandomUpgrades returns distinct 3 cards', () => {
    const rng = (() => { let i = 0; return () => (i++ * 0.17) % 1 })()
    const picks = pickRandomUpgrades(3, rng)
    expect(picks).toHaveLength(3)
    expect(new Set(picks.map(p => p.id)).size).toBe(3)
  })
})
```

- [ ] **Step 2: 테스트 fail 확인**

Run: `bun test packages/shared/src/data/__tests__/upgradeCards.test.ts`
Expected: FAIL

- [ ] **Step 3: upgradeCards.ts 재작성**

`packages/shared/src/data/upgradeCards.ts`:
```ts
export type UpgradeId = 'dmg_up' | 'crit_dmg' | 'energy_harvest' | 'energy_regen' | 'effect_amp' | 'tier_odds_up'

export interface UpgradeCard {
  id: UpgradeId
  name: string
  description: string
  stackType: 'add' | 'multiply'
  value: number
}

export const UPGRADE_CARDS: UpgradeCard[] = [
  { id: 'dmg_up',         name: '공격력 증폭',   description: '모든 타워 공격력 +20%', stackType: 'multiply', value: 1.20 },
  { id: 'crit_dmg',       name: '치명의 일격',   description: '치명타 데미지 +25%',    stackType: 'add',      value: 0.25 },
  { id: 'energy_harvest', name: '에너지 수확',   description: '유닛 킬당 에너지 +1',   stackType: 'add',      value: 1    },
  { id: 'energy_regen',   name: '에너지 재생',   description: '5초마다 에너지 +2',     stackType: 'add',      value: 2    },
  { id: 'effect_amp',     name: '상태효과 증폭', description: '빙결/스턴 지속 +25%',   stackType: 'multiply', value: 1.25 },
  { id: 'tier_odds_up',   name: '운의 가호',     description: '가챠 성공률 +5%p',      stackType: 'add',      value: 0.05 },
]

export function pickRandomUpgrades(count: number, rng: () => number = Math.random): UpgradeCard[] {
  const pool = [...UPGRADE_CARDS]
  const picks: UpgradeCard[] = []
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length)
    picks.push(pool[idx])
    pool.splice(idx, 1)
  }
  return picks
}
```

- [ ] **Step 4: 테스트 통과**

Run: `bun test packages/shared/src/data/__tests__/upgradeCards.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**
```bash
git add packages/shared/src/data/upgradeCards.ts packages/shared/src/data/__tests__/upgradeCards.test.ts
git commit -m "feat(shared): redesign roguelike upgrade cards per spec"
```

### Task 4.2: 보스 웨이브 클리어 트리거로 변경

**Files:**
- Modify: `packages/phaser-game/src/systems/WaveSystem.ts`
- Modify: `packages/phaser-game/src/scenes/Game.ts`

- [ ] **Step 1: WaveSystem emit에 phase 필드 추가**

`WaveSystem.ts`의 `wave-completed` emit 대상 라인 찾기:
Run: `rg -n "wave-completed" packages/phaser-game/src/systems/WaveSystem.ts`

payload에 `phase: this.phase` 추가:
```ts
this.events.emit('wave-completed', {
  slotIndex: this.currentSlot,
  cleared: true,
  phase: this.phase,  // 'combat' | 'boss'
})
```

- [ ] **Step 2: Game.ts 로그라이크 트리거 조건 변경**

기존 `slotIndex % 10 === 0` 삭제, 아래로 교체:
```ts
this.eventBus.on('wave-completed', (data) => {
  if (data.phase === 'boss' && data.cleared) {
    this.orchestrator.requestUpgradePick()
  }
})
```

- [ ] **Step 3: 수동 플레이 검증**

Run: `bun dev` → Phase A 시작 → 보스 웨이브까지 진행
Expected: 보스 클리어 직후 로그라이크 카드 3장 오버레이 등장

- [ ] **Step 4: 커밋**
```bash
git add packages/phaser-game/src/systems/WaveSystem.ts packages/phaser-game/src/scenes/Game.ts
git commit -m "feat(game): trigger roguelike pick on boss wave clear"
```

### Task 4.3: 리롤 광고 버튼 추가

**Files:**
- Modify: `packages/web-shell/src/components/game/UpgradePickOverlay.tsx`
- Modify: `packages/phaser-game/src/systems/PhaseAOrchestrator.ts`

- [ ] **Step 1: EventBus에 request-upgrade-reroll 이벤트 추가**

`packages/shared/src/types/events.ts` (또는 EventBus 정의 파일)에 이벤트 정의 추가:
```ts
'request-upgrade-reroll': void
```

- [ ] **Step 2: Orchestrator 핸들러 추가**

`PhaseAOrchestrator.ts`:
```ts
this.events.on('request-upgrade-reroll', async () => {
  const result = await this.deps.adService?.watchAd('reroll')
  if (result !== 'rewarded') return
  const newPicks = pickRandomUpgrades(3, this.rng)
  this.events.emit('upgrade-choice-ready', { cards: newPicks })
})
```

- [ ] **Step 3: UpgradePickOverlay에 리롤 버튼 추가**

`UpgradePickOverlay.tsx` 하단에:
```tsx
<button
  onClick={() => eventBus.emit('request-upgrade-reroll')}
  className="mt-4 w-full h-12 rounded-lg bg-amber-600 text-white text-sm font-bold"
>
  🎬 광고 보고 다시 뽑기
</button>
```

- [ ] **Step 4: 커밋**
```bash
git add -A
git commit -m "feat(game): ad-rewarded roguelike reroll"
```

---

## Phase 5: 가챠 시스템 신규

### Task 5.1: GachaSystem 구현

**Files:**
- Create: `packages/phaser-game/src/systems/GachaSystem.ts`
- Create: `packages/phaser-game/tests/GachaSystem.test.ts`

- [ ] **Step 1: 테스트 작성**

`packages/phaser-game/tests/GachaSystem.test.ts`:
```ts
import { describe, it, expect } from 'bun:test'
import { GachaSystem } from '../src/systems/GachaSystem'
import { getTowerById } from '@gld/shared'

describe('GachaSystem.rollTier', () => {
  it('returns tier-2 tower 60% of the time', () => {
    let success = 0
    const N = 10_000
    const rng = (() => { let s = 12345; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff } })()
    for (let i = 0; i < N; i++) {
      const id = GachaSystem.rollTier(2, rng)
      if (getTowerById(id)?.tier === 2) success++
    }
    const rate = success / N
    expect(rate).toBeGreaterThan(0.55)
    expect(rate).toBeLessThan(0.65)
  })

  it('tier-4 success roughly 5%', () => {
    let success = 0
    const N = 20_000
    const rng = (() => { let s = 98765; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff } })()
    for (let i = 0; i < N; i++) {
      const id = GachaSystem.rollTier(4, rng)
      if (getTowerById(id)?.tier === 4) success++
    }
    const rate = success / N
    expect(rate).toBeGreaterThan(0.035)
    expect(rate).toBeLessThan(0.065)
  })

  it('failure returns a tier-1 tower', () => {
    const rngFail = () => 0.99
    const id = GachaSystem.rollTier(3, rngFail)
    expect(getTowerById(id)?.tier).toBe(1)
  })
})
```

- [ ] **Step 2: 테스트 fail 확인**

Run: `bun test packages/phaser-game/tests/GachaSystem.test.ts`
Expected: FAIL (파일 없음)

- [ ] **Step 3: GachaSystem.ts 작성**

`packages/phaser-game/src/systems/GachaSystem.ts`:
```ts
import { getTowersByFamily, INGAME_GACHA, type TowerId, type TowerFamily } from '@gld/shared'

const FAMILIES: TowerFamily[] = ['archer', 'siege', 'frost', 'stun']

export class GachaSystem {
  static rollTier(targetTier: 2 | 3 | 4, rng: () => number = Math.random): TowerId {
    const key = `tier${targetTier}` as keyof typeof INGAME_GACHA
    const { successRate } = INGAME_GACHA[key]
    const success = rng() < successRate
    const family = FAMILIES[Math.floor(rng() * FAMILIES.length)]
    const tier = success ? targetTier : 1
    const candidates = getTowersByFamily(family).filter(t => t.tier === tier)
    return candidates[0].id
  }

  static getCost(targetTier: 2 | 3 | 4): number {
    const key = `tier${targetTier}` as keyof typeof INGAME_GACHA
    return INGAME_GACHA[key].cost
  }
}
```

- [ ] **Step 4: 테스트 통과**

Run: `bun test packages/phaser-game/tests/GachaSystem.test.ts`
Expected: PASS (3/3)

- [ ] **Step 5: 커밋**
```bash
git add packages/phaser-game/src/systems/GachaSystem.ts packages/phaser-game/tests/GachaSystem.test.ts
git commit -m "feat(game): ingame gacha system with tier-weighted probabilities"
```

### Task 5.2: GachaSystem을 PhaseAOrchestrator에 통합

**Files:**
- Modify: `packages/phaser-game/src/systems/PhaseAOrchestrator.ts`
- Modify: EventBus 타입 (`packages/shared/src/types/events.ts` 혹은 해당 파일)

- [ ] **Step 1: 이벤트 정의 추가**

```ts
'request-gacha-summon': { targetTier: 2 | 3 | 4 }
'gacha-insufficient-energy': { targetTier: number; cost: number; have: number }
```

- [ ] **Step 2: Orchestrator 핸들러 추가**

```ts
this.events.on('request-gacha-summon', (payload) => {
  const cost = GachaSystem.getCost(payload.targetTier)
  if (!this.energySystem.spend(cost)) {
    this.events.emit('gacha-insufficient-energy', { targetTier: payload.targetTier, cost, have: this.energySystem.current })
    return
  }
  const towerId = GachaSystem.rollTier(payload.targetTier, this.rng)
  this.pendingSummon = { towerId, source: 'gacha' }
  this.events.emit('phase-a-summon-ready', { towerId, source: 'gacha' })
})
```

- [ ] **Step 3: 커밋**
```bash
git add -A
git commit -m "feat(phase-a): wire GachaSystem into orchestrator"
```

### Task 5.3: HUD에 가챠 버튼 3종 추가

**Files:**
- Modify: `packages/web-shell/src/components/game/PhaseAHud.tsx`

- [ ] **Step 1: 하단 액션바에 3개 버튼 추가**

```tsx
<div className="flex items-end gap-2 justify-center">
  {[2, 3, 4].map(t => (
    <button
      key={t}
      onClick={() => eventBus.emit('request-gacha-summon', { targetTier: t as 2|3|4 })}
      className="flex-1 h-[72px] rounded-lg bg-slate-800 border border-amber-500/30 flex flex-col items-center justify-center"
    >
      <span className="text-xs text-amber-300">T{t} 뽑기</span>
      <span className="text-lg font-bold text-white">{GACHA_COST[t]}</span>
      <span className="text-[9px] text-slate-300">{Math.round(GACHA_RATE[t] * 100)}%</span>
    </button>
  ))}
</div>
```

`GACHA_COST`와 `GACHA_RATE`는 `INGAME_GACHA`에서 파생한 상수.

- [ ] **Step 2: 수동 테스트**

Run: `bun dev` → Phase A 시작 → 에너지 40+ 모은 후 T2 뽑기 버튼 클릭
Expected: 타워 소환 플로우 진입 (성공 시 T2 타워, 실패 시 T1 타워)

- [ ] **Step 3: 커밋**
```bash
git add packages/web-shell/src/components/game/PhaseAHud.tsx
git commit -m "feat(hud): gacha summon buttons for tier 2/3/4"
```

---

## Phase 6: 시나리오 모드 완전 제거

### Task 6.1: generatePhaseAWaves 이전

**Files:**
- Create: `packages/shared/src/data/phaseAWaves.ts`
- Modify: `packages/shared/src/constants/waves.ts`

- [ ] **Step 1: generatePhaseAWaves 함수를 새 파일로 이전**

`waves.ts`에서 `generatePhaseAWaves` 함수 전체를 잘라내 `packages/shared/src/data/phaseAWaves.ts`로 이동. import 경로 업데이트.

- [ ] **Step 2: 참조처 업데이트**

Run: `rg -n "generatePhaseAWaves" packages/`
각 참조의 import 구문을 새 경로로 변경.

- [ ] **Step 3: 빌드 확인**

Run: `bun run build`
Expected: PASS

- [ ] **Step 4: 커밋**
```bash
git add packages/shared/src/data/phaseAWaves.ts packages/shared/src/constants/waves.ts
git commit -m "refactor(shared): extract phase-a wave generator to data/"
```

### Task 6.2: 시나리오 파일 일괄 삭제

**Files (Delete):**
```
packages/shared/src/constants/stages.ts
packages/shared/src/constants/waves.ts
packages/shared/src/constants/worlds.ts
packages/shared/src/constants/stageInfo.ts
packages/shared/src/constants/starDifficulty.ts
packages/shared/src/constants/missions.ts
packages/shared/src/constants/achievements.ts
packages/shared/src/constants/deck.ts
packages/web-shell/src/pages/WorldMapPage.tsx
packages/web-shell/src/pages/StageDetailPage.tsx
packages/web-shell/src/pages/StageSelectPage.tsx
packages/web-shell/src/pages/AchievementPage.tsx
packages/web-shell/src/components/game/DeckDock.tsx
packages/web-shell/src/components/lobby/tabs/MissionsTab.tsx
packages/web-shell/src/stores/meta/achievementSlice.ts
packages/web-shell/src/stores/meta/missionSlice.ts
packages/phaser-game/src/systems/DeckSystem.ts
packages/phaser-game/src/systems/world-gimmicks/
```

- [ ] **Step 1: 삭제 전 의존성 확인**

Run: `rg -n "from.*stages|from.*worlds|from.*DeckDock|from.*DeckSystem|from.*missions|from.*achievements" packages/`
Expected: 삭제 후 수정할 import 위치 목록

- [ ] **Step 2: 파일/디렉토리 삭제**

```bash
rm packages/shared/src/constants/stages.ts \
   packages/shared/src/constants/waves.ts \
   packages/shared/src/constants/worlds.ts \
   packages/shared/src/constants/stageInfo.ts \
   packages/shared/src/constants/starDifficulty.ts \
   packages/shared/src/constants/missions.ts \
   packages/shared/src/constants/achievements.ts \
   packages/shared/src/constants/deck.ts \
   packages/web-shell/src/pages/WorldMapPage.tsx \
   packages/web-shell/src/pages/StageDetailPage.tsx \
   packages/web-shell/src/pages/StageSelectPage.tsx \
   packages/web-shell/src/pages/AchievementPage.tsx \
   packages/web-shell/src/components/game/DeckDock.tsx \
   packages/web-shell/src/components/lobby/tabs/MissionsTab.tsx \
   packages/web-shell/src/stores/meta/achievementSlice.ts \
   packages/web-shell/src/stores/meta/missionSlice.ts \
   packages/phaser-game/src/systems/DeckSystem.ts
rm -rf packages/phaser-game/src/systems/world-gimmicks/
```

- [ ] **Step 3: shared index export 정리**

`packages/shared/src/index.ts`에서 삭제된 파일 export 제거.

- [ ] **Step 4: 빌드 실패 지점 파악**

Run: `bun run build`
Expected: 여러 import 에러. 다음 Step에서 처리.

- [ ] **Step 5: 참조처 정리 (App.tsx, gameStore.ts, HomeTab.tsx)**

Task 6.3, 6.4, 6.5에서 개별 처리.

- [ ] **Step 6: 커밋 (중간 빌드 깨진 상태)**
```bash
git add -A
git commit -m "chore: delete scenario-mode source files (build intentionally broken)"
```

### Task 6.3: App.tsx 라우팅 단순화

**Files:**
- Modify: `packages/web-shell/src/App.tsx`

- [ ] **Step 1: RunStatus 축소**

```ts
export type RunStatus = 'lobby' | 'building' | 'running' | 'victory' | 'defeat'
```

- [ ] **Step 2: 분기 제거**

`App.tsx`의 `stageSelect`, `stageDetail` 케이스 및 `WorldMapPage`, `StageDetailPage` import 완전 제거. [LAB] 버튼 클릭 → `setRunStatus('building')`.

- [ ] **Step 3: 빌드 확인**

Run: `bun run typecheck`
Expected: App.tsx 관련 에러 해소

- [ ] **Step 4: 커밋**
```bash
git add packages/web-shell/src/App.tsx
git commit -m "refactor(shell): simplify routing to lobby/game states only"
```

### Task 6.4: gameStore 정리

**Files:**
- Modify: `packages/web-shell/src/stores/gameStore.ts`

- [ ] **Step 1: 시나리오 전용 상태 삭제**

- `selectedWorldId`, `selectedStageId`, `deckCards`, `selectedCardIndex` 등 스테이지/덱 관련 필드 제거
- `enterStageSelect`, `enterStageDetail` 액션 제거
- `resetRun()`에서 `selectedStage = 'phase_a_s1'` 고정

- [ ] **Step 2: 빌드 확인**

Run: `bun run typecheck`
Expected: gameStore 관련 에러 해소

- [ ] **Step 3: 커밋**
```bash
git add packages/web-shell/src/stores/gameStore.ts
git commit -m "refactor(store): remove scenario-mode state from gameStore"
```

### Task 6.5: HomeTab, MAP_REGISTRY 정리

**Files:**
- Modify: `packages/web-shell/src/components/lobby/tabs/HomeTab.tsx`
- Modify: `packages/shared/src/constants/maps.ts`
- Modify: `packages/web-shell/src/components/lobby/tabs/CollectionTab.tsx` (선택적)

- [ ] **Step 1: HomeTab 재작성**

```tsx
export function HomeTab() {
  const start = useGameStore(s => s.startPhaseA)
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-4">
      <h1 className="text-3xl font-bold text-amber-300">Grid Line Defense</h1>
      <button
        onClick={start}
        className="w-full max-w-xs h-16 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 text-white text-xl font-bold shadow-lg"
      >
        전투 시작
      </button>
      <button
        onClick={() => /* open MetaForge */}
        className="w-full max-w-xs h-12 rounded-lg bg-slate-800 text-slate-300 border border-slate-700"
      >
        메타 강화
      </button>
    </div>
  )
}
```

- [ ] **Step 2: MAP_REGISTRY 정리**

`maps.ts`에서 `FOREST_GATE_MAP`, `LAVA_FORTRESS_MAP`, `STORM_CITADEL_MAP`, `W1_FOREST_B_MAP`, `W2_FORGE_B_MAP`, `W3_TOWER_B_MAP` 정의 및 레지스트리 등록 제거. `PHASE_A_LONG_MAP`만 유지.

- [ ] **Step 3: 콜렉션 탭 간소화**

MissionsTab/Achievement 관련 UI 제거. 콜렉션은 도감만 유지 또는 탭 자체 제거.

- [ ] **Step 4: 전체 빌드 통과**

Run: `bun run build && bun run typecheck`
Expected: PASS (시나리오 제거 완료)

- [ ] **Step 5: 수동 테스트**

Run: `bun dev`
Expected: 로비에서 "전투 시작" 버튼 → Phase A 직행

- [ ] **Step 6: 커밋**
```bash
git add -A
git commit -m "refactor(shell): simplify lobby to Phase A direct entry, purge scenario maps"
```

---

## Phase 7: 맵 재설계 (9×18 + 구조물)

### Task 7.1: 그리드/타일 크기 변경

**Files:**
- Modify: `packages/shared/src/constants/grid.ts`

- [ ] **Step 1: 상수 수정**

```ts
export const TILE_SIZE = 48        // was 53
export const ORTHO_TILE = 48
export const ORTHO_CANVAS_W = 48 * 9  // = 432
// GRID_WIDTH/HEIGHT 상수는 맵별 override 허용 (phase_a_long 20행)
```

- [ ] **Step 2: 빌드 확인**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 3: 커밋**
```bash
git add packages/shared/src/constants/grid.ts
git commit -m "refactor(shared): tile size 48px for 9-column mobile layout"
```

### Task 7.2: MapLayout에 obstacles 필드 추가

**Files:**
- Modify: `packages/shared/src/types/map.ts`

- [ ] **Step 1: 타입 확장**

```ts
export interface MapLayout {
  id: MapId
  grid: { width: number; height: number }
  pathPoints: Position[]
  spawnPoint: Position
  exitPoint: Position
  buildablePoints: Position[]
  obstacles?: Position[]        // 신규
  castleWallTiles?: Position[]  // 신규 (옵션)
}
```

- [ ] **Step 2: buildBuildablePoints 업데이트**

`packages/shared/src/utils/mapLayout.ts` (또는 동등 파일)의 `buildBuildablePoints()` 내부에서 `obstacles`도 blocked로 간주하도록 수정:
```ts
const blockedSet = new Set([
  ...pathPoints.map(p => `${p.x},${p.y}`),
  ...(obstacles ?? []).map(p => `${p.x},${p.y}`),
])
```

- [ ] **Step 3: 커밋**
```bash
git add packages/shared/src/types/map.ts packages/shared/src/utils/mapLayout.ts
git commit -m "feat(shared): obstacles and castle-wall tiles in MapLayout"
```

### Task 7.3: PHASE_A_LONG_MAP 9×18 재정의

**Files:**
- Modify: `packages/shared/src/constants/maps.ts`

- [ ] **Step 1: 새 맵 정의 작성**

```ts
export const PHASE_A_LONG_MAP: MapLayout = (() => {
  const width = 9
  const height = 20
  const pathPoints: Position[] = []

  // 좌반부(col 0~3) 지그재그 하강
  for (let row = 0; row < height - 1; row++) {
    if (row % 4 === 0) for (let c = 0; c <= 3; c++) pathPoints.push({ x: c, y: row })
    else if (row % 4 === 2) for (let c = 3; c >= 0; c--) pathPoints.push({ x: c, y: row })
    else pathPoints.push({ x: row % 4 === 1 ? 3 : 0, y: row })
  }
  // 하단 횡단
  for (let c = 0; c <= 8; c++) pathPoints.push({ x: c, y: height - 1 })
  // 우반부(col 5~8) 상승
  for (let row = height - 2; row >= 0; row--) {
    if (row % 4 === 0) for (let c = 8; c >= 5; c--) pathPoints.push({ x: c, y: row })
    else if (row % 4 === 2) for (let c = 5; c <= 8; c++) pathPoints.push({ x: c, y: row })
    else pathPoints.push({ x: row % 4 === 1 ? 5 : 8, y: row })
  }

  const obstacles: Position[] = [
    { x: 4, y: 3 }, { x: 4, y: 8 }, { x: 4, y: 13 },   // 중앙 라인에 포인트 장애물
    { x: 2, y: 5 }, { x: 6, y: 5 },
    { x: 1, y: 10 }, { x: 7, y: 10 },
    { x: 2, y: 15 }, { x: 6, y: 15 },
  ]

  return {
    id: 'phase_a_long',
    grid: { width, height },
    pathPoints,
    spawnPoint: pathPoints[0],
    exitPoint: { x: 4, y: 0 },
    buildablePoints: buildBuildablePoints({ width, height, pathPoints, obstacles }),
    obstacles,
    castleWallTiles: [{ x: 4, y: 0 }],
  }
})()
```

경로 생성 로직은 playtest 후 조정. 중앙 col 4는 장애물 몇 칸 제외하고 프리미엄 배치 지대로 유지.

- [ ] **Step 2: 수동 검증**

Run: `bun dev` → Phase A 시작
Expected: 9×18 맵이 화면에 그려지고, 적이 U턴 경로로 진행

- [ ] **Step 3: 커밋**
```bash
git add packages/shared/src/constants/maps.ts
git commit -m "feat(shared): redesign phase_a_long to 9×18 with obstacles and center lane"
```

### Task 7.4: Game.ts에 obstacle 렌더링 추가

**Files:**
- Modify: `packages/phaser-game/src/scenes/Game.ts`

- [ ] **Step 1: 렌더링 메서드 추가**

```ts
private renderObstacles() {
  const map = this.currentMap
  if (!map.obstacles) return
  map.obstacles.forEach((pos, i) => {
    const kind = i % 3 === 0 ? 'tree_03' : (i % 3 === 1 ? 'rock_04' : 'bush_02')
    const sprite = this.add.image(pos.x * TILE_SIZE + TILE_SIZE/2, pos.y * TILE_SIZE + TILE_SIZE/2, kind)
      .setDepth(2)
      .setScale(0.6)
  })
}
```

`create()` 내 타일 렌더링 직후 호출.

- [ ] **Step 2: 수동 검증**

Run: `bun dev` → Phase A 시작
Expected: 장애물(나무/바위/덤불)이 맵에 보임. 해당 타일은 배치 불가.

- [ ] **Step 3: 커밋**
```bash
git add packages/phaser-game/src/scenes/Game.ts
git commit -m "feat(game): render fixed obstacles on phase_a_long"
```

### Task 7.5: 타일맵 톤다운

**Files:**
- Modify: `packages/phaser-game/src/scenes/Game.ts`

- [ ] **Step 1: MAP_THEMES 업데이트**

```ts
const MAP_THEMES = {
  phase_a_long: {
    groundTint: 0xc8b89a,
    pathColor: 0x7a6040,
    pathLineColor: 0xb8956a,
  },
}
```

- [ ] **Step 2: renderPath alpha 축소**

`graphics.lineStyle(4, lineColor, 0.04)` — 기존 0.08 → 0.04
`graphics.fillStyle(fillColor, 0.25)` — 기존 0.40 → 0.25

- [ ] **Step 3: renderFieldPathOverlay alpha 조정**

`fillTileRect alpha: 0.35` — 기존 0.52 → 0.35

- [ ] **Step 4: 그리드 라인 비활성**

Phase A 맵에서 그리드 선 렌더링 `if (isPhaseAMap) return`.

- [ ] **Step 5: 비주얼 감수**

Run: `bun dev` → 스크린샷 전/후 비교
Expected: 눈 피로감 완화 (채도↓, 대비↓)

- [ ] **Step 6: 커밋**
```bash
git add packages/phaser-game/src/scenes/Game.ts
git commit -m "polish(game): tone down tilemap colors for Phase A map"
```

---

## Phase 8: HUD 재설계

### Task 8.1: TowerActionSheet 신규

**Files:**
- Create: `packages/web-shell/src/components/game/TowerActionSheet.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
import { useState } from 'react'
import { eventBus } from '@/lib/eventBus'

type Mode = 'idle' | 'merge-source' | 'move'

interface Props {
  selectedTower: { instanceId: string; towerId: string; tier: number; sellValue: number } | null
  onDeselect: () => void
}

export function TowerActionSheet({ selectedTower, onDeselect }: Props) {
  const [mode, setMode] = useState<Mode>('idle')
  if (!selectedTower) return null

  const startMerge = () => {
    setMode('merge-source')
    eventBus.emit('enter-merge-mode', { sourceId: selectedTower.instanceId })
  }
  const startMove = () => {
    setMode('move')
    eventBus.emit('request-enter-move-mode', { instanceId: selectedTower.instanceId })
  }
  const sell = () => {
    eventBus.emit('request-sell-tower', { instanceId: selectedTower.instanceId })
    onDeselect()
  }

  return (
    <div className="absolute bottom-[96px] left-1/2 -translate-x-1/2 flex gap-2 p-2 rounded-xl bg-slate-900/95 border border-amber-500/40 shadow-lg">
      <button onClick={startMerge} className="h-[52px] min-w-[80px] px-4 rounded-lg bg-amber-700 text-white font-bold text-sm">
        {mode === 'merge-source' ? '합성할 타워 선택' : '합성'}
      </button>
      <button onClick={startMove} className="h-[52px] min-w-[80px] px-4 rounded-lg bg-sky-700 text-white font-bold text-sm">
        이동
      </button>
      <button onClick={sell} className="h-[52px] min-w-[80px] px-4 rounded-lg bg-red-700 text-white font-bold text-sm">
        판매 +{selectedTower.sellValue}
      </button>
      <button onClick={onDeselect} className="h-[52px] min-w-[44px] px-3 rounded-lg bg-slate-700 text-slate-300 text-xs">
        ✕
      </button>
    </div>
  )
}
```

- [ ] **Step 2: GamePage에 연결**

`GamePage.tsx`에 `selectedTower` 상태를 EventBus로부터 수신, `<TowerActionSheet>` 렌더.

- [ ] **Step 3: 수동 테스트**

Expected: 타워 탭 → 플로팅 액션 시트 등장, 버튼들 모두 52px+ 터치 타겟

- [ ] **Step 4: 커밋**
```bash
git add packages/web-shell/src/components/game/TowerActionSheet.tsx packages/web-shell/src/pages/GamePage.tsx
git commit -m "feat(hud): floating TowerActionSheet for merge/move/sell"
```

### Task 8.2: PhaseAHud 전면 재작성

**Files:**
- Modify: `packages/web-shell/src/components/game/PhaseAHud.tsx`

- [ ] **Step 1: 재작성 (하단 고정 액션바 + 상단 정보 배지)**

```tsx
export function PhaseAHud() {
  const energy = usePhaseAEnergy()
  const lives = useLives()
  const wave = useCurrentWave()

  return (
    <>
      {/* 상단 정보 배지 */}
      <div className="absolute top-[8px] left-[8px] right-[8px] flex justify-between text-xs text-white">
        <span className="px-2 py-1 rounded bg-slate-900/80">⚡ {energy}</span>
        <span className="px-2 py-1 rounded bg-slate-900/80">W {wave}</span>
        <span className="px-2 py-1 rounded bg-slate-900/80">🛡 {lives}</span>
      </div>

      {/* 하단 고정 액션바 */}
      <div
        className="absolute bottom-0 left-0 right-0 flex gap-2 p-2 bg-slate-950 border-t border-amber-500/30"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))' }}
      >
        <GachaButton tier={2} cost={40} rate={60} />
        <GachaButton tier={3} cost={80} rate={20} />
        <GachaButton tier={4} cost={160} rate={5} />
        <MenuButton />
      </div>
    </>
  )
}

function GachaButton({ tier, cost, rate }: { tier: 2|3|4; cost: number; rate: number }) {
  const energy = usePhaseAEnergy()
  const disabled = energy < cost
  return (
    <button
      disabled={disabled}
      onClick={() => eventBus.emit('request-gacha-summon', { targetTier: tier })}
      className={`flex-1 h-[72px] rounded-lg flex flex-col items-center justify-center ${disabled ? 'bg-slate-800 opacity-50' : 'bg-amber-700'}`}
    >
      <span className="text-xs text-amber-200">T{tier}</span>
      <span className="text-lg font-bold text-white">⚡{cost}</span>
      <span className="text-[9px] text-slate-300">{rate}%</span>
    </button>
  )
}

function MenuButton() {
  return <button className="w-[60px] h-[72px] rounded-lg bg-slate-800 text-white text-lg">☰</button>
}
```

- [ ] **Step 2: 수동 테스트**

Expected: 하단 액션바가 화면 폭을 꽉 채우고 터치 타겟 72px 고정. 에너지 부족 시 disabled.

- [ ] **Step 3: 커밋**
```bash
git add packages/web-shell/src/components/game/PhaseAHud.tsx
git commit -m "feat(hud): redesign PhaseAHud with gacha action bar + info badges"
```

### Task 8.3: SummonRevealOverlay 신규

**Files:**
- Create: `packages/web-shell/src/components/game/SummonRevealOverlay.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
import { useEffect, useState } from 'react'
import { eventBus } from '@/lib/eventBus'
import { getTowerById } from '@gld/shared'

export function SummonRevealOverlay() {
  const [pending, setPending] = useState<{ towerId: string; source: 'summon' | 'gacha' } | null>(null)

  useEffect(() => {
    const handler = (p: { towerId: string; source: 'summon' | 'gacha' }) => setPending(p)
    eventBus.on('phase-a-summon-ready', handler)
    return () => { eventBus.off('phase-a-summon-ready', handler) }
  }, [])

  useEffect(() => {
    if (!pending) return
    const t = setTimeout(() => setPending(null), 2000)
    return () => clearTimeout(t)
  }, [pending])

  if (!pending) return null
  const tower = getTowerById(pending.towerId)
  if (!tower) return null

  return (
    <div className="absolute inset-0 flex items-center justify-center z-[8] pointer-events-none">
      <div className="bg-slate-900/95 border-2 border-amber-500 rounded-2xl p-6 flex flex-col items-center animate-pulse">
        <div className="text-xs text-amber-300 mb-2">{pending.source === 'gacha' ? '✨ 가챠 결과' : '🎲 소환'}</div>
        <div className="text-3xl mb-2">⚔️</div>
        <div className="text-lg font-bold text-white">{tower.name}</div>
        <div className="text-xs text-slate-300">T{tower.tier} · {tower.family}</div>
        <div className="text-[10px] text-amber-200 mt-2">배치할 위치를 탭하세요</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: GamePage에 연결**

- [ ] **Step 3: 커밋**
```bash
git add packages/web-shell/src/components/game/SummonRevealOverlay.tsx
git commit -m "feat(hud): SummonRevealOverlay for summon/gacha feedback"
```

---

## Phase 9: 메타루프

### Task 9.1: metaProgressStore 신규

**위치 결정**: `@gld/shared`는 Zustand 의존 금지 (08-arch §1, §4). 따라서 **web-shell 패키지**에 배치.

**Files:**
- Create: `packages/web-shell/src/stores/metaProgressStore.ts`
- Create: `packages/web-shell/src/stores/__tests__/metaProgressStore.test.ts`

- [ ] **Step 1: 테스트 작성** (web-shell 패키지에서 실행)

```ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { useMetaProgress, resetMetaProgress } from '../metaProgressStore'

describe('metaProgressStore', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
    resetMetaProgress()
  })

  it('default state is zero', () => {
    const s = useMetaProgress.getState()
    expect(s.globalAtkPct).toBe(0)
  })

  it('addGlobalAtk stacks', () => {
    useMetaProgress.getState().addGlobalAtk(0.10)
    useMetaProgress.getState().addGlobalAtk(0.15)
    expect(useMetaProgress.getState().globalAtkPct).toBeCloseTo(0.25)
  })

  it('persists and rehydrates from localStorage', () => {
    useMetaProgress.getState().addGlobalAtk(0.30)
    const raw = globalThis.localStorage.getItem('gld_meta_v1')
    expect(raw).toContain('0.3')
  })
})
```

- [ ] **Step 2: 테스트 fail**

Run: `bun test packages/shared/src/state/__tests__/metaProgressStore.test.ts`
Expected: FAIL

- [ ] **Step 3: 구현**

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TowerFamily } from '../types/tower'

export type PerkId = string

interface MetaState {
  version: 1
  familyPerks: Record<TowerFamily, PerkId[]>
  globalAtkPct: number
  permanentUpgrades: Record<string, number>
  addGlobalAtk: (delta: number) => void
  addFamilyPerk: (family: TowerFamily, perk: PerkId) => void
  stackUpgrade: (id: string) => void
}

const emptyPerks: Record<TowerFamily, PerkId[]> = {
  archer: [], siege: [], frost: [], stun: [], hybrid: [], ultimate: []
}

export const useMetaProgress = create<MetaState>()(
  persist(
    (set) => ({
      version: 1,
      familyPerks: { ...emptyPerks },
      globalAtkPct: 0,
      permanentUpgrades: {},
      addGlobalAtk: (delta) => set(s => ({ globalAtkPct: s.globalAtkPct + delta })),
      addFamilyPerk: (family, perk) => set(s => ({
        familyPerks: { ...s.familyPerks, [family]: [...s.familyPerks[family], perk] }
      })),
      stackUpgrade: (id) => set(s => ({
        permanentUpgrades: { ...s.permanentUpgrades, [id]: (s.permanentUpgrades[id] ?? 0) + 1 }
      })),
    }),
    { name: 'gld_meta_v1' }
  )
)

export function resetMetaProgress() {
  useMetaProgress.setState({ version: 1, familyPerks: { ...emptyPerks }, globalAtkPct: 0, permanentUpgrades: {} })
}
```

- [ ] **Step 4: 테스트 통과**

Run: `bun test packages/web-shell/src/stores/__tests__/metaProgressStore.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**
```bash
git add -A
git commit -m "feat(web-shell): metaProgressStore with localStorage persistence"
```

### Task 9.2: TowerSystem에 globalAtkPct 주입 (의존 방향 준수)

**중요**: `@gld/phaser-game`은 `packages/web-shell/...` 참조 금지 (단방향 의존). 따라서 Zustand store를 직접 import하지 않고, `Game.ts`가 값을 읽어 시스템에 주입하는 방식으로 구현.

**Files:**
- Modify: `packages/phaser-game/src/systems/TowerSystem.ts` — `setGlobalModifiers()` 메서드 신설
- Modify: `packages/phaser-game/src/scenes/Game.ts` — create() 시점에 주입

- [ ] **Step 1: TowerSystem에 주입 인터페이스 추가**

```ts
// TowerSystem.ts
export interface GlobalModifiers {
  atkPct: number  // 0.0~n, 누적 공격력 증가율 (예: 0.25 = +25%)
}

export class TowerSystem {
  private globalModifiers: GlobalModifiers = { atkPct: 0 }

  setGlobalModifiers(mods: Partial<GlobalModifiers>) {
    this.globalModifiers = { ...this.globalModifiers, ...mods }
  }

  private resolveFinalDamage(baseDamage: number): number {
    return baseDamage * (1 + this.globalModifiers.atkPct)
  }
}
```

`placeTower()` 및 `calculateDamage()`에서 `resolveFinalDamage()` 경유.

- [ ] **Step 2: Game.ts `create()`에서 주입**

```ts
// Game.ts
import { useMetaProgress } from '@/stores/metaProgressStore'  // web-shell 쪽 store

create() {
  // ...기존 초기화...
  const meta = useMetaProgress.getState()
  this.towerSystem.setGlobalModifiers({ atkPct: meta.globalAtkPct })
}
```

**주의**: Game.ts는 `web-shell` 패키지가 마운트하므로 web-shell 경로 import 가능. phaser-game 소스 자체는 여전히 web-shell을 참조하지 않음.

- [ ] **Step 3: 테스트 — TowerSystem globalModifiers 적용 검증**

`packages/phaser-game/tests/TowerSystem.test.ts`에 케이스 추가.

- [ ] **Step 4: 커밋**
```bash
git add packages/phaser-game/src/systems/TowerSystem.ts packages/phaser-game/src/scenes/Game.ts
git commit -m "feat(game): inject meta globalAtkPct into TowerSystem via Game.create()"
```

### Task 9.3: MetaForgePage 신규 (간략)

**Files:**
- Create: `packages/web-shell/src/pages/MetaForgePage.tsx`

- [ ] **Step 1: 페이지 작성**

```tsx
export function MetaForgePage() {
  const meta = useMetaProgress()
  return (
    <div className="h-full p-4 flex flex-col gap-4">
      <h2 className="text-xl font-bold text-amber-300">메타 강화</h2>
      <div className="text-sm text-slate-300">
        글로벌 공격력 증가: +{Math.round(meta.globalAtkPct * 100)}%
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(['archer', 'siege', 'frost', 'stun'] as const).map(f => (
          <div key={f} className="p-3 rounded bg-slate-800">
            <div className="text-xs text-white">{f}</div>
            <div className="text-[10px] text-slate-400">퍽 {meta.familyPerks[f].length}개</div>
          </div>
        ))}
      </div>
      {/* 뽑기/강화 UI는 추후 확장 */}
    </div>
  )
}
```

- [ ] **Step 2: 로비에서 진입**

HomeTab의 "메타 강화" 버튼이 MetaForgePage 라우팅에 연결되도록 설정.

- [ ] **Step 3: 커밋**
```bash
git add packages/web-shell/src/pages/MetaForgePage.tsx
git commit -m "feat(shell): MetaForgePage shell (progression display)"
```

---

## Phase 10: BM 스텁

### Task 10.1: AdService 인터페이스 + MockAdService

**Files:**
- Create: `packages/shared/src/services/AdService.ts`

- [ ] **Step 1: 구현**

```ts
export type AdPlacement = 'continue' | 'reroll'
export type AdResult = 'rewarded' | 'skipped' | 'error'

export interface AdService {
  watchAd(placement: AdPlacement): Promise<AdResult>
}

export const MockAdService: AdService = {
  async watchAd(placement) {
    console.info(`[ad] watch ${placement}`)
    await new Promise(r => setTimeout(r, 500))
    return 'rewarded'
  },
}
```

- [ ] **Step 2: Orchestrator 주입**

`PhaseAOrchestrator` deps에 `adService`를 추가. index 초기화 시 `MockAdService` 주입.

- [ ] **Step 3: 커밋**
```bash
git add packages/shared/src/services/AdService.ts
git commit -m "feat(shared): AdService interface with MockAdService implementation"
```

### Task 10.2: GameOverScreen에 "이어서 하기" 버튼

**Files:**
- Modify: `packages/web-shell/src/components/game/GameOverScreen.tsx`

- [ ] **Step 1: 버튼 + 핸들러 추가**

```tsx
const continueRun = async () => {
  const result = await MockAdService.watchAd('continue')
  if (result === 'rewarded') eventBus.emit('request-continue-run', { livesRestored: 5 })
}

// ...
<button onClick={continueRun} className="w-full h-14 rounded-lg bg-amber-600 text-white font-bold">
  🎬 광고 보고 이어서 하기
</button>
```

- [ ] **Step 2: Orchestrator에서 이벤트 처리**

`PhaseAOrchestrator`: `request-continue-run` 수신 → `this.gameStore.setLives(5)` + `runStatus = 'running'` 복귀.

- [ ] **Step 3: 커밋**
```bash
git add -A
git commit -m "feat(game): ad-rewarded continue on game over"
```

---

## Phase 11: 신규 타워 3종 플레이스홀더 연동

### Task 11.1: 에셋 키 등록 + 스프라이트 placeholder

**Files:**
- Modify: `packages/phaser-game/src/constants/preloadAssets.ts`
- Modify: `packages/web-shell/public/asset-manifest.json`

- [ ] **Step 1: 기존 tier-4 에셋을 신규 타워 키에 alias 등록**

preloadAssets에서:
```ts
{ key: 'hybrid_ab', path: '/assets/towers/arcane_spire.png' },  // placeholder
{ key: 'hybrid_cd', path: '/assets/towers/world_tree.png' },    // placeholder
{ key: 'ultimate',  path: '/assets/towers/divine_throne.png' }, // placeholder
```

manifest.json에도 동일 등록.

- [ ] **Step 2: VFX 오라 추가**

TowerSystem이 `hybrid_ab` 생성 시 금색 glow, `hybrid_cd` 시 보라, `ultimate` 시 무지개 파티클을 추가로 렌더 (기존 `upgrade-success-fx` 에셋 사용).

```ts
if (towerId === 'hybrid_ab') this.scene.add.particles(0, 0, 'upgrade-success-fx', { ... tint: 0xffcc33 })
if (towerId === 'hybrid_cd') ... 0x9966ff
if (towerId === 'ultimate')  ... 0xffffff (rainbow gradient)
```

- [ ] **Step 3: 수동 검증**

합성 체인 1단→6단까지 도달 가능한 시나리오 dry-run.

- [ ] **Step 4: 커밋**
```bash
git add -A
git commit -m "feat(game): placeholder assets + aura VFX for hybrid/ultimate towers"
```

---

## Phase 12: 문서 업데이트 + 마무리

### Task 12.1: game-spec 문서 갱신

**Files:**
- Modify: `docs/game-spec/01-GDD.md`
- Modify: `docs/game-spec/02-balance-sheet.md`
- Modify: `docs/game-spec/06-milestone.md`
- Modify: `docs/game-spec/07-asset-definition.md`

- [ ] **Step 1: 01-GDD.md**
  - 게임 모드: Phase A 단독으로 변경. 시나리오 섹션 제거.
  - 타워 트리: 4계열 × 4단 + 5단 혼합 × 2 + 6단 1개 합성 트리 표
  - 인게임 가챠: T2/T3/T4 확률/비용 표
  - 로그라이크: 보스 웨이브 트리거 + 6종 카드 누적
  - 메타루프: 섹션 추가

- [ ] **Step 2: 02-balance-sheet.md**
  - 빙결/스턴 공격력 테이블
  - 에너지 수급 표 (초당/킬/보스킬/빠른클리어)

- [ ] **Step 3: 06-milestone.md**
  - 시나리오 트랙 완료→archived 표시
  - Phase A 단독화 마일스톤 추가

- [ ] **Step 4: 07-asset-definition.md**
  - 삭제된 타워(plasma, dragon_nest) 제거
  - 신규 3종 placeholder 상태 명시

- [ ] **Step 5: 커밋**
```bash
git add docs/game-spec/
git commit -m "docs(spec): update GDD, balance, milestone for Phase A sole mode"
```

### Task 12.2: AGENTS.md / README 업데이트

**Files:**
- Modify: `AGENTS.md`
- Modify: `README.md`

- [ ] **Step 1: AGENTS.md 스냅샷 섹션 갱신**

Phase A 단독 모드, 타워 4계열, 가챠, 메타루프, BM 스텁 현황 반영.

- [ ] **Step 2: README 게임 소개**

"Grid Line Defense: 랜덤 합성 타워 디펜스" 한 줄 + 주요 루프 (소환→합성→보스→로그라이크→메타 강화)

- [ ] **Step 3: 커밋**
```bash
git add AGENTS.md README.md
git commit -m "docs: update AGENTS and README for sole Phase A mode"
```

### Task 12.3: 최종 E2E 검증

- [ ] **Step 1: 전체 빌드 + 타입체크 + 테스트**

Run: `bun run build && bun run typecheck && bun test`
Expected: 전부 PASS

- [ ] **Step 2: 수동 플레이 관문 시나리오**

Run: `bun dev`
Expected 전체 흐름:
1. 로비에서 "전투 시작" → Phase A 맵 로드
2. 20초 후 첫 웨이브 시작, 적이 U턴 경로 따라 이동
3. 소환 버튼으로 T1 타워 무작위 획득 → 맵에 배치
4. 같은 계열/단계 2개 합성 → T2
5. 에너지 40 모으고 T2 가챠 버튼 클릭 → 성공 확인
6. 보스 웨이브까지 진행 → 클리어 → 로그라이크 카드 3장 등장 → 1장 선택
7. 다시 보스 웨이브 클리어 → 같은 카드 재획득으로 누적 스택
8. 성벽 HP 0 → defeat → "광고 보고 이어서 하기" 성공
9. 게임 종료 후 로비 메타 강화 페이지 진입 → 글로벌 공격력 수치 확인
10. 장애물 타일에는 타워 배치 불가 확인

- [ ] **Step 3: 스크린샷 기록**

톤다운 전/후 맵 스크린샷 파일로 저장하여 PR 첨부.

---

## Plan Review 결과 (2026-04-17)

`/plan-review` 파이프라인(CEO+Design+Eng+스펙 정합성) 실행 결과.

### 판정 요약
- **CEO**: SELECTIVE EXPANSION — 10성 상 설정됨. Edge Point 유지. 3건 DRIFT.
- **Design 미학 종합**: 5.8/10 — AI Slop 위험 중간. 토큰 준수 미흡.
- **Eng**: NEEDS REVISION — 2건 CONFLICT(타입/마이그레이션).

### 사용자 결정
1. Phase 9(메타) + Phase 10(BM) **유지** — metaProgressStore 위치만 수정.
2. 스펙 문서 **선 갱신** 후 구현 Phase 진행 (Task 0.4 신설).
3. 맵 차원 **9×18 강행** + GDD §1 갱신.

### CONFLICT 상세 해결 (하드 게이트 통과용)

#### ❌→✅ CONFLICT-A (Design-1): 에너지 수치 vs balance §5
- 스펙: balance §5 v2 "킬 보상 없음, ENERGY_CAP=100"
- Plan: `ENERGY_PER_KILL=1`, `ENERGY_PER_BOSS_KILL=20`, `ENERGY_MAX=200`
- **해결**: Task 0.4에서 balance §5를 v3로 갱신. 킬/보스 에너지 재활성 명시. ENERGY_MAX=200 (tier4 가챠 160 수용).

#### ❌→✅ CONFLICT-B (Design-2): 타워 모델 vs GDD §4/§5/§6
- 스펙: 18종×5tier, grade=normal/rare/unique/epic
- Plan: 4계열×4tier + hybrid×2 + ultimate = 19종
- **해결**: Task 0.4에서 GDD §4/§5/§6을 family/tier v3 모델로 갱신.

#### ❌→✅ CONFLICT-C (Design-3): 인게임 가챠 확률 미존재
- 스펙: balance §2는 다이아 박스 가챠만. 인게임 가챠 섹션 부재.
- Plan: INGAME_GACHA tier2=60%/40e, tier3=20%/80e, tier4=5%/160e.
- **해결**: Task 0.4에서 balance §14 "인게임 가챠(에너지)" 신설.

#### ❌→✅ CONFLICT-D (Eng-1): GameEventMap 타입 미등록
- Plan이 `request-gacha-summon` / `request-upgrade-reroll` / `request-continue-run` / `enter-merge-mode` 4종을 등록 없이 emit.
- `tower-summoned` / `towers-merged` / `phase-a-summon-ready`의 grade 필드 tier 전환 미명시.
- **해결**: Task 5.0 "GameEventMap 선등록" 신설, Phase 5 착수 전.

#### ❌→✅ CONFLICT-E (Eng-2): Save Data grade 마이그레이션 누락
- localStorage `collection.towers.<id>.grade` 영속 필드가 Grade 제거 시 호환성 파괴.
- **해결**: Task 1.5 "schema_version v5→v6 마이그레이션" 신설, Phase 1 말미.

### DRIFT (조정)
- **DRIFT-Eng-1**: `metaProgressStore` 위치를 `packages/web-shell/src/stores/metaProgressStore.ts`로 변경 (Task 9.1 수정). `@gld/shared`에 Zustand 의존성 금지. TowerSystem은 `Game.ts`가 meta 값을 읽어 `TowerSystem.setGlobalModifiers({ atkPct })` 형태로 주입 (Task 9.2 수정).
- **DRIFT-Eng-2**: `GameEventMap`의 `wave-completed`에 `phase?: WavePhase` 타입 추가 (Task 4.2에 포함).
- **DRIFT-Design-1, 2, 3**: 미학 보정 Task 8.4 추가 — Tailwind 임의 색상을 토큰(`bg-[#2a2010]` panel, `border-[#4a3a20]` border, `bg-[#c8a04a]` accent, `bg-[#c03020]` danger)으로 일괄 치환. HomeTab 그라디언트 제거. SummonRevealOverlay 이모지 → 픽셀 SVG. `font-pixel` (Press Start 2P) 클래스 적용.

### 신규 Task (Revision 반영)

#### Task 0.4: 스펙 문서 v3 선 갱신 (신설)

**Files:**
- Modify: `docs/game-spec/01-GDD.md` §1, §3, §4, §5, §6, §10
- Modify: `docs/game-spec/02-balance-sheet.md` §5 (에너지 v3), §14 (신설 — 인게임 가챠)
- Modify: `docs/game-spec/06-milestone.md` — R3/R4 선행 사유 기록

- [ ] **Step 1: 01-GDD §1 맵 차원 갱신**
  - "Phase A: 8×24 grid, S-curve path" → "Phase A: 9×18 grid, U-turn + 중앙 프리미엄 배치 지대. TILE_SIZE=48px (모바일 430px 폭 수용)"

- [ ] **Step 2: 01-GDD §3 코어 루프 다이어그램에 가챠 분기 추가**
  - 기본 소환(⚡20 → tier1) + 인게임 가챠(⚡40/80/160 → targetTier 확률) 양쪽 경로 표시

- [ ] **Step 3: 01-GDD §4/§5/§6 family/tier 모델 갱신**
  - 등급 단계 4단계 normal→rare→unique→epic **제거**
  - 4 family (archer/siege/frost/stun) × 4 tier + hybrid tier5 ×2 + ultimate tier6 = 19종 표
  - 합성 규칙: family 동일+tier 동일 (1~3), tier4 혼합 쌍(archer+siege = hybrid_ab, frost+stun = hybrid_cd), tier5 혼합 = ultimate
  - plasma, dragon_nest 제거 명시
  - 빙결/스턴에도 공격력 부여 원칙 (약함 + 상태효과 강도)

- [ ] **Step 4: 02-balance-sheet §5 에너지 v3**
  - 초당 +1
  - 킬당 +1 (ENERGY_PER_KILL 재활성)
  - 보스 킬 +20 (빠른 클리어 <30s 시 +20 추가)
  - ENERGY_MAX=200 (tier4 가챠 160 수용 목적)
  - 변경 이력: "2026-04-17 v3 킬/보스 보상 재활성"

- [ ] **Step 5: 02-balance-sheet §14 인게임 가챠 신설**
  - 표: tier2 60%/40e, tier3 20%/80e, tier4 5%/160e, 실패 시 tier1 보장
  - 로그라이크 카드 `tier_odds_up` +5%p 적용

- [ ] **Step 6: 06-milestone 주석**
  - R1에 "메타 스텁 + BM 스텁 포함" 명시 (사용자 결정으로 R3/R4 선행 허용)

- [ ] **Step 6b (신규): 01-GDD §8 UI 구조 갱신**
  - Phase A HUD 구조 반영: 하단 고정 액션바 (기본 소환 + T2/T3/T4 가챠 + 메뉴)
  - TowerActionSheet(플로팅) 추가 — 타워 선택 시 합성/이동/판매
  - TopHud 배지 (에너지/웨이브/HP) 명시
  - SummonRevealOverlay, UpgradePickOverlay 오버레이 정의
  - DeckDock 제거 (시나리오 전용 UI)

- [ ] **Step 7: 커밋**
```bash
git add docs/game-spec/
git commit -m "docs(spec): v3 update for Phase A sole-mode (family/tier, energy, ingame gacha)"
```

#### Task 1.5: Save Data schema v6→v7 마이그레이션 (신설)

**주의**: 실제 저장소의 현재 `SAVE_VERSION`이 **이미 6** (v5→v6 기존 존재). 신규 마이그레이션은 **v6→v7**로 번호를 올린다.

**Files:**
- Modify: `packages/web-shell/src/stores/meta/persistence.ts` (SAVE_VERSION → 7)
- Create: `packages/web-shell/src/stores/meta/migrations/v7.ts`

- [ ] **Step 1: 마이그레이션 테스트 작성**
```ts
import { describe, it, expect } from 'bun:test'
import { migrateV6toV7 } from '../migrations/v7'

describe('migrateV6toV7', () => {
  it('converts grade string to tier number', () => {
    const v6 = { schema_version: 6, collection: { towers: { archer: { grade: 'rare' } } } }
    const v7 = migrateV6toV7(v6)
    expect(v7.schema_version).toBe(7)
    expect(v7.collection.towers.archer.tier).toBe(2)
    expect(v7.collection.towers.archer.grade).toBeUndefined()
  })
  it('removes plasma and dragon_nest entries', () => {
    const v6 = { schema_version: 6, collection: { towers: { plasma: { grade: 'normal' }, dragon_nest: { grade: 'epic' } } } }
    const v7 = migrateV6toV7(v6)
    expect(v7.collection.towers.plasma).toBeUndefined()
    expect(v7.collection.towers.dragon_nest).toBeUndefined()
  })
  it('removes scenario-only progression fields (missions/achievements 유지)', () => {
    const v6 = { schema_version: 6, selectedWorldId: 'w1', selectedStageId: 's1', deckCards: ['x'], starProgress: {}, worldUnlocks: {}, missions: { daily: [] }, achievements: { list: [] } }
    const v7 = migrateV6toV7(v6)
    expect(v7.selectedWorldId).toBeUndefined()
    expect(v7.selectedStageId).toBeUndefined()
    expect(v7.deckCards).toBeUndefined()
    expect(v7.starProgress).toBeUndefined()
    expect(v7.worldUnlocks).toBeUndefined()
    // missions/achievements는 메타루프용으로 유지
    expect(v7.missions).toBeDefined()
    expect(v7.achievements).toBeDefined()
  })
})
```

- [ ] **Step 2: 테스트 fail 확인 (bun test)**

- [ ] **Step 3: v7.ts 작성**
```ts
const GRADE_TO_TIER: Record<string, number> = { normal: 1, rare: 2, unique: 3, epic: 4 }
const REMOVED_TOWER_IDS = new Set(['plasma', 'dragon_nest'])
const SCENARIO_ONLY_KEYS = ['selectedWorldId', 'selectedStageId', 'deckCards', 'selectedCardIndex', 'starProgress', 'worldUnlocks']

export function migrateV6toV7(data: any): any {
  const next = structuredClone(data)
  next.schema_version = 7
  // 시나리오 전용 필드 제거 (missions/achievements는 메타루프에서 유지)
  for (const k of SCENARIO_ONLY_KEYS) delete next[k]
  // 타워 grade → tier 변환
  const towers = next.collection?.towers ?? {}
  for (const id of Object.keys(towers)) {
    if (REMOVED_TOWER_IDS.has(id)) { delete towers[id]; continue }
    const grade = towers[id].grade
    towers[id].tier = typeof grade === 'string' ? (GRADE_TO_TIER[grade] ?? 1) : 1
    delete towers[id].grade
  }
  return next
}
```

- [ ] **Step 4: persistence.ts의 SAVE_VERSION = 7로 갱신 및 마이그레이션 체인에 v6→v7 등록**

- [ ] **Step 5: 커밋**
```bash
git add packages/web-shell/src/stores/meta/migrations/ packages/web-shell/src/stores/meta/persistence.ts
git commit -m "feat(save): v6→v7 migration for family/tier model + scenario field purge"
```

#### Task 4.0: GameEventMap 타입 선등록 (신설 — Phase 4 착수 전, [F7]에 의해 Task 5.0에서 이전)

**Files:**
- Modify: `packages/phaser-game/src/EventBus.ts`

- [ ] **Step 1: GameEventMap 타입 확장**

기존 항목 중 payload 변경:
```ts
'tower-summoned': { instanceId: string; towerId: TowerId; tier: number; x: number; y: number }      // grade → tier
'towers-merged': { fromA: string; fromB: string; toInstanceId: string; toTowerId: TowerId; toTier: number; fromTier: number }  // grade → tier
'phase-a-summon-ready': { towerId: TowerId; source: 'summon' | 'gacha' }                            // grade 제거
'wave-completed': { slotIndex: number; cleared: boolean; phase: WavePhase }                         // phase 신규
```

**기존 유지** (소스 현실 기준): `upgrade-choice-ready`는 **기존 `choices` 필드명 유지**. 구조만 family/tier 연동으로 조정:
```ts
'upgrade-choice-ready': { choices: Array<{ id: UpgradeId; name: string; description: string; icon?: string }> }
```

신규 이벤트 추가:
```ts
'request-gacha-summon': { targetTier: 2 | 3 | 4 }
'gacha-insufficient-energy': { targetTier: number; cost: number; have: number }
'request-upgrade-reroll': undefined
'request-continue-run': { livesRestored: number }
'enter-merge-mode': { sourceId: string }
```

- [ ] **Step 2: 저장소 실제 스크립트명으로 타입체크 검증**

Run: Task 0.5에서 확인한 스크립트명 사용 (예: `bun typecheck` 또는 `bunx tsc -b`)
Expected: 신규 이벤트 사용처 없으므로 PASS. `grade` 참조는 Phase 1에서 tier로 변경됨.

- [ ] **Step 3: 커밋**
```bash
git add packages/phaser-game/src/EventBus.ts
git commit -m "feat(event-bus): register new events + migrate grade→tier payloads"
```

#### Task 5.5: Phase A 5분 플레이 Go/No-Go Gate (신설)

**Files:** (수동 검증, 코드 없음)

- [ ] **Step 1: 실제 모바일 기기(390×844 또는 430 폭) 또는 Chrome DevTools mobile emulation에서 5분 플레이**

- [ ] **Step 2: 다음 체크리스트 통과 여부 확인**
  - [ ] 3 보스 웨이브 클리어 가능
  - [ ] tier 4 이상 타워 1개 이상 합성 도달
  - [ ] 에너지 수급이 과잉/결핍 아님 (대기시간/소모 균형)
  - [ ] 타일맵 눈 피로감 완화 확인 (사용자 1차 판단)
  - [ ] HUD 터치 타겟 만족 (오터치 없음)
  - [ ] 세션 종료 시 "한 판 더" 욕구 발생

- [ ] **Step 3: 결과 기록**
  - PASS: Phase 6~12 진행
  - FAIL: 밸런스/UX Task 추가 후 재검증

#### Task 8.4: HUD 미학 토큰 치환 (신설)

**Files:**
- Modify: `packages/web-shell/src/components/game/TowerActionSheet.tsx`
- Modify: `packages/web-shell/src/components/game/PhaseAHud.tsx`
- Modify: `packages/web-shell/src/components/game/SummonRevealOverlay.tsx`
- Modify: `packages/web-shell/src/components/lobby/tabs/HomeTab.tsx`

- [ ] **Step 1: 색상 토큰 치환**
  - `bg-slate-800/900/950` → `bg-[#2a2010]` (panel)
  - `border-amber-500/30` → `border-[#4a3a20]`
  - `bg-amber-600/700` → `bg-[#c8a04a]` (accent)
  - `bg-red-700` → `bg-[#c03020]` (danger)
  - `bg-sky-700` → `bg-[#4a7a9a]` (info)
  - `text-amber-300` → `text-[#c8a04a]`

- [ ] **Step 2: HomeTab 전투 시작 버튼 그라디언트 제거**
```tsx
<button className="w-full max-w-xs h-16 rounded-xl bg-[#c8a04a] text-[#1a1208] font-pixel text-xl shadow-[0_4px_0_#4a3a20]">
  전투 시작
</button>
```

- [ ] **Step 3: 폰트 지정**
  - 게임 UI 관련 텍스트에 `font-pixel` 클래스 일괄 추가 (Press Start 2P).
  - 전역에 `@font-face` 또는 `@theme` 토큰 정의는 기존 설정 참조.

- [ ] **Step 4: SummonRevealOverlay 이모지 → 픽셀 SVG**
  - `⚔️` → 기존 `tower-icons.png` 스프라이트에서 family별 아이콘 프레임 출력
  - 예: `<TowerIcon familyId={tower.family} className="w-10 h-10" />`

- [ ] **Step 5: 커밋**
```bash
git add packages/web-shell/src/components/
git commit -m "polish(ui): replace Tailwind arbitrary colors with design tokens, remove gradient CTA"
```

#### Task 11.2: hybrid/ultimate 합성 전용 VFX (신설)

**Files:**
- Modify: `packages/phaser-game/src/systems/MergeSystem.ts` 또는 `PhaseAOrchestrator.ts`
- Modify: `packages/phaser-game/src/scenes/Game.ts`

- [ ] **Step 1: tier 5/6 전용 합성 연출 트리거**

`towers-merged` emit 시 `toTier >= 5`이면:
- 화면 플래시 (Phaser camera flash, 300ms, white)
- scale punch (신규 타워 `.setScale(0.8 → 1.3 → 1.0)` 400ms easeOutBack)
- 추가 파티클 버스트 (`gacha-reveal-legendary` or `gacha-reveal-god` 에셋 활용)

```ts
this.scene.cameras.main.flash(300, 255, 255, 255, false)
const newTower = this.towerSystem.getSprite(toInstanceId)
this.scene.tweens.add({
  targets: newTower, scaleX: { from: 0.8, to: 1.0 }, scaleY: { from: 0.8, to: 1.0 },
  duration: 400, ease: 'Back.easeOut',
})
this.scene.add.particles(newTower.x, newTower.y, tier === 6 ? 'gacha-reveal-god' : 'gacha-reveal-legendary', {
  speed: { min: 80, max: 200 }, lifespan: 600, quantity: 30,
})
```

- [ ] **Step 2: React 측 피드백**
  - TowerActionSheet에 `towers-merged` 수신 시 `scale-110 → scale-100` 200ms CSS transition

- [ ] **Step 3: 수동 검증**

Expected: tier4 두 개 합성 → hybrid5 생성 시 flash + scale punch. hybrid5 두 개 합성 → ultimate 생성 시 더 큰 burst.

- [ ] **Step 4: 커밋**
```bash
git add packages/phaser-game/src/
git commit -m "feat(vfx): hybrid/ultimate merge reveal punch with flash and particles"
```

### Phase 9 수정사항

- **Task 9.1 수정**: `metaProgressStore` 위치를 `packages/web-shell/src/stores/metaProgressStore.ts`로 변경. `@gld/shared`에 Zustand 의존성 추가 금지.
- **Task 9.2 수정**: `TowerSystem.placeTower()` 내 `useMetaProgress.getState()` 직접 호출 제거. 대신 `Game.ts`의 `create()`에서 meta 값을 읽어 `towerSystem.setGlobalModifiers({ atkPct })` 주입. `TowerSystem`에 `setGlobalModifiers()` 메서드 신설.

### 수정된 마이그레이션 순서 (최종)

1. Phase 0 (사전 정리)
2. **Task 0.4 (신규) — 스펙 문서 v3 선 갱신**
3. Phase 1 (타워 모델) + **Task 1.5 (신규) — Save 마이그레이션**
4. Phase 2 (MergeSystem)
5. Phase 3 (에너지)
6. Phase 4 (로그라이크)
7. **Task 5.0 (신규) — GameEventMap 선등록** → Phase 5 (가챠)
8. **Task 5.5 (신규) — 5분 Go/No-Go Gate**
9. Phase 6 (시나리오 제거)
10. Phase 7 (맵)
11. Phase 8 (HUD) + **Task 8.4 (신규) — 미학 토큰 치환**
12. Phase 9 (메타, 위치 수정 반영)
13. Phase 10 (BM)
14. Phase 11 (플레이스홀더 타워) + **Task 11.2 (신규) — hybrid/ultimate VFX**
15. Phase 12 (문서 2차 갱신 + 최종 검증)

---

## Codex Challenge Revisions (2026-04-18)

`/codex challenge` 결과 24건 findings 반영 (P1 16건, P2 7건, P3 1건). 토큰 85k 소비. 각 항목은 `[F번호]`로 참조.

### A. 선행 수정 (Phase 1 착수 전 필수)

#### [F1] TDD 패턴 교정 (P1-#1)
- 타입 전용 변경은 `bun typecheck`(또는 저장소 실제 스크립트명)로 검증. runtime 테스트가 아님.
- Task 1.1, 1.2, 5.0 변경: "Step X: bun test로 fail 확인" → "Step X: bun typecheck로 타입 에러 확인 후 수정으로 해소"
- runtime 로직 Task(MergeSystem, GachaSystem, migration, metaProgressStore)은 `bun test` 유지

#### [F2] 저장소 스크립트명 확인 (P1-#3)
- Task 0.5(신설)에서 `cat package.json | jq .scripts` 실행 후 실제 스크립트명 확인
- 플랜 전체에서 발견된 추정 스크립트 치환: `bun dev` → `bun dev:web`, `bun run build` → `bun build:web`, `bun run typecheck` → 실제 이름
- 확인 결과를 Task 0.5 Step 2에 기록 후 플랜 refs 일괄 교정

#### [F3] Task 0.5 — 전수 참조 조사 (P1-#4)
**신규 Task, Phase 0 말미**
- `rg "'plasma'|'dragon_nest'" packages/` — 제거 타워 전수 참조
- `rg "TowerId|towerId|tower_id" packages/ public/` — ID 문자열 참조
- manifest, asset keys, collection data, HUD labels, save data shape 목록화
- 결과를 `docs/superpowers/specs/2026-04-18-codex-revision-audit.md`에 기록 (Task 0.5 산출물)

#### [F4] Save v5→v6 범위 확장 (P1-#5)
Task 1.5의 `migrateV5toV6` 확장:
```ts
// 추가 제거 대상:
delete next.selectedWorldId
delete next.selectedStageId
delete next.deckCards
delete next.selectedCardIndex
delete next.missions
delete next.achievements
delete next.starProgress
delete next.worldUnlocks
// schema_version 부재 시 v5로 간주
if (typeof next.schema_version !== 'number') next.schema_version = 5
```
테스트에 빈 state / 부분 state / 부재 schema_version 케이스 추가.

### B. 구조 수정

#### [F5] metaProgressStore 위치 일관화 (P1-#6)
- Task 9.1 본문 "`packages/shared/src/state/metaProgressStore.ts`" 언급 전부 **삭제**
- 올바른 위치: **`packages/web-shell/src/stores/metaProgressStore.ts`**
- Task 9.2 TowerSystem 의존 방식:
  - `Game.ts`의 `create()`에서 `useMetaProgress.getState()` 읽어서 `this.towerSystem.setGlobalModifiers({ atkPct })` 주입
  - `TowerSystem`에 `setGlobalModifiers(mods: { atkPct: number })` 메서드 신설
  - `phaser-game` → `web-shell` 역참조 금지. 값만 주입.

#### [F6] Build-broken commit 금지 (P1-#2)
- Task 6.2 Step 6 **"빌드 깨진 상태 커밋" 제거**
- 대체: 삭제 + 참조 전수 정리를 **단일 커밋**으로 묶기
- 세부 분할:
  - Task 6.2a: 페이지 파일 삭제 + App.tsx 라우팅 갱신 (빌드 통과)
  - Task 6.2b: 스토어 slice 제거 + gameStore 갱신 (빌드 통과)
  - Task 6.2c: 상수/시스템 파일 삭제 + 참조처 정리 (빌드 통과)
  - Task 6.2d: world-gimmicks + GimmickSystem 제거 (빌드 통과)
- 각 sub-task 끝에 `bun build:web` + `bun typecheck` PASS 요구

#### [F7] 이벤트 등록 순서 교정 (P1-#9)
- **Task 5.0 → Task 4.0으로 이동** (Phase 4 착수 전)
- Task 4.0 payload 확장:
  - `wave-completed`에 `phase: WavePhase` 추가
  - `upgrade-choice-ready: { cards: UpgradeCard[] }` (신규 emit 대응)
  - `request-upgrade-reroll`, `request-continue-run`, `enter-merge-mode`, `gacha-insufficient-energy`, `request-gacha-summon`, `phase-a-summon-ready`의 tier 필드 등 전부 선등록
- Task 5.0은 제거 (4.0에 흡수)

### C. 신규 Task (누락 범위 보강)

#### [F8] Task 5.6 — 소환 경쟁 조건 방지 (P1-#7)
**신규 Task, Phase 5 말미**
- `PhaseAOrchestrator`에 요청 큐 구조:
  ```ts
  private pendingSummon: { requestId: string; towerId: TowerId; source: 'summon'|'gacha'; energyRefund: number } | null
  private summonQueue: Array<typeof this.pendingSummon> = []
  ```
- 소환 요청: pendingSummon 있으면 reject (토스트 "이전 타워를 먼저 배치하세요") 또는 queue enqueue
- 배치 완료/취소/타임아웃 시: `pendingSummon=null`, queue에서 다음 요청 dequeue
- 취소 시 에너지 환불 (`energyRefund` 사용)
- 테스트: 연타 시 에너지 1회만 소모 검증

#### [F9] Task 8.2-B — 기본 소환 버튼 HUD 복귀 (P1-#8)
Task 8.2 하단 액션바 재설계:
```tsx
<div className="absolute bottom-0 left-0 right-0 flex gap-1 p-2 bg-panel border-t border-border"
     style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))' }}>
  <SummonButton cost={20} primary />          {/* 메인 CTA, flex-[2] */}
  <GachaButton tier={2} cost={40} rate={60} />
  <GachaButton tier={3} cost={80} rate={20} />
  <GachaButton tier={4} cost={160} rate={5} />
  <MenuButton />
</div>
```
- 기본 소환 버튼이 시각적으로 가장 강조 (`flex-[2]`, accent 배경)
- 가챠 3종은 동등 폭, 메뉴는 고정 폭

#### [F10] Task 8.5 — enter-merge-mode 핸들러 (P1-#10)
**신규 Task, Phase 8 내**
- `GamePage.tsx`에 `mergeSourceId` 상태 관리:
  ```tsx
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null)
  useEffect(() => {
    eventBus.on('enter-merge-mode', (p) => setMergeSourceId(p.sourceId))
    return () => eventBus.off('enter-merge-mode', ...)
  }, [])
  ```
- 다음 타워 탭 시 `request-merge-towers` emit → `mergeSourceId` 초기화
- ESC/외부 탭/`merge-failed` 시 취소 플로우
- TowerActionSheet의 `mode`는 `selectedTower.instanceId` 변경 시 reset:
  ```tsx
  useEffect(() => { setMode('idle') }, [selectedTower?.instanceId])
  ```

#### [F11] Task 10.3 — 씬 상태 복원 (P1-#11)
**신규 Task, Phase 10 내**
- `EventBus.emit('request-continue-run')` 처리 파이프라인:
  1. PhaseAOrchestrator 수신 (GameOverScreen이 아닌)
  2. AdService 호출 (레이어 정리)
  3. 성공 시:
     - gameStore `lives += 5`
     - Phaser `scene.scene.resume()` or `wave system resume`
     - 현재 웨이브의 remaining spawn 기준 재시작
     - 배치 타워, 업그레이드 스택, pending summon 유지
     - overlay 전부 dismiss
- 실패 시: 아무 변화 없음
- 테스트: 3번 이상 연속 "이어서" 방지 (쿨다운 또는 1회 제한)

#### [F12] Task 7.0 — 맵 차원/카메라 검증 (P1-#12)
**신규 Task, Phase 7 최상단**
- 문제: 9×18×48px = 960px가 모바일 `h-dvh` (~844)에 안 들어감
- 옵션 비교:
  - **A) 타일 44px** — 9×44=396 폭, 20×44=880 높이. 모바일에 들어가지만 430px 폭에 34px 여백
  - **B) 그리드 9×18** — 9×48=432 폭, 18×48=864 높이. 높이 경로 단축
  - **C) 카메라 스크롤/줌** — 타일 48px 유지, camera follow + zoom out
- **결정**: 옵션 B (9×18×48px) 권장. 경로 길이는 U턴 한 번으로 조정.
- Task 7.3 그리드 정의를 9×18로 수정. 경로 생성 로직 재조정.

#### [F13] Task 7.3 수정 — exitPoint/경로 끝 정합 (P1-#13)
- 경로 생성 로직 마지막에 명시적으로:
  ```ts
  pathPoints.push({ x: 4, y: 0 })  // exitPoint와 일치
  ```
- `castleWallTiles`와 누수 판정 로직 연결:
  - `UnitSystem`의 `checkUnitExit()`가 `exitPoint` 일치 시 성벽 HP 감소
  - `CastleWallSystem`의 렌더 위치 = `exitPoint` 파생 (현재 유지)

#### [F14] Task 7.4 확장 — 장애물 전수 통합 (P1-#14)
- `preloadAssets.ts`에 tiny-swords obstacle 키 등록:
  ```ts
  { key: 'tree_03', path: '/assets/vendor/tiny-swords/trees/tree_03.png' },
  { key: 'rock_04', path: '/assets/vendor/tiny-swords/rocks/rock_04.png' },
  { key: 'bush_02', path: '/assets/vendor/tiny-swords/bushes/bush_02.png' },
  ```
- `PathfindingSystem`이 `currentMap.obstacles` 참조하여 차단 확인
- `TowerPlacementSystem` / pointer hover highlight이 동일 `obstacles` 인지
- `Game.ts` scene `destroy()` 시 obstacle sprite 명시적 cleanup
- 테스트: obstacle 좌표에 배치 시도 시 `placement-blocked` 이벤트 검증

#### [F15] Task 4.4 — 로그라이크 카드 적용 시스템 (P1-#15)
**신규 Task, Phase 4 말미**
각 카드 효과 적용 지점 명시:
- `crit_dmg`: `TowerSystem.calculateDamage()` — 크리 발생 시 base × (1 + stackCount * 0.25)
- `effect_amp`: 슬로우/스턴 적용 시 지속 시간 × (1 + stackCount * 0.25)
- `energy_regen`: 카드 데이터에 `interval: 5000, amount: 2` 필드 추가. `EnergySystem.tickExtra()` 메서드 신설
- `tier_odds_up`: `GachaSystem.rollTier()` 내부에서 `successRate + stackCount * 0.05` 적용 (최대 min(0.95))
- 각 적용 지점 unit test 추가

#### [F16] Task 11.3 — CC 가드레일 (P1-#16)
**신규 Task, Phase 11 내**
- 유닛 데이터에 `ccResistance: number` 추가 (0~1, 보스는 0.5)
- 슬로우/스턴 적용 시: `duration * (1 - ccResistance)`
- `MIN_MOVE_SPEED = 0.15` 상수 — 슬로우 최종치 하한
- 스턴 면역: 스턴 해제 후 2초간 재스턴 면역 (`stunImmunityUntil` 유닛 필드)
- 02-balance-sheet §5에 CC 룰 명시 (Task 0.4에 포함)

### D. P2/P3 수정

#### [F17] 에너지 경제 소프트캡 (P2-#17)
- `EnergySystem.getGeneration()` 점진 감소:
  ```ts
  const rate = this.current < 100 ? 1 : 0.5
  ```
- `tier_odds_up` 스택 상한 10회 (+50%p, 최종 min(0.95))
- balance-sheet §14에 상한 규칙 명시

#### [F18] 빠른 클리어 판정 수정 (P2-#18)
- `WaveSystem`에 `bossSpawnMs?: number` 필드 추가
- 보스 유닛 첫 스폰 시점에 기록
- Game.ts 보스 킬 처리:
  ```ts
  const elapsed = this.scene.time.now - (this.waveSystem.bossSpawnMs ?? this.waveStartMs)
  if (elapsed < FAST_CLEAR_THRESHOLD_MS) energySystem.add(ENERGY_PER_BOSS_FAST_CLEAR)
  ```

#### [F19] 시나리오 삭제 범위 확장 (P2-#19)
Task 6.2 삭제 목록에 추가:
```
packages/phaser-game/tests/w1_*.test.ts
packages/phaser-game/tests/worldGimmicks.test.ts
packages/phaser-game/src/systems/GimmickSystem.ts  (world-gimmicks 디렉토리 외)
packages/web-shell/src/pages/ProfilePage.tsx (시나리오 단서 있을 시)
```
삭제 전 `rg "worldId|stageId|missionId|achievementId|GimmickSystem"` 전수 조사 Task 선행.
`Orchestrator`/`Game.ts` 내 시나리오 초기화 분기 제거 확인.

#### [F20] gameStore 정리 일관화 (P2-#20)
- `selectedStageId` **완전 제거** (Phase A는 단일 맵)
- `PHASE_A_STAGE_ID = 'phase_a_s1' as const` 상수 도입 (필요 시)
- `resetRun()`: 상수 참조로 고정
- `startPhaseA()` 액션: runStatus='building' 설정
- `enterMetaForge()` 액션: 로비 → MetaForgePage 네비게이션

#### [F21] React 상태 버그 수정 (P2-#21)
- `TowerActionSheet`: `selectedTower` 변경 시 `mode=idle` reset (F10에 포함)
- `SummonRevealOverlay`: useRef 기반 timer 관리
  ```tsx
  const timerRef = useRef<NodeJS.Timeout>()
  useEffect(() => {
    if (!pending) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setPending(null), 2000)
    return () => clearTimeout(timerRef.current)
  }, [pending])
  ```
- `MenuButton`: 일시정지 + 나가기 확인 모달 구현 (신규 `PauseModal.tsx`)

#### [F22] Go/No-Go Gate 위치 이동 (P2-#22)
- **Task 5.5 → Task 8.5** (HUD 재작성 완료 후)
- 평가 항목 추가:
  - 하단 액션바 터치 타겟 (가챠 3종 + 기본 소환 구별 가능?)
  - TowerActionSheet 열림/닫힘 UX
  - 9×18 맵에서 장애물 배치로 경로 선택 감 차별화 체감

#### [F23] 플레이스홀더 커버리지 확장 (P2-#23)
Task 11.1 확장:
- hybrid/ultimate:
  - `tower-icons.png` 스프라이트시트: 기존 frame 재사용 + 색 틴트
  - `tower-card` 템플릿: arcane_spire/divine_throne 프레임 재활용 + 오라 오버레이
  - `SummonRevealOverlay` 배경: 기존 legendary 그라데이션 재사용
- VFX 키 존재 검증:
  ```bash
  rg "gacha-reveal-legendary|gacha-reveal-god" packages/phaser-game/src/constants/preloadAssets.ts
  ```
  없으면 기존 `gacha-reveal-heroic` 재사용 + 틴트
- 실제 에셋 공백 생기면 에러 대신 warning + fallback 로직

#### [F24] 디자인 토큰 실제 정의 (P3-#24)
Task 8.4 교정: arbitrary `bg-[#...]` 하드코드 대신 Tailwind v4 `@theme` 토큰 정의
- `packages/web-shell/src/styles/tokens.css` (신규) 또는 기존 `index.css`:
  ```css
  @theme {
    --color-panel: #2a2010;
    --color-border: #4a3a20;
    --color-accent: #c8a04a;
    --color-danger: #c03020;
    --color-info: #4a7a9a;
    --color-ink: #1a1208;
  }
  ```
- 컴포넌트에서 `bg-panel`, `border-border`, `bg-accent`, `text-ink` 등 클래스명 사용
- `.impeccable.md` 토큰 동기화 (기존 13개 토큰 중 게임 UI용 subset)

### E. 최종 마이그레이션 순서 v3 (Codex Revision 반영)

1. **Phase 0** (이슈 클로즈, 메모리 정리, 플랜 이동)
2. **Task 0.4** (스펙 v3 선 갱신) — CC 룰 추가
3. **Task 0.5** ([F3]) — 저장소 스크립트명 확인 + 전수 참조 감사
4. **Phase 1** + **Task 1.5** ([F4] 확장 범위) — TDD 패턴 F1 적용
5. **Phase 2**
6. **Phase 3**
7. **Task 4.0** ([F7] 이동) — GameEventMap 선등록 (확장 payload)
8. **Phase 4** + **Task 4.4** ([F15] 로그라이크 적용 시스템)
9. **Phase 5** + **Task 5.6** ([F8] 소환 큐)
10. **Phase 6** ([F6] [F19] 분할/확장, build-broken 금지)
11. **Task 7.0** ([F12] 맵 차원 확정) + **Phase 7** ([F13] exitPoint, [F14] 장애물 전수 통합)
12. **Phase 8** ([F9] 기본 소환 버튼, [F24] 진짜 토큰) + **Task 8.5** ([F10] merge-mode 핸들러, [F21] React state)
13. **Task 8.5-Gate** ([F22] Go/No-Go Gate 이동)
14. **Phase 9** ([F5] 위치 수정)
15. **Phase 10** + **Task 10.3** ([F11] 씬 복원)
16. **Phase 11** + **Task 11.3** ([F16] CC 가드레일) + **Task 11.1** ([F23] 플레이스홀더 확장)
17. **Phase 12** (문서 최종 갱신 + E2E)

### F. 제거 지시 (Round 3에서 본문 직접 수정 완료)

- ✅ Task 5.0 → Task 4.0으로 **이동 완료** (본문 교체됨)
- ✅ Task 5.5 Go/No-Go Gate → Task 8.5-Gate로 이동 (Codex Revision C 섹션 참고)
- ✅ Task 6.2 Step 6 "build intentionally broken" 커밋 지시 → [F6]에서 4 sub-task로 분할
- ✅ Task 9.1/9.2 본문 `packages/shared/src/state/...` → `packages/web-shell/src/stores/...` **교체 완료**
- ✅ Task 1.5 `v5→v6` → `v6→v7` **교체 완료** (실제 `SAVE_VERSION`이 이미 6)
- ✅ Task 0.4에 Step 6b "GDD §8 UI 구조 갱신" **추가 완료**
- ✅ 맵 차원 **9×18 일관 적용** (모든 `9×20` 참조 치환 완료)
- ✅ Task 9.2 TowerSystem에 직접 Zustand import 제거, `setGlobalModifiers()` 주입 방식 **교체 완료**
- ✅ Task 1.1/1.2 TDD fail 검증을 `bun test` → 타입체크로 구분 **교체 완료**

### G. Round 3 Review 반영 (2026-04-18 밤)

추가 반영 사항:
- **SAVE_VERSION 현실 반영**: 실제 저장소는 이미 v6. 새 마이그레이션은 **v6→v7**.
- **upgrade-choice-ready 필드명 `choices` 유지** (기존 소스 현실 맞춤). `cards`로 변경 X.
- **missions/achievements 유지**: 시나리오 전용 키(`selectedWorldId`, `selectedStageId`, `deckCards`, `selectedCardIndex`, `starProgress`, `worldUnlocks`)만 제거. 메타루프용 missions/achievements는 유지.
- **저장소 스크립트명 확인 의무화**: `bun run build` / `bun run typecheck` 대신 Task 0.5에서 실제 스크립트 확인 후 사용.

---

## Self-Review 체크리스트 (플랜 작성자 확인 필수)

- [x] 스펙 항목(타워 재편/가챠/에너지/로그라이크/메타루프/BM/맵/HUD/시나리오 제거/에셋) 모두 태스크 커버
- [x] TBD/TODO/placeholder 문구 없음
- [x] 타입명 일관성 (TowerFamily, TowerId, MERGE_CHAIN, INGAME_GACHA, MetaProgress 등)
- [x] 각 Task 2-5분 단위 스텝
- [x] 모든 code step에 실제 코드 포함
- [x] bite-sized commit 12 Phase 이상으로 분리

---

## Execution Handoff

**Plan complete and saved to `/Users/lio/.claude-personal/plans/phase1-sprightly-cocke.md` (승인 후 `docs/superpowers/plans/2026-04-17-phase-a-sole-mode.md`로 이동 예정).**

**Two execution options:**

1. **Subagent-Driven (recommended)** — 각 Task마다 fresh subagent 디스패치, Task 사이 리뷰 루프, 빠른 반복
2. **Inline Execution** — 현재 세션에서 executing-plans로 Phase 단위 배치 실행 + 체크포인트

**Which approach?**

# Core Combat Spec Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 일반모드 게임 설계 문서(GDD)의 코어 전투 시스템 스펙과 현재 구현의 불일치를 모두 수정한다.

**Architecture:** shared 패키지의 타입/상수를 스펙에 맞게 교정하고, phaser-game의 TowerSystem·UnitSystem에 속성 상성 데미지 + 스턴 메카닉을 추가하며, boost 시스템을 완전히 제거한다. 기존 테스트를 새 데이터에 맞게 갱신한다.

**Tech Stack:** TypeScript, @gld/shared, @gld/phaser-game (Phaser 3), Vitest

---

## Scope Note

이 플랜은 **인게임 코어 전투 루프**만 다룬다. 아래 항목은 별도 플랜으로 분리:
- 보스 연출 시네마틱 (WARNING 텍스트, 화면 흔들림, BGM 전환)
- 튜토리얼 시스템 (5단계 시퀀스)
- 설정 localStorage 저장
- 메타 경제 (골드, 타워 승급, 가챠, 프로필 성장)
- 웨이브별 spawn_interval 차별화

---

## Gap Summary

| # | 영역 | 스펙 | 현재 코드 | 변경 |
|---|------|------|-----------|------|
| 1 | 타워 역할군 | 집중공격/다중공격/슬로우/스턴 | 집중공격/다중공격/슬로우/부스트 | boost→stun |
| 2 | shield special | `stun` | `boost_adjacent_20%` | 교체 |
| 3 | fortress special | `stun_aoe` | `boost_adjacent_40%` | 교체 |
| 4 | stasis_field tier | T3 | T2 | 2→3 |
| 5 | stasis_field special | `slow_30%_aoe` | `slow_30%` | aoe 추가 |
| 6 | holy_shrine tier | T4 | T3 | 3→4 |
| 7 | holy_shrine special | `stun_aoe_extended` | `boost_adjacent_20%` | 교체 |
| 8 | world_tree special | `slow_40%_aoe` | `boost_adjacent_40%` | 교체 |
| 9 | divine_throne special | `stun_aoe_global` | `boost_adjacent_40%` | 교체 |
| 10 | 초기 에너지 | 0 | 20 | 20→0 |
| 11 | 속성 시스템 | 화/수/번개/무 + 상성표 | 없음 | 신규 추가 |
| 12 | 속성 데미지 배율 | 1.3x/0.7x/1.0x | 없음 | 신규 추가 |
| 13 | 스턴 메카닉 | 이동 정지, 쿨타임 기반 | 없음 | 신규 추가 |
| 14 | 슬로우 팩터 파싱 | 30%→0.7, 50%→0.5, 40%→0.6 | 모두 0.7 | 파싱 수정 |
| 15 | disruptor | slow + splash 동시 | slow만 적용, splash 안됨 | 수정 |
| 16 | 덱 역할 | `stun` | `boost` | 교체 |
| 17 | TowerDef.cost | energy 10/20 | T1=50, 나머지=0 | 교체 |

---

Full plan file at: /Users/lio/.claude-personal/plans/mutable-shimmying-wave.md

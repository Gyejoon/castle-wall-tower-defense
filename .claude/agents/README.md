---
name: Local Subagents 풀 안내
description: msitarzewski/agency-agents에서 임포트한 게임 개발/Unity 전문 subagent 9종의 출처, 라이선스, 이 프로젝트에서의 사용 범위를 설명
---

# .claude/agents — Local Subagents

이 디렉토리는 Claude Code 프로젝트 스코프 **subagent** 정의 풀이다.
`/agents` 명령으로 직접 선택하거나, description에 부합하는 요청이 들어왔을 때 자동 라우팅된다.

## 출처

- 원 저장소: [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents)
- 임포트 시점 SHA: `783f6a72bfd7f3135700ac273c619d92821b419a` (main, 2026-04-24 기준)
- 가져온 대상: `game-development/` 최상위 5개 + `game-development/unity/` 4개 = **총 9개**
- 변경 사항 없음. 원문 그대로(바이트 수준) 복사.

## 라이선스

- agency-agents는 **MIT 라이선스**로 배포된다. ([원 저장소 LICENSE](https://github.com/msitarzewski/agency-agents/blob/main/LICENSE))
- 각 파일 frontmatter에 저자의 `name`/`description`이 그대로 유지되어 있다.
- 재배포 시 MIT 조건(저작권 표기, 라이선스 사본 동봉)을 충족해야 한다. 본 프로젝트는 내부 사용 목적이며, 추후 외부 공개가 필요해지면 `LICENSE-agency-agents` 파일로 MIT 전문을 별도 동봉할 것.

## 구성 (9개)

| 파일 | Name | 카테고리 | 한 줄 요약 |
|------|------|----------|-----------|
| `game-designer.md` | Game Designer | 일반 | GDD·게임 경제·코어 루프·플레이어 심리 기반 시스템 설계 |
| `game-audio-engineer.md` | Game Audio Engineer | 일반 | FMOD/Wwise·적응형 음악·공간 오디오·성능 예산 |
| `level-designer.md` | Level Designer | 일반 | 레이아웃 이론·페이싱·인카운터·환경 서사 |
| `narrative-designer.md` | Narrative Designer | 일반 | 분기 대화·로어 아키텍처·환경 스토리텔링 |
| `technical-artist.md` | Technical Artist | 일반 | 셰이더·VFX·LOD 파이프라인·크로스엔진 에셋 최적화 |
| `unity-architect.md` | Unity Architect | Unity 전용 | ScriptableObject·디커플드 시스템·단일 책임 컴포넌트 |
| `unity-editor-tool-developer.md` | Unity Editor Tool Developer | Unity 전용 | EditorWindow·PropertyDrawer·AssetPostprocessor 자동화 |
| `unity-multiplayer-engineer.md` | Unity Multiplayer Engineer | Unity 전용 | Netcode for GameObjects·Relay/Lobby·권위·레이턴시 보정 |
| `unity-shader-graph-artist.md` | Unity Shader Graph Artist | Unity 전용 | Shader Graph·HLSL·URP/HDRP 커스텀 패스 |

## 이 프로젝트에서의 사용 범위

본 저장소는 **Phaser 3 + React 18** 런타임이다 (Unity 아님 — `9be0b0a`에서 Unity MCP 설정 제거됨).

### 사용 가이드

- **일반 5종** (Game Designer / Audio / Level / Narrative / Technical Artist): 엔진 중립적인 설계 영역은 Phaser 프로젝트에도 직접 활용 가능. GDD, 밸런스, 레벨 페이싱, 오디오 설계, VFX/성능 예산 상담에 호출.
- **Unity 4종**: 프롬프트가 C#/MonoBehaviour/ScriptableObject/URP를 전제로 한다. **코드 생성용이 아니라 "아키텍처 패턴 레퍼런스"로만 사용**:
  - 데이터 지향 설계(ScriptableObject 패턴) → Phaser의 `shared/src/constants/towers.ts` 같은 정적 데이터 모듈 설계에 참고
  - 컴포넌트 단일 책임·이벤트 채널 디커플링 → `TypedEventBus` 설계 원칙 검토에 참고
  - Editor 자동화 철학 → 개발 툴링(asset 생성 스크립트 등) 설계에 참고
  - 네트워크 권위/지연 보정 → 멀티플레이어 도입 시 설계 프레임워크로 참고

### Phaser 관련 실제 구현은 기존 skill을 우선

- `.claude/skills/phaser-best-practices/SKILL.md` — Phaser 씬/시스템/클린업 규약
- `.claude/skills/game-ui-design/SKILL.md` — Phaser+React 하이브리드 UI
- `.claude/skills/ralreview/SKILL.md` — 수렴 리뷰

subagent가 Phaser 맥락을 모른다는 점에 유의. Unity 전용 코드 산출물을 그대로 채택하지 말 것.

## 제거

이 풀 전체를 제거하려면:

```bash
rm -rf .claude/agents/
```

skills와 독립이므로 제거해도 기존 28개 skill은 영향 없음.

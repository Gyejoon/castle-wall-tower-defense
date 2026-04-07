# 에셋 애니메이션 강화 스펙

> 생성일: 2026-04-07

## Context

기존 canvas 프로시저럴 에셋은 4프레임 애니메이션으로, 모션이 미세하여 유닛이 떠다니는 느낌이었다.
투석기는 레이저와 동일한 직선 발사체를 사용했고, 사운드도 구분되지 않았다.
ComfyUI AI 생성을 시도했으나 게임용 픽셀아트에 부적합하여 canvas 프로시저럴 방식을 유지하되 품질을 강화하기로 결정했다.

## 결정 사항

| 항목 | Before | After |
|------|--------|-------|
| 프레임 수 | 4 | 8 |
| 유닛 걷기 | ±1px bobY 하드코딩 | sin 기반 legStep 교대 + bobY + armSwing |
| 타워 공격 | glow 변화만 | 충전→발사→비행→잔상→복귀 8단계 시퀀스 |
| 보스 | 정적 이미지 | 8프레임 idle (호흡+날개+비늘+화염) |
| 사망 | 4프레임 점/원 | 8프레임 플래시→파편→연기→소멸 |
| 투석기 발사체 | 직선 레이저 (lineTo) | 포물선 아크 (sin 곡선) + 돌 발사체 |
| 투석기 사운드 | 저주파 sine 웅웅 | 3단계: 퍽(brown noise)→휘이(white bandpass)→쿵(brown noise) |
| 투석기 팔 | 정적 | 180° 스윙 (로딩→발사→반동→복귀) |
| 타워 fire 애니메이션 | 정적 이미지 위에 겹침 | 정적 숨기고 fire spritesheet 재생 |
| Preloader 프레임 수 | `end: 3` 하드코딩 | manifest `frameCount` 동적 읽기 |

## 애니메이션 시스템

### 걷기 모션 함수

```typescript
// 8프레임 워크 사이클 (0..2π)
walkPhase(frame) = (frame / 8) * Math.PI * 2

// 상하 바운스
bobY(frame) = Math.round(Math.sin(walkPhase * 2) * 1.5)

// 다리 교대: 한쪽 길어지면(디딤) 다른쪽 짧아짐(들림)
legStep(frame) = [lift, -lift]  // lift = Math.round(sin(phase) * 3)

// 팔 스윙: 다리 반대 방향
armSwing(frame) = Math.round(Math.sin(walkPhase + π) * 3)
```

### 유닛별 특성

| 유닛 | 걷기 특성 |
|------|----------|
| 고블린 정찰병 | 빠른 교대, 단검 흔들림 |
| 오크 전사 | 도끼/방패 수직 스윙, 무거운 걸음 |
| 돌 트롤 | 짧은 보폭 (tScale=0.7), 스쿼시&스트레치 |
| 그림자 암살자 | 투명도 펄스 (alpha 0.55~0.85), 단검 교차 |
| 고대 드래곤 | 날개 ±5px 펄럭, 꼬리 스윙, 화염 입김 사이클 |

### 투석기 공격 시퀀스 (8프레임)

| 프레임 | 팔 swing | 이벤트 |
|--------|---------|--------|
| 0 | 0.0 | 팔 뒤로, 돌 장전 |
| 1 | 0.05 | 텐셔닝 |
| 2 | 0.6 | 발사! 모션라인 + 먼지 |
| 3 | 1.0 | 팔 최대 스윙, 돌 포물선 시작 |
| 4 | 0.9 | 돌 비행 중 |
| 5 | 0.4 | 돌 착탄 직전 |
| 6 | 0.15 | 착탄 폭발 + 파편 |
| 7 | 0.0 | 복귀, 먼지 가라앉음 |

### 타워 fire 애니메이션 렌더링

```
공격 시:
1. towerSprite.setVisible(false)  — 정적 이미지 숨김
2. effect sprite 생성 → fire spritesheet 재생
3. ANIMATION_COMPLETE → effect.destroy() + towerSprite.setVisible(true)
4. DESTROY fallback → towerSprite가 active이면 visible 복구
```

### 발사체 스타일 분기

```typescript
// TowerSystem.attackLines에 style 필드 추가
style: hasSplash(special) ? 'arc' : 'beam'

// arc: 포물선 궤적 + 돌 sprite + trail dots
// beam: 직선 레이저 (기존)
// impact flash는 beam에서만 (arc는 착탄 VFX로 대체)
```

### 투석기 사운드 3단계

```
0ms:  brown noise 40ms, lowpass 300Hz  — 발사 충격 (퍽!)
30ms: white noise 60ms, bandpass 600Hz — 비행 (휘이~)
80ms: brown noise 50ms, lowpass 200Hz  — 착탄 (쿵!)
```

## 보스 idle 애니메이션

| 요소 | 모션 |
|------|------|
| 몸통 | breathScale: 1 ± 0.03 (수축/팽창) |
| 날개 | wingFlap: ±4×scale px |
| 머리 | headBob: sin(phase×2)×scale |
| 비늘 | 8개 점 회전 (phase×0.2) |
| 화염 오라 | auraPulse: 0.15 ± 0.1 |
| rage 틴트 | applyColorTint(fireRed, 0.25) per-frame 절대좌표 |

## 검증 방법

1. `bun run generate:assets` — 167 에셋 정상 생성
2. `bun run test` — 339 tests 통과
3. 브라우저에서 유닛 걷기, 타워 공격, 보스 idle 육안 확인
4. 투석기 발사체 포물선 궤적 + 사운드 3단계 확인

## 포기한 접근

### ComfyUI AI 생성

DreamShaper 8 + AnimateDiff로 시도했으나:
- 픽셀아트가 아닌 노이즈 패턴 생성
- 배경 투명화 실패
- AnimateDiff 프레임이 미세한 노이즈 변형일 뿐 실제 포즈 변화 없음
- 결론: SD 기반 모델은 게임용 픽셀아트 스프라이트에 부적합

harness 코드(`scripts/comfyui-harness/`)는 구축 후 제거. 스펙 문서만 보존.

/**
 * 랜드마크별 CSS 파티클 효과. transform/opacity만 사용.
 * `ambientFxKind`는 UI 시각 태그일 뿐 `systems/world-gimmicks/`(#113)와 별개.
 */

import { UI_COLORS } from '@gld/shared';
import type { CSSProperties } from 'react';
import type { AmbientFxKind } from './WorldLayout';

type Props = {
	kind: AmbientFxKind;
	/** 랜드마크 이미지 너비(96px)와 맞춰 위치 산정 */
	size?: number;
};

type Particle = {
	left: number; // -size/2 ~ +size/2
	top: number; // 0 = 랜드마크 상단
	delay: number;
	drift: number; // horizontal drift
	scale?: number;
	color: string;
	className: string;
	shape?: 'circle' | 'square';
};

function makeParticleStyle(p: Particle, size: number): CSSProperties {
	return {
		position: 'absolute',
		left: `${size / 2 + p.left}px`,
		top: `${p.top}px`,
		width: `${(p.scale ?? 1) * 4}px`,
		height: `${(p.scale ?? 1) * 4}px`,
		backgroundColor: p.color,
		borderRadius: p.shape === 'square' ? 0 : '50%',
		animationDelay: `${p.delay}s`,
		// CSS 변수로 wm-particle-rise/wm-smoke-float의 drift 제어
		['--wm-drift' as string]: `${p.drift}px`,
		pointerEvents: 'none',
		imageRendering: 'pixelated',
	};
}

function forest(): Particle[] {
	return [
		{
			left: -18,
			top: 8,
			delay: 0,
			drift: -6,
			color: UI_COLORS.success,
			className: 'wm-particle',
		},
		{
			left: 4,
			top: 14,
			delay: 0.6,
			drift: 4,
			color: UI_COLORS.success,
			className: 'wm-particle',
		},
		{
			left: 22,
			top: 4,
			delay: 1.2,
			drift: 6,
			color: '#8ada60',
			className: 'wm-particle',
		},
		{
			left: -6,
			top: 20,
			delay: 1.8,
			drift: -4,
			color: '#8ada60',
			className: 'wm-particle',
		},
		{
			left: 14,
			top: 26,
			delay: 2.3,
			drift: 2,
			color: UI_COLORS.success,
			className: 'wm-particle',
		},
	];
}

function lava(): Particle[] {
	return [
		{
			left: -14,
			top: 4,
			delay: 0,
			drift: 4,
			scale: 2.5,
			color: UI_COLORS.danger,
			className: 'wm-smoke',
		},
		{
			left: 6,
			top: 10,
			delay: 0.8,
			drift: -3,
			scale: 3,
			color: UI_COLORS.bossPhase1,
			className: 'wm-smoke',
		},
		{
			left: 20,
			top: 0,
			delay: 1.6,
			drift: 5,
			scale: 2,
			color: UI_COLORS.danger,
			className: 'wm-smoke',
		},
		{
			left: -2,
			top: 16,
			delay: 2.2,
			drift: 2,
			scale: 2.8,
			color: UI_COLORS.bossPhase1,
			className: 'wm-smoke',
		},
	];
}

function storm(): Particle[] {
	return [
		{
			left: -20,
			top: 10,
			delay: 0,
			drift: 0,
			scale: 2,
			color: UI_COLORS.info,
			className: 'wm-electric',
		},
		{
			left: 12,
			top: 4,
			delay: 0.4,
			drift: 0,
			scale: 1.5,
			color: '#a8def0',
			className: 'wm-electric',
		},
		{
			left: 24,
			top: 18,
			delay: 0.9,
			drift: 0,
			scale: 1.8,
			color: UI_COLORS.info,
			className: 'wm-electric',
		},
		{
			left: -8,
			top: 22,
			delay: 1.3,
			drift: 0,
			scale: 1.2,
			color: '#a8def0',
			className: 'wm-electric',
		},
	];
}

function crypt(): Particle[] {
	return [
		{
			left: -16,
			top: 20,
			delay: 0,
			drift: -2,
			scale: 2,
			color: UI_COLORS.gradeUnique,
			className: 'wm-smoke',
		},
		{
			left: 12,
			top: 24,
			delay: 1.0,
			drift: 3,
			scale: 1.8,
			color: UI_COLORS.gradeUnique,
			className: 'wm-smoke',
		},
		{
			left: 0,
			top: 30,
			delay: 1.8,
			drift: 0,
			scale: 2.2,
			color: '#c8a0f0',
			className: 'wm-smoke',
		},
	];
}

function plague(): Particle[] {
	return [
		{
			left: -18,
			top: 10,
			delay: 0,
			drift: -4,
			scale: 2.2,
			color: UI_COLORS.bossPhase1,
			className: 'wm-smoke',
		},
		{
			left: 10,
			top: 16,
			delay: 0.8,
			drift: 4,
			scale: 2.5,
			color: UI_COLORS.bossPhase1,
			className: 'wm-smoke',
		},
		{
			left: 20,
			top: 4,
			delay: 1.6,
			drift: 2,
			scale: 1.8,
			color: '#e09060',
			className: 'wm-smoke',
		},
	];
}

function throne(): Particle[] {
	return [
		{
			left: -12,
			top: 6,
			delay: 0,
			drift: 0,
			scale: 1.2,
			color: UI_COLORS.gold,
			className: 'wm-particle',
			shape: 'square',
		},
		{
			left: 0,
			top: 12,
			delay: 0.5,
			drift: 2,
			scale: 1,
			color: UI_COLORS.tierBright,
			className: 'wm-particle',
			shape: 'square',
		},
		{
			left: 14,
			top: 4,
			delay: 1.0,
			drift: -2,
			scale: 1.2,
			color: UI_COLORS.gold,
			className: 'wm-particle',
			shape: 'square',
		},
		{
			left: -4,
			top: 18,
			delay: 1.5,
			drift: 0,
			scale: 1,
			color: UI_COLORS.tierBright,
			className: 'wm-particle',
			shape: 'square',
		},
		{
			left: 20,
			top: 14,
			delay: 2.0,
			drift: 3,
			scale: 1.2,
			color: UI_COLORS.gold,
			className: 'wm-particle',
			shape: 'square',
		},
	];
}

/** 정적 데이터 — 렌더마다 재생성 방지를 위해 모듈 레벨에서 1회만 호출 */
const PARTICLES: Record<AmbientFxKind, Particle[]> = {
	forest: forest(),
	lava: lava(),
	storm: storm(),
	crypt: crypt(),
	plague: plague(),
	throne: throne(),
};

export function AmbientFx({ kind, size = 96 }: Props) {
	const particles = PARTICLES[kind];
	return (
		<div
			aria-hidden
			className="pointer-events-none absolute inset-0"
			style={{ width: `${size}px`, height: `${size}px` }}
		>
			{particles.map((p, i) => (
				<span
					key={`${kind}-${i}`}
					className={p.className}
					style={makeParticleStyle(p, size)}
				/>
			))}
		</div>
	);
}

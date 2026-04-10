import type { TowerGrade } from '@gld/shared';
import { useEffect, useRef, useState } from 'react';

interface Props {
	toGrade: TowerGrade;
	towerId: string;
	onDone: () => void;
}

const GRADE_COLOR: Record<TowerGrade, string> = {
	normal: '#94a3b8',
	rare: '#2dd4bf',
	unique: '#a855f7',
	epic: '#fde68a',
};

export function GradePromotionOverlay({ toGrade, towerId, onDone }: Props) {
	const [phase, setPhase] = useState<'enter' | 'flash' | 'reveal' | 'exit'>(
		'enter',
	);

	// Stabilize onDone so parent re-renders don't restart the animation sequence.
	const onDoneRef = useRef(onDone);
	onDoneRef.current = onDone;

	const prefersReducedMotion =
		typeof window !== 'undefined' &&
		typeof window.matchMedia === 'function' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	useEffect(() => {
		if (prefersReducedMotion) {
			setPhase('reveal');
			const t = setTimeout(() => onDoneRef.current(), 400);
			return () => clearTimeout(t);
		}
		const t1 = setTimeout(() => setPhase('flash'), 150);
		const t2 = setTimeout(() => setPhase('reveal'), 450);
		const t3 = setTimeout(() => setPhase('exit'), 1000);
		const t4 = setTimeout(() => onDoneRef.current(), 1300);
		return () => {
			clearTimeout(t1);
			clearTimeout(t2);
			clearTimeout(t3);
			clearTimeout(t4);
		};
	}, [prefersReducedMotion]);

	const spriteSrc =
		toGrade === 'normal'
			? `/assets/towers/${towerId}.png`
			: `/assets/towers/${towerId}-${toGrade}.png`;

	const color = GRADE_COLOR[toGrade];

	return (
		<div
			className="fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-300"
			style={{
				backgroundColor: 'rgba(0,0,0,0.6)',
				opacity: phase === 'exit' ? 0 : 1,
			}}
		>
			{/* Flash */}
			<div
				className="absolute inset-0 transition-opacity duration-150"
				style={{
					background: `radial-gradient(circle, ${color}cc, transparent 60%)`,
					opacity: phase === 'flash' ? 1 : 0,
				}}
			/>
			{/* Sprite reveal */}
			<img
				src={spriteSrc}
				alt=""
				className="relative transition-all duration-500 ease-out"
				style={{
					imageRendering: 'pixelated',
					width: 256,
					height: 320,
					transform:
						phase === 'reveal' || phase === 'exit'
							? 'scale(1) rotate(0deg)'
							: 'scale(0.4) rotate(-8deg)',
					opacity: phase === 'enter' ? 0 : 1,
					filter: `drop-shadow(0 0 32px ${color})`,
				}}
			/>
			{/* Particles */}
			{phase !== 'enter' &&
				Array.from({ length: 16 }).map((_, i) => (
					<span
						key={i}
						className="absolute rounded-full"
						style={{
							width: 4,
							height: 4,
							background: color,
							transform: `translate(${Math.cos((i / 16) * Math.PI * 2) * 140}px, ${Math.sin((i / 16) * Math.PI * 2) * 140}px)`,
							transition: 'transform 900ms ease-out, opacity 900ms ease-out',
							opacity: phase === 'reveal' || phase === 'exit' ? 0 : 1,
						}}
					/>
				))}
		</div>
	);
}

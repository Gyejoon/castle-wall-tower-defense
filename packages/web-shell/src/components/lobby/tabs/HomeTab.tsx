import { core, surface } from '@gld/shared';
import type { CSSProperties } from 'react';
import { useGameStore } from '../../../stores/gameStore';
import { Button } from '../../ds';

/**
 * 정식 모드 lobby home — "Option C · Cinematic keyart" redesign.
 *
 * Visual language transplanted from the Claude Design prototype
 * (Home Prototype C). The game is 정식 모드 only, so the prototype's
 * left rail (world progress / event), right rail (missions / shop / mail),
 * and deck preview have been dropped. Kept:
 *   - fullscreen cinematic keyart (moon, stars, castle silhouette,
 *     torches, fog) — purely decorative, aria-hidden
 *   - NEXT UP CTA card floating over the keyart with a pulsing 전투 시작
 *     button
 *
 * 메타 강화 entry moved to the 전쟁탁자 (CollectionTab) header so this tab
 * stays focused on a single CTA.
 *
 * Top chrome (avatar / level / resources) is rendered by ProfileBar
 * above this tab; BottomTabBar renders below. We only own the tab panel.
 */

// core.gold + alpha hex (40% = 0x66, 20% = 0x33)
const CORNER_COLOR = `${core.gold}66`;
const STAR_UNFILLED_COLOR = `${core.gold}33`;

const cornerBase: CSSProperties = {
	position: 'absolute',
	width: 10,
	height: 10,
	borderColor: CORNER_COLOR,
	borderStyle: 'solid',
	pointerEvents: 'none',
};

function Corners() {
	const inset = 3;
	return (
		<>
			<div
				style={{
					...cornerBase,
					top: inset,
					left: inset,
					borderWidth: '2px 0 0 2px',
				}}
			/>
			<div
				style={{
					...cornerBase,
					top: inset,
					right: inset,
					borderWidth: '2px 2px 0 0',
				}}
			/>
			<div
				style={{
					...cornerBase,
					bottom: inset,
					left: inset,
					borderWidth: '0 0 2px 2px',
				}}
			/>
			<div
				style={{
					...cornerBase,
					bottom: inset,
					right: inset,
					borderWidth: '0 2px 2px 0',
				}}
			/>
		</>
	);
}

function Keyart() {
	const torches = [0, 1, 2, 3, 4];
	return (
		<div
			aria-hidden="true"
			className="absolute inset-0 overflow-hidden pointer-events-none"
		>
			{/* Sky gradient */}
			<div
				className="absolute inset-0"
				style={{
					background:
						'linear-gradient(180deg,#1a1028 0%,#2a1a18 40%,#1a1208 70%,#0a0604 100%)',
				}}
			/>
			{/* Moon */}
			<div
				className="absolute"
				style={{
					top: '10%',
					right: '18%',
					width: 78,
					height: 78,
					borderRadius: '50%',
					background:
						'radial-gradient(circle at 35% 30%,#fff8d0,#f0d060 70%,#a07020)',
					boxShadow:
						'0 0 100px rgba(240,208,96,0.33), 0 0 40px rgba(240,208,96,0.53)',
				}}
			/>
			{/* Stars */}
			<div
				className="absolute inset-0"
				style={{
					opacity: 0.9,
					backgroundImage: [
						'radial-gradient(1.5px 1.5px at 12% 14%, #fff, transparent)',
						'radial-gradient(1px 1px at 28% 6%, rgba(255,255,255,0.7), transparent)',
						'radial-gradient(1px 1px at 54% 22%, rgba(255,255,255,0.5), transparent)',
						'radial-gradient(1.5px 1.5px at 72% 10%, #fff, transparent)',
						'radial-gradient(1px 1px at 88% 28%, #f0d060, transparent)',
						'radial-gradient(1px 1px at 40% 32%, rgba(255,255,255,0.4), transparent)',
					].join(','),
				}}
			/>
			{/* Distant mountains */}
			<div
				className="absolute left-0 right-0"
				style={{
					top: '38%',
					height: '24%',
					background: '#1a1218',
					opacity: 0.7,
					clipPath:
						'polygon(0 100%, 0 55%, 10% 40%, 20% 55%, 30% 25%, 40% 50%, 55% 20%, 68% 45%, 80% 30%, 92% 55%, 100% 40%, 100% 100%)',
				}}
			/>
			{/* Ground */}
			<div
				className="absolute left-0 right-0 bottom-0"
				style={{
					height: '34%',
					background:
						'linear-gradient(180deg,#0a0604 0%,#1a1208 30%,#2a2010 100%)',
				}}
			/>

			{/* Castle silhouette */}
			<div
				className="absolute"
				style={{
					left: '50%',
					bottom: '30%',
					transform: 'translateX(-50%)',
					width: 280,
					height: 200,
				}}
			>
				{/* Center keep */}
				<div
					className="absolute"
					style={{
						left: '50%',
						bottom: 0,
						transform: 'translateX(-50%)',
						width: 80,
						height: 160,
						background: '#0a0604',
						clipPath:
							'polygon(0 100%, 0 15%, 15% 15%, 15% 0, 40% 0, 40% 15%, 60% 15%, 60% 0, 85% 0, 85% 15%, 100% 15%, 100% 100%)',
					}}
				/>
				{/* Left tower */}
				<div
					className="absolute"
					style={{
						left: '2%',
						bottom: 0,
						width: 54,
						height: 130,
						background: '#0a0604',
						clipPath:
							'polygon(0 100%, 0 18%, 20% 18%, 20% 0, 45% 0, 45% 18%, 55% 18%, 55% 0, 80% 0, 80% 18%, 100% 18%, 100% 100%)',
					}}
				/>
				{/* Right tower */}
				<div
					className="absolute"
					style={{
						right: '2%',
						bottom: 0,
						width: 54,
						height: 140,
						background: '#0a0604',
						clipPath:
							'polygon(0 100%, 0 18%, 20% 18%, 20% 0, 45% 0, 45% 18%, 55% 18%, 55% 0, 80% 0, 80% 18%, 100% 18%, 100% 100%)',
					}}
				/>
				{/* Wall */}
				<div
					className="absolute"
					style={{
						left: '8%',
						right: '8%',
						bottom: 0,
						height: 70,
						background: '#0a0604',
					}}
				/>
				{/* Flag pole */}
				<div
					className="absolute"
					style={{
						left: '50%',
						bottom: 160,
						transform: 'translateX(-1px)',
						width: 2,
						height: 20,
						background: '#0a0604',
					}}
				/>
				{/* Flag */}
				<div
					className="absolute keyart-flag"
					style={{
						left: 'calc(50% + 1px)',
						bottom: 168,
						width: 16,
						height: 12,
						background: 'var(--color-danger)',
					}}
				/>
				{/* Lit windows */}
				<div
					className="absolute"
					style={{
						left: '50%',
						bottom: 40,
						transform: 'translateX(-50%)',
						width: 10,
						height: 14,
						background: 'var(--color-gold)',
						boxShadow: '0 0 24px var(--color-gold), 0 0 10px var(--color-gold)',
						opacity: 0.95,
					}}
				/>
				<div
					className="absolute"
					style={{
						left: '12%',
						bottom: 50,
						width: 6,
						height: 8,
						background: 'var(--color-gold)',
						boxShadow: '0 0 14px var(--color-gold)',
						opacity: 0.85,
					}}
				/>
				<div
					className="absolute"
					style={{
						right: '12%',
						bottom: 60,
						width: 6,
						height: 8,
						background: 'var(--color-gold)',
						boxShadow: '0 0 14px var(--color-gold)',
						opacity: 0.85,
					}}
				/>
			</div>

			{/* Torches along wall */}
			{torches.map((i) => (
				<div
					key={i}
					className="absolute keyart-torch"
					style={{
						left: `${18 + i * 15}%`,
						bottom: '12%',
						width: 8,
						height: 12,
						background: 'var(--color-danger)',
						boxShadow:
							'0 0 10px var(--color-danger), 0 -6px 16px rgba(255,140,60,0.9)',
						opacity: 0.9,
						animationDelay: `${i * 0.2}s`,
					}}
				/>
			))}

			{/* Ambient torch glows */}
			<div
				className="absolute keyart-torch"
				style={{
					left: '36%',
					bottom: '38%',
					width: 60,
					height: 60,
					borderRadius: '50%',
					background:
						'radial-gradient(circle, rgba(240,208,96,0.33), transparent 70%)',
				}}
			/>
			<div
				className="absolute keyart-torch"
				style={{
					right: '36%',
					bottom: '38%',
					width: 60,
					height: 60,
					borderRadius: '50%',
					background:
						'radial-gradient(circle, rgba(240,208,96,0.33), transparent 70%)',
					animationDuration: '1.8s',
				}}
			/>

			{/* Fog */}
			<div
				className="absolute left-0 right-0"
				style={{
					bottom: '18%',
					height: 60,
					background:
						'linear-gradient(180deg, transparent, rgba(200,160,74,0.15), transparent)',
					filter: 'blur(3px)',
				}}
			/>
		</div>
	);
}

function Star({ filled }: { filled: boolean }) {
	return (
		<span
			aria-hidden="true"
			style={{
				color: filled ? core.gold : STAR_UNFILLED_COLOR,
				fontSize: 11,
				textShadow: filled ? `0 0 6px ${core.gold}` : undefined,
				lineHeight: 1,
			}}
		>
			★
		</span>
	);
}

export function HomeTab() {
	const startGame = useGameStore((s) => s.startGame);

	return (
		<div
			id="tabpanel-home"
			role="tabpanel"
			aria-label="마당"
			className="relative flex-1 overflow-hidden flex flex-col"
			style={{ background: 'var(--color-bg)' }}
		>
			<Keyart />

			<div className="relative z-hud flex flex-col flex-1 min-h-0">
				{/* Title removed — keyart carries the brand; CTA card introduces
				    the run copy. Keeps the keep/moon/silhouette fully in view. */}

				{/* Spacer pushes the CTA card to the bottom */}
				<div className="flex-1" />

				{/* NEXT UP CTA card */}
				<div className="px-[14px] pb-[14px]">
					<div
						className="relative border-2 border-gold"
						style={{
							background: 'rgba(10,6,4,0.88)', // keyart용 의도된 혼합 톤 유지 (bg + 약간 어둡게)
							padding: '14px 16px',
							boxShadow: `0 10px 32px ${surface.alpha.overlay70}, 0 0 20px ${core.gold}33, inset 0 1px 0 ${core.gold}33`,
							backdropFilter: 'blur(6px)',
							WebkitBackdropFilter: 'blur(6px)',
						}}
					>
						<Corners />

						<div className="flex items-start gap-[10px]">
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-[6px]">
									<span
										className="font-pixel text-[10px] text-accent"
										style={{ letterSpacing: 2 }}
									>
										NEXT UP
									</span>
									<div className="flex gap-[2px]">
										<Star filled />
										<Star filled />
										<Star filled={false} />
									</div>
								</div>
								<div className="mt-1">
									<div
										className="font-pixel text-[20px] text-gold leading-tight"
										style={{
											textShadow: '0 3px 10px rgba(0,0,0,0.9)',
										}}
									>
										랜덤 합성 타워 디펜스
									</div>
								</div>
								<div className="mt-[4px]">
									<span className="font-pixel text-[10px] text-text-secondary">
										정식 모드 · 9×18 맵 · 소환 → 합성 → 보스
									</span>
								</div>
							</div>
							<Button
								variant="gold"
								size="lg"
								onClick={startGame}
								aria-label="전투 시작"
								className="pulse-cta flex-shrink-0"
							>
								<span aria-hidden="true">⚔</span>
								전투 시작
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

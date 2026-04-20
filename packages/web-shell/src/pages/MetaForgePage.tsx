import type { CSSProperties } from 'react';
import { PixelButton } from '../components/ui/PixelButton';
import { useGameStore } from '../stores/gameStore';
import { useMetaProgress } from '../stores/metaProgressStore';

/**
 * Phase 9.3 — Meta Forge page shell. Displays the current global atk%
 * boost and per-family perk counts. Aligned with the shared design system:
 * accent header band, PixelPanel surfaces with 4px offset shadow, Corners
 * decoration on the highlight card, and family-coloured perk tiles that
 * reuse the `FAMILY_COLOR` palette from towers.ts.
 *
 * Real perk-selection, currency, and upgrade-cost UX land in later phases.
 */

interface FamilyMeta {
	id: 'archer' | 'siege' | 'frost' | 'stun';
	label: string;
	icon: string;
	color: string;
}

// Mirrors FAMILY_COLOR in @gld/shared/constants/towers.ts for visual parity
// between the in-battle tower aura and the meta-forge perk tile border.
const FAMILIES: readonly FamilyMeta[] = [
	{ id: 'archer', label: '궁수', icon: '🏹', color: '#c8a04a' },
	{ id: 'siege', label: '공성', icon: '🪨', color: '#a87744' },
	{ id: 'frost', label: '서리', icon: '❄', color: '#5bc8e8' },
	{ id: 'stun', label: '성전', icon: '🛡', color: '#f0d060' },
];

function Corners({ color, inset = 3 }: { color: string; inset?: number }) {
	const size = 10;
	const thickness = 2;
	const base: CSSProperties = {
		position: 'absolute',
		width: size,
		height: size,
		borderColor: color,
		borderStyle: 'solid',
	};
	return (
		<>
			<span
				aria-hidden
				style={{
					...base,
					top: inset,
					left: inset,
					borderWidth: `${thickness}px 0 0 ${thickness}px`,
				}}
			/>
			<span
				aria-hidden
				style={{
					...base,
					top: inset,
					right: inset,
					borderWidth: `${thickness}px ${thickness}px 0 0`,
				}}
			/>
			<span
				aria-hidden
				style={{
					...base,
					bottom: inset,
					left: inset,
					borderWidth: `0 0 ${thickness}px ${thickness}px`,
				}}
			/>
			<span
				aria-hidden
				style={{
					...base,
					bottom: inset,
					right: inset,
					borderWidth: `0 ${thickness}px ${thickness}px 0`,
				}}
			/>
		</>
	);
}

export function MetaForgePage() {
	const globalAtkPct = useMetaProgress((s) => s.globalAtkPct);
	const familyPerks = useMetaProgress((s) => s.familyPerks);
	const permanentUpgrades = useMetaProgress((s) => s.permanentUpgrades);
	const exit = useGameStore((s) => s.enterLobby);

	const totalPerks = FAMILIES.reduce(
		(sum, f) => sum + familyPerks[f.id].length,
		0,
	);
	const totalUpgrades = Object.values(permanentUpgrades).reduce(
		(a, b) => a + b,
		0,
	);

	return (
		<div
			className="w-full h-full flex justify-center"
			style={{ background: 'var(--color-bg)' }}
		>
			<div
				className="w-full max-w-[430px] h-full flex flex-col"
				style={{ background: 'var(--color-bg)' }}
			>
				{/* Header band — accent tint with bottom border, mirrors GameOverScreen */}
				<div
					className="py-3 px-4 flex items-center justify-between"
					style={{
						background: 'rgba(200,160,74,0.14)',
						borderBottom: '1px solid var(--color-accent)',
					}}
				>
					<div className="flex items-center gap-2">
						<span className="font-pixel text-[18px] text-gold">⚒</span>
						<h2 className="font-pixel text-xl text-accent">메타 강화</h2>
					</div>
					<PixelButton
						variant="secondary"
						onClick={exit}
						style={{
							padding: '6px 14px',
							fontSize: '11px',
							boxShadow: '2px 2px 0px var(--color-text-secondary)',
						}}
					>
						‹ 마당
					</PixelButton>
				</div>

				{/* Summary strip */}
				<div
					className="px-4 py-2 flex items-center gap-4"
					style={{
						background: 'rgba(10,6,4,0.5)',
						borderBottom: '1px solid var(--color-border)',
					}}
				>
					<div className="flex flex-col">
						<span className="font-pixel text-[9px] uppercase tracking-[1px] text-text-secondary">
							총 퍽
						</span>
						<span className="font-pixel text-sm text-text">{totalPerks}개</span>
					</div>
					<div
						className="w-px self-stretch"
						style={{ background: 'var(--color-border)' }}
					/>
					<div className="flex flex-col">
						<span className="font-pixel text-[9px] uppercase tracking-[1px] text-text-secondary">
							영구 강화
						</span>
						<span className="font-pixel text-sm text-text">
							{totalUpgrades}회
						</span>
					</div>
				</div>

				{/* Scrollable body */}
				<div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-4">
					{/* Global atk% — headline card with Corners */}
					<div
						className="relative px-4 py-4"
						style={{
							background: 'var(--color-panel)',
							border: '2px solid var(--color-gold)',
							boxShadow:
								'4px 4px 0px var(--color-border), inset 0 1px 0 rgba(240,208,96,0.25)',
						}}
					>
						<Corners color="var(--color-gold)" />
						<div className="font-pixel text-[10px] uppercase tracking-[2px] text-accent">
							글로벌 강화
						</div>
						<div className="mt-2 flex items-baseline gap-2">
							<span
								className="font-pixel text-[36px] text-gold leading-none"
								style={{ textShadow: '0 2px 8px rgba(240,208,96,0.3)' }}
							>
								+{Math.round(globalAtkPct * 100)}%
							</span>
							<span className="font-pixel text-[11px] text-text-secondary">
								공격력
							</span>
						</div>
						<div className="mt-2 font-pixel text-[10px] text-text-secondary">
							모든 타워가 영구적으로 피해량 증가
						</div>
					</div>

					{/* Family perks — 2-col grid with per-family colour */}
					<div>
						<div className="font-pixel text-[10px] uppercase tracking-[2px] text-text-secondary mb-2">
							▸ 패밀리 퍽
						</div>
						<div className="grid grid-cols-2 gap-2">
							{FAMILIES.map((f) => {
								const count = familyPerks[f.id].length;
								return (
									<div
										key={f.id}
										className="relative px-3 py-3 flex flex-col gap-1"
										style={{
											background: 'var(--color-panel)',
											border: `2px solid ${f.color}`,
											boxShadow: `3px 3px 0px ${f.color}44, inset 0 1px 0 ${f.color}22`,
										}}
									>
										<div className="flex items-center gap-2">
											<span
												className="font-pixel text-[18px]"
												aria-hidden="true"
											>
												{f.icon}
											</span>
											<span
												className="font-pixel text-[11px] uppercase tracking-[1px]"
												style={{ color: f.color }}
											>
												{f.label}
											</span>
										</div>
										<div className="flex items-baseline gap-1">
											<span
												className="font-pixel text-[20px] leading-none"
												style={{ color: f.color }}
											>
												{count}
											</span>
											<span className="font-pixel text-[10px] text-text-secondary">
												퍽
											</span>
										</div>
									</div>
								);
							})}
						</div>
					</div>

					{/* Footer note */}
					<div
						className="mt-auto text-center py-3 px-4"
						style={{
							background: 'rgba(10,6,4,0.5)',
							border: '1px dashed var(--color-border)',
						}}
					>
						<div className="font-pixel text-[10px] text-text-secondary">
							⚙ 상시 강화 · 퍽 선택 UX 추후 추가 예정
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

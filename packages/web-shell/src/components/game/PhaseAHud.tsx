import { EventBus } from '@gld/phaser-game';
import { INGAME_GACHA, PHASE_A_SUMMON_COST } from '@gld/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { cn } from '../../utils/cn';
import { PauseModal } from './PauseModal';

/** Phase 8 redesign — basic summon + T2/T3/T4 gacha + menu in a fixed
 *  bottom action bar, plus compact info badges above for quick glance. */
const GACHA_TIERS = [2, 3, 4] as const;

export function PhaseAHud() {
	const pushToast = useGameStore((s) => s.pushToast);
	const energy = useGameStore((s) => s.energy);
	const wave = useGameStore((s) => s.wave);
	const lives = useGameStore((s) => s.lives);
	const summonCost = PHASE_A_SUMMON_COST;
	const canAfford = energy >= summonCost;

	const [paused, setPaused] = useState(false);
	// [F21] gacha "insufficient energy" flash — per-tier timer refs so
	//       overlapping flashes don't clobber each other.
	const [flashingTier, setFlashingTier] = useState<number | null>(null);
	const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const handleGachaInsufficient = (data: {
			targetTier: number;
			cost: number;
			have: number;
		}) => {
			if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
			setFlashingTier(data.targetTier);
			flashTimerRef.current = setTimeout(() => {
				setFlashingTier(null);
				flashTimerRef.current = null;
			}, 500);
			pushToast(
				`가챠 T${data.targetTier} 에너지 부족 (${data.have}/${data.cost})`,
				'warning',
			);
		};

		const handleSummonFailed = (data: { reason: string }) => {
			pushToast(`소환 실패: ${summonFailLabel(data.reason)}`, 'warning');
		};

		const handleMergeFailed = (data: { reason: string }) => {
			pushToast(`합성 실패: ${mergeFailLabel(data.reason)}`, 'warning');
		};

		const handleMoveFailed = () => {
			pushToast('이동 불가', 'warning');
		};

		const handleTowerMoved = () => {
			pushToast('타워 이동 완료', 'success');
		};

		EventBus.on('gacha-insufficient-energy', handleGachaInsufficient);
		EventBus.on('summon-failed', handleSummonFailed);
		EventBus.on('merge-failed', handleMergeFailed);
		EventBus.on('move-failed', handleMoveFailed);
		EventBus.on('tower-moved', handleTowerMoved);

		return () => {
			EventBus.off('gacha-insufficient-energy', handleGachaInsufficient);
			EventBus.off('summon-failed', handleSummonFailed);
			EventBus.off('merge-failed', handleMergeFailed);
			EventBus.off('move-failed', handleMoveFailed);
			EventBus.off('tower-moved', handleTowerMoved);
			if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
		};
	}, [pushToast]);

	const handleSummon = useCallback(() => {
		if (!canAfford) {
			pushToast('에너지 부족', 'warning');
			return;
		}
		EventBus.emit('request-summon-tower');
	}, [canAfford, pushToast]);

	const handleMenuOpen = useCallback(() => {
		setPaused(true);
		EventBus.emit('request-pause');
	}, []);

	const handleMenuClose = useCallback(() => {
		setPaused(false);
	}, []);

	return (
		<>
			<div
				data-testid="phase-a-hud"
				className="relative h-[110px] shrink-0"
				style={{ background: 'var(--color-bg-95)' }}
			>
				{/* Info badges — quick-glance ⚡ energy / W wave / 🛡 lives */}
				<div
					data-testid="phase-a-info-badges"
					className="absolute top-[8px] left-[8px] right-[8px] z-[1] flex items-center gap-2 pointer-events-none"
				>
					<InfoBadge testId="phase-a-badge-energy" icon="⚡" value={energy} />
					<InfoBadge testId="phase-a-badge-wave" icon="W" value={wave} />
					<InfoBadge testId="phase-a-badge-lives" icon="🛡" value={lives} />
				</div>

				{/* Bottom fixed action bar: summon (primary) + T2/T3/T4 + menu */}
				<div
					data-testid="phase-a-action-bar"
					className="absolute bottom-0 left-0 right-0 flex gap-1 px-2 border-t"
					style={{
						background: 'var(--color-bg-95)',
						borderColor: 'var(--color-border)',
						paddingTop: '36px',
						paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))',
					}}
				>
					<SummonButton
						disabled={!canAfford}
						cost={summonCost}
						onClick={handleSummon}
					/>
					{GACHA_TIERS.map((tier) => {
						const config = INGAME_GACHA[`tier${tier}` as const];
						const disabled = energy < config.cost;
						return (
							<GachaButton
								key={tier}
								tier={tier}
								cost={config.cost}
								rate={Math.round(config.successRate * 100)}
								disabled={disabled}
								flashing={flashingTier === tier}
								onClick={() =>
									EventBus.emit('request-gacha-summon', { targetTier: tier })
								}
							/>
						);
					})}
					<MenuButton onClick={handleMenuOpen} />
				</div>
			</div>
			<PauseModal open={paused} onResume={handleMenuClose} />
		</>
	);
}

interface InfoBadgeProps {
	testId: string;
	icon: string;
	value: number;
}

function InfoBadge({ testId, icon, value }: InfoBadgeProps) {
	return (
		<span
			data-testid={testId}
			className="font-pixel text-[10px] px-1.5 py-[1px] rounded-sm border"
			style={{
				background: 'var(--color-panel-85)',
				borderColor: 'var(--color-border)',
				color: 'var(--color-text)',
			}}
		>
			<span className="mr-1">{icon}</span>
			{value}
		</span>
	);
}

interface SummonButtonProps {
	disabled: boolean;
	cost: number;
	onClick: () => void;
}

function SummonButton({ disabled, cost, onClick }: SummonButtonProps) {
	return (
		<button
			type="button"
			data-testid="phase-a-summon-button"
			onClick={onClick}
			disabled={disabled}
			aria-disabled={disabled}
			className={cn(
				'flex-[2] h-[72px] border-2 flex flex-col items-center justify-center gap-0.5 font-pixel transition-transform',
				disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95',
			)}
			style={{
				background: disabled ? 'var(--color-panel)' : 'var(--color-accent-20)',
				borderColor: disabled ? 'var(--color-border)' : 'var(--color-gold)',
				color: disabled ? 'var(--color-text-secondary)' : 'var(--color-gold)',
			}}
		>
			<span className="text-[13px]">소환</span>
			<span className="text-[10px]">⚡{cost}</span>
		</button>
	);
}

interface GachaButtonProps {
	tier: number;
	cost: number;
	rate: number;
	disabled: boolean;
	flashing: boolean;
	onClick: () => void;
}

function GachaButton({
	tier,
	cost,
	rate,
	disabled,
	flashing,
	onClick,
}: GachaButtonProps) {
	return (
		<button
			type="button"
			data-testid={`phase-a-gacha-t${tier}`}
			onClick={onClick}
			disabled={disabled}
			aria-disabled={disabled}
			className={cn(
				'flex-1 h-[72px] border-2 flex flex-col items-center justify-center gap-0.5 font-pixel transition-transform',
				disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95',
			)}
			style={{
				background: flashing
					? 'var(--color-danger-20)'
					: disabled
						? 'var(--color-panel)'
						: 'var(--color-panel-95)',
				borderColor: flashing
					? 'var(--color-danger)'
					: disabled
						? 'var(--color-border)'
						: 'var(--color-accent)',
				color: flashing
					? 'var(--color-danger)'
					: disabled
						? 'var(--color-text-secondary)'
						: 'var(--color-accent)',
			}}
		>
			<span className="text-[12px]">T{tier}</span>
			<span className="text-[9px]">⚡{cost}</span>
			<span className="text-[9px] opacity-80">{rate}%</span>
		</button>
	);
}

interface MenuButtonProps {
	onClick: () => void;
}

function MenuButton({ onClick }: MenuButtonProps) {
	return (
		<button
			type="button"
			data-testid="phase-a-menu-button"
			onClick={onClick}
			aria-label="메뉴"
			className="w-[60px] h-[72px] border-2 flex items-center justify-center font-pixel text-[16px] active:scale-95 transition-transform"
			style={{
				background: 'var(--color-panel)',
				borderColor: 'var(--color-border)',
				color: 'var(--color-text-secondary)',
			}}
		>
			≡
		</button>
	);
}

function mergeFailLabel(reason: string): string {
	switch (reason) {
		case 'same-instance':
			return '같은 타워 선택됨';
		case 'incompatible-pair':
			return '다른 계열·단계 필요';
		case 'max-tier':
			return '최고 티어';
		case 'invalid-tile':
			return '잘못된 칸';
		default:
			return reason;
	}
}

function summonFailLabel(reason: string): string {
	switch (reason) {
		case 'insufficient-energy':
			return '에너지 부족';
		case 'no-empty-tile':
			return '빈 칸 없음';
		case 'placement-failed':
			return '배치 불가';
		default:
			return reason;
	}
}

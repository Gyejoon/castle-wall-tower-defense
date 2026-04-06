import {
	KST_OFFSET_MS,
	MISSION_LABELS,
	type MissionProgress,
} from '@gld/shared';
import { useEffect, useState } from 'react';
import { uiMobileArt } from '../../../assets/uiMobileArt';
import { useMetaStore } from '../../../stores/metaStore';
import { PixelButton } from '../../ui/PixelButton';
import { TabBackground } from '../TabBackground';

// 다음 KST 자정까지 남은 ms
function msToNextKSTMidnight(): number {
	const now = new Date();
	const nowKST = new Date(now.getTime() + KST_OFFSET_MS);
	const tomorrowKSTmidnight = new Date(
		Date.UTC(
			nowKST.getUTCFullYear(),
			nowKST.getUTCMonth(),
			nowKST.getUTCDate() + 1,
		),
	);
	return tomorrowKSTmidnight.getTime() - KST_OFFSET_MS - now.getTime();
}

// 다음 월요일 KST 자정까지 남은 ms
function msToNextKSTMonday(): number {
	const now = new Date();
	const nowKST = new Date(now.getTime() + KST_OFFSET_MS);
	const day = nowKST.getUTCDay();
	const daysUntilMonday = day === 0 ? 1 : 8 - day;
	const nextMondayKSTmidnight = new Date(
		Date.UTC(
			nowKST.getUTCFullYear(),
			nowKST.getUTCMonth(),
			nowKST.getUTCDate() + daysUntilMonday,
		),
	);
	return nextMondayKSTmidnight.getTime() - KST_OFFSET_MS - now.getTime();
}

function formatCountdown(ms: number): string {
	if (ms <= 0) return '리셋 중...';
	const totalSec = Math.floor(ms / 1000);
	const d = Math.floor(totalSec / 86400);
	const h = Math.floor((totalSec % 86400) / 3600);
	const m = Math.floor((totalSec % 3600) / 60);
	if (d > 0) return `${d}일 ${h}시 ${m}분 남음`;
	if (h > 0) return `${h}시 ${m}분 남음`;
	return `${m}분 남음`;
}

function useCountdown(getMsRemaining: () => number): string {
	const [display, setDisplay] = useState(() =>
		formatCountdown(getMsRemaining()),
	);
	useEffect(() => {
		const tick = () => setDisplay(formatCountdown(getMsRemaining()));
		const id = setInterval(tick, 60_000);
		return () => clearInterval(id);
	}, [getMsRemaining]);
	return display;
}

interface MissionCardProps {
	mission: MissionProgress;
	onClaim: (id: string, period: 'daily' | 'weekly') => void;
	period: 'daily' | 'weekly';
	isWeekly?: boolean;
}

function MissionCard({ mission, onClaim, period, isWeekly }: MissionCardProps) {
	const progress = Math.min(mission.current / mission.target, 1);
	const isReady = mission.current >= mission.target && !mission.claimed;

	return (
		<div
			className={`flex flex-col gap-2 p-3 border border-border ${isWeekly ? 'min-h-[80px]' : ''}`}
			style={{ background: 'rgba(26, 18, 8, 0.8)' }}
		>
			<div className="flex justify-between items-start gap-2">
				<span className="font-pixel text-xs text-text flex-1">
					{MISSION_LABELS[mission.type]}{' '}
					{mission.type === 'attendance'
						? `${mission.target}일`
						: mission.type === 'reach_wave'
							? `${mission.target}웨이브`
							: `${mission.target}회`}
				</span>
				<div className="flex items-center gap-1 shrink-0">
					<span className="font-pixel text-[11px] text-gold">
						{mission.reward.amount}
					</span>
					<span className="font-pixel text-[10px] text-text-secondary">
						{mission.reward.type === 'diamond' ? '💎' : '🪙'}
					</span>
				</div>
			</div>

			{/* 진행 바 */}
			<div className="w-full h-1.5 bg-border rounded-[1px] overflow-hidden">
				<div
					className="h-full bg-gold transition-[width] duration-300"
					style={{ width: `${progress * 100}%` }}
				/>
			</div>

			<div className="flex justify-between items-center">
				<span className="font-pixel text-[10px] text-text-secondary">
					{mission.current}/{mission.target}
				</span>
				{mission.claimed ? (
					<span className="font-pixel text-[10px] text-success">✓ 완료</span>
				) : (
					<PixelButton
						disabled={!isReady}
						onClick={() => onClaim(mission.id, period)}
						className="font-pixel text-[10px] px-2 py-1"
					>
						수령
					</PixelButton>
				)}
			</div>
		</div>
	);
}

interface MissionSectionProps {
	title: string;
	missions: MissionProgress[];
	period: 'daily' | 'weekly';
	countdown: string;
	onClaim: (id: string, period: 'daily' | 'weekly') => void;
	isWeekly?: boolean;
}

function MissionSection({
	title,
	missions,
	period,
	countdown,
	onClaim,
	isWeekly,
}: MissionSectionProps) {
	const allClaimed = missions.length > 0 && missions.every((m) => m.claimed);

	return (
		<div
			className="flex flex-col gap-px border border-border"
			style={{ background: 'rgba(42, 32, 16, 0.7)' }}
		>
			{/* 헤더 */}
			<div
				className="flex justify-between items-center px-3 py-2"
				style={{
					background: isWeekly
						? 'rgba(42, 32, 16, 0.9)'
						: 'rgba(80, 50, 10, 0.9)',
				}}
			>
				<span
					className={`font-pixel text-[11px] ${isWeekly ? 'text-text-secondary' : 'text-accent'}`}
				>
					{title}
				</span>
				<span className="font-pixel text-[10px] text-text-secondary">
					{countdown}
				</span>
			</div>

			{/* 전부 완료 상태 */}
			{allClaimed ? (
				<div
					className="flex flex-col items-center justify-center py-6 gap-2"
					style={{ background: 'rgba(26, 18, 8, 0.8)' }}
				>
					<span className="font-pixel text-lg text-gold">✓</span>
					<span className="font-pixel text-xs text-success">
						{isWeekly ? '이번 주 임무 완료!' : '오늘의 임무 완료!'}
					</span>
				</div>
			) : (
				<div
					className={`flex flex-col gap-px ${isWeekly ? 'gap-2 p-2' : 'gap-px'}`}
				>
					{missions.map((m) => (
						<MissionCard
							key={m.id}
							mission={m}
							onClaim={onClaim}
							period={period}
							isWeekly={isWeekly}
						/>
					))}
				</div>
			)}
		</div>
	);
}

export function MissionsTab() {
	const dailyMissions = useMetaStore((s) => s.progress.dailyMissions);
	const weeklyMissions = useMetaStore((s) => s.progress.weeklyMissions);
	const claimMission = useMetaStore((s) => s.claimMission);

	const dailyCountdown = useCountdown(msToNextKSTMidnight);
	const weeklyCountdown = useCountdown(msToNextKSTMonday);

	return (
		<div
			id="tabpanel-missions"
			role="tabpanel"
			aria-label="임무"
			className="relative flex-1 overflow-hidden flex flex-col"
		>
			<TabBackground
				src={uiMobileArt.lordchamberBg}
				gradient="linear-gradient(180deg, #1a1208 0%, #2a1a10 100%)"
				overlayOpacity={0.25}
			/>
			<div className="relative z-[1] flex-1 overflow-auto p-4 flex flex-col gap-4">
				<span className="font-pixel text-sm text-text">임무</span>

				<MissionSection
					title="일일 임무"
					missions={dailyMissions}
					period="daily"
					countdown={dailyCountdown}
					onClaim={claimMission}
					isWeekly={false}
				/>

				<MissionSection
					title="주간 임무"
					missions={weeklyMissions}
					period="weekly"
					countdown={weeklyCountdown}
					onClaim={claimMission}
					isWeekly={true}
				/>
			</div>
		</div>
	);
}

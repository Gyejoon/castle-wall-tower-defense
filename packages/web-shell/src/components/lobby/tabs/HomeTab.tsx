import {
	getStageById,
	getTotalWavesForStage,
	isStageUnlocked,
	STAGE_ORDER,
	type StarRating,
	WORLD_ORDER,
	WORLDS,
} from '@gld/shared';
import { uiMobileArt } from '../../../assets/uiMobileArt';
import { useGameStore } from '../../../stores/gameStore';
import { useMetaStore } from '../../../stores/metaStore';
import { PixelButton } from '../../ui/PixelButton';
import { FloatingNavButtons } from '../FloatingNavButtons';

const MAP_THUMBS: Record<string, string> = {
	w1_forest_a: 'assets/ui/stage-thumb-forest_gate.webp',
	w1_forest_b: 'assets/ui/stage-thumb-forest_gate.webp',
	w2_forge_a: 'assets/ui/stage-thumb-lava_fortress.webp',
	w2_forge_b: 'assets/ui/stage-thumb-lava_fortress.webp',
	w3_tower_a: 'assets/ui/stage-thumb-storm_citadel.webp',
	w3_tower_b: 'assets/ui/stage-thumb-storm_citadel.webp',
};

function getNextStage(stageStars: Record<string, StarRating>): {
	stageId: string;
	worldNum: number;
	stageNum: number;
	name: string;
	mapId: string;
	totalWaves: number;
	cleared: boolean;
} | null {
	for (const stageId of STAGE_ORDER) {
		if (!isStageUnlocked(stageId, stageStars)) continue;
		const stage = getStageById(stageId);
		const cleared = (stageStars[stageId] ?? 0) >= 1;
		if (!cleared) {
			const worldNum = WORLD_ORDER.indexOf(stage.worldId) + 1;
			return {
				stageId,
				worldNum,
				stageNum: stage.stageNumber,
				name: stage.name,
				mapId: stage.mapId,
				totalWaves: getTotalWavesForStage(stage.waveSetId),
				cleared: false,
			};
		}
	}
	const lastId = STAGE_ORDER[STAGE_ORDER.length - 1];
	const last = getStageById(lastId);
	const worldNum = WORLD_ORDER.indexOf(last.worldId) + 1;
	return {
		stageId: lastId,
		worldNum,
		stageNum: last.stageNumber,
		name: last.name,
		mapId: last.mapId,
		totalWaves: getTotalWavesForStage(last.waveSetId),
		cleared: true,
	};
}

export function HomeTab() {
	const enterStageSelect = useGameStore((s) => s.enterStageSelect);
	const enterStageDetail = useGameStore((s) => s.enterStageDetail);
	const stageStars = useMetaStore((s) => s.progress.stageStars);
	const next = getNextStage(stageStars);
	const worldName = next
		? (WORLDS[getStageById(next.stageId).worldId]?.name ?? '')
		: '';
	const thumb = next ? (MAP_THUMBS[next.mapId] ?? '') : '';

	return (
		<div
			id="tabpanel-home"
			role="tabpanel"
			aria-label="마당"
			className="relative flex-1 overflow-hidden flex flex-col"
			style={{ background: '#1a1208' }}
		>
			{/* Background: stage thumbnail as full bleed */}
			{thumb && (
				<>
					<img
						src={thumb}
						alt=""
						className="absolute inset-0 w-full h-full object-cover opacity-30"
					/>
					<div
						className="absolute inset-0"
						style={{
							background:
								'linear-gradient(180deg, rgba(26,18,8,0.6) 0%, rgba(26,18,8,0.4) 40%, rgba(26,18,8,0.9) 75%, #1a1208 100%)',
						}}
					/>
				</>
			)}

			{/* Floating mission/achievement buttons */}
			<FloatingNavButtons />

			{/* Content */}
			<div className="relative z-[1] flex flex-col items-center justify-center flex-1 px-5 gap-4">
				{/* World label */}
				{next && (
					<span className="font-pixel text-[12px] text-accent tracking-wider uppercase">
						{worldName}
					</span>
				)}

				{/* Stage card */}
				{next && (
					<div
						className="relative w-full max-w-[300px] border-2 border-border"
						style={{
							background: 'rgba(26, 18, 8, 0.85)',
							boxShadow:
								'0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
						}}
					>
						{/* Corner brackets */}
						<div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-gold/40 z-10" />
						<div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-gold/40 z-10" />
						<div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-gold/40 z-10" />
						<div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-gold/40 z-10" />

						{/* Thumbnail */}
						{thumb && (
							<div className="relative h-[130px] overflow-hidden">
								<img
									src={thumb}
									alt=""
									className="w-full h-full object-cover"
								/>
								<div
									className="absolute inset-0"
									style={{
										background:
											'linear-gradient(to bottom, transparent 40%, rgba(26,18,8,0.95) 100%)',
									}}
								/>
							</div>
						)}

						{/* Stage info */}
						<div className="px-4 py-3 -mt-8 relative">
							<p className="font-pixel text-[20px] text-gold drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
								{next.worldNum}-{next.stageNum}. {next.name}
							</p>
							<p className="font-pixel text-[11px] text-text-secondary mt-1.5">
								웨이브 {next.totalWaves}
								{next.cleared ? ' · 클리어 완료' : ''}
							</p>
						</div>
					</div>
				)}

				{/* Buttons */}
				<div className="w-full max-w-[300px] flex gap-2">
					<PixelButton
						variant="gold"
						onClick={() =>
							next ? enterStageDetail(next.stageId) : enterStageSelect()
						}
						style={{
							flex: 1,
							padding: '16px 20px',
							fontSize: '16px',
						}}
					>
						<span className="inline-flex items-center gap-2">
							<img
								src="assets/ui/icon-sword.webp"
								alt=""
								width={18}
								height={18}
								className="[image-rendering:pixelated]"
							/>
							{next?.cleared ? '재도전' : '시작'}
						</span>
					</PixelButton>
					<PixelButton
						variant="secondary"
						onClick={() => enterStageSelect()}
						style={{
							padding: '16px 14px',
							fontSize: '13px',
						}}
					>
						월드
					</PixelButton>
				</div>
			</div>
		</div>
	);
}

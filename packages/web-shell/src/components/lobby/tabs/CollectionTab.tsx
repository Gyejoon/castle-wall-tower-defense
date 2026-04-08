import { ALL_TOWERS, type TowerDef } from '@gld/shared';
import { lazy, Suspense, useMemo, useState } from 'react';
import { uiMobileArt } from '../../../assets/uiMobileArt';
import { useGameStore } from '../../../stores/gameStore';
import { useMetaStore } from '../../../stores/metaStore';

const GachaScreen = lazy(() =>
	import('../../GachaScreen').then((m) => ({ default: m.GachaScreen })),
);
const DeckEditSheet = lazy(() =>
	import('../DeckEditSheet').then((m) => ({ default: m.DeckEditSheet })),
);

import { PixelButton } from '../../ui/PixelButton';
import { TabBackground } from '../TabBackground';
import { EmptyState } from './collection/EmptyState';
import { TowerBottomSheet } from './collection/TowerBottomSheet';
import { TowerGridCard } from './collection/TowerGridCard';

export function CollectionTab() {
	const [selectedDef, setSelectedDef] = useState<TowerDef | null>(null);
	const [showGacha, setShowGacha] = useState(false);
	const [showDeckEdit, setShowDeckEdit] = useState(false);
	const selectedDeck = useGameStore((s) => s.selectedDeck);
	const collection = useMetaStore((s) => s.collection);
	const ownedIds = useMemo(
		() => new Set(collection.map((t) => t.defId)),
		[collection],
	);

	const ownedTowers = ALL_TOWERS.filter((t) => ownedIds.has(t.id));
	const lockedTowers = ALL_TOWERS.filter((t) => !ownedIds.has(t.id));

	return (
		<div
			id="tabpanel-collection"
			role="tabpanel"
			aria-label="전쟁탁자"
			className="relative flex flex-1 flex-col overflow-hidden"
		>
			<TabBackground
				src={uiMobileArt.wartableBg}
				gradient="linear-gradient(180deg, #2a2010 0%, #1a1208 100%)"
				overlayOpacity={0.3}
			/>

			<div className="relative z-[1] flex flex-1 flex-col gap-3 overflow-auto p-3">
				{/* 출전 덱 */}
				<div>
					<div className="flex items-center justify-between mb-2">
						<span className="font-pixel text-sm text-text">출전 덱</span>
						<button
							type="button"
							className="font-pixel text-[10px] text-accent bg-panel border border-border px-2 py-0.5 cursor-pointer hover:text-gold transition-colors"
							onClick={() => setShowDeckEdit(true)}
						>
							<span className="inline-flex items-center gap-1">
								<img
									src="assets/ui/icon-edit.webp"
									alt=""
									width={10}
									height={10}
									className="[image-rendering:pixelated]"
								/>
								편집
							</span>
						</button>
					</div>
					<div className="flex gap-1.5">
						{selectedDeck.map((id) => {
							const tower = ALL_TOWERS.find((t) => t.id === id);
							if (!tower) return null;
							return (
								<div
									key={id}
									className="flex-1 bg-panel border border-border p-1.5 flex flex-col items-center gap-1"
								>
									<img
										src={`assets/towers/${tower.type}.webp`}
										alt={tower.name}
										width={32}
										height={32}
										className="[image-rendering:pixelated]"
									/>
									<span className="font-pixel text-[8px] text-text-secondary text-center overflow-hidden max-w-full whitespace-nowrap text-ellipsis">
										{tower.name}
									</span>
									<span className="font-pixel text-[9px] text-accent inline-flex items-center gap-[2px]">
										<img
											src="assets/ui/icon-energy.webp"
											alt=""
											width={10}
											height={10}
											className="[image-rendering:pixelated]"
										/>
										{tower.cost}
									</span>
								</div>
							);
						})}
					</div>
				</div>

				<div className="flex items-center justify-between">
					<span className="font-pixel text-sm text-text">보유 타워</span>
					<div className="flex items-center gap-2">
						<span className="font-pixel text-[11px] text-text-secondary">
							{ownedTowers.length}/{ALL_TOWERS.length}
						</span>
						<PixelButton variant="gold" onClick={() => setShowGacha(true)}>
							소환의 제단
						</PixelButton>
					</div>
				</div>

				{ownedTowers.length === 0 ? (
					<EmptyState />
				) : (
					<div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2">
						{ownedTowers.map((def) => {
							const owned = collection.find((t) => t.defId === def.id);
							return (
								<TowerGridCard
									key={def.id}
									def={def}
									owned={owned}
									onClick={() => setSelectedDef(def)}
								/>
							);
						})}
					</div>
				)}

				{lockedTowers.length > 0 && (
					<>
						<span className="mt-1 font-pixel text-xs text-text-secondary">
							미획득
						</span>
						<div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2">
							{lockedTowers.map((def) => (
								<TowerGridCard
									key={def.id}
									def={def}
									locked
									onClick={() => setSelectedDef(def)}
								/>
							))}
						</div>
					</>
				)}
			</div>

			{selectedDef && (
				<TowerBottomSheet
					def={selectedDef}
					onClose={() => setSelectedDef(null)}
				/>
			)}

			{showDeckEdit && (
				<Suspense fallback={null}>
					<DeckEditSheet
						open={showDeckEdit}
						onClose={() => setShowDeckEdit(false)}
					/>
				</Suspense>
			)}

			{showGacha && (
				<Suspense
					fallback={
						<div className="fixed inset-0 z-10 bg-overlay-heavy flex items-center justify-center font-pixel text-sm text-text-secondary">
							로딩 중...
						</div>
					}
				>
					<GachaScreen onClose={() => setShowGacha(false)} />
				</Suspense>
			)}
		</div>
	);
}

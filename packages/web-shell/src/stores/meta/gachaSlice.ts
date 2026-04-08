import {
	GACHA_COSTS,
	type GachaResult,
	rollGacha,
	rollGacha10,
} from '@gld/shared';
import { debouncedSave } from './persistence';
import type { MetaActions, SliceCreator } from './types';

export const createGachaSlice: SliceCreator<Pick<MetaActions, 'openGacha'>> = (
	set,
	get,
) => ({
	openGacha: (boxType, rng = Math.random) => {
		const s = get();
		const progress = s.progress;
		const now = new Date();

		// ad 박스 카운트: 새 날이면 0으로 리셋하여 set()에서도 사용
		let effectiveAdBoxCount = progress.dailyAdBoxCount;
		if (progress.dailyResetAt) {
			const last = new Date(progress.dailyResetAt);
			const lastUTCDay = Date.UTC(
				last.getUTCFullYear(),
				last.getUTCMonth(),
				last.getUTCDate(),
			);
			const nowUTCDay = Date.UTC(
				now.getUTCFullYear(),
				now.getUTCMonth(),
				now.getUTCDate(),
			);
			if (nowUTCDay > lastUTCDay) {
				effectiveAdBoxCount = 0;
			}
		}

		// 비용/쿨다운/데일리 제한 검증
		if (boxType === 'free') {
			if (progress.dailyFreeBoxClaimedAt) {
				const last = new Date(progress.dailyFreeBoxClaimedAt);
				if (now.getTime() - last.getTime() < GACHA_COSTS.free.cooldownMs) {
					return 'cooldown';
				}
			}
		} else if (boxType === 'ad') {
			if (effectiveAdBoxCount >= GACHA_COSTS.ad.dailyLimit) {
				return 'daily_limit';
			}
		} else if (boxType === 'diamond_single') {
			if (s.profile.diamond < GACHA_COSTS.diamond_single.diamond)
				return 'no_diamond';
		} else if (boxType === 'diamond_ten') {
			if (s.profile.diamond < GACHA_COSTS.diamond_ten.diamond)
				return 'no_diamond';
		}

		// 롤
		const ownedIds = s.collection.map((t) => t.defId);
		let results: GachaResult[];
		let newPityCount: number;

		if (boxType === 'diamond_ten') {
			const roll = rollGacha10(progress.gachaPityCount, ownedIds, rng);
			results = roll.results;
			newPityCount = roll.newPityCount;
		} else {
			const roll = rollGacha(progress.gachaPityCount, ownedIds, rng);
			results = [roll.result];
			newPityCount = roll.newPityCount;
		}

		// 컬렉션 업데이트 (Amendment D: 중복 → 골드 50)
		let goldGained = 0;
		const newCollection = [...s.collection];
		for (const r of results) {
			const existingIdx = newCollection.findIndex((t) => t.defId === r.towerId);
			if (existingIdx >= 0) {
				goldGained += 50;
				newCollection[existingIdx] = {
					...newCollection[existingIdx],
					duplicateCount: newCollection[existingIdx].duplicateCount + 1,
				};
			} else {
				newCollection.push({
					defId: r.towerId,
					level: 1,
					grade: 'normal',
					acquiredAt: Date.now(),
					awakening: 0,
					duplicateCount: 0,
				});
			}
		}

		// 다이아몬드/골드 차감 및 progress 업데이트
		// set() 내부에서 최신 state 기준으로 차감 (TOCTOU 방어)
		set((s) => {
			const cost =
				boxType === 'diamond_single'
					? GACHA_COSTS.diamond_single.diamond
					: boxType === 'diamond_ten'
						? GACHA_COSTS.diamond_ten.diamond
						: 0;
			if (cost > 0 && s.profile.diamond < cost) return {};

			const newProfile = {
				...s.profile,
				diamond: s.profile.diamond - cost,
				gold: s.profile.gold + goldGained,
				totalGoldEarned: s.profile.totalGoldEarned + goldGained,
			};

			const nowIso = now.toISOString();
			const newProgress = {
				...s.progress,
				gachaPityCount: newPityCount,
				...(boxType === 'free' ? { dailyFreeBoxClaimedAt: nowIso } : {}),
				...(boxType === 'ad'
					? {
							dailyAdBoxCount: effectiveAdBoxCount + 1,
							dailyResetAt: nowIso,
						}
					: {}),
			};

			return {
				profile: newProfile,
				progress: newProgress,
				collection: newCollection,
			};
		});

		debouncedSave(get());
		return results;
	},
});

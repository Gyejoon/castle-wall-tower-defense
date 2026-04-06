import { lazy, Suspense, useEffect } from 'react';
import { useMissionTracker } from './hooks/useMissionTracker';
import { LobbyPage } from './pages/LobbyPage';
import { useGameStore } from './stores/gameStore';
import { useMetaStore } from './stores/metaStore';

const GamePage = lazy(async () =>
	import('./pages/GamePage').then((module) => ({ default: module.GamePage })),
);

function LoadingScreen() {
	return (
		<div
			className="min-h-screen flex items-center justify-center text-text-secondary"
			style={{ letterSpacing: '0.12em' }}
		>
			그리드 로딩 중...
		</div>
	);
}

const COLORBLIND_FILTERS: Record<string, string> = {
	off: 'none',
	protan: 'url(#protan-filter)',
	deutan: 'url(#deutan-filter)',
	tritan: 'url(#tritan-filter)',
};

export function App() {
	const runStatus = useGameStore((s) => s.runStatus);
	const pushToast = useGameStore((s) => s.pushToast);
	const colorblindMode = useGameStore((s) => s.colorblindMode);

	useEffect(() => {
		useMetaStore.getState().loadSave();
		useMetaStore.getState().refreshMissions();
		// 하루 첫 오픈 시 출석 체크 자동 달성 (current=0일 때만 진행 → 중복 방지)
		const meta = useMetaStore.getState();
		const dailyAttendance = meta.progress.dailyMissions.find(
			(m) => m.type === 'attendance',
		);
		if (dailyAttendance && dailyAttendance.current === 0) {
			meta.progressMission('attendance', 1);
		}
		const onSaveError = () =>
			pushToast('저장 공간 부족! 데이터가 저장되지 않을 수 있습니다', 'error');
		window.addEventListener('gld-save-error', onSaveError);
		return () => window.removeEventListener('gld-save-error', onSaveError);
	}, [pushToast]);

	useMissionTracker();

	if (runStatus === 'lobby') {
		return (
			<div
				className="w-full h-full"
				style={{ filter: COLORBLIND_FILTERS[colorblindMode], height: '100%' }}
			>
				<LobbyPage />
			</div>
		);
	}

	return (
		<div
			className="w-full h-full"
			style={{ filter: COLORBLIND_FILTERS[colorblindMode], height: '100%' }}
		>
			<Suspense fallback={<LoadingScreen />}>
				<GamePage />
			</Suspense>
		</div>
	);
}

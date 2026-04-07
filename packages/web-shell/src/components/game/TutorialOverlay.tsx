import { EventBus } from '@gld/phaser-game';
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useMetaStore } from '../../stores/metaStore';

export function TutorialOverlay() {
	const tutorialStep = useGameStore((s) => s.tutorialStep);
	const tutorialMessage = useGameStore((s) => s.tutorialMessage);
	const setTutorialStep = useGameStore((s) => s.setTutorialStep);
	const setTutorialMessage = useGameStore((s) => s.setTutorialMessage);

	const [showSkip, setShowSkip] = useState(false);
	const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const onStep = (data: { step: number; message: string }) => {
			setTutorialStep(data.step);
			setTutorialMessage(data.message);
			setShowSkip(false);

			// 강제 스텝(0-1)에서 5초 후 건너뛰기 버튼 표시. 항상 기존 타이머를 먼저 정리.
			if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
			skipTimerRef.current = null;
			if (data.step <= 1) {
				skipTimerRef.current = setTimeout(() => setShowSkip(true), 5000);
			}
		};

		const onComplete = () => {
			// tutorialCompleted 영속화 (handleSkip 경로에서도 호출될 수 있으나 updateProgress는 멱등)
			useMetaStore.getState().updateProgress({ tutorialCompleted: true });
			setTutorialStep(null);
			setTutorialMessage(null);
			setShowSkip(false);
			if (skipTimerRef.current) {
				clearTimeout(skipTimerRef.current);
				skipTimerRef.current = null;
			}
		};

		EventBus.on('tutorial-step', onStep);
		EventBus.on('tutorial-completed', onComplete);

		return () => {
			EventBus.off('tutorial-step', onStep);
			EventBus.off('tutorial-completed', onComplete);
			if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
		};
	}, [setTutorialStep, setTutorialMessage]);

	const handleSkip = () => {
		// request-tutorial-advance → TutorialSystem.complete() → tutorial-completed emit
		// → onComplete()에서 updateProgress 호출. 여기서 중복 호출하지 않음.
		EventBus.emit('request-tutorial-advance');
	};

	if (tutorialStep === null) return null;

	return (
		<div className="absolute inset-0 z-20 pointer-events-none">
			{/* 하단 메시지 패널 */}
			<div
				className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-3 border border-gold max-w-[280px] pointer-events-auto"
				style={{ background: 'rgba(26, 18, 8, 0.92)' }}
			>
				<p className="font-pixel text-xs text-gold text-center leading-relaxed">
					{tutorialMessage}
				</p>

				{/* Amendment F: 5초 후 건너뛰기 버튼 (강제 스텝) */}
				{showSkip && (
					<button
						type="button"
						onClick={handleSkip}
						className="mt-2 w-full font-pixel text-[10px] text-text-secondary border border-border py-1 bg-transparent cursor-pointer hover:text-text transition-colors"
					>
						건너뛰기
					</button>
				)}
			</div>
		</div>
	);
}

import { EventBus } from '@gld/phaser-game';
import { useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useMetaStore } from '../../stores/metaStore';

export function TutorialOverlay() {
  const tutorialStep = useGameStore((s) => s.tutorialStep);
  const tutorialMessage = useGameStore((s) => s.tutorialMessage);
  const setTutorialStep = useGameStore((s) => s.setTutorialStep);
  const setTutorialMessage = useGameStore((s) => s.setTutorialMessage);

  useEffect(() => {
    const onStep = (data: { step: number; message: string }) => {
      setTutorialStep(data.step);
      setTutorialMessage(data.message);
    };

    const onComplete = () => {
      useMetaStore.getState().updateProgress({ tutorialCompleted: true });
      setTutorialStep(null);
      setTutorialMessage(null);
    };

    EventBus.on('tutorial-step', onStep);
    EventBus.on('tutorial-completed', onComplete);

    return () => {
      EventBus.off('tutorial-step', onStep);
      EventBus.off('tutorial-completed', onComplete);
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
      {/* 하단 메시지 패널 — 탭하면 닫힘 */}
      <button
        type="button"
        onClick={handleSkip}
        className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-3 border border-gold max-w-[280px] pointer-events-auto text-left"
        style={{ background: 'rgba(26, 18, 8, 0.92)' }}
      >
        <p className="font-pixel text-xs text-gold text-center leading-relaxed">
          {tutorialMessage}
        </p>
        <p className="font-pixel text-[9px] text-text-secondary text-center mt-1">
          탭하여 닫기
        </p>
      </button>
    </div>
  );
}

import type Phaser from 'phaser';
import { EventBus } from '../EventBus';

const TUTORIAL_MESSAGES = [
	'타워 카드를 탭하세요',
	'빛나는 타일에 배치하세요',
	'적이 나타납니다! 방어하세요',
	'타워를 추가 배치해 방어선을 강화하세요',
	'잘하고 있어요! 계속 진행하세요',
];

const TOTAL_STEPS = TUTORIAL_MESSAGES.length;

export class TutorialSystem {
	private scene: Phaser.Scene;
	private currentStep = 0;
	private overlay?: Phaser.GameObjects.Graphics;
	private active = false;
	private towerPlacedCount = 0;

	constructor(scene: Phaser.Scene) {
		this.scene = scene;
	}

	// React가 게이트킵: tutorialCompleted 체크 후 이 메서드 호출
	static shouldShowTutorial(): boolean {
		return true; // 항상 start() 호출 가능, React가 진입 여부 결정
	}

	async start(): Promise<void> {
		this.active = true;
		this.currentStep = 0;
		this.towerPlacedCount = 0;

		// Phaser Graphics overlay (어둡게 + 하이라이트)
		this.overlay = this.scene.add.graphics();
		this.overlay.setDepth(150);

		// step 0 진입
		this.showStep(0);
		this.setupEventListeners();
	}

	private showStep(step: number): void {
		if (step >= TOTAL_STEPS) {
			this.complete();
			return;
		}
		this.currentStep = step;
		const message = TUTORIAL_MESSAGES[step];

		// React 오버레이에 step 전달
		EventBus.emit('tutorial-step', { step, message });

		// 강제 스텝(0-1)에서 Phaser overlay로 배경 어둡게
		if (step <= 1) {
			this.drawDimOverlay();
		} else {
			this.clearOverlay();
		}
	}

	private drawDimOverlay(): void {
		if (!this.overlay) return;
		this.overlay.clear();
		this.overlay.fillStyle(0x000000, 0.4);
		this.overlay.fillRect(
			0,
			0,
			this.scene.scale.width,
			this.scene.scale.height,
		);
	}

	private clearOverlay(): void {
		this.overlay?.clear();
	}

	private setupEventListeners(): void {
		// step 0: request-select-tower 감지 → step 1로
		const onSelectTower = () => {
			if (this.active && this.currentStep === 0) {
				this.showStep(1);
			}
		};

		// step 1: tower-placed (success:true) 감지 → step 2로 + towerPlacedCount++
		const onTowerPlaced = (d: { success: boolean }) => {
			if (!this.active || !d.success) return;
			this.towerPlacedCount++;
			if (this.currentStep === 1) {
				this.showStep(2);
			} else if (this.currentStep === 3 && this.towerPlacedCount >= 2) {
				this.showStep(4);
			}
		};

		// step 2: wave-started (wave:1) → step 3
		// step 4: wave-started (wave>=3) → 완료
		const onWaveStarted = (d: { wave: number }) => {
			if (!this.active) return;
			if (this.currentStep === 2 && d.wave === 1) {
				this.showStep(3);
			} else if (this.currentStep === 4 && d.wave >= 3) {
				this.complete();
			}
		};

		EventBus.on('request-select-tower', onSelectTower);
		EventBus.on('tower-placed', onTowerPlaced);
		EventBus.on('wave-started', onWaveStarted);

		// request-tutorial-advance: React의 건너뛰기 버튼 처리
		const onAdvance = () => {
			if (!this.active) return;
			this.complete();
		};
		EventBus.on('request-tutorial-advance', onAdvance);

		// 정리 함수 저장
		this._cleanup = () => {
			EventBus.off('request-select-tower', onSelectTower);
			EventBus.off('tower-placed', onTowerPlaced);
			EventBus.off('wave-started', onWaveStarted);
			EventBus.off('request-tutorial-advance', onAdvance);
		};
	}

	// start() 전 destroy() 호출에 대비해 no-op으로 초기화
	private _cleanup: () => void = () => {};

	private complete(): void {
		this.active = false;
		EventBus.emit('tutorial-completed');
		this.destroy();
	}

	destroy(): void {
		this.active = false;
		this._cleanup();
		this._cleanup = () => {};
		this.overlay?.destroy();
		this.overlay = undefined;
	}
}

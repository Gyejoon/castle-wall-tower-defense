import Phaser from 'phaser';
import type { AssetManifest } from '@gld/shared';
import {
  prefetchAssetSections,
  shouldUseWebPTextures,
  unloadAssetSections,
} from '../assets/assetManifest';

const TUTORIAL_STORAGE_KEY = 'tutorial_completed';

interface TutorialStep {
  message: string;
  targetKey?: string;
}

const STEPS: TutorialStep[] = [
  { message: '타워 카드를 탭하세요', targetKey: 'tower-card' },
  { message: '빛나는 타일에 배치하세요', targetKey: 'buildable-tile' },
  { message: '적이 나타납니다!', targetKey: 'path' },
  { message: '골드로 타워를 추가 배치하세요', targetKey: 'buy-btn' },
  { message: '준비 완료! 행운을 빕니다' },
];

export class TutorialSystem {
  private scene: Phaser.Scene;
  private manifest: AssetManifest;
  private currentStep = 0;
  private overlay?: Phaser.GameObjects.Graphics;
  private hintText?: Phaser.GameObjects.Text;
  private active = false;
  private loaded = false;

  constructor(scene: Phaser.Scene, manifest: AssetManifest) {
    this.scene = scene;
    this.manifest = manifest;
  }

  static shouldShowTutorial(): boolean {
    try {
      return localStorage.getItem(TUTORIAL_STORAGE_KEY) !== 'true';
    } catch {
      return false;
    }
  }

  async start(): Promise<void> {
    if (!TutorialSystem.shouldShowTutorial()) return;

    this.active = true;
    await prefetchAssetSections(
      this.scene,
      this.manifest,
      ['tutorial'],
      shouldUseWebPTextures(),
    );
    this.loaded = true;

    this.overlay = this.scene.add.graphics();
    this.overlay.setDepth(150);

    this.hintText = this.scene.add.text(
      this.scene.scale.width / 2,
      this.scene.scale.height - 120,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#f0d060',
        backgroundColor: '#2a1f0a',
        padding: { x: 12, y: 8 },
        align: 'center',
      },
    );
    this.hintText.setOrigin(0.5);
    this.hintText.setDepth(151);

    this.showStep(0);
  }

  private showStep(index: number): void {
    if (index >= STEPS.length) {
      this.complete();
      return;
    }
    this.currentStep = index;
    const step = STEPS[index];
    if (this.hintText) {
      this.hintText.setText(step.message);
    }

    // Auto-advance after 3 seconds
    this.scene.time.delayedCall(3000, () => {
      if (this.active && this.currentStep === index) {
        this.showStep(index + 1);
      }
    });
  }

  advance(): void {
    if (!this.active) return;
    this.showStep(this.currentStep + 1);
  }

  private complete(): void {
    this.active = false;
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    } catch {
      // ignore storage errors
    }
    this.destroy();
  }

  destroy(): void {
    this.active = false;
    this.overlay?.destroy();
    this.overlay = undefined;
    this.hintText?.destroy();
    this.hintText = undefined;
    if (this.loaded) {
      unloadAssetSections(this.scene, this.manifest, ['tutorial']);
      this.loaded = false;
    }
  }
}

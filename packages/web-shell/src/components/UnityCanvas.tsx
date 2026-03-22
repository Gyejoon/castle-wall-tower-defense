import { useEffect, useRef, useState } from 'react';
import { useUnityBridge } from '../bridge/useUnityBridge';
import { useGameStore } from '../stores/gameStore';
import type { UnityMessage } from '../bridge/bridge-types';
import { colors } from '../styles/tokens';

declare global {
  function createUnityInstance(
    canvas: HTMLCanvasElement,
    config: Record<string, string>,
    onProgress?: (progress: number) => void,
  ): Promise<{ SendMessage: (obj: string, method: string, value: string) => void }>;
}

export function UnityCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const setUnityLoaded = useGameStore((s) => s.setUnityLoaded);

  const handleUnityMessage = (msg: UnityMessage) => {
    console.log('[React] Unity message:', msg);
    if (msg.type === 'GAME_READY') {
      setUnityLoaded(true);
    }
  };

  const { sendToUnity } = useUnityBridge(handleUnityMessage);

  useEffect(() => {
    if (!canvasRef.current) return;

    const script = document.createElement('script');
    script.src = '/unity-build/Build/unity-build.loader.js';
    script.onload = () => {
      createUnityInstance(
        canvasRef.current!,
        {
          dataUrl: '/unity-build/Build/unity-build.data',
          frameworkUrl: '/unity-build/Build/unity-build.framework.js',
          codeUrl: '/unity-build/Build/unity-build.wasm',
        },
        (p) => setProgress(p),
      ).then((instance) => {
        window.unityInstance = instance;
        setLoading(false);
      });
    };
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  // Make sendToUnity available for debugging
  useEffect(() => {
    (window as any).debugSendToUnity = sendToUnity;
  }, [sendToUnity]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: colors.bg,
            zIndex: 1,
          }}
        >
          <p style={{ color: colors.textSecondary, fontSize: '10px' }}>
            Loading Unity... {Math.round(progress * 100)}%
          </p>
        </div>
      )}
      <canvas
        ref={canvasRef}
        id="unity-canvas"
        style={{ width: '100%', height: '100%' }}
        tabIndex={-1}
      />
    </div>
  );
}

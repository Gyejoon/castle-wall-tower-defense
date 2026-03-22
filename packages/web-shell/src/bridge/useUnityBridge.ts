import { useCallback, useEffect, useRef } from 'react';
import type { UnityMessage, UnityMessageHandler } from './bridge-types';

declare global {
  interface Window {
    dispatchUnityMessage?: (raw: string) => void;
    unityInstance?: {
      SendMessage: (objectName: string, methodName: string, value: string) => void;
    };
  }
}

export function useUnityBridge(onMessage: UnityMessageHandler) {
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    window.dispatchUnityMessage = (raw: string) => {
      try {
        const msg: UnityMessage = JSON.parse(raw);
        handlerRef.current(msg);
      } catch (e) {
        console.error('[Bridge] Failed to parse Unity message:', raw, e);
      }
    };

    return () => {
      delete window.dispatchUnityMessage;
    };
  }, []);

  const sendToUnity = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    const json = JSON.stringify({ type, payload });
    window.unityInstance?.SendMessage('WebBridge', 'ReceiveFromReact', json);
  }, []);

  return { sendToUnity };
}

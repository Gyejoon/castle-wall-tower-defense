export interface UnityMessage {
  type: string;
  payload: Record<string, unknown>;
}

export type UnityMessageHandler = (message: UnityMessage) => void;

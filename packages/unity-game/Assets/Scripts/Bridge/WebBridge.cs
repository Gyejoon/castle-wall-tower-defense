using System.Runtime.InteropServices;
using UnityEngine;

namespace GLD.Bridge
{
    public class WebBridge : MonoBehaviour
    {
        public static WebBridge Instance { get; private set; }

        [DllImport("__Internal")]
        private static extern void SendToReact(string message);

        public event System.Action<string> OnMessageFromReact;

        private void Awake()
        {
            if (Instance != null)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        private void Start()
        {
            EmitToReact("GAME_READY", "{}");
        }

        public void EmitToReact(string type, string payload)
        {
            string json = $"{{\"type\":\"{type}\",\"payload\":{payload}}}";

            #if UNITY_WEBGL && !UNITY_EDITOR
            SendToReact(json);
            #else
            Debug.Log($"[WebBridge→React] {json}");
            #endif
        }

        public void ReceiveFromReact(string json)
        {
            Debug.Log($"[React→WebBridge] {json}");
            OnMessageFromReact?.Invoke(json);
        }
    }
}

using System;

namespace GLD.Core
{
    /// <summary>
    /// Typed event dispatch for Unity runtime. Phase 0 stub — full event surface
    /// (30+ events, mapping to existing Phaser TypedEventBus) lands in Phase 3.
    /// Do NOT add production events here until Phase 3 wiring — events added now
    /// may be renamed/removed without deprecation.
    /// </summary>
    public static class GameEvents
    {
        /// <summary>Fires once per session when Boot.unity completes initial load. Phase 0 sentinel.</summary>
        public static event Action OnBootComplete;

        internal static void RaiseBootComplete() => OnBootComplete?.Invoke();
    }
}

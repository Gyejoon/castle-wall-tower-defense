// GLD WebGL bridge — Phase 0 shim.
// Phase 6 replaces with full AdService / Sentry / localStorage / URL-params integration.
// Keep this file tiny: it runs BEFORE the Unity loader, so anything heavy delays first paint.

(function () {
  "use strict";

  const bridge = {
    /** Called from index.html once createUnityInstance resolves. */
    onReady: function (unityInstance) {
      // Placeholder. Phase 6 wires SendMessage channels for AdService/Sentry here.
      // For Phase 0 we just expose the instance for smoke-test access.
      window.__gld = window.__gld || {};
      window.__gld.ready = true;
    },

    /** iOS Safari AudioContext unlock retry. Phase 6 expands; Phase 0 uses a one-shot tap. */
    armAudioUnlock: function () {
      const onFirstTap = function () {
        try {
          if (window.WEBAudio && window.WEBAudio.audioContext) {
            window.WEBAudio.audioContext.resume();
          }
        } catch (_) {}
        document.removeEventListener("pointerdown", onFirstTap, true);
        document.removeEventListener("touchstart", onFirstTap, true);
      };
      document.addEventListener("pointerdown", onFirstTap, true);
      document.addEventListener("touchstart", onFirstTap, true);
    }
  };

  bridge.armAudioUnlock();

  // Service worker registration is guarded behind HTTPS + user opt-in in Phase 7.
  // Phase 0 registers nothing — we want reload-for-fresh-build behavior during iteration.

  window.__gldBridge = bridge;
})();

// GameDatabase.cs — Aggregate root ScriptableObject holding references to all catalogs.
// Per design-decisions Q1-1 (lines 26-51): hybrid pattern — individual SO files +
// GameDatabase as reference hub. GameDatabase.Active static property for runtime access.
// Activated by GameBootstrap at startup: GameDatabase.Activate() is called once.

using UnityEngine;

namespace GLD.Data
{
    /// <summary>
    /// Aggregate hub holding references to all 13 catalog and config ScriptableObjects.
    /// Runtime access: <c>GameDatabase.Active.towers.FindById("archer")</c>.
    /// Loaded once via GameBootstrap (Resources or Addressables). Never call
    /// Resources.Load or FindObjectOfType to access this — use <see cref="Active"/>.
    /// </summary>
    [CreateAssetMenu(menuName = "GLD/GameDatabase", fileName = "GameDatabase")]
    public sealed class GameDatabase : ScriptableObject
    {
        // ── Catalogs ─────────────────────────────────────────────────────────
        [Header("Catalogs")]
        public TowerCatalogSO       towers;
        public UnitCatalogSO        units;
        public WaveCatalogSO        waves;
        public UpgradeCardCatalogSO upgrades;
        public SummonPoolSO         summonPool;

        // ── Configs ──────────────────────────────────────────────────────────
        [Header("Configs")]
        public GachaConfigSO         gacha;
        public EnergyConfigSO        energy;
        public ScalingConfigSO       scaling;
        public FamilyUpgradeConfigSO familyUpgrade;
        public ElementMatchupSO      elementMatchup;
        public BossConfigSO          boss;
        public MapLayoutSO           map;
        public DesignTokensSO        designTokens;

        // ── Merge ─────────────────────────────────────────────────────────────
        [Header("Merge")]
        public MergeChainSO mergeChain;

        // ── Singleton Access ──────────────────────────────────────────────────
        public static GameDatabase Active { get; private set; }

        /// <summary>
        /// Called by GameBootstrap after loading. Sets the static Active reference.
        /// Must be called before any system tries to access game data.
        /// Note: <see cref="EnsureActive"/> is the idempotent public variant for
        /// scene controllers that boot in standalone (no GameBootstrap) mode.
        /// </summary>
        internal void Activate() => Active = this;

        /// <summary>
        /// Idempotent activation for standalone scene boots (no GameBootstrap).
        /// Sets <see cref="Active"/> to this instance only when it's null, so
        /// Phase 3 GameBootstrap can call <see cref="Activate"/> first and
        /// any later <c>EnsureActive</c> call from a scene becomes a no-op.
        /// </summary>
        public void EnsureActive()
        {
            if (Active == null) Active = this;
        }
    }
}

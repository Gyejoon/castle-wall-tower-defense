// Enums.cs — Game-wide enum definitions for GLD.Data ScriptableObjects.
// All values mirror the TypeScript string-union types in packages/shared/src/types/.
// PascalCase per C# convention; Newtonsoft.Json uses [EnumMember] or case-insensitive
// StringEnumConverter when deserializing from lower-case JSON strings (handled in Task 4).

namespace GLD.Data
{
    /// <summary>
    /// Tower family — matches TowerFamily union in packages/shared/src/types/tower.ts.
    /// Four base families (T1-T4), two cross-family hybrids (T5), one ultimate (T6).
    /// </summary>
    public enum TowerFamily
    {
        Archer,
        Frost,
        Hybrid,
        Siege,
        Stun,
        Ultimate,
    }

    /// <summary>
    /// Element type — matches ElementType union in packages/shared/src/types/tower.ts.
    /// Also used by UnitDef and ElementMatchup.
    /// </summary>
    public enum Element
    {
        Fire,
        Lightning,
        Neutral,
        Water,
    }

    /// <summary>
    /// Tower visual shape — matches TowerDef.shape in packages/shared/src/types/tower.ts.
    /// </summary>
    public enum TowerShape
    {
        Circle,
        Diamond,
        Hexagon,
        Shield,
        Star,
    }

    /// <summary>
    /// Projectile movement mode — per design-decisions Q2-4.
    /// Currently 2 variants (straight/homing); expand to [SerializeReference] if 5+ variants needed.
    /// </summary>
    public enum ProjectileKind
    {
        Homing,
        Straight,
    }

    /// <summary>
    /// Roguelike upgrade card identifiers — matches UpgradeId union in
    /// packages/shared/src/data/upgradeCards.ts.
    /// </summary>
    public enum UpgradeCardType
    {
        CritDmg,
        DmgUp,
        EffectAmp,
        EnergyHarvest,
        EnergyRegen,
        TierOddsUp,
    }

    /// <summary>
    /// Wave slot kind — matches WaveSlotKind in packages/shared/src/constants/waves.ts.
    /// </summary>
    public enum WaveKind
    {
        Boss,
        Normal,
    }

    /// <summary>
    /// Upgrade card stacking model — matches UpgradeCard.stackType in upgradeCards.ts.
    /// </summary>
    public enum StackType
    {
        Add,
        Multiply,
    }

    /// <summary>
    /// Unit special behavior — matches UnitSpecialBehavior in packages/shared/src/types/unit.ts.
    /// </summary>
    public enum UnitSpecialBehavior
    {
        None,
        DamageShield,
        RangedTowerAttack,
    }

    /// <summary>
    /// Gacha pull type — matches cost keys in gachaConfig.json.
    /// </summary>
    public enum GachaCostType
    {
        Ad,
        DiamondSingle,
        DiamondTen,
        Free,
    }

    /// <summary>
    /// Decoration kind used in map layout decorations array.
    /// </summary>
    public enum DecorationKind
    {
        Bush,
        Rock,
        Tree,
    }
}

// MinimalEntities.cs — Phase 2 Slice2 minimal-system POCOs.
//
// Authoritative spec: docs/unity-migration/phase-2-design-decisions.md
//   - §1.3 Prefab-vs-runtime split: TowerInstance / UnitInstance are PLAIN
//          C# classes. NEVER MonoBehaviour. Views (Task 4) observe these.
//   - §1.5 Anti-pattern watchlist (no static time, no UnityEngine.Random,
//          no Coroutine, etc.).
//
// All types here are headless-safe so MinimalReplayRunner (Task 6) can
// allocate them directly without a Unity scene.

using GLD.Data;

namespace GLD.Systems.Minimal
{
    /// <summary>
    /// Integer grid coordinate (col, row). Value type to keep dictionary
    /// keys allocation-free and equatable by default.
    /// </summary>
    public readonly struct GridCell : System.IEquatable<GridCell>
    {
        public readonly int Col;
        public readonly int Row;

        public GridCell(int col, int row)
        {
            Col = col;
            Row = row;
        }

        public bool Equals(GridCell other) => Col == other.Col && Row == other.Row;
        public override bool Equals(object obj) => obj is GridCell c && Equals(c);
        public override int GetHashCode() => (Col * 397) ^ Row;
        public static bool operator ==(GridCell a, GridCell b) => a.Equals(b);
        public static bool operator !=(GridCell a, GridCell b) => !a.Equals(b);
        public override string ToString() => $"({Col},{Row})";
    }

    /// <summary>
    /// Runtime tower instance — POCO. Buffs go on RuntimeDamage; never the
    /// def asset (§1.5 #4).
    /// </summary>
    public sealed class TowerInstance
    {
        public int InstanceId;
        public TowerDefSO Def;
        public GridCell Cell;

        // Cached at place-time so a hot-loop tick doesn't dereference Def.stats.
        public float RuntimeDamage;
        public float RangeCells;
        public float RangeSqr;
        public float AttackIntervalSec;
        public float ProjectileSpeedTilesPerSec;
        public bool HasSpecial;

        public float CooldownSec; // seconds until next shot allowed
        public int ShotsFired;
    }

    /// <summary>
    /// Runtime unit instance — POCO.
    /// PathIndex = integer index of last reached path cell.
    /// CellProgress = fractional [0..1] toward path[PathIndex+1].
    /// </summary>
    public sealed class UnitInstance
    {
        public int InstanceId;
        public UnitDefSO Def;

        public int Hp;
        public int MaxHp;
        public int Armor;
        public float SpeedTilesPerSec;

        public int PathIndex;
        public float CellProgress;

        public bool Alive = true;
    }

    /// <summary>
    /// Scheduled projectile impact. Stored by MinimalTowerSystem; resolved
    /// when ImpactTimeSec elapses on the orchestrator clock.
    /// Mirrors PendingDamage in packages/shared/src/testing/replay-runner.ts.
    /// </summary>
    public struct PendingDamage
    {
        public float ImpactTimeSec;
        public int TowerInstanceId;
        public int TargetInstanceId;
        public int Damage;
        public bool ArmorPierce;
    }
}

using System;

namespace GLD.Systems.Grid
{
    public readonly struct GridCell : IEquatable<GridCell>
    {
        public readonly int Col;
        public readonly int Row;

        public GridCell(int col, int row)
        {
            Col = col;
            Row = row;
        }

        public bool Equals(GridCell other) => Col == other.Col && Row == other.Row;
        public override bool Equals(object obj) => obj is GridCell other && Equals(other);
        public override int GetHashCode() => (Col * 397) ^ Row;
        public override string ToString() => $"({Col},{Row})";
    }
}

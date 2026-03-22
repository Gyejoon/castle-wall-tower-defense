namespace GLD.Core
{
    [System.Serializable]
    public class Tile
    {
        public int X { get; }
        public int Y { get; }
        public bool Walkable { get; set; }
        public bool Occupied { get; set; }
        public string TowerId { get; set; }

        public Tile(int x, int y, bool walkable = true)
        {
            X = x;
            Y = y;
            Walkable = walkable;
            Occupied = false;
            TowerId = null;
        }

        public bool IsPassable => Walkable && !Occupied;
    }
}

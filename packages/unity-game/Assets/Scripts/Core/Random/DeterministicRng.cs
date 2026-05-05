using System;

namespace GLD.Core.Random
{
    public sealed class DeterministicRng
    {
        uint _state;

        public DeterministicRng(uint seed)
        {
            _state = seed;
        }

        public uint NextUint32()
        {
            unchecked
            {
                _state = 1664525u * _state + 1013904223u;
                return _state;
            }
        }

        public float NextFloat01()
        {
            return NextUint32() / 4294967296f;
        }

        public int NextInt(int maxExclusive)
        {
            if (maxExclusive <= 0)
                throw new ArgumentOutOfRangeException(nameof(maxExclusive), "maxExclusive must be positive.");
            return (int)Math.Floor(NextFloat01() * maxExclusive);
        }

        public float NextRange(float min, float max)
        {
            if (max < min)
                throw new ArgumentOutOfRangeException(nameof(max), "max must be greater than or equal to min.");
            return min + (max - min) * NextFloat01();
        }
    }
}

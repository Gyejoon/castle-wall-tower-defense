using System.Collections.Generic;
using UnityEngine;

namespace GLD.Systems.Units
{
    public sealed class PathFollower
    {
        readonly IReadOnlyList<Vector2> _path;

        public int PathIndex { get; private set; }
        public Vector2 Position { get; private set; }
        public bool ReachedExit { get; private set; }

        public PathFollower(IReadOnlyList<Vector2> path)
        {
            _path = path;
            Position = path != null && path.Count > 0 ? path[0] : Vector2.zero;
        }

        public void Tick(float deltaSeconds, float speed)
        {
            if (ReachedExit || _path == null || _path.Count == 0 || deltaSeconds <= 0f || speed <= 0f)
                return;

            var remaining = speed * deltaSeconds;
            while (remaining > 0f && !ReachedExit)
            {
                var nextIndex = PathIndex + 1;
                if (nextIndex >= _path.Count)
                {
                    ReachedExit = true;
                    return;
                }

                var next = _path[nextIndex];
                var toNext = next - Position;
                var distance = toNext.magnitude;
                if (distance <= 0.0001f)
                {
                    PathIndex = nextIndex;
                    continue;
                }

                if (remaining >= distance)
                {
                    Position = next;
                    PathIndex = nextIndex;
                    remaining -= distance;
                }
                else
                {
                    Position += toNext / distance * remaining;
                    remaining = 0f;
                }
            }
        }
    }
}

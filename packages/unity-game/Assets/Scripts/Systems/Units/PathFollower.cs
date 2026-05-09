using System.Collections.Generic;
using UnityEngine;

namespace GLD.Systems.Units
{
    public sealed class PathFollower
    {
        readonly IReadOnlyList<Vector2> _path;

        public int PathIndex { get; private set; }
        public Vector2 Position { get; private set; }
        public Vector2 ExitPosition => _path != null && _path.Count > 0 ? _path[_path.Count - 1] : Position;
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

        public bool NudgeBackward(float distance)
        {
            if (ReachedExit || _path == null || _path.Count == 0 || distance <= 0f)
                return false;

            var remaining = distance;
            var changed = false;
            while (remaining > 0f)
            {
                var previousIndex = Mathf.Max(0, PathIndex - 1);
                var previous = _path[previousIndex];
                var toPrevious = previous - Position;
                var stepDistance = toPrevious.magnitude;
                if (stepDistance <= 0.0001f)
                {
                    if (PathIndex <= 0)
                        break;
                    PathIndex = previousIndex;
                    changed = true;
                    continue;
                }

                if (remaining >= stepDistance)
                {
                    Position = previous;
                    PathIndex = previousIndex;
                    remaining -= stepDistance;
                    changed = true;
                    if (PathIndex <= 0)
                        break;
                }
                else
                {
                    Position += toPrevious / stepDistance * remaining;
                    remaining = 0f;
                    changed = true;
                }
            }

            ReachedExit = false;
            return changed;
        }
    }
}

using GLD.Core.Random;
using NUnit.Framework;

namespace GLD.Tests.EditMode.Random
{
    public sealed class DeterministicRngTests
    {
        static readonly uint[] Seed12345First20 =
        {
            87628868u, 71072467u, 2332836374u, 2726892157u, 3908547000u,
            483019191u, 2129828778u, 2355140353u, 2560230508u, 3364893915u,
            171172990u, 3194601925u, 4148119648u, 316399679u, 3004788882u,
            1976948425u, 1702883732u, 4121112547u, 1744294886u, 4092090893u
        };

        [Test]
        public void MatchesGoldenSequenceForSeed12345()
        {
            var rng = new DeterministicRng(12345u);

            foreach (var expected in Seed12345First20)
                Assert.That(rng.NextUint32(), Is.EqualTo(expected));
        }

        [Test]
        public void ReturnsBoundedInts()
        {
            var rng = new DeterministicRng(12345u);

            for (var i = 0; i < 100; i++)
            {
                var value = rng.NextInt(7);
                Assert.That(value, Is.InRange(0, 6));
            }
        }
    }
}

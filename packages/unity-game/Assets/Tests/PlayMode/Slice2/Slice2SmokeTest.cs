using System.Collections;
using GLD.SceneRuntime.Slice2;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;

namespace GLD.Tests.PlayMode.Slice2
{
    public sealed class Slice2SmokeTest
    {
        [UnityTest]
        public IEnumerator SceneLoadPlaceArcherCompletesWave()
        {
            yield return SceneManager.LoadSceneAsync("Slice2_PoC", LoadSceneMode.Single);
            var controller = Object.FindFirstObjectByType<Slice2SceneController>();
            Assert.That(controller, Is.Not.Null);

            Assert.That(controller.PlaceArcherAt(3, 14), Is.True);
            controller.StartWaveNow();

            var timeout = Time.time + 30f;
            while (!controller.WaveCompleted && Time.time < timeout)
                yield return null;

            Assert.That(controller.WaveCompleted, Is.True);
            Assert.That(controller.Units.KillCount, Is.EqualTo(5));
        }
    }
}

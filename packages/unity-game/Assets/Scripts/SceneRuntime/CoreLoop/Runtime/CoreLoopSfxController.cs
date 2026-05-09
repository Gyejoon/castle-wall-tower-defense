using GLD.Core;
using GLD.Systems.Towers;
using GLD.Systems.Units;
using UnityEngine;

namespace GLD.SceneRuntime.CoreLoop.Runtime
{
    [DisallowMultipleComponent]
    public sealed class CoreLoopSfxController : MonoBehaviour
    {
        [SerializeField] AudioSource audioSource;
        [SerializeField, Range(0f, 1f)] float attackVolume = 0.42f;
        [SerializeField, Range(0f, 1f)] float hitVolume = 0.36f;
        [SerializeField, Range(0f, 1f)] float deathVolume = 0.65f;

        GameSceneController _controller;
        AudioClip _attackClip;
        AudioClip _hitClip;
        AudioClip _deathClip;

        public bool IsBound { get; private set; }
        public int AttackPlayCount { get; private set; }
        public int HitPlayCount { get; private set; }
        public int DeathPlayCount { get; private set; }

        public void Bind(GameSceneController controller)
        {
            Unbind();
            _controller = controller;
            if (_controller == null)
                return;

            EnsureAudioSource();
            EnsureClips();

            if (_controller.Towers != null)
                _controller.Towers.TowerAttacked += HandleTowerAttacked;
            if (_controller.Units != null)
            {
                _controller.Units.UnitDamaged += HandleUnitDamaged;
                _controller.Units.UnitKilled += HandleUnitKilled;
            }
            GameEvents.OnWallAutoAttacked += HandleWallAutoAttacked;
            IsBound = true;
        }

        void OnDestroy()
        {
            Unbind();
        }

        void Unbind()
        {
            if (_controller != null)
            {
                if (_controller.Towers != null)
                    _controller.Towers.TowerAttacked -= HandleTowerAttacked;
                if (_controller.Units != null)
                {
                    _controller.Units.UnitDamaged -= HandleUnitDamaged;
                    _controller.Units.UnitKilled -= HandleUnitKilled;
                }
            }
            GameEvents.OnWallAutoAttacked -= HandleWallAutoAttacked;
            _controller = null;
            IsBound = false;
        }

        void HandleTowerAttacked(TowerInstance tower, float appliedDamage)
        {
            if (tower == null || appliedDamage <= 0f)
                return;

            PlayAttack();
        }

        void HandleWallAutoAttacked(WallAttackEvent attackEvent)
        {
            if (attackEvent.Damage <= 0f)
                return;

            PlayAttack();
        }

        void HandleUnitDamaged(UnitInstance unit, float appliedDamage)
        {
            if (unit == null || appliedDamage <= 0f)
                return;

            PlayHit();
        }

        void HandleUnitKilled(UnitInstance unit)
        {
            if (unit == null)
                return;

            PlayDeath();
        }

        void PlayAttack()
        {
            AttackPlayCount++;
            Play(_attackClip, attackVolume);
        }

        void PlayHit()
        {
            HitPlayCount++;
            Play(_hitClip, hitVolume);
        }

        void PlayDeath()
        {
            DeathPlayCount++;
            Play(_deathClip, deathVolume);
        }

        void Play(AudioClip clip, float volume)
        {
            if (audioSource == null || clip == null || volume <= 0f)
                return;

            audioSource.PlayOneShot(clip, volume);
        }

        void EnsureAudioSource()
        {
            if (audioSource == null)
                audioSource = GetComponent<AudioSource>();
            if (audioSource == null)
                audioSource = gameObject.AddComponent<AudioSource>();

            audioSource.playOnAwake = false;
            audioSource.spatialBlend = 0f;
        }

        void EnsureClips()
        {
            _attackClip ??= CreateClip("GLD_Attack_Arrow", 0.09f, 220f, 760f, WaveShape.NoiseSweep);
            _hitClip ??= CreateClip("GLD_Monster_Hit", 0.08f, 150f, 95f, WaveShape.Thump);
            _deathClip ??= CreateClip("GLD_Monster_Death", 0.24f, 120f, 36f, WaveShape.Fall);
        }

        enum WaveShape
        {
            NoiseSweep,
            Thump,
            Fall
        }

        static AudioClip CreateClip(string clipName, float durationSeconds, float startHz, float endHz, WaveShape shape)
        {
            const int sampleRate = 22050;
            var sampleCount = Mathf.Max(1, Mathf.CeilToInt(durationSeconds * sampleRate));
            var samples = new float[sampleCount];

            var phase = 0f;
            var seed = 0.37f;
            for (var i = 0; i < sampleCount; i++)
            {
                var t = (float)i / Mathf.Max(1, sampleCount - 1);
                var frequency = Mathf.Lerp(startHz, endHz, t);
                phase += frequency / sampleRate;
                var envelope = Mathf.Sin(Mathf.Clamp01(1f - t) * Mathf.PI * 0.5f);
                var signal = Mathf.Sin(phase * Mathf.PI * 2f);

                if (shape == WaveShape.NoiseSweep)
                {
                    seed = Mathf.Repeat(seed * 7.31f + 0.17f, 1f);
                    signal = Mathf.Lerp(signal, seed * 2f - 1f, 0.28f);
                    envelope *= Mathf.SmoothStep(0f, 1f, 1f - t);
                }
                else if (shape == WaveShape.Thump)
                {
                    signal = Mathf.Sign(signal) * Mathf.Pow(Mathf.Abs(signal), 0.35f);
                    envelope *= Mathf.Clamp01(1f - t * 1.3f);
                }
                else
                {
                    signal = Mathf.Sin(phase * Mathf.PI * 2f) * Mathf.Lerp(1f, 0.28f, t);
                    envelope *= Mathf.Clamp01(1f - t);
                }

                samples[i] = signal * envelope * 0.75f;
            }

            var clip = AudioClip.Create(clipName, sampleCount, 1, sampleRate, false);
            clip.SetData(samples, 0);
            return clip;
        }
    }
}

// JsonToSOImporter.cs — Editor-only importer: reads deterministic JSON catalogs and
// populates / creates ScriptableObject .asset files under Assets/Data/.
//
// Usage:
//   Interactive: Unity menu GLD/Import Shared Data
//   CI / batch:  JsonToSOImporter.ImportAllBatch()  (called by -executeMethod)
//
// Design decisions implemented:
//   Q2-1: menu + static batch API, no AssetPostprocessor.
//   Q2-2: SOImportUtil.FindOrCreate<T> preserves GUIDs; batched SaveAssets at end.
//   Q2-3: Fail-loud — unknown JSON field → InvalidOperationException;
//         SO field absent from JSON → Debug.LogWarning.
//
// Special mappings (implementer-flagged from Task 3):
//   DesignTokens.MotionDuration.base_ ↔ JSON "base"
//   DesignTokens.OverlayDimTokens.default_ ↔ JSON "default"
//   DesignTokens.SpacingTokens.xxl ↔ JSON "2xl"
//   DesignTokens.SpacingTokens.xxxl ↔ JSON "3xl"
//   EnergyConfig.ingameGacha — JSON key (e.g. "tier2") → IngameGachaTierEntry.tier
//
// Enum deserialization: Newtonsoft StringEnumConverter (case-insensitive) handles
//   lowercase JSON strings → PascalCase C# enums.

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using Newtonsoft.Json.Linq;
using UnityEditor;
using UnityEngine;

namespace GLD.Data.Editor
{
    public static class JsonToSOImporter
    {
        // ── Paths ────────────────────────────────────────────────────────────

        const string GameDataDir    = "Assets/Resources/GameData";
        const string OutputDir      = "Assets/Data";
        const string TowersSubDir   = "Assets/Data/Towers";
        const string UnitsSubDir    = "Assets/Data/Units";
        const string WavesSubDir    = "Assets/Data/Waves";
        const string CardsSubDir    = "Assets/Data/Cards";

        // ── Newtonsoft settings ──────────────────────────────────────────────

        static readonly JsonSerializerSettings s_settings = new JsonSerializerSettings
        {
            Converters = { new StringEnumConverter { AllowIntegerValues = false } },
            MissingMemberHandling = MissingMemberHandling.Ignore,  // we validate manually
        };

        // ── Menu Entry ───────────────────────────────────────────────────────

        [MenuItem("GLD/Import Shared Data")]
        public static void ImportSharedDataMenu()
        {
            try
            {
                ImportAll();
                EditorUtility.DisplayDialog("GLD Import", "Import complete. Check Console for summary.", "OK");
            }
            catch (Exception e)
            {
                EditorUtility.DisplayDialog("GLD Import FAILED", e.Message, "OK");
                throw;
            }
        }

        /// <summary>
        /// CI / -batchmode entry point. Throws on any schema mismatch or validation failure.
        /// </summary>
        public static void ImportAllBatch()
        {
            ImportAll();
        }

        // ── Core ─────────────────────────────────────────────────────────────

        static void ImportAll()
        {
            SOImportUtil.ClearDirtyList();

            // Verify index.json is present.
            string indexPath = Path.Combine(GameDataDir, "index.json");
            if (!File.Exists(indexPath))
                throw new FileNotFoundException($"[GLD Import] Missing index.json at {indexPath}");

            // Import each catalog.
            var towerCatalog   = ImportTowers();
            var unitCatalog    = ImportUnits();
            var waveCatalog    = ImportWaves();
            var cardCatalog    = ImportUpgradeCards();
            var mapLayout      = ImportMaps();
            var summonPool     = ImportSummonPool();
            var gachaConfig    = ImportGachaConfig();
            var bossConfig     = ImportBossConfig();
            var energyConfig   = ImportEnergyConfig();
            var scalingConfig  = ImportScalingConfig();
            var familyConfig   = ImportFamilyUpgrade();
            var elementMatchup = ImportElementMatchup();
            var designTokens   = ImportDesignTokens();
            var mergeChain     = ImportMergeChain();

            // Build GameDatabase aggregate last.
            ImportGameDatabase(
                towerCatalog, unitCatalog, waveCatalog, cardCatalog, mapLayout,
                summonPool, gachaConfig, bossConfig, energyConfig, scalingConfig,
                familyConfig, elementMatchup, designTokens, mergeChain);

            SOImportUtil.SaveAll();

            // Task 8 hook: regenerate tokens.uss whenever SO data is refreshed.
            TokensUssGenerator.Generate();

            Debug.Log(
                $"[GLD] Import complete: " +
                $"{towerCatalog.towers?.Length ?? 0} towers, " +
                $"{unitCatalog.units?.Length ?? 0} units, " +
                $"{waveCatalog.waves?.Length ?? 0} waves, " +
                $"{cardCatalog.cards?.Length ?? 0} cards, " +
                $"{mapLayout.maps?.Length ?? 0} maps, " +
                $"{mergeChain.rules?.Length ?? 0} merge rules.");
        }

        // ── Per-catalog importers ─────────────────────────────────────────────

        static TowerCatalogSO ImportTowers()
        {
            string json = ReadFile("towers.json");
            var arr     = JArray.Parse(json);

            var catalog = SOImportUtil.FindOrCreate<TowerCatalogSO>($"{OutputDir}/TowerCatalog.asset");
            var list    = new List<TowerDefSO>();

            foreach (var item in arr)
            {
                var obj = (JObject)item;
                ValidateJsonAgainstDTO(typeof(TowerDefDTO), obj, "towers.json");

                var dto = obj.ToObject<TowerDefDTO>(JsonSerializer.Create(s_settings));
                var so  = SOImportUtil.FindOrCreate<TowerDefSO>($"{TowersSubDir}/{EscapeId(dto.id)}.asset");

                so.id                    = dto.id;
                so.name                  = dto.name;
                so.color                 = dto.color;
                so.cost                  = dto.cost;
                so.element               = ParseEnum<Element>(dto.element);
                so.family                = ParseEnum<TowerFamily>(dto.family);
                so.isPremium             = dto.isPremium;
                so.shape                 = ParseEnum<TowerShape>(dto.shape);
                so.tier                  = dto.tier;
                so.sameFamilyMergeTargetId = dto.sameFamilyMergeTargetId ?? "";

                so.stats = new TowerStats
                {
                    attackSpeed     = dto.stats.attackSpeed,
                    damage          = dto.stats.damage,
                    projectileSpeed = dto.stats.projectileSpeed,
                    range           = dto.stats.range,
                    special         = dto.stats.special ?? "",
                };

                SOImportUtil.RecordAndDirty(so);
                list.Add(so);
            }

            catalog.towers = list.ToArray();
            SOImportUtil.RecordAndDirty(catalog);
            return catalog;
        }

        static UnitCatalogSO ImportUnits()
        {
            string json = ReadFile("units.json");
            var root    = JObject.Parse(json);

            // Validate wrapper fields.
            var wrapperFields = new HashSet<string> { "minMoveSpeed", "stunImmunityWindowMs", "units" };
            foreach (var prop in root.Properties())
                if (!wrapperFields.Contains(prop.Name))
                    throw new InvalidOperationException(
                        $"[GLD Import] Schema mismatch in 'units.json': unknown wrapper field '{prop.Name}'.");

            var catalog = SOImportUtil.FindOrCreate<UnitCatalogSO>($"{OutputDir}/UnitCatalog.asset");
            catalog.minMoveSpeed       = root["minMoveSpeed"]?.Value<float>() ?? 0f;
            catalog.stunImmunityWindowMs = root["stunImmunityWindowMs"]?.Value<float>() ?? 0f;

            var arr  = (JArray)root["units"];
            var list = new List<UnitDefSO>();

            foreach (var item in arr)
            {
                var obj = (JObject)item;
                ValidateJsonAgainstDTO(typeof(UnitDefDTO), obj, "units.json");

                var dto = obj.ToObject<UnitDefDTO>(JsonSerializer.Create(s_settings));
                var so  = SOImportUtil.FindOrCreate<UnitDefSO>($"{UnitsSubDir}/{EscapeId(dto.id)}.asset");

                so.id              = dto.id;
                so.name            = dto.name;
                so.type            = dto.type;
                so.isPremium       = dto.isPremium;
                so.bounty          = dto.bounty;
                so.element         = ParseEnum<Element>(dto.element);
                so.flying          = dto.flying;
                so.bossBehaviorId  = dto.bossBehaviorId ?? "";
                so.bossCcResist    = dto.bossCcResist;
                so.specialBehavior = ParseEnum<UnitSpecialBehavior>(dto.specialBehavior ?? "none");

                so.stats = new UnitStats
                {
                    armor = dto.stats.armor,
                    hp    = dto.stats.hp,
                    speed = dto.stats.speed,
                };

                // specialParams from dict.
                if (dto.specialParams != null)
                {
                    so.specialParams = dto.specialParams
                        .Select(kv => new SpecialParam { key = kv.Key, value = kv.Value })
                        .ToArray();
                }
                else
                {
                    so.specialParams = Array.Empty<SpecialParam>();
                }

                SOImportUtil.RecordAndDirty(so);
                list.Add(so);
            }

            catalog.units = list.ToArray();
            SOImportUtil.RecordAndDirty(catalog);
            return catalog;
        }

        static WaveCatalogSO ImportWaves()
        {
            string json = ReadFile("waves.json");
            var arr     = JArray.Parse(json);

            var catalog = SOImportUtil.FindOrCreate<WaveCatalogSO>($"{OutputDir}/WaveCatalog.asset");
            var list    = new List<WaveDefSO>();

            foreach (var item in arr)
            {
                var obj = (JObject)item;
                ValidateJsonAgainstDTO(typeof(WaveDefDTO), obj, "waves.json");

                var dto = obj.ToObject<WaveDefDTO>(JsonSerializer.Create(s_settings));
                var so  = SOImportUtil.FindOrCreate<WaveDefSO>($"{WavesSubDir}/wave_{dto.slotIndex:D3}.asset");

                so.slotIndex          = dto.slotIndex;
                so.kind               = ParseEnum<WaveKind>(dto.kind);
                so.delayAfterClearSec = dto.delayAfterClearSec;

                if (dto.groups != null)
                {
                    so.groups = dto.groups.Select(g => new WaveGroup
                    {
                        count        = g.count,
                        unitId       = g.unitId,
                        hpMultiplier = g.hpMultiplier > 0f ? g.hpMultiplier : 1f,
                    }).ToArray();
                }
                else
                {
                    so.groups = Array.Empty<WaveGroup>();
                }

                SOImportUtil.RecordAndDirty(so);
                list.Add(so);
            }

            catalog.waves = list.ToArray();
            SOImportUtil.RecordAndDirty(catalog);
            return catalog;
        }

        static UpgradeCardCatalogSO ImportUpgradeCards()
        {
            string json = ReadFile("upgradeCards.json");
            var arr     = JArray.Parse(json);

            var catalog = SOImportUtil.FindOrCreate<UpgradeCardCatalogSO>($"{OutputDir}/UpgradeCardCatalog.asset");
            var list    = new List<UpgradeCardSO>();

            foreach (var item in arr)
            {
                var obj = (JObject)item;
                ValidateJsonAgainstDTO(typeof(UpgradeCardDTO), obj, "upgradeCards.json");

                var dto = obj.ToObject<UpgradeCardDTO>(JsonSerializer.Create(s_settings));
                var so  = SOImportUtil.FindOrCreate<UpgradeCardSO>($"{CardsSubDir}/{EscapeId(dto.id)}.asset");

                so.id          = ParseEnum<UpgradeCardType>(NormalizeUpgradeCardId(dto.id));
                so.name        = dto.name;
                so.description = dto.description;
                so.icon        = dto.icon ?? "";
                so.stackType   = ParseEnum<StackType>(dto.stackType);
                so.value       = dto.value;
                so.amount      = dto.amount;
                so.interval    = dto.interval;

                SOImportUtil.RecordAndDirty(so);
                list.Add(so);
            }

            catalog.cards = list.ToArray();
            SOImportUtil.RecordAndDirty(catalog);
            return catalog;
        }

        static MapLayoutSO ImportMaps()
        {
            string json = ReadFile("maps.json");
            var root    = JObject.Parse(json);

            var so   = SOImportUtil.FindOrCreate<MapLayoutSO>($"{OutputDir}/MapLayout.asset");
            var list = new List<MapDef>();

            foreach (var mapProp in root.Properties())
            {
                string mapId  = mapProp.Name;
                var    mapObj = (JObject)mapProp.Value;
                ValidateJsonAgainstDTO(typeof(MapDefDTO), mapObj, $"maps.json[{mapId}]");

                var dto = mapObj.ToObject<MapDefDTO>(JsonSerializer.Create(s_settings));
                var def = new MapDef
                {
                    id                     = mapId,
                    name                   = dto.name ?? mapId,
                    height                 = dto.height,
                    width                  = dto.width,
                    tileSize               = dto.tileSize,
                    tilemapKey             = dto.tilemapKey ?? "",
                    tilesetKey             = dto.tilesetKey ?? "",
                    recommendedPower       = dto.recommendedPower,
                    rewardMultiplier       = dto.rewardMultiplier,
                    difficultyHpMult       = dto.difficultyHpMult,
                    spawnPoint             = ToGridPoint(dto.spawnPoint),
                    exitPoint              = ToGridPoint(dto.exitPoint),
                    path                   = ToGridPoints(dto.path),
                    buildablePoints        = ToGridPoints(dto.buildablePoints),
                    blockedPlacementPoints = ToGridPoints(dto.blockedPlacementPoints),
                    obstacles              = ToGridPoints(dto.obstacles),
                    castleWallTiles        = ToGridPoints(dto.castleWallTiles),
                    decorations            = ToDecorations(dto.decorations),
                };
                list.Add(def);
            }

            so.maps = list.ToArray();
            SOImportUtil.RecordAndDirty(so);
            return so;
        }

        static SummonPoolSO ImportSummonPool()
        {
            string json = ReadFile("summonPools.json");
            var root    = JObject.Parse(json);

            ValidateJsonAgainstDTO(typeof(SummonPoolDTO), root, "summonPools.json");

            var dto = root.ToObject<SummonPoolDTO>(JsonSerializer.Create(s_settings));
            var so  = SOImportUtil.FindOrCreate<SummonPoolSO>($"{OutputDir}/SummonPool.asset");

            so.entries = dto.entries?.Select(e => new SummonPoolEntry
            {
                towerId = e.towerId,
                weight  = e.weight,
            }).ToArray() ?? Array.Empty<SummonPoolEntry>();

            so.towerIds = dto.towerIds ?? Array.Empty<string>();

            SOImportUtil.RecordAndDirty(so);
            return so;
        }

        static GachaConfigSO ImportGachaConfig()
        {
            string json = ReadFile("gachaConfig.json");
            var root    = JObject.Parse(json);

            var allowedFields = new HashSet<string> { "costs", "pityThreshold" };
            foreach (var prop in root.Properties())
                if (!allowedFields.Contains(prop.Name))
                    throw new InvalidOperationException(
                        $"[GLD Import] Schema mismatch in 'gachaConfig.json': unknown field '{prop.Name}'.");

            var so = SOImportUtil.FindOrCreate<GachaConfigSO>($"{OutputDir}/GachaConfig.asset");
            so.pityThreshold = root["pityThreshold"]?.Value<int>() ?? 50;

            // costs is a JObject with string keys (ad, diamond_single, diamond_ten, free).
            var costsObj = (JObject)root["costs"];
            var list     = new List<GachaCostEntry>();
            if (costsObj != null)
            {
                foreach (var prop in costsObj.Properties())
                {
                    var costType = NormalizeGachaCostType(prop.Name);
                    var costObj  = (JObject)prop.Value;
                    list.Add(new GachaCostEntry
                    {
                        type       = ParseEnum<GachaCostType>(costType),
                        diamond    = costObj["diamond"]?.Value<int>() ?? 0,
                        cooldownMs = costObj["cooldownMs"]?.Value<int>() ?? 0,
                        dailyLimit = costObj["dailyLimit"]?.Value<int>() ?? 0,
                    });
                }
            }
            so.costs = list.ToArray();

            SOImportUtil.RecordAndDirty(so);
            return so;
        }

        static BossConfigSO ImportBossConfig()
        {
            string json = ReadFile("bossConfig.json");
            var root    = JObject.Parse(json);

            ValidateJsonAgainstSO(typeof(BossConfigSO), root, "bossConfig.json");

            var so = SOImportUtil.FindOrCreate<BossConfigSO>($"{OutputDir}/BossConfig.asset");
            so.invulnerabilityMs      = root["invulnerabilityMs"]?.Value<int>() ?? 0;
            so.phase2SpeedMultiplier  = root["phase2SpeedMultiplier"]?.Value<float>() ?? 1f;
            so.phase2Tint             = root["phase2Tint"]?.Value<int>() ?? 0;
            so.phase3SpeedMultiplier  = root["phase3SpeedMultiplier"]?.Value<float>() ?? 1f;
            so.phase3Tint             = root["phase3Tint"]?.Value<int>() ?? 0;
            so.phase3TransitionRatio  = root["phase3TransitionRatio"]?.Value<float>() ?? 0.25f;
            so.phaseTransitionRatio   = root["phaseTransitionRatio"]?.Value<float>() ?? 0.5f;

            SOImportUtil.RecordAndDirty(so);
            return so;
        }

        static EnergyConfigSO ImportEnergyConfig()
        {
            string json = ReadFile("energyConfig.json");
            var root    = JObject.Parse(json);

            // Validate top-level fields (ingameGacha is a special nested object).
            var topFields = new HashSet<string>
            {
                "energyCap", "energyInitial", "energyMax", "initialEnergy",
                "energyPerBossFastClear", "energyPerBossKill", "energyPerKill",
                "energyPerSecond", "energyPerWaveClear", "fastClearThresholdMs",
                "ingameGacha",
            };
            foreach (var prop in root.Properties())
                if (!topFields.Contains(prop.Name))
                    throw new InvalidOperationException(
                        $"[GLD Import] Schema mismatch in 'energyConfig.json': unknown field '{prop.Name}'.");

            var so = SOImportUtil.FindOrCreate<EnergyConfigSO>($"{OutputDir}/EnergyConfig.asset");
            so.energyCap               = root["energyCap"]?.Value<int>() ?? 0;
            so.energyInitial           = root["energyInitial"]?.Value<int>() ?? 0;
            so.energyMax               = root["energyMax"]?.Value<int>() ?? 0;
            so.initialEnergy           = root["initialEnergy"]?.Value<int>() ?? 0;
            so.energyPerBossFastClear  = root["energyPerBossFastClear"]?.Value<int>() ?? 0;
            so.energyPerBossKill       = root["energyPerBossKill"]?.Value<int>() ?? 0;
            so.energyPerKill           = root["energyPerKill"]?.Value<int>() ?? 0;
            so.energyPerSecond         = root["energyPerSecond"]?.Value<float>() ?? 0f;
            so.energyPerWaveClear      = root["energyPerWaveClear"]?.Value<int>() ?? 0;
            so.fastClearThresholdMs    = root["fastClearThresholdMs"]?.Value<int>() ?? 0;

            // ingameGacha: JSON key (e.g. "tier2") → IngameGachaTierEntry.tier
            var gacha = root["ingameGacha"] as JObject;
            var tiers = new List<IngameGachaTierEntry>();
            if (gacha != null)
            {
                foreach (var tierProp in gacha.Properties())
                {
                    // Key is "tier2", "tier3", "tier4" — extract digit suffix.
                    string keyName = tierProp.Name; // e.g. "tier2"
                    if (!int.TryParse(keyName.Replace("tier", ""), out int tierNum))
                        throw new InvalidOperationException(
                            $"[GLD Import] energyConfig.ingameGacha: unexpected key '{keyName}'. Expected 'tierN'.");

                    var entryObj = (JObject)tierProp.Value;
                    tiers.Add(new IngameGachaTierEntry
                    {
                        tier        = tierNum,
                        cost        = entryObj["cost"]?.Value<int>() ?? 0,
                        successRate = entryObj["successRate"]?.Value<float>() ?? 0f,
                    });
                }
            }
            so.ingameGacha = tiers.ToArray();

            SOImportUtil.RecordAndDirty(so);
            return so;
        }

        static ScalingConfigSO ImportScalingConfig()
        {
            string json = ReadFile("scalingConfig.json");
            var root    = JObject.Parse(json);

            var allowedFields = new HashSet<string> { "waveScaling" };
            foreach (var prop in root.Properties())
                if (!allowedFields.Contains(prop.Name))
                    throw new InvalidOperationException(
                        $"[GLD Import] Schema mismatch in 'scalingConfig.json': unknown field '{prop.Name}'.");

            var so = SOImportUtil.FindOrCreate<ScalingConfigSO>($"{OutputDir}/ScalingConfig.asset");

            var arr = (JArray)root["waveScaling"];
            so.waveScaling = arr?.Select(e => new WaveScalingEntry
            {
                hp    = e["hp"]?.Value<float>() ?? 1f,
                speed = e["speed"]?.Value<float>() ?? 1f,
            }).ToArray() ?? Array.Empty<WaveScalingEntry>();

            SOImportUtil.RecordAndDirty(so);
            return so;
        }

        static FamilyUpgradeConfigSO ImportFamilyUpgrade()
        {
            string json = ReadFile("familyUpgrade.json");
            var root    = JObject.Parse(json);

            ValidateJsonAgainstSO(typeof(FamilyUpgradeConfigSO), root, "familyUpgrade.json");

            var so = SOImportUtil.FindOrCreate<FamilyUpgradeConfigSO>($"{OutputDir}/FamilyUpgradeConfig.asset");
            so.baseFamilyUpgradeCost  = root["baseFamilyUpgradeCost"]?.Value<int>() ?? 0;
            so.maxFamilyUpgradeLevel  = root["maxFamilyUpgradeLevel"]?.Value<int>() ?? 0;
            so.upgradeableFamilies    = root["upgradeableFamilies"]?.ToObject<string[]>() ?? Array.Empty<string>();
            so.upgradesDamagePerLevel = root["upgradesDamagePerLevel"]?.Value<float>() ?? 0f;

            SOImportUtil.RecordAndDirty(so);
            return so;
        }

        static ElementMatchupSO ImportElementMatchup()
        {
            string json = ReadFile("elementMatchup.json");
            var root    = JObject.Parse(json);

            var so   = SOImportUtil.FindOrCreate<ElementMatchupSO>($"{OutputDir}/ElementMatchup.asset");
            var rows = new List<ElementMatchupRow>();

            foreach (var attackProp in root.Properties())
            {
                var multipliers = new List<ElementMultiplier>();
                var defObj      = (JObject)attackProp.Value;
                foreach (var defProp in defObj.Properties())
                {
                    multipliers.Add(new ElementMultiplier
                    {
                        defenseElement = defProp.Name,
                        value          = defProp.Value.Value<float>(),
                    });
                }
                rows.Add(new ElementMatchupRow
                {
                    attackElement = attackProp.Name,
                    multipliers   = multipliers.ToArray(),
                });
            }

            so.rows = rows.ToArray();
            SOImportUtil.RecordAndDirty(so);
            return so;
        }

        static DesignTokensSO ImportDesignTokens()
        {
            string json = ReadFile("designTokens.json");
            var root    = JObject.Parse(json);

            var so = SOImportUtil.FindOrCreate<DesignTokensSO>($"{OutputDir}/DesignTokens.asset");

            // elevation: keyed by "0","1","2","3","4"
            var elev = (JObject)root["elevation"];
            if (elev != null)
            {
                so.elevation = new ElevationTokens
                {
                    e0 = elev["0"]?.Value<string>() ?? "",
                    e1 = elev["1"]?.Value<string>() ?? "",
                    e2 = elev["2"]?.Value<string>() ?? "",
                    e3 = elev["3"]?.Value<string>() ?? "",
                    e4 = elev["4"]?.Value<string>() ?? "",
                };
            }

            // fontFamily
            var ff = (JObject)root["fontFamily"];
            if (ff != null)
            {
                so.fontFamily = new FontFamilyTokens
                {
                    display = ff["display"]?.Value<string>() ?? "",
                    pixel   = ff["pixel"]?.Value<string>() ?? "",
                };
            }

            // motion
            var mot = (JObject)root["motion"];
            if (mot != null)
            {
                var dur  = (JObject)mot["duration"];
                var eas  = (JObject)mot["easing"];
                var pre  = (JObject)mot["preset"];

                so.motion = new MotionTokens
                {
                    duration = new MotionDuration
                    {
                        base_     = dur?["base"]?.Value<int>() ?? 0,   // "base" → base_
                        cinematic = dur?["cinematic"]?.Value<int>() ?? 0,
                        fast      = dur?["fast"]?.Value<int>() ?? 0,
                        slow      = dur?["slow"]?.Value<int>() ?? 0,
                    },
                    easing = new MotionEasing
                    {
                        decelerate = eas?["decelerate"]?.Value<string>() ?? "",
                        emphatic   = eas?["emphatic"]?.Value<string>() ?? "",
                        standard   = eas?["standard"]?.Value<string>() ?? "",
                        stepwise   = eas?["stepwise"]?.Value<string>() ?? "",
                    },
                    preset = new MotionPreset
                    {
                        cinematic   = pre?["cinematic"]?.Value<string>() ?? "",
                        interactive = pre?["interactive"]?.Value<string>() ?? "",
                        overlay     = pre?["overlay"]?.Value<string>() ?? "",
                        punch       = pre?["punch"]?.Value<string>() ?? "",
                        ui          = pre?["ui"]?.Value<string>() ?? "",
                    },
                };
            }

            // overlayDim
            var od = (JObject)root["overlayDim"];
            if (od != null)
            {
                so.overlayDim = new OverlayDimTokens
                {
                    cinematic = od["cinematic"]?.Value<string>() ?? "",
                    default_  = od["default"]?.Value<string>() ?? "",  // "default" → default_
                    heavy     = od["heavy"]?.Value<string>() ?? "",
                    soft      = od["soft"]?.Value<string>() ?? "",
                };
            }

            // palette
            var pal = (JObject)root["palette"];
            if (pal != null)
            {
                var core    = (JObject)pal["core"];
                var elem    = (JObject)pal["element"];
                var state   = (JObject)pal["state"];
                var surf    = (JObject)pal["surface"];
                var tierArr = pal["tier"] as JObject;  // keyed by "1","2",...

                so.palette = new PaletteTokens
                {
                    core = core != null ? new CorePaletteTokens
                    {
                        accent        = core["accent"]?.Value<string>() ?? "",
                        armorPierce   = core["armorPierce"]?.Value<string>() ?? "",
                        bg            = core["bg"]?.Value<string>() ?? "",
                        border        = core["border"]?.Value<string>() ?? "",
                        bossPhase1    = core["bossPhase1"]?.Value<string>() ?? "",
                        danger        = core["danger"]?.Value<string>() ?? "",
                        gold          = core["gold"]?.Value<string>() ?? "",
                        gradeUnique   = core["gradeUnique"]?.Value<string>() ?? "",
                        info          = core["info"]?.Value<string>() ?? "",
                        panel         = core["panel"]?.Value<string>() ?? "",
                        success       = core["success"]?.Value<string>() ?? "",
                        text          = core["text"]?.Value<string>() ?? "",
                        textSecondary = core["textSecondary"]?.Value<string>() ?? "",
                        tierBright    = core["tierBright"]?.Value<string>() ?? "",
                    } : default,

                    element = elem != null ? new ElementPaletteTokens
                    {
                        earth     = ReadColorPair(elem["earth"] as JObject),
                        fire      = ReadColorPair(elem["fire"] as JObject),
                        lightning = ReadColorPair(elem["lightning"] as JObject),
                        neutral   = ReadColorPair(elem["neutral"] as JObject),
                        water     = ReadColorPair(elem["water"] as JObject),
                    } : default,

                    state = state != null ? new StatePaletteTokens
                    {
                        disabledBg = state["disabledBg"]?.Value<string>() ?? "",
                        disabledFg = state["disabledFg"]?.Value<string>() ?? "",
                        focus      = state["focus"]?.Value<string>() ?? "",
                        hover      = state["hover"]?.Value<string>() ?? "",
                        pressed    = state["pressed"]?.Value<string>() ?? "",
                        warning    = state["warning"]?.Value<string>() ?? "",
                    } : default,

                    surface = surf != null ? new SurfacePaletteTokens
                    {
                        alpha        = ReadSurfaceAlpha(surf["alpha"] as JObject),
                        bg           = surf["bg"]?.Value<string>() ?? "",
                        panel        = surf["panel"]?.Value<string>() ?? "",
                        panelElevated = surf["panelElevated"]?.Value<string>() ?? "",
                        panelSunken  = surf["panelSunken"]?.Value<string>() ?? "",
                    } : default,

                    tier = tierArr != null ? ReadTierColors(tierArr) : Array.Empty<TierColorEntry>(),
                };
            }

            // radius
            var rad = (JObject)root["radius"];
            if (rad != null)
            {
                so.radius = new RadiusTokens
                {
                    lg   = rad["lg"]?.Value<int>() ?? 0,
                    md   = rad["md"]?.Value<int>() ?? 0,
                    none = rad["none"]?.Value<int>() ?? 0,
                    pill = rad["pill"]?.Value<int>() ?? 0,
                    sm   = rad["sm"]?.Value<int>() ?? 0,
                    xl   = rad["xl"]?.Value<int>() ?? 0,
                    xs   = rad["xs"]?.Value<int>() ?? 0,
                };
            }

            // spacing — "2xl" → xxl, "3xl" → xxxl
            var spc = (JObject)root["spacing"];
            if (spc != null)
            {
                so.spacing = new SpacingTokens
                {
                    lg   = spc["lg"]?.Value<int>() ?? 0,
                    md   = spc["md"]?.Value<int>() ?? 0,
                    sm   = spc["sm"]?.Value<int>() ?? 0,
                    xl   = spc["xl"]?.Value<int>() ?? 0,
                    xs   = spc["xs"]?.Value<int>() ?? 0,
                    xxl  = spc["2xl"]?.Value<int>() ?? 0,   // "2xl" → xxl
                    xxxl = spc["3xl"]?.Value<int>() ?? 0,   // "3xl" → xxxl
                };
            }

            // typography: keyed object → array
            var typObj = root["typography"] as JObject;
            if (typObj != null)
            {
                so.typography = typObj.Properties().Select(p =>
                {
                    var e = (JObject)p.Value;
                    return new TypographyEntry
                    {
                        key        = p.Name,
                        family     = e["family"]?.Value<string>() ?? "",
                        lineHeight = e["lineHeight"]?.Value<float>() ?? 1f,
                        size       = e["size"]?.Value<string>() ?? "",
                        weight     = e["weight"]?.Value<int>() ?? 400,
                    };
                }).ToArray();
            }

            // zIndex
            var zi = (JObject)root["zIndex"];
            if (zi != null)
            {
                so.zIndex = new ZIndexTokens
                {
                    board    = zi["board"]?.Value<int>() ?? 0,
                    floating = zi["floating"]?.Value<int>() ?? 0,
                    hud      = zi["hud"]?.Value<int>() ?? 0,
                    modal    = zi["modal"]?.Value<int>() ?? 0,
                    overlay  = zi["overlay"]?.Value<int>() ?? 0,
                    toast    = zi["toast"]?.Value<int>() ?? 0,
                };
            }

            SOImportUtil.RecordAndDirty(so);
            return so;
        }

        static MergeChainSO ImportMergeChain()
        {
            string json = ReadFile("mergeChain.json");
            var root    = JObject.Parse(json);

            var so    = SOImportUtil.FindOrCreate<MergeChainSO>($"{OutputDir}/MergeChain.asset");
            var rules = new List<MergeRule>();

            foreach (var prop in root.Properties())
            {
                // Key format: either "inputA+inputB" (cross-family) or "towerId_same" (same-tower merge).
                // In the same-tower case the key has no '+' — treat inputA == inputB == key (same pair).
                string key    = prop.Name;
                string output = prop.Value.Value<string>();

                int plus = key.IndexOf('+');
                if (plus >= 0)
                {
                    // Cross-family or ordered pair rule.
                    rules.Add(new MergeRule
                    {
                        inputA = key.Substring(0, plus),
                        inputB = key.Substring(plus + 1),
                        output = output,
                    });
                }
                else
                {
                    // Same-tower rule: key is the composite string, store as (inputA=key, inputB="", output).
                    // MergeChainSO.Resolve() handles exact key lookups; same-family logic uses the key string.
                    rules.Add(new MergeRule
                    {
                        inputA = key,
                        inputB = "",
                        output = output,
                    });
                }
            }

            so.rules = rules.ToArray();
            SOImportUtil.RecordAndDirty(so);
            return so;
        }

        static void ImportGameDatabase(
            TowerCatalogSO       towers,
            UnitCatalogSO        units,
            WaveCatalogSO        waves,
            UpgradeCardCatalogSO upgrades,
            MapLayoutSO          map,
            SummonPoolSO         summonPool,
            GachaConfigSO        gacha,
            BossConfigSO         boss,
            EnergyConfigSO       energy,
            ScalingConfigSO      scaling,
            FamilyUpgradeConfigSO familyUpgrade,
            ElementMatchupSO     elementMatchup,
            DesignTokensSO       designTokens,
            MergeChainSO         mergeChain)
        {
            var db = SOImportUtil.FindOrCreate<GameDatabase>($"{OutputDir}/GameDatabase.asset");
            db.towers        = towers;
            db.units         = units;
            db.waves         = waves;
            db.upgrades      = upgrades;
            db.map           = map;
            db.summonPool    = summonPool;
            db.gacha         = gacha;
            db.boss          = boss;
            db.energy        = energy;
            db.scaling       = scaling;
            db.familyUpgrade = familyUpgrade;
            db.elementMatchup = elementMatchup;
            db.designTokens  = designTokens;
            db.mergeChain    = mergeChain;
            SOImportUtil.RecordAndDirty(db);
        }

        // ── Schema Validation ─────────────────────────────────────────────────

        /// <summary>
        /// Validates JSON object fields against a plain DTO type.
        /// Unknown JSON fields throw; SO fields absent from JSON warn.
        /// </summary>
        static void ValidateJsonAgainstDTO(Type dtoType, JObject jsonObj, string catalogName)
        {
            var fieldNames = GetDtoFieldNames(dtoType);

            foreach (var prop in jsonObj.Properties())
            {
                if (!fieldNames.Contains(prop.Name))
                    throw new InvalidOperationException(
                        $"[GLD Import] Schema mismatch in '{catalogName}': JSON field '{prop.Name}' " +
                        $"has no matching field in {dtoType.Name}. " +
                        $"Add '{dtoType.FullName}.{prop.Name}' or remove from TS export.");
            }

            foreach (var f in fieldNames)
            {
                if (!jsonObj.ContainsKey(f))
                    Debug.LogWarning(
                        $"[GLD Import] Stale field: {dtoType.Name}.{f} has no JSON counterpart in '{catalogName}'.");
            }
        }

        /// <summary>
        /// Validates JSON object fields against a ScriptableObject type (fields only, not methods/properties).
        /// Skips Unity internal fields. Unknown JSON fields throw; SO fields absent from JSON warn.
        /// </summary>
        static void ValidateJsonAgainstSO(Type soType, JObject jsonObj, string catalogName)
        {
            // Collect serialized public fields (excluding UnityEngine internal fields).
            var fieldNames = new HashSet<string>();
            foreach (var f in soType.GetFields(BindingFlags.Public | BindingFlags.Instance))
            {
                // Skip Unity internal fields.
                if (f.DeclaringType == typeof(UnityEngine.Object) ||
                    f.DeclaringType == typeof(ScriptableObject) ||
                    f.DeclaringType == typeof(Component) ||
                    f.DeclaringType == typeof(MonoBehaviour))
                    continue;

                // Check for [JsonProperty] attribute rename.
                var jsonProp = f.GetCustomAttribute<JsonPropertyAttribute>();
                fieldNames.Add(jsonProp?.PropertyName ?? f.Name);
            }

            foreach (var prop in jsonObj.Properties())
            {
                if (!fieldNames.Contains(prop.Name))
                    throw new InvalidOperationException(
                        $"[GLD Import] Schema mismatch in '{catalogName}': JSON field '{prop.Name}' " +
                        $"has no matching field in {soType.Name}. " +
                        $"Add '{soType.FullName}.{prop.Name}' or remove from TS export.");
            }

            foreach (var f in fieldNames)
            {
                if (!jsonObj.ContainsKey(f))
                    Debug.LogWarning(
                        $"[GLD Import] Stale field: {soType.Name}.{f} has no JSON counterpart in '{catalogName}'.");
            }
        }

        static HashSet<string> GetDtoFieldNames(Type type)
        {
            var names = new HashSet<string>();
            foreach (var f in type.GetFields(BindingFlags.Public | BindingFlags.Instance))
            {
                var jsonProp = f.GetCustomAttribute<JsonPropertyAttribute>();
                names.Add(jsonProp?.PropertyName ?? f.Name);
            }
            return names;
        }

        // ── DTO Definitions ───────────────────────────────────────────────────

        // Plain-data DTOs for Newtonsoft deserialization.
        // ScriptableObjects cannot be directly instantiated by JsonConvert.

        class TowerStatsDTO
        {
            public float attackSpeed;
            public float damage;
            public float projectileSpeed;
            public float range;
            public string special;
        }

        class TowerDefDTO
        {
            public string id;
            public string name;
            public string color;
            public int    cost;
            public string element;
            public string family;
            public bool   isPremium;
            public string shape;
            public int    tier;
            public string sameFamilyMergeTargetId;
            public TowerStatsDTO stats;
        }

        class UnitStatsDTO
        {
            public int   armor;
            public int   hp;
            public float speed;
        }

        class UnitDefDTO
        {
            public string id;
            public string name;
            public string type;
            public bool   isPremium;
            public int    bounty;
            public string element;
            public bool   flying;
            public string bossBehaviorId;
            public float  bossCcResist;
            public string specialBehavior;
            public UnitStatsDTO stats;
            public Dictionary<string, float> specialParams;
        }

        class WaveGroupDTO
        {
            public int    count;
            public string unitId;
            public float  hpMultiplier;
        }

        class WaveDefDTO
        {
            public int    slotIndex;
            public string kind;
            public float  delayAfterClearSec;
            public WaveGroupDTO[] groups;
        }

        class UpgradeCardDTO
        {
            public string id;
            public string name;
            public string description;
            public string icon;
            public string stackType;
            public float  value;
            public int    amount;
            public int    interval;
        }

        class GridPointDTO
        {
            public int x;
            public int y;
        }

        class MapDecorationDTO
        {
            public string kind;
            public int    variant;
            public float  x;
            public float  y;
        }

        class MapDefDTO
        {
            public string id;
            public string name;
            public int    height;
            public int    width;
            public int    tileSize;
            public string tilemapKey;
            public string tilesetKey;
            public int    recommendedPower;
            public float  rewardMultiplier;
            public float  difficultyHpMult;
            public GridPointDTO   spawnPoint;
            public GridPointDTO   exitPoint;
            public GridPointDTO[] path;
            public JArray         paths;
            public JArray         placementAnchors;
            public GridPointDTO[] buildablePoints;
            public GridPointDTO[] blockedPlacementPoints;
            public GridPointDTO[] obstacles;
            public GridPointDTO[] castleWallTiles;
            public MapDecorationDTO[] decorations;
        }

        class SummonPoolEntryDTO
        {
            public string towerId;
            public int    weight;
        }

        class SummonPoolDTO
        {
            public SummonPoolEntryDTO[] entries;
            public string[]             towerIds;
        }

        // ── Conversion Helpers ────────────────────────────────────────────────

        static string ReadFile(string fileName)
        {
            string path = Path.Combine(GameDataDir, fileName);
            if (!File.Exists(path))
                throw new FileNotFoundException($"[GLD Import] Missing catalog file: {path}");
            return File.ReadAllText(path);
        }

        static string EscapeId(string id)
        {
            // Replace characters invalid in asset file names.
            return id?.Replace("/", "_").Replace("\\", "_").Replace(":", "_") ?? "unnamed";
        }

        static T ParseEnum<T>(string value) where T : struct, Enum
        {
            if (string.IsNullOrEmpty(value)) return default;
            // Try case-insensitive parse.
            if (Enum.TryParse<T>(value, ignoreCase: true, out var result))
                return result;
            // Try snake_case / kebab-case → PascalCase mapping.
            string pascal = SnakeToPascal(value);
            if (Enum.TryParse<T>(pascal, ignoreCase: true, out result))
                return result;
            throw new InvalidOperationException(
                $"[GLD Import] Cannot parse '{value}' as {typeof(T).Name}.");
        }

        static string SnakeToPascal(string s)
        {
            if (string.IsNullOrEmpty(s)) return s;
            var parts = s.Split(new[] { '_', '-' }, StringSplitOptions.RemoveEmptyEntries);
            return string.Concat(parts.Select(p => char.ToUpper(p[0]) + p.Substring(1)));
        }

        // upgradeCards.json ids use snake_case: "dmg_up", "crit_dmg", etc.
        static string NormalizeUpgradeCardId(string id)
        {
            return id switch
            {
                "dmg_up"         => "DmgUp",
                "crit_dmg"       => "CritDmg",
                "energy_harvest" => "EnergyHarvest",
                "energy_regen"   => "EnergyRegen",
                "effect_amp"     => "EffectAmp",
                "tier_odds_up"   => "TierOddsUp",
                _                => SnakeToPascal(id),
            };
        }

        // gachaConfig.json cost keys use snake_case: "ad", "diamond_single", "diamond_ten", "free"
        static string NormalizeGachaCostType(string key)
        {
            return key switch
            {
                "ad"            => "Ad",
                "diamond_single"=> "DiamondSingle",
                "diamond_ten"   => "DiamondTen",
                "free"          => "Free",
                _               => SnakeToPascal(key),
            };
        }

        static GridPoint ToGridPoint(GridPointDTO dto)
        {
            if (dto == null) return default;
            return new GridPoint { x = dto.x, y = dto.y };
        }

        static GridPoint[] ToGridPoints(GridPointDTO[] arr)
        {
            if (arr == null) return Array.Empty<GridPoint>();
            return arr.Select(p => new GridPoint { x = p.x, y = p.y }).ToArray();
        }

        static MapDecoration[] ToDecorations(MapDecorationDTO[] arr)
        {
            if (arr == null) return Array.Empty<MapDecoration>();
            return arr.Select(d => new MapDecoration
            {
                kind    = ParseEnum<DecorationKind>(d.kind),
                variant = d.variant,
                x       = d.x,
                y       = d.y,
            }).ToArray();
        }

        static ElementColorPair ReadColorPair(JObject obj)
        {
            if (obj == null) return default;
            return new ElementColorPair
            {
                glow    = obj["glow"]?.Value<string>() ?? "",
                primary = obj["primary"]?.Value<string>() ?? "",
            };
        }

        static SurfaceAlphaTokens ReadSurfaceAlpha(JObject obj)
        {
            if (obj == null) return default;
            return new SurfaceAlphaTokens
            {
                accent20    = obj["accent20"]?.Value<string>() ?? "",
                bg76        = obj["bg76"]?.Value<string>() ?? "",
                bg80        = obj["bg80"]?.Value<string>() ?? "",
                bg95        = obj["bg95"]?.Value<string>() ?? "",
                danger20    = obj["danger20"]?.Value<string>() ?? "",
                overlay60   = obj["overlay60"]?.Value<string>() ?? "",
                overlay70   = obj["overlay70"]?.Value<string>() ?? "",
                overlayDark  = obj["overlayDark"]?.Value<string>() ?? "",
                overlayHeavy = obj["overlayHeavy"]?.Value<string>() ?? "",
                panel70     = obj["panel70"]?.Value<string>() ?? "",
                panel85     = obj["panel85"]?.Value<string>() ?? "",
                panel90     = obj["panel90"]?.Value<string>() ?? "",
                panel92     = obj["panel92"]?.Value<string>() ?? "",
                panel95     = obj["panel95"]?.Value<string>() ?? "",
                panel96     = obj["panel96"]?.Value<string>() ?? "",
            };
        }

        static TierColorEntry[] ReadTierColors(JObject obj)
        {
            var list = new List<TierColorEntry>();
            foreach (var prop in obj.Properties())
            {
                if (!int.TryParse(prop.Name, out int tierNum)) continue;
                var e = (JObject)prop.Value;
                list.Add(new TierColorEntry
                {
                    tier    = tierNum,
                    bright  = e["bright"]?.Value<string>() ?? "",
                    dark    = e["dark"]?.Value<string>() ?? "",
                    primary = e["primary"]?.Value<string>() ?? "",
                });
            }
            return list.ToArray();
        }
    }
}

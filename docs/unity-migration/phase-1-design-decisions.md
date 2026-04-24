# Phase 1 Design Decisions — Data & Asset Pipeline

> **Date:** 2026-04-24
> **Source plan:** `docs/superpowers/plans/2026-04-24-unity-phase-1-data-asset-pipeline.md` Task 1
> **Agents consulted:** Unity Architect / Unity Editor Tool Developer / Technical Artist (all three in `.claude/agents/`)
> **Status:** Decisions finalized. Implementer can proceed without follow-up.

이 문서는 Phase 1의 3가지 주요 축(SO 스키마 / Importer 패턴 / Atlas 전략)에 대한 결정사항을 에이전트별 권고와 함께 기록한다. 각 섹션은 **권고 요약 → 선택 → 근거**의 순서로 구성되어 있다. Phase 2 이전에 재검토가 필요한 항목은 마지막 "Open Questions Deferred to Phase 2"에 모아두었다.

---

## 1. SO Schema Decisions (Unity Architect)

### Q1-1. Aggregate Root — Single GameDatabase vs Flat Folder

**Decision: (C) 하이브리드 — 개별 파일 저장 + GameDatabase 참조 허브.**

`Assets/Data/` 폴더에 13개 카탈로그 SO를 개별 파일로 저장한다. `Assets/Data/GameDatabase.asset`은 모든 카탈로그 SO 참조를 들고 있는 "참조 허브"로, `Assets/Resources/GameBootstrap.asset`이 이를 참조해 런타임에 단일 로드한다.

**근거:**
- 옵션 A(단일 거대 SO)는 디자이너 동시 편집 시 YAML 머지 충돌이 한 파일에 집중된다. 19개 TowerDefSO 인라인 배열이 한 파일에 있으면 2인 이상 편집 시 diff 폭발.
- 옵션 B(완전 flat)는 런타임에서 12회 개별 `Resources.Load` 호출이 필요하고 Addressables 그룹핑 단위를 코드로 추적해야 한다 — 부트스트랩이 single entry point를 잃는다.
- 하이브리드 C는 두 문제를 동시에 해결한다: 개별 파일로 Git diff는 작고, `GameDatabase` 단일 참조로 런타임 1회 로드, Addressables에서 `GameDatabase.asset`만 `Preload` 레이블로 묶으면 나머지 의존 SO 전부 함께 따라온다.
- 테스트 모킹: EditMode에서 `ScriptableObject.CreateInstance<GameDatabase>()` 후 필드 교체로 Mock 가능 — `Resources.Load`/Addressables 비의존.

```csharp
// Assets/Scripts/Data/GameDatabase.cs
[CreateAssetMenu(menuName = "GLD/GameDatabase", fileName = "GameDatabase")]
public sealed class GameDatabase : ScriptableObject
{
    [Header("Catalogs")]
    public TowerCatalogSO       towers;
    public UnitCatalogSO        units;
    public WaveCatalogSO        waves;
    public UpgradeCardCatalogSO upgrades;
    public SummonPoolSO         summonPool;

    [Header("Configs")]
    public GachaConfigSO          gacha;
    public EnergyConfigSO         energy;
    public ScalingConfigSO        scaling;
    public FamilyUpgradeConfigSO  familyUpgrade;
    public ElementMatchupSO       elementMatchup;
    public BossConfigSO           boss;
    public MapLayoutSO            map;
    public DesignTokensSO         designTokens;

    public static GameDatabase Active { get; private set; }
    internal void Activate() => Active = this;
}
```

런타임 접근: `Resources.Load<GameBootstrap>("GameBootstrap")` 1회, 이후 `GameBootstrap.database.towers`처럼 dot-navigation만 한다.

### Q1-2. Tier Chains — Direct SO Reference vs String ID Lookup

**Decision: (B) `string mergeTargetId` + TowerCatalog 룩업.**

`TowerDefSO`에 `string sameFamilyMergeTargetId` 단일 필드, cross-family/ultimate 규칙은 별도 `MergeChainSO`에 `MergeRule[]`로 표현. `TowerDefSO[]` 직접 참조는 금지.

**근거:**
- 옵션 A(`TowerDefSO[] mergeOutputs` 직접 참조): Unity 직렬화 레이어에서 오브젝트 참조 사이클 발생. 리팩터 시 타워 ID/파일명 변경이 GUID remap에도 불구하고 Editor 외부 JSON emit에서 silent null이 됨.
- Phase 3 parity harness에서 SO→JSON 직렬화 시 오브젝트 참조가 Unity instanceID로 표현되어 TS JSON과 구조적으로 달라짐 → byte-equal 비교 불가.
- 옵션 B(string ID): TS의 `MERGE_CHAIN` 키 구조와 1:1 대응, JSON round-trip에서 문자열 그대로 보존.

```csharp
[CreateAssetMenu(menuName = "GLD/Data/TowerDef", fileName = "TowerDef")]
public sealed class TowerDefSO : ScriptableObject
{
    public string id;
    public string displayName;
    public string family;
    public int    tier;
    public float  damage;
    public float  range;
    public float  attackSpeed;
    public string element;
    public int    cost;
    public bool   isPremium;
    [Tooltip("같은 family 동 tier 2개 합성 결과. 없으면 empty.")]
    public string sameFamilyMergeTargetId;
}

[Serializable] public struct MergeRule { public string inputA, inputB, output; }

[CreateAssetMenu(menuName = "GLD/Data/MergeChain", fileName = "MergeChain")]
public sealed class MergeChainSO : ScriptableObject
{
    public MergeRule[] rules;
    Dictionary<string, string> _lookup;

    void OnEnable()
    {
        _lookup = new Dictionary<string, string>(rules.Length * 2);
        foreach (var r in rules) {
            _lookup[$"{r.inputA}+{r.inputB}"] = r.output;
            _lookup[$"{r.inputB}+{r.inputA}"] = r.output;
        }
    }
    public string Resolve(string a, string b) =>
        _lookup.TryGetValue($"{a}+{b}", out var r) ? r : null;
}
```

### Q1-3. JSON Round-Trip Serializer

**Decision: (B) Newtonsoft.Json (`com.unity.nuget.newtonsoft-json`), Editor-only asmdef 참조.**

**근거:**
- `JsonUtility`가 막히는 최소 3개 카탈로그:
  1. `ElementMatchupSO` — nested `Dictionary<string, Dictionary<string, float>>`.
  2. `GachaConfigSO` — string+int 혼합 배열.
  3. `ScalingConfigSO` — int-keyed dictionary `Record<number, {hp, armor, speed, bounty}>`.
- `System.Text.Json`은 WebGL+IL2CPP에서 runtime code emit 금지 제약으로 AOT 이슈 위험.
- 커스텀 직렬화(D)는 13 × 2 메서드 보일러플레이트 → 버그 폴리오.
- Newtonsoft의 300KB는 **Editor-only asmdef**에서만 참조 시 런타임 빌드 사이즈에 영향 0.

```csharp
using Newtonsoft.Json;

public static class JsonToSOImporter
{
    [MenuItem("GLD/Import Shared Data")]
    static void MenuImportAll() => ImportAll(interactive: true);
    public static void ImportAllBatch() => ImportAll(interactive: false);

    static void ImportElementMatchup(ExportIndex index)
    {
        var json = LoadCatalogJson("element_matchup");
        var raw  = JsonConvert.DeserializeObject<
            Dictionary<string, Dictionary<string, float>>>(json);

        var so = LoadOrCreateSO<ElementMatchupSO>("Assets/Data/ElementMatchup.asset");
        so.rows = raw.Select(outer => new ElementMatchupRow {
            attackElement = outer.Key,
            multipliers   = outer.Value.Select(inner => new ElementMultiplier {
                defenseElement = inner.Key, value = inner.Value }).ToArray()
        }).ToArray();

        EditorUtility.SetDirty(so);
    }
}
```

SO→JSON (parity harness용):
```csharp
public string ToJson() => JsonConvert.SerializeObject(this, new JsonSerializerSettings {
    Formatting = Formatting.None,
    NullValueHandling = NullValueHandling.Include,
    ContractResolver = new AlphabeticContractResolver(),  // TS stableStringify와 동일한 키 정렬
});
```

### Q1-4. Anti-Pattern Watchlist — Phase 1 구현자 금지 목록

- **God CatalogSO**: `TowerCatalogSO`에 `resolveMerge()`/`scaleStats()`/`rollGacha()` 로직 금지. 카탈로그 SO는 데이터 보유 + O(1) lookup만 담당. 로직은 Phase 2에서 pure C# static class로 분리.
- **SO 런타임 필드 뮤테이션**: `TowerDefSO.damage += buff` 금지. SO는 에셋 파일이며 런타임 수정은 Play Mode 종료 후에도 오염 유지. 런타임 수정은 반드시 별도 `TowerRuntimeData`(plain class/struct)에 복사 후.
- **`Resources.LoadAll<TowerDefSO>()` 동적 조립**: `GameDatabase` 허브 우회 금지. 누락 에셋이 silent 무시됨. 모든 접근은 `GameDatabase.Active.towers.FindById(id)`로 단일화.
- **Magic string enum 필드**: `element`, `family`, `special`을 `string`으로만 남기지 말고 C# `enum` 정의 + `Enum.TryParse` 실패 시 즉시 throw. Phase 3 parity harness가 enum 오타를 컴파일 시점에 잡아야 함.
- **`OnEnable`에서 `AssetDatabase` 호출 금지**: Dictionary 캐시 빌드 등 in-memory 연산은 OK, 하지만 `AssetDatabase.LoadAssetAtPath`나 `Resources.Load`는 인스펙터 로드 순서 보장 없음 + 테스트 환경 깨짐 → 금지.

---

## 2. Importer Pattern (Unity Editor Tool Developer)

### Q2-1. Menu Importer vs AssetPostprocessor

**Decision: (A) Menu-driven + CI-callable batch API.**

**근거 (AssetPostprocessor가 실패하는 이유):**
- JSON이 `Assets/Resources/GameData/` 아래에 있지만 `.gitignore`됨 → Unity가 추적하지 못하는 외부 생성 파일에 AssetPostprocessor 트리거가 불안정.
- CI `-batchmode`에서 JSON이 갑자기 `Assets/` 아래 나타나면 initial import 순서에 의존해 postprocessor가 호출될 수도/안 될 수도 있음.
- 아티스트/기획자가 JSON을 직접 건드릴 경우 "저장만 했는데 SO가 바뀌었다"는 ghost import 발생 → 디버그 불가.
- `OnPostprocessAllAssets`의 import order는 보장되지 않음 — 13개 카탈로그 간 cross-reference(`MERGE_CHAIN → TowerCatalog`)가 partial-import 중 null이 될 수 있음.

```csharp
public static class JsonToSOImporter
{
    [MenuItem("GLD/Import Shared Data")]
    private static void MenuImportAll() => ImportAll(interactive: true);

    // CI: Unity.exe -executeMethod GLD.Data.Editor.JsonToSOImporter.ImportAllBatch
    public static void ImportAllBatch() => ImportAll(interactive: false);

    private static void ImportAll(bool interactive) { ... }
}
```

**단방향 TS → Unity** 파이프라인이므로 implicit auto-import는 불필요. 명시적 트리거가 CI 재현성과 PR diff 투명성 양쪽을 만족.

### Q2-2. Idempotent + Diff-Friendly 패턴

핵심: **find-or-create at canonical path, mutate in-place, batch dirty/save.**

```csharp
internal static class SOImportUtil
{
    private static readonly List<Object> s_dirtyAssets = new();

    internal static T FindOrCreate<T>(string assetPath) where T : ScriptableObject
    {
        var existing = AssetDatabase.LoadAssetAtPath<T>(assetPath);
        if (existing != null) return existing;

        var so = ScriptableObject.CreateInstance<T>();
        var dir = System.IO.Path.GetDirectoryName(assetPath);
        if (!AssetDatabase.IsValidFolder(dir))
            System.IO.Directory.CreateDirectory(dir);

        AssetDatabase.CreateAsset(so, assetPath);
        return so;
    }

    internal static void RecordAndDirty(Object asset)
    {
        Undo.RecordObject(asset, "GLD Import Shared Data");
        EditorUtility.SetDirty(asset);
        s_dirtyAssets.Add(asset);
    }

    internal static void SaveBatch()
    {
        AssetDatabase.SaveAssets();
        s_dirtyAssets.Clear();
    }
}
```

**필드 직렬화 순서:** SO `.asset` 파일은 Unity YAML이며 필드 순서는 **C# 선언 순서**로 고정. diff 안정을 위해 C# 선언 순서를 알파벳 정렬로 유지하고, TS `stableStringify`와 맞춰 JSON도 알파벳 정렬로 emit → JSON↔SO 양측에서 stable diff 보장.

### Q2-3. Fail-Loud Schema Mismatch 정책

**Decision: (D) — JSON에 있는데 SO에 없으면 throw, SO에 있는데 JSON에 없으면 LogWarning.**

**근거:**
- TS가 SSOT이므로 TS 신규 필드가 C# SO에 반영되지 않은 것 = 파이프라인 단절 → throw.
- 반대로 SO에 TS가 삭제한 구 필드가 남아 있는 건 Unity 소비자가 아직 리팩터 안 한 상태일 뿐 → 런타임 버그 아님 → LogWarning.

**에러 발동 위치:** `ImportAll()` 내 각 카탈로그별 import 메서드. `OnPreprocess`는 JSON 파싱 전이라 너무 이름. `ValidateDatabase`는 cross-reference 전용이라 관심사 섞임.

**예외 타입:** `System.InvalidOperationException`. 커스텀 `ImportException` 타입을 만들면 EditMode 테스트에서 `Assert.Throws<ImportException>()`으로 정확히 잡을 수 있다.

```csharp
private static void ValidateJsonFields(
    Type soType, HashSet<string> jsonFields, string catalog)
{
    var soFields = new HashSet<string>(
        soType.GetFields(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance)
            .Where(f => f.GetCustomAttribute<SerializeField>() != null || f.IsPublic)
            .Select(f => f.Name));

    foreach (var jf in jsonFields) {
        if (!soFields.Contains(jf))
            throw new InvalidOperationException(
                $"[GLD Import] Schema mismatch in '{catalog}': " +
                $"JSON field '{jf}' has no matching field in {soType.Name}. " +
                $"Add '{soType.FullName}.{jf}' or remove from TS export.");
    }
    foreach (var sf in soFields) {
        if (!jsonFields.Contains(sf))
            Debug.LogWarning(
                $"[GLD Import] Stale field in '{catalog}': {soType.Name}.{sf} " +
                $"has no corresponding JSON field. Consider removing if deleted from TS.");
    }
}
```

`Debug.LogError` 대신 `throw`를 써야 `-batchmode` CI가 non-zero exit code로 실패함. `Debug.LogError`는 Editor에서 빨간 줄만 남기고 process exit 안 됨.

### Q2-4. Discriminated Union 직렬화 (`ProjectileType`)

**Decision: (A) 태그 struct 플래튼 — 우선 기본값. 조건부로 (B) `[SerializeReference]` 전환.**

```csharp
[Serializable] public enum ProjectileKind { Straight, Homing }

[Serializable]
public struct ProjectileConfig
{
    public ProjectileKind kind;
    public float speed;      // straight variant
    public float turnRate;   // homing variant
}

// TowerDefSO 필드
[SerializeField] public ProjectileConfig projectile;
```

**조건부 (B) 전환 기준:**
- Union variant가 **5개 이상**으로 늘어날 것이 확실하고
- 각 variant가 전용 로직(메서드)을 갖는 독립 클래스로 분리되어야 하고
- Inspector에서 variant 드래그·교체 워크플로우가 필요할 때

현재 `ProjectileType`은 variant 2개(straight/homing) + 데이터 전용 → `[SerializeReference]` 오버헤드(polymorphic 직렬화, managed heap 할당, JsonUtility 비호환)가 이점보다 큼. (C) nested JSON string 저장은 parity harness에서 byte-equal 비교 불가 → **사용 금지**.

| 케이스 | 도구 |
|---|---|
| Flat struct / primitives | `JsonUtility` |
| Discriminated union (≤4 variant, data-only) | `JsonUtility` + flatten struct |
| Discriminated union (5+ variant, 메서드 포함) | Newtonsoft.Json + `[SerializeReference]` |
| nested JSON string | 사용 금지 |

---

## 3. Atlas Strategy (Technical Artist)

### Q3-1. Atlas Grouping — Category vs Load Phase

**Decision: (C) — 10 category atlases, each belonging to exactly one Addressables group.**

| Atlas | Addressables Group | Load Trigger |
|---|---|---|
| Towers | Preload | 앱 시작 시 |
| Units_Core | Preload | 앱 시작 시 |
| UI_HUD | Preload | 앱 시작 시 |
| CastleWall_SpawnHut | Preload | 앱 시작 시 |
| Tiles | Preload | 앱 시작 시 |
| Icons | Preload | 앱 시작 시 |
| Units_Boss | Boss | `OnBossWarning` 이벤트 |
| VFX | Optional_UI | 게임 씬 진입 후 prefetch |
| Projectiles | Optional_UI | 게임 씬 진입 후 prefetch |
| UI_Lobby | Optional_UI | 메타/로비 화면 진입 |

**근거:**
- 옵션 A(10 category + Addressables만): atlas 내 스프라이트가 같은 entry 공유 → 일부만 필요해도 전체 texture가 GPU 업로드. 의미 없음.
- 옵션 B(load-phase 재그룹): Towers+UI_HUD+Tiles를 한 atlas에 넣으면 카테고리 섞여 폴더 기반 postprocessor grouping 무너짐.
- **옵션 C**: atlas = Addressables load unit 1:1 대응. Cold-start는 Preload(6 atlas, ~11.3 MB VRAM) 만, Boss wave 직전 Units_Boss(~0.45 MB) 추가, UI_Lobby는 로비 진입 시.

**Atlas-to-folder 매핑 (SpriteImportPostprocessor 경로 기준):**

```
Assets/Art/Sprites/towers/         → Towers atlas           (Preload)
Assets/Art/Sprites/units_core/     → Units_Core atlas       (Preload)
Assets/Art/Sprites/units_boss/     → Units_Boss atlas       (Boss)
Assets/Art/Sprites/projectiles/    → Projectiles atlas      (Optional_UI)
Assets/Art/Sprites/vfx/            → VFX atlas              (Optional_UI)
Assets/Art/Sprites/ui_hud/         → UI_HUD atlas           (Preload)
Assets/Art/Sprites/ui_lobby/       → UI_Lobby atlas         (Optional_UI)
Assets/Art/Sprites/castle_wall/    → CastleWall_SpawnHut    (Preload)
Assets/Art/Sprites/spawn_hut/      → CastleWall_SpawnHut    (Preload)
Assets/Art/Sprites/tiles/          → Tiles atlas            (Preload)
Assets/Art/Sprites/icons/          → Icons atlas            (Preload)
```

> **구현 노트:** `copy-assets-to-unity.ts`는 `units/`를 boss/core로 분리. boss 판별 기준: 파일명에 `boss`, `dragon-boss`, `dragon_idle`, `dragon_death`, `dragon-boss-rage` 포함 → `units_boss/`, 나머지 → `units_core/`. 현재 5개 파일이 boss. `ui/` 폴더도 hud/lobby로 분리 (manifest.ts group 레이블 기준).

### Q3-2. Atlas Packing Settings

**Decision: 플랜 값 대체로 유지. Padding 4→6 상향, Tight Packing → Rect Packing 변경.**

| Setting | Value | 플랜 대비 |
|---|---|---|
| Padding | **6** px | 4→6 상향 |
| Extrude Edges | On | 유지 |
| Allow Rotation | Off | 유지 |
| Packing | **Rect Packing** | Tight → Rect |
| Compression | None | 유지 |
| Include in Build | Off | 유지 |
| Atlas Type | Master | 유지 |

**Padding 4 → 6 근거:**
Point filter로 bilinear 번짐 없지만 `PixelPerfectCamera` pixel snapping + 서브픽셀 보정 패스가 UV를 ±0.5px 이동시킬 수 있음. Mobile GPU(Mali-G52, Apple A11)가 mip level 0에서도 텍셀 센터 float 계산 시 ±1 ULP 오류 누적. Extrude Edges On이 경계 1px 복제하므로 실질 여백 = pad - 1px. **6px padding → 실질 5px** 안전 마진. 번들 영향 <0.1%.

**Tight → Rect 근거:**
- Tight는 Sprite Atlas V2에서 개별 스프라이트 incremental re-pack 시 atlas 전체 재계산. Rect는 슬롯 단위 업데이트 → iteration 속도 유리.
- 픽셀 아트 스프라이트는 대부분 직사각형 투명 패딩이라 polygon hull ≈ rect hull, density 이득 미미.
- Unity 6 Sprite Atlas V2 문서: Tight + Extrude Edges 조합 시 extruded pixel이 인접 hull 안에 들어갈 edge case.

**Compression None 유지:** Sprite Atlas V2의 "Compression" 설정은 legacy TextureImporter compression이며 V2에서는 의미 없음. 실제 압축은 Platform Override에서 처리.

### Q3-3. WebGL Texture Compression — DXT5 vs ASTC

**Decision: Phase 1 = DXT5 (PC override). Phase 2 = ASTC 6×6 iOS/Android override 추가.**

```csharp
// SpriteImportPostprocessor.cs — Phase 1
ti.SetPlatformTextureSettings(new TextureImporterPlatformSettings {
    name = "WebGL",
    overridden = true,
    maxTextureSize = 4096,
    format = TextureImporterFormat.DXT5,
    compressionQuality = 100,
    allowsAlphaSplitting = false,
});
// Phase 2에서 추가:
// { name = "iPhone", format = ASTC_6x6, maxTextureSize = 2048, overridden = true }
// { name = "Android", format = ASTC_6x6, overridden = true }
```

**Byte-budget 근거:**

| 시나리오 | 총 atlas VRAM | brotli 추정 |
|---|---|---|
| RGBA8 (no compression) | ~106 MB | ~22 MB (빌드 예산 초과) |
| DXT5 only | ~15.7 MB | ~10.2 MB (예산 내) |
| ASTC 6×6 only | ~14.0 MB | ~8.4 MB (모바일 최적, desktop Chrome 미지원) |
| Both (DXT5 + ASTC) | ~29.7 MB raw | ~18.6 MB (빌드 예산 초과 위험) |
| **Phase 1: DXT5 only** | **~15.7 MB** | **~10.2 MB (채택)** |

**R1 리스크:** iPhone 8 Safari는 DXT5 미지원 → CPU decode로 RGBA8 업로드 → atlas VRAM ~106 MB + Unity 런타임 ~80 MB = **186 MB**. 256 MB MEMORY_SIZE 기준 타이트. **Phase 2 PoC 실기 테스트 전에 ASTC override 필수.**

Phase 1에서 `SpriteImportPostprocessor.cs`에 iPhone/Android override를 `overridden = false`로 미리 작성해 커밋 → Phase 2에서 `true` 전환만 하면 됨.

### Q3-4. Pixel Art Import Settings

```csharp
// Assets/Art/Sprites/** 아래 모든 .png 적용
ti.spritePixelsPerUnit  = 64f;
ti.filterMode           = FilterMode.Point;
ti.mipmapEnabled        = false;                    // 아래 상세
ti.sRGBTexture          = true;
ti.isReadable           = false;                    // 전역
ti.wrapMode             = TextureWrapMode.Clamp;
ti.alphaIsTransparency  = true;
ti.spriteImportMode     = SpriteImportMode.Single;  // spritesheet은 Multiple
ti.compressionQuality   = (int)TextureCompressionQuality.Best;  // 100
```

- **Mipmaps off — 예외 없음.** 게임 내 카메라 줌아웃 없음. `PixelPerfectCamera` 설정이 Upscale Render Texture Off + Crop Frame Both. Boss warning은 UI 오버레이(world zoom 아님). Mipmap 켜면 Point filter와 mip 경계에서 계단 깨짐.
- **sRGB on — 모든 스프라이트가 albedo/color.** Normal map은 없음(절차 생성 픽셀 아트).
- **isReadable = false 전역.** `GetPixels`/`SetPixels` 런타임 호출 WebGL에서 사실상 불가. 타일 A* walkable 판정은 `MapLayoutSO.bool[,] grid` 사용 — 텍스처 픽셀 직접 읽기 금지.
- **Compression Quality = 100.** DXT5 high quality = BC3 slow-path로 압축 품질 최대. 픽셀 아트 hard edge + single-pixel detail은 낮은 quality에서 블록 artifact 눈에 띔. Editor import 시간 2~3× 증가 but Editor-only 비용.

---

## Asset Budget Sheet

> 기준: iPhone 8 (Apple A11, LPDDR4 3 GB). WebGL MEMORY_SIZE = 256 MB 기본값.

### Atlas Texture VRAM

| Atlas | Group | Atlas Tex | ASTC 6×6 VRAM | DXT5 VRAM (Phase 1) |
|---|---|---|---|---|
| Towers | Preload | 4096² | 7.12 MB | 8.00 MB |
| Units_Core | Preload | 2048² | 1.78 MB | 2.00 MB |
| UI_HUD | Preload | 2048² | 1.78 MB | 2.00 MB |
| Tiles | Preload | 1024² | 0.45 MB | 0.50 MB |
| CastleWall_SpawnHut | Preload | 512² | 0.11 MB | 0.12 MB |
| Icons | Preload | 256² | 0.03 MB | 0.03 MB |
| **Preload 합계** | | | **11.27 MB** | **12.65 MB** |
| Units_Boss | Boss | 1024² | 0.45 MB | 0.50 MB |
| VFX | Optional_UI | 1024² | 0.45 MB | 0.50 MB |
| Projectiles | Optional_UI | 256² | 0.03 MB | 0.03 MB |
| UI_Lobby | Optional_UI | 2048² | 1.78 MB | 2.00 MB |
| **전체 합계** | | | **13.98 MB** | **15.68 MB** |

> Boss wave 피크 (Preload + Boss 동시): **11.72 MB ASTC / 13.15 MB DXT5**

### WebGL 빌드 Brotli 예산 (18 MB 목표)

| 항목 | 추정 크기 | 비고 |
|---|---|---|
| Atlas (DXT5 Phase 1) | ~10.2 MB | 압축률 0.65 |
| Atlas (ASTC Phase 2+) | ~8.4 MB | 압축률 0.60 |
| C# IL2CPP (Unity 6) | ~4.5 MB | URP 2D + Addressables |
| Galmuri11 SDF atlas | ~0.7 MB | 2048² SDF |
| GameData JSON + SOs | ~0.3 MB | 13 catalogs |
| BGM (Compressed In Memory) | ~2.0 MB | Default group |
| **DXT5 Phase 1 합계** | **~17.7 MB** | ⚠ 예산 근접 |
| **ASTC Phase 2+ 합계** | **~15.9 MB** | 여유 2.1 MB |

### Budget Alert Thresholds

| 지표 | Yellow | Red | 측정 |
|---|---|---|---|
| 빌드 brotli 전체 | > 16 MB | > 18 MB | `unity-build.yml` artifact |
| Preload VRAM (ASTC) | > 12 MB | > 15 MB | Atlas Inspector packed size |
| Towers atlas 단독 | > 8 MB | > 10 MB | Atlas preview size |
| UI_Lobby atlas | > 2 MB | > 3 MB | atlas 재분리 트리거 |
| iOS Safari cold-start texture upload | > 50 MB | > 80 MB | Phase 2 실기 Xcode memory profiler |

---

## 4. Open Questions Deferred to Phase 2

다음 항목은 Phase 2 PoC에서 실기 검증 후 결정한다:

1. **iOS/Android ASTC override 활성화 시점.** Phase 1에서 postprocessor 코드는 작성하되 `overridden = false`로 커밋. Phase 2 실기 테스트(iPhone 8 + 안드로이드 미드레인지)에서 DXT5 fallback VRAM이 실제로 허용 한계 안에 들어오는지 측정 후 ASTC 전환 의사결정.
2. **Newtonsoft.Json → `link.xml` preserve 설정.** Phase 1 importer는 Editor-only이므로 IL2CPP/AOT 영향 없음. Phase 3 런타임에서 SO→JSON을 쓰는 코드가 생기면 그 시점에 `link.xml` 추가 + WebGL 빌드 사이즈 재측정.
3. **`ProjectileType` variant 확장.** Phase 1에서는 straight/homing 2-variant flatten struct. Phase 4 보스 능력 추가 시 variant가 5개 이상 되면 `[SerializeReference]` + Newtonsoft로 전환 검토.
4. **Towers atlas 4096² vs 2×2048² 분할.** Phase 1에서는 단일 4096² 유지 (145 sprite, utilization ~26%). Phase 3~4에서 타워 수가 25+ 로 늘어나거나 utilization이 40% 초과 시 2-atlas split 결정.
5. **Icons atlas 범위.** PWA `icon-192.png`/`icon-512.png`/`icon-512-maskable.png`는 게임 내 렌더링에 미사용 → `copy-assets-to-unity.ts`에서 skip 또는 별도 `Assets/Art/AppIcons/`에 복사 (atlas 제외). Phase 1에서 skip 기본값, Phase 2 웹 manifest 통합 단계에서 재결정.

---

## 변경 이력

| 날짜 | 내용 |
|---|---|
| 2026-04-24 | 초안 — Unity Architect / Unity Editor Tool Developer / Technical Artist 3종 에이전트 컨설팅 결과 compile. Phase 1 Task 1 deliverable. |

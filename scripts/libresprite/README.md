# LibreSprite asset forge

Post-processing chain for canvas-generated pixel art. Used by `gld-pipe forge`
to snap palettes, add rim lighting, inject texture noise, and verify animation
frame centroids.

## Setup (macOS arm64, tested on 15.7.5)

LibreSprite 1.1 is not distributed through Homebrew. Install manually:

```sh
# 1. Download the arm64 build.
curl -L -o /tmp/libresprite.zip \
  https://github.com/LibreSprite/LibreSprite/releases/download/v1.1/libresprite-development-macos-arm64.zip
unzip /tmp/libresprite.zip -d /tmp/libresprite-unzip

# 2. Mount the DMG and copy the .app bundle to ~/Applications (no admin needed).
hdiutil attach /tmp/libresprite-unzip/libresprite.dmg -nobrowse -quiet
mkdir -p ~/Applications
cp -R /Volumes/LibreSprite/LibreSprite.app ~/Applications/
hdiutil detach /Volumes/LibreSprite -quiet

# 3. Clear extended attributes (Gatekeeper quarantine).
xattr -cr ~/Applications/LibreSprite.app

# 4. Re-sign every bundled dylib individually AND the main binary.
#    macOS 15 tightened code-signing validation: the default adhoc signature
#    in the download fails "Invalid Page" during dyld load. `codesign --deep`
#    does NOT fix all nested dylibs (libv8.dylib in particular). You must
#    strip + re-sign each dylib.
cd ~/Applications/LibreSprite.app/Contents/libs
for f in *.dylib; do
  codesign --remove-signature "$f" 2>/dev/null || true
  codesign --force --sign - "$f"
done
codesign --force --sign - ~/Applications/LibreSprite.app/Contents/MacOS/libresprite
```

Verify:

```sh
~/Applications/LibreSprite.app/Contents/MacOS/libresprite --batch --script /dev/null
# exit 0 means ready. Exit 137 + a crash in ~/Library/Logs/DiagnosticReports
# means re-signing didn't take — re-run step 4.
```

If the binary lives elsewhere, export `LIBRESPRITE_BIN=/path/to/libresprite`
before running `bun gld-pipe forge`.

## Files

- `master.gpl` — GIMP palette exported from `scripts/generate-assets/shared.ts`
  `PALETTE` constant (80 unique colors). Regenerate after palette edits:
  `bun scripts/libresprite/build-master-palette.ts`.
- `apply-palette.js` — snaps opaque pixels to the nearest master-palette color.
  Un-premultiplies straight-alpha edge pixels before matching so anti-aliased
  silhouettes don't get dragged toward black.
- `apply-rim-light.js` — brightens top-facing edges, darkens bottom-facing
  edges by configurable percentages.
- `texture-noise.js` — mulberry32-seeded ±1 brightness jitter for a fraction
  of opaque pixels, reproducible per asset-id.
- `verify-animation.js` — non-destructive audit: computes per-frame alpha
  centroid on a sprite sheet and flags frame-pair drift beyond a threshold.
  Emits `VERIFY_ANIMATION_JSON:{...}` to stdout for `forge.ts` to parse.

All four JS scripts run under LibreSprite's V8 bindings via `--batch --script`.
Templates use `__PLACEHOLDER__` variables that `scripts/gld-pipe/lib/libresprite.ts`
substitutes before each invocation.

## Known quirks

- **Mutex teardown exit 134/139** — after `saveAs`, LibreSprite v1.1 on macOS
  throws `mutex lock failed` at process shutdown. The script has already
  completed successfully. `scripts/gld-pipe/lib/libresprite.ts:runScript`
  treats this as non-fatal and checks the output file instead.
- **`app.activeSprite` is undefined in `--batch`** — do NOT copy patterns from
  LibreSprite's built-in example scripts (which assume GUI context). Use
  `var doc = app.open(path); var s = doc.sprite;` — the sprite handle is on
  the return value's `.sprite` property.
- **Premultiplied-alpha round trip** — both `@napi-rs/canvas` on write and
  LibreSprite on `saveAs` premultiply partial-alpha pixels. Any in-memory
  color manipulation on partially-transparent pixels must anticipate that
  `stored_rgb == round(straight_rgb * alpha / 255)`.
- **`console.log` only** — the `print` function in older Aseprite docs is not
  bound in LibreSprite v1.1.

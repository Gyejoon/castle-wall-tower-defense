// texture-noise.js — dither opaque pixels with ±1 brightness jitter using a
// seeded pseudo-random stream so output is reproducible.
//
// Template variables:
//   __INPUT__     absolute path to input PNG
//   __OUTPUT__    absolute path to output PNG
//   __SEED__      32-bit unsigned integer seed, e.g. 0x1234abcd
//   __DENSITY__   fraction (0..1) of opaque pixels to perturb, e.g. 0.30
//
// The jitter is ±1 per RGB channel. This is enough to break up flat fills
// without introducing off-palette colors noticeably (and apply-palette is
// normally run AFTER noise to re-quantize anyway).

var col = app.pixelColor;
var doc = app.open('__INPUT__');
if (!doc || !doc.sprite) {
    console.log('ERROR: failed to open __INPUT__');
} else {
    var s = doc.sprite;
    var img = s.layer(0).cel(0).image;
    var w = img.width;
    var h = img.height;

    // mulberry32 PRNG — tiny, fast, deterministic.
    var seed = (__SEED__) >>> 0;
    function rng() {
        seed = (seed + 0x6D2B79F5) >>> 0;
        var t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    function clamp(v) { return v < 0 ? 0 : (v > 255 ? 255 : v | 0); }

    var density = __DENSITY__;
    var perturbed = 0;
    for (var y = 0; y < h; ++y) {
        for (var x = 0; x < w; ++x) {
            var px = img.getPixel(x, y);
            var a = col.rgbaA(px);
            if (a === 0) continue;
            if (rng() > density) continue;
            var r = col.rgbaR(px);
            var g = col.rgbaG(px);
            var b = col.rgbaB(px);
            var dr = (rng() * 3 | 0) - 1; // -1, 0, or 1
            var dg = (rng() * 3 | 0) - 1;
            var db = (rng() * 3 | 0) - 1;
            if (dr === 0 && dg === 0 && db === 0) continue;
            img.putPixel(x, y, col.rgba(clamp(r + dr), clamp(g + dg), clamp(b + db), a));
            perturbed++;
        }
    }
    console.log('texture-noise: perturbed ' + perturbed + ' / ' + (w * h) + ' pixels');
    s.saveAs('__OUTPUT__');
    doc.close();
}

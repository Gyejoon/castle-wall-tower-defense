// apply-rim-light.js — brighten top-facing edges of opaque regions (rim light)
// and darken bottom-facing edges (contact shadow) by a percentage.
//
// Template variables:
//   __INPUT__            absolute path to input PNG
//   __OUTPUT__           absolute path to output PNG
//   __RIM_STRENGTH__     rim brightening percent (0-100), e.g. 40
//   __SHADOW_STRENGTH__  shadow darkening percent (0-100), e.g. 30
//
// A pixel is on the TOP edge if the pixel directly above is fully transparent
// AND the pixel itself is opaque. Same principle for BOTTOM edge.

var col = app.pixelColor;
var doc = app.open('__INPUT__');
if (!doc || !doc.sprite) {
    console.log('ERROR: failed to open __INPUT__');
} else {
    var s = doc.sprite;
    var img = s.layer(0).cel(0).image;
    var w = img.width;
    var h = img.height;
    var rimPct = __RIM_STRENGTH__;
    var shadowPct = __SHADOW_STRENGTH__;

    // Snapshot alpha so we classify edges off the original, not the mutated image.
    var alpha = new Array(w * h);
    for (var y = 0; y < h; ++y) {
        for (var x = 0; x < w; ++x) {
            alpha[y * w + x] = col.rgbaA(img.getPixel(x, y));
        }
    }

    function clamp(v) { return v < 0 ? 0 : (v > 255 ? 255 : v | 0); }

    var rimCount = 0;
    var shadowCount = 0;
    for (var y = 0; y < h; ++y) {
        for (var x = 0; x < w; ++x) {
            var a = alpha[y * w + x];
            if (a === 0) continue;
            var above = y > 0 ? alpha[(y - 1) * w + x] : 0;
            var below = y < h - 1 ? alpha[(y + 1) * w + x] : 0;
            var isTop = above === 0;
            var isBottom = below === 0;
            if (!isTop && !isBottom) continue;

            var px = img.getPixel(x, y);
            var r = col.rgbaR(px);
            var g = col.rgbaG(px);
            var b = col.rgbaB(px);
            // @napi-rs/canvas writes + LibreSprite saveAs both premultiply
            // partial-alpha channels on disk, so `r/g/b` read here are
            // already premultiplied. Doing rim/shadow math directly on
            // premultiplied values distorts the author intent on
            // anti-aliased edges. Recover straight-alpha first, apply the
            // rim/shadow, let the next saveAs re-premultiply on write.
            if (a < 255) {
                r = ((r * 255 + (a >> 1)) / a) | 0;
                g = ((g * 255 + (a >> 1)) / a) | 0;
                b = ((b * 255 + (a >> 1)) / a) | 0;
                if (r > 255) r = 255;
                if (g > 255) g = 255;
                if (b > 255) b = 255;
            }
            var nr = r, ng = g, nb = b;
            if (isTop) {
                // Brighten toward white by rimPct%.
                nr = clamp(r + ((255 - r) * rimPct) / 100);
                ng = clamp(g + ((255 - g) * rimPct) / 100);
                nb = clamp(b + ((255 - b) * rimPct) / 100);
                rimCount++;
            } else if (isBottom) {
                // Darken toward black by shadowPct%.
                nr = clamp(r - (r * shadowPct) / 100);
                ng = clamp(g - (g * shadowPct) / 100);
                nb = clamp(b - (b * shadowPct) / 100);
                shadowCount++;
            }
            img.putPixel(x, y, col.rgba(nr, ng, nb, a));
        }
    }
    console.log('apply-rim-light: rim=' + rimCount + ' shadow=' + shadowCount);
    s.saveAs('__OUTPUT__');
    doc.close();
}

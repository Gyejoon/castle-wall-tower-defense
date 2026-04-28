// verify-animation.js — audit that adjacent frames in a sprite sheet have
// stable centroids (animation doesn't drift in the canvas).
//
// Non-destructive: reads the sheet, computes per-frame alpha-weighted centroid
// drift, writes a report to __REPORT__ as JSON. Returns without saving.
//
// Template variables:
//   __INPUT__       absolute path to input sheet PNG (horizontal strip)
//   __FRAME_W__     frame width in pixels
//   __FRAME_H__     frame height in pixels
//   __FRAME_COUNT__ number of frames
//   __REPORT__      absolute path to output JSON report
//   __MAX_DRIFT__   flag frames whose centroid delta exceeds this (px)

var col = app.pixelColor;
var doc = app.open('__INPUT__');
var result = { frames: [], warnings: [] };

if (!doc || !doc.sprite) {
    result.error = 'failed to open input';
} else {
    var s = doc.sprite;
    var img = s.layer(0).cel(0).image;
    var fw = __FRAME_W__;
    var fh = __FRAME_H__;
    var fc = __FRAME_COUNT__;
    var maxDrift = __MAX_DRIFT__;

    if (img.width < fw * fc || img.height < fh) {
        result.error = 'sheet dims ' + img.width + 'x' + img.height
            + ' cannot contain ' + fc + ' frames of ' + fw + 'x' + fh;
    } else {
        for (var f = 0; f < fc; ++f) {
            var sumX = 0, sumY = 0, sumA = 0;
            var minA = 255, maxA = 0;
            for (var y = 0; y < fh; ++y) {
                for (var x = 0; x < fw; ++x) {
                    var px = img.getPixel(f * fw + x, y);
                    var a = col.rgbaA(px);
                    if (a === 0) continue;
                    sumX += x * a;
                    sumY += y * a;
                    sumA += a;
                    if (a < minA) minA = a;
                    if (a > maxA) maxA = a;
                }
            }
            var cx = sumA ? sumX / sumA : 0;
            var cy = sumA ? sumY / sumA : 0;
            result.frames.push({ frame: f, cx: cx, cy: cy, alphaSum: sumA });
        }
        // Drift warnings
        for (var i = 1; i < result.frames.length; ++i) {
            var a = result.frames[i - 1];
            var b = result.frames[i];
            var dx = b.cx - a.cx;
            var dy = b.cy - a.cy;
            var d = Math.sqrt(dx * dx + dy * dy);
            if (d > maxDrift) {
                result.warnings.push({
                    from: i - 1, to: i,
                    drift: d, maxDrift: maxDrift
                });
            }
        }
    }
    doc.close();
}

// LibreSprite doesn't expose Node fs — we emit JSON to stdout with a sentinel
// prefix so forge.ts can parse it. The __REPORT__ path is recorded in the
// payload so forge can also write it for the dashboard.
var payload = { reportPath: '__REPORT__', data: result };
console.log('VERIFY_ANIMATION_JSON:' + JSON.stringify(payload));

// apply-palette.js — snap every opaque pixel in the input image to the
// nearest color in master.gpl.
//
// Template variables (substituted by forge.ts before invocation):
//   __INPUT__   absolute path to input PNG
//   __OUTPUT__  absolute path to output PNG
//   __PALETTE__ absolute path to master.gpl
//
// Runs under LibreSprite v1.1 JS engine (no ES2020+ features).

var col = app.pixelColor;
var doc = app.open('__INPUT__');
if (!doc || !doc.sprite) {
    console.log('ERROR: failed to open __INPUT__');
} else {
    var s = doc.sprite;
    s.loadPalette('__PALETTE__');
    var n = s.palette.length;
    if (n === 0) {
        console.log('ERROR: empty palette after load');
    } else {
        // Pre-unpack palette into RGB triplets for fast distance checks.
        var palR = new Array(n);
        var palG = new Array(n);
        var palB = new Array(n);
        for (var i = 0; i < n; ++i) {
            var c = s.palette.get(i);
            palR[i] = col.rgbaR(c);
            palG[i] = col.rgbaG(c);
            palB[i] = col.rgbaB(c);
        }

        var img = s.layer(0).cel(0).image;
        var w = img.width;
        var h = img.height;
        var modified = 0;
        for (var y = 0; y < h; ++y) {
            for (var x = 0; x < w; ++x) {
                var px = img.getPixel(x, y);
                var a = col.rgbaA(px);
                if (a === 0) continue; // preserve fully transparent pixels
                var r = col.rgbaR(px);
                var g = col.rgbaG(px);
                var b = col.rgbaB(px);
                // PNG storage round-trips through premultiplied alpha in both
                // @napi-rs/canvas AND LibreSprite's saveAs. To match the
                // author's intent we un-premultiply before palette snapping.
                // With straight-alpha recovered, nearest palette is computed
                // and the result put back; LibreSprite premultiplies on save.
                var rr = r, gg = g, bb = b;
                if (a < 255) {
                    rr = ((r * 255 + (a >> 1)) / a) | 0;
                    gg = ((g * 255 + (a >> 1)) / a) | 0;
                    bb = ((b * 255 + (a >> 1)) / a) | 0;
                    if (rr > 255) rr = 255;
                    if (gg > 255) gg = 255;
                    if (bb > 255) bb = 255;
                }
                // Find nearest palette index by squared RGB distance.
                var bestD = 0x7fffffff;
                var bestI = 0;
                for (var k = 0; k < n; ++k) {
                    var dr = rr - palR[k];
                    var dg = gg - palG[k];
                    var db = bb - palB[k];
                    var d = dr * dr + dg * dg + db * db;
                    if (d < bestD) { bestD = d; bestI = k; if (d === 0) break; }
                }
                var nr = palR[bestI];
                var ng = palG[bestI];
                var nb = palB[bestI];
                if (nr !== rr || ng !== gg || nb !== bb) {
                    img.putPixel(x, y, col.rgba(nr, ng, nb, a));
                    modified++;
                }
            }
        }
        console.log('apply-palette: ' + modified + ' pixels snapped ('
            + w + 'x' + h + ', ' + n + ' colors)');
        s.saveAs('__OUTPUT__');
    }
    doc.close();
}

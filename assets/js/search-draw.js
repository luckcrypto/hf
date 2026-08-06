/* hypercars.fyi - SEARCH FACULTY: DRAW - the artist (pri 25).
   "chart the cars by power" → an SVG bar chart rendered inside the answer,
   generated from HC_DATA at ask-time. Nocturne tokens, opaque background
   hardcoded per the house design law, bars to one scale. */
'use strict';
(function () {
  var S = window.HC; if (!S) return;
  var U = S.u;
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  S.register({ name: 'draw', pri: 25, try: function (q) {
    if (!S.DATA) return null;
    var m = /^\s*(?:chart|graph|plot)\b/i.exec(q);
    if (!m) return null;
    var ql = q.toLowerCase();
    var d = /speed/.test(ql) ? 'mph' : /weight/.test(ql) ? 'kg' : /price/.test(ql) ? 'price' : /0.?60|accel|quick/.test(ql) ? 'z60' : 'hp';
    var inv = d === 'z60' ? 1 : 0;
    var label = d === 'hp' ? 'power' : d === 'mph' ? 'top speed' : d === 'kg' ? 'weight' : d === 'z60' ? '0\u201360' : 'launch price';
    var rows = S.DATA.cars.filter(function (c) { return c[d]; }).sort(function (a, b) { return inv ? a[d] - b[d] : b[d] - a[d]; }).slice(0, 15);
    if (rows.length < 3) return null;
    var W = 340, LX = 128, BW = 160, RH = 21, H = rows.length * RH + 16;
    var max = Math.max.apply(null, rows.map(function (c) { return c[d]; }));
    var unit = U.DIMS[d].unit.replace(' USD', ''), pref = d === 'price' ? '$' : '';
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc('cars by ' + label) + '" style="width:100%;height:auto;display:block">' +
      '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#171210"/>';
    rows.forEach(function (c, i) {
      var y = 10 + i * RH, bw = Math.max(2, Math.round(c[d] / max * BW));
      var nm = c.n.length > 19 ? c.n.slice(0, 18) + '\u2026' : c.n;
      svg += '<text x="' + (LX - 6) + '" y="' + (y + 11) + '" fill="#B8AC9C" font-size="10" text-anchor="end" font-family="inherit">' + esc(nm) + '</text>' +
             '<rect x="' + LX + '" y="' + (y + 2) + '" width="' + bw + '" height="12" rx="2" fill="#E9C87E" opacity="' + (i < 3 ? '0.95' : '0.55') + '"/>' +
             '<text x="' + (LX + bw + 5) + '" y="' + (y + 11) + '" fill="#F4EEE4" font-size="10" font-family="inherit">' + pref + (d === 'z60' ? c[d].toFixed(2) : U.fnum(c[d])) + unit + '</text>';
    });
    svg += '</svg>';
    return { text: 'Charted: ' + rows.length + ' cars by ' + label + ', bars to one scale, drawn this second from the same numbers the pages use.', svg: svg, links: rows.slice(0, 3).map(function (c) { return U.linkOf(c.u, c.n); }), note: U.NOTE_CALC };
  } });
})();

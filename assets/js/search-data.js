/* hypercars.fyi - SEARCH FACULTY: DATA - the analyst (pri 40).
   Query-time computation over HC_DATA.cars: counts (exact nouns only),
   medal-ranked top-N, superlatives filtered by marque, class, country,
   engine, status or year, aggregates, N-way comparisons and yes/no
   comparatives with inverted dims handled (quickest and lightest mean
   LOWER wins). Everything sorted and summed at the moment you ask. */
'use strict';
(function () {
  var S = window.HC; if (!S) return;
  var U = S.u;
  var CLS = { 'hyper-ev': /\bhyper.?evs?\b/, 'supercar': /\bsupercars?\b/,
    'performance-sedan': /\bsedans?\b|\bsaloons?\b/, 'track-only': /track.?only|track cars?\b/, 'hypercar': /\bhypercars?\b/ };
  var CTRY = { germany: 'DE', german: 'DE', italy: 'IT', italian: 'IT', america: 'US', american: 'US', usa: 'US',
    britain: 'GB', british: 'GB', uk: 'GB', sweden: 'SE', swedish: 'SE', croatia: 'HR', croatian: 'HR',
    france: 'FR', french: 'FR', japan: 'JP', japanese: 'JP', china: 'CN', chinese: 'CN', denmark: 'DK', danish: 'DK',
    czech: 'CZ', czechia: 'CZ', austria: 'AT', austrian: 'AT', 'new zealand': 'NZ' };
  var STA = [
    { re: /\bin production\b|\bactive\b|still (made|built|sold)/, test: function (st) { return st.indexOf('in production') === 0; }, label: 'in production' },
    { re: /\bretired\b|\bsold out\b|\bended\b|\bdiscontinued\b/, test: function (st) { return st.indexOf('sold out') === 0 || st.indexOf('classic') === 0; }, label: 'no longer sold' },
    { re: /\bclassic\b/, test: function (st) { return st.indexOf('classic') === 0; }, label: 'classic' },
    { re: /\blimited\b/, test: function (st) { return st.indexOf('limited') === 0; }, label: 'limited-run' },
    { re: /\bprototype\b|\bunreleased\b|\bcoming\b|\bupcoming\b/, test: function (st) { return st.indexOf('prototype') === 0 || st.indexOf('concept') === 0; }, label: 'not yet delivered' },
    { re: /\bone.?off\b/, test: function (st) { return st.indexOf('one-off') === 0; }, label: 'one-off' }
  ];
  function marqueIn(ql) {
    if (!S.DATA) return null;
    for (var i = 0; i < S.DATA.marques.length; i++) {
      var toks = U.tok(S.DATA.marques[i].n);
      if (toks.length && toks.every(function (t) { return ql.indexOf(t) !== -1; })) return S.DATA.marques[i];
    }
    return null;
  }
  function scope(ql) {
    var pool = S.DATA.cars.slice(), tags = [];
    var m = marqueIn(ql);
    if (m) { pool = pool.filter(function (c) { return c.mq === m.n; }); tags.push(m.n); }
    for (var k in CLS) if (CLS[k].test(ql)) { pool = pool.filter(function (c) { return c.cat === k; }); tags.push(k); break; }
    for (var cw in CTRY) if (ql.indexOf(cw) !== -1) { var cc = CTRY[cw]; pool = pool.filter(function (c) { return c.cc === cc; }); tags.push(cw); break; }
    var em = /\b(v6|v8|v10|v12|v16|w16|flat.?6)\b/.exec(ql);
    if (em) { var ec = em[1].toUpperCase().replace('FLAT-6', 'FLAT6').replace('FLAT 6', 'FLAT6'); pool = pool.filter(function (c) { return c.eng === ec; }); tags.push(ec); }
    else if (/\belectrics?\b|\bevs?\b/.test(ql)) { pool = pool.filter(function (c) { return c.eng === 'EV'; }); tags.push('electric'); }
    if (/\bhybrid\b/.test(ql)) { pool = pool.filter(function (c) { return c.hyb; }); tags.push('hybrid'); }
    for (var s = 0; s < STA.length; s++) if (STA[s].re.test(ql)) { pool = pool.filter(function (c) { return STA[s].test(c.st.toLowerCase()); }); tags.push(STA[s].label); break; }
    var ym = /\b(?:after|since|from)\s+((?:19|20)\d\d)\b/.exec(ql);
    if (ym) { var y1 = +ym[1]; pool = pool.filter(function (c) { return c.y && c.y >= y1; }); tags.push('from ' + y1); }
    var yb = /\bbefore\s+((?:19|20)\d\d)\b/.exec(ql);
    if (yb) { var y2 = +yb[1]; pool = pool.filter(function (c) { return c.y && c.y < y2; }); tags.push('before ' + y2); }
    return { pool: pool, tags: tags };
  }
  function dimWord(ql) {
    if (/fastest|top speed/.test(ql)) return ['mph', 0];
    if (/quickest|0.?60|acceler/.test(ql)) return ['z60', 1];
    if (/slowest/.test(ql)) return ['mph', 1];
    if (/lightest/.test(ql)) return ['kg', 1];
    if (/heaviest/.test(ql)) return ['kg', 0];
    if (/oldest/.test(ql)) return ['y', 1];
    if (/newest|latest|most recent/.test(ql)) return ['y', 0];
    if (/most expensive|priciest/.test(ql)) return ['price', 0];
    if (/cheapest|least expensive/.test(ql)) return ['price', 1];
    if (/most powerful|strongest|highest power/.test(ql)) return ['hp', 0];
    return null;
  }
  function val(c, d) { return d === 'z60' ? c.z60.toFixed(2) : U.fnum(c[d]); }

  S.register({ name: 'data', pri: 40, try: function (q) {
    if (!S.DATA) return null;
    var ql = q.toLowerCase();

    /* counts - exact nouns only */
    var hm = /how many\s+([a-z -]+?)(?:\s+(?:are|is|do|does|on)\b.*)?[\s?!.]*$/.exec(ql);
    if (hm) {
      var noun = hm[1].trim();
      if (/^pages?$/.test(noun)) return { text: 'This site is ' + S.DATA.pages + ' pages, counted from the sitemap at build time, restated live.', links: S.HUBS.slice(0, 2), note: U.NOTE_CALC };
      if (/^(marques?|brands?|manufacturers?)$/.test(noun)) return { text: S.DATA.marques.length + ' marques are on the boards, counted from the data just now, so this can never drift from the pages.', links: S.HUBS.slice(0, 2), note: U.NOTE_CALC };
      var sc0 = scope(ql);
      if (/\b(cars?|hypercars?|evs?|electrics?|supercars?|sedans?|saloons?|machines?|vehicles?|v6s?|v8s?|v10s?|v12s?|v16s?|w16s?|hybrids?|one.?offs?)\b/.test(noun)) {
        return { text: sc0.pool.length + (sc0.tags.length ? ' ' + sc0.tags.join(' ') : '') + ' car' + (sc0.pool.length === 1 ? '' : 's') + ' on the boards, counted from the data just now.', links: S.HUBS.slice(0, 1), note: U.NOTE_CALC };
      }
      var mq0 = marqueIn(noun);
      if (mq0) return { text: mq0.c + ' ' + mq0.n + ' car' + (mq0.c === 1 ? '' : 's') + ' on the boards, flagship ' + mq0.top + ' at ' + U.fnum(mq0.tophp) + ' hp.', links: [U.linkOf(mq0.u, mq0.n)], note: U.NOTE_CALC };
    }

    /* aggregates */
    var am = /\b(average|mean|total|combined|sum)\b/.exec(ql);
    if (am && /\b(power|hp|horsepower|speed|weight|price)\b/.test(ql)) {
      var dA = /speed/.test(ql) ? 'mph' : /weight/.test(ql) ? 'kg' : /price/.test(ql) ? 'price' : 'hp';
      var scA = scope(ql);
      var poolA = scA.pool.filter(function (c) { return c[dA]; });
      if (poolA.length) {
        var sum = poolA.reduce(function (a, c) { return a + c[dA]; }, 0);
        var isAvg = /average|mean/.test(am[1]);
        var v = isAvg ? sum / poolA.length : sum;
        var vt = isAvg ? (Math.round(v * 10) / 10).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : U.fnum(Math.round(v));   /* averages ALWAYS keep their honest decimal */
        return { text: (isAvg ? 'Average ' : 'Total ') + (dA === 'hp' ? 'power' : dA === 'mph' ? 'top speed' : dA === 'kg' ? 'kerb weight' : 'launch price') +
          ' across ' + poolA.length + (scA.tags.length ? ' ' + scA.tags.join(' ') : '') + ' cars: ' + (dA === 'price' ? '$' : '') + vt + U.DIMS[dA].unit.replace(' USD', '') +
          ', ' + (isAvg ? 'summed and divided' : 'summed') + ' from every matching entry, just now.', links: S.HUBS.slice(0, 1), note: U.NOTE_CALC };
      }
    }

    /* top-N with medals */
    var tm = /(?:top|rank|list|show(?:\s+me)?)\s*([0-9]+)?\s+/.exec(ql);
    if (tm && /\b(cars?|hypercars?|evs?|electrics?|supercars?|sedans?|track|v6|v8|v10|v12|v16|w16|hybrids?|[a-z]+)\b/.test(ql)) {
      var dT = 'hp', invT = 0, byM = /\bby\s+(power|hp|speed|top speed|weight|price|0.?60|acceleration|year)\b/.exec(ql);
      if (byM) { dT = /speed/.test(byM[1]) ? 'mph' : /weight/.test(byM[1]) ? 'kg' : /price/.test(byM[1]) ? 'price' : /60|accel/.test(byM[1]) ? 'z60' : /year/.test(byM[1]) ? 'y' : 'hp'; invT = dT === 'z60' ? 1 : 0; }
      else { var dw = dimWord(ql); if (dw) { dT = dw[0]; invT = dw[1]; } }
      var scT = scope(ql);
      var arrT = scT.pool.filter(function (c) { return c[dT]; }).sort(function (a, b) { return invT ? a[dT] - b[dT] : b[dT] - a[dT]; });
      if (arrT.length >= 2) {
        var N = Math.min(parseInt(tm[1] || '5', 10), 7, arrT.length);
        var lines = arrT.slice(0, N).map(function (c, i) { return (i < 3 ? U.MEDS[i] : (i + 1) + '. ') + c.n + ' ' + (dT === 'price' ? '$' : '') + val(c, dT) + U.DIMS[dT].unit.replace(' USD', ''); });
        return { text: 'Top ' + N + (scT.tags.length ? ' ' + scT.tags.join(' ') : '') + ' by ' + (dT === 'hp' ? 'power' : dT === 'mph' ? 'top speed' : dT === 'z60' ? '0\u201360' : dT === 'kg' ? 'weight' : dT === 'y' ? 'year' : 'price') + ': ' + lines.join(' \u00b7 ') + '.', links: arrT.slice(0, 3).map(function (c) { return U.linkOf(c.u, c.n); }), note: U.NOTE_CALC };
      }
    }

    /* filtered superlatives */
    var dw2 = dimWord(ql);
    if (dw2) {
      var dS = dw2[0], asc = dw2[1];
      var scS = scope(ql);
      /* honesty guard: a filter word the data does not know must never be
         silently dropped - "fastest lithuanian car" is not "fastest car". */
      var GEN = { car:1, cars:1, ever:1, world:1, worlds:1, overall:1, now:1, today:1, here:1, all:1,
        time:1, made:1, built:1, one:1, ones:1, out:1, there:1, which:1, boards:1, data:1, site:1, right:1,
        okay:1, please:1, pls:1, hey:1, tell:1, give:1, whats:1, what:1, hmm:1 };
      var DIMW = /fastest|quickest|slowest|lightest|heaviest|oldest|newest|latest|recent|most|powerful|strongest|highest|expensive|priciest|cheapest|least|power|speed|top/;
      var CONS = { production:1, active:1, retired:1, sold:1, ended:1, discontinued:1, classic:1, limited:1,
        prototype:1, unreleased:1, coming:1, upcoming:1, off:1, electric:1, electrics:1, ev:1, evs:1,
        hybrid:1, hybrids:1, after:1, before:1, since:1, from:1, still:1 };
      scS.tags.forEach(function (t) { U.tok(t).forEach(function (w) { CONS[w] = 1; }); });
      var known = null;
      var left = U.tok(ql).filter(function (w) { return w.length >= 3 && !GEN[w] && !CONS[w] && !DIMW.test(w) && !/^(19|20)\d\d$/.test(w); });
      for (var li = 0; li < left.length; li++) {
        if (!known) {
          known = {};
          U.ENT.forEach(function (x) { x.toks.forEach(function (w) { known[w] = 1; }); });
          S.DATA.marques.forEach(function (m) { U.tok(m.n).forEach(function (w) { known[w] = 1; }); });
        }
        if (!known[left[li]]) return { text: 'Honest answer: \u201C' + left[li] + '\u201D isn\u2019t a filter the data knows, try a marque, class, country, engine, status or year.', links: S.HUBS.slice(0, 2), note: U.NOTE_CALC };
      }
      var poolS = scS.pool.filter(function (c) { return c[dS]; });
      if (!poolS.length) return { text: 'Honest answer: no cars on the boards match that filter, checked against the data just now.', links: S.HUBS.slice(0, 2), note: U.NOTE_CALC };
      poolS.sort(function (a, b) { return asc ? a[dS] - b[dS] : b[dS] - a[dS]; });
      var ch = poolS[0], ru = poolS[1];
      S.state.lastEnt = { n: ch.n };
      var uS = U.DIMS[dS].unit.replace(' USD', '');
      var pref = dS === 'price' ? '$' : '';
      return { text: U.MEDS[0] + ch.n + ', ' + pref + val(ch, dS) + uS + (scS.tags.length ? ' (filtered to ' + scS.tags.join(', ') + ')' : '') +
        (ru ? ' \u00b7 runner-up: ' + ru.n + ' ' + pref + val(ru, dS) + uS : '') + '.',
        links: [U.linkOf(ch.u, ch.n)].concat(ru ? [U.linkOf(ru.u, ru.n)] : []), note: U.NOTE_CALC };
    }

    /* N-way comparison */
    var parts = q.split(/\s+vs\.?\s+|\s+versus\s+/i);
    if (parts.length >= 3 && U.ENT.length) {
      var got = [];
      for (var p = 0; p < parts.length; p++) { var rE = U.resolveEnt(parts[p]); if (rE) got.push(rE); }
      if (got.length >= 3) {
        var dN = /fast|speed/.test(ql) ? 'mph' : /quick|60/.test(ql) ? 'z60' : /light|weigh|heav/.test(ql) ? 'kg' : /price|expensive/.test(ql) ? 'price' : 'hp';
        var invN = U.DIMS[dN].inv;
        var vals = got.filter(function (x) { return x.e[dN]; });
        if (vals.length >= 3) {
          vals.sort(function (a, b) { return invN ? a.e[dN] - b.e[dN] : b.e[dN] - a.e[dN]; });
          var uN = U.DIMS[dN].unit.replace(' USD', ''), prefN = dN === 'price' ? '$' : '';
          var lineN = vals.map(function (x, i) { return (i < 3 ? U.MEDS[i] : '') + x.e.n + ' ' + prefN + val(x.e, dN) + uN; }).join(' \u00b7 ');
          var hi2 = Math.max.apply(null, vals.map(function (x) { return x.e[dN]; }));
          var lo2 = Math.min.apply(null, vals.map(function (x) { return x.e[dN]; }));
          var ratN = lo2 > 0 ? hi2 / lo2 : 0;
          return { text: lineN + ', \u00d7' + (ratN >= 10 ? Math.round(ratN) : ratN.toFixed(2)) + ' between the extremes.', links: vals.slice(0, 3).map(function (x) { return U.linkOf(x.e.u, x.e.n); }), note: U.NOTE_CALC };
        }
      }
    }

    /* yes/no + how much */
    var ynm = /^\s*is\s+(.+?)\s+(faster|quicker|more powerful|stronger|lighter|heavier|newer|older|pricier|more expensive)\s+than\s+(.+?)[\s?!.]*$/i.exec(q) ||
              /^\s*how much\s+(faster|quicker|more powerful|stronger|lighter|heavier|newer|older|pricier|more expensive)\s+is\s+(.+?)\s+than\s+(.+?)[\s?!.]*$/i.exec(q);
    if (ynm && U.ENT.length) {
      var isHow = /^\s*how/i.test(q);
      var aStr = isHow ? ynm[2] : ynm[1], word = isHow ? ynm[1] : ynm[2], bStr = ynm[3];
      var dY = /fast/.test(word) ? 'mph' : /quick/.test(word) ? 'z60' : /light|heav/.test(word) ? 'kg' : /new|old/.test(word) ? 'y' : /prici|expensive/.test(word) ? 'price' : 'hp';
      var lowWins = /quick|light|old/.test(word);
      var eA = U.resolveEnt(aStr), eB = U.resolveEnt(bStr);
      if (eA && eB && eA.e[dY] && eB.e[dY] && eA.e.n !== eB.e.n) {
        var vA = eA.e[dY], vB = eB.e[dY];
        var uY = U.DIMS[dY].unit.replace(' USD', ''), prefY = dY === 'price' ? '$' : '';
        var yes = lowWins ? vA < vB : vA > vB;
        var hiV = Math.max(vA, vB), loV = Math.min(vA, vB);
        var ratY = loV > 0 ? hiV / loV : 0, diffY = Math.abs(vA - vB);
        var dtxt = dY === 'z60' ? diffY.toFixed(2) : U.fnum(diffY);
        var head = isHow ? (prefY + dtxt + uY + ' ' + word + ' (\u00d7' + (ratY >= 10 ? Math.round(ratY) : ratY.toFixed(2)) + ')') : (yes ? 'Yes' : 'No');
        return { text: head + ', ' + eA.e.n + ' ' + prefY + val(eA.e, dY) + uY + ' vs ' + eB.e.n + ' ' + prefY + val(eB.e, dY) + uY + (isHow ? '.' : ': \u00d7' + (ratY >= 10 ? Math.round(ratY) : ratY.toFixed(2)) + '.'), links: [U.linkOf(eA.e.u, eA.e.n), U.linkOf(eB.e.u, eB.e.n)], note: U.NOTE_CALC };
      }
    }
    return null;
  } });
})();

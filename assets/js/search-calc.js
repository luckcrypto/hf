/* hypercars.fyi - SEARCH FACULTY: CALC - the maths department (pri 20).
   Live derivations with the formula shown, nothing authored: unit
   conversions (hp↔kW↔PS, mph↔km/h, kg↔lb), power-to-weight, average 0–60
   g-force, price per horsepower, and age math computed against today's date
   so the answers stay true forever. Inputs are sanity-guarded: nonsense
   falls through to the honest floor instead of producing garbage. */
'use strict';
(function () {
  var S = window.HC; if (!S) return;
  var U = S.u;
  S.register({ name: 'calc', pri: 20, try: function (q) {
    var ql = q.toLowerCase();

    /* plain unit conversions on a number */
    var cv = /([0-9][0-9,]{0,6}(?:\.[0-9]+)?)\s*(hp|bhp|ps|kw|mph|km\/?h|kmh|kg|lbs?|pounds?)\b[^0-9]*?\b(?:in|to)\s+(hp|bhp|ps|kw|mph|km\/?h|kmh|kg|lbs?|pounds?)\b/.exec(ql);
    if (cv) {
      var v = parseFloat(cv[1].replace(/,/g, '')), a = cv[2].replace('/', ''), b = cv[3].replace('/', '');
      var toHP = { hp: 1, bhp: 1, ps: 0.98632, kw: 1.34102 };
      var out = null;
      if (v > 0 && v < 1e7) {
        if (toHP[a] != null && toHP[b] != null && a !== b) {
          var hp = v * toHP[a]; var res = b === 'kw' ? hp * 0.7457 : b === 'ps' ? hp * 1.01387 : hp;
          out = U.fnum(v) + ' ' + a + ' = ' + U.fnum(res) + ' ' + b + (b === 'kw' ? ' (\u00d70.7457 from hp)' : b === 'ps' ? ' (\u00d71.01387 from hp)' : a === 'kw' ? ' (\u00d71.34102)' : ' (\u00d70.98632)');
        } else if (/mph|kmh/.test(a) && /mph|kmh/.test(b) && a !== b) {
          var res2 = a === 'mph' ? v * 1.60934 : v / 1.60934;
          out = U.fnum(v) + ' ' + (a === 'mph' ? 'mph' : 'km/h') + ' = ' + U.fnum(res2) + ' ' + (b === 'mph' ? 'mph' : 'km/h') + ' (\u00d71.60934)';
        } else if (/kg|lb|pound/.test(a) && /kg|lb|pound/.test(b) && a[0] !== b[0]) {
          var res3 = a === 'kg' ? v * 2.20462 : v / 2.20462;
          out = U.fnum(v) + ' ' + a + ' = ' + U.fnum(res3) + ' ' + (b === 'kg' ? 'kg' : 'lb') + ' (\u00d72.20462)';
        }
      }
      if (out) return { text: out + '.', links: [], note: U.NOTE_CALC };
    }

    /* a named car's figure in other units */
    var cm = /\b(?:in|to)\s+(km\/?h|kmh|kw|ps|lbs?|pounds?|kg)\b/.exec(ql);
    if (cm && U.ENT.length) {
      var en = U.resolveEnt(ql);
      if (en) {
        var uu = cm[1].replace('/', ''), e = en.e, t = null;
        if (/kmh/.test(uu) && e.mph) t = e.n + ': ' + e.mph + ' mph = ' + U.fnum(e.kmh) + ' km/h (\u00d71.60934).';
        else if (uu === 'kw' && e.hp) t = e.n + ': ' + U.fnum(e.hp) + ' hp = ' + U.fnum(e.hp * 0.7457) + ' kW (\u00d70.7457).';
        else if (uu === 'ps' && e.hp) t = e.n + ': ' + U.fnum(e.hp) + ' hp = ' + U.fnum(e.hp * 1.01387) + ' PS (\u00d71.01387).';
        else if (/lb|pound/.test(uu) && e.kg) t = e.n + ': ' + U.fnum(e.kg) + ' kg = ' + U.fnum(e.kg * 2.20462) + ' lb (\u00d72.20462).';
        if (t) return { text: t, links: [U.linkOf(e.u, e.n)], note: U.NOTE_CALC };
      }
    }

    /* power-to-weight for a named car */
    if (/power.to.weight|per tonne|\bp2w\b|hp\/t/.test(ql) && U.ENT.length) {
      var en2 = U.resolveEnt(ql);
      if (en2) {
        var e2 = en2.e;
        if (!e2.kg) return { text: 'Honest answer: ' + e2.n + '\u2019s kerb weight isn\u2019t in the data, so power-to-weight can\u2019t be computed, the formula is hp \u00f7 (kg \u00f7 1000), and half of it is missing.', links: [U.linkOf(e2.u, e2.n)], note: U.NOTE_CALC };
        var pw = e2.hp / (e2.kg / 1000);
        return { text: e2.n + ': ' + U.fnum(e2.hp) + ' hp \u00f7 ' + (e2.kg / 1000).toFixed(3) + ' t = ' + U.fnum(Math.round(pw)) + ' hp per tonne.', links: [U.linkOf(e2.u, e2.n)], note: U.NOTE_CALC };
      }
    }

    /* average 0–60 g for a named car (or a raw time) */
    if (/\bg.?force\b|how many g\b|\bin g\b|\bgs\b.*0.?60|0.?60.*\bg\b/.test(ql)) {
      var en3 = U.ENT.length ? U.resolveEnt(ql) : null;
      var tS = en3 && en3.e.z60 ? en3.e.z60 : (function () { var m = /([0-9]+(?:\.[0-9]+)?)\s*s/.exec(ql); return m ? parseFloat(m[1]) : 0; })();
      if (tS >= 0.8 && tS <= 30) {
        var g = 26.8224 / tS / 9.80665;
        var who = en3 && en3.e.z60 ? en3.e.n + ' (0\u201360 in ' + tS.toFixed(2) + ' s)' : '0\u201360 in ' + tS + ' s';
        return { text: who + ': average a = 26.82 m/s \u00f7 ' + tS + ' s \u00f7 9.80665 = ' + g.toFixed(2) + ' g held for the whole run.', links: en3 ? [U.linkOf(en3.e.u, en3.e.n)] : [], note: U.NOTE_CALC };
      }
    }

    /* price per horsepower */
    if (/per (hp|horsepower)|\$\/hp|price.to.power/.test(ql) && U.ENT.length) {
      var en4 = U.resolveEnt(ql);
      if (en4) {
        var e4 = en4.e;
        if (!e4.price) return { text: 'Honest answer: no launch price in the data for ' + e4.n + ', so $/hp can\u2019t be computed.', links: [U.linkOf(e4.u, e4.n)], note: U.NOTE_CALC };
        return { text: e4.n + ': $' + U.fnum(e4.price) + ' \u00f7 ' + U.fnum(e4.hp) + ' hp = $' + U.fnum(Math.round(e4.price / e4.hp)) + ' per horsepower at launch.', links: [U.linkOf(e4.u, e4.n)], note: U.NOTE_CALC };
      }
    }

    /* age - computed against today */
    if (/how (?:old|long ago)/.test(ql) && U.ENT.length) {
      var en5 = U.resolveEnt(ql);
      if (en5 && en5.e.y) {
        var age = U.YEAR - en5.e.y;
        if (age < 0) return { text: en5.e.n + ' hasn\u2019t arrived yet, ' + en5.e.yrs + ', which is ' + (-age) + ' year' + (age === -1 ? '' : 's') + ' from now, computed against today\u2019s date.', links: [U.linkOf(en5.e.u, en5.e.n)], note: U.NOTE_CALC };
        return { text: en5.e.n + ' dates from ' + en5.e.y + ', ' + age + ' years ago. Computed against today\u2019s date, so this answer stays right forever.', links: [U.linkOf(en5.e.u, en5.e.n)], note: U.NOTE_CALC };
      }
    }
    return null;
  } });
})();

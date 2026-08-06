/* hypercars.fyi - SEARCH FACULTY: TOUR - the guide (pri 10).
   "surprise me" pulls a random car. "what's new" computes the newest
   arrivals live. Guided tours are stepped with "next"; mid-tour questions
   are answered normally and the tour waits. The extremes tour picks its
   champions at runtime, so it can never go stale. */
'use strict';
(function () {
  var S = window.HC; if (!S) return;
  var U = S.u;
  function champ(d, asc) {
    var pool = S.DATA.cars.filter(function (c) { return c[d]; });
    pool.sort(function (a, b) { return asc ? a[d] - b[d] : b[d] - a[d]; });
    return pool[0];
  }
  function tours() {
    var mp = champ('hp'), fs = champ('mph'), qk = champ('z60', 1), lt = champ('kg', 1);
    return {
      extremes: { name: 'the extremes', steps: [
        { c: mp, say: 'The most powerful thing on the boards: ' + mp.n + ' at ' + U.fnum(mp.hp) + ' hp, picked from the data this second, so this tour can never go stale.' },
        { c: fs, say: 'The fastest: ' + fs.n + ' at ' + fs.mph + ' mph (' + U.fnum(fs.kmh) + ' km/h).' },
        { c: qk, say: 'The quickest to 60: ' + qk.n + ' in ' + qk.z60.toFixed(2) + ' s, lower is better, and nothing here is lower.' },
        { c: lt, say: 'And the lightest with a published kerb weight: ' + lt.n + ' at ' + U.fnum(lt.kg) + ' kg. End of tour.' } ] },
      legends: { name: 'the legends', slugs: ['mclaren-f1', 'bugatti-veyron', 'bugatti-chiron-super-sport-300', 'bugatti-tourbillon'],
        says: ['Where the modern era starts: the McLaren F1, the benchmark every hypercar since has been measured against.',
               'The car that made 1,000 PS a production number: the Veyron.',
               'The 300-mph production run, the Chiron Super Sport 300+.',
               'And where the line goes next: the Tourbillon, a naturally-aspirated V16 with three motors. End of tour.'] },
      electric: { name: 'the electrics', dyn: function () {
        var evs = S.DATA.cars.filter(function (c) { return c.eng === 'EV' && c.hp; }).sort(function (a, b) { return b.hp - a.hp; }).slice(0, 4);
        return evs.map(function (c, i) { return { c: c, say: (i === 0 ? 'The electric board, ranked by power, computed just now: ' : '') + c.n + ', ' + U.fnum(c.hp) + ' hp.' + (i === 3 ? ' End of tour.' : '') }; });
      } }
    };
  }
  function stepsOf(def) {
    if (def.steps) return def.steps;
    if (def.dyn) return def.dyn();
    return def.slugs.map(function (s, i) {
      var c = S.DATA.cars.filter(function (x) { return x.s === s; })[0];
      return c ? { c: c, say: def.says[i] } : null;
    }).filter(Boolean);
  }
  function stepRes(tr) {
    var st = tr.steps[tr.i];
    var tail = tr.i + 1 < tr.steps.length ? ' (' + (tr.i + 1) + '/' + tr.steps.length + ', say next, or stop.)' : ' (' + (tr.i + 1) + '/' + tr.steps.length + ')';
    return { text: st.say + tail, links: [U.linkOf(st.c.u, st.c.n)], note: 'guided tour, answers still come only from the data' };
  }
  S.register({ name: 'tour', pri: 10, try: function (q) {
    if (!S.DATA) return null;
    if (/^\s*(?:surprise me|surprise|random|dice|anywhere|take me somewhere)\s*[!?.]*\s*$/i.test(q)) {
      var pick = S.DATA.cars[Math.floor(Math.random() * S.DATA.cars.length)];
      return { text: 'Picked at random: ' + pick.n + ', ' + (pick.hl || U.fnum(pick.hp) + ' hp \u00b7 ' + pick.st) + '', links: [U.linkOf(pick.u, pick.n)] };
    }
    if (/^\s*what'?s new\b|^\s*what changed\b|newest cars|latest (cars|arrivals)/i.test(q)) {
      var newest = S.DATA.cars.filter(function (c) { return c.y; }).sort(function (a, b) { return b.y - a.y; }).slice(0, 3);
      return { text: 'Newest on the boards, computed just now: ' + newest.map(function (c) { return c.n + ' (' + c.y + ')'; }).join(' \u00b7 ') + '.', links: newest.map(function (c) { return U.linkOf(c.u, c.n); }), note: U.NOTE_CALC };
    }
    var tm = /^\s*(?:give me a |take me on a |start (?:the |a )?)?tour(?:s)?(?:\s+(?:of\s+)?(?:the\s+)?(\w+))?\s*[!?.]*\s*$/i.exec(q);
    if (!tm) return null;
    var key = (tm[1] || '').toLowerCase();
    if (key === 'electrics' || key === 'evs') key = 'electric';
    if (key === 'legend') key = 'legends';
    if (key === 'extreme') key = 'extremes';
    var T = tours();
    if (!T[key]) {
      return { text: 'Three tours, all data-guided: \u201Ctour the legends\u201D (F1 \u2192 Veyron \u2192 300 mph \u2192 V16), \u201Ctour the extremes\u201D (the four champions, picked live), \u201Ctour the electrics\u201D (the EV board by power). Pick one.', links: S.HUBS.slice(0, 3), note: 'guided tours, stepped with \u201Cnext\u201D' };
    }
    var tr = { name: T[key].name, steps: stepsOf(T[key]), i: 0 };
    if (!tr.steps.length) return null;
    S.state.mode = { owner: 'tour', fn: function (ans) {
      if (/^\s*(next|continue|go on|onwards?)\b/i.test(ans)) {
        tr.i++;
        if (tr.i >= tr.steps.length) { S.state.mode = null; return { text: 'Tour of ' + tr.name + ' complete, every stop stays where you left it. Ask anything, or say quiz me.', links: S.HUBS.slice(0, 2) }; }
        var r = stepRes(tr);
        if (tr.i === tr.steps.length - 1) S.state.mode = null;
        return r;
      }
      if (/^\s*(stop|exit|quit|end)\b/i.test(ans)) { S.state.mode = null; return { text: 'Tour paused at stop ' + (tr.i + 1) + ', the pages keep. Ask anything.', links: [U.linkOf(tr.steps[tr.i].c.u, tr.steps[tr.i].c.n)] }; }
      return null;   /* not a tour word: release to the other faculties; the tour waits */
    } };
    var first = stepRes(tr);
    return { text: 'Tour of ' + tr.name + ', ' + tr.steps.length + ' stops. ' + first.text, links: first.links, note: 'guided tour, say next to continue' };
  } });
})();

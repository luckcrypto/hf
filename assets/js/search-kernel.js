/* hypercars.fyi - SEARCH KERNEL - the operating system.
   The search has no name and no face: it is the same gold-bezel case it was
   yesterday, with a brain underneath. Zero servers: everything ships as small
   JS files answering only from this site's own data. The kernel owns the two
   mounts (the hero case and the ⌘K dialog), the shared utilities, the state
   and the dispatch pipeline. Faculties register with a priority; the kernel
   offers every question down the chain until one answers. The pri-1 lookup
   IS yesterday's typeahead, verbatim scoring, cars only - old queries look
   exactly as they always did. The librarian (index ranking + two-way
   compare) is built in at pri 80; the honest floor answers last.
   Load order: search-index.js → search-kernel.js → faculties (any order). */
'use strict';
(function () {
  var IDX = window.HC_INDEX || [];
  var LOOK = window.SEARCH_INDEX || [];
  var DATA = window.HC_DATA || null;

  /* ── shared utilities ── */
  var STOP = { the:1, is:1, an:1, of:1, to:1, in:1, on:1, how:1, what:1, does:1, do:1,
    are:1, was:1, were:1, it:1, its:1, and:1, or:1, for:1, with:1, by:1, at:1,
    make:1, makes:1, tell:1, me:1, about:1, big:1, much:1, many:1 };
  var tok = function (s) {
    return (s || '').toLowerCase().replace(/(\w)-(\w)/g, '$1$2')
      .replace(/[^a-z0-9\u00e0-\u00ff\s-]/g, ' ')
      .split(/[\s-]+/).filter(function (w) { return (w.length > 1 || /^[0-9]$/.test(w)) && !STOP[w]; });
  };
  function fnum(v) { return v.toLocaleString('en-GB', { maximumFractionDigits: v < 1000 ? 1 : 0 }); }
  function edist(a, b, cap) {
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > cap) return cap + 1;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= lb; j++) prev[j] = j;
    for (i = 1; i <= la; i++) {
      cur[0] = i; var rowMin = i;
      for (j = 1; j <= lb; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (cur[j] < rowMin) rowMin = cur[j];
      }
      if (rowMin > cap) return cap + 1;
      var tmp = prev; prev = cur; cur = tmp;
    }
    return prev[lb];
  }
  var ENT = [];
  if (DATA) DATA.cars.forEach(function (e) { ENT.push({ e: e, toks: tok(e.n) }); });
  function resolveEnt(str) {
    var qts = tok(str), best = null, bs = 0;
    for (var i = 0; i < ENT.length; i++) {
      var hits = 0, x = ENT[i];
      for (var j = 0; j < x.toks.length; j++) if (qts.indexOf(x.toks[j]) !== -1) hits++;
      if (!hits) continue;
      /* coverage bonus: "chiron" must resolve to the base Chiron, not a longer variant */
      var sc = hits * 2 + (hits === x.toks.length ? 3 : 0) + hits / x.toks.length;
      if (sc > bs) { bs = sc; best = x; }
    }
    if (best) S.state.lastEnt = { n: best.e.n };
    return best;
  }
  function linkOf(u, t) {
    for (var i = 0; i < IDX.length; i++) if (IDX[i].u === u) return IDX[i];
    return { t: t || u, u: u };
  }
  /* dims: key on HC_DATA.cars, unit, comparative word, inv = lower wins */
  var DIMS = {
    hp:   { unit: ' hp',   word: 'more powerful', inv: 0 },
    mph:  { unit: ' mph',  word: 'faster',        inv: 0 },
    z60:  { unit: ' s',    word: 'quicker to 60', inv: 1 },
    kg:   { unit: ' kg',   word: 'lighter',       inv: 1 },
    y:    { unit: '',      word: 'newer',         inv: 0 },
    price:{ unit: ' USD',  word: 'pricier',       inv: 0 }
  };

  /* ── the OS object - built unconditionally so a headless gate can test it ── */
  var S = window.HC = {
    IDX: IDX, DATA: DATA, LOOK: LOOK,
    faculties: [], pres: [],
    state: { lastEnt: null, lastF: null, mode: null, hist: [] },
    u: { tok: tok, fnum: fnum, edist: edist, resolveEnt: resolveEnt, linkOf: linkOf,
         ENT: ENT, STOP: STOP, DIMS: DIMS,
         MEDS: ['\uD83E\uDD47 ', '\uD83E\uDD48 ', '\uD83E\uDD49 '],
         YEAR: new Date().getFullYear(),
         NOTE_CALC: 'computed just now, in this tab, same data as the pages, zero servers' },
    register: function (f) { this.faculties.push(f); this.faculties.sort(function (a, b) { return a.pri - b.pri; }); },
    prehook: function (fn) { this.pres.push(fn); },
    HUBS: (DATA && DATA.hubs) || [{ t: 'The collection', u: '/#fleet' }],
    DONTKNOW: 'Honest answer: that\u2019s not in the data. This search never guesses, try any car, marque, class, country, ranking or number by name.',
    answer: function (q) {
      for (var pi = 0; pi < S.pres.length; pi++) q = S.pres[pi](q, S) || q;
      S.state.hist.push(q); if (S.state.hist.length > 40) S.state.hist.shift();
      if (S.state.mode) { var mr = S.state.mode.fn(q, S); if (mr) return mr; }
      for (var fi = 0; fi < S.faculties.length; fi++) {
        var r = S.faculties[fi].try(q, S);
        if (r) return r;
      }
      return { text: S.DONTKNOW, links: S.HUBS };
    }
  };
  window.__HC_DBG = function () { return { lastF: S.state.lastF, lastEnt: S.state.lastEnt, mode: S.state.mode && S.state.mode.owner, faculties: S.faculties.map(function (f) { return f.name + ':' + f.pri; }) }; };

  /* ── pri 1: yesterday's typeahead, verbatim - cars only, same scoring ──
     Question-shaped queries fall through so the brain can answer them. */
  var QSHAPE = /^\s*(how|what|which|who|why|when|is|are|does|do|can|top\s*\d|compare|chart|graph|quiz|tour|surprise|total|average|mean|history)\b|\?|\bvs\.?\b|\bversus\b|\bfastest\b|\bquickest\b|\bslowest\b|most powerful|\bstrongest\b|\blightest\b|\bheaviest\b|\boldest\b|\bnewest\b|most expensive|\bcheapest\b|\bin (kw|ps|feet|pounds|lbs|km\/?h|mph)\b|per tonne|power.to.weight/i;
  function lookScore(item, q) {
    var t = item.t.toLowerCase();
    if (t === q) return 100;
    if (t.indexOf(q) === 0) return 80;
    if (t.indexOf(q) > -1) return 60;
    if (item.q.indexOf(q) > -1) return 40;
    var words = q.split(/\s+/).filter(Boolean);
    if (words.length > 1 && words.every(function (w) { return item.q.indexOf(w) > -1; })) return 30;
    return 0;
  }
  S.register({ name: 'lookup', pri: 1, try: function (q) {
    if (QSHAPE.test(q)) return null;
    var ql = q.toLowerCase();
    var hits = LOOK.map(function (i) { return { i: i, s: lookScore(i, ql) }; })
      .filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s || a.i.t.length - b.i.t.length; })
      .map(function (x) { return x.i; });
    if (!hits.length) return null;   /* no rows: let the brain (or the floor) speak */
    return { list: hits };
  } });

  /* ── the librarian: index ranking, intents, two-way compare (pri 80) ── */
  var INTENTS = [
    { re: /\bpower|\bhp\b|horsepower|\bps\b|\bkw\b|bhp/, f: 'power' },
    { re: /top speed|\bfast|\bspeed\b|\bmph\b|km\/?h|\bvmax\b/, f: 'speed' },
    { re: /0.?60|0.?100|acceler|\bquick|sprint/, f: 'accel' },
    { re: /\bweigh|heav|\bkerb\b|\bcurb\b|\bmass\b|\bkg\b/, f: 'weight' },
    { re: /\bwhen\b|\byear\b|\bdebut|first (made|built|sold)|\breleased?\b/, f: 'year' },
    { re: /\bstatus\b|in production|still (made|built|sold)|\bretired\b|sold out|\bavailable\b/, f: 'status' },
    { re: /who (makes|builds|manufactures)|\bmarque\b|\bbrand\b|manufacturer/, f: 'marque' },
    { re: /\bwhere\b|made in|built in|\bcountry\b|come[s]? from/, f: 'country' },
    { re: /\bengine\b|cylinder|\bv6\b|\bv8\b|\bv10\b|\bv12\b|\bv16\b|\bw16\b|\belectric\b|\bhybrid\b|powertrain/, f: 'engine' },
    { re: /\bprice\b|\bcost\b|\bexpensive\b|how much (is|was|does)/, f: 'price' },
    { re: /\bclass\b|what (kind|type|sort)/, f: 'class' }
  ];
  var CMPDIM = { power: 'hp', speed: 'mph', accel: 'z60', weight: 'kg', year: 'y', price: 'price' };
  function score(qt, entry) {
    var s = 0, tt = tok(entry.t);
    for (var i = 0; i < qt.length; i++) {
      if (entry.k.indexOf(qt[i]) !== -1) s += 3;
      else if (entry.k.some(function (k) { return k.indexOf(qt[i]) === 0; })) s += 1;
      if (tt.indexOf(qt[i]) !== -1) s += 2;
    }
    if (s > 0 && entry.f) s += 0.5;
    return s;
  }
  S.register({ name: 'librarian', pri: 80, try: function (q) {
    var fm = /^\s*(?:and|what about|how about|also)\s+/i.exec(q);
    var carried = null;
    if (fm) { carried = S.state.lastF; q = q.slice(fm[0].length); }
    var qt = tok(q);
    if (!qt.length) return null;
    var ranked = IDX.map(function (e) { return [score(qt, e), e]; })
      .filter(function (x) { return x[0] > 0; })
      .sort(function (a, b) { return b[0] - a[0] || a[1].t.length - b[1].t.length; });   /* ties: base names beat variants */
    if (!ranked.length || ranked[0][0] < 3) return null;
    var ql = q.toLowerCase();
    var CMPRE = /\bvs\.?\b|\bversus\b|\bcompare\b|\bfaster\b|\bquicker\b|more powerful|\bstronger\b|\blighter\b|\bheavier\b|\bnewer\b|\bolder\b|\bpricier\b|more expensive/;
    if (CMPRE.test(ql) && ranked.length >= 2 && DATA) {
      var prefer = /faster|top speed|\bspeed\b|mph/.test(ql) ? 'mph'
        : /quicker|0.?60|acceler/.test(ql) ? 'z60'
        : /lighter|heavier|weigh|\bkg\b/.test(ql) ? 'kg'
        : /newer|older|year/.test(ql) ? 'y'
        : /pricier|expensive|price|cost/.test(ql) ? 'price'
        : /powerful|stronger|\bhp\b|power/.test(ql) ? 'hp' : null;
      var eA = null, eB = null;
      var parts = q.split(/\s+vs\.?\s+|\s+versus\s+/i);
      if (parts.length === 2) { eA = resolveEnt(parts[0]); eB = resolveEnt(parts[1]); }
      if (!(eA && eB)) {
        var got = [];
        for (var r0 = 0; r0 < Math.min(ranked.length, 6) && got.length < 2; r0++) {
          var cand = DATA.cars.filter(function (c) { return c.u === ranked[r0][1].u; })[0];
          if (cand && ranked[r0][0] >= 3) got.push({ e: cand });
        }
        if (got.length === 2) { eA = got[0]; eB = got[1]; }
      }
      if (eA && eB && eA.e.n !== eB.e.n) {
        var dk = prefer || 'hp';
        if (eA.e[dk] && eB.e[dk]) {
          var D = DIMS[dk];
          var win = (eA.e[dk] > eB.e[dk]) !== !!D.inv ? eA.e : eB.e;
          var lose = win === eA.e ? eB.e : eA.e;
          var dv = Math.abs(eA.e[dk] - eB.e[dk]);
          var hiv = Math.max(eA.e[dk], eB.e[dk]), lov = Math.min(eA.e[dk], eB.e[dk]);
          var ratio = lov > 0 ? hiv / lov : 0;
          var rtxt = ratio >= 1.05 ? ' (\u00D7' + (ratio >= 10 ? Math.round(ratio) : Math.round(ratio * 100) / 100) + ')' : '';
          S.state.lastEnt = { n: win.n };
          return { text: eA.e.n + ': ' + fnum(eA.e[dk]) + D.unit + ' \u00B7 ' + eB.e.n + ': ' + fnum(eB.e[dk]) + D.unit +
            ', ' + win.n + ' is ' + (dk === 'z60' ? dv.toFixed(2) : fnum(dv)) + D.unit + ' ' + D.word + rtxt + '.',
            links: [linkOf(eA.e.u, eA.e.n), linkOf(eB.e.u, eB.e.n)], note: S.u.NOTE_CALC };
        }
      }
    }
    var top = ranked[0][1], text = null, hits = [];
    for (var i = 0; i < INTENTS.length; i++) {
      if (INTENTS[i].re.test(ql) && top.f && top.f[INTENTS[i].f] && hits.indexOf(top.f[INTENTS[i].f]) === -1) {
        hits.push(top.f[INTENTS[i].f]);
        if (hits.length === 1) S.state.lastF = INTENTS[i].f;
        if (hits.length >= 3) break;
      }
    }
    if (hits.length) text = hits.join(' \u00b7 ');
    if (!text && carried && top.f && top.f[carried]) { text = top.f[carried]; S.state.lastF = carried; }
    if (!text) text = top.a || top.s;
    if (top.f && top.u.indexOf('/hypercars/') === 0) S.state.lastEnt = { n: top.t };
    return { text: text, links: ranked.slice(0, 3).map(function (x) { return x[1]; }) };
  } });

  /* ═══════════ UI - the frame does not move ═══════════ */
  if (typeof document === 'undefined') return;
  var esc = function (s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
  function rowHTML(h, n, withOn) {
    return '<li role="option" aria-selected="' + (withOn && n === 0) + '"' + (withOn && n === 0 ? ' class="on"' : '') + '>' +
      '<a href="' + h.u + '"><span class="sr-k">' + esc(h.k) + '</span>' +
      '<span class="sr-t">' + esc(h.t) + '</span>' +
      '<span class="sr-d">' + esc(h.d || '') + '</span></a></li>';
  }
  function ansHTML(res) {
    var links = (res.links || []).slice(0, 4).map(function (l) {
      return '<a href="' + l.u + '">' + esc(l.t.split(', ')[0]) + ' \u2192</a>';
    }).join('');
    return '<li class="hs-ans" role="option" aria-selected="false"><p class="ha-t">' + res.text + '</p>' +
      (res.svg ? '<div class="ha-chart">' + res.svg + '</div>' : '') +
      (links ? '<nav class="ha-links">' + links + '</nav>' : '') +
      '<div class="ha-note">' + esc(res.note || 'answers come only from this site\u2019s own data, zero servers') + '</div></li>';
  }

  /* mount: the hero case */
  (function () {
    var wrap = document.getElementById('heroSearch');
    var hIn = document.getElementById('heroInput');
    var hRes = document.getElementById('heroResults');
    var hPh = document.getElementById('heroPh');
    if (!wrap || !hIn || !hRes) return;
    hRes.setAttribute('aria-live', 'polite');
    function draw() {
      var raw = hIn.value.trim();
      if (hPh) hPh.style.display = raw ? 'none' : '';
      if (!raw) { wrap.classList.remove('on'); hRes.innerHTML = ''; return; }
      var res = S.answer(raw);
      if (res.list) {
        var out = res.list.slice(0, 6);
        hRes.innerHTML = out.map(function (h) { return rowHTML(h, -1, false); }).join('');
      } else if (res.text === S.DONTKNOW && raw.length < 3) {
        hRes.innerHTML = '<li class="srch-none">Nothing matches \u201C' + esc(raw) + '\u201D.</li>';
      } else {
        hRes.innerHTML = ansHTML(res);
      }
      wrap.classList.add('on');
    }
    var t = null;
    hIn.addEventListener('input', function () { clearTimeout(t); t = setTimeout(draw, 120); });
    hIn.addEventListener('focus', function () { if (hPh) hPh.style.display = 'none'; });
    hIn.addEventListener('blur', function () { if (hPh && !hIn.value) hPh.style.display = ''; });
    hIn.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { hIn.value = ''; draw(); hIn.blur(); }
      if (e.key === 'Enter') {
        clearTimeout(t); draw();
        var a = hRes.querySelector('li:not(.hs-ans) a');
        if (a) window.location.href = a.getAttribute('href');
      }
    });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) wrap.classList.remove('on');
    });
    var qp = null;
    try { qp = new URLSearchParams(location.search).get('q'); } catch (err) {}
    if (qp) setTimeout(function () { hIn.value = qp; draw(); wrap.scrollIntoView({ block: 'center' }); }, 0);
  })();

  /* mount: the ⌘K dialog */
  (function () {
    var dlg = document.getElementById('srch');
    var input = document.getElementById('srchInput');
    var list = document.getElementById('srchResults');
    if (!dlg || !input || !list) return;
    list.setAttribute('aria-live', 'polite');
    var open = false, sel = -1, hits = [];
    function render() {
      var raw = input.value.trim();
      if (!raw) { list.innerHTML = ''; hits = []; sel = -1; return; }
      var res = S.answer(raw);
      if (res.list) {
        hits = res.list.slice(0, 8);
        sel = hits.length ? 0 : -1;
        list.innerHTML = hits.map(function (h, n) { return rowHTML(h, n, true); }).join('');
      } else {
        hits = []; sel = -1;
        list.innerHTML = ansHTML(res);
      }
    }
    function move(d) {
      if (!hits.length) return;
      sel = (sel + d + hits.length) % hits.length;
      [].forEach.call(list.children, function (li, n) {
        li.classList.toggle('on', n === sel);
        li.setAttribute('aria-selected', String(n === sel));
      });
      var el = list.children[sel];
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    }
    function show() {
      dlg.hidden = false; open = true;
      document.body.style.overflow = 'hidden';
      input.value = ''; render();
      setTimeout(function () { input.focus(); }, 20);
    }
    function hide() {
      dlg.hidden = true; open = false;
      document.body.style.overflow = '';
    }
    ['mnSearchBtn', 'mnSearchBtn2'].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.addEventListener('click', show);
    });
    var close = document.getElementById('srchClose');
    if (close) close.addEventListener('click', hide);
    var scrim = document.getElementById('srchScrim');
    if (scrim) scrim.addEventListener('click', hide);
    var t2 = null;
    input.addEventListener('input', function () { clearTimeout(t2); t2 = setTimeout(render, 120); });
    document.addEventListener('keydown', function (e) {
      var ae = document.activeElement;
      if (!open && e.key === '/' && !(ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))) {
        e.preventDefault(); show(); return;
      }
      if (!open && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); show(); return;
      }
      if (!open) return;
      if (e.key === 'Escape') { e.preventDefault(); hide(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      if (e.key === 'Enter') {
        if (sel > -1 && hits[sel]) { e.preventDefault(); location.href = hits[sel].u; }
        else { clearTimeout(t2); render(); }
      }
    });
  })();

  /* ── the trail: local, private breadcrumb for the recall faculty ── */
  try {
    var here = { t: (document.title || '').split(', ')[0], u: location.pathname };
    if (here.t) {
      var trail = JSON.parse(localStorage.getItem('hcTrail') || '[]').filter(function (x) { return x.u !== here.u; });
      trail.unshift(here); localStorage.setItem('hcTrail', JSON.stringify(trail.slice(0, 8)));
      if (!sessionStorage.getItem('hcSeen')) {
        sessionStorage.setItem('hcSeen', '1');
        localStorage.setItem('hcVisits', String((parseInt(localStorage.getItem('hcVisits') || '0', 10) || 0) + 1));
      }
    }
  } catch (err) { /* storage unavailable: the site works identically without it */ }
})();

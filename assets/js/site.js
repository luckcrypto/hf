/* hypercars.fyi — MEGA-NAV behaviour, ported from the aircraft.fyi engine. */
(function () {
  'use strict';
  var mn = document.getElementById('mn'); if (!mn) return;
  var groups = [].slice.call(mn.querySelectorAll('.mn-group'));
  var desktop = window.matchMedia('(min-width:961px)');
  var hoverTimer;

  function openGroup(g) {
    groups.forEach(function (o) {
      if (o !== g) { o.classList.remove('is-open');
        var t = o.querySelector('.mn-top'); if (t) t.setAttribute('aria-expanded', 'false'); }
    });
    g.classList.add('is-open');
    var t = g.querySelector('.mn-top'); if (t) t.setAttribute('aria-expanded', 'true');
  }
  function closeGroup(g) {
    g.classList.remove('is-open');
    var t = g.querySelector('.mn-top'); if (t) t.setAttribute('aria-expanded', 'false');
  }
  function closeAll() { groups.forEach(closeGroup); }

  groups.forEach(function (g) {
    var top = g.querySelector('.mn-top'); if (!top) return;
    top.addEventListener('click', function () {
      g.classList.contains('is-open') ? closeGroup(g) : openGroup(g);
    });
    g.addEventListener('mouseenter', function () {
      if (!desktop.matches) return;
      clearTimeout(hoverTimer); openGroup(g);
    });
    g.addEventListener('mouseleave', function () {
      if (!desktop.matches) return;
      hoverTimer = setTimeout(function () { closeGroup(g); }, 150);
    });
  });

  /* current-page highlight */
  var cur = mn.getAttribute('data-current');
  if (cur) {
    var el = mn.querySelector('.mn-group[data-key="' + cur + '"], .mn-direct[data-key="' + cur + '"]');
    if (el) el.classList.add('is-current');
  }

  /* Escape + click-outside close */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeAll(); closeDrawer(); }
  });
  document.addEventListener('click', function (e) {
    if (!mn.contains(e.target)) closeAll();
  });

  /* scroll state */
  function onScroll() {
    if (mn.classList.contains('is-drawer')) return; /* drawer open: keep the bar exactly as it was */
    mn.classList.toggle('is-scrolled', (window.scrollY || 0) > 12);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- scrim sync (non-invasive) ---------- */
  (function () {
    var scrim = document.querySelector('.mn-scrim'); if (!scrim) return;
    function sync() {
      var open = desktop.matches && groups.some(function (g) { return g.classList.contains('is-open'); });
      document.documentElement.classList.toggle('mn-blur', open);
    }
    groups.forEach(function (g) {
      new MutationObserver(sync).observe(g, { attributes: true, attributeFilter: ['class'] });
    });
    if (desktop.addEventListener) desktop.addEventListener('change', sync);
    scrim.addEventListener('click', function () { closeAll(); sync(); });
    sync();
  })();

  /* ---------- mobile drawer ---------- */
  var burger = document.getElementById('mnBurger');
  var burger2 = document.getElementById('mnBurger2');
  function openDrawer() {
    mn.classList.add('is-drawer');
    if (burger) burger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    mn.classList.remove('is-drawer');
    if (burger) burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    onScroll(); /* re-sync to the real scroll position now the drawer is shut */
  }
  if (burger) burger.addEventListener('click', function () {
    mn.classList.contains('is-drawer') ? closeDrawer() : openDrawer();
  });
  if (burger2) burger2.addEventListener('click', closeDrawer);
  if (desktop.addEventListener) desktop.addEventListener('change', function (e) {
    if (e.matches) closeDrawer(); else closeAll();
  });

  /* drawer accordions — single-open */
  var accs = [].slice.call(mn.querySelectorAll('.mn-acc'));
  accs.forEach(function (a) {
    var top = a.querySelector('.mn-acc-top'); if (!top) return;
    top.addEventListener('click', function () {
      var was = a.classList.contains('is-open');
      accs.forEach(function (o) {
        o.classList.remove('is-open');
        var t = o.querySelector('.mn-acc-top'); if (t) t.setAttribute('aria-expanded', 'false');
      });
      if (!was) { a.classList.add('is-open'); top.setAttribute('aria-expanded', 'true'); }
    });
  });
})();

/* ---------- page: single-open <details> accordions ---------- */
(function () {
  document.querySelectorAll('[data-accordion]').forEach(function (group) {
    group.querySelectorAll('details').forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (!d.open) return;
        group.querySelectorAll('details[open]').forEach(function (o) { if (o !== d) o.open = false; });
      });
    });
  });
})();

/* ---------- spec table: metric ⇄ imperial (remembered sitewide) ---------- */
(function () {
  function stored(){ try { return localStorage.getItem('acfyi.units') === 'imperial'; } catch(e){ return false; } }
  document.querySelectorAll('[data-unit-toggle]').forEach(function (btn) {
    var table = document.querySelector(btn.getAttribute('data-unit-toggle'));
    if (!table) return;
    var imperial = false;
    function apply(){
      table.querySelectorAll('td[data-metric]').forEach(function (td) {
        td.textContent = imperial ? td.getAttribute('data-imperial') : td.getAttribute('data-metric');
      });
      btn.textContent = imperial ? 'Switch to metric' : 'Switch to imperial';
    }
    btn.addEventListener('click', function () {
      imperial = !imperial;
      try { localStorage.setItem('acfyi.units', imperial ? 'imperial' : 'metric'); } catch(e){}
      apply();
    });
    if (stored()){ imperial = true; apply(); }
  });
})();

/* ============ ANIMATED NAV BRAND — ported verbatim from luck.fyi ============ */
/* 1. the .fyi expander */
(function(){
  if(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var fws=[].slice.call(document.querySelectorAll('.mn-logo b .fw'));
  fws.forEach(function(fw){
    var sp=fw.querySelector('.fwt'); if(!sp) return;
    var base=sp.textContent;
    function widthOf(t){
      var c=document.createElement('span'); c.textContent=t;
      c.style.cssText='position:absolute;visibility:hidden;white-space:nowrap';
      fw.appendChild(c); var w=c.offsetWidth; c.remove(); return w;
    }
    fw.style.width=widthOf(base)+'px';
    function swap(t,cb){
      sp.classList.add('fo');
      setTimeout(function(){
        sp.textContent=t; fw.style.width=widthOf(t)+'px';
        sp.classList.remove('fo'); sp.classList.add('fi');
        requestAnimationFrame(function(){requestAnimationFrame(function(){
          sp.classList.remove('fi');
        });});
        if(cb) setTimeout(cb,1350);
      },240);
    }
    var seq=['for','your','information'];
    function play(){
      if(document.hidden){ setTimeout(play,9000); return; }
      var i=0;
      (function step(){
        i<seq.length ? swap(seq[i++],step)
                     : swap(base,function(){ setTimeout(play, 7000 + Math.random()*6000); });
      })();
    }
    setTimeout(play, 5000 + Math.random()*7000);
  });
})();

/* 2. the tail-number roller */
(function(){
  var mbs=[].slice.call(document.querySelectorAll('.mn-mark .mm-b')); if(!mbs.length) return;

  /* manufacturer-prefixed type codes — the way the industry actually says them */
  var TYPES=['SF90','P1','F1','918','GT','MC20','T50','V16','W16','U9',
             'JES','LFA','CHI','REV','V12','GMA','C21','TSR','EVI','ONE'];
  var EMO=['🏎️','🏁','⚡','🔥','💨','🏆','🛞','🔧','🏎️','⚡'];

  function next(){
    if(Math.random() < 0.22) return {emo:EMO[Math.floor(Math.random()*EMO.length)]};
    var n=TYPES[Math.floor(Math.random()*TYPES.length)];
    if(n==='F1') return {emo:'👑'};   /* easter egg: McLaren F1, king of hypercars */
    return {n:n};
  }
  /* the favicon's car silhouette, drawn in ink on the disc */
  var CAR_D='M5 44 L5 39 Q5 34 12 33 L21 32 Q26 24 36 24 L45 24 Q53 25 57 31 L60 35 Q62 37 62 41 L62 44 L53 44 A6 6 0 0 0 41 44 L27 44 A6 6 0 0 0 15 44 Z';
  function paint(mb,s){
    if(s.car){ mb.classList.remove('emo'); mb.classList.add('pln');
      mb.innerHTML='<svg viewBox="0 0 64 64" aria-hidden="true"><g fill="currentColor"><path d="'+CAR_D+'"/><circle cx="21" cy="44" r="5"/><circle cx="47" cy="44" r="5"/></g></svg>'; return; }
    mb.classList.remove('pln');
    if(s.emo){ mb.classList.add('emo'); mb.textContent=s.emo; }
    else{ mb.classList.remove('emo'); mb.textContent=s.n; }
  }

  mbs.forEach(function(mb){ paint(mb, {car:true}); });

  if(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function roll(){
    if(document.hidden){ schedule(); return; }
    mbs.forEach(function(mb){ mb.classList.add('mo'); });
    setTimeout(function(){
      mbs.forEach(function(mb){
        paint(mb, next());
        mb.classList.remove('mo'); mb.classList.add('mi');
      });
      requestAnimationFrame(function(){requestAnimationFrame(function(){
        mbs.forEach(function(mb){ mb.classList.remove('mi'); });
      });});
      schedule();
    },220);
  }
  function schedule(){ setTimeout(roll, 5000 + Math.random()*3000); }
  setTimeout(roll, 10000 + Math.random()*1500);   /* brand mark holds ~10 s, then the rotation begins */
})();

/* ---------- fleet filter (home) ---------- */
(function(){
  var bar = document.getElementById('fleetFilter');
  var grid = document.getElementById('fleetGrid');
  var out = document.getElementById('fleetCount');
  if (!bar || !grid) return;
  var chips = [].slice.call(bar.querySelectorAll('.fchip'));
  var cards = [].slice.call(grid.querySelectorAll('.acard'));
  function apply(f){
    var shown = 0;
    cards.forEach(function(c){
      var hit = (f === 'all') || (c.getAttribute('data-cat') === f);
      c.hidden = !hit;
      if (hit) shown++;
    });
    chips.forEach(function(c){ c.setAttribute('aria-pressed', String(c.getAttribute('data-filter') === f)); });
    if (out) out.textContent = 'Showing ' + shown + ' of ' + cards.length + ' hypercars.';
  }
  chips.forEach(function(c){
    c.addEventListener('click', function(){ apply(c.getAttribute('data-filter')); });
  });
  apply('all');
})();

/* ---------- site search ---------- */
(function(){
  var dlg = document.getElementById('srch');
  var input = document.getElementById('srchInput');
  var list = document.getElementById('srchResults');
  if (!dlg || !input || !list) return;
  var IDX = window.SEARCH_INDEX || [];
  var open = false, sel = -1, hits = [];
  var esc = function(s){ var d = document.createElement('div'); d.textContent = s; return d.innerHTML; };

  function score(item, q){
    var t = item.t.toLowerCase();
    if (t === q) return 100;
    if (t.indexOf(q) === 0) return 80;
    if (t.indexOf(q) > -1) return 60;
    if (item.q.indexOf(q) > -1) return 40;
    /* every word must appear somewhere */
    var words = q.split(/\s+/).filter(Boolean);
    if (words.length > 1 && words.every(function(w){ return item.q.indexOf(w) > -1; })) return 30;
    return 0;
  }
  function render(){
    var q = input.value.trim().toLowerCase();
    if (!q){
      list.innerHTML = '';
      hits = [];
      return;
    }
    hits = IDX.map(function(i){ return { i: i, s: score(i, q) }; })
      .filter(function(x){ return x.s > 0; })
      .sort(function(a, b){ return b.s - a.s || a.i.t.length - b.i.t.length; })
      .slice(0, 8).map(function(x){ return x.i; });
    sel = hits.length ? 0 : -1;
    list.innerHTML = hits.length
      ? hits.map(function(h, n){
          return '<li role="option" aria-selected="' + (n === 0) + '" class="' + (n === 0 ? 'on' : '') + '">' +
            '<a href="' + h.u + '"><span class="sr-k">' + esc(h.k) + '</span>' +
            '<span class="sr-t">' + esc(h.t) + '</span>' +
            '<span class="sr-d">' + esc(h.d || '') + '</span></a></li>'; }).join('')
      : '<li class="srch-none">Nothing matches “' + esc(input.value) + '”.</li>';
  }
  function move(d){
    if (!hits.length) return;
    sel = (sel + d + hits.length) % hits.length;
    [].forEach.call(list.children, function(li, n){
      li.classList.toggle('on', n === sel);
      li.setAttribute('aria-selected', String(n === sel));
    });
    var el = list.children[sel];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }
  function show(){
    dlg.hidden = false; open = true;
    document.body.style.overflow = 'hidden';
    input.value = ''; render();
    setTimeout(function(){ input.focus(); }, 20);
  }
  function hide(){
    dlg.hidden = true; open = false;
    document.body.style.overflow = '';
  }
  ['mnSearchBtn', 'mnSearchBtn2'].forEach(function(id){
    var b = document.getElementById(id);
    if (b) b.addEventListener('click', show);
  });
  /* ---- hero inline search: same index, same scoring, expands in place ---- */
  (function () {
    var wrap = document.getElementById('heroSearch');
    var hIn  = document.getElementById('heroInput');
    var hRes = document.getElementById('heroResults');
    var hPh  = document.getElementById('heroPh');
    if (!wrap || !hIn || !hRes) return;
    function draw() {
      var raw = hIn.value.trim(), q = raw.toLowerCase();
      if (hPh) hPh.style.display = raw ? 'none' : '';
      if (!q) { wrap.classList.remove('on'); hRes.innerHTML = ''; return; }
      var out = IDX.map(function (i) { return { i: i, s: score(i, q) }; })
        .filter(function (x) { return x.s > 0; })
        .sort(function (a, b) { return b.s - a.s || a.i.t.length - b.i.t.length; })
        .slice(0, 6).map(function (x) { return x.i; });
      hRes.innerHTML = out.length
        ? out.map(function (h) {
            return '<li><a href="' + h.u + '"><span class="sr-k">' + esc(h.k) + '</span>' +
              '<span class="sr-t">' + esc(h.t) + '</span>' +
              '<span class="sr-d">' + esc(h.d || '') + '</span></a></li>'; }).join('')
        : '<li class="srch-none">Nothing matches \u201C' + esc(raw) + '\u201D.</li>';
      wrap.classList.add('on');
    }
    hIn.addEventListener('input', draw);
    hIn.addEventListener('focus', function () { if (hPh) hPh.style.display = 'none'; });
    hIn.addEventListener('blur', function () { if (hPh && !hIn.value) hPh.style.display = ''; });
    hIn.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { hIn.value = ''; draw(); hIn.blur(); }
      if (e.key === 'Enter') { var a = hRes.querySelector('a'); if (a) window.location.href = a.getAttribute('href'); }
    });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) wrap.classList.remove('on');
    });
  })();

  var close = document.getElementById('srchClose');
  if (close) close.addEventListener('click', hide);
  var scrim = document.getElementById('srchScrim');
  if (scrim) scrim.addEventListener('click', hide);
  input.addEventListener('input', render);
  document.addEventListener('keydown', function(e){
    var ae = document.activeElement;
    if (!open && e.key === '/' && !(ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))){
      e.preventDefault(); show(); return;
    }
    if (!open && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'){
      e.preventDefault(); show(); return;
    }
    if (!open) return;
    if (e.key === 'Escape'){ e.preventDefault(); hide(); }
    if (e.key === 'ArrowDown'){ e.preventDefault(); move(1); }
    if (e.key === 'ArrowUp'){ e.preventDefault(); move(-1); }
    if (e.key === 'Enter' && sel > -1 && hits[sel]){ e.preventDefault(); location.href = hits[sel].u; }
  });
})();


/* ---------- fleet sort (home) ---------- */
(function(){
  var bar = document.getElementById('fleetSort');
  var grid = document.getElementById('fleetGrid');
  if (!bar || !grid) return;
  var chips = [].slice.call(bar.querySelectorAll('.fchip'));
  function apply(key){
    var cards = [].slice.call(grid.querySelectorAll('.acard'));
    cards.sort(function(a, b){
      if (key === 'name') return a.getAttribute('data-name') < b.getAttribute('data-name') ? -1 : 1;
      if (key === 'marque'){
        var am = a.getAttribute('data-marque') || '', bm = b.getAttribute('data-marque') || '';
        if (am !== bm) return am < bm ? -1 : 1;
        return parseFloat(b.getAttribute('data-power') || 0) - parseFloat(a.getAttribute('data-power') || 0);
      }
      if (key === 'engine'){
        var ae = parseFloat(a.getAttribute('data-enginerank')) || 9, be = parseFloat(b.getAttribute('data-enginerank')) || 9;
        if (ae !== be) return ae - be;
        return parseFloat(b.getAttribute('data-power') || 0) - parseFloat(a.getAttribute('data-power') || 0);
      }
      if (key === 'zero60'){   /* lower 0-60 is quicker -> ascending; unknown (0) sorts last */
        var az = parseFloat(a.getAttribute('data-zero60')) || 999, bz = parseFloat(b.getAttribute('data-zero60')) || 999;
        return az - bz;
      }
      return parseFloat(b.getAttribute('data-' + key) || 0) - parseFloat(a.getAttribute('data-' + key) || 0);
    });
    cards.forEach(function(c){ grid.appendChild(c); });
    chips.forEach(function(c){ c.setAttribute('aria-pressed', String(c.getAttribute('data-sort') === key)); });
  }
  chips.forEach(function(c){ c.addEventListener('click', function(){ apply(c.getAttribute('data-sort')); }); });
})();

/* ---------- compare tray: collect up to three from anywhere ---------- */
(function(){
  var KEY = 'acfyi.tray';
  function load(){ try { return JSON.parse(sessionStorage.getItem(KEY)) || []; } catch(e){ return []; } }
  function save(t){ try { sessionStorage.setItem(KEY, JSON.stringify(t)); } catch(e){} }
  var btns = [].slice.call(document.querySelectorAll('.addcmp'));
  var pill = document.createElement('div');
  pill.id = 'trayPill';
  pill.setAttribute('role', 'status');
  pill.hidden = true;
  pill.innerHTML = '<a id="trayGo" href="/compare">Compare</a><button type="button" id="trayClear" aria-label="Clear the compare tray">×</button>';
  document.body.appendChild(pill);
  var go = pill.querySelector('#trayGo');

  function sync(){
    var t = load();
    btns.forEach(function(b){
      b.setAttribute('aria-pressed', String(t.indexOf(b.getAttribute('data-slug')) > -1));
    });
    if (!t.length){ pill.hidden = true; return; }
    pill.hidden = false;
    if (t.length === 1){
      go.textContent = '1 in tray — pick one more to compare';
      go.setAttribute('href', '/compare/tool#' + t[0]);
    } else {
      go.textContent = 'Compare ' + t.length + ' hypercars →';
      go.setAttribute('href', '/compare/tool#' + t.join(','));
    }
  }
  btns.forEach(function(b){
    b.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation();
      var slug = b.getAttribute('data-slug');
      var t = load();
      var i = t.indexOf(slug);
      if (i > -1) t.splice(i, 1);
      else { if (t.length >= 3) t.shift(); t.push(slug); }
      save(t); sync();
    });
  });
  pill.querySelector('#trayClear').addEventListener('click', function(){ save([]); sync(); });
  sync();
})();


/* ---------- card grid columns — scoped: each bar controls only its own section ---------- */
(function(){
  var bars = [].slice.call(document.querySelectorAll('.colsbar'));
  var grids = [].slice.call(document.querySelectorAll('.cardgrid'));
  if (!grids.length) return;
  function get(k, d){ try { return localStorage.getItem(k) || d; } catch(e){ return d; } }
  function set(k, v){ try { localStorage.setItem(k, v); } catch(e){} }
  function scopeOf(el){ return (el && el.getAttribute('data-scope')) || 'aircraft'; }
  function prefs(scope){
    /* aircraft scope migrates any pre-scope stored choice */
    /* desktop is 3 or 4 only; anything stored as '2' from before is upgraded */
    var dc = get('acfyi.cols.' + scope, '3');
    if (dc !== '3' && dc !== '4') dc = '3';
    var mc = get('acfyi.colsm.' + scope, scope === 'aircraft' ? get('acfyi.colsm', 'm2') : 'm2');
    return { dc: dc, mc: mc };
  }
  function apply(scope){
    var p = prefs(scope);
    grids.forEach(function(g){
      if (scopeOf(g) !== scope) return;
      g.classList.toggle('cols-3', p.dc === '3');
      g.classList.toggle('cols-4', p.dc === '4');
      g.classList.toggle('mcols-1', p.mc === 'm1');
    });
    bars.forEach(function(bar){
      if (scopeOf(bar) !== scope) return;
      [].forEach.call(bar.querySelectorAll('.fchip'), function(c){
        var v = c.getAttribute('data-cols');
        c.setAttribute('aria-pressed', String(v === p.dc || v === p.mc));
      });
    });
  }
  bars.forEach(function(bar){
    bar.addEventListener('click', function(e){
      var c = e.target.closest ? e.target.closest('.fchip') : null;
      if (!c) return;
      var v = c.getAttribute('data-cols');
      if (!v) return;
      var scope = scopeOf(bar);
      set(v.charAt(0) === 'm' ? 'acfyi.colsm.' + scope : 'acfyi.cols.' + scope, v);
      apply(scope);
    });
  });
  apply('aircraft'); apply('airlines');
})();

/* ---------- language pill ---------- */
(function(){
  var pill = document.getElementById('langPill');
  if (!pill) return;
  var LANGS = [['en','English'],['zh','简体中文'],['ru','Русский'],['es','Español'],['fr','Français'],
               ['de','Deutsch'],['pt','Português'],['ar','العربية'],['hi','हिन्दी'],['ja','日本語']];
  var btn = pill.querySelector('.lang-btn');
  var menu = pill.querySelector('.lang-menu');
  var cur = pill.querySelector('.lang-cur');
  var m = location.pathname.match(/^\/(zh|ru|es|fr|de|pt|ar|hi|ja)(\/|$)/);
  var here = m ? m[1] : 'en';
  cur.textContent = here.toUpperCase();
  var rest = location.pathname.replace(/^\/(zh|ru|es|fr|de|pt|ar|hi|ja)(?=\/|$)/, '') || '/';
  menu.innerHTML = LANGS.map(function(l){
    var href = (l[0] === 'en' ? rest : '/' + l[0] + rest) + location.hash;
    return '<li role="option" aria-selected="' + (l[0] === here) + '">' +
      '<a href="' + href + '" data-lang="' + l[0] + '"' + (l[0] === here ? ' class="on"' : '') + '>' + l[1] + '</a></li>';
  }).join('');
  function close(){ menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
  btn.addEventListener('click', function(e){
    e.stopPropagation();
    var open = menu.hidden;
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', function(e){ if (!pill.contains(e.target)) close(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); });
  menu.addEventListener('click', function(e){
    var a = e.target.closest ? e.target.closest('a[data-lang]') : null;
    if (a) { try { localStorage.setItem('acfyi.lang', a.getAttribute('data-lang')); } catch(err){} }
  });
})();

/* ---------- hangar shop: "owned" ticks, saved on-device ---------- */
(function(){
  var items = [].slice.call(document.querySelectorAll('.gearitem[data-key]'));
  if (!items.length) return;
  items.forEach(function(it){
    var key = it.getAttribute('data-key');
    var btn = it.querySelector('.gi-own');
    if (!btn) return;
    var on = false;
    try { on = localStorage.getItem(key) === '1'; } catch (e) {}
    function paint(){ it.classList.toggle('owned', on); btn.setAttribute('aria-pressed', String(on)); btn.textContent = on ? 'Owned \u2713' : 'Own it'; }
    paint();
    btn.addEventListener('click', function(){
      on = !on;
      try { on ? localStorage.setItem(key, '1') : localStorage.removeItem(key); } catch (e) {}
      paint();
    });
  });
})();

/* ---------- legend: copy a hex swatch ---------- */
(function(){
  var btns = [].slice.call(document.querySelectorAll('.slg-hex'));
  if (!btns.length) return;
  btns.forEach(function(btn){
    btn.addEventListener('click', function(){
      var hex = btn.getAttribute('data-hex');
      var done = function(){ var old = btn.textContent; btn.textContent = 'Copied \u2713'; btn.classList.add('ok'); setTimeout(function(){ btn.textContent = old; btn.classList.remove('ok'); }, 1100); };
      try { navigator.clipboard.writeText(hex).then(done, function(){ btn.textContent = hex; }); }
      catch (e) { done(); }
    });
  });
})();



/* ---------- hero search: typed hints to inspire a query ---------- */
(function () {
  var el = document.getElementById('heroType'); if (!el) return;
  var QS = ['the most powerful car ever', 'Koenigsegg Gemera', 'Rimac Nevera R', '0-60 in under two seconds',
            'Bugatti Tourbillon', 'quad-motor EVs', 'V12 or electric?', 'Yangwang U9 Xtreme',
            'the fastest top speed', 'McLaren F1'];
  var reduce = false;
  try { reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches; } catch (e) {}
  if (reduce) { el.textContent = 'Search every hypercar'; return; }

  var qi = 0, ci = 0, deleting = false;
  var ph = document.getElementById('heroPh');
  function tick() {
    if (ph && ph.style.display === 'none') return setTimeout(tick, 500); /* paused while typing */
    var q = QS[qi];
    if (!deleting) {
      ci++; el.textContent = q.slice(0, ci);
      if (ci >= q.length) { deleting = true; return setTimeout(tick, 1700); }
      return setTimeout(tick, 55 + Math.random() * 45);
    }
    ci--; el.textContent = q.slice(0, ci);
    if (ci <= 0) { deleting = false; qi = (qi + 1) % QS.length; return setTimeout(tick, 300); }
    return setTimeout(tick, 26);
  }
  tick();
})();

/* ---------- type photography, fetched at load ----------
   No build step and no image folder: every aircraft page emits an empty .photoSlot and
   this fills it from Wikipedia + Wikimedia Commons. If anything at all is missing or
   unfree the slot stays empty, and an empty slot is display:none — so a page without a
   usable free photograph simply has no card rather than a gap or a placeholder. */
(function () {
  var slots = [].slice.call(document.querySelectorAll('.photoSlot'));
  /* the fetch guard matters: a headless smoke harness has no fetch and must not throw */
  if (!slots.length || typeof fetch !== 'function') return;

  var FREE    = /^(cc[ -]?0|cc[ -]?by([ -]sa)?\b|public domain|pd[ -]|no restrictions)/i;
  var NONFREE = /(non[- ]?commercial|\bnc\b|no[- ]?deriv|\bnd\b|fair use|all rights)/i;
  /* AIRCRAFT subject filter. Cockpit and cabin shots are the most common wrong result on
     Commons, so they lead. Then close-ups, models, crash imagery, factory and museum
     shots. Single line and /i only: JavaScript has no /x flag and a regex literal cannot
     contain line breaks. */
  var BAD = /(interior|cockpit|dashboard|engine[ _-]?bay|wheel|badge|logo|gearbox|brake|caliper|crash|wreck|replica|scale[ _-]?model|model|lego|toy|factory|assembly|chassis|cutaway|rear[ _-]?light|tail[ _-]?light|detail|diagram|schematic|patent|spy|render)/i;

  /* AIRCRAFT CATEGORY GATE — the real fix for ambiguous names.
     Aircraft names are overwhelmingly common nouns: Eagle, Falcon, Harrier, Comet,
     Vulcan, Spirit, Archer, Gripen. Wikipedia returns the bird or the Roman god with a
     perfectly valid free image and the card renders a lie. Checking the article's
     categories catches every one of these, including the ones nobody would think to list. */
  var CARCAT = /(car|automobile|hypercar|supercar|sports[ _-]?car|coup|roadster|vehicle|mid-engine|grand[ _-]?tour)/i;

  var strip = function (s) { return String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); };

  function api(base, params) {
    var q = Object.keys(params).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');
    /* origin=* is what makes MediaWiki send CORS headers */
    return fetch(base + '?' + q + '&format=json&origin=*', { mode: 'cors' })
      .then(function (r) { return r.ok ? r.json() : null; });
  }

  function render(slot, d) {
    var fig = document.createElement('figure');
    fig.className = 'typePhoto';
    var img = document.createElement('img');
    img.src = d.src;
    img.alt = slot.getAttribute('data-name') || '';
    img.loading = 'lazy'; img.decoding = 'async';
    img.width = 1200; img.height = 800;            /* reserve space, avoid layout shift */
    img.onerror = function () { fig.parentNode && fig.parentNode.removeChild(fig); };
    var cap = document.createElement('figcaption');
    cap.className = 'photoCredit';
    cap.innerHTML = 'Photo: ' + d.author +
      ' \u00b7 <a href="' + d.licenseUrl + '" rel="license nofollow noopener" target="_blank">' + d.license + '</a>' +
      ' \u00b7 via <a href="' + d.source + '" rel="nofollow noopener" target="_blank">Wikimedia Commons</a>';
    fig.appendChild(img); fig.appendChild(cap);
    slot.appendChild(fig);
  }

  slots.forEach(function (slot) {
    var maker = slot.getAttribute('data-maker') || '';
    var name  = slot.getAttribute('data-name') || '';
    var title = slot.getAttribute('data-wiki');
    /* With no curated article, a manufacturer prefix is far safer than the bare name:
       "Hawker Siddeley Harrier" is unambiguous where "Harrier" is a bird. */
    if (!title && maker && name) title = maker + ' ' + name;
    if (!title) return;
    api('https://en.wikipedia.org/w/api.php', {
      action: 'query', titles: title, prop: 'pageimages|categories',
      piprop: 'original', pilicense: 'free', cllimit: 'max', clshow: '!hidden',
      redirects: '1', formatversion: '2'
    }).then(function (j) {
      var pages = j && j.query && j.query.pages;
      var pg    = pages && pages[0];
      var orig  = pg && pg.original;
      if (!orig || !orig.source) return null;                    /* no article or image */
      /* the categories ride along on this same request — no extra round trip */
      var cats = (pg.categories || []).map(function (c) { return c.title || ''; }).join(' | ');
      var isCar = CARCAT.test(cats);
      if (!isCar) return null;                                   /* not a car article */
      var file = 'File:' + decodeURIComponent(orig.source.split('/').pop()).replace(/_/g, ' ');
      if (BAD.test(file)) return null;                           /* wrong subject */
      return api('https://commons.wikimedia.org/w/api.php', {
        action: 'query', titles: file, prop: 'imageinfo',
        iiprop: 'url|extmetadata', iiurlwidth: '1200',
        iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl', formatversion: '2'
      });
    }).then(function (j) {
      if (!j) return;
      var pages = j.query && j.query.pages;
      var ii = pages && pages[0] && pages[0].imageinfo && pages[0].imageinfo[0];
      if (!ii) return;
      var em = ii.extmetadata || {};
      var lic = strip(em.LicenseShortName && em.LicenseShortName.value);
      var author = strip(em.Artist && em.Artist.value);
      if (!lic || NONFREE.test(lic) || !FREE.test(lic)) return;  /* unfree */
      if (!author || author.length > 140) return;                /* no attribution */
      var licUrl = (em.LicenseUrl && em.LicenseUrl.value) || '';
      if (!licUrl) return;                                       /* no licence URL */
      render(slot, {
        src: ii.thumburl || ii.url, author: author, license: lic,
        licenseUrl: licUrl, source: ii.descriptionurl || ''
      });
    }).catch(function () { /* offline, blocked, rate limited — slot stays empty */ });
  });
})();

/* ---------- reveal on scroll ----------
   Sections fade up as a block. Card grids fade up a ROW AT A TIME, and the
   rows are worked out from real geometry (offsetTop) rather than from an
   assumed column count — so it follows whatever the grid is actually doing:
   1 or 2 up on a phone, 2/3/4 on desktop, and it survives the full-width
   interludes sitting inside the grid. Regrouped on resize and after any
   filter or sort, since both change which cards share a row. */
(function(){
  try { if (window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches) return; } catch(e){}
  if (!('IntersectionObserver' in window)) return;

  /* sections that do NOT contain a card grid fade as one block */
  var secIO = new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('in'); secIO.unobserve(e.target); } });
  }, { rootMargin:'0px 0px -6% 0px', threshold:0.05 });
  [].forEach.call(document.querySelectorAll('section.section'), function(sec){
    if (sec.querySelector('.cardgrid')) return;
    sec.classList.add('reveal'); secIO.observe(sec);
  });

  var grids = [].slice.call(document.querySelectorAll('.cardgrid'));
  if (!grids.length) return;

  var rowIO = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (!e.isIntersecting) return;
      var row = e.target._row || [e.target];
      row.forEach(function(el){ el.classList.add('in'); });
      rowIO.unobserve(e.target);
    });
  }, { rootMargin:'0px 0px -5% 0px', threshold:0.02 });

  function visible(el){
    return !el.hidden && el.offsetParent !== null;
  }
  function group(grid){
    var items = [].slice.call(grid.children).filter(visible);
    var rows = [], byTop = {};
    items.forEach(function(el){
      if (!el.classList.contains('in')) el.classList.add('reveal');
      /* round to absorb sub-pixel differences between cards in a row */
      var key = Math.round(el.offsetTop / 6);
      if (!byTop[key]) { byTop[key] = []; rows.push(byTop[key]); }
      byTop[key].push(el);
    });
    rows.forEach(function(row){
      /* the whole row rises together, so the trigger is its first card */
      var lead = row[0];
      if (lead.classList.contains('in')) return;
      row.forEach(function(el){ el._row = row; el.style.transitionDelay = ''; });
      rowIO.observe(lead);
    });
  }
  function regroup(){ grids.forEach(group); }

  regroup();
  var t = 0;
  function later(){ clearTimeout(t); t = setTimeout(regroup, 140); }
  window.addEventListener('resize', later, { passive:true });
  window.addEventListener('orientationchange', later);
  /* filtering and sorting both change which cards share a row */
  ['fleetFilter','fleetSort','fleetCols'].forEach(function(id){
    var e = document.getElementById(id);
    if (e) e.addEventListener('click', later);
  });
})();

/* ---------- filter/sort/grid modal ---------- */
(function(){
  var m=document.getElementById('fmodal'), open=document.getElementById('openFilters');
  if(!m||!open) return;
  function show(){ m.hidden=false; document.body.classList.add('modal-open'); }
  function hide(){ m.hidden=true; document.body.classList.remove('modal-open'); }
  open.addEventListener('click',show);
  ['fmodalX','fmodalDone','fmodalBack'].forEach(function(id){ var e=document.getElementById(id); if(e) e.addEventListener('click',hide); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&!m.hidden) hide(); });
  /* reflect the active class filter on the trigger button */
  var ff=document.getElementById('fleetFilter'), fc=document.getElementById('filtCount');
  if(ff&&fc){ ff.addEventListener('click',function(e){
    var t=e.target; while(t&&t!==ff&&!t.getAttribute('data-filter')) t=t.parentNode;
    if(t&&t!==ff){ fc.textContent=t.textContent.trim().replace(/\s+/g,' '); }
  }); }
})();

/* ---------- reading-progress bar on the nav ---------- */
(function(){
  var prog=document.getElementById('scrollProg'); if(!prog) return;
  function upd(){
    var d=document.documentElement, h=(d.scrollHeight - window.innerHeight);
    var pct = h>0 ? Math.min(100, Math.max(0, (window.scrollY||d.scrollTop||0)/h*100)) : 0;
    prog.style.width = pct.toFixed(2)+'%';
  }
  window.addEventListener('scroll',upd,{passive:true});
  window.addEventListener('resize',upd,{passive:true});
  upd();
})();

/* ---------- dismiss in-grid interludes on active sort/filter ---------- */
(function(){
  var grid=document.getElementById('fleetGrid'); if(!grid) return;
  var ff=document.getElementById('fleetFilter'), fs=document.getElementById('fleetSort'); var sorted=false;
  if(fs) [].forEach.call(fs.querySelectorAll('.fchip'),function(c){
    c.addEventListener('click',function(){ sorted=true; grid.classList.add('interludes-off'); }); });
  if(ff) [].forEach.call(ff.querySelectorAll('.fchip'),function(c){
    c.addEventListener('click',function(){
      var f=c.getAttribute('data-filter'); grid.classList.toggle('interludes-off', sorted || f!=='all'); }); });
})();

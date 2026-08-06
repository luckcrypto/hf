#!/usr/bin/env node
/* search_gate.js, THE TRIAL GATE. Loads the generated index plus the ten-file
   engine headless (no DOM: the kernel builds the brain unconditionally and
   mounts nothing), then fires numbered trials at HC.answer covering every
   faculty, both modes, follow-up carry, typo forgiveness, collision canaries
   and the honest floor. Expected values for aggregates and superlatives are
   computed BY THIS HARNESS from HC_DATA itself, the gate can never disagree
   with the data. The engine ships only when every trial is green. */
'use strict';
const fs = require('fs'), path = require('path');
const SITE = path.dirname(__dirname);
global.window = {};
global.localStorage = { _s: {}, getItem(k) { return this._s[k] || null; }, setItem(k, v) { this._s[k] = String(v); } };
global.sessionStorage = { _s: {}, getItem(k) { return this._s[k] || null; }, setItem(k, v) { this._s[k] = String(v); } };
const FILES = ['search-index', 'search-kernel', 'search-lang', 'search-calc', 'search-data',
  'search-draw', 'search-quiz', 'search-tour', 'search-recall', 'search-voice'];
for (const f of FILES) eval(fs.readFileSync(path.join(SITE, 'assets', 'js', f + '.js'), 'utf8'));
const HC = window.HC, D = window.HC_DATA;
if (!HC || !D) { console.error('FATAL: brain did not build headless'); process.exit(1); }

let N = 0, FAIL = 0;
function chk(name, cond, evidence) {
  N++;
  const tag = String(N).padStart(2, '0');
  if (cond) console.log(`${tag} \u2713 ${name}`);
  else { FAIL++; console.log(`${tag} \u2717 ${name}\n     evidence: ${evidence}`); }
}
const ask = q => HC.answer(q);
const fresh = () => { HC.state.lastEnt = null; HC.state.lastF = null; HC.state.mode = null; };

/* harness-computed truths */
const by = (d, asc) => D.cars.filter(c => c[d]).sort((a, b) => asc ? a[d] - b[d] : b[d] - a[d]);
const tb = D.cars.find(c => c.s === 'bugatti-tourbillon');
const jk = D.cars.find(c => c.s === 'koenigsegg-jesko');
const ch = D.cars.find(c => c.s === 'bugatti-chiron');
const evs = D.cars.filter(c => c.eng === 'EV');
const bugattis = D.cars.filter(c => c.mq === 'Bugatti');
const avgHp = (D.cars.reduce((a, c) => a + c.hp, 0) / D.cars.length);
const mostPow = by('hp')[0], fastest = by('mph')[0], quickest = by('z60', 1)[0], lightest = by('kg', 1)[0];
const fastFerrari = by('mph').filter(c => c.mq === 'Ferrari')[0];
const powV12 = by('hp').filter(c => c.eng === 'V12')[0];
const quickEV = by('z60', 1).filter(c => c.eng === 'EV')[0];
const powInProd = by('hp').filter(c => c.st.toLowerCase().indexOf('in production') === 0)[0];
const newest3 = by('y').slice(0, 3).map(c => c.n);

/* ── retrieval: yesterday's lookup, verbatim ── */
fresh();
let r = ask('tourbillon');
chk('plain lookup returns list rows', r.list && r.list.length > 0, JSON.stringify(r).slice(0, 120));
chk('lookup top hit is the Tourbillon page', r.list && r.list[0].u === '/hypercars/bugatti-tourbillon', r.list && r.list[0].u);
r = ask('chiron');
chk('QSHAPE preservation: "chiron" stays a list, Chiron first', r.list && /bugatti-chiron/.test(r.list[0].u), r.list && r.list[0].u);
r = ask('koenigsegg');
chk('marque token lookup still lists cars (old behaviour)', r.list && r.list.every(x => x.k === 'Hypercar'), JSON.stringify((r.list || []).slice(0, 2)));

/* ── librarian intents ── */
fresh();
r = ask('how fast is the tourbillon');
chk('intent speed', r.text && r.text.indexOf('277 mph') !== -1, r.text);
r = ask('tourbillon power');
chk('intent power', r.text && r.text.indexOf('1,775 hp') !== -1, r.text);
fresh();
r = ask('how much does the chiron weigh and how fast is it');
chk('multi-intent joins with \u00b7 (Chiron: kg + mph)', r.text && r.text.indexOf(' \u00b7 ') !== -1 && /1,996 kg/.test(r.text) && /mph/.test(r.text), r.text);
r = ask('and the tourbillon?');
chk('follow-up carry reuses last intent on the Tourbillon', r.text && r.text.indexOf('Bugatti Tourbillon') !== -1, r.text);
fresh();
ask('chiron power');
r = ask('how heavy is it');
chk('pronoun memory: "it" \u2192 the Chiron, weight fact', r.text && r.text.indexOf('Bugatti Chiron') !== -1 && /1,996 kg/.test(r.text), r.text);
fresh();
r = ask('touribllon speed');
chk('typo forgiveness: touribllon \u2192 tourbillon', r.text && r.text.indexOf('277 mph') !== -1, r.text);

/* ── compares ── */
fresh();
r = ask('chiron vs jesko');
chk('two-way compare names both and a winner word', r.text && r.text.indexOf(ch.n) !== -1 && r.text.indexOf(jk.n) !== -1 && /more powerful|faster|quicker/.test(r.text), r.text);
r = ask('is the jesko faster than the chiron');
const yesJk = jk.mph > ch.mph;
chk('yes/no comparative verdict is data-true', r.text && r.text.indexOf(yesJk ? 'Yes' : 'No') === 0, r.text);
r = ask('is the nevera quicker than the plaid');
const nev = D.cars.find(c => c.s === 'rimac-nevera'), plaid = D.cars.find(c => c.s === 'tesla-model-s-plaid');
chk('inverted dim: quicker means LOWER 0\u201360', r.text && r.text.indexOf(nev.z60 < plaid.z60 ? 'Yes' : 'No') === 0, r.text + ` [nev ${nev.z60} plaid ${plaid.z60}]`);
r = ask('veyron vs chiron vs tourbillon');
chk('N-way compare medals three Bugattis', r.text && r.text.indexOf('\uD83E\uDD47') !== -1 && r.text.split('\u00b7').length >= 3, r.text);

/* ── counts, aggregates, top-N, superlatives ── */
fresh();
r = ask('how many cars are on the site');
chk('count cars = ' + D.cars.length, r.text && r.text.indexOf(String(D.cars.length)) === 0, r.text);
r = ask('how many pages');
chk('count pages = ' + D.pages, r.text && r.text.indexOf(String(D.pages)) !== -1, r.text);
r = ask('how many evs');
chk('count EVs by engine = ' + evs.length, r.text && r.text.indexOf(String(evs.length)) === 0, r.text);
r = ask('how many bugattis');
chk('marque count = ' + bugattis.length, r.text && r.text.indexOf(String(bugattis.length)) === 0, r.text);
r = ask('how many marques');
chk('marque total = ' + D.marques.length, r.text && r.text.indexOf(String(D.marques.length)) === 0, r.text);
r = ask('average power of the cars');
const avgFmt = (Math.round(avgHp * 10) / 10).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
chk('average keeps its honest decimal, harness-checked', r.text && r.text.indexOf(avgFmt) !== -1, r.text + ' [expect ' + avgFmt + ']');
r = ask('top 5 cars by power');
chk('top-5 medals lead with ' + mostPow.n, r.text && r.text.indexOf('\uD83E\uDD47 ' + mostPow.n) !== -1, r.text);
r = ask('top 3 by speed');
chk('top-3 by speed leads with ' + fastest.n, r.text && r.text.indexOf('\uD83E\uDD47 ' + fastest.n) !== -1, r.text);
r = ask('fastest ferrari');
chk('marque-scoped superlative = ' + fastFerrari.n, r.text && r.text.indexOf(fastFerrari.n) !== -1, r.text);
r = ask('lightest car');
chk('lightest (asc dim) = ' + lightest.n, r.text && r.text.indexOf(lightest.n) !== -1, r.text);
r = ask('most powerful v12');
chk('engine-scoped superlative = ' + powV12.n, r.text && r.text.indexOf(powV12.n) !== -1, r.text);
r = ask('quickest ev');
chk('class+inverted superlative = ' + quickEV.n, r.text && r.text.indexOf(quickEV.n) !== -1, r.text);
r = ask('most powerful car in production');
chk('status-anchored superlative = ' + powInProd.n, r.text && r.text.indexOf(powInProd.n) !== -1, r.text);
r = ask('fastest lithuanian car');
chk('unknown filter word gets the honest guard, never a wrong champion', r.text && /Honest answer/.test(r.text) && /lithuanian/.test(r.text), r.text);
r = ask('most powerful car ever');
chk('CANARY: generic words never trip the guard \u2014 champ = ' + mostPow.n, r.text && r.text.indexOf(mostPow.n) !== -1, r.text);
r = ask('fastest danish ev');
chk('true empty filter (Danish EVs) answers honestly', r.text && /Honest answer/.test(r.text), r.text);

/* ── calc ── */
fresh();
r = ask('1500 ps in hp');
chk('PS\u2192hp conversion \u2248 1479.5', r.text && /1,479|1,480/.test(r.text), r.text);
r = ask('300 mph in km/h');
chk('mph\u2192km/h \u00d71.60934', r.text && /482\.8|483/.test(r.text), r.text);
r = ask('power to weight of the jesko');
const p2w = Math.round(jk.hp / (jk.kg / 1000));
chk('power-to-weight harness-checked = ' + p2w, r.text && r.text.indexOf(String(p2w).replace(/\B(?=(\d{3})+(?!\d))/g, ',')) !== -1, r.text);
r = ask('power to weight of the gemera');
chk('honest miss when kerb weight is 0', r.text && /Honest answer/.test(r.text) && /kg \u00f7 1000/.test(r.text), r.text);
r = ask('how old is the mclaren f1');
const f1 = D.cars.find(c => c.s === 'mclaren-f1');
chk('age math vs today = ' + (new Date().getFullYear() - f1.y), r.text && r.text.indexOf(String(new Date().getFullYear() - f1.y) + ' years ago') !== -1, r.text);
r = ask('how many g is the nevera 0-60');
chk('0\u201360 g derivation shows the formula', r.text && /9\.80665/.test(r.text) && /g held/.test(r.text), r.text);

/* ── draw ── */
fresh();
r = ask('chart the cars by speed');
chk('chart returns svg', !!r.svg && /<svg/.test(r.svg), (r.svg || '').slice(0, 60));
chk('chart background is opaque Nocturne #171210', r.svg && r.svg.indexOf('fill="#171210"') !== -1, (r.svg || '').slice(0, 200));

/* ── quiz mode: answered correctly from the data ── */
fresh();
r = ask('quiz me');
chk('quiz starts in mode', HC.state.mode && HC.state.mode.owner === 'quiz' && /Quiz 1/.test(r.text), r.text);
let m = /which is .+?, (.+?) or (.+?)\?/.exec(r.text);
chk('quiz question parses', !!m, r.text);
if (m) {
  const A = D.cars.find(c => c.n === m[1]), B = D.cars.find(c => c.n === m[2]);
  const dd = /more powerful/.test(r.text) ? ['hp', 0] : /faster/.test(r.text) ? ['mph', 0] : ['z60', 1];
  const win = (A[dd[0]] < B[dd[0]]) === !!dd[1] ? A : B;
  r = ask(win.n);
  chk('correct answer scores the streak', /Correct \u2713/.test(r.text) && /streak 1/.test(r.text), r.text);
}
r = ask('stop');
chk('quiz stops with the score, mode cleared', /Quiz over/.test(r.text) && !HC.state.mode, r.text);

/* ── tour mode: consume + RELEASE ── */
fresh();
r = ask('tour the extremes');
chk('tour starts at stop 1 with the live champion ' + mostPow.n, /1\/4/.test(r.text) && r.text.indexOf(mostPow.n) !== -1 && HC.state.mode && HC.state.mode.owner === 'tour', r.text);
r = ask('tourbillon power');
chk('mid-tour question RELEASES to the librarian', r.text && r.text.indexOf('1,775 hp') !== -1 && HC.state.mode, r.text);
r = ask('next');
chk('tour resumes at stop 2 with ' + fastest.n, /2\/4/.test(r.text) && r.text.indexOf(fastest.n) !== -1, r.text);
ask('next'); r = ask('next');
chk('final stop clears the mode', /4\/4/.test(r.text) && !HC.state.mode, r.text + ' mode=' + (HC.state.mode && HC.state.mode.owner));
fresh();
r = ask("what's new");
chk('what\u2019s new computes the newest: ' + newest3[0], r.text && r.text.indexOf(newest3[0]) !== -1, r.text);
r = ask('surprise me');
chk('surprise returns one car with a link', r.links && r.links.length === 1 && /Picked at random/.test(r.text), r.text);

/* ── recall ── */
fresh();
ask('tourbillon power'); ask('chiron vs jesko');
r = ask('what did i ask');
chk('session recall reads history back', r.text && r.text.indexOf('tourbillon power') !== -1, r.text);

/* ── voice + canaries + the floor ── */
fresh();
r = ask('ok');
chk('anchored bank: bare "ok"', r.text && /surprise me/.test(r.text), r.text);
r = ask('ok what is the fastest car');
chk('CANARY: "ok" must not hijack a real question', r.text && r.text.indexOf(fastest.n) !== -1, r.text);
r = ask('no');
chk('PARITY: bare "no" still lists rows exactly as yesterday', !!r.list, JSON.stringify(r).slice(0, 90));
r = ask('nah');
chk('anchored bank: "nah"', r.text && /Counter-offer/.test(r.text), r.text);
r = ask('are you chatgpt');
chk('identity: no model, no cloud', r.text && /No model, no cloud/.test(r.text), r.text);
r = ask('how are you');
chk('live status line computes its numbers', r.text && r.text.indexOf(String(D.cars.length)) !== -1 && r.text.indexOf(String(D.pages)) !== -1, r.text);
r = ask('help');
chk('help teaches real capabilities', r.text && /quiz me/.test(r.text) && /vs/.test(r.text), r.text);
r = ask('do you track me');
chk('privacy: architecture is the policy', r.text && /no servers/i.test(r.text), r.text);
r = ask('qwzxv blorp');
chk('gibberish still gets the honest floor', r.text && r.text.indexOf(HC.DONTKNOW) === 0, r.text);
r = ask('tourbllion');
chk('the ears fix an entity typo into working rows, Tourbillon first', !!r.list && /bugatti-tourbillon/.test(r.list[0].u), JSON.stringify((r.list || [])[0]));
r = ask('what is the meaning of life');
chk('off-board question floors honestly', r.text && r.text.indexOf('Honest answer') === 0, r.text);

console.log('\u2500'.repeat(46));
if (FAIL) { console.log(`GATE: ${N - FAIL}/${N} \u2014 ${FAIL} FAILING`); process.exit(1); }
console.log(`GATE: ${N}/${N} trials green \u2014 the brain ships.`);

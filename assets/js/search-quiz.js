/* hypercars.fyi - SEARCH FACULTY: QUIZ - the game (pri 30).
   "quiz me" starts a mode: questions generated from HC_DATA at ask-time,
   never authored. Which-is comparisons use power, speed or 0–60 (where
   QUICKER means the LOWER number), year questions ask about debuts with
   ±2 years close enough. Streaks tracked in-session; "stop" ends it. */
'use strict';
(function () {
  var S = window.HC; if (!S) return;
  var U = S.u;
  var QDIMS = [
    { d: 'hp',  word: 'more powerful', lowWins: 0 },
    { d: 'mph', word: 'faster',        lowWins: 0 },
    { d: 'z60', word: 'quicker to 60', lowWins: 1 }
  ];
  function sample(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function genQ(n, streak) {
    var typeA = n % 2 === 1;
    if (typeA) {
      var dd = sample(QDIMS);
      var pool = S.DATA.cars.filter(function (c) { return c[dd.d]; });
      var A = sample(pool), B = A;
      while (B.n === A.n) B = sample(pool);
      return { kind: 'ab', dd: dd, A: A, B: B,
        text: 'Quiz ' + n + (streak ? ' (streak ' + streak + ')' : '') + ': which is ' + dd.word + ', ' + A.n + ' or ' + B.n + '?' };
    }
    var pool2 = S.DATA.cars.filter(function (c) { return c.y; });
    var pick = sample(pool2);
    return { kind: 'year', A: pick,
      text: 'Quiz ' + n + (streak ? ' (streak ' + streak + ')' : '') + ': what year did the ' + pick.n + ' debut?' };
  }
  function reveal(cur) {
    if (cur.kind === 'ab') {
      var d = cur.dd.d, u = U.DIMS[d].unit;
      var win = (cur.A[d] < cur.B[d]) === !!cur.dd.lowWins ? cur.A : cur.B;
      var lose = win === cur.A ? cur.B : cur.A;
      var fv = function (c) { return d === 'z60' ? c[d].toFixed(2) : U.fnum(c[d]); };
      return win.n + ' ' + fv(win) + u + ' vs ' + lose.n + ' ' + fv(lose) + u;
    }
    return 'the ' + cur.A.n + ' debuted in ' + cur.A.y;
  }
  function step(st, verdict) {
    st.n++; st.cur = genQ(st.n, st.streak);
    return { text: verdict + ' Next, ' + st.cur.text, links: [], note: 'quiz generated from the data, say stop to end' };
  }
  S.register({ name: 'quiz', pri: 30, try: function (q) {
    if (!S.DATA) return null;
    if (!/^\s*quiz(\s+me)?\s*[!?.]*\s*$/i.test(q)) return null;
    var st = { n: 1, streak: 0, best: 0 };
    st.cur = genQ(1, 0);
    S.state.mode = { owner: 'quiz', fn: function (ans) {
      if (/^\s*(stop|exit|quit|enough|end)\b/i.test(ans)) {
        var out = { text: 'Quiz over, best streak ' + st.best + '. Every answer came straight off the data.', links: S.HUBS.slice(0, 2), note: 'quiz generated from the data' };
        S.state.mode = null;
        return out;
      }
      var cur = st.cur;
      if (cur.kind === 'ab') {
        var atk = U.tok(ans);   /* tokenise the answer too: "sf90" must match the SF90 */
        var aHit = U.tok(cur.A.n).some(function (t) { return atk.indexOf(t) !== -1; });
        var bHit = U.tok(cur.B.n).some(function (t) { return atk.indexOf(t) !== -1; });
        if (aHit === bHit) return { text: 'Name one of the two, ' + cur.A.n + ' or ' + cur.B.n + '? (Or say stop.)', links: [], note: 'quiz generated from the data' };
        var d = cur.dd.d;
        var aWins = (cur.A[d] < cur.B[d]) === !!cur.dd.lowWins;
        var correct = aWins === aHit;
        if (correct) { st.streak++; if (st.streak > st.best) st.best = st.streak; return step(st, 'Correct \u2713, ' + reveal(cur) + '.'); }
        st.streak = 0;
        return step(st, 'Not this time, ' + reveal(cur) + '.');
      }
      var ym = /(19|20)\d\d/.exec(ans);
      if (!ym) return { text: 'Give me a year, or say stop.', links: [], note: 'quiz generated from the data' };
      var gy = parseInt(ym[0], 10), dy = Math.abs(gy - cur.A.y);
      if (dy === 0) { st.streak++; if (st.streak > st.best) st.best = st.streak; return step(st, 'Correct \u2713, ' + reveal(cur) + '.'); }
      if (dy <= 2) { st.streak++; if (st.streak > st.best) st.best = st.streak; return step(st, 'Close enough \u2713, ' + reveal(cur) + '.'); }
      st.streak = 0;
      return step(st, 'Not this time, ' + reveal(cur) + '.');
    } };
    return { text: 'Quiz mode, questions generated from the data, streaks counted, no mercy. ' + st.cur.text, links: [], note: 'quiz generated from the data, say stop to end' };
  } });
})();

/* hypercars.fyi - SEARCH FACULTY: LANG - the ears.
   Prehooks on every question: pronoun memory ("it" → the last car) and typo
   forgiveness over a CURATED vocabulary - car and marque name tokens plus
   intent and trigger words only, never the index soup. THE LAW: every word a
   voice bank's regex depends on must be protected here, or the ears eat it
   before the voice hears it. */
'use strict';
(function () {
  var S = window.HC; if (!S) return;
  var VOCAB = (function () {
    var v = {};
    S.u.ENT.forEach(function (x) { x.toks.forEach(function (w) { v[w] = 1; }); });
    if (S.DATA) S.DATA.marques.forEach(function (m) { S.u.tok(m.n).forEach(function (w) { v[w] = 1; }); });
    ['power','powerful','horsepower','fastest','faster','fast','quickest','quicker','slowest','speed',
     'weight','weigh','lightest','lighter','heaviest','heavier','kerb','price','cost','expensive','cheapest',
     'debut','year','production','retired','limited','prototype','classic','sold','units','built',
     'electric','hybrid','engine','cylinder','compare','versus','than','chart','graph','quiz','tour',
     'surprise','random','next','stop','history','trail','visit','average','total','combined','marque',
     'brand','manufacturer','country','german','germany','italian','italy','american','america','british',
     'britain','swedish','sweden','croatian','croatia','french','france','japanese','japan','chinese',
     'china','danish','denmark','czech','austrian','tonne','ratio','miles','pounds','feet','newest',
     'oldest','still','active','help','pages','cars','hypercars','supercars','sedans','track',
     'most','what','when','where','which','does','much','many','ever','best','that','then','they',
     'them','some','more','less','only','into','over','after','before','since','show','rank','list',
     'ranking','rankings','sort','slow','world','today','extreme','extremes','legend','legends','electrics','next',
     /* the voice's own trigger words - protected forever */
     'thanks','thank','cheers','mate','privacy','cookies','cookie','tracking','contact','about','menu',
     'search','home','wrong','sure','really','model','robot','human','alive','real','smart','learn',
     'update','remember','made','runs','owns','created','wrote','site','this','love','marry','suck',
     'dumb','stupid','useless','bored','funny','goodbye','later','wassup','maybe','dunno'
    ].forEach(function (w) { v[w] = 1; });
    return Object.keys(v);
  })();
  S.prehook(function (q) {
    if (S.state.lastEnt && /\b(it|its|that one|this one)\b/i.test(q)) q = q.replace(/\b(?:it|its|that one|this one)\b/gi, S.state.lastEnt.n);
    return q;
  });
  S.prehook(function (q) {
    var changed = false;
    var out = q.split(/(\s+)/).map(function (p) {
      var w = p.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (w.length < 4 || /^[0-9.]+$/.test(w) || VOCAB.indexOf(w) !== -1) return p;
      var cap = w.length <= 5 ? 1 : 2, best = null, bd = cap + 1;
      for (var i = 0; i < VOCAB.length; i++) {
        var c = VOCAB[i];
        if (c.length < 4 || Math.abs(c.length - w.length) > cap) continue;
        var d = S.u.edist(w, c, cap);
        if (d < bd) { bd = d; best = c; if (d === 1) break; }
      }
      if (best) { changed = true; return p.toLowerCase().replace(w, best); }
      return p;
    }).join('');
    return changed ? out : q;
  });
  S.u.fuzzyEnt = function (q) {
    var qts = S.u.tok(q), best = null, bd = 3;
    for (var i = 0; i < S.u.ENT.length; i++) {
      var x = S.u.ENT[i];
      for (var j = 0; j < qts.length; j++) for (var k = 0; k < x.toks.length; k++) {
        if (x.toks[k].length < 4) continue;
        var d = S.u.edist(qts[j], x.toks[k], 2);
        if (d < bd) { bd = d; best = x; }
      }
    }
    return best;
  };
})();

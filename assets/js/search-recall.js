/* hypercars.fyi - SEARCH FACULTY: RECALL - session memory (pri 50).
   "what did I ask" → this session's questions. "where was I" → the local
   page trail + visit count - all kept in this browser only; the site has
   no servers to tell. */
'use strict';
(function () {
  var S = window.HC; if (!S) return;
  var U = S.u;
  S.register({ name: 'recall', pri: 50, try: function (q) {
    var ql = q.toLowerCase();
    if (/what (?:did|have) i ask|my (?:questions|history)|^\s*history\s*[?!.]*\s*$/.test(ql)) {
      var h = S.state.hist.slice(0, -1).slice(-6);
      if (!h.length) return { text: 'Nothing yet this session, this question is your first. The list stays in this tab and dies with it.', links: [], note: 'session memory, kept in this tab only' };
      return { text: 'This session, most recent last: \u201C' + h.join('\u201D \u00b7 \u201C') + '\u201D. Kept in this tab only, forgotten the moment you leave.', links: [], note: 'session memory, kept in this tab only' };
    }
    if (/where was i|continue (?:reading|where)|my trail|last visit|welcome back|visit count/.test(ql)) {
      var trail = [], visits = 0;
      try {
        trail = JSON.parse(localStorage.getItem('hcTrail') || '[]');
        visits = parseInt(localStorage.getItem('hcVisits') || '0', 10) || 0;
      } catch (err) { /* no storage: honest fallback below */ }
      if (!trail.length) return { text: 'No trail yet, wander a few pages and ask again. The trail lives in this browser only; the site has no servers to tell.', links: S.HUBS.slice(0, 2), note: 'kept in this browser only, zero servers' };
      var recent = trail.slice(0, 4);
      return { text: 'Visit \u2116' + visits + ' by this browser\u2019s own count. Your trail, freshest first: ' + recent.map(function (x) { return x.t; }).join(' \u00b7 ') + ', all kept locally; nothing leaves this machine.', links: recent.slice(0, 3).map(function (x) { return U.linkOf(x.u, x.t); }), note: 'kept in this browser only, zero servers' };
    }
    return null;
  } });
})();

/* hypercars.fyi - SEARCH FACULTY: VOICE - the house voice + the floor (pri 5 + 99).
   The search has no name and no persona: these banks answer small talk,
   identity and site-concierge questions in the site's own neutral voice,
   each answer teaching a real capability. Anchors are law: short words like
   "ok" and "no" are pinned ^…$ so they never hijack real questions. Every
   trigger word here is protected in the lang vocabulary. The honest floor
   answers last at pri 99 with a fuzzy "did you mean". */
'use strict';
(function () {
  var S = window.HC; if (!S) return;
  var U = S.u;
  function L(u, t) { return U.linkOf(u, t); }
  var BANKS = [
    { re: /^\s*(hi|hey|hello|yo|hiya|howdy)\s*[?!.]*\s*$/i,
      t: 'Hello. Ask anything the data can answer, a car by name, \u201Cchiron vs jesko\u201D, \u201Ctop 5 by power\u201D, \u201Cquiz me\u201D.',
      links: function () { return S.HUBS.slice(0, 2); } },
    { re: /^\s*(hi|hey|hello|yo)?[\s,!]*how('?s| a)?re?\s+(you|things|it going|life)\b/i,
      fn: function () { return { text: 'All systems live: ' + S.DATA.cars.length + ' cars indexed, ' + S.DATA.pages + ' pages, ' + S.faculties.length + ' faculties answering, zero servers involved. Ask anything, or say \u201Csurprise me\u201D.', links: S.HUBS.slice(0, 2) }; } },
    { re: /^\s*(what'?s up|wassup|whats up|sup)\s*[?!.]*\s*$/i,
      fn: function () { return { text: 'Holding ' + S.DATA.pages + ' pages in working memory and waiting for a question. Try \u201Cfastest car in production\u201D, or \u201Cchart the cars by speed\u201D.', links: S.HUBS.slice(0, 1) }; } },
    { re: /^\s*(thanks|thank you|thx|ty|cheers)\s*[?!.]*\s*$/i,
      t: 'Any time. Everything here is retrieved or computed from the site\u2019s own data, ask the next one whenever.' },
    { re: /^\s*(bye|goodbye|good\s?night|see (you|ya)( later)?|later|cya|farewell)\s*[?!.]*\s*$/i,
      t: 'Safe travels, the data keeps. Everything you asked stays in this tab and leaves with you.' },
    { re: /^\s*(ok(ay)?|cool|nice|wow|amazing|awesome|great|brilliant|neat|sick|fire)\s*[?!.]*\s*$/i,
      t: 'Agreed. If that one landed, \u201Csurprise me\u201D pulls another, or \u201Ctop 5 by power\u201D ranks the podium.',
      links: function () { return S.HUBS.slice(0, 1); } },
    { re: /^\s*yes+\s*[?!.]*\s*$/i,
      t: 'Noted, though I need a question to pin it to. Say \u201Cquiz me\u201D and the yeses start counting toward a streak.' },
    { re: /^\s*(no+|nope|nah)\s*[?!.]*\s*$/i,
      t: 'Fair. Counter-offer: \u201Csurprise me\u201D, one random car from the boards, no commitment.' },
    { re: /^\s*(maybe|perhaps|dunno|idk|not sure|hmm+)\s*[?!.]*\s*$/i,
      t: 'Start anywhere: a car by name (\u201CTourbillon\u201D), a question (\u201Cquickest EV?\u201D), or a mood (\u201Csurprise me\u201D).' },
    { re: /(are you|r u)\s+(chatgpt|gpt|claude|gemini|an? ai|a bot|a robot|an? llm|a person|human|alive|real|conscious)|what (model|llm|ai) (is this|are you)|do you use (ai|a model|an llm)/i,
      t: 'No model, no cloud, this search is a handful of small JavaScript files running in your tab, answering only from this site\u2019s own data. Nothing is generated; everything is retrieved or derived, and every computed answer shows its working.' },
    { re: /^\s*are you smart\s*[?!.]*\s*$/i,
      fn: function () { return { text: 'Exactly as smart as the data: ' + S.DATA.cars.length + ' cars, every figure sourced, and the discipline to say \u201Cthat\u2019s not in the data\u201D when it isn\u2019t.', links: S.HUBS.slice(0, 1) }; } },
    { re: /privacy|cookies?\b|tracking|do you (track|spy)/i,
      t: 'The architecture is the policy: no servers, no analytics in this search, nothing sent anywhere. Questions are answered in your tab and forgotten when you close it; the reading trail some answers use lives only in this browser.' },
    { re: /^\s*do you (learn|improve|get smarter|update)\s*[?!.]*\s*$/i,
      t: 'No, and that is a feature. The search changes only when the site\u2019s data changes, at build time, in public. No drift, no surprises.' },
    { re: /do you (remember|know) me|remember me\?/i,
      t: 'Only what this browser keeps locally: a page trail and a visit count. Ask \u201Cwhere was I\u201D and it reads back. Nothing leaves this machine, there are no servers to send it to.' },
    { re: /^\s*((that'?s|you('?| a)re) )?wrong[\s?!.]*$/i,
      t: 'Then it should be fixed, every figure here traces to a manufacturer or verified source on its car\u2019s page. Check the page\u2019s spec table and its source line; if it still looks off, the site\u2019s contact is in the footer.' },
    { re: /^\s*(are you sure|really|no way|seriously|for real|prove it)\s*[?!.]*\s*$/i,
      t: 'As sure as the source line: every figure on a car page carries where it came from. Ask for the number again and follow the link, the page shows its working.' },
    { re: /^\s*(help|what can you do|what do you know|commands?|options?)\s*[?!.]*\s*$/i,
      t: 'Anything the data holds: name a car for its page \u00b7 \u201Chow fast is the Tourbillon\u201D \u00b7 \u201Cchiron vs jesko\u201D \u00b7 \u201Ctop 5 by power\u201D \u00b7 \u201Cfastest EV in production\u201D \u00b7 \u201Cchart the cars by speed\u201D \u00b7 \u201Cpower to weight of the Jesko\u201D \u00b7 \u201Cquiz me\u201D \u00b7 \u201Ctour the extremes\u201D \u00b7 \u201Csurprise me\u201D.',
      links: function () { return S.HUBS; } },
    { re: /who (made|built|created|wrote|runs|owns) (this|the site|you)/i,
      t: 'The site\u2019s author, hypercars.fyi is part of the .fyi reference family: finite catalogues, sourced specs, original drawings. The search is part of the site, built from the same data as the pages.' },
    { re: /^\s*(menu|contact|home|sitemap|about)\s*[?!.]*\s*$/i,
      fn: function () { return { text: 'The main rooms are one tap away, or just name any car, marque or ranking.', links: S.HUBS }; } },
    { re: /^\s*(i (love|like) you|you('?| a)re (the best|great|amazing|awesome)|marry me)\s*[?!.]*\s*$/i,
      t: 'That is the data you love, this search just reads it fast. Say \u201Cquiz me\u201D if you want the feeling to last.' },
    { re: /^\s*(you (suck|stink)|you('?| a)re (dumb|stupid|useless|rubbish|bad)|i hate you|trash)\s*[?!.]*\s*$/i,
      t: 'A fair verdict for a few kilobytes of JavaScript. But test it properly first: \u201Cveyron vs chiron vs tourbillon\u201D, three-way, medals, ratio. Then judge.' },
    { re: /^\s*(i'?m )?bored\s*[?!.]*\s*$/i,
      t: 'Two cures on hand: \u201Cquiz me\u201D for streaks, or \u201Ctour the extremes\u201D for the four champions, picked from the data live.' }
  ];
  S.register({ name: 'voice', pri: 5, try: function (q) {
    for (var i = 0; i < BANKS.length; i++) {
      var b = BANKS[i];
      if (!b.re.test(q)) continue;
      if (b.skip && b.skip.test(q)) continue;
      if (b.fn) return b.fn(q);
      return { text: b.t, links: b.links ? b.links() : [] };
    }
    return null;
  } });
  /* ── the honest floor - pri 99, never disappears ── */
  S.register({ name: 'floor', pri: 99, try: function (q) {
    var qt = U.tok(q);
    if (!qt.length) return null;
    var near = U.fuzzyEnt ? U.fuzzyEnt(q) : null;
    if (near) {
      return { text: S.DONTKNOW + ' Did you mean ' + near.e.n + '?', links: [U.linkOf(near.e.u, near.e.n)].concat(S.HUBS.slice(0, 2)) };
    }
    return { text: S.DONTKNOW, links: S.HUBS };
  } });
})();

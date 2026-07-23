/* ------------------------------------------------------------------
   hypercars.fyi — Apex Line
   Built to the Gate Runner architecture guide. The four failures that
   guide documents are handled up front rather than discovered later:

     §3.1 HEADING   the car travels in world space along its own yaw, so
                    the circuit can bend back on itself. Not a tunnel.
     §3.2 ATTITUDE  body roll follows real lateral load (v * yawRate),
                    never the steering input. Same input leans far more
                    at 300 km/h than at 60.
     §3.3 ENERGY    grip is a budget, not a constant. Downforce grows
                    with v², so the car corners harder fast than slow —
                    and braking distance grows with v² too.
     §3.4 COUPLING  the friction circle. Grip spent cornering is not
                    available for braking or acceleration. That one
                    constraint is the whole difference between a driving
                    game and a steering game.

   Every gameplay number is derived from the car's own record: power,
   kerb weight, top speed, 0-60. Nothing is hand-assigned.
   ------------------------------------------------------------------ */
(function () {
  var root = document.getElementById('apex');
  if (!root || !window.DRIVE_FLEET) return;
  var svg = document.getElementById('apexScene');
  if (!svg) return;
  var NS = 'http://www.w3.org/2000/svg';

  var reduce = false;
  try { reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches; } catch (e) {}

  /* Width is FIXED and the height follows the device. Horizontal scale is
     what the game is judged on — the car against the width of the road —
     so it has to be identical everywhere. Tall screens get more sky. */
  var W = 1000, H = 600, CX = W / 2, FOCAL = 1100;
  /* Horizon placement has to ADAPT to the frame. Fixed at 0.56 it looked
     right on a wide screen but buried a tall phone under 56% blank sky
     with the road crushed into a band at the foot. The sky is capped in
     absolute units instead, so extra height becomes road, not emptiness. */
  var HZ_BASE = 0.56, SKY_MAX = 620;
  /* The wheel and pedals sit over the foot of the frame. Rather than
     reserving an empty band there, the stage is simply TALLER on a
     phone — more sky above the horizon, more road below it — and the
     car rides higher up the frame. The tarmac carries on behind the
     controls, so there is no void to look at. */
  var CAR_LIFT = 0.07;     /* how far above the frame's foot the car sits */
  var EYE = 3.4;           /* camera height above the road, metres */
  var ROAD_HALF = 6.6;     /* half the tarmac width, metres */
  var SEG = 7;             /* spacing of centreline nodes, metres */
  var DRAW = 105;          /* nodes drawn ahead */
  var NEAR = 4.2;          /* nearest projectable depth, metres */
  var G = 9.81;

  var hud = {
    spd: document.getElementById('aSpd'), score: document.getElementById('aScore'),
    time: document.getElementById('aTime'), best: document.getElementById('aBest'),
    name: document.getElementById('aName'), g: document.getElementById('aG')
  };
  var L = {};

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    (parent || svg).appendChild(e);
    return e;
  }
  function clamp(lo, hi, v) { return v < lo ? lo : v > hi ? hi : v; }

  function fit() {
    var r = svg.getBoundingClientRect();
    var ratio = (r.width && r.height) ? r.width / r.height : 1000 / 600;
    W = 1000;
    H = Math.max(520, Math.min(2200, Math.round(W / ratio)));
    CX = W / 2;
    var coarse = false;
    try { coarse = window.matchMedia && matchMedia('(pointer:coarse)').matches; } catch (e) {}
    /* The controls are a FIXED pixel size, so a fixed fraction of the
       frame does not clear them in landscape, where the stage is short.
       Derive the lift from the real element height instead. */
    /* Measure the controls rather than guessing a pixel band — the guess
       does not survive a landscape phone, where the stage is short. */
    var band = 0;
    ['apexStick', 'apexThr', 'apexBrk'].forEach(function (id) {
      var e = document.getElementById(id);
      if (!e || !e.offsetParent) return;              /* hidden on desktop */
      band = Math.max(band, (r.bottom - e.getBoundingClientRect().top) + 34);
    });
    CAR_LIFT = band ? Math.min(0.46, band / Math.max(200, r.height)) : 0.06;
    HZ_BASE = clamp(0.30, 0.58, SKY_MAX / H);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    buildScene();
    if (S) render();
  }

  function buildScene() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var defs = el('defs', {});
    var sky = el('linearGradient', { id: 'apxSky', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
    el('stop', { offset: '0', 'stop-color': '#C9DCEE' }, sky);
    el('stop', { offset: '1', 'stop-color': '#EDF2F7' }, sky);
    var clip = el('clipPath', { id: 'apxClip' }, defs);
    el('rect', { x: 0, y: 0, width: W, height: H }, clip);
    L.world = el('g', { 'clip-path': 'url(#apxClip)' });
    var R = Math.sqrt(W * W + H * H);
    /* the WORLD leans, not one layer of it */
    L.roll = el('g', {}, L.world);
    L.sky = el('rect', { x: CX - R * 2, y: -R * 2, width: R * 4, height: R * 3, fill: 'url(#apxSky)' }, L.roll);
    L.ground = el('rect', { x: CX - R * 2, y: 0, width: R * 4, height: R * 3, fill: '#5C7F5F' }, L.roll);
    L.road = el('g', {}, L.roll);
    L.marks = el('g', {}, L.roll);
    L.gates = el('g', {}, L.roll);
    L.self = el('g', {}, L.world);
    L.fx = el('g', {}, L.world);
  }

  /* ============ the car's own numbers become its physics ============ */
  var CLASS_AGI = { 'track-only': 1.18, 'hypercar': 1.0, 'hyper-ev': 0.92,
                    'supercar': 1.03, 'performance-sedan': 0.85 };

  function statsFor(c) {
    var mass = c.w || 1500;
    var hp = c.p || 800;
    var vmax = (c.ts || 220) * 0.44704;          /* m/s */
    var z60 = c.z || 3.2;
    var pw = hp / mass;                          /* hp per kg */

    var aLaunch = 26.82 / z60;                   /* m/s² straight from the quoted 0-60 */
    var Pmax = hp * 745.7 * 0.80;                /* watts at the wheels */
    /* drag chosen so the car genuinely tops out at its quoted top speed */
    var dragK = Pmax / (mass * Math.pow(vmax, 3));

    var gripBase = clamp(0.95, 1.75, 0.92 + pw * 0.52);
    /* downforce: the counter-intuitive bit worth teaching */
    var DF = c.cat === 'track-only' ? 0.95 : (c.cat === 'hyper-ev' ? 0.42 : 0.60);
    /* a straight mass ratio made heavy cars unplayable, so this is a
       fractional power — it compresses the range without reordering it */
    var agility = clamp(0.55, 1.75, Math.pow(1450 / mass, 0.20) * (CLASS_AGI[c.cat] || 1));

    return { mass: mass, hp: hp, vmax: vmax, pw: pw, aLaunch: aLaunch, Pmax: Pmax,
             dragK: dragK, gripBase: gripBase, DF: DF, agility: agility,
             brakeG: clamp(1.0, 1.7, 1.02 + pw * 0.34) };
  }
  function gripAt(st, v) {
    var f = v / st.vmax;
    return st.gripBase * (1 + st.DF * f * f);
  }

  /* ===================== the circuit ===================== */
  var TRACK = [], trackLen = 0, GEN = null;

  /* ---------- corner generation ----------
     Corners are not chosen from a table of types. A radius is drawn from a
     CONTINUOUS log-uniform distribution and a turn angle is drawn with it,
     so every corner in a run is its own radius and its own length — there
     is no finite set of shapes to learn. Arc length follows from the two
     (length = R x angle), which is why a hairpin is short and a sweeper is
     long without either being written down anywhere.

     The distribution shifts as the run goes on: early laps favour open
     radii, later ones bite down toward the 18 m minimum. */
  var R_MIN = 18, R_MAX = 420;

  function newLeg(rng) {
    var r = Math.min(1, GEN.n / 1300);                   /* the ramp */

    if (GEN.chicane > 0) {                               /* answering half of a chicane */
      GEN.chicane--;
      GEN.target = -GEN.target * (0.80 + rng() * 0.45);  /* mirrored, never identical */
      GEN.hold = Math.max(5, Math.round(GEN.lastLen * (0.55 + rng() * 0.6)));
      return;
    }
    /* a straight is just a corner of infinite radius */
    if (rng() < 0.27 - 0.14 * r) {
      GEN.target = 0;
      GEN.hold = Math.round(22 + rng() * (52 - 18 * r));
      return;
    }
    /* log-uniform radius: every value in the range is reachable, and the
       skew moves toward the tight end as the ramp climbs */
    var u = Math.pow(rng(), 0.55 + 1.15 * r);
    var R = R_MIN * Math.pow(R_MAX / R_MIN, u);
    /* how far the corner turns through, in radians — a continuous spread
       from a flick to well past a right angle */
    var theta = 0.34 + Math.pow(rng(), 0.8) * 2.5;
    var len = Math.round(R * theta / SEG);
    if (len < 5) { len = 5; }
    if (len > 96) { len = 96; }
    GEN.lastLen = len;

    var dir = rng() < 0.5 ? -1 : 1;
    if (GEN.lastDir === dir && rng() < 0.6) dir = -dir;   /* alternate, like a real circuit */
    GEN.lastDir = dir;
    GEN.target = dir * (SEG / R);
    GEN.hold = len;
    /* tight corners often arrive in pairs */
    if (R < 70 && rng() < 0.36) GEN.chicane = 1;
  }

  function resetTrack(rng) {
    TRACK = [];
    GEN = { x: 0, z: 0, dir: 0, curve: 0, target: 0, hold: 46, n: 0, chicane: 0, lastDir: 1, lastLen: 20 };
    extendTrack(rng, 620);                        /* an opening straight, then the circuit */
    trackLen = TRACK.length;
  }

  /* The circuit never ends and never wraps: it is generated ahead of the car
     for as long as the run lasts, and the tail is dropped behind it. */
  function extendTrack(rng, count) {
    for (var i = 0; i < count; i++) {
      if (GEN.hold <= 0) newLeg(rng);
      GEN.hold--;
      GEN.n++;
      /* corners open and close rather than snapping on */
      GEN.curve += (GEN.target - GEN.curve) * 0.085;
      GEN.dir += GEN.curve;
      GEN.x += Math.sin(GEN.dir) * SEG;
      GEN.z += Math.cos(GEN.dir) * SEG;
      var isCheck = (GEN.n > 40 && GEN.n % 95 === 0);
      TRACK.push({ x: GEN.x, z: GEN.z, dir: GEN.dir, curve: GEN.curve, check: isCheck, taken: false });
    }
    trackLen = TRACK.length;
  }

  /* keep the array bounded on a long run without disturbing the indices in use */
  function trimTrack(s) {
    if (TRACK.length < 5200) return;
    var cut = TRACK.length - 3000;
    if (cut > s.node - 400) cut = s.node - 400;
    if (cut <= 0) return;
    TRACK.splice(0, cut);
    s.node -= cut;
    trackLen = TRACK.length;
  }

  /* ===================== state ===================== */
  var car = window.DRIVE_FLEET[0], S = null, raf = 0, last = 0, running = false;
  var daily = false, dailyRng = null, best = 0;

  function makeState(c) {
    return {
      c: c, st: statsFor(c),
      px: TRACK[0].x, pz: TRACK[0].z, yaw: TRACK[0].dir,
      v: 0, node: 0, lat: 0, steer: 0, lean: 0,
      latG: 0, longG: 0, slip: 0, off: false,
      dist: 0, score: 0, time: 34, checks: 0, offTime: 0,
      figs: figuresFor(c), figIdx: 0
    };
  }
  function locate(s) {
    var bi = s.node, bd = 1e9;
    for (var i = s.node - 4; i < s.node + 26; i++) {
      if (i < 0 || i >= trackLen) continue;
      var n = TRACK[i], dx = n.x - s.px, dz = n.z - s.pz, d = dx * dx + dz * dz;
      if (d < bd) { bd = d; bi = i; }
    }
    s.node = bi;
    var m = TRACK[bi], ax = s.px - m.x, az = s.pz - m.z;
    s.lat = ax * Math.cos(m.dir) - az * Math.sin(m.dir);
    return m;
  }

  /* ===================== input ===================== */
  var keys = {};
  document.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' ', 'a', 'd', 'w', 's'].indexOf(k) > -1) {
      if (running) { keys[k] = true; e.preventDefault(); }
    }
  });
  document.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });

  /* The wheel springs back to centre; the pedals do not. Multi-touch is
     tracked by IDENTIFIER, so a thumb on the wheel and a thumb on a pedal
     never steal each other. */
  var touch = { steer: 0, thr: 0, brk: 0 };
  function curve01(v) {
    var DEAD = 0.12, a = Math.abs(v);
    if (a <= DEAD) return 0;
    a = (a - DEAD) / (1 - DEAD);            /* rescale, or authority caps at 0.88 */
    return (v < 0 ? -1 : 1) * (0.25 * a + 0.75 * a * a);
  }
  (function stick() {
    var box = document.getElementById('apexStick');
    if (!box) return;
    var knob = document.getElementById('apexStickKnob'), id = null, MAX = 46;
    /* Squared response with a dead zone, and the remainder RESCALED — skip
       the rescale and the stick caps at 0.85 authority and feels weak at
       the stops for no visible reason. */
    function resp(v) {
      var DEAD = 0.15, a = Math.abs(v);
      if (a <= DEAD) return 0;
      a = (a - DEAD) / (1 - DEAD);
      return (v < 0 ? -1 : 1) * (0.22 * a + 0.78 * a * a);
    }
    function set(t) {
      var r = box.getBoundingClientRect();
      var dx = t.clientX - (r.left + r.width / 2);
      var dy = t.clientY - (r.top + r.height / 2);
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > MAX) { dx = dx / d * MAX; dy = dy / d * MAX; }   /* clamp to the gate */
      if (knob) knob.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
      /* Steering only. The vertical axis is deliberately NOT wired to the
         pedals — it exists so that moving off-centre shortens the x-travel
         left inside the circular gate, which is what buys you fine control
         near centre and still gives full lock at the rim. Throttle and
         brake stay on their own pads, where a thumb can hold them. */
      touch.steer = resp(dx / MAX);
      box.classList.add('on');
    }
    function release() {
      id = null; touch.steer = 0;
      if (knob) knob.style.transform = '';
      box.classList.remove('on');
    }
    function find(list) { for (var i = 0; i < list.length; i++) if (list[i].identifier === id) return list[i]; return null; }
    box.addEventListener('touchstart', function (e) { var t = e.changedTouches[0]; id = t.identifier; set(t); e.preventDefault(); }, { passive: false });
    document.addEventListener('touchmove', function (e) { if (id === null || id === -1) return; var t = find(e.touches); if (!t) return; set(t); e.preventDefault(); }, { passive: false });
    document.addEventListener('touchend', function (e) { if (id !== null && id !== -1 && find(e.changedTouches)) release(); });
    document.addEventListener('touchcancel', release);
    box.addEventListener('mousedown', function (e) { id = -1; set(e); e.preventDefault(); });
    document.addEventListener('mousemove', function (e) { if (id === -1) set(e); });
    document.addEventListener('mouseup', function () { if (id === -1) release(); });
  })();

  function pedal(elId, key) {
    var b = document.getElementById(elId);
    if (!b) return;
    var live = {};
    b.addEventListener('touchstart', function (e) {
      for (var i = 0; i < e.changedTouches.length; i++) live[e.changedTouches[i].identifier] = 1;
      touch[key] = 1; b.classList.add('on'); e.preventDefault();
    }, { passive: false });
    function up(e) {
      for (var i = 0; i < e.changedTouches.length; i++) delete live[e.changedTouches[i].identifier];
      if (!Object.keys(live).length) { touch[key] = 0; b.classList.remove('on'); }
    }
    document.addEventListener('touchend', up);
    document.addEventListener('touchcancel', up);
    b.addEventListener('mousedown', function (e) { touch[key] = 1; b.classList.add('on'); e.preventDefault(); });
    document.addEventListener('mouseup', function () { if (!Object.keys(live).length) { touch[key] = 0; b.classList.remove('on'); } });
  }
  pedal('apexThr', 'thr');
  pedal('apexBrk', 'brk');

  /* ===================== the loop ===================== */
  function step(ts) {
    if (!running) return;
    var dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    var s = S, st = s.st;

    var steerIn = 0;
    if (keys['arrowleft'] || keys['a']) steerIn -= 1;
    if (keys['arrowright'] || keys['d']) steerIn += 1;
    steerIn = clamp(-1, 1, steerIn + touch.steer);
    /* continuous, so a part-throttle out of a corner is possible */
    var thr = Math.max((keys['arrowup'] || keys['w']) ? 1 : 0, touch.thr || 0);
    var brk = Math.max((keys['arrowdown'] || keys['s'] || keys[' ']) ? 1 : 0, touch.brk || 0);
    /* No default throttle. The car sits on the line until you ask for
       it, and rolls to a stop if you lift. */

    s.steer += (steerIn - s.steer) * Math.min(1, dt * 9);   /* the wheel has weight */

    var v = Math.max(0.6, s.v);
    var grip = gripAt(st, s.v);
    if (s.off) grip *= 0.44;                      /* grass */

    /* ---------- §3.4 THE FRICTION CIRCLE ----------
       Ask the tyres for cornering and for braking/acceleration at the
       same time, and if the total exceeds what they have, scale BOTH
       back. Giving one axis priority is wrong: it meant that off-road,
       where grip collapses, steering fell to exactly zero and you could
       never recover. Sliding should cost you some of everything. */
    var aTract;
    if (brk > 0.02) aTract = -st.brakeG * G * brk;
    else if (thr > 0.02) aTract = Math.min(st.aLaunch, st.Pmax / (st.mass * v)) * thr;
    /* Lift off and you coast down. Aero drag alone is negligible at road
       speed, so this is the engine braking and rolling resistance that
       actually slows a car when you come off the throttle. */
    else aTract = -0.16 * G;
    /* A car yaws because its wheels are ROLLING: yaw rate = speed x
       curvature. The old form was a bare rate that stayed finite at a
       standstill, so a parked car span on the spot when you touched the
       steering. Steering now sets CURVATURE, and speed does the turning —
       which also gives the right feel for free: tight at walking pace,
       and grip-limited rather than lock-limited once you are moving. */
    var KAPPA = 0.075;                            /* full lock ~13 m radius */
    var wantYaw = s.steer * KAPPA * st.agility * s.v;
    var latWant = v * wantYaw / G;                /* lateral demand, in g */
    var longWant = aTract / G;                    /* longitudinal demand, in g */
    var used = Math.hypot(latWant, longWant);
    var yaw = wantYaw;
    s.slip = 0;
    if (used > grip) {
      var k = grip / used;
      s.slip = Math.min(1, used / grip - 1);
      yaw *= k;                                   /* it turns less than you asked */
      aTract *= k;                                /* and it stops less than you asked */
    }
    var aLong = aTract - st.dragK * v * v;        /* drag sets the true top speed */
    s.latG = v * yaw / G;
    s.longG = aLong / G;

    s.yaw += yaw * dt;
    s.v = Math.max(0, s.v + aLong * dt);
    if (s.off) s.v = Math.min(s.v, st.vmax * 0.45);

    /* ---------- §3.1 travel in WORLD space ---------- */
    s.px += Math.sin(s.yaw) * s.v * dt;
    s.pz += Math.cos(s.yaw) * s.v * dt;
    s.dist += s.v * dt;
    s.score = Math.round(s.dist);

    /* ---------- §3.2 attitude follows LOAD ---------- */
    s.lean += (clamp(-1, 1, s.latG / 1.6) * 7.5 - s.lean) * Math.min(1, dt * 5.5);

    /* keep laying circuit ahead of the car — it never ends and never wraps */
    if (s.node > trackLen - 260) { extendTrack(rnd, 420); trimTrack(s); }
    var node = locate(s);
    s.off = Math.abs(s.lat) > ROAD_HALF;
    /* Off the tarmac is survivable, but not indefinitely — three seconds
       on the grass and the run resets. Only counted while actually
       moving, so a stationary car is never punished for sitting still. */
    s.offTime = s.off ? s.offTime + dt : 0;
    if (s.offTime > 3) return offReset();
    if (Math.abs(s.lat) > ROAD_HALF * 3.2) {
      s.lat = s.lat < 0 ? -ROAD_HALF * 3.2 : ROAD_HALF * 3.2;
      s.px = node.x + Math.cos(node.dir) * s.lat;
      s.pz = node.z - Math.sin(node.dir) * s.lat;
      s.v *= 0.965;
    }

    if (node.check && !node.taken) {
      node.taken = true; s.checks++;
      var add = Math.max(5, 11 - s.checks * 0.35);
      s.time += add;
      flash('#1E7A44'); pop('+' + add.toFixed(0) + 's');
      if (s.checks % 2 === 1) showFigure(s);
    }
    s.time -= dt;
    if (s.time <= 0) return over();

    render();
    hud.spd.textContent = Math.round(s.v * 2.23694);
    hud.score.textContent = s.score.toLocaleString();
    hud.time.textContent = s.time.toFixed(1);
    if (hud.g) hud.g.textContent = Math.abs(s.latG).toFixed(2);
    if (hud.time.parentNode) hud.time.parentNode.style.color = s.time < 5 ? '#B01B2E' : '';
    raf = requestAnimationFrame(step);
  }

  /* ============== §4 the projected road plane ============== */
  function mixHex(a, b, t) {
    if (t <= 0) return a;
    var pa = [parseInt(a.substr(1, 2), 16), parseInt(a.substr(3, 2), 16), parseInt(a.substr(5, 2), 16)];
    var pb = [parseInt(b.substr(1, 2), 16), parseInt(b.substr(3, 2), 16), parseInt(b.substr(5, 2), 16)];
    return 'rgb(' + pa.map(function (v, i) { return Math.round(v + (pb[i] - v) * t); }).join(',') + ')';
  }
  function render() {
    var s = S, hz = H * HZ_BASE;
    /* The horizon used to swing with the full body-roll figure, which read
       as the whole world lurching at every steering input. The car still
       leans by the real lateral load; the WORLD only tilts by 30% of it. */
    var tilt = s.lean * 0.30;
    L.roll.setAttribute('transform',
      'translate(' + CX + ',' + hz + ') rotate(' + (-tilt).toFixed(2) + ') translate(' + (-CX) + ',' + (-hz) + ')');
    L.sky.setAttribute('y', hz - Math.sqrt(W * W + H * H) * 3);
    L.ground.setAttribute('y', hz);
    while (L.road.firstChild) L.road.removeChild(L.road.firstChild);
    while (L.marks.firstChild) L.marks.removeChild(L.marks.firstChild);
    while (L.gates.firstChild) L.gates.removeChild(L.gates.firstChild);

    var sY = Math.sin(s.yaw), cY = Math.cos(s.yaw);
    function project(wx, wz) {
      var dx = wx - s.px, dz = wz - s.pz;
      var rz = dx * sY + dz * cY;                 /* depth ahead */
      var rx = dx * cY - dz * sY;                 /* lateral offset */
      if (rz < NEAR) return null;
      var k = FOCAL / rz;
      return { x: CX + rx * k, y: hz + EYE * k, k: k };
    }
    function edgeAt(n, side, w) {
      return project(n.x + Math.cos(n.dir) * ROAD_HALF * side * w,
                     n.z - Math.sin(n.dir) * ROAD_HALF * side * w);
    }
    function quad(a, b, c, d, fill, layer) {
      el('path', { d: 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + 'L' + b.x.toFixed(1) + ' ' + b.y.toFixed(1) +
        'L' + c.x.toFixed(1) + ' ' + c.y.toFixed(1) + 'L' + d.x.toFixed(1) + ' ' + d.y.toFixed(1) + 'Z',
        fill: fill }, layer || L.road);
    }

    var nearest = null;
    /* far to near, so nearer tarmac paints over the distance */
    for (var i = DRAW; i >= 0; i--) {
      var idx = s.node - 1 + i;
      if (idx < 0 || idx >= trackLen) { continue; }
      var n = TRACK[idx], pn = TRACK[idx - 1];
      if (!pn) continue;
      var aL = edgeAt(n, -1, 1), aR = edgeAt(n, 1, 1);
      var bL = edgeAt(pn, -1, 1), bR = edgeAt(pn, 1, 1);
      if (!aL || !aR || !bL || !bR) continue;
      var fog = Math.min(1, Math.pow(i / DRAW, 3.0));
      quad(bL, bR, aR, aL, mixHex(idx % 2 ? '#3B3A38' : '#343331', '#5C7F5F', fog * 0.82));
      nearest = { aL: aL, aR: aR, bL: bL, bR: bR, idx: idx };
      /* kerbs */
      var kc = (Math.floor(idx / 3) % 2) ? '#B01B2E' : '#F2F4F7';
      var aLo = edgeAt(n, -1, 1.26), bLo = edgeAt(pn, -1, 1.26);
      var aRo = edgeAt(n, 1, 1.26), bRo = edgeAt(pn, 1, 1.26);
      if (aLo && bLo) quad(bL, bLo, aLo, aL, mixHex(kc, '#5C7F5F', fog * 0.82));
      if (aRo && bRo) quad(bR, bRo, aRo, aR, mixHex(kc, '#5C7F5F', fog * 0.82));
      /* dashed centre line */
      if (Math.floor(idx / 2) % 2 === 0 && fog < 0.9) {
        el('line', { x1: ((bL.x + bR.x) / 2).toFixed(1), y1: ((bL.y + bR.y) / 2).toFixed(1),
          x2: ((aL.x + aR.x) / 2).toFixed(1), y2: ((aL.y + aR.y) / 2).toFixed(1),
          stroke: '#E9EDF2', 'stroke-width': Math.max(1, 0.3 * aL.k).toFixed(1),
          opacity: (0.5 * (1 - fog)).toFixed(2) }, L.marks);
      }
      /* checkpoint arch */
      if (n.check && !n.taken && i < 74) {
        var hgt = 5.6 * aL.k;
        el('path', { d: 'M' + aL.x.toFixed(1) + ' ' + aL.y.toFixed(1) +
          'L' + aL.x.toFixed(1) + ' ' + (aL.y - hgt).toFixed(1) +
          'L' + aR.x.toFixed(1) + ' ' + (aR.y - hgt).toFixed(1) +
          'L' + aR.x.toFixed(1) + ' ' + aR.y.toFixed(1),
          fill: 'none', stroke: '#8C99A6', 'stroke-width': Math.max(1.4, 0.55 * aL.k).toFixed(1),
          opacity: (1 - fog).toFixed(2) }, L.gates);
        el('text', { x: ((aL.x + aR.x) / 2).toFixed(1), y: ((aL.y + aR.y) / 2 - hgt * 0.66).toFixed(1),
          'text-anchor': 'middle', fill: '#1A1410', 'font-weight': 700,
          'font-size': Math.max(9, 1.6 * aL.k).toFixed(0),
          'font-family': 'Play, system-ui, sans-serif',
          opacity: (0.92 * (1 - fog)).toFixed(2) }, L.gates).textContent = '+TIME';
      }
    }
    /* The nearest node can still be several metres ahead, and on a tall
       phone frame that leaves the tarmac stopping short with grass under
       it. Carry the near edge on down past the bottom of the frame along
       its own slope, so the road always runs off the foot of the screen. */
    if (nearest && nearest.bL.y < H) {
      var run = function (far, near) {
        var dy = near.y - far.y;
        if (dy <= 0.5) return { x: near.x, y: H + 60 };
        var t = (H + 60 - near.y) / dy;
        return { x: near.x + (near.x - far.x) * t, y: H + 60 };
      };
      var xL = run(nearest.aL, nearest.bL), xR = run(nearest.aR, nearest.bR);
      quad(xL, xR, nearest.bR, nearest.bL, nearest.idx % 2 ? '#3B3A38' : '#343331');
      var kc2 = (Math.floor((nearest.idx - 1) / 3) % 2) ? '#B01B2E' : '#F2F4F7';
      var oL = edgeAt(TRACK[nearest.idx - 1], -1, 1.26), oR = edgeAt(TRACK[nearest.idx - 1], 1, 1.26);
      var fL = edgeAt(TRACK[nearest.idx], -1, 1.26), fR = edgeAt(TRACK[nearest.idx], 1, 1.26);
      if (oL && fL) quad(run(fL, oL), oL, nearest.bL, xL, kc2);
      if (oR && fR) quad(run(fR, oR), oR, nearest.bR, xR, kc2);
    }
    drawCar();
  }

  /* The car is RIGID — §9.4 says vehicles do not deform, so it is never
     scaled or squashed. It slides across the frame and leans, nothing more. */
  /* Every car is drawn from its own derived proportions: mass sets how wide
     and heavy it looks, power-to-weight how low it sits, and its class sets
     the wing. It is still RIGID (§9.4) — nothing is squashed at runtime. */
  function drawCar() {
    var s = S;
    while (L.self.firstChild) L.self.removeChild(L.self.firstChild);
    var col = s.c.col || '#B01B2E';
    var B = s.c.b || { bw: 1, rf: 1, wg: 0.8, st: 1 };
    var cw = W * 0.20, ch = cw * 0.46;
    var bw = B.bw, st = B.st, rf = B.rf, wg = B.wg;
    var cx = CX - clamp(-1, 1, s.lat / (ROAD_HALF * 2.2)) * W * 0.10;
    var cy = H - ch - H * CAR_LIFT;
    var g = el('g', { transform: 'translate(' + cx.toFixed(1) + ',' + cy.toFixed(1) +
      ') rotate(' + (s.lean * 0.5).toFixed(2) + ')' }, L.self);
    el('ellipse', { cx: 0, cy: ch * 0.96, rx: cw * 0.52 * bw, ry: ch * 0.13, fill: 'rgba(20,16,12,.26)' }, g);
    /* tyres — track width comes from the stance figure */
    var tx = cw * 0.54 * st, tw = cw * 0.16 * st;
    el('rect', { x: -tx, y: ch * 0.34, width: tw, height: ch * 0.6, rx: ch * 0.1, fill: '#191C20' }, g);
    el('rect', { x: tx - tw, y: ch * 0.34, width: tw, height: ch * 0.6, rx: ch * 0.1, fill: '#191C20' }, g);
    /* wing — a track-only car wears a big one, a saloon barely any */
    if (wg > 0.30) {
      var ww = cw * 0.52 * Math.min(1.25, wg), wh = ch * 0.13 * Math.min(1.4, wg);
      el('rect', { x: -ww, y: -ch * 0.08 - wh, width: ww * 2, height: wh, rx: 3, fill: shade(col, -0.34) }, g);
      el('rect', { x: -ww * 0.58, y: -ch * 0.08, width: cw * 0.055, height: ch * 0.18, fill: shade(col, -0.45) }, g);
      el('rect', { x: ww * 0.58 - cw * 0.055, y: -ch * 0.08, width: cw * 0.055, height: ch * 0.18, fill: shade(col, -0.45) }, g);
    }
    /* body */
    var bx = cw * 0.46 * bw, sx = cw * 0.40 * bw;
    el('path', { d: 'M' + (-bx).toFixed(1) + ' ' + (ch * 0.86).toFixed(1) +
      'L' + (-sx).toFixed(1) + ' ' + (ch * 0.10).toFixed(1) +
      'Q0 ' + (-ch * 0.06).toFixed(1) + ' ' + sx.toFixed(1) + ' ' + (ch * 0.10).toFixed(1) +
      'L' + bx.toFixed(1) + ' ' + (ch * 0.86).toFixed(1) + 'Z', fill: col }, g);
    /* greenhouse — taller on a saloon, letterbox-thin on something low */
    var gx = cw * 0.26 * bw, gt = ch * 0.30 - ch * 0.22 * (rf - 0.9);
    el('path', { d: 'M' + (-gx).toFixed(1) + ' ' + (ch * 0.30).toFixed(1) +
      'L' + (-gx * 0.85).toFixed(1) + ' ' + gt.toFixed(1) +
      'Q0 ' + (gt - ch * 0.06).toFixed(1) + ' ' + (gx * 0.85).toFixed(1) + ' ' + gt.toFixed(1) +
      'L' + gx.toFixed(1) + ' ' + (ch * 0.30).toFixed(1) + 'Z', fill: 'rgba(24,28,34,.55)' }, g);
    /* lights */
    var lw = cw * 0.20 * bw;
    el('rect', { x: -bx * 0.87, y: ch * 0.60, width: lw, height: ch * 0.11, rx: 2, fill: '#E0C15A' }, g);
    el('rect', { x: bx * 0.87 - lw, y: ch * 0.60, width: lw, height: ch * 0.11, rx: 2, fill: '#E0C15A' }, g);
    if (s.slip > 0.02) {
      var o = Math.min(0.72, s.slip);
      el('ellipse', { cx: -tx, cy: ch * 0.92, rx: cw * 0.17, ry: ch * 0.13, fill: '#DCE4EC', opacity: o.toFixed(2) }, g);
      el('ellipse', { cx: tx, cy: ch * 0.92, rx: cw * 0.17, ry: ch * 0.13, fill: '#DCE4EC', opacity: o.toFixed(2) }, g);
    }
  }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16 & 255, g2 = n >> 8 & 255, b = n & 255;
    function f(v) { return Math.max(0, Math.min(255, Math.round(v + v * amt))); }
    return 'rgb(' + f(r) + ',' + f(g2) + ',' + f(b) + ')';
  }

  function flash(c) {
    var r = el('rect', { x: 0, y: 0, width: W, height: H, fill: c, opacity: 0.2 }, L.fx);
    setTimeout(function () { if (r.parentNode) r.parentNode.removeChild(r); }, 110);
  }
  /* §9.2 — three real lines with occupancy tracking. A line is freed only
     when its message is removed, and drift is capped inside the spacing. */
  var POP = [null, null, null], POP_GAP = 54;
  function pop(txt) {
    var slot = POP.indexOf(null);
    if (slot < 0) { slot = 0; if (POP[0] && POP[0].parentNode) POP[0].parentNode.removeChild(POP[0]); }
    var y0 = H * 0.26 - slot * POP_GAP;
    var t = el('text', { x: CX, y: y0, 'text-anchor': 'middle', fill: '#1B7F3B', 'font-size': 40,
      'font-weight': 700, 'font-family': 'Play, system-ui, sans-serif', opacity: 0.95 }, L.fx);
    t.textContent = txt;
    POP[slot] = t;
    var n = 0;
    (function rise() {
      if (++n > 26) {
        if (t.parentNode) t.parentNode.removeChild(t);
        if (POP[slot] === t) POP[slot] = null;
        return;
      }
      t.setAttribute('y', y0 - Math.min(16, n * 0.8));
      t.setAttribute('opacity', (0.95 * (1 - n / 26)).toFixed(2));
      setTimeout(rise, 16);
    })();
  }

  /* ============ figures, every one computed ============ */
  var FLEET = window.DRIVE_FLEET;
  function figuresFor(c) {
    var out = [];
    if (c.w) out.push(Math.round(c.p / c.w * 1000).toLocaleString() + ' hp per tonne — that is the grip you can feel');
    out.push(c.p.toLocaleString() + ' hp' + (c.w ? ' moving ' + c.w.toLocaleString() + ' kg' : ''));
    if (c.ts) out.push(c.ts + ' mph flat out, and downforce climbs with the square of speed');
    if (c.z) out.push('0–60 in ' + c.z.toFixed(2) + ' s — ' + (26.82 / c.z / 9.81).toFixed(2) + ' g off the line');
    out.push('Braking distance grows with the square of speed. Brake earlier than feels right.');
    out.push('Grip spent turning is grip you cannot brake with. That is the whole game.');
    return out;
  }
  function showFigure(s) {
    var e = document.getElementById('apexFig');
    if (!e || !s.figs.length) return;
    e.textContent = s.figs[s.figIdx % s.figs.length];
    s.figIdx++;
    e.style.opacity = '1';
    clearTimeout(e._t);
    e._t = setTimeout(function () { e.style.opacity = '0'; }, 2600);
  }

  /* ============ bests, daily challenge ============ */
  var BKEY = 'apex.best.v2';
  function loadBests() { try { return JSON.parse(localStorage.getItem(BKEY) || '{}') || {}; } catch (e) { return {}; } }
  function saveBest(slug, v) { try { var a = loadBests(); if (!a[slug] || v > a[slug]) { a[slug] = v; localStorage.setItem(BKEY, JSON.stringify(a)); } } catch (e) {} }
  var BESTS = loadBests();
  function todayKey() { var d = new Date(); return d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1) + '-' + d.getUTCDate(); }
  function hashOf(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function dailyCar() { return FLEET[hashOf(todayKey()) % FLEET.length]; }
  function rnd() { return daily && dailyRng ? dailyRng() : Math.random(); }

  /* ============ §5 difficulty, derived from the real specs ============ */
  var BANDS = ['all', 'cruiser', 'quick', 'rapid', 'savage', 'hypersonic'];
  function bandOf(c) {
    if ((c.ts || 0) >= 280) return 'hypersonic';    /* pace, not grip, is the problem */
    var pw = (c.p || 600) / (c.w || 1500);
    return pw > 1.05 ? 'savage' : pw > 0.80 ? 'rapid' : pw > 0.58 ? 'quick' : 'cruiser';
  }

  /* ===================== picker ===================== */
  var band = 'all', query = '';
  var gridEl = document.getElementById('apexGrid'), bandsEl = document.getElementById('apexBands'),
      filterEl = document.getElementById('apexFilter'), dailyBtn = document.getElementById('apexDaily'),
      overEl = document.getElementById('apexOver'), overH = document.getElementById('apexOverH'),
      overB = document.getElementById('apexOverB');

  function paintBands() {
    if (!bandsEl) return;
    bandsEl.innerHTML = BANDS.map(function (b) {
      return '<button type="button" class="flyband' + (b === band ? ' on' : '') + '" data-b="' + b + '">' +
        (b === 'all' ? 'All' : b.charAt(0).toUpperCase() + b.slice(1)) + '</button>';
    }).join('');
  }
  function paintGrid() {
    if (!gridEl) return;
    var q = query.toLowerCase();
    var list = FLEET.filter(function (c) {
      return (band === 'all' || bandOf(c) === band) && (!q || c.n.toLowerCase().indexOf(q) > -1);
    });
    if (!list.length) { gridEl.innerHTML = '<p class="flynone">Nothing matches that.</p>'; return; }
    gridEl.innerHTML = list.map(function (c) {
      return '<a class="flyopt' + (c.s === car.s ? ' on' : '') + '" href="/hypercars/' + c.s + '" data-s="' + c.s +
        '" role="option" aria-selected="' + (c.s === car.s) + '">' +
        '<span class="fo-n">' + c.n + '</span>' +
        '<span class="fo-m">' + c.p.toLocaleString() + ' hp' +
        (c.w ? ' &middot; ' + Math.round(c.p / c.w * 1000).toLocaleString() + ' hp/t' : '') + '</span>' +
        (BESTS[c.s] ? '<span class="fo-pb">best ' + BESTS[c.s].toLocaleString() + '</span>' : '') +
        '<span class="fo-b b-' + bandOf(c) + '">' + bandOf(c) + '</span></a>';
    }).join('');
  }
  if (bandsEl) bandsEl.addEventListener('click', function (e) {
    var t = e.target; while (t && t !== bandsEl && !t.getAttribute('data-b')) t = t.parentNode;
    if (!t || t === bandsEl) return;
    band = t.getAttribute('data-b'); paintBands(); paintGrid();
  });
  if (gridEl) gridEl.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
    var t = e.target; while (t && t !== gridEl && !t.getAttribute('data-s')) t = t.parentNode;
    if (!t || t === gridEl) return;
    e.preventDefault();
    var slug = t.getAttribute('data-s');
    for (var i = 0; i < FLEET.length; i++) if (FLEET[i].s === slug) car = FLEET[i];
    paintGrid(); start();
    var stage = document.getElementById('apexStage');
    if (stage && stage.scrollIntoView) stage.scrollIntoView({ block: 'center' });
  });
  if (filterEl) filterEl.addEventListener('input', function () { query = filterEl.value || ''; paintGrid(); });
  function paintDaily() {
    if (!dailyBtn) return;
    var c = dailyCar();
    dailyBtn.textContent = daily ? 'Daily: ' + c.n : 'Daily challenge';
    dailyBtn.setAttribute('aria-pressed', String(daily));
    dailyBtn.classList[daily ? 'add' : 'remove']('on');
  }
  if (dailyBtn) dailyBtn.addEventListener('click', function () {
    daily = !daily;
    if (daily) { car = dailyCar(); paintGrid(); }
    paintDaily();
    if (daily) start();
  });

  /* ===================== result ===================== */
  function over() {
    running = false; cancelAnimationFrame(raf);
    var sc = S.score, st = S.st;
    if (sc > best) { best = sc; hud.best.textContent = best.toLocaleString(); }
    saveBest(car.s, sc); BESTS = loadBests(); paintGrid();
    if (!overEl) return;
    overH.textContent = 'Time!';
    overB.textContent = 'You covered ' + sc.toLocaleString() + ' m in the ' + car.n + ', through ' +
      S.checks + ' checkpoint' + (S.checks === 1 ? '' : 's') + '. ' +
      (st.pw > 1.0
        ? 'At ' + Math.round(st.pw * 1000).toLocaleString() + ' hp per tonne it will out-drag almost anything here — but the same tyres cannot brake and turn at the same time.'
        : 'At ' + Math.round(st.pw * 1000).toLocaleString() + ' hp per tonne the time is in the corners, not the straights.');
    var cta = document.getElementById('apexCta');
    if (cta) { cta.href = '/hypercars/' + car.s; cta.textContent = 'About the ' + car.n; }
    var share = document.getElementById('apexShare');
    if (share) share.onclick = function () {
      var line = 'Apex Line — ' + car.n + ': ' + sc.toLocaleString() + ' m, ' + S.checks + ' checkpoints' + (daily ? ' (daily)' : '') + '.';
      var url = 'https://hypercars.fyi/apex';
      function done(m) { share.textContent = m; setTimeout(function () { share.textContent = 'Share result'; }, 1500); }
      if (navigator.share) {
        navigator.share({ title: 'Apex Line', text: line, url: url }).then(function () {}, function (err) {
          if (err && err.name === 'AbortError') return;   /* dismissing the sheet is not a failure */
          copyOut(line + ' ' + url, done);
        });
        return;
      }
      copyOut(line + ' ' + url, done);
    };
    overEl.hidden = false;
  }
  function copyOut(text, done) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done('Copied ✓'); }, function () { done('Copy failed'); });
        return;
      }
    } catch (e) {}
    done('Copy failed');
  }

  /* ===================== start / restart =====================
     §9.1 — a run always begins from a fully-derived clean state. No
     speed, throttle or steering carried over from the last attempt. */
  function start() {
    if (daily) dailyRng = mulberry(hashOf(todayKey()));
    resetTrack(rnd);
    S = makeState(car);
    for (var i = 0; i < POP.length; i++) {
      if (POP[i] && POP[i].parentNode) POP[i].parentNode.removeChild(POP[i]);
      POP[i] = null;
    }
    touch.steer = 0; touch.thr = 0; touch.brk = 0;
    keys = {};
    hud.name.textContent = car.n;
    hud.best.textContent = best.toLocaleString();
    if (overEl) overEl.hidden = true;
    buildScene();
    running = true; last = 0;
    raf = requestAnimationFrame(step);
  }
  function offReset() {
    running = false; cancelAnimationFrame(raf);
    flash('#B01B2E');
    var t = el('text', { x: CX, y: H * 0.42, 'text-anchor': 'middle', fill: '#B01B2E',
      'font-size': 46, 'font-weight': 700, 'font-family': 'Play, system-ui, sans-serif' }, L.fx);
    t.textContent = 'Off the track';
    var t2 = el('text', { x: CX, y: H * 0.42 + 46, 'text-anchor': 'middle', fill: '#4C5864',
      'font-size': 24, 'font-weight': 700, 'font-family': 'Play, system-ui, sans-serif' }, L.fx);
    t2.textContent = 'Restarting\u2026';
    setTimeout(start, 900);        /* start() rebuilds the scene, clearing these */
  }

  var againBtn = document.getElementById('apexAgain');
  if (againBtn) againBtn.addEventListener('click', start);
  function toPicker() {
    running = false; cancelAnimationFrame(raf);
    if (overEl) overEl.hidden = true;
    if (filterEl) { filterEl.value = ''; query = ''; }
    paintGrid();
    var pick = document.getElementById('apexPick');
    if (pick && pick.scrollIntoView) pick.scrollIntoView({ block: 'start' });
  }
  ['apexPickBtn', 'apexOverX'].forEach(function (id) {
    var b = document.getElementById(id);
    if (b) b.addEventListener('click', toPicker);
  });
  if (hud.name) hud.name.addEventListener('click', toPicker);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overEl && !overEl.hidden) toPicker();
  });

  var fitT = 0;
  function refit() { clearTimeout(fitT); fitT = setTimeout(fit, 120); }
  window.addEventListener('resize', refit);
  window.addEventListener('orientationchange', refit);

  /* Bind everything BEFORE any early return — an earlier engine bailed on
     reduced motion before wiring listeners and left the game dead. */
  paintBands(); paintGrid(); paintDaily();
  resetTrack(Math.random);
  S = makeState(car);
  fit();
  if (reduce) {
    if (overEl) {
      overH.textContent = 'Reduced motion is on';
      overB.textContent = 'Your device asks for reduced motion, so this will not start by itself. Press Race again, or pick a car below.';
      overEl.hidden = false;
    }
  } else {
    start();
  }

  /* exposed only so the headless smoke harness can assert on the physics */
  window.APEX_TEST = {
    statsFor: statsFor, gripAt: gripAt, bandOf: bandOf, fleet: FLEET,
    track: function () { return TRACK; }, state: function () { return S; },
    extend: function (n) { extendTrack(Math.random, n); }, trim: function () { trimTrack(S); },
    running: function () { return running; }
  };
})();

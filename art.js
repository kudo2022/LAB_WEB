/* IRoD Lab · art.js
   Animated drawings for the five core research areas (svg[data-art] on area cards and area page heads).
   Each drawing is a small mechanism with real kinematics, redrawn from one phase value 0..1:
     mechanism-design            crank-rocker four-bar, balancing spring, coupler-curve trace
     physical-hri                person pushes a handle through a series-elastic spring; force trace
     physics-informed-ai         signal passes the network layer by layer, then the physics curve fits the data
     rehabilitation              knee exoskeleton lifts the shank; knee angle arc
     manipulation-manufacturing  conveyor brings a box, a two-link arm picks it and places it on the table
   Runs only while a drawing is on screen; reduced motion shows one still frame. Without JS the static
   drawing written by tools/gen.py stays. Area page heads also advance with scroll. */
(function () {
  'use strict';
  var TAU = Math.PI * 2;
  function r(n) { return Math.round(n * 10) / 10; }
  function pt(p) { return r(p[0]) + ' ' + r(p[1]); }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function seg(x, a, b) { return clamp((x - a) / (b - a), 0, 1); }
  function ease(x) { return x * x * (3 - 2 * x); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function line(a, b, cls) { return '<path class="' + cls + '" d="M' + pt(a) + 'L' + pt(b) + '"/>'; }
  function circ(c, rad, cls) { return '<circle class="' + cls + '" cx="' + r(c[0]) + '" cy="' + r(c[1]) + '" r="' + rad + '"/>'; }
  function poly(ps, cls) { return '<path class="' + cls + '" d="M' + ps.map(pt).join('L') + 'Z"/>'; }
  function path(d, cls) { return '<path class="' + cls + '" d="' + d + '"/>'; }

  // spring between two points: fixed coil amplitude, so a short spring reads as compressed
  function zig(a, b, n, amp) {
    var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, px = -uy, py = ux;
    var lead = Math.min(8, L * 0.15), span = L - 2 * lead, ps = [a, [a[0] + ux * lead, a[1] + uy * lead]];
    for (var i = 1; i < n * 2; i++) {
      var s = lead + span * i / (n * 2), side = (i % 2 ? 1 : -1) * amp;
      ps.push([a[0] + ux * s + px * side, a[1] + uy * s + py * side]);
    }
    ps.push([b[0] - ux * lead, b[1] - uy * lead], b);
    return 'M' + ps.map(pt).join('L');
  }
  // intersection of circle(B, r1) and circle(D, r2); 'up' picks the upper solution
  function meet(B, r1, D, r2, up) {
    var dx = D[0] - B[0], dy = D[1] - B[1], d = Math.hypot(dx, dy);
    var a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
    var xm = B[0] + a * dx / d, ym = B[1] + a * dy / d;
    var s1 = [xm + h * dy / d, ym - h * dx / d], s2 = [xm - h * dy / d, ym + h * dx / d];
    return (s1[1] < s2[1]) === up ? s1 : s2;
  }
  // two-link inverse kinematics: elbow position, reach clamped
  function ik(S, T, l1, l2, up) {
    var dx = T[0] - S[0], dy = T[1] - S[1], d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
    var T2 = [S[0] + dx / Math.hypot(dx, dy) * d, S[1] + dy / Math.hypot(dx, dy) * d];
    return meet(S, l1, T2, l2, up);
  }
  function hatch(x1, x2, y) {
    var d = 'M' + x1 + ' ' + y + 'H' + x2;
    for (var x = x1 + 10; x <= x2; x += 20) d += 'M' + x + ' ' + y + 'l-8 10';
    return path(d, 'g');
  }

  var DRAW = {};

  /* 01 · crank-rocker four-bar (Grashof: 26 + 110 <= 100 + 74), spring from a hanger to the coupler */
  var A = [96, 138], D = [206, 138], LA = 26, LB = 100, LC = 74, EXT = 44;
  function fourbar(p) {
    var t = p * TAU, B = [A[0] + LA * Math.cos(t), A[1] + LA * Math.sin(t)];
    var C = meet(B, LB, D, LC, true), L = Math.hypot(C[0] - B[0], C[1] - B[1]);
    var P = [C[0] + (C[0] - B[0]) / L * EXT, C[1] + (C[1] - B[1]) / L * EXT];
    return { B: B, C: C, P: P, ang: Math.atan2(C[1] - B[1], C[0] - B[0]) };
  }
  var trace = (function () { var d = ''; for (var i = 0; i <= 96; i++) { var q = fourbar(i / 96).P; d += (i ? 'L' : 'M') + pt(q); } return d; })();
  DRAW['mechanism-design'] = function (p) {
    var k = fourbar(p), H = [150, 16], M = [(k.B[0] + k.C[0]) / 2, (k.B[1] + k.C[1]) / 2];
    var c = Math.cos(k.ang), s = Math.sin(k.ang), h = 14;
    var box = [[-h, -h], [h, -h], [h, h], [-h, h]].map(function (q) { return [k.P[0] + q[0] * c - q[1] * s, k.P[1] + q[0] * s + q[1] * c]; });
    return hatch(60, 250, 150) +
      path('M' + pt(A) + 'l-12 12h24zM' + pt(D) + 'l-12 12h24z', 'f') +
      path(trace + 'Z', 'tr') +
      path('M136 16H164M140 16l-6-8M150 16l-6-8M160 16l-6-8', 'g') +
      path(zig(H, M, 6, 6), 'a') +
      line(A, k.B, 'l w') + line(D, k.C, 'l w') + line(k.B, k.P, 'l w') +
      poly(box, 'f l') +
      path('M' + pt([k.P[0], k.P[1] + 20]) + 'v14m-4 -5l4 5 4-5', 'd') +
      circ(A, 6, 'j') + circ(D, 6, 'j') + circ(k.B, 4.5, 'j') + circ(k.C, 4.5, 'j') + circ(H, 3.5, 'j');
  };

  /* 02 · series-elastic actuator meets a person: the spring takes the push, the trace shows the force */
  DRAW['physical-hri'] = function (p) {
    var s = Math.sin(TAU * p), hx = 194 + 13 * s, R = [57, 89], ra = p * TAU * 2;
    var Sh = [258 + 4 * s, 66], Hd = [hx + 7, 89], E = ik(Sh, Hd, 34, 34, false);
    var tick = [R[0] + 10 * Math.cos(ra), R[1] + 10 * Math.sin(ra)];
    var plot = 'M';
    for (var i = 0; i <= 40; i++) { var tt = p - (40 - i) / 40; plot += (i ? 'L' : '') + r(34 + i * 2.9) + ' ' + r(140 + 11 * Math.sin(TAU * tt)); }
    var len = 6 + 12 * Math.abs(s), dir = s < 0 ? -1 : 1, ay = 62;
    return '<rect class="f l" x="34" y="66" width="46" height="46" rx="6"/>' + circ(R, 13, 'l') + line(R, tick, 'a w') + circ(R, 3, 'j') +
      line([80, 89], [94, 89], 'l w') + path(zig([94, 89], [hx - 9, 89], 5, 9), 'a w') + line([hx - 9, 89], [hx, 89], 'l w') +
      path('M' + r(hx) + ' ' + ay + 'h' + r(dir * len) + 'm' + r(-dir * 5) + ' -4l' + r(dir * 5) + ' 4l' + r(-dir * 5) + ' 4', 'a') +
      circ([Sh[0] + 3, 38], 12, 'f l') + line(Sh, [262, 112], 'l w') + line([262, 112], [248, 154], 'l w') + line([262, 112], [278, 154], 'l w') +
      line(Sh, E, 'l w') + line(E, Hd, 'l w') + circ([hx, 89], 7, 'j') +
      path('M34 124V156M34 140H152', 'd') + path(plot, 'a') + circ([150, 140 + 11 * Math.sin(TAU * p)], 3, 'dot') +
      path('M200 156H300', 'g');
  };

  /* 03 · physics-informed network: forward pass, then the curve is drawn through the measurements */
  var L0 = [[40, 50], [40, 90], [40, 130]], L1 = [[86, 36], [86, 70], [86, 104], [86, 138]], L2 = [[132, 66], [132, 114]];
  var DATA = [[0.08, 2], [0.27, -3], [0.45, 3], [0.63, -2], [0.82, 2]];
  function fy(u) { return 90 - 46 * Math.exp(-2.2 * u) * Math.cos(TAU * 2.6 * u); }
  DRAW['physics-informed-ai'] = function (p) {
    var p1 = seg(p, 0, 0.22), p2 = seg(p, 0.22, 0.42), pr = seg(p, 0.45, 0.92), out = '', dots = '';
    function layer(X, Y, k) {
      X.forEach(function (a) { Y.forEach(function (b) {
        out += line(a, b, 'e');
        if (k > 0 && k < 1) dots += circ([lerp(a[0], b[0], k), lerp(a[1], b[1], k)], 2.4, 'dot');
      }); });
    }
    layer(L0, L1, p1); layer(L1, L2, p2);
    var on1 = p >= 0.2 && p < 0.5, on2 = p >= 0.4;
    L0.forEach(function (n) { out += circ(n, 7, 'j' + (p < 0.24 ? ' on' : '')); });
    L1.forEach(function (n) { out += circ(n, 7, 'j' + (on1 ? ' on' : '')); });
    L2.forEach(function (n) { out += circ(n, 7, 'j' + (on2 ? ' on' : '')); });
    var curve = '', op = pr > 0 ? (p > 0.93 ? (1 - p) / 0.07 : 1) : 0;
    for (var i = 0; i <= 60 * pr; i++) { var u = i / 60; curve += (i ? 'L' : 'M') + r(180 + 114 * u) + ' ' + r(fy(u)); }
    var data = DATA.map(function (q) { return circ([180 + 114 * q[0], fy(q[0]) + q[1]], 3.5, 'dot'); }).join('');
    return out + dots + path('M148 90h20m-6-6l6 6-6 6', 'a') + path('M178 150H298M178 150V28', 'd') +
      (curve ? '<path class="a w" style="opacity:' + r(op) + '" d="' + curve + '"/>' : '') + data;
  };

  /* 04 · knee exoskeleton: the shank swings 0..70 degrees about the actuated knee */
  DRAW['rehabilitation'] = function (p) {
    var th = (35 - 35 * Math.cos(TAU * p)) * Math.PI / 180, K = [196, 72];
    var u = [Math.sin(th), Math.cos(th)], n = [Math.cos(th), -Math.sin(th)];
    var Ank = [K[0] + u[0] * 80, K[1] + u[1] * 80], Toe = [Ank[0] + n[0] * 26, Ank[1] + n[1] * 26];
    var ex = [K[0] + u[0] * 66 - n[0] * 10, K[1] + u[1] * 66 - n[1] * 10];
    var c = [K[0] + u[0] * 44 - n[0] * 2, K[1] + u[1] * 44 - n[1] * 2], strap = [[10, 13], [-10, 13], [-10, -13], [10, -13]].map(function (q) {
      return [c[0] + u[0] * q[0] + n[0] * q[1], c[1] + u[1] * q[0] + n[1] * q[1]];
    });
    var a1 = [K[0], K[1] + 30], a2 = [K[0] + u[0] * 30, K[1] + u[1] * 30];
    var rising = Math.sin(TAU * p) > 0, b = th + (rising ? -0.35 : 0.35);
    var g1 = [K[0] + Math.sin(b) * 46, K[1] + Math.cos(b) * 46], g2 = [K[0] + u[0] * 46, K[1] + u[1] * 46];
    return path('M20 158H300', 'g') + path('M40 14V64M48 68V158M104 68V158', 'l') + '<rect class="f l" x="36" y="58" width="80" height="10" rx="4"/>' +
      line([84, 56], K, 'l w') + line(K, Ank, 'l w') + line(Ank, Toe, 'l w') +
      line([104, 69], [190, 82], 'a w') + line(K, ex, 'a w') +
      '<rect class="f l" x="124" y="57" width="26" height="22" rx="4" transform="rotate(8 137 68)"/>' + poly(strap, 'f l') +
      (th > 0.05 ? path('M' + pt(a1) + 'A30 30 0 0 0 ' + pt(a2), 'd') : '') +
      (th > 0.12 && th < 1.18 ? path('M' + pt(g1) + 'A46 46 0 0 ' + (rising ? 0 : 1) + ' ' + pt(g2), 'a') + circ(g2, 2.6, 'dot') : '') +
      circ(K, 12, 'j') + line(K, [K[0] + u[0] * 9, K[1] + u[1] * 9], 'a') + circ(K, 3.5, 'j');
  };

  /* 05 · pick and place: belt advances 60 units, the arm lifts the box and sets it on the table */
  var KEYS = [[0, 66, 84, 0], [0.30, 66, 84, 0], [0.36, 66, 108, 0], [0.40, 66, 108, 1], [0.47, 66, 80, 1], [0.65, 204, 72, 1],
              [0.72, 204, 96, 1], [0.76, 204, 96, 0], [0.84, 204, 72, 0], [1, 66, 84, 0]];
  function tip(p) {
    for (var i = 1; i < KEYS.length; i++) if (p <= KEYS[i][0]) {
      var a = KEYS[i - 1], b = KEYS[i], k = ease(seg(p, a[0], b[0]));
      return [lerp(a[1], b[1], k), lerp(a[2], b[2], k), k < 1 ? a[3] + (b[3] - a[3]) * k : b[3]];
    }
    return [66, 84, 0];
  }
  DRAW['manipulation-manufacturing'] = function (p) {
    var disp = 60 * seg(p, 0, 0.30), G = tip(p), S = [142, 128], W = [G[0], G[1] - 14], E = ik(S, W, 50, 50, true);
    var out = path('M20 158H300', 'g') + '<rect class="f l" x="178" y="120" width="52" height="8" rx="2"/>' + path('M184 128V158M224 128V158', 'l') +
      path('M14 132H120M14 146H120', 'l');
    [22, 52, 82, 112].forEach(function (x) {
      var a = disp / 7; out += circ([x, 139], 6, 'j') + line([x - 5 * Math.cos(a), 139 - 5 * Math.sin(a)], [x + 5 * Math.cos(a), 139 + 5 * Math.sin(a)], 'l');
    });
    function box(cx, cy, o) { return '<rect class="f l" style="opacity:' + r(o) + '" x="' + r(cx - 11) + '" y="' + r(cy - 11) + '" width="22" height="22" rx="2"/>'; }
    for (var k = 1; k < 3; k++) { var x = 6 + disp - 60 * k; out += box(x, 121, seg(x, -2, 14)); }
    if (p < 0.40) out += box(6 + disp, 121, seg(6 + disp, -2, 14));
    else if (p < 0.74) out += box(G[0], G[1] + 13, 1);
    else out += box(204, 109, 1 - seg(p, 0.88, 1));
    var w = lerp(15, 12, G[2]);
    out += path('M130 158h24l-4-28h-16z', 'f l') + line(S, E, 'l w') + line(E, W, 'l w') +
      path('M' + pt(W) + 'v6M' + r(W[0] - w) + ' ' + r(W[1] + 6) + 'H' + r(W[0] + w) + 'M' + r(W[0] - w) + ' ' + r(W[1] + 6) + 'v9M' + r(W[0] + w) + ' ' + r(W[1] + 6) + 'v9', 'a w') +
      circ(S, 7, 'j') + circ(E, 6, 'j') + circ(W, 4, 'j');
    return out;
  };

  var PERIOD = { 'mechanism-design': 6, 'physical-hri': 4, 'physics-informed-ai': 5.5, 'rehabilitation': 5, 'manipulation-manufacturing': 8 };
  var REST = { 'mechanism-design': 0.2, 'physical-hri': 0.75, 'physics-informed-ai': 0.85, 'rehabilitation': 0.25, 'manipulation-manufacturing': 0.6 };

  var items = [];
  Array.prototype.forEach.call(document.querySelectorAll('svg[data-art]'), function (svg, i) {
    var key = svg.getAttribute('data-art');
    if (!DRAW[key]) return;
    items.push({ svg: svg, key: key, ph: REST[key], on: false, fast: false, head: !!svg.closest('.ahead') });
    svg.innerHTML = DRAW[key](REST[key]);
  });
  if (!items.length) return;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches) return;

  // hovering or focusing a card speeds its drawing up
  items.forEach(function (it) {
    var host = it.svg.closest('a');
    if (!host) return;
    host.addEventListener('pointerenter', function () { it.fast = true; });
    host.addEventListener('pointerleave', function () { it.fast = false; });
    host.addEventListener('focus', function () { it.fast = true; });
    host.addEventListener('blur', function () { it.fast = false; });
  });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { items.forEach(function (it) { if (it.svg === e.target) it.on = e.isIntersecting; }); });
    }, { rootMargin: '40px' });
    items.forEach(function (it) { io.observe(it.svg); });
  } else items.forEach(function (it) { it.on = true; });

  // the area page head is also scrubbed by the scroll wheel
  var lastY = window.scrollY;
  window.addEventListener('scroll', function () {
    var dy = window.scrollY - lastY; lastY = window.scrollY;
    items.forEach(function (it) { if (it.head && it.on) it.ph += dy / 900; });
  }, { passive: true });

  var prev = 0, acc = 0;
  function tick(ts) {
    var dt = prev ? Math.min(ts - prev, 100) : 16; prev = ts; acc += dt;
    if (acc >= 32 && !document.hidden) {
      items.forEach(function (it) {
        if (!it.on) return;
        it.ph += acc / 1000 / PERIOD[it.key] * (it.fast ? 2 : 1);
        it.ph -= Math.floor(it.ph);
        it.svg.innerHTML = DRAW[it.key](it.ph);
      });
      acc = 0;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

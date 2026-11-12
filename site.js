/* IRoD Lab · site.js
   1. Balancing arm (zero-free-length spring balancer), 2. Register, 3. Folio.
   Runs after scrollcraft.js, which writes --sc-p inline on each [data-sc-act]. */
(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var reduce = !!(window.ScrollCraft && window.ScrollCraft.reduce);
  var $ = function (id) { return document.getElementById(id); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var smooth = function (t) { return t * t * (3 - 2 * t); };
  var D2R = Math.PI / 180;
  var f1 = function (n) { return Math.round(n * 10) / 10; };
  var vi = function () { return document.documentElement.getAttribute('data-lang') === 'vi'; };
  var STR = {
    en: { bal: 'Net torque: 0 · balanced', net: 'Net torque: ', falls: ' m·g·l · it falls', remove: 'Remove the spring', attach: 'Attach the spring', deg: ' degrees' },
    vi: { bal: 'Mômen tổng: 0 · cân bằng', net: 'Mômen tổng: ', falls: ' m·g·l · cánh tay rơi', remove: 'Tháo lò xo', attach: 'Lắp lò xo', deg: ' độ' }
  };
  var TX = function () { return STR[vi() ? 'vi' : 'en']; };

  /* ---------------------------------------------------------------- 1. ARM */
  function initArm() {
    var sec = $('arm'), svg = $('arm-svg');
    if (!sec || !svg) return;
    var el = {
      bar: $('arm-bar'), b: $('arm-b'), mass: $('arm-mass'), handle: $('arm-handle'),
      spring: $('arm-spring-path'), arc: $('arm-arc'), theta: $('arm-theta'), m: $('arm-m'),
      ghosts: $('ghosts'), pg: $('plot-g'), ps: $('plot-s'), pn: $('plot-n'),
      px: $('plot-x'), pdn: $('plot-dn'), readout: $('arm-readout'),
      btnSpring: $('arm-spring'), btnReset: $('arm-reset')
    };
    var notes = sec.querySelectorAll('.arm__notes li[data-note]');

    var O = { x: 200, y: 330 }, A = { x: 200, y: 210 }, L = 260, B = 150;
    var MIN = -55, MAX = 70, G_EFF = 9, DAMP = 1.2;
    var GHOST_AT = [-40, -20, 0, 20, 40, 60];

    var S = { deg: -45, omega: 0, mode: 'scroll', attached: true, dragging: false, resting: false };
    var ghostDone = {}, prevScrollDeg = null;
    var last = { deg: NaN, attached: null, note: -1, hand: null, readout: '' };
    var near = false, rafId = 0, lastT = 0;

    function setAttr(n, o) { if (n) for (var k in o) n.setAttribute(k, o[k]); }
    function pt(d, deg) { var r = deg * D2R; return { x: O.x + d * Math.cos(r), y: O.y - d * Math.sin(r) }; }
    function p() {
      var v = parseFloat(sec.style.getPropertyValue('--sc-p'));
      if (isNaN(v)) v = parseFloat(getComputedStyle(sec).getPropertyValue('--sc-p'));
      return isNaN(v) ? 0 : v;
    }

    // Zigzag spring: 14px leads, 10 zigzags (20 half-strokes), 10px amplitude.
    function springPoints(P, Q) {
      var dx = Q.x - P.x, dy = Q.y - P.y, len = Math.hypot(dx, dy) || 1;
      var ux = dx / len, uy = dy / len, nx = -uy, ny = ux, lead = Math.min(14, len / 4);
      var body = len - 2 * lead, out = [P.x + ',' + P.y];
      out.push(f1(P.x + ux * lead) + ',' + f1(P.y + uy * lead));
      for (var i = 0; i < 20; i++) {
        var s = lead + body * (i + 0.5) / 20, a = (i % 2 ? -10 : 10);
        out.push(f1(P.x + ux * s + nx * a) + ',' + f1(P.y + uy * s + ny * a));
      }
      out.push(f1(Q.x - ux * lead) + ',' + f1(Q.y - uy * lead), Q.x + ',' + Q.y);
      return out.join(' ');
    }

    // Plot mapping: θ -60..75 → x 40..580, torque +1..-1 → y 20..180.
    function plotX(deg) { return 40 + (deg + 60) / 135 * 540; }
    function plotY(t) { return 100 - t * 80; }
    function curve(fn) {
      var d = '';
      for (var deg = -60; deg <= 75; deg += 1.5) d += (d ? 'L' : 'M') + f1(plotX(deg)) + ' ' + f1(plotY(fn(deg * D2R)));
      return d;
    }
    function buildPlot() {
      if (el.pg) el.pg.setAttribute('d', curve(function (r) { return -Math.cos(r); }));
      if (el.ps) el.ps.setAttribute('d', S.attached ? curve(function (r) { return Math.cos(r); }) : '');
      if (el.pn) el.pn.setAttribute('d', curve(function (r) { return S.attached ? 0 : -Math.cos(r); }));
    }

    function clearGhosts() {
      ghostDone = {}; prevScrollDeg = null;
      if (el.ghosts) while (el.ghosts.firstChild) el.ghosts.removeChild(el.ghosts.firstChild);
    }
    function addGhosts(from, to) {
      if (!el.ghosts || from === null) return;
      var lo = Math.min(from, to), hi = Math.max(from, to);
      GHOST_AT.forEach(function (g) {
        if (ghostDone[g] || g < lo || g > hi) return;
        ghostDone[g] = true;
        var P = pt(L, g), ln = document.createElementNS(SVGNS, 'line');
        setAttr(ln, { x1: O.x, y1: O.y, x2: f1(P.x), y2: f1(P.y), 'class': 'ghost' });
        el.ghosts.appendChild(ln);
      });
    }

    function render(pv) {
      var deg = S.deg, r = deg * D2R, c = Math.cos(r), s = Math.sin(r);
      var hand = S.mode === 'hand';
      var note = hand || pv >= 0.72 ? 2 : pv >= 0.30 ? 1 : 0;
      if (note !== last.note) {
        for (var i = 0; i < notes.length; i++) notes[i].classList.toggle('is-on', +notes[i].getAttribute('data-note') === note);
        last.note = note;
      }
      if (hand !== last.hand) { sec.classList.toggle('is-hand', hand); last.hand = hand; }
      // Publish bespoke state for the verification harness (shoot.mjs): the arm's
      // motion is SVG, which the engine-level signature cannot see. The last ~14%
      // of the pin is an authored hold: the sweep is done and the arm waits for a hand.
      var vstate = Math.round(deg) + '|' + note + '|' + (S.attached ? 1 : 0);
      if (vstate !== last.vstate) { sec.setAttribute('data-sc-verify-state', vstate); last.vstate = vstate; }
      var vhold = S.mode === 'scroll' && pv > 0.86 ? 'true' : 'false';
      if (vhold !== last.vhold) { sec.setAttribute('data-sc-verify-hold', vhold); last.vhold = vhold; }
      if (deg === last.deg && S.attached === last.attached) return;

      var P = pt(L, deg), Bp = pt(B, deg);
      setAttr(el.bar, { x1: O.x, y1: O.y, x2: f1(P.x), y2: f1(P.y) });
      setAttr(el.b, { cx: f1(Bp.x), cy: f1(Bp.y) });
      setAttr(el.mass, { x: f1(P.x - 24), y: f1(P.y - 24), transform: 'rotate(' + f1(-deg) + ' ' + f1(P.x) + ' ' + f1(P.y) + ')' });
      setAttr(el.handle, { cx: f1(P.x), cy: f1(P.y), 'aria-valuenow': Math.round(deg), 'aria-valuetext': Math.round(deg) + TX().deg });

      if (S.attached !== last.attached) {
        sec.classList.toggle('is-detached', !S.attached);
        if (el.spring) el.spring.style.display = S.attached ? '' : 'none';
      }
      if (S.attached && el.spring) el.spring.setAttribute('points', springPoints(A, { x: f1(Bp.x), y: f1(Bp.y) }));

      // Angle arc (radius 60) from horizontal to θ, plus labels.
      if (el.arc) {
        var E = pt(60, deg);
        el.arc.setAttribute('d', Math.abs(deg) < 0.5 ? '' :
          'M' + (O.x + 60) + ' ' + O.y + 'A60 60 0 0 ' + (deg > 0 ? 0 : 1) + ' ' + f1(E.x) + ' ' + f1(E.y));
      }
      var T = pt(78, deg / 2);
      setAttr(el.theta, { x: f1(T.x), y: f1(T.y) });
      setAttr(el.m, { x: f1(P.x + 34 * c - 6), y: f1(P.y - 34 * s - 30) });

      var net = S.attached ? 0 : -c;
      if (el.px) setAttr(el.px, { x1: f1(plotX(deg)), x2: f1(plotX(deg)) });
      setAttr(el.pdn, { cx: f1(plotX(deg)), cy: f1(plotY(net)) });

      var txt = S.attached ? TX().bal
        : TX().net + (-c).toFixed(vi() ? 2 : 2).replace('-', '−').replace('.', vi() ? ',' : '.') + TX().falls;
      if (el.readout && txt !== last.readout) { el.readout.textContent = txt; last.readout = txt; }

      last.deg = deg; last.attached = S.attached;
    }

    // Free fall with the spring removed: θ'' = -g·cosθ − c·θ'.
    function stepFall(dt) {
      if (S.resting) return;
      if (reduce) { S.deg = MIN; S.omega = 0; S.resting = true; return; }
      var th = S.deg * D2R;
      S.omega += (-G_EFF * Math.cos(th) - DAMP * S.omega) * dt;
      th += S.omega * dt;
      var deg = th / D2R;
      if (deg <= MIN) {
        deg = MIN;
        S.omega = -S.omega * 0.3;
        if (Math.abs(S.omega) < 0.05) { S.omega = 0; S.resting = true; }
      } else if (deg >= MAX) { deg = MAX; S.omega = 0; }
      S.deg = deg;
    }

    function frame(t) {
      rafId = 0;
      var dt = lastT ? Math.min((t - lastT) / 1000, 1 / 30) : 1 / 60;
      lastT = t;
      var pv = p();
      if (S.mode === 'scroll') {
        S.deg = -45 + 105 * smooth(clamp((pv - 0.05) / 0.8, 0, 1));
        addGhosts(prevScrollDeg, S.deg);
        prevScrollDeg = S.deg;
      } else if (!S.attached && !S.dragging) {
        stepFall(dt);
      }
      render(pv);
      if (near) rafId = requestAnimationFrame(frame);
    }
    function start() { if (!rafId) { lastT = 0; rafId = requestAnimationFrame(frame); } }

    function toHand() { S.mode = 'hand'; prevScrollDeg = null; }
    function setDeg(d) { S.deg = clamp(d, MIN, MAX); S.omega = 0; S.resting = false; start(); }

    // Pointer dragging on the handle.
    function pointerDeg(e) {
      var m = svg.getScreenCTM();
      if (!m) return S.deg;
      var q = svg.createSVGPoint(); q.x = e.clientX; q.y = e.clientY;
      q = q.matrixTransform(m.inverse());
      return Math.atan2(-(q.y - O.y), q.x - O.x) / D2R;
    }
    if (el.handle) {
      el.handle.style.touchAction = 'none';
      el.handle.addEventListener('pointerdown', function (e) {
        toHand(); S.dragging = true;
        try { el.handle.setPointerCapture(e.pointerId); } catch (_) {}
        setDeg(pointerDeg(e)); e.preventDefault();
      });
      el.handle.addEventListener('pointermove', function (e) { if (S.dragging) setDeg(pointerDeg(e)); });
      var release = function () { if (S.dragging) { S.dragging = false; S.omega = 0; start(); } };
      el.handle.addEventListener('pointerup', release);
      el.handle.addEventListener('pointercancel', release);
      el.handle.addEventListener('lostpointercapture', release);
      el.handle.addEventListener('keydown', function (e) {
        var k = e.key, d = null;
        if (k === 'ArrowUp' || k === 'ArrowRight') d = S.deg + 5;
        else if (k === 'ArrowDown' || k === 'ArrowLeft') d = S.deg - 5;
        else if (k === 'Home') d = MIN;
        else if (k === 'End') d = MAX;
        if (d === null) return;
        e.preventDefault(); toHand(); setDeg(d);
      });
    }

    function syncButton() {
      if (!el.btnSpring) return;
      el.btnSpring.textContent = S.attached ? TX().remove : TX().attach;
    }
    if (el.btnSpring) el.btnSpring.addEventListener('click', function () {
      S.attached = !S.attached;
      if (!S.attached && S.mode === 'scroll') toHand();
      S.omega = 0; S.resting = false;
      syncButton(); buildPlot(); start();
    });
    if (el.btnReset) el.btnReset.addEventListener('click', function () {
      S.attached = true; S.mode = 'scroll'; S.dragging = false; S.omega = 0; S.resting = false;
      clearGhosts(); syncButton(); buildPlot(); start();
    });

    buildPlot(); syncButton();
    document.addEventListener('irod:lang', function () { syncButton(); last.readout = ''; last.deg = NaN; start(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        near = en[en.length - 1].isIntersecting;
        if (near) start();
      }, { rootMargin: '100% 0px' }).observe(sec);
    } else { near = true; }
    start();
  }

  /* ----------------------------------------------------------- 2. REGISTER */
  var reg = null;
  function initRegister() {
    var sec = $('register'), img = $('reg-fig'), cap = $('reg-cap');
    var rows = sec ? sec.querySelectorAll('.reg__row') : [];
    if (!sec || !rows.length) return;
    var frame = sec.querySelector('.reg__frame');
    var mq = matchMedia('(min-width: 900px)');
    var active = sec.querySelector('.reg__row.is-active'), token = 0, swapTimer = 0, capRow = null;
    document.addEventListener('irod:lang', function () {
      var row = capRow || active;
      if (cap && row) cap.textContent = text(row, '.reg__t') + ', ' + text(row, '.reg__year');
    });

    function text(row, sel) {
      var n = row.querySelector(sel); if (!n) return '';
      var k = n.querySelector('[data-l="' + (vi() ? 'vi' : 'en') + '"]');
      return (k || n).textContent.trim();
    }
    function activate(row) {
      if (!mq.matches || !row || row === active) return;
      if (active) active.classList.remove('is-active');
      row.classList.add('is-active'); active = row;
      if (cap) cap.textContent = text(row, '.reg__t') + ', ' + text(row, '.reg__year');
      capRow = row;
      var src = row.getAttribute('data-fig');
      if (!img || !src || img.getAttribute('src') === src) return;
      var my = ++token, pre = new Image();
      if (frame) frame.classList.add('is-swapping');
      pre.onload = pre.onerror = function () {
        if (my !== token) return;
        setTimeout(function () {
          if (my !== token) return;
          img.setAttribute('src', src);
          clearTimeout(swapTimer);
          swapTimer = setTimeout(function () { if (frame) frame.classList.remove('is-swapping'); }, 90);
        }, 90);
      };
      pre.src = src;
    }
    Array.prototype.forEach.call(rows, function (row) {
      row.addEventListener('mouseenter', function () { activate(row); });
      row.addEventListener('focusin', function () { activate(row); });
    });
    reg = {
      onScroll: function () {
        if (!mq.matches) return;
        var r = sec.getBoundingClientRect(), vh = innerHeight;
        if (r.bottom < 0 || r.top > vh) return;
        var target = vh * 0.45, best = null, bd = Infinity;
        for (var i = 0; i < rows.length; i++) {
          var b = rows[i].getBoundingClientRect(), d = Math.abs(b.top + b.height / 2 - target);
          if (d < bd) { bd = d; best = rows[i]; }
        }
        activate(best);
      }
    };
    var onMq = function () { reg.onScroll(); };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
  }

  /* -------------------------------------------------------------- 3. FOLIO */
  var folio = null;
  function initFolio() {
    var nav = document.querySelector('.folio');
    var secs = document.querySelectorAll('section[data-chapter]');
    if (!nav || !secs.length) return;
    var code = nav.querySelector('.folio__code'), title = nav.querySelector('.folio__title'), cur = null;
    document.addEventListener('irod:lang', function () { cur = null; if (folio) folio.onScroll(); });
    folio = {
      onScroll: function () {
        var line = innerHeight * 0.4, pick = secs[0];
        for (var i = 0; i < secs.length; i++) if (secs[i].getBoundingClientRect().top <= line) pick = secs[i];
        if (pick === cur) return;
        cur = pick;
        if (code) code.textContent = pick.getAttribute('data-chapter') || '';
        if (title) title.textContent = (vi() && pick.getAttribute('data-chapter-title-vi')) || pick.getAttribute('data-chapter-title') || '';
        var g = pick.getAttribute('data-ground');
        if (g) document.body.dataset.ground = g;
      }
    };
  }

  /* ------------------------------------------------- shared scroll handler */
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      if (reg) reg.onScroll();
      if (folio) folio.onScroll();
    });
  }

  initArm();
  initRegister();
  initFolio();
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  onScroll();
})();

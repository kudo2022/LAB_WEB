/* IRoD Lab · ui.js
   Theme (light / dark) and language (EN / VI) switches, shared by every page.
   The <head> boot script has already set html[data-theme] and html[data-lang] before paint;
   this file wires the buttons, remembers the choice, and swaps the few things CSS cannot:
   the document title and translated attributes (aria-label, alt). */
(function () {
  'use strict';
  var d = document.documentElement;
  var TXT = {
    en: { toDark: 'Switch to dark mode', toLight: 'Switch to light mode' },
    vi: { toDark: 'Chuyển sang giao diện tối', toLight: 'Chuyển sang giao diện sáng' }
  };
  var titleEn = document.title;
  var titleVi = d.getAttribute('data-title-vi') || titleEn;

  function save(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lang() { return d.getAttribute('data-lang') === 'vi' ? 'vi' : 'en'; }
  function theme() { return d.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }

  function swapAttr(attr, viAttr, enAttr, l) {
    var nodes = document.querySelectorAll('[' + viAttr + ']');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (!n.hasAttribute(enAttr)) n.setAttribute(enAttr, n.getAttribute(attr) || '');
      n.setAttribute(attr, n.getAttribute(l === 'vi' ? viAttr : enAttr));
    }
  }

  function syncControls() {
    var l = lang(), th = theme();
    var segs = document.querySelectorAll('[data-set-lang]');
    for (var i = 0; i < segs.length; i++) segs[i].setAttribute('aria-pressed', segs[i].getAttribute('data-set-lang') === l ? 'true' : 'false');
    var tb = document.querySelectorAll('[data-theme-toggle]');
    for (var j = 0; j < tb.length; j++) tb[j].setAttribute('aria-label', TXT[l][th === 'dark' ? 'toLight' : 'toDark']);
  }

  function applyLang(l, quiet) {
    d.setAttribute('data-lang', l);
    d.lang = l;
    document.title = l === 'vi' ? titleVi : titleEn;
    swapAttr('aria-label', 'data-aria-vi', 'data-aria-en', l);
    swapAttr('alt', 'data-alt-vi', 'data-alt-en', l);
    syncControls();
    if (!quiet) {
      document.dispatchEvent(new CustomEvent('irod:lang', { detail: l }));
      // Text changed length: let the scroll engine re-measure and re-split kinetic lines.
      window.dispatchEvent(new Event('resize'));
    }
  }

  function applyTheme(th) {
    d.setAttribute('data-theme', th);
    syncControls();
    document.dispatchEvent(new CustomEvent('irod:theme', { detail: th }));
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-set-lang],[data-theme-toggle]') : null;
    if (!t) return;
    if (t.hasAttribute('data-set-lang')) {
      var l = t.getAttribute('data-set-lang');
      if (l !== lang()) { save('irod-lang', l); applyLang(l); }
    } else {
      var th = theme() === 'dark' ? 'light' : 'dark';
      save('irod-theme', th);
      d.classList.add('theme-anim');
      applyTheme(th);
      setTimeout(function () { d.classList.remove('theme-anim'); }, 400);
    }
  });

  // Follow the system setting live, until the visitor picks a theme themselves.
  try {
    var mq = matchMedia('(prefers-color-scheme: dark)');
    var follow = function (e) {
      var stored = null;
      try { stored = localStorage.getItem('irod-theme'); } catch (x) {}
      if (stored !== 'dark' && stored !== 'light') applyTheme(e.matches ? 'dark' : 'light');
    };
    if (mq.addEventListener) mq.addEventListener('change', follow); else if (mq.addListener) mq.addListener(follow);
  } catch (e) {}

  applyLang(lang(), true);
})();

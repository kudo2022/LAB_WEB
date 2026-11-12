/* Subpages: research category filter. Everything else is plain HTML. */
(function () {
  'use strict';
  var chips = document.querySelectorAll('.filter .chip');
  var rows = document.querySelectorAll('#plist .prow');
  var count = document.getElementById('proj-count');
  if (!chips.length || !rows.length) return;

  function apply(cat) {
    var n = 0;
    rows.forEach(function (r) {
      var show = cat === 'all' || (' ' + r.getAttribute('data-cats') + ' ').indexOf(' ' + cat + ' ') >= 0;
      r.hidden = !show;
      if (show) n++;
    });
    chips.forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-cat') === cat ? 'true' : 'false'); });
    if (count) count.textContent = n;
    try { history.replaceState(null, '', cat === 'all' ? location.pathname : '#cat=' + cat); } catch (e) {}
  }

  chips.forEach(function (c) { c.addEventListener('click', function () { apply(c.getAttribute('data-cat')); }); });
  var m = /#cat=([\w-]+)/.exec(location.hash);
  if (m && document.querySelector('.chip[data-cat="' + m[1] + '"]')) apply(m[1]);
})();

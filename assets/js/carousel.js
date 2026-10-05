(function () {
  var wrap = document.getElementById('eduCarousel');
  if (!wrap) return;

  var reduce = document.documentElement.classList.contains('reduce');
  var stage = wrap.querySelector('.carousel-stage');
  var items = Array.prototype.slice.call(wrap.querySelectorAll('.carousel-item'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('.edu-panel'));
  var count = wrap.querySelector('.carousel-count');
  var n = items.length;
  if (!n) return;

  var step = 360 / n;
  var pos = 0;      // selected card, unbounded so the ring always turns the short way
  var cur = 0;      // angle currently drawn, in degrees
  var drag = 0;     // extra angle while the pointer is dragging
  var raf = null;

  function active() { return ((pos % n) + n) % n; }

  function draw() {
    items.forEach(function (item, i) {
      var a = (i * step - cur) % 360;
      var rad = a * Math.PI / 180;
      var depth = (Math.cos(rad) + 1) / 2;
      item.style.setProperty('--a', a.toFixed(2));
      item.style.setProperty('--t', (Math.sin(rad) * 34).toFixed(2));
      item.style.setProperty('--d', depth.toFixed(3));
      item.style.zIndex = Math.round(depth * 100);
    });
  }

  function tick() {
    var goal = pos * step + drag;
    var diff = goal - cur;
    if (reduce || Math.abs(diff) < 0.05) { cur = goal; raf = null; draw(); return; }
    cur += diff * 0.12;
    draw();
    raf = requestAnimationFrame(tick);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(tick); }

  function go(next) {
    pos = next;
    var act = active();
    items.forEach(function (item, i) {
      var on = i === act;
      item.classList.toggle('is-active', on);
      var btn = item.querySelector('button');
      if (btn) btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    panels.forEach(function (panel, i) { panel.classList.toggle('is-active', i === act); });
    if (count) count.textContent = (act + 1) + ' / ' + n;
    kick();
  }

  var startX = null, dragged = false;

  items.forEach(function (item, i) {
    item.addEventListener('click', function () {
      if (dragged) return;
      var d = i - active();
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      go(pos + d);
    });
  });

  wrap.querySelectorAll('[data-dir]').forEach(function (btn) {
    btn.addEventListener('click', function () { go(pos + Number(btn.getAttribute('data-dir'))); });
  });

  wrap.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(pos - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(pos + 1); }
  });

  // drag / swipe
  stage.addEventListener('pointerdown', function (e) { startX = e.clientX; dragged = false; });
  window.addEventListener('pointermove', function (e) {
    if (startX === null) return;
    var dx = e.clientX - startX;
    if (Math.abs(dx) > 6) dragged = true;
    if (dragged) { drag = -dx * step / 260; kick(); }
  });
  function endDrag() {
    if (startX === null) return;
    startX = null;
    var raw = drag / step;
    var steps = Math.round(raw + (raw > 0 ? 0.25 : raw < 0 ? -0.25 : 0));
    drag = 0;
    go(pos + steps);
    setTimeout(function () { dragged = false; }, 0);
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  // same hover effect on the custom cursor as the rest of the site
  var ring = document.querySelector('.cursor-ring');
  if (ring) {
    wrap.querySelectorAll('button').forEach(function (el) {
      el.addEventListener('mouseenter', function () { ring.classList.add('big'); });
      el.addEventListener('mouseleave', function () { ring.classList.remove('big'); });
    });
  }

  go(0);
  cur = 0; draw();
})();
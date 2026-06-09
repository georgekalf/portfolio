(function () {
  var root = document.documentElement;
  var reduce = root.classList.contains('reduce');
  var canHover = window.matchMedia('(hover: hover)').matches;

  var toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('gk-theme', next); } catch (e) {}
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', next === 'light' ? '#E7EBDD' : '#0A130D');
    });
  }

  var name = document.querySelector('.hero-name');
  if (name) {
    var text = name.getAttribute('aria-label') || name.textContent;
    name.textContent = '';
    text.split('').forEach(function (ch) {
      var s = document.createElement('span');
      s.className = 'char'; s.setAttribute('aria-hidden', 'true');
      s.textContent = ch === ' ' ? '\u00A0' : ch;
      name.appendChild(s);
    });
  }

  var filterBtns = document.querySelectorAll('.filter-btn');
  if (filterBtns.length) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
        btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true');
        var f = btn.getAttribute('data-filter');
        document.querySelectorAll('.work-card[data-cat]').forEach(function (card) {
          var cats = card.getAttribute('data-cat') || '';
          var show = f === 'all' || cats.split(',').indexOf(f) !== -1;
          card.style.display = show ? '' : 'none';
        });
        if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
      });
    });
  }

  if (reduce || typeof gsap === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  if (typeof Lenis !== 'undefined') {
    var lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length > 1 && document.querySelector(id)) {
          e.preventDefault(); lenis.scrollTo(id, { offset: -50 });
        }
      });
    });
  }

  var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  if (document.querySelector('.hero-photo')) tl.to('.hero-photo', { opacity: 1, y: 0, scale: 1, duration: .7 });
  if (document.querySelector('.hero-eyebrow')) tl.to('.hero-eyebrow', { opacity: 1, y: 0, duration: .6 }, '-=0.3');
  if (document.querySelector('.hero-name .char')) tl.to('.hero-name .char', { opacity: 1, y: 0, stagger: 0.035, duration: .8 }, '-=0.2');
  if (document.querySelector('.hero-tagline')) tl.to('.hero-tagline', { opacity: 1, y: 0, duration: .7 }, '-=0.5');
  if (document.querySelector('.hero-cta-row')) tl.to('.hero-cta-row', { opacity: 1, y: 0, duration: .7 }, '-=0.5');
  if (document.querySelector('.chip')) tl.to('.chip', { opacity: 1, stagger: 0.08, duration: .6 }, '-=0.6');
  if (document.querySelector('.scroll-cue')) tl.to('.scroll-cue', { opacity: 1, y: 0, duration: .6 }, '-=0.3');

  gsap.utils.toArray('.reveal').forEach(function (el) {
    gsap.to(el, { opacity: 1, y: 0, duration: .9, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 86%' } });
  });

  gsap.utils.toArray('.stat-num').forEach(function (el) {
    var raw = el.textContent.trim();
    var m = raw.match(/^([^0-9]*)([0-9]+(?:\.[0-9]+)?)(.*)$/);
    if (!m) return;
    var prefix = m[1], target = parseFloat(m[2]), suffix = m[3];
    var dec = m[2].indexOf('.') !== -1 ? 1 : 0;
    var obj = { v: 0 };
    el.textContent = prefix + (0).toFixed(dec) + suffix;
    gsap.to(obj, { v: target, duration: 1.7, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 92%' },
      onUpdate: function () { el.textContent = prefix + obj.v.toFixed(dec) + suffix; },
      onComplete: function () { el.textContent = prefix + target.toFixed(dec) + suffix; } });
  });

  gsap.utils.toArray('.tl-item').forEach(function (item) {
    var card = item.querySelector('.tl-card');
    var d = item.querySelector('.tl-dot');
    var fromLeft = item.classList.contains('left');
    if (card) gsap.fromTo(card, { x: fromLeft ? -70 : 70, opacity: 0 },
      { x: 0, opacity: 1, duration: .8, ease: 'power3.out',
        scrollTrigger: { trigger: item, start: 'top 82%' } });
    if (d) gsap.fromTo(d, { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: .5, ease: 'back.out(1.7)',
        scrollTrigger: { trigger: item, start: 'top 82%' } });
  });

  if (document.querySelector('.hero')) {
    gsap.to('.hero-name', { yPercent: -34, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.orb', { yPercent: 26, scale: 1.1, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  var reel = document.getElementById('reel');
  if (reel && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { reel.classList.toggle('paused', !en.isIntersecting); });
    }).observe(reel);
  }

  if (!canHover) return;

  var chips = document.querySelector('.chips');
  if (chips) {
    window.addEventListener('mousemove', function (e) {
      var cx = e.clientX / window.innerWidth - 0.5;
      var cy = e.clientY / window.innerHeight - 0.5;
      chips.style.transform = 'translate(' + (cx * 26) + 'px,' + (cy * 26) + 'px)';
    });
  }

  document.querySelectorAll('.work-card').forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = 'rotateY(' + (px * 9) + 'deg) rotateX(' + (-py * 9) + 'deg) translateY(-4px)';
    });
    card.addEventListener('mouseleave', function () { card.style.transform = ''; });
  });

  var dot = document.querySelector('.cursor-dot');
  var ring = document.querySelector('.cursor-ring');
  if (dot && ring) {
    document.body.classList.add('has-cursor');
    var mx = 0, my = 0, rx = 0, ry = 0, started = false;
    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%)';
      if (!started) { started = true; dot.style.opacity = 1; ring.style.opacity = 1; }
    });
    (function loop() {
      rx += (mx - rx) * 0.15; ry += (my - ry) * 0.15;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
      requestAnimationFrame(loop);
    })();
    document.querySelectorAll('a, .btn, .work-card, .chip, .theme-toggle, .link-card').forEach(function (el) {
      el.addEventListener('mouseenter', function () { ring.classList.add('big'); });
      el.addEventListener('mouseleave', function () { ring.classList.remove('big'); });
    });
  }
})();
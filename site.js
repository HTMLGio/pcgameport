// PC Game Port site: theme toggle, menu bar clock, window buttons, library demo, copy buttons, dot field.
// Everything is optional decoration: the pages read fine with JavaScript off.
(() => {
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;

  // Theme (the head snippet applies a saved choice before first paint)
  const tb = $('#theme');
  const label = () => tb && tb.setAttribute('aria-label', isDark() ? 'Switch to light mode' : 'Switch to dark mode');
  if (tb) {
    label();
    tb.addEventListener('click', () => {
      root.dataset.theme = isDark() ? 'light' : 'dark';
      try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
      label();
    });
  }

  // Copyright year (the HTML holds a fallback for JavaScript off)
  $$('.year').forEach(el => { el.textContent = new Date().getFullYear(); });

  // Menu bar clock
  const clock = $('#clock');
  if (clock) {
    const tick = () => {
      const d = new Date(), t = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      clock.textContent = innerWidth >= 720 ? d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + '  ' + t : t;
    };
    tick(); setInterval(tick, 10000);
  }

  // Traffic lights: red/yellow collapse a window, green opens it
  $$('.win-bar button.light').forEach(b => b.addEventListener('click', () => {
    const w = b.closest('.win');
    if (b.classList.contains('g')) w.removeAttribute('data-closed'); else w.setAttribute('data-closed', '');
  }));

  // Copy buttons
  $$('.copy').forEach(b => b.addEventListener('click', () => {
    const text = $('pre', b.parentElement).textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => {
      b.textContent = 'Copied'; setTimeout(() => (b.textContent = 'Copy'), 1500);
    }, () => {});
  }));

  // Library demo: Play → Starting Windows… → Running with a live timer and RAM
  const demo = $('#demo');
  if (demo) {
    let running = 'ra2', starting = null, elapsed = 42 * 60 + 17, ram = 312;
    const p = n => String(n).padStart(2, '0');
    const render = () => {
      $('#demo-sub').textContent = running || starting ? '3 games · 1 running' : '3 games';
      $$('.game', demo).forEach(g => {
        const id = g.dataset.id, meta = $('.gmeta', g), btn = $('.play', g);
        if (id === starting) {
          meta.textContent = 'Starting Windows…';
          btn.disabled = true; btn.className = 'play'; btn.innerHTML = '<span class="spin"></span>'; btn.setAttribute('aria-label', 'Starting');
        } else if (id === running) {
          const e = elapsed;
          meta.innerHTML = `<span class="run">● Running</span> · <span class="t1">${p(Math.floor(e / 3600))}:${p(Math.floor(e / 60) % 60)}:${p(e % 60)}</span> · ${ram} MB`;
          btn.disabled = false; btn.className = 'play stop'; btn.textContent = 'Stop'; btn.removeAttribute('aria-label');
        } else {
          meta.textContent = g.dataset.meta;
          btn.disabled = !!starting; btn.className = 'play'; btn.textContent = 'Play'; btn.removeAttribute('aria-label');
        }
      });
    };
    demo.addEventListener('click', ev => {
      const g = ev.target.closest('.play') && ev.target.closest('.game');
      if (!g || starting) return;
      const id = g.dataset.id;
      if (running === id) { running = null; return render(); }
      starting = id; running = null; render();
      setTimeout(() => { starting = null; running = id; elapsed = 0; render(); }, 1100);
    });
    setInterval(() => { if (running) { elapsed++; ram = 300 + Math.round(Math.random() * 24); render(); } }, 1000);
    render();
  }

  // Feature tour: one feature at a time, cross-fading to the next. Each slide plays its own demo while shown:
  // the library opens a game's menu (CSS), the requirements check types itself, settings glide through both tabs.
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seen = (el, fn, threshold = .25) => new IntersectionObserver(es => es.forEach(e => e.isIntersecting && fn(e)), { threshold }).observe(el);
  $$('[data-reveal]').forEach(el => seen(el, () => el.classList.add('in'), .2));

  const tour = $('.tour');
  if (tour) {
    const slides = $$('.tour-row', tour);
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const ease = t => (t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
    let cur = 0, gen = 0, hover = false, onScreen = false, held = false;
    const live = g => g === gen && !held; // false once another slide took over or the visitor scrolled

    // Requirements: type the pasted text, then tick each line
    const input = $('.rq-in', tour), items = $$('.rq-out li', tour), text = input.textContent;
    const typeReqs = async g => {
      items.forEach(li => li.classList.remove('on'));
      input.textContent = ''; input.classList.add('typing');
      for (const ch of text) { if (g !== gen) return; input.textContent += ch; await wait(ch === '\n' ? 200 : 18); }
      input.classList.remove('typing');
      for (const li of items) { await wait(300); if (g !== gen) return; li.classList.add('on'); }
    };

    // Settings: a fixed-height window that scrolls through the Games tab, then General
    const stage = $('.sets-stage', tour), shots = $$('img', stage);
    const atEnd = () => stage.parentElement.classList.toggle('end', stage.scrollTop + stage.clientHeight >= stage.scrollHeight - 4);
    const showTab = n => { shots.forEach((im, k) => im.classList.toggle('on', k === n)); stage.scrollTop = 0; atEnd(); };
    const glide = (ms, g) => new Promise(done => {
      const from = stage.scrollTop, to = stage.scrollHeight - stage.clientHeight;
      let t0 = null;
      const step = now => {
        if (!live(g)) return done();
        t0 ??= now;
        const t = Math.min(1, (now - t0) / ms);
        stage.scrollTop = from + (to - from) * ease(t);
        t < 1 ? requestAnimationFrame(step) : done();
      };
      requestAnimationFrame(step);
    });
    const tourSettings = async g => {
      showTab(0);
      await wait(1000); if (!live(g)) return;
      await glide(4500, g); await wait(1200); if (!live(g)) return;
      showTab(1);
      await wait(800); if (!live(g)) return;
      await glide(2500, g);
    };
    stage.addEventListener('scroll', atEnd, { passive: true });
    shots.forEach(im => im.addEventListener('load', atEnd));
    // Scrolling inside the settings window means the visitor is reading: stop its auto-scroll
    ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(ev => stage.addEventListener(ev, () => (held = true), { passive: true }));

    let elapsed = 0;
    const dots = $$('.tour-icons button', tour), box = $('.tour-slides', tour), narrow = matchMedia('(max-width: 859px)');
    // Phones stack text over picture, so the features differ a lot in height: size the box to the one shown
    const fit = () => (box.style.height = narrow.matches && !calm ? slides[cur].offsetHeight + 'px' : '');
    addEventListener('resize', fit);
    $$('img', box).forEach(im => im.addEventListener('load', fit));
    // Show slide n. dir 1 rises in from below (next), -1 drops in from above (previous), 0 just restarts it.
    const go = (n, dir = 1) => {
      n = (n + slides.length) % slides.length;
      const from = slides[cur], to = slides[n];
      gen++; elapsed = 0; held = false;
      if (from !== to) { from.style.transform = `translateY(${-dir * 40}px)`; from.classList.remove('active'); }
      to.classList.remove('active');
      to.style.transition = 'none'; to.style.transform = dir ? `translateY(${dir * 40}px)` : '';
      void to.offsetWidth; // apply the start position, and restart the library's CSS animation
      to.style.transition = to.style.transform = '';
      to.classList.add('active');
      cur = n;
      fit();
      slides.forEach((s, k) => (s.inert = !calm && k !== n));
      dots.forEach((d, k) => d.setAttribute('aria-current', k === n));
      if (calm) { items.forEach(li => li.classList.add('on')); return; }
      if (slides[n].contains(input)) typeReqs(gen);
      if (slides[n].contains(stage)) tourSettings(gen);
    };
    dots.forEach((d, k) => d.addEventListener('click', () => k !== cur && go(k, k > cur ? 1 : -1)));
    $('.tour-ctl', tour).addEventListener('keydown', e => {
      const step = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[e.key];
      if (step) { e.preventDefault(); go(cur + step, step); }
    });
    // Swipe left or right on a phone
    let x0 = null, y0 = 0;
    box.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    box.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { const step = dx < 0 ? 1 : -1; go(cur + step, step); }
    }, { passive: true });
    tour.addEventListener('pointerenter', () => (hover = true));
    tour.addEventListener('pointerleave', () => (hover = false));

    // Auto-advance, paused while hovered, off screen or in a background tab (reduced motion: every feature shows, stacked)
    const times = slides.map(s => +s.dataset.time || 8000);
    let last = null, started = false;
    const frame = now => {
      if (last !== null && !hover && onScreen) {
        elapsed += Math.min(now - last, 100);
        if (elapsed >= times[cur]) go(cur + 1);
      }
      last = now;
      requestAnimationFrame(frame);
    };
    new IntersectionObserver(es => {
      onScreen = es[0].isIntersecting;
      if (onScreen && !started && !calm) { started = true; go(0, 0); requestAnimationFrame(frame); } // start from the first demo when first seen
    }, { threshold: .35 }).observe(tour);
    go(0, 0);
    // Links to a feature (#feat-…) scroll to the tour and show that slide, instead of jumping to a hidden one
    $$('a[href^="#feat-"]').forEach(a => a.addEventListener('click', e => {
      const k = slides.findIndex(s => '#' + s.id === a.getAttribute('href'));
      if (k < 0) return;
      e.preventDefault();
      if (!started && !calm) { started = true; requestAnimationFrame(frame); } // or the first-seen observer would restart at slide 0
      go(k, k === cur ? 0 : k > cur ? 1 : -1);
      (calm ? slides[k] : tour).scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: calm ? 'start' : 'center' });
    }));
  }

  // Dot field behind the windows. Starts after load so it never delays the first paint.
  const cv = $('.bg canvas');
  if (!cv) return;
  const start = () => {
    const ctx = cv.getContext('2d'), still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const G = 30, m = { x: -9999, y: -9999, tx: -9999, ty: -9999 }, pulses = [];
    let W = 0, H = 0, raf = 0, auto = performance.now();
    const size = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (still) draw(performance.now());
    };
    const draw = now => {
      const ink = getComputedStyle(root).getPropertyValue('--ink').trim() || '0,0,0';
      if (!still && now - auto > 3200 && pulses.length < 2) { auto = now; pulses.push({ x: W * (.15 + Math.random() * .7), y: H * (.2 + Math.random() * .6), t0: now, soft: true }); }
      m.x += (m.tx - m.x) * .12; m.y += (m.ty - m.y) * .12;
      ctx.clearRect(0, 0, W, H);
      const t = now * .001, sy = scrollY * .15 % G;
      for (let i = pulses.length - 1; i >= 0; i--) if (now - pulses[i].t0 > 2600) pulses.splice(i, 1);
      for (let y = -sy; y < H + G; y += G) for (let x = G / 2; x < W; x += G) {
        const wave = .5 + .5 * Math.sin(x * .006 + y * .009 - t * .6);
        const dx = x - m.x, dy = y - m.y, d = Math.sqrt(dx * dx + dy * dy);
        let hot = Math.max(0, 1 - d / 170); hot *= hot;
        for (const q of pulses) {
          const r = (now - q.t0) * .45, band = Math.max(0, 1 - Math.abs(Math.hypot(x - q.x, y - q.y) - r) / 36);
          hot = Math.max(hot, band * (1 - (now - q.t0) / 2600) * (q.soft ? .55 : 1));
        }
        let ox = 0, oy = 0;
        if (d < 170 && d > 0) { const push = (1 - d / 170) * 6; ox = dx / d * push; oy = dy / d * push; }
        ctx.fillStyle = `rgba(${ink},${(.05 + .07 * wave).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(x + ox, y + oy, 1.1, 0, 6.283); ctx.fill();
        if (hot > .02) { ctx.fillStyle = `rgba(227,64,31,${(hot * .85).toFixed(3)})`; ctx.beginPath(); ctx.arc(x + ox, y + oy, 1.1 + hot * 1.8, 0, 6.283); ctx.fill(); }
      }
      if (!still && !document.hidden) raf = requestAnimationFrame(draw);
    };
    addEventListener('resize', size);
    if (!still) {
      addEventListener('pointermove', e => { m.tx = e.clientX; m.ty = e.clientY; }, { passive: true });
      addEventListener('pointerdown', e => { if (pulses.length < 4) pulses.push({ x: e.clientX, y: e.clientY, t0: performance.now() }); }, { passive: true });
      document.addEventListener('visibilitychange', () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(draw); });
    }
    if (tb) tb.addEventListener('click', () => still && draw(performance.now()));
    size();
    if (!still) raf = requestAnimationFrame(draw);
  };
  const idle = window.requestIdleCallback || (f => setTimeout(f, 200));
  if (document.readyState === 'complete') idle(start); else addEventListener('load', () => idle(start));
})();

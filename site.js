(() => {
  const D = document, H = D.documentElement;
  const $ = (s, r = D) => r.querySelector(s), $$ = (s, r = D) => [...r.querySelectorAll(s)];
  const store = { get(k) { try { return localStorage.getItem(k) } catch { return null } }, set(k, v) { try { localStorage.setItem(k, v) } catch {} } };
  const motion = () => H.dataset.motion === 'on';
  const vi = () => H.lang === 'vi';
  const T = (en, v) => vi() ? v : en;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const ticks = new Set();
  const onscreen = (el, cb) => new IntersectionObserver(es => es.forEach(e => cb(e.isIntersecting)), { rootMargin: '10% 0px' }).observe(el);

  /* language */
  const langBtns = $$('[data-lang]');
  function setLang(l) {
    H.lang = l; store.set('lang', l);
    langBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === l));
    $$('[data-aria-en]').forEach(e => e.setAttribute('aria-label', l === 'vi' ? e.dataset.ariaVi : e.dataset.ariaEn));
    D.dispatchEvent(new CustomEvent('lang'));
  }
  langBtns.forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));

  /* UI / UX view */
  const vb = $('.view');
  function setView(v, quiet) {
    H.dataset.view = v; store.set('view', v);
    vb && vb.setAttribute('aria-pressed', v === 'ux');
    $$('.xr').forEach(x => x.classList.toggle('on', v === 'ux'));
    $$('.flip button').forEach(b => b.setAttribute('aria-pressed', v === 'ux'));
    if (!quiet) D.dispatchEvent(new CustomEvent('view'));
  }
  const flipView = () => setView(H.dataset.view === 'ux' ? 'ui' : 'ux');
  vb && vb.addEventListener('click', flipView);
  addEventListener('keydown', e => {
    if (e.key.toLowerCase() !== 'x' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && e.target.type !== 'range') return;
    flipView();
  });

  const bg = $('.burger'), lk = $('#links');
  if (bg) {
    const tog = v => { bg.setAttribute('aria-expanded', v); lk.classList.toggle('open', v) };
    bg.onclick = () => tog(bg.getAttribute('aria-expanded') !== 'true');
    lk.addEventListener('click', () => tog(false));
    addEventListener('keydown', e => e.key === 'Escape' && bg.getAttribute('aria-expanded') === 'true' && (tog(false), bg.focus()));
    D.addEventListener('pointerdown', e => !e.target.closest('.nav') && tog(false));
  }

  /* motion: respects the system setting, with a visible way to change it */
  const ask = $('.motion-ask');
  if (ask) {
    if (!store.get('motion') && matchMedia('(prefers-reduced-motion: reduce)').matches) ask.classList.add('show');
    $('.yes', ask).onclick = () => { store.set('motion', 'on'); location.reload() };
    $('.no', ask).onclick = () => { store.set('motion', 'off'); ask.classList.remove('show') };
  }
  const mt = $('#motion-toggle');
  if (mt) {
    const lab = () => { mt.textContent = motion() ? T('Turn motion off', 'Tắt chuyển động') : T('Turn motion on', 'Bật chuyển động') };
    lab(); D.addEventListener('lang', lab);
    mt.onclick = () => { store.set('motion', motion() ? 'off' : 'on'); location.reload() };
  }

  /* pointer */
  const ptr = { x: innerWidth * .7, y: innerHeight * .5, moved: 0 };
  addEventListener('pointermove', e => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.moved = performance.now() }, { passive: true });

  /* elastic type: every letter is a fill-container box, and the font's width axis does the resizing */
  const PX = 100, AX = [50, 100, 150], cache = {};
  function natural(ch) {
    if (cache[ch]) return cache[ch];
    const s = D.createElement('span');
    s.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:800 ${PX}px Anybody;letter-spacing:0`;
    s.textContent = ch; D.body.append(s);
    const r = AX.map(a => { s.style.fontVariationSettings = `"wdth" ${a},"wght" 800`; return s.getBoundingClientRect().width / PX });
    s.remove(); return cache[ch] = r;
  }
  class Elastic {
    constructor(els) {
      this.els = els; this.chars = [...els[0].dataset.text];
      this.sets = els.map(el => {
        el.textContent = ''; const gs = [];
        this.chars.forEach(c => {
          const g = D.createElement('span');
          if (c === ' ') g.className = 'sp'; else { g.className = 'g'; const i = D.createElement('i'); i.textContent = c; g.append(i); if (el.dataset.measure != null) g.append(D.createElement('b')); gs.push(g) }
          el.append(g);
        });
        return gs;
      });
      this.letters = this.chars.filter(c => c !== ' ');
      this.w = this.letters.map(() => 1); this.v = this.letters.map(() => 0);
      this.born = performance.now();
      this.measure();
    }
    measure() {
      this.nat = this.letters.map(natural);
      const el = this.els[0], cs = getComputedStyle(el);
      this.fs = parseFloat(cs.fontSize); this.W = el.clientWidth;
      this.sp = $$('.sp', el).reduce((a, s) => a + s.offsetWidth, 0);
      const r = el.getBoundingClientRect(); this.left = r.left; this.mid = r.top + r.height / 2; this.hh = r.height / 2;
    }
    place() { const r = this.els[0].getBoundingClientRect(); this.left = r.left; this.mid = r.top + r.height / 2; this.hh = r.height / 2 }
    step(now) {
      if (!this.W) return;
      this.place();
      const n = this.letters.length, t = (now - this.born) / 1000, idle = now - ptr.moved > 2600 || !ptr.moved;
      const tg = [];
      let x = 0; const sum = this.w.reduce((a, b, i) => a + b * this.nat[i][1], 0), avail = this.W - this.sp;
      const near = clamp(1 - (Math.abs(ptr.y - this.mid) - this.hh) / 160);
      for (let i = 0; i < n; i++) {
        const wd = this.w[i] * this.nat[i][1] / sum * avail, cx = this.left + x + wd / 2; x += wd;
        let k = 1;
        if (motion()) {
          if (idle) k = 1 + .34 * Math.sin(t * .9 - i * .85 + this.mid * .004);
          else k = 1 + 1.15 * near * Math.exp(-Math.pow((ptr.x - cx) / (this.W * .16), 2));
        }
        tg.push(k);
      }
      for (let i = 0; i < n; i++) {
        if (!motion()) { this.w[i] = 1; continue }
        this.v[i] += (tg[i] - this.w[i]) * .055; this.v[i] *= .8; this.w[i] += this.v[i];
      }
      this.paint();
    }
    paint() {
      const avail = this.W - this.sp, gap = this.fs * .035;
      const sum = this.w.reduce((a, b, i) => a + b * this.nat[i][1], 0);
      this.letters.forEach((_, i) => {
        const wd = this.w[i] * this.nat[i][1] / sum * avail, inner = wd - gap, nt = this.nat[i], want = inner / this.fs;
        let ax, got;
        if (want <= nt[0]) { ax = 50; got = nt[0] } else if (want >= nt[2]) { ax = 150; got = nt[2] }
        else if (want <= nt[1]) { ax = 50 + 50 * (want - nt[0]) / (nt[1] - nt[0] || 1); got = want } else { ax = 100 + 50 * (want - nt[1]) / (nt[2] - nt[1] || 1); got = want }
        const sx = want / got;
        this.sets.forEach(gs => {
          const g = gs[i], it = g.firstChild; g.style.width = wd.toFixed(2) + 'px';
          it.style.fontVariationSettings = `"wdth" ${ax.toFixed(1)},"wght" 800`;
          it.style.transform = `scaleX(${sx.toFixed(4)})`;
          if (g.lastChild !== it) g.lastChild.textContent = Math.round(wd);
        });
      });
    }
  }
  const groups = {};
  $$('.el').forEach(e => (groups[e.dataset.el] ||= []).push(e));
  const elastics = [];
  D.fonts.load('800 100px Anybody', 'Lê Huy Hoàng').then(() => D.fonts.ready).catch(() => {}).then(() => {
    Object.values(groups).forEach(els => { const e = new Elastic(els); elastics.push(e); e.paint(); e.vis = false; onscreen(els[0], v => e.vis = v) });
    ticks.add(now => elastics.forEach(e => e.vis && e.step(now)));
    $('.hero') && $('.hero').classList.add('in');
  });
  const remeasure = () => elastics.forEach(e => { e.measure(); e.paint() });
  addEventListener('resize', remeasure); D.addEventListener('lang', remeasure);

  /* hero lens */
  const hero = $('.hero');
  if (hero) {
    const ux = $('.face.ux', hero), ring = $('.ring path', hero), tilts = $$('.tilt', hero);
    const s = { x: 0, y: 0, vx: 0, vy: 0, r: 0, inside: false, t0: performance.now(), vis: true, full: 0 };
    let box = hero.getBoundingClientRect();
    const home = () => { const p = $('.hero-ph', hero).getBoundingClientRect(), h = hero.getBoundingClientRect(); return [p.left - h.left + p.width * .5, p.top - h.top + Math.min(p.height * .42, innerHeight * .5)] };
    [s.x, s.y] = home();
    onscreen(hero, v => s.vis = v);
    hero.addEventListener('pointerenter', () => s.inside = true);
    hero.addEventListener('pointerleave', () => s.inside = false);
    hero.addEventListener('pointerdown', () => s.inside = true);
    const N = 18;
    function path(cx, cy, R, ang, st, t, wob) {
      const pts = [];
      for (let i = 0; i < N; i++) {
        const a = i / N * Math.PI * 2, rr = R * (1 + wob * (.05 * Math.sin(3 * a + t * 1.7) + .035 * Math.sin(5 * a - t * 1.25)));
        const lx = Math.cos(a) * rr * (1 + st), ly = Math.sin(a) * rr * (1 - st * .45), c = Math.cos(ang), n = Math.sin(ang);
        pts.push([cx + lx * c - ly * n, cy + lx * n + ly * c]);
      }
      let d = `M${pts[0].map(v => v.toFixed(1)).join(' ')}`;
      for (let i = 0; i < N; i++) {
        const p0 = pts[(i + N - 1) % N], p1 = pts[i], p2 = pts[(i + 1) % N], p3 = pts[(i + 2) % N];
        d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
      }
      return d + 'Z';
    }
    ticks.add(now => {
      if (!s.vis) return;
      box = hero.getBoundingClientRect();
      const t = (now - s.t0) / 1000, full = H.dataset.view === 'ux', m = motion();
      const idle = !s.inside || now - ptr.moved > 4200;
      let [tx, ty] = home();
      const small = innerWidth < 1001;
      if (!idle) { tx = ptr.x - box.left; ty = ptr.y - box.top }
      else if (m) { tx += Math.sin(t * .55) * (small ? 30 : 190) - (small ? 0 : 120); ty += Math.cos(t * .8) * (small ? 90 : 150) }
      const k = m ? .075 : .5, dmp = m ? .74 : 0;
      s.vx = s.vx * dmp + (tx - s.x) * k; s.vy = s.vy * dmp + (ty - s.y) * k; s.x += s.vx; s.y += s.vy;
      const base = Math.min(box.width, 1600) * (small ? .27 : .125) + 24;
      const R = full ? Math.hypot(box.width, box.height) * 1.15 : base;
      s.r = m ? lerp(s.r, R, full || s.r > base * 1.3 ? .075 : .1) : R;
      const sp = Math.min(Math.hypot(s.vx, s.vy) / 110, .42) * (m && !full ? 1 : 0);
      const d = path(s.x, s.y, s.r, Math.atan2(s.vy, s.vx), sp, t, m && !full ? 1 : 0);
      ux.style.clipPath = `path('${d}')`; ring.setAttribute('d', d);
      ring.style.opacity = s.r > base * 2.4 ? 0 : 1;
      if (m && !small) {
        const px = clamp((ptr.x - box.left) / box.width) - .5, py = clamp((ptr.y - box.top) / box.height) - .5;
        s.rx = lerp(s.rx || 0, -py * 7, .07); s.ry = lerp(s.ry || 0, px * 12, .07);
        tilts.forEach(e => e.style.transform = `rotateX(${s.rx.toFixed(2)}deg) rotateY(${s.ry.toFixed(2)}deg)`);
      }
    });
  }

  /* x-ray on every other screen */
  $$('.xr').forEach(x => {
    if (x.closest('.hero')) return;
    const f = $('.xf', x), host = f.parentElement;
    const mv = e => {
      if (x.classList.contains('on')) return;
      const r = host.getBoundingClientRect(), sc = r.width / host.offsetWidth || 1;
      f.style.setProperty('--lx', (e.clientX - r.left) / sc + 'px'); f.style.setProperty('--ly', (e.clientY - r.top) / sc + 'px');
      f.style.setProperty('--lr', Math.max(70, Math.min(host.offsetWidth * .34, 170)) + 'px'); x.classList.add('hover');
    };
    const out = () => { x.classList.remove('hover'); f.style.setProperty('--lr', '0px') };
    x.addEventListener('pointermove', mv); x.addEventListener('pointerleave', out);
    x.addEventListener('pointerdown', mv); x.addEventListener('pointercancel', out);
  });
  $$('.flip button').forEach(b => b.addEventListener('click', flipView));

  /* layers */
  const ly = $('.layers');
  if (ly) {
    const run = $('.runway', ly), plates = $('.plates', ly), ps = $$('.plate', ly), li = $$('.ly-steps li', ly);
    let cur = -1, vis = false, sp = 0, foc = 0; onscreen(ly, v => vis = v);
    li.forEach((l, i) => $('button', l).addEventListener('click', () => {
      const top = run.getBoundingClientRect().top + scrollY, span = run.offsetHeight - innerHeight;
      scrollTo({ top: top + span * (i === 0 ? .04 : .2 + (i - 1) * .2 + .08), behavior: motion() ? 'smooth' : 'auto' });
    }));
    ticks.add(() => {
      if (!vis) return;
      const r = run.getBoundingClientRect(), p = clamp(-r.top / (r.height - innerHeight));
      sp = motion() ? lerp(sp, p, .12) : p;
      const open = ease(clamp(sp / .2)), n = p < .16 ? 0 : Math.min(4, 1 + Math.floor((p - .16) / .205));
      if (n !== cur) { cur = n; li.forEach((l, i) => { l.classList.toggle('on', i === n); $('button', l).setAttribute('aria-expanded', i === n) }); ps.forEach((e, i) => { e.classList.toggle('dim', n > 0 && i > n); e.classList.toggle('up', n > 0 && i < n) }) }
      const gap = plates.offsetWidth * .62, drift = (sp - .2) * 26; foc = motion() ? lerp(foc, Math.max(cur, 0), .09) : Math.max(cur, 0);
      plates.style.transform = `rotateX(${52 * open}deg) rotateZ(${(-34 + drift) * open}deg) scale(${1.08 - .22 * open})`;
      ps.forEach((e, i) => {
        const lift = (foc - i) * gap * open + (i < foc ? (foc - i) * gap * .25 * open : 0); const act = cur === i && cur > 0 ? 1 : 0; e._a = lerp(e._a || 0, act, .1);
        e.style.transform = `translate3d(${(-e._a * 34).toFixed(1)}px,${(e._a * 34).toFixed(1)}px,${(lift - i * .6).toFixed(1)}px)`;
      });
    });
  }

  /* stacked panels */
  const panels = $$('.panel');
  if (panels.length) ticks.add(() => {
    if (!motion() || innerWidth < 1001) return;
    panels.forEach((p, i) => {
      const n = panels[i + 1], inn = $('.in', p); if (!n) return;
      const k = clamp(1 - n.getBoundingClientRect().top / innerHeight);
      if (k === p._k) return; p._k = k;
      inn.style.transform = k ? `scale(${1 - k * .07})` : ''; inn.style.opacity = 1 - k * .5;
    });
    const par = $$('[data-par]');
    par.forEach(e => { const r = e.parentElement.getBoundingClientRect(); if (r.bottom < -300 || r.top > innerHeight + 300) return; const k = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; e.style.transform = `translate3d(0,${(k * +e.dataset.par).toFixed(1)}px,0)` });
  });
  const cols = $$('.wall .col');
  if (cols.length) {
    let vis = false; onscreen($('.wall'), v => vis = v);
    const t0 = performance.now();
    ticks.add(now => {
      if (!vis || !motion()) return;
      cols.forEach((c, i) => { const h = c.scrollHeight / 2; const o = ((now - t0) / 1000 * (16 + i * 4)) % h; c.style.transform = `translate3d(0,${i % 2 ? -h + o : -o}px,0)` });
    });
  }

  /* compare */
  $$('.cmp input').forEach(i => { const f = () => i.parentElement.style.setProperty('--x', i.value + '%'); i.addEventListener('input', f); f() });
  $$('.ba').forEach(b => {
    const bt = $$('.pick button', b), A = $('.cmp .a', b), B = $('.cmp .b', b), cap = $('.cap', b);
    bt.forEach(x => x.addEventListener('click', () => {
      bt.forEach(y => y.setAttribute('aria-pressed', y === x));
      A.src = x.dataset.a; B.src = x.dataset.b; $$('span[data-c]', cap).forEach(s => s.hidden = s.dataset.c !== x.dataset.i);
      const inp = $('input', b); inp.value = 50; inp.dispatchEvent(new Event('input'));
    }));
  });

  /* hover peek */
  const peek = $('.peek');
  if (peek && matchMedia('(hover:hover)').matches) {
    const im = $$('img', peek); let x = 0, y = 0, on = false;
    $$('[data-peek]').forEach(a => {
      a.addEventListener('pointerenter', e => { if (!on) { x = e.clientX; y = e.clientY } on = true; peek.classList.add('show'); im.forEach(g => g.classList.toggle('on', g.dataset.k === a.dataset.peek)) });
      a.addEventListener('pointerleave', () => { on = false; peek.classList.remove('show') });
    });
    ticks.add(() => { if (!on) return; const k = motion() ? .16 : 1; x = lerp(x, ptr.x, k); y = lerp(y, ptr.y, k); const px = Math.min(x + 28, innerWidth - 400), py = clamp(y - 120, 80, innerHeight - 260); peek.style.transform = `translate3d(${px}px,${py}px,0)` });
  }

  /* drag strips */
  $$('.strip').forEach(s => {
    let down = null;
    s.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = { x: e.clientX, l: s.scrollLeft } });
    addEventListener('pointermove', e => { if (!down) return; s.classList.add('drag'); s.scrollLeft = down.l - (e.clientX - down.x) });
    addEventListener('pointerup', () => { down = null; s.classList.remove('drag') });
  });

  /* decisions follow the screen */
  $$('.xs').forEach(x => {
    const li = $$('.dec li', x), mk = $$('.mk', x), dev = $('.xr', x);
    const hot = i => { li.forEach((l, j) => l.classList.toggle('hot', i === j)); mk.forEach(m => m.classList.toggle('hot', +m.dataset.n === i)) };
    let forced = false;
    const near = () => {
      const r = x.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
      let b = 0, bd = 1e9; li.forEach((l, i) => { const q = l.getBoundingClientRect(), d = Math.abs(q.top + q.height / 2 - innerHeight * .46); if (d < bd) { bd = d; b = i } });
      hot(b);
      const inside = r.top < innerHeight * .55 && r.bottom > innerHeight * .3;
      if (inside !== forced) { forced = inside; if (H.dataset.view !== 'ux') dev.classList.toggle('on', inside) }
    };
    addEventListener('scroll', near, { passive: true }); near();
    li.forEach((l, i) => l.addEventListener('pointerenter', () => hot(i)));
  });

  /* flows */
  $$('.flow').forEach(f => {
    const b = $$('.trk button', f), rules = $$('.rule > div', f);
    const go = i => { b.forEach((x, j) => { x.classList.toggle('past', j < i); j === i ? x.setAttribute('aria-current', 'step') : x.removeAttribute('aria-current') }); rules.forEach((r, j) => r.hidden = j !== i) };
    b.forEach((x, i) => { x.addEventListener('click', () => go(i)); x.addEventListener('keydown', e => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (d && b[i + d]) { e.preventDefault(); b[i + d].focus(); go(i + d) } }) });
    go(0);
    if (motion()) { let done = false; new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !done) { done = true; let i = 0; const run = () => { if (f.dataset.touched || i >= b.length) { if (!f.dataset.touched) go(0); return } go(i++); setTimeout(run, 260) }; run() } }), { threshold: .6 }).observe(f); f.addEventListener('pointerdown', () => f.dataset.touched = 1); f.addEventListener('keydown', () => f.dataset.touched = 1) }
  });

  /* CMS desk */
  $$('.dk').forEach(d => {
    const li = $$('.dk-l li', d), pa = $$('.pane', d);
    const go = i => { li.forEach((l, k) => { l.classList.toggle('on', k === i); $('button', l).setAttribute('aria-expanded', k === i) }); pa.forEach((p, k) => p.classList.toggle('on', k === i)) };
    li.forEach((l, i) => { const b = $('button', l); b.addEventListener('click', () => go(i)); b.addEventListener('keydown', e => { const n = e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowUp' ? i - 1 : -1; if (li[n]) { e.preventDefault(); $('button', li[n]).focus(); go(n) } }) });
  });

  /* copy mail */
  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    const keep = b.innerHTML;
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = T('Address copied', 'Đã chép địa chỉ') } catch { b.textContent = b.dataset.copy }
    setTimeout(() => b.innerHTML = keep, 2200);
  }));

  /* section marker in nav */
  const nl = $$('.links a[href*="#"]');
  if (nl.length && $('.hero')) {
    const map = nl.map(a => [a, D.getElementById(a.hash.slice(1))]).filter(x => x[1]);
    addEventListener('scroll', () => { let c = null; map.forEach(([a, s]) => { if (s.getBoundingClientRect().top < innerHeight * .4) c = a }); nl.forEach(a => a === c ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')) }, { passive: true });
  }

  /* scroll-lit statement */
  $$('.fill').forEach(p => {
    const f = () => { if (!motion()) return; const r = p.getBoundingClientRect(), k = clamp((innerHeight * .86 - r.top) / (r.height + innerHeight * .3)); $$(':scope > span', p).forEach(sp => { const w = $$('i', sp); w.forEach((x, i) => x.classList.toggle('lit', i < k * w.length)) }) };
    addEventListener('scroll', f, { passive: true }); f();
  });

  /* project filter */
  $$('.kinds button').forEach(b => b.addEventListener('click', () => {
    $$('.kinds button').forEach(x => x.setAttribute('aria-pressed', x === b));
    $$('.rows li').forEach(l => { const off = b.dataset.k !== 'all' && !l.dataset.k.split(' ').includes(b.dataset.k); l.classList.toggle('off', off); $('a', l).tabIndex = off ? -1 : 0 });
  }));

  /* elastic process columns */
  const pc = $$('.cols li');
  pc.forEach((l, i) => {
    const on = () => pc.forEach((x, k) => { x.classList.toggle('on', k === i); $('button', x).setAttribute('aria-expanded', k === i) });
    $('button', l).addEventListener('click', on);
    if (matchMedia('(hover:hover)').matches) l.addEventListener('pointerenter', on);
  });

  /* 30-second version */
  const bf = $('.brief');
  if (bf) {
    $$('[data-open-brief]').forEach(b => b.addEventListener('click', () => bf.showModal()));
    bf.addEventListener('click', e => e.target === bf && bf.close());
  }

  /* loto balls: grab one and throw it */
  const bx = $('.balls');
  if (bx) {
    const N = innerWidth < 700 ? 9 : 16, RED = '#c9352a', GRN = '#1f7a3f', nums = [8, 83, 86, 20, 27, 57, 39, 11, 45, 63, 5, 72, 18, 90, 34, 69];
    const B = []; let W, Hh, vis = false, hold = null;
    const size = () => { W = bx.clientWidth; Hh = bx.clientHeight }; size(); addEventListener('resize', size);
    for (let i = 0; i < N; i++) {
      const d = (innerWidth < 700 ? 54 : 74) + (i * 37 % 5) * 7, e = D.createElement('div');
      e.className = 'ball'; e.style.cssText = `--d:${d}px;--c:${i % 2 ? GRN : RED}`; e.innerHTML = `<b>${nums[i]}</b>`; bx.append(e);
      const o = { e, r: d / 2, x: (i + .5) / N * W, y: motion() ? -80 - (i * 61 % 400) : Hh - d / 2, vx: (i * 7 % 5 - 2) * .8, vy: 0, a: (i * 29 % 40) - 20, va: 0 };
      B.push(o);
      e.addEventListener('pointerdown', ev => { hold = o; o.px = ev.clientX; o.py = ev.clientY; e.setPointerCapture(ev.pointerId); ev.preventDefault() });
      e.addEventListener('pointermove', ev => { if (hold !== o) return; const r = bx.getBoundingClientRect(); const nx = ev.clientX - r.left, ny = ev.clientY - r.top; o.vx = clamp((nx - o.x) * .6, -34, 34); o.vy = clamp((ny - o.y) * .6, -34, 34); o.x = nx; o.y = ny; if (!motion()) draw(o) });
      const up = () => { if (hold === o) hold = null }; e.addEventListener('pointerup', up); e.addEventListener('pointercancel', up);
    }
    const draw = o => o.e.style.transform = `translate3d(${(o.x - o.r).toFixed(1)}px,${(o.y - o.r).toFixed(1)}px,0) rotate(${o.a.toFixed(1)}deg)`;
    B.forEach(draw);
    new IntersectionObserver(es => es.forEach(e => vis = e.isIntersecting), { threshold: .15 }).observe(bx);
    ticks.add(() => {
      if (!vis || !motion()) return;
      for (let s = 0; s < 2; s++) {
        B.forEach(o => {
          if (o === hold) return;
          o.vy += .3; o.vx *= .997; o.x += o.vx * .5; o.y += o.vy * .5;
          if (o.x < o.r) { o.x = o.r; o.vx *= -.6 } if (o.x > W - o.r) { o.x = W - o.r; o.vx *= -.6 }
          if (o.y > Hh - o.r) { o.y = Hh - o.r; o.vy *= -.46; if (Math.abs(o.vy) < .9) o.vy = 0; o.vx *= .975 }
          o.a += o.vx * 28 / o.r * .5;
        });
        for (let i = 0; i < N; i++) for (let k = i + 1; k < N; k++) {
          const p = B[i], q = B[k], dx = q.x - p.x, dy = q.y - p.y, m = p.r + q.r, dd = dx * dx + dy * dy;
          if (dd >= m * m || !dd) continue;
          const l = Math.sqrt(dd), nx = dx / l, ny = dy / l, ov = (m - l) / 2, pf = p === hold ? 0 : q === hold ? 2 : 1, qf = 2 - pf;
          p.x -= nx * ov * pf; p.y -= ny * ov * pf; q.x += nx * ov * qf; q.y += ny * ov * qf;
          const rv = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny; if (rv > 0) continue;
          const im = rv * .72; if (p !== hold) { p.vx += im * nx; p.vy += im * ny } if (q !== hold) { q.vx -= im * nx; q.vy -= im * ny }
        }
      }
      B.forEach(draw);
    });
  }

  /* contents bar on case pages */
  const toc = $('.toc');
  if (toc) {
    const as = $$('a', toc), se = as.map(a => D.getElementById(a.hash.slice(1))), art = $('.case');
    const f = () => {
      const r = art.getBoundingClientRect(), k = clamp(-r.top / (r.height - innerHeight)); toc.style.setProperty('--p', k);
      toc.classList.toggle('show', r.top < -innerHeight * .5 && r.bottom > innerHeight * .75);
      let c = -1; se.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * .45) c = i });
      as.forEach((a, i) => i === c ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'));
    };
    addEventListener('scroll', f, { passive: true }); f();
  }

  const loop = now => { ticks.forEach(f => f(now)); requestAnimationFrame(loop) };
  requestAnimationFrame(loop);
  window.PF = { T, D, $, $$, motion };
  setLang(H.lang); setView(H.dataset.view || 'ui', true);
})();

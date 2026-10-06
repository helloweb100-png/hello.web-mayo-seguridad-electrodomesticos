/* ==========================================================================
   MAYO Seguridad Electrónicos · Interacciones y animaciones
   Vanilla JS, sin dependencias. Cada módulo es independiente y falla en silencio
   si su HTML no existe. Respeta prefers-reduced-motion.
   ========================================================================== */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* Configuración del negocio (un solo lugar para cambiar el número) */
  const WA_NUMBER = '529612289511';

  /* ------------------------------------------------------------------------
     1 · LOADER
     ------------------------------------------------------------------------ */
  const loader = $('#loader');
  const ldFill = $('#ldFill');
  const ldPct = $('#ldPct');
  const ldMsg = $('#ldMsg');
  const MESSAGES = [[0, 'Iniciando sistemas'], [25, 'Verificando cámaras'], [50, 'Armando alarmas'], [75, 'Conectando GPS'], [96, 'Todo listo']];
  let booted = false;

  function boot() {
    if (booted) return;
    booted = true;
    initAll();
    root.classList.remove('is-loading');
    if (loader) {
      loader.classList.add('is-done');
      loader.setAttribute('aria-busy', 'false');
      setTimeout(() => loader.classList.add('is-gone'), 1500);
    }
    setTimeout(() => root.classList.add('is-ready'), loader ? 450 : 0);
    setTimeout(startCounters, loader ? 1500 : 600);
    setTimeout(() => $('#wa') && $('#wa').classList.add('is-in'), loader ? 2200 : 1200);
    setTimeout(() => showTip(7000), loader ? 7500 : 6500);
  }

  function runLoader() {
    if (!loader) { boot(); return; }
    const minMs = reduced ? 500 : 2700;
    const t0 = performance.now();
    let resourcesReady = false;
    let finishAt = 0;
    let lastMsg = -1;

    const loaded = new Promise(res => (document.readyState === 'complete' ? res() : window.addEventListener('load', res, { once: true })));
    const fonts = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 3500))]) : Promise.resolve();
    Promise.all([loaded, fonts]).then(() => { resourcesReady = true; });
    setTimeout(boot, 9000); // seguro: nunca dejar al usuario atrapado

    const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    (function tick(now) {
      if (booted) return;
      const t = now - t0;
      let p = .9 * ease(clamp(t / minMs, 0, 1));
      if (resourcesReady && t >= minMs) {
        if (!finishAt) finishAt = now;
        p = .9 + .1 * clamp((now - finishAt) / 420, 0, 1);
      }
      const pct = Math.round(p * 100);
      ldFill.style.transform = 'scaleX(' + p + ')';
      ldPct.textContent = pct;
      const mi = MESSAGES.reduce((acc, m, i) => (pct >= m[0] ? i : acc), 0);
      if (mi !== lastMsg) { lastMsg = mi; ldMsg.textContent = MESSAGES[mi][1]; }
      if (p >= 1) { setTimeout(boot, 250); return; }
      requestAnimationFrame(tick);
    })(t0);
  }

  /* ------------------------------------------------------------------------
     2 · INICIALIZACIÓN DE MÓDULOS (después del loader)
     ------------------------------------------------------------------------ */
  function initAll() {
    [splitHeadings, initReveal, initNav, initMenu, initScrollFx, initPointerFx, initHeroNet, initCycle, initHud,
      initMarquees, initTabs, initAccordion, initForm, initPick, initMisc].forEach(fn => {
      try { fn(); } catch (e) { console.warn('[MAYO] módulo con error:', fn.name, e); }
    });
  }

  /* ------------------------------------------------------------------------
     3 · TITULARES: palabra por palabra
     ------------------------------------------------------------------------ */
  function splitHeadings() {
    $$('.split').forEach(el => {
      let i = 0;
      const wrap = node => {
        Array.from(node.childNodes).forEach(child => {
          if (child.nodeType === 3) {
            const frag = document.createDocumentFragment();
            child.textContent.split(/(\s+)/).forEach(part => {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
              const w = document.createElement('span'); w.className = 'w';
              const wi = document.createElement('span'); wi.className = 'wi';
              wi.style.setProperty('--i', i++); wi.textContent = part;
              w.appendChild(wi); frag.appendChild(w);
            });
            node.replaceChild(frag, child);
          } else if (child.nodeType === 1) {
            wrap(child);
          }
        });
      };
      wrap(el);
    });
  }

  /* ------------------------------------------------------------------------
     4 · REVEAL AL HACER SCROLL
     ------------------------------------------------------------------------ */
  function initReveal() {
    const items = $$('.rv, .split');
    if (!('IntersectionObserver' in window) || reduced) { items.forEach(e => e.classList.add('is-in', 'rv-done')); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const el = en.target;
        el.classList.add('is-in');
        io.unobserve(el);
        setTimeout(() => el.classList.add('rv-done'), 2400);
      });
    }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(e => io.observe(e));
  }

  /* ------------------------------------------------------------------------
     5 · NAVEGACIÓN + MENÚ MÓVIL
     ------------------------------------------------------------------------ */
  const nav = $('#nav');
  const burger = $('#burger');
  const menu = $('#menu');
  const isMenuOpen = () => menu && menu.classList.contains('is-open');

  function initNav() {
    if (!nav || !('IntersectionObserver' in window)) return;
    const links = new Map($$('.nav-links a').map(a => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        const a = links.get(en.target.id);
        if (a && en.isIntersecting) { links.forEach(l => l.classList.remove('is-active')); a.classList.add('is-active'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  function setMenu(open) {
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    root.classList.toggle('menu-open', open);
    if (open) nav.classList.remove('is-hidden');
  }
  function initMenu() {
    if (!burger || !menu) return;
    $$('.menu-in a').forEach((a, i) => a.style.setProperty('--i', i));
    burger.addEventListener('click', () => setMenu(!isMenuOpen()));
    $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && isMenuOpen()) { setMenu(false); burger.focus(); } });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', e => { if (e.matches) setMenu(false); });
  }

  /* ------------------------------------------------------------------------
     6 · EFECTOS LIGADOS AL SCROLL (un solo listener con rAF)
     ------------------------------------------------------------------------ */
  function initScrollFx() {
    const bar = $('#progressBar');
    const toTop = $('#toTop');
    const steps = $('#steps');
    const stepEls = $$('.step');
    const parallax = $$('[data-parallax-img]');
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const vh = window.innerHeight;
      const max = document.documentElement.scrollHeight - vh;
      if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1) : 0) + ')';
      if (nav) {
        nav.classList.toggle('is-scrolled', y > 12);
        if (!isMenuOpen()) {
          if (y > lastY + 6 && y > 560) nav.classList.add('is-hidden');
          else if (y < lastY - 6 || y < 560) nav.classList.remove('is-hidden');
        }
      }
      lastY = y;

      if (steps) {
        const r = steps.getBoundingClientRect();
        const p = clamp((vh * .8 - r.top) / Math.max(vh * .45, r.height * .85), 0, 1);
        steps.style.setProperty('--p', p.toFixed(3));
        stepEls.forEach((s, i) => s.classList.toggle('is-lit', p * 1.12 >= i / stepEls.length + .08));
      }
      if (!reduced) {
        parallax.forEach(img => {
          const r = img.getBoundingClientRect();
          if (r.bottom < -100 || r.top > vh + 100) return;
          img.style.setProperty('--py', ((r.top + r.height / 2 - vh / 2) * -.07).toFixed(1) + 'px');
        });
      }
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
    if (toTop) toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }));
  }

  /* ------------------------------------------------------------------------
     7 · EFECTOS DE PUNTERO: luz, spotlight, imanes, tilt
     ------------------------------------------------------------------------ */
  function initPointerFx() {
    if (!finePointer) return;

    // Luz suave que sigue al cursor
    const glow = $('#cursorGlow');
    if (glow && !reduced) {
      let tx = 0, ty = 0, cx = 0, cy = 0, running = false;
      const loop = () => {
        cx = lerp(cx, tx, .12); cy = lerp(cy, ty, .12);
        glow.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
        if (Math.abs(tx - cx) > .3 || Math.abs(ty - cy) > .3) requestAnimationFrame(loop); else running = false;
      };
      window.addEventListener('pointermove', e => {
        tx = e.clientX; ty = e.clientY; glow.classList.add('is-on');
        if (!running) { running = true; requestAnimationFrame(loop); }
      }, { passive: true });
      document.addEventListener('mouseleave', () => glow.classList.remove('is-on'));
    }

    // Spotlight en tarjetas
    document.addEventListener('pointermove', e => {
      const card = e.target.closest && e.target.closest('.spot');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });

    if (reduced) return;

    // Botones magnéticos
    $$('.mag').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--tx', ((e.clientX - r.left - r.width / 2) * .22).toFixed(1) + 'px');
        el.style.setProperty('--ty', ((e.clientY - r.top - r.height / 2) * .32).toFixed(1) + 'px');
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--tx', '0px'); el.style.setProperty('--ty', '0px'); });
    });

    // Tilt 3D en fotos
    $$('[data-tilt]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5;
        const y = (e.clientY - r.top) / r.height - .5;
        el.style.transform = 'perspective(900px) rotateY(' + (x * 9).toFixed(2) + 'deg) rotateX(' + (-y * 9).toFixed(2) + 'deg) translateZ(0)';
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    // Parallax del panel HUD con el mouse
    const hero = $('#inicio');
    const hud = $('#hud');
    if (hero && hud) {
      hero.addEventListener('pointermove', e => {
        const r = hero.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5;
        const y = (e.clientY - r.top) / r.height - .5;
        hud.style.transform = 'perspective(1000px) rotateY(' + (x * 12).toFixed(2) + 'deg) rotateX(' + (-y * 12).toFixed(2) + 'deg)';
      });
      hero.addEventListener('pointerleave', () => { hud.style.transform = ''; });
    }
  }

  /* ------------------------------------------------------------------------
     8 · HERO: red de partículas (canvas)
     ------------------------------------------------------------------------ */
  function initHeroNet() {
    const canvas = $('#net');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const hero = $('#inicio');
    let w = 0, h = 0, dpr = 1, nodes = [], packets = [], visible = true, rafId = 0, lastPacket = 0;
    const mouse = { x: -9999, y: -9999 };
    const LINK = 135;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = clamp(Math.round((w * h) / (w < 700 ? 15000 : 12500)), 26, 95);
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - .5) * .32, vy: (Math.random() - .5) * .32,
        r: Math.random() * 1.6 + .9, amber: Math.random() < .12
      }));
      packets = [];
      if (reduced) frame(0);
    }

    function frame(now) {
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        if (!reduced) {
          n.x += n.vx; n.y += n.vy;
          if (n.x < -20) n.x = w + 20; else if (n.x > w + 20) n.x = -20;
          if (n.y < -20) n.y = h + 20; else if (n.y > h + 20) n.y = -20;
          const dx = n.x - mouse.x, dy = n.y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < 15000) { const f = (1 - d2 / 15000) * .6; n.x += dx * f * .04; n.y += dy * f * .04; }
        }
      }
      // enlaces
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y, d = dx * dx + dy * dy;
          if (d < LINK * LINK) {
            ctx.strokeStyle = 'rgba(110,180,255,' + ((1 - Math.sqrt(d) / LINK) * .32).toFixed(3) + ')';
            ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        // enlace con el cursor
        const mx = a.x - mouse.x, my = a.y - mouse.y, md = mx * mx + my * my;
        if (md < 190 * 190) {
          ctx.strokeStyle = 'rgba(255,201,61,' + ((1 - Math.sqrt(md) / 190) * .55).toFixed(3) + ')';
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
      // nodos
      for (const n of nodes) {
        ctx.fillStyle = n.amber ? 'rgba(255,201,61,.95)' : 'rgba(143,208,255,.85)';
        ctx.shadowColor = n.amber ? 'rgba(255,179,0,.9)' : 'rgba(47,140,255,.9)';
        ctx.shadowBlur = n.amber ? 12 : 8;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.2832); ctx.fill();
      }
      ctx.shadowBlur = 0;
      // paquetes de datos viajando por los enlaces
      if (!reduced) {
        if (now - lastPacket > 650 && packets.length < 9) {
          lastPacket = now;
          const a = nodes[(Math.random() * nodes.length) | 0];
          const near = nodes.filter(b => b !== a && (a.x - b.x) ** 2 + (a.y - b.y) ** 2 < LINK * LINK);
          if (near.length) packets.push({ a, b: near[(Math.random() * near.length) | 0], t: 0, s: .012 + Math.random() * .012 });
        }
        packets = packets.filter(p => {
          p.t += p.s;
          if (p.t >= 1) return false;
          const x = lerp(p.a.x, p.b.x, p.t), y = lerp(p.a.y, p.b.y, p.t);
          ctx.fillStyle = '#ffd769'; ctx.shadowColor = '#ffb300'; ctx.shadowBlur = 14;
          ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 6.2832); ctx.fill(); ctx.shadowBlur = 0;
          return true;
        });
      }
      if (!reduced && visible && !document.hidden) rafId = requestAnimationFrame(frame);
      else rafId = 0;
    }

    const start = () => { if (!rafId && !reduced) rafId = requestAnimationFrame(frame); };
    resize(); start();
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { resize(); start(); }, 150); });
    hero.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; }, { passive: true });
    hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
    document.addEventListener('visibilitychange', start);
    if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) start(); }).observe(hero);
  }

  /* ------------------------------------------------------------------------
     9 · HERO: palabra rotatoria + HUD vivo + contadores
     ------------------------------------------------------------------------ */
  function initCycle() {
    const box = $('#cycle');
    if (!box) return;
    const words = (box.dataset.words || '').split(',').map(s => s.trim()).filter(Boolean);
    if (words.length < 2) return;
    let idx = 0;
    const fit = () => { const cur = $('.cw.is-on', box); if (cur) box.style.width = Math.ceil(cur.getBoundingClientRect().width) + 'px'; };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(fit);
    window.addEventListener('resize', fit);
    if (reduced) return;
    setInterval(() => {
      if (document.hidden) return;
      idx = (idx + 1) % words.length;
      const old = $('.cw.is-on', box);
      const next = document.createElement('span');
      next.className = 'cw is-on'; next.textContent = words[idx];
      if (old) { old.classList.remove('is-on'); old.classList.add('is-off'); setTimeout(() => old.remove(), 700); }
      box.appendChild(next);
      box.style.width = Math.ceil(next.getBoundingClientRect().width) + 'px';
    }, 2800);
  }

  function initHud() {
    const pad = n => String(n).padStart(2, '0');
    const clockEls = [$('#hudClock'), $('#camTime')].filter(Boolean);
    const tick = () => { const d = new Date(); const t = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); clockEls.forEach(e => { e.textContent = t; }); };
    tick(); setInterval(tick, 1000);

    const states = { cam: ['En vivo', 'Grabando', 'Detectando'], alarm: ['Armada', 'Vigilando', 'Protegida'], gate: ['Cerrado', 'Abriendo…', 'Abierto', 'Cerrando…'], gps: ['En ruta', 'Ubicado', 'Conectado'] };
    Object.keys(states).forEach((key, k) => {
      const el = $('[data-status="' + key + '"]');
      if (!el || reduced) return;
      let i = 0;
      setTimeout(() => setInterval(() => {
        if (document.hidden) return;
        i = (i + 1) % states[key].length;
        el.style.transition = 'opacity .25s'; el.style.opacity = 0;
        setTimeout(() => { el.textContent = states[key][i]; el.style.opacity = 1; }, 260);
      }, 3200), k * 700);
    });
  }

  let countersDone = false;
  function startCounters() {
    if (countersDone) return; countersDone = true;
    $$('[data-count]').forEach(el => {
      const target = parseInt(el.dataset.count, 10) || 0;
      if (reduced) { el.textContent = target; return; }
      const t0 = performance.now(), dur = 1700;
      el.textContent = '0';
      (function step(now) {
        const t = clamp((now - t0) / dur, 0, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
        if (t < 1) requestAnimationFrame(step);
      })(t0);
    });
  }

  /* ------------------------------------------------------------------------
     10 · MARQUESINAS infinitas
     ------------------------------------------------------------------------ */
  function initMarquees() {
    const build = () => $$('[data-marquee]').forEach(track => {
      if (!track.dataset.original) track.dataset.original = track.innerHTML;
      track.innerHTML = track.dataset.original;
      const original = Array.from(track.children);
      let setW = track.scrollWidth;
      const need = Math.ceil((window.innerWidth + 50) / Math.max(setW, 1));
      for (let k = 1; k < need; k++) original.forEach(n => track.appendChild(n.cloneNode(true)));
      setW = track.scrollWidth;
      Array.from(track.children).forEach(n => track.appendChild(n.cloneNode(true)));
      Array.from(track.children).slice(Array.from(track.children).length / 2).forEach(n => n.setAttribute('aria-hidden', 'true'));
      track.style.setProperty('--mq-dur', (setW / (track.closest('.marquee--brands') ? 50 : 62)).toFixed(1) + 's');
      track.classList.toggle('is-rev', track.dataset.dir === '-1');
    });
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(build);
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 250); });
  }

  /* ------------------------------------------------------------------------
     11 · TABS de soluciones
     ------------------------------------------------------------------------ */
  function initTabs() {
    const list = $('.tabs');
    if (!list) return;
    const tabs = $$('.tab', list);
    const panels = $$('.panel');
    const ind = $('.tab-ind', list);
    const place = tab => {
      ind.style.setProperty('--x', tab.offsetLeft + 'px');
      ind.style.setProperty('--w', tab.offsetWidth + 'px');
    };
    const select = (tab, focus) => {
      tabs.forEach(t => { const on = t === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
      panels.forEach(p => { const on = p.id === tab.getAttribute('aria-controls'); p.hidden = !on; p.classList.toggle('is-active', on); });
      place(tab);
      if (list.scrollWidth > list.clientWidth) list.scrollTo({ left: tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2, behavior: reduced ? 'auto' : 'smooth' });
      if (focus) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', e => {
        const k = e.key; let n = null;
        if (k === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        else if (k === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (k === 'Home') n = tabs[0];
        else if (k === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
    const current = () => tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0];
    place(current());
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => place(current()));
    window.addEventListener('resize', () => place(current()));
  }

  /* ------------------------------------------------------------------------
     12 · ACORDEÓN (FAQ)
     ------------------------------------------------------------------------ */
  function initAccordion() {
    const items = $$('.acc-item');
    items.forEach(item => {
      const btn = $('.acc-btn', item);
      btn.addEventListener('click', () => {
        const open = !item.classList.contains('is-open');
        items.forEach(o => { o.classList.remove('is-open'); $('.acc-btn', o).setAttribute('aria-expanded', 'false'); });
        if (open) { item.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
      });
    });
    if (items[0]) { items[0].classList.add('is-open'); $('.acc-btn', items[0]).setAttribute('aria-expanded', 'true'); }
  }

  /* ------------------------------------------------------------------------
     13 · FORMULARIO → WHATSAPP
     ------------------------------------------------------------------------ */
  function initForm() {
    const form = $('#quoteForm');
    if (!form) return;
    const f = { name: $('#f-name'), phone: $('#f-phone'), service: $('#f-service'), msg: $('#f-msg') };
    const err = { name: $('#e-name'), phone: $('#e-phone'), service: $('#e-service') };
    const ok = $('#formOk'), okLink = $('#formOkLink'), btn = $('#formBtn');

    const setErr = (key, text) => {
      err[key].textContent = text;
      f[key].closest('.field').classList.toggle('is-invalid', !!text);
      f[key].setAttribute('aria-invalid', text ? 'true' : 'false');
    };
    const validate = () => {
      let first = null;
      const name = f.name.value.trim();
      const digits = f.phone.value.replace(/\D/g, '');
      if (name.length < 2) { setErr('name', 'Escribe tu nombre para saber cómo llamarte.'); first = first || f.name; } else setErr('name', '');
      if (digits.length < 8) { setErr('phone', 'Escribe un teléfono válido (mínimo 8 dígitos).'); first = first || f.phone; } else setErr('phone', '');
      if (!f.service.value) { setErr('service', 'Elige qué necesitas.'); first = first || f.service; } else setErr('service', '');
      return first;
    };
    ['name', 'phone', 'service'].forEach(k => f[k].addEventListener('input', () => { if (err[k].textContent) validate(); }));
    f.service.addEventListener('change', () => { if (err.service.textContent) validate(); });

    form.addEventListener('submit', e => {
      e.preventDefault();
      const bad = validate();
      if (bad) { bad.focus(); return; }
      const lines = [
        'Hola, soy ' + f.name.value.trim() + '.',
        'Me interesa: ' + f.service.value + '.',
        f.msg.value.trim() ? f.msg.value.trim() : '',
        'Mi teléfono: ' + f.phone.value.trim(),
        '(Mensaje enviado desde la página web)'
      ].filter(Boolean);
      const url = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(lines.join('\n'));
      okLink.href = url; ok.hidden = false;
      const label = $('span', btn), prev = label.textContent;
      label.textContent = 'Abriendo WhatsApp…'; btn.disabled = true;
      window.open(url, '_blank', 'noopener');
      setTimeout(() => { label.textContent = prev; btn.disabled = false; }, 2500);
    });
  }

  // Los botones "Quiero mis cámaras", etc. preseleccionan el servicio en el formulario
  function initPick() {
    const select = $('#f-service'), msg = $('#f-msg');
    if (!select) return;
    let autoMsg = '';
    $$('[data-pick]').forEach(a => a.addEventListener('click', () => {
      const pick = a.dataset.pick;
      if (Array.from(select.options).some(o => o.value === pick)) select.value = pick;
      const text = a.dataset.msg;
      if (text && (!msg.value.trim() || msg.value === autoMsg)) { msg.value = text; autoMsg = text; }
      else if (!text && msg.value === autoMsg) { msg.value = ''; autoMsg = ''; }
    }));
  }

  /* ------------------------------------------------------------------------
     14 · VARIOS
     ------------------------------------------------------------------------ */
  let tipTimer;
  function showTip(ms) {
    const wa = $('#wa'); if (!wa) return;
    wa.classList.add('show-tip');
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => wa.classList.remove('show-tip'), ms);
  }
  function initMisc() {
    const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
    if (reduced) $$('svg').forEach(s => { if (s.pauseAnimations) s.pauseAnimations(); });
    setInterval(() => { if (!document.hidden) showTip(6000); }, 45000);
  }

  /* ------------------------------------------------------------------------
     ARRANQUE
     ------------------------------------------------------------------------ */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', runLoader);
  else runLoader();
})();

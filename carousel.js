/* carousel.js — Carousel de React Bits (reactbits.dev) portado a JavaScript puro.
   Mismo motor: resorte (stiffness 150, damping 24), arrastre con inercia, rueda, teclado,
   autoplay con pausa, loop y los 5 efectos (tilt, slide, scale, fade, cube).

   Uso:
     import { createCarousel } from './carousel.js?v=1';
     const c = createCarousel(contenedor, elementos, { effect: 'cube', arrows: true, loop: true, ... });
     c.goTo(2); c.step(1); c.stopAutoplay(); c.destroy();
*/

const THEMES = {
  dark: {
    '--carousel-frame': 'rgba(38, 35, 46, 0.66)',
    '--carousel-frame-edge': 'rgba(255, 255, 255, 0.08)',
    '--carousel-frame-highlight': 'rgba(255, 255, 255, 0.07)',
    '--carousel-frame-shadow': '0 22px 44px -20px rgba(0, 0, 0, 0.8), 0 6px 16px -8px rgba(0, 0, 0, 0.5)',
    '--carousel-tile': 'linear-gradient(180deg, #3a3644 0%, #27242f 100%)',
    '--carousel-tile-edge': 'rgba(255, 255, 255, 0.07)',
    '--carousel-tile-highlight': 'rgba(255, 255, 255, 0.12)',
    '--carousel-tile-shadow': '0 4px 10px -4px rgba(0, 0, 0, 0.7)',
    '--carousel-ink': '#f4f4f5',
    '--carousel-muted': 'rgba(244, 244, 245, 0.6)',
    '--carousel-faint': 'rgba(255, 255, 255, 0.22)',
    '--carousel-soft': 'rgba(255, 255, 255, 0.42)',
    '--carousel-badge': 'rgba(255, 255, 255, 0.08)',
    '--carousel-hover': 'brightness(1.12)',
    '--carousel-press': 'brightness(0.8)'
  },
  light: {
    '--carousel-frame': 'rgba(240, 240, 243, 0.8)',
    '--carousel-frame-edge': 'rgba(24, 24, 27, 0.07)',
    '--carousel-frame-highlight': 'rgba(255, 255, 255, 0.95)',
    '--carousel-frame-shadow': '0 22px 44px -22px rgba(24, 24, 27, 0.3), 0 6px 16px -10px rgba(24, 24, 27, 0.16)',
    '--carousel-tile': 'linear-gradient(180deg, #ffffff 0%, #f6f6f8 100%)',
    '--carousel-tile-edge': 'rgba(24, 24, 27, 0.08)',
    '--carousel-tile-highlight': 'rgba(255, 255, 255, 1)',
    '--carousel-tile-shadow': '0 4px 10px -5px rgba(24, 24, 27, 0.25)',
    '--carousel-ink': '#27272a',
    '--carousel-muted': 'rgba(39, 39, 42, 0.6)',
    '--carousel-faint': 'rgba(24, 24, 27, 0.16)',
    '--carousel-soft': 'rgba(24, 24, 27, 0.34)',
    '--carousel-badge': 'rgba(24, 24, 27, 0.05)',
    '--carousel-hover': 'brightness(0.97)',
    '--carousel-press': 'brightness(0.92)'
  }
};

const EFFECTS = ['tilt', 'slide', 'scale', 'fade', 'cube'];
const STIFFNESS = 150;
const DAMPING = 24;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const wrap = (value, count) => ((value % count) + count) % count;
const nearest = (offset, count) => wrap(offset + count / 2, count) - count / 2;
const smootherstep = t => t * t * t * (t * (t * 6 - 15) + 10);
const calm = () => document.body.classList.contains('calm') || matchMedia('(prefers-reduced-motion: reduce)').matches;

const edgeMask = size => {
  const stops = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1].map(t => [smootherstep(t).toFixed(3), (t * size).toFixed(1)]);
  const left = stops.map(([alpha, x]) => `rgba(0, 0, 0, ${alpha}) ${x}px`);
  const right = [...stops].reverse().map(([alpha, x]) => `rgba(0, 0, 0, ${alpha}) calc(100% - ${x}px)`);
  return `linear-gradient(to right, ${[...left, ...right].join(', ')})`;
};

const band = (value, max) => {
  if (value < 0) return -0.3 * (1 - Math.exp(value / 0.55));
  if (value > max) return max + 0.3 * (1 - Math.exp((max - value) / 0.55));
  return value;
};

const pose = (index, position, s) => {
  const offset = s.loop ? nearest(index - position, s.count) : index - position;
  const distance = Math.abs(offset);
  const near = Math.min(distance, 1);
  const result = { transform: 'none', opacity: 1, visible: true, layer: 10 - Math.min(9, Math.round(distance * 2)), shade: 0, focus: 1 };
  if (s.mode === 'fade') {
    const half = Math.min(1, near * 2);
    result.visible = distance < 1;
    result.opacity = 1 - near * near * (3 - 2 * near);
    result.transform = `scale(${1 - 0.04 * near})`;
    result.focus = 1 - half * half * (3 - 2 * half);
    return result;
  }
  if (s.mode === 'cube') {
    const half = s.cardWidth / 2;
    const turn = Math.sin(Math.PI * (position - Math.floor(position)));
    result.visible = distance < 1;
    result.transform = `scale(${1 - 0.12 * turn}) translateZ(${-half}px) rotateY(${clamp(offset, -1, 1) * 90}deg) translateZ(${half}px)`;
    result.shade = near * s.shade;
    return result;
  }
  let x = offset * s.span;
  result.visible = x > -(s.inset + s.cardWidth + 2) && x < s.width + s.bleed * 2 - s.inset + 2;
  result.focus = 1 - near * near * (3 - 2 * near);
  if (s.mode === 'tilt') {
    result.visible = result.visible && distance < 1;
    result.transform = `translate3d(${x}px, 0, 0) rotateY(${-clamp(offset, -1, 1) * 90}deg)`;
  } else if (s.mode === 'scale') {
    x -= Math.sign(offset) * near * s.cardWidth * 0.06;
    result.transform = `translate3d(${x}px, 0, 0) scale(${1 - 0.12 * near})`;
    result.opacity = 1 - 0.5 * near;
  } else {
    result.transform = `translate3d(${x}px, 0, 0)`;
  }
  return result;
};

const CHEVRON = flip => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${flip ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'}"/></svg>`;

const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };

export function createCarousel(container, items, opts = {}) {
  const o = {
    baseWidth: 300, aspectRatio: 1.25, peek: 0, gap: 16, radius: 12, frame: true, effect: 'tilt', indicator: 'dots',
    arrows: false, autoplay: false, autoplayDelay: 3000, pauseOnHover: false, loop: false, draggable: true, round: false,
    initialIndex: 0, theme: 'dark', onChange: null, maxHeight: null, ...opts
  };
  const count = items.length;
  const mode = EFFECTS.includes(o.effect) ? o.effect : 'tilt';
  const stacked = mode === 'fade' || mode === 'cube';
  const ratio = clamp(o.aspectRatio, 0.3, 4);
  let autoplayOn = o.autoplay && count > 1;

  /* ---- DOM (igual que el JSX original) ---- */
  const root = el('div', `carousel-container${o.frame ? ' has-frame' : ''}${o.round ? ' is-round' : ''}`);
  Object.entries(THEMES[o.theme] ?? THEMES.dark).forEach(([k, v]) => root.style.setProperty(k, v));
  root.setAttribute('role', 'region'); root.setAttribute('aria-roledescription', 'carousel'); root.setAttribute('aria-label', 'Carrusel'); root.tabIndex = 0;
  const stage = el('div', 'carousel-stage');
  const viewport = el('div', 'carousel-viewport');
  stage.append(viewport); root.append(stage);
  const slides = items.map((item, i) => {
    const slide = el('div', 'carousel-slide');
    slide.setAttribute('role', 'group'); slide.setAttribute('aria-roledescription', 'slide'); slide.setAttribute('aria-label', `${i + 1} de ${count}`);
    const card = el('div', 'carousel-card is-custom'); card.append(item); card.append(el('span', 'carousel-card-rim'));
    slide.append(card);
    let shade = null;
    if (mode === 'cube') { shade = el('span', 'carousel-shade'); slide.append(shade); }
    slide.addEventListener('click', () => { if (i !== active) api.goTo(i); });
    viewport.append(slide);
    return { slide, shade };
  });
  let prevBtn = null, nextBtn = null, controls = null;
  if (count > 1 && (o.indicator !== 'none' || o.arrows)) {
    controls = el('div', 'carousel-controls');
    if (o.arrows) { prevBtn = el('button', 'carousel-arrow'); prevBtn.type = 'button'; prevBtn.setAttribute('aria-label', 'Tarjeta anterior'); prevBtn.innerHTML = CHEVRON(true); prevBtn.onclick = () => api.step(-1); controls.append(prevBtn); }
    if (o.indicator === 'dots') {
      const dots = el('div', 'carousel-dots');
      items.forEach((_, i) => { const d = el('button', 'carousel-dot'); d.type = 'button'; d.setAttribute('aria-label', `Ir a la tarjeta ${i + 1}`); d.append(el('span', 'carousel-dot-mark')); d.onclick = () => api.goTo(i); dots.append(d); });
      controls.append(dots);
    }
    if (o.arrows) { nextBtn = el('button', 'carousel-arrow'); nextBtn.type = 'button'; nextBtn.setAttribute('aria-label', 'Tarjeta siguiente'); nextBtn.innerHTML = CHEVRON(false); nextBtn.onclick = () => api.step(1); controls.append(nextBtn); }
    const inside = o.frame && !o.round;
    (inside ? stage : root).append(controls);
  }
  if (o.frame) stage.append(el('span', 'carousel-frame-rim'));
  container.append(root);

  /* ---- Medidas (lo que en React se recalcula en cada render) ---- */
  let width = 300, active = clamp(Math.round(o.initialIndex), 0, Math.max(0, count - 1)), s = {};
  const measure = () => {
    let maxWidth = typeof o.baseWidth === 'number' && o.round && o.frame ? 20 + (o.baseWidth - 20) * Math.min(1, 1 / ratio) : o.baseWidth;
    if (o.maxHeight) { const mh = typeof o.maxHeight === 'function' ? o.maxHeight() : o.maxHeight; maxWidth = Math.max(240, Math.min(maxWidth, mh * ratio + (o.frame ? 20 : 0))); }
    root.style.setProperty('--carousel-radius', `${o.round ? 9999 : Math.max(0, o.radius)}px`);
    root.style.width = '100%'; root.style.maxWidth = maxWidth + 'px';
    const side = stacked || (o.round && o.frame) ? 0 : clamp(o.peek, 0, width * 0.2);
    const slot = Math.max(40, width - side * 2);
    const diameter = o.frame ? slot : Math.min(slot, slot / ratio);
    const cardWidth = o.round ? diameter : slot;
    const cardHeight = o.round ? diameter : slot / ratio;
    const clipped = !o.frame && !stacked;
    const bleed = clipped ? Math.round(Math.min(48, cardWidth * 0.12)) : 0;
    const inset = bleed + (width - cardWidth) / 2;
    s = { count, mode, width, bleed, inset, cardWidth, cardHeight, span: cardWidth + Math.max(0, o.gap), loop: o.loop && count > 1,
      autoplayDelay: Math.max(600, o.autoplayDelay), pauseOnHover: o.pauseOnHover, draggable: o.draggable && count > 1, shade: o.theme === 'light' ? 0.3 : 0.6 };
    root.style.setProperty('--carousel-scale', clamp(cardWidth / 300, 0.86, 1));
    viewport.style.height = cardHeight + 'px';
    viewport.style.marginInline = bleed ? -bleed + 'px' : '';
    viewport.style.perspective = mode === 'cube' ? `${Math.round(cardWidth * 2.6)}px` : mode === 'tilt' ? '1000px' : '';
    viewport.style.overflowX = clipped ? 'clip' : 'visible';
    const mask = clipped ? edgeMask(inset) : '';
    viewport.style.maskImage = mask; viewport.style.webkitMaskImage = mask;
    if (s.draggable) viewport.dataset.draggable = 'true'; else delete viewport.dataset.draggable;
    viewport.setAttribute('aria-live', autoplayOn ? 'off' : 'polite');
    slides.forEach(({ slide }) => { slide.style.left = inset + 'px'; slide.style.width = cardWidth + 'px'; slide.style.height = cardHeight + 'px'; });
    if (controls) controls.style.width = cardWidth + 'px';
  };

  /* ---- Motor (idéntico al useEffect original) ---- */
  const state = { p: active, v: 0, target: active, shown: active, elapsed: 0, hovered: false, focused: false, visible: true, drag: null, wheeling: false, wheelTimer: 0, suppress: false, last: 0 };
  let raf = 0, alive = true;
  const unit = () => (s.mode === 'fade' || s.mode === 'cube' ? s.cardWidth : s.span);
  const limit = value => (s.loop ? value : clamp(value, 0, s.count - 1));

  const apply = () => {
    for (let i = 0; i < s.count; i++) {
      const { slide, shade } = slides[i];
      const next = pose(i, state.p, s);
      slide.style.transform = next.transform;
      slide.style.opacity = String(next.opacity);
      slide.style.visibility = next.visible ? 'visible' : 'hidden';
      slide.style.zIndex = String(next.layer);
      slide.style.setProperty('--carousel-focus', String(next.focus));
      if (shade) shade.style.opacity = String(next.shade);
    }
  };
  const syncUi = () => {
    slides.forEach(({ slide }, i) => { if (i === active) slide.dataset.current = 'true'; else delete slide.dataset.current; });
    controls?.querySelectorAll('.carousel-dot').forEach((d, i) => d.classList.toggle('is-active', i === active));
    if (prevBtn) prevBtn.disabled = !s.loop && active === 0;
    if (nextBtn) nextBtn.disabled = !s.loop && active === count - 1;
  };
  const announce = () => {
    if (!s.count) return;
    const index = s.loop ? wrap(Math.round(state.target), s.count) : clamp(Math.round(state.target), 0, s.count - 1);
    if (index === state.shown) return;
    state.shown = index; active = index; syncUi(); o.onChange?.(index);
  };
  const paused = () => (s.pauseOnHover && state.hovered) || state.focused || Boolean(state.drag) || state.wheeling || !state.visible || document.hidden;

  const tick = now => {
    raf = 0;
    if (!alive) return;
    const dt = state.last ? Math.min(0.05, (now - state.last) / 1000) : 1 / 60;
    state.last = now;
    let busy = false;
    if (!state.drag?.moved && !state.wheeling) {
      if (calm()) { state.p = state.target; state.v = 0; }
      else {
        const steps = Math.ceil(dt * 240), h = dt / steps;
        for (let k = 0; k < steps; k++) { state.v += (STIFFNESS * (state.target - state.p) - DAMPING * state.v) * h; state.p += state.v * h; }
        if (Math.abs(state.target - state.p) < 0.0004 && Math.abs(state.v) < 0.004) { state.p = state.target; state.v = 0; } else busy = true;
      }
      if (!busy && s.loop && s.count) { state.target = wrap(Math.round(state.target), s.count); state.p = state.target; }
    }
    if (autoplayOn && !paused()) {
      state.elapsed += dt * 1000;
      if (state.elapsed >= s.autoplayDelay) step(1, true);
      busy = true;
    }
    apply();
    if (busy) raf = requestAnimationFrame(tick); else state.last = 0;
  };
  const wake = () => { if (!raf && alive) raf = requestAnimationFrame(tick); };
  const moveTo = target => { state.target = target; state.elapsed = 0; announce(); apply(); wake(); };
  const step = (direction, auto = false) => {
    if (s.count < 2) return;
    let next = Math.round(state.target) + direction;
    if (!s.loop) { if (auto && next > s.count - 1) next = 0; next = clamp(next, 0, s.count - 1); }
    moveTo(next);
  };
  const goTo = index => {
    if (!s.count) return;
    const goal = clamp(Math.round(index), 0, s.count - 1), current = Math.round(state.target);
    moveTo(s.loop ? current + nearest(goal - wrap(current, s.count), s.count) : goal);
  };

  const onPointerDown = e => {
    if (!s.draggable || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (e.target.closest('textarea, input, select')) return;
    state.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, p: state.p, from: 0, moved: false, samples: [] };
  };
  const onPointerMove = e => {
    const drag = state.drag;
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) { state.drag = null; return; }
      drag.moved = true; drag.x = e.clientX; drag.p = state.p; drag.from = Math.round(state.target);
      viewport.setPointerCapture?.(e.pointerId); viewport.dataset.dragging = 'true';
    }
    const raw = drag.p - (e.clientX - drag.x) / unit();
    state.p = s.loop ? raw : band(raw, s.count - 1);
    state.v = 0;
    state.target = Math.round(limit(state.p));
    drag.samples.push([e.timeStamp, e.clientX]); if (drag.samples.length > 8) drag.samples.shift();
    announce(); apply();
  };
  const onPointerUp = e => {
    const drag = state.drag;
    if (!drag || e.pointerId !== drag.id) return;
    state.drag = null; delete viewport.dataset.dragging;
    if (!drag.moved) { wake(); return; }
    state.suppress = true; setTimeout(() => { state.suppress = false; }, 0);
    const sample = drag.samples.find(([time]) => e.timeStamp - time < 90) ?? [e.timeStamp, e.clientX];
    const elapsed = Math.max(16, e.timeStamp - sample[0]);
    const velocity = clamp(((sample[1] - e.clientX) / elapsed) * (1000 / unit()), -12, 12);
    const travelled = state.p - drag.from;
    let target = Math.round(state.p + velocity * 0.2);
    if (target === drag.from) { if (Math.abs(velocity) > 0.8) target += Math.sign(velocity); else if (Math.abs(travelled) > 0.18) target += Math.sign(travelled); }
    if (!s.loop) target = clamp(target, 0, s.count - 1);
    const inside = s.loop || (state.p >= 0 && state.p <= s.count - 1);
    state.v = inside ? velocity : 0;
    moveTo(target);
  };
  const onClickCapture = e => { if (!state.suppress) return; e.preventDefault(); e.stopPropagation(); state.suppress = false; };
  const onWheel = e => {
    if (!s.draggable || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    const raw = state.p + e.deltaX / unit();
    state.p = s.loop ? raw : clamp(raw, -0.15, s.count - 0.85);
    state.v = 0; state.wheeling = true; state.target = Math.round(limit(state.p));
    announce(); apply();
    clearTimeout(state.wheelTimer);
    state.wheelTimer = setTimeout(() => { state.wheeling = false; moveTo(Math.round(limit(state.p))); }, 120);
  };
  const onKeyDown = e => {
    if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    const keys = { ArrowRight: () => step(1), ArrowLeft: () => step(-1), Home: () => goTo(0), End: () => goTo(s.count - 1) };
    if (!keys[e.key]) return;
    e.preventDefault(); e.stopPropagation(); keys[e.key]();
  };
  const onEnter = () => { state.hovered = true; };
  const onLeave = () => { state.hovered = false; wake(); };
  const onFocusIn = () => { try { state.focused = root.matches(':focus-visible') || Boolean(root.querySelector(':focus-visible')); } catch { state.focused = false; } };
  const onFocusOut = e => { if (root.contains(e.relatedTarget)) return; state.focused = false; wake(); };
  const onVisibility = () => { if (document.hidden) return; state.last = 0; wake(); };

  const ro = new ResizeObserver(entries => {
    const box = entries[entries.length - 1]?.contentRect;
    if (!box) return;
    const w = Math.max(1, Math.round(box.width));
    if (w !== width) { width = w; measure(); apply(); }
  });
  ro.observe(stage);
  const io = new IntersectionObserver(entries => { state.visible = entries.some(en => en.isIntersecting); if (state.visible) wake(); });
  io.observe(root);
  const onResize = () => { measure(); apply(); };
  addEventListener('resize', onResize);

  viewport.addEventListener('pointerdown', onPointerDown);
  viewport.addEventListener('pointermove', onPointerMove);
  viewport.addEventListener('pointerup', onPointerUp);
  viewport.addEventListener('pointercancel', onPointerUp);
  viewport.addEventListener('click', onClickCapture, true);
  viewport.addEventListener('wheel', onWheel, { passive: false });
  root.addEventListener('keydown', onKeyDown);
  root.addEventListener('mouseenter', onEnter);
  root.addEventListener('mouseleave', onLeave);
  root.addEventListener('focusin', onFocusIn);
  root.addEventListener('focusout', onFocusOut);
  document.addEventListener('visibilitychange', onVisibility);

  width = Math.max(1, Math.round(stage.getBoundingClientRect().width - (o.frame ? 20 : 0))) || 300;
  measure(); syncUi(); apply(); wake();

  const api = {
    goTo, step,
    get index() { return active; },
    stopAutoplay() { autoplayOn = false; viewport.setAttribute('aria-live', 'polite'); },
    remeasure() { measure(); apply(); },
    destroy() {
      alive = false; cancelAnimationFrame(raf); clearTimeout(state.wheelTimer);
      ro.disconnect(); io.disconnect(); removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      root.remove();
    }
  };
  return api;
}

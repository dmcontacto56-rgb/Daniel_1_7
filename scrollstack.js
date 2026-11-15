/* scrollstack.js — ScrollStack de React Bits (reactbits.dev) portado a JavaScript puro.
   Las tarjetas se quedan "pegadas" arriba y se apilan mientras haces scroll; las de atrás se
   encogen y se oscurecen. Mismo cálculo que el original (modo contenido: el scroll es del propio cuadro).

   Uso:
     import { createScrollStack } from './scrollstack.js?v=1';
     createScrollStack(contenedor, [tarjeta1, tarjeta2, ...], { intro: elementoOpcional, itemDistance: 100, ... });
   Cada tarjeta es un elemento; se envuelve en .scroll-stack-card (como ScrollStackItem).
*/

const resolveOffset = (value, size) => {
  if (typeof value === 'number') return value;
  const text = String(value).trim();
  if (text.endsWith('%')) return (parseFloat(text) / 100) * size;
  return parseFloat(text) || 0;
};
const toLength = value => (typeof value === 'number' ? `${value}px` : value);
const scrollsInside = (node, stop, delta) => {
  for (let element = node; element && element !== stop; element = element.parentElement) {
    if (element.scrollHeight <= element.clientHeight + 1) continue;
    const overflow = getComputedStyle(element).overflowY;
    if (overflow !== 'auto' && overflow !== 'scroll') continue;
    if (delta > 0 ? element.scrollTop + element.clientHeight < element.scrollHeight - 1 : element.scrollTop > 0) return true;
  }
  return false;
};
const reduced = () => document.body.classList.contains('calm') || matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createScrollStack(container, cards, opts = {}) {
  const settings = {
    itemDistance: 100, itemStackDistance: 24, stackPosition: '15%', itemScale: 0.05, baseScale: 0.8, dimAmount: 0.2,
    blurAmount: 0, tiltAmount: 0, rotationAmount: 0, holdDistance: 200, smoothScroll: true, snap: false,
    onStackComplete: null, intro: null, className: '', ...opts
  };

  /* ---- DOM (igual que el JSX original) ---- */
  const root = document.createElement('div');
  root.className = `scroll-stack scroll-stack--contained ${settings.className}`.trim();
  const inner = document.createElement('div'); inner.className = 'scroll-stack__inner';
  if (settings.intro) root.append(settings.intro);
  root.append(inner);
  cards.forEach((child, index) => {
    if (index > 0) {
      const gap = settings.itemDistance - (cards.length - index) * settings.itemStackDistance;
      const sp = document.createElement('div'); sp.setAttribute('aria-hidden', 'true');
      sp.style.height = Math.max(0, gap) + 'px'; sp.style.marginTop = Math.min(0, gap) + 'px';
      inner.append(sp);
    }
    const slot = document.createElement('div');
    slot.setAttribute('data-stack-slot', ''); slot.className = 'scroll-stack__slot';
    slot.style.top = `calc(${toLength(settings.stackPosition)} + ${index * settings.itemStackDistance}px)`;
    slot.style.marginBottom = (cards.length - 1 - index) * settings.itemStackDistance + 'px';
    slot.style.zIndex = index + 1;
    const card = document.createElement('div'); card.className = 'scroll-stack-card';
    card.append(child);
    const shade = document.createElement('span'); shade.className = 'scroll-stack-card__shade'; shade.setAttribute('aria-hidden', 'true');
    card.append(shade); slot.append(card); inner.append(slot);
  });
  const end = document.createElement('div'); end.className = 'scroll-stack__end'; end.setAttribute('aria-hidden', 'true');
  inner.append(end);
  container.append(root);

  /* ---- Motor (idéntico al useLayoutEffect original, modo contenido) ---- */
  const target = root;
  const cache = new Map();
  let frame = 0, glide = 0, rest = 0, complete = false, gliding = false, pressed = false, current = 0, goal = 0, written = 0, last = 0, points = [], reach = 0;
  const readScroll = () => root.scrollTop;
  const maxScroll = () => root.scrollHeight - root.clientHeight;
  const writeScroll = value => { written = value; target.scrollTo({ top: value, behavior: 'instant' }); };
  const write = (key, value, applyFn) => { if (cache.get(key) === value) return false; cache.set(key, value); applyFn(value); return true; };

  const update = () => {
    frame = 0;
    const slots = Array.from(inner.children).filter(child => child.hasAttribute('data-stack-slot'));
    if (!slots.length || !root.clientHeight) return;
    const viewHeight = root.clientHeight;
    const viewTop = root.getBoundingClientRect().top + root.clientTop;
    const stackTop = resolveOffset(settings.stackPosition, viewHeight);
    const offset = settings.itemStackDistance;
    const heights = slots.map(slot => slot.offsetHeight);
    const tops = slots.map(slot => slot.getBoundingClientRect().top);
    const lastPin = stackTop + (slots.length - 1) * offset;
    const padTop = stackTop;
    const endHeight = settings.holdDistance + Math.max(0, viewHeight - lastPin - heights[heights.length - 1]);
    let moved = write('padTop', padTop, v => { inner.style.paddingTop = `${v}px`; });
    moved = write('endHeight', endHeight, v => { end.style.height = `${v}px`; }) || moved;

    let flow = inner.getBoundingClientRect().top - viewTop + readScroll() + padTop;
    points = heights.map((height, i) => { const point = flow - stackTop - i * offset; flow += height + settings.itemDistance; return point; });
    reach = Math.max(40, (heights[0] + settings.itemDistance - offset) / 2);

    const depths = slots.map(() => 0);
    let lastCover = 0;
    for (let j = 1; j < slots.length; j++) {
      const pinBefore = viewTop + stackTop + (j - 1) * offset;
      const start = pinBefore + heights[j - 1];
      const span = Math.max(1, start - pinBefore - offset);
      const cover = Math.min(1, Math.max(0, (start - tops[j]) / span));
      for (let i = 0; i < j; i++) depths[i] += cover;
      lastCover = cover;
    }
    const dimStep = Math.min(Math.max(settings.dimAmount, 0), 1);
    slots.forEach((slot, i) => {
      const card = slot.firstElementChild; if (!card) return;
      const depth = depths[i], lean = Math.min(depth, 1);
      const scale = Math.max(Math.min(settings.baseScale, 1), 1 - depth * settings.itemScale);
      const tilt = -lean * settings.tiltAmount, turn = lean * settings.rotationAmount * (i % 2 ? -1 : 1);
      const blur = depth * settings.blurAmount, dim = 1 - Math.pow(1 - dimStep, depth);
      const transform = depth < 0.0005 ? '' : `perspective(1200px) rotateX(${tilt.toFixed(2)}deg) rotate(${turn.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
      write(`transform${i}`, transform, v => { card.style.transform = v; });
      write(`filter${i}`, blur > 0.01 ? `blur(${blur.toFixed(2)}px)` : '', v => { card.style.filter = v; });
      write(`dim${i}`, dim.toFixed(3), v => { card.style.setProperty('--scroll-stack-dim', v); });
    });
    const done = slots.length > 1 && lastCover >= 0.999;
    if (done !== complete) { complete = done; if (done) settings.onStackComplete?.(); }
    root.classList.toggle('is-scrolled', readScroll() > 30);
    if (moved) schedule();
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  const step = now => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (Math.abs(readScroll() - written) > 2) { gliding = false; glide = 0; settleSoon(); return; }
    current += (goal - current) * (1 - Math.pow(0.9, dt * 60));
    if (Math.abs(goal - current) < 0.5) current = goal;
    writeScroll(current);
    if (current === goal) { gliding = false; glide = 0; settleSoon(); return; }
    glide = requestAnimationFrame(step);
  };
  const glideTo = value => {
    goal = Math.min(Math.max(value, 0), maxScroll());
    if (reduced()) { writeScroll(goal); return; }
    if (gliding) return;
    gliding = true; current = readScroll(); written = current; last = performance.now();
    glide = requestAnimationFrame(step);
  };
  const settle = () => {
    rest = 0;
    if (!settings.snap || gliding || pressed || !points.length) return;
    const now = readScroll();
    const near = points.reduce((best, point) => (Math.abs(point - now) < Math.abs(best - now) ? point : best));
    const gap = Math.abs(near - now);
    if (gap > 1 && gap < reach) glideTo(near);
  };
  const settleSoon = () => { clearTimeout(rest); rest = setTimeout(settle, 140); };
  const onScroll = () => { schedule(); if (!gliding) settleSoon(); };
  const onWheel = e => {
    if (!settings.smoothScroll || reduced() || e.defaultPrevented || e.ctrlKey) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    const page = root.clientHeight;
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? page : 1);
    if (!delta || scrollsInside(e.target, root, delta)) return;
    const base = gliding ? goal : readScroll();
    if ((delta < 0 && base <= 0) || (delta > 0 && base >= maxScroll() - 0.5)) return;
    e.preventDefault(); clearTimeout(rest); glideTo(base + delta);
  };
  const onPress = () => { pressed = true; clearTimeout(rest); };
  const onRelease = () => { if (!pressed) return; pressed = false; settleSoon(); };

  const observer = new ResizeObserver(schedule);
  observer.observe(root); observer.observe(inner);
  target.addEventListener('scroll', onScroll, { passive: true });
  target.addEventListener('wheel', onWheel, { passive: false });
  target.addEventListener('pointerdown', onPress, { passive: true });
  addEventListener('pointerup', onRelease, { passive: true });
  addEventListener('pointercancel', onRelease, { passive: true });
  addEventListener('resize', schedule);
  update();

  return {
    root,
    refresh: schedule,
    scrollTo: y => glideTo(y),
    reset: () => { cancelAnimationFrame(glide); gliding = false; root.scrollTop = 0; schedule(); },
    destroy() {
      cancelAnimationFrame(frame); cancelAnimationFrame(glide); clearTimeout(rest); observer.disconnect();
      target.removeEventListener('scroll', onScroll); target.removeEventListener('wheel', onWheel); target.removeEventListener('pointerdown', onPress);
      removeEventListener('pointerup', onRelease); removeEventListener('pointercancel', onRelease); removeEventListener('resize', schedule);
      root.remove();
    }
  };
}

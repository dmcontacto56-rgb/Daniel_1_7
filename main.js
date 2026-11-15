import { setClickSound, click, cheer, fanfare, sparkle, oops, setMuted, isMuted } from './audio.js?v=1';
import { confettiFrom, shake, ripple, sparkBurst, sparkFrom } from './effects.js?v=1';
import { initCursor } from './cursor.js?v=1';
import { createCarousel } from './carousel.js?v=1';
import { createScrollStack } from './scrollstack.js?v=1';

const $ = (s, r = document) => r.querySelector(s);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const shuffle = a => [...a].sort(() => Math.random() - .5);
const calm = () => document.body.classList.contains('calm') || matchMedia('(prefers-reduced-motion: reduce)').matches;
const U = encodeURI;
const bg = file => `url("${U(file)}")`;
const inits = {};
const sections = [...document.querySelectorAll('main section')];
let cur = 0, D;

async function boot() {
  try { D = await (await fetch('content.json')).json(); }
  catch (e) { $('#stage').innerHTML = '<p class="card">No se pudo cargar content.json. Abre la página desde GitHub Pages o un servidor local (python servir.py), no con doble clic.</p>'; return; }
  window.__app = 1;
  const M = D.meta;
  setClickSound(U(M.clickSound));
  document.addEventListener('click', click);
  // Cada toque: ondas de agua + muchas chispas de colores
  addEventListener('pointerdown', e => { ripple(e.clientX, e.clientY); sparkBurst(e.clientX, e.clientY, 1.3); });
  initCursor();
  $('#logoEnd').onerror = e => { e.target.hidden = true; }; $('#logoEnd').src = U(M.logo);
  $('#coverImg').src = U(M.cover);
  $('#applyScroll').style.backgroundImage = bg(M.horno);
  $('#weekScroll').style.backgroundImage = bg(M.leones);
  $('#colorScroll').style.backgroundImage = bg(M.colorear);
  initNav(); initTimer(); initControls(); initNudge(); initBgScroll();
  $('#goBtn').onclick = e => { sparkFrom(e.currentTarget, 3); confettiFrom(e.currentTarget, 120); fanfare(); setTimeout(() => show(1), 600); };

  /* ---- 1. Portada: DANIEL aparece letra por letra (Split Text) y el significado se revela al tocar ---- */
  inits['s-cover'] = () => {
    const L = [...document.querySelectorAll('#nameBig .ltr')];
    L.forEach(l => l.classList.remove('in'));
    if (calm()) L.forEach(l => l.classList.add('in')); else L.forEach((l, i) => setTimeout(() => l.classList.add('in'), 250 + i * 110));
    $('#meaning').classList.remove('unblur'); $('#meaningHint').hidden = false;
  };
  const reveal = () => { const m = $('#meaning'); if (m.classList.contains('unblur')) return; m.classList.add('unblur'); $('#meaningHint').hidden = true; sparkFrom(m, 3); confettiFrom(m, 90); fanfare(); };
  $('#meaning').onclick = reveal; $('#meaning').onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); reveal(); } };
  $('#nameBig').onclick = e => { const n = e.currentTarget; n.style.animation = 'none'; void n.offsetWidth; n.style.animation = 'pop .7s'; sparkle(); };

  /* ---- 2. Misión de lectura en el Carousel (cubo) ---- */
  let carousel = null;
  inits['s-cards'] = () => {
    carousel?.destroy();
    const cards = D.cards.map((k, i) => {
      const c = h('div', 'mcard k' + (i % 5));
      c.innerHTML = `<div class="front"><span class="ico">${k.icon}</span><h3>${k.title}</h3><p>👆 Toca para descubrir la escritura</p></div>
        <div class="back"><p class="ref">${k.icon} ${k.ref}</p><p class="verse${k.v.length > 230 ? ' long' : ''}">«${k.v}»</p>
        <div class="hid ins" role="button" tabindex="0"><span class="txt">✏️ Busca <mark>${k.ref}</mark> en tus Escrituras y subráyala.</span></div>
        <div class="hid q" role="button" tabindex="0"><span class="txt">💭 ${k.q}</span></div></div>`;
      const upd = () => { const n = document.querySelectorAll('#carousel .mcard.done').length; $('#cardsCount').textContent = `Misiones completadas: ${n}/${D.cards.length}` + (n === D.cards.length ? ' 🏆' : ''); if (n === D.cards.length) fanfare(); };
      const showHid = (el, e) => {
        if (el.classList.contains('show')) return; el.classList.add('show'); sparkle();
        if (e) sparkBurst(e.clientX, e.clientY, 2);
        if (c.querySelectorAll('.hid.show').length === 2) { c.classList.add('done'); confettiFrom(c, 60); upd(); }
      };
      c.addEventListener('click', e => {
        if (c.closest('.carousel-slide')?.dataset.current !== 'true') return;
        carousel?.stopAutoplay();
        if (!c.classList.contains('open')) { c.classList.add('open'); cheer(); sparkBurst(e.clientX, e.clientY, 2.5); return; }
        const hid = e.target.closest('.hid'); if (hid) showHid(hid, e);
      });
      c.querySelectorAll('.hid').forEach(x => x.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showHid(x); } });
      return c;
    });
    $('#carousel').innerHTML = '';
    carousel = createCarousel($('#carousel'), cards, {
      baseWidth: 640, aspectRatio: 1.45, effect: 'cube', indicator: 'none', frame: true, arrows: true, loop: true,
      autoplay: true, autoplayDelay: 4000, pauseOnHover: true, theme: 'dark', peek: 64, gap: 16, radius: 19, draggable: true, round: false,
      maxHeight: () => $('#stage').clientHeight - 270,
      onChange: () => sparkle()
    });
    $('#cardsCount').textContent = `Misiones completadas: 0/${D.cards.length}`;
  };

  /* ---- 3. José y Daniel (ScrollStack) ---- */
  let stack = null;
  inits['s-jose'] = () => {
    if (stack) { stack.reset(); return; }
    const cards = D.jose.map(x => h('div', 'jd', `<h3><span class="ico">${x.icon}</span>${x.t}</h3>
      <div class="cols"><div class="col jo"><b>🏺 José en Egipto</b>${x.j}<small>${x.jr}</small></div><div class="col da"><b>🦁 Daniel en Babilonia</b>${x.d}<small>${x.dr}</small></div></div>`));
    cards.push(h('div', 'jd', `<h3><span class="ico">❓</span>Para pensar</h3><div class="qs">${D.joseQ.map((q, i) => `<p><b>${i + 1}.</b>${q}</p>`).join('')}</div>`));
    const intro = h('div', 'intro', '<span class="imgcap">Líderes de Egipto y Babilonia</span><button class="scrollHint">⬇ Desliza para comparar</button>');
    stack = createScrollStack($('#jdStack'), cards, { intro, className: 'bgstack', itemDistance: 100, itemStackDistance: 24, stackPosition: '12%', holdDistance: 160 });
    stack.root.style.backgroundImage = bg(D.meta.lideres);
    $('.scrollHint', intro).onclick = () => stack.scrollTo(stack.root.clientHeight * .9);
  };

  /* ---- 4. Relaciona ideas ---- */
  inits['s-match'] = () => {
    const Lc = $('#mL'), R = $('#mR'); Lc.innerHTML = R.innerHTML = ''; Lc.className = R.className = 'pair';
    let sel = null, done = 0; const total = D.match.length; $('#matchCount').textContent = `0/${total}`;
    D.match.forEach((m, i) => { const b = h('button', '', m[0]); b.dataset.k = i; b.onclick = () => { Lc.querySelectorAll('button').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); sel = b; }; Lc.append(b); });
    shuffle(D.match.map((m, i) => [m[1], i])).forEach(([t, i]) => {
      const b = h('button', '', t); b.dataset.k = i;
      b.onclick = () => {
        if (!sel) return;
        if (sel.dataset.k === b.dataset.k) { const ico = D.match[i][0].split(' ')[0]; sel.classList.remove('sel'); sel.classList.add('done'); b.classList.add('done'); b.innerHTML = '<span class="ic">' + ico + '</span> ' + b.textContent; confettiFrom(b, 50); sparkFrom(b, 2); cheer(); sel = null; done++; $('#matchCount').textContent = `${done}/${total}` + (done === total ? ' 🎉' : ''); if (done === total) fanfare(); }
        else { b.classList.add('bad'); shake(b); oops(); setTimeout(() => b.classList.remove('bad'), 600); }
      };
      R.append(b);
    });
  };

  /* ---- 5. ¿Qué harías? ---- */
  inits['s-apply'] = () => {
    const box = $('#apply'); box.innerHTML = '';
    D.apply.forEach((a, k) => {
      const d = h('div', 'card tone' + [0, 4, 1, 3, 2][k % 5], `<b class="sit">${a.s}</b><div class="grid" style="margin-top:10px"></div><div class="reflect card rev"></div>`);
      const g = $('.grid', d), r = $('.reflect', d);
      a.o.forEach((o, i) => {
        const b = h('button', 'opt o' + i, o.t);
        b.onclick = () => { g.querySelectorAll('.opt').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); r.className = 'reflect card rev on tone' + [0, 1, 4][i]; r.innerHTML = `<span class="note">💭 ${o.r}</span>`; sparkle(); };
        g.append(b);
      });
      box.append(d);
    });
    $('#refOut').textContent = ''; $('#refTxt').value = ''; $('#applyScroll').scrollTop = 0;
  };
  $('#refBtn').onclick = e => { const t = $('#refTxt').value.trim(); if (!t) return; $('#refOut').textContent = '💗 ' + t; confettiFrom(e.currentTarget, 80); sparkFrom(e.currentTarget, 3); fanfare(); };

  /* ---- 6. Misión de la semana: cada misión cumplida duerme a un león ---- */
  const KEY = 'valientes-daniel-week';
  inits['s-week'] = () => {
    const box = $('#week'); box.innerHTML = ''; let saved = [];
    try { saved = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { /* sin almacenamiento */ }
    const lions = () => { const lit = [...box.children].map(x => x.classList.contains('lit')); $('#lions').innerHTML = lit.map(on => `<span class="${on ? 'zz' : ''}" title="${on ? 'León dormido' : 'León despierto'}">${on ? '😴' : '🦁'}</span>`).join(''); };
    const upd = () => {
      const n = box.querySelectorAll('.lit').length;
      $('#weekCount').textContent = `Leones dormidos: ${n}/${D.week.length}` + (n === D.week.length ? ' 🏆 ¡Como Daniel, saliste sin daño!' : '');
      try { localStorage.setItem(KEY, JSON.stringify([...box.children].map(x => x.classList.contains('lit')))); } catch (e) { /* ok */ }
      lions();
    };
    D.week.forEach((w, i) => {
      const b = h('button', 'week tone' + (i % 5), `<span class="lion">${saved[i] ? '😴' : '🦁'}</span><span class="ico">${w.icon}</span><b>${w.d}</b><span>${w.t}</span><small>${w.r}</small>`);
      b.classList.toggle('lit', !!saved[i]);
      b.onclick = () => { const on = b.classList.toggle('lit'); $('.lion', b).textContent = on ? '😴' : '🦁'; if (on) { confettiFrom(b, 50); sparkFrom(b, 2.5); cheer(); } upd(); if (box.querySelectorAll('.lit').length === D.week.length) fanfare(); };
      box.append(b);
    });
    $('#myMission').textContent = ''; $('#weekScroll').scrollTop = 0;
    upd();
  };
  // Dado: las tarjetas parpadean una por una y se detiene en una misión al azar
  $('#dice').onclick = () => {
    const btns = [...$('#week').children]; if (!btns.length) return;
    const pool = btns.filter(b => !b.classList.contains('lit')); const list = pool.length ? pool : btns;
    const pick = list[Math.floor(Math.random() * list.length)];
    btns.forEach(b => b.classList.remove('pick', 'flash'));
    let n = 0; const total = calm() ? 0 : 14;
    const spin = () => {
      btns.forEach(b => b.classList.remove('flash'));
      if (n >= total) {
        pick.classList.add('pick'); pick.scrollIntoView({ block: 'nearest', behavior: calm() ? 'auto' : 'smooth' });
        $('#myMission').textContent = `🎯 Tu misión especial: ${D.week[btns.indexOf(pick)].d}`;
        sparkFrom(pick, 3); confettiFrom(pick, 80); fanfare(); return;
      }
      btns[n % btns.length].classList.add('flash'); sparkle(); n++; setTimeout(spin, 70 + n * 12);
    };
    spin();
  };

  /* ---- 7. Hoja para colorear ---- */
  initColoring();
  inits['s-color'] = () => { $('#colorScroll').scrollTop = 0; };

  Object.values(inits).forEach(f => f());
  document.querySelectorAll('.rs').forEach(b => b.onclick = () => {
    const s = b.closest('section');
    if (s.id === 's-week') { try { localStorage.removeItem(KEY); } catch (e) { /* ok */ } }
    if (s.id === 's-color') clearSheet();
    inits[s.id]?.(); sparkle();
  });
  show(0);
}

/* ---- Fondos: la imagen se ve completa y se oscurece un poco al bajar ---- */
function initBgScroll() {
  document.querySelectorAll('.bgscroll').forEach(sc => {
    sc.addEventListener('scroll', () => sc.classList.toggle('is-scrolled', sc.scrollTop > 30), { passive: true });
    const hint = $('.scrollHint', sc); if (hint) hint.onclick = () => sc.scrollTo({ top: sc.clientHeight * .9, behavior: calm() ? 'auto' : 'smooth' });
  });
}

/* ---- Colorear: rellenar con un toque o dibujar a mano ---- */
const PALETTE = ['#ff4d4d', '#ff8c42', '#ffd23f', '#8bd450', '#2e9e4f', '#7ec8ff', '#0887F5', '#7a4fe0', '#ff7eb6', '#a8682f', '#f2c9a0', '#9aa3b5', '#1c2347', '#ffffff'];
let color = PALETTE[0], mode = 'fill', ctx;
function initColoring() {
  const sw = $('#swatches');
  PALETTE.forEach((c, i) => { const b = h('button', 'swatch' + (i ? '' : ' on')); b.style.background = c; b.setAttribute('aria-label', 'Color ' + c); b.onclick = () => { color = c; sw.querySelectorAll('.swatch').forEach(x => x.classList.toggle('on', x === b)); }; sw.append(b); });
  document.querySelectorAll('.modeBtn[data-mode]').forEach(b => b.onclick = () => { mode = b.dataset.mode; document.querySelectorAll('.modeBtn[data-mode]').forEach(x => x.classList.toggle('on', x === b)); $('#sheetWrap').classList.toggle('draw', mode === 'draw'); });
  $('#sheet').addEventListener('click', e => { if (mode !== 'fill') return; const r = e.target.closest('.rg'); if (!r) return; r.style.fill = color; });
  const cv = $('#drawLayer'); ctx = cv.getContext('2d');
  const fit = () => { const r = cv.getBoundingClientRect(); if (!r.width) return; const img = cv.width ? ctx.getImageData(0, 0, cv.width, cv.height) : null; const d = devicePixelRatio || 1; const w = Math.round(r.width * d), hh = Math.round(r.height * d); if (w === cv.width && hh === cv.height) return; const tmp = document.createElement('canvas'); tmp.width = cv.width; tmp.height = cv.height; if (img) tmp.getContext('2d').putImageData(img, 0, 0); cv.width = w; cv.height = hh; if (tmp.width) ctx.drawImage(tmp, 0, 0, w, hh); };
  new ResizeObserver(fit).observe(cv);
  let drawing = false, last = null;
  const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
  cv.addEventListener('pointerdown', e => { drawing = true; last = pos(e); cv.setPointerCapture(e.pointerId); dot(last); });
  cv.addEventListener('pointermove', e => { if (!drawing) return; const p = pos(e); ctx.strokeStyle = color; ctx.lineWidth = 7 * (devicePixelRatio || 1); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(...last); ctx.lineTo(...p); ctx.stroke(); last = p; });
  const stop = () => { drawing = false; }; cv.addEventListener('pointerup', stop); cv.addEventListener('pointercancel', stop);
  const dot = p => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p[0], p[1], 3.5 * (devicePixelRatio || 1), 0, 6.28); ctx.fill(); };
  $('#printBtn').onclick = () => window.print();
  $('#saveImg').onclick = saveSheet;
}
function clearSheet() { document.querySelectorAll('#sheet .rg').forEach(r => { r.style.fill = ''; }); const cv = $('#drawLayer'); ctx?.clearRect(0, 0, cv.width, cv.height); }
async function saveSheet() {
  const svg = $('#sheet').cloneNode(true);
  svg.querySelectorAll('.rg').forEach(r => { r.setAttribute('fill', r.style.fill || '#fff'); r.setAttribute('stroke', '#1c2347'); r.setAttribute('stroke-width', '3'); });
  svg.querySelectorAll('.ln').forEach(r => { r.setAttribute('fill', 'none'); r.setAttribute('stroke', '#1c2347'); r.setAttribute('stroke-width', '3'); r.setAttribute('stroke-linecap', 'round'); });
  svg.querySelectorAll('text').forEach(t => { t.setAttribute('font-family', 'Fredoka, sans-serif'); t.setAttribute('fill', t.classList.contains('faint') ? '#9aa6c8' : '#1c2347'); });
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); svg.setAttribute('width', 2000); svg.setAttribute('height', 1440);
  const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
  await img.decode().catch(() => {});
  const out = document.createElement('canvas'); out.width = 2000; out.height = 1440; const o = out.getContext('2d');
  o.drawImage(img, 0, 0, 2000, 1440); o.drawImage($('#drawLayer'), 0, 0, 2000, 1440);
  const a = document.createElement('a'); a.download = 'mi-dibujo-daniel.png'; a.href = out.toDataURL('image/png'); a.click();
  fanfare();
}

function show(n) {
  cur = Math.max(0, Math.min(sections.length - 1, n));
  sections.forEach((s, i) => s.classList.toggle('on', i === cur));
  document.querySelectorAll('#dots i').forEach((d, i) => d.classList.toggle('on', i === cur));
  $('#bar').style.width = ((cur + 1) / sections.length * 100) + '%';
  const s = sections[cur]; $('#label').textContent = `${cur + 1}/${sections.length} · ${s.dataset.title} · ${s.dataset.time}`;
  $('#stage').scrollTop = 0;
  if (s.id === 's-cover') inits['s-cover']?.();
}
function initNav() {
  sections.forEach((s, i) => { const d = h('i'); d.title = s.dataset.title; d.onclick = () => show(i); $('#dots').append(d); });
  $('#prev').onclick = () => show(cur - 1);
  $('#next').onclick = e => { show(cur + 1); confettiFrom(e.currentTarget, 14); };
  addEventListener('keydown', e => {
    if (e.target.closest?.('textarea, input, .carousel-container')) return;
    if (e.key === 'ArrowRight') show(cur + 1); if (e.key === 'ArrowLeft') show(cur - 1);
  });
}
// Si los niños se quedan quietos 6 s, la próxima cosa por tocar "se menea" para llamar su atención
function initNudge() {
  let t; const wake = () => { document.querySelectorAll('.nudge').forEach(x => x.classList.remove('nudge')); clearTimeout(t); t = setTimeout(() => {
    const s = sections[cur];
    const el = s.querySelector('.meaning:not(.unblur), .carousel-slide[data-current] .mcard:not(.open), .carousel-slide[data-current] .hid:not(.show), .scrollHint, .opt:not(.sel), button.week:not(.lit)') || $('#next');
    el.classList.add('nudge'); }, 6000); };
  ['pointermove', 'pointerdown', 'keydown'].forEach(ev => addEventListener(ev, wake, { passive: true })); wake();
}
function initTimer() {
  let sec = 0, run = false; const t = $('#timer'), go = $('#tStart');
  const fmt = () => { t.textContent = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0'); t.classList.toggle('late', sec > 1800); };
  setInterval(() => { if (run) { sec++; fmt(); } }, 1000);
  go.onclick = () => { run = !run; go.textContent = run ? '⏸' : '▶'; };
  $('#tReset').onclick = () => { if (confirm('¿Reiniciar el cronómetro?')) { sec = 0; run = false; go.textContent = '▶'; fmt(); } };
}
function initControls() {
  $('#btnSound').onclick = e => { setMuted(!isMuted()); e.currentTarget.textContent = isMuted() ? '🔇' : '🔊'; };
  $('#btnMotion').onclick = () => document.body.classList.toggle('calm');
}
boot();

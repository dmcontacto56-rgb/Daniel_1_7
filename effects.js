/* effects.js — confeti, ondas de agua y chispas de colores (estilo Click Spark de React Bits). */
const canvas = document.getElementById('fx');
const g = canvas.getContext('2d');
const COLORS = ['#0887F5', '#24B5EF', '#7CB8F0', '#C97BF0', '#9589EB', '#ffd54a'];
const RAINBOW = ['#ff4d6d', '#ff8c42', '#ffd23f', '#5ce07a', '#24B5EF', '#0887F5', '#9a6bff', '#ff4dd2', '#ffffff'];
let parts = [], rings = [], sparks = [], dots = [], running = false;
const calm = () => document.body.classList.contains('calm') || matchMedia('(prefers-reduced-motion:reduce)').matches;
function resize() { const d = devicePixelRatio || 1; canvas.width = innerWidth * d; canvas.height = innerHeight * d; g.setTransform(d, 0, 0, d, 0, 0); }
addEventListener('resize', resize); resize();

function frame(now) {
  g.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter(p => p.life > 0 && p.y < innerHeight + 20);
  for (const p of parts) {
    p.vy += 0.25; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.r += p.vr; p.life--;
    g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.globalAlpha = Math.min(1, p.life / 25);
    g.fillRect(-p.s / 2, -p.s / 3, p.s, p.s / 1.6); g.restore();
  }
  rings = rings.filter(r => r.a > 0.02);
  for (const r of rings) { r.r += r.v; r.a *= 0.93; g.globalAlpha = r.a; g.strokeStyle = r.c; g.lineWidth = 3; g.beginPath(); g.arc(r.x, r.y, r.r, 0, 6.28); g.stroke(); }
  /* chispas: rayitos que salen disparados y se acortan */
  sparks = sparks.filter(s => now - s.t0 < s.dur);
  g.lineCap = 'round';
  for (const s of sparks) {
    if (now < s.t0) continue;
    const p =(now - s.t0) / s.dur, e = 1 - (1 - p) * (1 - p), d = e * s.rad, len = s.len * (1 - e);
    g.globalAlpha = 1 - p * .3; g.strokeStyle = s.c; g.lineWidth = s.w;
    g.beginPath(); g.moveTo(s.x + Math.cos(s.a) * d, s.y + Math.sin(s.a) * d);
    g.lineTo(s.x + Math.cos(s.a) * (d + len), s.y + Math.sin(s.a) * (d + len)); g.stroke();
  }
  /* puntitos brillantes que caen */
  dots = dots.filter(d => d.life > 0);
  for (const d of dots) {
    d.vy += .12; d.x += d.vx; d.y += d.vy; d.vx *= .97; d.life -= .025;
    g.globalAlpha = Math.max(0, d.life); g.fillStyle = d.c; g.beginPath(); g.arc(d.x, d.y, d.r * d.life + .5, 0, 6.28); g.fill();
  }
  g.globalAlpha = 1;
  if (parts.length || rings.length || sparks.length || dots.length) requestAnimationFrame(frame); else { running = false; g.clearRect(0, 0, innerWidth, innerHeight); }
}
const go = () => { if (!running) { running = true; requestAnimationFrame(frame); } };

export function confetti(x, y, n = 45) {
  if (calm()) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = 3 + Math.random() * 7;
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4, s: 6 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: COLORS[i % COLORS.length], life: 70 + Math.random() * 40 });
  }
  go();
}
/* Ondas de agua: tres anillos que se expanden donde se toca */
export function ripple(x, y) {
  if (calm()) return;
  [0, 1, 2].forEach(i => setTimeout(() => { rings.push({ x, y, r: 6, v: 2.6 + i * .5, a: .75, c: i % 2 ? '#C97BF0' : '#24B5EF' }); go(); }, i * 110));
}
/* Chispas de colores: dos coronas de rayos + puntitos (power = 1 normal, 2–3 para celebrar) */
export function sparkBurst(x, y, power = 1) {
  if (calm()) return;
  const t0 = performance.now();
  const rings2 = [[22, 46, 14, 3], [14, 78, 10, 2.2]];
  rings2.forEach(([n, rad, len, w], k) => {
    const count = Math.round(n * power), off = Math.random() * Math.PI;
    for (let i = 0; i < count; i++) sparks.push({ x, y, a: off + (i / count) * Math.PI * 2 + (k ? Math.PI / count : 0), rad: rad * (0.85 + power * .15) * (0.9 + Math.random() * .2), len: len * (power > 1 ? 1.4 : 1), w, c: RAINBOW[(i + k * 3) % RAINBOW.length], t0: t0 + k * 60, dur: 520 + k * 120 });
  });
  for (let i = 0; i < 18 * power; i++) {
    const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 5 * power;
    dots.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, r: 2 + Math.random() * 2.5, c: RAINBOW[i % RAINBOW.length], life: 1 });
  }
  go();
}
export const confettiFrom = (el, n) => { const b = el.getBoundingClientRect(); confetti(b.left + b.width / 2, b.top + b.height / 2, n); };
export const sparkFrom = (el, power = 2) => { const b = el.getBoundingClientRect(); sparkBurst(b.left + b.width / 2, b.top + b.height / 2, power); };
export function shake(el) {
  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
}

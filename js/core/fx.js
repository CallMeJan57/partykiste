// Visuelle Effekte: Bildschirmblitz, Wackeln, Partikelexplosion und kurze Hinweise (Toast).
// Alle Effekte entfallen oder werden abgeschwächt, wenn das Gerät "Bewegung reduzieren" eingestellt hat.

export function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

let flashEl = null;

/** Kurzer, bildschirmfüllender Blitz. */
export function flash(color = '#ffffff') {
  if (!flashEl) {
    flashEl = document.createElement('div');
    flashEl.className = 'fx-flash';
    document.body.append(flashEl);
  }
  flashEl.style.background = color;
  flashEl.classList.remove('is-on');
  void flashEl.offsetWidth; // Animation neu starten
  flashEl.classList.add('is-on');
}

/** Kurzer Hinweis am unteren Bildschirmrand, der von selbst verschwindet. */
export function toast(message, duration = 2400) {
  document.querySelector('.fx-toast')?.remove();
  const el = document.createElement('div');
  el.className = 'fx-toast';
  el.setAttribute('role', 'status');
  el.textContent = message;
  document.body.append(el);

  const rise = reducedMotion() ? '0px' : '12px';
  el.animate(
    [
      { opacity: 0, transform: `translate(-50%, ${rise})` },
      { opacity: 1, transform: 'translate(-50%, 0)', offset: 0.08 },
      { opacity: 1, transform: 'translate(-50%, 0)', offset: 0.85 },
      { opacity: 0, transform: 'translate(-50%, 0)' },
    ],
    { duration, easing: 'ease', fill: 'forwards' },
  ).onfinish = () => el.remove();
}

/** Lässt ein Element (standardmäßig die ganze App) kurz wackeln. */
export function shake(target = document.querySelector('.app')) {
  if (!target || reducedMotion()) return;
  target.classList.remove('fx-shake');
  void target.offsetWidth;
  target.classList.add('fx-shake');
}

let canvas = null;
let painter = null;
let particles = [];
let animating = false;

/** Partikelexplosion an Position x/y (Standard: Bildschirmmitte, etwas oberhalb). */
export function burst({ x = window.innerWidth / 2, y = window.innerHeight * 0.4, count = 46, colors = themeColors() } = {}) {
  if (reducedMotion()) return;
  setupCanvas();

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 7;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      r: 2 + Math.random() * 4,
      color: colors[i % colors.length],
      life: 1,
    });
  }

  if (!animating) {
    animating = true;
    requestAnimationFrame(step);
  }
}

function themeColors() {
  const styles = getComputedStyle(document.documentElement);
  return ['--accent', '--accent-2', '--danger', '--text'].map((name) => styles.getPropertyValue(name).trim());
}

function setupCanvas() {
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'fx-canvas';
    document.body.append(canvas);
    painter = canvas.getContext('2d');
  }
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  painter.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// Immer die ganze Zeichenfläche leeren – auch wenn sich die Fenstergröße seit dem Start geändert hat
// (z. B. wenn am Handy die Adressleiste ein- oder ausfährt), sonst bleiben Spuren stehen.
function clearCanvas() {
  painter.save();
  painter.setTransform(1, 0, 0, 1, 0, 0);
  painter.clearRect(0, 0, canvas.width, canvas.height);
  painter.restore();
}

function step() {
  clearCanvas();
  particles = particles.filter((p) => p.life > 0);

  for (const p of particles) {
    p.vy += 0.18;
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.012;
    painter.globalAlpha = Math.max(p.life, 0);
    painter.fillStyle = p.color;
    painter.beginPath();
    painter.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    painter.fill();
  }
  painter.globalAlpha = 1;

  if (particles.length) {
    requestAnimationFrame(step);
  } else {
    animating = false;
    clearCanvas();
  }
}

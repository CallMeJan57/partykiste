// Zeichnet eine Yogaposition aus poses.js als Strichmännchen (SVG) und rechnet Übergänge zwischen Positionen.

const SOLO_WIDTH = 120;
const DUO_WIDTH = 160;
const HEAD_RADIUS = 6.5;

const point = ([x, y]) => `${x} ${y}`;

function limb(from, [x1, y1, x2, y2], className) {
  return `<path class="${className}" d="M${point(from)}L${x1} ${y1}L${x2} ${y2}"/>`;
}

function figure({ h, n, p, a, l }, index) {
  // Hinteren Arm und hinteres Bein zuerst und blasser zeichnen, damit die Figur räumlich wirkt.
  return `
    <g class="yg-figure yg-figure-${index + 1}">
      ${limb(n, a[1], 'yg-far')}
      ${limb(p, l[1], 'yg-far')}
      <path d="M${point(n)}L${point(p)}"/>
      ${limb(p, l[0], '')}
      ${limb(n, a[0], '')}
      <circle cx="${h[0]}" cy="${h[1]}" r="${HEAD_RADIUS}"/>
    </g>`;
}

export function figuresMarkup(figures) {
  return figures.map(figure).join('');
}

// figures: andere Gelenkpunkte als die der Position, z. B. der Startpunkt eines Übergangs
export function poseSvg(pose, { label = pose.name, figures = pose.figures } = {}) {
  const width = pose.figures.length > 1 ? DUO_WIDTH : SOLO_WIDTH;
  return `
    <svg class="yg-pose" viewBox="0 0 ${width} 100" role="img" aria-label="${label}">
      <line class="yg-floor" x1="4" y1="95" x2="${width - 4}" y2="95"/>
      <g class="yg-figures">${figuresMarkup(figures)}</g>
    </svg>`;
}

// Aufrecht stehend, Arme locker – dort, wo in der Zielposition die Hüfte ist. Startpunkt für Übergänge.
export function standing(figures) {
  return figures.map(({ p: [x] }) => ({
    h: [x, 22], n: [x, 30], p: [x, 56],
    a: [[x + 5, 43, x + 7, 57], [x - 5, 43, x - 7, 57]],
    l: [[x + 3, 74, x + 4, 92], [x - 3, 74, x - 4, 92]],
  }));
}

// Jubelnd mit Armen im V nach oben; zu zweit nebeneinander, damit sie sich nicht überdecken
export function victory(figures) {
  const spread = (index) => DUO_WIDTH * (index + 1) / (figures.length + 1);
  return figures.map(({ p: [hip] }, index) => figures.length > 1 ? spread(index) : hip).map((x) => ({
    h: [x, 22], n: [x, 30], p: [x, 56],
    a: [[x + 9, 20, x + 17, 9], [x - 9, 20, x - 17, 9]],
    l: [[x + 5, 74, x + 7, 92], [x - 5, 74, x - 7, 92]],
  }));
}

// Zwischenstand zweier Positionen mit gleich vielen Figuren (t von 0 bis 1)
export function blend(from, to, t) {
  const mix = (a, b) => (Array.isArray(a) ? a.map((value, i) => mix(value, b[i])) : a + (b - a) * t);
  return to.map((target, index) => Object.fromEntries(
    Object.entries(target).map(([key, value]) => [key, mix(from[index][key], value)]),
  ));
}

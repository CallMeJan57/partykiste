// Farbrechnung für Color Match: Umrechnungen und die Wertung, wie nah zwei Farben beieinanderliegen.

/** Farbton 0–360, Sättigung und Helligkeit 0–100 → { r, g, b } mit Werten von 0–255. */
export function hsvToRgb({ h, s, v }) {
  const value = v / 100;
  const chroma = value * (s / 100);
  const sector = ((h % 360) + 360) % 360 / 60;
  const second = chroma * (1 - Math.abs((sector % 2) - 1));
  const [r, g, b] = [
    [chroma, second, 0],
    [second, chroma, 0],
    [0, chroma, second],
    [0, second, chroma],
    [second, 0, chroma],
    [chroma, 0, second],
  ][Math.floor(sector)];
  const base = value - chroma;
  return { r: Math.round((r + base) * 255), g: Math.round((g + base) * 255), b: Math.round((b + base) * 255) };
}

/** { r, g, b } → Farbton 0–360, Sättigung und Helligkeit 0–100. */
export function rgbToHsv({ r, g, b }) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta) {
    if (max === r) h = ((g - b) / delta + 6) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
  }
  return { h: h * 60, s: max ? (delta / max) * 100 : 0, v: (max / 255) * 100 };
}

export function css({ r, g, b }) {
  return `rgb(${r}, ${g}, ${b})`;
}

/** Gut lesbare Schriftfarbe auf der angegebenen Farbe. */
export function textOn(color) {
  return toLab(color).l > 62 ? '#14110f' : '#ffffff';
}

function toLinear(channel) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function labPart(value) {
  return value > 216 / 24389 ? Math.cbrt(value) : (24389 / 27 * value + 16) / 116;
}

// sRGB → CIELAB (Weißpunkt D65)
function toLab({ r, g, b }) {
  const [red, green, blue] = [toLinear(r), toLinear(g), toLinear(b)];
  const x = labPart((0.4124564 * red + 0.3575761 * green + 0.1804375 * blue) / 0.95047);
  const y = labPart(0.2126729 * red + 0.7151522 * green + 0.072175 * blue);
  const z = labPart((0.0193339 * red + 0.119192 * green + 0.9503041 * blue) / 1.08883);
  return { l: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
}

const DEG = Math.PI / 180;

/** CIEDE2000: Farbabstand, der dem menschlichen Sehen nahekommt (ab etwa 1 sichtbar). */
export function labDistance(first, second) {
  const chromaMean = (Math.hypot(first.a, first.b) + Math.hypot(second.a, second.b)) / 2;
  const g = 0.5 * (1 - Math.sqrt(chromaMean ** 7 / (chromaMean ** 7 + 25 ** 7)));
  const a1 = (1 + g) * first.a;
  const a2 = (1 + g) * second.a;
  const c1 = Math.hypot(a1, first.b);
  const c2 = Math.hypot(a2, second.b);
  const h1 = c1 ? (Math.atan2(first.b, a1) / DEG + 360) % 360 : 0;
  const h2 = c2 ? (Math.atan2(second.b, a2) / DEG + 360) % 360 : 0;
  const hasHue = c1 * c2 !== 0;

  let hueStep = h2 - h1;
  if (hueStep > 180) hueStep -= 360;
  if (hueStep < -180) hueStep += 360;
  if (!hasHue) hueStep = 0;

  const dL = second.l - first.l;
  const dC = c2 - c1;
  const dH = 2 * Math.sqrt(c1 * c2) * Math.sin((hueStep * DEG) / 2);

  const lMean = (first.l + second.l) / 2;
  const cMean = (c1 + c2) / 2;
  let hMean = h1 + h2;
  if (hasHue) {
    if (Math.abs(h1 - h2) <= 180) hMean /= 2;
    else hMean = (hMean + (hMean < 360 ? 360 : -360)) / 2;
  }

  const t = 1
    - 0.17 * Math.cos((hMean - 30) * DEG)
    + 0.24 * Math.cos(2 * hMean * DEG)
    + 0.32 * Math.cos((3 * hMean + 6) * DEG)
    - 0.2 * Math.cos((4 * hMean - 63) * DEG);
  const rotation = 30 * Math.exp(-(((hMean - 275) / 25) ** 2));
  const rc = 2 * Math.sqrt(cMean ** 7 / (cMean ** 7 + 25 ** 7));
  const sl = 1 + (0.015 * (lMean - 50) ** 2) / Math.sqrt(20 + (lMean - 50) ** 2);
  const sc = 1 + 0.045 * cMean;
  const sh = 1 + 0.015 * cMean * t;
  const rt = -Math.sin(2 * rotation * DEG) * rc;

  return Math.sqrt(
    (dL / sl) ** 2 + (dC / sc) ** 2 + (dH / sh) ** 2 + rt * (dC / sc) * (dH / sh),
  );
}

export function colorDistance(first, second) {
  return labDistance(toLab(first), toLab(second));
}

/** Wertung in Prozent: Kleine Abstände kosten wenig, große fast alles. */
export function matchPercent(first, second) {
  const distance = colorDistance(first, second);
  return Math.round(100 * Math.exp(-((distance / 22) ** 1.3)));
}

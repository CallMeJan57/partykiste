// Zufallshelfer für Spiele.

/** Zufällige Kommazahl zwischen min und max. */
export function between(min, max) {
  return min + Math.random() * (max - min);
}

/** Zufälliges Element einer Liste. */
export function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/** Zufälliges Element, aber nicht dasselbe wie beim letzten Mal. */
export function pickOther(list, previous) {
  const pool = list.length > 1 ? list.filter((item) => item !== previous) : list;
  return pick(pool);
}

/** Gemischte Kopie einer Liste. */
export function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

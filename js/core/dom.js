// Kleine DOM-Helfer.

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Text sicher in HTML-Vorlagen einsetzen: `<p>${esc(name)}</p>` */
export function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

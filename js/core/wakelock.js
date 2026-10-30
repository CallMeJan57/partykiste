// Verhindert, dass das Display während eines Spiels ausgeht (sofern der Browser das unterstützt).

let lock = null;
let wanted = false;

async function acquire() {
  if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try {
    lock = await navigator.wakeLock.request('screen');
  } catch {
    lock = null;
  }
}

export function keepAwake(on) {
  wanted = on;
  if (on) {
    acquire();
  } else if (lock) {
    lock.release().catch(() => {});
    lock = null;
  }
}

// Der Browser gibt die Sperre beim Wechsel in den Hintergrund frei – danach neu anfordern.
document.addEventListener('visibilitychange', () => {
  if (wanted && document.visibilityState === 'visible') acquire();
});

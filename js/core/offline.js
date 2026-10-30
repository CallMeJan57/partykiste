// Offline & App-Installation: meldet den Service Worker (sw.js) an und nennt ihm alle Dateien,
// die die App braucht – auch die Styles der Spiele, die erst beim Öffnen eines Spiels geladen werden.

export function enableOffline(games) {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('sw.js');
      const { active } = await navigator.serviceWorker.ready;
      const loaded = performance.getEntriesByType('resource').map((entry) => entry.name);
      const urls = [...new Set([...loaded, ...games.map((game) => game.styles)])]
        .filter((url) => url && new URL(url).origin === location.origin);
      active?.postMessage({ type: 'precache', urls });
    } catch (error) {
      // z. B. in der Vorschau auf claude.ai oder im privaten Modus – die App läuft dann einfach ohne Offline-Modus
      console.info('[Partykiste] Offline-Modus nicht verfügbar:', error.message);
    }
  });
}

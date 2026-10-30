// Dauerhafter Speicher im Browser (localStorage), pro Spiel in einem eigenen Namensraum.
// Fehler (z. B. im privaten Modus) werden geschluckt – dann gilt einfach der Fallback-Wert.

const PREFIX = 'partykiste:';

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Speicher nicht verfügbar – ignorieren
  }
}

export function createStorage(namespace) {
  const fullKey = (key) => `${PREFIX}${namespace}:${key}`;

  return {
    get(key, fallback = null) {
      const raw = read(fullKey(key));
      if (raw === null) return fallback;
      try {
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      write(fullKey(key), JSON.stringify(value));
    },
  };
}

export const appStorage = createStorage('app');

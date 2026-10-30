// Liefert zu Interpret + Titel eine 30-Sekunden-Hörprobe von Apple.
// Zuerst aus previews.js (vorab gesucht mit tools/song-hoerproben.py) – so muss das Handy nicht selbst
// bei Apple suchen, was am iPhone oft blockiert wird. Nur Songs, die dort fehlen, werden live gesucht.

import previews from './previews.js';

const SEARCH_URL = 'https://itunes.apple.com/search';

// Karaoke-, Cover-, Tribute-, Kinderlied-, Instrumental- und Klingelton-Versionen sollen nie gewinnen.
const UNWANTED = /karaoke|tribute|cover version|made famous|in the style of|originally performed|instrumental version|[([]instrumental|string quartet|klingelton|ringtone|sped up|slowed|8-bit|lullaby|piano version|kita|kinderlieder|for kids/i;

// Füllwörter zählen beim Interpreten nicht – sonst passt „Die Eiskönigin“ zu jedem Album mit „die“.
const FILLER_WORDS = new Set(['der', 'die', 'das', 'the', 'und', 'and', 'of', 'von']);

const JSONP_TIMEOUT = 8000;

const cache = new Map();

// Safari (v. a. am iPhone) blockiert die normale Anfrage oft, weil Apple die CORS-Freigabe nicht
// zuverlässig mitschickt. Dann laden wir das Ergebnis als Skript (JSONP) – das ist nicht betroffen.
let useJsonp = false;
let jsonpCount = 0;

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const name = `__partykisteItunes${++jsonpCount}`;
    const script = document.createElement('script');
    const cleanup = () => {
      clearTimeout(timer);
      delete window[name];
      script.remove();
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('iTunes antwortet nicht'));
    }, JSONP_TIMEOUT);
    window[name] = (data) => {
      cleanup();
      resolve(data);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error('iTunes nicht erreichbar'));
    };
    script.src = `${url}&callback=${name}`;
    document.head.append(script);
  });
}

async function search(url) {
  if (!useJsonp) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`iTunes antwortet mit ${response.status}`);
      return await response.json();
    } catch {
      useJsonp = true; // ab jetzt direkt über JSONP
    }
  }
  return jsonp(url);
}

function normalize(text) {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ß/g, 'ss') // Apple schreibt z. B. „Scheiss drauf!“
    .replace(/\b([a-z])\.(?=[a-z]\.?)/g, '$1') // Abkürzungen wie „R.E.M.“ oder „K.I.Z“ zusammenziehen
    .replace(/\((?:feat|ft|with)[^)]*\)/g, ' ')
    .replace(/\b(?:feat|ft)\.?\s.*$/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Titel ohne Zusätze in Klammern, z. B. „Mambo No. 5 (A Little Bit of …)“ → „mambo no 5“
function coreTitle(title) {
  return normalize(title.replace(/[([].*?[)\]]/g, ' ')) || normalize(title);
}

function score(result, artist, title) {
  const wantedTitle = coreTitle(title);
  const foundTitle = normalize(result.trackName ?? '');
  if (!foundTitle.includes(wantedTitle) && !wantedTitle.includes(coreTitle(result.trackName ?? ''))) return -1;
  if (UNWANTED.test(`${result.artistName} ${result.collectionName} ${result.trackName}`)) return -1;

  let points = 1;
  const artistWords = normalize(artist).split(' ').filter((word) => word.length > 1 && !FILLER_WORDS.has(word));
  const foundArtist = normalize(`${result.artistName} ${result.collectionName ?? ''}`);
  if (artistWords.some((word) => foundArtist.includes(word))) points += 2;
  if (foundTitle === wantedTitle) points += 1;
  return points;
}

/**
 * Liefert { preview, cover, year, link, foundArtist, foundTitle } oder null, wenn nichts Passendes da ist.
 * Wirft bei Netzwerkfehlern.
 */
export async function findPreview(artist, title) {
  const key = `${artist}|${title}`;
  if (previews[key]) return previews[key];
  if (cache.has(key)) return cache.get(key);

  const params = new URLSearchParams({
    term: `${artist} ${title.replace(/[([].*?[)\]]/g, ' ')}`,
    media: 'music',
    entity: 'song',
    country: 'DE',
    limit: '15',
  });
  const { results = [] } = await search(`${SEARCH_URL}?${params}`);

  const best = results
    .filter((result) => result.previewUrl)
    .map((result) => ({ result, points: score(result, artist, title) }))
    .filter((entry) => entry.points > 0)
    .sort((a, b) => b.points - a.points)[0]?.result;

  const found = best
    ? {
        preview: best.previewUrl,
        cover: best.artworkUrl100?.replace('100x100bb', '600x600bb') ?? null,
        year: best.releaseDate?.slice(0, 4) ?? '',
        link: best.trackViewUrl ?? null,
        foundArtist: best.artistName,
        foundTitle: best.trackName,
      }
    : null;
  cache.set(key, found);
  return found;
}

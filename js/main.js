import { startApp } from './core/app.js';
import { enableOffline } from './core/offline.js';
import { games, sections } from './games/index.js';

startApp({
  name: 'Partykiste',
  games,
  sections,
  topbar: document.getElementById('topbar'),
  view: document.getElementById('view'),
});

enableOffline(games);

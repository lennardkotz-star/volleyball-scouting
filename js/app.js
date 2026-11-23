(function () {
'use strict';
/* ui-base.js – Zustand, Speicher, Routing, Grundbausteine, Diagramme */
const C = window.VCore;
const HOOK = {}; // Andockpunkte für video.js, zones.js und share.js
const $ = (sel, el) => (el || document).querySelector(sel);
const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad2 = (n) => String(n).padStart(2, '0');
const clone = (x) => JSON.parse(JSON.stringify(x));
const todayIso = () => { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };
const fmtDate = (iso) => { if (!iso) return ''; const d = new Date(iso + 'T12:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
const fmtDateShort = (iso) => { if (!iso) return ''; const d = new Date(iso + 'T12:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }); };
const pct = C.pctStr, eff = C.effStr, num = C.numStr;
const ROUTES = ['uebersicht', 'live', 'spiele', 'spieler', 'daten', 'kader'];
const BACKUP_DAYS = 14;
const DEFAULT_SETTINGS = { teamName: '', season: seasonOf(todayIso()), level: 'bezirk', targets: {}, format: { mode: 'bo5', pts: 25, tb: 15 }, rev: 0 };
function seasonOf(iso) { const y = +iso.slice(0, 4), m = +iso.slice(5, 7); const s = m >= 7 ? y : y - 1; return s + '/' + String((s + 1) % 100).padStart(2, '0'); }

/* ------------------------------------------------------------ Zustand */
const S = {
  mode: 'loading', readOnly: false, loaded: false,
  settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
  players: {}, games: {},
  route: 'uebersicht', id: null,
  live: { gameId: null, sel: null, await: null, bx: null, hint: null, panel: 'satz', feed: [], prompted: '', runWarned: '', highlight: null },
  filter: { season: 'all', comp: 'all', last: 0 },
  ui: { gameTab: 'ueberblick', sortP: { k: 'pts', d: -1 }, showAllLog: false, demoOff: false },
  sync: { state: 'idle', msg: '' },
};
const DEMO = { roster: null, map: null, games: null };
function demoData() {
  if (!DEMO.games) {
    DEMO.roster = C.DEMO_ROSTER.map((p) => Object.assign({ active: true, demo: true }, p));
    DEMO.map = Object.fromEntries(DEMO.roster.map((p) => [p.id, p]));
    DEMO.games = C.demoGames();
  }
  return DEMO;
}
function realPlayers() { return Object.values(S.players).filter((p) => p && p.id); }
function realGames() { return Object.values(S.games).filter((g) => g && g.id && !g.practice); }
function isDemo() { return S.loaded && !S.settings.demoOff && realPlayers().length === 0 && realGames().length === 0; }
function rosterMap() { return isDemo() ? demoData().map : S.players; }
function rosterList(includeInactive) {
  const list = isDemo() ? demoData().roster : realPlayers();
  const key = (p) => (hasNo(p) ? +p.num : 1000);
  return list.filter((p) => includeInactive || p.active !== false).sort((a, b) => key(a) - key(b) || String(a.name || '').localeCompare(String(b.name || '')));
}
function statsGames() { return isDemo() ? demoData().games : realGames(); }
function gameById(id) { if (!id) return null; if (S.games[id]) return S.games[id]; if (isDemo()) return demoData().games.find((g) => g.id === id) || null; return null; }
function player(pid) { return rosterMap()[pid] || S.players[pid] || (DEMO.map && DEMO.map[pid]) || null; }
function hasNo(p) { return p && p.num !== '' && p.num !== null && p.num !== undefined && isFinite(+p.num); }
function pNo(p) { return hasNo(p) ? String(p.num) : '–'; }
function pShort(pid) { const p = player(pid); if (!p) return pid ? '?' : '–'; return (p.short || (p.name || '').split(' ')[0] || ('#' + p.num)); }
function pLabel(pid) { const p = player(pid); if (!p) return pid ? 'Unbekannt' : 'ohne Spieler'; return (hasNo(p) ? '#' + p.num + ' ' : '') + pShort(pid); }
function pFull(pid) { const p = player(pid); return p ? (p.name || pShort(pid)) : 'Unbekannt'; }

const aCache = new Map();
function analysis(g) {
  if (!g) return null;
  const key = g.id + ':' + (g.rev || 0) + ':' + (g.events ? g.events.length : 0) + ':' + rosterVersion();
  const hit = aCache.get(g.id);
  if (hit && hit.key === key) return hit.a;
  const a = C.analyzeGame(g, rosterMap());
  aCache.set(g.id, { key, a });
  return a;
}
let _rv = 0; function rosterVersion() { return _rv; }
function bumpRoster() { _rv++; }
function targets() { return C.targetsFor(S.settings); }

/* ------------------------------------------------------------ Speicher */
const LS_KEY = 'vst:data:v1';
const lsGet = (k) => { try { return window.localStorage ? localStorage.getItem(k) : null; } catch (e) { return null; } };
const lsSet = (k, v) => { try { if (window.localStorage) localStorage.setItem(k, v); return true; } catch (e) { return false; } };
const lsDel = (k) => { try { if (window.localStorage) localStorage.removeItem(k); } catch (e) { /* egal */ } };

const Store = {
  kind: null, timers: {}, pending: {},

  /** Lädt alles aus der Browser-Datenbank; alte localStorage-Daten werden einmalig übernommen. */
  async boot() {
    try { await window.VIDB.open(); this.kind = 'idb'; } catch (e) { this.kind = 'ls'; }
    S.mode = 'local';
    if (this.kind === 'idb') {
      try {
        const rows = await window.VIDB.all();
        rows.forEach((r) => {
          if (r.path === 'team/settings') S.settings = Object.assign({}, DEFAULT_SETTINGS, r.data);
          else if (r.path.indexOf('players/') === 0) S.players[r.data.id] = r.data;
          else if (r.path.indexOf('games/') === 0) S.games[r.data.id] = r.data;
        });
        if (!rows.length) this.importLegacy(true);
      } catch (e) { toast('Gespeicherte Daten konnten nicht gelesen werden.', { kind: 'error' }); }
    } else this.importLegacy(false);
    S.loaded = true; bumpRoster();
    setSync(this.kind === 'idb' ? 'local' : 'local-warn', this.kind === 'idb' ? 'Auf diesem Gerät gespeichert' : 'Nur eingeschränkt gespeichert');
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* optional */ }
    afterLoad();
  },
  importLegacy(writeThrough) {
    const raw = lsGet(LS_KEY); if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (d.settings) S.settings = Object.assign({}, DEFAULT_SETTINGS, d.settings);
      S.players = d.players || {}; S.games = d.games || {};
      if (writeThrough) { this.saveSettings(); Object.values(S.players).forEach((p) => this.savePlayer(p)); Object.values(S.games).forEach((g) => this.write('games/' + g.id, () => S.games[g.id], 0)); }
    } catch (e) { toast('Gespeicherte Daten konnten nicht gelesen werden.', { kind: 'error' }); }
  },
  saveLocalSoon() {
    clearTimeout(this.timers.__local);
    this.timers.__local = setTimeout(() => {
      const games = {}; for (const id in S.games) if (!S.games[id].practice) games[id] = S.games[id];
      const ok = lsSet(LS_KEY, JSON.stringify({ settings: S.settings, players: S.players, games }));
      setSync(ok ? 'local' : 'error', ok ? 'Im Browser gespeichert' : 'Speichern im Browser fehlgeschlagen');
    }, 250);
  },
  write(path, getData, delay) {
    if (this.kind !== 'idb') { this.saveLocalSoon(); return; }
    this.pending[path] = getData;
    clearTimeout(this.timers[path]);
    setSync('saving', 'Speichert …');
    this.timers[path] = setTimeout(() => this.flush(path), delay || 0);
  },
  async flush(path) {
    const getData = this.pending[path]; if (!getData) return;
    delete this.pending[path]; clearTimeout(this.timers[path]);
    const data = getData(); if (!data) return;
    try {
      await window.VIDB.put(path, JSON.parse(JSON.stringify(data)));
      setSync('local', 'Auf diesem Gerät gespeichert');
    } catch (e) {
      setSync('error', 'Nicht gespeichert');
      toast(e && e.name === 'QuotaExceededError' ? 'Der Speicher ist voll. Backup herunterladen und alte Spiele löschen.' : 'Speichern fehlgeschlagen – bitte ein Backup herunterladen.', { kind: 'error', ms: 9000 });
    }
  },
  flushAll() { Object.keys(this.pending).forEach((p) => this.flush(p)); },
  async remove(path) {
    if (this.kind !== 'idb') { this.saveLocalSoon(); return; }
    delete this.pending[path]; clearTimeout(this.timers[path]);
    try { await window.VIDB.del(path); setSync('local', 'Auf diesem Gerät gespeichert'); } catch (e) { setSync('error', 'Löschen fehlgeschlagen'); toast('Löschen fehlgeschlagen – bitte erneut versuchen.', { kind: 'error' }); }
  },
  async wipe() { if (this.kind === 'idb') await window.VIDB.clear(); },

  saveSettings() { S.settings.rev = (S.settings.rev || 0) + 1; this.write('team/settings', () => S.settings, 300); },
  savePlayer(p) { S.players[p.id] = p; bumpRoster(); this.write('players/' + p.id, () => S.players[p.id], 0); },
  deletePlayer(id) { delete S.players[id]; bumpRoster(); this.remove('players/' + id); },
  saveGame(g, opt) {
    if (g.practice || g.demo) return;
    g.rev = (g.rev || 0) + 1; g.updatedAt = Date.now();
    S.games[g.id] = g;
    backupLive(g);
    this.write('games/' + g.id, () => S.games[g.id] || null, (opt && opt.now) ? 0 : 300);
  },
  deleteGame(id) { delete S.games[id]; lsDel('vst:live:' + id); aCache.delete(id); this.remove('games/' + id); },
};
window.addEventListener('pagehide', () => Store.flushAll());
function backupLive(g) { if (g.status === 'live') lsSet('vst:live:' + g.id, JSON.stringify(g)); else lsDel('vst:live:' + g.id); }
function restoreBackups() {
  if (Store.kind !== 'idb') return;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || k.indexOf('vst:live:') !== 0) continue;
      const g = JSON.parse(localStorage.getItem(k));
      const remote = S.games[g.id];
      if (!remote || (g.rev || 0) > (remote.rev || 0)) {
        S.games[g.id] = g; Store.saveGame(g, { now: true });
        toast('Lokale Sicherung von „' + (g.opponent || 'Spiel') + '“ wiederhergestellt.');
      } else if (remote.status === 'done') lsDel(k);
    }
  } catch (e) { /* localStorage nicht verfügbar */ }
}
function afterLoad() {
  restoreBackups();
  const liveOnes = realGames().filter((g) => g.status === 'live').sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  if (!S.live.gameId && liveOnes.length) S.live.gameId = liveOnes[0].id;
  if (HOOK.afterLoad) HOOK.afterLoad();
  render();
}

function backupDue() {
  const n = realGames().length; if (!n) return false;
  const last = S.settings.lastBackupAt || Math.min(...realGames().map((g) => g.createdAt || Date.now()));
  const changed = realGames().some((g) => (g.updatedAt || 0) > last);
  return changed && Date.now() - last > BACKUP_DAYS * 864e5;
}
function setSync(state, msg) {
  S.sync.state = state; S.sync.msg = msg || '';
  const el = $('#syncChip'); if (!el) return;
  const cls = { saved: 'ok', local: 'ok', saving: 'busy', connecting: 'busy', 'local-warn': 'warn', error: 'bad', idle: '' }[state] || '';
  el.className = 'sync ' + cls;
  el.textContent = msg || '';
}

/* ------------------------------------------------------------ Routing & Rendern */
function parseHash() {
  const h = (location.hash || '').replace(/^#/, '');
  if (/^[kt]=/.test(h)) return { route: 'karte', id: null };
  const m = h.match(/^(spiel|spieler|details|video)-([a-z0-9]+)$/);
  if (m) return { route: m[1], id: m[2] };
  return { route: ROUTES.includes(h) ? h : 'uebersicht', id: null };
}
function go(route, id) {
  const h = '#' + route + (id ? '-' + id : '');
  if (location.hash === h) { onRoute(); } else location.hash = h;
}
function onRoute() {
  const r = parseHash();
  if (r.route !== S.route || r.id !== S.id) { S.ui.gameTab = r.route === 'spiel' ? S.ui.gameTab : 'ueberblick'; S.ui.showAllLog = false; formMemo = {}; }
  S.route = r.route; S.id = r.id;
  render();
  window.scrollTo(0, 0);
}
const VIEWS = {};
let renderQueued = false;
function render() {
  if (renderQueued) return; renderQueued = true;
  const run = () => { if (renderQueued) { renderQueued = false; renderNow(); } };
  if (window.requestAnimationFrame) window.requestAnimationFrame(run);
  setTimeout(run, 150); // in Hintergrund-Tabs läuft requestAnimationFrame nicht
}
function renderNow() {
  const nameEl = $('#teamName'); if (nameEl) nameEl.textContent = S.settings.teamName || 'Volleyball Scouting';
  const sEl = $('#seasonLbl'); if (sEl) sEl.textContent = 'Saison ' + (S.settings.season || '');
  const dl = $('#datenLink'); if (dl) dl.classList.toggle('on', S.route === 'daten');
  $$('#tabs a').forEach((a) => a.classList.toggle('on', a.dataset.r === (S.route === 'spiel' || S.route === 'details' || S.route === 'video' ? 'spiele' : S.route === 'kader' ? 'spieler' : S.route)));
  setSync(S.sync.state, S.sync.msg);
  const banner = $('#banner');
  if (banner) {
    let b = '';
    if (!S.loaded) b = '<div class="banner"><span class="spin" aria-hidden="true"></span> Daten werden geladen …</div>';
    else if (isDemo() && S.route !== 'daten' && S.route !== 'live') b = '<div class="banner demo"><b>Beispieldaten.</b> So sehen eure Auswertungen aus. Mit dem eigenen Kader fängst du komplett neu an. <button class="link" data-act="kaderneu">Kader anlegen</button> oder <button class="link" data-act="testdaten">Testdaten laden</button> zum Ausprobieren.</div>';
    else if (realGames().some((g) => g.test) && S.route !== 'daten' && S.route !== 'live' && S.route !== 'kader') b = '<div class="banner demo"><b>Testdaten.</b> Ein Beispielteam mit sechs gescouteten Spielen zum Ausprobieren. <button class="link" data-act="kaderneu">Eigenen Kader anlegen</button> ersetzt sie.</div>';
    else if (backupDue() && S.route !== 'daten') b = '<div class="banner demo"><b>Backup fällig.</b> Eure Daten liegen nur auf diesem Gerät. <a href="#daten" data-act="tobackup">Jetzt sichern</a></div>';
    banner.innerHTML = b;
  }
  const view = $('#view');
  const fn = VIEWS[S.route] || VIEWS.uebersicht;
  const scouting = S.route === 'live' && !!liveGame() && !!(analysis(liveGame()) || {}).cur && analysis(liveGame()).cur.inSet;
  document.body.classList.toggle('scouting', scouting);
  document.body.classList.toggle('shared', S.route === 'karte');
  fsButtons();
  keepAwake(scouting);
  const act = document.activeElement; const actKey = act && view.contains(act) ? fieldKey(act) : null;
  let sel = null; try { if (actKey && act.selectionStart !== undefined) sel = [act.selectionStart, act.selectionEnd]; } catch (e) { sel = null; }
  try { fn(view); } catch (e) { console.error(e); view.innerHTML = '<div class="card"><h2>Da ist etwas schiefgelaufen</h2><p class="muted">' + esc(e && e.message) + '</p></div>'; }
  if (HOOK.afterRender) HOOK.afterRender(view);
  restoreForm(view, actKey, sel);
}
/* Bildschirm beim Scouten wach halten (wo der Browser es erlaubt) */
let wakeLock = null, wakeWanted = false;
function keepAwake(on) {
  wakeWanted = on;
  try {
    if (on && !wakeLock && navigator.wakeLock && document.visibilityState === 'visible') {
      wakeLock = 'pending';
      navigator.wakeLock.request('screen').then((l) => { wakeLock = l; l.addEventListener('release', () => { if (wakeLock === l) wakeLock = null; }); if (!wakeWanted) { l.release().catch(() => {}); } }).catch(() => { wakeLock = null; });
    } else if (!on && wakeLock && wakeLock !== 'pending') { const l = wakeLock; wakeLock = null; l.release().catch(() => {}); }
  } catch (e) { wakeLock = null; }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && wakeWanted) keepAwake(true); });
/* ------------------------------------------------------------ Vollbild */
S.ui.fs = lsGet('vst:fs') === '1';
let nativeFs = false;
function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
function setFs(on) {
  S.ui.fs = on; lsSet('vst:fs', on ? '1' : '0');
  const de = document.documentElement;
  try {
    if (on && !fsElement()) {
      const req = de.requestFullscreen || de.webkitRequestFullscreen;
      if (req) { const pr = req.call(de, { navigationUI: 'hide' }); nativeFs = true; if (pr && pr.catch) pr.catch(() => { nativeFs = false; }); }
    } else if (!on && fsElement()) { const ex = document.exitFullscreen || document.webkitExitFullscreen; if (ex) ex.call(document); }
  } catch (e) { nativeFs = false; }
  render();
}
['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) => document.addEventListener(ev, () => { if (!fsElement() && nativeFs && S.ui.fs) { nativeFs = false; S.ui.fs = false; lsSet('vst:fs', '0'); render(); } }));
function fsButtons() {
  const b = $('#fsBtn'); if (b) { b.innerHTML = S.ui.fs ? ICON.fsx : ICON.fs; b.setAttribute('aria-label', S.ui.fs ? 'Vollbild beenden' : 'Vollbild'); b.title = b.getAttribute('aria-label'); }
  $$('.tab-fs').forEach((x) => { x.innerHTML = ICON.fsx; });
  document.body.classList.toggle('fs', !!S.ui.fs);
}

/* Zahlenfelder: nur Ziffern (bzw. eine Dezimalstelle) – Unmögliches lässt sich gar nicht erst eintippen */
document.addEventListener('input', (e) => {
  const el = e.target; const t = el && el.dataset && el.dataset.num; if (!t) return;
  const v = el.value;
  let nv = t === 'int' ? v.replace(/\D/g, '') : v.replace(/[^0-9.,]/g, '').replace(/^([^.,]*[.,])(.*)$/, (m, a, b) => a + b.replace(/[.,]/g, ''));
  if (t === 'dec' && /[.,]\d{3,}$/.test(nv)) nv = nv.replace(/([.,]\d{2})\d+$/, '$1');
  if (nv !== v) { el.value = nv; el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); }
}, true);

/* Eingaben in Formularen überstehen ein Neuzeichnen (z. B. wenn die Datenbank zwischendurch Änderungen meldet) */
let formMemo = {};
function fieldKey(el) {
  if (!el || !el.matches || !el.matches('input, textarea, select') || el.closest('.modal-wrap') || el.dataset.f !== undefined) return null;
  if (el.id === 'dictIn' || el.type === 'file') return null;
  return el.dataset.imp ? 'imp:' + el.dataset.imp : el.id || null;
}
function memoField(e) {
  const el = e.target; const view = $('#view'); if (!view || !view.contains(el)) return;
  const k = fieldKey(el); if (!k) return;
  formMemo[k] = el.type === 'checkbox' || el.type === 'radio' ? { c: el.checked } : { v: el.value };
}
document.addEventListener('input', memoField);
document.addEventListener('change', memoField);
function restoreForm(view, actKey, sel) {
  for (const k in formMemo) {
    const el = k.indexOf('imp:') === 0 ? view.querySelector('[data-imp="' + k.slice(4) + '"]') : document.getElementById(k);
    if (!el || !view.contains(el)) continue;
    const m = formMemo[k];
    if ('c' in m) el.checked = m.c; else if (el.value !== m.v) el.value = m.v;
  }
  if (actKey) {
    const el = actKey.indexOf('imp:') === 0 ? view.querySelector('[data-imp="' + actKey.slice(4) + '"]') : document.getElementById(actKey);
    if (el && el !== document.activeElement) { try { el.focus({ preventScroll: true }); if (sel) el.setSelectionRange(sel[0], sel[1]); } catch (e) { /* nicht jedes Feld kann das */ } }
  }
}
function clearFormMemo() { formMemo = {}; }
function liveGame() { const g = S.live.gameId ? S.games[S.live.gameId] : null; return g && g.status === 'live' ? g : null; }

/* ------------------------------------------------------------ Modal, Toast, Bestätigung */
let modalStack = [];
function modal(o) {
  const root = $('#modalRoot');
  const id = 'm' + Math.random().toString(36).slice(2, 7);
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap'; wrap.id = id;
  wrap.innerHTML = '<div class="modal ' + (o.wide ? 'wide' : '') + '" role="dialog" aria-modal="true" aria-labelledby="' + id + 't">' +
    '<div class="modal-h"><h2 id="' + id + 't">' + esc(o.title || '') + '</h2><button class="icon-btn" data-mclose aria-label="Schließen">' + ICON.x + '</button></div>' +
    '<div class="modal-b">' + (o.html || '') + '</div>' +
    (o.actions && o.actions.length ? '<div class="modal-f">' + o.actions.map((a, i) => '<button class="btn ' + (a.kind || '') + '" data-mact="' + i + '"' + (a.id ? ' id="' + a.id + '"' : '') + '>' + esc(a.label) + '</button>').join('') + '</div>' : '') +
    '</div>';
  root.appendChild(wrap);
  const close = () => { wrap.remove(); modalStack = modalStack.filter((x) => x !== close); if (o.onClose) o.onClose(); };
  modalStack.push(close);
  wrap.addEventListener('click', async (e) => {
    if (e.target === wrap && !o.sticky) { close(); return; }
    if (e.target.closest('[data-mclose]')) { close(); return; }
    const b = e.target.closest('[data-mact]');
    if (b) { const a = o.actions[+b.dataset.mact]; const keep = a.fn ? await a.fn(wrap) : undefined; if (keep !== false) close(); }
  });
  if (o.onOpen) o.onOpen(wrap, close);
  const f = wrap.querySelector('[autofocus]') || wrap.querySelector('.modal-f .btn.primary');
  if (f) setTimeout(() => f.focus(), 30);
  return { el: wrap, close };
}
function closeAllModals() { modalStack.slice().forEach((c) => c()); }
function confirmBox(title, text, okLabel, danger) {
  return new Promise((res) => {
    modal({ title, html: '<p>' + esc(text) + '</p>', onClose: () => res(false),
      actions: [{ label: 'Abbrechen', kind: 'ghost', fn: () => { res(false); } }, { label: okLabel || 'OK', kind: danger ? 'danger' : 'primary', id: 'confirmOk', fn: () => { res(true); } }] });
  });
}
function toast(msg, o) {
  o = o || {};
  const root = $('#toastRoot'); if (!root) return;
  const el = document.createElement('div');
  el.className = 'toast ' + (o.kind || '');
  el.setAttribute('role', 'status');
  el.innerHTML = '<span>' + esc(msg) + '</span>' + (o.action ? '<button class="btn small">' + esc(o.action.label) + '</button>' : '');
  if (o.action) el.querySelector('button').addEventListener('click', () => { o.action.fn(); el.remove(); });
  root.appendChild(el);
  setTimeout(() => el.remove(), o.ms || 4200);
  while (root.children.length > 3) root.firstChild.remove();
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalStack.length) modalStack[modalStack.length - 1](); });

/* ------------------------------------------------------------ Downloads & Kopieren */
async function offerFile(filename, data) {
  try {
    const blob = new Blob([data], { type: filename.endsWith('.json') ? 'application/json' : 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  } catch (e) { showCopy(filename, data); }
}
function showCopy(filename, data) {
  modal({ title: filename, wide: true, html: '<p class="muted">Herunterladen ist hier nicht möglich. Kopiere den Inhalt und speichere ihn als Datei.</p><textarea class="mono" rows="12" readonly id="copyArea">' + esc(data) + '</textarea>',
    actions: [{ label: 'Schließen', kind: 'ghost' }, { label: 'Kopieren', kind: 'primary', fn: async (el) => { try { await navigator.clipboard.writeText(data); toast('Kopiert'); } catch (e) { const t = el.querySelector('#copyArea'); t.select(); toast('Markiert – jetzt kopieren'); } return false; } }] });
}

/* ------------------------------------------------------------ Icons */
const ICON = {
  fs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  fsx: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  undo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7H4V2"/><path d="M4.5 7A9 9 0 1 1 3 13"/></svg>',
  more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
  ball: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3c-1.5 3.5-1.2 7 1 9.5M21 12c-3.7-.4-6.7 1.2-8 4.6M5.2 18.2c2-3 5.2-4.5 7.8-5.7"/></svg>',
  mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>',
  video: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  chev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l16-8-6 16-2-6z"/></svg>',
};

/* ------------------------------------------------------------ Bausteine */
function gradeCls(sk, g) {
  const m = {
    S: { '#': 'g5', '+': 'g4', '0': 'g3', '-': 'g2', '=': 'g1' }, R: { '#': 'g5', '+': 'g4', '-': 'g2', '=': 'g1' },
    A: { '#': 'g5', '0': 'g3', '/': 'g2', '=': 'g1' }, B: { '#': 'g5', '+': 'g4', '-': 'g2', '=': 'g1' }, D: { '#': 'g5', '+': 'g4', '-': 'g2', '=': 'g1' },
    F: { net: 'g1', line: 'g1', ball: 'g1', oth: 'g1' },
  };
  if (g === '?') return 'gq';
  return (m[sk] && m[sk][g]) || 'g3';
}
// Stufen-Bezeichnung mit Aktion, z. B. „Annahme 3“, „Aufschlag Ass“
function gLabel(sk, g) { return g === '?' ? 'ohne Stufe' : C.GL[sk][g]; }
function skillGrades(sk, counts) { return C.SKILL[sk].grades.concat(counts && counts['?'] ? ['?'] : []); }
function segBar(sk, counts, tall) {
  const grades = skillGrades(sk, counts); const tot = grades.reduce((s, g) => s + (counts[g] || 0), 0);
  if (!tot) return '<div class="seg empty" aria-label="keine Daten"></div>';
  const label = grades.map((g) => gLabel(sk, g) + ' ' + (counts[g] || 0)).join(', ');
  return '<div class="seg' + (tall ? ' tall' : '') + '" role="img" aria-label="' + esc(C.SKILL[sk].label + ': ' + label) + '">' + grades.filter((g) => counts[g] > 0).map((g) => {
    const share = counts[g] / tot;
    // Prozent im Balken nur, wenn alle Aktionen eine Stufe haben – sonst würden sie den Prozenten im Text widersprechen
    return '<span class="' + gradeCls(sk, g) + '" style="flex:' + counts[g] + '" title="' + esc(gLabel(sk, g) + ': ' + counts[g]) + '">' + (tall && share >= 0.13 && !counts['?'] ? Math.round(share * 100) + '%' : '') + '</span>';
  }).join('') + '</div>';
}
function segLegend(sk, counts) {
  return '<div class="legend">' + skillGrades(sk, counts).map((g) => '<span><i class="sw ' + gradeCls(sk, g) + '"></i>' + esc(gLabel(sk, g)) + (counts ? ' <b>' + (counts[g] || 0) + '</b>' : '') + '</span>').join('') + '</div>';
}
function statusChip(value, target, dir, fmt) {
  if (value === null || value === undefined || target === null || target === undefined) return '';
  const ok = dir === 'max' ? value <= target : value >= target;
  const t = fmt === 'eff' ? eff(target) : fmt === 'avg' ? num(target, 2) : fmt === 'num' ? num(target) : pct(target);
  return '<span class="pill ' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✓ Ziel ' : '✗ Ziel ') + (dir === 'max' ? '≤ ' : '≥ ') + t + '</span>';
}
function spark(vals, o) {
  o = o || {};
  const pts = vals.map((v, i) => [i, v]).filter((p) => p[1] !== null && p[1] !== undefined && isFinite(p[1]));
  if (pts.length < 2) return '';
  const W = o.w || 96, H = o.h || 28, pd = 4;
  const ys = pts.map((p) => p[1]); let lo = Math.min(...ys), hi = Math.max(...ys);
  if (o.target !== undefined && o.target !== null) { lo = Math.min(lo, o.target); hi = Math.max(hi, o.target); }
  if (hi - lo < 1e-9) { hi += 0.5; lo -= 0.5; }
  const n = vals.length - 1 || 1;
  const X = (i) => pd + (i / n) * (W - 2 * pd), Y = (v) => pd + (hi - v) / (hi - lo) * (H - 2 * pd);
  const d = pts.map((p, k) => (k ? 'L' : 'M') + X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join('');
  const last = pts[pts.length - 1];
  const tl = o.target !== undefined && o.target !== null ? '<line class="sp-t" x1="' + pd + '" x2="' + (W - pd) + '" y1="' + Y(o.target).toFixed(1) + '" y2="' + Y(o.target).toFixed(1) + '"/>' : '';
  return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" aria-hidden="true">' + tl + '<path d="' + d + '"/><circle cx="' + X(last[0]).toFixed(1) + '" cy="' + Y(last[1]).toFixed(1) + '" r="3"/></svg>';
}
const flowData = {};
function chartFlow(tl, title, extras) {
  const W = 640, H = 168, pl = 30, pr = 52, pt = 12, pb = 22;
  const n = Math.max(1, tl.length - 1); const diffs = tl.map((x) => x[0] - x[1]);
  const maxAbs = Math.max(4, ...diffs.map((d) => Math.abs(d))); const yM = Math.ceil(maxAbs / 2) * 2;
  const X = (i) => pl + (i / n) * (W - pl - pr), Y = (d) => pt + (yM - d) / (2 * yM) * (H - pt - pb);
  const line = diffs.map((d, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(d).toFixed(1)).join('');
  const area = line + 'L' + X(diffs.length - 1).toFixed(1) + ',' + Y(0).toFixed(1) + 'L' + X(0).toFixed(1) + ',' + Y(0).toFixed(1) + 'Z';
  const id = 'f' + Math.random().toString(36).slice(2, 8);
  flowData[id] = { tl, extras: extras || [], X, n, W, H, pl, pr };
  const ticks = [yM, yM / 2, 0, -yM / 2, -yM];
  const grid = ticks.map((t) => '<line class="' + (t === 0 ? 'base' : 'grid') + '" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(t).toFixed(1) + '" y2="' + Y(t).toFixed(1) + '"/><text class="ax" x="' + (pl - 6) + '" y="' + (Y(t) + 4).toFixed(1) + '" text-anchor="end">' + (t > 0 ? '+' + t : t < 0 ? '−' + Math.abs(t) : '0') + '</text>').join('');
  const last = tl[tl.length - 1], ld = diffs[diffs.length - 1];
  const marks = (extras || []).map((x) => '<line class="tomark" x1="' + X(x.i).toFixed(1) + '" x2="' + X(x.i).toFixed(1) + '" y1="' + (pt - 6) + '" y2="' + (pt + 6) + '"><title>' + esc(x.label) + '</title></line>').join('');
  return '<figure class="flow" data-flow="' + id + '"><figcaption>' + esc(title) + '</figcaption>' +
    '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(title + ': Endstand ' + last[0] + ':' + last[1]) + '">' +
    '<defs><clipPath id="' + id + 'a"><rect x="0" y="0" width="' + W + '" height="' + Y(0).toFixed(1) + '"/></clipPath><clipPath id="' + id + 'b"><rect x="0" y="' + Y(0).toFixed(1) + '" width="' + W + '" height="' + H + '"/></clipPath></defs>' +
    grid + marks + '<path class="a-us" d="' + area + '" clip-path="url(#' + id + 'a)"/><path class="a-them" d="' + area + '" clip-path="url(#' + id + 'b)"/>' +
    '<path class="ln" d="' + line + '"/><circle class="end" cx="' + X(diffs.length - 1).toFixed(1) + '" cy="' + Y(ld).toFixed(1) + '" r="4"/>' +
    '<text class="endl" x="' + (X(diffs.length - 1) + 8).toFixed(1) + '" y="' + (Y(ld) + 4).toFixed(1) + '">' + last[0] + ':' + last[1] + '</text>' +
    '<text class="ax" x="' + (W - pr) + '" y="' + (H - 6) + '" text-anchor="end">Ballwechsel →</text>' +
    '<line class="xh" x1="0" x2="0" y1="' + pt + '" y2="' + (H - pb) + '" style="display:none"/>' +
    '<rect class="hit" x="' + pl + '" y="0" width="' + (W - pl - pr) + '" height="' + H + '"/></svg><div class="tip" hidden></div></figure>';
}
document.addEventListener('pointermove', (e) => {
  const fig = e.target.closest && e.target.closest('figure.flow'); if (!fig) return;
  const d = flowData[fig.dataset.flow]; if (!d) return;
  const svg = fig.querySelector('svg'); const r = svg.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * d.W;
  const i = Math.max(0, Math.min(d.n, Math.round((x - d.pl) / (d.W - d.pl - d.pr) * d.n)));
  const p = d.tl[Math.min(i, d.tl.length - 1)];
  const xh = fig.querySelector('.xh'); xh.setAttribute('x1', d.X(i)); xh.setAttribute('x2', d.X(i)); xh.style.display = '';
  const tip = fig.querySelector('.tip'); tip.hidden = false;
  tip.textContent = (i ? 'Nach Ballwechsel ' + i : 'Satzbeginn') + ': ' + p[0] + ':' + p[1];
  tip.style.left = Math.min(r.width - 150, Math.max(0, e.clientX - r.left + 10)) + 'px';
});
document.addEventListener('pointerleave', (e) => {
  const fig = e.target.closest && e.target.closest('figure.flow'); if (!fig) return;
  const xh = fig.querySelector('.xh'); if (xh) xh.style.display = 'none'; const tip = fig.querySelector('.tip'); if (tip) tip.hidden = true;
}, true);

function kpiTile(label, valueStr, sub, chip, sparkSvg) {
  return '<div class="kpi"><div class="kpi-l">' + esc(label) + '</div><div class="kpi-v">' + valueStr + '</div>' +
    (sub ? '<div class="kpi-s">' + sub + '</div>' : '') +
    ((chip || sparkSvg) ? '<div class="kpi-b">' + (chip || '<span></span>') + (sparkSvg ? '<span class="kpi-sp">' + sparkSvg + '</span>' : '') + '</div>' : '') + '</div>';
}
function emptyState(title, text, btnHtml) {
  return '<div class="empty"><h2>' + esc(title) + '</h2><p>' + text + '</p>' + (btnHtml || '') + '</div>';
}
function selectHtml(id, options, value, attrs) {
  return '<select id="' + id + '" ' + (attrs || '') + '>' + options.map((o) => '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(value) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
}
function roleOptions() { return [['', '–']].concat(Object.entries(C.ROLES)); }

/* ------------------------------------------------------------ Globale Klick-Verteilung */
const ACT = {};
ACT.fs = () => setFs(!S.ui.fs);
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act]');
  if (!t || t.disabled) return;
  const fn = ACT[t.dataset.act];
  if (fn) { e.preventDefault(); fn(t, e); }
});

/* ui-live.js – Live-Scouting: Spiel anlegen, Satz-Einstellung, Eingabe per Tippen und Sprache */
const ORDER_GRID = [3, 2, 1, 4, 5, 0]; // Anzeige: IV III II / V VI I
const COMP = ['Liga', 'Pokal', 'Turnier', 'Testspiel', 'Training'];
let clockTimer = null;

let lastStamp = 0;
function stamp() { const n = Date.now(); lastStamp = n > lastStamp ? n : lastStamp + 1; return lastStamp; }
function clockMs(g) { const c = g && g.clock; if (!c) return 0; const now = c.pausedAt || Date.now(); return Math.max(0, now - c.base - (c.pausedTotal || 0)); }
function describeEvent(e) {
  if (!e) return '';
  if (e.k === 'set') return 'Satz ' + e.s + ' gestartet (' + (e.srv === 'u' ? 'wir schlagen auf' : 'Gegner schlägt auf') + ')';
  if (e.k === 'end') return 'Satzende';
  if (e.k === 'fix') return e.srv ? 'Aufschlag korrigiert → ' + (e.srv === 'u' ? 'wir' : 'Gegner') : 'Rotation korrigiert (' + (e.rot > 0 ? '+1' : '−1') + ')';
  if (e.k === 'lu') return 'Aufstellung geändert';
  return C.describeAct(e, pLabel);
}
function lastSetEvent(g, before) { const ev = g.events || []; for (let i = (before === undefined ? ev.length : before) - 1; i >= 0; i--) if (ev[i].k === 'set') return ev[i]; return null; }
function gameRosterIds(g) { const ids = (g.roster && g.roster.length ? g.roster : rosterList().map((p) => p.id)).filter((id) => player(id)); return ids.sort((a, b) => (+player(a).num) - (+player(b).num)); }

/* ------------------------------------------------------------ Hauptansicht */
VIEWS.live = function (view) {
  if (S.readOnly) { view.innerHTML = emptyState('Nur Ansicht', 'Zum Scouten brauchst du Bearbeitungsrechte für dieses Tool.'); return; }
  if (!S.loaded) { view.innerHTML = '<div class="card"><p class="muted">Lade …</p></div>'; return; }
  const g = liveGame();
  if (!g) { view.dataset.lv = ''; view.innerHTML = liveStartHtml(); return; }
  const a = analysis(g);
  if (!a.cur.inSet) { const fresh = view.dataset.lv !== 'setup-' + g.id + '-' + a.cur.nextSet; view.dataset.lv = 'setup-' + g.id + '-' + a.cur.nextSet; view.innerHTML = setSetupHtml(g, a); if (fresh) window.scrollTo(0, 0); return; }
  if (!$('#lv-root', view) || view.dataset.lv !== g.id) { view.innerHTML = liveLayoutHtml(g); view.dataset.lv = g.id; bindDictation(); window.scrollTo(0, 0); }
  updateLive(g, a);
  if (!clockTimer) clockTimer = setInterval(() => { const el = $('#lvClock'); const lg = liveGame(); if (el && lg) el.textContent = C.hms(clockMs(lg) / 1000); else { clearInterval(clockTimer); clockTimer = null; } }, 1000);
};

/* ------------------------------------------------------------ Spiel anlegen */
function liveStartHtml() {
  const demo = isDemo();
  const roster = rosterList();
  const open = realGames().filter((x) => x.status === 'live').sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  let h = '<div class="page-h"><h1>Scouten</h1></div>';
  if (open.length) {
    h += '<div class="card"><h2>Laufende Spiele</h2><ul class="list">' + open.map((x) => {
      const a = analysis(x);
      return '<li><div><b>' + esc(x.opponent) + '</b> <span class="muted">' + fmtDate(x.date) + '</span><br><span class="muted">Sätze ' + a.setsU + ':' + a.setsT + (a.cur && a.cur.inSet ? ' · aktuell ' + a.cur.u + ':' + a.cur.t : '') + '</span></div>' +
        '<button class="btn primary" data-act="resume" data-id="' + x.id + '">Fortsetzen</button></li>';
    }).join('') + '</ul></div>';
  }
  if (!roster.length) {
    return h + emptyState('Erst den Kader anlegen', 'Lege eure Spielerinnen und Spieler mit Rückennummer an. Danach kannst du hier ein Spiel starten.',
      '<div class="row center"><button class="btn primary" data-act="kaderneu">Kader anlegen</button></div>');
  }
  if (demo) h += '<div class="banner demo"><b>Übungsmodus mit Beispielkader.</b> Probiere die Eingabe aus – das Spiel wird nicht gespeichert. <button class="btn small" data-act="kaderneu">Eigenen Kader anlegen</button></div>';
  const f = S.settings.format || { mode: 'bo5', pts: 25, tb: 15 };
  h += '<form class="card form" id="newGameForm"><h2>' + (demo ? 'Übungsspiel starten' : 'Neues Spiel') + '</h2>' +
    '<div class="grid2">' +
    '<label>Gegner<input id="ngOpp" required placeholder="z. B. TSV Haunstetten" autocomplete="off"></label>' +
    '<label>Datum<input id="ngDate" type="date" value="' + todayIso() + '"></label>' +
    '<label>Wettbewerb' + selectHtml('ngComp', COMP.map((c) => [c, c]), 'Liga') + '</label>' +
    '<label>Ort' + selectHtml('ngHome', [['1', 'Heim'], ['0', 'Auswärts'], ['', 'neutral']], '1') + '</label>' +
    '<label>Modus' + selectHtml('ngMode', Object.entries(C.FORMATS).map(([k, v]) => [k, v.label]), f.mode) + '</label>' +
    '<label>Satz bis' + selectHtml('ngPts', [['25', '25 Punkte'], ['21', '21 Punkte'], ['15', '15 Punkte']], f.pts) + '</label>' +
    '</div>' +
    '<fieldset><legend>Kader für dieses Spiel</legend><div class="chips" id="ngRoster">' +
    roster.map((p) => '<label class="chip-tg"><input type="checkbox" value="' + p.id + '" checked><span><b>' + esc(p.num) + '</b> ' + esc(pShort(p.id)) + (p.role ? ' <small>' + esc(C.ROLES[p.role] || '') + '</small>' : '') + '</span></label>').join('') +
    '</div></fieldset>' +
    (HOOK.newGameHtml ? HOOK.newGameHtml() : '') +
    '<div class="row"><button class="btn primary big" type="submit" id="ngStart">Spiel anlegen</button></div></form>';
  return h;
}
document.addEventListener('submit', (e) => {
  if (e.target.id !== 'newGameForm') return;
  e.preventDefault();
  const opp = $('#ngOpp').value.trim();
  if (!opp) { $('#ngOpp').focus(); toast('Bitte den Gegner eintragen.'); return; }
  const roster = $$('#ngRoster input:checked').map((i) => i.value);
  if (roster.length < 6) { toast('Für ein Spiel braucht ihr mindestens 6 Spieler – bitte im Kader ankreuzen.', { kind: 'warn' }); return; }
  const date = $('#ngDate').value || todayIso();
  const urlEl = $('#ngVideo'); const url = urlEl ? urlEl.value.trim() : '';
  const mode = $('#ngMode').value;
  const g = {
    id: C.rid(10), date, opponent: opp, comp: $('#ngComp').value, home: $('#ngHome').value === '' ? null : $('#ngHome').value === '1',
    season: seasonOf(date), format: { mode, pts: +$('#ngPts').value || 25, tb: 15 }, status: 'live', source: 'live',
    roster, events: [], video: url ? { url: /^https?:/i.test(url) ? url : 'https://' + url, lead: 5 } : null,
    clock: { base: Date.now(), pausedTotal: 0, pausedAt: null }, createdAt: Date.now(), rev: 0,
  };
  if (isDemo()) g.practice = true;
  if (HOOK.newGameApply) HOOK.newGameApply(g);
  S.games[g.id] = g; S.live.gameId = g.id; S.live.setup = null; S.live.sel = null; S.live.await = null; S.live.bx = null;
  Store.saveGame(g, { now: true });
  render();
});
ACT.resume = (t) => { S.live.gameId = t.dataset.id; S.live.setup = null; go('live'); };

/* ------------------------------------------------------------ Satz-Einstellung */
function initSetup(g, a) {
  const no = a.cur.nextSet;
  if (S.live.setup && S.live.setup.game === g.id && S.live.setup.no === no) return S.live.setup;
  const prev = lastSetEvent(g);
  let lu = prev && prev.lu ? prev.lu.slice() : null, lib = prev && prev.lib ? prev.lib.slice() : null, zsp = prev ? prev.zsp : null;
  if (!lu) { // Aufstellung aus dem letzten Spiel übernehmen
    const other = realGames().filter((x) => x.id !== g.id && x.events && x.events.length).sort((x, y) => (y.updatedAt || 0) - (x.updatedAt || 0))[0];
    const se = other && other.events.find((e) => e.k === 'set' && e.lu);
    if (se && se.lu.every((id) => g.roster.includes(id))) { lu = se.lu.slice(); zsp = se.zsp; lib = (se.lib || []).filter((id) => g.roster.includes(id)); }
  }
  if (!lib) lib = gameRosterIds(g).filter((id) => (player(id) || {}).role === 'LIB');
  const F = C.FORMATS[C.fmtOf(g).mode];
  let srv = null;
  if (prev && !(F.tb && no === F.max)) srv = prev.srv === 'u' ? 't' : 'u';
  S.live.setup = { game: g.id, no, srv, lu: lu || [null, null, null, null, null, null], lib, zsp: zsp || null, slot: lu ? null : 0 };
  return S.live.setup;
}
function setSetupHtml(g, a) {
  const st = initSetup(g, a);
  const no = st.no;
  const doneSets = a.sets.filter((s) => s.done);
  let h = '<div class="page-h"><h1>' + esc(g.opponent) + '</h1><span class="muted">' + fmtDate(g.date) + (g.practice ? ' · Übungsspiel' : '') + '</span></div>';
  if (doneSets.length) h += '<div class="setline">' + doneSets.map((s) => '<span class="pill ' + (s.w === 'u' ? 'win' : 'loss') + '">' + s.u + ':' + s.t + '</span>').join('') + '<b>Sätze ' + a.setsU + ':' + a.setsT + '</b></div>';
  if (g.videoFile) h += '<div id="vp-slot"></div>';
  h += openListHtml(g, a, 'setup');
  if (a.cur.gameOver) {
    h += '<div class="card hero-card"><h2>Spiel beendet: ' + a.setsU + ':' + a.setsT + '</h2><p>' + (a.setsU > a.setsT ? 'Sieg' : a.setsT > a.setsU ? 'Niederlage' : 'Unentschieden') + ' gegen ' + esc(g.opponent) + '.</p>' +
      '<div class="row"><button class="btn primary big" data-act="finish" id="btnFinish">Spiel abschließen</button>' +
      '<button class="btn ghost" data-act="undo">Letztes Satzende rückgängig</button><button class="btn ghost" data-act="extraset">Weiteren Satz spielen</button></div></div>';
    return h;
  }
  const lu = st.lu; const full = lu.every(Boolean);
  const rosterIds = gameRosterIds(g);
  const cell = (i) => {
    const pid = lu[i];
    return '<button type="button" class="slot' + (st.slot === i ? ' sel' : '') + (pid ? ' filled' : '') + '" data-act="slot" data-i="' + i + '"><span class="pos">' + C.POS[i] + '</span>' +
      (pid ? '<b class="no">' + esc(player(pid).num) + '</b><span class="nm">' + esc(pShort(pid)) + '</span>' : '<span class="nm muted">frei</span>') + '</button>';
  };
  const luPlayers = lu.filter(Boolean);
  h += '<div class="card setup"><h2>Satz ' + no + '</h2>' +
    '<h3>Wer schlägt zuerst auf?</h3><div class="seg-ctl" role="group" aria-label="Erster Aufschlag">' +
    '<button type="button" class="' + (st.srv === 'u' ? 'on' : '') + '" data-act="srv1" data-v="u">' + ICON.ball + ' Wir</button>' +
    '<button type="button" class="' + (st.srv === 't' ? 'on' : '') + '" data-act="srv1" data-v="t">' + ICON.ball + ' Gegner</button></div>' +
    '<h3>Startaufstellung <span class="muted small">optional – für Rotationen und automatischen Aufschläger</span></h3>' +
    '<div class="court setup-court"><div class="net">Netz</div><div class="crt">' + ORDER_GRID.map(cell).join('') + '</div></div>' +
    '<p class="muted small">Position antippen, dann Spieler wählen. Reihenfolge: I (Aufschlag) → II → III …</p>' +
    '<div class="chips">' + rosterIds.map((pid) => {
      const p = player(pid); const used = lu.includes(pid);
      return '<button type="button" class="chip' + (used ? ' used' : '') + '" data-act="lupick" data-pid="' + pid + '"><b>' + esc(p.num) + '</b> ' + esc(pShort(pid)) + (p.role ? ' <small>' + esc(C.ROLES[p.role]) + '</small>' : '') + '</button>';
    }).join('') + '</div>' +
    '<div class="row"><button type="button" class="btn ghost small" data-act="lurot">Rotation weiterdrehen</button><button type="button" class="btn ghost small" data-act="luclear">Leeren</button></div>' +
    '<div class="grid2">' +
    '<label>Zuspieler (Bezug für „Läufer auf …“)' + selectHtml('suZsp', [['', '– keiner –']].concat(luPlayers.map((pid) => [pid, pLabel(pid)])), st.zsp || (luPlayers.find((pid) => (player(pid) || {}).role === 'ZSP') || '')) + '</label>' +
    '<div><span class="lbl">Libero</span><div class="chips">' + rosterIds.filter((pid) => !lu.includes(pid)).map((pid) => '<button type="button" class="chip' + (st.lib.includes(pid) ? ' on' : '') + '" data-act="libtg" data-pid="' + pid + '"><b>' + esc(player(pid).num) + '</b> ' + esc(pShort(pid)) + '</button>').join('') + '</div></div>' +
    '</div>' +
    '<div class="row end"><button class="btn ghost" data-act="cancelgame">' + (doneSets.length ? 'Spiel jetzt beenden' : 'Spiel verwerfen') + '</button>' +
    (doneSets.length ? '<button class="btn ghost" data-act="undo">Satzende rückgängig</button>' : '') +
    '<button class="btn primary big" data-act="setstart" id="btnSetStart"' + (st.srv ? '' : ' disabled') + '>Satz ' + no + ' starten</button></div>' +
    (!full && luPlayers.length ? '<p class="warn small">Aufstellung unvollständig – der Satz wird ohne Rotation gescoutet.</p>' : '') +
    (!st.srv ? '<p class="muted small">Wähle zuerst, wer aufschlägt.</p>' : '') +
    '</div>';
  return h;
}
ACT.srv1 = (t) => { S.live.setup.srv = t.dataset.v; render(); };
ACT.slot = (t) => { const i = +t.dataset.i; const st = S.live.setup; st.slot = st.slot === i ? null : i; render(); };
ACT.lupick = (t) => {
  const st = S.live.setup; const pid = t.dataset.pid;
  const at = st.lu.indexOf(pid);
  let i = st.slot !== null && st.slot !== undefined ? st.slot : st.lu.indexOf(null);
  if (at >= 0 && (i === at || i < 0)) { st.lu[at] = null; st.slot = at; render(); return; }
  if (i < 0) { toast('Alle Positionen belegt – erst eine Position antippen.'); return; }
  if (at >= 0) st.lu[at] = st.lu[i];
  st.lu[i] = pid; st.lib = st.lib.filter((x) => x !== pid);
  const nextEmpty = st.lu.indexOf(null);
  st.slot = nextEmpty >= 0 ? nextEmpty : null;
  if (!st.zsp && (player(pid) || {}).role === 'ZSP') st.zsp = pid;
  render();
};
ACT.lurot = () => { const st = S.live.setup; st.lu = C.rotF(st.lu); render(); };
ACT.luclear = () => { const st = S.live.setup; st.lu = [null, null, null, null, null, null]; st.slot = 0; st.zsp = null; render(); };
ACT.libtg = (t) => { const st = S.live.setup; const pid = t.dataset.pid; st.lib = st.lib.includes(pid) ? st.lib.filter((x) => x !== pid) : st.lib.concat(pid); render(); };
document.addEventListener('change', (e) => { if (e.target.id === 'suZsp' && S.live.setup) S.live.setup.zsp = e.target.value || null; });
ACT.setstart = () => {
  const g = liveGame(); const st = S.live.setup; if (!g || !st || !st.srv) return;
  const full = st.lu.every(Boolean), some = st.lu.some(Boolean);
  if (some && !full) { blocked('Aufstellung unvollständig – alle 6 Positionen besetzen oder ganz leer lassen.'); return; }
  if (full && new Set(st.lu).size !== 6) { blocked('Jeder Spieler darf nur auf einer Position stehen.'); return; }
  if (st.lib.length > 2) { blocked('Höchstens 2 Liberos.'); return; }
  if (full && st.lib.some((id) => st.lu.includes(id))) { blocked('Der Libero darf nicht in der Startaufstellung stehen.'); return; }
  const zspSel = $('#suZsp'); const zsp = zspSel ? zspSel.value || null : st.zsp;
  if (zsp && st.lib.includes(zsp)) { blocked('Der Libero kann nicht der Zuspieler der Aufstellung sein.'); return; }
  logEv({ k: 'set', s: st.no, srv: st.srv, lu: full ? st.lu.slice() : null, lib: st.lib.slice(), zsp: full ? zsp : null });
  S.live.setup = null; S.live.prompted = ''; S.live.sel = null; S.live.await = null; S.live.bx = null;
};
ACT.extraset = () => { const g = liveGame(); if (!g) return; g.format = Object.assign({}, g.format, { open: true }); Store.saveGame(g); S.live.setup = null; render(); };
ACT.finish = () => finishGame();
ACT.cancelgame = async () => {
  const g = liveGame(); if (!g) return;
  const a = analysis(g);
  if (a.sets.some((s) => s.done)) {
    if (await confirmBox('Spiel beenden?', 'Das Spiel wird mit ' + a.setsU + ':' + a.setsT + ' Sätzen abgeschlossen.', 'Beenden')) finishGame();
  } else if (await confirmBox('Spiel verwerfen?', 'Das angelegte Spiel gegen ' + g.opponent + ' wird gelöscht.', 'Verwerfen', true)) {
    S.live.gameId = null; if (g.practice) delete S.games[g.id]; else Store.deleteGame(g.id); render();
  }
};
function finishGame() {
  const g = liveGame(); if (!g) return;
  g.status = 'done'; g.finishedAt = Date.now();
  S.live.gameId = null; S.live.setup = null;
  if (g.practice) { delete S.games[g.id]; toast('Übungsspiel beendet. Es wurde nicht gespeichert.'); go('live'); return; }
  Store.saveGame(g, { now: true });
  toast('Spiel gespeichert.');
  go('spiel', g.id);
}

/* ------------------------------------------------------------ Scouting-Oberfläche */
function liveLayoutHtml(g) {
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const autoPref = lsGet('vst:dictAuto');
  const auto = autoPref === null ? coarse : autoPref === '1';
  const SR = (window.SpeechRecognition || window.webkitSpeechRecognition);
  const v = g.video && C.parseVideo(g.video.url);
  let video = '';
  if (v && v.kind !== 'other') {
    const host = location.hostname || 'localhost';
    const src = v.kind === 'twitch-live' ? 'https://player.twitch.tv/?channel=' + v.id + '&parent=' + host + '&muted=true'
      : v.kind === 'twitch-vod' ? 'https://player.twitch.tv/?video=v' + v.id + '&parent=' + host + '&autoplay=false' : 'https://www.youtube-nocookie.com/embed/' + v.id;
    video = '<details class="card" open><summary>Video</summary><div class="vid"><iframe src="' + esc(src) + '" allowfullscreen title="Livestream"></iframe></div></details>';
  }
  return '<section id="lv-root" class="lv' + (g.videoFile ? ' vmode' : '') + '">' +
    (g.videoFile ? '<div id="vp-slot" class="vp-col"></div>' : '') +
    '<div class="lv-work"><div id="lv-score"></div>' +
    '<div class="lv-cols"><div class="lv-main">' +
    '<div id="lv-rally" class="lv-rally" aria-live="polite"></div>' +
    '<div id="lv-court"></div><div id="lv-team" class="lv-team"></div><div id="lv-hint" class="lv-hint"></div>' +
    '<div id="lv-zone"></div><div id="lv-pad" class="pad"></div><div id="lv-open"></div>' +
    '<div class="dict card"><div class="dict-score" id="dictScore"></div><ul id="dictFeed" class="feed"></ul><form id="dictForm" autocomplete="off"><label for="dictIn" class="sr">Sprach- oder Texteingabe</label>' +
    '<input id="dictIn" type="text" enterkeyhint="send" placeholder="Diktieren oder tippen: „7 Kill“, „Max Annahme 3“" autocomplete="off" autocapitalize="off" spellcheck="false">' +
    (SR ? '<button class="icon-btn" type="button" data-act="mic" id="micBtn" aria-label="Freihändig sprechen">' + ICON.mic + '</button>' : '') +
    '<button class="icon-btn solid" type="submit" aria-label="Übernehmen">' + ICON.send + '</button></form>' +
    '<div class="dict-meta"><label class="tg"><input type="checkbox" id="dictAuto"' + (auto ? ' checked' : '') + '> nach Sprechpause automatisch übernehmen</label>' +
    '<button type="button" class="link" data-act="cmdhelp">Befehle</button></div>' +
    '</div>' +
    '</div><aside class="lv-side">' + video + '<div id="lv-ana" class="card"></div>' + (g.videoFile ? '<div id="lv-rl" class="card"></div>' : '') + '<div id="lv-log" class="card"></div></aside></div></div></section>';
}

function updateLive(g, a) {
  const c = a.cur;
  const team = S.settings.teamName || 'Wir';
  const sets = a.sets.filter((s) => s.done);
  const needTo = runNeedsTimeout(g, a);
  const run = !c.run || c.run.len < 2 ? '' : needTo
    ? '<button class="pill loss runto" data-act="totake" title="Eigene Auszeit eintragen">0:' + c.run.len + ' – Auszeit?</button>'
    : '<span class="pill ' + (c.run.w === 'u' ? 'win' : 'loss') + '">' + (c.run.w === 'u' ? c.run.len + ':0' : '0:' + c.run.len) + '-Serie</span>';
  const paused = g.clock && g.clock.pausedAt;
  $('#lv-score').innerHTML = '<div class="sb">' +
    '<div class="sb-names"><span class="sb-n">' + esc(team) + '</span><span class="sb-n">' + esc(g.opponent) + '</span></div>' +
    '<div class="sb-row"><span class="sb-sets us" title="Sätze ' + esc(team) + '">' + a.setsU + '</span>' +
    '<div class="sb-sc"><span class="srv-i ' + (c.srv === 'u' ? 'on' : '') + '" aria-hidden="true">' + ICON.ball + '</span><span class="u" id="scU">' + c.u + '</span><span class="col">:</span><span class="t" id="scT">' + c.t + '</span><span class="srv-i ' + (c.srv === 't' ? 'on' : '') + '" aria-hidden="true">' + ICON.ball + '</span></div>' +
    '<span class="sb-sets them" title="Sätze ' + esc(g.opponent) + '">' + a.setsT + '</span></div>' +
    '<div class="sb-m">Satz ' + c.set + ' · bis ' + c.target + (c.rot ? ' · ' + (HOOK.rotGlyph ? HOOK.rotGlyph(c.rot) + ' ' : '') + 'Läufer auf ' + C.POS[c.rot - 1] : '') + '<span class="sr"> · Aufschlag ' + (c.srv === 'u' ? 'wir' : 'Gegner') + '</span></div></div>' +
    '<div class="sb-bar"><span class="sb-pills">' + sets.map((s) => '<span class="pill ' + (s.w === 'u' ? 'win' : 'loss') + '">' + s.u + ':' + s.t + '</span>').join('') + run + '</span>' +
    '<span class="sb-tools"><button class="chip clock' + (paused ? ' paused' : '') + '" data-act="clock" title="Scouting-Uhr für Video-Zeitstempel – antippen zum Pausieren">' + (paused ? ICON.play : ICON.pause) + '<span id="lvClock">' + C.hms(clockMs(g) / 1000) + '</span></button>' +
    '<button class="btn small" data-act="undo" id="btnUndo" aria-label="Rückgängig">' + ICON.undo + '<span class="lbl-w">Rückgängig</span></button><button class="btn small" data-act="livemenu" id="btnMenu" aria-label="Mehr">' + ICON.more + '<span class="lbl-w">Mehr</span></button>' +
    '<button class="btn small fs-b" data-act="fs" aria-label="' + (S.ui.fs ? 'Vollbild beenden' : 'Vollbild') + '" title="' + (S.ui.fs ? 'Vollbild beenden' : 'Vollbild') + '">' + (S.ui.fs ? ICON.fsx : ICON.fs) + '</button></span></div>';
  // Ballwechsel-Ticker (Einträge antippen = bearbeiten)
  const ev = g.events;
  let rally = '';
  if (c.rallyEv.length) rally = '<span class="muted">Ballwechsel:</span> ' + c.rallyEv.map((i) => evChip(ev[i], i)).join('');
  else {
    let li = -1; for (let i = ev.length - 1; i >= 0; i--) { if (a.evInfo[i] && a.evInfo[i].w) { li = i; break; } if (ev[i].k === 'set') break; }
    rally = li >= 0 ? '<span class="muted">Letzter Punkt:</span> ' + evChip(ev[li], li) + ' <b class="' + (a.evInfo[li].w === 'u' ? 'c-us' : 'c-them') + '">' + (a.evInfo[li].w === 'u' ? 'Punkt für uns' : 'Punkt Gegner') + '</b>' : '<span class="muted">Satz läuft – erster Ballwechsel</span>';
  }
  $('#lv-rally').innerHTML = rally;
  // Spielfeld
  const rosterIds = gameRosterIds(g);
  const extra = Array.from(new Set(ev.filter((e) => e.k === 'sub').map((e) => e.in))).filter((id) => !rosterIds.includes(id) && player(id));
  const all = rosterIds.concat(extra);
  const sel = S.live.sel;
  const awaitEv = awaitingEvent(g);
  const serverId = c.srv === 'u' && c.lu && !c.rallyOpen ? c.lu[0] : null;
  const btn = (pid, posI, cls) => {
    const p = player(pid); if (!p) return '';
    return '<button class="pl ' + (cls || '') + (c.zsp === pid ? ' zsp' : '') + (sel === pid ? ' sel' : '') + (serverId === pid ? ' srv' : '') + (awaitEv ? ' ask' : '') + '" data-act="pl" data-pid="' + pid + '">' +
      (posI !== undefined ? '<span class="pos">' + C.POS[posI] + '</span>' : '') + '<b class="no">' + esc(pNo(p)) + '</b><span class="nm">' + esc(pShort(pid)) + '</span>' + (serverId === pid ? '<span class="srv-tag" title="Aufschlag">' + ICON.ball + '</span>' : '') + '</button>';
  };
  let court = '';
  if (c.lu) {
    const bench = all.filter((id) => !c.lu.includes(id)).sort((x, y) => (c.lib.includes(y) ? 1 : 0) - (c.lib.includes(x) ? 1 : 0));
    court = '<div class="court"><div class="net">Netz</div><div class="crt">' + ORDER_GRID.map((i) => btn(c.lu[i], i)).join('') + '</div></div>' +
      '<div class="bench">' + bench.map((id) => btn(id, undefined, c.lib.includes(id) ? 'lib small' : 'small')).join('') + '</div>';
  } else {
    court = '<div class="plgrid">' + all.map((id) => btn(id)).join('') + '</div>';
  }
  $('#lv-court').innerHTML = court;
  // Offene Einträge (Spieler fehlt, nicht erkannt)
  $('#lv-open').innerHTML = openListHtml(g, a, 'live');
  // Hinweiszeile
  let hint = '';
  const bxEv = S.live.bx ? ev.find((e) => e.id === S.live.bx && e.sk === 'B' && e.g === '=') : null;
  if (awaitEv) hint = '<b>Wer?</b> Spieler antippen für <b>' + esc(C.SKILL[awaitEv.sk].label + ' ' + C.GL[awaitEv.sk][awaitEv.g]) + '</b> <button class="btn small ghost" data-act="nopl">ohne Spieler</button>';
  else if (sel) hint = '<b>' + esc(pLabel(sel)) + '</b> gewählt → Aktion antippen <button class="btn small ghost" data-act="cancelpq">Abwählen</button>';
  else if (serverId) hint = 'Aufschlag <b>' + esc(pLabel(serverId)) + '</b>: Bewertung direkt antippen';
  else hint = '<span class="muted">Spieler antippen, dann Aktion – oder erst Aktion, dann Spieler</span>';
  if (bxEv && !awaitEv) hint = '<div class="bxr"><span>Blockfehler – Grund:</span>' + C.BX_ORDER.map((k) => '<button class="chip" data-act="bxr" data-x="' + k + '">' + esc(C.BX[k]) + '</button>').join('') + '</div>';
  $('#lv-hint').innerHTML = hint;
  // Aktionsfeld
  let expect = S.live.highlight || null;
  if (!expect && !c.rallyOpen) expect = c.srv === 'u' ? 'S' : 'R';
  if (!expect && c.rallyEv.length) { const le = ev[c.rallyEv[c.rallyEv.length - 1]]; if (le.k === 'a' && (le.sk === 'R' || le.sk === 'D' || (le.sk === 'B' && (le.g === '+' || le.g === '-')))) expect = 'A'; }
  const SHORT = { S: 'Aufschl.' };
  $('#lv-zone').innerHTML = HOOK.zonePanel ? HOOK.zonePanel(g, a) : '';
  $('#lv-pad').innerHTML = C.SKILL_ORDER.map((sk) => {
    const grades = g.minimal ? C.SKILL[sk].grades.filter((gr) => C.outcomeOf({ k: 'a', sk, g: gr })) : C.SKILL[sk].grades;
    return '<div class="pad-r' + (expect === sk ? ' hot' : '') + '"><span class="pad-l">' + (SHORT[sk] ? '<span class="lw">' + C.SKILL[sk].label + '</span><span class="ls">' + SHORT[sk] + '</span>' : C.SKILL[sk].label) + '</span><div class="pad-b" style="grid-template-columns:repeat(' + Math.max(4, grades.length) + ',minmax(0,1fr))">' +
      grades.map((gr) => {
        const o = C.outcomeOf({ k: 'a', sk, g: gr });
        const tip = C.GD[sk] && C.GD[sk][gr] ? ' title="' + esc(C.GD[sk][gr]) + '"' : '';
        return '<button class="gb ' + (o === 'u' ? 'win' : o === 't' ? 'lose' : 'neu') + '" data-act="gr" data-sk="' + sk + '" data-g="' + gr + '"' + tip + '>' + esc(C.GL[sk][gr]) + '</button>';
      }).join('') + '</div></div>';
  }).join('');
  $('#lv-team').innerHTML = '<button class="tb win" data-act="opp" data-r="err" id="btnOppErr">Gegnerfehler<small>Punkt für uns</small></button>' +
    '<button class="tb lose" data-act="opp" data-r="pt" id="btnOppPt">Gegnerpunkt<small>Punkt für Gegner</small></button>';
  renderFeed();
  renderLiveAna(g, a);
  renderLiveLog(g, a);
  if (HOOK.liveRallies) HOOK.liveRallies(g, a);
}
function evChip(e, i) {
  if (!e) return '';
  const tag = (cls, txt) => (e.k === 'a' && i !== undefined ? '<button class="evc ' + cls + '" data-act="evedit" data-i="' + i + '" title="Antippen zum Ändern">' + txt + '</button>' : '<span class="evc ' + cls + '">' + txt + '</span>');
  if (e.k === 'a') return tag(gradeCls(e.sk, e.g) + (!e.p && e.np ? ' np' : ''), esc((e.p ? pLabel(e.p).split(' ')[0] + ' ' : '') + C.SKILL[e.sk].label + ' ' + C.GL[e.sk][e.g] + (e.x && C.BX[e.x] ? ' (' + C.BX[e.x] + ')' : '')));
  if (e.k === 'opp') return '<span class="evc ' + (e.r === 'err' ? 'g5' : 'g1') + '">' + (e.r === 'err' ? 'Gegnerfehler' : 'Gegnerpunkt') + '</span>';
  if (e.k === 'pt') return '<span class="evc">' + (e.w === 'u' ? 'Punkt uns' : 'Punkt Gegner') + '</span>';
  return '<span class="evc">' + esc(describeEvent(e)) + '</span>';
}
let feedTimer = null;
function renderFeed() {
  const el = $('#dictFeed'); if (!el) return;
  const g = liveGame(); const sc = $('#dictScore');
  if (g && sc) { const c = analysis(g).cur; const open = openItems(g).length; sc.innerHTML = 'Satz ' + c.set + ' · <b class="c-us">' + c.u + '</b>:<b class="c-them">' + c.t + '</b> · Aufschlag ' + (c.srv === 'u' ? 'wir' : 'Gegner') + (open ? ' · <b class="c-them">' + open + ' offen</b>' : ''); }
  const now = Date.now();
  const fresh = S.live.feed.filter((f) => now - f.t < 4000);
  el.innerHTML = fresh.slice(0, 4).reverse().map((f) => '<li class="ok"><span>✓</span> ' + esc(f.text) + '</li>').join('');
  clearTimeout(feedTimer);
  if (fresh.length) feedTimer = setTimeout(renderFeed, 4100 - (now - fresh[0].t));
}
function feedOk(text) { S.live.feed.unshift({ ok: true, text, t: Date.now() }); S.live.feed = S.live.feed.slice(0, 8); }

/* ------------------------------------------------------------ Offene Einträge */
function awaitingEvent(g) { if (!S.live.await || !g) return null; const e = g.events.find((x) => x.id === S.live.await); return e && !e.p && e.np ? e : null; }
function openItems(g) {
  const items = [];
  (g.events || []).forEach((e, i) => { if (e.k === 'a' && !e.p && e.np) items.push({ kind: 'np', e, i }); });
  (g.inbox || []).forEach((it) => items.push({ kind: 'ib', it }));
  return items;
}
function candidatesFor(g, a, i, e) {
  const inf = a.evInfo[i] || {};
  const r = inf.rally !== undefined ? a.rallies[inf.rally] : null;
  const lu = (r && r.lu) || (a.cur && a.cur.lu) || null;
  const lib = (a.cur && a.cur.lib) || [];
  const role = (id) => (player(id) || {}).role;
  if (!lu) return gameRosterIds(g).slice(0, 8);
  const front = [lu[1], lu[2], lu[3]], back = [lu[0], lu[4], lu[5]];
  let ids;
  if (e.sk === 'R') ids = back.filter((id) => role(id) !== 'ZSP').concat(lib, front.filter((id) => role(id) === 'AA'));
  else if (e.sk === 'D') ids = lib.concat(back, front);
  else if (e.sk === 'A') ids = front.filter((id) => role(id) !== 'ZSP').concat(back.filter((id) => role(id) !== 'ZSP' && role(id) !== 'LIB'));
  else if (e.sk === 'B') ids = front;
  else if (e.sk === 'S') ids = [lu[0]];
  else ids = lu.concat(lib);
  return Array.from(new Set(ids.filter(Boolean))).slice(0, 6);
}
function openListHtml(g, a, where) {
  const items = openItems(g);
  if (!items.length) return '';
  const showAll = S.ui.openAll;
  const list = items.slice().reverse();
  const shown = showAll ? list : list.slice(0, 3);
  const rows = shown.map((x) => {
    if (x.kind === 'np') {
      const inf = a.evInfo[x.i] || {}; const sc = inf.after ? inf.after.join(':') : '';
      const cands = candidatesFor(g, a, x.i, x.e);
      return '<div class="oi"><span class="oi-t"><span class="sc">S' + (inf.set || '') + ' ' + sc + '</span> ' + esc(C.SKILL[x.e.sk].label + ' ' + C.GL[x.e.sk][x.e.g]) + ' – <b>wer?</b></span>' +
        '<span class="oi-c">' + cands.map((pid) => '<button class="chip" data-act="asg" data-gid="' + g.id + '" data-eid="' + x.e.id + '" data-pid="' + pid + '">' + esc(pLabel(pid)) + '</button>').join('') +
        '<button class="chip" data-act="asgmore" data-gid="' + g.id + '" data-eid="' + x.e.id + '" aria-label="Andere Spieler">…</button></span>' +
        '<button class="icon-btn small" data-act="npdis" data-gid="' + g.id + '" data-eid="' + x.e.id + '" aria-label="Ohne Spieler lassen" title="Ohne Spieler lassen">' + ICON.x + '</button></div>';
    }
    const it = x.it; const q = (sk, gr, label) => '<button class="chip" data-act="ibq" data-gid="' + g.id + '" data-iid="' + it.id + '" data-sk="' + sk + '" data-g="' + gr + '">' + esc(label) + '</button>';
    let quick = '';
    if (it.q === 'grade' && it.sk && C.SKILL[it.sk]) quick = C.SKILL[it.sk].grades.map((gr) => q(it.sk, gr, C.GL[it.sk][gr])).join('');
    else if (it.q === 'err') quick = q('S', '=', 'Aufschlag') + q('R', '=', 'Annahme') + q('A', '=', 'Angriff') + q('B', '=', 'Block') + q('D', '=', 'Abwehr') + q('F', 'net', 'Netz') + q('F', 'line', 'Übertritt');
    return '<div class="oi bad"><span class="oi-t">„' + esc(it.text) + '“ – ' + esc(it.why || 'nicht erkannt') + (it.p ? ' <span class="muted">(' + esc(pLabel(it.p)) + ')</span>' : '') + '</span><span class="oi-c">' + quick + '<button class="chip ghost" data-act="ibfix" data-gid="' + g.id + '" data-iid="' + it.id + '">' + (quick ? 'Text…' : 'Korrigieren') + '</button></span>' +
      '<button class="icon-btn small" data-act="ibdel" data-gid="' + g.id + '" data-iid="' + it.id + '" aria-label="Verwerfen" title="Verwerfen">' + ICON.x + '</button></div>';
  }).join('');
  return '<div class="open' + (where === 'live' ? '' : ' card') + '" id="' + (where === 'live' ? 'openLive' : 'openList') + '"><div class="open-h"><b>Offen: ' + items.length + '</b><span class="muted small">' + (where === 'detail' ? 'Aktionen ohne Spieler oder nicht erkannte Ansagen' : 'Spieler nachtragen oder korrigieren – verschwindet, sobald erledigt') + '</span>' +
    (items.length > 3 ? '<button class="link small" data-act="openall">' + (showAll ? 'weniger' : 'alle ' + items.length) + '</button>' : '') + '</div>' + rows + '</div>';
}
function gameForAct(t) { const id = t.dataset.gid; return (id && (S.games[id] || gameById(id))) || liveGame(); }
function assignPlayer(g, e, pid) {
  const why = C.checkAction(g, Object.assign({}, e, { p: pid }), { at: g.events.indexOf(e), roster: rosterMap(), label: pLabel, pendingR: true });
  if (why) { blocked(why); return false; }
  e.p = pid; delete e.np;
  if (S.live.await === e.id) S.live.await = null;
  Store.saveGame(g); feedOk(C.describeAct(e, pLabel) + ' nachgetragen'); render();
  if (liveGame() === g) maybeSetEnd(g);
  return true;
}
ACT.asg = (t) => { const g = gameForAct(t); const e = g && g.events.find((x) => x.id === t.dataset.eid); if (e) assignPlayer(g, e, t.dataset.pid); };
ACT.asgmore = (t) => {
  const g = gameForAct(t); const e = g && g.events.find((x) => x.id === t.dataset.eid); if (!e) return;
  const m = modal({ title: C.SKILL[e.sk].label + ' ' + C.GL[e.sk][e.g] + ' – wer?', html: '<div class="chips">' + gameRosterIds(g).map((pid) => '<button class="chip" data-pp="' + pid + '">' + esc(pLabel(pid)) + '</button>').join('') + '</div>' });
  m.el.addEventListener('click', (ev) => { const b = ev.target.closest('[data-pp]'); if (!b) return; if (assignPlayer(g, e, b.dataset.pp)) m.close(); });
};
ACT.npdis = (t) => { const g = gameForAct(t); const e = g && g.events.find((x) => x.id === t.dataset.eid); if (!e) return; delete e.np; if (S.live.await === e.id) S.live.await = null; Store.saveGame(g); render(); if (liveGame() === g) maybeSetEnd(g); };
ACT.openall = () => { S.ui.openAll = !S.ui.openAll; render(); };
ACT.ibdel = (t) => { const g = gameForAct(t); if (!g) return; g.inbox = (g.inbox || []).filter((x) => x.id !== t.dataset.iid); Store.saveGame(g); render(); };
ACT.ibfix = (t) => {
  const g = gameForAct(t); if (!g) return; const it = (g.inbox || []).find((x) => x.id === t.dataset.iid); if (!it) return;
  const idx = it.after ? g.events.findIndex((e) => e.id === it.after) : -1;
  const ctxAt = idx >= 0 ? describeEvent(g.events[idx]) : 'Ende';
  const parse = (txt) => C.parseCommands(txt, { roster: rosterList(true) });
  const preview = (txt) => parse(txt).map((r) => r.ok ? '<li class="ok">✓ ' + esc(C.describeAct(r.act, pLabel) + (r.act.k === 'a' && !r.act.p ? ' – Spieler danach antippen' : '')) + '</li>' : '<li class="bad">✗ ' + esc(r.why) + '</li>').join('');
  const m = modal({ title: 'Ansage korrigieren', html: '<p class="small muted">Gesagt: „' + esc(it.text) + '“ – wird an der ursprünglichen Stelle eingefügt (nach: ' + esc(ctxAt) + ').</p>' +
    '<label>Befehl<input id="ibTxt" value="' + esc(it.text) + '" autocomplete="off" autocapitalize="off" spellcheck="false"></label><ul class="feed" id="ibPrev">' + preview(it.text) + '</ul>',
    actions: [{ label: 'Abbrechen', kind: 'ghost' }, { label: 'Einfügen', kind: 'primary', id: 'ibOk', fn: (el) => {
      const res = parse($('#ibTxt', el).value);
      if (!res.length || res.some((r) => !r.ok)) { toast('Noch nicht eindeutig – bitte anpassen.'); return false; }
      const acts = res.map((r) => r.act).filter((a) => a.k === 'a' || a.k === 'opp' || a.k === 'pt' || a.k === 'to' || a.k === 'sub');
      if (!acts.length) { toast('Nichts zum Einfügen.'); return false; }
      const evs = insertAt(g, it, acts);
      if (typeof evs === 'string') { blocked(evs); return false; }
      Store.saveGame(g); S.live.prompted = ''; feedOk(evs.map((e) => C.describeAct(e, pLabel)).join(', ') + ' eingefügt'); render();
    } }] });
  const inp = $('#ibTxt', m.el); inp.addEventListener('input', () => { $('#ibPrev', m.el).innerHTML = preview(inp.value); });
  setTimeout(() => { try { inp.focus(); inp.select(); } catch (e) { /* egal */ } }, 50);
};
// Schnellkorrektur direkt in der Offen-Liste: Bewertung oder Fehlerart antippen
ACT.ibq = (t) => {
  const g = gameForAct(t); if (!g) return; const it = (g.inbox || []).find((x) => x.id === t.dataset.iid); if (!it) return;
  const act = { k: 'a', p: it.p || null, sk: t.dataset.sk, g: t.dataset.g };
  const evs = insertAt(g, it, [act]);
  if (typeof evs === 'string') { blocked(evs); return; }
  Store.saveGame(g); S.live.prompted = '';
  if (evs[0].np && !S.live.await && liveGame() === g) S.live.await = evs[0].id;
  feedOk(C.describeAct(evs[0], pLabel) + ' eingefügt'); render();
};
ACT.bxr = (t) => {
  const g = liveGame(); if (!g) return; const e = g.events.find((x) => x.id === S.live.bx); S.live.bx = null;
  if (e) { e.x = t.dataset.x; Store.saveGame(g); feedOk('Blockfehler: ' + C.BX[e.x]); }
  render();
};

/* ------------------------------------------------------------ Eingabe-Logik */
/** Liegt im laufenden Ballwechsel eine noch nicht bewertete Annahme in „Offen“? Dann darf es schon weitergehen. */
function pendingRecv(g, a) {
  // eine noch offene Ansage am Anfang des Ballwechsels (Annahme oder nicht erkannt) kann die Annahme sein
  const ib = (g.inbox || []).filter((it) => it.sk === 'R' || (!it.sk && it.q !== 'err')); if (!ib.length) return false;
  let start = -1; for (let i = g.events.length - 1; i >= 0; i--) { if (g.events[i].k === 'set' || (a.evInfo[i] && a.evInfo[i].w)) { start = i; break; } }
  return ib.some((it) => g.events.findIndex((e) => e.id === it.after) >= start);
}
function blocked(msg) {
  toast('Nicht möglich: ' + msg, { kind: 'warn', ms: 5000 });
  try { if (navigator.vibrate) navigator.vibrate([25, 50, 25]); } catch (err) { /* egal */ }
}
/** Trägt ein Ereignis ein – wenn es nach den Volleyballregeln möglich ist. Liefert true oder den Grund. */
function logEv(e, opts) {
  opts = opts || {};
  const g = liveGame(); if (!g || S.readOnly) return 'nur Ansicht';
  const a0 = analysis(g);
  const why = C.checkAction(g, e, { analysis: a0, roster: rosterMap(), label: pLabel, pendingR: pendingRecv(g, a0) });
  if (why) { if (!opts.quiet) blocked(why); S.live.sel = null; S.live.highlight = null; render(); return why; }
  e.id = C.rid(6); e.t = stamp(); e.c = clockMs(g);
  if (HOOK.stampEvent) HOOK.stampEvent(g, e);
  if (e.k === 'a' && !e.p) e.np = 1;
  g.events.push(e);
  Store.saveGame(g);
  S.live.sel = null; S.live.highlight = null;
  S.live.await = e.k === 'a' && !e.p ? e.id : null;
  S.live.bx = e.k === 'a' && e.sk === 'B' && e.g === '=' && !e.x ? e.id : null;
  try { if (navigator.vibrate) navigator.vibrate(12); } catch (err) { /* nicht verfügbar */ }
  const a = analysis(g);
  afterLog(g, a, e);
  if (HOOK.afterLog) HOOK.afterLog(g, a, e);
  render();
  return true;
}
function afterLog(g, a, e) {
  const c = a.cur;
  maybeSetEnd(g, a);
  if (c.inSet && c.run && c.run.w === 't' && (c.run.len === 3 || c.run.len === 5) && !c.setOver) {
    const key = c.set + ':' + c.run.rally + ':' + c.run.len;
    if (S.live.runWarned !== key) { S.live.runWarned = key; try { if (navigator.vibrate) navigator.vibrate([30, 60, 30]); } catch (err) { /* egal */ } }
  }
  const w = a.evInfo[a.evInfo.length - 1] && a.evInfo[a.evInfo.length - 1].w;
  if (w) { const el = $(w === 'u' ? '#scU' : '#scT'); if (el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } }
  void e;
}
/* Satzende abfragen – aber erst, wenn der Spieler zur letzten Aktion feststeht */
function maybeSetEnd(g, a) {
  a = a || analysis(g); const c = a.cur;
  if (!c.inSet || !c.setOver || awaitingEvent(g)) return;
  const key = c.set + ':' + c.u + ':' + c.t;
  if (S.live.prompted !== key) { S.live.prompted = key; setTimeout(() => openSetEnd(), 30); }
}
/** Gegnerserie ab 3 Punkten ohne eigene Auszeit seit Serienbeginn */
function runNeedsTimeout(g, a) {
  const c = a.cur; if (!c.inSet || c.setOver || !c.run || c.run.w !== 't' || c.run.len < 3) return false;
  for (let i = g.events.length - 1; i >= 0; i--) {
    const e = g.events[i], inf = a.evInfo[i] || {};
    if (e.k === 'to' && e.w === 'u') return false;
    if (e.k === 'set' || inf.w === 'u') break;
  }
  return true;
}
ACT.totake = () => { if (logEv({ k: 'to', w: 'u' }) === true) toast('Auszeit notiert'); };
function openSetEnd() {
  const g = liveGame(); if (!g) return; const a = analysis(g); const c = a.cur; if (!c.inSet || !c.setOver) return;
  const open = openItems(g).length;
  const bxEv = S.live.bx ? g.events.find((e) => e.id === S.live.bx && e.sk === 'B' && e.g === '=' && !e.x) : null;
  const m = modal({ title: 'Satz ' + c.set + ' beendet?', html: '<p class="bigscore"><span class="c-us">' + c.u + '</span> : <span class="c-them">' + c.t + '</span></p><p class="center">' + (c.u > c.t ? 'Satzgewinn' : 'Satzverlust') + ' – falls noch weitergespielt wird (Fehler im Spielstand), einfach weiter scouten.</p>' +
    (open ? '<p class="center small warn">' + open + (open === 1 ? ' Eintrag ist' : ' Einträge sind') + ' noch offen – du kannst ' + (open === 1 ? 'ihn' : 'sie') + ' auf der nächsten Seite oder später im Spielbericht nachtragen.</p>' : '') +
    (bxEv ? '<div class="chips bxr center"><span class="small muted">Blockfehler – Grund:</span>' + C.BX_ORDER.map((k) => '<button type="button" class="chip" data-bxm="' + k + '">' + esc(C.BX[k]) + '</button>').join('') + '</div>' : ''),
    actions: [{ label: 'Weiter scouten', kind: 'ghost', id: 'btnContinueSet' }, { label: 'Satz beenden', kind: 'primary', id: 'btnEndSet', fn: () => { logEv({ k: 'end' }); } }] });
  if (bxEv) m.el.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-bxm]'); if (!b) return;
    bxEv.x = b.dataset.bxm; S.live.bx = null; Store.saveGame(g);
    $$('[data-bxm]', m.el).forEach((x) => x.classList.toggle('on', x === b));
  });
}
function serverDefault(sk) { const g = liveGame(); if (!g) return null; const c = analysis(g).cur; return sk === 'S' && c.srv === 'u' && c.lu ? c.lu[0] : null; }
ACT.pl = (t) => {
  const pid = t.dataset.pid; const g = liveGame();
  const aw = awaitingEvent(g);
  if (aw) { assignPlayer(g, aw, pid); return; }
  S.live.sel = S.live.sel === pid ? null : pid; S.live.highlight = null; render();
};
ACT.gr = (t) => {
  const sk = t.dataset.sk, gr = t.dataset.g;
  const p = S.live.sel || serverDefault(sk);
  logEv({ k: 'a', p: p || null, sk, g: gr });
};
ACT.nopl = () => { const g = liveGame(); const e = awaitingEvent(g); if (e) { delete e.np; Store.saveGame(g); } S.live.await = null; render(); if (g) maybeSetEnd(g); };
ACT.cancelpq = () => { S.live.await = null; S.live.sel = null; S.live.highlight = null; render(); };
ACT.opp = (t) => { logEv({ k: 'opp', r: t.dataset.r }); };
ACT.undo = () => undoLast();
function undoLast() {
  const g = liveGame(); if (!g || !g.events.length) return;
  const last = g.events[g.events.length - 1];
  if (last.k === 'set') {
    confirmBox('Satzstart rückgängig?', 'Zurück zur Einstellung von Satz ' + last.s + '?', 'Zurück').then((ok) => { if (ok) { g.events.pop(); Store.saveGame(g); S.live.setup = null; render(); } });
    return;
  }
  g.events.pop(); Store.saveGame(g); S.live.prompted = ''; S.live.await = null; S.live.bx = null; S.live.sel = null;
  if (HOOK.afterUndo) HOOK.afterUndo(g, last);
  toast('Rückgängig: ' + describeEvent(last), { ms: 2500 });
  render();
}
ACT.clock = () => {
  const g = liveGame(); if (!g) return; const c = g.clock || (g.clock = { base: Date.now(), pausedTotal: 0, pausedAt: null });
  if (c.pausedAt) { c.pausedTotal += Date.now() - c.pausedAt; c.pausedAt = null; toast('Uhr läuft wieder'); } else { c.pausedAt = Date.now(); toast('Uhr pausiert – zum Scouten vom Video bei Pausen im Video'); }
  Store.saveGame(g); render();
};
document.addEventListener('keydown', (e) => {
  if (S.route !== 'live' || !liveGame()) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && document.activeElement && document.activeElement.id !== 'dictIn') { e.preventDefault(); undoLast(); }
});

/* ------------------------------------------------------------ Menü, Wechsel, Korrekturen */
function setCounts(g, setNo) {
  const ev = g.events; let inSet = false; const o = { toU: 0, toT: 0, sub: 0 };
  ev.forEach((e) => { if (e.k === 'set') inSet = +e.s === setNo; else if (inSet) { if (e.k === 'to') o[e.w === 't' ? 'toT' : 'toU']++; if (e.k === 'sub') o.sub++; } });
  return o;
}
ACT.livemenu = () => {
  const g = liveGame(); if (!g) return; const c = analysis(g).cur;
  const n = setCounts(g, c.set);
  const m = modal({ title: 'Mehr', html: '<div class="menu-grid">' +
    '<button class="btn" data-mm="to-u">Auszeit (wir) <small>' + n.toU + '/2</small></button><button class="btn" data-mm="to-t">Auszeit Gegner <small>' + n.toT + '/2</small></button>' +
    '<button class="btn" data-mm="sub">Wechsel <small>' + n.sub + '/6</small></button><button class="btn" data-mm="lineup">Aufstellung ändern</button>' +
    '<button class="btn" data-mm="pt-u">+1 uns (ohne Zuordnung)</button><button class="btn" data-mm="pt-t">+1 Gegner (ohne Zuordnung)</button>' +
    '<button class="btn" data-mm="srv">Aufschlagrecht korrigieren</button>' + (c.lu ? '<button class="btn" data-mm="rot+">Rotation +1</button><button class="btn" data-mm="rot-">Rotation −1</button>' : '') +
    '<button class="btn" data-mm="video">Video-Link</button>' +
    '<button class="btn" data-mm="endset">Satz beenden</button><button class="btn danger" data-mm="endgame">Spiel beenden</button></div>' });
  m.el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-mm]'); if (!b) return;
    const k = b.dataset.mm; m.close();
    if (k === 'to-u') logEv({ k: 'to', w: 'u' });
    else if (k === 'to-t') logEv({ k: 'to', w: 't' });
    else if (k === 'pt-u') logEv({ k: 'pt', w: 'u' });
    else if (k === 'pt-t') logEv({ k: 'pt', w: 't' });
    else if (k === 'srv') logEv({ k: 'fix', srv: c.srv === 'u' ? 't' : 'u' });
    else if (k === 'rot+') logEv({ k: 'fix', rot: 1 });
    else if (k === 'rot-') logEv({ k: 'fix', rot: -1 });
    else if (k === 'sub') openSub();
    else if (k === 'lineup') openLineupFix();
    else if (k === 'video') openVideoModal(g);
    else if (k === 'endset') { if (await confirmBox('Satz beenden?', 'Satz ' + c.set + ' beim Stand von ' + c.u + ':' + c.t + ' beenden?', 'Satz beenden')) logEv({ k: 'end' }); }
    else if (k === 'endgame') { if (await confirmBox('Spiel beenden?', 'Der laufende Satz wird beim Stand von ' + c.u + ':' + c.t + ' beendet und das Spiel abgeschlossen.', 'Spiel beenden')) { logEv({ k: 'end' }); finishGame(); } }
  });
};
function openSub() {
  const g = liveGame(); const c = analysis(g).cur;
  const onCourt = c.lu ? c.lu.slice() : gameRosterIds(g);
  const bench = gameRosterIds(g).filter((id) => (!onCourt.includes(id) || !c.lu) && !(c.lib || []).includes(id));
  let out = null;
  const m = modal({ title: 'Wechsel', html: '<h3>Wer geht raus?</h3><div class="chips" id="subOut">' + onCourt.map((id) => '<button class="chip" data-pid="' + id + '"><b>' + esc(pNo(player(id))) + '</b> ' + esc(pShort(id)) + '</button>').join('') + '</div>' +
    '<h3>Wer kommt rein?</h3><div class="chips" id="subIn">' + bench.map((id) => '<button class="chip" data-pid="' + id + '"><b>' + esc(pNo(player(id))) + '</b> ' + esc(pShort(id)) + '</button>').join('') + '</div>' });
  m.el.addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    if (b.parentElement.id === 'subOut') { out = b.dataset.pid; $$('#subOut .chip', m.el).forEach((x) => x.classList.toggle('on', x === b)); }
    else if (out) { if (b.dataset.pid === out) return; if (logEv({ k: 'sub', in: b.dataset.pid, out }) === true) { m.close(); toast('Wechsel: ' + pLabel(b.dataset.pid) + ' für ' + pLabel(out)); } }
    else toast('Erst wählen, wer rausgeht.');
  });
}
function openLineupFix() {
  const g = liveGame(); const c = analysis(g).cur;
  const lu = c.lu ? c.lu.slice() : [null, null, null, null, null, null];
  const ids = gameRosterIds(g);
  const opts = [['', '–']].concat(ids.map((id) => [id, pLabel(id)]));
  const m = modal({ title: 'Aufstellung jetzt (Position I = Aufschlag)', html: '<div class="grid3">' + [0, 1, 2, 3, 4, 5].map((i) => '<label>Pos. ' + C.POS[i] + selectHtml('lf' + i, opts, lu[i] || '') + '</label>').join('') + '</div>' +
    '<label>Zuspieler' + selectHtml('lfZ', opts, c.zsp || '') + '</label>',
    actions: [{ label: 'Abbrechen', kind: 'ghost' }, { label: 'Übernehmen', kind: 'primary', fn: (el) => {
      const nl = [0, 1, 2, 3, 4, 5].map((i) => $('#lf' + i, el).value || null);
      if (!nl.every(Boolean) || new Set(nl).size !== 6) { toast('Bitte 6 verschiedene Spieler wählen.'); return false; }
      if (nl.some((id) => (c.lib || []).includes(id))) { blocked('Der Libero gehört nicht in die Aufstellung der sechs.'); return false; }
      const z = $('#lfZ', el).value || null;
      if (z && !nl.includes(z)) { blocked('Der Zuspieler muss in der Aufstellung stehen.'); return false; }
      logEv({ k: 'lu', lu: nl, zsp: z && nl.includes(z) ? z : null });
    } }] });
  void m;
}

/* ------------------------------------------------------------ Live-Analyse & Protokoll */
function setSliceGame(g, setNo) {
  const ev = g.events; let start = -1;
  for (let i = ev.length - 1; i >= 0; i--) if (ev[i].k === 'set' && +ev[i].s === setNo) { start = i; break; }
  if (start < 0) return null;
  let end = ev.length; for (let i = start + 1; i < ev.length; i++) if (ev[i].k === 'set') { end = i; break; }
  return { id: g.id + 's' + setNo, events: ev.slice(start, end), format: g.format, status: 'live', source: 'live' };
}
ACT.lvpanel = (t) => { S.live.panel = t.dataset.v; render(); };
function renderLiveAna(g, a) {
  const el = $('#lv-ana'); if (!el) return;
  const scope = S.live.panel === 'spiel' ? 'spiel' : 'satz';
  const sub = scope === 'satz' ? setSliceGame(g, a.cur.set) : null;
  const A = sub ? C.analyzeGame(sub, rosterMap()) : a;
  const r = C.rkMetrics(A.rk), m = C.metrics(A.team);
  const pm = Object.entries(A.players).map(([pid, cnt]) => [pid, C.metrics(cnt)]);
  const recv = pm.filter(([, x]) => x.rAtt > 0).sort((x, y) => y[1].rAtt - x[1].rAtt);
  const att = pm.filter(([, x]) => x.aAtt > 0).sort((x, y) => y[1].aAtt - x[1].aAtt);
  const srv = pm.filter(([, x]) => x.sAtt > 0).sort((x, y) => y[1].sAtt - x[1].sAtt);
  const hot = att.filter(([, x]) => x.aAtt >= 3).sort((x, y) => (y[1].aEff - x[1].aEff))[0];
  const weak = recv.filter(([, x]) => x.rAtt >= 3).sort((x, y) => (x[1].rAvg - y[1].rAvg))[0];
  const row = (cells) => '<tr>' + cells.map((c, i) => (i ? '<td>' : '<th scope="row">') + c + (i ? '</td>' : '</th>')).join('') + '</tr>';
  let h = '<div class="card-h"><h2>Live-Analyse</h2><div class="seg-ctl small"><button class="' + (scope === 'satz' ? 'on' : '') + '" data-act="lvpanel" data-v="satz">Satz</button><button class="' + (scope === 'spiel' ? 'on' : '') + '" data-act="lvpanel" data-v="spiel">Spiel</button></div></div>';
  h += '<div class="mini-kpis">' +
    '<div><span>Side-out</span><b>' + pct(r.so) + '</b><small>' + r.recvW + '/' + r.recvR + '</small></div>' +
    '<div><span>Break</span><b>' + pct(r.bp) + '</b><small>' + r.srvW + '/' + r.srvR + '</small></div>' +
    '<div><span>Annahme Ø</span><b>' + num(m.rAvg, 2) + '</b><small>' + (m.r3P !== null ? pct(m.r3P) + ' perfekt' : m.rAtt + ' Annahmen') + '</small></div>' +
    '<div><span>Angriff</span><b>' + eff(m.aEff) + '</b><small>' + m.aKill + '/' + m.aAtt + ' Kills</small></div>' +
    '<div><span>Geschenkt</span><b>' + r.ownErr + '</b><small>von ' + r.ptsTSum + ' Gegnerpunkten</small></div></div>';
  const tips = [];
  if (hot && hot[1].aEff > 0.2) tips.push('Heiße Hand: <b>' + esc(pLabel(hot[0])) + '</b> ' + hot[1].aKill + '/' + hot[1].aAtt + ' Kills');
  if (weak && weak[1].rAvg < 1.6) tips.push('Annahme wackelt: <b>' + esc(pLabel(weak[0])) + '</b> Ø ' + num(weak[1].rAvg));
  if (r.ownErrShare !== null && r.ptsTSum >= 6 && r.ownErrShare >= 0.45) tips.push('<b>' + pct(r.ownErrShare) + '</b> der Gegnerpunkte sind geschenkt (eigene Fehler)');
  if (tips.length) h += '<ul class="tips">' + tips.map((x) => '<li>' + x + '</li>').join('') + '</ul>';
  const blk = pm.filter(([, x]) => x.bPts + x.bTouch + x.bErr > 0).sort((x, y) => (y[1].bPts + y[1].bTouch) - (x[1].bPts + x[1].bTouch));
  const tbl = (cap, heads, rows) => '<table class="tbl compact num"><caption>' + cap + '</caption><thead><tr>' + heads.map((x, i) => '<th' + (i ? ' scope="col"' : '') + '>' + x + '</th>').join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table>';
  if (recv.length) h += tbl('Annahme', ['Spieler', 'Ges', '3', '2', '1', 'F', 'Ø'], recv.map(([pid, x]) => row([esc(pLabel(pid)), x.rAtt, x.r3, x.r2, x.r1, x.rErr, num(x.rAvg)])));
  if (att.length) h += tbl('Angriff', ['Spieler', 'Ges', 'Kill', 'F', 'Blo', 'Eff'], att.map(([pid, x]) => row([esc(pLabel(pid)), x.aAtt, x.aKill, x.aErr, x.aBlk, eff(x.aEff)])));
  if (srv.length) h += tbl('Aufschlag', ['Spieler', 'Ges', 'Ass', '3', '2', '1', 'F'], srv.map(([pid, x]) => row([esc(pLabel(pid)), x.sAtt, x.sAce, x.s3, x.s2, x.s1, x.sErr])));
  if (blk.length) h += tbl('Block', ['Spieler', 'Pkt', 'T+', 'T−', 'F'], blk.map(([pid, x]) => row([esc(pLabel(pid)), x.bPts, x.bTouchP, x.bTouchM, x.bErr])));
  if (m.bErr) { const bx = C.BX_ORDER.concat('unk').filter((k) => m.bx[k]).map((k) => m.bx[k] + '× ' + C.BX[k]); h += '<p class="small muted">Blockfehler: ' + esc(bx.join(', ')) + '</p>'; }
  if (Object.values(r.rot).some((b) => b.recvR + b.srvR > 0)) {
    h += '<table class="tbl compact"><caption>Rotationen (Läufer auf …)</caption><thead><tr><th>Läufer</th><th>Side-out</th><th>Break</th><th>+/−</th></tr></thead><tbody>' +
      [1, 6, 5, 4, 3, 2].map((i) => { const b = r.rot[i]; return row([C.POS[i - 1], b.recvR ? b.recvW + '/' + b.recvR : '–', b.srvR ? b.srvW + '/' + b.srvR : '–', '<span class="' + (b.pm > 0 ? 'c-us' : b.pm < 0 ? 'c-them' : '') + '">' + (b.pm > 0 ? '+' : '') + b.pm + '</span>']); }).join('') + '</tbody></table>';
  }
  if (m.fTot) h += '<p class="small muted">Sonstige Fehler: ' + m.fNet + '× Netz, ' + m.fLine + '× Übertritt, ' + m.fBall + '× Ballfehler, ' + m.fOth + '× sonstige</p>';
  el.innerHTML = h;
}
/** Eintrag in der Schreibweise, die Scouts aus DataVolley kennen: *07A# oder *07A#>5, Gegnerpunkt aP */
function evCode(e) {
  if (e.k === 'opp') return e.r === 'err' ? '*P' : 'aP';
  if (e.k !== 'a') return '';
  const p = e.p ? player(e.p) : null;
  const no = p && hasNo(p) ? String(p.num).padStart(2, '0') : '$$';
  const gr = e.sk === 'F' ? '=' : e.g;
  return '*' + no + e.sk + gr + (e.ze ? '>' + e.ze : '');
}
function renderLiveLog(g, a) {
  const el = $('#lv-log'); if (!el) return;
  const all = S.ui.showAllLog;
  const idx = g.events.map((e, i) => i).reverse();
  const shown = all ? idx : idx.slice(0, 12);
  el.innerHTML = '<div class="card-h"><h2>Protokoll</h2><span class="muted small">' + g.events.length + ' Einträge</span></div><ol class="log">' + shown.map((i) => {
    const e = g.events[i], inf = a.evInfo[i] || {};
    const sc = inf.after ? inf.after[0] + ':' + inf.after[1] : '';
    return '<li class="' + (inf.w === 'u' ? 'wu' : inf.w === 't' ? 'wt' : '') + (inf.valid === false ? ' invalid' : '') + '"><span class="sc">' + (e.k === 'set' ? 'S' + e.s : sc) + '</span><span class="d"><code class="evc-code">' + esc(evCode(e)) + '</code>' + esc(describeEvent(e)) + '</span>' +
      (e.k === 'a' ? '<button class="icon-btn small" data-act="evedit" data-i="' + i + '" aria-label="Bearbeiten">' + ICON.edit + '</button>' : '') +
      (e.k !== 'set' ? '<button class="icon-btn small" data-act="evdel" data-i="' + i + '" aria-label="Löschen">' + ICON.trash + '</button>' : '') + '</li>';
  }).join('') + '</ol>' + (idx.length > 12 ? '<button class="btn small ghost" data-act="togglelog">' + (all ? 'Weniger anzeigen' : 'Alle anzeigen') + '</button>' : '');
}
ACT.togglelog = () => { S.ui.showAllLog = !S.ui.showAllLog; render(); };
ACT.evdel = async (t) => {
  const g = liveGame() || gameById(S.id); if (!g) return; const i = +t.dataset.i; const e = g.events[i]; if (!e) return;
  if (await confirmBox('Eintrag löschen?', describeEvent(e) + ' – Spielstand und Statistiken werden neu berechnet.', 'Löschen', true)) { g.events.splice(i, 1); Store.saveGame(g); S.live.prompted = ''; render(); }
};
ACT.evedit = (t) => {
  const g = liveGame() || gameById(S.id); if (!g) return; const i = +t.dataset.i; const e = g.events[i]; if (!e || e.k !== 'a') return;
  const ids = gameRosterIds(g);
  let sk = e.sk, gr = e.g;
  let bx = e.x || '';
  const gradesHtml = () => C.SKILL[sk].grades.map((x) => '<button class="chip' + (x === gr ? ' on' : '') + '" data-eg="' + x + '">' + esc(C.GL[sk][x]) + '</button>').join('') +
    (sk === 'B' && gr === '=' ? '<div class="chips bxr"><span class="small muted">Grund:</span>' + C.BX_ORDER.map((k) => '<button class="chip' + (bx === k ? ' on' : '') + '" data-ex="' + k + '">' + esc(C.BX[k]) + '</button>').join('') + '</div>' : '');
  const m = modal({ title: 'Eintrag bearbeiten', html: '<label>Spieler' + selectHtml('eeP', [['', 'ohne Spieler']].concat(ids.map((id) => [id, pLabel(id)])), e.p || '') + '</label>' +
    '<label>Aktion' + selectHtml('eeS', C.SKILL_ORDER.map((k) => [k, C.SKILL[k].label]), sk) + '</label><div class="chips" id="eeG">' + gradesHtml() + '</div>',
    actions: [{ label: 'Abbrechen', kind: 'ghost' }, { label: 'Speichern', kind: 'primary', fn: (el) => {
      const np = $('#eeP', el).value || null;
      const why = C.checkAction(g, { k: 'a', p: np, sk, g: gr }, { at: i, roster: rosterMap(), label: pLabel, pendingR: true });
      if (why) { blocked(why); return false; }
      e.p = np; e.sk = sk; e.g = gr;
      if (e.p) delete e.np;
      if (sk === 'B' && gr === '=' && bx) e.x = bx; else delete e.x;
      Store.saveGame(g); S.live.prompted = ''; render();
    } }] });
  $('#eeS', m.el).addEventListener('change', (ev) => { sk = ev.target.value; gr = C.SKILL[sk].grades[0]; $('#eeG', m.el).innerHTML = gradesHtml(); });
  $('#eeG', m.el).addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-eg]'), x = ev.target.closest('[data-ex]');
    if (b) gr = b.dataset.eg; else if (x) bx = bx === x.dataset.ex ? '' : x.dataset.ex; else return;
    $('#eeG', m.el).innerHTML = gradesHtml();
  });
};

/* ------------------------------------------------------------ Sprache & Text */
function bindDictation() {
  const form = $('#dictForm'), inp = $('#dictIn'), auto = $('#dictAuto');
  if (!form) return;
  let processed = 0, timer = null;
  form.addEventListener('submit', (e) => { e.preventDefault(); const txt = inp.value.slice(processed); inp.value = ''; processed = 0; if (txt.trim()) processText(txt); });
  inp.addEventListener('input', () => {
    if (inp.value.length < processed) processed = inp.value.length;
    clearTimeout(timer);
    if (!auto.checked) return;
    timer = setTimeout(() => { const txt = inp.value.slice(processed); if (txt.trim()) { processed = inp.value.length; processText(txt); } }, 1400);
  });
  inp.addEventListener('blur', () => { setTimeout(() => { if (document.activeElement !== inp && processed >= inp.value.length) { inp.value = ''; processed = 0; } }, 1600); });
  auto.addEventListener('change', () => lsSet('vst:dictAuto', auto.checked ? '1' : '0'));
}
/** Nicht Erkanntes landet in der Offen-Liste und merkt sich die Stelle im Spiel. */
function addInbox(g, r, orig) {
  const last = g.events[g.events.length - 1];
  const txt = orig || (r.text ? r.text.charAt(0).toUpperCase() + r.text.slice(1) : '');
  const it = { id: C.rid(6), text: txt, why: r.why, after: last ? last.id : null, t: stamp(), c: clockMs(g) };
  if (r.p) it.p = r.p; if (r.sk) it.sk = r.sk; if (r.q) it.q = r.q;
  (g.inbox || (g.inbox = [])).push(it);
  Store.saveGame(g);
}
/** Fügt Einträge an der ursprünglichen Stelle ein (nach dem Anker, vor allem später Erfassten). */
function insertAt(g, it, acts) {
  let pos = g.events.length;
  const ai = it.after ? g.events.findIndex((e) => e.id === it.after) : -1;
  if (ai >= 0) { pos = ai + 1; while (pos < g.events.length && (g.events[pos].t || 0) < it.t) pos++; }
  const evs = [];
  for (let k = 0; k < acts.length; k++) {
    const e = Object.assign({}, acts[k], { id: C.rid(6), t: it.t + k * 0.001, c: (it.c || 0) + k }); if (e.k === 'a' && !e.p) e.np = 1;
    const why = C.checkAction(g, e, { at: pos + k, roster: rosterMap(), label: pLabel, pendingR: true });
    if (why) { g.events.splice(pos, k); return why; }   // nichts halb einfügen
    g.events.splice(pos + k, 0, e); evs.push(e);
  }
  g.inbox = (g.inbox || []).filter((x) => x.id !== it.id);
  return evs;
}
function processText(text) {
  const g = liveGame(); if (!g) return;
  const c0 = analysis(g).cur;
  const expect = c0.inSet && !c0.rallyOpen ? (c0.srv === 'u' ? 'S' : 'R') : null;
  const res = C.parseCommands(text, { roster: rosterList(true), expect });
  if (!res.length) return;
  const single = C.splitSegments(text).length === 1;
  for (const r of res) {
    if (!r.ok) { addInbox(g, r, single ? text.trim() : null); continue; }
    const act = r.act;
    if (act.k === 'undo') { feedOk('Rückgängig'); undoLast(); continue; }
    if (act.k === 'a') {
      const p = act.p || S.live.sel || serverDefault(act.sk);
      const e = { k: 'a', p: p || null, sk: act.sk, g: act.g }; if (act.x) e.x = act.x;
      const ok = logEv(e, { quiet: true });
      if (ok !== true) { addInbox(g, { text: r.text, why: 'nicht möglich – ' + ok }, single ? text.trim() : null); blocked(ok); continue; }
      if (p) feedOk(C.describeAct(e, pLabel));
      continue;
    }
    if (act.k === 'sub') {
      const c = analysis(g).cur;
      if (c.lu && !c.lu.includes(act.out) && !(c.lib || []).includes(act.out)) { blocked(pLabel(act.out) + ' steht nicht auf dem Feld.'); continue; }
    }
    const ok = logEv(Object.assign({}, act), { quiet: true });
    if (ok !== true) { if (act.k === 'to' || act.k === 'sub') blocked(ok); continue; }
    feedOk(C.describeAct(act, pLabel));
  }
  renderFeed(); render();
}
let recog = null, recogOn = false;
ACT.mic = (t) => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return;
  if (recogOn) { recogOn = false; try { recog.stop(); } catch (e) { /* egal */ } t.classList.remove('on'); toast('Spracheingabe aus'); return; }
  recog = new SR(); recog.lang = 'de-DE'; recog.continuous = true; recog.interimResults = false;
  recog.onresult = (ev) => { for (let i = ev.resultIndex; i < ev.results.length; i++) if (ev.results[i].isFinal) processText(ev.results[i][0].transcript); };
  recog.onend = () => { if (recogOn) { try { recog.start(); } catch (e) { /* egal */ } } };
  recog.onerror = (ev) => { if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') { recogOn = false; t.classList.remove('on'); toast('Mikrofon nicht erlaubt – bitte im Browser freigeben.', { kind: 'error' }); } };
  try { recog.start(); recogOn = true; t.classList.add('on'); toast('Spracheingabe an – einfach ansagen'); } catch (e) { toast('Spracheingabe konnte nicht starten.', { kind: 'error' }); }
};
ACT.cmdhelp = () => modal({ title: 'Sprach- und Textbefehle', wide: true, html: cmdHelpHtml() });
function cmdHelpHtml() {
  return '<p>Spieler per <b>Nummer</b> oder <b>Name</b>, dann Aktion und Bewertung. Mehrere Aktionen mit Komma, Punkt oder „dann“ trennen. Bewertungen als Zahl: <b>3 = beste Stufe</b>, 2 = mittel, 1 = schwach.</p>' +
    '<table class="tbl cmd"><thead><tr><th>Aktion</th><th>Beispiele</th></tr></thead><tbody>' +
    '<tr><th>Aufschlag</th><td>„12 Ass“, „Paul Aufschlag 3 / 2 / 1“ (3 = Druck, Gegner aus dem System), „Aufschlagfehler“, „Aufschlag Netz“</td></tr>' +
    '<tr><th>Annahme</th><td>„Max Annahme 3“ (perfekt), „Annahme 2“ (Angriff noch mit Optionen), „Annahme 1“ (nur hoher Ball), „Annahme Fehler“ oder „Annahme 0“. Beim Gegner-Aufschlag reicht „Max 3“.</td></tr>' +
    '<tr><th>Angriff</th><td>„7 Kill“, „Tim Angriff im Spiel“, „Tim geblockt“, „Angriff aus“, „Angriffsfehler“</td></tr>' +
    '<tr><th>Block</th><td>„Felix Block“ (= Punkt), „Block Touch plus“ (Ball bei uns), „Block Touch minus“ (Ball beim Gegner), „Blockfehler“ – mit Grund: „Block Netz“, „Block Out“, „Block nicht geschlossen“, „Block unsauber“, „Block zu spät“</td></tr>' +
    '<tr><th>Abwehr</th><td>„Elias Abwehr“ (= gut), „Abwehr schlecht“, „Abwehr Fehler“</td></tr>' +
    '<tr><th>Fehler</th><td>„Paul Netz“, „Felix übertreten“, „Jonas doppelt“</td></tr>' +
    '<tr><th>Gegner</th><td>„Gegner Fehler“ (Punkt für uns), „Gegnerpunkt“, „Gegner Ass“</td></tr>' +
    '<tr><th>Sonstiges</th><td>„Rückgängig“, „Auszeit“, „Auszeit Gegner“, „Wechsel 14 für 4“, „Punkt für uns“</td></tr>' +
    '<tr><th>Kurzcodes</th><td>Nummer + Buchstabe + Zeichen: <code>7a#</code> Kill, <code>12s=</code> Aufschlagfehler, <code>5r#</code> Annahme 3, <code>5r+</code> Annahme 2, <code>5r-</code> Annahme 1, <code>12s+</code> Aufschlag 3, <code>12s-</code> Aufschlag 1, <code>9b#</code> Block, <code>9b+</code> / <code>9b-</code> Touch +/−, <code>op</code> Gegnerpunkt, <code>oe</code> Gegnerfehler. Buchstaben: s Aufschlag, r Annahme, a Angriff, b Block, d Abwehr, f Fehler. Zeichen wie im DVV-Codebook: # Punkt bzw. 3, + gut, 0 / ! mittel, - schwach, / geblockt, = Fehler.</td></tr>' +
    '</tbody></table><p class="muted small">Ohne Spieler (z. B. „Annahme 2“) wird die Aktion sofort gezählt – den Spieler einfach danach antippen oder später in der Liste „Offen“ nachtragen. Nicht Erkanntes landet ebenfalls dort und lässt sich mit einem Tipp korrigieren. Beim eigenen Aufschlag mit Aufstellung ist der Aufschläger automatisch gesetzt.</p>';
}

/* ui-views.js – Übersicht, Spiele, Spielbericht, Spieler, Daten */

/* ------------------------------------------------------------ Filter */
function seasonOfGame(g) { return g.season || seasonOf(g.date || todayIso()); }
function filteredGames() {
  let gs = statsGames().slice().sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.createdAt || 0) - (b.createdAt || 0));
  if (S.filter.season !== 'all') gs = gs.filter((g) => seasonOfGame(g) === S.filter.season);
  if (S.filter.comp !== 'all') gs = gs.filter((g) => g.comp === S.filter.comp);
  if (S.filter.last) gs = gs.slice(-S.filter.last);
  return gs;
}
function filterRow() {
  const games = statsGames();
  const seasons = Array.from(new Set(games.map(seasonOfGame))).sort().reverse();
  const comps = Array.from(new Set(games.map((g) => g.comp).filter(Boolean)));
  return '<div class="filters" role="group" aria-label="Filter">' +
    selectHtml('fSeason', [['all', 'Alle Saisons']].concat(seasons.map((s) => [s, 'Saison ' + s])), S.filter.season, 'data-f="season" aria-label="Saison"') +
    selectHtml('fComp', [['all', 'Alle Wettbewerbe']].concat(comps.map((c) => [c, c])), S.filter.comp, 'data-f="comp" aria-label="Wettbewerb"') +
    selectHtml('fLast', [['0', 'Alle Spiele'], ['3', 'Letzte 3'], ['5', 'Letzte 5'], ['10', 'Letzte 10']], S.filter.last, 'data-f="last" aria-label="Zeitraum"') + '</div>';
}
document.addEventListener('change', (e) => { const f = e.target.dataset && e.target.dataset.f; if (f) { S.filter[f] = f === 'last' ? +e.target.value : e.target.value; render(); } });
function resultPill(a) {
  if (!a) return '';
  if (a.noResult) return '<span class="res" title="Ergebnis noch nicht eingetragen">–</span>';
  const w = a.setsU > a.setsT, l = a.setsT > a.setsU;
  return '<span class="res ' + (w ? 'win' : l ? 'loss' : '') + '">' + a.setsU + ':' + a.setsT + '</span>';
}

/* ------------------------------------------------------------ Eingaben: Satzergebnisse */
const SET_IN = (pre, sets, ph) => '<div class="sets-in">' + [1, 2, 3, 4, 5].map((i) => {
  const st = (sets || [])[i - 1] || {}; const has = st.u || st.t;
  return '<span><input type="text" inputmode="numeric" data-num="int" maxlength="2" id="' + pre + 'U' + i + '" aria-label="Satz ' + i + ' wir" placeholder="' + (ph && i <= 3 ? '25' : '') + '" value="' + (has ? esc(st.u) : '') + '">:' +
    '<input type="text" inputmode="numeric" data-num="int" maxlength="2" id="' + pre + 'T' + i + '" aria-label="Satz ' + i + ' Gegner" value="' + (has ? esc(st.t) : '') + '"></span>';
}).join('') + '</div>';
function readSets(pre, root) { return [1, 2, 3, 4, 5].map((i) => ({ u: ($('#' + pre + 'U' + i, root) || {}).value || '', t: ($('#' + pre + 'T' + i, root) || {}).value || '' })).map((x) => ({ u: x.u.trim(), t: x.t.trim() })); }
function filledSets(list) { return list.filter((x) => x.u !== '' || x.t !== '').map((x) => ({ u: +x.u, t: +x.t })); }
function markSets(pre, root, errs) {
  [1, 2, 3, 4, 5].forEach((i) => { const bad = errs.some((m) => m.indexOf('Satz ' + i + ' ') === 0 || m.indexOf('Satz ' + i + ':') === 0); ['U', 'T'].forEach((k) => { const el = $('#' + pre + k + i, root); if (el) el.classList.toggle('bad', bad); }); });
}
function errsHtml(list, head) { return list.length ? '<div class="errs" role="alert"><b>' + esc(head || 'Das geht im Volleyball nicht:') + '</b><ul>' + list.map((m) => '<li>' + esc(m) + '</li>').join('') + '</ul></div>' : ''; }
function gameFormat(g) { const f = (g && g.format) || {}; const d = S.settings.format || {}; return { mode: f.mode || d.mode || 'bo5', pts: f.pts || d.pts || 25, tb: f.tb || d.tb || 15 }; }

/* ------------------------------------------------------------ Übersicht */
VIEWS.uebersicht = function (view) {
  const games = filteredGames();
  let h = '<div class="page-h"><h1>Saison</h1>' + (statsGames().length ? filterRow() : '') + '</div>';
  if (!games.length) {
    view.innerHTML = h + emptyState('Noch keine Spiele', 'Scoute euer nächstes Spiel aus dem Video oder live, oder trage ein vergangenes Spiel mit seinen Statistiken nach.',
      realPlayers().length ? '<div class="row center"><a class="btn primary" href="#live">Spiel scouten</a><a class="btn" href="#daten">Spiel nachtragen</a></div>' : '<div class="row center"><button class="btn primary" data-act="kaderneu">Kader anlegen</button></div>');
    return;
  }
  const an = games.map(analysis); const agg = C.aggregate(an); const T = targets();
  const ins = C.insights(agg, T, pShort);
  const r = agg.r;
  const noRes = an.filter((x) => x.noResult).length;
  const team = S.settings.teamName || (isDemo() ? 'Beispielteam' : 'Euer Team');
  const lastFive = games.map((g, i) => ({ g, a: an[i] })).slice(-5);
  const formChip = ({ g, a }) => {
    const w = a.noResult ? '–' : a.setsU > a.setsT ? 'S' : a.setsT > a.setsU ? 'N' : 'U';
    const label = esc(g.opponent || 'Spiel') + (a.noResult ? '' : ', ' + a.setsU + ':' + a.setsT);
    return '<a href="#spiel-' + g.id + '" class="form-chip ' + (w === 'S' ? 'win' : w === 'N' ? 'loss' : '') + '" title="' + label + '" aria-label="' + label + '">' + w + '</a>';
  };
  const fact = (k, v) => '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>';
  const pl = (n, one, many) => n + ' ' + (n === 1 ? one : many);
  const record = noRes < agg.games ? pl(agg.wins, 'Sieg', 'Siege') + ', ' + pl(agg.losses, 'Niederlage', 'Niederlagen') + ' · Sätze ' + agg.setsU + ':' + agg.setsT : pl(agg.games, 'Spiel', 'Spiele') + ', noch ohne Ergebnisse';
  h = '<section class="tafel"><div class="tafel-top"><div><h1>' + esc(team) + '</h1><p class="tafel-eye">' + record + (noRes && noRes < agg.games ? ' · ' + noRes + ' ohne Ergebnis' : '') + '</p></div>' +
    '<div class="tafel-act">' + filterRow() + '<a class="btn primary" href="#live">Spiel scouten</a></div></div>' +
    '<dl class="tafel-facts">' + fact('Side-out', r ? pct(r.so) : '–') + fact('Break', r ? pct(r.bp) : '–') + fact('Liga', esc((C.LEVELS[S.settings.level] || C.LEVELS.bezirk).label)) + fact('Gescoutet', agg.liveGames + ' von ' + agg.games) +
    '<div class="tafel-form"><dt>Letzte Spiele</dt><dd class="form-row">' + lastFive.map(formChip).join('') + '</dd></div></dl></section>';
  h += '<div class="dash">';
  h += '<section class="card span2 focus-card"><div class="card-h"><h2>Trainingsfokus</h2><span class="muted small">größte Baustellen nach Punkten pro Satz</span></div>' + focusHtml(ins) + '</section>';
  h += (HOOK.whyHtml ? HOOK.whyHtml(games, true) : '') + (HOOK.linkedHtml ? HOOK.linkedHtml(games) : '');
  h += '<section class="card span2"><details><summary class="card-sum">Alle Kennzahlen im Verlauf <span class="muted small">Linie = Ziel</span></summary><div class="kpis">' + kpiTiles(agg, T) + '</div></details></section>';
  h += '<section class="card span2">' + detailTabsHtml(agg, 'dashTab') + '</section>';
  h += '<section class="card span2"><div class="card-h"><h2>Letzte Spiele</h2><a href="#spiele" class="small">Alle</a></div>' + gameListHtml(games.slice().reverse().slice(0, 5), true) + '</section>';
  h += '</div>';
  view.innerHTML = h;
};
/* Detailbereich mit Reitern: je Bereich Team-Auswertung + Spielertabelle */
const DETAIL_TABS = [['punkte', 'Punkte'], ['rec', 'Annahme'], ['srv', 'Aufschlag'], ['att', 'Angriff'], ['blk', 'Block & Abwehr'], ['rot', 'Rotationen & Phasen']];
function detailTabsHtml(agg, stateKey) {
  const r = agg.r, m = agg.m;
  const tabs = DETAIL_TABS.filter(([k]) => k !== 'rot' || r);
  let tab = S.ui[stateKey] || 'punkte'; if (!tabs.some((t) => t[0] === tab)) tab = tabs[0][0];
  let h = '<nav class="subtabs inner" aria-label="Bereich">' + tabs.map(([k, l]) => '<button class="' + (tab === k ? 'on' : '') + '" data-act="dtabs" data-s="' + stateKey + '" data-v="' + k + '">' + l + '</button>').join('') + '</nav>';
  const rows = playerRows(agg.players);
  const liveHint = '<p class="small muted">Diese Auswertung gibt es nur für live gescoutete Spiele.</p>';
  if (tab === 'punkte') {
    h += r ? '<div class="two">' + '<div>' + pointSourcesHtml(r) + '</div><div>' + pointsByPlayerHtml(rows) + '</div></div>' : liveHint.replace('Diese Auswertung', 'Woher die Punkte kommen') + pointsByPlayerHtml(rows);
  } else if (tab === 'rec') {
    const team = '<div><h3>Team</h3>' + segBar('R', agg.team.R, true) + segLegend('R', agg.team.R) + recLine(m) + '</div>';
    h += (r ? '<div class="two">' + team + '<div><h3>Annahme → Side-out</h3>' + recChainHtml(r) + '</div></div>' : team) + statTableHtml(rows, agg.team, 'rec', { sortKey: 'sortD' });
  } else if (tab === 'srv') {
    const team = '<div><h3>Team</h3>' + segBar('S', agg.team.S, true) + segLegend('S', agg.team.S) + '<p class="small">Ø <b>' + num(m.sAvg, 2) + '</b> · Asse <b>' + pct(m.sAceP) + '</b>' + (m.s3P !== null ? ' · 3 (Druck) <b>' + pct(m.s3P) + '</b> · 2 <b>' + pct(m.s2P) + '</b> · 1 <b>' + pct(m.s1P) + '</b>' : '') + ' · Fehler <b>' + pct(m.sErrP) + '</b></p></div>';
    h += (r ? '<div class="two">' + team + '<div><h3>Aufschlag → Break</h3>' + serveChainHtml(r) + '</div></div>' : team) + statTableHtml(rows, agg.team, 'srv', { sortKey: 'sortD' });
  } else if (tab === 'att') {
    h += attackSplitHtml(m, r) + statTableHtml(rows, agg.team, 'att', { sortKey: 'sortD' });
  } else if (tab === 'blk') {
    h += '<div class="two"><div><h3>Block</h3>' + segBar('B', agg.team.B, true) + segLegend('B', agg.team.B) + blockReasonsHtml(m) + '</div><div><h3>Abwehr</h3>' + segBar('D', agg.team.D, true) + segLegend('D', agg.team.D) + '</div></div>' + statTableHtml(rows, agg.team, 'blk', { sortKey: 'sortD' });
  } else if (tab === 'rot') {
    h += '<div class="two"><div><h3>Rotationen</h3>' + rotationHtml(r) + '</div><div><h3>Schlussphase & Serien</h3>' + crunchHtml(r) + '</div></div>';
  }
  return h;
}
ACT.dtabs = (t) => { S.ui[t.dataset.s] = t.dataset.v; render(); };
/** Annahme in Worten: Schnitt und Anteile je Stufe */
function recLine(m) {
  if (!m.rAtt) return '<p class="small muted">Keine Annahmen.</p>';
  return '<p class="small">Ø <b>' + num(m.rAvg, 2) + '</b>' + (m.r3P !== null ? ' · perfekt (3) <b>' + pct(m.r3P) + '</b> · gut (2) <b>' + pct(m.r2P) + '</b> · schlecht (1) <b>' + pct(m.r1P) + '</b>' : '') + ' · Fehler <b>' + pct(m.rErrP) + '</b></p>';
}
function recSub(m) { return m.rAtt ? (m.r3P !== null ? pct(m.r3P) + ' perfekt · ' : '') + pct(m.rErrP) + ' Fehler · ' + m.rAtt + ' Annahmen' : 'keine Annahmen'; }
function blockReasonsHtml(m) {
  if (!m.bErr) return '';
  const parts = C.BX_ORDER.concat('unk').filter((k) => m.bx[k]).map((k) => '<span><b>' + m.bx[k] + '</b> ' + esc(C.BX[k]) + '</span>');
  return '<p class="small"><b>' + m.bErr + ' Blockfehler:</b> ' + parts.join(' · ') + '</p>';
}
function pointsByPlayerHtml(rows) {
  const list = rows.filter((o) => o.x.pts + o.x.err > 0).sort((a, b) => b.x.pts - a.x.pts || b.x.gv - a.x.gv);
  if (!list.length) return '';
  return '<table class="tbl compact"><caption>Punkte je Spieler</caption><thead><tr><th>Spieler</th><th>Punkte</th><th title="Kills">Kill</th><th>Ass</th><th>Block</th><th title="eigene Fehler">Fehler</th><th title="Punkte minus Fehler">G-V</th></tr></thead><tbody>' +
    list.map((o) => '<tr><th scope="row">' + o.label + '</th><td><b>' + o.x.pts + '</b></td><td>' + o.x.aKill + '</td><td>' + o.x.sAce + '</td><td>' + o.x.bPts + '</td><td>' + o.x.err + '</td><td class="' + (o.x.gv > 0 ? 'c-us' : o.x.gv < 0 ? 'c-them' : '') + '">' + signed(o.x.gv) + '</td></tr>').join('') + '</tbody></table>';
}

/* ------------------------------------------------------------ Statistik-Tabellen */
const BXS = { out: 'Out', net: 'Netz', gap: 'offen', tech: 'unsauber', late: 'zu spät', unk: 'o. A.' };
const STAT_VIEWS = [['srv', 'Aufschlag'], ['rec', 'Annahme'], ['att', 'Angriff'], ['blk', 'Block & Abwehr']];
const pctOf = (a, b) => (b ? a / b : null);
const STAT_COLS = {
  srv: [
    { k: 'sAtt', h: 'Ges' }, { k: 'sAce', h: 'Ass', p: (x) => x.sAceP },
    { k: 's3', h: '3', hs: 'Druck', q: 'S', p: (x) => x.s3P, t: 'Gegner kommt nicht ins System' }, { k: 's2', h: '2', hs: 'mittel', q: 'S', p: (x) => x.s2P }, { k: 's1', h: '1', hs: 'leicht', q: 'S', p: (x) => x.s1P, t: 'Gegner nimmt perfekt an' },
    { k: 'sErr', h: 'Fehler', p: (x) => x.sErrP }, { k: 'sNoQ', h: 'o. St.', opt: 1, t: 'nachgetragen ohne Stufe' },
    { k: 'sAvg', h: 'Ø', f: 'avg', n: 'sGr', t: 'Aufschlagnote: Ass 4 · 3 · 2 · 1 · Fehler 0' }, { k: 'srvWP', h: 'Break', f: 'pct', n: 'srvR', opt: 1, t: 'Ballwechsel bei eigenem Aufschlag gewonnen (Breakpunkt-Quote)' },
  ],
  rec: [
    { k: 'rAtt', h: 'Ges' },
    { k: 'r3', h: '3', hs: 'perfekt', q: 'R', p: (x) => x.r3P, t: 'alle Angriffsoptionen' }, { k: 'r2', h: '2', hs: 'gut', q: 'R', p: (x) => x.r2P, t: 'Zuspieler muss laufen' }, { k: 'r1', h: '1', hs: 'schlecht', q: 'R', p: (x) => x.r1P, t: 'nur hoher Ball' },
    { k: 'rErr', h: 'Fehler', hs: 'Ass gg.', p: (x) => x.rErrP, t: 'Ass gegen uns' }, { k: 'rNoQ', h: 'o. St.', opt: 1, t: 'nachgetragen ohne Stufe' },
    { k: 'rAvg', h: 'Ø', f: 'avg', n: 'rAtt', t: 'Schnitt: 3 · 2 · 1 · Fehler 0' },
  ],
  att: [
    { k: 'aAtt', h: 'Ges' }, { k: 'aKill', h: 'Kill', p: (x) => x.aKillP }, { k: 'aIn', h: 'im Spiel', p: (x) => pctOf(x.aIn, x.aAtt) }, { k: 'aBlk', h: 'geblockt', p: (x) => x.aBlkP }, { k: 'aErr', h: 'Fehler', p: (x) => pctOf(x.aErr, x.aAtt) },
    { k: 'aEff', h: 'Eff', f: 'eff', n: 'aAtt', t: '(Kills − Fehler − geblockt) / Angriffe' },
    { k: 'soEff', h: 'Eff', hs: 'n. Annahme', f: 'eff', n: 'soAtt', opt: 1, t: 'Effizienz direkt nach eigener Annahme' }, { k: 'trEff', h: 'Eff', hs: 'Konter', f: 'eff', n: 'trAtt', opt: 1, t: 'Effizienz nach Abwehr oder Block' },
    { k: 'ast', h: 'Assists', opt: 1, t: 'Zuspiele zum Kill (aus Statistikbögen)' },
  ],
  blk: [
    { k: 'bPts', h: 'Block', hs: 'Punkt' }, { k: 'bTouchP', h: 'Touch +', opt: 1, t: 'Ball bleibt bei uns' }, { k: 'bTouchM', h: 'Touch −', opt: 1, t: 'Ball zurück zum Gegner' }, { k: 'bErr', h: 'Block', hs: 'Fehler' },
  ].concat(C.BX_ORDER.concat('unk').map((k) => ({ k: (x) => x.bx[k] || 0, key: 'bx_' + k, h: BXS[k], hs: 'Bl.-Fehler', opt: 1, sub: 1, t: 'Blockfehler: ' + C.BX[k] }))).concat([
    { k: 'dAtt', h: 'Abwehr' }, { k: 'dErr', h: 'Abwehr', hs: 'Fehler', p: (x) => (x.dGr ? pctOf(x.dErr, x.dAtt) : null) }, { k: 'fTot', h: 'sonst.', hs: 'Fehler', opt: 1, t: 'Netz, Übertritt, Ballfehler, sonstige' },
  ]),
};
const STAT_HAS = { srv: (x) => x.sAtt > 0, rec: (x) => x.rAtt > 0, att: (x) => x.aAtt > 0 || x.ast > 0, blk: (x) => x.bPts + x.bTouch + x.bErr + x.dAtt + x.fTot > 0 };
function colVal(col, x) { return typeof col.k === 'function' ? col.k(x) : x[col.k]; }
function colKey(col) { return col.key || col.k; }
function statCell(col, x) {
  if (col.q) { const noQ = col.q === 'S' ? (!x.sQ && x.sNoQ > 0) : (!(x.r3 + x.r2 + x.r1) && x.rNoQ > 0); if (noQ) return '<td class="muted" title="ohne Stufe nachgetragen">–</td>'; }
  const v = colVal(col, x);
  if (v === null || v === undefined || (typeof v === 'number' && !isFinite(v))) return '<td class="muted">–</td>';
  const lown = col.n && (x[col.n] || 0) < 5;
  const txt = col.f === 'pct' ? pct(v) : col.f === 'eff' ? eff(v) : col.f === 'avg' ? num(v, 2) : String(v);
  const pv = col.p ? col.p(x) : null;
  return '<td' + (lown ? ' class="lown" title="weniger als 5 Aktionen"' : col.sub ? ' class="sub"' : '') + '>' + txt + (pv !== null && pv !== undefined && isFinite(pv) && v ? '<small>' + pct(pv) + '</small>' : '') + '</td>';
}
/** Spielerzeilen mit Kennzahlen; Spieler ohne Nummer am Ende */
function playerRows(players) {
  return Object.entries(players).map(([pid, c]) => {
    const p = player(pid);
    return { pid, x: C.metrics(c), label: (isDemo() || p) ? '<a href="#spieler-' + pid + '">' + esc(pLabel(pid)) + '</a>' : esc(pLabel(pid)), no: hasNo(p) ? +p.num : 1000, name: (p && p.name) || '' };
  });
}
function statTableHtml(rows, team, view, opts) {
  opts = opts || {};
  const has = STAT_HAS[view];
  const list = rows.filter((o) => has(o.x));
  const tx = C.metrics(team);
  if (!list.length && !has(tx)) return '<p class="muted">Keine Daten für diesen Bereich.</p>';
  const cols = STAT_COLS[view].filter((col) => !col.opt || list.concat([{ x: tx }]).some((o) => { const v = colVal(col, o.x); return v !== null && v !== undefined && v !== 0; }));
  const sk = opts.sortKey ? (S.ui[opts.sortKey] || (S.ui[opts.sortKey] = { k: null, d: -1 })) : { k: null };
  const sorted = list.slice().sort((a, b) => {
    if (!sk.k) return a.no - b.no || a.name.localeCompare(b.name);
    const col = cols.find((c) => colKey(c) === sk.k); if (!col) return a.no - b.no;
    const va = colVal(col, a.x), vb = colVal(col, b.x);
    if (va === null || va === undefined) return 1; if (vb === null || vb === undefined) return -1;
    return (va - vb) * sk.d || a.no - b.no;
  });
  const head = cols.map((col) => {
    const key = colKey(col); const on = sk.k === key;
    const lbl = esc(col.h) + (on ? (sk.d > 0 ? ' ▲' : ' ▼') : '') + (col.hs ? '<small>' + esc(col.hs) + '</small>' : '');
    return '<th' + (col.t ? ' title="' + esc(col.t) + '"' : '') + (col.sub ? ' class="sub"' : '') + '>' + (opts.sortKey ? '<button class="sort' + (on ? ' on' : '') + '" data-act="ssort" data-s="' + opts.sortKey + '" data-k="' + key + '">' + lbl + '</button>' : lbl) + '</th>';
  }).join('');
  const body = sorted.map((o) => '<tr><th scope="row" class="stick">' + o.label + '</th>' + cols.map((col) => statCell(col, o.x)).join('') + '</tr>').join('');
  const total = '<tr class="total"><th scope="row" class="stick">Team</th>' + cols.map((col) => statCell(col, tx)).join('') + '</tr>';
  const note = cols.some((c) => c.k === 'sNoQ' || c.k === 'rNoQ') ? '<p class="small muted">„o. St.“ = nachgetragen ohne Stufe 3/2/1. Die Prozente bei 3/2/1 beziehen sich nur auf die Aktionen mit Stufe, Fehler-Prozente auf alle.</p>' : '<p class="small muted">Kleine Zahl = Anteil an allen Aktionen.</p>';
  return '<div class="tbl-wrap"><table class="tbl stat"><thead><tr><th class="stick">' + (opts.sortKey ? '<button class="sort' + (!sk.k ? ' on' : '') + '" data-act="ssort" data-s="' + opts.sortKey + '" data-k="">Spieler</button>' : 'Spieler') + '</th>' + head + '</tr></thead><tbody>' + body + total + '</tbody></table></div>' +
    '<p class="small muted">Grau = weniger als 5 Aktionen.</p>' + note;
}
ACT.ssort = (t) => {
  const st = S.ui[t.dataset.s] || (S.ui[t.dataset.s] = { k: null, d: -1 }); const k = t.dataset.k || null;
  if (st.k === k && k) st.d = -st.d; else { st.k = k; st.d = /Err|ErrP|^bErr|^dErr|^aBlk|^sErr|^rErr/.test(k || '') ? 1 : -1; }
  render();
};
function focusHtml(ins) {
  if (!ins.focus.length) return '<p class="muted">Keine deutliche Baustelle – alle Werte im Zielbereich oder noch zu wenige Daten (mind. ca. 20 Aktionen je Bereich).</p>' + strengthsHtml(ins);
  const f = ins.focus.slice(0, 3);
  let h = '<div class="focus-list">' + f.map((x, i) => '<article class="focus"><div class="focus-h"><span class="rank">' + (i + 1) + '</span><div class="grow"><span class="area">' + esc(x.area) + '</span><h3>' + esc(x.title) + '</h3></div>' +
    '<span class="impact" title="geschätzte Punkte pro Satz gegenüber dem Zielwert">≈ ' + num(x.impact) + '<small>Punkte/Satz</small></span></div>' +
    '<p>' + esc(x.text) + '</p>' + (x.who && x.who.length ? '<p class="who"><b>Betroffen:</b> ' + esc(x.who.join(' · ')) + '</p>' : '') +
    '<p class="drill"><b>Übung:</b> ' + esc(x.drill) + '</p></article>').join('') + '</div>';
  if (ins.focus.length > 3) h += '<p class="small muted">Weitere: ' + ins.focus.slice(3).map((x) => esc(x.title) + ' (≈ ' + num(x.impact) + ')').join(' · ') + '</p>';
  return h + strengthsHtml(ins);
}
function strengthsHtml(ins) {
  if (!ins.strengths.length) return '';
  return '<div class="strengths"><b>Stärken:</b> ' + ins.strengths.map((x) => '<span class="pill ok">' + esc(x.good || x.title) + ' · ' + (x.fmt === 'eff' ? eff(x.value) : x.fmt === 'avg' ? 'Ø ' + num(x.value, 2) : x.fmt === 'num' ? num(x.value) : pct(x.value)) + '</span>').join(' ') + '</div>';
}
function kpiTiles(agg, T) {
  const m = agg.m, r = agg.r, S_ = agg.series;
  const sets = Math.max(1, m.sets);
  const ser = (fn) => S_.map((s) => { try { return fn(s); } catch (e) { return null; } });
  let h = '';
  h += kpiTile('Side-out', r ? pct(r.so) : '–', r ? r.recvW + '/' + r.recvR + ' Ballwechsel' : 'nur live', r ? statusChip(r.so, T.so, 'min') : '', spark(ser((s) => s.r && s.r.so), { target: T.so }));
  h += kpiTile('Break-Punkte', r ? pct(r.bp) : '–', r ? r.srvW + '/' + r.srvR + ' Ballwechsel' : 'nur live', r ? statusChip(r.bp, T.bp, 'min') : '', spark(ser((s) => s.r && s.r.bp), { target: T.bp }));
  h += kpiTile('Annahme-Schnitt', m.rAvg !== null ? num(m.rAvg, 2) : '–', recSub(m), statusChip(m.rAvg, T.recAvg, 'min', 'avg'), spark(ser((s) => s.m.rAvg), { target: T.recAvg }));
  h += kpiTile('Angriffseffizienz', eff(m.aEff), m.aKill + ' Kills / ' + m.aAtt + ' (' + pct(m.aKillP) + ')', statusChip(m.aEff, T.attEff, 'min', 'eff'), spark(ser((s) => s.m.aEff), { target: T.attEff }));
  h += kpiTile('Aufschlagfehler', pct(m.sErrP), m.sErr + ' Fehler · ' + m.sAce + ' Asse', statusChip(m.sErrP, T.srvErr, 'max'), spark(ser((s) => s.m.sErrP), { target: T.srvErr }));
  h += kpiTile('Blockpunkte', m.bPerSet !== null ? num(m.bPerSet) : '–', 'pro Satz · ' + m.bPts + ' gesamt' + (m.setsB < sets ? ' · nur Sätze mit Blockwerten (' + m.setsB + ')' : ''), m.bPerSet !== null ? statusChip(m.bPerSet, T.blk, 'min', 'num') : '', spark(ser((s) => s.m.bPerSet), { target: T.blk }));
  if (r) h += kpiTile('Geschenkte Punkte', pct(r.ownErrShare), r.ownErr + ' von ' + r.ptsTSum + ' Gegnerpunkten durch eigene Fehler', '', spark(ser((s) => s.r && s.r.ownErrShare)));
  return h;
}
function pointSourcesHtml(r) {
  const u = r.ptsU, t = r.ptsT;
  const partsU = [['Asse', u.ace, 'p1'], ['Kill nach Annahme', u.killSo, 'p2'], ['Kill im Konter', u.killTr, 'p3'], ['Block', u.block, 'p4'], ['Gegnerfehler', u.oppErr, 'p5'], ['ohne Zuordnung', u.other, 'p6']];
  const given = [['Aufschlagfehler', t.srvErr, 'q1'], ['Angriffsfehler', t.attErr, 'q2'], ['Blockfehler', t.blkErr, 'q3'], ['Netz, Linie, Ball', t.fault, 'q4']];
  const earned = [['Gegner gepunktet', t.oppPt, 'q5'], ['Ass gegen uns', t.recErr, 'q6'], ['Geblockt', t.attBlk, 'q7'], ['Abwehrfehler', t.digErr, 'q8'], ['ohne Zuordnung', t.other, 'q9']];
  const segs = (parts, tot) => parts.filter((p) => p[1] > 0).map((p) => '<span class="' + p[2] + '" style="flex:' + p[1] + '" title="' + esc(p[0] + ': ' + p[1] + ' (' + pct(p[1] / tot) + ')') + '">' + (p[1] / tot >= 0.12 ? Math.round(p[1] / tot * 100) + '%' : '') + '</span>').join('');
  const leg = (parts) => parts.filter((p) => p[1] > 0).map((p) => '<span><i class="sw ' + p[2] + '"></i>' + esc(p[0]) + ' <b>' + p[1] + '</b></span>').join('');
  const totU = r.ptsUSum || 1, totT = r.ptsTSum || 1;
  return '<div class="ps"><div class="ps-h"><b>Unsere Punkte</b><span>' + r.ptsUSum + '</span></div><div class="seg tall">' + segs(partsU, totU) + '</div><div class="legend">' + leg(partsU) + '</div></div>' +
    '<div class="ps"><div class="ps-h"><b>Punkte des Gegners</b><span>' + r.ptsTSum + '</span></div><div class="seg tall">' + segs(given.concat(earned), totT) + '</div>' +
    '<div class="legend"><span class="lg-h">Geschenkt ' + pct(r.ownErr / totT) + ':</span>' + leg(given) + '</div><div class="legend"><span class="lg-h">Vom Gegner erarbeitet:</span>' + leg(earned) + '</div></div>';
}
function rotationHtml(r) {
  const bar = (v, n) => n ? '<div class="hb"><span class="hb-t"><span style="width:' + Math.round((v || 0) * 100) + '%"></span></span><em>' + pct(v) + ' <small>' + n + '</small></em></div>' : '<span class="muted">–</span>';
  const anyRot = [1, 2, 3, 4, 5, 6].some((i) => r.rot[i].recvR + r.rot[i].srvR > 0);
  if (!anyRot) return '<p class="muted">Für Rotationen beim Satzstart die Aufstellung mit Zuspieler eintragen.</p>';
  let worst = null; [1, 2, 3, 4, 5, 6].forEach((i) => { const b = r.rot[i]; if (b.recvR >= 8 && (!worst || b.so < r.rot[worst].so)) worst = i; });
  return '<table class="tbl rot"><thead><tr><th>Läufer auf</th><th>Side-out</th><th>Break</th><th>+/−</th></tr></thead><tbody>' + [1, 6, 5, 4, 3, 2].map((i) => {
    const b = r.rot[i];
    return '<tr' + (i === worst ? ' class="flag"' : '') + '><th scope="row">' + C.POS[i - 1] + '</th><td>' + bar(b.so, b.recvR, 'us') + '</td><td>' + bar(b.bp, b.srvR, 'us') + '</td><td class="' + (b.pm > 0 ? 'c-us' : b.pm < 0 ? 'c-them' : '') + '">' + (b.pm > 0 ? '+' : '') + b.pm + '</td></tr>';
  }).join('') + '</tbody></table><p class="small muted">Kleine Zahl = Anzahl Ballwechsel.' + (worst ? ' Markiert: schwächste Side-out-Rotation.' : '') + '</p>';
}
function recChainHtml(r) {
  const rows = [['#', '3 – perfekt'], ['+', '2'], ['-', '1']].map(([k, l]) => {
    const q = r.recQ[k];
    return '<tr><th scope="row"><i class="sw ' + gradeCls('R', k) + '"></i>Annahme ' + l + '</th><td>' + q.n + '</td><td>' + pct(q.so) + '</td><td>' + pct(q.fbso) + '</td></tr>';
  }).join('');
  return '<table class="tbl"><thead><tr><th>Annahme</th><th>Anzahl</th><th>Side-out</th><th title="Ballwechsel mit dem ersten Angriff gewonnen">Erstangriff</th></tr></thead><tbody>' + rows + '</tbody></table>' +
    '<p class="small muted">Erstangriff-Punkt: Ballwechsel direkt mit dem ersten Angriff nach der Annahme gewonnen. Gesamt ' + pct(r.fbso) + '.</p>';
}
function attackSplitHtml(m, r) {
  let h = '<table class="tbl"><thead><tr><th>Situation</th><th>Angriffe</th><th>Kill %</th><th>Effizienz</th></tr></thead><tbody>' +
    '<tr><th scope="row">Nach Annahme</th><td>' + m.soAtt + '</td><td>' + pct(m.soKillP) + '</td><td>' + eff(m.soEff) + '</td></tr>' +
    '<tr><th scope="row">Konter / Transition</th><td>' + m.trAtt + '</td><td>' + pct(m.trKillP) + '</td><td>' + eff(m.trEff) + '</td></tr>';
  if (r) {
    const q = r.attRecQ;
    [['#', 'nach Annahme 3'], ['+', 'nach Annahme 2'], ['-', 'nach Annahme 1']].forEach(([k, l]) => {
      const o = q[k]; const n = C.sum(o);
      if (n) h += '<tr class="sub"><th scope="row">… ' + l + '</th><td>' + n + '</td><td>' + pct(o['#'] / n) + '</td><td>' + eff((o['#'] - o['='] - o['/']) / n) + '</td></tr>';
    });
  }
  h += '</tbody></table>';
  if (r) {
    const rows = Object.keys(C.APOS).map((k) => { const o = r.apos[k]; const n = C.sum(o); return n ? '<tr><th scope="row">' + esc(C.APOS[k]) + '</th><td>' + n + '</td><td>' + pct(o['#'] / n) + '</td><td>' + eff((o['#'] - o['='] - o['/']) / n) + '</td></tr>' : ''; }).join('');
    if (rows) h += '<table class="tbl"><thead><tr><th>Position</th><th>Angriffe</th><th>Kill %</th><th>Effizienz</th></tr></thead><tbody>' + rows + '</tbody></table><p class="small muted">Position aus Rolle und Aufstellung: Hinterfeld = Angriff aus Position I, V oder VI.</p>';
  }
  return h;
}
function crunchHtml(r) {
  return '<table class="tbl"><tbody>' +
    '<tr><th scope="row">Ab 20 Punkten (Tiebreak ab 10)</th><td>' + pct(r.crunch.win) + ' gewonnen <small class="muted">(' + r.crunch.w + '/' + r.crunch.n + ')</small></td></tr>' +
    '<tr><th scope="row">Sonst im Spiel</th><td>' + pct(r.win) + ' gewonnen</td></tr>' +
    '<tr><th scope="row">Serien ab 3 Punkten</th><td><span class="c-us">' + r.runsU + ' eigene</span> · <span class="c-them">' + r.runsT + ' Gegner</span></td></tr>' +
    '<tr><th scope="row">Längste Serie</th><td><span class="c-us">' + r.maxRunU + ':0</span> · <span class="c-them">0:' + r.maxRunT + '</span></td></tr>' +
    '<tr><th scope="row">Nach eigener Auszeit</th><td>' + (r.toU.n ? r.toU.w + ' von ' + r.toU.n + ' Ballwechseln gewonnen' : '–') + '</td></tr>' +
    '</tbody></table>';
}
function gameListHtml(games, compact) {
  if (!games.length) return '<p class="muted">Keine Spiele.</p>';
  return '<ul class="games' + (compact ? ' compact' : '') + '">' + games.map((g) => {
    const a = analysis(g); const m = C.metrics(a.team); const r = a.rk ? C.rkMetrics(a.rk) : null;
    const tag = g.status === 'live' ? '<span class="tag live">läuft</span>' : g.source === 'import' ? '<span class="tag">nachgetragen</span>' : '';
    return '<li><a href="#spiel-' + g.id + '" class="g-row"><span class="g-date">' + fmtDateShort(g.date) + '</span><span class="g-opp"><b>' + esc(g.opponent || '–') + '</b><small>' + esc([g.comp, g.home === true ? 'Heim' : g.home === false ? 'Auswärts' : ''].filter(Boolean).join(' · ')) + '</small></span>' +
      '<span class="g-sets">' + (a.noResult ? '<span class="muted">Ergebnis fehlt</span>' : a.sets.filter((s) => s.done).map((s) => '<span class="' + (s.w === 'u' ? 'won' : '') + '">' + s.u + ':' + s.t + '</span>').join('')) + '</span>' + resultPill(a) +
      '<span class="g-kpi small">' + (r ? 'SO ' + pct(r.so) + ' · ' : '') + 'Angr. ' + eff(m.aEff) + '</span>' + tag + '</a></li>';
  }).join('') + '</ul>';
}

/* ------------------------------------------------------------ Spiele */
VIEWS.spiele = function (view) {
  const games = filteredGames().slice().reverse();
  let h = '<div class="page-h"><h1>Spiele</h1><div class="row">' + (S.readOnly ? '' : '<a class="btn primary" href="#live">Spiel scouten</a><a class="btn" href="#daten" data-act="toimport">Spiel nachtragen</a>') + '</div></div>';
  if (statsGames().length) h += filterRow();
  h += games.length ? '<div class="card">' + gameListHtml(games) + '</div>' : emptyState('Noch keine Spiele', 'Scoute ein Spiel live oder trage ein vergangenes Spiel nach.');
  view.innerHTML = h;
};
ACT.toimport = () => { S.ui.dataTab = 'import'; go('daten'); };

VIEWS.spiel = function (view) {
  const g = gameById(S.id);
  if (!g) { view.innerHTML = emptyState('Spiel nicht gefunden', 'Vielleicht wurde es gelöscht.', '<a class="btn" href="#spiele">Zu den Spielen</a>'); return; }
  const a = analysis(g); const m = C.metrics(a.team); const r = a.rk ? C.rkMetrics(a.rk) : null;
  const T = targets();
  const tabs = [['ueberblick', 'Überblick']].concat(a.live && !g.minimal ? [['warum', 'Warum?']] : []).concat(a.live ? [['rotzonen', 'Rotation & Zonen']] : []).concat([['box', 'Boxscore']]).concat(a.live ? [['protokoll', 'Protokoll']] : []);
  if (!tabs.some((t) => t[0] === S.ui.gameTab)) S.ui.gameTab = 'ueberblick';
  const editable = !S.readOnly && !g.demo;
  let h = '<a href="#spiele" class="back">' + ICON.chev + ' Spiele</a><div class="page-h game-h"><div><h1>' + esc(g.opponent || 'Spiel') + ' ' + resultPill(a) + '</h1>' +
    '<p class="muted">' + fmtDate(g.date) + ' · ' + esc([g.comp, g.home === true ? 'Heim' : g.home === false ? 'Auswärts' : 'neutral'].filter(Boolean).join(' · ')) + (g.source === 'import' ? ' · nachgetragen' : '') + (g.status === 'live' ? ' · <b>läuft</b>' : '') + '</p>' +
    '<div class="setline">' + (a.noResult ? '<span class="muted small">' + (a.team.sets ? a.team.sets + ' Sätze · ' : '') + 'Ergebnis noch nicht eingetragen' + (editable ? ' – über „Bearbeiten“ nachtragen' : '') + '</span>' : a.sets.map((s) => '<span class="pill ' + (s.w === 'u' ? 'win' : s.w === 't' ? 'loss' : '') + '">' + s.u + ':' + s.t + (s.done ? '' : ' …') + '</span>').join('')) + '</div></div>' +
    '<div class="row">' + (editable && g.status === 'live' ? '<button class="btn primary" data-act="resume" data-id="' + g.id + '">Weiter scouten</button>' : '') +
    (editable ? '<button class="btn" data-act="gedit">Bearbeiten</button>' + (a.live ? (HOOK.gameButtons ? HOOK.gameButtons(g) : '') + '<button class="btn" data-act="gvideo">' + ICON.video + ' Video</button>' : '') : '') +
    (a.live ? '<a class="btn" href="#video-' + g.id + '">' + ICON.video + ' Videoanalyse</a>' : '') + '<button class="btn" data-act="gcsv">CSV</button>' + (editable ? '<button class="btn danger ghost" data-act="gdel">Löschen</button>' : '') + '</div></div>';
  h += '<nav class="subtabs" aria-label="Bereiche">' + tabs.map((t) => '<button class="' + (S.ui.gameTab === t[0] ? 'on' : '') + '" data-act="gtab" data-v="' + t[0] + '">' + t[1] + '</button>').join('') + '</nav>';
  const tab = S.ui.gameTab;
  if (tab === 'ueberblick') {
    const agg = C.aggregate([a]); const ins = C.insights(agg, T, pShort);
    if (editable && a.live) h += openListHtml(g, a, 'detail');
    const linked = a.live && HOOK.linkedHtml ? HOOK.linkedHtml([g]) : '';
    h += '<div class="dash">' + (HOOK.lineupsHtml ? HOOK.lineupsHtml(g) : '') + '<section class="card span2"><div class="card-h"><h2>Fokus aus diesem Spiel</h2></div>' + focusHtml(ins) + '</section>' + linked;
    h += '<section class="card span2"><' + (linked ? 'details><summary class="card-sum">Alle Kennzahlen gegen die Ziele</summary>' : 'div><div class="card-h"><h2>Kennzahlen</h2></div>') + '<div class="kpis">' +
      kpiTile('Side-out', r ? pct(r.so) : '–', r ? r.recvW + '/' + r.recvR : 'nur live', r ? statusChip(r.so, T.so, 'min') : '') +
      kpiTile('Break-Punkte', r ? pct(r.bp) : '–', r ? r.srvW + '/' + r.srvR : 'nur live', r ? statusChip(r.bp, T.bp, 'min') : '') +
      kpiTile('Annahme-Schnitt', m.rAvg !== null ? num(m.rAvg, 2) : '–', recSub(m), statusChip(m.rAvg, T.recAvg, 'min', 'avg')) +
      kpiTile('Angriffseffizienz', eff(m.aEff), m.aKill + '/' + m.aAtt + ' Kills', statusChip(m.aEff, T.attEff, 'min', 'eff')) +
      kpiTile('Aufschlag', m.sAce + ' Asse', m.sErr + ' Fehler (' + pct(m.sErrP) + ')', statusChip(m.sErrP, T.srvErr, 'max')) +
      kpiTile('Block', (a.tracked && a.tracked.B === false) ? '–' : m.bPts + ' Punkte', (a.tracked && a.tracked.B === false) ? 'auf dem Bogen nicht erfasst' : m.bTouch + ' Touches · ' + m.bErr + ' Fehler', '') + '</div></' + (linked ? 'details' : 'div') + '></section>';
    if (r) h += '<section class="card"><div class="card-h"><h2>Woher die Punkte kommen</h2></div>' + pointSourcesHtml(r) + '</section>';
    h += '<section class="card"><div class="card-h"><h2>Beste Werte</h2></div>' + topPlayersHtml(a) + '</section></div>';
  } else if (tab === 'warum') {
    h += HOOK.whyHtml ? HOOK.whyHtml([g]) : '';
  } else if (tab === 'box') {
    const bv = S.ui.boxView || 'box';
    h += '<div class="card"><nav class="subtabs inner" aria-label="Ansicht">' + [['box', 'Boxscore']].concat(STAT_VIEWS).map(([k, l]) => '<button class="' + (bv === k ? 'on' : '') + '" data-act="boxview" data-v="' + k + '">' + l + '</button>').join('') + '</nav>' +
      (bv === 'box' ? '<div class="tbl-wrap">' + boxscoreHtml(a, g) + '</div><p class="small muted">BP = Breakpunkte (eigene Punkte bei eigenem Aufschlag) · G-V = Punkte minus Fehler · Perf = Anteil Annahme 3 (perfekt) · Ø = Annahme-Schnitt · Blo = geblockt · Eff = (Kills − Fehler − geblockt) / Angriffe.</p>'
        : statTableHtml(playerRows(a.players), a.team, bv, { sortKey: 'sortG' })) + '</div>';
    if (Array.isArray(g.setTeam) && g.setTeam.length) h += '<div class="card mt"><div class="card-h"><h2>Team je Satz</h2><span class="muted small">laut Statistikbogen</span></div>' + setTeamHtml(g.setTeam) + '</div>';
  }
  if (tab === 'ueberblick' && a.live && a.sets.length) {
    h += '<h2 class="sec-h">Verlauf der Sätze</h2>';
    h += '<div class="dash">' + a.sets.map((s) => {
      const tl = a.tl[s.no] || [[0, 0]];
      const tos = []; let rallyCount = 0; let inSet = false;
      g.events.forEach((e, i) => { if (e.k === 'set') inSet = +e.s === s.no; if (!inSet) return; if (a.evInfo[i] && a.evInfo[i].w) rallyCount++; if (e.k === 'to') tos.push({ i: rallyCount, label: 'Auszeit ' + (e.w === 'u' ? 'wir' : 'Gegner') + ' bei ' + a.evInfo[i].after.join(':') }); });
      const runs = a.runs.filter((x) => x.set === s.no);
      return '<section class="card span2">' + chartFlow(tl, 'Satz ' + s.no + ' – ' + s.u + ':' + s.t, tos) +
        '<div class="legend"><span><i class="sw a-us"></i>Führung ' + esc(S.settings.teamName || 'wir') + '</span><span><i class="sw a-them"></i>Führung Gegner</span>' + (tos.length ? '<span><i class="sw tom"></i>Auszeit</span>' : '') + '</div>' +
        (runs.length ? '<p class="small">Serien: ' + runs.map((x) => '<span class="pill ' + (x.w === 'u' ? 'win' : 'loss') + '">' + (x.w === 'u' ? x.len + ':0' : '0:' + x.len) + ' ab ' + x.start.join(':') + (x.rot ? ', Läufer ' + C.POS[x.rot - 1] : '') + '</span>').join(' ') + '</p>' : '') + '</section>';
    }).join('') + '</div>';
  } else if (tab === 'rotzonen') {
    h += '<div class="dash"><section class="card"><div class="card-h"><h2>Rotationen</h2></div>' + rotationHtml(r) + '</section>' +
      '<section class="card"><div class="card-h"><h2>Annahme → Side-out</h2></div>' + recChainHtml(r) + '</section>' +
      '<section class="card"><div class="card-h"><h2>Angriff nach Situation</h2></div>' + attackSplitHtml(m, r) + '</section>' +
      '<section class="card"><div class="card-h"><h2>Aufschlag → Break</h2></div>' + serveChainHtml(r) + '</section>' +
      '<section class="card"><div class="card-h"><h2>Schlussphase & Serien</h2></div>' + crunchHtml(r) + '</section></div>';
  }
  if (tab === 'rotzonen') {
    h += '<h2 class="sec-h">Zonen</h2>';
    h += HOOK.zonesHtml ? HOOK.zonesHtml(g, a) : '';
  } else if (tab === 'protokoll') {
    h += '<div class="card">' + protocolHtml(g, a, editable) + '</div>';
  }
  view.innerHTML = h;
};
ACT.gtab = (t) => { S.ui.gameTab = t.dataset.v; render(); };
ACT.boxview = (t) => { S.ui.boxView = t.dataset.v; render(); };
function setTeamHtml(st) {
  const n = (v) => (v === undefined || v === null || v === '' ? '–' : v);
  const p100 = (a, b) => (b ? pct(a / b) : '–');
  const effS = (x) => (x && x.att ? eff(((+x.kill || 0) - (+x.err || 0) - (+x.blk || 0)) / x.att) : '–');
  const rows = st.map((x) => {
    const A = x.A || {}, R = x.R || {}, Sv = x.S || {};
    const hasQ = Sv.q1 !== undefined;
    return '<tr><th scope="row">Satz ' + (x.set || '?') + '</th>' +
      '<td>' + n(A.att) + '</td><td>' + n(A.kill) + '</td><td>' + n(A.err) + '</td><td>' + p100(+A.kill || 0, +A.att) + '</td><td>' + effS(A) + '</td>' +
      '<td class="sep">' + n(R.att) + '</td><td>' + n(R.err) + '</td><td>' + p100(+R.err || 0, +R.att) + '</td><td>' + (R.perf !== undefined ? p100(+R.perf, +R.att) : '–') + '</td><td>' + (R.avg !== undefined && R.avg !== '' ? num(+R.avg, 2) : '–') + '</td>' +
      '<td class="sep">' + n(Sv.att) + '</td><td>' + n(Sv.ace) + '</td><td>' + n(Sv.err) + '</td><td>' + (hasQ ? n(Sv.q3) + ' / ' + n(Sv.q2) + ' / ' + n(Sv.q1) : '–') + '</td></tr>';
  }).join('');
  return '<div class="tbl-wrap"><table class="tbl compact settbl"><thead><tr><th rowspan="2">Satz</th><th colspan="5">Angriff</th><th colspan="5" class="sep">Annahme</th><th colspan="4" class="sep">Aufschlag</th></tr>' +
    '<tr><th>Ges</th><th>Kill</th><th>Fhl</th><th>Kill %</th><th>Eff</th><th class="sep">Ges</th><th>Fhl</th><th>Fhl %</th><th>Perf %</th><th>Ø</th><th class="sep">Ges</th><th>Ass</th><th>Fhl</th><th>3 / 2 / 1</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}
function serveChainHtml(r) {
  return '<table class="tbl"><thead><tr><th>Aufschlag</th><th>Anzahl</th><th>Ballwechsel gewonnen</th></tr></thead><tbody>' +
    [['#', 'Ass'], ['+', '3 – Druck'], ['0', '2'], ['-', '1 – leicht'], ['=', 'Fehler']].map(([k, l]) => { const q = r.srvQ[k]; return q && q.n ? '<tr><th scope="row"><i class="sw ' + gradeCls('S', k) + '"></i>' + l + '</th><td>' + q.n + '</td><td>' + pct(q.bp) + '</td></tr>' : ''; }).join('') +
    '</tbody></table><p class="small muted">Zeigt, ob Aufschlagdruck zu Break-Punkten führt.</p>';
}
function topPlayersHtml(a) {
  const pm = Object.entries(a.players).map(([pid, c]) => [pid, C.metrics(c)]);
  const best = (fn, filter) => pm.filter(([, x]) => filter(x)).sort((x, y) => fn(y[1]) - fn(x[1]))[0];
  const items = [];
  const gv = best((x) => x.gv, (x) => x.pts + x.err > 0); if (gv) items.push(['Bestes G-V', gv[0], (gv[1].gv > 0 ? '+' : '') + gv[1].gv + ' (' + gv[1].pts + ' Punkte)']);
  const pts = best((x) => x.pts, (x) => x.pts > 0); if (pts) items.push(['Meiste Punkte', pts[0], pts[1].pts + ' Punkte']);
  const att = best((x) => x.aEff, (x) => x.aAtt >= 8); if (att) items.push(['Bester Angriff', att[0], eff(att[1].aEff) + ' (' + att[1].aKill + '/' + att[1].aAtt + ')']);
  const rec = best((x) => x.rAvg, (x) => x.rAtt >= 8 && x.rAvg !== null); if (rec) items.push(['Beste Annahme', rec[0], 'Ø ' + num(rec[1].rAvg, 2) + (rec[1].r3P !== null ? ', ' + pct(rec[1].r3P) + ' perfekt' : '') + ' (' + rec[1].rAtt + ')']);
  const srv = best((x) => x.sAce * 2 - x.sErr, (x) => x.sAtt >= 5); if (srv) items.push(['Bester Aufschlag', srv[0], srv[1].sAce + ' Asse, ' + srv[1].sErr + ' Fehler']);
  const blk = best((x) => x.bPts, (x) => x.bPts > 0); if (blk) items.push(['Meiste Blocks', blk[0], blk[1].bPts + ' Blockpunkte']);
  if (!items.length) return '<p class="muted">Noch keine Daten.</p>';
  return '<ul class="tops">' + items.map((x) => '<li><span class="muted">' + x[0] + '</span><a href="#spieler-' + x[1] + '"><b>' + esc(pLabel(x[1])) + '</b></a><span>' + esc(x[2]) + '</span></li>').join('') + '</ul>';
}
function boxRows(players) {
  return Object.entries(players).map(([pid, c]) => [pid, C.metrics(c)]).filter(([, x]) => x.sets || x.pts || x.err || x.sAtt || x.rAtt || x.aAtt || x.dAtt || x.bTouch)
    .sort((x, y) => (+(player(x[0]) || {}).num || 999) - (+(player(y[0]) || {}).num || 999));
}
function boxscoreHtml(a) {
  const rows = boxRows(a.players); const t = C.metrics(a.team);
  const cells = (x) => [x.sets || '', x.pts, x.bp, signed(x.gv), x.sAtt, x.sErr, x.sAce, x.rAtt, x.rErr, pct(x.r3P), num(x.rAvg, 2), x.aAtt, x.aErr, x.aBlk, x.aKill, pct(x.aKillP), eff(x.aEff), x.bPts, x.dAtt, x.dErr, x.fTot];
  const tr = (label, x, cls, href) => '<tr class="' + (cls || '') + '"><th scope="row" class="stick">' + (href ? '<a href="' + href + '">' + label + '</a>' : label) + '</th>' + cells(x).map((v) => '<td>' + v + '</td>').join('') + '</tr>';
  return '<table class="tbl box"><thead><tr><th rowspan="2" class="stick">Spieler</th><th rowspan="2">Sätze</th><th colspan="3">Punkte</th><th colspan="3">Aufschlag</th><th colspan="4">Annahme</th><th colspan="6">Angriff</th><th>Block</th><th colspan="2">Abwehr</th><th>Fehler</th></tr>' +
    '<tr><th>Ges</th><th>BP</th><th>G-V</th><th>Ges</th><th>Fhl</th><th>Pkt</th><th>Ges</th><th>Fhl</th><th title="Anteil perfekter Annahmen (3)">Perf</th><th title="Schnitt 3/2/1, Fehler 0">Ø</th><th>Ges</th><th>Fhl</th><th>Blo</th><th>Pkt</th><th>Pkt%</th><th>Eff</th><th>Pkt</th><th>Ges</th><th>Fhl</th><th>sonst.</th></tr></thead><tbody>' +
    rows.map(([pid, x]) => tr(esc(pLabel(pid)), x, '', isDemo() || player(pid) ? '#spieler-' + pid : null)).join('') +
    tr('Team', Object.assign({}, t, { sets: a.noResult ? a.team.sets : a.sets.filter((s) => s.done).length }), 'total') + '</tbody></table>';
}
function signed(v) { return v > 0 ? '+' + v : v < 0 ? '−' + Math.abs(v) : '0'; }
function protocolHtml(g, a, editable) {
  const hasVideo = C.videoSynced(g);
  let set = 0; let h = '';
  if (g.video && g.video.url && !hasVideo) h += '<p class="warn small">Video verknüpft, aber noch nicht synchronisiert – über „Video“ einen Zeitpunkt festlegen.</p>';
  if (a.warnings && a.warnings.length) h += '<p class="warn small">Hinweis: ' + esc(a.warnings.slice(0, 3).map((w) => w.msg).join(' · ')) + '</p>';
  h += '<ol class="log full">';
  g.events.forEach((e, i) => {
    const inf = a.evInfo[i] || {};
    if (e.k === 'set') { set = e.s; h += '</ol><h3>Satz ' + set + '</h3><ol class="log full">'; return; }
    const link = hasVideo && g.video && (e.k === 'a' || e.k === 'opp' || e.k === 'pt') ? C.videoLink(g.video, C.videoSec(g, e)) : null;
    const jump = !link && g.videoFile && e.v !== undefined ? '<button class="vlink link" data-act="vjump" data-gid="' + g.id + '" data-sec="' + Math.max(0, e.v - 4) + '">' + ICON.video + ' ' + C.hms(e.v) + '</button>' : '';
    h += '<li class="' + (inf.w === 'u' ? 'wu' : inf.w === 't' ? 'wt' : '') + (inf.valid === false ? ' invalid' : '') + '"><span class="sc">' + (inf.after ? inf.after.join(':') : '') + '</span><span class="d"><code class="evc-code">' + esc(evCode(e)) + '</code>' + esc(describeEvent(e)) + (inf.phase === 'tr' ? ' <small class="muted">Konter</small>' : '') + '</span>' +
      (link ? '<a class="vlink" href="' + esc(link) + '" target="_blank" rel="noopener">' + ICON.video + ' ' + C.hms(C.videoSec(g, e)) + '</a>' : jump) +
      (editable && e.k === 'a' ? '<button class="icon-btn small" data-act="evedit" data-i="' + i + '" aria-label="Bearbeiten">' + ICON.edit + '</button>' : '') +
      (editable && e.k !== 'set' && !(e.k === 'end' && g.status === 'done') ? '<button class="icon-btn small" data-act="evdel" data-i="' + i + '" aria-label="Löschen">' + ICON.trash + '</button>' : '') + '</li>';
  });
  return h + '</ol>';
}
ACT.gdel = async () => {
  const g = gameById(S.id); if (!g) return;
  if (await confirmBox('Spiel löschen?', 'Das Spiel gegen ' + g.opponent + ' (' + fmtDate(g.date) + ') und alle Statistiken daraus werden gelöscht.', 'Löschen', true)) {
    if (S.live.gameId === g.id) S.live.gameId = null;
    Store.deleteGame(g.id); go('spiele');
  }
};
ACT.gcsv = () => { const g = gameById(S.id); if (!g) return; const a = analysis(g); offerFile('boxscore-' + (g.date || '') + '-' + slug(g.opponent) + '.csv', csvFromPlayers(a.players, a.team)); };
ACT.gvideo = () => { const g = gameById(S.id); if (g) openVideoModal(g); };
ACT.gedit = () => {
  const g = gameById(S.id); if (!g) return;
  const isImp = g.source === 'import';
  const m = modal({ title: 'Spiel bearbeiten', html: '<div class="grid2"><label>Gegner<input id="geOpp" value="' + esc(g.opponent) + '"></label><label>Datum<input id="geDate" type="date" value="' + esc(g.date) + '"></label>' +
    '<label>Wettbewerb' + selectHtml('geComp', COMP.map((c) => [c, c]), g.comp) + '</label><label>Ort' + selectHtml('geHome', [['1', 'Heim'], ['0', 'Auswärts'], ['', 'neutral']], g.home === true ? '1' : g.home === false ? '0' : '') + '</label>' +
    '<label>Saison<input id="geSeason" value="' + esc(seasonOfGame(g)) + '"></label></div>' +
    (isImp ? '<fieldset><legend>Satzergebnisse (wir : Gegner) – ' + esc((C.FORMATS[gameFormat(g).mode] || {}).label || '') + '</legend>' + SET_IN('ge', g.sets) +
      '<label class="nsets small">Sätze gespielt, falls Ergebnis unbekannt <input id="geN" type="text" inputmode="numeric" data-num="int" maxlength="1" value="' + esc(g.nSets || '') + '"></label>' +
      '<label class="nsets small">Modus ' + selectHtml('geMode', Object.entries(C.FORMATS).map(([k, v]) => [k, v.label]), gameFormat(g).mode) + '</label></fieldset>' +
      '<p class="small"><button type="button" class="link" data-act="impedit" data-id="' + g.id + '">Spielerstatistiken bearbeiten</button></p>' : '') +
    '<label>Notizen<textarea id="geNotes" rows="3">' + esc(g.notes || '') + '</textarea></label><div id="geErr"></div>',
    actions: [{ label: 'Abbrechen', kind: 'ghost' }, { label: 'Speichern', kind: 'primary', id: 'geSave', fn: (el) => {
      const errs = [];
      const opp = $('#geOpp', el).value.trim(); if (!opp) errs.push('Gegner eintragen.');
      const dv = $('#geDate', el).value; if (!/^\d{4}-\d{2}-\d{2}$/.test(dv)) errs.push('Bitte ein gültiges Datum eintragen.');
      const season = $('#geSeason', el).value.trim(); if (season && !validSeason(season)) errs.push('Saison bitte als „2026/27“ eintragen.');
      let sets = null, nS = null, fmt = null;
      if (isImp) {
        fmt = Object.assign(gameFormat(g), { mode: $('#geMode', el).value });
        const raw = readSets('ge', el); const sErr = C.validateSets(raw, fmt); markSets('ge', el, sErr); errs.push(...sErr);
        sets = filledSets(raw); nS = $('#geN', el).value.trim();
        if (!sets.length) errs.push(...C.validateNSets(nS, fmt));
        if (!sErr.length) {
          errs.push(...C.validateTotals(g.box, sets));
          const n = sets.length || +nS || 0;
          if (n) for (const pid in g.box || {}) C.validateBox(g.box[pid], { sets: n }).filter((x) => x.f === 'sets').forEach((x) => errs.push(pLabel(pid) + ': ' + x.msg));
        }
      }
      $('#geErr', el).innerHTML = errsHtml(errs, 'Bitte korrigieren:');
      if (errs.length) return false;
      g.opponent = opp; g.date = dv; g.comp = $('#geComp', el).value;
      const hv = $('#geHome', el).value; g.home = hv === '' ? null : hv === '1'; g.season = $('#geSeason', el).value.trim() || seasonOf(g.date); g.notes = $('#geNotes', el).value;
      if (isImp) {
        g.sets = sets; g.format = fmt;
        if (!sets.length && nS !== '') g.nSets = +nS; else delete g.nSets;
      }
      Store.saveGame(g, { now: true }); render();
    } }] });
  void m;
};
function openVideoModal(g) {
  const acts = g.events.map((e, i) => [e, i]).filter(([e]) => e.k === 'a' || e.k === 'opp' || e.k === 'pt').slice(0, 40);
  const a = analysis(g);
  const v = g.video || {};
  const anchorIdx = v.anchorC !== undefined ? acts.findIndex(([e]) => e.c === v.anchorC) : 0;
  const m = modal({ title: 'Video verknüpfen', wide: true, html: '<label>Video-Link (Twitch-VOD oder YouTube)<input id="vdUrl" value="' + esc(v.url || '') + '" placeholder="https://www.twitch.tv/videos/…" inputmode="url"></label>' +
    '<p class="small muted">Bei einem Twitch-Kanal-Link (live) gibt es keine Zeitstempel. Nach dem Stream den VOD-Link eintragen – Twitch löscht frühere Übertragungen je nach Konto nach 7 bis 60 Tagen, als Highlight gespeichert bleiben sie erhalten.</p>' +
    '<h3>Synchronisieren</h3><p class="small">Wähle eine Aktion und gib an, wann sie im Video passiert. Alle anderen Zeitpunkte rechnet das Tool daraus aus.</p>' +
    '<div class="grid2"><label>Aktion' + selectHtml('vdEv', acts.map(([e, i], k) => [k, 'Satz ' + (a.evInfo[i].set || '?') + ' · ' + (a.evInfo[i].before || [0, 0]).join(':') + ' · ' + describeEvent(e)]), Math.max(0, anchorIdx)) + '</label>' +
    '<label>Zeit im Video (h:mm:ss)<input id="vdTime" value="' + (v.anchorV !== undefined ? C.hms(v.anchorV) : '') + '" placeholder="0:12:30" inputmode="numeric"></label>' +
    '<label>Vorlauf in Sekunden (0–30)<input id="vdLead" type="text" inputmode="numeric" data-num="int" maxlength="2" value="' + (v.lead === undefined ? 5 : v.lead) + '"></label></div><div id="vdErr"></div>',
    actions: [{ label: 'Abbrechen', kind: 'ghost' }, { label: 'Speichern', kind: 'primary', fn: (el) => {
      const url = $('#vdUrl', el).value.trim();
      if (!url) { g.video = null; Store.saveGame(g, { now: true }); render(); return; }
      const lead = $('#vdLead', el).value.trim(); const tv = $('#vdTime', el).value.trim(); const errs = [];
      if (lead !== '' && +lead > 30) errs.push('Vorlauf höchstens 30 Sekunden.');
      if (tv && C.parseHms(tv) === null) errs.push('Zeit bitte als h:mm:ss oder mm:ss eintragen (z. B. 0:12:30).');
      if (!/^https?:\/\/[^\s\/]+\.[^\s]+$/i.test(/^https?:/i.test(url) ? url : 'https://' + url)) errs.push('Das ist kein gültiger Link.');
      $('#vdErr', el).innerHTML = errsHtml(errs, 'Bitte korrigieren:'); if (errs.length) return false;
      const nv = { url: /^https?:/i.test(url) ? url : 'https://' + url, lead: Math.max(0, +lead || 0) };
      const sec = C.parseHms(tv);
      const pick = acts[+$('#vdEv', el).value];
      if (sec !== null && $('#vdTime', el).value.trim() && pick && pick[0].c !== undefined) { nv.anchorC = pick[0].c; nv.anchorV = sec; }
      g.video = nv; Store.saveGame(g, { now: true }); toast(nv.anchorV !== undefined ? 'Video synchronisiert' : 'Video-Link gespeichert'); render();
    } }] });
  void m;
}

/* ------------------------------------------------------------ Spieler */
VIEWS.spieler = function (view) {
  if (S.id) return playerProfile(view, S.id);
  const showArch = !!S.ui.showArchived;
  const list = rosterList(true).filter((p) => showArch || p.active !== false);
  const games = filteredGames(); const an = games.map(analysis); const agg = C.aggregate(an);
  let h = '<div class="page-h"><h1>Kader</h1><div class="row">' + (S.readOnly ? '' : isDemo() ? '<button class="btn primary" data-act="kaderneu">Eigenen Kader anlegen</button>' : '<button class="btn primary" data-act="padd">' + ICON.plus + ' Spieler</button><button class="btn" data-act="bulkadd">Mehrere eintragen</button>' + (realPlayers().length ? '<button class="btn ghost" data-act="kaderneu">Neuer Kader</button>' : '')) + '</div></div>';
  if (!list.length) { view.innerHTML = h + emptyState('Noch kein Kader', 'Trage eure Spielerinnen und Spieler mit Rückennummer und Position ein. Danach kannst du direkt ein Spiel scouten.', '<div class="row center"><button class="btn primary" data-act="kaderneu">Kader anlegen</button></div>'); return; }
  if (statsGames().length) h += filterRow();
  const pv = S.ui.plView || 'kompakt';
  h += '<nav class="subtabs" aria-label="Ansicht">' + [['kompakt', 'Übersicht']].concat(STAT_VIEWS).map(([k, l]) => '<button class="' + (pv === k ? 'on' : '') + '" data-act="plview" data-v="' + k + '">' + l + '</button>').join('') + '</nav>';
  if (pv !== 'kompakt') {
    const ids = new Set(list.map((p) => p.id));
    const rows = playerRows(agg.players).filter((o) => ids.has(o.pid) || (isDemo() && !S.players[o.pid]));
    h += '<div class="card">' + statTableHtml(rows, agg.team, pv, { sortKey: 'sortV' }) + '<p class="small muted"><button class="link" data-act="togglearch">' + (showArch ? 'Archivierte ausblenden' : 'Archivierte anzeigen') + '</button></p></div>';
    view.innerHTML = h; return;
  }
  const sk = S.ui.sortP;
  const cols = [['num', 'Nr'], ['name', 'Name'], ['role', 'Pos'], ['games', 'Spiele'], ['sets', 'Sätze'], ['pts', 'Punkte'], ['ptsS', 'P/Satz'], ['gv', 'G-V'], ['sAce', 'Asse'], ['sErrP', 'Aufschl.-Fhl'], ['r3P', 'Ann. perfekt'], ['rAvg', 'Ann. Ø'], ['aEff', 'Angriff Eff'], ['aKillP', 'Kill %'], ['bPts', 'Block']];
  const rows = list.map((p) => { const c = agg.players[p.id]; const x = c ? C.metrics(c) : C.metrics(C.zc()); return { p, x, v: {
    num: hasNo(p) ? +p.num : 1000, name: p.name || '', role: p.role || '', games: x.games, sets: x.sets, pts: x.pts, ptsS: x.sets ? x.pts / x.sets : null, gv: x.gv, sAce: x.sAce, sErrP: x.sErrP, r3P: x.rGr >= 5 ? x.r3P : null, rAvg: x.rAtt >= 5 ? x.rAvg : null, aEff: x.aAtt >= 5 ? x.aEff : null, aKillP: x.aAtt >= 5 ? x.aKillP : null, bPts: x.bPts } }; });
  rows.sort((A, B) => { const a1 = A.v[sk.k], b1 = B.v[sk.k]; if (a1 === null || a1 === undefined) return 1; if (b1 === null || b1 === undefined) return -1; return (typeof a1 === 'string' ? a1.localeCompare(b1) : a1 - b1) * sk.d; });
  h += '<div class="card"><div class="tbl-wrap"><table class="tbl players"><thead><tr>' + cols.map(([k, l]) => '<th><button class="sort' + (sk.k === k ? ' on' : '') + '" data-act="psort" data-k="' + k + '">' + l + (sk.k === k ? (sk.d > 0 ? ' ▲' : ' ▼') : '') + '</button></th>').join('') + '</tr></thead><tbody>' +
    rows.map(({ p, x, v }) => '<tr class="' + (p.active === false ? 'arch' : '') + '"><td>' + esc(hasNo(p) ? p.num : '') + '</td><th scope="row" class="stick"><a href="#spieler-' + p.id + '">' + esc(p.name || pShort(p.id)) + '</a></th><td>' + esc(C.ROLES[p.role] || '') + '</td><td>' + x.games + '</td><td>' + x.sets + '</td><td>' + x.pts + '</td><td>' + num(v.ptsS) + '</td><td>' + signed(x.gv) + '</td><td>' + x.sAce + '</td><td>' + (x.sAtt ? pct(x.sErrP) : '–') + '</td><td>' + (v.r3P !== null ? pct(v.r3P) + ' <small>(' + x.rGr + ')</small>' : '–') + '</td><td>' + num(v.rAvg, 2) + '</td><td>' + (v.aEff !== null ? eff(v.aEff) + ' <small>(' + x.aAtt + ')</small>' : '–') + '</td><td>' + pct(v.aKillP) + '</td><td>' + x.bPts + '</td></tr>').join('') +
    '</tbody></table></div><p class="small muted">Prozentwerte ab 5 Aktionen. <button class="link" data-act="togglearch">' + (showArch ? 'Archivierte ausblenden' : 'Archivierte anzeigen') + '</button></p></div>';
  view.innerHTML = h;
};
ACT.plview = (t) => { S.ui.plView = t.dataset.v; render(); };
ACT.psort = (t) => { const k = t.dataset.k; const s = S.ui.sortP; if (s.k === k) s.d = -s.d; else { s.k = k; s.d = ['num', 'name', 'role', 'sErrP'].includes(k) ? 1 : -1; } render(); };
ACT.togglearch = () => { S.ui.showArchived = !S.ui.showArchived; render(); };
function playerProfile(view, pid) {
  const p = player(pid);
  if (!p) { view.innerHTML = emptyState('Spieler nicht gefunden', '', '<a class="btn" href="#spieler">Zum Kader</a>'); return; }
  const games = filteredGames(); const an = games.map(analysis); const agg = C.aggregate(an);
  const c = agg.players[pid] || C.zc(); const x = C.metrics(c); const tm = agg.m; const T = targets();
  const notes = C.playerNotes(x, tm, T);
  const per = an.map((a, i) => ({ g: games[i], c: a.players[pid] })).filter((o) => o.c);
  const editable = !S.readOnly && !isDemo();
  let h = '<a href="#spieler" class="back">' + ICON.chev + ' Spieler</a><div class="page-h game-h"><div><h1>' + (hasNo(p) ? '<span class="numbadge">' + esc(p.num) + '</span> ' : '') + esc(p.name || pShort(pid)) + '</h1><p class="muted">' + esc(C.ROLES[p.role] || 'ohne Position') + (p.active === false ? ' · archiviert' : '') + ' · ' + x.games + (x.games === 1 ? ' Spiel, ' : ' Spiele, ') + x.sets + (x.sets === 1 ? ' Satz' : ' Sätze') + '</p></div>' +
    '<div class="row">' + (HOOK.playerButtons ? HOOK.playerButtons(pid) : '') + (editable ? '<button class="btn" data-act="pedit" data-pid="' + pid + '">' + ICON.edit + ' Bearbeiten</button>' : '') + '</div></div>';
  if (statsGames().length) h += filterRow();
  if (!per.length) { view.innerHTML = h + emptyState('Noch keine Statistik', 'Sobald ' + esc(pShort(pid)) + ' in einem gescouteten oder nachgetragenen Spiel vorkommt, erscheinen hier die Werte.'); return; }
  const sets = Math.max(1, x.sets);
  const ser = (fn) => per.map((o) => { const mm = C.metrics(o.c); return fn(mm); });
  h += '<div class="dash"><section class="card span2"><div class="kpis">' +
    kpiTile('Punkte', x.pts + '', num(x.pts / sets) + ' pro Satz · G-V ' + signed(x.gv), '', spark(ser((mm) => mm.sets ? mm.pts / mm.sets : null))) +
    kpiTile('Angriffseffizienz', eff(x.aEff), x.aAtt + ' Angriffe · Team ' + eff(tm.aEff), x.aAtt >= 10 ? statusChip(x.aEff, T.attEff, 'min', 'eff') : '', spark(ser((mm) => mm.aAtt >= 3 ? mm.aEff : null), { target: T.attEff })) +
    kpiTile('Annahme-Schnitt', x.rAvg !== null ? num(x.rAvg, 2) : '–', recSub(x) + (tm.rAvg !== null ? ' · Team Ø ' + num(tm.rAvg, 2) : ''), x.rAtt >= 10 ? statusChip(x.rAvg, T.recAvg, 'min', 'avg') : '', spark(ser((mm) => mm.rAtt >= 3 ? mm.rAvg : null), { target: T.recAvg })) +
    kpiTile('Aufschlag', x.sAce + ' Asse', x.sErr + ' Fehler (' + pct(x.sErrP) + ') · ' + x.sAtt + ' Aufschläge', x.sAtt >= 10 ? statusChip(x.sErrP, T.srvErr, 'max') : '', spark(ser((mm) => mm.sAtt >= 3 ? mm.sErrP : null), { target: T.srvErr })) +
    kpiTile('Block', x.bPts + ' Punkte', (x.setsB ? num(x.bPts / x.setsB) + ' pro Satz · ' : '') + x.bTouch + ' Touches · ' + x.bErr + ' Fehler', '') +
    kpiTile('Aufschlagserien', x.srvR ? pct(x.srvWP) : '–', x.srvR ? x.srvW + ' von ' + x.srvR + ' Ballwechseln bei eigenem Aufschlag gewonnen' : 'nur mit Aufstellung', '') +
    '</div></section>';
  h += '<section class="card"><div class="card-h"><h2>Stärken</h2></div>' + (notes.strengths.length ? '<ul class="notes good">' + notes.strengths.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ul>' : '<p class="muted">Noch keine klaren Stärken – mehr Daten sammeln.</p>') + '</section>';
  h += '<section class="card"><div class="card-h"><h2>Baustellen</h2></div>' + (notes.work.length ? '<ul class="notes bad">' + notes.work.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ul>' : '<p class="muted">Keine auffälligen Schwächen.</p>') + '</section>';
  h += '<section class="card span2"><div class="card-h"><h2>Aktionen im Detail</h2></div><div class="skills">' + ['S', 'R', 'A', 'B', 'D'].map((sk) => {
    const n = C.sum(c[sk]); if (!n) return '';
    let extra = '';
    if (sk === 'A' && (C.sum(c.Aso) || C.sum(c.Atr))) extra = '<div class="sub-skill"><span>Nach Annahme</span>' + segBar('A', c.Aso) + '<span class="small">' + eff(x.soEff) + ' (' + x.soAtt + ')</span></div><div class="sub-skill"><span>Konter</span>' + segBar('A', c.Atr) + '<span class="small">' + eff(x.trEff) + ' (' + x.trAtt + ')</span></div>';
    return '<div class="skill"><div class="skill-h"><b>' + C.SKILL[sk].label + '</b><span class="muted small">' + n + ' Aktionen</span></div>' + segBar(sk, c[sk], true) + segLegend(sk, c[sk]) + extra + '</div>';
  }).join('') + (x.fTot ? '<p class="small">Sonstige Fehler: ' + x.fNet + '× Netz, ' + x.fLine + '× Übertritt, ' + x.fBall + '× Ballfehler, ' + x.fOth + '× sonstige</p>' : '') + '</div></section>';
  h += '<section class="card span2"><div class="card-h"><h2>Spiel für Spiel</h2></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Datum</th><th>Gegner</th><th>Sätze</th><th>Punkte</th><th>G-V</th><th>Aufschlag</th><th>Annahme</th><th>Angriff</th><th>Block</th></tr></thead><tbody>' +
    per.slice().reverse().map((o) => { const mm = C.metrics(o.c); return '<tr><td>' + fmtDateShort(o.g.date) + '</td><th scope="row"><a href="#spiel-' + o.g.id + '">' + esc(o.g.opponent) + '</a></th><td>' + mm.sets + '</td><td>' + mm.pts + '</td><td>' + signed(mm.gv) + '</td><td>' + mm.sAtt + ' · ' + mm.sAce + ' Ass · ' + mm.sErr + ' F</td><td>' + (mm.rAtt ? mm.rAtt + ' · Ø ' + num(mm.rAvg, 2) + (mm.r3P !== null ? ' · ' + pct(mm.r3P) + ' perfekt' : '') : '–') + '</td><td>' + (mm.aAtt ? mm.aKill + '/' + mm.aAtt + ' · ' + eff(mm.aEff) : '–') + '</td><td>' + mm.bPts + '</td></tr>'; }).join('') + '</tbody></table></div></section>';
  // Video-Szenen
  const scenes = [];
  games.forEach((g) => { if (!g.events) return; const synced = C.videoSynced(g); g.events.forEach((e) => { if (e.k !== 'a' || e.p !== pid) return; const l = synced && g.video ? C.videoLink(g.video, C.videoSec(g, e)) : null; if (l || (g.videoFile && e.v !== undefined)) scenes.push({ g, e, l }); }); });
  if (scenes.length) {
    const fsk = S.ui.sceneSk || 'all';
    const shown = scenes.filter((s) => fsk === 'all' || s.e.sk + s.e.g === fsk || s.e.sk === fsk).slice(-60).reverse();
    h += '<section class="card span2"><div class="card-h"><h2>Video-Szenen</h2>' + selectHtml('sceneSk', [['all', 'Alle Aktionen'], ['A', 'Angriff'], ['A#', 'Kills'], ['A=', 'Angriffsfehler'], ['A/', 'Geblockt'], ['R', 'Annahme'], ['R=', 'Annahmefehler'], ['R-', 'Schlechte Annahme'], ['S', 'Aufschlag'], ['S=', 'Aufschlagfehler'], ['B', 'Block'], ['D', 'Abwehr']], fsk, 'aria-label="Szenen filtern"') + '</div>' +
      '<ul class="scenes">' + shown.map((s) => '<li>' + (s.l ? '<a href="' + esc(s.l) + '" target="_blank" rel="noopener">' + ICON.video + ' ' + C.hms(C.videoSec(s.g, s.e)) + '</a>' : '<button class="vlink link" data-act="vjump" data-gid="' + s.g.id + '" data-sec="' + Math.max(0, s.e.v - 4) + '">' + ICON.video + ' ' + C.hms(s.e.v) + '</button>') + ' <span>' + esc(C.SKILL[s.e.sk].label + ' ' + C.GL[s.e.sk][s.e.g]) + '</span> <small class="muted">' + esc(s.g.opponent) + ', ' + fmtDateShort(s.g.date) + '</small></li>').join('') + '</ul></section>';
  }
  h += '</div>';
  view.innerHTML = h;
}
document.addEventListener('change', (e) => { if (e.target.id === 'sceneSk') { S.ui.sceneSk = e.target.value; render(); } });

/* ------------------------------------------------------------ Spieler anlegen/bearbeiten */
ACT.padd = () => openPlayer(null);
ACT.pedit = (t) => openPlayer(t.dataset.pid);
function openPlayer(pid) {
  if (isDemo() && pid) { toast('Beispielspieler können nicht bearbeitet werden.'); return; }
  const p = pid ? Object.assign({}, S.players[pid]) : { id: C.rid(8), num: '', name: '', short: '', role: '', aliases: [], active: true, createdAt: Date.now() };
  const hasStats = pid && realGames().some((g) => (g.events || []).some((e) => e.p === pid || e.in === pid || e.out === pid || (e.lu || []).includes(pid)) || (g.box && g.box[pid]));
  const m = modal({ title: pid ? 'Spieler bearbeiten' : 'Spieler hinzufügen', html: '<div class="grid2">' +
    '<label>Rückennummer<input id="ppNum" type="text" inputmode="numeric" data-num="int" maxlength="2" value="' + esc(hasNo(p) ? p.num : '') + '" placeholder="1–99, optional" autofocus></label>' +
    '<label>Position' + selectHtml('ppRole', roleOptions(), p.role) + '</label>' +
    '<label>Name<input id="ppName" value="' + esc(p.name) + '" placeholder="Vorname Nachname" autocomplete="off"></label>' +
    '<label>Rufname<input id="ppShort" value="' + esc(p.short || '') + '" placeholder="wie ihr ihn ansagt" autocomplete="off"></label></div>' +
    '<label>Weitere Namen für die Spracheingabe<input id="ppAli" value="' + esc((p.aliases || []).join(', ')) + '" placeholder="z. B. Maxi, Hubi"></label>' +
    '<label class="tg"><input type="checkbox" id="ppActive"' + (p.active !== false ? ' checked' : '') + '> aktiv im Kader</label><div id="ppErr"></div>',
    actions: (pid ? [{ label: 'Zusammenführen …', kind: 'ghost', fn: () => { setTimeout(() => openMerge(pid), 30); } }, { label: hasStats ? 'Archivieren' : 'Löschen', kind: 'danger ghost', fn: async () => {
      if (hasStats) { const q = Object.assign({}, S.players[pid], { active: false }); Store.savePlayer(q); toast('Archiviert – Statistiken bleiben erhalten.'); render(); return; }
      if (await confirmBox('Spieler löschen?', (p.name || pLabel(pid)) + ' wird aus dem Kader entfernt.', 'Löschen', true)) { Store.deletePlayer(pid); go('spieler'); }
    } }] : []).concat([{ label: 'Abbrechen', kind: 'ghost' }, { label: 'Speichern', kind: 'primary', id: 'ppSave', fn: (el) => {
      const n = $('#ppNum', el).value.trim(); const name = $('#ppName', el).value.trim();
      const errs = [];
      if (!name) errs.push('Name eintragen.');
      if (name.length > 40) errs.push('Name höchstens 40 Zeichen.');
      if (n !== '' && (+n < 1 || +n > 99)) errs.push('Rückennummern gehen von 1 bis 99.');
      const dup = n !== '' && $('#ppActive', el).checked && realPlayers().find((x) => x.id !== p.id && x.active !== false && hasNo(x) && String(x.num) === String(+n));
      if (dup) errs.push('Die Nr. ' + (+n) + ' hat schon ' + (dup.name || pShort(dup.id)) + ' – zwei aktive Spieler können nicht dieselbe Nummer tragen.');
      $('#ppErr', el).innerHTML = errsHtml(errs, 'Bitte korrigieren:'); if (errs.length) return false;
      p.num = n === '' ? '' : +n; p.name = name; p.short = $('#ppShort', el).value.trim() || name.split(' ')[0]; p.role = $('#ppRole', el).value;
      p.aliases = $('#ppAli', el).value.split(',').map((s) => s.trim()).filter(Boolean); p.active = $('#ppActive', el).checked; p.updatedAt = Date.now();
      Store.savePlayer(p); render();
    } }]) });
  void m;
}
/* Zwei Einträge derselben Person zusammenführen (z. B. erst ohne, später mit Nummer angelegt) */
function openMerge(src) {
  const others = rosterList(true).filter((x) => x.id !== src);
  if (!others.length) { toast('Kein anderer Spieler vorhanden.'); return; }
  const m = modal({ title: pLabel(src) + ' zusammenführen', html: '<p>Alle Aktionen, Aufstellungen und nachgetragenen Werte von <b>' + esc(pFull(src)) + '</b> werden auf den gewählten Spieler übertragen. Danach wird ' + esc(pShort(src)) + ' aus dem Kader gelöscht; der Name bleibt als weiterer Name für die Spracheingabe erhalten.</p>' +
    '<label>Übertragen auf' + selectHtml('mgDst', others.map((x) => [x.id, pLabel(x.id) + (x.name && x.name !== pShort(x.id) ? ' – ' + x.name : '')]), others[0].id) + '</label>',
    actions: [{ label: 'Abbrechen', kind: 'ghost' }, { label: 'Zusammenführen', kind: 'primary', id: 'mgOk', fn: (el) => { const dst = $('#mgDst', el).value; mergePlayers(src, dst).then((n) => { toast(n + (n === 1 ? ' Spiel' : ' Spiele') + ' angepasst – ' + pLabel(dst) + ' übernimmt alles.'); go('spieler', dst); }); } }] });
  void m;
}
function mergeBox(a, b) {
  const out = JSON.parse(JSON.stringify(a || {}));
  for (const sk of ['S', 'R', 'A', 'B', 'D', 'F']) {
    const x = (b || {})[sk]; if (!x) continue;
    const o = out[sk] || (out[sk] = {});
    for (const k in x) if (k !== 'avg' && x[k] !== '' && isFinite(+x[k])) o[k] = (+o[k] || 0) + (+x[k] || 0);
  }
  const ra = (a && a.R) || {}, rb = (b && b.R) || {};
  if (ra.avg !== undefined || rb.avg !== undefined) {
    const full = (r) => !(+r.att) || r.avg !== undefined || (+r.q1 || 0) + (+r.q2 || 0) + (+r.q3 || 0) + (+r.err || 0) === +r.att;
    const pts = (r) => (r.avg !== undefined ? +r.avg * (+r.att || 0) : 3 * (+r.q3 || 0) + 2 * (+r.q2 || 0) + (+r.q1 || 0));
    const att = (+ra.att || 0) + (+rb.att || 0);
    if (att && full(ra) && full(rb)) { out.R.avg = Math.round((pts(ra) + pts(rb)) / att * 100) / 100; delete out.R.q1; delete out.R.q2; delete out.R.q3; } else delete out.R.avg;
  }
  out.sets = Math.max(+(a || {}).sets || 0, +(b || {}).sets || 0);
  ['ast', 'bp'].forEach((k) => { const v = (+(a || {})[k] || 0) + (+(b || {})[k] || 0); if (v) out[k] = v; else delete out[k]; });
  return out;
}
async function mergePlayers(src, dst) {
  let n = 0;
  const swap = (x) => (x === src ? dst : x);
  for (const g of realGames()) {
    let changed = false;
    (g.events || []).forEach((e) => {
      ['p', 'in', 'out', 'zsp'].forEach((k) => { if (e[k] === src) { e[k] = dst; changed = true; } });
      ['lu', 'lib'].forEach((k) => { if (Array.isArray(e[k]) && e[k].includes(src)) { e[k] = e[k].map(swap); changed = true; } });
    });
    (g.inbox || []).forEach((it) => { if (it.p === src) { it.p = dst; changed = true; } });
    if (Array.isArray(g.roster) && g.roster.includes(src)) { g.roster = Array.from(new Set(g.roster.map(swap))); changed = true; }
    if (g.box && g.box[src]) { g.box[dst] = g.box[dst] ? mergeBox(g.box[dst], g.box[src]) : g.box[src]; delete g.box[src]; changed = true; }
    if (changed) { n++; Store.saveGame(g, { now: true }); await new Promise((r) => setTimeout(r, 120)); }
  }
  const sp = S.players[src] || {}; const dp = Object.assign({}, S.players[dst]);
  dp.aliases = Array.from(new Set((dp.aliases || []).concat(sp.aliases || [], [sp.short, sp.name].filter(Boolean)))).filter((x) => x && x !== dp.name && x !== dp.short);
  if (!dp.role && sp.role) dp.role = sp.role;
  dp.updatedAt = Date.now(); Store.savePlayer(dp);
  Store.deletePlayer(src);
  return n;
}
ACT.bulkadd = () => {
  const m = modal({ title: 'Kader eintragen', wide: true, html: '<p>Eine Zeile pro Person: <b>Nummer Name Position</b>. Nummer und Position sind optional (Außen, Mitte, Diagonal, Zuspiel, Libero).</p>' +
    '<textarea id="bulkTxt" rows="10" class="mono" placeholder="1 Jonas Weber Zuspiel\n7 Max Huber Außen\n12 Paul Wagner Mitte\n5 Elias Bauer Libero"></textarea><div id="bulkPrev" class="small"></div>',
    actions: [{ label: 'Abbrechen', kind: 'ghost' }, { label: 'Übernehmen', kind: 'primary', id: 'bulkSave', fn: (el) => {
      const rows = parseBulk($('#bulkTxt', el).value);
      if (!rows.length) { toast('Keine gültigen Zeilen gefunden.'); return false; }
      const errs = bulkErrors(rows); if (errs.length) { $('#bulkPrev', el).innerHTML = errsHtml(errs, 'Bitte korrigieren:'); return false; }
      rows.forEach((r) => { const ex = realPlayers().find((x) => x.active !== false && (r.num !== '' ? hasNo(x) && String(x.num) === String(r.num) : !hasNo(x) && C.norm(x.name) === C.norm(r.name))); const p = ex ? Object.assign({}, ex, { name: r.name, role: r.role || ex.role }) : { id: C.rid(8), num: r.num, name: r.name, short: r.name.split(' ')[0], role: r.role, aliases: [], active: true, createdAt: Date.now() }; Store.savePlayer(p); });
      toast(rows.length + ' Spieler gespeichert.'); S.ui.demoOff = false; render();
    } }] });
  $('#bulkTxt', m.el).addEventListener('input', (e) => { const rows = parseBulk(e.target.value); const errs = bulkErrors(rows); $('#bulkPrev', m.el).innerHTML = errs.length ? errsHtml(errs, 'Bitte korrigieren:') : esc(rows.map((r) => (r.num !== '' ? '#' + r.num + ' ' : '') + r.name + (r.role ? ' (' + C.ROLES[r.role] + ')' : '')).join(' · ')); });
};
function bulkErrors(rows) {
  const errs = []; const seen = {};
  rows.forEach((r) => {
    if (r.num !== '' && (r.num < 1 || r.num > 99)) errs.push(r.name + ': Rückennummern gehen von 1 bis 99.');
    if (r.num !== '') { if (seen[r.num]) errs.push('Nr. ' + r.num + ' steht zweimal in der Liste (' + seen[r.num] + ', ' + r.name + ').'); else seen[r.num] = r.name; }
  });
  return errs;
}
function parseBulk(txt) {
  const roleWords = { aa: 'AA', aussen: 'AA', aussenangreifer: 'AA', mb: 'MB', mitte: 'MB', mittelblocker: 'MB', dia: 'DIA', diagonal: 'DIA', zsp: 'ZSP', zuspiel: 'ZSP', zuspieler: 'ZSP', zuspielerin: 'ZSP', lib: 'LIB', libero: 'LIB', uni: 'UNI', universal: 'UNI' };
  return String(txt || '').split(/\n+/).map((line) => {
    const parts = line.trim().split(/[\s;,\t]+/).filter(Boolean); if (!parts.length) return null;
    let num = ''; if (/^#?\d{1,2}$/.test(parts[0])) num = +parts.shift().replace('#', ''); else if (/^#?\d{1,2}$/.test(parts[parts.length - 1])) num = +parts.pop().replace('#', '');
    let role = '';
    const last = C.norm(parts[parts.length - 1] || '');
    if (roleWords[last]) { role = roleWords[last]; parts.pop(); }
    const name = parts.join(' ').trim(); if (!name) return null;
    return { num, name, role };
  }).filter(Boolean);
}

/* ------------------------------------------------------------ Daten: Nachtragen, Import, Export, Einstellungen */
VIEWS.daten = function (view) {
  const tab = S.ui.dataTab || 'import';
  const tabs = [['import', 'Spiel nachtragen'], ['export', 'Export & Backup'], ['settings', 'Einstellungen'], ['hilfe', 'Hilfe']];
  let h = '<div class="page-h"><h1>Daten</h1></div><nav class="subtabs">' + tabs.map((t) => '<button class="' + (tab === t[0] ? 'on' : '') + '" data-act="dtab" data-v="' + t[0] + '">' + t[1] + '</button>').join('') + '</nav>';
  if (tab === 'import') { h += importHtml(); setTimeout(() => { const f = $('#impForm'); if (f) markImport(f); }, 0); }
  else if (tab === 'export') h += exportHtml();
  else if (tab === 'settings') h += settingsHtml() + (HOOK.settingsExtra ? HOOK.settingsExtra() : '');
  else h += helpHtml();
  view.innerHTML = h;
};
ACT.dtab = (t) => { S.ui.dataTab = t.dataset.v; render(); };
ACT.tobackup = () => { S.ui.dataTab = 'export'; go('daten'); };
/* Felder der Nachtrage-Tabelle: [Feld, Kopf, Gruppe, Hinweis] */
const IMP_FIELDS = [
  ['sets', 'Sätze', ''],
  ['S.att', 'Ges', 'Aufschlag'], ['S.err', 'Fhl', 'Aufschlag'], ['S.ace', 'Ass', 'Aufschlag'], ['S.q3', '3', 'Aufschlag', 'Druck'], ['S.q2', '2', 'Aufschlag'], ['S.q1', '1', 'Aufschlag', 'leicht'],
  ['R.att', 'Ges', 'Annahme'], ['R.err', 'Fhl', 'Annahme'], ['R.q3', '3', 'Annahme', 'perfekt'], ['R.q2', '2', 'Annahme'], ['R.q1', '1', 'Annahme'], ['R.avg', 'Ø', 'Annahme', 'nur wenn 3/2/1 fehlen'],
  ['A.att', 'Ges', 'Angriff'], ['A.err', 'Fhl', 'Angriff'], ['A.blk', 'Blo', 'Angriff', 'geblockt'], ['A.kill', 'Kill', 'Angriff'],
  ['B.pts', 'Pkt', 'Block'], ['B.err', 'Fhl', 'Block'],
  ['D.att', 'Ges', 'Abwehr'], ['D.err', 'Fhl', 'Abwehr'],
  ['F.n', 'sonst. F', '', 'Netz, Übertritt, Ballfehler'], ['ast', 'Ast', '', 'Assists'], ['bp', 'BP', '', 'Breakpunkte'],
];
function boxGet(b, f) { if (!b) return ''; const [a, k] = f.split('.'); const v = k ? (b[a] || {})[k] : b[a]; return v === undefined || v === null ? '' : v; }
function importHtml() {
  if (S.readOnly) return '<p class="muted">Nur Ansicht.</p>';
  const roster = rosterList();
  if (!roster.length || isDemo()) return emptyState('Erst den Kader anlegen', 'Zum Nachtragen braucht das Tool eure Spieler.', '<div class="row center"><button class="btn primary" data-act="kaderneu">Kader anlegen</button></div>');
  const eg = S.ui.impEdit ? gameById(S.ui.impEdit) : null;
  const box = (eg && eg.box) || {};
  const ids = roster.map((p) => p.id); Object.keys(box).forEach((pid) => { if (pid !== '_team' && !ids.includes(pid) && player(pid)) ids.push(pid); });
  const inp = (pid, f) => { const v = boxGet(box[pid], f); return '<input type="text" class="n" data-imp="' + pid + ':' + f + '"' + (f === 'R.avg' ? ' inputmode="decimal" data-num="dec" maxlength="4" placeholder="0–3"' : ' inputmode="numeric" data-num="int" maxlength="3"') + ' value="' + esc(f === 'R.avg' && v !== '' ? String(v).replace('.', ',') : v) + '" aria-label="' + esc((pid === '_team' ? 'Team' : pLabel(pid)) + ' ' + (C.BOX_FIELDS[f] || f)) + '">'; };
  const groups = []; IMP_FIELDS.forEach(([, , g]) => { const last = groups[groups.length - 1]; if (last && last[0] === g && g) last[1]++; else groups.push([g, 1]); });
  const sets = (eg && eg.sets) || [];
  let h = '<form class="card form" id="impForm"' + (eg ? ' data-edit="' + eg.id + '"' : '') + '><h2>' + (eg ? 'Nachgetragenes Spiel bearbeiten' : 'Vergangenes Spiel nachtragen') + '</h2>' +
    '<p class="muted small">Für Spiele, die nicht live gescoutet wurden – z. B. von einem Statistikbogen. Leere Felder zählen nicht. Annahme und Aufschlag am besten mit 3/2/1 (3 = beste Stufe); wenn nur der Schnitt bekannt ist, „Ø“ eintragen.</p>' +
    '<div class="grid2"><label>Gegner<input id="imOpp" required autocomplete="off" value="' + esc(eg ? eg.opponent : '') + '"></label><label>Datum<input id="imDate" type="date" value="' + esc(eg ? eg.date : todayIso()) + '"></label>' +
    '<label>Wettbewerb' + selectHtml('imComp', COMP.map((c) => [c, c]), eg ? eg.comp : 'Liga') + '</label><label>Ort' + selectHtml('imHome', [['1', 'Heim'], ['0', 'Auswärts'], ['', 'neutral']], eg ? (eg.home === true ? '1' : eg.home === false ? '0' : '') : '1') + '</label></div>' +
    '<fieldset><legend>Satzergebnisse (wir : Gegner)</legend>' + SET_IN('im', sets, true) +
    '<label class="nsets small">Sätze gespielt, falls Ergebnis unbekannt <input id="imN" type="text" inputmode="numeric" data-num="int" maxlength="1" value="' + esc(eg && eg.nSets ? eg.nSets : '') + '"></label>' +
    '<label class="nsets small">Modus ' + selectHtml('imMode', Object.entries(C.FORMATS).map(([k, v]) => [k, v.label]), gameFormat(eg).mode) + '</label></fieldset>' +
    (eg ? '' : '<details class="csv"><summary>Aus CSV übernehmen</summary><p class="small">Spalten wie in der Vorlage, z. B. <code>' + esc(CSV_HEAD.split(';').slice(0, 9).join(';')) + ';…</code>. Prozentwerte (z. B. „45 %“) werden umgerechnet; alte Spalten Annahme_Pos/Annahme_Prf werden in 3/2/1 übersetzt.</p>' +
    '<textarea id="imCsv" rows="5" class="mono" placeholder="Nr;Name;Saetze;Aufschlag_Ges;…"></textarea><div class="row"><input type="file" id="imFile" accept=".csv,.txt,text/csv"><button type="button" class="btn" data-act="imcsv">In Tabelle übernehmen</button><button type="button" class="btn ghost" data-act="imtpl">Vorlage kopieren</button></div><div id="imCsvMsg" class="small"></div></details>') +
    '<div class="tbl-wrap"><table class="tbl imp"><thead><tr><th rowspan="2" class="stick">Spieler</th>' + groups.map(([g, n], gi) => {
      if (g) return '<th colspan="' + n + '" class="grp">' + g + '</th>';
      const start = groups.slice(0, gi).reduce((x, y) => x + y[1], 0);
      return IMP_FIELDS.slice(start, start + n).map(([, hd, , tip]) => '<th rowspan="2"' + (tip ? ' title="' + esc(tip) + '"' : '') + '>' + esc(hd) + '</th>').join('');
    }).join('') + '</tr>' +
    '<tr>' + IMP_FIELDS.filter(([, , g]) => g).map(([, hd, , tip]) => '<th' + (tip ? ' title="' + esc(tip) + '"' : '') + '>' + esc(hd) + '</th>').join('') + '</tr></thead><tbody>' +
    ids.map((pid) => '<tr data-pid="' + pid + '"><th scope="row" class="stick">' + esc(pLabel(pid)) + '</th>' + IMP_FIELDS.map(([f]) => '<td>' + inp(pid, f) + '</td>').join('') + '</tr>').join('') +
    '<tr data-pid="_team" class="sub"><th scope="row" class="stick" title="Aktionen, die keinem Spieler zugeordnet sind">Team (ohne Spieler)</th>' + IMP_FIELDS.map(([f]) => '<td>' + (/^[SRABD]\./.test(f) || f === 'F.n' ? inp('_team', f) : '') + '</td>').join('') + '</tr>' +
    '</tbody></table></div><p class="small muted">Gesamt leer lassen = wird aus den Teilen berechnet. Unmögliche Werte (z. B. mehr Kills als Angriffe, Satz 25:24) werden rot markiert und lassen sich nicht speichern.</p><div id="imMsg"></div>' +
    '<div class="row end">' + (eg ? '<button type="button" class="btn ghost" data-act="impcancel">Abbrechen</button>' : '') + '<button class="btn primary big" type="submit" id="imSave">' + (eg ? 'Änderungen speichern' : 'Spiel speichern') + '</button></div></form>';
  return h;
}
/** Zeile aus dem Formular lesen und mit dem gespeicherten Eintrag zusammenführen (unbekannte Felder bleiben erhalten). */
function formRow(tr, old) {
  const b = old ? JSON.parse(JSON.stringify(old)) : {};
  let any = false, hadForm = false;
  $$('[data-imp]', tr).forEach((el) => {
    const f = el.dataset.imp.split(':')[1]; const [a, k] = f.split('.');
    if (boxGet(old, f) !== '') hadForm = true;
    const v = el.value.trim();
    if (v === '') { if (k) { if (b[a]) delete b[a][k]; } else delete b[a]; return; }
    any = true; const n = f === 'R.avg' ? Math.round(+v.replace(',', '.') * 100) / 100 : +v;
    if (k) (b[a] || (b[a] = {}))[k] = n; else b[a] = n;
  });
  ['S', 'R', 'A', 'B', 'D', 'F'].forEach((a) => { if (b[a] && !Object.keys(b[a]).length) delete b[a]; });
  if (b.R && b.R.avg !== undefined && (b.R.q1 !== undefined || b.R.q2 !== undefined || b.R.q3 !== undefined)) delete b.R.avg;  // 3/2/1 gehen vor
  return { b, any, hadForm };
}
function checkImport(form) {
  const eg = form.dataset.edit ? gameById(form.dataset.edit) : null; const oldBox = (eg && eg.box) || {};
  const fmt = Object.assign(gameFormat(eg), { mode: ($('#imMode', form) || {}).value || gameFormat(eg).mode });
  const raw = readSets('im', form); const setErr = C.validateSets(raw, fmt); const sets = filledSets(raw);
  const nS = ($('#imN', form) || {}).value || '';
  const nErr = sets.length ? [] : C.validateNSets(nS.trim(), fmt);
  const nSets = sets.length || +nS || 0;
  const rows = {}, rowErr = {}, box = {};
  Object.keys(oldBox).forEach((pid) => { if (!form.querySelector('tr[data-pid="' + pid + '"]')) box[pid] = oldBox[pid]; });
  $$('tr[data-pid]', form).forEach((tr) => {
    const pid = tr.dataset.pid; const old = oldBox[pid]; const r = formRow(tr, old); rows[pid] = r;
    if (!r.any) { if (old && !r.hadForm) box[pid] = old; return; }
    const e = C.validateBox(r.b, { sets: nSets || null }); if (e.length) rowErr[pid] = e;
    box[pid] = C.fullBox(r.b);
  });
  const totErr = setErr.length ? [] : C.validateTotals(box, sets);
  const list = [].concat(setErr, nErr, ...Object.entries(rowErr).map(([pid, es]) => es.map((x) => (pid === '_team' ? 'Team' : pLabel(pid)) + ': ' + x.msg)), totErr);
  return { eg, fmt, sets, nS: nS.trim(), box, rowErr, setErr, list, ok: !list.length };
}
function markImport(form) {
  const r = checkImport(form);
  $$('[data-imp]', form).forEach((el) => { el.classList.remove('bad'); el.removeAttribute('title'); el.removeAttribute('aria-invalid'); });
  $$('tr[data-pid]', form).forEach((tr) => tr.classList.remove('bad'));
  for (const pid in r.rowErr) {
    const tr = form.querySelector('tr[data-pid="' + pid + '"]'); if (tr) tr.classList.add('bad');
    r.rowErr[pid].forEach((x) => { const el = form.querySelector('[data-imp="' + pid + ':' + x.f + '"]'); if (el) { el.classList.add('bad'); el.title = x.msg; el.setAttribute('aria-invalid', 'true'); } });
  }
  markSets('im', form, r.setErr);
  const n = $('#imN', form); if (n) n.classList.toggle('bad', !r.sets.length && r.list.some((m) => m.indexOf('Gespielte Sätze') === 0));
  const box = $('#imMsg', form); if (box) box.innerHTML = errsHtml(r.list);
  return r;
}
let impTimer = null;
['input', 'change'].forEach((ev) => document.addEventListener(ev, (e) => {
  const f = e.target && e.target.closest && e.target.closest('#impForm'); if (!f) return;
  clearTimeout(impTimer); impTimer = setTimeout(() => markImport(f), 120);
}));
ACT.impedit = (t) => { S.ui.impEdit = t.dataset.id; S.ui.dataTab = 'import'; clearFormMemo(); closeAllModals(); go('daten'); };
ACT.impcancel = () => { const id = S.ui.impEdit; S.ui.impEdit = null; clearFormMemo(); if (id) go('spiel', id); else render(); };
const CSV_HEAD = 'Nr;Name;Saetze;Aufschlag_Ges;Aufschlag_Fhl;Aufschlag_Ass;Aufschlag_3;Aufschlag_2;Aufschlag_1;Annahme_Ges;Annahme_Fhl;Annahme_3;Annahme_2;Annahme_1;Annahme_Schnitt;Angriff_Ges;Angriff_Fhl;Angriff_Blo;Angriff_Pkt;Block_Pkt;Block_Fhl;Abwehr_Ges;Abwehr_Fhl;Fehler_sonst;Assists;BP';
ACT.imtpl = async () => { const cols = CSV_HEAD.split(';').length; const txt = CSV_HEAD + '\n' + rosterList().map((p) => (hasNo(p) ? p.num : '') + ';' + (p.name || '') + ';'.repeat(cols - 2)).join('\n'); try { await navigator.clipboard.writeText(txt); toast('Vorlage kopiert'); } catch (e) { showCopy('vorlage.csv', txt); } };
document.addEventListener('change', async (e) => {
  if (e.target.id !== 'imFile' || !e.target.files || !e.target.files[0]) return;
  try { $('#imCsv').value = await e.target.files[0].text(); ACT.imcsv(); } catch (err) { toast('Datei konnte nicht gelesen werden.', { kind: 'error' }); }
});
const CSV_MAP = [
  [/^(nr|nummer|trikot|no|rueckennummer)$/, 'num'], [/^(name|spieler|spielerin)$/, 'name'], [/^(saetze|satz|sets|s)$/, 'sets'],
  [/^(aufschlagges|aufschlag|aufschlaege|aufschlaggesamt|servicegesamt)$/, 'S.att'], [/^(aufschlagfhl|aufschlagfehler|aufschlagf)$/, 'S.err'], [/^(aufschlagass|aufschlagpkt|asse|ass|aufschlagpunkte)$/, 'S.ace'],
  [/^(aufschlag3|aufschlagdruck|3srv)$/, 'S.q3'], [/^(aufschlag2|2srv)$/, 'S.q2'], [/^(aufschlag1|1srv)$/, 'S.q1'],
  [/^(annahmeges|annahme|annahmen|annahmegesamt)$/, 'R.att'], [/^(annahmefhl|annahmefehler|annahmef)$/, 'R.err'],
  [/^(annahme3|3pass)$/, 'R.q3'], [/^(annahme2|2pass)$/, 'R.q2'], [/^(annahme1|1pass)$/, 'R.q1'], [/^(annahmeschnitt|annahmenote|annahmedurchschnitt|passrating)$/, 'R.avg'],
  [/^(annahmepos|annahmepositiv|positiv|annahmepos%)$/, 'R.pos'], [/^(annahmeprf|annahmeperfekt|perfekt|annahmeprf%)$/, 'R.perf'],
  [/^(angriffges|angriff|angriffe|angriffgesamt)$/, 'A.att'], [/^(angrifffhl|angriffsfehler|angrifff|angriffsfhl)$/, 'A.err'], [/^(angriffblo|geblockt|angriffgeblockt|angriffsblo)$/, 'A.blk'], [/^(angriffpkt|angriffkill|kills|kill|angriffspunkte|angriffpunkte)$/, 'A.kill'],
  [/^(blockpkt|block|blockpunkte|bloecke)$/, 'B.pts'], [/^(blockfhl|blockfehler)$/, 'B.err'],
  [/^(abwehrges|abwehr|digs|abwehraktionen)$/, 'D.att'], [/^(abwehrfhl|abwehrfehler|digerr)$/, 'D.err'],
  [/^(fehlersonst|sonstigefehler|faults)$/, 'F.n'], [/^(assists|ast|zuspielassists)$/, 'ast'], [/^(bp|breakpoints|breakpunkte)$/, 'bp'],
];
ACT.imcsv = () => {
  const txt = ($('#imCsv') || {}).value || ''; const msg = $('#imCsvMsg');
  const lines = txt.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) { msg.textContent = 'Mindestens Kopfzeile und eine Datenzeile einfügen.'; return; }
  const delim = [';', '\t', ','].map((d) => [d, lines[0].split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const head = lines[0].split(delim).map((h) => C.norm(h).replace(/[^a-z0-9%]/g, ''));
  const keys = head.map((h) => { const hit = CSV_MAP.find(([re]) => re.test(h) || re.test(h.replace('%', ''))); return hit ? hit[1] : null; });
  if (!keys.includes('num') && !keys.includes('name')) { msg.textContent = 'Spalte „Nr“ oder „Name“ fehlt.'; return; }
  let filled = 0; const missing = [];
  lines.slice(1).forEach((line) => {
    const cells = line.split(delim).map((c) => c.trim());
    const rec = {}; keys.forEach((k, i) => { if (k) rec[k] = cells[i]; });
    const pl = rosterList(true).find((p) => rec.num !== undefined && rec.num !== '' && hasNo(p) && String(p.num) === String(+rec.num)) || (rec.name ? rosterList(true).find((p) => C.norm(p.name) === C.norm(rec.name) || C.norm(pShort(p.id)) === C.norm(rec.name)) : null);
    if (!pl) { if (rec.num || rec.name) missing.push((rec.num ? '#' + rec.num + ' ' : '') + (rec.name || '')); return; }
    const toNum = (v, base, dec) => { if (v === undefined || v === '') return ''; const s = String(v).replace(',', '.'); if (/%/.test(s)) { const pv = parseFloat(s); return base ? Math.round(pv / 100 * base) : ''; } const n = parseFloat(s); return isFinite(n) ? (dec ? Math.round(n * 100) / 100 : Math.round(n)) : ''; };
    const set = (f, v) => { const el = document.querySelector('[data-imp="' + pl.id + ':' + f + '"]'); if (el && v !== '') el.value = v; };
    const rAtt = toNum(rec['R.att']);
    ['sets', 'S.att', 'S.err', 'S.ace', 'S.q3', 'S.q2', 'S.q1', 'R.att', 'R.err', 'R.q3', 'R.q2', 'R.q1', 'A.att', 'A.err', 'A.blk', 'A.kill', 'B.pts', 'B.err', 'D.att', 'D.err', 'F.n', 'ast', 'bp'].forEach((f) => set(f, toNum(rec[f], f.startsWith('R.q') ? rAtt : 0)));
    set('R.avg', toNum(rec['R.avg'], 0, true));
    // alte Form: positiv/perfekt in 3/2/1 übersetzen
    if (rec['R.q3'] === undefined && (rec['R.pos'] !== undefined || rec['R.perf'] !== undefined) && rAtt !== '') {
      const perf = toNum(rec['R.perf'], rAtt) || 0, pos = toNum(rec['R.pos'], rAtt) || 0, err = toNum(rec['R.err']) || 0;
      set('R.q3', perf); set('R.q2', Math.max(0, pos - perf)); set('R.q1', Math.max(0, rAtt - Math.max(pos, perf) - err));
    }
    filled++;
  });
  msg.innerHTML = filled + ' Spieler übernommen.' + (missing.length ? ' <span class="warn">Nicht im Kader: ' + esc(missing.join(', ')) + ' – erst anlegen.</span>' : '');
};
document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'impForm') return;
  e.preventDefault();
  const form = e.target;
  const opp = $('#imOpp').value.trim(); if (!opp) { toast('Gegner eintragen.'); $('#imOpp').focus(); return; }
  const date = $('#imDate').value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { toast('Bitte ein gültiges Datum eintragen.'); return; }
  const r = markImport(form);
  if (!r.ok) {
    toast('Bitte die rot markierten Werte korrigieren – so etwas ist im Volleyball nicht möglich.', { kind: 'warn', ms: 6000 });
    const box = $('#imMsg', form); if (box && box.scrollIntoView) box.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return;
  }
  if (!r.sets.length && !Object.keys(r.box).length) { toast('Bitte Satzergebnisse oder Statistiken eintragen.'); return; }
  const eg = r.eg;
  const g = eg || { id: C.rid(10), source: 'import', status: 'done', createdAt: Date.now(), rev: 0 };
  Object.assign(g, { date, opponent: opp, comp: $('#imComp').value, home: $('#imHome').value === '' ? null : $('#imHome').value === '1', season: eg && eg.season ? eg.season : seasonOf(date), sets: r.sets, box: r.box, format: r.fmt });
  if (!r.sets.length && r.nS !== '') g.nSets = +r.nS; else delete g.nSets;
  S.games[g.id] = g; Store.saveGame(g, { now: true });
  S.ui.impEdit = null; clearFormMemo();
  toast(eg ? 'Änderungen gespeichert.' : 'Spiel gegen ' + opp + ' gespeichert.');
  go('spiel', g.id);
});
function exportHtml() {
  const n = realGames().length, p = realPlayers().length;
  return '<div class="dash"><section class="card"><h2>Backup</h2><p>Alle Daten (' + p + ' Spieler, ' + n + ' Spiele, Einstellungen) als JSON-Datei. Damit zieht ihr auf ein anderes Gerät um oder gebt die Spiele an den zweiten Scout weiter. Videos sind nicht enthalten.</p>' +
    '<div class="row"><button class="btn primary" data-act="expjson">Backup herunterladen</button></div>' +
    (S.readOnly ? '' : '<h3>Backup einspielen</h3><p class="small muted">Führt die Datei mit den vorhandenen Daten zusammen. Bei demselben Spiel gewinnt die zuletzt bearbeitete Fassung.</p><input type="file" id="impJson" accept=".json,application/json">') + '</section>' +
    '<section class="card"><h2>Saisonstatistik als CSV</h2><p>Spielerwerte der aktuell gefilterten Spiele für Excel oder Numbers (Semikolon-getrennt).</p>' + (statsGames().length ? filterRow() : '') +
    '<div class="row"><button class="btn" data-act="expcsv">CSV herunterladen</button></div></section>' +
    (S.mode === 'local' && !S.readOnly ? '<section class="card"><h2>Daten in diesem Browser</h2><p class="small">Die Daten liegen nur in diesem Browser. Vor dem Löschen am besten ein Backup herunterladen.</p><div class="row"><button class="btn" data-act="testdaten">Testdaten laden</button>' + (realGames().some((x) => x.test) ? '<button class="btn ghost" data-act="testweg">Testdaten entfernen</button>' : '') + '<button class="btn danger ghost" data-act="localwipe">Alle Daten in diesem Browser löschen</button></div><p class="small muted">Testdaten: der Beispielkader mit seinen gescouteten Spielen, den du ändern und löschen kannst. Ein Video ist nicht dabei.</p></section>' : '') + '</div>';
}
ACT.localwipe = async () => {
  if (!(await confirmBox('Alle Daten löschen?', 'Spieler, Spiele und Einstellungen in diesem Browser werden gelöscht. Das lässt sich nicht rückgängig machen.', 'Endgültig löschen', true))) return;
  await wipeAll();
  toast('Daten gelöscht.'); go('uebersicht');
};
async function wipeAll() {
  S.players = {}; S.games = {}; S.settings = Object.assign({}, DEFAULT_SETTINGS); S.live.gameId = null; aCache.clear(); bumpRoster();
  lsDel(LS_KEY); await Store.wipe(); try { Object.keys(localStorage).filter((k) => k.indexOf('vst:live:') === 0).forEach(lsDel); } catch (e) { /* egal */ }
}
ACT.expjson = () => {
  const games = {}; realGames().forEach((g) => { games[g.id] = g; });
  S.settings.lastBackupAt = Date.now(); Store.saveSettings();
  offerFile('volleyball-scouting-backup-' + todayIso() + '.json', JSON.stringify({ app: 'volleyball-scouting', version: 1, exportedAt: new Date().toISOString(), settings: S.settings, players: S.players, games }, null, 1));
};
ACT.expcsv = () => { const an = filteredGames().map(analysis); const agg = C.aggregate(an); offerFile('saisonstatistik-' + todayIso() + '.csv', csvFromPlayers(agg.players, agg.team)); };
document.addEventListener('change', async (e) => {
  if (e.target.id !== 'impJson' || !e.target.files || !e.target.files[0]) return;
  let d; try { d = JSON.parse(await e.target.files[0].text()); } catch (err) { toast('Keine gültige Backup-Datei.', { kind: 'error' }); return; }
  if (!d || typeof d !== 'object' || (!d.players && !d.games)) { toast('Keine gültige Backup-Datei.', { kind: 'error' }); return; }
  const ps = Object.values(d.players || {}).filter((p) => p && p.id && /^[a-z0-9]+$/i.test(p.id));
  const gs = Object.values(d.games || {}).filter((g) => g && g.id && /^[a-z0-9]+$/i.test(g.id));
  if (!(await confirmBox('Backup einspielen?', ps.length + ' Spieler und ' + gs.length + ' Spiele werden übernommen.', 'Einspielen'))) return;
  if (d.settings && typeof d.settings === 'object') { S.settings = Object.assign({}, DEFAULT_SETTINGS, d.settings); Store.saveSettings(); }
  ps.forEach((p) => Store.savePlayer(p));
  let kept = 0;
  gs.forEach((g) => {
    const mine = S.games[g.id];
    if (mine && (mine.updatedAt || 0) > (g.updatedAt || 0)) { kept++; return; }
    delete g.practice; S.games[g.id] = g; const rv = g.rev; const at = g.updatedAt; Store.saveGame(g, { now: true }); g.rev = rv; g.updatedAt = at;
  });
  toast('Backup eingespielt.' + (kept ? ' ' + kept + (kept === 1 ? ' Spiel war' : ' Spiele waren') + ' hier neuer und ' + (kept === 1 ? 'blieb' : 'blieben') + ' erhalten.' : '')); render();
});
function csvFromPlayers(players, team) {
  const head = ['Nr', 'Name', 'Position', 'Spiele', 'Saetze', 'Punkte', 'BP', 'G-V', 'Aufschlag_Ges', 'Aufschlag_Fhl', 'Aufschlag_Ass', 'Aufschlag_3', 'Aufschlag_2', 'Aufschlag_1', 'Aufschlag_Schnitt',
    'Annahme_Ges', 'Annahme_Fhl', 'Annahme_3', 'Annahme_2', 'Annahme_1', 'Annahme_Schnitt', 'Annahme_3%', 'Annahme_2%', 'Annahme_1%', 'Angriff_Ges', 'Angriff_Fhl', 'Angriff_Blo', 'Angriff_Pkt', 'Angriff_Pkt%', 'Angriff_Eff%',
    'Block_Pkt', 'Block_Touch', 'Block_Fhl', 'Abwehr_Ges', 'Abwehr_Fhl', 'Fehler_sonst', 'Assists'];
  const p100 = (x) => (x === null || x === undefined ? '' : String(Math.round(x * 1000) / 10).replace('.', ','));
  const d2 = (x) => (x === null || x === undefined ? '' : String(Math.round(x * 100) / 100).replace('.', ','));
  const line = (nr, name, role, x) => [nr, name, role, x.games, x.sets, x.pts, x.bp, x.gv, x.sAtt, x.sErr, x.sAce, x.s3, x.s2, x.s1, d2(x.sAvg), x.rAtt, x.rErr, x.r3, x.r2, x.r1, d2(x.rAvg), p100(x.r3P), p100(x.r2P), p100(x.r1P),
    x.aAtt, x.aErr, x.aBlk, x.aKill, p100(x.aKillP), p100(x.aEff), x.bPts, x.bTouch, x.bErr, x.dAtt, x.dErr, x.fTot, x.ast].map((v) => { const s = String(v === null || v === undefined ? '' : v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';');
  const rows = boxRows(players).map(([pid, x]) => { const p = player(pid) || {}; return line(hasNo(p) ? p.num : '', p.name || pShort(pid), C.ROLES[p.role] || '', x); });
  rows.push(line('', 'Team', '', C.metrics(team)));
  return '﻿' + head.join(';') + '\n' + rows.join('\n') + '\n';
}
function validSeason(x) { const m = String(x).match(/^(\d{4})(?:\/(\d{2}))?$/); return !!m && (!m[2] || +m[2] === (+m[1] + 1) % 100); }
function slug(s) { return C.norm(s || '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'spiel'; }
function settingsHtml() {
  const st = S.settings; const lv = C.LEVELS[st.level] || C.LEVELS.bezirk; const tg = st.targets || {};
  const tfield = (k, label, unit) => {
    const v = tg[k]; const base = lv[k];
    const fmtV = (x) => (unit === '%' ? String(Math.round(x * 100)) : String(x).replace('.', ','));
    return '<label>' + label + '<span class="inline"><input type="text" inputmode="' + (unit === '%' ? 'numeric' : 'decimal') + '" data-num="' + (unit === '%' ? 'int' : 'dec') + '" maxlength="4" data-tk="' + k + '" data-unit="' + unit + '" value="' + (typeof v === 'number' ? esc(fmtV(v)) : '') + '" placeholder="' + esc(fmtV(base)) + '"> ' + (unit === '%' ? '%' : unit === 'avg' ? 'Ø (0–3)' : 'pro Satz') + '</span></label>';
  };
  return '<form class="card form" id="setForm"' + (S.readOnly ? ' inert' : '') + '><h2>Team</h2><div class="grid2">' +
    '<label>Teamname<input id="stName" value="' + esc(st.teamName || '') + '" placeholder="z. B. TSV Augsburg Herren 1"></label>' +
    '<label>Aktuelle Saison<input id="stSeason" value="' + esc(st.season || '') + '" placeholder="2026/27"></label>' +
    '<label>Standard-Modus' + selectHtml('stMode', Object.entries(C.FORMATS).map(([k, v]) => [k, v.label]), (st.format || {}).mode || 'bo5') + '</label>' +
    '<label>Spielklasse für Zielwerte' + selectHtml('stLevel', Object.entries(C.LEVELS).map(([k, v]) => [k, v.label]), st.level || 'bezirk') + '</label></div>' +
    '<h2>Zielwerte</h2><p class="small muted">Richtwerte aus Erfahrung für die gewählte Spielklasse (grau). Eigene Werte überschreiben sie – leer lassen für den Richtwert.</p><div class="grid3">' +
    tfield('so', 'Side-out mind.', '%') + tfield('bp', 'Break-Punkte mind.', '%') + tfield('recAvg', 'Annahme-Schnitt mind.', 'avg') + tfield('recErr', 'Annahmefehler höchstens', '%') +
    tfield('attEff', 'Angriffseffizienz mind.', '%') + tfield('attBlk', 'Geblockt höchstens', '%') + tfield('srvErr', 'Aufschlagfehler höchstens', '%') + tfield('blk', 'Blockpunkte mind.', 'n') + tfield('faults', 'Netz/Linie/Ball höchstens', 'n') +
    '</div><div id="stErr"></div><div class="row end"><button class="btn primary" type="submit" id="stSave">Speichern</button></div></form>';
}
document.addEventListener('submit', (e) => {
  if (e.target.id !== 'setForm') return;
  e.preventDefault();
  const st = S.settings; const errs = []; const tg = {};
  const name = $('#stName').value.trim(), season = $('#stSeason').value.trim();
  if (name.length > 60) errs.push('Teamname höchstens 60 Zeichen.');
  if (season && !validSeason(season)) errs.push('Saison bitte als „2026/27“ eintragen.');
  const LIM = { '%': [0, 100, '%'], avg: [0, 3, ''], n: [0, 10, ' pro Satz'] };
  $$('[data-tk]').forEach((inp) => {
    inp.classList.remove('bad'); if (inp.value.trim() === '') return;
    const v = +inp.value.replace(',', '.'); const [lo, hi, u] = LIM[inp.dataset.unit] || [0, 100, ''];
    if (!isFinite(v) || v < lo || v > hi) { inp.classList.add('bad'); errs.push((inp.closest('label') ? inp.closest('label').firstChild.textContent.trim() : 'Zielwert') + ': nur ' + String(lo).replace('.', ',') + ' bis ' + String(hi).replace('.', ',') + u); return; }
    tg[inp.dataset.tk] = inp.dataset.unit === '%' ? v / 100 : v;
  });
  $('#stErr').innerHTML = errsHtml(errs, 'Bitte korrigieren:'); if (errs.length) return;
  st.teamName = name; st.season = season; st.level = $('#stLevel').value;
  st.format = Object.assign({}, st.format, { mode: $('#stMode').value });
  st.targets = tg; Store.saveSettings(); toast('Einstellungen gespeichert.'); render();
});
document.addEventListener('change', (e) => { if (e.target.id === 'stLevel') { S.settings.level = e.target.value; render(); } });
function helpHtml() {
  return '<div class="dash"><section class="card span2"><h2>So scoutet ihr ein Spiel</h2><ol class="steps">' +
    '<li><b>Kader anlegen</b> unter Kader – mit Nummer und Position. Zum Ausprobieren lädt „Testdaten laden“ unter Daten einen Beispielkader mit sechs Spielen.</li>' +
    '<li><b>Scouten → Neues Spiel</b>: Gegner eintragen, Kader abhaken, Video-Datei wählen oder „Live in der Halle“.</li>' +
    '<li><b>Schnitt erstellen</b> (nur mit Video): Die App sucht die Ballwechsel und überspringt beim Scouten die Pausen. Danach reichen Leertaste, N und die Aktionsknöpfe.</li>' +
    '<li><b>Satz starten</b>: wer schlägt auf, Startaufstellung mit Zuspieler (für Rotationen und automatischen Aufschläger). Die Rotation heißt nach der Position des Zuspielers („Läufer auf I“ = Zuspieler auf Position I).</li>' +
    '<li><b>Scouten</b>: Spieler antippen → Aktion antippen – oder erst die Aktion und danach den Spieler. Oder in das Textfeld diktieren. Gegner-Aktionen über „Gegnerfehler“ und „Gegnerpunkt“. Fehlt ein Spieler oder wurde eine Ansage nicht verstanden, steht der Eintrag unter <b>Offen</b> und lässt sich mit einem Tipp nachtragen.</li>' +
    '<li><b>Satzende</b> erkennt das Tool und fragt nach. Danach den nächsten Satz einstellen.</li>' +
    '<li><b>Auswerten</b>: Saison zeigt den Trainingsfokus, Spiele den Spielbericht, Kader die Profile.</li></ol>' +
    '<p class="small muted">Tipp: Ein Ballwechsel endet immer mit genau einem Punkt-Eintrag (Kill, Ass, Block, Fehler oder Gegnerpunkt/-fehler). Nur dann stimmen Spielstand, Aufschlag und Rotation.</p></section>' +
    '<section class="card span2"><h2>Sprach- und Textbefehle</h2>' + cmdHelpHtml() + '</section>' +
    '<section class="card span2"><h2>Bewertungsskala</h2><p class="small muted">Angelehnt an das DVV-Scouting-Codebook. Zahlen: 3 = beste Stufe.</p><div class="tbl-wrap"><table class="tbl scale"><thead><tr><th>Aktion</th><th>Stufe</th><th>Bedeutung</th></tr></thead><tbody>' +
    ['S', 'R', 'A', 'B', 'D'].map((sk) => C.SKILL[sk].grades.map((g, i) => '<tr>' + (i ? '' : '<th scope="rowgroup" rowspan="' + C.SKILL[sk].grades.length + '">' + C.SKILL[sk].label + '</th>') + '<td><span class="evc ' + gradeCls(sk, g) + '">' + esc(C.GL[sk][g]) + '</span></td><td class="l">' + esc((C.GD[sk] || {})[g] || '') + '</td></tr>').join('')).join('') +
    '<tr><th scope="row">Blockfehler</th><td colspan="2" class="l">Grund optional: ' + C.BX_ORDER.map((k) => esc(C.BX[k])).join(' · ') + '</td></tr>' +
    '</tbody></table></div></section>' +
    (HOOK.helpExtra ? HOOK.helpExtra() : '') + '</div>';
}

window.addEventListener('hashchange', onRoute);
window.VST = {
  S, C, Store, HOOK, ACT, VIEWS, ICON, $, $$, esc, modal, toast, confirmBox, blocked, offerFile, selectHtml, emptyState, kpiTile, render, go,
  analysis, isDemo, player, pLabel, pShort, pFull, pNo, hasNo, liveGame, rosterMap, rosterList, realGames, statsGames, gameById, filteredGames,
  targets, fmtDate, fmtDateShort, todayIso, pct, eff, num, lsGet, lsSet, logEv, demoData, seasonOf, realPlayers, parseBulk, wipeAll, evCode, describeEvent,
  start() { const r0 = parseHash(); S.route = r0.route; S.id = r0.id; render(); Store.boot(); },
};
})();

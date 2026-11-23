/* Volleyball Scouting – Kader anlegen: eine eigene, leere Seite statt Beispieldaten im Hintergrund */
(function () {
  'use strict';
  const V = window.VST, C = V.C, S = V.S, ACT = V.ACT, $ = V.$, $$ = V.$$, esc = V.esc, Store = V.Store;
  const START_ROWS = 10;
  const NO_POS = [['', 'Position']].concat(Object.keys(C.ROLES).map((k) => [k, C.ROLES[k]]));

  function begin() { S.settings.demoOff = true; Store.saveSettings(); V.go('kader'); }
  ACT.kaderneu = () => {
    if (!V.realPlayers().length && !V.realGames().length) { begin(); return; }
    if (V.realPlayers().every((p) => p.test) && V.realGames().every((g) => g.test)) { V.testRemove(); begin(); return; } // nur Testdaten: einfach ersetzen
    const n = V.realPlayers().length, g = V.realGames().length;
    V.modal({ title: 'Komplett neu anfangen?', html: '<p>Der neue Kader startet leer. Dafür werden <b>' + n + ' Spieler und ' + g + ' Spiele</b> aus diesem Browser gelöscht, auch alle Einstellungen. Das lässt sich nicht rückgängig machen.</p><p class="small muted">Sichere vorher ein Backup, dann kannst du den alten Stand jederzeit wieder einspielen.</p>',
      actions: [{ label: 'Abbrechen', kind: 'ghost' }, { label: 'Backup sichern', fn: () => { ACT.expjson(); return false; } }, { label: 'Alles löschen und neu anfangen', kind: 'danger', fn: async () => { await V.wipeAll(); begin(); } }] });
  };

  const rowHtml = (r) => '<tr class="kd-r"><td><input class="kd-no" inputmode="numeric" data-num="int" maxlength="2" aria-label="Rückennummer" value="' + esc(r.num === undefined ? '' : r.num) + '"></td>' +
    '<td><input class="kd-name" aria-label="Name" autocomplete="off" value="' + esc(r.name || '') + '"></td>' +
    '<td>' + V.selectHtml('', NO_POS, r.role || '', 'class="kd-pos" aria-label="Position"').replace(' id=""', '') + '</td>' +
    '<td><button type="button" class="icon-btn small" data-act="kddel" aria-label="Zeile löschen">' + V.ICON.x + '</button></td></tr>';
  const readRows = () => $$('.kd-r').map((tr) => ({ tr, num: $('.kd-no', tr).value.trim(), name: $('.kd-name', tr).value.trim(), role: $('.kd-pos', tr).value })).filter((r) => r.num || r.name);

  /** Zeigt laufend, was dem Kader für ein Spiel noch fehlt */
  function status() {
    const el = $('#kdStatus'); if (!el) return;
    const rows = readRows(); const seen = {}; const errs = [];
    rows.forEach((r) => {
      if (!r.name) errs.push('#' + r.num + ' braucht einen Namen.');
      if (r.num !== '') { const x = +r.num; if (x < 1 || x > 99) errs.push('Rückennummern gehen von 1 bis 99.'); if (seen[x]) errs.push('Die Nummer ' + x + ' ist doppelt.'); seen[x] = 1; }
    });
    const count = (k) => rows.filter((r) => r.role === k).length;
    const notes = [];
    if (rows.length < 6) notes.push('Für ein Spiel fehlen noch ' + (6 - rows.length) + ' Spieler.');
    if (rows.length && !count('ZSP')) notes.push('Ohne Zuspieler fehlt die Rotation in den Auswertungen.');
    if (rows.length && rows.some((r) => !r.role)) notes.push('Ohne Position fehlen Angriffszonen in den Auswertungen.');
    el.innerHTML = '<b>' + rows.length + ' Spieler</b>' + (rows.length ? ' <span class="muted">· ' + Object.keys(C.ROLES).filter(count).map((k) => count(k) + ' ' + C.ROLES[k]).join(', ') + '</span>' : '') +
      (errs.length ? '<ul class="kd-e">' + Array.from(new Set(errs)).map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : notes.length ? '<p class="small muted">' + notes.map(esc).join(' ') + '</p>' : '<p class="small muted">Bereit für das erste Spiel.</p>');
    return errs;
  }
  V.VIEWS.kader = function (view) {
    if (!S.loaded) { view.innerHTML = '<div class="card"><p class="muted">Lade …</p></div>'; return; }
    if (view.dataset.kd && $('#kdBody', view)) return; // Eingaben nicht überschreiben
    view.dataset.kd = '1';
    const has = V.realPlayers().length;
    view.innerHTML = '<div class="page-h"><div><h1>' + (has ? 'Kader ergänzen' : 'Neuer Kader') + '</h1><p class="muted">Trag euer Team ein, danach scoutest du direkt das erste Spiel.</p></div></div>' +
      '<form id="kdForm" class="kd" autocomplete="off"><section class="card"><div class="kd-top"><label>Teamname<input id="kdTeam" value="' + esc(S.settings.teamName || '') + '" placeholder="z. B. TSV Musterstadt 2"></label>' +
      '<label>Spielklasse' + V.selectHtml('kdLevel', Object.keys(C.LEVELS).map((k) => [k, C.LEVELS[k].label]), S.settings.level || 'bezirk') + '</label></div>' +
      '<div class="tbl-wrap"><table class="tbl kd-t"><thead><tr><th>Nr</th><th>Name</th><th>Position</th><th></th></tr></thead><tbody id="kdBody">' + Array.from({ length: START_ROWS }, () => rowHtml({})).join('') + '</tbody></table></div>' +
      '<div class="row"><button type="button" class="btn small" data-act="kdadd">' + V.ICON.plus + ' Zeile</button></div>' +
      '<details class="kd-paste"><summary>Liste einfügen</summary><p class="small muted">Eine Zeile pro Person: Nummer Name Position, zum Beispiel aus einer Mannschaftsliste.</p><textarea id="kdPaste" rows="5" class="mono" placeholder="1 Jonas Weber Zuspiel\n7 Max Huber Außen\n5 Elias Bauer Libero"></textarea><div class="row"><button type="button" class="btn small" data-act="kdpaste">In die Tabelle übernehmen</button></div></details></section>' +
      '<aside class="card kd-side"><div id="kdStatus"></div><div class="row mt"><button type="submit" class="btn primary">Kader speichern</button><button type="button" class="btn ghost" data-act="kdcancel">Abbrechen</button></div></aside></form>';
    $('#kdForm', view).addEventListener('submit', save);
    $('#kdForm', view).addEventListener('input', status);
    status();
    const first = $('.kd-no', view); if (first && !('ontouchstart' in window)) first.focus();
  };
  ACT.kdadd = () => { $('#kdBody').insertAdjacentHTML('beforeend', rowHtml({})); const l = $$('.kd-no'); l[l.length - 1].focus(); };
  ACT.kddel = (t) => { t.closest('tr').remove(); status(); };
  ACT.kdpaste = () => {
    const box = $('#kdPaste'); const rows = V.parseBulk(box.value);
    if (!rows.length) { V.toast('Keine gültigen Zeilen gefunden.', { kind: 'warn' }); return; }
    const keep = readRows().map((r) => { r.tr = null; return r; });
    $('#kdBody').innerHTML = keep.concat(rows).concat([{}, {}]).map(rowHtml).join('');
    box.value = ''; box.closest('details').open = false; status();
  };
  ACT.kdcancel = () => {
    if (!V.realPlayers().length && !V.realGames().length) { S.settings.demoOff = false; Store.saveSettings(); }
    V.go(V.realPlayers().length ? 'spieler' : 'uebersicht');
  };
  function save(e) {
    e.preventDefault();
    const errs = status(); const rows = readRows();
    if (errs && errs.length) { V.blocked(errs[0]); return; }
    if (!rows.length) { V.blocked('Trag mindestens einen Spieler ein.'); return; }
    S.settings.teamName = $('#kdTeam').value.trim(); S.settings.level = $('#kdLevel').value; Store.saveSettings();
    rows.forEach((r) => {
      const ex = V.realPlayers().find((x) => x.active !== false && r.num !== '' && V.hasNo(x) && String(x.num) === r.num);
      Store.savePlayer(ex ? Object.assign({}, ex, { name: r.name, short: r.name.split(' ')[0], role: r.role || ex.role }) : { id: C.rid(8), num: r.num === '' ? '' : +r.num, name: r.name, short: r.name.split(' ')[0], role: r.role, aliases: [], active: true, createdAt: Date.now() });
    });
    V.toast(rows.length + ' Spieler gespeichert.');
    V.go(rows.length >= 6 ? 'live' : 'spieler');
  }
})();

/* Testdaten: der Beispielkader mit seinen Spielen als echte, änderbare Daten. Markiert mit test, damit sie sich wieder entfernen lassen. */
(function () {
  'use strict';
  const V = window.VST, S = V.S, ACT = V.ACT, Store = V.Store;
  /** Lädt den Beispielkader mit seinen Spielen als echte Daten */
  function seed() {
    const D = V.demoData(); const now = Date.now();
    D.roster.forEach((p) => { const q = Object.assign({}, p, { test: true, createdAt: now }); delete q.demo; Store.savePlayer(q); });
    D.games.forEach((g0) => { const g = JSON.parse(JSON.stringify(g0)); delete g.demo; g.test = true; g.createdAt = now; g.status = g.status || 'done'; Store.saveGame(g, { now: true }); });
    if (!S.settings.teamName) S.settings.teamName = 'Testteam';
    S.settings.demoOff = true; Store.saveSettings();
    return D;
  }
  function remove() {
    V.realGames().filter((g) => g.test).forEach((g) => Store.deleteGame(g.id));
    V.realPlayers().filter((p) => p.test).forEach((p) => Store.deletePlayer(p.id));
    if (S.settings.teamName === 'Testteam') S.settings.teamName = '';
    if (!V.realPlayers().length && !V.realGames().length) S.settings.demoOff = false;
    Store.saveSettings();
  }
  V.testRemove = remove;
  /* Beim allerersten Start sind die Testdaten schon da, damit man sofort etwas sieht. Danach nie wieder von selbst. */
  V.HOOK.afterLoad = () => {
    if (S.readOnly || S.route === 'karte' || V.lsGet('vst:seeded') === '1') return;
    V.lsSet('vst:seeded', '1');
    if (!V.realPlayers().length && !V.realGames().length) seed();
  };
  ACT.testdaten = async () => {
    const D = V.demoData();
    const has = V.realPlayers().length || V.realGames().length;
    if (has && !(await V.confirmBox('Testdaten dazuladen?', D.roster.length + ' Spieler und ' + D.games.length + ' Spiele kommen dazu. Deine Daten bleiben, frühere Testdaten werden ersetzt.', 'Testdaten laden'))) return;
    seed();
    V.toast(D.roster.length + ' Spieler und ' + D.games.length + ' Spiele geladen. Unter Daten lassen sie sich wieder entfernen.', { ms: 6000 });
    V.go('uebersicht');
  };
  ACT.testweg = async () => {
    const gs = V.realGames().filter((g) => g.test), ps = V.realPlayers().filter((p) => p.test);
    if (!(await V.confirmBox('Testdaten entfernen?', gs.length + ' Testspiele und ' + ps.length + ' Testspieler werden gelöscht. Deine eigenen Daten bleiben.', 'Entfernen', true))) return;
    remove();
    V.toast('Testdaten entfernt.'); V.render();
  };
})();

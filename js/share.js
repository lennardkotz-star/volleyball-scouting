/* Volleyball Scouting – Teilen ohne Server: Spielerkarte und Trainer-Ansicht als Link.
   Die Daten stecken komprimiert hinter dem # der Adresse und werden deshalb nie an den Webserver geschickt. */
(function () {
  'use strict';
  const V = window.VST, C = V.C, S = V.S, ACT = V.ACT, HOOK = V.HOOK, $ = V.$, esc = V.esc, pct = V.pct, eff = V.eff, num = V.num, Store = V.Store;

  /* ---------------------------------------------------------- Kodieren */
  const b64u = (bytes) => { let s = ''; bytes.forEach((b) => { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64u = (t) => { const s = atob(t.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, (c) => c.charCodeAt(0)); };
  async function pipeBytes(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }
  async function encode(obj) {
    const raw = new TextEncoder().encode(JSON.stringify(obj));
    if (window.CompressionStream) return 'z' + b64u(await pipeBytes(raw, new CompressionStream('deflate-raw')));
    return 'j' + b64u(raw);
  }
  async function decode(txt) {
    const bytes = unb64u(txt.slice(1));
    const raw = txt[0] === 'z' ? await pipeBytes(bytes, new DecompressionStream('deflate-raw')) : bytes;
    return JSON.parse(new TextDecoder().decode(raw));
  }
  const linkFor = (kind, data) => location.origin + location.pathname + '#' + kind + '=' + data;

  /* ---------------------------------------------------------- Inhalte */
  const pick = (m) => ({ pts: m.pts, gv: m.gv, games: m.games, sets: m.sets, aAtt: m.aAtt, aKill: m.aKill, aEff: m.aEff, soEff: m.soEff, trEff: m.trEff, rAtt: m.rAtt, rAvg: m.rAvg, r3P: m.r3P, rErrP: m.rErrP, sAtt: m.sAtt, sAce: m.sAce, sErr: m.sErr, sErrP: m.sErrP, bPts: m.bPts, bTouch: m.bTouch, bErr: m.bErr, dAtt: m.dAtt, dOkP: m.dOkP });
  const safeUrl = (u) => (/^https:\/\/(www\.)?(youtube\.com|youtu\.be|twitch\.tv)\//i.test(String(u)) ? String(u) : null);
  function scope() { const games = V.filteredGames(); const an = games.map(V.analysis); return { games, an, agg: C.aggregate(an) }; }
  function compareRows(agg) {
    return V.rosterList(true).filter((p) => p.shareCompare && agg.players[p.id]).map((p) => { const m = C.metrics(agg.players[p.id]); return [V.pShort(p.id), m.pts, m.aEff, m.rAvg, m.sErrP]; });
  }
  function playerPayload(pid, sc) {
    const { games, an, agg } = sc; const p = V.player(pid) || {};
    const x = C.metrics(agg.players[pid] || C.zc());
    const gs = an.map((a, i) => ({ g: games[i], c: a.players[pid] })).filter((o) => o.c).slice(-12).map((o) => { const m = C.metrics(o.c); return [o.g.date, o.g.opponent, m.pts, m.gv, m.aKill, m.aAtt, m.rAvg]; });
    const notes = C.playerNotes(x, agg.m, V.targets());
    const scenes = [];
    games.forEach((g) => { if (!C.videoSynced(g)) return; (g.events || []).forEach((e) => { if (e.k === 'a' && e.p === pid) { const l = C.videoLink(g.video, C.videoSec(g, e)); if (l) scenes.push([C.SKILL[e.sk].label + ' ' + C.GL[e.sk][e.g], g.opponent, l]); } }); });
    return { v: 1, tn: S.settings.teamName || '', se: S.settings.season || '', at: V.todayIso(), p: { n: V.hasNo(p) ? p.num : '', nm: p.name || V.pShort(pid), r: C.ROLES[p.role] || '' }, x: pick(x), t: pick(agg.m), gs, st: notes.strengths.slice(0, 3), wk: notes.work.slice(0, 3), sc: scenes.slice(-20), cmp: p.shareCompare ? compareRows(agg) : [] };
  }
  function trainerPayload(sc) {
    const { agg } = sc; const r = agg.rk ? C.rkMetrics(agg.rk) : null;
    const rows = Object.keys(agg.players).map((pid) => { const p = V.player(pid) || {}; const m = C.metrics(agg.players[pid]); return [V.hasNo(p) ? p.num : '', V.pShort(pid), m.sets, m.pts, m.gv, m.rAtt, m.rAvg, m.aAtt, m.aEff, m.sAtt, m.sAce, m.sErr, m.bPts]; }).sort((a, b) => b[3] - a[3]);
    const ins = C.insights(agg, V.targets(), V.pShort);
    return { v: 1, tn: S.settings.teamName || '', se: S.settings.season || '', at: V.todayIso(), g: agg.games, kpi: { so: r ? r.so : null, bp: r ? r.bp : null, rAvg: agg.m.rAvg, aEff: agg.m.aEff, sErrP: agg.m.sErrP }, rows, fo: ins.focus.slice(0, 3).map((f) => [f.area, f.title, f.text, f.drill]) };
  }

  /* ---------------------------------------------------------- Teilen-Dialoge */
  async function copy(text, btn) {
    try { await navigator.clipboard.writeText(text); if (btn) { const old = btn.textContent; btn.textContent = 'Kopiert'; setTimeout(() => { btn.textContent = old; }, 1400); } }
    catch (e) { V.toast('Kopieren geht hier nicht. Link bitte von Hand markieren.', { kind: 'warn' }); }
  }
  HOOK.playerButtons = (pid) => (V.isDemo() ? '' : '<button class="btn" data-act="pcard" data-pid="' + pid + '">Karte teilen</button>');
  ACT.pcard = async (t) => {
    const pid = t.dataset.pid; const p = S.players[pid]; if (!p) return;
    const url = linkFor('k', await encode(playerPayload(pid, scope())));
    V.modal({ title: 'Karte von ' + V.pShort(pid), wide: true, html: '<p>Der Link zeigt nur die eigenen Werte und den Teamschnitt, Stand heute. Für neue Spiele den Link neu kopieren.</p>' +
      '<textarea class="mono" rows="3" readonly id="cardUrl">' + esc(url) + '</textarea>' +
      '<label class="tg"><input type="checkbox" id="cardCmp"' + (p.shareCompare ? ' checked' : '') + '> ' + esc(V.pShort(pid)) + ' stimmt dem Vergleich zu: Werte erscheinen auf den Karten der anderen, die ebenfalls zugestimmt haben</label>' +
      '<p class="small muted">Wer den Link hat, sieht die Karte. Die Daten liegen nur im Link selbst, nicht auf einem Server. Bei Minderjährigen vorher die Eltern fragen.</p>',
      actions: [{ label: 'Schließen', kind: 'ghost' }, { label: 'Vorschau', fn: () => { window.open(url, '_blank', 'noopener'); return false; } }, { label: 'Link kopieren', kind: 'primary', fn: (el) => { copy($('#cardUrl', el).value, el.querySelector('.btn.primary')); return false; } }],
      onOpen: (el) => { $('#cardCmp', el).addEventListener('change', async (ev) => {
        const q = Object.assign({}, S.players[pid], { shareCompare: ev.target.checked || undefined }); Store.savePlayer(q);
        $('#cardUrl', el).value = linkFor('k', await encode(playerPayload(pid, scope())));
      }); } });
  };
  ACT.cardsall = async () => {
    const sc = scope();
    const ids = V.rosterList().filter((p) => sc.agg.players[p.id]).map((p) => p.id);
    if (!ids.length) { V.toast('Noch keine Spieler mit Statistik.'); return; }
    const links = await Promise.all(ids.map(async (pid) => [pid, linkFor('k', await encode(playerPayload(pid, sc)))]));
    const trainer = linkFor('t', await encode(trainerPayload(sc)));
    const m = V.modal({ title: 'Karten verschicken', wide: true, html: '<p>Jeder Link gehört zu genau einer Person. Nicht in die Teamgruppe posten: Im Link stehen die Werte.</p><ul class="list">' +
      links.map(([pid, l], i) => '<li><span>' + esc(V.pLabel(pid)) + '</span><button class="btn small" data-copy="' + i + '">Link kopieren</button></li>').join('') +
      '<li><span><b>Trainer-Ansicht</b> <small class="muted">alle Spieler, Trainingsfokus, kostenlos</small></span><button class="btn small" data-copy="t">Link kopieren</button></li></ul>' });
    m.el.addEventListener('click', (e) => { const b = e.target.closest('[data-copy]'); if (b) copy(b.dataset.copy === 't' ? trainer : links[+b.dataset.copy][1], b); });
  };
  HOOK.afterRenderShare = (view) => {
    if (S.route === 'spieler' && !S.id && !V.isDemo()) { const r = $('.page-h .row', view); if (r) r.insertAdjacentHTML('afterbegin', '<button class="btn" data-act="cardsall">Karten verschicken</button>'); }
  };

  /* ---------------------------------------------------------- Ansicht für Empfänger (kein Konto, keine App-Daten) */
  V.VIEWS.karte = function (view) {
    const h = location.hash; const kind = h[1]; const data = h.slice(3);
    if (view.dataset.shared === h) return;
    view.dataset.shared = h;
    view.innerHTML = '<div class="card"><p class="muted">Lade …</p></div>';
    decode(data).then((d) => { view.innerHTML = kind === 'k' ? cardHtml(d) : trainerHtml(d); })
      .catch(() => { view.innerHTML = V.emptyState('Link nicht lesbar', 'Dieser Link ist unvollständig oder beschädigt. Bitte neu schicken lassen.'); });
  };
  const n0 = (x) => (Number.isFinite(+x) ? +x : 0);
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
  const head = (d, title, sub) => '<div class="page-h game-h"><div><p class="muted small">' + esc([d.tn, d.se ? 'Saison ' + d.se : ''].filter(Boolean).join(' · ')) + '</p><h1>' + title + '</h1><p class="muted">' + esc(sub) + ' · Stand ' + esc(V.fmtDate(String(d.at || ''))) + '</p></div></div>';
  function cardHtml(d) {
    const p = d.p || {}, x = d.x || {}, t = d.t || {};
    let s = head(d, (p.n !== '' && p.n !== undefined ? '<span class="numbadge">' + esc(p.n) + '</span> ' : '') + esc(p.nm), [p.r, plural(n0(x.games), 'Spiel', 'Spiele'), plural(n0(x.sets), 'Satz', 'Sätze')].filter(Boolean).join(' · '));
    s += '<div class="dash"><section class="card span2"><div class="kpis">' +
      V.kpiTile('Punkte', String(n0(x.pts)), 'Punkte minus Fehler: ' + n0(x.gv), '') +
      V.kpiTile('Angriffseffizienz', eff(x.aEff), n0(x.aKill) + ' von ' + n0(x.aAtt) + ' · Team ' + eff(t.aEff), '') +
      V.kpiTile('Annahme-Schnitt', x.rAvg === null || x.rAvg === undefined ? '–' : num(+x.rAvg, 2), plural(n0(x.rAtt), 'Annahme', 'Annahmen') + ' · Team ' + (t.rAvg === null || t.rAvg === undefined ? '–' : num(+t.rAvg, 2)), '') +
      V.kpiTile('Aufschlag', n0(x.sAce) + ' Asse', n0(x.sErr) + ' Fehler bei ' + n0(x.sAtt) + ' · Team ' + pct(t.sErrP) + ' Fehler', '') +
      V.kpiTile('Block', n0(x.bPts) + ' Punkte', n0(x.bTouch) + ' Touches · ' + n0(x.bErr) + ' Fehler', '') +
      V.kpiTile('Abwehr', x.dOkP === null || x.dOkP === undefined ? '–' : pct(x.dOkP), n0(x.dAtt) + ' Aktionen · Team ' + pct(t.dOkP), '') + '</div></section>';
    const list = (arr, cls) => (arr && arr.length ? '<ul class="notes ' + cls + '">' + arr.map((a) => '<li>' + esc(a) + '</li>').join('') + '</ul>' : '<p class="muted">Dafür braucht es noch mehr Spiele.</p>');
    s += '<section class="card"><h2>Stärken</h2>' + list(d.st, 'good') + '</section><section class="card"><h2>Baustellen</h2>' + list(d.wk, 'bad') + '</section>';
    if (d.gs && d.gs.length) s += '<section class="card span2"><h2>Spiel für Spiel</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Datum</th><th>Gegner</th><th>Punkte</th><th>G-V</th><th>Angriff</th><th>Annahme Ø</th></tr></thead><tbody>' +
      d.gs.slice().reverse().map((g) => '<tr><td>' + esc(V.fmtDateShort(String(g[0] || ''))) + '</td><th scope="row">' + esc(g[1]) + '</th><td>' + n0(g[2]) + '</td><td>' + n0(g[3]) + '</td><td>' + n0(g[4]) + '/' + n0(g[5]) + '</td><td>' + (g[6] === null || g[6] === undefined ? '–' : num(+g[6], 2)) + '</td></tr>').join('') + '</tbody></table></div></section>';
    const scenes = (d.sc || []).map((c) => [c[0], c[1], safeUrl(c[2])]).filter((c) => c[2]);
    if (scenes.length) s += '<section class="card span2"><h2>Meine Szenen</h2><ul class="scenes">' + scenes.slice().reverse().map((c) => '<li><a href="' + esc(c[2]) + '" target="_blank" rel="noopener">' + V.ICON.video + ' ' + esc(c[0]) + '</a> <small class="muted">' + esc(c[1]) + '</small></li>').join('') + '</ul></section>';
    if (d.cmp && d.cmp.length) s += '<section class="card span2"><h2>Vergleich</h2><p class="small muted">Nur Spieler, die dem Vergleich zugestimmt haben.</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Punkte</th><th>Angriff Eff</th><th>Annahme Ø</th><th>Aufschlagfehler</th></tr></thead><tbody>' +
      d.cmp.map((r) => '<tr><th scope="row">' + esc(r[0]) + '</th><td>' + n0(r[1]) + '</td><td>' + eff(r[2]) + '</td><td>' + (r[3] === null || r[3] === undefined ? '–' : num(+r[3], 2)) + '</td><td>' + pct(r[4]) + '</td></tr>').join('') + '</tbody></table></div></section>';
    return s + '</div>';
  }
  function trainerHtml(d) {
    const k = d.kpi || {};
    let s = head(d, 'Trainer-Ansicht', plural(n0(d.g), 'Spiel', 'Spiele'));
    s += '<div class="dash"><section class="card span2"><div class="kpis">' + V.kpiTile('Side-out', pct(k.so), '', '') + V.kpiTile('Break-Punkte', pct(k.bp), '', '') + V.kpiTile('Annahme-Schnitt', k.rAvg === null || k.rAvg === undefined ? '–' : num(+k.rAvg, 2), '', '') + V.kpiTile('Angriffseffizienz', eff(k.aEff), '', '') + V.kpiTile('Aufschlagfehler', pct(k.sErrP), '', '') + '</div></section>';
    if (d.fo && d.fo.length) s += '<section class="card span2"><h2>Trainingsfokus</h2><div class="focus-list">' + d.fo.map((f, i) => '<article class="focus"><div class="focus-h"><span class="rank">' + (i + 1) + '</span><div class="grow"><span class="area">' + esc(f[0]) + '</span><h3>' + esc(f[1]) + '</h3></div></div><p>' + esc(f[2]) + '</p><p class="drill"><b>Übung:</b> ' + esc(f[3]) + '</p></article>').join('') + '</div></section>';
    s += '<section class="card span2"><h2>Spieler</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nr</th><th>Name</th><th>Sätze</th><th>Pkt</th><th>G-V</th><th>Annahmen</th><th>Ø</th><th>Angriffe</th><th>Eff</th><th>Aufschläge</th><th>Asse</th><th>Fehler</th><th>Block</th></tr></thead><tbody>' +
      (d.rows || []).map((r) => '<tr><td>' + esc(r[0]) + '</td><th scope="row">' + esc(r[1]) + '</th><td>' + n0(r[2]) + '</td><td>' + n0(r[3]) + '</td><td>' + n0(r[4]) + '</td><td>' + n0(r[5]) + '</td><td>' + (r[6] === null || r[6] === undefined ? '–' : num(+r[6], 2)) + '</td><td>' + n0(r[7]) + '</td><td>' + eff(r[8]) + '</td><td>' + n0(r[9]) + '</td><td>' + n0(r[10]) + '</td><td>' + n0(r[11]) + '</td><td>' + n0(r[12]) + '</td></tr>').join('') + '</tbody></table></div></section></div>';
    return s;
  }

  /* ---------------------------------------------------------- Wie gut der automatische Schnitt war: aus den Korrekturen beim Scouten */
  function cutQuality(g) {
    const cut = g.cut; if (!cut || !cut.stats || !cut.stats.auto) return null;
    const a = V.analysis(g); const st = cut.stats;
    const outside = a.rallies.filter((r) => {
      const last = g.events[r.end]; if (!last || last.v === undefined) return false;
      return !cut.rallies.some((x) => last.v >= x.s - 5 && last.v <= x.e + 8);
    }).length;
    const missed = Math.max(st.added, outside);
    const right = Math.max(0, st.auto - st.removed);
    const total = right + st.removed + missed;
    return { right, removed: st.removed, missed, rate: total ? right / total : null, rallies: a.rallies.length };
  }

  /* ---------------------------------------------------------- Hilfe */
  HOOK.helpExtra = () => '<section class="card span2"><h2>Tasten beim Video-Scouten</h2><div class="tbl-wrap"><table class="tbl cmd"><tbody>' +
    [['Leertaste', 'Abspielen / Pause'], ['N / B', 'Nächster / vorheriger Ballwechsel'], ['← / →', '3 Sekunden zurück / vor'], ['R', 'Ballwechsel von vorn'], ['1–9', 'Zone wählen, wenn Zonen aktiv sind. Aufschlag und Annahme haben die sechs Positionen 1–6'], ['Strg/Cmd + Z', 'Letzten Eintrag rückgängig']].map((r) => '<tr><th scope="row">' + r[0] + '</th><td>' + r[1] + '</td></tr>').join('') + '</tbody></table></div>' +
    '<p class="small muted">Kurzcodes im Textfeld: 7a45# = Nr. 7 greift von 4 nach 5 an, Punkt · 12s1+ = Nr. 12 schlägt auf 1, Stufe 3 · „Max Angriff Kill auf fünf“ oder „Max Angriff Linie Kill“ gehen auch per Sprache.</p></section>' +
    '<section class="card span2"><h2>Wo eure Daten liegen</h2><ul class="notes"><li>Alle Daten bleiben auf diesem Gerät im Browser, Videos ohnehin. Es gibt kein Konto und keinen Server.</li><li>Wechselt ihr Gerät oder Browser, zieht das Backup die Daten mit um. Der zweite Scout spielt das Backup ein, bei demselben Spiel gewinnt die neuere Fassung.</li><li>Spielerkarten stecken im Link selbst. Wer den Link hat, sieht sie.</li><li>Auf dem iPhone die App zum Home-Bildschirm hinzufügen, sonst darf Safari Daten nach 7 Tagen ohne Nutzung löschen.</li></ul></section>';

  V.share = { encode, decode, playerPayload, trainerPayload, cutQuality };
})();

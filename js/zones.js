/* Volleyball Scouting – Detail-Scouting: Zonen als freiwillige Zusatzfelder, Ableitungen statt Abfragen, Auswertungen mit ehrlicher Datenbasis, Detailrunde */
(function () {
  'use strict';
  const V = window.VST, C = V.C, S = V.S, ACT = V.ACT, HOOK = V.HOOK, ICON = V.ICON, $ = V.$, esc = V.esc, pct = V.pct, eff = V.eff, num = V.num, Store = V.Store;
  const MIN_N = 15;     // darunter wird ein Wert grau und als „zu wenig Daten“ markiert
  const PRESET = {
    minimal: {}, einfach: {},
    standard: { srvZone: 1, attDir: 1, digZone: 1 },
    detail: { srvZone: 1, attDir: 1, digZone: 1, oppAtt: 1, recZone: 1 },
  };
  const BLOCKS = [['srvZone', 'Aufschlagziel', 'Auf welche Zone schlagen wir mit dem besten Break auf?'], ['attDir', 'Angriffsrichtung', 'Pfeilkarte je Angreifer, Linie gegen Diagonale'], ['digZone', 'Abwehrzone', 'Wo bekommen wir die Bälle?'], ['oppAtt', 'Gegnerangriff', 'Wo landen die Punkte des Gegners?'], ['recZone', 'Annahmezone', 'Wie gut nehmen wir in welcher Zone an?']];
  // Reihenfolge wie im Codebook: aus Sicht der Mannschaft in diesem Feld
  const OWN_GRID = [4, 3, 2, 7, 8, 9, 5, 6, 1];
  const OPP_GRID = [1, 6, 5, 9, 8, 7, 2, 3, 4];   // Gegnerhälfte von unserer Seite gesehen, Netz unten
  // Aufschlag und Annahme: nur die sechs Positionen, Vorderfeld 3 m und Hinterfeld 6 m tief
  const OWN_SIX = [4, 3, 2, 5, 6, 1];
  const OPP_SIX = [1, 6, 5, 2, 3, 4];
  const COARSE = { 1: '1', 9: '1', 2: '1', 6: '6', 8: '6', 3: '6', 5: '5', 7: '5', 4: '5' };

  HOOK.detailLevels = () => [['minimal', 'Minimal – nur wer wie gepunktet hat'], ['einfach', 'Einfach – Aktion, Spieler, Bewertung'], ['standard', 'Standard – dazu Aufschlagziel, Angriffsrichtung, Abwehrzone'], ['detail', 'Detail – dazu Gegnerangriff und Annahmezone'], ['eigen', 'Eigene Auswahl aus den Einstellungen']];
  HOOK.applyLevel = (g, level) => {
    g.level = level; g.minimal = level === 'minimal' || undefined;
    g.detail = level === 'eigen' ? Object.assign({}, (S.settings.detail || {}).custom) : Object.assign({}, PRESET[level] || {});
  };

  /* ---------------------------------------------------------- Ableiten statt abfragen */
  /** Wo steht ein Angreifer beim Angriff? Rolle schlägt Position, weil nach dem Aufschlag getauscht wird. */
  function startZone(pid, lu, role) {
    if (lu && pid) {
      const i = lu.indexOf(pid);
      if (i >= 0) {
        const front = i === 1 || i === 2 || i === 3;
        if (front) return role === 'AA' ? 4 : role === 'MB' ? 3 : role === 'DIA' || role === 'ZSP' ? 2 : [0, 2, 3, 4][i];
        return role === 'DIA' || role === 'ZSP' ? 1 : role === 'AA' || role === 'MB' ? 6 : { 0: 1, 5: 6, 4: 5 }[i];
      }
    }
    return role === 'AA' ? 4 : role === 'MB' ? 3 : role === 'DIA' ? 2 : null;
  }
  /** Richtung aus Start- und Zielzone. Das Ziel zählt aus Sicht des Gegners, darum liegt die Linie von 4 auf seiner 1. */
  function direction(z, ze) {
    if (!z || !ze) return null;
    const left = z === 4 || z === 5, right = z === 2 || z === 1;
    if (!left && !right) return COARSE[ze] === '6' ? 'Mitte' : 'Schräg';
    if (ze === (left ? 4 : 2)) return 'Kurz';
    if (COARSE[ze] === '6') return 'Mitte';
    return COARSE[ze] === (left ? '1' : '5') ? 'Linie' : 'Diagonale';
  }
  const DIR_TARGET = { line: { 4: 1, 5: 1, 2: 5, 1: 5 }, cross: { 4: 5, 5: 5, 2: 1, 1: 1 }, short: { 4: 4, 5: 4, 2: 2, 1: 2 } };
  const setClass = (z) => (z === 4 ? '4' : z === 3 ? 'M' : z === 2 ? '2' : z ? 'H' : null);

  /* ---------------------------------------------------------- Eingabe beim Scouten */
  const blockKey = (e) => (e.k === 'a' ? { S: 'srvZone', A: 'attDir', D: 'digZone', R: 'recZone' }[e.sk] : e.k === 'opp' && e.r === 'pt' ? 'oppAtt' : null);
  const enabled = (g, e) => { const k = blockKey(e); return k && g.detail && g.detail[k]; };
  const onOppHalf = (e) => e && e.k === 'a' && (e.sk === 'S' || e.sk === 'A');
  const sixZones = (e) => e && e.k === 'a' && (e.sk === 'S' || e.sk === 'R');
  const gridFor = (e) => (sixZones(e) ? (e.sk === 'S' ? OPP_SIX : OWN_SIX) : onOppHalf(e) ? OPP_GRID : OWN_GRID);
  HOOK.stampZone = (g, e) => {
    if (S.live.zone && enabled(g, e)) { e.ze = S.live.zone; }
    S.live.zone = null;
    if (sixZones(e) && e.ze) e.ze = C.serveZone(e.ze);
    if (e.dir) {
      const c = V.analysis(g).cur || {};
      const z = e.z || startZone(e.p, c.lu, (V.player(e.p) || {}).role);
      const ze = DIR_TARGET[e.dir] && DIR_TARGET[e.dir][z];
      if (ze) e.ze = ze;
      delete e.dir;
    }
  };
  HOOK.afterLogZone = (g, a, e) => { S.live.zoneFor = enabled(g, e) && !e.ze ? e.id : null; };
  const anyBlock = (g) => g.detail && Object.keys(g.detail).some((k) => g.detail[k]);
  function zoneGridHtml(cells, cur, act, big) {
    return '<div class="zgrid' + (big ? ' big' : '') + (cells.length === 6 ? ' six' + (cells[0] === 1 ? ' far' : '') : '') + '">' + cells.map((z) => '<button type="button" class="zb' + (cur === z ? ' on' : '') + '" data-act="' + act + '" data-z="' + z + '">' + z + '</button>').join('') + '</div>';
  }
  /** Welches Raster gerade passt: zur letzten Aktion, sonst zur nächsten erwarteten */
  function panelGrid(g) {
    const e = S.live.zoneFor ? g.events.find((x) => x.id === S.live.zoneFor) : null;
    if (e) return gridFor(e);
    const c = V.analysis(g).cur || {};
    if (!c.rallyOpen) { const next = { k: 'a', sk: c.srv === 'u' ? 'S' : 'R' }; if (enabled(g, next)) return gridFor(next); }
    return OPP_GRID;
  }
  HOOK.zonePanel = (g) => {
    if (!anyBlock(g)) return '';
    const e = S.live.zoneFor ? g.events.find((x) => x.id === S.live.zoneFor) : null;
    const label = e ? (e.k === 'opp' ? 'Gegnerpunkt: wo gelandet?' : C.SKILL[e.sk].label + ': wohin?') : (S.live.zone ? 'Zone ' + S.live.zone + ' für die nächste Aktion' : 'Zone (optional)');
    const cells = panelGrid(g);
    const far = cells[0] === 1;
    return '<div class="zp' + (e ? ' ask' : '') + '"><span class="zp-l">' + esc(label) + '<small>' + (far ? 'Gegnerhälfte, Netz unten' : 'unsere Hälfte, Netz oben') + '</small></span>' + zoneGridHtml(cells, e ? null : S.live.zone, 'zone') + '</div>';
  };
  function setZone(g, z) {
    const e = S.live.zoneFor ? g.events.find((x) => x.id === S.live.zoneFor) : null;
    if (e) { e.ze = z; S.live.zoneFor = null; Store.saveGame(g); } else S.live.zone = S.live.zone === z ? null : z;
    V.render();
  }
  ACT.zone = (t) => { const g = V.liveGame(); if (g) setZone(g, +t.dataset.z); };

  /* ---------------------------------------------------------- Auswertung */
  function compute(games) {
    const roster = V.rosterMap();
    const roleOf = (pid) => (roster[pid] || {}).role;
    const R = {
      srv: { total: 0, withZone: 0, zone: {}, byPlayer: {} }, att: { total: 0, withZone: 0, players: {} },
      opp: { land: {}, withZone: 0, total: 0 }, dig: { zone: {} }, rec: { zone: {} },
      set: { all: { 4: 0, M: 0, 2: 0, H: 0, n: 0 }, byRec: { '#': { 4: 0, M: 0, 2: 0, H: 0, n: 0 }, '+': { 4: 0, M: 0, 2: 0, H: 0, n: 0 }, '-': { 4: 0, M: 0, 2: 0, H: 0, n: 0 } }, side: { 4: 0, M: 0, 2: 0, H: 0, n: 0 }, byDig: { '#': { 4: 0, M: 0, 2: 0, H: 0, n: 0 }, '+': { 4: 0, M: 0, 2: 0, H: 0, n: 0 }, '-': { 4: 0, M: 0, 2: 0, H: 0, n: 0 } } },
    };
    const add = (o, k, f) => { const b = o[k] || (o[k] = { n: 0, w: 0 }); b.n++; if (f) b.w++; };
    games.forEach((g) => {
      if (g.source === 'import' || !Array.isArray(g.events) || g.minimal) return;
      const a = V.analysis(g);
      a.rallies.forEach((r) => {
        let prev = null;
        r.ev.forEach((i) => {
          const e = g.events[i]; if (!e) return;
          if (e.k === 'opp' && e.r === 'pt') { R.opp.total++; if (e.ze) { R.opp.withZone++; add(R.opp.land, e.ze, true); } }
          if (e.k !== 'a') return;
          if (e.sk === 'S') {
            R.srv.total++;
            if (e.ze) { R.srv.withZone++; const won = r.w === 'u'; const ze = C.serveZone(e.ze); add(R.srv.zone, ze, won); if (e.p) add(R.srv.byPlayer[e.p] || (R.srv.byPlayer[e.p] = {}), ze, won); }
          } else if (e.sk === 'R' && e.ze) { const rz = C.serveZone(e.ze); const b = R.rec.zone[rz] || (R.rec.zone[rz] = { n: 0, sum: 0 }); b.n++; b.sum += e.g === '#' ? 3 : e.g === '+' ? 2 : e.g === '-' ? 1 : 0; }
          else if (e.sk === 'D' && e.ze) { add(R.dig.zone, e.ze, e.g !== '='); add(R.opp.land, e.ze, false); R.opp.withZone++; }
          else if (e.sk === 'A') {
            const z = e.z || startZone(e.p, r.lu, roleOf(e.p));
            const cl = setClass(z);
            R.att.total++;
            if (cl && prev) {
              R.set.all[cl]++; R.set.all.n++;
              if (prev.sk === 'R') { R.set.side[cl]++; R.set.side.n++; const b = R.set.byRec[prev.g]; if (b) { b[cl]++; b.n++; } }
              if (prev.sk === 'D') { const b = R.set.byDig[prev.g]; if (b) { b[cl]++; b.n++; } }
            }
            if (e.ze) {
              R.att.withZone++;
              [e.p || '_', '_all'].forEach((who) => {
                if (who === '_') return;
                const P = R.att.players[who] || (R.att.players[who] = { arrows: {}, dirs: {}, n: 0 });
                P.n++;
                const key = (z || 0) + '>' + e.ze; const ar = P.arrows[key] || (P.arrows[key] = { z, ze: e.ze, n: 0, k: 0, e: 0 });
                ar.n++; if (e.g === '#') ar.k++; if (e.g === '=' || e.g === '/') ar.e++;
                const d = direction(z, e.ze) || 'Ohne Start'; const db = P.dirs[d] || (P.dirs[d] = { n: 0, k: 0, e: 0 });
                db.n++; if (e.g === '#') db.k++; if (e.g === '=' || e.g === '/') db.e++;
              });
            }
          }
          if (e.sk === 'R' || e.sk === 'D') prev = e; else if (e.sk === 'A') prev = null;
        });
      });
    });
    return R;
  }

  /** Muster-Finder ohne KI: feste Regeln, nur bei großem und gut belegtem Unterschied */
  function significant(p1, n1, p2, n2) {
    const p = (p1 * n1 + p2 * n2) / (n1 + n2); const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
    return se > 0 && Math.abs(p1 - p2) / se >= 1.64;
  }
  function patterns(R) {
    const out = [];
    const pairs = (obj, label, fmt) => {
      const keys = Object.keys(obj);
      for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
        const a = obj[keys[i]], b = obj[keys[j]];
        if (a.n < 20 || b.n < 20) continue;
        const pa = a.w / a.n, pb = b.w / b.n;
        if (Math.abs(pa - pb) >= 0.10 && significant(pa, a.n, pb, b.n)) { const [hi, lo, kh, kl] = pa > pb ? [a, b, keys[i], keys[j]] : [b, a, keys[j], keys[i]]; out.push(fmt(kh, hi, kl, lo, label)); }
      }
    };
    pairs(R.srv.zone, 'Aufschlag', (kh, hi, kl, lo) => 'Aufschlag auf ' + kh + ': Break ' + pct(hi.w / hi.n) + ' (n = ' + hi.n + '), auf ' + kl + ': ' + pct(lo.w / lo.n) + ' (n = ' + lo.n + ').');
    Object.keys(R.set.byRec).forEach((g) => {
      const b = R.set.byRec[g], all = R.set.side; if (b.n < MIN_N || all.n < 30) return;
      ['4', 'M', '2', 'H'].forEach((k) => {
        const s = b[k] / b.n, base = all[k] / all.n;
        if (Math.abs(s - base) >= 0.15) out.push('Zuspiel nach Annahme ' + C.GL.R[g] + ': ' + pct(s) + ' auf ' + SETL[k] + ' (n = ' + b.n + '), sonst ' + pct(base) + '.');
      });
    });
    return out;
  }
  const SETL = { 4: 'Position 4', M: 'die Mitte', 2: 'Position 2', H: 'hinten' };

  /* ---------------------------------------------------------- Darstellung */
  const basis = (done, total, what) => '<p class="small muted">Datenbasis: ' + done + ' von ' + total + ' ' + what + '.</p>';
  function heat(cells, getN, getText, titlePos) {
    const max = Math.max(1, ...cells.map(getN));
    return '<div class="zheat ' + (cells[0] === 1 ? 'net-unten' : 'net-oben') + (cells.length === 6 ? ' six' : '') + '" role="table" aria-label="' + esc(titlePos) + '">' + cells.map((z) => { const n = getN(z); return '<div class="zh" role="cell" style="--a:' + (n ? 0.05 + 0.3 * n / max : 0) + '"><b>' + z + '</b><span>' + (getText(z) || '') + '</span></div>'; }).join('') + '</div>';
  }
  const val = (txt, n) => (n < MIN_N ? '<span class="lown" title="zu wenig Daten">' + txt + '</span>' : txt);
  function serveHtml(R) {
    if (!R.srv.withZone) return '';
    const rows = OPP_SIX.map((k) => { const b = R.srv.zone[k]; return '<tr><th scope="row">Zone ' + k + '</th><td>' + (b ? b.n : 0) + '</td><td>' + (b ? val(pct(b.w / b.n), b.n) : '–') + '</td></tr>'; }).join('');
    return '<section class="card"><div class="card-h"><h2>Aufschlagziel → Break</h2></div>' + heat(OPP_SIX, (z) => (R.srv.zone[z] || {}).n || 0, (z) => { const b = R.srv.zone[z]; return b ? pct(b.w / b.n) + ' · ' + b.n : ''; }, 'Break je Zielzone') +
      '<div class="tbl-wrap"><table class="tbl mt"><thead><tr><th>Ziel</th><th>Aufschläge</th><th>Break</th></tr></thead><tbody>' + rows + '</tbody></table></div>' + basis(R.srv.withZone, R.srv.total, 'Aufschlägen mit Ziel') + '</section>';
  }
  /* 18 x 9 m bei gut 18 px je Meter, Zonen 3 x 3 m, Netz bei y = 172 */
  const X = [35, 90, 145];
  const OPP_XY = { 1: [X[0], 35], 6: [X[1], 35], 5: [X[2], 35], 9: [X[0], 90], 8: [X[1], 90], 7: [X[2], 90], 2: [X[0], 145], 3: [X[1], 145], 4: [X[2], 145] };
  const OWN_XY = { 4: [X[0], 199], 3: [X[1], 199], 2: [X[2], 199], 7: [X[0], 254], 8: [X[1], 254], 9: [X[2], 254], 5: [X[0], 309], 6: [X[1], 309], 1: [X[2], 309] };
  function arrowMap(P) {
    const arrows = Object.values(P.arrows).filter((a) => a.z);
    const maxN = Math.max(1, ...arrows.map((a) => a.n));
    const lines = arrows.map((a) => {
      const f = OWN_XY[a.z], t = OPP_XY[a.ze]; if (!f || !t) return '';
      const e = (a.k - a.e) / a.n; const cls = a.n < 3 ? 'neu' : e >= 0.25 ? 'good' : e < 0 ? 'bad' : 'neu';
      return '<line class="ar ' + cls + '" x1="' + f[0] + '" y1="' + f[1] + '" x2="' + t[0] + '" y2="' + t[1] + '" stroke-width="' + (0.8 + 2.4 * a.n / maxN).toFixed(1) + '" marker-end="url(#ah-' + cls + ')"><title>' + a.z + ' → ' + a.ze + ': ' + a.n + ' Angriffe, ' + a.k + ' Kills, ' + a.e + ' Fehler oder geblockt</title></line>';
    }).join('');
    const mk = (id) => '<marker id="ah-' + id + '" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L8 4L0 8z" class="ah ' + id + '"/></marker>';
    const labels = (xy) => Object.keys(xy).map((z) => '<text x="' + xy[z][0] + '" y="' + (xy[z][1] + 4) + '" class="zl">' + z + '</text>').join('');
    // Unterbrochene Verlängerung der Angriffslinie wie auf dem Hallenboden
    const dash = (y) => [0, 1, 2].map((i) => '<line x1="' + (8 - 3.6 - i * 6.4) + '" y1="' + y + '" x2="' + (8 - 0.9 - i * 6.4) + '" y2="' + y + '" class="m3"/><line x1="' + (172 + 0.9 + i * 6.4) + '" y1="' + y + '" x2="' + (172 + 3.6 + i * 6.4) + '" y2="' + y + '" class="m3"/>').join('');
    return '<svg class="armap" viewBox="-14 0 208 344" role="img" aria-label="Angriffsrichtungen auf dem Spielfeld"><defs>' + mk('good') + mk('bad') + mk('neu') + '</defs>' +
      '<rect x="8" y="8" width="164" height="328" class="fld"/><line x1="8" y1="117.3" x2="172" y2="117.3" class="m3"/><line x1="8" y1="226.7" x2="172" y2="226.7" class="m3"/>' + dash(117.3) + dash(226.7) +
      '<line x1="-6" y1="172" x2="186" y2="172" class="netl"/>' + labels(OPP_XY) + labels(OWN_XY) + lines + '</svg>';
  }
  function dirTable(P) {
    const order = ['Linie', 'Diagonale', 'Kurz', 'Mitte', 'Schräg', 'Ohne Start'];
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Richtung</th><th>n</th><th>Kills</th><th title="Fehler und geblockt">Fehl.</th><th>Eff</th></tr></thead><tbody>' +
      order.filter((d) => P.dirs[d]).map((d) => { const b = P.dirs[d]; return '<tr><th scope="row">' + d + '</th><td>' + b.n + '</td><td>' + b.k + '</td><td>' + b.e + '</td><td>' + val(eff((b.k - b.e) / b.n), b.n) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }
  function attackHtml(R, fixedPid) {
    const ids = Object.keys(R.att.players).filter((k) => k !== '_all').sort((a, b) => R.att.players[b].n - R.att.players[a].n);
    if (!R.att.withZone || (fixedPid && !R.att.players[fixedPid])) return '';
    const cur = fixedPid || (S.ui.zPlayer && R.att.players[S.ui.zPlayer] ? S.ui.zPlayer : '_all');
    const P = R.att.players[cur];
    return '<section class="card' + (fixedPid ? ' span2' : '') + '"><div class="card-h"><h2>Angriffsrichtung</h2>' + (fixedPid ? '' : V.selectHtml('zPlayer', [['_all', 'Alle Angreifer']].concat(ids.map((id) => [id, V.pLabel(id)])), cur, 'aria-label="Angreifer wählen"')) + '</div>' +
      '<div class="zatt">' + arrowMap(P) + dirTable(P) + '</div><div class="legend"><span><i class="sw" style="background:var(--us)"></i>Effizienz ab +25 %</span><span><i class="sw" style="background:var(--bad)"></i>negativ</span><span><i class="sw" style="background:var(--g3)"></i>dazwischen oder unter 3 Angriffe</span></div>' +
      (fixedPid ? '<p class="small muted">Datenbasis: ' + P.n + ' Angriffe mit Richtung.</p>' : basis(R.att.withZone, R.att.total, 'Angriffen mit Richtung')) + '</section>';
  }
  function defenseHtml(R) {
    if (!R.opp.withZone) return '';
    const hit = (z) => R.opp.land[z] || { n: 0, w: 0 };
    return '<section class="card"><div class="card-h"><h2>Wo die Gegnerbälle landen</h2></div>' +
      heat(OWN_GRID, (z) => hit(z).n, (z) => { const b = hit(z); const dig = R.dig.zone[z]; return b.n ? b.n + (dig ? ' · Abwehr ' + pct(dig.w / dig.n) : '') : ''; }, 'Landezonen in unserer Hälfte') +
      '<p class="small muted">Netz oben. ' + R.opp.withZone + ' Bälle mit Zone, davon ' + Object.values(R.opp.land).reduce((s, b) => s + b.w, 0) + ' Punkte des Gegners ohne Berührung.</p></section>';
  }
  function recHtml(R) {
    if (!Object.keys(R.rec.zone).length) return '';
    return '<section class="card"><div class="card-h"><h2>Annahme nach Zone</h2></div>' + heat(OWN_SIX, (z) => (R.rec.zone[z] || {}).n || 0, (z) => { const b = R.rec.zone[z]; return b ? 'Ø ' + num(b.sum / b.n, 2) + ' · ' + b.n : ''; }, 'Annahmeschnitt je Zone') + '</section>';
  }
  function setterHtml(R) {
    if (R.set.all.n < 5) return '';
    const row = (lab, b) => '<tr><th scope="row">' + lab + '</th><td>' + b.n + '</td>' + ['4', 'M', '2', 'H'].map((k) => '<td>' + (b.n ? val(pct(b[k] / b.n), b.n) : '–') + '</td>').join('') + '</tr>';
    return '<section class="card"><div class="card-h"><h2>Zuspiel-Verteilung</h2><span class="muted small">abgeleitet aus dem Angreifer</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Situation</th><th>n</th><th>auf 4</th><th>Mitte</th><th>auf 2</th><th>hinten</th></tr></thead><tbody>' +
      row('Nach Annahme, gesamt', R.set.side) + row('Annahme 3', R.set.byRec['#']) + row('Annahme 2', R.set.byRec['+']) + row('Annahme 1', R.set.byRec['-']) +
      row('Konter nach Abwehr 3', R.set.byDig['#']) + row('Konter nach Abwehr 2', R.set.byDig['+']) + row('Konter nach Abwehr 1', R.set.byDig['-']) + '</tbody></table></div>' +
      '<p class="small muted">Stimmt nur mit Rollen im Kader und eingetragener Aufstellung. Graue Werte: unter ' + MIN_N + ' Fällen, eher Zufall.</p></section>';
  }
  function patternsHtml(R) {
    const p = patterns(R); if (!p.length) return '';
    return '<section class="card span2 hero-card"><div class="card-h"><h2>Auffällige Muster</h2><span class="muted small">große Unterschiede, gut belegt</span></div><ul class="notes">' + p.slice(0, 5).map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></section>';
  }
  HOOK.zonesHtml = (g) => {
    const R = compute([g]);
    const parts = patternsHtml(R) + serveHtml(R) + attackHtml(R) + defenseHtml(R) + recHtml(R) + setterHtml(R);
    const noteOne = '<p class="small muted">Ein einzelnes Spiel zeigt oft Zufall. Belastbarer wird es über mehrere Spiele in der Übersicht.</p>';
    if (!parts) return V.emptyState('Noch keine Zonen', g.minimal ? 'Dieses Spiel lief im Minimal-Modus.' : 'In diesem Spiel wurden keine Zonen erfasst. In der Detailrunde trägst du sie nach.', g.minimal ? '' : '<a class="btn primary" href="#details-' + g.id + '">Details ergänzen</a>');
    return noteOne + '<div class="dash">' + parts + '</div>';
  };
  document.addEventListener('change', (e) => { if (e.target.id === 'zPlayer') { S.ui.zPlayer = e.target.value; V.render(); } });
  HOOK.gameButtons = (g) => (g.minimal ? '' : '<a class="btn" href="#details-' + g.id + '">Details ergänzen</a>');

  /* Saison-Auswertung auf der Übersicht und im Spielerprofil */
  HOOK.afterRenderZones = (view) => {
    if (S.route === 'uebersicht' && !S.id) {
      const games = V.filteredGames(); if (!games.length) return;
      const R = compute(games);
      const html = patternsHtml(R) + serveHtml(R) + attackHtml(R) + defenseHtml(R) + setterHtml(R);
      if (html) { const box = document.createElement('div'); box.className = 'dash mt'; box.innerHTML = html; view.appendChild(box); }
    } else if (S.route === 'spieler' && S.id) {
      const dash = $('.dash', view); if (!dash) return;
      const html = attackHtml(compute(V.filteredGames()), S.id);
      if (html) dash.insertAdjacentHTML('beforeend', html);
    }
  };

  /* ---------------------------------------------------------- Detailrunde */
  const DR = { gameId: null, sk: 'A', pid: '', cur: null };
  const DR_KINDS = [['A', 'Angriffe'], ['S', 'Aufschläge'], ['O', 'Gegnerpunkte'], ['D', 'Abwehr'], ['R', 'Annahmen']];
  function drItems(g) {
    return g.events.filter((e) => {
      if (DR.sk === 'O') return e.k === 'opp' && e.r === 'pt';
      return e.k === 'a' && e.sk === DR.sk && (!DR.pid || e.p === DR.pid);
    });
  }
  function drPane(g) {
    const pane = $('#dr-pane'); if (!pane) return;
    const all = drItems(g); const open = all.filter((e) => !e.ze);
    if (!DR.cur || !open.some((e) => e.id === DR.cur)) DR.cur = open.length ? open[0].id : null;
    const e = open.find((x) => x.id === DR.cur);
    const vid = V.video && V.video.VID;
    if (e && DR.seekedFor !== e.id && vid && vid.el && vid.gameId === g.id) { DR.seekedFor = e.id; seekTo(g, e); }
    const done = all.length - open.length;
    let h = '<div class="dr-prog"><b>' + done + ' von ' + all.length + '</b> <span class="muted">mit Zone</span><div class="seg"><span class="g5" style="width:' + (all.length ? done / all.length * 100 : 0) + '%"></span></div></div>';
    if (!all.length) h += '<p class="muted">In dieser Auswahl gibt es keine Aktionen.</p>';
    else if (!e) h += '<div class="okmsg"><b>Fertig.</b> Alle Aktionen dieser Auswahl haben eine Zone.</div><div class="row"><a class="btn primary" href="#spiel-' + g.id + '">Zum Spielbericht</a></div>';
    else {
      const a = V.analysis(g); const i = g.events.indexOf(e); const inf = a.evInfo[i] || {};
      const cells = gridFor(e);
      const opp = cells[0] === 1;
      h += '<p class="dr-now"><span class="muted">Satz ' + (inf.set || '?') + ' · ' + (inf.before || [0, 0]).join(':') + (e.v !== undefined ? ' · ' + C.hms(e.v) : '') + '</span><br><b>' + esc(e.k === 'opp' ? 'Gegnerpunkt' : V.pLabel(e.p) + ' · ' + C.SKILL[e.sk].label + ' ' + C.GL[e.sk][e.g]) + '</b></p>' +
        '<p class="small muted">' + (opp ? 'Gegnerhälfte, Netz unten.' : 'Unsere Hälfte, Netz oben.') + ' Die Zahlentasten gehen auch.' + '</p>' +
        zoneGridHtml(cells, null, 'drzone', true) +
        '<div class="row end"><button class="btn ghost small" data-act="drseek">Szene wiederholen</button><button class="btn small" data-act="drskip">Überspringen</button></div>';
    }
    pane.innerHTML = h;
  }
  function seekTo(g, e) {
    const vid = V.video && V.video.VID;
    if (!e || e.v === undefined || !vid || !vid.el || vid.gameId !== g.id) return;
    vid.el.currentTime = Math.max(0, e.v - 3); vid.el.play().catch(() => {});
  }
  V.VIEWS.details = function (view) {
    const g = V.gameById(S.id);
    if (!g) { view.innerHTML = V.emptyState('Spiel nicht gefunden', '', '<a class="btn" href="#spiele">Zu den Spielen</a>'); return; }
    if (view.dataset.dr === g.id && $('#dr-pane', view)) { drPane(g); return; }
    view.dataset.dr = g.id; DR.gameId = g.id; DR.cur = null;
    const roster = g.roster && g.roster.length ? g.roster : [];
    const hasV = g.videoFile && g.events.some((e) => e.v !== undefined);
    view.innerHTML = '<a href="#spiel-' + g.id + '" class="back">' + ICON.chev + ' Spielbericht</a><div class="page-h"><div><h1>Details ergänzen</h1><p class="muted">' + esc(g.opponent) + ' · ' + V.fmtDate(g.date) + '. Video läuft, Zone antippen, weiter.</p></div></div>' +
      '<div class="filters">' + V.selectHtml('drKind', DR_KINDS, DR.sk, 'aria-label="Aktion"') + V.selectHtml('drPid', [['', 'Alle Spieler']].concat(roster.map((id) => [id, V.pLabel(id)])), DR.pid, 'aria-label="Spieler"') + '</div>' +
      '<div class="dr">' + (g.videoFile ? '<div id="vp-slot"></div>' : '') + '<section class="card" id="dr-pane"></section></div>' +
      (!hasV ? '<p class="small muted mt">Dieses Spiel hat keine Video-Zeitstempel, die Szenen lassen sich nicht anspringen. Die Zonen kannst du trotzdem eintragen.</p>' : '');
    drPane(g);
  };
  document.addEventListener('change', (e) => {
    if (S.route !== 'details') return;
    if (e.target.id === 'drKind') DR.sk = e.target.value; else if (e.target.id === 'drPid') DR.pid = e.target.value; else return;
    DR.cur = null; const g = V.gameById(S.id); if (g) drPane(g);
  });
  function drSet(z) {
    const g = V.gameById(S.id); if (!g) return;
    const e = g.events.find((x) => x.id === DR.cur); if (!e) return;
    if (!gridFor(e).includes(z)) return;
    e.ze = z; Store.saveGame(g); DR.cur = null; drPane(g);
  }
  ACT.drzone = (t) => drSet(+t.dataset.z);
  ACT.drskip = () => {
    const g = V.gameById(S.id); if (!g) return;
    const open = drItems(g).filter((e) => !e.ze); const i = open.findIndex((e) => e.id === DR.cur);
    const nx = open[(i + 1) % open.length]; DR.cur = nx ? nx.id : null; drPane(g);
  };
  ACT.drseek = () => { const g = V.gameById(S.id); if (g) seekTo(g, g.events.find((e) => e.id === DR.cur)); };
  document.addEventListener('keydown', (e) => {
    if (!/^[1-9]$/.test(e.key) || e.metaKey || e.ctrlKey || document.querySelector('.modal-wrap')) return;
    const a = document.activeElement; if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT')) return;
    if (S.route === 'details') drSet(+e.key);
    else if (S.route === 'live') { const g = V.liveGame(); if (g && anyBlock(g) && panelGrid(g).includes(+e.key)) setZone(g, +e.key); }
  });

  /* ---------------------------------------------------------- Einstellungen */
  HOOK.settingsExtra = () => {
    const d = S.settings.detail || { level: 'einfach', custom: {} };
    return '<section class="card mt" id="detailCard"><h2>Detailstufe</h2><p class="small muted">Gilt als Vorschlag für neue Spiele. Zusatzfelder sind nie Pflicht: Wer sie auslässt, scoutet einfach die nächste Aktion.</p>' +
      '<label>Standard für neue Spiele' + V.selectHtml('dtLevel', HOOK.detailLevels(), d.level) + '</label>' +
      '<fieldset' + (d.level === 'eigen' ? '' : ' hidden') + '><legend>Baukasten</legend>' + BLOCKS.map(([k, l, q]) => '<label class="tg"><input type="checkbox" data-dt="' + k + '"' + ((d.custom || {})[k] ? ' checked' : '') + '> <span><b>' + l + '</b> <small class="muted">' + q + '</small></span></label>').join('') + '</fieldset>' +
      '<p class="small muted">Minimal zählt Punkte, Side-out, Break und Rotationen, aber keine Quoten für Annahme oder Angriff.</p></section>';
  };
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'dtLevel') { S.settings.detail = Object.assign({ custom: {} }, S.settings.detail, { level: t.value }); Store.saveSettings(); V.render(); }
    else if (t.dataset && t.dataset.dt) { const d = S.settings.detail || (S.settings.detail = { level: 'eigen', custom: {} }); d.custom = d.custom || {}; if (t.checked) d.custom[t.dataset.dt] = 1; else delete d.custom[t.dataset.dt]; Store.saveSettings(); }
  });

  /* Beispieldaten zeigen auch die Zonen-Auswertungen */
  const demoOrig = C.demoGames;
  C.demoGames = function () {
    const games = demoOrig(); const rnd = C.rng32(4711);
    const pick = (list) => { let r = rnd(); for (const [z, w] of list) { r -= w; if (r <= 0) return z; } return list[0][0]; };
    games.forEach((g) => {
      g.detail = PRESET.standard;
      (g.events || []).forEach((e) => {
        if (e.k === 'a' && e.sk === 'S' && e.g !== '=') e.ze = pick([[1, .42], [6, .2], [5, .3], [2, .05], [4, .03]]);
        else if (e.k === 'a' && e.sk === 'A' && e.g !== '=' ) e.ze = pick([[5, .3], [1, .22], [6, .18], [4, .12], [2, .08], [8, .1]]);
        else if (e.k === 'a' && e.sk === 'D') e.ze = pick([[5, .34], [6, .3], [1, .24], [7, .12]]);
      });
    });
    return games;
  };

  HOOK.afterMountZones = () => { if (S.route === 'details') { const g = V.gameById(S.id); if (g && $('#dr-pane')) drPane(g); } };
  V.zones = { compute, patterns, startZone, direction, PRESET };
})();

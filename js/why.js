/* Volleyball Scouting – Zusammenhänge: nicht „wie viele Asse“, sondern auf wen, in welcher Situation und nach welchem Ballwechsel */
(function () {
  'use strict';
  const V = window.VST, C = V.C, S = V.S, ACT = V.ACT, HOOK = V.HOOK, esc = V.esc, pct = V.pct, eff = V.eff, num = V.num;
  const MIN_N = 8;      // darunter wird eine Zeile grau und nie als Muster gemeldet
  const MIN_GAP = 0.08; // kleinere Unterschiede sind für die Halle egal
  const ROT_ORDER = [1, 6, 5, 4, 3, 2];
  const L = C.WHY_L;

  /* ---------------------------------------------------------- Rotation als kleines Feld */
  /** Netz oben, Reihenfolge IV III II / V VI I, der Läufer ist markiert */
  function rotGlyph(rot) {
    if (!rot) return '';
    const XY = { 4: [0, 0], 3: [1, 0], 2: [2, 0], 5: [0, 1], 6: [1, 1], 1: [2, 1] };
    const cells = Object.keys(XY).map((p) => '<rect x="' + (XY[p][0] * 6 + 1) + '" y="' + (XY[p][1] * 6 + 2) + '" width="5" height="5" class="' + (+p === rot ? 'on' : '') + '"/>').join('');
    return '<svg class="rg" viewBox="0 0 20 15" width="20" height="15" role="img" aria-label="Läufer auf ' + C.POS[rot - 1] + '"><title>Läufer auf ' + C.POS[rot - 1] + '</title><line x1="0" y1="0.75" x2="20" y2="0.75" class="n"/>' + cells + '</svg>';
  }
  HOOK.rotGlyph = rotGlyph;

  /* ---------------------------------------------------------- Daten */
  function collect(games) {
    const rec = [], act = [];
    games.forEach((g) => {
      if (g.source === 'import' || !Array.isArray(g.events)) return;
      const rs = C.rallyRecords(g, V.analysis(g)); rs.forEach((x) => { x.g = g; }); rec.push.apply(rec, rs);
      act.push.apply(act, C.actionRecords(g, rs));
    });
    return { rec, act };
  }
  const firstOf = (it, sk) => { for (const i of it.r.ev) { const e = it.g.events[i]; if (e && e.k === 'a' && e.sk === sk) return e; } return null; };
  const actions = (sk) => (D) => D.act.filter((x) => x.e.sk === sk);
  const attZone = (x) => { const r = (V.player(x.e.p) || {}).role; return V.zones.setClass(x.e.z || V.zones.startZone(x.e.p, x.rec.r.lu, r)); };
  const ATT_L = { 4: 'Position 4', M: 'Mitte', 2: 'Position 2', H: 'Hinterfeld' };
  const RG = { '#': '3', '+': '2', '-': '1', '=': 'Fehler' }; const SG = { '#': 'Ass', '+': '3', '0': '2', '-': '1', '=': 'Fehler' };
  const zoneOf = (x) => (x.e.ze ? C.serveZone(x.e.ze) : null);
  const who = (x) => x.e.p || null;
  const ctx = (x) => x.rec || x;

  /* Jede Kennzahl: welche Fälle zählen (Bezugsmenge), was ist ein Treffer, nach welchen Merkmalen aufschlüsseln */
  const METRICS = [
    { k: 'aceOpp', l: 'Asse gegen uns', base: 'Annahmen', src: actions('R'), hit: (x) => x.e.g === '=', who: 'Auf wen', zone: 'In welche Zone', bad: true },
    { k: 'aceOwn', l: 'Unsere Asse', base: 'Aufschläge', src: actions('S'), hit: (x) => x.e.g === '#', who: 'Von wem', zone: 'Auf welche Zone', note: 'Gegnerische Annehmer werden nicht erfasst. Die Zielzone zeigt, wohin gezielt wurde.' },
    { k: 'srvErr', l: 'Aufschlagfehler', base: 'Aufschläge', src: actions('S'), hit: (x) => x.e.g === '=', who: 'Von wem', bad: true },
    { k: 'attErr', l: 'Angriffsfehler & geblockt', base: 'Angriffe', src: actions('A'), hit: (x) => x.e.g === '=' || x.e.g === '/', who: 'Von wem', att: 1, bad: true },
    { k: 'kill', l: 'Kills', base: 'Angriffe', src: actions('A'), hit: (x) => x.e.g === '#', who: 'Von wem', att: 1 },
    { k: 'digErr', l: 'Abwehr nicht gehalten', base: 'Abwehraktionen', src: actions('D'), hit: (x) => x.e.g === '=', who: 'Bei wem', zone: 'In welcher Zone', bad: true },
    { k: 'soLost', l: 'Side-out verloren', base: 'Annahme-Ballwechsel', src: (D) => D.rec.filter((r) => r.srv === 't'), hit: (r) => r.w === 't', bad: true,
      extra: ['Nach welcher Annahme', (r) => { const e = firstOf(r, 'R'); return e ? e.g : null; }, (k) => 'Annahme ' + RG[k]], rallyWho: ['Annehmer', 'R'] },
    { k: 'bpWon', l: 'Breakpunkte', base: 'Aufschlag-Ballwechsel', src: (D) => D.rec.filter((r) => r.srv === 'u'), hit: (r) => r.w === 'u',
      extra: ['Nach welchem Aufschlag', (r) => { const e = firstOf(r, 'S'); return e ? e.g : null; }, (k) => 'Aufschlag ' + SG[k]], rallyWho: ['Aufschläger', 'S'] },
  ];
  const ctxDims = [
    ['rot', 'In welcher Rotation', (x) => ctx(x).rot || null, (k) => 'Läufer auf ' + C.POS[k - 1], ROT_ORDER, (k) => rotGlyph(k) + ' '],
    ['phase', 'Spielphase', (x) => ctx(x).phase, (k) => L.phase[k], ['start', 'mid', 'crunch']],
    ['diff', 'Spielstand', (x) => ctx(x).diff, (k) => L.diff[k], ['ahead', 'close', 'behind']],
    ['prev', 'Ballwechsel davor', (x) => (ctx(x).prev === 'first' ? null : ctx(x).prev), (k) => L.prev[k]],
    ['mom', 'Direkt davor', (x) => ctx(x).mom, (k) => L.mom[k], ['first', 'tou', 'tot', 'sub', 'runu', 'runt', 'even']],
  ];
  function dimsFor(M) {
    const d = [];
    if (M.who) d.push(['who', M.who, who, (k) => V.pLabel(k)]);
    if (M.rallyWho) d.push(['who', M.rallyWho[0], (r) => { const e = firstOf(r, M.rallyWho[1]); return e ? e.p || null : null; }, (k) => V.pLabel(k)]);
    if (M.zone) d.push(['zone', M.zone, zoneOf, (k) => 'Zone ' + k, M.k === 'aceOwn' ? V.zones.OPP_SIX : V.zones.OWN_SIX]);
    if (M.att) { d.push(['att', 'Von welcher Position', attZone, (k) => ATT_L[k], ['4', 'M', '2', 'H']]); d.push(['touch', 'Nach welcher Vorstufe', (x) => x.touch, (k) => L.touch[k], Object.keys(L.touch)]); }
    if (M.extra) d.push(['extra', M.extra[0], M.extra[1], M.extra[2], ['#', '+', '0', '-', '=']]);
    return d.concat(ctxDims);
  }
  /** Rechnet eine Kennzahl über alle Merkmale aus, inklusive der Zeilen, die sich deutlich vom Rest abheben */
  function analyse(M, D) {
    const items = M.src(D); const n = items.length; const h = items.filter(M.hit).length;
    const dims = dimsFor(M).map((d) => {
      const [key, title, fn, label, order, deco] = d;
      let rows = C.groupRate(items, fn, M.hit);
      const nDim = rows.reduce((s, b) => s + b.n, 0), hDim = rows.reduce((s, b) => s + b.h, 0);
      rows.forEach((b) => {
        const restN = nDim - b.n, restH = hDim - b.h;
        b.label = label(b.k); b.rate = b.h / b.n; b.rest = restN ? restH / restN : null; b.dim = key; b.deco = deco ? deco(b.k) : '';
        b.hot = b.n >= MIN_N && restN >= MIN_N && b.rest !== null && Math.abs(b.rate - b.rest) >= MIN_GAP && C.sigDiff(b.h, b.n, restH, restN);
      });
      if (order) rows.sort((a, b) => order.map(String).indexOf(String(a.k)) - order.map(String).indexOf(String(b.k)));
      else rows.sort((a, b) => b.h - a.h || b.n - a.n);
      return { key, title, rows, nDim };
    }).filter((x) => x.rows.length);
    const hot = [];
    dims.forEach((d) => d.rows.forEach((b) => { if (b.hot) hot.push({ d, b }); }));
    hot.sort((a, b) => Math.abs(b.b.rate - b.b.rest) - Math.abs(a.b.rate - a.b.rest));
    return { n, h, dims, hot };
  }

  /* ---------------------------------------------------------- Darstellung */
  const sentence = (M, x) => esc(x.d.title) + ': <b>' + x.b.deco + esc(x.b.label) + '</b> ' + x.b.h + ' von ' + x.b.n + ' (' + pct(x.b.rate) + '), sonst ' + pct(x.b.rest) + '.';
  function rowHtml(M, b, base, sel) {
    const low = b.n < MIN_N; const max = Math.max(0.01, base * 2.2, b.rate);
    return '<tr class="why-r' + (b.hot ? (b.rate > b.rest === !!M.bad ? ' hot-bad' : ' hot-good') : '') + (sel ? ' on' : '') + (low ? ' low' : '') + '" data-act="whyrow" data-d="' + b.dim + '" data-k="' + esc(String(b.k)) + '" tabindex="0"><th scope="row">' + b.deco + esc(b.label) + '</th>' +
      '<td class="why-c">' + b.h + '<small>/' + b.n + '</small></td><td class="why-p">' + pct(b.rate) + '</td>' +
      '<td class="why-b"><span class="wb"><i style="width:' + Math.min(100, b.rate / max * 100) + '%"></i><u style="left:' + Math.min(100, base / max * 100) + '%"></u></span></td></tr>';
  }
  function scenesHtml(M, D, st) {
    const dim = D.dims.find((d) => d.key === st.d); const b = dim && dim.rows.find((x) => String(x.k) === String(st.k)); if (!b) return '';
    const hits = b.items.filter(M.hit);
    return '<div class="why-sc"><div class="card-h"><h3>' + b.deco + esc(b.label) + ' <span class="muted">· ' + hits.length + ' ' + esc(M.l) + '</span></h3><button class="link small" data-act="whyrow" data-d="" data-k="">Schließen</button></div>' +
      (hits.length ? '<ol class="why-l">' + hits.slice(0, 40).map((x) => {
        const r = ctx(x); const g = r.g; const e = x.e || firstOf(r, 'A') || null; const last = g.events[r.r.end];
        const t = e && e.v !== undefined ? e.v : last && last.v;
        const showOpp = S.route !== 'spiel';
        return '<li><a href="#video-' + g.id + '" data-act="whygo" data-gid="' + g.id + '" data-idx="' + r.r.idx + '" title="Im Video-Arbeitsplatz öffnen">' +
          (showOpp ? '<span class="why-o">' + esc(g.opponent || '') + '</span>' : '') + '<span class="why-s">S' + r.set + ' ' + r.before.join(':') + '</span>' + rotGlyph(r.rot) +
          '<code class="evc-code">' + r.r.ev.map((i) => esc(V.evCode(g.events[i]))).filter(Boolean).join(' ') + '</code><span class="muted small">davor: ' + esc(L.prev[r.prev] || '') + '</span>' + (t !== undefined ? '<span class="why-tm">' + C.hms(t) + '</span>' : '') + '</a></li>';
      }).join('') + '</ol>' + (hits.length > 40 ? '<p class="small muted">Die ersten 40 von ' + hits.length + '.</p>' : '') : '<p class="muted small">Keine Fälle in dieser Zeile.</p>') + '</div>';
  }
  HOOK.whyHtml = (games, compact) => {
    const st = S.ui.why || (S.ui.why = { m: 'aceOpp', d: '', k: '' });
    const D = collect(games);
    if (!D.act.length && !D.rec.length) return compact ? '' : V.emptyState('Noch keine Ballwechsel', 'Sobald Aktionen gescoutet sind, zeigt diese Seite die Zusammenhänge.');
    const M = METRICS.find((x) => x.k === st.m) || METRICS[0];
    const A = analyse(M, D); const base = A.n ? A.h / A.n : 0;
    const tabs = '<div class="why-m" role="group" aria-label="Was erklären?">' + METRICS.map((x) => '<button class="' + (x.k === M.k ? 'on' : '') + '" data-act="whym" data-v="' + x.k + '">' + esc(x.l) + '</button>').join('') + '</div>';
    const head = '<p class="why-sum"><b>' + A.h + ' ' + esc(M.l) + '</b> aus ' + A.n + ' ' + esc(M.base) + (A.n ? ' · ' + pct(base) : '') + '</p>';
    const facts = A.n < MIN_N * 2 ? '<p class="muted small">Noch zu wenige Fälle für eine Aussage. Die Tabellen zeigen trotzdem schon, was passiert ist.</p>'
      : A.hot.length ? '<ul class="why-f">' + A.hot.slice(0, 4).map((x) => '<li class="' + ((x.b.rate > x.b.rest) === !!M.bad ? 'b' : 'g') + '">' + sentence(M, x) + '</li>').join('') + '</ul>'
        : '<p class="muted small">Kein Merkmal hebt sich deutlich ab. Diese Fälle verteilen sich so gleichmäßig, wie es auch Zufall täte.</p>';
    const tables = A.dims.map((d) => '<table class="tbl why-t"><thead><tr><th>' + esc(d.title) + '</th><th>' + esc(M.l.split(' ')[0]) + '/' + esc(M.base.split('-')[0].slice(0, 9)) + '</th><th>%</th><th><span class="sr">Balken, Strich = Schnitt</span></th></tr></thead><tbody>' + d.rows.map((b) => rowHtml(M, b, base, st.d === d.key && String(st.k) === String(b.k))).join('') + '</tbody>' +
      (d.nDim < A.n ? '<caption class="why-cap">' + d.nDim + ' von ' + A.n + ' mit dieser Angabe</caption>' : '') + '</table>').join('');
    return '<section class="card span2 why" id="why"><div class="card-h"><h2>Warum?</h2><span class="muted small">Zeile anklicken zeigt die Szenen</span></div>' + tabs + head + facts + (st.d ? scenesHtml(M, A, st) : '') +
      '<div class="why-g">' + tables + '</div><p class="small muted">Strich im Balken = Schnitt aller ' + esc(M.base) + '. Grau: unter ' + MIN_N + ' Fällen, eher Zufall. ' + (M.note ? esc(M.note) : '') + '</p></section>';
  };
  ACT.whym = (t) => { S.ui.why = { m: t.dataset.v, d: '', k: '' }; V.render(); };
  ACT.whyrow = (t) => { const st = S.ui.why; const same = st.d === t.dataset.d && st.k === t.dataset.k; st.d = same ? '' : t.dataset.d; st.k = same ? '' : t.dataset.k; V.render(); };
  ACT.whygo = (t) => { S.ui.rlFocus = { gid: t.dataset.gid, idx: +t.dataset.idx }; V.go('video', t.dataset.gid); };
  document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('why-r')) { e.preventDefault(); ACT.whyrow(e.target); } });

  /* ---------------------------------------------------------- Gruppierte Tabellen statt Kennzahl-Karten */
  const pm = (x) => (x > 0 ? '+' : '') + x;
  function chainHtml(D) {
    const so = D.rec.filter((r) => r.srv === 't'), br = D.rec.filter((r) => r.srv === 'u');
    if (!so.length && !br.length) return '';
    const bar = (v) => '<span class="wb"><i style="width:' + Math.round((v || 0) * 100) + '%"></i></span>';
    const rec = ['#', '+', '-', '='].map((g) => {
      const rows = so.filter((r) => r.r.firstR === g); const n = rows.length;
      const fb = rows.filter((r) => r.r.firstA === '#').length, w = rows.filter((r) => r.w === 'u').length;
      return n ? '<tr><th scope="row">' + (g === '=' ? 'Ass gegen uns' : 'Annahme ' + RG[g]) + '</th><td>' + n + '</td><td class="why-b">' + bar(n / so.length) + '</td><td>' + pct(n / so.length) + '</td><td>' + (g === '=' ? '·' : pct(fb / n)) + '</td><td>' + pct(w / n) + '</td></tr>' : '';
    }).join('');
    const srv = ['#', '+', '0', '-', '='].map((g) => {
      const rows = br.filter((r) => r.r.firstS === g); const n = rows.length; const w = rows.filter((r) => r.w === 'u').length;
      return n ? '<tr><th scope="row">Aufschlag ' + SG[g] + '</th><td>' + n + '</td><td class="why-b">' + bar(n / br.length) + '</td><td>' + pct(n / br.length) + '</td><td>·</td><td>' + pct(w / n) + '</td></tr>' : '';
    }).join('');
    const tot = (rows) => (rows.length ? pct(rows.filter((r) => r.w === 'u').length / rows.length) : '–');
    return '<section class="card"><div class="card-h"><h2>Vom ersten Ball zum Punkt</h2></div><div class="tbl-wrap"><table class="tbl chain"><thead><tr><th>Erster Kontakt</th><th>n</th><th></th><th>Anteil</th><th title="Direkt mit dem ersten Angriff gewonnen">Erstangr.</th><th>Punkt</th></tr></thead>' +
      '<tbody class="grp"><tr class="grp-h"><th colspan="5" scope="rowgroup">Gegner schlägt auf · Side-out</th><td>' + tot(so) + '</td></tr>' + rec + '</tbody>' +
      '<tbody class="grp"><tr class="grp-h"><th colspan="5" scope="rowgroup">Wir schlagen auf · Break</th><td>' + tot(br) + '</td></tr>' + srv + '</tbody></table></div></section>';
  }
  function rotTableHtml(D) {
    const has = D.rec.some((r) => r.rot); if (!has) return '';
    const row = (i) => {
      const rs = D.rec.filter((r) => r.rot === i);
      const so = rs.filter((r) => r.srv === 't'), br = rs.filter((r) => r.srv === 'u');
      const soW = so.filter((r) => r.w === 'u').length, brW = br.filter((r) => r.w === 'u').length;
      const acts = D.act.filter((x) => x.rec.rot === i);
      const rec = acts.filter((x) => x.e.sk === 'R'); const att = acts.filter((x) => x.e.sk === 'A');
      const rSum = rec.reduce((s, x) => s + ({ '#': 3, '+': 2, '-': 1 }[x.e.g] || 0), 0);
      const k = att.filter((x) => x.e.g === '#').length, e = att.filter((x) => x.e.g === '=' || x.e.g === '/').length;
      const d = soW + brW - (so.length - soW) - (br.length - brW);
      return { i, soN: so.length, soW, brN: br.length, brW, rs: rs.length, d, html: '<th scope="row">' + rotGlyph(i) + ' ' + C.POS[i - 1] + '</th><td>' + (so.length ? pct(soW / so.length) + ' <small class="muted">' + soW + '/' + so.length + '</small>' : '–') + '</td><td>' + (br.length ? pct(brW / br.length) + ' <small class="muted">' + brW + '/' + br.length + '</small>' : '–') + '</td><td class="' + (d > 0 ? 'c-us' : d < 0 ? 'c-them' : '') + '">' + pm(d) + '</td><td>' + (rec.length ? num(rSum / rec.length, 2) : '–') + '</td><td>' + rec.filter((x) => x.e.g === '=').length + '</td><td>' + (att.length ? eff((k - e) / att.length) : '–') + ' <small class="muted">' + att.length + '</small></td>' };
    };
    const rows = ROT_ORDER.map(row);
    const qual = rows.filter((x) => x.soN >= MIN_N); const worst = qual.length > 1 ? qual.reduce((a, b) => (b.soW / b.soN < a.soW / a.soN ? b : a)) : null;
    return '<section class="card"><div class="card-h"><h2>Rotationen</h2><span class="muted small">Side-out, Annahme und Angriff je Stellung</span></div><div class="tbl-wrap"><table class="tbl rotx"><thead><tr><th>Läufer</th><th>Side-out</th><th>Break</th><th>+/−</th><th>Ann. Ø</th><th title="Asse gegen uns">Asse g.</th><th>Angr. Eff</th></tr></thead><tbody>' +
      rows.map((x) => '<tr' + (worst && x.i === worst.i ? ' class="flag"' : '') + '>' + x.html + '</tr>').join('') + '</tbody></table></div>' + (worst ? '<p class="small muted">Markiert: schwächste Side-out-Rotation.</p>' : '') + '</section>';
  }
  function attTableHtml(D) {
    const att = D.act.filter((x) => x.e.sk === 'A'); if (!att.length) return '';
    const stat = (l) => { const n = l.length, k = l.filter((x) => x.e.g === '#').length, e = l.filter((x) => x.e.g === '=').length, b = l.filter((x) => x.e.g === '/').length; return { n, k, e, b, eff: n ? (k - e - b) / n : null }; };
    const known = att.filter((x) => attZone(x));
    const row = (z) => {
      const l = known.filter((x) => attZone(x) === z); if (!l.length) return '';
      const a = stat(l), so = stat(l.filter((x) => x.touch && x.touch[0] === 'R')), tr = stat(l.filter((x) => !x.touch || x.touch[0] !== 'R'));
      return '<tr><th scope="row">' + ATT_L[z] + '</th><td>' + a.n + '<small class="muted">/' + known.length + '</small></td><td>' + pct(a.n / known.length) + '</td><td>' + a.k + '</td><td>' + a.e + '</td><td>' + a.b + '</td><td>' + eff(a.eff) + '</td><td class="sep">' + (so.n ? eff(so.eff) + ' <small class="muted">' + so.n + '</small>' : '–') + '</td><td>' + (tr.n ? eff(tr.eff) + ' <small class="muted">' + tr.n + '</small>' : '–') + '</td></tr>';
    };
    return '<section class="card span2"><div class="card-h"><h2>Angriff nach Position</h2><span class="muted small">Anzahl mit Bezugsmenge, getrennt nach Side-out und Konter</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Position</th><th>Angriffe</th><th>Anteil</th><th>Kill</th><th>Fehl.</th><th>Blo</th><th>Eff</th><th class="sep">Eff Side-out</th><th>Eff Konter</th></tr></thead><tbody>' + ['4', 'M', '2', 'H'].map(row).join('') + '</tbody></table></div>' +
      (known.length < att.length ? '<p class="small muted">' + known.length + ' von ' + att.length + ' Angriffen zugeordnet. Der Rest hat keine Rolle im Kader.</p>' : '') + '</section>';
  }
  HOOK.linkedHtml = (games) => { const D = collect(games); return chainHtml(D) + rotTableHtml(D) + attTableHtml(D); };

  /* Startaufstellungen wie auf dem Spielberichtsbogen: Trikotnummern, Zuspieler invertiert */
  HOOK.lineupsHtml = (g) => {
    const sets = (g.events || []).filter((e) => e.k === 'set' && e.lu); if (!sets.length) return '';
    const no = (id) => { const p = V.player(id); return p && V.hasNo(p) ? String(p.num) : (V.pShort(id) || '?').slice(0, 2); };
    const a = V.analysis(g);
    return '<section class="card span2"><div class="card-h"><h2>Startaufstellungen</h2><span class="muted small">Netz oben, invertiert = Zuspieler, L = Libero</span></div><div class="lus">' + sets.map((e) => {
      const s = a.sets.find((x) => x.no === e.s) || {};
      const cells = [3, 2, 1, 4, 5, 0].map((i) => '<span class="' + (e.lu[i] === e.zsp ? 'zsp' : '') + '">' + esc(no(e.lu[i])) + '</span>').join('');
      return '<figure class="lu"><figcaption>Satz ' + esc(e.s) + (s.u !== undefined ? ' <b class="' + (s.w === 'u' ? 'c-us' : '') + '">' + s.u + ':' + s.t + '</b>' : '') + '</figcaption><div class="lu-c">' + cells + '</div>' + ((e.lib || []).length ? '<div class="lu-l"><i>L</i> ' + e.lib.map((id) => esc(no(id))).join(', ') + '</div>' : '') + '</figure>';
    }).join('') + '</div></section>';
  };
  V.why = { METRICS, analyse, collect };
})();

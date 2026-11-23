/* Volleyball Scouting – Video und Ballwechsel als ein Arbeitsplatz: links das Video, rechts die durchsuchbare Liste */
(function () {
  'use strict';
  const V = window.VST, C = V.C, S = V.S, ACT = V.ACT, HOOK = V.HOOK, $ = V.$, esc = V.esc;
  const RL = { q: '', set: '', pid: '', sk: '', w: '', open: null, gid: null, pending: null, last: null };

  /** Alle Ballwechsel eines Spiels, gescoutete und vom Schnitt gefundene, in zeitlicher Reihenfolge */
  function rowsOf(g) {
    const a = V.analysis(g); const cut = (g.cut && g.cut.rallies) || []; const used = new Set();
    const rows = a.rallies.map((r) => {
      const acts = r.ev.map((i) => ({ i, e: g.events[i] })).filter((x) => x.e);
      const fv = acts.find((x) => x.e.v !== undefined); const lv = acts.slice().reverse().find((x) => x.e.v !== undefined);
      let s = fv ? Math.max(0, fv.e.v - 3) : null, e = lv ? lv.e.v + 2 : null;
      if (fv) { const k = cut.findIndex((c) => fv.e.v >= c.s - 1 && fv.e.v <= c.e + 2); if (k >= 0) { used.add(k); s = cut[k].s; e = Math.max(e, cut[k].e); } }
      return { r, acts, s, e };
    });
    cut.forEach((c, k) => { if (!used.has(k)) rows.push({ un: true, s: c.s, e: c.e, acts: [], k }); });
    if (cut.length) { let t = 0; rows.forEach((x) => { if (x.s === null) x.s = t; else t = x.s; }); rows.sort((a1, b1) => a1.s - b1.s); }
    return rows;
  }
  /** Was die Suche findet: Satz, Stand, Rotation, Nummer, Name, Aktion, Zone */
  function hay(g, x) {
    if (x.un) return 'nicht gescoutet offen';
    const r = x.r;
    const parts = ['satz ' + r.set, 's' + r.set, r.before.join(':'), r.after.join(':'), r.w === 'u' ? 'punkt wir gewonnen' : 'punkt gegner verloren', r.srv === 'u' ? 'aufschlag wir break' : 'annahme sideout side-out'];
    if (r.rot) parts.push('rotation ' + C.POS[r.rot - 1], 'läufer ' + C.POS[r.rot - 1]);
    x.acts.forEach(({ e }) => {
      parts.push(V.evCode(e), V.describeEvent(e));
      if (e.k === 'a' && e.p) parts.push(V.pLabel(e.p));
      if (e.ze) parts.push('zone ' + e.ze, 'z' + e.ze);
      if (e.k === 'a' && e.sk === 'S' && e.g === '#') parts.push('ass');
      if (e.k === 'a' && e.sk === 'R' && e.g === '=') parts.push('ass gegen uns');
      if (e.k === 'a' && e.sk === 'A' && e.g === '#') parts.push('kill');
      if (e.k === 'a' && e.sk === 'A' && e.g === '/') parts.push('geblockt');
    });
    return parts.join(' ').toLowerCase();
  }
  function matches(g, x) {
    if (RL.set && (x.un || String(x.r.set) !== RL.set)) return false;
    if (RL.w && (x.un ? RL.w !== 'un' : x.r.w !== RL.w)) return false;
    if (RL.pid && !x.acts.some(({ e }) => e.p === RL.pid)) return false;
    if (RL.sk && !x.acts.some(({ e }) => e.k === 'a' && e.sk === RL.sk)) return false;
    const toks = RL.q.toLowerCase().split(/\s+/).filter(Boolean);
    if (toks.length) { const h = hay(g, x); return toks.every((t) => h.includes(t)); }
    return true;
  }
  function rowHtml(g, x, idx) {
    const time = x.s !== null && x.s !== undefined ? C.hms(x.s) : '';
    if (x.un) return '<li class="rl-r un" data-act="rlseek" data-t="' + x.s + '" data-idx="u' + x.k + '" data-e="' + x.e + '"><span class="rl-sc muted">·</span><span class="rl-m muted small">Noch nicht gescoutet</span><span class="rl-t">' + time + '</span></li>';
    const r = x.r; const open = RL.open === r.idx;
    const code = x.acts.map(({ e }) => esc(V.evCode(e))).filter(Boolean).join(' ');
    return '<li class="rl-r ' + (r.w === 'u' ? 'wu' : 'wt') + (open ? ' open' : '') + '" data-act="rlseek" data-t="' + (x.s === null ? '' : x.s) + '" data-idx="' + r.idx + '" data-e="' + (x.e === null ? '' : x.e) + '">' +
      '<span class="rl-sc"><i class="rl-srv ' + (r.srv === 'u' ? 'us' : '') + '" title="' + (r.srv === 'u' ? 'Aufschlag wir' : 'Aufschlag Gegner') + '"></i><b>' + r.after.join(':') + '</b></span>' + (HOOK.rotGlyph ? HOOK.rotGlyph(r.rot) : '') +
      '<code class="rl-m evc-code">' + (code || '–') + '</code><span class="rl-t">' + time + '</span>' +
      (open ? '<ol class="rl-acts">' + x.acts.map(({ e, i }) => '<li><button class="link" data-act="rlact" data-idx="' + r.idx + '" data-t="' + (e.v === undefined ? '' : Math.max(0, e.v - 3)) + '" data-i="' + i + '"><span>' + esc(V.describeEvent(e)) + (e.ze ? ' · Zone ' + e.ze : '') + '</span>' + (e.v !== undefined ? '<span class="rl-t">' + C.hms(e.v) + '</span>' : '') + '</button></li>').join('') + '</ol>' : '') + '</li>';
    void idx;
  }
  function drawList(g, box, countEl) {
    if (!box) return;
    const all = rowsOf(g); const show = all.filter((x) => matches(g, x));
    let set = null; let h = '';
    const a = V.analysis(g);
    show.forEach((x, i) => {
      if (!x.un && x.r.set !== set) { set = x.r.set; const s = a.sets.find((y) => y.no === set) || {}; h += '<li class="rl-set">Satz ' + set + (s.u !== undefined ? ' <span class="muted">' + s.u + ':' + s.t + '</span>' : '') + '</li>'; }
      h += rowHtml(g, x, i);
    });
    box.innerHTML = h || '<li class="rl-none muted small">' + (all.length ? 'Kein Ballwechsel passt zu dieser Suche.' : 'Noch keine Ballwechsel.') + '</li>';
    if (countEl) countEl.textContent = show.length === all.length ? all.length + ' Ballwechsel' : show.length + ' von ' + all.length;
    RL.last = null; follow(true);
  }
  function seek(g, t) {
    if (t === '' || t === null || t === undefined || isNaN(+t)) { V.toast('Für diesen Ballwechsel gibt es keine Video-Zeit. Sie entsteht beim Scouten aus dem Video.'); return; }
    if (!V.video.seek(g, +t)) { RL.pending = +t; V.toast('Öffne zuerst das Video, dann springt es an diese Stelle.'); }
  }
  const curGame = () => (S.route === 'video' ? V.gameById(S.id) : V.liveGame());
  const redraw = () => { const g = curGame(); if (g) drawList(g, $('#rlList'), $('#rlCount')); };
  ACT.rlseek = (t) => {
    const g = curGame(); if (!g) return;
    const idx = t.dataset.idx; if (idx && idx[0] !== 'u') RL.open = RL.open === +idx && S.route === 'video' ? RL.open : +idx;
    redraw(); seek(g, t.dataset.t);
  };
  ACT.rlact = (t) => { const g = curGame(); if (g) seek(g, t.dataset.t); };

  /** Die Zeile zum laufenden Bild hervorheben; die Liste läuft mit, die Seite bleibt stehen */
  function follow(force) {
    const box = $('#rlList'); const vid = V.video && V.video.VID; if (!box || !vid || !vid.el) return;
    const t = vid.el.currentTime; let cur = null;
    box.querySelectorAll('.rl-r').forEach((li) => { const s = +li.dataset.t, e = +li.dataset.e; if (li.dataset.t !== '' && t >= s && t <= (li.dataset.e === '' ? s + 15 : e)) cur = li; });
    const key = cur ? cur.dataset.idx : null;
    if (key === RL.last && !force) return;
    RL.last = key;
    box.querySelectorAll('.rl-r.on').forEach((li) => li.classList.remove('on'));
    if (cur) { cur.classList.add('on'); const bb = box.getBoundingClientRect(), cb = cur.getBoundingClientRect(); if (cb.top < bb.top || cb.bottom > bb.bottom) box.scrollTop += cb.top - bb.top - 40; }
  }
  setInterval(() => {
    const vid = V.video && V.video.VID; if (!$('#rlList') || !vid || !vid.el) return;
    const g = curGame();
    if (RL.pending !== null && g && vid.gameId === g.id && vid.el.readyState >= 1) { const t = RL.pending; RL.pending = null; V.video.seek(g, t); }
    follow();
  }, 250);

  function toolsHtml(g, compact) {
    const a = V.analysis(g);
    const ids = Array.from(new Set(g.events.filter((e) => e.k === 'a' && e.p).map((e) => e.p))).sort((x, y) => (+((V.player(x) || {}).num) || 999) - (+((V.player(y) || {}).num) || 999));
    const filters = compact ? '' : '<div class="rl-f">' + V.selectHtml('rlSet', [['', 'Alle Sätze']].concat(a.sets.map((s) => [String(s.no), 'Satz ' + s.no])), RL.set, 'aria-label="Satz"') +
      V.selectHtml('rlPid', [['', 'Alle Spieler']].concat(ids.map((id) => [id, V.pLabel(id)])), RL.pid, 'aria-label="Spieler"') +
      V.selectHtml('rlSk', [['', 'Alle Aktionen']].concat(['S', 'R', 'A', 'B', 'D', 'F'].map((k) => [k, C.SKILL[k].label])), RL.sk, 'aria-label="Aktion"') +
      V.selectHtml('rlW', [['', 'Alle Punkte'], ['u', 'Punkt für uns'], ['t', 'Punkt Gegner'], ['un', 'Nicht gescoutet']], RL.w, 'aria-label="Punkt"') + '</div>';
    return '<div class="card-h"><h2>Ballwechsel</h2><span class="muted small" id="rlCount"></span></div><input id="rlQ" type="search" placeholder="Suchen: #7 Kill, Ass, 20:18, Zone 5" value="' + esc(RL.q) + '" aria-label="Ballwechsel durchsuchen" autocomplete="off">' + filters + '<ol class="rl" id="rlList"></ol>';
  }
  V.VIEWS.video = function (view) {
    const g = V.gameById(S.id);
    if (!g) { view.innerHTML = V.emptyState('Spiel nicht gefunden', '', '<a class="btn" href="#spiele">Zu den Spielen</a>'); return; }
    if (RL.gid !== g.id) Object.assign(RL, { q: '', set: '', pid: '', sk: '', w: '', open: null, gid: g.id, pending: null });
    if (S.ui.rlFocus && S.ui.rlFocus.gid === g.id) { RL.open = S.ui.rlFocus.idx; }
    const focus = S.ui.rlFocus; S.ui.rlFocus = null;
    if (view.dataset.vw !== g.id || !$('#rlList', view)) {
      view.dataset.vw = g.id;
      const a = V.analysis(g);
      view.innerHTML = '<a href="#spiel-' + g.id + '" class="back">' + V.ICON.chev + ' Spielbericht</a><div class="page-h"><div><h1>Videoanalyse</h1><p class="muted">' + esc(g.opponent || 'Spiel') + ' · ' + V.fmtDate(g.date) + (a.sets.length ? ' · ' + a.sets.map((s) => s.u + ':' + s.t).join(' ') : '') + '</p></div></div>' +
        '<div class="vws"><div class="vws-v">' + (g.demo ? '<div class="card vp-pick"><h2>Beispielspiel ohne Video</h2><p class="small">Bei euren eigenen Spielen läuft hier das Video. Ein Klick auf einen Ballwechsel oder eine Aktion springt zur passenden Stelle.</p></div>' : '<div id="vp-slot"></div>') + '</div><aside class="card vws-l">' + toolsHtml(g) + '</aside></div>';
    }
    drawList(g, $('#rlList', view), $('#rlCount', view));
    if (focus) {
      const li = view.querySelector('.rl-r.open'); if (li) { const box = $('#rlList', view); box.scrollTop += li.getBoundingClientRect().top - box.getBoundingClientRect().top - 40; if (li.dataset.t !== '') RL.pending = +li.dataset.t; }
    }
  };
  /* Beim Scouten: dieselbe Liste kompakt neben dem Protokoll */
  HOOK.liveRallies = (g) => {
    const el = $('#lv-rl'); if (!el) return;
    if (!$('#rlList', el)) el.innerHTML = toolsHtml(g, true);
    drawList(g, $('#rlList', el), $('#rlCount', el));
  };
  document.addEventListener('input', (e) => { if (e.target.id === 'rlQ') { RL.q = e.target.value; redraw(); } });
  document.addEventListener('change', (e) => {
    const k = { rlSet: 'set', rlPid: 'pid', rlSk: 'sk', rlW: 'w' }[e.target.id]; if (!k) return;
    RL[k] = e.target.value; redraw();
  });
  V.workspace = { rowsOf, matches, RL };
})();

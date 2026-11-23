/* Volleyball Scouting – Kernlogik
   Datenmodell, Spielablauf (Punkte, Aufschlag, Rotation), Statistik, Trainingsfokus, Sprach-/Textparser.
   Läuft im Browser (window.VCore) und in Node (module.exports) für Tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.VCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ Katalog */
  const SKILL_ORDER = ['S', 'R', 'A', 'B', 'D', 'F'];
  const SKILL = {
    S: { label: 'Aufschlag', grades: ['#', '+', '0', '-', '='] },
    R: { label: 'Annahme', grades: ['#', '+', '-', '='] },
    A: { label: 'Angriff', grades: ['#', '0', '/', '='] },
    B: { label: 'Block', grades: ['#', '+', '-', '='] },
    D: { label: 'Abwehr', grades: ['#', '+', '-', '='] },
    F: { label: 'Fehler', grades: ['net', 'line', 'ball', 'oth'] },
  };
  const GL = {
    S: { '#': 'Ass', '+': '3', '0': '2', '-': '1', '=': 'Fehler' },
    R: { '#': '3', '+': '2', '-': '1', '=': 'Fehler' },
    A: { '#': 'Kill', '0': 'Im Spiel', '/': 'Geblockt', '=': 'Fehler' },
    B: { '#': 'Punkt', '+': 'Touch +', '-': 'Touch −', '=': 'Fehler' },
    D: { '#': '3', '+': '2', '-': '1', '=': 'Fehler' },
    F: { net: 'Netz', line: 'Übertritt', ball: 'Ballfehler', oth: 'Sonstiges' },
  };
  // Bedeutung der Stufen, angelehnt an das DVV-Scouting-Codebook 2026/27
  const GD = {
    S: { '#': 'Ass', '+': 'Gegner kommt nicht ins System (Annahme 1 oder schlechter)', '0': 'Gegner kommt mit Mühe ins System (Annahme 2)', '-': 'Gegner nimmt perfekt an (Annahme 3)', '=': 'Aufschlagfehler' },
    R: { '#': 'perfekt – alle Angriffsoptionen', '+': 'Zuspieler muss laufen, Schnellangriff noch möglich', '-': 'nur hoher Ball oder Notpass', '=': 'Ass gegen uns' },
    A: { '#': 'Punkt', '0': 'Gegner verteidigt', '/': 'vom Gegner geblockt', '=': 'Aus, Netz oder Linie' },
    B: { '#': 'Blockpunkt', '+': 'Touch, Ball bleibt bei uns', '-': 'Touch, Ball zurück zum Gegner oder kein Angriff möglich', '=': 'Blockfehler – Punkt für den Gegner' },
    D: { '#': 'perfekt zum Zuspieler', '+': 'Ball gut spielbar', '-': 'Ball hochgebracht, schwer spielbar', '=': 'nicht bekommen / Fehler' },
  };
  const BX = { out: 'Block-Out', net: 'Netz/Übergriff', gap: 'nicht geschlossen', tech: 'unsauber', late: 'verweigert/zu spät', unk: 'ohne Angabe' };
  const BX_ORDER = ['out', 'net', 'gap', 'tech', 'late'];
  const ROLES = { AA: 'Außen', MB: 'Mitte', DIA: 'Diagonal', ZSP: 'Zuspiel', LIB: 'Libero', UNI: 'Universal' };
  const POS = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const APOS = { AA: 'Außen (vorne)', MB: 'Mitte', DIA: 'Diagonal (vorne)', HF: 'Hinterfeld', ZSP: 'Zuspieler', X: 'Sonstige' };

  const FORMATS = {
    bo5: { label: '3 Gewinnsätze', max: 5, win: 3, tb: true },
    bo3: { label: '2 Gewinnsätze', max: 3, win: 2, tb: true },
    fix2: { label: '2 Sätze fest', max: 2, win: null, tb: false },
    fix3: { label: '3 Sätze fest', max: 3, win: null, tb: false },
  };

  /* Richtwerte je Spielklasse – Erfahrungswerte, in den Einstellungen anpassbar.
     so/bp = Side-out-/Break-Quote, srvErr = Aufschlagfehlerquote, recAvg = Annahme-Schnitt (3/2/1, Fehler 0),
     recErr = Annahmefehler (Asse gegen uns), attEff = Angriffseffizienz, attBlk = geblockte Angriffe,
     faults = sonstige Eigenfehler pro Satz, blk = Blockpunkte pro Satz */
  const LEVELS = {
    freizeit: { label: 'Freizeit / Jugend', so: .48, bp: .52, srvErr: .15, recAvg: 1.6, recErr: .12, attEff: .12, attBlk: .10, faults: 1.0, blk: 1.0 },
    bezirk: { label: 'Kreis- / Bezirksliga', so: .53, bp: .49, srvErr: .13, recAvg: 1.8, recErr: .10, attEff: .18, attBlk: .09, faults: .8, blk: 1.3 },
    landes: { label: 'Landes- / Bayernliga', so: .58, bp: .45, srvErr: .12, recAvg: 1.95, recErr: .08, attEff: .24, attBlk: .08, faults: .6, blk: 1.6 },
    regional: { label: 'Regionalliga / 3. Liga', so: .62, bp: .41, srvErr: .14, recAvg: 2.05, recErr: .07, attEff: .30, attBlk: .07, faults: .5, blk: 2.0 },
    profi: { label: '1. / 2. Bundesliga', so: .66, bp: .37, srvErr: .17, recAvg: 2.2, recErr: .07, attEff: .36, attBlk: .07, faults: .4, blk: 2.2 },
  };
  const TARGET_KEYS = ['so', 'bp', 'srvErr', 'recAvg', 'recErr', 'attEff', 'attBlk', 'faults', 'blk'];

  /* ------------------------------------------------------------------ Helfer */
  const sum = (o) => { let s = 0; for (const k in o) s += o[k]; return s; };
  const div = (a, b) => (b ? a / b : null);
  function rid(n) { let s = ''; const c = 'abcdefghijkmnopqrstuvwxyz23456789'; for (let i = 0; i < (n || 8); i++) s += c[Math.floor(Math.random() * c.length)]; return s; }
  function rotF(lu) { return lu.slice(1).concat(lu[0]); }          // im Uhrzeigersinn: II→I, III→II …
  function rotB(lu) { return [lu[5]].concat(lu.slice(0, 5)); }
  function fmtOf(game) {
    const f = (game && game.format) || {};
    return { mode: FORMATS[f.mode] ? f.mode : 'bo5', pts: +f.pts || 25, tb: +f.tb || 15, open: !!f.open };
  }
  function setTarget(fmt, setNo) {
    const F = FORMATS[fmt.mode] || FORMATS.bo5;
    return (F.tb && setNo === F.max) ? fmt.tb : fmt.pts;
  }
  function setIsOver(fmt, setNo, u, t) {
    const tg = setTarget(fmt, setNo);
    return Math.max(u, t) >= tg && Math.abs(u - t) >= 2;
  }
  function gameIsOver(fmt, setsU, setsT, setsDone) {
    if (fmt.open) return false; // „Weiteren Satz spielen“: Ende nur von Hand
    const F = FORMATS[fmt.mode] || FORMATS.bo5;
    if (F.win) return setsU >= F.win || setsT >= F.win;
    return setsDone >= F.max;
  }
  function crunchAt(fmt, setNo) { return setTarget(fmt, setNo) - 5; } // Schlussphase ab 20 (bzw. 10 im Tiebreak)

  function outcomeOf(e) {
    if (!e) return null;
    if (e.k === 'a') {
      const g = e.g;
      switch (e.sk) {
        case 'S': return g === '#' ? 'u' : g === '=' ? 't' : null;
        case 'R': return g === '=' ? 't' : null;
        case 'A': return g === '#' ? 'u' : (g === '=' || g === '/') ? 't' : null;
        case 'B': return g === '#' ? 'u' : g === '=' ? 't' : null;
        case 'D': return g === '=' ? 't' : null;
        case 'F': return 't';
      }
      return null;
    }
    if (e.k === 'opp') return e.r === 'err' ? 'u' : 't';
    if (e.k === 'pt') return e.w === 'u' ? 'u' : 't';
    return null;
  }
  function validAction(e) { return e && e.k === 'a' && SKILL[e.sk] && Object.prototype.hasOwnProperty.call(GL[e.sk], e.g); }

  /* ------------------------------------------------------------------ Zähler */
  function zg(keys) { const o = {}; keys.forEach((k) => { o[k] = 0; }); return o; }
  function zc() {
    return {
      // '?' = nachgetragen ohne Qualitätsstufe (nur Anzahl bekannt)
      S: zg(['#', '+', '0', '-', '=', '?']), R: zg(['#', '+', '-', '=', '?']), A: zg(['#', '0', '/', '=']),
      B: zg(['#', '+', '-', '=']), D: zg(['#', '+', '-', '=', '?']), F: zg(['net', 'line', 'ball', 'oth']),
      Aso: zg(['#', '0', '/', '=']), Atr: zg(['#', '0', '/', '=']), Bx: zg(['out', 'net', 'gap', 'tech', 'late', 'unk']),
      // Nur aus vollständig bewerteten Quellen (live oder Import mit 3/2/1) – Basis für Quoten und Schnitte
      Sg: zg(['#', '+', '0', '-', '=']), Rg: zg(['#', '+', '-', '=']), Dg: zg(['#', '+', '-', '=', '?']),
      // Rq/Rqn: Annahme-Punkte und -Anzahl aus Importen, die nur einen Schnitt haben
      bp: 0, sets: 0, setsB: 0, games: 0, srvR: 0, srvW: 0, Rq: 0, Rqn: 0, ast: 0, minPts: 0, minErr: 0,
    };
  }
  const CK = ['S', 'R', 'A', 'B', 'D', 'F', 'Aso', 'Atr', 'Bx', 'Sg', 'Rg', 'Dg'];
  function copyGraded(c) { for (const k in c.Sg) c.Sg[k] = c.S[k] || 0; for (const k in c.Rg) c.Rg[k] = c.R[k] || 0; for (const k in c.Dg) c.Dg[k] = c.D[k] || 0; }
  function addCounts(a, b) {
    for (const k of CK) if (b[k]) for (const g in b[k]) a[k][g] = (a[k][g] || 0) + b[k][g];
    a.bp += b.bp || 0; a.sets += b.sets || 0; a.setsB += b.setsB || 0; a.games += b.games || 0; a.srvR += b.srvR || 0; a.srvW += b.srvW || 0;
    a.Rq += b.Rq || 0; a.Rqn += b.Rqn || 0; a.ast += b.ast || 0; a.minPts = (a.minPts || 0) + (b.minPts || 0); a.minErr = (a.minErr || 0) + (b.minErr || 0);
    return a;
  }
  function zrot() { return { recvR: 0, recvW: 0, srvR: 0, srvW: 0 }; }
  function zr() {
    const q4 = () => zg(['#', '0', '/', '=']);
    return {
      rallies: 0, sets: 0, recvR: 0, recvW: 0, srvR: 0, srvW: 0,
      rot: { 1: zrot(), 2: zrot(), 3: zrot(), 4: zrot(), 5: zrot(), 6: zrot() },
      recQ: { '#': { n: 0, w: 0, fbk: 0 }, '+': { n: 0, w: 0, fbk: 0 }, '-': { n: 0, w: 0, fbk: 0 }, '=': { n: 0, w: 0, fbk: 0 }, none: { n: 0, w: 0, fbk: 0 } },
      srvQ: { '#': { n: 0, w: 0 }, '+': { n: 0, w: 0 }, '0': { n: 0, w: 0 }, '-': { n: 0, w: 0 }, '=': { n: 0, w: 0 } },
      crunch: { recvR: 0, recvW: 0, srvR: 0, srvW: 0 },
      ptsU: { ace: 0, killSo: 0, killTr: 0, block: 0, oppErr: 0, other: 0 },
      ptsT: { srvErr: 0, recErr: 0, attErr: 0, attBlk: 0, blkErr: 0, digErr: 0, fault: 0, oppPt: 0, other: 0 },
      apos: { AA: q4(), MB: q4(), DIA: q4(), HF: q4(), ZSP: q4(), X: q4() },
      attRecQ: { '#': q4(), '+': q4(), '-': q4(), none: q4() },
      runsU: 0, runsT: 0, runs4U: 0, runs4T: 0, maxRunU: 0, maxRunT: 0,
      toU: { cnt: 0, n: 0, w: 0 }, toT: { cnt: 0, n: 0, w: 0 },
    };
  }
  function addDeep(a, b) {
    for (const k in b) {
      const v = b[k];
      if (typeof v === 'number') {
        if (k === 'maxRunU' || k === 'maxRunT') a[k] = Math.max(a[k] || 0, v);
        else a[k] = (a[k] || 0) + v;
      } else if (v && typeof v === 'object') {
        if (!a[k]) a[k] = {};
        addDeep(a[k], v);
      }
    }
    return a;
  }

  /* ------------------------------------------------------------------ Spiel auswerten */
  function posClass(pid, lu, role) {
    if (lu && pid) { const j = lu.indexOf(pid); if (j === 0 || j === 4 || j === 5) return 'HF'; }
    if (role === 'AA' || role === 'MB' || role === 'DIA' || role === 'ZSP') return role;
    return 'X';
  }

  /** Spielt die Ereignisliste eines Spiels ab und berechnet Stand, Rotation und alle Statistiken.
      roster: { [playerId]: {role, ...} } (für Angriffspositionen) */
  function analyzeGame(game, roster) {
    const fmt = fmtOf(game);
    const R = {
      id: game.id, live: game.source !== 'import', fmt, sets: [], setsU: 0, setsT: 0,
      players: {}, team: zc(), rk: zr(), rallies: [], evInfo: [], runs: [], tl: {},
      warnings: [], cur: null, done: game.status === 'done',
    };
    if (game.source === 'import') return analyzeImport(game, R);
    const roleOf = (pid) => (roster && roster[pid] && roster[pid].role) || '';
    const ev = Array.isArray(game.events) ? game.events : [];
    const st = { set: 0, inSet: false, u: 0, t: 0, srv: null, lu: null, lib: [], zsp: null, rally: null, run: null, toPending: null };
    const PC = (pid) => R.players[pid] || (R.players[pid] = zc());
    const played = {};
    const markPlayed = (pid) => { if (pid && st.set) (played[st.set] || (played[st.set] = new Set())).add(pid); };
    const rotNo = () => { if (!st.lu || !st.zsp) return null; const i = st.lu.indexOf(st.zsp); return i >= 0 ? i + 1 : null; };
    const rk = R.rk;

    function openRally() {
      st.rally = {
        set: st.set, idx: R.rallies.length, srv: st.srv, rot: rotNo(), lu: st.lu ? st.lu.slice() : null,
        before: [st.u, st.t], ev: [], w: null, firstR: null, firstS: null, firstA: null, server: null, sawDig: false, attacks: 0,
      };
    }
    function endRun() {
      if (st.run && st.run.len >= 3) {
        R.runs.push(Object.assign({}, st.run));
        if (st.run.w === 'u') { rk.runsU++; if (st.run.len >= 4) rk.runs4U++; } else { rk.runsT++; if (st.run.len >= 4) rk.runs4T++; }
      }
    }
    function closeSet(auto) {
      if (st.rally) { R.warnings.push({ set: st.set, msg: 'Satz ' + st.set + ': Ballwechsel ohne Punkt am Satzende' }); st.rally = null; }
      endRun(); st.run = null;
      R.sets.push({ no: st.set, u: st.u, t: st.t, done: true, w: st.u > st.t ? 'u' : st.t > st.u ? 't' : null, auto: !!auto });
      if (st.u > st.t) R.setsU++; else if (st.t > st.u) R.setsT++;
      st.inSet = false; st.toPending = null;
    }
    function closeRally(w, e, i, info) {
      const r = st.rally; r.w = w; r.end = i;
      rk.rallies++;
      const crunch = Math.max(r.before[0], r.before[1]) >= crunchAt(fmt, st.set);
      if (r.srv === 't') {
        rk.recvR++; if (w === 'u') rk.recvW++;
        if (crunch) { rk.crunch.recvR++; if (w === 'u') rk.crunch.recvW++; }
      } else {
        rk.srvR++; if (w === 'u') rk.srvW++;
        if (crunch) { rk.crunch.srvR++; if (w === 'u') rk.crunch.srvW++; }
      }
      if (r.rot) {
        const b = rk.rot[r.rot];
        if (r.srv === 't') { b.recvR++; if (w === 'u') b.recvW++; } else { b.srvR++; if (w === 'u') b.srvW++; }
      }
      if (r.srv === 't') {
        const oppServeError = r.ev.length === 1 && e.k === 'opp' && e.r === 'err';
        if (r.firstR) { const q = rk.recQ[r.firstR]; q.n++; if (w === 'u') q.w++; if (r.firstA === '#') q.fbk++; }
        else if (!oppServeError) { rk.recQ.none.n++; if (w === 'u') rk.recQ.none.w++; if (r.firstA === '#') rk.recQ.none.fbk++; }
      } else {
        if (r.firstS) { const q = rk.srvQ[r.firstS]; q.n++; if (w === 'u') q.w++; }
        const server = r.server || (r.lu ? r.lu[0] : null);
        if (server) { const c = PC(server); c.srvR++; if (w === 'u') c.srvW++; }
      }
      if (w === 'u') {
        if (e.k === 'a') {
          if (e.sk === 'S') rk.ptsU.ace++;
          else if (e.sk === 'A') { if (info.phase === 'so') rk.ptsU.killSo++; else rk.ptsU.killTr++; }
          else if (e.sk === 'B') rk.ptsU.block++;
          else rk.ptsU.other++;
          if (r.srv === 'u') { R.team.bp++; if (e.p) PC(e.p).bp++; }
        } else if (e.k === 'opp') rk.ptsU.oppErr++;
        else rk.ptsU.other++;
      } else {
        if (e.k === 'a') {
          let key = 'other';
          if (e.sk === 'S') key = 'srvErr'; else if (e.sk === 'R') key = 'recErr';
          else if (e.sk === 'A') key = e.g === '/' ? 'attBlk' : 'attErr';
          else if (e.sk === 'B') key = 'blkErr'; else if (e.sk === 'D') key = 'digErr'; else if (e.sk === 'F') key = 'fault';
          rk.ptsT[key]++;
        } else if (e.k === 'opp') rk.ptsT.oppPt++;
        else rk.ptsT.other++;
      }
      if (st.toPending) { const o = st.toPending === 'u' ? rk.toU : rk.toT; o.n++; if (w === st.toPending) o.w++; st.toPending = null; }
      if (w === 'u') { st.u++; if (st.srv === 't' && st.lu) st.lu = rotF(st.lu); st.srv = 'u'; }
      else { st.t++; st.srv = 't'; }
      r.after = [st.u, st.t];
      info.after = r.after; info.w = w;
      R.rallies.push(r);
      (R.tl[st.set] || (R.tl[st.set] = [[0, 0]])).push(r.after);
      if (st.run && st.run.w === w) { st.run.len++; st.run.end = r.after; }
      else { endRun(); st.run = { w, len: 1, set: st.set, start: r.before, end: r.after, rot: r.rot, rally: r.idx }; }
      if (w === 'u') rk.maxRunU = Math.max(rk.maxRunU, st.run.len); else rk.maxRunT = Math.max(rk.maxRunT, st.run.len);
      st.rally = null;
    }

    for (let i = 0; i < ev.length; i++) {
      const e = ev[i] || {};
      const info = { set: st.set, before: [st.u, st.t], after: [st.u, st.t], valid: true };
      R.evInfo.push(info);
      if (e.k === 'set') {
        if (st.inSet) closeSet(true);
        st.set = +e.s || (R.sets.length + 1);
        st.u = 0; st.t = 0; st.srv = e.srv === 't' ? 't' : 'u';
        st.lu = Array.isArray(e.lu) && e.lu.length === 6 && e.lu.every(Boolean) && new Set(e.lu).size === 6 ? e.lu.slice() : null;
        st.lib = Array.isArray(e.lib) ? e.lib.filter(Boolean) : [];
        st.zsp = e.zsp && st.lu && st.lu.includes(e.zsp) ? e.zsp : null;
        st.inSet = true; st.rally = null; st.run = null; st.toPending = null;
        rk.sets++;
        if (st.lu) st.lu.forEach(markPlayed);
        R.tl[st.set] = [[0, 0]];
        info.set = st.set; info.before = [0, 0]; info.after = [0, 0];
        continue;
      }
      if (e.k === 'end') {
        if (st.inSet) closeSet(false); else info.valid = false;
        continue;
      }
      if (!st.inSet) { info.valid = false; R.warnings.push({ i, msg: 'Eintrag außerhalb eines Satzes ignoriert' }); continue; }
      if (e.k === 'sub') {
        if (st.lu) {
          const j = st.lu.indexOf(e.out);
          if (j >= 0 && e.in && !st.lu.includes(e.in)) { st.lu[j] = e.in; if (st.zsp === e.out) st.zsp = e.in; }
          else info.note = 'Wechsel ohne Feldänderung';
        }
        markPlayed(e.in);
        continue;
      }
      if (e.k === 'to') { if (e.w === 't') rk.toT.cnt++; else rk.toU.cnt++; st.toPending = e.w === 't' ? 't' : 'u'; continue; }
      if (e.k === 'fix') {
        if (e.srv === 'u' || e.srv === 't') st.srv = e.srv;
        if (e.rot && st.lu) st.lu = e.rot > 0 ? rotF(st.lu) : rotB(st.lu);
        continue;
      }
      if (e.k === 'lu') {
        if (Array.isArray(e.lu) && e.lu.length === 6 && e.lu.every(Boolean) && new Set(e.lu).size === 6) { st.lu = e.lu.slice(); st.lu.forEach(markPlayed); }
        if (e.zsp !== undefined) st.zsp = e.zsp && st.lu && st.lu.includes(e.zsp) ? e.zsp : null;
        continue;
      }
      if (e.k === 'a' && !validAction(e)) { info.valid = false; continue; }
      if (e.k !== 'a' && e.k !== 'opp' && e.k !== 'pt') { info.valid = false; continue; }
      if (!st.rally) openRally();
      const r = st.rally;
      r.ev.push(i); info.rally = r.idx; info.rot = r.rot; info.srv = r.srv;
      if (e.k === 'a') {
        const sk = e.sk, g = e.g;
        const c = e.p ? PC(e.p) : null;
        if (e.p) markPlayed(e.p);
        R.team[sk][g]++; if (c) c[sk][g]++;
        if (sk === 'B' && g === '=') { const x = BX[e.x] && e.x !== 'unk' ? e.x : 'unk'; R.team.Bx[x]++; if (c) c.Bx[x]++; }
        if (sk === 'R' && r.firstR === null) r.firstR = g;
        if (sk === 'S' && r.firstS === null) { r.firstS = g; r.server = e.p || (st.lu ? st.lu[0] : null); }
        if (sk === 'A') {
          const so = r.srv === 't' && r.attacks === 0 && !r.sawDig;
          r.attacks++;
          const key = so ? 'Aso' : 'Atr';
          R.team[key][g]++; if (c) c[key][g]++;
          if (so) { rk.attRecQ[r.firstR && r.firstR !== '=' ? r.firstR : 'none'][g]++; r.firstA = g; }
          rk.apos[posClass(e.p, st.lu, roleOf(e.p))][g]++;
          info.phase = so ? 'so' : 'tr';
        }
        if (sk === 'D' || (sk === 'B' && (g === '+' || g === '-'))) r.sawDig = true;
      }
      const w = outcomeOf(e);
      if (w) closeRally(w, e, i, info);
    }

    if (st.inSet) R.sets.push({ no: st.set, u: st.u, t: st.t, done: false, w: null });
    for (const s in played) for (const pid of played[s]) PC(pid).sets++;
    for (const pid in R.players) { R.players[pid].games = 1; R.players[pid].setsB = R.players[pid].sets; copyGraded(R.players[pid]); }
    copyGraded(R.team);
    if (game.minimal) reduceToPoints(R);
    R.team.sets = R.sets.filter((s) => s.done || s.u + s.t > 0).length; R.team.setsB = R.team.sets;
    R.team.games = 1;
    const doneSets = R.sets.filter((s) => s.done).length;
    R.cur = {
      set: st.set, inSet: st.inSet, u: st.u, t: st.t, srv: st.srv, lu: st.lu ? st.lu.slice() : null, lib: st.lib.slice(), zsp: st.zsp,
      rot: rotNo(), rallyOpen: !!st.rally, rallyEv: st.rally ? st.rally.ev.slice() : [],
      run: st.run ? Object.assign({}, st.run) : null, setsU: R.setsU, setsT: R.setsT,
      setOver: st.inSet && setIsOver(fmt, st.set, st.u, st.t),
      gameOver: !st.inSet && gameIsOver(fmt, R.setsU, R.setsT, doneSets),
      nextSet: st.inSet ? st.set : (R.sets.length ? R.sets[R.sets.length - 1].no + 1 : 1),
      target: st.set ? setTarget(fmt, st.set) : fmt.pts,
    };
    return R;
  }

  /** Minimal-Modus: Nur punktbringende Aktionen sind erfasst, Quoten wären falsch. Punkte und Fehler bleiben, die Versuchszahlen entfallen. */
  function reduceToPoints(R) {
    R.minimal = true;
    const q4 = () => zg(['#', '0', '/', '=']);
    [R.team].concat(Object.values(R.players)).forEach((c) => {
      c.minPts = c.S['#'] + c.A['#'] + c.B['#'];
      c.minErr = c.S['='] + c.R['='] + c.A['='] + c.A['/'] + c.B['='] + c.D['='] + sum(c.F);
      const z = zc();
      for (const k of CK) c[k] = z[k];
    });
    const rk = R.rk;
    rk.apos = { AA: q4(), MB: q4(), DIA: q4(), HF: q4(), ZSP: q4(), X: q4() };
    rk.attRecQ = { '#': q4(), '+': q4(), '-': q4(), none: q4() };
    for (const k in rk.recQ) rk.recQ[k] = { n: 0, w: 0, fbk: 0 };
    for (const k in rk.srvQ) rk.srvQ[k] = { n: 0, w: 0 };
  }

  function boxToCounts(b) {
    const c = zc();
    const n = (x) => Math.max(0, Math.round(+x || 0));
    const has = (o, k) => o && o[k] !== undefined && o[k] !== null && o[k] !== '';
    const S = b.S || {}, Rr = b.R || {}, A = b.A || {}, B = b.B || {}, D = b.D || {};
    // Aufschlag: Asse, Fehler, optional Stufen 3/2/1 – der Rest zählt als Aufschlag ohne Bewertung
    c.S['#'] = n(S.ace); c.S['='] = n(S.err); c.S['+'] = n(S.q3); c.S['0'] = n(S.q2); c.S['-'] = n(S.q1);
    c.S['?'] = Math.max(0, n(S.att) - c.S['#'] - c.S['='] - c.S['+'] - c.S['0'] - c.S['-']);
    if (!c.S['?']) for (const k in c.Sg) c.Sg[k] = c.S[k];
    if (has(S, 'won')) { c.srvR = n(S.att); c.srvW = n(S.won); }
    // Annahme: Stufen 3/2/1 + Fehler, alternativ positiv/perfekt (alte Form) oder nur Anzahl, Fehler und Schnitt
    c.R['='] = n(Rr.err);
    if (has(Rr, 'q3') || has(Rr, 'q2') || has(Rr, 'q1')) { c.R['#'] = n(Rr.q3); c.R['+'] = n(Rr.q2); c.R['-'] = n(Rr.q1); }
    else if (has(Rr, 'pos') || has(Rr, 'perf')) { c.R['#'] = n(Rr.perf); c.R['+'] = Math.max(0, n(Rr.pos) - c.R['#']); c.R['-'] = Math.max(0, n(Rr.att) - c.R['#'] - c.R['+'] - c.R['=']); }
    const rest = Math.max(0, n(Rr.att) - (c.R['#'] + c.R['+'] + c.R['-'] + c.R['=']));
    if (rest) {
      c.R['?'] = rest;
      // nur Schnitt bekannt: Punkte und Anzahl der ganzen Quelle merken (Fehler zählen 0)
      if (has(Rr, 'avg') && isFinite(+String(Rr.avg).replace(',', '.'))) { c.Rq = Math.round(+String(Rr.avg).replace(',', '.') * n(Rr.att)); c.Rqn = n(Rr.att); }
    } else for (const k in c.Rg) c.Rg[k] = c.R[k];
    c.A['#'] = n(A.kill); c.A['='] = n(A.err); c.A['/'] = n(A.blk); c.A['0'] = Math.max(0, n(A.att) - c.A['#'] - c.A['='] - c.A['/']);
    c.B['#'] = n(B.pts); c.B['+'] = n(B.touch); c.B['='] = n(B.err); c.Bx.unk = c.B['='];
    c.D['='] = n(D.err); c.D['?'] = Math.max(0, n(D.att) - c.D['=']);
    if (has(D, 'err')) for (const k in c.Dg) c.Dg[k] = c.D[k];  // Abwehrfehler wurden mitgezählt
    c.F.oth = n(b.F && b.F.n); c.ast = n(b.ast);
    c.bp = n(b.bp); c.sets = n(b.sets); c.games = 1;
    return c;
  }
  function boxIssues(b) {
    const out = []; const n = (x) => Math.max(0, Math.round(+x || 0));
    const S = b.S || {}, Rr = b.R || {}, A = b.A || {}, D = b.D || {};
    if (n(S.att) && n(S.ace) + n(S.err) + n(S.q1) + n(S.q2) + n(S.q3) > n(S.att)) out.push('Aufschlag: Asse + Fehler + Stufen > Versuche');
    if (n(Rr.att) && n(Rr.q1) + n(Rr.q2) + n(Rr.q3) + n(Rr.err) > n(Rr.att)) out.push('Annahme: 3 + 2 + 1 + Fehler > Versuche');
    if (n(Rr.att) && n(Rr.pos) + n(Rr.err) > n(Rr.att)) out.push('Annahme: positiv + Fehler > Versuche');
    if (Rr.avg !== undefined && Rr.avg !== '' && (+Rr.avg < 0 || +Rr.avg > 3)) out.push('Annahme-Schnitt muss zwischen 0 und 3 liegen');
    if (n(A.att) && n(A.kill) + n(A.err) + n(A.blk) > n(A.att)) out.push('Angriff: Kills + Fehler + geblockt > Versuche');
    if (n(D.att) && n(D.err) > n(D.att)) out.push('Abwehr: Fehler > Versuche');
    return out;
  }
  function analyzeImport(game, R) {
    R.live = false; R.rk = null; R.cur = null; R.done = true;
    const box = game.box || {};
    for (const pid in box) {
      const c = boxToCounts(box[pid]);
      if (pid !== '_team') R.players[pid] = c; // „_team“ = Aktionen ohne Spieler (zählen nur fürs Team)
      const tc = zc(); for (const k of CK) tc[k] = c[k];
      tc.bp = c.bp; tc.Rq = c.Rq; tc.Rqn = c.Rqn; tc.ast = c.ast; tc.srvR = c.srvR; tc.srvW = c.srvW;
      addCounts(R.team, tc);
    }
    // Satz-Tabelle mit Aufschlag-Stufen fürs ganze Team: ergänzt die Team-Werte, wenn Spieler ohne Stufen erfasst sind
    const st = Array.isArray(game.setTeam) ? game.setTeam : [];
    if (st.length && st.every((x) => x && x.S && ['q1', 'q2', 'q3'].every((k) => x.S[k] !== undefined && x.S[k] !== ''))) {
      const T = R.team.S; const q = { '+': 0, '0': 0, '-': 0 };
      st.forEach((x) => { q['-'] += +x.S.q1 || 0; q['0'] += +x.S.q2 || 0; q['+'] += +x.S.q3 || 0; });
      if (q['+'] + q['0'] + q['-'] === T['+'] + T['0'] + T['-'] + T['?'] && T['?'] > 0) {
        T['+'] = q['+']; T['0'] = q['0']; T['-'] = q['-']; T['?'] = 0;
        for (const k in R.team.Sg) R.team.Sg[k] = T[k];
      }
    }
    R.sets = (Array.isArray(game.sets) ? game.sets : []).filter((s) => s && (+s.u || +s.t)).map((s, i) => {
      const u = +s.u || 0, t = +s.t || 0;
      return { no: i + 1, u, t, done: true, w: u > t ? 'u' : t > u ? 't' : null };
    });
    R.sets.forEach((s) => { if (s.w === 'u') R.setsU++; else if (s.w === 't') R.setsT++; });
    R.noResult = !R.sets.length;
    R.team.sets = R.sets.length || (+game.nSets || 0) || Math.max(0, ...Object.values(R.players).map((c) => c.sets));
    R.team.games = 1;
    // Was auf dem Bogen gar nicht vorkommt, wurde nicht erfasst (z. B. keine Blockwerte) – zählt nicht als 0 pro Satz
    R.tracked = {}; for (const sk of ['S', 'R', 'A', 'B', 'D']) R.tracked[sk] = Object.keys(box).some((pid) => box[pid] && box[pid][sk] && Object.keys(box[pid][sk]).length);
    R.team.setsB = R.tracked.B ? R.team.sets : 0;
    for (const pid in R.players) R.players[pid].setsB = R.tracked.B ? R.players[pid].sets : 0;
    return R;
  }

  /* ------------------------------------------------------------------ Kennzahlen */
  function effOf(o) { const n = sum(o); return n ? (o['#'] - o['='] - o['/']) / n : null; }
  function metrics(c) {
    const sAtt = sum(c.S), rAtt = sum(c.R), aAtt = sum(c.A), fTot = sum(c.F), dAtt = sum(c.D);
    const Sg = c.Sg || zg(['#', '+', '0', '-', '=']), Rg = c.Rg || zg(['#', '+', '-', '=']), Dg = c.Dg || zg(['#', '+', '-', '=', '?']);
    const sQ = c.S['+'] + c.S['0'] + c.S['-'];                 // Aufschläge mit Stufe 3/2/1
    const sGr = sum(Sg);                                       // Aufschläge aus vollständig bewerteten Quellen
    const rGr = sum(Rg);                                       // Annahmen mit Stufe (inkl. Fehler)
    const rAvgN = rGr + (c.Rqn || 0);
    const dGr = sum(Dg);
    const pts = c.S['#'] + c.A['#'] + c.B['#'] + (c.minPts || 0);
    const err = c.S['='] + c.R['='] + c.A['='] + c.A['/'] + c.B['='] + c.D['='] + fTot + (c.minErr || 0);
    return {
      pts, bp: c.bp, err, gv: pts - err, sets: c.sets, games: c.games,
      sAtt, sAce: c.S['#'], sErr: c.S['='], sPlus: c.S['+'], s3: c.S['+'], s2: c.S['0'], s1: c.S['-'], sQ,
      sAceP: div(c.S['#'], sAtt), sErrP: div(c.S['='], sAtt), sGr, sNoQ: c.S['?'] || 0,
      s3P: sGr && Sg['+'] + Sg['0'] + Sg['-'] ? Sg['+'] / sGr : null, s2P: sGr && Sg['+'] + Sg['0'] + Sg['-'] ? Sg['0'] / sGr : null, s1P: sGr && Sg['+'] + Sg['0'] + Sg['-'] ? Sg['-'] / sGr : null,
      sAvg: sGr && Sg['+'] + Sg['0'] + Sg['-'] ? (4 * Sg['#'] + 3 * Sg['+'] + 2 * Sg['0'] + Sg['-']) / sGr : null,
      rAtt, rGr, rPerf: c.R['#'], rPos: c.R['#'] + c.R['+'], rNeg: c.R['-'], rErr: c.R['='], r3: c.R['#'], r2: c.R['+'], r1: c.R['-'],
      rPosP: rGr ? (Rg['#'] + Rg['+']) / rGr : null, rPerfP: rGr ? Rg['#'] / rGr : null, rErrP: div(c.R['='], rAtt), rNoQ: c.R['?'] || 0,
      r3P: rGr ? Rg['#'] / rGr : null, r2P: rGr ? Rg['+'] / rGr : null, r1P: rGr ? Rg['-'] / rGr : null,
      rAvg: rAvgN ? (3 * Rg['#'] + 2 * Rg['+'] + Rg['-'] + (c.Rq || 0)) / rAvgN : null,
      aAtt, aKill: c.A['#'], aIn: c.A['0'], aErr: c.A['='], aBlk: c.A['/'], aKillP: div(c.A['#'], aAtt), aEff: effOf(c.A), aBlkP: div(c.A['/'], aAtt),
      soAtt: sum(c.Aso), soEff: effOf(c.Aso), soKillP: div(c.Aso['#'], sum(c.Aso)),
      trAtt: sum(c.Atr), trEff: effOf(c.Atr), trKillP: div(c.Atr['#'], sum(c.Atr)),
      bPts: c.B['#'], bTouch: c.B['+'] + c.B['-'], bTouchP: c.B['+'], bTouchM: c.B['-'], bErr: c.B['='], bx: Object.assign({}, c.Bx),
      setsB: c.setsB || 0, bPerSet: c.setsB ? c.B['#'] / c.setsB : null, bErrPerSet: c.setsB ? c.B['='] / c.setsB : null,
      dAtt, dPos: c.D['#'] + c.D['+'], dNeg: c.D['-'], dErr: c.D['='], dOk: dAtt - c.D['='], dOkP: dGr ? (dGr - Dg['=']) / dGr : null, dGr, ast: c.ast || 0,
      fTot, fNet: c.F.net, fLine: c.F.line, fBall: c.F.ball, fOth: c.F.oth,
      srvR: c.srvR, srvW: c.srvW, srvWP: div(c.srvW, c.srvR),
    };
  }
  function rkMetrics(rk) {
    if (!rk) return null;
    const rot = {};
    for (let i = 1; i <= 6; i++) {
      const b = rk.rot[i];
      rot[i] = { recvR: b.recvR, recvW: b.recvW, srvR: b.srvR, srvW: b.srvW, so: div(b.recvW, b.recvR), bp: div(b.srvW, b.srvR), pm: (b.recvW + b.srvW) - ((b.recvR - b.recvW) + (b.srvR - b.srvW)) };
    }
    const recQ = {};
    for (const k in rk.recQ) { const q = rk.recQ[k]; recQ[k] = { n: q.n, w: q.w, fbk: q.fbk, so: div(q.w, q.n), fbso: div(q.fbk, q.n) }; }
    const srvQ = {};
    for (const k in rk.srvQ) { const q = rk.srvQ[k]; srvQ[k] = { n: q.n, w: q.w, bp: div(q.w, q.n) }; }
    const recN = rk.recQ['#'].n + rk.recQ['+'].n + rk.recQ['-'].n + rk.recQ['='].n;
    const fbk = rk.recQ['#'].fbk + rk.recQ['+'].fbk + rk.recQ['-'].fbk;
    const crunchR = rk.crunch.recvR + rk.crunch.srvR, crunchW = rk.crunch.recvW + rk.crunch.srvW;
    const allR = rk.recvR + rk.srvR, allW = rk.recvW + rk.srvW;
    const ptsT = sum(rk.ptsT);
    // „Geschenkt“ = Fehler ohne Zutun des Gegners; Annahmefehler, geblockte Angriffe und Abwehrfehler hat der Gegner erarbeitet
    const ownErr = rk.ptsT.srvErr + rk.ptsT.attErr + rk.ptsT.blkErr + rk.ptsT.fault;
    return {
      rallies: rk.rallies, sets: rk.sets, so: div(rk.recvW, rk.recvR), bp: div(rk.srvW, rk.srvR), recvR: rk.recvR, srvR: rk.srvR, recvW: rk.recvW, srvW: rk.srvW,
      win: div(allW, allR), fbso: div(fbk, recN), recN, rot, recQ, srvQ,
      crunch: { n: crunchR, w: crunchW, win: div(crunchW, crunchR), so: div(rk.crunch.recvW, rk.crunch.recvR), bp: div(rk.crunch.srvW, rk.crunch.srvR) },
      ptsU: Object.assign({}, rk.ptsU), ptsT: Object.assign({}, rk.ptsT), ptsUSum: sum(rk.ptsU), ptsTSum: ptsT,
      ownErr, ownErrShare: div(ownErr, ptsT), earned: ptsT - ownErr - rk.ptsT.other,
      apos: rk.apos, attRecQ: rk.attRecQ, runsU: rk.runsU, runsT: rk.runsT, runs4U: rk.runs4U, runs4T: rk.runs4T, maxRunU: rk.maxRunU, maxRunT: rk.maxRunT,
      toU: rk.toU, toT: rk.toT,
    };
  }

  /** Fasst mehrere ausgewertete Spiele zusammen (Saison, Filter). */
  function aggregate(analyses) {
    const A = { games: 0, liveGames: 0, sets: 0, setsU: 0, setsT: 0, wins: 0, losses: 0, team: zc(), players: {}, rk: zr(), series: [] };
    for (const g of analyses) {
      A.games++;
      if (g.live) A.liveGames++;
      A.sets += g.sets.filter((s) => s.done).length;
      A.setsU += g.setsU; A.setsT += g.setsT;
      if (g.done) { if (g.setsU > g.setsT) A.wins++; else if (g.setsT > g.setsU) A.losses++; }
      addCounts(A.team, g.team);
      for (const pid in g.players) addCounts(A.players[pid] || (A.players[pid] = zc()), g.players[pid]);
      if (g.rk) addDeep(A.rk, g.rk);
      A.series.push({ id: g.id, live: g.live, m: metrics(g.team), r: g.rk ? rkMetrics(g.rk) : null, setsU: g.setsU, setsT: g.setsT, done: g.done });
    }
    A.m = metrics(A.team);
    A.r = A.liveGames ? rkMetrics(A.rk) : null;
    return A;
  }

  /* ------------------------------------------------------------------ Trainingsfokus */
  const DRILLS = {
    srvErr: 'Zielaufschläge unter Druck: Serien à 10 in eine Zielzone, nach jeder Serie Puls hoch (Sprint) – Ziel: max. 1 Fehler pro Serie. Erst Sicherheit, dann Härte.',
    recPos: 'Annahme-Riegel gegen harte Aufschläge (Trainer/Mitspieler vom Kasten): 3-2-1-0-Wertung, Fokus Plattform stehen lassen und früh positionieren.',
    recErr: 'Annahme gegen die Aufschlagart, die euch Asse kostet (Flatter/Sprung): Zonen klar absprechen, „Mein/Dein“-Rufe, Bälle in den Nähten üben.',
    attEff: 'Angriff gegen Block: Komplexübung Annahme → Zuspiel → Angriff, Punkte nur bei Kill; Schlagvarianten Linie/Diagonale/Blockout gezielt üben.',
    attBlk: 'Angriff gegen Doppelblock: Blockout, Tip/Roll-Shot, Hand-Ausschlag. Zuspieler: Tempo und Verteilung variieren.',
    attTr: 'Konter: Abwehr → Übergang → Angriff aus schwierigem Ball. Wash-Drill mit Bonuspunkt für erfolgreichen Konter, hohe Bälle über Außen absichern.',
    so: 'Side-out-Training: 6 gegen 6, ein Team schlägt nur auf, das andere muss den ersten Angriff verwandeln. Wertung nur für Side-out.',
    rot: 'Die schwache Rotation isoliert spielen: Annahmeformation und Laufwege klären, dann 6 gegen 6 nur aus dieser Rotation (Wash-Drill).',
    bp: 'Break-Punkte: Aufschlag → Block → Konter als Komplex. Aufschlagtaktik (Ziel auf schwächsten Annehmer) und Block-Abwehr-Stellung festlegen.',
    faults: 'Fehler ohne Gegnerdruck: Netz-/Linienfehler – Blocksprung senkrecht, Anlauf-Markierungen; Ballfehler – saubere obere Zuspieltechnik unter Zeitdruck.',
    crunch: 'Satzende simulieren: Sätze ab 20:20 starten, klare Rollen (wer bekommt den Ball?), Routinen vor dem Aufschlag.',
    runs: 'Serien stoppen: Spielformen ab Rückstand (z. B. 0:3), Auszeit-Routine mit einer klaren Ansage, Side-out unter Druck.',
    blk: 'Blocktraining: Timing und Handstellung gegen Außenangriff, Doppelblock schließen, Mitte liest Zuspieler.',
    blkErr: 'Blockfehler: Blockstellung, Timing und Absprache im Doppelblock gezielt trainieren.',
    blk_out: 'Block-Out vermeiden: Außenhand zum Feld drehen, Block nicht zu weit nach außen stellen, gegen Blockout-Schläge üben.',
    blk_net: 'Netz und Übergriff: senkrecht abspringen, Arme über dem Netz nach vorn bringen statt am Netz entlang, beidbeinig landen.',
    blk_gap: 'Doppelblock schließen: Mitte startet früher und schließt zur Außenposition, klare Absprache „ich stelle“, Schulter-an-Schulter-Übung.',
    blk_tech: 'Saubere Blocktechnik: Hände fest und breit, über das Netz greifen, Daumen nach oben – kein Ball durch die Hände.',
    blk_late: 'Blockbereitschaft: Zuspieler lesen, früher laufen (Sidestep/Kreuzschritt), auch bei schwierigen Bällen den Block stellen.',
  };

  function targetsFor(settings) {
    const lvl = LEVELS[(settings && settings.level) || 'bezirk'] || LEVELS.bezirk;
    const t = Object.assign({}, lvl);
    const o = (settings && settings.targets) || {};
    for (const k of TARGET_KEYS) if (typeof o[k] === 'number' && isFinite(o[k])) t[k] = o[k];
    return t;
  }

  /** Erzeugt priorisierte Baustellen ("Trainingsfokus") und Stärken aus einer Aggregation. */
  function insights(agg, targets, playerName) {
    const T = targets; const m = agg.m; const r = agg.r; const out = []; const good = [];
    const sets = Math.max(1, m.sets || agg.sets || 1);
    const liveSets = r ? Math.max(1, r.sets) : 1;
    const nameOf = (pid) => (playerName ? playerName(pid) : pid);
    const pm = {}; for (const pid in agg.players) pm[pid] = metrics(agg.players[pid]);
    const top = (fn, filter, n) => Object.keys(pm).filter((pid) => filter(pm[pid])).sort((a, b) => fn(pm[b]) - fn(pm[a])).slice(0, n || 3);
    const pct = (x) => Math.round(x * 100) + ' %';

    // Aufschlagfehler
    const winIn = r ? (() => { const q = r.srvQ; const n = q['#'].n + q['+'].n + q['0'].n, w = q['#'].w + q['+'].w + q['0'].w; return n >= 20 ? w / n : 0.45; })() : 0.45;
    if (m.sAtt >= 20) {
      const imp = (m.sErrP - T.srvErr) * m.sAtt / sets * winIn;
      const item = { key: 'srvErr', good: 'Sicherer Aufschlag', area: 'Aufschlag', title: 'Aufschlagfehler reduzieren', value: m.sErrP, target: T.srvErr, dir: 'max', n: m.sAtt,
        text: pct(m.sErrP) + ' Fehler bei ' + m.sAtt + ' Aufschlägen (Ziel höchstens ' + pct(T.srvErr) + ').',
        who: top((x) => x.sErr, (x) => x.sAtt >= 5 && x.sErr > 0).map((pid) => nameOf(pid) + ' ' + pm[pid].sErr + '/' + pm[pid].sAtt), drill: DRILLS.srvErr, impact: imp };
      if (imp > 0.15) out.push(item); else if (m.sErrP <= T.srvErr * 0.85) good.push(item);
    }
    // Annahme-Schnitt – Wirkung über den Side-out-Unterschied je Stufe (3 gegenüber 1)
    if (m.rAtt >= 20 && m.rAvg !== null) {
      let delta = 0.2;
      if (r) {
        const a3 = r.recQ['#'], a1 = r.recQ['-'];
        if (a3.n >= 8 && a1.n >= 8) delta = Math.max(0.05, Math.min(0.5, (a3.w / a3.n - a1.w / a1.n) / 2));
      }
      const nAvg = m.rGr + (agg.team.Rqn || 0);
      const imp = (T.recAvg - m.rAvg) * nAvg / sets * delta;
      const item = { key: 'recAvg', good: 'Stabile Annahme', area: 'Annahme', title: 'Annahme verbessern', value: m.rAvg, target: T.recAvg, dir: 'min', n: nAvg, fmt: 'avg',
        text: 'Schnitt ' + numStr(m.rAvg, 2) + ' bei ' + nAvg + ' Annahmen (Ziel ' + numStr(T.recAvg, 2) + ')' + (m.r3P !== null ? ': ' + pct(m.r3P) + ' perfekt (3), ' + pct(m.r2P) + ' gut (2), ' + pct(m.r1P) + ' schlecht (1)' : '') + '.',
        who: top((x) => -(x.rAvg || 0), (x) => x.rAtt >= 10 && x.rAvg !== null).map((pid) => nameOf(pid) + ' Ø ' + numStr(pm[pid].rAvg, 2)), drill: DRILLS.recPos, impact: imp };
      if (imp > 0.15) out.push(item); else if (m.rAvg >= T.recAvg + 0.15) good.push(item);
      const impE = (m.rErrP - T.recErr) * m.rAtt / sets * (r && r.so !== null ? Math.max(0.3, r.so) : 0.55);
      if (impE > 0.15) out.push({ key: 'recErr', area: 'Annahme', title: 'Asse gegen uns verhindern', value: m.rErrP, target: T.recErr, dir: 'max', n: m.rAtt,
        text: m.rErr + ' Annahmefehler = ' + pct(m.rErrP) + ' (Ziel höchstens ' + pct(T.recErr) + ').',
        who: top((x) => x.rErr, (x) => x.rErr > 0).map((pid) => nameOf(pid) + ' ' + pm[pid].rErr + ' Fehler'), drill: DRILLS.recErr, impact: impE });
    }
    // Angriff
    if (m.aAtt >= 25) {
      const imp = (T.attEff - m.aEff) * m.aAtt / sets * 0.6; // Effizienz zählt Kill +1 und Fehler −1 – grob 60 % davon sind gewonnene Punkte
      const item = { key: 'attEff', good: 'Effektiver Angriff', area: 'Angriff', title: 'Angriffseffizienz steigern', value: m.aEff, target: T.attEff, dir: 'min', n: m.aAtt, fmt: 'eff',
        text: 'Effizienz ' + effStr(m.aEff) + ' bei ' + m.aAtt + ' Angriffen (Ziel ' + effStr(T.attEff) + '): ' + m.aKill + ' Kills, ' + m.aErr + ' Fehler, ' + m.aBlk + ' geblockt.',
        who: top((x) => -(x.aEff || 0), (x) => x.aAtt >= 10).map((pid) => nameOf(pid) + ' ' + effStr(pm[pid].aEff)), drill: DRILLS.attEff, impact: imp };
      if (imp > 0.2) out.push(item); else if (m.aEff >= T.attEff + 0.06) good.push(item);
      const impB = (m.aBlkP - T.attBlk) * m.aAtt / sets * 0.5;
      if (impB > 0.2) out.push({ key: 'attBlk', area: 'Angriff', title: 'Weniger geblockt werden', value: m.aBlkP, target: T.attBlk, dir: 'max', n: m.aAtt,
        text: m.aBlk + ' geblockte Angriffe = ' + pct(m.aBlkP) + ' (Ziel höchstens ' + pct(T.attBlk) + ').',
        who: top((x) => x.aBlk, (x) => x.aBlk > 0).map((pid) => nameOf(pid) + ' ' + pm[pid].aBlk + '× geblockt'), drill: DRILLS.attBlk, impact: impB });
      if (m.soAtt >= 15 && m.trAtt >= 15 && m.soEff !== null && m.trEff !== null && m.soEff - m.trEff > 0.1) {
        const impT = (m.soEff - m.trEff) * 0.5 * m.trAtt / sets;
        out.push({ key: 'attTr', area: 'Konter', title: 'Konterangriff verbessern', value: m.trEff, target: m.soEff, dir: 'min', n: m.trAtt, fmt: 'eff',
          text: 'Nach Abwehr/Block nur ' + effStr(m.trEff) + ' Effizienz, nach Annahme ' + effStr(m.soEff) + '.',
          who: top((x) => -(x.trEff || 0), (x) => x.trAtt >= 8).map((pid) => nameOf(pid) + ' ' + effStr(pm[pid].trEff)), drill: DRILLS.attTr, impact: impT });
      }
    }
    // Side-out, Break, Rotationen, Schlussphase, Läufe (nur aus live gescouteten Spielen)
    if (r && r.recvR >= 30) {
      const impS = (T.so - r.so) * r.recvR / liveSets;
      const item = { key: 'so', good: 'Starker Side-out', area: 'Side-out', title: 'Side-out-Quote erhöhen', value: r.so, target: T.so, dir: 'min', n: r.recvR,
        text: pct(r.so) + ' der Ballwechsel nach gegnerischem Aufschlag gewonnen (Ziel ' + pct(T.so) + ').', who: [], drill: DRILLS.so, impact: impS };
      if (impS > 0.3) out.push(item); else if (r.so >= T.so + 0.05) good.push(item);
      let worst = null;
      for (let i = 1; i <= 6; i++) { const b = r.rot[i]; if (b.recvR >= 12 && b.so !== null && (!worst || b.so < worst.so)) worst = Object.assign({ no: i }, b); }
      if (worst && r.so - worst.so >= 0.1) {
        out.push({ key: 'rot', area: 'Rotation', title: 'Rotation „Läufer auf ' + POS[worst.no - 1] + '“', value: worst.so, target: r.so, dir: 'min', n: worst.recvR,
          text: 'Side-out in dieser Rotation ' + pct(worst.so) + ' (' + worst.recvW + '/' + worst.recvR + '), Teamschnitt ' + pct(r.so) + '.', who: [], drill: DRILLS.rot,
          impact: (r.so - worst.so) * worst.recvR / liveSets });
      }
    }
    if (r && r.srvR >= 30) {
      const impB = (T.bp - r.bp) * r.srvR / liveSets;
      const item = { key: 'bp', good: 'Viele Break-Punkte', area: 'Break', title: 'Mehr Break-Punkte', value: r.bp, target: T.bp, dir: 'min', n: r.srvR,
        text: pct(r.bp) + ' der Ballwechsel mit eigenem Aufschlag gewonnen (Ziel ' + pct(T.bp) + ').', who: [], drill: DRILLS.bp, impact: impB };
      if (impB > 0.3) out.push(item); else if (r.bp >= T.bp + 0.05) good.push(item);
    }
    if (r && r.crunch.n >= 20 && r.win !== null && r.crunch.win !== null && r.win - r.crunch.win >= 0.08) {
      out.push({ key: 'crunch', area: 'Schlussphase', title: 'Schlussphase ab 20 Punkten', value: r.crunch.win, target: r.win, dir: 'min', n: r.crunch.n,
        text: 'Ab 20 Punkten nur ' + pct(r.crunch.win) + ' der Ballwechsel gewonnen, sonst ' + pct(r.win) + '.', who: [], drill: DRILLS.crunch,
        impact: (r.win - r.crunch.win) * r.crunch.n / liveSets });
    }
    if (r && r.sets >= 2 && r.runs4T / r.sets >= 0.5 && r.runs4T > r.runs4U) {
      out.push({ key: 'runs', area: 'Serien', title: 'Gegnerische Serien stoppen', value: r.runs4T / r.sets, target: r.runs4U / r.sets, dir: 'max', n: r.runs4T, fmt: 'num',
        text: r.runs4T + ' Gegner-Serien ab 4 Punkten in ' + r.sets + ' Sätzen, eigene: ' + r.runs4U + ' (längste Gegner-Serie: ' + r.maxRunT + ').', who: [], drill: DRILLS.runs,
        impact: (r.runs4T - r.runs4U) / r.sets * 1.5 });
    }
    // Sonstige Eigenfehler
    if (sets >= 2) {
      const perSet = m.fTot / sets;
      if (perSet - T.faults > 0.4) out.push({ key: 'faults', area: 'Eigenfehler', title: 'Netz-, Linien- und Ballfehler', value: perSet, target: T.faults, dir: 'max', n: m.fTot, fmt: 'num',
        text: m.fTot + ' Fehler ohne Gegnerdruck (' + m.fNet + ' Netz, ' + m.fLine + ' Übertritt, ' + m.fBall + ' Ball, ' + m.fOth + ' sonst.) = ' + numStr(perSet) + ' pro Satz.',
        who: top((x) => x.fTot, (x) => x.fTot > 0).map((pid) => nameOf(pid) + ' ' + pm[pid].fTot), drill: DRILLS.faults, impact: (perSet - T.faults) * 0.5 });
      if (m.bErr >= 4 && m.setsB && m.bErr / m.setsB > 0.6) {
        const topR = BX_ORDER.map((k) => [k, m.bx[k] || 0]).sort((a, b) => b[1] - a[1])[0];
        const known = BX_ORDER.reduce((a, k) => a + (m.bx[k] || 0), 0);
        const main = topR && topR[1] >= 2 && topR[1] / Math.max(1, known) >= 0.4 ? topR[0] : null;
        out.push({ key: 'blkErr', area: 'Block', title: 'Blockfehler reduzieren' + (main ? ': ' + BX[main] : ''), value: m.bErr / m.setsB, target: 0.5, dir: 'max', n: m.bErr, fmt: 'num',
          text: m.bErr + ' Blockfehler = ' + numStr(m.bErr / m.setsB) + ' pro Satz' + (known ? ' (' + BX_ORDER.filter((k) => m.bx[k]).map((k) => m.bx[k] + '× ' + BX[k]).join(', ') + ')' : '') + '.',
          who: top((x) => x.bErr, (x) => x.bErr > 0).map((pid) => nameOf(pid) + ' ' + pm[pid].bErr + '×'), drill: DRILLS['blk_' + main] || DRILLS.blkErr, impact: (m.bErr / m.setsB - 0.5) * 0.8 });
      }
      const bps = m.setsB ? m.bPts / m.setsB : null;
      if (bps !== null && m.setsB >= 2 && T.blk - bps > 0.4) out.push({ key: 'blk', area: 'Block', title: 'Mehr Blockpunkte', value: bps, target: T.blk, dir: 'min', n: m.bPts, fmt: 'num',
        text: m.bPts + ' Blockpunkte = ' + numStr(bps) + ' pro Satz (Ziel ' + numStr(T.blk) + ').', who: [], drill: DRILLS.blk, impact: (T.blk - bps) * 0.6 });
    }
    out.sort((a, b) => b.impact - a.impact);
    good.sort((a, b) => Math.abs(b.value - b.target) - Math.abs(a.value - a.target));
    return { focus: out, strengths: good.slice(0, 3) };
  }

  /** Stärken/Baustellen einer Spielerin / eines Spielers im Vergleich zu Team und Zielwerten. */
  function playerNotes(pmx, teamM, T) {
    const s = [], w = [];
    const pct = (x) => Math.round(x * 100) + ' %';
    if (pmx.sAtt >= 10) {
      if (pmx.sErrP > Math.max(T.srvErr, teamM.sErrP || 0) + 0.05) w.push('Aufschlagfehler ' + pct(pmx.sErrP) + ' (Ziel ≤ ' + pct(T.srvErr) + ')');
      else if (pmx.sErrP <= T.srvErr && pmx.sAceP >= 0.08) s.push('Aufschlag: ' + pct(pmx.sAceP) + ' Asse bei nur ' + pct(pmx.sErrP) + ' Fehlern');
    }
    if (pmx.rAtt >= 10) {
      if (pmx.rAvg !== null && pmx.rAvg < T.recAvg - 0.2) w.push('Annahme-Schnitt ' + numStr(pmx.rAvg, 2) + ' (Ziel ' + numStr(T.recAvg, 2) + ')');
      else if (pmx.rAvg !== null && pmx.rAvg >= T.recAvg + 0.15) s.push('Annahme-Schnitt ' + numStr(pmx.rAvg, 2) + (pmx.r3P !== null ? ', ' + pct(pmx.r3P) + ' perfekt' : ''));
      if (pmx.rErrP > T.recErr + 0.05) w.push('Asse gegen ' + pmx.rErr + '× (' + pct(pmx.rErrP) + ')');
    }
    if (pmx.aAtt >= 10) {
      if (pmx.aEff < T.attEff - 0.08) w.push('Angriffseffizienz ' + effStr(pmx.aEff) + ' (Ziel ' + effStr(T.attEff) + ')');
      else if (pmx.aEff >= T.attEff + 0.05) s.push('Angriff ' + effStr(pmx.aEff) + ' Effizienz, ' + pct(pmx.aKillP) + ' Kills');
      if (pmx.trAtt >= 8 && pmx.soAtt >= 8 && pmx.soEff - pmx.trEff > 0.15) w.push('Konter schwächer als Angriff nach Annahme (' + effStr(pmx.trEff) + ' vs. ' + effStr(pmx.soEff) + ')');
      if (pmx.aBlkP > T.attBlk + 0.06) w.push(pct(pmx.aBlkP) + ' der Angriffe geblockt');
    }
    if (pmx.sets >= 3) {
      if (pmx.setsB >= 3 && pmx.bPts / pmx.setsB >= 0.8) s.push(numStr(pmx.bPts / pmx.setsB) + ' Blockpunkte pro Satz');
      if (pmx.fTot / pmx.sets > 0.5) w.push(numStr(pmx.fTot / pmx.sets) + ' Netz-/Linien-/Ballfehler pro Satz');
    }
    return { strengths: s, work: w };
  }

  /* ------------------------------------------------------------------ Plausibilität */
  const BOX_FIELDS = {
    sets: 'Sätze', 'S.att': 'Aufschlag Ges', 'S.err': 'Aufschlag Fehler', 'S.ace': 'Asse', 'S.q3': 'Aufschlag 3', 'S.q2': 'Aufschlag 2', 'S.q1': 'Aufschlag 1', 'S.won': 'Aufschlag gewonnen',
    'R.att': 'Annahme Ges', 'R.err': 'Annahme Fehler', 'R.q3': 'Annahme 3', 'R.q2': 'Annahme 2', 'R.q1': 'Annahme 1', 'R.avg': 'Annahme Ø',
    'A.att': 'Angriff Ges', 'A.err': 'Angriff Fehler', 'A.blk': 'Angriff geblockt', 'A.kill': 'Kills', 'B.pts': 'Blockpunkte', 'B.touch': 'Block-Touch', 'B.err': 'Blockfehler',
    'D.att': 'Abwehr Ges', 'D.err': 'Abwehr Fehler', 'F.n': 'sonstige Fehler', ast: 'Assists', bp: 'Breakpunkte',
  };
  function bget(b, f) { const [a, k] = f.split('.'); const o = k ? (b && b[a]) || {} : b || {}; const v = k ? o[k] : o[a]; return v === undefined || v === null || v === '' ? null : v; }
  const f2 = (x) => numStr(x, 2);
  /** Prüft eine Zeile eines Statistikbogens. Liefert [{f, msg}] – leer, wenn alles möglich ist. */
  function validateBox(b, ctx) {
    ctx = ctx || {}; const out = []; const add = (f, msg) => out.push({ f, msg });
    for (const f in BOX_FIELDS) {
      if (f === 'R.avg') continue;
      const v = bget(b, f);
      if (v !== null && !(Number.isInteger(+v) && +v >= 0 && +v <= 999)) add(f, BOX_FIELDS[f] + ': nur ganze Zahlen von 0 bis 999');
    }
    const g = (f) => +(bget(b, f) || 0), has = (f) => bget(b, f) !== null;
    const avg = bget(b, 'R.avg');
    if (avg !== null && !(isFinite(+avg) && +avg >= 0 && +avg <= 3)) add('R.avg', 'Annahme Ø: nur Werte von 0 bis 3');
    if (out.length) return out;   // erst die Form, dann die Zusammenhänge
    // Aufschlag
    const sQ = has('S.q1') || has('S.q2') || has('S.q3');
    const sParts = g('S.ace') + g('S.err') + g('S.q1') + g('S.q2') + g('S.q3');
    const sAtt = has('S.att') ? g('S.att') : sParts;
    if (sParts > sAtt) add('S.att', 'Aufschlag: Asse + Fehler' + (sQ ? ' + 3/2/1' : '') + ' = ' + sParts + ', aber nur ' + sAtt + ' Aufschläge');
    else if (sQ && sParts !== sAtt) add('S.att', 'Aufschlag: Asse + Fehler + 3/2/1 = ' + sParts + ' – das muss genau die ' + sAtt + ' Aufschläge ergeben');
    if (g('S.won') > sAtt) add('S.won', 'Aufschlag: ' + g('S.won') + ' gewonnene Ballwechsel bei nur ' + sAtt + ' Aufschlägen');
    // Annahme
    const rQ = has('R.q1') || has('R.q2') || has('R.q3');
    const rParts = g('R.err') + g('R.q1') + g('R.q2') + g('R.q3');
    const rAtt = has('R.att') ? g('R.att') : rParts;
    if (rParts > rAtt) add('R.att', 'Annahme: Fehler' + (rQ ? ' + 3/2/1' : '') + ' = ' + rParts + ', aber nur ' + rAtt + ' Annahmen');
    else if (rQ && rParts !== rAtt) add('R.att', 'Annahme: Fehler + 3/2/1 = ' + rParts + ' – das muss genau die ' + rAtt + ' Annahmen ergeben');
    if (avg !== null && !rQ && isFinite(+avg)) {
      if (!rAtt) add('R.avg', 'Annahme Ø ohne Annahmen');
      else {
        const ok = rAtt - g('R.err'), hi = 3 * ok / rAtt, lo = ok / rAtt;
        if (+avg > hi + 0.005) add('R.avg', 'Annahme Ø ' + f2(+avg) + ' geht nicht: bei ' + g('R.err') + ' Fehlern in ' + rAtt + ' Annahmen höchstens ' + f2(hi));
        else if (+avg < lo - 0.005) add('R.avg', 'Annahme Ø ' + f2(+avg) + ' geht nicht: jede Annahme ohne Fehler zählt mindestens 1, also mindestens ' + f2(lo));
      }
    }
    // Angriff, Abwehr
    const aParts = g('A.kill') + g('A.err') + g('A.blk');
    if (has('A.att') && aParts > g('A.att')) add('A.att', 'Angriff: Kills + Fehler + geblockt = ' + aParts + ', aber nur ' + g('A.att') + ' Angriffe');
    if (has('D.att') && g('D.err') > g('D.att')) add('D.err', 'Abwehr: ' + g('D.err') + ' Fehler bei nur ' + g('D.att') + ' Abwehraktionen');
    // Punkte
    const pts = g('S.ace') + g('A.kill') + g('B.pts');
    if (g('bp') > pts) add('bp', 'Breakpunkte (' + g('bp') + ') können nicht mehr sein als die eigenen Punkte (' + pts + ')');
    const maxSets = ctx.sets || 5;
    if (g('sets') > maxSets) add('sets', 'Sätze: höchstens ' + maxSets + (ctx.sets ? ' (so viele wurden gespielt)' : ''));
    return out;
  }
  function fullBox(b) { // fehlende Gesamtzahlen aus den Teilen
    const c = JSON.parse(JSON.stringify(b || {}));
    const g = (f) => +(bget(c, f) || 0), has = (f) => bget(c, f) !== null;
    if (!has('S.att') && (has('S.ace') || has('S.err') || has('S.q1') || has('S.q2') || has('S.q3'))) c.S.att = g('S.ace') + g('S.err') + g('S.q1') + g('S.q2') + g('S.q3');
    if (!has('R.att') && (has('R.err') || has('R.q1') || has('R.q2') || has('R.q3'))) c.R.att = g('R.err') + g('R.q1') + g('R.q2') + g('R.q3');
    if (!has('A.att') && (has('A.kill') || has('A.err') || has('A.blk'))) c.A.att = g('A.kill') + g('A.err') + g('A.blk');
    if (!has('D.att') && has('D.err')) c.D.att = g('D.err');
    return c;
  }
  /** Satzergebnisse nach den Volleyballregeln (Satz bis 25 bzw. Tiebreak bis 15, 2 Punkte Abstand, Spielende). */
  function validateSets(sets, format) {
    const fmt = fmtOf({ format }); const F = FORMATS[fmt.mode] || FORMATS.bo5; const out = [];
    const list = (sets || []).map((x) => ({ u: x && x.u !== '' && x.u !== null && x.u !== undefined ? +x.u : null, t: x && x.t !== '' && x.t !== null && x.t !== undefined ? +x.t : null }));
    let last = -1; list.forEach((x, i) => { if (x.u !== null || x.t !== null) last = i; });
    let wu = 0, wt = 0;
    for (let i = 0; i <= last; i++) {
      const x = list[i], no = i + 1;
      if (x.u === null || x.t === null) { out.push('Satz ' + no + ': ' + (x.u === null && x.t === null ? 'fehlt' : 'beide Punktzahlen eintragen')); continue; }
      if (!Number.isInteger(x.u) || !Number.isInteger(x.t) || x.u < 0 || x.t < 0 || x.u > 99 || x.t > 99) { out.push('Satz ' + no + ': nur ganze Zahlen'); continue; }
      if (no > F.max) { out.push('Satz ' + no + ': bei „' + F.label + '“ gibt es höchstens ' + F.max + ' Sätze'); continue; }
      if (F.win && (wu >= F.win || wt >= F.win)) { out.push('Satz ' + no + ': Das Spiel war nach Satz ' + i + ' schon entschieden (' + wu + ':' + wt + ')'); continue; }
      const tg = setTarget(fmt, no), hi = Math.max(x.u, x.t), lo = Math.min(x.u, x.t), pair = x.u + ':' + x.t;
      if (x.u === x.t) out.push('Satz ' + no + ' (' + pair + '): Unentschieden gibt es nicht');
      else if (hi < tg) out.push('Satz ' + no + ' (' + pair + '): Satzgewinn erst ab ' + tg + ' Punkten' + (tg === fmt.tb && F.tb ? ' (Tiebreak)' : ''));
      else if (hi === tg && lo > tg - 2) out.push('Satz ' + no + ' (' + pair + '): bei ' + lo + ' Punkten geht es bis ' + (lo + 2) + ' weiter – 2 Punkte Abstand');
      else if (hi > tg && hi - lo !== 2) out.push('Satz ' + no + ' (' + pair + '): über ' + tg + ' Punkte hinaus endet der Satz mit genau 2 Punkten Abstand (z. B. ' + hi + ':' + (hi - 2) + ')');
      else if (x.u > x.t) wu++; else wt++;
    }
    if (last >= 0 && !out.length) {
      if (F.win && wu < F.win && wt < F.win) out.push('Ergebnis unvollständig: nach ' + (last + 1) + (last ? ' Sätzen' : ' Satz') + ' steht es ' + wu + ':' + wt + ' – bei „' + F.label + '“ braucht ein Team ' + F.win + ' Satzgewinne');
      if (!F.win && last + 1 !== F.max) out.push('Bei „' + F.label + '“ werden genau ' + F.max + ' Sätze gespielt');
    }
    return out;
  }
  /** Anzahl Sätze ohne bekanntes Ergebnis */
  function validateNSets(n, format) {
    if (n === null || n === undefined || n === '') return [];
    const F = FORMATS[fmtOf({ format }).mode] || FORMATS.bo5; const v = +n;
    const min = F.win ? F.win : F.max, max = F.max;
    if (!Number.isInteger(v) || v < min || v > max) return ['Gespielte Sätze: bei „' + F.label + '“ ' + (min === max ? 'genau ' + min : min + ' bis ' + max)];
    return [];
  }
  /** Team-Summen gegen den Spielstand: mehr Punkte, Fehler, Aufschläge oder Annahmen als möglich? */
  function validateTotals(box, sets) {
    const out = []; const list = (sets || []).filter((x) => x && (+x.u || +x.t));
    let pts = 0, err = 0, srv = 0, rec = 0, won = 0, ast = 0, kills = 0;
    for (const pid in box || {}) {
      const b = box[pid] || {}; const g = (f) => +(bget(b, f) || 0);
      pts += g('S.ace') + g('A.kill') + g('B.pts'); kills += g('A.kill');
      err += g('S.err') + g('R.err') + g('A.err') + g('A.blk') + g('B.err') + g('D.err') + g('F.n');
      srv += g('S.att') || (g('S.ace') + g('S.err') + g('S.q1') + g('S.q2') + g('S.q3'));
      rec += g('R.att') || (g('R.err') + g('R.q1') + g('R.q2') + g('R.q3'));
      won += g('S.won'); ast += g('ast');
    }
    if (ast > kills) out.push('Assists (' + ast + ') können nicht mehr sein als Kills (' + kills + ')');
    if (!list.length) return out;
    const U = list.reduce((a, x) => a + (+x.u || 0), 0), T = list.reduce((a, x) => a + (+x.t || 0), 0), n = list.length;
    if (pts > U) out.push('Asse + Kills + Blockpunkte = ' + pts + ', laut Ergebnis habt ihr aber nur ' + U + ' Punkte gemacht');
    if (err > T) out.push('Eigene Fehler = ' + err + ', laut Ergebnis hat der Gegner aber nur ' + T + ' Punkte');
    if (srv > U + n) out.push(srv + ' Aufschläge sind bei ' + U + ' eigenen Punkten nicht möglich (höchstens ' + (U + n) + ')');
    if (rec > T + n) out.push(rec + ' Annahmen sind bei ' + T + ' Gegnerpunkten nicht möglich (höchstens ' + (T + n) + ')');
    if (won > U) out.push('Mit eigenem Aufschlag gewonnene Ballwechsel (' + won + ') sind mehr als eure Punkte (' + U + ')');
    return out;
  }

  /** Ist diese Aktion im laufenden Ballwechsel nach den Regeln überhaupt möglich? Liefert einen Hinweis oder null. */
  function checkAction(game, act, opts) {
    opts = opts || {};
    const evs = (game && game.events) || [];
    const at = opts.at === undefined || opts.at === null ? evs.length : opts.at;
    const A = opts.analysis && at === evs.length ? opts.analysis : analyzeGame(Object.assign({}, game, { events: evs.slice(0, at), status: 'live', source: 'live' }), opts.roster);
    const c = A.cur; if (!c || !c.inSet) return null;
    const lab = opts.label || ((pid) => String(pid));
    const lu = c.lu, lib = c.lib || [];
    let start = -1; for (let i = at - 1; i >= 0; i--) if (evs[i] && evs[i].k === 'set') { start = i; break; }
    const inSet = evs.slice(start + 1, at);
    if (act.k === 'to') {
      if (inSet.filter((e) => e.k === 'to' && e.w === act.w).length >= 2) return (act.w === 't' ? 'Der Gegner hatte' : 'Ihr hattet') + ' in diesem Satz schon 2 Auszeiten – mehr gibt es nicht.';
      return null;
    }
    if (act.k === 'sub') {
      if (inSet.filter((e) => e.k === 'sub').length >= 6) return 'In diesem Satz wurde schon 6-mal gewechselt – mehr Wechsel sind nicht erlaubt.';
      if (act.in === act.out) return 'Ein Spieler kann nicht für sich selbst eingewechselt werden.';
      if (lib.includes(act.in) || lib.includes(act.out)) return 'Der Libero wird nicht über Wechsel getauscht – ihn einfach weiter antippen.';
      if (lu && !lu.includes(act.out)) return lab(act.out) + ' steht nicht auf dem Feld.';
      if (lu && lu.includes(act.in)) return lab(act.in) + ' steht schon auf dem Feld.';
      return null;
    }
    if (act.k !== 'a') return null;
    const sk = act.sk, p = act.p, open = c.rallyOpen;
    if (p && lu && !lu.includes(p) && !lib.includes(p)) return lab(p) + ' steht nicht auf dem Feld – erst den Wechsel eintragen.';
    if (p && lib.includes(p) && (sk === 'S' || sk === 'B' || sk === 'A')) return 'Der Libero darf nicht ' + (sk === 'S' ? 'aufschlagen' : sk === 'B' ? 'blocken' : 'angreifen') + '.';
    if (sk === 'S') {
      if (c.srv !== 'u') return 'Der Gegner hat Aufschlag.';
      if (open) return 'In diesem Ballwechsel wurde schon aufgeschlagen.';
      if (p && lu && lu[0] !== p) return 'Aufschlag hat ' + lab(lu[0]) + ' (Position I). Stimmt die Rotation nicht, unter „Mehr“ die Aufstellung korrigieren.';
      return null;
    }
    if (sk === 'R') {
      if (c.srv === 'u') return 'Ihr habt Aufschlag – eine Annahme gibt es nur beim Aufschlag des Gegners.';
      if (open) return 'Annahme nur direkt nach dem Aufschlag – meinst du Abwehr?';
      return null;
    }
    if (sk === 'B' && p && lu && !lib.includes(p) && [lu[0], lu[4], lu[5]].includes(p)) return lab(p) + ' steht hinten (Position ' + POS[lu.indexOf(p)] + ') und darf nicht blocken.';
    if ((sk === 'A' || sk === 'B' || sk === 'D') && !open && !game.minimal) {
      if (c.srv === 'u') return 'Erst den Aufschlag eintragen.';
      if (!opts.pendingR) return 'Erst die Annahme eintragen – beim Aufschlag des Gegners ist die erste Aktion immer die Annahme.';
    }
    return null;
  }

  /* ------------------------------------------------------------------ Formatierung */
  function numStr(x, d) { if (x === null || x === undefined || !isFinite(x)) return '–'; return x.toLocaleString('de-DE', { minimumFractionDigits: d === undefined ? 1 : d, maximumFractionDigits: d === undefined ? 1 : d }); }
  function pctStr(x) { if (x === null || x === undefined || !isFinite(x)) return '–'; return Math.round(x * 100) + ' %'; }
  function effStr(x) { if (x === null || x === undefined || !isFinite(x)) return '–'; const v = Math.round(x * 100); return (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v) + ' %'; }

  /* ------------------------------------------------------------------ Sprach-/Textparser */
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/\b(nr|no|nummer)\.\s*/g, 'nr ')
      .replace(/([a-z])-([a-z])/g, '$1$2')
      .replace(/[^a-z0-9#+=\/\-.,;:!?\n ]/g, ' ')
      .replace(/[ \t]+/g, ' ').trim();
  }
  const NUMW = { null: 0, eins: 1, zwei: 2, zwo: 2, drei: 3, vier: 4, fuenf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwoelf: 12, dreizehn: 13, vierzehn: 14, fuenfzehn: 15, sechzehn: 16, siebzehn: 17, achtzehn: 18, neunzehn: 19, zwanzig: 20, dreissig: 30, vierzig: 40, fuenfzig: 50, sechzig: 60, siebzig: 70, achtzig: 80, neunzig: 90 };
  function wordNum(w) {
    if (/^\d{1,2}$/.test(w)) return +w;
    const m0 = w.match(/^(\d{1,2})er$/); if (m0) return +m0[1];
    if (Object.prototype.hasOwnProperty.call(NUMW, w)) return NUMW[w];
    const m = w.match(/^(ein|zwei|drei|vier|fuenf|sechs|sieben|acht|neun)und(zwanzig|dreissig|vierzig|fuenfzig|sechzig|siebzig|achtzig|neunzig)$/);
    if (m) return (m[1] === 'ein' ? 1 : NUMW[m[1]]) + NUMW[m[2]];
    const m2 = w.match(/^(eins|zwei|drei|vier|fuenf|sechs|sieben|acht|neun|zehn|elf|zwoelf)er$/); if (m2) return NUMW[m2[1]];
    return null;
  }
  // Einzelwörter: t = combo (Aktion+Note) | skill | grade | fault | opp | undo | to | sub | in | out | for | us
  const UNI = {
    aufschlagfehler: { t: 'combo', sk: 'S', g: '=' }, aufgabefehler: { t: 'combo', sk: 'S', g: '=' }, servicefehler: { t: 'combo', sk: 'S', g: '=' },
    aufschlagass: { t: 'combo', sk: 'S', g: '#' }, asse: { t: 'combo', sk: 'S', g: '#', weak: 1 },
    annahmefehler: { t: 'combo', sk: 'R', g: '=' },
    angriffsfehler: { t: 'combo', sk: 'A', g: '=' }, angriffspunkt: { t: 'combo', sk: 'A', g: '#' },
    blockpunkt: { t: 'combo', sk: 'B', g: '#' }, blockfehler: { t: 'combo', sk: 'B', g: '=' }, blockaus: { t: 'combo', sk: 'B', g: '=', x: 'out' }, blockout: { t: 'combo', sk: 'B', g: '=', x: 'out' }, blocktouch: { t: 'combo', sk: 'B', g: '+' },
    abwehrfehler: { t: 'combo', sk: 'D', g: '=' },
    aufschlag: { t: 'skill', sk: 'S' }, aufschlaege: { t: 'skill', sk: 'S' }, aufgabe: { t: 'skill', sk: 'S' }, service: { t: 'skill', sk: 'S' }, serve: { t: 'skill', sk: 'S' }, aufschlaeger: { t: 'skill', sk: 'S' },
    annahme: { t: 'skill', sk: 'R' }, annahmen: { t: 'skill', sk: 'R' }, angenommen: { t: 'skill', sk: 'R' }, empfang: { t: 'skill', sk: 'R' }, receive: { t: 'skill', sk: 'R' },
    angriff: { t: 'skill', sk: 'A' }, angriffe: { t: 'skill', sk: 'A' }, angegriffen: { t: 'skill', sk: 'A' }, schlag: { t: 'skill', sk: 'A' }, spike: { t: 'skill', sk: 'A' }, smash: { t: 'skill', sk: 'A' }, schmetterball: { t: 'skill', sk: 'A' }, attacke: { t: 'skill', sk: 'A' }, attack: { t: 'skill', sk: 'A' },
    block: { t: 'skill', sk: 'B' }, blocken: { t: 'skill', sk: 'B' }, blockt: { t: 'skill', sk: 'B' },
    abwehr: { t: 'skill', sk: 'D' }, verteidigung: { t: 'skill', sk: 'D' }, dig: { t: 'skill', sk: 'D' }, feldabwehr: { t: 'skill', sk: 'D' },
    netz: { t: 'fault', f: 'net' }, netzfehler: { t: 'fault', f: 'net' }, netzberuehrung: { t: 'fault', f: 'net' }, uebertreten: { t: 'fault', f: 'line' }, uebertritt: { t: 'fault', f: 'line' }, mittellinie: { t: 'fault', f: 'line' }, linienuebertritt: { t: 'fault', f: 'line' },
    doppelt: { t: 'fault', f: 'ball' }, doppelschlag: { t: 'fault', f: 'ball' }, doppelkontakt: { t: 'fault', f: 'ball' }, getragen: { t: 'fault', f: 'ball' }, geschoben: { t: 'fault', f: 'ball' }, vierer: { t: 'fault', f: 'ball' }, ballfehler: { t: 'fault', f: 'ball' }, zuspielfehler: { t: 'fault', f: 'ball' }, technikfehler: { t: 'fault', f: 'ball' },
    aufstellungsfehler: { t: 'fault', f: 'oth' }, rotationsfehler: { t: 'fault', f: 'oth' }, positionsfehler: { t: 'fault', f: 'oth' }, karte: { t: 'fault', f: 'oth' }, strafpunkt: { t: 'fault', f: 'oth' },
    gegner: { t: 'opp' }, gegners: { t: 'opp' }, gegnerin: { t: 'opp' }, gegenseite: { t: 'opp' }, anderen: { t: 'opp' },
    gegnerpunkt: { t: 'oppc', r: 'pt' }, gegnerfehler: { t: 'oppc', r: 'err' }, gegnerblock: { t: 'combo', sk: 'A', g: '/' },
    rueckgaengig: { t: 'undo' }, undo: { t: 'undo' }, loeschen: { t: 'undo' }, loesche: { t: 'undo' }, storno: { t: 'undo' }, stornieren: { t: 'undo' }, korrektur: { t: 'undo' }, falsch: { t: 'undo' }, zurueck: { t: 'undo', soft: 1 },
    auszeit: { t: 'to' }, timeout: { t: 'to' },
    wechsel: { t: 'sub' }, wechseln: { t: 'sub' }, einwechseln: { t: 'sub' }, auswechseln: { t: 'sub' }, auswechslung: { t: 'sub' },
    kommt: { t: 'in' }, rein: { t: 'in', g: { S: '0' } }, raus: { t: 'out' }, geht: { t: 'out' }, fuer: { t: 'for' },
    uns: { t: 'us' }, wir: { t: 'us' }, unser: { t: 'us' }, unsere: { t: 'us' },
  };
  const GW = {
    perfekt: { R: '#' }, ideal: { R: '#' }, plusplus: { R: '#' }, top: { R: '#', D: '+' }, super: { R: '#', D: '+', S: '+' },
    gut: { S: '+', R: '+', D: '+', B: '+' }, positiv: { R: '+', D: '+', B: '+' }, plus: { S: '+', R: '+', D: '+', B: '+' }, ok: { R: '+', S: '0', D: '+' }, okay: { R: '+', S: '0', D: '+' }, mittel: { R: '+', D: '-', S: '0' },
    druck: { S: '+' }, stark: { S: '+' }, schwer: { S: '+' }, leicht: { S: '-' }, einfach: { S: '-' },
    schlecht: { R: '-', D: '-', S: '-', B: '-' }, schwach: { R: '-', D: '-', S: '-' }, minus: { R: '-', D: '-', B: '-' }, negativ: { R: '-', D: '-', B: '-' }, ueberpass: { R: '-' }, hochgebracht: { D: '-' }, gerettet: { D: '-' },
    fehler: { S: '=', R: '=', A: '=', B: '=', D: '=' }, aus: { S: '=', A: '=', B: '=', D: '=' }, netz: { S: '=', A: '=', B: '=' }, verschlagen: { S: '=', A: '=' }, daneben: { S: '=', A: '=', D: '=' }, lang: { S: '=', A: '=' }, verloren: { R: '=', D: '=' },
    punkt: { S: '#', A: '#', B: '#' }, kill: { A: '#', B: '#' }, durch: { A: '#' }, tot: { A: '#', B: '#' }, versenkt: { A: '#' }, getroffen: { A: '#' }, sitzt: { A: '#' }, direkt: { S: '#', B: '#' }, stuff: { B: '#' },
    geblockt: { A: '/' }, blockiert: { A: '/' },
    abgewehrt: { A: '0' }, verteidigt: { A: '0' }, weiter: { A: '0', S: '0' }, gehalten: { A: '0' }, gespielt: { A: '0' }, neutral: { S: '0', A: '0' },
    touch: { B: '+' }, tusch: { B: '+' }, beruehrt: { B: '+' }, beruehrung: { B: '+' }, angefasst: { B: '+' }, dran: { B: '+' },
    drin: { S: '0' }, normal: { S: '0' },
    ass: { S: '#', R: '=' }, ace: { S: '#', R: '=' },
  };
  const BI = {
    'im feld': { S: '0' }, 'im spiel': { S: '0', A: '0' }, 'ins aus': { S: '=', A: '=', B: '=' }, 'ins netz': { S: '=', A: '=' }, 'im netz': { S: '=', A: '=', B: '=' }, 'im block': { A: '/' },
    'sehr gut': { R: '#', D: '+' }, 'gerade so': { D: '-' }, 'nicht bekommen': { D: '=' }, 'nicht gekriegt': { D: '=' }, 'nicht erreicht': { D: '=' },
    'touch plus': { B: '+' }, 'touch gut': { B: '+' }, 'touch minus': { B: '-' }, 'touch schlecht': { B: '-' }, 'touch negativ': { B: '-' }, 'tusch minus': { B: '-' }, 'tusch plus': { B: '+' },
  };
  const IMPLIED = { // Note ohne Aktionswort → Aktion
    ass: { sk: 'S', g: '#' }, ace: { sk: 'S', g: '#' }, kill: { sk: 'A', g: '#' }, geblockt: { sk: 'A', g: '/' }, blockiert: { sk: 'A', g: '/' },
    touch: { sk: 'B', g: '+' }, tusch: { sk: 'B', g: '+' }, abgewehrt: { sk: 'D', g: '+' }, versenkt: { sk: 'A', g: '#' }, punkt: { sk: 'A', g: '#' }, stuff: { sk: 'B', g: '#' },
  };
  const DEFAULT_G = { S: '0', A: '0', B: '#', D: '+' };
  const NUMGRADE = { R: { 3: '#', 2: '+', 1: '-', 0: '=' }, S: { 3: '+', 2: '0', 1: '-', 0: '=' } };
  const BXW = {
    out: ['out', 'blockout', 'blockaus', 'aus', 'angeschlagen', 'abgeprallt'], net: ['netz', 'netzfehler', 'uebergriff', 'uebergegriffen', 'durchgegriffen', 'linie', 'mittellinie'],
    gap: ['geschlossen', 'luecke', 'offen', 'loch'], tech: ['unsauber', 'weich', 'haende', 'technik'], late: ['verweigert', 'spaet', 'verpasst', 'gestellt', 'gesprungen'],
  };
  function blockReason(items) {
    const ws = items.map((x) => x.w).filter(Boolean).flatMap((w) => w.split(' '));
    for (const k of BX_ORDER) if (BXW[k].some((w) => ws.includes(w))) return k;
    return null;
  }
  const FILLER = new Set(['der', 'die', 'das', 'den', 'dem', 'des', 'von', 'vom', 'mit', 'hat', 'haben', 'macht', 'machen', 'ist', 'war', 'ein', 'eine', 'einen', 'einem', 'nr', 'nummer', 'bei', 'beim', 'zum', 'zur', 'im', 'in', 'ins', 'auf', 'am', 'an', 'so', 'noch', 'jetzt', 'also', 'ja', 'nein', 'oh', 'ah', 'aeh', 'oeh', 'hm', 'wieder', 'schoen', 'sehr', 'echt', 'richtig', 'ganz', 'gerade', 'spieler', 'spielerin', 'er', 'sie', 'es', 'the', 'a', 'nicht', 'ok', 'okay', 'mal', 'nochmal', 'was', 'wie', 'zu']);

  const hasNum = (p) => p && p.num !== '' && p.num !== null && p.num !== undefined && isFinite(+p.num);
  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let prev = new Array(n + 1); for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  function nameKeys(p) {
    const keys = new Set();
    const add = (s) => { norm(s).split(/[\s.,]+/).filter((x) => x.length >= 2 && !/^\d+$/.test(x)).forEach((x) => keys.add(x)); };
    add(p.name || ''); add(p.short || '');
    (p.aliases || []).forEach((a) => { const k = norm(a).replace(/\s+/g, ''); if (k.length >= 2) keys.add(k); add(a); });
    return [...keys];
  }
  function phon(s) {
    return s.replace(/(cks|chs|ks|cs|x)/g, 'x').replace(/ph/g, 'f').replace(/th/g, 't').replace(/ie/g, 'i').replace(/y/g, 'i')
      .replace(/ck/g, 'k').replace(/tz/g, 'z').replace(/dt/g, 't').replace(/v/g, 'f').replace(/(.)\1+/g, '$1');
  }
  function matchName(tok, roster) {
    if (tok.length < 2 || UNI[tok] || GW[tok] || FILLER.has(tok) || wordNum(tok) !== null) return null;
    let best = null, bestD = 99, tie = false;
    const pt = phon(tok);
    for (const p of roster) {
      for (const k of nameKeys(p)) {
        const tol = k.length >= 7 ? 2 : k.length >= 4 ? 1 : 0;
        const d = Math.min(lev(tok, k), lev(pt, phon(k)));
        if (d <= tol && d < bestD) { best = p; bestD = d; tie = false; }
        else if (d <= tol && d === bestD && best && best.id !== p.id) tie = true;
      }
    }
    return best && !tie ? best : null;
  }
  const QG = {
    S: { '#': '#', '/': '+', '+': '+', '0': '0', '!': '0', '-': '-', '=': '=' },
    R: { '#': '#', '+': '+', '!': '+', '-': '-', '/': '-', '=': '=' },
    A: { '#': '#', '+': '0', '0': '0', '!': '0', '-': '0', '/': '/', '=': '=' },
    B: { '#': '#', '+': '+', '!': '-', '-': '-', '/': '=', '=': '=' },
    D: { '#': '#', '+': '+', '!': '-', '-': '-', '/': '-', '=': '=' },
    F: { n: 'net', net: 'net', l: 'line', line: 'line', b: 'ball', ball: 'ball', o: 'oth', oth: 'oth', '=': 'oth' },
  };
  function quickCode(seg, ctx) {
    const s = seg.replace(/\s+/g, ' ').trim();
    if (/^(op|gp)$/.test(s)) return { ok: true, act: { k: 'opp', r: 'pt' } };
    if (/^(oe|gf)$/.test(s)) return { ok: true, act: { k: 'opp', r: 'err' } };
    // Mit Zone: „a45#“ = Angriff von 4 nach 5, Punkt · „7s1+“ = Nr. 7 schlägt auf Zone 1
    const zm = s.match(/^(\d{1,2})? ?([srad])([1-9]{1,2})(#|\+|!|-|\/|=)$/);
    const m = zm || s.match(/^(\d{1,2})? ?([sradbf]) ?(#|\+|0|!|-|\/|=|net|line|ball|oth|n|l|b|o)$/);
    if (!m) return null;
    const grade = zm ? m[4] : m[3];
    const sk = m[2].toUpperCase(); const g = QG[sk][grade];
    if (!g) return null;
    let p = null;
    if (m[1] !== undefined) { const pl = ctx.roster.find((x) => hasNum(x) && +x.num === +m[1]); if (!pl) return { ok: false, text: seg, why: 'Nr. ' + m[1] + ' ist nicht im Kader' }; p = pl.id; }
    const act = { k: 'a', p, sk, g };
    if (zm) { if (m[3].length === 2) { act.z = +m[3][0]; act.ze = +m[3][1]; } else act.ze = +m[3]; }
    if (sk === 'B' && grade === '/') act.x = 'out';   // DVV: Block-Out
    return { ok: true, act };
  }

  function splitSegments(text) {
    // „!“ beendet einen Satz – außer direkt hinter einem Kurzcode-Buchstaben (z. B. „9b!“)
    return norm(text).split(/[.;?\n]+|(?<![sradbf])!+|,|\bund dann\b|\bdann\b|\bdanach\b|\bund\b/).map((s) => s.trim()).filter(Boolean);
  }

  function scanTokens(tokens, roster) {
    const items = [];
    for (let i = 0; i < tokens.length; i++) {
      const w = tokens[i], bi = i + 1 < tokens.length ? w + ' ' + tokens[i + 1] : null;
      if (bi && BI[bi]) { items.push({ pos: i, t: 'grade', g: BI[bi], w: bi }); i++; continue; }
      if ((w === 'nr' || w === 'nummer') && i + 1 < tokens.length && wordNum(tokens[i + 1]) !== null) {
        items.push({ pos: i + 1, t: 'num', v: wordNum(tokens[i + 1]), strong: true }); i++; continue;
      }
      if (UNI[w]) { const it = Object.assign({ pos: i, w }, UNI[w]); items.push(it); if (GW[w]) items.push({ pos: i, t: 'grade', g: GW[w], w, alias: 1 }); continue; }
      if (GW[w]) { items.push({ pos: i, t: 'grade', g: GW[w], w }); continue; }
      const nv = wordNum(w);
      if (nv !== null && !(w === 'ein' || w === 'eine')) { items.push({ pos: i, t: 'num', v: nv }); continue; }
      if (FILLER.has(w)) continue;
      const p = matchName(w, roster);
      if (p) items.push({ pos: i, t: 'name', p: p.id });
      else items.push({ pos: i, t: 'word', w });
    }
    return items;
  }

  // Zerlegt eine Wortfolge ohne Satzzeichen in einzelne Aktionen ("Max Annahme gut Tom Kill")
  function groupItems(items) {
    const groups = []; let cur = [];
    let hasP = false, hasSk = false, hasG = false;
    const flush = () => { if (cur.length) groups.push(cur); cur = []; hasP = hasSk = hasG = false; };
    for (const it of items) {
      const gradeNum = it.t === 'num' && !it.strong && it.v <= 3 && !hasG &&
        cur.some((x) => x.t === 'skill' && (x.sk === 'R' || x.sk === 'S')) && !cur.some((x) => x.t === 'combo');
      if (gradeNum) { cur.push(it); hasG = true; continue; }
      const isP = it.t === 'name' || it.t === 'num';
      const isSk = it.t === 'skill' || it.t === 'combo';
      const isG = it.t === 'grade' && !it.alias;
      if (isP && (hasSk || hasG) && hasP) flush();
      if (isSk && hasSk && (hasG || cur.some((x) => x.t === 'combo'))) flush();
      cur.push(it);
      if (isP) hasP = true; if (isSk) hasSk = true; if (isG) hasG = true;
    }
    flush();
    return groups;
  }

  function resolveGroup(items, ctx, rawText) {
    const has = (t) => items.some((x) => x.t === t);
    const roster = ctx.roster;
    const byNum = (v) => roster.find((x) => hasNum(x) && +x.num === +v);
    // Spieler & Aktionswort
    const combo = items.find((x) => x.t === 'combo');
    const skillIt = combo || items.find((x) => x.t === 'skill');
    let sk = skillIt ? skillIt.sk : null;
    let g = combo ? combo.g : null;
    const skPos = skillIt ? skillIt.pos : -1;
    const nums = items.filter((x) => x.t === 'num');
    const grades = items.filter((x) => x.t === 'grade');
    // Annahme-Note als Zahl (3/2/1/0) nach dem Aktionswort
    let gradeNum = null;
    if ((sk === 'R' || sk === 'S') && !g && !grades.some((x) => x.g[sk] !== undefined)) {
      const after = nums.filter((x) => x.pos > skPos && x.v <= 3 && !x.strong);
      if (after.length) { gradeNum = after[after.length - 1]; }
    }
    // „Max drei“ ohne Aktionswort: Stufe für die erwartete Aktion (Annahme bei Gegneraufschlag, Aufschlag bei eigenem)
    if (!sk && ctx.expect && NUMGRADE[ctx.expect] && !items.some((x) => x.t === 'grade' || x.t === 'fault' || x.t === 'combo' || x.t === 'opp' || x.t === 'oppc')) {
      const nameIt = items.find((x) => x.t === 'name');
      const numIts = nums.filter((x) => !x.strong);
      let gn = null, pRef = null;
      if (nameIt && numIts.length === 1 && numIts[0].v <= 3) { gn = numIts[0]; pRef = nameIt.p; }
      else if (!nameIt && nums.length === 2 && nums[1].v <= 3 && byNum(nums[0].v)) { gn = nums[1]; pRef = byNum(nums[0].v).id; }
      if (gn) return { ok: true, act: { k: 'a', p: pRef, sk: ctx.expect, g: NUMGRADE[ctx.expect][gn.v] } };
    }
    const playerRefs = [];
    for (const it of items) {
      if (it.t === 'name') playerRefs.push({ pid: it.p, pos: it.pos });
      if (it.t === 'num' && it !== gradeNum) {
        const pl = byNum(it.v);
        playerRefs.push({ pid: pl ? pl.id : null, num: it.v, pos: it.pos });
      }
    }
    const unknownNum = playerRefs.find((x) => !x.pid);
    const pref = playerRefs.find((x) => x.pid);
    const p = pref ? pref.pid : null;
    if (unknownNum && !p && !items.some((x) => x.t === 'opp' || x.t === 'oppc')) return { ok: false, text: rawText, why: 'Nr. ' + unknownNum.num + ' ist nicht im Kader' };

    // Gegner / Team
    const oppc = items.find((x) => x.t === 'oppc');
    if (oppc && !sk) return { ok: true, act: { k: 'opp', r: oppc.r } };
    const wsAll = items.map((x) => x.w).filter(Boolean);
    // „Gegner Ass“ / „Ass gegen uns“ = Annahmefehler bei uns, „Gegner Block“ = unser Angriff geblockt (Spieler wird nachgefragt)
    if ((has('opp') || wsAll.includes('gegen')) && (wsAll.includes('ass') || wsAll.includes('ace')) && !(sk && sk !== 'R')) return { ok: true, act: { k: 'a', p, sk: 'R', g: '=' } };
    if (has('opp') && !p && (items.some((x) => x.t === 'skill' && x.sk === 'B') || wsAll.includes('blockpunkt')) && !wsAll.some((w) => ['fehler', 'netz', 'aus'].includes(w))) return { ok: true, act: { k: 'a', p: null, sk: 'A', g: '/' } };
    if (has('opp') && !(p && sk)) {
      const ws = wsAll;
      const errW = ['fehler', 'aus', 'netz', 'verschlagen', 'doppelt', 'uebertreten', 'uebertritt', 'daneben', 'lang', 'ins aus', 'ins netz', 'im netz', 'geschenkt', 'getragen'];
      const ptW = ['punkt', 'ass', 'ace', 'kill', 'block', 'blockpunkt', 'durch', 'tot', 'versenkt', 'direkt'];
      if (ws.some((w) => errW.includes(w))) return { ok: true, act: { k: 'opp', r: 'err' } };
      if (ws.some((w) => ptW.includes(w)) || items.some((x) => x.t === 'skill' && x.sk === 'B')) return { ok: true, act: { k: 'opp', r: 'pt' } };
      return { ok: false, text: rawText, why: 'Gegner: Punkt oder Fehler?' };
    }
    if (has('us') && grades.some((x) => x.w === 'punkt') && !sk && !p) return { ok: true, act: { k: 'pt', w: 'u' } };

    // Fehlerarten ohne Aktionswort
    if (!sk) {
      const f = items.find((x) => x.t === 'fault');
      if (f) return finish({ k: 'a', p, sk: 'F', g: f.f });
      const imp = grades.map((x) => IMPLIED[x.w]).find(Boolean) || items.map((x) => IMPLIED[x.w]).find(Boolean);
      if (imp && (imp.sk !== 'A' || imp.g !== '#' || p || (items.find((x) => x.w === 'kill')))) {
        if (imp.sk === 'A' && imp.g === '#' && !p && items.every((x) => x.w !== 'kill' && x.w !== 'versenkt')) return { ok: false, text: rawText, why: 'Wer hat gepunktet?' };
        return finish({ k: 'a', p, sk: imp.sk, g: imp.g });
      }
      if (grades.some((x) => x.w === 'fehler')) return { ok: false, text: rawText, why: 'Welcher Fehler?', p, q: 'err' };
      if (unknownNum) return { ok: false, text: rawText, why: 'Nr. ' + unknownNum.num + ' ist nicht im Kader' };
      return { ok: false, text: rawText, why: 'Nicht erkannt' };
    }
    // Block: Fehlergrund („Block nicht geschlossen“, „Block aus“, „Blockfehler Netz“ …)
    if (sk === 'B') {
      const why = (combo && combo.x) || blockReason(items);
      if (why && (!g || g === '=')) return finish({ k: 'a', p, sk: 'B', g: '=', x: why });
    }
    // Note bestimmen
    if (!g) {
      if (sk === 'B' && items.some((x) => x.w === 'aus')) g = '=';
      if (!g) { const gi = grades.find((x) => x.g[sk] !== undefined); if (gi) g = gi.g[sk]; }
      if (!g && sk === 'F') g = 'oth';
      if (!g) { const f = items.find((x) => x.t === 'fault'); if (f) g = sk === 'F' ? f.f : (GW.netz[sk] || null); }
      if (!g && gradeNum) g = NUMGRADE[sk][gradeNum.v];
      if (!g && DEFAULT_G[sk]) g = DEFAULT_G[sk];
    }
    if (!g) return { ok: false, text: rawText, why: SKILL[sk].label + ': Bewertung fehlt', p, sk, q: 'grade' };
    if (unknownNum && !p) return { ok: false, text: rawText, why: 'Nr. ' + unknownNum.num + ' ist nicht im Kader' };
    return finish({ k: 'a', p, sk, g });

    function finish(act) { return { ok: true, act }; }
  }

  const ZW = { eins: 1, zwei: 2, drei: 3, vier: 4, fuenf: 5, funf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9 };
  const zoneNo = (w) => (ZW[w] || (/^[1-9]$/.test(w) ? +w : null));
  /** Zone aus gesprochenem Text holen: „… auf fünf“, „vier auf eins“, „Linie“, „Diagonale“ */
  function takeZone(seg) {
    const out = { seg, z: null, ze: null, dir: null };
    const zw = '(eins|zwei|drei|vier|fuenf|funf|sechs|sieben|acht|neun|[1-9])';
    let m = seg.match(new RegExp('\\b' + zw + ' auf ' + zw + '\\b'));
    if (m && /\b[a-z]{3,}/.test(seg.replace(m[0], ''))) { out.z = zoneNo(m[1]); out.ze = zoneNo(m[2]); out.seg = seg.replace(m[0], ' '); return out; }
    m = seg.match(new RegExp('\\bauf (?:zone )?' + zw + '\\b'));
    if (m) { out.ze = zoneNo(m[1]); out.seg = seg.replace(m[0], ' '); return out; }
    m = seg.match(/\b(kurze diagonale|kurzdiagonale|diagonale|linie)\b/);
    if (m) { out.dir = m[1] === 'linie' ? 'line' : m[1] === 'diagonale' ? 'cross' : 'short'; out.seg = seg.replace(m[0], ' '); }
    return out;
  }
  function parseSegment(seg0, ctx) {
    const q = quickCode(seg0, ctx); if (q) return [q];
    const tz = takeZone(seg0);
    if (tz.ze === null && tz.dir === null) return parseSegmentPlain(seg0, ctx);
    let seg = tz.seg;
    if (tz.z !== null && !/angriff|schlag|kill/.test(seg)) seg += ' angriff';
    return parseSegmentPlain(seg.replace(/\s+/g, ' ').trim(), ctx).map((r) => {
      if (r.ok && r.act && r.act.k === 'a') { if (tz.ze !== null) r.act.ze = tz.ze; if (tz.z !== null) r.act.z = tz.z; if (tz.dir) r.act.dir = tz.dir; }
      return r;
    });
  }
  function parseSegmentPlain(seg, ctx) {
    const tokens = seg.split(/\s+/).filter(Boolean);
    const items = scanTokens(tokens, ctx.roster);
    // Metabefehle
    if (items.some((x) => x.t === 'undo') && !items.some((x) => x.t === 'skill' || x.t === 'combo' || x.t === 'name' || (x.t === 'num' && !x.soft))) {
      const soft = items.find((x) => x.t === 'undo').soft;
      if (!soft || items.length <= 2) return [{ ok: true, act: { k: 'undo' } }];
    }
    if (items.some((x) => x.t === 'to')) return [{ ok: true, act: { k: 'to', w: items.some((x) => x.t === 'opp') ? 't' : 'u' } }];
    const refs = items.filter((x) => x.t === 'name' || x.t === 'num').map((x) => {
      if (x.t === 'name') return { pid: x.p, pos: x.pos };
      const pl = ctx.roster.find((r) => hasNum(r) && +r.num === +x.v); return { pid: pl ? pl.id : null, num: x.v, pos: x.pos };
    });
    const isSub = items.some((x) => x.t === 'sub') || (refs.length === 2 && items.some((x) => x.t === 'for' || x.t === 'out') && !items.some((x) => x.t === 'skill' || x.t === 'combo'));
    if (isSub) {
      if (refs.length < 2 || refs.some((r) => !r.pid)) return [{ ok: false, text: seg, why: 'Wechsel: zwei Spieler aus dem Kader nennen (z. B. „Wechsel 12 für 7“)' }];
      let pin = refs[0].pid, pout = refs[1].pid;
      const outIt = items.find((x) => x.t === 'out'), inIt = items.find((x) => x.t === 'in');
      if (outIt && inIt && outIt.pos < inIt.pos) { pout = refs[0].pid; pin = refs[1].pid; } // "7 raus 12 rein"
      else if (outIt && !inIt && refs[0].pos < outIt.pos && refs[1].pos > outIt.pos && !items.some((x) => x.t === 'for')) { pout = refs[0].pid; pin = refs[1].pid; }
      return [{ ok: true, act: { k: 'sub', in: pin, out: pout } }];
    }
    const groups = groupItems(items);
    const res = [];
    for (const gItems of groups) {
      if (!gItems.some((x) => x.t !== 'word')) { continue; }
      res.push(resolveGroup(gItems, ctx, seg));
    }
    if (!res.length) res.push({ ok: false, text: seg, why: 'Nicht erkannt' });
    // Doppelte Fehlermeldungen für dasselbe Segment zusammenfassen
    const okOnes = res.filter((r) => r.ok);
    if (okOnes.length) return res.filter((r) => r.ok || r.why !== 'Nicht erkannt');
    return [res[0]];
  }

  /** Text (getippt oder diktiert) → Liste von Befehlen. ctx: { roster: [{id,num,name,short,aliases}] } */
  function parseCommands(text, ctx) {
    const out = [];
    for (const seg of splitSegments(text)) for (const r of parseSegment(seg, ctx)) out.push(r);
    return out;
  }

  function describeAct(act, nameOf) {
    const nm = (pid) => (pid ? nameOf(pid) : 'ohne Spieler');
    switch (act.k) {
      case 'a': return nm(act.p) + ' · ' + SKILL[act.sk].label + ' ' + GL[act.sk][act.g] + (act.sk === 'B' && act.g === '=' && act.x && BX[act.x] ? ' (' + BX[act.x] + ')' : '');
      case 'opp': return act.r === 'err' ? 'Gegnerfehler (Punkt für uns)' : 'Gegnerpunkt';
      case 'pt': return act.w === 'u' ? 'Punkt für uns' : 'Punkt für den Gegner';
      case 'undo': return 'Rückgängig';
      case 'to': return act.w === 't' ? 'Auszeit Gegner' : 'Auszeit';
      case 'sub': return 'Wechsel: ' + nm(act.in) + ' für ' + nm(act.out);
      default: return act.k;
    }
  }

  /* ------------------------------------------------------------------ Video-Links */
  function parseVideo(url) {
    const u = String(url || '').trim();
    let m = u.match(/twitch\.tv\/videos\/(\d+)/i); if (m) return { kind: 'twitch-vod', id: m[1], url: 'https://www.twitch.tv/videos/' + m[1] };
    m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i); if (m) return { kind: 'youtube', id: m[1], url: 'https://www.youtube.com/watch?v=' + m[1] };
    m = u.match(/twitch\.tv\/([a-z0-9_]{3,})\/?$/i); if (m) return { kind: 'twitch-live', id: m[1], url: 'https://www.twitch.tv/' + m[1] };
    if (/^https?:\/\//i.test(u)) return { kind: 'other', url: u };
    return null;
  }
  function videoLink(video, sec) {
    const v = parseVideo(video && video.url);
    if (!v || sec === null || sec === undefined || !isFinite(sec)) return null;
    const s = Math.max(0, Math.round(sec));
    if (v.kind === 'twitch-vod') { const h = Math.floor(s / 3600), mi = Math.floor((s % 3600) / 60), se = s % 60; return v.url + '?t=' + h + 'h' + mi + 'm' + se + 's'; }
    if (v.kind === 'youtube') return v.url + '&t=' + s + 's';
    return null;
  }
  function videoSec(game, e) {
    const v = game.video;
    if (e.v !== undefined) return Math.max(0, e.v - (v && v.lead !== undefined ? v.lead : 4));
    if (!v || !v.url || v.anchorC === undefined || v.anchorV === undefined || e.c === undefined) return null;
    return v.anchorV + (e.c - v.anchorC) / 1000 - (v.lead === undefined ? 5 : v.lead);
  }
  /** Aufschlag und Annahme kennen nur die sechs Positionen des Feldes. Alte Einträge aus dem Mittelstreifen 7/8/9 liegen hinter der Angriffslinie, gehören also zu 5/6/1. */
  function serveZone(z) { return { 7: 5, 8: 6, 9: 1 }[z] || z; }
  /** Lassen sich Aktionen im verlinkten Video anspringen? (fester Bezugspunkt oder Zeitstempel aus dem Video-Scouting) */
  function videoSynced(game) {
    const v = game && game.video; if (!v || !v.url) return false;
    return v.anchorV !== undefined || (game.events || []).some((e) => e.v !== undefined);
  }
  function hms(sec) {
    if (sec === null || !isFinite(sec)) return '';
    const s = Math.max(0, Math.round(sec)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
  }
  function parseHms(str) {
    const t = String(str || '').trim();
    if (!/^\d+(:\d{1,2}){0,2}$/.test(t)) return null;           // nur Ziffern, h:mm:ss oder mm:ss
    const p = t.split(':').map((x) => +x);
    if (p.slice(1).some((x) => x > 59)) return null;              // Minuten und Sekunden höchstens 59
    return p.reduce((a, b) => a * 60 + b, 0);
  }

  /* ------------------------------------------------------------------ Demo-Spiele (Beispieldaten) */
  function rng32(seed) { let a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const DEMO_ROSTER = [
    { id: 'd1', num: 1, name: 'Jonas Weber', short: 'Jonas', role: 'ZSP' }, { id: 'd4', num: 4, name: 'Lukas Brandl', short: 'Lukas', role: 'AA' },
    { id: 'd7', num: 7, name: 'Max Huber', short: 'Max', role: 'AA' }, { id: 'd9', num: 9, name: 'Felix Maier', short: 'Felix', role: 'MB' },
    { id: 'd11', num: 11, name: 'Tim Gruber', short: 'Tim', role: 'DIA' }, { id: 'd12', num: 12, name: 'Paul Wagner', short: 'Paul', role: 'MB' },
    { id: 'd5', num: 5, name: 'Elias Bauer', short: 'Elias', role: 'LIB' }, { id: 'd14', num: 14, name: 'Simon Fischer', short: 'Simon', role: 'AA' },
    { id: 'd3', num: 3, name: 'Noah Schmid', short: 'Noah', role: 'ZSP' }, { id: 'd16', num: 16, name: 'Leon Hofer', short: 'Leon', role: 'MB' },
  ];
  /** Simuliert ein plausibles Spiel als Ereignisliste (nur für Beispieldaten). */
  function simulateEvents(seed, strength) {
    const rnd = rng32(seed); const ev = []; let clock = 0;
    const push = (e) => { clock += 4000 + Math.floor(rnd() * 14000); e.c = clock; e.t = 1700000000000 + clock; e.id = 'e' + ev.length; ev.push(e); };
    const lu0 = ['d1', 'd7', 'd12', 'd11', 'd4', 'd9']; // I Zuspiel, II Außen, III Mitte, IV Diagonal, V Außen, VI Mitte
    const s = strength || 0; let setsU = 0, setsT = 0;
    for (let set = 1; set <= 5 && setsU < 3 && setsT < 3; set++) {
      const target = set === 5 ? 15 : 25; let u = 0, t = 0, srv = rnd() < 0.5 ? 'u' : 't';
      let lu = lu0.slice(); for (let k = 0; k < (set - 1) % 6; k++) lu = rotF(lu);
      push({ k: 'set', s: set, srv, lu: lu.slice(), lib: ['d5'], zsp: 'd1' });
      if (set === 3) push({ k: 'sub', in: 'd14', out: 'd4' });
      while (!(Math.max(u, t) >= target && Math.abs(u - t) >= 2)) {
        const w = demoRally(rnd, push, srv, lu, s);
        if (w === 'u') { u++; if (srv === 't') lu = rotF(lu); srv = 'u'; } else { t++; srv = 't'; }
        if (t - u === 4 && rnd() < 0.5) push({ k: 'to', w: 'u' });
      }
      push({ k: 'end' }); if (u > t) setsU++; else setsT++;
    }
    return ev;
  }
  function demoRally(rnd, push, srv, lu, s) {
    const A = (p, sk, g) => push({ k: 'a', p, sk, g });
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const front = [lu[1], lu[2], lu[3]], back = [lu[0], lu[4], lu[5]];
    const roleOf = (id) => (DEMO_ROSTER.find((x) => x.id === id) || {}).role;
    const backRec = back.filter((id) => roleOf(id) === 'AA'); const receivers = backRec.concat(['d5']).concat(front.filter((id) => roleOf(id) === 'AA'));
    const attackers = (q) => { const f = front.filter((id) => roleOf(id) !== 'ZSP'); const bAtt = back.filter((id) => roleOf(id) === 'AA' || roleOf(id) === 'DIA'); if (q === '-') return f.filter((id) => roleOf(id) !== 'MB').concat(bAtt); return f.concat(bAtt.slice(0, 1)); };
    let phase, q = 'tr';
    if (rnd() < 0.02) { A(pick(front), 'F', pick(['net', 'net', 'line', 'ball'])); return 't'; }
    if (srv === 'u') {
      const r = rnd();
      if (r < 0.07 + s * 0.02) { A(lu[0], 'S', '#'); return 'u'; }
      if (r < 0.22) { A(lu[0], 'S', '='); return 't'; }
      A(lu[0], 'S', r < 0.42 ? '+' : r < 0.78 ? '0' : '-'); phase = 'def';
    } else {
      if (rnd() < 0.10) { push({ k: 'opp', r: 'err' }); return 'u'; }
      const x = rnd() - s * 0.04; const g = x < 0.10 ? '=' : x < 0.47 ? '-' : x < 0.76 ? '+' : '#';
      A(pick(receivers), 'R', g); if (g === '=') return 't'; q = g; phase = 'att';
    }
    for (let n = 0; n < 14; n++) {
      if (phase === 'att') {
        const pk = ({ '#': 0.50, '+': 0.44, '-': 0.30, tr: 0.33 }[q]) + s * 0.04; const r = rnd(); const who = pick(attackers(q));
        if (r < pk) { A(who, 'A', '#'); return 'u'; }
        if (r < pk + 0.11) { A(who, 'A', '='); return 't'; }
        if (r < pk + 0.19) { A(who, 'A', '/'); return 't'; }
        A(who, 'A', '0'); phase = 'def'; q = 'tr';
      } else {
        if (rnd() < 0.11) { push({ k: 'opp', r: 'err' }); return 'u'; }
        const b = rnd(); const blocker = pick(front);
        if (b < 0.08 + s * 0.02) { A(blocker, 'B', '#'); return 'u'; }
        if (b < 0.11) { push({ k: 'a', p: blocker, sk: 'B', g: '=', x: pick(['out', 'out', 'net', 'gap', 'gap', 'tech', 'late']) }); return 't'; }
        const touched = b < 0.28; if (touched) A(blocker, 'B', b < 0.22 ? '+' : '-');
        const k = rnd();
        if (k < 0.36 - (touched ? 0.12 : 0)) { if (rnd() < 0.3) A(pick(back.concat(['d5'])), 'D', '='); else push({ k: 'opp', r: 'pt' }); return 't'; }
        if (!touched) A(pick(back.concat(['d5', 'd5'])), 'D', rnd() < 0.62 ? '+' : '-');
        phase = 'att'; q = 'tr';
      }
    }
    push({ k: 'opp', r: 'pt' }); return 't';
  }
  function demoGames() {
    const opps = [['TSV Haunstetten', 'Liga', true], ['SV Mering', 'Liga', false], ['TV Gersthofen', 'Liga', true], ['VC Neusäß', 'Pokal', false], ['DJK Augsburg-Hochzoll', 'Liga', false], ['TSV Friedberg', 'Liga', true]];
    const base = Date.UTC(2026, 8, 19);
    return opps.map((o, i) => ({
      id: 'demo' + i, demo: true, date: new Date(base + i * 7 * 86400000).toISOString().slice(0, 10), opponent: o[0], comp: o[1], home: o[2],
      format: { mode: 'bo5', pts: 25, tb: 15 }, status: 'done', source: 'live', roster: DEMO_ROSTER.map((p) => p.id),
      events: simulateEvents(1000 + i * 77, (i % 3) * 0.5 - 0.3), createdAt: base + i * 7 * 86400000,
    }));
  }

  return {
    SKILL, SKILL_ORDER, GL, GD, BX, BX_ORDER, ROLES, POS, APOS, FORMATS, LEVELS, TARGET_KEYS, DRILLS,
    rid, rotF, rotB, fmtOf, setTarget, setIsOver, gameIsOver, crunchAt, outcomeOf, validAction,
    zc, addCounts, sum, analyzeGame, boxToCounts, boxIssues, metrics, rkMetrics, aggregate, targetsFor, insights, playerNotes,
    numStr, pctStr, effStr, norm, wordNum, lev, parseCommands, splitSegments, describeAct,
    validateBox, validateSets, validateNSets, validateTotals, fullBox, checkAction, BOX_FIELDS,
    parseVideo, videoLink, videoSec, videoSynced, serveZone, hms, parseHms, DEMO_ROSTER, demoGames, simulateEvents, rng32,
  };
});


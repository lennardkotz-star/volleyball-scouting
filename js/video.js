/* Volleyball Scouting – Video-Arbeitsplatz: Datei öffnen, Schnitt erstellen, über die Pausen springen, Korrektur mit einem Tipp */
(function () {
  'use strict';
  const V = window.VST, C = V.C, S = V.S, ACT = V.ACT, HOOK = V.HOOK, ICON = V.ICON, $ = V.$, $$ = V.$$, esc = V.esc, toast = V.toast, modal = V.modal;
  const Store = V.Store;
  const VID = {
    root: null, el: null, gameId: null, file: null, url: null, auto: V.lsGet('vst:vAuto') !== '0', speed: +(V.lsGet('vst:vSpeed') || 1),
    seg: -1, closed: false, waiting: false, job: null, jobPct: 0, jobHidden: false, lastTouch: Date.now(), handle: null,
  };
  const gameOf = () => (S.route === 'details' || S.route === 'video' ? V.gameById(S.id) : V.liveGame());
  const ralliesOf = (g) => (g && g.cut && g.cut.rallies) || [];
  const newStats = () => ({ auto: 0, added: 0, removed: 0 });

  /* ---------------------------------------------------------- Neues Spiel */
  HOOK.newGameHtml = () => {
    const lv = (S.settings.detail || {}).level || 'einfach';
    return '<fieldset><legend>Woher scoutest du?</legend>' +
      '<div class="seg-ctl" role="group" aria-label="Quelle"><button type="button" class="on" data-act="ngsrc" data-v="video">' + ICON.video + ' Aus dem Video</button><button type="button" data-act="ngsrc" data-v="live">Live in der Halle</button></div>' +
      '<div id="ngVidBox"><label class="mt">Video-Datei<input type="file" id="ngFile" accept="video/*,.mkv"></label>' +
      '<p class="muted small">Das Video bleibt auf diesem Gerät und wird nirgends hochgeladen. Eigene Twitch-Aufnahmen vorher herunterladen.</p></div>' +
      '<label class="mt">Video-Link für die Spieler (optional)<input id="ngVideo" placeholder="youtube.com/watch?v=… oder twitch.tv/videos/…" inputmode="url" autocomplete="off"></label>' +
      '<p class="muted small">Liegt dasselbe Video auch online, führen die Spielerkarten direkt zu den eigenen Szenen.</p></fieldset>' +
      '<label>Detailstufe' + V.selectHtml('ngLevel', HOOK.detailLevels(), lv) + '</label>';
  };
  ACT.ngsrc = (t) => {
    $$('[data-act="ngsrc"]').forEach((b) => b.classList.toggle('on', b === t));
    $('#ngVidBox').style.display = t.dataset.v === 'video' ? '' : 'none';
    const f = $('#ngFile'); if (f && t.dataset.v !== 'video') f.value = '';
  };
  HOOK.newGameApply = (g) => {
    const f = $('#ngFile') && $('#ngFile').files[0];
    if (f) { g.videoFile = { name: f.name, size: f.size, lastModified: f.lastModified }; setFile(g, f); }
    HOOK.applyLevel(g, $('#ngLevel') ? $('#ngLevel').value : 'einfach');
  };

  /* ---------------------------------------------------------- Datei */
  function setFile(g, file) {
    if (VID.url) URL.revokeObjectURL(VID.url);
    VID.file = file; VID.gameId = g.id; VID.url = URL.createObjectURL(file); VID.seg = -1; VID.waiting = false;
    if (VID.el) VID.el.src = VID.url;
  }
  function matchesFile(g, f) { const m = g.videoFile; return !m || (m.name === f.name && m.size === f.size); }
  async function attach(g, file) {
    if (!matchesFile(g, file) && g.videoFile && !(await V.confirmBox('Andere Datei?', 'Für dieses Spiel war „' + g.videoFile.name + '“ gewählt. Die Zeitstempel passen nur zum selben Video.', 'Trotzdem öffnen'))) return;
    g.videoFile = { name: file.name, size: file.size, lastModified: file.lastModified, duration: (g.videoFile || {}).duration };
    setFile(g, file); Store.saveGame(g, { now: true }); V.render();
  }
  ACT.vopen = async () => {
    const g = gameOf(); if (!g) return;
    if (window.showOpenFilePicker) {
      try {
        const [h] = await window.showOpenFilePicker({ types: [{ description: 'Video', accept: { 'video/*': ['.mp4', '.mov', '.m4v', '.webm', '.mkv'] } }] });
        const f = await h.getFile(); await attach(g, f);
        if (!g.practice) window.VIDB.putHandle(g.id, h).catch(() => {});
      } catch (e) { if (e && e.name !== 'AbortError') toast('Die Datei ließ sich nicht öffnen.', { kind: 'error' }); }
      return;
    }
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'video/*,.mkv';
    inp.onchange = () => { if (inp.files[0]) attach(g, inp.files[0]); };
    inp.click();
  };
  ACT.vreopen = async () => {
    const g = gameOf(); if (!g || !VID.handle) return;
    try {
      if ((await VID.handle.requestPermission({ mode: 'read' })) !== 'granted') return;
      await attach(g, await VID.handle.getFile());
    } catch (e) { toast('Die Datei ist nicht mehr da. Bitte neu auswählen.', { kind: 'warn' }); VID.handle = null; V.render(); }
  };

  /* ---------------------------------------------------------- Player */
  function buildRoot() {
    const r = document.createElement('div'); r.className = 'vp';
    r.innerHTML = '<div class="vp-stage"><video playsinline preload="auto"></video><div class="vp-wait" hidden></div></div>' +
      '<div class="vp-tl" id="vpTl" role="slider" aria-label="Zeitleiste" tabindex="0"><div class="vp-segs"></div><i class="vp-head"></i></div>' +
      '<div class="vp-ctl">' +
      '<button class="btn small" data-act="vprev" title="Vorheriger Ballwechsel (B)" aria-label="Vorheriger Ballwechsel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6l-8 6 8 6zM6 6v12"/></svg></button>' +
      '<button class="btn small" data-act="vback" title="3 Sekunden zurück (←)">−3 s</button>' +
      '<button class="btn small primary" data-act="vplay" id="vpPlay" title="Abspielen / Pause (Leertaste)" aria-label="Abspielen">' + ICON.play + '</button>' +
      '<button class="btn small" data-act="vfwd" title="3 Sekunden vor (→)">+3 s</button>' +
      '<button class="btn small" data-act="vnext" title="Nächster Ballwechsel (N)" aria-label="Nächster Ballwechsel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l8 6-8 6zM18 6v12"/></svg></button>' +
      '<span class="vp-time" id="vpTime">0:00</span>' +
      '<select id="vpSpeed" aria-label="Tempo"><option value="1">1×</option><option value="1.5">1,5×</option><option value="2">2×</option></select>' +
      '<label class="tg small" title="Pausen zwischen den Ballwechseln überspringen"><input type="checkbox" id="vpAuto"> Pausen überspringen</label>' +
      '</div><div class="vp-cut" id="vpCut"></div>';
    VID.root = r; VID.el = r.querySelector('video');
    VID.el.addEventListener('play', () => syncPlayBtn());
    VID.el.addEventListener('pause', () => syncPlayBtn());
    VID.el.addEventListener('error', () => { if (VID.el.getAttribute('src')) toast('Dieses Videoformat kann der Browser nicht abspielen. iPhone-Videos (HEVC) gehen in Safari, sonst vorher in MP4 (H.264) umwandeln.', { kind: 'error', ms: 9000 }); });
    VID.el.addEventListener('loadedmetadata', onMeta);
    VID.el.addEventListener('click', () => ACT.vplay());
    r.querySelector('#vpTl').addEventListener('pointerdown', (e) => {
      const box = e.currentTarget.getBoundingClientRect();
      const d = VID.el.duration; if (!isFinite(d)) return;
      VID.el.currentTime = Math.max(0, Math.min(d, ((e.clientX - box.left) / box.width) * d));
      VID.seg = -1; VID.waiting = false; tick(true);
    });
    r.querySelector('#vpSpeed').value = String(VID.speed);
    r.querySelector('#vpSpeed').addEventListener('change', (e) => { VID.speed = +e.target.value; VID.el.playbackRate = VID.speed; V.lsSet('vst:vSpeed', String(VID.speed)); });
    r.querySelector('#vpAuto').checked = VID.auto;
    r.querySelector('#vpAuto').addEventListener('change', (e) => { VID.auto = e.target.checked; V.lsSet('vst:vAuto', VID.auto ? '1' : '0'); });
    setInterval(tick, 120);
  }
  function onMeta() {
    const v = VID.el; v.playbackRate = VID.speed;
    if (!isFinite(v.duration)) { const fix = () => { if (isFinite(v.duration)) { v.removeEventListener('durationchange', fix); v.currentTime = 0; drawTimeline(); } }; v.addEventListener('durationchange', fix); v.currentTime = 1e9; return; }
    const g = gameOf();
    if (g && g.videoFile && g.videoFile.duration !== v.duration) { g.videoFile.duration = v.duration; }
    drawTimeline();
  }
  function syncPlayBtn() { const b = $('#vpPlay'); if (b) { b.innerHTML = VID.el.paused ? ICON.play : ICON.pause; b.setAttribute('aria-label', VID.el.paused ? 'Abspielen' : 'Pause'); } }
  function drawTimeline() {
    const box = VID.root && VID.root.querySelector('.vp-segs'); if (!box) return;
    const g = gameOf(); const d = VID.el.duration; const rs = ralliesOf(g);
    // Striche alle 5 Minuten, damit die Zeitleiste einen echten Maßstab hat
    const ticks = isFinite(d) && d > 300 ? Array.from({ length: Math.floor(d / 300) }, (_, i) => '<i class="vp-tick" style="left:' + ((i + 1) * 300 / d * 100) + '%"></i>').join('') : '';
    box.innerHTML = ticks + (isFinite(d) && d > 0 ? rs.map((r, i) => '<span class="' + (r.c === 'h' ? 'h' : r.src === 'manual' ? 'man' : 'm') + (i === VID.seg ? ' cur' : '') + '" style="left:' + (r.s / d * 100) + '%;width:' + Math.max(0.15, (r.e - r.s) / d * 100) + '%"></span>').join('') : '');
  }
  function drawCut(g) {
    const el = VID.root && VID.root.querySelector('#vpCut'); if (!el) return;
    const rs = ralliesOf(g);
    if (VID.job && VID.job.gameId === g.id) {
      el.innerHTML = '<div class="vp-prog"><span class="spin" aria-hidden="true"></span><b>Schnitt läuft: ' + VID.jobPct + ' %</b>' +
        (VID.jobHidden ? '<span class="warn small"> pausiert, solange der Tab im Hintergrund ist</span>' : '<span class="muted small"> Du kannst schon scouten. Tab bitte offen lassen.</span>') +
        '<button class="link small" data-act="vcutstop">Abbrechen</button></div><div class="seg"><span class="g5" style="width:' + VID.jobPct + '%"></span></div>';
    } else if (rs.length) {
      const here = currentSeg(g);
      el.innerHTML = '<div class="vp-fix"><span class="small"><b>' + (VID.seg >= 0 ? 'Ballwechsel ' + (VID.seg + 1) + ' von ' + rs.length : rs.length + ' Ballwechsel') + '</b>' + (g.cut.mode === 'bewegung' ? ' <span class="warn">ohne Pfiffe, nur nach Bewegung</span>' : '') + '</span>' +
        '<span class="row"><button class="btn small" data-act="vmark" title="Falls die App einen Ballwechsel verpasst hat">Hier fängt einer an</button>' +
        (here >= 0 ? '<button class="btn small" data-act="vend" title="Ballwechsel hier enden lassen">Hier zu Ende</button><button class="btn small danger ghost" data-act="vdrop" title="Das war kein Ballwechsel">Kein Ballwechsel</button>' : '') +
        '<button class="link small" data-act="vcut">Neu schneiden</button></span></div>';
    } else {
      el.innerHTML = '<div class="vp-fix"><span class="small muted">Ohne Schnitt läuft das Video am Stück.</span><button class="btn small primary" data-act="vcut">Schnitt erstellen</button></div>';
    }
  }
  function currentSeg(g) { const t = VID.el ? VID.el.currentTime : 0; return ralliesOf(g).findIndex((r) => t >= r.s && t < r.e); }

  /** Baut den Player in die aktuelle Seite ein. */
  function mount() {
    const slot = $('#vp-slot'); if (!slot) return;
    const g = gameOf(); if (!g) return;
    if (!VID.root) buildRoot();
    const hasFile = VID.file && VID.gameId === g.id;
    if (!hasFile) {
      if (VID.handleFor !== g.id) { VID.handleFor = g.id; VID.handle = null; if (!g.practice) window.VIDB.getHandle(g.id).then((h) => { if (h && VID.handleFor === g.id) { VID.handle = h; V.render(); } }).catch(() => {}); }
      const name = g.videoFile ? '„' + esc(g.videoFile.name) + '“' : 'das Video zu diesem Spiel';
      slot.innerHTML = '<div class="card vp-pick"><h2>Video öffnen</h2><p class="small">Wähle ' + name + '. Es bleibt auf diesem Gerät.</p><div class="row">' +
        (VID.handle ? '<button class="btn primary" data-act="vreopen">' + ICON.video + ' Weiter mit dieser Datei</button>' : '') +
        '<button class="btn ' + (VID.handle ? '' : 'primary') + '" data-act="vopen">Datei wählen</button></div></div>';
      return;
    }
    if (VID.el.getAttribute('src') !== VID.url) { VID.el.src = VID.url; }
    if (VID.root.parentElement !== slot) { slot.innerHTML = ''; slot.appendChild(VID.root); }
    document.body.classList.add('vmode');
    drawTimeline(); drawCut(g); syncPlayBtn(); tick(true);
  }
  HOOK.mountVideo = mount;

  /* ---------------------------------------------------------- Über die Pausen springen */
  function setWait(text) {
    const w = VID.root.querySelector('.vp-wait');
    if (text) { w.textContent = text; w.hidden = false; } else w.hidden = true;
  }
  function jumpNext(fromT, play) {
    const g = gameOf(); const rs = ralliesOf(g); if (!rs.length) return false;
    const t = fromT === undefined ? VID.el.currentTime : fromT;
    const i = rs.findIndex((r) => r.s > t + 0.05);
    VID.waiting = false; setWait(null);
    if (i < 0) { VID.el.pause(); toast('Das war der letzte erkannte Ballwechsel.'); return false; }
    VID.seg = i; VID.closed = false;
    VID.el.currentTime = rs[i].s;
    if (play !== false) VID.el.play().catch(() => {});
    drawTimeline(); drawCut(g);
    return true;
  }
  function tick(force) {
    const v = VID.el; if (!v || !VID.root || !VID.root.isConnected) return;
    const d = v.duration;
    const head = VID.root.querySelector('.vp-head');
    if (head && isFinite(d) && d > 0) head.style.left = (v.currentTime / d * 100) + '%';
    const tm = $('#vpTime'); if (tm) tm.textContent = C.hms(v.currentTime) + (isFinite(d) ? ' / ' + C.hms(d) : '');
    const g = gameOf(); if (!g) return;
    const rs = ralliesOf(g);
    if (force === true || v.paused || v.seeking || !rs.length) return;
    const t = v.currentTime;
    const i = rs.findIndex((r) => t >= r.s && t < r.e);
    if (i >= 0) {
      if (i !== VID.seg) { VID.seg = i; VID.closed = false; VID.waiting = false; setWait(null); drawTimeline(); drawCut(g); }
      return;
    }
    if (!VID.auto || S.route === 'details') return;
    if (S.route === 'video') { jumpNext(t); return; } // Nachschauen: nichts einzutragen, einfach weiter
    const inSet = (V.analysis(g).cur || {}).inSet;
    if (VID.seg >= 0 && t >= rs[VID.seg].e && !VID.closed && inSet) {
      v.pause(); VID.waiting = true; setWait('Wer hat den Punkt gemacht?'); return; // erst den Punkt eintragen
    }
    jumpNext(t);
  }

  /* Zeitstempel und Sprung nach dem Punkt */
  HOOK.stampEvent = (g, e) => {
    if (VID.el && VID.file && VID.gameId === g.id) e.v = Math.round(VID.el.currentTime * 10) / 10;
    if (HOOK.stampZone) HOOK.stampZone(g, e);
  };
  HOOK.afterLog = (g, a, e) => {
    if (HOOK.afterLogZone) HOOK.afterLogZone(g, a, e);
    if (!VID.el || VID.gameId !== g.id) return;
    const inf = a.evInfo[a.evInfo.length - 1];
    if (!inf || !inf.w) return;
    VID.closed = true;
    const c = a.cur;
    const rs = ralliesOf(g);
    if (!VID.auto || !rs.length) { VID.waiting = false; setWait(null); return; }
    if (c.setOver || !c.inSet) { VID.el.pause(); setWait(null); VID.waiting = false; return; }
    const seg = rs[VID.seg];
    // Trägt jemand nach, während schon der nächste Ballwechsel läuft, darf das Video nicht weiterspringen
    const justStarted = seg && !VID.waiting && VID.el.currentTime - seg.s < 3;
    if (!justStarted) jumpNext(seg ? seg.s : undefined);
  };
  HOOK.afterUndo = (g, last) => {
    if (!VID.el || VID.gameId !== g.id || last.v === undefined) return;
    VID.closed = false; VID.waiting = false; setWait(null);
    const before = Math.max(0, last.v - 1);
    VID.el.pause(); VID.el.currentTime = before;
    VID.seg = ralliesOf(g).findIndex((r) => before >= r.s && before < r.e);
  };

  /* ---------------------------------------------------------- Knöpfe und Tasten */
  ACT.vplay = () => { const v = VID.el; if (!v) return; if (v.paused) { if (VID.waiting) { VID.waiting = false; VID.closed = true; setWait(null); } v.play().catch(() => {}); } else v.pause(); };
  ACT.vback = () => { if (VID.el) { VID.el.currentTime = Math.max(0, VID.el.currentTime - 3); VID.waiting = false; setWait(null); } };
  ACT.vfwd = () => { if (VID.el) { VID.el.currentTime = VID.el.currentTime + 3; } };
  ACT.vnext = () => {
    if (!VID.el) return;
    if (!ralliesOf(gameOf()).length) { VID.el.currentTime += 15; return; }
    const paused = VID.el.paused && !VID.waiting;
    jumpNext(undefined, !paused);
  };
  ACT.vprev = () => {
    if (!VID.el) return;
    const g = gameOf(); const rs = ralliesOf(g); const t = VID.el.currentTime;
    if (!rs.length) { VID.el.currentTime = Math.max(0, t - 15); return; }
    let i = -1; rs.forEach((r, k) => { if (r.s < t - 1.5) i = k; });
    VID.waiting = false; setWait(null);
    if (i >= 0) { VID.seg = i; VID.closed = true; VID.el.currentTime = rs[i].s; drawTimeline(); drawCut(g); }
  };
  /* Korrektur mit einem Tipp – die Zahlen zeigen, wie gut der automatische Schnitt war */
  ACT.vmark = () => {
    const g = gameOf(); if (!g) return;
    if (!g.cut) g.cut = { rallies: [], stats: newStats(), mode: 'hand' };
    const t = VID.el.currentTime; const rs = g.cut.rallies;
    const nx = rs.find((r) => r.s > t);
    rs.push({ s: t, e: Math.min(nx ? nx.s - 0.5 : t + 12, t + 12), c: 'm', src: 'manual' });
    rs.sort((a, b) => a.s - b.s);
    g.cut.stats.added++; Store.saveGame(g);
    VID.seg = rs.findIndex((r) => r.s === t); VID.closed = false; drawTimeline(); drawCut(g); toast('Ballwechsel ergänzt.');
  };
  ACT.vend = () => {
    const g = gameOf(); const i = currentSeg(g); if (i < 0) return;
    const r = g.cut.rallies[i]; r.e = VID.el.currentTime; r.fixed = 1;
    if (r.e - r.s < 0.5) g.cut.rallies.splice(i, 1);
    Store.saveGame(g); drawTimeline(); drawCut(g);
  };
  ACT.vdrop = () => {
    const g = gameOf(); const i = currentSeg(g); if (i < 0) return;
    const [r] = g.cut.rallies.splice(i, 1);
    if (r.src !== 'manual') g.cut.stats.removed++; else g.cut.stats.added = Math.max(0, g.cut.stats.added - 1);
    Store.saveGame(g); VID.closed = false; VID.seg = -1;
    jumpNext(r.s); toast('Entfernt.', { ms: 1500 });
  };
  const typing = () => { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT') && a.type !== 'checkbox' && a.type !== 'file'; };
  document.addEventListener('keydown', (e) => {
    if (!VID.el || !VID.root || !VID.root.isConnected || typing() || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('.modal-wrap')) return;
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); if (document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur(); ACT.vplay(); }
    else if (k === 'n') ACT.vnext();
    else if (k === 'b') ACT.vprev();
    else if (k === 'arrowleft') { e.preventDefault(); ACT.vback(); }
    else if (k === 'arrowright') { e.preventDefault(); ACT.vfwd(); }
    else if (k === 'r') { const g = gameOf(); const i = currentSeg(g); if (i >= 0) VID.el.currentTime = ralliesOf(g)[i].s; }
  });

  /* ---------------------------------------------------------- Schnitt erstellen */
  ACT.vcut = () => {
    const g = gameOf(); if (!g || !VID.file) return;
    const dur = VID.el.duration; const mins = isFinite(dur) ? Math.ceil(dur / 60 / window.VRally.RATE) : null;
    const m = modal({ title: 'Schnitt erstellen', wide: true, sticky: true,
      html: '<p>Zieh einen Rahmen um <b>euer Spielfeld</b>, damit Bewegung auf Nachbarfeldern nicht mitzählt. Kein Rahmen bedeutet: das ganze Bild.</p>' +
        '<div class="roi" id="roiBox"><canvas id="roiCv" width="640" height="360"></canvas><div class="roi-r" id="roiR" hidden></div></div>' +
        '<p class="small muted">Die Analyse läuft auf diesem Gerät' + (mins ? ' und dauert etwa <b>' + mins + (mins === 1 ? ' Minute' : ' Minuten') + '</b>' : '') + '. Du kannst währenddessen schon scouten.</p>' +
        (ralliesOf(g).length ? '<p class="small warn">Der vorhandene Schnitt samt Korrekturen wird ersetzt.</p>' : ''),
      actions: [{ label: 'Abbrechen', kind: 'ghost' }, { label: 'Schnitt starten', kind: 'primary', id: 'roiGo', fn: () => { startCut(g, VID.roi); } }],
      onOpen: (el) => { setupRoi(el); } });
    void m;
  };
  function setupRoi(el) {
    const box = $('#roiBox', el), rEl = $('#roiR', el), cv = $('#roiCv', el);
    const ctx = cv.getContext('2d');
    VID.roi = (gameOf().cut || {}).roi || null;
    const paint = () => { if (!VID.roi) { rEl.hidden = true; return; } rEl.hidden = false; rEl.style.cssText = 'left:' + VID.roi.x * 100 + '%;top:' + VID.roi.y * 100 + '%;width:' + VID.roi.w * 100 + '%;height:' + VID.roi.h * 100 + '%'; };
    const v = VID.el; const back = v.currentTime; const wasPaused = v.paused; v.pause();
    const draw = () => { try { cv.width = v.videoWidth || 640; cv.height = v.videoHeight || 360; ctx.drawImage(v, 0, 0, cv.width, cv.height); } catch (e) { /* egal */ } };
    const d = v.duration;
    const onSeek = () => { draw(); v.removeEventListener('seeked', onSeek); v.currentTime = back; if (!wasPaused) v.play().catch(() => {}); };
    v.addEventListener('seeked', onSeek);
    v.currentTime = isFinite(d) ? Math.min(d * 0.3, 300) : 1;
    let st = null;
    box.addEventListener('pointerdown', (e) => { const b = box.getBoundingClientRect(); st = [(e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height]; box.setPointerCapture(e.pointerId); VID.roi = null; paint(); });
    box.addEventListener('pointermove', (e) => {
      if (!st) return; const b = box.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)), y = Math.max(0, Math.min(1, (e.clientY - b.top) / b.height));
      VID.roi = { x: Math.min(st[0], x), y: Math.min(st[1], y), w: Math.abs(x - st[0]), h: Math.abs(y - st[1]) }; paint();
    });
    box.addEventListener('pointerup', () => { st = null; if (VID.roi && (VID.roi.w < 0.05 || VID.roi.h < 0.05)) VID.roi = null; paint(); });
    paint();
  }
  function startCut(g, roi) {
    if (VID.job) { toast('Es läuft schon ein Schnitt.'); return; }
    VID.jobPct = 0; VID.jobHidden = false;
    const started = Date.now();
    const handle = window.VRally.analyze(VID.file, {
      roi,
      onProgress: (p) => { const pc = Math.min(99, Math.round(p * 100)); if (pc !== VID.jobPct) { VID.jobPct = pc; if (gameOf() === g) drawCut(g); } },
      onHidden: (h) => { VID.jobHidden = h; if (gameOf() === g) drawCut(g); },
      onError: (e) => { VID.job = null; toast(e.message, { kind: 'error', ms: 7000 }); if (gameOf() === g) drawCut(g); },
      onDone: (res) => {
        VID.job = null;
        g.cut = { rallies: res.rallies.map((r) => ({ s: +r.s.toFixed(2), e: +r.e.toFixed(2), c: r.c })), mode: res.mode, whistles: res.whistles, roi: roi || null, audio: res.audio, ms: Date.now() - started, at: Date.now(), stats: Object.assign(newStats(), { auto: res.rallies.length }) };
        if (g.videoFile) g.videoFile.duration = res.duration;
        Store.saveGame(g, { now: true });
        toast(res.rallies.length + ' Ballwechsel gefunden.' + (res.mode === 'bewegung' ? ' Pfiffe waren kaum zu hören, deshalb nur nach Bewegung geschnitten.' : ''), { ms: 6000 });
        if (gameOf() === g) { drawTimeline(); drawCut(g); }
      },
    });
    VID.job = { gameId: g.id, handle };
    drawCut(g);
  }
  ACT.vcutstop = () => { if (VID.job) { VID.job.handle.cancel(); VID.job = null; const g = gameOf(); if (g) drawCut(g); } };

  /* ---------------------------------------------------------- Aus dem Spielbericht zur Szene springen */
  ACT.vjump = async (t) => {
    const g = V.gameById(t.dataset.gid); const sec = +t.dataset.sec; if (!g) return;
    let file = VID.gameId === g.id ? VID.file : null;
    const open = (f) => {
      if (!f) return;
      if (!matchesFile(g, f)) toast('Das ist nicht die Datei dieses Spiels, die Stelle kann danebenliegen.', { kind: 'warn' });
      if (VID.gameId !== g.id) setFile(g, f);
      const m = modal({ title: g.opponent + ' · ' + C.hms(sec), wide: true, html: '<video class="vp-pop" controls playsinline src="' + VID.url + '"></video>', onClose: () => { const x = $('.vp-pop'); if (x) x.pause(); } });
      const x = $('.vp-pop', m.el);
      x.addEventListener('loadedmetadata', () => { x.currentTime = sec; x.play().catch(() => {}); }, { once: true });
    };
    if (file) { open(file); return; }
    try {
      const h = await window.VIDB.getHandle(g.id);
      if (h && (await h.requestPermission({ mode: 'read' })) === 'granted') { open(await h.getFile()); return; }
    } catch (e) { /* dann von Hand wählen */ }
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'video/*,.mkv';
    inp.onchange = () => open(inp.files[0]);
    inp.click();
  };

  /* ---------------------------------------------------------- Scout-Zeit (nur aktive Zeit): wie lange ein Spiel aus dem Video dauert */
  ['pointerdown', 'keydown'].forEach((n) => document.addEventListener(n, () => { VID.lastTouch = Date.now(); }, { passive: true }));
  setInterval(() => {
    if (document.visibilityState !== 'visible' || S.route !== 'live') return;
    const g = V.liveGame(); if (!g || !g.videoFile) return;
    const active = (VID.el && !VID.el.paused) || Date.now() - VID.lastTouch < 120000;
    if (active) g.scoutMs = (g.scoutMs || 0) + 5000;
  }, 5000);

  /** Springt an eine Stelle und spielt ab. Falsch, wenn zu diesem Spiel noch kein Video offen ist. */
  function seek(g, t) {
    if (!VID.el || !VID.file || VID.gameId !== g.id) return false;
    VID.waiting = false; VID.closed = true; setWait(null);
    VID.el.currentTime = Math.max(0, t); VID.seg = ralliesOf(g).findIndex((r) => t >= r.s && t < r.e);
    VID.el.play().catch(() => {}); drawTimeline(); drawCut(g);
    return true;
  }
  window.VST.video = { VID, setFile, attach, startCut, jumpNext, mount, seek };
})();

/* Volleyball Scouting – Ballwechsel-Schnitt
   Liest ein Video einmal im Schnelldurchlauf, misst Pfiffe und Bewegung im eigenen Feld und schneidet daraus die Ballwechsel.
   detect() ist reine Rechnung ohne Browser-Abhängigkeit und wird in tests/ geprüft. */
(function (root) {
  'use strict';
  const DT = 0.25;                       // Raster der Auswertung in Sekunden
  const RALLY = { min: 2.5, max: 45 };   // plausible Länge von Pfiff zu Pfiff während eines Ballwechsels
  const LEAD_IN = 0.5, TAIL = 1.5, SERVE_BACK = 3; // SERVE_BACK: Start nur aus Bewegung, der Aufschlag davor bleibt sichtbar

  const percentile = (arr, p) => { if (!arr.length) return 0; const a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
  function smooth(a, win) {
    const out = new Array(a.length); let s = 0, n = 0;
    for (let i = 0; i < a.length; i++) {
      s += a[i]; n++;
      if (i >= win) { s -= a[i - win]; n--; }
      out[i] = s / n;
    }
    const half = Math.floor(win / 2); // Mitte statt Nachlauf
    return out.slice(half).concat(new Array(half).fill(out[out.length - 1] || 0));
  }

  /** Bringt die unregelmäßigen Messwerte auf ein festes Raster. */
  function toGrid(samples, duration) {
    const n = Math.max(1, Math.ceil(duration / DT));
    const m = new Array(n).fill(null), w = new Array(n).fill(0);
    samples.forEach((s) => {
      const i = Math.min(n - 1, Math.max(0, Math.floor(s.t / DT)));
      if (s.m !== undefined && s.m !== null) m[i] = m[i] === null ? s.m : Math.max(m[i], s.m);
      if (s.w) w[i] = Math.max(w[i], s.w);
    });
    let last = 0; for (let i = 0; i < n; i++) { if (m[i] === null) m[i] = last; else last = m[i]; }
    return { m, w, n };
  }

  /** Pfiff-Zeitpunkte: deutlich herausragende, kurz anhaltende Töne. Die Schwelle passt sich jedem Video an. */
  function findWhistles(w, minProm) {
    const on = w.filter((x) => x > 0);
    if (on.length < 3) return [];
    const thr = Math.max(minProm, percentile(on, 0.5));
    const out = []; let start = -1, peak = 0;
    for (let i = 0; i <= w.length; i++) {
      if (i < w.length && w[i] >= thr) { if (start < 0) start = i; peak = Math.max(peak, w[i]); }
      else if (start >= 0) {
        out.push({ t: start * DT, len: (i - start) * DT, peak });
        start = -1; peak = 0;
      }
    }
    // Pfeifen in Doppelstößen zählt als ein Pfiff
    const merged = [];
    out.forEach((x) => { const l = merged[merged.length - 1]; if (l && x.t - (l.t + l.len) < 0.75) { l.len = x.t + x.len - l.t; l.peak = Math.max(l.peak, x.peak); } else merged.push(Object.assign({}, x)); });
    return merged;
  }

  /** Bewegungsabschnitte mit zwei Schwellen (Hysterese), kurze Lücken werden überbrückt. */
  function motionSegments(ms, from, to) {
    const slice = ms.slice(from, to);
    const lo = percentile(ms, 0.2), hi = percentile(ms, 0.8);
    const tOn = lo + 0.55 * (hi - lo), tOff = lo + 0.35 * (hi - lo);
    const segs = []; let st = -1;
    slice.forEach((v, k) => {
      if (st < 0 && v >= tOn) st = k;
      else if (st >= 0 && v < tOff) { segs.push([st, k]); st = -1; }
    });
    if (st >= 0) segs.push([st, slice.length]);
    const joined = [];
    segs.forEach((x) => { const l = joined[joined.length - 1]; if (l && (x[0] - l[1]) * DT < 3) l[1] = x[1]; else joined.push(x.slice()); });
    return joined.filter((x) => (x[1] - x[0]) * DT >= RALLY.min).map((x) => [(x[0] + from) * DT, (x[1] + from) * DT]);
  }

  /** Teilt die Zeit zwischen zwei Pfiffen in „Ballwechsel“ oder „Pause“ ein (Viterbi über alle Abschnitte). */
  function labelIntervals(iv, ms) {
    const lo = percentile(ms, 0.2), hi = Math.max(percentile(ms, 0.8), lo + 1e-6);
    const emit = (x) => {
      const z = (x.mean - lo) / (hi - lo) - 0.5;            // −0,5 ruhig … +0,5 viel Bewegung
      const rallyLen = x.d >= RALLY.min && x.d <= RALLY.max ? 0 : -3;
      const pauseLen = x.d >= 4 ? 0 : -0.7;
      return { R: 2.2 * z + rallyLen, P: -2.2 * z + pauseLen };
    };
    // Auf einen Ballwechsel folgt fast immer eine Pause und umgekehrt
    const SAME = -0.6;
    let vR = emit(iv[0]).R, vP = emit(iv[0]).P;
    const back = [];
    for (let i = 1; i < iv.length; i++) {
      const e = emit(iv[i]);
      const toR = vP >= vR + SAME ? ['P', vP] : ['R', vR + SAME];
      const toP = vR >= vP + SAME ? ['R', vR] : ['P', vP + SAME];
      back.push({ R: toR[0], P: toP[0] });
      vR = toR[1] + e.R; vP = toP[1] + e.P;
    }
    const labels = new Array(iv.length);
    let cur = vR >= vP ? 'R' : 'P';
    for (let i = iv.length - 1; i >= 0; i--) { labels[i] = cur; if (i > 0) cur = back[i - 1][cur]; }
    return labels;
  }

  /** Überhörter Pfiff: Ballwechsel und Pause hängen dann in einem Abschnitt. Solche Abschnitte werden an den Bewegungswechseln geteilt.
      Nach dem Anpfiff bleibt bis zu 9 s Ruhe normal, weil der Aufschlag so lange dauern darf. */
  function splitPoints(times, ms) {
    const out = [];
    for (let i = 0; i < times.length - 1; i++) {
      const s = times[i], e = times[i + 1];
      out.push({ t: s });
      const segs = motionSegments(ms, Math.floor(s / DT), Math.max(Math.floor(s / DT) + 1, Math.floor(e / DT)));
      segs.forEach(([a, b]) => {
        if (a - s >= 9) out.push({ t: a, soft: true });
        if (e - b >= 5) out.push({ t: b, soft: true });
      });
    }
    out.push({ t: times[times.length - 1] });
    return out;
  }

  /** samples: [{t, m, w}] · m = Bewegung im Feld, w = Herausragen des Pfeifftons in dB (0 = kein Ton)
      Liefert Ballwechsel [{s, e, c}], c = 'h' (Pfiffe und Bewegung), 'm' (nur Bewegung) */
  function detect(samples, duration, opt) {
    opt = opt || {};
    if (!samples.length || !(duration > 0)) return { rallies: [], whistles: 0, mode: 'leer' };
    const { m, w, n } = toGrid(samples, duration);
    const ms = smooth(m, Math.round(1.5 / DT));
    const whistles = findWhistles(w, opt.minProm === undefined ? 18 : opt.minProm);
    const perMin = whistles.length / (duration / 60);
    const out = [];
    const finish = (s, e, c) => { out.push({ s: Math.max(0, s - LEAD_IN), e: Math.min(duration, e + TAIL), c }); };

    if (perMin < 0.5) { // kein Ton oder kaum Pfiffe erkannt: nur Bewegung
      motionSegments(ms, 0, n).forEach(([s, e]) => finish(s, e, 'm'));
      return { rallies: out, whistles: whistles.length, mode: 'bewegung' };
    }
    const pts = splitPoints([0].concat(whistles.map((x) => x.t), [duration]), ms);
    const iv = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = Math.floor(pts[i].t / DT), b = Math.max(a + 1, Math.floor(pts[i + 1].t / DT));
      let sum = 0; for (let k = a; k < b; k++) sum += ms[Math.min(n - 1, k)];
      iv.push({ s: pts[i].t, e: pts[i + 1].t, d: pts[i + 1].t - pts[i].t, a, b, mean: sum / (b - a), soft: pts[i].soft });
    }
    const labels = labelIntervals(iv, ms);
    let cur = null;
    iv.forEach((x, i) => {
      if (labels[i] === 'R') { if (cur) cur.e = x.e; else cur = { s: x.soft ? x.s - SERVE_BACK : x.s, e: x.e }; return; }
      if (cur) { pushRally(cur); cur = null; }
      // Viel zu lange Pause: da fehlt vermutlich ein Pfiff → innen nach Bewegung suchen
      if (x.d > RALLY.max) motionSegments(ms, x.a, x.b).forEach(([s, e]) => { if (e - s <= RALLY.max) finish(s, e, 'm'); });
    });
    if (cur) pushRally(cur);
    function pushRally(r) {
      if (r.e - r.s > RALLY.max * 1.5) { motionSegments(ms, Math.floor(r.s / DT), Math.floor(r.e / DT)).forEach(([s, e]) => finish(s, e, 'm')); return; }
      if (r.e - r.s >= RALLY.min) finish(r.s, r.e, 'h');
    }
    out.sort((x, y) => x.s - y.s);
    return { rallies: out, whistles: whistles.length, mode: 'pfiff' };
  }

  /* ------------------------------------------------------------ Messung im Browser */
  const RATE = 4;           // Wiedergabe-Tempo der Analyse: ein 90-Minuten-Spiel braucht gut 22 Minuten
  const GRID_W = 96, GRID_H = 54;

  /** Spielt die Datei versteckt ab und sammelt Messwerte. roi: {x, y, w, h} (0–1), Rückgabe über onDone. */
  function analyze(file, opts) {
    const o = opts || {};
    const video = document.createElement('video');
    video.preload = 'auto'; video.playsInline = true; video.muted = false;
    video.style.cssText = 'position:fixed;left:-9999px;top:0;width:320px;height:180px;opacity:0;pointer-events:none';
    document.body.appendChild(video);
    const url = URL.createObjectURL(file);
    video.src = url;
    const cv = document.createElement('canvas'); cv.width = GRID_W; cv.height = GRID_H;
    const g2 = cv.getContext('2d', { willReadFrequently: true });
    const roi = o.roi || { x: 0, y: 0, w: 1, h: 1 };
    let prev = null, ctx = null, an = null, buf = null, timer = null, stopped = false, heardAny = false, stuck = 0, lastT = -1;
    const samples = [];
    const state = { pausedByHidden: false, duration: 0 };

    function cleanup() {
      stopped = true; clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
      try { video.pause(); } catch (e) { /* egal */ }
      try { if (ctx) ctx.close(); } catch (e) { /* egal */ }
      video.removeAttribute('src'); video.load(); video.remove();
      URL.revokeObjectURL(url);
    }
    function onVis() {
      if (document.visibilityState === 'hidden') { state.pausedByHidden = true; video.pause(); if (o.onHidden) o.onHidden(true); }
      else if (state.pausedByHidden) { state.pausedByHidden = false; video.play().catch(() => {}); if (o.onHidden) o.onHidden(false); }
    }
    function measureMotion(t) {
      g2.drawImage(video, 0, 0, GRID_W, GRID_H);
      const x0 = Math.floor(roi.x * GRID_W), y0 = Math.floor(roi.y * GRID_H);
      const w = Math.max(2, Math.floor(roi.w * GRID_W)), h = Math.max(2, Math.floor(roi.h * GRID_H));
      const d = g2.getImageData(x0, y0, w, h).data;
      const gray = new Uint8Array(w * h);
      for (let i = 0, k = 0; i < d.length; i += 4, k++) gray[k] = (d[i] * 2 + d[i + 1] * 5 + d[i + 2]) >> 3;
      let m = 0;
      if (prev && prev.length === gray.length) { let sum = 0; for (let k = 0; k < gray.length; k++) sum += Math.abs(gray[k] - prev[k]); m = sum / gray.length; }
      prev = gray;
      return { t, m };
    }
    function measureWhistle() {
      if (!an) return 0;
      an.getFloatFrequencyData(buf);
      const hz = ctx.sampleRate / an.fftSize;
      const a = Math.floor(2000 * RATE / hz), b = Math.min(buf.length - 1, Math.floor(5000 * RATE / hz));
      if (b <= a) return 0;
      let peak = -Infinity; const band = [];
      for (let i = a; i <= b; i++) { const v = buf[i]; if (v > peak) peak = v; band.push(v); }
      if (!isFinite(peak) || peak < -85) return 0;
      heardAny = true;
      band.sort((x, y) => x - y);
      return Math.max(0, peak - band[Math.floor(band.length / 2)]);
    }
    function step() {
      if (stopped) return;
      if (video.paused || video.seeking || video.readyState < 2) return;
      const t = video.currentTime;
      if (t === lastT) { if (++stuck > 400) { cleanup(); if (o.onError) o.onError(new Error('Das Video hängt.')); } return; }
      stuck = 0; lastT = t;
      const s = measureMotion(t);
      s.w = measureWhistle();
      samples.push(s);
      if (o.onProgress) o.onProgress(t / state.duration);
    }
    function done() {
      if (stopped) return;
      const dur = state.duration, hadAudio = heardAny;
      cleanup();
      if (o.onDone) o.onDone(Object.assign(detect(samples, dur), { duration: dur, audio: hadAudio, samples: samples.length }));
    }
    video.addEventListener('ended', done);
    video.addEventListener('error', () => { if (stopped) return; cleanup(); if (o.onError) o.onError(new Error('Das Videoformat kann dieser Browser nicht lesen.')); });
    video.addEventListener('loadedmetadata', async () => {
      // Manche Aufnahmen melden ihre Länge erst nach einem Sprung ans Ende
      if (!isFinite(video.duration)) {
        await new Promise((res) => { video.addEventListener('durationchange', function f() { if (isFinite(video.duration)) { video.removeEventListener('durationchange', f); res(); } }); video.currentTime = 1e9; });
        await new Promise((res) => { video.addEventListener('seeked', res, { once: true }); video.currentTime = 0; });
      }
      state.duration = video.duration;
      video.preservesPitch = false; video.mozPreservesPitch = false; video.webkitPreservesPitch = false;
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        const src = ctx.createMediaElementSource(video);
        an = ctx.createAnalyser(); an.fftSize = 4096; an.smoothingTimeConstant = 0;
        buf = new Float32Array(an.frequencyBinCount);
        const silent = ctx.createGain(); silent.gain.value = 0; // nur messen, nicht hören
        src.connect(an); an.connect(silent); silent.connect(ctx.destination);
        if (ctx.state === 'suspended') await ctx.resume();
      } catch (e) { an = null; }
      video.playbackRate = RATE;
      try { await video.play(); }
      catch (e) { video.muted = true; an = null; try { await video.play(); } catch (e2) { cleanup(); if (o.onError) o.onError(new Error('Der Browser lässt die Analyse nicht starten.')); return; } }
      document.addEventListener('visibilitychange', onVis);
      timer = setInterval(step, 40);
    });
    return { cancel: cleanup, get samples() { return samples; } };
  }

  root.VRally = { detect, analyze, findWhistles, toGrid, RATE, DT };
})(typeof self !== 'undefined' ? self : this);

/* Erzeugt im Browser ein künstliches Spielvideo mit bekannter Lösung: Bewegung und Pfiffe in den Ballwechseln, Pfiffe vom Nachbarfeld dazwischen. */
window.makeTestVideo = function (plan) {
  // plan: { rallies: [[s, e], ...], neighbor: [t, ...], duration }
  return new Promise((res) => {
    const cv = document.createElement('canvas'); cv.width = 320; cv.height = 180;
    const g = cv.getContext('2d');
    const ac = new AudioContext(); const dst = ac.createMediaStreamDestination();
    const beep = (t, gainV) => { const o = ac.createOscillator(); const gn = ac.createGain(); o.frequency.value = 3400; gn.gain.value = 0; o.connect(gn); gn.connect(dst); const at = ac.currentTime + t; gn.gain.setValueAtTime(gainV, at); gn.gain.setValueAtTime(0, at + 0.5); o.start(at); o.stop(at + 0.6); };
    const noise = ac.createBufferSource(); const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() - .5) * .04; noise.buffer = buf; noise.loop = true; noise.connect(dst); noise.start();
    plan.rallies.forEach(([s, e]) => { beep(s, .5); beep(e, .5); });
    (plan.neighbor || []).forEach((t) => beep(t, .12));
    const stream = cv.captureStream(15); dst.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus', videoBitsPerSecond: 400000 });
    const chunks = []; rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => { ac.close(); res(new Blob(chunks, { type: 'video/webm' })); };
    const t0 = performance.now(); rec.start(1000);
    const blobs = [...Array(8)].map(() => [Math.random() * 320, Math.random() * 180]);
    const timer = setInterval(() => {
      const t = (performance.now() - t0) / 1000;
      g.fillStyle = '#d9c3a8'; g.fillRect(0, 0, 320, 180); g.fillStyle = '#fff'; g.fillRect(158, 0, 4, 180);
      const inR = plan.rallies.some(([s, e]) => t > s + 2 && t < e);
      blobs.forEach((b, i) => { const speed = inR ? 18 : 1.2; b[0] = (b[0] + (Math.random() - .5) * speed + 320) % 320; b[1] = (b[1] + (Math.random() - .5) * speed + 180) % 180; g.fillStyle = i % 2 ? '#1d5fb4' : '#cf5426'; g.fillRect(b[0], b[1], 22, 34); });
      if (t >= plan.duration) { clearInterval(timer); rec.stop(); }
    }, 66);
  });
};

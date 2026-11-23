/* Volleyball Scouting – Start: Module verbinden, Offline-Modus anmelden */
(function () {
  'use strict';
  const V = window.VST, HOOK = V.HOOK;
  HOOK.afterRender = (view) => {
    document.body.classList.toggle('vmode', !!document.querySelector('#vp-slot'));
    if (HOOK.mountVideo) HOOK.mountVideo();
    if (HOOK.afterMountZones) HOOK.afterMountZones();
    if (HOOK.afterRenderZones) HOOK.afterRenderZones(view);
    if (HOOK.afterRenderShare) HOOK.afterRenderShare(view);
    // Spielbericht-Schreibweise: Nullen werden zum Punkt, damit das Auge an den echten Werten hängen bleibt
    view.querySelectorAll('.tbl:not(.imp):not(.cmd) td').forEach((td) => { if (td.children.length === 0 && td.textContent.trim() === '0') { td.textContent = '·'; td.classList.add('nil'); td.title = '0'; } });
    if (V.S.route !== 'details') delete view.dataset.dr;
    if (V.S.route !== 'karte') delete view.dataset.shared;
    if (V.S.route !== 'kader') delete view.dataset.kd;
    if (V.S.route !== 'video') delete view.dataset.vw;
  };
  V.start();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || /[?&]sw\b/.test(location.search))) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
})();

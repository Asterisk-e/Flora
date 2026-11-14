/* Flora developer options — the engine behind Settings › Developer options.
   Text-rendering overrides, drawing/monitoring overlays, wake lock, a debug log, a raw-data inspector and build info.
   Every preference is an ordinary `dev…` key in Flora's settings, so it is saved locally and counted under “Flora system” in Storage. */
(function () {
  'use strict';
  const C = window.FloraCore;
  if (!C) return;
  const { esc, $, $$ } = C;

  const DEFAULTS = { devEnabled: false, devSmooth: 'auto', devRender: 'auto', devLigatures: true, devKerning: true, devTabular: false, devStroke: '0px', devDir: 'auto', devLetter: 0, devWord: 0, devLineHeight: 0, devBounds: false, devPointer: false, devShowIds: false, devPerf: false, devAnimScale: 1, devStayAwake: false };

  /* ---------------------------------------------------------------- debug log (always on, small ring buffer) */
  const logs = [];
  const fmt = v => { if (v instanceof Error) return v.stack ? v.stack.split('\n').slice(0, 3).join(' ') : v.message; if (typeof v === 'object') { try { return JSON.stringify(v).slice(0, 300); } catch { return String(v); } } return String(v); };
  function log(level, message, source = 'app') { logs.push({ t: Date.now(), level, source, message: String(message).slice(0, 700) }); if (logs.length > 300) logs.shift(); }
  ['error', 'warn'].forEach(level => { const original = console[level]; console[level] = function (...args) { log(level, args.map(fmt).join(' '), 'console'); return original.apply(console, args); }; });
  window.addEventListener('error', e => log('error', `${e.message} (${(e.filename || '').split('/').pop()}:${e.lineno})`, 'window'));
  window.addEventListener('unhandledrejection', e => log('error', 'Unhandled promise rejection: ' + fmt(e.reason), 'promise'));
  log('info', 'Flora started', 'boot');

  /* ---------------------------------------------------------------- applying the settings */
  let pointerHandler = null, perfRaf = 0, wakeLock = null, wakeWanted = false;
  function attr(el, name, value) { if (value === null || value === undefined || value === false) el.removeAttribute(name); else el.setAttribute(name, value); }

  function apply(s) {
    const on = !!s.devEnabled, h = document.documentElement, b = document.body;
    const text = (key, fallback) => (on ? (s[key] ?? fallback) : fallback);
    attr(h, 'data-dev-smooth', on && s.devSmooth !== 'auto' ? s.devSmooth : null);
    if (on && s.devRender !== 'auto') { h.setAttribute('data-dev-render', s.devRender); h.style.setProperty('--dev-render', s.devRender); } else { h.removeAttribute('data-dev-render'); h.style.removeProperty('--dev-render'); }
    attr(h, 'data-dev-liga', on && s.devLigatures === false ? 'off' : null);
    attr(h, 'data-dev-kern', on && s.devKerning === false ? 'off' : null);
    attr(h, 'data-dev-num', on && s.devTabular ? 'tabular' : null);
    const stroke = text('devStroke', '0px');
    if (on && stroke !== '0px') { h.setAttribute('data-dev-stroke', ''); h.style.setProperty('--dev-stroke', stroke); } else { h.removeAttribute('data-dev-stroke'); h.style.removeProperty('--dev-stroke'); }
    const spacing = (key, cssVar, attrName, unit) => { const v = Number(text(key, 0)); if (on && v) { h.setAttribute(attrName, ''); h.style.setProperty(cssVar, v + unit); } else { h.removeAttribute(attrName); h.style.removeProperty(cssVar); } };
    spacing('devLetter', '--dev-ls', 'data-dev-ls', 'em'); spacing('devWord', '--dev-ws', 'data-dev-ws', 'em'); spacing('devLineHeight', '--dev-lh', 'data-dev-lh', '');
    if (on && s.devDir && s.devDir !== 'auto') h.setAttribute('dir', s.devDir); else h.removeAttribute('dir');
    b.classList.toggle('dev-bounds', on && !!s.devBounds);
    pointerOverlay(on && !!s.devPointer);
    perfOverlay(on && !!s.devPerf);
    wake(on && !!s.devStayAwake);
  }

  /* pointer location: a ring that follows the pointer and a readout bar, like Android's overlay */
  function pointerOverlay(show) {
    let box = $('#dev-pointer');
    if (!show) { if (box) box.remove(); if (pointerHandler) { window.removeEventListener('pointermove', pointerHandler, true); window.removeEventListener('pointerdown', pointerHandler, true); pointerHandler = null; } return; }
    if (box) return;
    box = document.createElement('div'); box.id = 'dev-pointer'; box.innerHTML = '<div class="dev-readout">Move the pointer or touch the screen</div><i class="dev-ring"></i>'; document.body.append(box);
    pointerHandler = e => {
      box.querySelector('.dev-readout').textContent = `x ${Math.round(e.clientX)}  y ${Math.round(e.clientY)}  ·  ${e.pointerType || 'mouse'}  ·  pressure ${(e.pressure || 0).toFixed(2)}  ·  buttons ${e.buttons}`;
      const ring = box.querySelector('.dev-ring'); ring.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`; ring.classList.toggle('down', e.buttons > 0);
    };
    window.addEventListener('pointermove', pointerHandler, true); window.addEventListener('pointerdown', pointerHandler, true);
  }

  /* performance monitor */
  function perfOverlay(show) {
    let box = $('#dev-perf');
    if (!show) { cancelAnimationFrame(perfRaf); perfRaf = 0; if (box) box.remove(); return; }
    if (box) return;
    box = document.createElement('div'); box.id = 'dev-perf'; box.textContent = 'measuring…'; document.body.append(box);
    let frames = 0, last = performance.now();
    const tick = now => {
      frames++;
      if (now - last >= 1000) {
        const mem = performance.memory ? ` · ${(performance.memory.usedJSHeapSize / 1048576).toFixed(1)} MB heap` : '';
        box.textContent = `${Math.round(frames * 1000 / (now - last))} fps · ${document.getElementsByTagName('*').length} nodes${mem} · ${C.formatBytes(C.localDataSize())} stored`;
        frames = 0; last = now;
      }
      perfRaf = requestAnimationFrame(tick);
    };
    perfRaf = requestAnimationFrame(tick);
  }

  /* stay awake (Screen Wake Lock) */
  async function wake(want) {
    wakeWanted = want;
    if (!want) { try { await wakeLock?.release(); } catch {} wakeLock = null; return; }
    if (!('wakeLock' in navigator) || wakeLock) return;
    try { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); log('info', 'Screen wake lock acquired', 'wakelock'); } catch (error) { log('warn', 'Wake lock refused: ' + error.message, 'wakelock'); }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && wakeWanted && !wakeLock) wake(true); });

  /* ---------------------------------------------------------------- build and device info */
  async function info() {
    const est = await C.storageEstimate(), persisted = await (navigator.storage?.persisted?.() || Promise.resolve(false)).catch(() => false);
    const reg = await (navigator.serviceWorker?.getRegistration?.() || Promise.resolve(null)).catch(() => null);
    let caches_ = []; try { caches_ = await caches.keys(); } catch {}
    return [
      ['Flora', 'Version 3.0 · static build'], ['Interface', `${C.settings.androidUI === false ? 'Classic' : 'Android 13'} · ${document.documentElement.dataset.theme} theme · animation ${document.documentElement.dataset.anim}`],
      ['Database', typeof indexedDB !== 'undefined' ? 'IndexedDB' : 'localStorage fallback'], ['Stored by Flora', `${C.formatBytes(C.localDataSize())} of ${C.formatBytes(C.settings.storageLimitBytes)} limit`],
      ['Browser allowance', est.quota ? `${C.formatBytes(est.usage)} used of about ${C.formatBytes(est.quota)}` : 'Not reported'], ['Persistent storage', persisted ? 'Granted' : 'Not granted'],
      ['Service worker', reg ? (reg.active ? 'Active' : 'Installing') + (navigator.serviceWorker.controller ? ', controlling this page' : '') : 'Not registered'], ['Caches', caches_.length ? caches_.join(', ') : 'None'],
      ['Screen', `${innerWidth} × ${innerHeight} at ${devicePixelRatio}×`], ['Language and zone', `${navigator.language} · ${Intl.DateTimeFormat().resolvedOptions().timeZone}`],
      ['Network', navigator.onLine ? 'Online' : 'Offline'], ['Browser', navigator.userAgent]
    ];
  }
  async function fillInfo(root) {
    const host = $('#dev-info', root); if (!host) return;
    const rows = await info();
    host.innerHTML = rows.map(([k, v]) => `<div class="info-line"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('');
  }

  /* ---------------------------------------------------------------- sheets */
  function sheet(html) {
    $('#modal-root').innerHTML = `<div class="modal-backdrop chooser-backdrop"><section class="chooser-card dev-sheet" role="dialog" aria-modal="true">${html}</section></div>`;
    const back = $('.chooser-backdrop'); back.addEventListener('click', e => { if (e.target === back || e.target.closest('[data-close]')) C.closeModal(); });
    return back;
  }
  function showLog() {
    const draw = (level = 'all') => {
      const list = logs.filter(l => level === 'all' || l.level === level).slice().reverse();
      return `<h3>Debug log</h3><p>The last ${logs.length} events since Flora started: navigation, exports, warnings and errors. It is kept in memory only.</p>
        <div class="dev-bar"><select class="select-control" id="log-level" aria-label="Level">${['all', 'error', 'warn', 'info'].map(l => `<option value="${l}" ${l === level ? 'selected' : ''}>${l === 'all' ? 'All levels' : l}</option>`).join('')}</select><button class="btn btn-secondary btn-small" data-log="copy">Copy</button><button class="btn btn-ghost btn-small" data-log="clear">Clear</button></div>
        <div class="log-list">${list.length ? list.map(l => `<div class="log-line ${l.level}"><time>${new Date(l.t).toLocaleTimeString()}</time><b>${l.level}</b><span>${esc(l.message)}</span><small>${esc(l.source)}</small></div>`).join('') : '<p class="small-print" style="padding:14px">Nothing logged at this level.</p>'}</div>
        <div class="chooser-foot"><button class="btn btn-ghost" data-close>Close</button></div>`;
    };
    const back = sheet(draw()); let level = 'all';
    const repaint = () => { $('.dev-sheet').innerHTML = draw(level); };
    back.addEventListener('change', e => { if (e.target.id === 'log-level') { level = e.target.value; repaint(); } });
    back.addEventListener('click', async e => {
      const b = e.target.closest('[data-log]'); if (!b) return;
      if (b.dataset.log === 'clear') { logs.length = 0; repaint(); }
      if (b.dataset.log === 'copy') { const text = logs.map(l => `${new Date(l.t).toISOString()} [${l.level}] (${l.source}) ${l.message}`).join('\n'); try { await navigator.clipboard.writeText(text); C.toast('Log copied', 'success'); } catch { C.toast('Could not copy. Select the text manually.'); } }
    });
  }
  async function showInspector() {
    const meta = await C.getAllMeta();
    const entries = [{ id: 'settings', label: 'Settings', value: () => C.settings, editable: true }, { id: 'profiles', label: 'Profiles', value: () => C.profiles },
      ...meta.filter(m => m.key === 'tasks' || m.key.startsWith('tool:')).map(m => ({ id: 'meta:' + m.key, label: m.key === 'tasks' ? 'Rowan Tasks' : 'Tool: ' + m.key.slice(5), value: () => m.value })),
      ...C.files.map(f => ({ id: 'file:' + f.id, label: `File: ${f.name} (${C.fileInfo[f.type]?.short || f.type})`, value: () => f }))];
    const back = sheet(`<h3>Inspect stored data</h3><p>The raw JSON Flora keeps on this device. Settings can be edited and applied.</p>
      <div class="dev-bar"><select class="select-control" id="insp-pick" aria-label="Record">${entries.map(e => `<option value="${esc(e.id)}">${esc(e.label)}</option>`).join('')}</select></div>
      <div class="dev-bar"><span class="small-print" id="insp-size"></span><span style="flex:1"></span><button class="btn btn-secondary btn-small" data-insp="copy">Copy</button><button class="btn btn-secondary btn-small" data-insp="download">Download</button><button class="btn btn-secondary btn-small" data-insp="edit" id="insp-edit" hidden>Edit</button><button class="btn btn-primary btn-small" data-insp="apply" id="insp-apply" hidden>Apply</button></div>
      <textarea id="insp-text" class="hexdump insp-text" spellcheck="false" readonly aria-label="JSON"></textarea><div class="chooser-foot"><button class="btn btn-ghost" data-close>Close</button></div>`);
    const pick = $('#insp-pick'), area = $('#insp-text'); let editing = false;
    const show = () => {
      const entry = entries.find(e => e.id === pick.value); const text = JSON.stringify(entry.value(), null, 2);
      area.value = text.length > 80000 ? text.slice(0, 80000) + '\n… truncated for display' : text; area.readOnly = true; editing = false;
      $('#insp-size').textContent = `${C.formatBytes(new Blob([text]).size)} · ${text.split('\n').length} lines`;
      $('#insp-edit').hidden = !entry.editable; $('#insp-apply').hidden = true;
    };
    pick.addEventListener('change', show); show();
    back.addEventListener('click', async e => {
      const b = e.target.closest('[data-insp]'); if (!b) return;
      if (b.dataset.insp === 'copy') { try { await navigator.clipboard.writeText(area.value); C.toast('Copied', 'success'); } catch { area.select(); C.toast('Press Ctrl+C to copy'); } }
      if (b.dataset.insp === 'download') C.downloadBlob(new Blob([area.value], { type: 'application/json; charset=utf-8' }), `${pick.value.replace(/[^\w-]+/g, '_')}.json`);
      if (b.dataset.insp === 'edit') { editing = true; area.readOnly = false; area.focus(); $('#insp-apply').hidden = false; C.toast('Editing settings. Invalid JSON is rejected when you press Apply.'); }
      if (b.dataset.insp === 'apply' && editing) { try { const obj = JSON.parse(area.value); if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('Settings must be a JSON object.'); await C.saveSettings(obj); C.closeModal(); C.renderView(); C.toast('Settings applied', 'success'); } catch (error) { C.toast(error.message, 'error'); } }
    });
  }

  /* ---------------------------------------------------------------- maintenance */
  async function clearCacheAndReload() {
    try { const regs = await navigator.serviceWorker?.getRegistrations?.(); for (const r of regs || []) await r.unregister(); } catch {}
    try { for (const key of await caches.keys()) await caches.delete(key); } catch {}
    log('info', 'Offline cache cleared; reloading', 'maintenance'); location.reload();
  }
  async function copySettings() { try { await navigator.clipboard.writeText(JSON.stringify(C.settings, null, 2)); C.toast('Settings copied as JSON', 'success'); } catch { C.toast('Could not copy to the clipboard.', 'error'); } }
  const sizeOfDevSettings = () => { const s = C.settings, subset = {}; Object.keys(s).filter(k => k.startsWith('dev')).forEach(k => { subset[k] = s[k]; }); try { return new Blob([JSON.stringify(subset)]).size; } catch { return 0; } };

  window.FloraDev = { apply, log, logs, info, fillInfo, showLog, showInspector, clearCacheAndReload, copySettings, defaults: DEFAULTS, devSize: sizeOfDevSettings };
  apply(C.settings);
})();

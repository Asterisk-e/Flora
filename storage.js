/* Flora storage — modelled on Android 13’s Storage screen: a large “used” figure, a pill bar, a Free up space card
   and one row per category with a thin bar. Categories here are Flora’s applications and its own system data. */
(function () {
  'use strict';
  const C = window.FloraCore;
  if (!C || !C.icon) return;
  const { esc, $, $$ } = C, icon = C.icon, ui = C.ui;
  ui.storageSheet = null;
  const selected = new Set();
  const TOOL_NAMES = { 'tool:timetable': 'Timetable', 'tool:countdowns': 'Countdowns', 'tool:grades': 'Grade Calculator' };
  const DEFAULTS = { 'tool:grades': null };

  function parts(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0, v = Math.max(0, bytes);
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return { value: v, unit: units[i], dec: i === 0 ? 0 : v >= 100 ? 0 : 1 };
  }
  const fmtParts = p => p.value.toFixed(p.dec);
  const sizeText = bytes => { const p = parts(bytes); return `${fmtParts(p).replace(/\.0$/, '')} ${p.unit}`; };
  const jsonSize = v => { try { return new Blob([JSON.stringify(v)]).size; } catch { return 0; } };

  async function gather() {
    const limit = C.settings.storageLimitBytes, used = C.localDataSize();
    const cats = new Map();
    C.appTypes.forEach(type => cats.set(type, { id: type, name: C.fileInfo[type].label, icon: type, files: [], size: 0 }));
    C.files.forEach(file => { const c = cats.get(file.type); if (!c) return; const size = C.fileSize(file); c.files.push({ file, size }); c.size += size; });
    const fileTotal = [...cats.values()].reduce((n, c) => n + c.size, 0);
    const meta = await C.getAllMeta();
    const devSize = window.FloraDev ? window.FloraDev.devSize() : 0;
    const sysItems = [{ name: 'Profiles', size: jsonSize(C.profiles) }, { name: 'Settings', size: Math.max(0, jsonSize(C.settings) - devSize) }, ...(C.settings.devUnlocked ? [{ name: 'Developer options', size: devSize }] : [])];
    meta.forEach(m => {
      if (m.key === 'tasks') sysItems.push({ name: 'Rowan Tasks', size: jsonSize(m.value), key: m.key });
      else if (m.key.startsWith('tool:')) sysItems.push({ name: TOOL_NAMES[m.key] || m.key.slice(5), size: jsonSize(m.value), key: m.key });
    });
    const system = { id: 'system', name: 'Flora system', icon: 'system', size: Math.max(0, used - fileTotal), items: sysItems };
    return { limit, used, cats, system, estimate: await C.storageEstimate(), persisted: await (navigator.storage?.persisted?.() || Promise.resolve(false)).catch(() => false) };
  }

  const barHTML = (size, limit) => `<span class="sr-bar"><i data-w="${size ? Math.max(1.2, Math.min(100, size / limit * 100)).toFixed(2) : 0}"></i></span>`;
  function animate(root) {
    const off = C.animOff();
    $$('[data-w]', root).forEach(el => { if (off) el.style.width = el.dataset.w + '%'; else requestAnimationFrame(() => requestAnimationFrame(() => { el.style.width = el.dataset.w + '%'; })); });
    $$('[data-count]', root).forEach(el => { const p = parts(Number(el.dataset.count)); C.countUp(el, p.value, { format: v => v.toFixed(p.dec) }); });
  }
  function back(root, to = null) { ui.storageSheet = to; selected.clear(); draw(root, { dir: 'back' }); window.scrollTo(0, 0); }

  /* ---------------------------------------------------------------- main screen */
  function mainHTML(d) {
    const p = parts(d.used), s = C.settings, pct = Math.min(100, d.used / d.limit * 100);
    const rows = [...d.cats.values(), d.system].sort((a, b) => (b.size > 0) - (a.size > 0) || b.size - a.size || a.name.localeCompare(b.name));
    return `<button class="round-back" data-st-back aria-label="Back">${icon('back')}</button>
      <h1 class="android-title">Storage</h1>
      <div class="storage-summary"><div class="storage-number"><span data-count="${d.used}">${fmtParts(p)}</span><small>${p.unit} used</small></div><span class="storage-total">${esc(sizeText(d.limit))} total</span></div>
      <div class="storage-bar ${d.used > d.limit ? 'over' : ''}" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100" aria-label="Storage used"><i data-w="${Math.max(d.used ? 1.5 : 0, pct).toFixed(2)}"></i></div>
      <button class="free-card" data-st-free><span class="free-ico">${icon('free', 26)}</span><span class="free-copy"><strong>Free up space</strong><small>Review large, old and empty files to make room.</small></span></button>
      <div class="storage-rows">${rows.map((r, i) => `<button class="storage-row ${r.size ? '' : 'empty'}" data-st-open="${r.id}" style="--i:${i}"><span class="sr-icon">${icon(r.icon)}</span><span class="sr-main"><span class="sr-line"><strong>${esc(r.name)}</strong><span class="sr-size">${esc(sizeText(r.size))}</span></span>${barHTML(r.size, d.limit)}</span></button>`).join('')}</div>
      <h2 class="android-section">Storage settings</h2>
      <div class="android-group">
        <button class="android-row" data-st-limit><div class="android-row-body"><strong>Storage limit</strong><small>${esc(sizeText(s.storageLimitBytes))} for Flora. Saving stops before this is exceeded.</small></div>${icon('chevron', 20)}</button>
        <div class="android-row static"><div class="android-row-body"><strong>Protect my data</strong><small>${d.persisted ? 'Protected. Your browser will not clear Flora on its own.' : 'Not protected. Browsers may clear site data when space is low.'}</small></div>${d.persisted ? '' : '<button class="btn btn-secondary btn-small" data-st-persist>Keep my data</button>'}</div>
        <div class="android-row static info"><div class="android-row-body"><strong>Browser allowance</strong><small>${d.estimate.quota ? `${esc(sizeText(d.estimate.usage))} used by this site of about ${esc(sizeText(d.estimate.quota))} available on this device.` : 'Your browser does not report an allowance.'}</small></div></div>
      </div>`;
  }

  /* ---------------------------------------------------------------- category sheet */
  function sheetHTML(d, id) {
    if (id === 'system') {
      const items = d.system.items;
      return `<button class="round-back" data-st-sheet-back aria-label="Back">${icon('back')}</button><h1 class="android-title">Flora system</h1>
        <div class="storage-summary"><div class="storage-number"><span>${fmtParts(parts(d.system.size))}</span><small>${parts(d.system.size).unit} used</small></div></div>
        <p class="android-lead">Profiles, settings, tasks and the data kept by tools. This is needed for Flora to work, but tool data can be cleared.</p>
        <div class="android-group">${items.map(it => `<div class="android-row static"><div class="android-row-body"><strong>${esc(it.name)}</strong><small>${esc(sizeText(it.size))}</small></div>${it.key ? `<button class="btn btn-secondary btn-small" data-st-reset="${esc(it.key)}">Clear</button>` : ''}</div>`).join('')}</div>`;
    }
    const cat = d.cats.get(id); if (!cat) return '';
    const sorted = [...cat.files].sort((a, b) => b.size - a.size);
    return `<button class="round-back" data-st-sheet-back aria-label="Back">${icon('back')}</button><h1 class="android-title">${esc(cat.name)}</h1>
      <div class="storage-summary"><div class="storage-number"><span>${fmtParts(parts(cat.size))}</span><small>${parts(cat.size).unit} · ${cat.files.length} file${cat.files.length === 1 ? '' : 's'}</small></div><button class="btn btn-secondary btn-small" data-st-create="${cat.id}">New ${esc(C.fileInfo[cat.id].short.toLowerCase())}</button></div>
      ${sorted.length ? `<div class="android-group">${sorted.map(({ file, size }) => `<div class="android-row static" data-file-row="${file.id}"><div class="android-row-body"><strong>${esc(file.name)}</strong><small>${esc(sizeText(size))} · edited ${esc(C.prettyDate(file.updatedAt))}</small></div><span class="row-actions"><button class="btn btn-ghost btn-small" data-st-openfile="${file.id}">Open</button><button class="btn btn-ghost btn-small" data-st-del="${file.id}">Delete</button></span></div>`).join('')}</div>` : `<div class="android-group"><div class="android-row static info"><div class="android-row-body"><strong>Nothing here yet</strong><small>Files you make with ${esc(cat.name)} will appear here.</small></div></div></div>`}
      ${sorted.length > 1 ? `<button class="btn btn-ghost danger-link" data-st-delall="${cat.id}">Delete all ${sorted.length} files</button>` : ''}`;
  }

  /* ---------------------------------------------------------------- Free up space */
  const isEmpty = f => {
    const c = f.content;
    try {
      if (f.type === 'note') return !String(c).trim();
      if (f.type === 'doc') return (new DOMParser().parseFromString(String(c), 'text/html').body.textContent || '').trim().length <= 24;
      if (f.type === 'sheet') return !Object.values(c.cells || {}).some(v => String(v).trim());
      if (f.type === 'slides') return !(c || []).some(s => String(s.body || '').trim()) && (c || []).length <= 1;
      if (f.type === 'board') return !(c || []).length;
      if (f.type === 'code') return !String(c.text || '').trim();
      if (f.type === 'sketch') return !c.data;
      if (f.type === 'cards') return !(c.cards || []).some(x => (x.q || '').trim() || (x.a || '').trim());
      if (f.type === 'kanban') return !(c.columns || []).some(col => col.cards.length);
      if (f.type === 'journal') return !(c.entries || []).some(e => String(e.text).trim());
    } catch {}
    return false;
  };
  function freeSections() {
    const sized = C.files.map(file => ({ file, size: C.fileSize(file) }));
    const old = Date.now() - 60 * 864e5;
    return [
      { id: 'big', title: 'Largest files', hint: 'The files taking the most room.', items: [...sized].sort((a, b) => b.size - a.size).slice(0, 5).filter(x => x.size > 2048) },
      { id: 'old', title: 'Not opened in 60 days', hint: 'Untouched for two months.', items: sized.filter(x => new Date(x.file.updatedAt).getTime() < old).sort((a, b) => b.size - a.size).slice(0, 8) },
      { id: 'empty', title: 'Empty files', hint: 'Created but never filled in.', items: sized.filter(x => isEmpty(x.file)).slice(0, 12) }
    ];
  }
  function freeHTML() {
    const sections = freeSections(), any = sections.some(s => s.items.length);
    return `<button class="round-back" data-st-sheet-back aria-label="Back">${icon('back')}</button><h1 class="android-title">Free up space</h1>
      <p class="android-lead">Choose files to remove from this device. Deleted files cannot be recovered, so export anything you want to keep first.</p>
      ${any ? sections.filter(s => s.items.length).map(s => `<h2 class="android-section">${s.title}<small>${s.hint}</small></h2><div class="android-group">${s.items.map(({ file, size }) => `<label class="android-row check" data-check-row="${file.id}"><input type="checkbox" data-st-check="${file.id}" ${selected.has(file.id) ? 'checked' : ''}><span class="a-check"></span><div class="android-row-body"><strong>${esc(file.name)}</strong><small>${esc(C.fileInfo[file.type]?.short || 'File')} · ${esc(sizeText(size))} · edited ${esc(C.prettyDate(file.updatedAt))}</small></div></label>`).join('')}</div>`).join('') : `<div class="android-group"><div class="android-row static info"><div class="android-row-body"><strong>Nothing to suggest</strong><small>No large, old or empty files right now. Nice and tidy.</small></div></div></div>`}
      <div class="android-group" style="margin-top:14px"><button class="android-row nav" data-st-files><div class="android-row-body"><strong>Open My files</strong><small>Browse and sort everything yourself.</small></div>${icon('chevron', 20)}</button></div>
      <div class="free-bar" id="free-bar" hidden><div><small>Selected</small><strong id="free-total">0 B</strong></div><button class="btn btn-primary" data-st-delsel>Delete selected</button></div>`;
  }
  function paintFreeBar(root) {
    const bar = $('#free-bar', root); if (!bar) return;
    const total = [...selected].reduce((n, id) => { const f = C.files.find(x => x.id === id); return n + (f ? C.fileSize(f) : 0); }, 0);
    bar.hidden = !selected.size; $('#free-total', root).textContent = `${sizeText(total)} · ${selected.size} file${selected.size === 1 ? '' : 's'}`;
    $$('[data-check-row]', root).forEach(row => row.classList.toggle('on', selected.has(row.dataset.checkRow)));
    $$('[data-st-check]', root).forEach(cb => { cb.checked = selected.has(cb.dataset.stCheck); });
  }

  /* ---------------------------------------------------------------- limit dialog */
  async function limitDialog() {
    const s = C.settings;
    $('#modal-root').innerHTML = `<div class="modal-backdrop chooser-backdrop"><section class="chooser-card" role="dialog" aria-modal="true" aria-label="Storage limit"><h3>Storage limit</h3><p>How much room Flora may use on this device. Your browser’s own allowance is the ceiling.</p><div class="limit-grid"><div class="form-field"><label for="lim-amount">Amount</label><select id="lim-amount" class="select-control"></select></div><div class="form-field"><label for="lim-unit">Unit</label><select id="lim-unit" class="select-control">${['KB', 'MB', 'GB'].map(u => `<option ${u === s.storageUnit ? 'selected' : ''}>${u}</option>`).join('')}</select></div></div><div class="chip-row" id="lim-presets">${[['64 MB', 64, 'MB'], ['256 MB', 256, 'MB'], ['1 GB', 1, 'GB'], ['4 GB', 4, 'GB']].map(([l, a, u]) => `<button class="choice-chip" data-preset="${a}:${u}">${l}</button>`).join('')}</div><div class="chooser-foot"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" data-save>Save limit</button></div></section></div>`;
    const back = $('.chooser-backdrop'), amount = $('#lim-amount'), unit = $('#lim-unit');
    const mult = u => u === 'GB' ? 1024 ** 3 : u === 'MB' ? 1024 ** 2 : 1024;
    const fill = async (preferred) => { const opts = await C.storageChoices(unit.value); const list = opts.includes(preferred) ? opts : [...opts, preferred].filter(Boolean).sort((a, b) => a - b); amount.innerHTML = list.map(n => `<option value="${n}" ${n === preferred ? 'selected' : ''}>${n}</option>`).join(''); };
    await fill(s.storageAmount);
    unit.addEventListener('change', () => fill(Number(amount.value) || 16));
    back.addEventListener('click', async e => {
      if (e.target === back || e.target.closest('[data-close]')) { C.closeModal(); return; }
      const pre = e.target.closest('[data-preset]'); if (pre) { const [a, u] = pre.dataset.preset.split(':'); unit.value = u; await fill(Number(a)); return; }
      if (e.target.closest('[data-save]')) {
        const a = Number(amount.value), u = unit.value, bytes = a * mult(u);
        if (bytes < C.localDataSize()) { C.toast(`Flora already uses ${sizeText(C.localDataSize())}. Choose a larger limit or free up space first.`, 'error'); return; }
        await C.saveSettings({ storageAmount: a, storageUnit: u, storageLimitBytes: bytes }); C.closeModal(); C.toast(`Storage limit set to ${a} ${u}`, 'success'); draw($('#view-root'));
      }
    });
  }

  /* ---------------------------------------------------------------- the view */
  let data = null;
  async function draw(root, opts = {}) {
    data = await gather(); if (C.currentView !== 'storage') return;
    const sheet = ui.storageSheet;
    const html = sheet === 'free' ? freeHTML() : sheet ? sheetHTML(data, sheet) : mainHTML(data);
    root.innerHTML = `<div class="android-screen storage-screen ${opts.dir === 'back' ? 'slide-back' : opts.dir === 'in' ? 'slide-in' : ''}">${html}</div>`;
    animate(root); if (sheet === 'free') paintFreeBar(root);
  }
  async function deleteIds(root, ids, label) {
    if (!ids.length) return;
    const total = ids.reduce((n, id) => { const f = C.files.find(x => x.id === id); return n + (f ? C.fileSize(f) : 0); }, 0);
    if (C.settings.confirmDelete && !confirm(`Delete ${label || (ids.length + ' file' + (ids.length === 1 ? '' : 's'))} (${sizeText(total)})? This cannot be undone.`)) return;
    await C.deleteFiles(ids); ids.forEach(id => selected.delete(id));
    C.toast(`Freed ${sizeText(total)}`, 'success'); draw(root);
  }

  C.registerView('storage', {
    crumb: ['Settings', 'Storage'], navParent: 'settings',
    leave: () => { ui.storageSheet = null; selected.clear(); },
    render: root => {
      draw(root);
      C.bindRoot(root, {
        click: async e => {
          const t = e.target.closest('button, label'); if (!t) return;
          if (t.matches('[data-st-back]')) { const to = C.lastView && C.lastView !== 'storage' && C.lastView !== 'editor' ? C.lastView : 'settings'; C.setActiveView(to); return; }
          if (t.matches('[data-st-sheet-back]')) { back(root, null); return; }
          if (t.matches('[data-st-open]')) { ui.storageSheet = t.dataset.stOpen; draw(root, { dir: 'in' }); window.scrollTo(0, 0); return; }
          if (t.matches('[data-st-free]')) { ui.storageSheet = 'free'; selected.clear(); draw(root, { dir: 'in' }); window.scrollTo(0, 0); return; }
          if (t.matches('[data-st-limit]')) { limitDialog(); return; }
          if (t.matches('[data-st-persist]')) { const ok = await C.requestPersist(); C.toast(ok ? 'Flora’s data is now protected.' : 'Your browser did not grant protection. Installing Flora as an app often helps.', ok ? 'success' : ''); draw(root); return; }
          if (t.matches('[data-st-files]')) { C.setActiveView('files'); return; }
          if (t.matches('[data-st-create]')) { C.createFile(t.dataset.stCreate); return; }
          if (t.matches('[data-st-openfile]')) { C.openFile(t.dataset.stOpenfile); return; }
          if (t.matches('[data-st-del]')) { const f = C.files.find(x => x.id === t.dataset.stDel); deleteIds(root, [t.dataset.stDel], `“${f?.name}”`); return; }
          if (t.matches('[data-st-delall]')) { const ids = C.files.filter(f => f.type === t.dataset.stDelall).map(f => f.id); deleteIds(root, ids, `all ${ids.length} files`); return; }
          if (t.matches('[data-st-delsel]')) { deleteIds(root, [...selected]); return; }
          if (t.matches('[data-st-reset]')) {
            const key = t.dataset.stReset; if (!confirm('Clear this data? It cannot be undone.')) return;
            if (key === 'tasks') { window._floraTasks = []; await C.setMeta('tasks', []); } else { await C.deleteRecord('meta', key); C.forgetMeta(key); window.dispatchEvent(new Event('flora-tool-reset')); }
            C.toast('Cleared', 'success'); draw(root);
          }
        },
        change: e => {
          const cb = e.target.closest('[data-st-check]'); if (!cb) return;
          if (cb.checked) selected.add(cb.dataset.stCheck); else selected.delete(cb.dataset.stCheck);
          paintFreeBar(root);
        }
      });
    }
  });
})();

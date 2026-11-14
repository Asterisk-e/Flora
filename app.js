/* Flora — offline-first creative workspace. No external JavaScript dependencies. */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : `flora-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const now = () => new Date().toISOString();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const FONT_STACKS = {
    serif:"'Newsreader',Georgia,'Times New Roman',serif",
    sans:"system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
    mono:"ui-monospace,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace",
    readable:"Verdana,'Trebuchet MS','Segoe UI',Tahoma,Geneva,sans-serif"
  };
  const hexToRgb = hex => { const h = String(hex).replace('#',''); const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h; return [parseInt(f.slice(0,2),16), parseInt(f.slice(2,4),16), parseInt(f.slice(4,6),16)]; };
  const rgbToHex = (r,g,b) => '#' + [r,g,b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2,'0')).join('');
  const mixHex = (a, b, amount) => { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A[0] + (B[0]-A[0])*amount, A[1] + (B[1]-A[1])*amount, A[2] + (B[2]-A[2])*amount); };
  const luminance = hex => { const [r,g,b] = hexToRgb(hex).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126*r + .7152*g + .0722*b; };
  const prettyDate = value => new Intl.DateTimeFormat(undefined, { dateStyle:'medium', timeStyle:'short' }).format(new Date(value));
  const formatBytes = bytes => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B','KB','MB','GB','TB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const n = bytes / (1024 ** i);
    return `${n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)} ${units[i]}`;
  };
  const fileInfo = {
    doc: { label:'Azalea Docs', short:'Document', icon:'', color:'#f5e7bb', extensions:['docx','html','doc','txt','md'], glyph:'AZ', blurb:'Write, format and export documents', landing:'A page-focused writing workspace with familiar formatting controls.' },
    sheet: { label:'Amaryllis Sheets', short:'Spreadsheet', icon:'', color:'#f1dfd7', extensions:['xlsx','csv','json','html'], glyph:'AM', blurb:'Tables, calculations and data', landing:'Organise information, calculate totals and inspect your data.' },
    slides: { label:'Iris Presentations', short:'Presentation', icon:'', color:'#e5e3ef', extensions:['pptx','html','json'], glyph:'IR', blurb:'Build clear presentations', landing:'Turn an outline into a clear presentation.' },
    note: { label:'Anemone Notes', short:'Note', icon:'', color:'#e4eadc', extensions:['txt','md','html'], glyph:'AN', blurb:'Capture quick thoughts', landing:'Keep short notes and working thoughts close at hand.' },
    board: { label:'Dahlia Boards', short:'Board', icon:'', color:'#eae2ee', extensions:['json','html'], glyph:'DA', blurb:'Arrange ideas on a canvas', landing:'Arrange ideas, references and plans on a freeform board.' }
  };
  const appTypes = ['doc','sheet','slides','note','board'];
  const appRegistry = new Map();   // extra file-based applications (apps.js)
  const toolRegistry = new Map();  // extra tools (tools.js)
  const viewRegistry = new Map();  // any routable view: { render(root), crumb:[parent,current], navParent }
  const builtinTools = [
    { id:'amethyst', title:'Amethyst', short:'AM', cat:'Share', label:'Peer-to-peer transfer', desc:'Send Flora files directly to another person on your local network.' },
    { id:'tasks', title:'Rowan Tasks', short:'RT', cat:'Plan', label:'Planning', desc:'Keep a lightweight checklist alongside your projects.' },
    { id:'focus', title:'Camellia Focus', short:'CF', cat:'Focus', label:'Focus', desc:'A focus and break timer with a progress ring and a soft chime.' },
    { id:'storage', title:'Flora Storage', short:'ST', cat:'Files', label:'Storage', desc:'See what uses your space, free some up and manage your storage cap.' }
  ];
  function registerApp(def) {
    fileInfo[def.type] = { label:def.label, short:def.short, icon:'', color:def.color || '#eee', extensions:def.extensions, glyph:def.glyph, blurb:def.blurb, landing:def.landing };
    if (!appTypes.includes(def.type)) appTypes.push(def.type);
    appRegistry.set(def.type, def);
  }
  function registerTool(def) {
    toolRegistry.set(def.id, def);
    viewRegistry.set(def.id, { render:def.render, crumb:['Tools', def.title], navParent:'tools', leave:def.leave });
  }
  function registerView(id, def) { viewRegistry.set(id, def); }
  function allTools() {
    return [...builtinTools, ...[...toolRegistry.values()].map(t => ({ id:t.id, title:t.title, short:t.short || t.title.slice(0,2).toUpperCase(), cat:t.cat || 'Utilities', label:t.label || t.cat || 'Tool', desc:t.desc || '' }))];
  }
  const defaultSettings = {
    autosave:true, confirmDelete:true, largeText:false, highContrast:false, reduceMotion:false,
    accent:'#e9c96b', storageLimitBytes:64 * 1024 * 1024, storageUnit:'MB', storageAmount:64,
    compactMode:false, spellcheck:true, localOnly:true,
    // look and feel
    devUnlocked:false, devEnabled:false, devSmooth:'auto', devRender:'auto', devLigatures:true, devKerning:true, devTabular:false, devStroke:'0px', devDir:'auto',
    devLetter:0, devWord:0, devLineHeight:0, devBounds:false, devPointer:false, devShowIds:false, devPerf:false, devAnimScale:1, devStayAwake:false,
    androidUI:true, theme:'light', fontFamily:'serif', textScale:100, density:'comfortable', bigTargets:false, underlineLinks:false, readableSpacing:false,
    // motion
    animLevel:'full', animSpeed:1, pageTransition:'rise', startupAnim:true, ripple:true, countUp:true,
    // text and encoding
    exportEncoding:'utf-8', importEncoding:'auto', asciiFallback:'transliterate', lineEndings:'keep', csvBom:true,
    // files
    autosaveDelay:450, defaultView:'home', sortFiles:'recent', showHomeHero:true, showHomeStats:true, showToday:true,
    // focus and notifications
    focusMinutes:25, breakMinutes:5, soundOn:true, quietToasts:false, toastSeconds:3.4,
    // modes
    modeId:'standard', pinnedApps:['doc','sheet','slides','note','board','code','sketch','cards','kanban','journal'],
    pinnedTools:['tasks','focus','amethyst'], examLock:false, modeUndo:null, backupReminderDays:0, lastBackupAt:null
  };

  let db = null;
  let dbFallback = false;
  let profiles = [];
  let files = [];
  let profile = null;
  let settings = { ...defaultSettings };
  let currentView = 'home';
  let currentApp = null;
  let activeFileId = null;
  let activeFile = null;
  let settingsTab = 'general';
  let saveTimer = null;
  let pendingRemoteFile = null;
  let selectedCell = { row:1, col:1 };
  let peers = new Map();
  let channel = null;
  let presenceTimer = null;
  let lastPresenceAction = 'viewing';
  let lastPresenceActivityAt = 0;
  let focusTimer = null;
  let focusSeconds = 25 * 60;
  let focusRunning = false;
  let focusMode = 'focus';
  let boardSaveTimer = null;
  let lastStoragePercent = null;
  let amethystPeer = null;
  let amethystChannel = null;
  let amethystSendingFile = null;
  let amethystReceiveParts = [];
  let amethystReceiveBytes = 0;
  let amethystExpectedBytes = 0;
  let amethystTransferStarted = false;

  // IndexedDB storage with a localStorage fallback for older/restricted browsers.
  function openDB() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable'));
      const request = indexedDB.open('FloraWorkspace', 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('profiles')) database.createObjectStore('profiles', { keyPath:'id' });
        if (!database.objectStoreNames.contains('files')) database.createObjectStore('files', { keyPath:'id' });
        if (!database.objectStoreNames.contains('meta')) database.createObjectStore('meta', { keyPath:'key' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open local database'));
    });
  }
  function idbRequest(store, method, value) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(store, 'readwrite');
      const objectStore = transaction.objectStore(store);
      let req;
      if (method === 'getAll') req = objectStore.getAll();
      else if (method === 'get') req = objectStore.get(value);
      else if (method === 'put') req = objectStore.put(value);
      else if (method === 'delete') req = objectStore.delete(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      transaction.onabort = () => reject(transaction.error || new Error('Storage transaction aborted'));
    });
  }
  function fallbackRead(store) {
    try { return JSON.parse(localStorage.getItem(`flora:${store}`) || (store === 'meta' ? '{}' : '[]')); }
    catch { return store === 'meta' ? {} : []; }
  }
  function fallbackWrite(store, data) { localStorage.setItem(`flora:${store}`, JSON.stringify(data)); }
  async function getAll(store) {
    if (!dbFallback) return idbRequest(store, 'getAll');
    const data = fallbackRead(store);
    return store === 'meta' ? Object.entries(data).map(([key,value]) => ({key,value})) : data;
  }
  async function putRecord(store, record) {
    if (!dbFallback) return idbRequest(store, 'put', record);
    const data = fallbackRead(store);
    if (store === 'meta') data[record.key] = record.value;
    else { const index = data.findIndex(item => item.id === record.id); if (index >= 0) data[index] = record; else data.push(record); }
    fallbackWrite(store, data);
  }
  async function deleteRecord(store, key) {
    if (!dbFallback) return idbRequest(store, 'delete', key);
    const data = fallbackRead(store);
    if (store === 'meta') delete data[key];
    else fallbackWrite(store, data.filter(item => item.id !== key));
    if (store === 'meta') fallbackWrite(store, data);
  }
  async function getMeta(key, fallback = null) {
    if (dbFallback) return fallbackRead('meta')[key] ?? fallback;
    const record = await idbRequest('meta', 'get', key);
    return record ? record.value : fallback;
  }
  const metaSizes = {};   // bytes used by tasks and tool data, kept in step with the database
  const trackedMeta = key => key === 'tasks' || key.startsWith('tool:');
  async function setMeta(key, value) { if (trackedMeta(key)) metaSizes[key] = JSON.stringify(value ?? '').length; return putRecord('meta', { key, value }); }
  async function loadAll() {
    [profiles, files] = await Promise.all([getAll('profiles'), getAll('files')]);
    settings = { ...defaultSettings, ...(await getMeta('settings', {})) };
    for (const item of await getAll('meta')) if (trackedMeta(item.key)) metaSizes[item.key] = JSON.stringify(item.value ?? '').length;
    applySettings();
  }

  async function storageEstimate() {
    try {
      if (navigator.storage?.estimate) {
        const result = await navigator.storage.estimate();
        return { usage: result.usage || 0, quota: result.quota || 0 };
      }
    } catch {}
    return { usage: 0, quota: 0 };
  }
  function localDataSize() {
    const extra = Object.values(metaSizes).reduce((sum, n) => sum + n, 0);
    try { return new Blob([JSON.stringify({profiles, files, settings})]).size + extra; }
    catch { return JSON.stringify({profiles, files, settings}).length * 2 + extra; }
  }
  function previewSettings(patch) {
    const keep = settings; settings = { ...settings, ...patch };
    try { applySettings(); } finally { settings = keep; }
  }
  async function canStore(nextFile) {
    const current = files.find(file => file.id === nextFile.id);
    const oldSize = current ? new Blob([JSON.stringify(current)]).size : 0;
    const newSize = new Blob([JSON.stringify(nextFile)]).size;
    const estimated = localDataSize() - oldSize + newSize;
    if (settings.storageLimitBytes && estimated > settings.storageLimitBytes) {
      toast(`Flora storage limit reached (${formatBytes(settings.storageLimitBytes)}). Increase your limit or remove files.`, 'error');
      return false;
    }
    const estimate = await storageEstimate();
    if (estimate.quota && estimate.usage + Math.max(0, newSize - oldSize) > estimate.quota * 0.97) {
      toast('Your browser is nearly out of site storage. Export or remove some files.', 'error');
      return false;
    }
    return true;
  }

  function resolveTheme() {
    const choice = settings.theme || 'light';
    if (choice === 'auto') return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    return choice;
  }
  function systemReducesMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function animLevel() { if (settings.devEnabled && Number(settings.devAnimScale) === 0) return 'off'; return (settings.reduceMotion || systemReducesMotion()) ? 'off' : (settings.animLevel || 'full'); }
  function animOff() { return animLevel() === 'off'; }
  function applySettings() {
    const html = document.documentElement, body = document.body;
    const theme = resolveTheme();
    html.dataset.theme = theme;
    html.dataset.font = settings.fontFamily || 'serif';
    html.dataset.anim = animLevel();
    html.dataset.transition = settings.pageTransition || 'rise';
    html.style.setProperty('--font-ui', FONT_STACKS[settings.fontFamily] || FONT_STACKS.serif);
    const devScale = settings.devEnabled && Number(settings.devAnimScale) > 0 ? Number(settings.devAnimScale) : 1;
    html.style.setProperty('--anim-speed', String(Math.max(.05, Math.min(3, (Number(settings.animSpeed) || 1) / devScale))));
    const accent = settings.accent || defaultSettings.accent;
    html.style.setProperty('--accent', accent);
    html.style.setProperty('--accent-ink', luminance(accent) > .42 ? '#2f2813' : '#ffffff');
    html.style.setProperty('--accent-soft', mixHex(accent, theme === 'dark' ? '#1c1e22' : '#ffffff', theme === 'dark' ? .78 : .8));
    html.style.setProperty('--accent-strong', mixHex(accent, theme === 'dark' ? '#ffffff' : '#000000', theme === 'dark' ? .1 : .38));
    const scale = Math.max(80, Math.min(160, Number(settings.textScale) || 100)) * (settings.largeText && Number(settings.textScale || 100) === 100 ? 1.13 : 1);
    body.style.zoom = scale === 100 ? '' : String(scale / 100);
    body.classList.toggle('android-ui', settings.androidUI !== false);
    body.classList.toggle('high-contrast', !!settings.highContrast);
    body.classList.toggle('reduce-motion', animLevel() === 'off');
    body.classList.toggle('compact-sidebar', !!settings.compactMode || !!settings.examLock);
    body.classList.toggle('density-compact', settings.density === 'compact');
    body.classList.toggle('big-targets', !!settings.bigTargets);
    body.classList.toggle('underline-links', !!settings.underlineLinks);
    body.classList.toggle('readable-spacing', !!settings.readableSpacing);
    body.classList.toggle('no-ripple', !settings.ripple);
    body.classList.toggle('exam-lock', !!settings.examLock);
    body.dataset.mode = settings.modeId || 'standard';
    try { localStorage.setItem('flora-theme', theme); localStorage.setItem('flora-splash', settings.startupAnim === false ? '0' : '1'); } catch {}
    const metaTheme = document.querySelector('meta[name="theme-color"]'); if (metaTheme) metaTheme.content = theme === 'dark' ? '#16171a' : theme === 'paper' ? '#f3ead6' : '#f7edca';
    const compactButton = $('#sidebar-compact-toggle');
    compactButton?.setAttribute('aria-pressed', String(!!settings.compactMode));
    if (compactButton) compactButton.textContent = settings.compactMode ? 'Expand' : 'Compact';
    updateModeChip();
    window.FloraDev?.apply(settings);
  }
  function toast(message, kind = '') {
    if (settings.quietToasts && kind !== 'error') return;
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = message;
    $('#toast-region').append(el);
    const ms = Math.max(1200, (Number(settings.toastSeconds) || 3.4) * 1000);
    setTimeout(() => { el.classList.add('leaving'); setTimeout(() => el.remove(), animOff() ? 0 : 260); }, ms);
  }
  function saveSettings(patch) {
    if (patch) settings = { ...settings, ...patch };
    return setMeta('settings', settings).then(() => { applySettings(); renderSidebar(); updateStorageUI(); });
  }
  function currentProfileInitial() { return (profile?.name || 'F').trim().slice(0,1).toUpperCase(); }
  function syncProfileHeader() {
    if (!profile) return;
    $('#profile-name').textContent = profile.name;
    $('#profile-avatar').textContent = currentProfileInitial();
    $('#top-avatar').textContent = currentProfileInitial();
    $('#profile-avatar').style.setProperty('--avatar-color', profile.color);
    $('#top-avatar').style.setProperty('--avatar-color', profile.color);
    $('#profile-status').textContent = 'Local profile';
  }
  function navButton(attr, value, short, label, extra = '') {
    return `<button class="nav-item" ${attr}="${esc(value)}"><span class="nav-short">${esc(short)}</span><span class="nav-copy">${esc(label)}</span>${extra}</button>`;
  }
  function renderSidebar() {
    const host = $('#sidebar-nav'); if (!host) return;
    const lock = !!settings.examLock;
    const pinned = (settings.pinnedApps || []).filter(type => fileInfo[type] && appTypes.includes(type));
    const rest = appTypes.filter(type => !pinned.includes(type));
    const tools = allTools();
    const pinnedTools = (settings.pinnedTools || []).map(id => tools.find(t => t.id === id)).filter(Boolean);
    host.innerHTML = `
      <div class="nav-label">WORKSPACE</div>
      <nav class="main-nav" aria-label="Main navigation">
        ${navButton('data-view', 'home', 'HM', 'Home')}
        ${navButton('data-view', 'files', 'FI', 'My files', `<span class="nav-count" id="file-count">${files.length}</span>`)}
        ${lock ? '' : navButton('data-view', 'shared', 'SH', 'Shared with me')}
      </nav>
      <div class="nav-label nav-label-spaced">CREATE</div>
      <nav class="main-nav" aria-label="Create applications">
        ${pinned.map(type => navButton('data-app', type, fileInfo[type].glyph || type.slice(0,2).toUpperCase(), fileInfo[type].label)).join('')}
        ${!lock && rest.length ? `<details class="more-apps" ${rest.includes(currentApp) ? 'open' : ''}><summary class="nav-item"><span class="nav-short">+${rest.length}</span><span class="nav-copy">More applications</span></summary>${rest.map(type => navButton('data-app', type, fileInfo[type].glyph || type.slice(0,2).toUpperCase(), fileInfo[type].label)).join('')}</details>` : ''}
      </nav>
      <div class="nav-label nav-label-spaced">TOOLS</div>
      <nav class="main-nav" aria-label="Tools">
        ${lock ? '' : navButton('data-view', 'tools', 'TL', 'All tools')}
        ${pinnedTools.map(t => navButton('data-view', t.id, t.short, t.title)).join('')}
      </nav>`;
    updateNav();
  }
  function updateNav() {
    const count = $('#file-count'); if (count) count.textContent = String(files.length);
    $$('.nav-item').forEach(button => button.classList.remove('active'));
    let target = null;
    if (currentApp) target = $(`.sidebar [data-app="${currentApp}"]`);
    else {
      target = $(`.sidebar [data-view="${currentView}"]`);
      if (!target) { const parent = viewRegistry.get(currentView)?.navParent || (['amethyst','tasks','focus'].includes(currentView) ? 'tools' : null); if (parent) target = $(`.sidebar [data-view="${parent}"]`); }
    }
    target?.classList.add('active');
    $('.storage-mini')?.classList.toggle('active', currentView === 'storage');
    document.body.dataset.view = currentView;
  }
  function updateModeChip() {
    const chip = $('#mode-chip'); if (!chip || !window.FloraPresets) return;
    const mode = FloraPresets.byId(settings.modeId);
    chip.textContent = settings.examLock ? 'Exam mode · Exit' : mode.name;
    chip.classList.toggle('is-exam', !!settings.examLock);
    chip.title = settings.examLock ? 'Leave exam mode' : 'Switch mode';
  }
  async function updateStorageUI() {
    const usage = localDataSize();
    const limit = settings.storageLimitBytes || usage || 1;
    const percent = Math.min(100, Math.round(usage / limit * 100));
    $('#storage-percent').textContent = `${percent}%`;
    $('#storage-caption').textContent = `${formatBytes(usage)} of ${formatBytes(limit)} used`;
    const base = $('#storage-progress');
    const added = $('#storage-progress-new');
    if (base) {
      const previous = lastStoragePercent;
      if (previous !== null && percent > previous && added) {
        base.style.width = `${previous}%`;
        added.style.left = `${previous}%`;
        added.style.width = `${percent - previous}%`;
        added.classList.add('visible');
        clearTimeout(window._floraStorageSettle);
        window._floraStorageSettle = setTimeout(() => {
          base.style.width = `${percent}%`;
          added.style.width = '0%';
          added.style.left = `${percent}%`;
          added.classList.remove('visible');
        }, 900);
      } else {
        base.style.width = `${percent}%`;
        if (added) { added.style.width = '0%'; added.classList.remove('visible'); }
      }
    }
    lastStoragePercent = percent;
  }
  function setBreadcrumb(parent, current) {
    $('#crumb-parent').textContent = parent;
    $('#crumb-current').textContent = current;
  }
  function flushCurrentContent() {
    if (currentView === 'editor' && activeFile) {
      clearTimeout(saveTimer);
      saveCurrentContent('editing').catch(()=>{});
    }
  }
  let lastView = 'home';
  const ui = { settingsPage:'home' };
  function playViewEnter() {
    const root = $('#view-root'); if (!root) return;
    const kind = settings.pageTransition || 'rise';
    root.classList.remove('view-enter'); root.removeAttribute('data-enter');
    if (kind === 'none' || animOff()) return;
    void root.offsetWidth; root.dataset.enter = kind; root.classList.add('view-enter');
  }
  function setActiveView(view, app = null, opts = {}) {
    flushCurrentContent();
    window.FloraDev?.log('info', `View: ${view}${app ? ' / ' + app : ''}`, 'nav');
    if (settings.examLock && ['shared','tools'].includes(view)) view = 'home';
    if (currentView !== view || currentApp !== app) lastView = currentView === 'editor' ? 'files' : currentView;
    viewRegistry.get(currentView)?.leave?.();
    if (view === 'settings' && !opts.keepPage) ui.settingsPage = 'home';
    currentView = view;
    currentApp = app;
    activeFileId = null;
    activeFile = null;
    pendingRemoteFile = null;
    peers.clear();
    updateNav();
    renderView();
    playViewEnter();
    broadcastPresence('viewing');
    $('#sidebar').classList.remove('open');
    window.scrollTo(0, 0);
  }
  function newFileContent(type) {
    if (appRegistry.get(type)) return appRegistry.get(type).newContent();
    if (type === 'doc') return '<h1>Start with a thought…</h1><p></p>'; 
    if (type === 'sheet') return { cells: { A1:'', A2:'', A3:'', B1:'', B2:'', B3:'' }, rows:20, cols:12 };
    if (type === 'slides') return [{title:'A fresh idea', body:'Add a thought, a plan, or a little inspiration.'}];
    if (type === 'note') return '';
    if (type === 'board') return [{id:uid(), text:'A new idea', color:'yellow'}];
    return '';
  }
  function makeFile(type, name) {
    return { id:uid(), name:name || `Untitled ${fileInfo[type].short}`, type, content:newFileContent(type), ownerId:profile.id, collaborators:[], createdAt:now(), updatedAt:now(), folder:'My files' };
  }
  async function createFile(type, name, content) {
    if (!appTypes.includes(type)) return;
    const file = makeFile(type, name);
    if (content !== undefined) file.content = content;
    if (!(await canStore(file))) return;
    files.push(file);
    await putRecord('files', file);
    updateStorageUI();
    toast(`${file.name} created`, 'success');
    openFile(file.id);
  }
  async function addFiles(list, opts = {}) {
    const added = [];
    for (const item of list) {
      if (!appTypes.includes(item.type)) continue;
      const file = { ...makeFile(item.type, item.name), content:item.content };
      if (!(await canStore(file))) break;
      files.push(file); await putRecord('files', file); added.push(file);
    }
    updateNav(); updateStorageUI();
    if (!opts.quiet && added.length) toast(`${added.length} file${added.length === 1 ? '' : 's'} added`, 'success');
    return added;
  }
  async function deleteFiles(ids) {
    const gone = new Set(ids);
    for (const id of gone) await deleteRecord('files', id);
    files = files.filter(file => !gone.has(file.id));
    updateNav(); updateStorageUI();
  }
  async function updateFile(patch, broadcast = true) {
    if (!activeFile) return;
    const base = structuredCloneSafe(activeFile);
    const updated = { ...base, ...patch, updatedAt:now() };
    if (!(await canStore(updated))) return;
    if (activeFileId === updated.id) activeFile = updated;
    const index = files.findIndex(file => file.id === updated.id);
    if (index >= 0) files[index] = updated; else files.push(updated);
    await putRecord('files', updated);
    if (broadcast) sendFileUpdate(updated);
    updateStorageUI();
    updateNav();
  }
  async function deleteFile(id) {
    const file = files.find(item => item.id === id);
    if (!file) return;
    if (settings.confirmDelete && !confirm(`Move “${file.name}” to the bin? This removes it from this device.`)) return;
    files = files.filter(item => item.id !== id);
    await deleteRecord('files', id);
    if (activeFileId === id) { activeFileId = null; activeFile = null; }
    toast('File removed from this device');
    updateNav(); updateStorageUI(); renderView();
  }
  async function renameFile(id, value) {
    const stored = files.find(item => item.id === id);
    const name = value.trim();
    if (!stored || !name) return;
    const file = { ...(activeFileId === id && activeFile ? activeFile : stored), name, updatedAt:now() };
    const index = files.findIndex(item => item.id === id);
    if (index >= 0) files[index] = file;
    await putRecord('files', file);
    if (activeFileId === id) activeFile = file;
    sendFileUpdate(file);
    toast('File renamed', 'success');
    renderView();
  }
  function getRecentFiles(limit = 5) { return [...files].sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0,limit); }
  function appCard(type, title, desc) {
    return `<button class="app-card" data-create="${type}" style="--card-line:${appAccent(type)}"><span class="app-card-kicker">${esc(fileInfo[type]?.short || 'App')}</span><strong>${title}</strong><small>${desc}</small><span class="card-open-label">Create new</span></button>`;
  }
  function appAccent(type) { return ({ doc:'#dec982', sheet:'#c7a49d', slides:'#a7a7c6', note:'#9fb59a', board:'#b6a4c6', code:'#8da1a0', sketch:'#d69c6c', cards:'#c8a1a0', kanban:'#9aa9bd', journal:'#b3a0c2' })[type] || '#dec982'; }
  function fileIcon(file) { return `<span class="file-type-label">${esc(fileInfo[file.type]?.short || 'File')}</span>`; }
  function fileRow(file) {
    return `<div class="file-row" data-file-row="${file.id}">${fileIcon(file)}<div class="file-row-copy"><strong>${esc(file.name)}</strong><small>${fileInfo[file.type]?.label || 'Flora file'} · Edited ${prettyDate(file.updatedAt)}</small></div><span class="tag">${fileInfo[file.type]?.short || 'File'}</span><div class="file-row-actions"><button data-open="${file.id}" aria-label="Open ${esc(file.name)}">Open</button><button data-export="${file.id}" aria-label="Export ${esc(file.name)}">Export</button></div></div>`;
  }
  function toolCard(title, description, label, view) {
    return `<button class="tool-card" data-view="${view}"><span class="tool-card-kicker">${label}</span><strong>${title}</strong><small>${description}</small><span class="card-open-label">Open tool</span></button>`;
  }
  async function fillToday() {
    const grid = $('#today-grid'); if (!grid) return;
    const cards = [];
    if ((settings.pinnedTools || []).includes('tasks')) {
      const open = (window._floraTasks || []).filter(task => !task.done);
      cards.push(`<button class="today-card" data-view="tasks"><span class="today-kicker">Tasks</span><strong>${open.length ? `${open.length} to do` : 'All clear'}</strong><small>${open.length ? esc(open[0].text) : 'Nothing waiting on you.'}</small></button>`);
    }
    for (const tool of toolRegistry.values()) {
      if (!tool.today || !(settings.pinnedTools || []).includes(tool.id)) continue;
      try { const html = await tool.today(); if (html) cards.push(html); } catch {}
    }
    if (!$('#today-grid')) return;
    grid.innerHTML = cards.join('');
    grid.hidden = !cards.length;
  }
  function renderHome() {
    if (settings.androidUI !== false) return renderHomeAndroid();
    setBreadcrumb('Workspace','Home');
    const dayLabel = new Intl.DateTimeFormat(undefined,{weekday:'long'}).format(new Date()).toUpperCase();
    const recent = getRecentFiles(6);
    const mode = FloraPresets.byId(settings.modeId);
    const docs = files.filter(f => f.type === 'doc' || f.type === 'note').length;
    const data = files.filter(f => f.type === 'sheet' || f.type === 'slides').length;
    const pinned = (settings.pinnedApps || []).filter(type => fileInfo[type]);
    const shownApps = pinned.length ? pinned : appTypes;
    const modeBanner = settings.examLock
      ? `<section class="mode-banner exam"><div><strong>Exam mode is on</strong><small>Notifications are muted and only revision tools are shown.</small></div><button class="btn btn-secondary btn-small" data-action="exit-mode">Leave exam mode</button></section>`
      : settings.modeId !== 'standard'
        ? `<section class="mode-banner"><div><strong>${esc(mode.name)}</strong><small>${esc(mode.tag)}. Your sidebar and defaults are set for this mode.</small></div><button class="btn btn-secondary btn-small" data-action="change-mode">Change mode</button></section>` : '';
    $('#view-root').innerHTML = `
      <section class="home-intro">
        <div><div class="page-kicker">${dayLabel} / YOUR WORKSPACE</div><h1 class="page-title">Good to see you, ${esc(profile.name.split(' ')[0])}.</h1><p class="page-subtitle">A focused space for documents, plans, data and ideas.</p></div>
        <div class="welcome-actions"><button class="btn btn-secondary" data-action="palette">Search</button><button class="btn btn-secondary" data-action="import">Import file</button><button class="btn btn-primary" data-create="doc">Create document</button></div>
      </section>
      ${modeBanner}
      ${settings.showHomeHero ? `<section class="home-hero"><div class="home-hero-copy"><div class="hero-eyebrow">YOUR WORKSPACE, AT YOUR PACE</div><h2>Make space for your next good idea.</h2><p>Everything you create is saved locally in this browser. Start with a blank page or return to a recent project.</p><button class="btn btn-primary" data-view="${settings.examLock ? 'focus' : 'tools'}">${settings.examLock ? 'Start a focus session' : 'Explore tools'}</button></div><div class="hero-side-note"><span>FLORA / LOCAL WORKSPACE</span><strong data-count="${files.length}">${files.length.toString().padStart(2,'0')}</strong><small>saved files</small></div></section>` : ''}
      ${settings.showToday ? `<div class="today-grid" id="today-grid" hidden></div>` : ''}
      ${settings.showHomeStats ? `<div class="quick-stats"><div class="stat-card"><div class="stat-label">All files</div><div class="stat-value">${files.length}</div><div class="stat-note">Saved in your local workspace</div></div><div class="stat-card"><div class="stat-label">Documents and notes</div><div class="stat-value">${docs}</div><div class="stat-note">Writing and quick capture</div></div><div class="stat-card"><div class="stat-label">Sheets and presentations</div><div class="stat-value">${data}</div><div class="stat-note">Structured work and ideas</div></div></div>` : ''}
      <div class="section-heading"><div><h2>Create something</h2><p>Choose a workspace to get started.</p></div></div>
      <div class="app-grid app-grid-auto">${shownApps.map(type => appCard(type, fileInfo[type].label, fileInfo[type].blurb || '')).join('')}</div>
      <div class="section-heading"><div><h2>Recent files</h2><p>Continue where you left off.</p></div><button class="text-link" data-view="files">View all files</button></div>
      <div class="recent-list">${recent.length ? recent.map(fileRow).join('') : `<div class="empty-state"><h3>Your workspace is ready</h3><p>Create a document, spreadsheet, presentation or note. Your work is saved on this device.</p></div>`}</div>`;
    fillToday();
  }
  const fabHTML = () => `<div class="fab-wrap"><button class="fab" data-action="new-file" aria-label="New file"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg><span>New</span></button></div>`;
  function renderHomeAndroid() {
    setBreadcrumb('Workspace','Home');
    const icon = (name, size) => (Core.icon ? Core.icon(name, size) : '');
    const now = new Date(), hour = now.getHours();
    const greeting = hour < 5 ? 'Still up' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const dateText = new Intl.DateTimeFormat(undefined, { weekday:'long', day:'numeric', month:'long' }).format(now);
    const mode = FloraPresets.byId(settings.modeId), lock = !!settings.examLock;
    const pinned = (settings.pinnedApps || []).filter(type => fileInfo[type]);
    const apps = pinned.length ? pinned : appTypes;
    const used = localDataSize(), pct = Math.min(100, Math.round(used / Math.max(1, settings.storageLimitBytes) * 100));
    const recent = getRecentFiles(6);
    const tile = (attr, value, glyph, label, color) => `<button class="launcher-item" ${attr}="${esc(value)}"><span class="launcher-icon" style="--c:${color}">${esc(glyph)}</span><span class="launcher-label">${esc(label)}</span></button>`;
    const dock = [['files','files','My files'], ...(lock ? [] : [['tools','tools','Tools']]), ['storage','storage','Storage'], ['settings','settings','Settings']];
    const banner = lock
      ? `<section class="mode-banner exam"><div><strong>Exam mode is on</strong><small>Notifications are muted and only revision tools are shown.</small></div><button class="btn btn-secondary btn-small" data-action="exit-mode">Leave exam mode</button></section>` : '';
    $('#view-root').innerHTML = `
      <section class="glance"><div class="glance-greet">${greeting}, ${esc(profile.name.split(' ')[0])}</div><h1 class="glance-date">${dateText}</h1>
        <div class="glance-chips"><button class="glance-chip" data-action="${lock ? 'exit-mode' : 'change-mode'}">${esc(lock ? 'Exam mode' : mode.name)}</button><span class="glance-chip">${files.length} file${files.length === 1 ? '' : 's'}</span><button class="glance-chip" data-view="storage">${pct}% of storage</button></div></section>
      <button class="home-search" data-action="palette" aria-label="Search Flora">${icon('search', 22)}<span>Search files, apps and settings</span><span class="kbd">Ctrl K</span></button>
      ${banner}
      ${settings.showToday ? `<div class="today-grid widgets" id="today-grid" hidden></div>` : ''}
      <h2 class="android-section home-section">Apps</h2>
      <div class="launcher">${apps.map(type => tile('data-app', type, fileInfo[type].glyph || type.slice(0, 2).toUpperCase(), fileInfo[type].label, appAccent(type))).join('')}</div>
      <nav class="dock" aria-label="Shortcuts">${dock.map(([view, ico, label]) => `<button class="dock-item" data-view="${view}"><span class="dock-icon">${icon(ico, 24)}</span><span>${label}</span></button>`).join('')}</nav>
      <h2 class="android-section home-section">Recent files</h2>
      <div class="recent-list">${recent.length ? recent.map(fileRow).join('') : `<div class="empty-state"><h3>Your workspace is ready</h3><p>Tap New to create a document, spreadsheet, presentation or note. Everything is saved on this device.</p></div>`}</div>
      ${fabHTML()}`;
    fillToday();
  }
  function renderAppLanding(type) {
    const info = fileInfo[type];
    const matching = getRecentFiles(50).filter(file => file.type === type);
    setBreadcrumb('Create', info.label);
    const description = info.landing || '';
    $('#view-root').innerHTML = `<div class="welcome-row"><div><div class="page-kicker">FLORA APPLICATION</div><h1 class="page-title">${info.label}</h1><p class="page-subtitle">${description}</p></div><button class="btn btn-primary" data-create="${type}">Create ${info.short.toLowerCase()}</button></div>
    <div class="panel"><div class="section-heading" style="margin-top:0"><div><h2>Your ${info.short.toLowerCase()}s</h2><p>Saved locally on this device.</p></div></div>${matching.length ? `<div class="recent-list">${matching.map(fileRow).join('')}</div>` : `<div class="empty-state"><h3>No ${info.short.toLowerCase()}s yet</h3><p>Create your first one to get started.</p><button class="btn btn-primary" data-create="${type}" style="margin-top:15px">Create ${info.short}</button></div>`}</div>`;
  }
  let fileTypeFilter = 'all';
  function sortedFiles(query = '', type = 'all') {
    const q = query.toLowerCase();
    const list = files.filter(f => (f.name.toLowerCase().includes(q) || (fileInfo[f.type]?.label || '').toLowerCase().includes(q)) && (type === 'all' || f.type === type));
    const sorters = {
      recent:(a,b) => new Date(b.updatedAt) - new Date(a.updatedAt),
      name:(a,b) => a.name.localeCompare(b.name),
      size:(a,b) => fileSize(b) - fileSize(a),
      type:(a,b) => (fileInfo[a.type]?.short || '').localeCompare(fileInfo[b.type]?.short || '') || a.name.localeCompare(b.name)
    };
    return list.sort(sorters[settings.sortFiles] || sorters.recent);
  }
  function fileGridHTML(query = '', type = 'all') {
    const visible = sortedFiles(query, type);
    if (!visible.length) return `<div class="panel"><div class="empty-state"><h3>${query || type !== 'all' ? 'No matching files' : 'Your library is ready'}</h3><p>${query || type !== 'all' ? 'Try a different search or filter.' : 'Create your first file or import an existing one.'}</p></div></div>`;
    return `<div class="file-grid">${visible.map(file => `<div class="file-card"><div class="file-card-head">${fileIcon(file)}<button class="btn btn-ghost btn-small" data-menu-file="${file.id}" title="File options">Options</button></div><div class="file-card-title" title="${esc(file.name)}">${esc(file.name)}</div><div class="file-card-meta">${fileInfo[file.type]?.short || 'File'} · ${prettyDate(file.updatedAt)} · ${formatBytes(fileSize(file))}${settings.devEnabled && settings.devShowIds ? ` · <code class="dev-id">${esc(file.id)}</code>` : ''}</div><div class="file-card-actions"><button class="btn btn-secondary btn-small" data-open="${file.id}">Open</button><button class="btn btn-ghost btn-small" data-export="${file.id}">Export</button></div></div>`).join('')}</div>`;
  }
  function refreshFileList() {
    const region = $('#file-list-region'); if (!region) return;
    region.innerHTML = fileGridHTML($('#file-search')?.value || '', fileTypeFilter);
  }
  function renderFiles(filter = '') {
    setBreadcrumb('Workspace','My files');
    $('#view-root').innerHTML = `<div class="welcome-row"><div><div class="page-kicker">YOUR LOCAL LIBRARY</div><h1 class="page-title">My files</h1><p class="page-subtitle">Everything you make in Flora, kept together and under your control.</p></div><div class="welcome-actions"><button class="btn btn-secondary" data-action="import">Import file</button><button class="btn btn-primary" data-action="new-file">New file</button></div></div>
      <div class="toolbar-row"><div class="search-field"><input id="file-search" type="search" placeholder="Search your files…" value="${esc(filter)}" aria-label="Search files"></div><div style="display:flex;gap:7px;flex-wrap:wrap"><select id="file-filter" class="select-control" aria-label="Filter by type"><option value="all">All types</option>${appTypes.map(type => `<option value="${type}" ${fileTypeFilter === type ? 'selected' : ''}>${fileInfo[type].short}s</option>`).join('')}</select><select id="file-sort" class="select-control" aria-label="Sort files">${[['recent','Recently edited'],['name','Name'],['size','Size'],['type','Type']].map(([v,l]) => `<option value="${v}" ${settings.sortFiles === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
      <div id="file-list-region">${fileGridHTML(filter, fileTypeFilter)}</div>${settings.androidUI !== false ? fabHTML() : ''}`;
  }
  function renderShared() {
    const shared = files.filter(file => (file.collaborators || []).includes(profile.id) || file.ownerId !== profile.id);
    setBreadcrumb('Workspace','Shared with me');
    $('#view-root').innerHTML = `<div class="welcome-row"><div><div class="page-kicker">COLLABORATION</div><h1 class="page-title">Shared with me</h1><p class="page-subtitle">Files shared through your local Flora workspace.</p></div></div><div class="panel"><div class="collab-explainer"><strong>Local collaboration:</strong> Flora can sync open files and show collaborator cursors between tabs or windows using the same browser profile and local address. It does not connect people across the internet or different devices without a separate server.</div>${shared.length ? `<div class="recent-list">${shared.map(fileRow).join('')}</div>` : `<div class="empty-state"><h3>No shared files yet</h3><p>Open a file, choose Collaborate, then open the same local Flora address in another tab and select a different local profile.</p></div>`}</div>`;
  }
  function renderTasks() {
    setBreadcrumb('Tools','Rowan Tasks');
    const tasks = window._floraTasks || [];
    $('#view-root').innerHTML = `<div class="welcome-row"><div><div class="page-kicker">GENTLE PLANNING</div><h1 class="page-title">Rowan Tasks</h1><p class="page-subtitle">A simple local checklist for the things on your mind.</p></div></div><div class="panel" style="max-width:760px"><form id="task-form" class="task-input-row"><input id="task-input" class="text-input" placeholder="Add a task…" aria-label="New task" style="flex:1"><button class="btn btn-primary" type="submit">Add task</button></form><div class="task-list">${tasks.length?tasks.map((task,i)=>`<label class="task-item ${task.done?'done':''}"><input type="checkbox" data-task-toggle="${i}" ${task.done?'checked':''}><span>${esc(task.text)}</span><button type="button" class="btn btn-ghost btn-small" data-task-delete="${i}" aria-label="Delete task">Remove</button></label>`).join(''):`<div class="empty-state"><h3>A fresh list</h3><p>Add one small next step. You can tick it off when it is done.</p></div>`}</div></div>`;
  }
  function focusLength(mode = focusMode) { return Math.max(1, Number(mode === 'focus' ? settings.focusMinutes : settings.breakMinutes) || (mode === 'focus' ? 25 : 5)) * 60; }
  const RING = 2 * Math.PI * 54;
  function paintFocus() {
    const mins = Math.floor(focusSeconds / 60).toString().padStart(2, '0'), secs = (focusSeconds % 60).toString().padStart(2, '0');
    const out = $('#focus-time'); if (out) out.textContent = `${mins}:${secs}`;
    const bar = $('#focus-ring-bar'); if (bar) bar.style.strokeDashoffset = String(RING * (1 - focusSeconds / focusLength()));
    document.title = focusRunning ? `${mins}:${secs} · ${focusMode === 'focus' ? 'Focus' : 'Break'}` : 'Flora — your creative workspace';
  }
  function chime() {
    if (!settings.soundOn || settings.quietToasts) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [660, 880, 1046].forEach((freq, i) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain(), t = ctx.currentTime + i * .22;
        osc.type = 'sine'; osc.frequency.value = freq; gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(.16, t + .03); gain.gain.exponentialRampToValueAtTime(.0001, t + .9);
        osc.connect(gain).connect(ctx.destination); osc.start(t); osc.stop(t + 1);
      });
      setTimeout(() => ctx.close(), 1800);
    } catch {}
  }
  function toggleFocus() {
    if (focusRunning) { focusRunning = false; clearInterval(focusTimer); }
    else {
      if (focusSeconds <= 0) focusSeconds = focusLength();
      focusRunning = true;
      focusTimer = setInterval(() => {
        focusSeconds = Math.max(0, focusSeconds - 1); paintFocus();
        if (focusSeconds === 0) {
          focusRunning = false; clearInterval(focusTimer); chime();
          toast(focusMode === 'focus' ? 'Focus session complete. Take a proper break.' : 'Break over. Ready when you are.', 'success');
          renderFocus();
        }
      }, 1000);
    }
    renderFocus();
  }
  function resetFocus(mode) {
    if (mode) focusMode = mode;
    focusRunning = false; clearInterval(focusTimer); focusSeconds = focusLength(); renderFocus();
  }
  function renderFocus() {
    setBreadcrumb('Tools','Camellia Focus');
    $('#view-root').innerHTML = `<div class="welcome-row"><div><div class="page-kicker">A MOMENT FOR YOURSELF</div><h1 class="page-title">Camellia Focus</h1><p class="page-subtitle">A calm timer for focused work or a proper break. Lengths follow your mode and can be changed in Settings.</p></div></div><div class="focus-card"><div class="focus-label">${focusMode==='focus'?'FOCUS SESSION':'REST BREAK'}</div><div class="focus-ring-wrap"><svg class="focus-ring" viewBox="0 0 120 120" aria-hidden="true"><circle class="focus-ring-track" cx="60" cy="60" r="54"/><circle class="focus-ring-bar" id="focus-ring-bar" cx="60" cy="60" r="54" style="stroke-dasharray:${RING.toFixed(2)};stroke-dashoffset:${(RING * (1 - focusSeconds / focusLength())).toFixed(2)}"/></svg><div class="focus-time" id="focus-time">00:00</div></div><p class="page-subtitle">${focusRunning?'One thing at a time. You have got this.':'Choose a session and begin when you are ready.'}</p><div class="focus-controls"><button class="btn btn-secondary ${focusMode==='focus'?'is-on':''}" data-focus-mode="focus">${settings.focusMinutes} min focus</button><button class="btn btn-secondary ${focusMode==='break'?'is-on':''}" data-focus-mode="break">${settings.breakMinutes} min break</button></div><div class="focus-controls"><button class="btn btn-primary" data-focus-toggle>${focusRunning?'Pause':'Start'} session</button><button class="btn btn-ghost" data-focus-reset>Reset</button></div></div>`;
    paintFocus();
  }

  function toolTile(tool) {
    const pinned = (settings.pinnedTools || []).includes(tool.id);
    return `<article class="tool-tile" data-tool-name="${esc((tool.title + ' ' + tool.desc + ' ' + tool.cat).toLowerCase())}"><button class="tool-tile-main" data-view="${tool.id}"><span class="tool-tile-kicker">${esc(tool.label)}</span><strong>${esc(tool.title)}</strong><small>${esc(tool.desc)}</small></button><button class="pin-toggle ${pinned ? 'on' : ''}" data-pin-tool="${tool.id}" aria-pressed="${pinned}" title="${pinned ? 'Remove from sidebar' : 'Pin to sidebar'}">${pinned ? 'Pinned' : 'Pin'}</button></article>`;
  }
  function renderTools() {
    setBreadcrumb('Workspace','Tools');
    const tools = allTools();
    const cats = ['Study','Plan','Focus','Utilities','Share','Files'].filter(cat => tools.some(t => t.cat === cat)).concat([...new Set(tools.map(t => t.cat))].filter(cat => !['Study','Plan','Focus','Utilities','Share','Files'].includes(cat)));
    $('#view-root').innerHTML = `<div class="welcome-row"><div><div class="page-kicker">FLORA UTILITIES</div><h1 class="page-title">Tools</h1><p class="page-subtitle">Small utilities that make the creative work easier to manage. Pin the ones you use to your sidebar.</p></div><div class="search-field"><input id="tool-search" type="search" placeholder="Search tools…" aria-label="Search tools"></div></div>
      ${cats.map(cat => `<section class="tool-group"><div class="section-heading"><div><h2>${cat}</h2></div></div><div class="tool-grid tool-grid-auto">${tools.filter(t => t.cat === cat).map(toolTile).join('')}</div></section>`).join('')}
      <div class="tool-empty" id="tool-empty" hidden>No tools match that search.</div>
      <div class="tool-note"><strong>Local-first by design</strong><p>Flora keeps files and tool data in this browser. Amethyst uses a direct browser-to-browser connection; it does not upload files to a cloud storage provider.</p></div>`;
  }

  function renderAmethyst() {
    setBreadcrumb('Tools','Amethyst');
    const choices = files.map(file => `<option value="${file.id}">${esc(file.name)} (${esc(fileInfo[file.type]?.short || 'File')})</option>`).join('');
    $('#view-root').innerHTML = `<div class="welcome-row"><div><div class="page-kicker">FLORA TOOL / PEER-TO-PEER</div><h1 class="page-title">Amethyst</h1><p class="page-subtitle">Send a Flora file directly to another person on your local network.</p></div><button class="btn btn-secondary" data-view="tools">Back to tools</button></div>
      <div class="amethyst-status-row"><div><span class="amethyst-status-dot" id="amethyst-status-dot"></span><strong id="amethyst-status">Not connected</strong></div><small id="amethyst-status-detail">No file has been transferred.</small></div>
      <div class="amethyst-grid">
        <section class="amethyst-panel"><div class="panel-kicker">SENDER</div><h2>Send a file</h2><p>Choose something from My files and create a one-time connection offer.</p>
          <label class="amethyst-label" for="amethyst-file-select">File to send</label><select class="select-control amethyst-select" id="amethyst-file-select" ${files.length?'':'disabled'}>${choices || '<option value="">No saved files yet</option>'}</select>
          <button class="btn btn-primary" id="amethyst-create-offer" data-action="amethyst-create-offer" ${files.length?'':'disabled'}>Create connection offer</button>
          <label class="amethyst-label" for="amethyst-offer-output">Offer code</label><textarea id="amethyst-offer-output" class="amethyst-code" rows="5" readonly placeholder="Your offer code will appear here."></textarea>
          <button class="btn btn-secondary" data-action="amethyst-copy-offer">Copy offer code</button>
          <div class="amethyst-divider"></div>
          <label class="amethyst-label" for="amethyst-answer-input">Answer code from the receiver</label><textarea id="amethyst-answer-input" class="amethyst-code" rows="4" placeholder="Paste the receiver’s answer code here."></textarea>
          <button class="btn btn-secondary" data-action="amethyst-apply-answer">Connect and send file</button>
        </section>
        <section class="amethyst-panel"><div class="panel-kicker">RECEIVER</div><h2>Receive a file</h2><p>Paste the sender’s offer code, then return the generated answer code to them.</p>
          <label class="amethyst-label" for="amethyst-offer-input">Offer code from the sender</label><textarea id="amethyst-offer-input" class="amethyst-code" rows="5" placeholder="Paste the sender’s offer code here."></textarea>
          <button class="btn btn-primary" data-action="amethyst-create-answer">Create answer code</button>
          <label class="amethyst-label" for="amethyst-answer-output">Answer code</label><textarea id="amethyst-answer-output" class="amethyst-code" rows="5" readonly placeholder="Your answer code will appear here."></textarea>
          <button class="btn btn-secondary" data-action="amethyst-copy-answer">Copy answer code</button>
          <div class="amethyst-transfer" id="amethyst-transfer-state">Waiting for a connection. The received file will be saved to My files.</div>
        </section>
      </div>
      <div class="tool-note amethyst-explainer"><strong>How it works</strong><p>Both people open the same Flora address over the same local network. The sender creates an offer code; the receiver creates an answer code and sends it back. Once connected, the file travels directly between browsers using WebRTC. No Flora cloud upload is involved.</p><p>Use a secure browser origin where required. Some browsers restrict peer connections on plain HTTP LAN addresses. This version uses local ICE candidates only, so it is designed for the same network and does not use an external relay or automatically discover nearby users.</p></div>
      <div class="amethyst-footer"><button class="btn btn-ghost" data-action="amethyst-reset">Reset connection</button><span>Large transfers are sent in small chunks. Keep this page open until the transfer completes.</span></div>`;
  }

  function waitForIceGathering(peer) {
    if (peer.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise(resolve => {
      let finished = false;
      const done = () => { if (finished) return; finished = true; peer.removeEventListener('icegatheringstatechange', check); resolve(); };
      const check = () => { if (peer.iceGatheringState === 'complete') done(); };
      peer.addEventListener('icegatheringstatechange', check);
      setTimeout(done, 12000);
    });
  }
  function setAmethystStatus(text, detail='') {
    const label=$('#amethyst-status'),sub=$('#amethyst-status-detail');
    if(label)label.textContent=text;
    if(sub)sub.textContent=detail;
    $('#amethyst-status-dot')?.classList.toggle('connected', /connected|complete/i.test(text));
  }
  function resetAmethyst() {
    try { amethystChannel?.close(); } catch {}
    try { amethystPeer?.close(); } catch {}
    amethystChannel=null;amethystPeer=null;amethystSendingFile=null;amethystReceiveParts=[];amethystReceiveBytes=0;amethystExpectedBytes=0;amethystTransferStarted=false;
  }
  function attachAmethystSender(dataChannel, file) {
    amethystChannel=dataChannel;
    dataChannel.binaryType='arraybuffer';
    dataChannel.onopen=async()=>{
      setAmethystStatus('Connected','Sending '+file.name);
      try {
        const payload=new TextEncoder().encode(JSON.stringify({name:file.name,type:file.type,content:file.content}));
        dataChannel.send(JSON.stringify({kind:'flora-file',name:file.name,type:file.type,totalBytes:payload.byteLength}));
        const chunkSize=16*1024;
        dataChannel.bufferedAmountLowThreshold=256*1024;
        for(let offset=0;offset<payload.length;offset+=chunkSize){
          if(dataChannel.readyState!=='open')throw new Error('Connection closed during transfer');
          if(dataChannel.bufferedAmount>1024*1024)await new Promise(resolve=>dataChannel.addEventListener('bufferedamountlow',resolve,{once:true}));
          dataChannel.send(payload.slice(offset,Math.min(offset+chunkSize,payload.length)));
        }
        setAmethystStatus('Transfer sent','Waiting for the receiver to confirm that the file was saved.');
      } catch(error) { toast('Amethyst transfer failed: '+error.message,'error'); }
    };
    dataChannel.onmessage=event=>{
      if(typeof event.data==='string'){
        try{const msg=JSON.parse(event.data);if(msg.kind==='received'){setAmethystStatus('Transfer complete',`${msg.name || file.name} was saved by the receiver.`);toast('File received successfully by the other user.','success');}}
        catch{}
      }
    };
    dataChannel.onclose=()=>{if($('#amethyst-status'))setAmethystStatus('Connection closed');};
    dataChannel.onerror=()=>toast('Amethyst connection encountered an error.','error');
  }
  function attachAmethystReceiver(dataChannel) {
    amethystChannel=dataChannel;
    dataChannel.binaryType='arraybuffer';
    dataChannel.onopen=()=>{setAmethystStatus('Connected','Ready to receive a Flora file.');const state=$('#amethyst-transfer-state');if(state)state.textContent='Connected. Waiting for the sender to transfer a file.';};
    dataChannel.onmessage=async event=>{
      if(typeof event.data==='string'){
        try{
          const msg=JSON.parse(event.data);
          if(msg.kind==='flora-file'){
            amethystExpectedBytes=Number(msg.totalBytes)||0;amethystReceiveParts=[];amethystReceiveBytes=0;amethystTransferStarted=true;
            const state=$('#amethyst-transfer-state');if(state)state.textContent=`Receiving ${msg.name || 'file'}…`;
            setAmethystStatus('Receiving file',msg.name||'Incoming transfer');
          }
        }catch{}
        return;
      }
      if(!amethystTransferStarted)return;
      amethystReceiveParts.push(new Uint8Array(event.data));amethystReceiveBytes+=event.data.byteLength;
      const state=$('#amethyst-transfer-state');if(state)state.textContent=`Receiving… ${Math.min(100,Math.round(amethystReceiveBytes/Math.max(1,amethystExpectedBytes)*100))}%`;
      if(amethystReceiveBytes>=amethystExpectedBytes && amethystExpectedBytes>0){
        try{
          const combined=new Uint8Array(amethystExpectedBytes);let offset=0;
          for(const part of amethystReceiveParts){combined.set(part.subarray(0,Math.min(part.length,combined.length-offset)),offset);offset+=part.length;if(offset>=combined.length)break;}
          const incoming=JSON.parse(new TextDecoder().decode(combined));
          if(!incoming || !appTypes.includes(incoming.type) || typeof incoming.name!=='string')throw new Error('The incoming file is not a supported Flora file.');
          const received={...makeFile(incoming.type,incoming.name),content:incoming.content,folder:'Received'};
          if(!(await canStore(received)))throw new Error('There is not enough Flora storage space for this file.');
          files.push(received);await putRecord('files',received);updateNav();updateStorageUI();
          amethystChannel?.send(JSON.stringify({kind:'received',name:received.name}));
          if(state)state.textContent=`Received and saved “${received.name}” in My files.`;
          setAmethystStatus('Transfer complete',`${formatBytes(amethystReceiveBytes)} received and saved locally.`);
          toast('File received and saved to My files.','success');
          amethystTransferStarted=false;amethystReceiveParts=[];
        }catch(error){setAmethystStatus('Transfer failed',error.message);toast('Could not receive file: '+error.message,'error');}
      }
    };
    dataChannel.onclose=()=>{if($('#amethyst-status'))setAmethystStatus('Connection closed');};
    dataChannel.onerror=()=>toast('Amethyst connection encountered an error.','error');
  }
  async function amethystCreateOffer() {
    const id=$('#amethyst-file-select')?.value;const file=files.find(item=>item.id===id);
    if(!file){toast('Choose a file before creating an offer.','error');return;}
    if(!('RTCPeerConnection' in window)){toast('This browser does not support direct peer-to-peer transfers.','error');return;}
    resetAmethyst();amethystSendingFile=structuredCloneSafe(file);
    amethystPeer=new RTCPeerConnection({iceServers:[]});
    const dataChannel=amethystPeer.createDataChannel('flora-amethyst',{ordered:true});attachAmethystSender(dataChannel,amethystSendingFile);
    const offer=await amethystPeer.createOffer();await amethystPeer.setLocalDescription(offer);await waitForIceGathering(amethystPeer);
    const code=JSON.stringify({protocol:'flora-amethyst-v1',type:'offer',sdp:amethystPeer.localDescription.sdp});
    $('#amethyst-offer-output').value=code;setAmethystStatus('Offer ready','Send the offer code to the receiver on your local network.');
    toast('Connection offer created.','success');
  }
  async function amethystCreateAnswer() {
    const raw=$('#amethyst-offer-input')?.value.trim();if(!raw){toast('Paste the sender offer code first.','error');return;}
    const code=JSON.parse(raw);if(code.protocol!=='flora-amethyst-v1'||code.type!=='offer'||!code.sdp)throw new Error('That does not look like a Flora offer code.');
    if(!('RTCPeerConnection' in window))throw new Error('This browser does not support direct peer-to-peer transfers.');
    resetAmethyst();amethystPeer=new RTCPeerConnection({iceServers:[]});
    amethystPeer.ondatachannel=event=>attachAmethystReceiver(event.channel);
    await amethystPeer.setRemoteDescription({type:'offer',sdp:code.sdp});
    const answer=await amethystPeer.createAnswer();await amethystPeer.setLocalDescription(answer);await waitForIceGathering(amethystPeer);
    $('#amethyst-answer-output').value=JSON.stringify({protocol:'flora-amethyst-v1',type:'answer',sdp:amethystPeer.localDescription.sdp});
    setAmethystStatus('Answer ready','Return the answer code to the sender.');toast('Answer code created.','success');
  }
  async function amethystApplyAnswer() {
    if(!amethystPeer || !amethystSendingFile)throw new Error('Create a sender offer before applying an answer.');
    const raw=$('#amethyst-answer-input')?.value.trim();if(!raw)throw new Error('Paste the receiver answer code first.');
    const code=JSON.parse(raw);if(code.protocol!=='flora-amethyst-v1'||code.type!=='answer'||!code.sdp)throw new Error('That does not look like a Flora answer code.');
    await amethystPeer.setRemoteDescription({type:'answer',sdp:code.sdp});
    setAmethystStatus('Connecting','Waiting for the other browser to accept the connection.');
  }
  async function amethystCopy(id) {
    const field=$('#'+id);if(!field?.value){toast('There is no connection code to copy yet.');return;}
    try{await navigator.clipboard.writeText(field.value);toast('Connection code copied.','success');}
    catch{field.focus();field.select();toast('Select and copy the connection code.');}
  }

  async function storageQuotaBytes() {
    const estimate = await storageEstimate();
    // Browser quota varies. Keep a small safety buffer when presenting options.
    return estimate.quota ? Math.max(16 * 1024, Math.floor(estimate.quota * .85)) : 2 * 1024 * 1024 * 1024;
  }
  async function storageChoices(unit) {
    const multiplier = unit==='GB'?1024**3:unit==='MB'?1024**2:1024;
    const max = await storageQuotaBytes();
    const maxAmount = Math.floor(max / multiplier);
    const options = [];
    for (let amount=16; amount<=maxAmount && options.length<64; amount*=2) options.push(amount);
    return options;
  }

  function sanitizeHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(html || ''), 'text/html');
    doc.querySelectorAll('script,iframe,object,embed,video,audio,source,track,style,link,meta,base').forEach(node=>node.remove());
    doc.querySelectorAll('*').forEach(node=>{
      [...node.attributes].forEach(attr=>{
        const name=attr.name.toLowerCase(), value=attr.value.trim().toLowerCase();
        if (name.startsWith('on') || ((name==='href'||name==='src') && value.startsWith('javascript:')) || (name==='src' && !value.startsWith('data:') && !value.startsWith('blob:'))) node.removeAttribute(attr.name);
      });
    });
    return doc.body.innerHTML;
  }
  function openFile(id) {
    flushCurrentContent();
    const file = files.find(item=>item.id===id);
    if (!file) return;
    activeFile = structuredCloneSafe(file);
    activeFileId = id;
    currentView = 'editor'; currentApp = null;
    pendingRemoteFile = null; peers.clear();
    updateNav(); renderEditor(); broadcastPresence('viewing');
  }
  function structuredCloneSafe(value) { return JSON.parse(JSON.stringify(value)); }
  function renderEditor() {
    if (!activeFile) return;
    const file=activeFile, info=fileInfo[file.type];
    setBreadcrumb(info.label,file.name);
    const root=$('#view-root');
    root.innerHTML = `<section class="editor-screen">
      <header class="editor-document-header"><div class="editor-document-heading"><button class="editor-back" data-action="back-files">My files</button><span class="editor-header-separator">/</span><input class="editor-title-input" id="editor-title" value="${esc(file.name)}" aria-label="File name"></div><div class="editor-actions"><span class="save-indicator" id="save-indicator">Saved on this device</span><button class="btn btn-secondary btn-small" data-action="collaborate">Collaborate</button><button class="btn btn-secondary btn-small" data-action="export-active">Export</button><button class="btn btn-primary btn-small" data-action="rename-active">Save name</button></div></header>
      <div class="editor-file-meta"><span>${info.label}</span><span>Last edited ${prettyDate(file.updatedAt)}</span><span>Local file</span></div>
      <section class="app-workspace">${renderEditorBody(file)}</section>
      <div class="collab-dock"><div class="collab-dock-heading"><strong>Collaborators</strong><span>Live presence in this file</span></div><div class="collab-users" id="collab-users"><span class="collab-user"><i class="collab-caret" style="--user-color:${esc(profile.color)}"></i><strong>${esc(profile.name.split(' ')[0])}</strong><span class="collab-action">You</span></span></div></div>
      </section>`;
    if (file.type==='doc') {
      const editor=$('#document-editor');editor.innerHTML=sanitizeHTML(file.content);editor.spellcheck=!!settings.spellcheck;
    }
    if (file.type==='note') { const editor=$('#note-editor'); editor.value=String(file.content||''); editor.spellcheck=!!settings.spellcheck; }
    if (file.type==='sheet') renderSheetGrid();
    if (file.type==='slides') renderSlide();
    if (file.type==='board') renderBoard();
    appRegistry.get(file.type)?.mount?.(file, $('.app-workspace'));
    updateCollabBar();
  }
  function renderEditorBody(file) {
    if (appRegistry.has(file.type)) return appRegistry.get(file.type).renderBody(file);
    if (file.type==='doc') return `<div class="docs-editor-shell">
      <div class="docs-menu-row"><span class="docs-menu-label">File</span><span class="docs-menu-label">Edit</span><span class="docs-menu-label">View</span><span class="docs-menu-label">Insert</span><span class="docs-menu-label">Format</span><span class="docs-menu-label">Tools</span></div>
      <div class="editor-toolbar docs-toolbar">
        <button class="tool-button" data-format="undo" title="Undo">Undo</button><button class="tool-button" data-format="redo" title="Redo">Redo</button><span class="toolbar-divider"></span>
        <select class="editor-select" id="block-format" aria-label="Text style"><option value="p">Normal text</option><option value="h1">Title</option><option value="h2">Heading 1</option><option value="h3">Heading 2</option><option value="blockquote">Quote</option></select>
        <select class="editor-select" id="font-face" aria-label="Font family"><option value="Newsreader">Newsreader</option><option value="Georgia">Georgia</option><option value="Arial">Arial</option><option value="Verdana">Verdana</option><option value="Times New Roman">Times New Roman</option></select>
        <select class="editor-select" id="font-size" aria-label="Font size"><option value="3">11</option><option value="4" selected>12</option><option value="5">14</option><option value="6">18</option><option value="7">24</option></select>
        <span class="toolbar-divider"></span><button class="tool-button text-format" data-format="bold">B</button><button class="tool-button text-format italic" data-format="italic">I</button><button class="tool-button text-format underline" data-format="underline">U</button>
        <label class="toolbar-color" title="Text colour">Text <input type="color" id="font-color" value="#38362f" aria-label="Text colour"></label><label class="toolbar-color" title="Highlight colour">Highlight <input type="color" id="highlight-color" value="#fff0b8" aria-label="Highlight colour"></label>
        <span class="toolbar-divider"></span><button class="tool-button" data-format="insertUnorderedList">Bullets</button><button class="tool-button" data-format="insertOrderedList">Numbering</button><button class="tool-button" data-format="justifyLeft">Left</button><button class="tool-button" data-format="justifyCenter">Centre</button><button class="tool-button" data-format="justifyRight">Right</button><button class="tool-button" data-format="indent">Indent</button><button class="tool-button" data-format="outdent">Outdent</button><button class="tool-button" data-format="removeFormat">Clear</button>
        <span class="docs-toolbar-spacer"></span><span class="docs-autosave-note">Changes save automatically</span>
      </div>
      <div class="docs-page-stage"><div class="document-page"><div id="document-editor" class="document-editor" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Document editor"></div><div class="remote-cursors-layer" id="remote-cursors-layer" aria-hidden="true"></div></div></div>
    </div>`;
    if (file.type==='note') return `<div class="editor-toolbar"><span class="editor-toolbar-title">Anemone Notes</span><span class="toolbar-divider"></span><span class="small-print">A distraction-free space for plain text.</span></div><textarea class="notes-editor" id="note-editor" placeholder="Start writing…" aria-label="Note editor"></textarea>`;
    if (file.type==='sheet') return `<div class="editor-toolbar"><span class="editor-toolbar-title">Amaryllis Sheets</span><button class="btn btn-secondary btn-small" data-action="add-row">Add row</button><button class="btn btn-secondary btn-small" data-action="add-column">Add column</button><span style="flex:1"></span><button class="btn btn-secondary btn-small" data-action="export-csv">Export CSV</button></div><div class="sheet-wrap"><div class="sheet-formula"><span class="cell-ref" id="cell-ref">A1</span><span class="small-print">Formula</span><input class="text-input" id="formula-input" placeholder="Enter a value or formula, e.g. =SUM(A1:A5)" aria-label="Cell value or formula"></div><div id="sheet-grid"></div><p class="small-print" style="margin:12px 0 0">Supported formulas include addition, subtraction, multiplication, division, cell references and SUM(range). Results recalculate on edit. Use plus, minus, times and divided-by operations.</p></div>`;
    if (file.type==='slides') return `<div class="editor-toolbar"><span class="editor-toolbar-title">Iris Presentations</span><button class="btn btn-secondary btn-small" data-action="slide-add">Add slide</button><button class="btn btn-secondary btn-small" data-action="slide-up">Move up</button><button class="btn btn-secondary btn-small" data-action="slide-down">Move down</button><button class="btn btn-secondary btn-small" data-action="slide-delete">Delete slide</button><span style="flex:1"></span><span class="small-print">Offline presentation editor</span></div><div class="slide-stage"><div class="slide-card" id="slide-card"></div></div><div class="slide-controls"><div class="slide-thumbnails" id="slide-thumbnails"></div></div><div class="panel" style="margin:0 18px 18px"><div class="form-grid"><div class="form-field"><label for="slide-title-input">Slide title</label><input id="slide-title-input" class="text-input"></div><div class="form-field"><label for="slide-body-input">Slide text</label><textarea id="slide-body-input" class="text-area" rows="2"></textarea></div></div></div>`;
    if (file.type==='board') return `<div class="editor-toolbar"><span class="editor-toolbar-title">Dahlia Boards</span><button class="btn btn-secondary btn-small" data-action="board-add">Add sticky note</button><span style="flex:1"></span><span class="small-print">A freeform space for ideas.</span></div><div class="board-area" id="board-area"></div>`;
    return '';
  }
  function saveStatus(text) { const el=$('#save-indicator'); if(el) el.textContent=text; }
  async function saveCurrentContent(action='typing') {
    if (!activeFile) return;
    if (activeFile.type==='doc') { const el=$('#document-editor'); if(el) await updateFile({content:el.innerHTML}); }
    if (activeFile.type==='note') { const el=$('#note-editor'); if(el) await updateFile({content:el.value}); }
    if (activeFile.type==='sheet') { await updateFile({content:activeFile.content}); }
    if (activeFile.type==='slides') { await updateFile({content:activeFile.content}); }
    if (activeFile.type==='board') { await updateFile({content:activeFile.content}); }
    if (appRegistry.has(activeFile.type)) { const def = appRegistry.get(activeFile.type); await updateFile({ content: def.collect ? def.collect(activeFile) : activeFile.content }); }
    saveStatus('Saved on this device');
    broadcastPresence(action);
  }
  function scheduleSave(action='typing') {
    if (!activeFile) return;
    saveStatus(settings.autosave ? 'Saving…' : 'Unsaved changes');
    broadcastPresence(action);
    clearTimeout(saveTimer);
    if (settings.autosave) saveTimer=setTimeout(()=>saveCurrentContent(action),Number(settings.autosaveDelay)||450);
  }

  // Spreadsheet helpers. Values and formula results are held in activeFile.content.cells.
  function colName(n) { let s=''; while(n>0){let r=(n-1)%26;s=String.fromCharCode(65+r)+s;n=Math.floor((n-1)/26);} return s; }
  function colNumber(label) { let n=0; for(const char of label)n=n*26+char.charCodeAt(0)-64; return n; }
  function cellName(row,col) { return `${colName(col)}${row}`; }
  function cellRaw(name) { return activeFile?.content?.cells?.[name] ?? ''; }
  function parseCellReference(token) { const match=token.match(/^([A-Z]+)(\d+)$/); return match?{row:Number(match[2]),col:colNumber(match[1])}:null; }
  function getCellValue(name, stack=[]) {
    if (!activeFile || stack.includes(name)) return '#CYCLE!';
    const raw=String(cellRaw(name));
    if (!raw.startsWith('=')) { const value=raw.trim(); return value!=='' && Number.isFinite(Number(value))?Number(value):value; }
    const formula=raw.slice(1).trim();
    const sumMatch=formula.match(/^SUM\(([A-Z]+\d+):([A-Z]+\d+)\)$/i);
    if(sumMatch){
      const a=parseCellReference(sumMatch[1].toUpperCase()),b=parseCellReference(sumMatch[2].toUpperCase());
      if(!a||!b)return '#ERROR!'; let sum=0;
      for(let r=Math.min(a.row,b.row);r<=Math.max(a.row,b.row);r++)for(let c=Math.min(a.col,b.col);c<=Math.max(a.col,b.col);c++){const v=getCellValue(cellName(r,c),[...stack,name]);sum+=Number(v)||0;}
      return sum;
    }
    let expression=formula.replace(/[A-Z]+\d+/g, token=>{const value=getCellValue(token,[...stack,name]);return typeof value==='number'?String(value):value===''?'0':String(Number(value)||0);});
    if(!/^[\d\s+\-*/().]+$/.test(expression))return '#ERROR!';
    try { const value=Function(`"use strict";return (${expression})`)(); return Number.isFinite(value)?Math.round(value*100000)/100000:'#ERROR!'; } catch { return '#ERROR!'; }
  }
  function renderSheetGrid() {
    const target=$('#sheet-grid'); if(!target||!activeFile)return;
    const rows=activeFile.content.rows||20, cols=activeFile.content.cols||12;
    let html='<table class="sheet-table"><thead><tr><th></th>';
    for(let c=1;c<=cols;c++)html+=`<th>${colName(c)}</th>`;
    html+='</tr></thead><tbody>';
    for(let r=1;r<=rows;r++){html+=`<tr><th>${r}</th>`;for(let c=1;c<=cols;c++){const name=cellName(r,c),raw=cellRaw(name),value=getCellValue(name);html+=`<td contenteditable="true" spellcheck="false" data-cell="${name}" class="${selectedCell.row===r&&selectedCell.col===c?'selected-cell':''}" aria-label="${name}">${esc(String(value??''))}</td>`;}html+='</tr>';}
    html+='</tbody></table>';target.innerHTML=html;
    updateFormulaBar();
  }
  function updateFormulaBar() {
    const name=cellName(selectedCell.row,selectedCell.col);
    const ref=$('#cell-ref'),input=$('#formula-input');
    if(ref)ref.textContent=name;if(input)input.value=String(cellRaw(name));
  }
  function setSheetCell(name,value) {
    activeFile.content.cells[name]=value;
    renderSheetGrid();
    const cell=$(`[data-cell="${name}"]`);cell?.focus();
    scheduleSave('typing');
  }

  let slideIndex=0;
  function renderSlide() {
    if(!activeFile)return;
    const slides=activeFile.content||[];
    if(slideIndex>=slides.length)slideIndex=Math.max(0,slides.length-1);
    const slide=slides[slideIndex]||{title:'',body:''};
    const card=$('#slide-card');
    if(card)card.innerHTML=`<h1>${esc(slide.title||'Untitled slide')}</h1><p>${esc(slide.body||'Add a little context…')}</p><span class="slide-index">${slideIndex+1} / ${slides.length}</span>`;
    const thumbs=$('#slide-thumbnails');
    if(thumbs)thumbs.innerHTML=slides.map((item,index)=>`<button class="slide-thumb ${index===slideIndex?'active':''}" data-slide-index="${index}">Slide ${index+1}</button>`).join('');
    const title=$('#slide-title-input'),body=$('#slide-body-input');
    if(title)title.value=slide.title||'';if(body)body.value=slide.body||'';
  }
  function renderBoard() {
    const area=$('#board-area');if(!area||!activeFile)return;
    area.innerHTML=(activeFile.content||[]).map((note,index)=>`<div class="board-note" data-board-note="${note.id}" style="background:${note.color==='green'?'#e8eedf':note.color==='pink'?'#f4e3df':'#f8edc6'}"><textarea data-board-text="${note.id}" aria-label="Sticky note ${index+1}">${esc(note.text)}</textarea><button class="btn btn-ghost btn-small" data-board-delete="${note.id}">Remove</button></div>`).join('');
  }

  // Local tab collaboration. A separate server would be required for remote devices.
  function setupChannel() {
    if (presenceTimer) { clearInterval(presenceTimer); presenceTimer=null; }
    try { channel?.close(); } catch {}
    channel=null;
    peers.clear();
    if (!('BroadcastChannel' in window)) return;
    try { channel=new BroadcastChannel('flora-local-collaboration-v1'); }
    catch { channel=null; }
    if (!channel) return;
    channel.onmessage=async event=>{
      const msg=event.data;
      if(!msg||msg.profileId===profile?.id)return;
      if(msg.type==='presence'){
        if(msg.fileId===activeFileId){
          peers.set(msg.profileId,{...msg,seen:Date.now()});
          const sharedFile=files.find(file=>file.id===activeFileId);
          if(sharedFile && sharedFile.ownerId!==msg.profileId && !(sharedFile.collaborators||[]).includes(msg.profileId)){
            sharedFile.collaborators=[...(sharedFile.collaborators||[]),msg.profileId];
            putRecord('files',sharedFile).catch(()=>{});
          }
          updateCollabBar();
        }
      }
      if(msg.type==='file-update' && msg.file?.id){
        const incoming=msg.file;
        const existing=files.find(file=>file.id===incoming.id);
        if(!existing || new Date(incoming.updatedAt)>=new Date(existing.updatedAt)){
          const index=files.findIndex(file=>file.id===incoming.id);
          if(index>=0)files[index]=incoming;else files.push(incoming);
          await putRecord('files',incoming);
          if(activeFileId===incoming.id){
            if(document.activeElement?.matches('#document-editor,#note-editor,[data-cell]')){
              pendingRemoteFile=incoming;
              toast(`${msg.profileName || 'A collaborator'} edited this file. Move focus away to sync their latest changes.`);
            } else {
              activeFile=structuredCloneSafe(incoming);renderEditor();
              toast(`${msg.profileName || 'A collaborator'} updated this file`, 'success');
            }
          }
          updateNav();updateStorageUI();
        }
      }
      if(msg.type==='profile-ping' && activeFileId && msg.fileId===activeFileId){broadcastPresence('viewing');}
    };
    presenceTimer=setInterval(()=>{
      const cutoff=Date.now()-15000;
      for(const [id,peer] of peers.entries())if(peer.seen<cutoff)peers.delete(id);
      updateCollabBar();
      if(activeFileId)broadcastPresence('viewing');
    },5000);
  }
  function getLocalCursor() {
    const editor=$('#document-editor');
    if(editor){
      const selection=window.getSelection();
      if(selection?.rangeCount && editor.contains(selection.anchorNode)){
        const toOffset=(node,offset)=>{try{const range=document.createRange();range.selectNodeContents(editor);range.setEnd(node,offset);return range.toString().length;}catch{return 0;}};
        return {start:toOffset(selection.anchorNode,selection.anchorOffset),end:toOffset(selection.focusNode,selection.focusOffset)};
      }
    }
    const cell=document.activeElement?.closest?.('[data-cell]');
    if(cell)return {cell:cell.dataset.cell};
    return null;
  }
  function broadcastPresence(action='viewing') {
    if(!channel||!profile||!activeFileId)return;
    const stamp=Date.now();
    if(action!=='viewing'){lastPresenceAction=action;lastPresenceActivityAt=stamp;}
    else if(stamp-lastPresenceActivityAt<3500)action=lastPresenceAction;
    else lastPresenceAction='viewing';
    channel.postMessage({type:'presence',profileId:profile.id,profileName:profile.name,firstName:profile.name.trim().split(/\s+/)[0],color:profile.color,fileId:activeFileId,action,cursor:getLocalCursor(),seen:stamp});
  }
  function sendFileUpdate(file) {
    if(!channel||!profile)return;
    channel.postMessage({type:'file-update',profileId:profile.id,profileName:profile.name,file:structuredCloneSafe(file)});
  }
  function updateCollabBar() {
    const target=$('#collab-users');if(!target||!profile)return;
    const list=[{profileId:profile.id,firstName:profile.name.trim().split(/\s+/)[0],color:profile.color,action:'viewing',self:true},...([...peers.values()])];
    const actionLabel={typing:'Typing',deleting:'Deleting',selecting:'Selecting',viewing:'Viewing',editing:'Editing',adding:'Adding'};
    target.innerHTML=list.map(user=>`<span class="collab-user ${user.self?'is-self':''}"><i class="collab-caret" style="--user-color:${esc(user.color||'#c7a653')}"></i><strong>${esc(user.firstName||user.profileName||'Guest')}</strong><span class="collab-action">${user.self?'You':(actionLabel[user.action]||'Viewing')}</span></span>`).join('');
    renderCollaboratorCursors();
  }
  function textRangeAtOffset(root, offset) {
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node,remaining=Math.max(0,offset);
    while((node=walker.nextNode())){const length=node.nodeValue.length;if(remaining<=length){const range=document.createRange();range.setStart(node,remaining);range.collapse(true);return range;}remaining-=length;}
    const range=document.createRange();range.selectNodeContents(root);range.collapse(false);return range;
  }
  function renderCollaboratorCursors() {
    const layer=$('#remote-cursors-layer');const editor=$('#document-editor');
    if(layer){layer.innerHTML='';const page=layer.parentElement;const pageRect=page.getBoundingClientRect();
      for(const peer of peers.values()){
        const cursor=peer.cursor;if(!cursor||!Number.isFinite(cursor.start))continue;
        try{const range=textRangeAtOffset(editor,cursor.start);const rect=range.getBoundingClientRect();
          const marker=document.createElement('div');marker.className='remote-cursor-marker';marker.style.left=`${Math.max(0,rect.left-pageRect.left)}px`;marker.style.top=`${Math.max(0,rect.top-pageRect.top)}px`;marker.style.setProperty('--user-color',peer.color||'#7397cf');
          const caret=document.createElement('span');caret.className='remote-cursor-caret';marker.append(caret);
          const label=document.createElement('span');label.className='remote-cursor-name';const actionLabel={typing:'Typing',deleting:'Deleting',selecting:'Selecting',viewing:'Viewing',editing:'Editing',adding:'Adding'};label.textContent=`${peer.firstName||peer.profileName||'Guest'} · ${actionLabel[peer.action]||'Viewing'}`;marker.append(label);layer.append(marker);
          if(Number.isFinite(cursor.end)&&cursor.end!==cursor.start){const endRange=textRangeAtOffset(editor,cursor.end);const endRect=endRange.getBoundingClientRect();const highlight=document.createElement('div');highlight.className='remote-selection-marker';highlight.style.left=`${Math.min(rect.left,endRect.left)-pageRect.left}px`;highlight.style.top=`${Math.min(rect.top,endRect.top)-pageRect.top}px`;highlight.style.width=`${Math.max(3,Math.abs(endRect.left-rect.left))}px`;highlight.style.height=`${Math.max(rect.height,endRect.height)}px`;highlight.style.setProperty('--user-color',peer.color||'#7397cf');layer.append(highlight);}
        }catch{}
      }
    }
    if(activeFile?.type==='sheet'){
      $$('[data-cell]').forEach(cell=>{cell.classList.remove('collab-cell');cell.style.removeProperty('--collab-cell-color');cell.removeAttribute('data-collaborator');});
      for(const peer of peers.values())if(peer.cursor?.cell){const cell=$(`[data-cell="${peer.cursor.cell}"]`);if(cell){cell.classList.add('collab-cell');cell.style.setProperty('--collab-cell-color',peer.color||'#7397cf');cell.setAttribute('data-collaborator',peer.firstName||'Collaborator');}}
    }
  }
  function broadcastActionFromInput(event) {
    const action=event.inputType?.includes('delete')?'deleting':'typing';
    broadcastPresence(action);
  }
  function applyPendingRemote() {
    if(!pendingRemoteFile || !activeFileId)return;
    activeFile=structuredCloneSafe(pendingRemoteFile);pendingRemoteFile=null;renderEditor();
    toast('Latest collaborator changes synced', 'success');
  }

  // Export and import, all generated locally in the browser.
  function downloadBlob(blob, filename) {
    window.FloraDev?.log('info', `Download: ${filename} (${blob.size} bytes, ${blob.type})`, 'export');
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;document.body.append(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function dataURLToBlob(dataURL) {
    const [head, body] = String(dataURL).split(',');
    const mime = (head.match(/data:([^;]+)/) || [])[1] || 'application/octet-stream';
    const bin = atob(body || ''); const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type:mime });
  }
  /* Every text export passes through here so the chosen encoding, line endings and fallback rules apply. */
  function textBlob(data, mime, extension, force = {}) {
    let encId = force.encoding || settings.exportEncoding || 'utf-8';
    const isHtml = /html/.test(mime) || extension === 'doc' || extension === 'html';
    const isJson = /json/.test(mime) || extension === 'json';
    if (extension === 'csv' && settings.csvBom && encId === 'utf-8' && !force.encoding) encId = 'utf-8-bom';
    let text = String(data);
    if (isHtml) text = FloraEncoding.applyMetaCharset(text, encId);
    const result = FloraEncoding.encode(text, encId, { unsupported:settings.asciiFallback, context:isHtml ? 'html' : isJson ? 'json' : 'text', lineEndings:force.lineEndings || settings.lineEndings });
    if (result.count && !force.silent) {
      const how = { replace:'replaced with “?”', transliterate:'simplified to plain letters', escape:'written as escape codes' }[settings.asciiFallback] || 'changed';
      toast(`${result.count} character${result.count === 1 ? '' : 's'} can’t be stored as ${FloraEncoding.info(encId).short} and ${result.count === 1 ? 'was' : 'were'} ${how}.`);
    }
    return new Blob([result.bytes], { type:mime.replace(/;\s*charset=[^;]+/i, '') + '; charset=' + result.charset });
  }
  async function readFileText(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const choice = settings.importEncoding || 'auto';
    let id = choice, reason = 'Chosen in Settings';
    if (choice === 'auto') { const found = FloraEncoding.detect(bytes); id = found.id; reason = found.reason; }
    const decoded = FloraEncoding.decode(bytes, id);
    return { text:decoded.text, encoding:id, invalid:decoded.invalid, reason, size:bytes.length };
  }
  const codeExtensions = { js:'javascript', mjs:'javascript', ts:'typescript', py:'python', css:'css', sql:'sql', c:'c', cpp:'cpp', java:'java', rs:'rust', go:'go', sh:'shell', xml:'xml', yml:'yaml', yaml:'yaml' };
  function importExtensions() { return ['txt','md','html','htm','csv','json', ...(appTypes.includes('code') ? Object.keys(codeExtensions) : [])]; }
  function safeFilename(name) { return name.replace(/[\\/:*?"<>|]+/g,'-').trim() || 'flora-file'; }
  function toCSV(content) {
    const rows=content.rows||20,cols=content.cols||12;
    const quote=value=>`"${String(value??'').replace(/"/g,'""')}"`;
    const output=[];
    for(let r=1;r<=rows;r++){const row=[];for(let c=1;c<=cols;c++){const name=cellName(r,c),raw=String(content.cells?.[name]??'');row.push(quote(raw.startsWith('=')?getCellValueForContent(content,name):raw));}output.push(row.join(','));}
    return output.join('\r\n');
  }
  function getCellValueForContent(content,name) {
    const current=activeFile;const temp={...current,content};activeFile=temp;const result=getCellValue(name);activeFile=current;return result;
  }
  function exportPayload(file, extension) {
    // Native Office Open XML packages are generated entirely in the browser.
    if (extension==='docx' && file.type==='doc') {
      return {blob:FloraExportFormats.docx(file,sanitizeHTML(file.content)),filename:`${safeFilename(file.name)}.docx`};
    }
    if (extension==='xlsx' && file.type==='sheet') {
      return {blob:FloraExportFormats.xlsx(file,(content,name)=>getCellValueForContent(content,name),cellName,colName),filename:`${safeFilename(file.name)}.xlsx`};
    }
    if (extension==='pptx' && file.type==='slides') {
      return {blob:FloraExportFormats.pptx(file),filename:`${safeFilename(file.name)}.pptx`};
    }
    const appDef = appRegistry.get(file.type);
    if (appDef?.exportFile) {
      const result = appDef.exportFile(file, extension, { esc, cellName, safeFilename, dataURLToBlob });
      const filename = `${safeFilename(file.name)}.${extension}`;
      if (result.blob) return { blob:result.blob, filename };
      return { blob:textBlob(result.text, result.mime || 'text/plain;charset=utf-8', extension), filename };
    }
    let mime='text/plain;charset=utf-8',data='';
    if(file.type==='doc'){
      const html=sanitizeHTML(file.content);
      if(extension==='html'||extension==='doc') {mime=extension==='doc'?'application/msword':'text/html;charset=utf-8';data=`<!doctype html><html><head><meta charset="utf-8"><title>${esc(file.name)}</title></head><body>${html}</body></html>`;}
      else if(extension==='md'){mime='text/markdown;charset=utf-8';data=html.replace(/<h1[^>]*>(.*?)<\/h1>/gis,'# $1\n\n').replace(/<h2[^>]*>(.*?)<\/h2>/gis,'## $1\n\n').replace(/<h3[^>]*>(.*?)<\/h3>/gis,'### $1\n\n').replace(/<li[^>]*>(.*?)<\/li>/gis,'- $1\n').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/(p|h[1-6]|blockquote)>/gi,'\n\n').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');}
      else {data=new DOMParser().parseFromString(html,'text/html').body.innerText;}
    } else if(file.type==='note'){
      if(extension==='html'){mime='text/html;charset=utf-8';data=`<!doctype html><meta charset="utf-8"><title>${esc(file.name)}</title><pre>${esc(file.content)}</pre>`;}
      else data=String(file.content||'');
    } else if(file.type==='sheet'){
      if(extension==='csv'){mime='text/csv;charset=utf-8';data=toCSV(file.content);}
      else if(extension==='html'){mime='text/html;charset=utf-8';data=`<!doctype html><meta charset="utf-8"><title>${esc(file.name)}</title><table>${Array.from({length:file.content.rows||20},(_,r)=>`<tr>${Array.from({length:file.content.cols||12},(_,c)=>`<td>${esc(file.content.cells[cellName(r+1,c+1)]||'')}</td>`).join('')}</tr>`).join('')}</table>`;}
      else {mime='application/json';data=JSON.stringify(file.content,null,2);}
    } else if(file.type==='slides'){
      if(extension==='html'){mime='text/html;charset=utf-8';data=`<!doctype html><html><head><meta charset="utf-8"><title>${esc(file.name)}</title><style>body{font-family:Georgia,serif;background:#f6f0df;color:#39372d}.slide{min-height:85vh;max-width:950px;margin:5vh auto;background:#fffdf7;padding:12%;display:flex;flex-direction:column;justify-content:center;box-shadow:0 5px 25px #0001;page-break-after:always}.slide h1{font-size:48px;font-weight:500}.slide p{font-size:22px;line-height:1.5;color:#887f6b}</style></head><body>${(file.content||[]).map(s=>`<section class="slide"><h1>${esc(s.title)}</h1><p>${esc(s.body)}</p></section>`).join('')}</body></html>`;}
      else {mime='application/json';data=JSON.stringify(file.content,null,2);}
    } else if(file.type==='board'){
      if(extension==='html'){mime='text/html;charset=utf-8';data=`<!doctype html><meta charset="utf-8"><title>${esc(file.name)}</title><style>body{background:#faf7ec;font-family:Georgia;padding:25px}.note{display:inline-block;vertical-align:top;width:180px;min-height:120px;padding:15px;margin:10px;background:#f8edc6;white-space:pre-wrap}</style>${(file.content||[]).map(note=>`<div class="note">${esc(note.text)}</div>`).join('')}`;}
      else {mime='application/json';data=JSON.stringify(file.content,null,2);}
    }
    return {blob:textBlob(data,mime,extension),filename:`${safeFilename(file.name)}.${extension}`};
  }
  function exportFile(file, extension) {
    const {blob,filename}=exportPayload(file,extension);
    downloadBlob(blob,filename);
    toast(`Exported ${filename}`, 'success');
  }
  function showExportModal(file) {
    const types=(appRegistry.get(file.type)?.extensionsFor?.(file))||fileInfo[file.type].extensions;
    showModal(`<h2>Export ${esc(file.name)}</h2><p>Choose a format. Flora creates the file directly in your browser.</p><div class="choice-row">${types.map((ext,i)=>`<button class="choice-chip ${i===0?'active':''}" data-export-format="${ext}">.${ext.toUpperCase()}</button>`).join('')}</div><p class="small-print" style="margin-top:14px">Office files are generated locally as basic Open XML packages. Documents keep headings and inline emphasis; spreadsheets keep cell values and basic formulas; presentations export title-and-body slides.</p><div class="form-foot"><button class="btn btn-ghost" data-modal-close>Cancel</button><button class="btn btn-primary" id="confirm-export">Export file</button></div>`, 'Export file');
    let selected=types[0];
    $$('[data-export-format]').forEach(button=>button.addEventListener('click',()=>{$$('[data-export-format]').forEach(b=>b.classList.remove('active'));button.classList.add('active');selected=button.dataset.exportFormat;}));
    $('#confirm-export').addEventListener('click',()=>{exportFile(file,selected);closeModal();});
  }
  function showImportModal() {
    showModal(`<h2>Bring a file into Flora</h2><p>Import a text, HTML, CSV, JSON or code file. Flora detects its text encoding (or uses the one chosen in Settings) and stores a local copy.</p><div class="import-drop"><strong>Choose a file from your device</strong><br><input type="file" id="import-file" accept="${importExtensions().map(e => '.' + e).join(',')},text/plain,text/html,text/csv,application/json"></div><div class="form-foot"><span class="form-hint">The original file is not changed.</span><button class="btn btn-ghost" data-modal-close>Close</button></div>`, 'Import file');
    $('#import-file').addEventListener('change',async event=>{
      const file=event.target.files?.[0];if(!file)return;
      const extension=file.name.split('.').pop().toLowerCase();
      if(!importExtensions().includes(extension)){toast('That file type is not supported yet.', 'error');return;}
      try{
        const readInfo=await readFileText(file);const text=readInfo.text;let type='doc',content=text;
        if(extension==='csv'){
          type='sheet';const lines=text.replace(/\r/g,'').split('\n').filter(Boolean);const cells={};let maxCols=1;
          lines.slice(0,1000).forEach((line,r)=>{const cols=parseCSVLine(line);maxCols=Math.max(maxCols,cols.length);cols.forEach((value,c)=>{cells[cellName(r+1,c+1)]=value;});});
          content={cells,rows:Math.max(20,lines.length),cols:Math.max(12,maxCols)};
        } else if(extension==='json'){
          const parsed=JSON.parse(text);
          if(Array.isArray(parsed) && parsed.every(item=>item&&typeof item==='object'&&('title'in item||'body'in item))){type='slides';content=parsed;}
          else if(parsed&&typeof parsed==='object'&&parsed.cells){type='sheet';content={cells:parsed.cells,rows:parsed.rows||20,cols:parsed.cols||12};}
          else if(Array.isArray(parsed)&&parsed.every(item=>item&&'text'in item)){type='board';content=parsed;}
          else {type='doc';content=`<pre>${esc(JSON.stringify(parsed,null,2))}</pre>`;}
        } else if(extension==='html'||extension==='htm') {type='doc';content=sanitizeHTML(text);}
        else if(extension==='md') {type='doc';content=`<pre>${esc(text)}</pre>`;}
        else if(codeExtensions[extension]&&appTypes.includes('code')) {type='code';content={lang:codeExtensions[extension],text,wrap:false,tab:2};}
        else {type='doc';content=`<p>${esc(text).replace(/\n/g,'<br>')}</p>`;}
        const name=file.name.replace(/\.[^.]+$/,'');const imported={...makeFile(type,name),content};
        if(!(await canStore(imported)))return;
        files.push(imported);await putRecord('files',imported);closeModal();toast(`Imported “${imported.name}” (read as ${FloraEncoding.info(readInfo.encoding).short})${readInfo.invalid?` · ${readInfo.invalid} unreadable character${readInfo.invalid===1?'':'s'}`:''}`, 'success');updateNav();openFile(imported.id);
      }catch(error){toast(`Could not import that file: ${error.message}`, 'error');}
    });
  }
  function parseCSVLine(line) {
    const values=[];let value='',quoted=false;
    for(let i=0;i<line.length;i++){const char=line[i];if(char==='"'&&quoted&&line[i+1]==='"'){value+='"';i++;}else if(char==='"')quoted=!quoted;else if(char===','&&!quoted){values.push(value);value='';}else value+=char;}
    values.push(value);return values;
  }

  // Dialogs and profile management.
  function showModal(content,title='Flora dialog',wide=false) {
    $('#modal-root').innerHTML=`<div class="modal-backdrop" role="presentation"><section class="modal-card ${wide?'wide':''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">${content}</section></div>`;
    $('.modal-backdrop').addEventListener('click',event=>{if(event.target.classList.contains('modal-backdrop'))closeModal();});
    $$('[data-modal-close]').forEach(button=>button.addEventListener('click',closeModal));
  }
  function closeModal() { $('#modal-root').innerHTML=''; }
  function showSetupModal(isNewProfile = false, opts = {}) {
    if (Core.setup) Core.setup.open({ newProfile:isNewProfile, ...opts });
    else toast('The setup screen could not be loaded.', 'error');
  }
  async function finishSetup({ profile:person, settings:patch = {}, modeId, seed, newProfile } = {}) {
    if (person) {
      const created = { id:uid(), name:person.name.trim(), pronouns:person.pronouns || '', bio:person.bio || '', color:person.color || '#b89a50', createdAt:now() };
      profiles.push(created); await putRecord('profiles', created); profile = created; await setMeta('activeProfileId', created.id);
    }
    if (!newProfile) {
      const mode = FloraPresets.byId(modeId || settings.modeId);
      settings = { ...settings, ...patch, modeId:mode.id, pinnedApps:[...mode.apps], pinnedTools:[...mode.tools], examLock:!!(patch.examLock ?? mode.patch.examLock), modeUndo:null };
      await saveSettings();
      if (seed) await addFiles(FloraPresets.seedFiles(mode.id, { uid }), { quiet:true });
    }
    syncProfileHeader(); setupChannel(); updateStorageUI(); renderSidebar();
    setActiveView(newProfile ? 'home' : (settings.defaultView || 'home'));
    toast(newProfile ? `Switched to ${profile.name}` : `Welcome to Flora, ${profile.name.split(' ')[0]}.`, 'success');
  }
  async function applyMode(id, opts = {}) {
    const mode = FloraPresets.byId(id);
    const values = {};
    Object.keys(mode.patch).forEach(key => { values[key] = settings[key]; });
    Object.assign(values, { modeId:settings.modeId, pinnedApps:settings.pinnedApps, pinnedTools:settings.pinnedTools });
    settings = { ...settings, ...mode.patch, modeId:mode.id, pinnedApps:[...mode.apps], pinnedTools:[...mode.tools], modeUndo:{ from:settings.modeId, values } };
    await saveSettings();
    let added = [];
    if (opts.seed) added = await addFiles(FloraPresets.seedFiles(mode.id, { uid }), { quiet:true });
    renderView();
    toast(`${mode.name} is on${added.length ? ` · ${added.length} starter file${added.length === 1 ? '' : 's'} added` : ''}`, 'success');
  }
  async function undoMode() {
    const undo = settings.modeUndo; if (!undo) return;
    settings = { ...settings, ...undo.values, modeUndo:null };
    await saveSettings(); renderView();
    toast(`Back to ${FloraPresets.byId(settings.modeId).name}`, 'success');
  }
  async function resetSettings() {
    settings = { ...defaultSettings, storageLimitBytes:settings.storageLimitBytes, storageUnit:settings.storageUnit, storageAmount:settings.storageAmount };
    await saveSettings(); renderView(); toast('Settings restored to Flora’s defaults.', 'success');
  }
  async function requestPersist() {
    try { if (navigator.storage?.persist) return await navigator.storage.persist(); } catch {}
    return false;
  }

  // Backup and restore. Backups are always UTF-8 so nothing is ever lost.
  async function exportBackup() {
    const meta = await getAll('meta');
    const payload = { format:'flora-backup-v1', createdAt:now(), profiles, files, meta:Object.fromEntries(meta.filter(item => item.key !== 'activeProfileId').map(item => [item.key, item.value])) };
    const blob = new Blob([FloraEncoding.encode(JSON.stringify(payload), 'utf-8').bytes], { type:'application/json; charset=utf-8' });
    downloadBlob(blob, `flora-backup-${new Date().toISOString().slice(0,10)}.json`);
    await saveSettings({ lastBackupAt:now() });
    toast(`Backup downloaded (${files.length} file${files.length === 1 ? '' : 's'})`, 'success');
  }
  async function importBackup(file, { withSettings = false } = {}) {
    const read = await readFileText(file);
    let payload; try { payload = JSON.parse(read.text); } catch { throw new Error('That file is not valid JSON.'); }
    if (payload?.format !== 'flora-backup-v1' || !Array.isArray(payload.files)) throw new Error('That is not a Flora backup file.');
    let addedFiles = 0, updatedFiles = 0, addedProfiles = 0;
    for (const person of payload.profiles || []) if (person?.id && !profiles.some(item => item.id === person.id)) { profiles.push(person); await putRecord('profiles', person); addedProfiles++; }
    for (const incoming of payload.files) {
      if (!incoming?.id || !appTypes.includes(incoming.type)) continue;
      const existing = files.find(item => item.id === incoming.id);
      if (!existing) { files.push(incoming); await putRecord('files', incoming); addedFiles++; }
      else if (new Date(incoming.updatedAt) > new Date(existing.updatedAt)) { files[files.indexOf(existing)] = incoming; await putRecord('files', incoming); updatedFiles++; }
    }
    for (const [key, value] of Object.entries(payload.meta || {})) { if (key === 'settings' && !withSettings) continue; await setMeta(key, value); }
    await loadAll(); window._floraTasks = await getMeta('tasks', []);
    renderSidebar(); updateStorageUI(); renderView();
    return { addedFiles, updatedFiles, addedProfiles };
  }

  // Effects
  function countUp(el, to, { duration = 900, format = value => String(Math.round(value)) } = {}) {
    if (!el) return;
    if (animOff() || settings.countUp === false) { el.textContent = format(to); return; }
    const start = performance.now();
    const tick = now => {
      const t = Math.min(1, (now - start) / (duration / (Number(settings.animSpeed) || 1)));
      el.textContent = format(to * (1 - Math.pow(1 - t, 3)));
      if (t < 1 && el.isConnected) requestAnimationFrame(tick); else el.textContent = format(to);
    };
    requestAnimationFrame(tick);
  }
  document.addEventListener('pointerdown', event => {
    if (!settings.ripple || animLevel() !== 'full') return;
    const host = event.target.closest('.btn,.android-row,.storage-row,.free-card,.chooser-option,.mode-card');
    if (!host || host.disabled) return;
    const box = host.getBoundingClientRect(), size = Math.max(box.width, box.height) * 2;
    const wave = document.createElement('span');
    wave.className = 'ripple';
    wave.style.cssText = `width:${size}px;height:${size}px;left:${event.clientX - box.left - size / 2}px;top:${event.clientY - box.top - size / 2}px`;
    host.append(wave); setTimeout(() => wave.remove(), 700);
  });

  // Command palette
  function paletteCommands() {
    const list = [];
    const add = (label, hint, run) => list.push({ label, hint, run });
    add('Home', 'Go to', () => setActiveView('home')); add('My files', 'Go to', () => setActiveView('files'));
    if (!settings.examLock) { add('Shared with me', 'Go to', () => setActiveView('shared')); add('All tools', 'Go to', () => setActiveView('tools')); }
    add('Settings', 'Go to', () => setActiveView('settings')); add('Storage', 'Go to', () => setActiveView('storage'));
    add('Import a file', 'Action', () => showImportModal());
    appTypes.forEach(type => add(`New ${fileInfo[type].short.toLowerCase()}`, fileInfo[type].label, () => createFile(type)));
    appTypes.forEach(type => add(fileInfo[type].label, 'Open application', () => setActiveView('app', type)));
    allTools().forEach(tool => add(tool.title, 'Open tool', () => setActiveView(tool.id)));
    (Core.settingsIndex ? Core.settingsIndex() : []).forEach(page => add(`Settings: ${page.title}`, 'Settings', () => Core.openSettings(page.id)));
    FloraPresets.MODES.forEach(mode => add(`Switch to ${mode.name}`, 'Mode', () => (Core.chooseMode ? Core.chooseMode(mode.id) : applyMode(mode.id))));
    [['light','Light'],['dark','Dark'],['paper','Paper'],['auto','Match system']].forEach(([value, label]) => add(`Theme: ${label}`, 'Appearance', () => saveSettings({ theme:value })));
    add('Export a backup', 'Data', () => exportBackup());
    files.forEach(file => add(file.name, fileInfo[file.type]?.short || 'File', () => openFile(file.id)));
    return list;
  }
  function openPalette() {
    const commands = paletteCommands();
    let results = commands.slice(0, 9), active = 0;
    $('#modal-root').innerHTML = `<div class="modal-backdrop palette-backdrop"><section class="palette-card" role="dialog" aria-modal="true" aria-label="Search Flora"><input id="palette-input" class="palette-input" placeholder="Search files, applications, tools and settings…" autocomplete="off" aria-label="Search"><div class="palette-list" id="palette-list" role="listbox"></div><div class="palette-foot"><span><span class="kbd">↑</span> <span class="kbd">↓</span> move</span><span><span class="kbd">Enter</span> open</span><span><span class="kbd">Esc</span> close</span></div></section></div>`;
    const input = $('#palette-input'), listEl = $('#palette-list');
    const paint = () => { listEl.innerHTML = results.length ? results.map((item, i) => `<button class="palette-item ${i === active ? 'active' : ''}" role="option" data-palette="${i}"><span>${esc(item.label)}</span><small>${esc(item.hint)}</small></button>`).join('') : '<div class="palette-empty">Nothing matches that.</div>'; listEl.querySelector('.active')?.scrollIntoView({ block:'nearest' }); };
    const run = i => { const item = results[i]; if (!item) return; closeModal(); item.run(); };
    input.addEventListener('input', () => {
      const words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
      results = commands.map(c => { const hay = (c.label + ' ' + c.hint).toLowerCase(); if (!words.every(w => hay.includes(w))) return null; return { c, score:(c.label.toLowerCase().startsWith(words[0] || '') ? 0 : 1) }; }).filter(Boolean).sort((a, b) => a.score - b.score).slice(0, 9).map(x => x.c);
      if (!words.length) results = commands.slice(0, 9);
      active = 0; paint();
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') { event.preventDefault(); active = Math.min(results.length - 1, active + 1); paint(); }
      if (event.key === 'ArrowUp') { event.preventDefault(); active = Math.max(0, active - 1); paint(); }
      if (event.key === 'Enter') { event.preventDefault(); run(active); }
    });
    listEl.addEventListener('click', event => { const btn = event.target.closest('[data-palette]'); if (btn) run(Number(btn.dataset.palette)); });
    $('.palette-backdrop').addEventListener('click', event => { if (event.target.classList.contains('palette-backdrop')) closeModal(); });
    paint(); input.focus();
  }

  async function showProfileSwitcher() {
    const html=`<h2>Your local profiles</h2><p>Switch between profiles stored in this browser, or create another one.</p><div class="profile-list">${profiles.map(item=>`<button class="profile-option" data-switch-profile="${item.id}"><span class="avatar" style="--avatar-color:${esc(item.color)}">${esc(item.name.slice(0,1).toUpperCase())}</span><span style="flex:1"><strong>${esc(item.name)}</strong><small>Local profile${item.bio?' · '+esc(item.bio.slice(0,72)):''}${item.id===profile.id?' · Current profile':''}</small></span>${item.id===profile.id?'<span class="tag">Active</span>':''}</button>`).join('')}</div><div class="form-foot"><button class="btn btn-secondary" data-new-profile>Create profile</button><span style="flex:1"></span><button class="btn btn-ghost btn-small" data-edit-profile>Edit current profile</button><button class="btn btn-ghost" data-modal-close>Close</button></div>`;
    showModal(html,'Profiles');
    $$('[data-switch-profile]').forEach(button=>button.addEventListener('click',async()=>{const next=profiles.find(item=>item.id===button.dataset.switchProfile);if(!next)return;profile=next;await setMeta('activeProfileId',profile.id);syncProfileHeader();closeModal();setActiveView('home');toast(`Switched to ${profile.name}`,'success');}));
    $('[data-new-profile]')?.addEventListener('click',()=>showSetupModal(true));
    $('[data-edit-profile]')?.addEventListener('click',showProfileEditor);
  }
  function showProfileEditor() {
    flushCurrentContent();
    showModal(`<div class="profile-settings-kicker">PROFILE SETTINGS</div><h2>Edit profile</h2><p>Update your local display name, pronouns, bio and collaborator cursor colour.</p><form id="profile-edit-form"><div class="form-grid"><div class="form-field full"><label for="edit-profile-name">Name</label><input id="edit-profile-name" required maxlength="60" value="${esc(profile.name)}"></div><div class="form-field"><label for="edit-profile-pronouns">Pronouns (optional)</label><input id="edit-profile-pronouns" maxlength="30" value="${esc(profile.pronouns||'')}"></div><div class="form-field"><label for="edit-profile-color">Favourite cursor colour</label><input id="edit-profile-color" type="color" value="${esc(profile.color)}" style="height:39px;padding:4px"></div><div class="form-field full"><label for="edit-profile-bio">Bio (optional)</label><textarea id="edit-profile-bio" maxlength="240">${esc(profile.bio||'')}</textarea></div></div><div class="form-foot"><button class="btn btn-ghost" type="button" data-modal-close>Cancel</button><button class="btn btn-primary" type="submit">Save profile</button></div></form>`, 'Edit profile');
    $('#profile-edit-form').addEventListener('submit',async event=>{
      event.preventDefault();
      if(currentView==='editor' && activeFile) await saveCurrentContent('editing');
      profile={...profile,name:$('#edit-profile-name').value.trim(),pronouns:$('#edit-profile-pronouns').value.trim(),bio:$('#edit-profile-bio').value.trim(),color:$('#edit-profile-color').value};
      const index=profiles.findIndex(item=>item.id===profile.id);if(index>=0)profiles[index]=profile;
      await putRecord('profiles',profile);syncProfileHeader();closeModal();
      if(activeFileId)broadcastPresence('viewing');
      renderView();toast('Profile updated','success');
    });
  }

  function showCollaborationModal() {
    const canBroadcast=!!channel;
    showModal(`<h2>Collaborate locally</h2><p>Flora’s no-server collaboration uses your browser’s local BroadcastChannel.</p><div class="collab-explainer"><strong>How to test it</strong><br>1. Open this same Flora address in a second tab or window.<br>2. Switch to a different local profile in that tab (or create one).<br>3. Open the same file. Typing and file updates will sync between the tabs, and cursor activity will show the collaborator’s first name and favourite colour.</div><div class="setting-row"><div class="setting-copy"><strong>Collaboration channel</strong><small>${canBroadcast?'BroadcastChannel is available in this browser.':'BroadcastChannel is unavailable; live tab sync is disabled.'}</small></div><span class="tag">${canBroadcast?'Available':'Unavailable'}</span></div><p class="small-print">This does not share a file with another person over the internet. For remote collaboration, Flora would need a hosted sync service, accounts, permissions and a secure transport layer.</p><div class="form-foot"><button class="btn btn-ghost" data-modal-close>Close</button><button class="btn btn-primary" data-modal-close>Got it</button></div>`, 'Local collaboration');
  }
  function showHelpModal() {
    showModal(`<h2>A few Flora tips</h2><p>Your workspace is local-first, so the important bits are simple.</p><div class="setting-row"><div class="setting-copy"><strong>Keyboard shortcuts</strong><small>Ctrl + S saves the open file. Ctrl + N starts a document (use Command on Mac). Esc closes a dialog.</small></div></div><div class="setting-row"><div class="setting-copy"><strong>Export regularly</strong><small>Use Export in an editor or My files to make a portable copy of your work.</small></div></div><div class="setting-row"><div class="setting-copy"><strong>Collaboration</strong><small>Use the same local Flora address in two tabs/windows to test local sync.</small></div></div><div class="setting-row"><div class="setting-copy"><strong>Back up this browser</strong><small>Browser data can be cleared by browser settings, private browsing or storage pressure. Export important files somewhere safe.</small></div></div><div class="form-foot"><span class="form-hint">Flora runs without a backend.</span><button class="btn btn-primary" data-modal-close>Lovely</button></div>`,'Help');
  }

  function renderView() {
    updateNav();
    const viewHost = $('#view-root'); if (viewHost) { viewHost.onclick = viewHost.oninput = viewHost.onchange = viewHost.onkeydown = null; }
    const registered = viewRegistry.get(currentView);
    if (registered) {
      const crumb = typeof registered.crumb === 'function' ? registered.crumb() : registered.crumb;
      if (crumb) setBreadcrumb(crumb[0], crumb[1]);
      return registered.render($('#view-root'));
    }
    if(currentView==='home')return renderHome();
    if(currentView==='files')return renderFiles();
    if(currentView==='shared')return renderShared();
    if(currentView==='tools')return renderTools();
    if(currentView==='amethyst')return renderAmethyst();
    if(currentView==='tasks')return renderTasks();
    if(currentView==='focus')return renderFocus();
    if(currentView==='settings')return renderSettings();
    if(currentView==='editor')return renderEditor();
    if(currentApp)return renderAppLanding(currentApp);
  }

  // Event delegation keeps the static app shell light and dependency-free.
  document.addEventListener('click', async event => {
    const target=event.target.closest('button,[data-open],[data-export]');if(!target)return;
    if(target.matches('[data-pin-tool]')){const id=target.dataset.pinTool;const set=new Set(settings.pinnedTools||[]);if(set.has(id))set.delete(id);else set.add(id);await saveSettings({pinnedTools:[...set]});const on=set.has(id);target.classList.toggle('on',on);target.textContent=on?'Pinned':'Pin';target.setAttribute('aria-pressed',String(on));target.title=on?'Remove from sidebar':'Pin to sidebar';return;}
    if(target.matches('[data-view]')){setActiveView(target.dataset.view);return;}
    if(target.matches('[data-app]')){setActiveView('app',target.dataset.app);return;}
    if(target.matches('[data-create]')){await createFile(target.dataset.create);return;}
    if(target.matches('[data-open]')){openFile(target.dataset.open);return;}
    if(target.matches('[data-export]')){const file=files.find(f=>f.id===target.dataset.export);if(file)showExportModal(file);return;}
    if(target.matches('[data-format]')){const editor=$('#document-editor');editor?.focus();const command=target.dataset.format;if(command==='createLink'){const url=prompt('Enter a link URL');if(url)document.execCommand(command,false,url);}else document.execCommand(command,false,null);if(editor)scheduleSave('editing');return;}
    if(target.matches('[data-slide-index]')){slideIndex=Number(target.dataset.slideIndex);renderSlide();broadcastPresence('selecting');return;}
    if(target.matches('[data-action]')){
      const action=target.dataset.action;
      if(action==='import')showImportModal();
      if(action==='palette')openPalette();
      if(action==='exit-mode'){if(settings.modeUndo)await undoMode();else await applyMode('standard');}
      if(action==='change-mode'){if(Core.showModePicker)Core.showModePicker();else setActiveView('settings');}
      if(action==='explore')setActiveView('tools');
      if(action==='new-file')showModal(`<h2>What would you like to make?</h2><p>Choose a Flora workspace.</p><div class="app-grid app-grid-modal">${appTypes.map(type=>appCard(type,fileInfo[type].label,fileInfo[type].blurb||'')).join('')}</div><div class="form-foot"><button class="btn btn-ghost" data-modal-close>Cancel</button></div>`, 'Create a file', true);
      if(action==='back-files'){setActiveView('files');}
      if(action==='export-active'&&activeFile)showExportModal(activeFile);
      if(action==='collaborate')showCollaborationModal();
      if(action==='edit-profile')showProfileEditor();
      if(action==='amethyst-create-offer'){try{await amethystCreateOffer();}catch(error){toast('Could not create offer: '+error.message,'error');}}
      if(action==='amethyst-create-answer'){try{await amethystCreateAnswer();}catch(error){toast('Could not create answer: '+error.message,'error');}}
      if(action==='amethyst-apply-answer'){try{await amethystApplyAnswer();}catch(error){toast('Could not connect: '+error.message,'error');}}
      if(action==='amethyst-copy-offer')await amethystCopy('amethyst-offer-output');
      if(action==='amethyst-copy-answer')await amethystCopy('amethyst-answer-output');
      if(action==='amethyst-reset'){resetAmethyst();setAmethystStatus('Not connected','Connection reset.');const status=$('#amethyst-transfer-state');if(status)status.textContent='Waiting for a connection. The received file will be saved to My files.';toast('Amethyst connection reset.');}
      if(action==='rename-active'&&activeFile){const value=$('#editor-title')?.value.trim();if(value)await renameFile(activeFile.id,value);}
      if(action==='export-csv'&&activeFile?.type==='sheet')exportFile(activeFile,'csv');
      if(action==='add-row'&&activeFile?.type==='sheet'){activeFile.content.rows=(activeFile.content.rows||20)+1;renderSheetGrid();scheduleSave('adding');}
      if(action==='add-column'&&activeFile?.type==='sheet'){activeFile.content.cols=(activeFile.content.cols||12)+1;renderSheetGrid();scheduleSave('adding');}
      if(action==='slide-add'&&activeFile?.type==='slides'){activeFile.content.push({title:'New slide',body:'Add your supporting text here.'});slideIndex=activeFile.content.length-1;renderSlide();scheduleSave('adding');}
      if(action==='slide-up'&&activeFile?.type==='slides'&&slideIndex>0){[activeFile.content[slideIndex-1],activeFile.content[slideIndex]]=[activeFile.content[slideIndex],activeFile.content[slideIndex-1]];slideIndex--;renderSlide();scheduleSave('editing');}
      if(action==='slide-down'&&activeFile?.type==='slides'&&slideIndex<activeFile.content.length-1){[activeFile.content[slideIndex+1],activeFile.content[slideIndex]]=[activeFile.content[slideIndex],activeFile.content[slideIndex+1]];slideIndex++;renderSlide();scheduleSave('editing');}
      if(action==='slide-delete'&&activeFile?.type==='slides'){if(activeFile.content.length>1){activeFile.content.splice(slideIndex,1);slideIndex=Math.max(0,slideIndex-1);renderSlide();scheduleSave('deleting');}else toast('A presentation needs at least one slide.');}
      if(action==='board-add'&&activeFile?.type==='board'){activeFile.content.push({id:uid(),text:'A new thought…',color:['yellow','green','pink'][activeFile.content.length%3]});renderBoard();scheduleSave('adding');}
      if(action==='clear-data'){
        if(confirm('This permanently removes every Flora profile, file, task and preference from this browser. Continue?')){
          if(!dbFallback){
            try{db.close();const request=indexedDB.deleteDatabase('FloraWorkspace');request.onsuccess=()=>location.reload();request.onerror=()=>toast('The browser could not delete Flora storage.','error');request.onblocked=()=>toast('Close other Flora tabs before clearing all data.','error');}catch{toast('Could not clear Flora storage.','error');}
          }else{
            ['profiles','files','meta'].forEach(key=>localStorage.removeItem(`flora:${key}`));location.reload();
          }
        }
      }
    }
    if(target.matches('[data-menu-file]')){
      const file=files.find(f=>f.id===target.dataset.menuFile);if(!file)return;
      showModal(`<h2>${esc(file.name)}</h2><p>File actions</p><div class="setting-row"><div class="setting-copy"><strong>Rename</strong><small>Give this file a new name.</small></div><button class="btn btn-secondary btn-small" id="file-rename">Rename</button></div><div class="setting-row"><div class="setting-copy"><strong>Export</strong><small>Download a copy in a supported format.</small></div><button class="btn btn-secondary btn-small" id="file-export">Export</button></div><div class="setting-row"><div class="setting-copy"><strong>Delete</strong><small>Remove this file from local storage.</small></div><button class="btn btn-danger btn-small" id="file-delete">Delete</button></div><div class="form-foot"><button class="btn btn-ghost" data-modal-close>Close</button></div>`, 'File actions');
      $('#file-rename').onclick=async()=>{const name=prompt('New file name',file.name);if(name)await renameFile(file.id,name);closeModal();};
      $('#file-export').onclick=()=>{closeModal();showExportModal(file);};
      $('#file-delete').onclick=()=>{closeModal();deleteFile(file.id);};
    }
    if(target.matches('[data-task-delete]')){const index=Number(target.dataset.taskDelete);window._floraTasks.splice(index,1);await setMeta('tasks',window._floraTasks);renderTasks();}
    if(target.matches('[data-focus-mode]')){resetFocus(target.dataset.focusMode);}
    if(target.matches('[data-focus-toggle]')){toggleFocus();}
    if(target.matches('[data-focus-reset]')){resetFocus();}
    if(target.matches('[data-board-delete]')){activeFile.content=activeFile.content.filter(note=>note.id!==target.dataset.boardDelete);renderBoard();scheduleSave('deleting');}
  });

  document.addEventListener('input', event=>{
    const target=event.target;
    if(target.id==='tool-search'){const q=target.value.toLowerCase().trim();let any=false;$$('.tool-tile').forEach(tile=>{const hit=!q||tile.dataset.toolName.includes(q);tile.hidden=!hit;if(hit)any=true;});$$('.tool-group').forEach(group=>{group.hidden=!$$('.tool-tile',group).some(tile=>!tile.hidden);});const empty=$('#tool-empty');if(empty)empty.hidden=any;return;}
    if(target.id==='file-search'){renderFiles(target.value);const search=$('#file-search');search?.focus();if(search){search.setSelectionRange(search.value.length,search.value.length);}return;}
    if(target.id==='document-editor'){scheduleSave('typing');broadcastActionFromInput(event);return;}
    if(target.id==='note-editor'){scheduleSave('typing');broadcastActionFromInput(event);return;}
    if(target.matches('[data-cell]')){
      const name=target.dataset.cell;activeFile.content.cells[name]=target.innerText;scheduleSave('typing');broadcastActionFromInput(event);
      selectedCell=parseCellReference(name);updateFormulaBar();
      $$('[data-cell]').forEach(cell=>{if(cell!==target && String(cellRaw(cell.dataset.cell)).startsWith('='))cell.textContent=String(getCellValue(cell.dataset.cell));});
      return;
    }
    if(target.id==='slide-title-input'||target.id==='slide-body-input'){
      const slide=activeFile?.content?.[slideIndex];if(!slide)return;slide[target.id==='slide-title-input'?'title':'body']=target.value;const card=$('#slide-card');if(card)card.innerHTML=`<h1>${esc(slide.title)}</h1><p>${esc(slide.body)}</p><span class="slide-index">${slideIndex+1} / ${activeFile.content.length}</span>`;scheduleSave('typing');return;
    }
    if(target.matches('[data-board-text]')){const note=activeFile.content.find(item=>item.id===target.dataset.boardText);if(note)note.text=target.value;scheduleSave('typing');return;}
  });
  document.addEventListener('change', async event=>{
    if(event.target.id==='block-format'){
      const editor=$('#document-editor');if(editor){editor.focus();document.execCommand('formatBlock',false,`<${event.target.value}>`);scheduleSave('editing');}return;
    }
    if(event.target.id==='font-face'){const editor=$('#document-editor');if(editor){editor.focus();document.execCommand('fontName',false,event.target.value);scheduleSave('editing');}return;}
    if(event.target.id==='font-size'){const editor=$('#document-editor');if(editor){editor.focus();document.execCommand('fontSize',false,event.target.value);scheduleSave('editing');}return;}
    if(event.target.id==='font-color'){const editor=$('#document-editor');if(editor){editor.focus();document.execCommand('foreColor',false,event.target.value);scheduleSave('editing');}return;}
    if(event.target.id==='highlight-color'){const editor=$('#document-editor');if(editor){editor.focus();document.execCommand('hiliteColor',false,event.target.value);scheduleSave('editing');}return;}
    if(event.target.id==='file-filter'){fileTypeFilter=event.target.value;refreshFileList();return;}
    if(event.target.id==='file-sort'){await saveSettings({sortFiles:event.target.value});refreshFileList();return;}
    if(event.target.matches('[data-task-toggle]')){const index=Number(event.target.dataset.taskToggle);if(window._floraTasks[index]){window._floraTasks[index].done=event.target.checked;await setMeta('tasks',window._floraTasks);renderTasks();}return;}
    if(event.target.id==='formula-input'){
      const name=cellName(selectedCell.row,selectedCell.col);activeFile.content.cells[name]=event.target.value;renderSheetGrid();scheduleSave('typing');return;
    }
    if(event.target.matches('[data-cell]')){
      const parsed=parseCellReference(event.target.dataset.cell);if(parsed){selectedCell=parsed;updateFormulaBar();renderSheetGrid();broadcastPresence('selecting');}
    }
  });
  document.addEventListener('focusin',event=>{
    if(event.target.matches('[data-cell]')){
      const parsed=parseCellReference(event.target.dataset.cell);
      if(parsed){selectedCell=parsed;updateFormulaBar();broadcastPresence('selecting');}
    }
  });
  document.addEventListener('focusout',event=>{
    if(event.target.matches('#document-editor,#note-editor,[data-cell]')){
      if(!settings.autosave)saveCurrentContent('editing');
      if(pendingRemoteFile)setTimeout(applyPendingRemote,50);
    }
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape' && $('#modal-root').innerHTML)closeModal();
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();openPalette();return;}
    if((event.ctrlKey||event.metaKey)&&event.key===','){event.preventDefault();setActiveView('settings');return;}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){
      if(activeFile){event.preventDefault();clearTimeout(saveTimer);saveCurrentContent('editing').then(()=>toast('Saved','success'));}
    }
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='n'){
      event.preventDefault();createFile('doc');
    }
    if(event.target.id==='formula-input' && event.key==='Enter'){
      event.preventDefault();
      const name=cellName(selectedCell.row,selectedCell.col);
      activeFile.content.cells[name]=event.target.value;
      renderSheetGrid();scheduleSave('typing');
      return;
    }
    if(event.target.matches('[data-cell]')){
      if(event.key==='Enter'){
        const parsed=parseCellReference(event.target.dataset.cell);if(parsed){selectedCell={row:Math.min(parsed.row+1,activeFile.content.rows||20),col:parsed.col};$(`[data-cell="${cellName(selectedCell.row,selectedCell.col)}"]`)?.focus();updateFormulaBar();broadcastPresence('selecting');}
      }
      if(event.key==='Tab'){
        event.preventDefault();const parsed=parseCellReference(event.target.dataset.cell);if(parsed){selectedCell={row:parsed.row,col:Math.min(parsed.col+1,activeFile.content.cols||12)};$(`[data-cell="${cellName(selectedCell.row,selectedCell.col)}"]`)?.focus();updateFormulaBar();}
      }
    }
  });

  $('#mode-chip')?.addEventListener('click',()=>{if(settings.examLock){if(settings.modeUndo)undoMode();else applyMode('standard');}else if(Core.showModePicker)Core.showModePicker();else setActiveView('settings');});
  $('#palette-button')?.addEventListener('click',openPalette);
  if(window.matchMedia){
    const darkQuery=window.matchMedia('(prefers-color-scheme: dark)');const motionQuery=window.matchMedia('(prefers-reduced-motion: reduce)');
    const onSystemChange=()=>{if(profile)applySettings();};
    (darkQuery.addEventListener?darkQuery.addEventListener.bind(darkQuery,'change'):darkQuery.addListener.bind(darkQuery))(onSystemChange);
    (motionQuery.addEventListener?motionQuery.addEventListener.bind(motionQuery,'change'):motionQuery.addListener.bind(motionQuery))(onSystemChange);
  }
  $('#profile-switcher').addEventListener('click',showProfileSwitcher);
  $('#top-profile').addEventListener('click',showProfileSwitcher);
  $('#help-button').addEventListener('click',showHelpModal);
  $('#mobile-menu').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
  $('#sidebar-compact-toggle').addEventListener('click',async()=>{settings.compactMode=!settings.compactMode;await saveSettings();toast(settings.compactMode?'Compact sidebar enabled.':'Comfortable sidebar enabled.');});
  document.addEventListener('selectionchange',()=>{
    const editor=$('#document-editor');
    if(editor && document.activeElement===editor && !window._floraSelectionPing){
      window._floraSelectionPing=true;broadcastPresence('selecting');setTimeout(()=>{window._floraSelectionPing=false;},180);
    }
  });
  if('serviceWorker' in navigator && (location.protocol==='http:' || location.protocol==='https:')){
    window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  }

  const Core = window.FloraCore = {
    $, $$, esc, uid, now, formatBytes, prettyDate, toast, hexToRgb, mixHex,
    fileInfo, appTypes, registerApp, registerTool, registerView, allTools,
    get settings() { return settings; }, get files() { return files; }, get profiles() { return profiles; }, get profile() { return profile; },
    get currentView() { return currentView; }, get lastView() { return lastView; }, ui,
    saveSettings, getMeta, setMeta, getAllMeta:() => getAll('meta'), putRecord, deleteRecord,
    setActiveView, renderView, openFile, createFile, addFiles, deleteFiles, setBreadcrumb,
    activeFile:() => activeFile, changed:action => scheduleSave(action || 'typing'),
    localDataSize, fileSize, storageEstimate, storageChoices, storageQuotaBytes,
    exportFile, downloadBlob, textBlob, readFileText, safeFilename, dataURLToBlob,
    applyMode, undoMode, resetSettings, requestPersist, exportBackup, importBackup, finishSetup,
    showModal, closeModal, showProfileEditor, showImportModal, openPalette, countUp, chime, animOff, animLevel, playViewEnter,
    previewSettings, metaSizes:() => ({ ...metaSizes }), forgetMeta:key => { delete metaSizes[key]; }, refreshSidebar:renderSidebar, setup:null, showModePicker:null, chooseMode:null, settingsIndex:null, openSettings:null
  };
  function fileSize(file) { try { return new Blob([JSON.stringify(file)]).size; } catch { return JSON.stringify(file).length * 2; } }
  function hideSplash() {
    const splash = $('#splash'); if (!splash) return;
    const wait = (settings.startupAnim === false || animOff()) ? 0 : 650;
    setTimeout(() => { splash.classList.add('done'); setTimeout(() => splash.remove(), 500); }, wait);
  }

  async function boot() {
    try { db=await openDB(); }
    catch(error) { dbFallback=true; try{localStorage.setItem('flora:fallback-check','1');localStorage.removeItem('flora:fallback-check');}catch{document.body.innerHTML='<main style="max-width:600px;margin:10vh auto;padding:30px;font:16px Georgia"><h1>Flora could not access local storage</h1><p>Please open Flora in a normal browser window, not private browsing, and allow site storage.</p></main>';return;} }
    await loadAll();
    if (settings.largeText && Number(settings.textScale) === 100) { settings.textScale = 113; settings.largeText = false; await setMeta('settings', settings); applySettings(); }
    focusSeconds = focusLength();
    window._floraTasks=await getMeta('tasks',[]);
    const activeId=await getMeta('activeProfileId',null);
    profile=profiles.find(item=>item.id===activeId)||profiles[0]||null;
    renderSidebar();
    if(profile){await setMeta('activeProfileId',profile.id);syncProfileHeader();setupChannel();updateStorageUI();setActiveView(settings.defaultView||'home');
      const days=Number(settings.backupReminderDays)||0;
      if(days&&(!settings.lastBackupAt||Date.now()-new Date(settings.lastBackupAt)>days*864e5))setTimeout(()=>toast('It has been a while since your last backup. Settings › Privacy and data has one-click backup.'),2500);}
    else {showSetupModal(false);}
    if(dbFallback)toast('Using browser localStorage fallback. Large workspaces may be limited.');
    hideSplash();
  }
  const start = () => boot().catch(error=>{console.error(error);toast('Flora could not start. Check browser storage permissions.','error');hideSplash();});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

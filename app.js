/* Flora — offline-first creative workspace. No external JavaScript dependencies. */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : `flora-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const now = () => new Date().toISOString();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const prettyDate = value => new Intl.DateTimeFormat(undefined, { dateStyle:'medium', timeStyle:'short' }).format(new Date(value));
  const formatBytes = bytes => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B','KB','MB','GB','TB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const n = bytes / (1024 ** i);
    return `${n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)} ${units[i]}`;
  };
  const fileInfo = {
    doc: { label:'Azalea Docs', short:'Document', icon:'', color:'#f5e7bb', extensions:['docx','html','doc','txt','md'] },
    sheet: { label:'Amaryllis Sheets', short:'Spreadsheet', icon:'', color:'#f1dfd7', extensions:['xlsx','csv','json','html'] },
    slides: { label:'Iris Presentations', short:'Presentation', icon:'', color:'#e5e3ef', extensions:['pptx','html','json'] },
    note: { label:'Anemone Notes', short:'Note', icon:'', color:'#e4eadc', extensions:['txt','md','html'] },
    board: { label:'Dahlia Boards', short:'Board', icon:'', color:'#eae2ee', extensions:['json','html'] }
  };
  const appTypes = ['doc','sheet','slides','note','board'];
  const defaultSettings = {
    autosave:true, confirmDelete:true, largeText:false, highContrast:false, reduceMotion:false,
    accent:'#e9c96b', storageLimitBytes:64 * 1024 * 1024, storageUnit:'MB', storageAmount:64,
    compactMode:false, spellcheck:true, localOnly:true
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
  async function setMeta(key, value) { return putRecord('meta', { key, value }); }
  async function loadAll() {
    [profiles, files] = await Promise.all([getAll('profiles'), getAll('files')]);
    settings = { ...defaultSettings, ...(await getMeta('settings', {})) };
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
    try { return new Blob([JSON.stringify({profiles, files, settings})]).size; }
    catch { return JSON.stringify({profiles, files, settings}).length * 2; }
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

  function applySettings() {
    document.body.classList.toggle('large-text', !!settings.largeText);
    document.body.classList.toggle('high-contrast', !!settings.highContrast);
    document.body.classList.toggle('reduce-motion', !!settings.reduceMotion);
    document.documentElement.style.setProperty('--accent', settings.accent || defaultSettings.accent);
    document.body.classList.toggle('compact-sidebar', !!settings.compactMode);
    const compactButton=$('#sidebar-compact-toggle');
    compactButton?.setAttribute('aria-pressed', String(!!settings.compactMode));
    if(compactButton)compactButton.textContent=settings.compactMode?'Expand':'Compact';
  }
  function toast(message, kind = '') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = message;
    $('#toast-region').append(el);
    setTimeout(() => el.remove(), 3400);
  }
  function saveSettings() { return setMeta('settings', settings).then(() => { applySettings(); updateStorageUI(); }); }
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
  function updateNav() {
    $('#file-count').textContent = String(files.length);
    $$('.nav-item').forEach(button => button.classList.remove('active'));
    if (currentApp) $(`[data-app="${currentApp}"]`)?.classList.add('active');
    else if (currentView === 'amethyst') $('[data-view="tools"]')?.classList.add('active');
    else $(`[data-view="${currentView}"]`)?.classList.add('active');
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
  function setActiveView(view, app = null) {
    flushCurrentContent();
    currentView = view;
    currentApp = app;
    activeFileId = null;
    activeFile = null;
    pendingRemoteFile = null;
    peers.clear();
    updateNav();
    renderView();
    broadcastPresence('viewing');
    $('#sidebar').classList.remove('open');
  }
  function newFileContent(type) {
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
  async function createFile(type, name) {
    if (!appTypes.includes(type)) return;
    const file = makeFile(type, name);
    if (!(await canStore(file))) return;
    files.push(file);
    await putRecord('files', file);
    updateStorageUI();
    toast(`${file.name} created`, 'success');
    openFile(file.id);
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
    return `<button class="app-card" data-create="${type}"><span class="app-card-kicker">FLORA APP</span><strong>${title}</strong><small>${desc}</small><span class="card-open-label">Open workspace</span></button>`;
  }
  function fileIcon(file) { return `<span class="file-type-label">${esc(fileInfo[file.type]?.short || 'File')}</span>`; }
  function fileRow(file) {
    return `<div class="file-row" data-file-row="${file.id}">${fileIcon(file)}<div class="file-row-copy"><strong>${esc(file.name)}</strong><small>${fileInfo[file.type]?.label || 'Flora file'} · Edited ${prettyDate(file.updatedAt)}</small></div><span class="tag">${fileInfo[file.type]?.short || 'File'}</span><div class="file-row-actions"><button data-open="${file.id}" aria-label="Open ${esc(file.name)}">Open</button><button data-export="${file.id}" aria-label="Export ${esc(file.name)}">Export</button></div></div>`;
  }
  function toolCard(title, description, label, view) {
    return `<button class="tool-card" data-view="${view}"><span class="tool-card-kicker">${label}</span><strong>${title}</strong><small>${description}</small><span class="card-open-label">Open tool</span></button>`;
  }
  function renderHome() {
    setBreadcrumb('Workspace','Home');
    const dayLabel = new Intl.DateTimeFormat(undefined,{weekday:'long'}).format(new Date()).toUpperCase();
    const recent = getRecentFiles(6);
    const docs = files.filter(f => f.type === 'doc').length;
    const sheets = files.filter(f => f.type === 'sheet').length;
    const presentations = files.filter(f => f.type === 'slides').length;
    $('#view-root').innerHTML = `
      <section class="home-intro">
        <div><div class="page-kicker">${dayLabel} / YOUR WORKSPACE</div><h1 class="page-title">Good to see you, ${esc(profile.name.split(' ')[0])}.</h1><p class="page-subtitle">A focused space for documents, plans, data and ideas.</p></div>
        <div class="welcome-actions"><button class="btn btn-secondary" data-action="import">Import file</button><button class="btn btn-primary" data-create="doc">Create document</button></div>
      </section>
      <section class="home-hero"><div class="home-hero-copy"><div class="hero-eyebrow">YOUR WORKSPACE, AT YOUR PACE</div><h2>Make space for your next good idea.</h2><p>Everything you create is saved locally in this browser. Start with a blank page or return to a recent project.</p><button class="btn btn-primary" data-view="tools">Explore tools</button></div><div class="hero-side-note"><span>FLORA / LOCAL WORKSPACE</span><strong>${files.length.toString().padStart(2,'0')}</strong><small>saved files</small></div></section>
      <div class="quick-stats"><div class="stat-card"><div class="stat-label">All files</div><div class="stat-value">${files.length}</div><div class="stat-note">Saved in your local workspace</div></div><div class="stat-card"><div class="stat-label">Documents and notes</div><div class="stat-value">${docs + files.filter(f=>f.type==='note').length}</div><div class="stat-note">Writing and quick capture</div></div><div class="stat-card"><div class="stat-label">Sheets and presentations</div><div class="stat-value">${sheets + presentations}</div><div class="stat-note">Structured work and ideas</div></div></div>
      <div class="section-heading"><div><h2>Create something</h2><p>Choose a workspace to get started.</p></div></div>
      <div class="app-grid">${appCard('doc','Azalea Docs','Write, format and export documents')}${appCard('sheet','Amaryllis Sheets','Tables, calculations and data')}${appCard('slides','Iris Presentations','Build clear presentations')}${appCard('note','Anemone Notes','Capture quick thoughts')}${appCard('board','Dahlia Boards','Arrange ideas on a canvas')}</div>
      <div class="section-heading"><div><h2>Recent files</h2><p>Continue where you left off.</p></div><button class="text-link" data-view="files">View all files</button></div>
      <div class="recent-list">${recent.length ? recent.map(fileRow).join('') : `<div class="empty-state"><h3>Your workspace is ready</h3><p>Create a document, spreadsheet, presentation or note. Your work is saved on this device.</p></div>`}</div>`;
  }
  function renderAppLanding(type) {
    const info = fileInfo[type];
    const matching = getRecentFiles(50).filter(file => file.type === type);
    setBreadcrumb('Create', info.label);
    const description = type==='doc'?'A page-focused writing workspace with familiar formatting controls.':type==='sheet'?'Organise information, calculate totals and inspect your data.':type==='slides'?'Turn an outline into a clear presentation.':type==='note'?'Keep short notes and working thoughts close at hand.':'Arrange ideas, references and plans on a freeform board.';
    $('#view-root').innerHTML = `<div class="welcome-row"><div><div class="page-kicker">FLORA APPLICATION</div><h1 class="page-title">${info.label}</h1><p class="page-subtitle">${description}</p></div><button class="btn btn-primary" data-create="${type}">Create ${info.short.toLowerCase()}</button></div>
    <div class="panel"><div class="section-heading" style="margin-top:0"><div><h2>Your ${info.short.toLowerCase()}s</h2><p>Saved locally on this device.</p></div></div>${matching.length ? `<div class="recent-list">${matching.map(fileRow).join('')}</div>` : `<div class="empty-state"><h3>No ${info.short.toLowerCase()}s yet</h3><p>Create your first one to get started.</p><button class="btn btn-primary" data-create="${type}" style="margin-top:15px">Create ${info.short}</button></div>`}</div>`;
  }
  function renderFiles(filter = '') {
    setBreadcrumb('Workspace','My files');
    const query = filter.toLowerCase();
    const visible = [...files].sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)).filter(f => f.name.toLowerCase().includes(query) || fileInfo[f.type].label.toLowerCase().includes(query));
    $('#view-root').innerHTML = `<div class="welcome-row"><div><div class="page-kicker">YOUR LOCAL LIBRARY</div><h1 class="page-title">My files</h1><p class="page-subtitle">Everything you make in Flora, kept together and under your control.</p></div><div class="welcome-actions"><button class="btn btn-secondary" data-action="import">Import file</button><button class="btn btn-primary" data-action="new-file">New file</button></div></div>
      <div class="toolbar-row"><div class="search-field"><input id="file-search" type="search" placeholder="Search your files…" value="${esc(filter)}" aria-label="Search files"></div><div style="display:flex;gap:7px"><select id="file-filter" class="select-control" aria-label="Filter by type"><option value="all">All types</option>${appTypes.map(type=>`<option value="${type}">${fileInfo[type].short}s</option>`).join('')}</select><button class="btn btn-secondary btn-small" data-action="import">Import file</button></div></div>
      <div id="file-list-region">${visible.length ? `<div class="file-grid">${visible.map(file=>`<div class="file-card"><div class="file-card-head">${fileIcon(file)}<button class="btn btn-ghost btn-small" data-menu-file="${file.id}" title="File options">Options</button></div><div class="file-card-title" title="${esc(file.name)}">${esc(file.name)}</div><div class="file-card-meta">${fileInfo[file.type].short} · ${prettyDate(file.updatedAt)}</div><div class="file-card-actions"><button class="btn btn-secondary btn-small" data-open="${file.id}">Open</button><button class="btn btn-ghost btn-small" data-export="${file.id}">Export</button></div></div>`).join('')}</div>` : `<div class="panel"><div class="empty-state"><h3>${filter ? 'No matching files' : 'Your library is ready'}</h3><p>${filter ? 'Try a different search.' : 'Create your first file or import an existing one.'}</p></div></div>`}</div>`;
  }
  function renderShared() {
    const shared = files.filter(file => (file.collaborators || []).includes(profile.id) || file.ownerId !== profile.id);
    setBreadcrumb('Workspace','Shared with me');
    $('#view-root').innerHTML = `<div class="welcome-row"><div><div class="page-kicker">COLLABORATION</div><h1 class="page-title">Shared with me</h1><p class="page-subtitle">Files shared through your local Flora workspace.</p></div></div><div class="panel"><div class="collab-explainer"><strong>Local collaboration:</strong> Flora can sync open files and show collaborator cursors between tabs or windows using the same browser profile and local address. It does not connect people across the internet or different devices without a separate server.</div>${shared.length ? `<div class="recent-list">${shared.map(fileRow).join('')}</div>` : `<div class="empty-state"><h3>No shared files yet</h3><p>Open a file, choose Collaborate, then open the same local Flora address in another tab and select a different local profile.</p></div>`}</div>`;
  }
  function renderStorage() {
    setBreadcrumb('Tools','Flora Storage');
    const usage = localDataSize();
    const limit = settings.storageLimitBytes;
    const estimatePromise = storageEstimate();
    $('#view-root').innerHTML = `<div class="welcome-row"><div><div class="page-kicker">LOCAL STORAGE</div><h1 class="page-title">Flora Storage</h1><p class="page-subtitle">A clear view of the space Flora uses on this browser.</p></div><button class="btn btn-secondary" data-view="settings">Manage limit</button></div>
      <div class="storage-panel"><div class="storage-big"><span class="stat-label">Flora virtual storage</span><strong>${formatBytes(usage)}</strong><small>Estimated size of Flora profiles, settings and saved files.</small></div><div class="storage-big"><span class="stat-label">Your chosen limit</span><strong>${formatBytes(limit)}</strong><small>The limit you set inside Flora.</small></div></div>
      <div class="panel" style="margin-top:15px"><h3>Storage breakdown</h3><p class="panel-subtitle">Local estimate; individual file sizes are approximate.</p><div class="progress-track storage-detail-track" style="height:10px;margin:15px 0"><span style="width:${Math.min(100,usage/limit*100)}%"></span></div><div class="setting-row"><div class="setting-copy"><strong>Documents, sheets, slides and notes</strong><small>${formatBytes(files.reduce((sum,file)=>sum+new Blob([JSON.stringify(file)]).size,0))} across ${files.length} files</small></div><span class="tag">${files.length} files</span></div><div class="setting-row"><div class="setting-copy"><strong>Local profiles</strong><small>${profiles.length} profile${profiles.length===1?'':'s'} on this browser</small></div></div><div class="setting-row"><div class="setting-copy"><strong>Browser storage availability</strong><small id="browser-quota-label">Checking browser quota…</small></div><span class="tag">Browser managed</span></div><p class="small-print">Your chosen Flora limit is a logical cap for the app. The browser or operating system may impose a smaller quota, and may clear site data in some circumstances. Export important work regularly.</p></div>`;
    estimatePromise.then(result=>{ const label=$('#browser-quota-label'); if(label) label.textContent=result.quota?`${formatBytes(result.usage)} used of approximately ${formatBytes(result.quota)} available to this site`:'The browser does not expose a storage estimate.'; });
  }
  function renderTasks() {
    setBreadcrumb('Tools','Rowan Tasks');
    const tasks = window._floraTasks || [];
    $('#view-root').innerHTML = `<div class="welcome-row"><div><div class="page-kicker">GENTLE PLANNING</div><h1 class="page-title">Rowan Tasks</h1><p class="page-subtitle">A simple local checklist for the things on your mind.</p></div></div><div class="panel" style="max-width:760px"><form id="task-form" class="task-input-row"><input id="task-input" class="text-input" placeholder="Add a task…" aria-label="New task" style="flex:1"><button class="btn btn-primary" type="submit">Add task</button></form><div class="task-list">${tasks.length?tasks.map((task,i)=>`<label class="task-item ${task.done?'done':''}"><input type="checkbox" data-task-toggle="${i}" ${task.done?'checked':''}><span>${esc(task.text)}</span><button type="button" class="btn btn-ghost btn-small" data-task-delete="${i}" aria-label="Delete task">Remove</button></label>`).join(''):`<div class="empty-state"><h3>A fresh list</h3><p>Add one small next step. You can tick it off when it is done.</p></div>`}</div></div>`;
  }
  function renderFocus() {
    setBreadcrumb('Tools','Camellia Focus');
    const mins = Math.floor(focusSeconds/60).toString().padStart(2,'0');
    const secs = (focusSeconds%60).toString().padStart(2,'0');
    $('#view-root').innerHTML = `<div class="welcome-row"><div><div class="page-kicker">A MOMENT FOR YOURSELF</div><h1 class="page-title">Camellia Focus</h1><p class="page-subtitle">A calm timer for a little focused work or a proper break.</p></div></div><div class="focus-card"><div class="focus-label">${focusMode==='focus'?'FOCUS SESSION':'REST BREAK'}</div><div class="focus-time" id="focus-time">${mins}:${secs}</div><p class="page-subtitle">${focusRunning?'One thing at a time. You have got this.':'Choose a session and begin when you are ready.'}</p><div class="focus-controls"><button class="btn btn-secondary" data-focus-mode="focus">25 min focus</button><button class="btn btn-secondary" data-focus-mode="break">5 min break</button></div><div class="focus-controls"><button class="btn btn-primary" data-focus-toggle>${focusRunning?'Pause':'Start'} session</button><button class="btn btn-ghost" data-focus-reset>Reset</button></div></div>`;
  }

  function renderTools() {
    setBreadcrumb('Workspace','Tools');
    $('#view-root').innerHTML = `<div class="welcome-row"><div><div class="page-kicker">FLORA UTILITIES</div><h1 class="page-title">Tools</h1><p class="page-subtitle">Small utilities that make the creative work easier to manage.</p></div></div>
      <div class="tool-grid">
        ${toolCard('Amethyst','Send Flora files directly to another person on your local network.','PEER-TO-PEER TRANSFER','amethyst')}
        ${toolCard('Rowan Tasks','Keep a lightweight checklist alongside your projects.','PLANNING','tasks')}
        ${toolCard('Camellia Focus','Use a configurable focus and break timer.','FOCUS','focus')}
        ${toolCard('Flora Storage','Review local usage and manage your storage cap.','STORAGE','storage')}
      </div>
      <div class="tool-note"><strong>Local-first by design</strong><p>Flora keeps files in this browser. Amethyst uses a direct browser-to-browser connection; it does not upload files to a cloud storage provider.</p></div>`;
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

  function renderSettings() {
    setBreadcrumb('Workspace','Settings');
    const tabs = [ ['general','General'],['accessibility','Accessibility'],['customization','Customization'],['privacy','Privacy'] ];
    const tabMarkup = tabs.map(([id,label])=>`<button class="settings-tab ${settingsTab===id?'active':''}" data-settings-tab="${id}">${label}</button>`).join('');
    let content = '';
    if (settingsTab === 'general') content = `
      <h2>General</h2><p>Set how Flora behaves and how much space it can use.</p>
      ${settingToggle('autosave','Automatic saving','Save your work as you type. You can also use Ctrl + S (Command + S on Mac).',settings.autosave)}
      ${settingToggle('confirmDelete','Confirm before deleting','Ask before removing a file from this device.',settings.confirmDelete)}
      ${settingToggle('compactMode','Compact sidebar','Use a narrower navigation rail to give editors more room.',settings.compactMode)}
      <div class="setting-row"><div class="setting-copy"><strong>Virtual storage limit</strong><small>Choose a cap for Flora’s local files. Options are constrained by the browser quota estimate.</small></div><div style="display:flex;gap:7px;align-items:center"><select class="select-control" id="storage-unit"><option value="KB" ${settings.storageUnit==='KB'?'selected':''}>KB</option><option value="MB" ${settings.storageUnit==='MB'?'selected':''}>MB</option><option value="GB" ${settings.storageUnit==='GB'?'selected':''}>GB</option></select><select class="select-control" id="storage-amount" aria-label="Storage amount"></select></div></div>
      <div class="setting-row"><div class="setting-copy"><strong>Keyboard shortcuts</strong><small><span class="kbd">Ctrl</span> + <span class="kbd">S</span> Save · <span class="kbd">Ctrl</span> + <span class="kbd">N</span> Create document · <span class="kbd">Esc</span> Close dialog</small></div></div>`;
    if (settingsTab === 'accessibility') content = `
      <h2>Accessibility</h2><p>Adjust Flora to make your workspace more comfortable.</p>
      ${settingToggle('largeText','Larger text','Increase the overall interface text size.',settings.largeText)}
      ${settingToggle('highContrast','Higher contrast','Strengthen text and border contrast.',settings.highContrast)}
      ${settingToggle('reduceMotion','Reduce motion','Disable most transitions and decorative movement.',settings.reduceMotion)}
      ${settingToggle('spellcheck','Browser spellcheck','Allow your browser’s built-in spellcheck in writing areas.',settings.spellcheck)}`;
    if (settingsTab === 'customization') content = `
      <h2>Customization</h2><p>Give your Flora workspace a colour that feels like yours.</p>
      <div class="setting-row"><div class="setting-copy"><strong>Accent colour</strong><small>Used for buttons, focus states and small highlights.</small></div><div class="swatches">${['#e9c96b','#c8a1a0','#9eafa0','#9aa9bd','#b3a0c2','#d69c6c','#8f9b6a'].map(color=>`<button class="swatch ${settings.accent===color?'active':''}" style="background:${color}" data-accent="${color}" aria-label="Set accent ${color}"></button>`).join('')}</div></div>
      <div class="setting-row"><div class="setting-copy"><strong>Profile details</strong><small>Names, pronouns, bios and cursor colours are managed separately in your profile settings.</small></div><button class="btn btn-secondary btn-small" data-action="edit-profile">Open profile settings</button></div>
      <div class="setting-row"><div class="setting-copy"><strong>Default typeface</strong><small>Newsreader is used when available, with a Georgia fallback. The app does not download fonts, so the workspace remains offline-first.</small></div><span class="tag">Newsreader</span></div>
      <div class="setting-row"><div class="setting-copy"><strong>Workspace appearance</strong><small>Flora uses a warm, light pastel palette designed for long sessions.</small></div><span class="tag">Warm light</span></div>`;
    if (settingsTab === 'privacy') content = `
      <h2>Privacy</h2><p>Your workspace is designed to stay on this device.</p>
      <div class="setting-row"><div class="setting-copy"><strong>Local-first storage</strong><small>Profiles, settings and work files are saved in this browser’s IndexedDB. No Flora account or analytics service is used.</small></div><span class="tag">On device</span></div>
      <div class="setting-row"><div class="setting-copy"><strong>Collaboration scope</strong><small>Live sync uses BroadcastChannel between tabs/windows on the same browser origin. It does not send your files to a server.</small></div><span class="tag">Local only</span></div>
      <div class="setting-row"><div class="setting-copy"><strong>Export your work</strong><small>You can export files at any time from My files or an editor.</small></div><button class="btn btn-secondary btn-small" data-view="files">Open files</button></div>
      <div class="setting-row"><div class="setting-copy"><strong>Clear Flora data</strong><small>Remove every local profile, file, task and preference from this browser. This cannot be undone.</small></div><button class="btn btn-danger btn-small" data-action="clear-data">Clear all data</button></div>`;
    $('#view-root').innerHTML = `<div class="welcome-row"><div><div class="page-kicker">MAKE FLORA YOURS</div><h1 class="page-title">Settings</h1><p class="page-subtitle">A few thoughtful controls for your workspace.</p></div></div><div class="settings-layout"><div class="settings-tabs">${tabMarkup}</div><section class="settings-content">${content}</section></div>`;
    if (settingsTab === 'general') populateStorageAmount();
  }
  function settingToggle(key, title, description, value) {
    return `<div class="setting-row"><div class="setting-copy"><strong>${title}</strong><small>${description}</small></div><button class="toggle" role="switch" aria-checked="${!!value}" data-setting-toggle="${key}" aria-label="${title}"></button></div>`;
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
  async function populateStorageAmount() {
    const unitSelect = $('#storage-unit');
    const amountSelect = $('#storage-amount');
    if (!unitSelect || !amountSelect) return;
    const unit = unitSelect.value;
    const choices = await storageChoices(unit);
    const unitOption = unitSelect.querySelector(`option[value="${unit}"]`);
    if (!choices.length) { if(unitOption)unitOption.disabled=true; amountSelect.innerHTML = `<option value="">Unavailable — browser quota below 16 ${unit}</option>`; amountSelect.disabled = true; return; }
    if(unitOption)unitOption.disabled=false;
    amountSelect.disabled = false;
    amountSelect.innerHTML = choices.map(amount=>`<option value="${amount}">${amount} ${unit}</option>`).join('');
    const closest = choices.reduce((a,b)=>Math.abs(b-settings.storageAmount)<Math.abs(a-settings.storageAmount)?b:a,choices[0]);
    amountSelect.value = String(choices.includes(settings.storageAmount)?settings.storageAmount:closest);
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
    updateCollabBar();
  }
  function renderEditorBody(file) {
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
    saveStatus('Saved on this device');
    broadcastPresence(action);
  }
  function scheduleSave(action='typing') {
    if (!activeFile) return;
    saveStatus(settings.autosave ? 'Saving…' : 'Unsaved changes');
    broadcastPresence(action);
    clearTimeout(saveTimer);
    if (settings.autosave) saveTimer=setTimeout(()=>saveCurrentContent(action),450);
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
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;document.body.append(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
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
    return {blob:new Blob([data],{type:mime}),filename:`${safeFilename(file.name)}.${extension}`};
  }
  function exportFile(file, extension) {
    const {blob,filename}=exportPayload(file,extension);
    downloadBlob(blob,filename);
    toast(`Exported ${filename}`, 'success');
  }
  function showExportModal(file) {
    const types=fileInfo[file.type].extensions;
    showModal(`<h2>Export ${esc(file.name)}</h2><p>Choose a format. Flora creates the file directly in your browser.</p><div class="choice-row">${types.map((ext,i)=>`<button class="choice-chip ${i===0?'active':''}" data-export-format="${ext}">.${ext.toUpperCase()}</button>`).join('')}</div><p class="small-print" style="margin-top:14px">Office files are generated locally as basic Open XML packages. Documents keep headings and inline emphasis; spreadsheets keep cell values and basic formulas; presentations export title-and-body slides.</p><div class="form-foot"><button class="btn btn-ghost" data-modal-close>Cancel</button><button class="btn btn-primary" id="confirm-export">Export file</button></div>`, 'Export file');
    let selected=types[0];
    $$('[data-export-format]').forEach(button=>button.addEventListener('click',()=>{$$('[data-export-format]').forEach(b=>b.classList.remove('active'));button.classList.add('active');selected=button.dataset.exportFormat;}));
    $('#confirm-export').addEventListener('click',()=>{exportFile(file,selected);closeModal();});
  }
  function showImportModal() {
    showModal(`<h2>Bring a file into Flora</h2><p>Import a text, HTML, CSV or JSON file. The imported copy is stored locally in your Flora library.</p><div class="import-drop"><strong>Choose a file from your device</strong><br><input type="file" id="import-file" accept=".txt,.md,.html,.htm,.csv,.json,text/plain,text/html,text/csv,application/json"></div><div class="form-foot"><span class="form-hint">The original file is not changed.</span><button class="btn btn-ghost" data-modal-close>Close</button></div>`, 'Import file');
    $('#import-file').addEventListener('change',async event=>{
      const file=event.target.files?.[0];if(!file)return;
      const extension=file.name.split('.').pop().toLowerCase();
      if(!['txt','md','html','htm','csv','json'].includes(extension)){toast('That file type is not supported yet.', 'error');return;}
      try{
        const text=await file.text();let type='doc',content=text;
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
        else {type='doc';content=`<p>${esc(text).replace(/\n/g,'<br>')}</p>`;}
        const name=file.name.replace(/\.[^.]+$/,'');const imported={...makeFile(type,name),content};
        if(!(await canStore(imported)))return;
        files.push(imported);await putRecord('files',imported);closeModal();toast('File imported into Flora', 'success');updateNav();openFile(imported.id);
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
  function storageSetupOptions(unit) {
    const multiplier=unit==='GB'?1024**3:unit==='MB'?1024**2:1024;
    const options=[];for(let value=16;value<=8192;value*=2)options.push(value);
    return options.map(value=>`<option value="${value}">${value} ${unit}</option>`).join('');
  }
  function showSetupModal(isNewProfile=false) {
    const state={name:'',bio:'',color:'#b89a50',accent:settings.accent||'#e9c96b',compact:!!settings.compactMode,reduceMotion:!!settings.reduceMotion,unit:settings.storageUnit||'MB',amount:settings.storageAmount||64};
    let step=1;
    const total=isNewProfile?2:4;
    const bytesFor=(unit,amount)=>amount*(unit==='GB'?1024**3:unit==='MB'?1024**2:1024);
    const render=async()=>{
      let body='';
      if(step===1)body=`<div class="setup-step-copy"><div class="page-kicker">STEP 1 OF ${total}</div><h2>${isNewProfile?'Create a profile':'Start with your profile'}</h2><p>This name and colour identify you in your local Flora workspace and in collaborator presence.</p></div><div class="form-grid"><div class="form-field full"><label for="setup-name">Display name</label><input id="setup-name" required maxlength="60" placeholder="e.g. Alex Morgan" value="${esc(state.name)}" autocomplete="name"></div><div class="form-field"><label for="setup-color">Cursor colour</label><input id="setup-color" type="color" value="${state.color}" style="height:44px;padding:4px"></div><div class="form-field"><label for="setup-bio">Bio (optional)</label><input id="setup-bio" maxlength="240" placeholder="A little about you" value="${esc(state.bio)}"></div></div>`;
      if(step===2&&isNewProfile)body=`<div class="setup-step-copy"><div class="page-kicker">STEP 2 OF 2</div><h2>Profile ready</h2><p>Your new profile is separate from the others on this browser. You can update your profile details at any time.</p></div><div class="setup-review"><span class="setup-review-label">NEW PROFILE</span><strong>${esc(state.name||'Your profile')}</strong><small>Cursor colour and bio are saved locally.</small></div>`;
      if(step===2&&!isNewProfile)body=`<div class="setup-step-copy"><div class="page-kicker">STEP 2 OF ${total}</div><h2>Set up your workspace</h2><p>Choose a subtle accent and the navigation density you prefer. These choices can be changed at any time.</p></div><div class="setting-row setup-setting"><div class="setting-copy"><strong>Workspace accent</strong><small>Used for selection states, controls and highlights.</small></div><div class="swatches">${['#e9c96b','#c8a1a0','#9eafa0','#9aa9bd','#b3a0c2','#d69c6c','#8f9b6a'].map(color=>`<button type="button" class="swatch ${state.accent===color?'active':''}" style="background:${color}" data-setup-accent="${color}" aria-label="Select accent colour ${color}"></button>`).join('')}</div></div><div class="setting-row setup-setting"><div class="setting-copy"><strong>Navigation layout</strong><small>Choose comfortable labels or a compact sidebar.</small></div><select id="setup-compact" class="select-control"><option value="comfortable" ${!state.compact?'selected':''}>Comfortable</option><option value="compact" ${state.compact?'selected':''}>Compact</option></select></div><div class="setting-row setup-setting"><div class="setting-copy"><strong>Motion effects</strong><small>Keep interface transitions and animations enabled.</small></div><select id="setup-motion" class="select-control"><option value="full" ${!state.reduceMotion?'selected':''}>Enabled</option><option value="reduced" ${state.reduceMotion?'selected':''}>Reduced motion</option></select></div>`;
      if(step===3) {
        const choices=await storageChoices(state.unit);
        if(choices.length && !choices.includes(state.amount)){state.amount=choices.reduce((best,value)=>Math.abs(value-state.amount)<Math.abs(best-state.amount)?value:best,choices[0]);}
        body=`<div class="setup-step-copy"><div class="page-kicker">STEP 3 OF ${total}</div><h2>Choose your storage cap</h2><p>Flora uses a logical limit inside browser storage. It does not reserve disk space; the browser can impose a lower quota.</p></div><div class="storage-setup-grid"><div class="form-field"><label for="setup-unit">Storage unit</label><select id="setup-unit" class="select-control"><option value="KB" ${state.unit==='KB'?'selected':''}>Kilobytes (KB)</option><option value="MB" ${state.unit==='MB'?'selected':''}>Megabytes (MB)</option><option value="GB" ${state.unit==='GB'?'selected':''}>Gigabytes (GB)</option></select></div><div class="form-field"><label for="setup-amount">Capacity</label><select id="setup-amount" class="select-control" ${choices.length?'':'disabled'}>${choices.map(amount=>`<option value="${amount}" ${amount===state.amount?'selected':''}>${amount} ${state.unit}</option>`).join('')||`<option value="">No capacity available</option>`}</select></div></div><div class="setup-storage-note">Available choices follow powers of two: 16, 32, 64, 128 and onward, bounded by the browser quota estimate.</div>`;
      }
      if(step===4)body=`<div class="setup-step-copy"><div class="page-kicker">STEP 4 OF ${total}</div><h2>Your workspace is ready</h2><p>Review the local-first defaults before entering Flora.</p></div><div class="setup-review-grid"><div class="setup-review"><span class="setup-review-label">PROFILE</span><strong>${esc(state.name)}</strong><small>Cursor colour saved in your profile</small></div><div class="setup-review"><span class="setup-review-label">STORAGE CAP</span><strong>${state.amount} ${state.unit}</strong><small>Logical limit in this browser</small></div><div class="setup-review"><span class="setup-review-label">WORKSPACE</span><strong>${state.compact?'Compact':'Comfortable'} navigation</strong><small>${state.reduceMotion?'Reduced':'Full'} motion effects</small></div><div class="setup-review"><span class="setup-review-label">PRIVACY</span><strong>Stored locally</strong><small>No Flora account, analytics or cloud storage.</small></div></div><p class="setup-privacy-note">Your profile details can be updated at any time from the profile menu.</p>`;
      const progress=Array.from({length:total},(_,i)=>`<span class="setup-progress-segment ${i<step?'complete':''}"></span>`).join('');
      showModal(`<div class="setup-modal"><div class="setup-brand"><strong>flora</strong><span>LOCAL CREATIVE WORKSPACE</span></div><div class="setup-progress">${progress}</div>${body}<div class="setup-footer">${step>1?'<button type="button" class="btn btn-ghost" id="setup-back">Back</button>':'<span class="form-hint">You can change these choices later.</span>'}<button type="button" class="btn btn-primary" id="setup-next">${step===total?(isNewProfile?'Create profile':'Enter Flora'):'Continue'}</button></div></div>`, 'Flora setup', true);
      $('#setup-name')?.addEventListener('input',event=>state.name=event.target.value);
      $('#setup-bio')?.addEventListener('input',event=>state.bio=event.target.value);
      $('#setup-color')?.addEventListener('input',event=>state.color=event.target.value);
      $('#setup-compact')?.addEventListener('change',event=>state.compact=event.target.value==='compact');
      $('#setup-motion')?.addEventListener('change',event=>state.reduceMotion=event.target.value==='reduced');
      $('#setup-unit')?.addEventListener('change',async event=>{const previousBytes=bytesFor(state.unit,state.amount);state.unit=event.target.value;const multiplier=state.unit==='GB'?1024**3:state.unit==='MB'?1024**2:1024;const amount=$('#setup-amount');const values=await storageChoices(state.unit);amount.innerHTML=values.map(value=>`<option value="${value}">${value} ${state.unit}</option>`).join('')||'<option value="">No capacity available</option>';amount.disabled=!values.length;if(values.length){const target=previousBytes/multiplier;state.amount=values.reduce((best,value)=>Math.abs(value-target)<Math.abs(best-target)?value:best,values[0]);amount.value=String(state.amount);}});
      $('#setup-amount')?.addEventListener('change',event=>state.amount=Number(event.target.value));
      $$('[data-setup-accent]').forEach(button=>button.addEventListener('click',()=>{state.accent=button.dataset.setupAccent;render();}));
      $('#setup-back')?.addEventListener('click',()=>{step=Math.max(1,step-1);render();});
      $('#setup-next')?.addEventListener('click',async()=>{
        if(step===1&&!state.name.trim()){toast('Enter a display name to continue.','error');$('#setup-name')?.focus();return;}
        if(step===3&&!state.amount){toast('Choose a storage capacity to continue.','error');return;}
        if(step<total){step++;render();return;}
        const newProfile={id:uid(),name:state.name.trim(),pronouns:'',bio:state.bio.trim(),color:state.color,createdAt:now()};
        profiles.push(newProfile);await putRecord('profiles',newProfile);profile=newProfile;await setMeta('activeProfileId',profile.id);
        if(!isNewProfile){settings={...settings,accent:state.accent,compactMode:state.compact,reduceMotion:state.reduceMotion,storageUnit:state.unit,storageAmount:state.amount,storageLimitBytes:bytesFor(state.unit,state.amount)};await saveSettings();}
        closeModal();syncProfileHeader();setupChannel();updateStorageUI();setActiveView('home');toast(`Welcome to Flora, ${profile.name.split(' ')[0]}.`,'success');
      });
    };
    render();
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
    if(currentView==='home')return renderHome();
    if(currentView==='files')return renderFiles();
    if(currentView==='shared')return renderShared();
    if(currentView==='storage')return renderStorage();
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
    if(target.matches('[data-view]')){setActiveView(target.dataset.view);return;}
    if(target.matches('[data-app]')){setActiveView('app',target.dataset.app);return;}
    if(target.matches('[data-create]')){await createFile(target.dataset.create);return;}
    if(target.matches('[data-open]')){openFile(target.dataset.open);return;}
    if(target.matches('[data-export]')){const file=files.find(f=>f.id===target.dataset.export);if(file)showExportModal(file);return;}
    if(target.matches('[data-settings-tab]')){settingsTab=target.dataset.settingsTab;renderSettings();return;}
    if(target.matches('[data-setting-toggle]')){const key=target.dataset.settingToggle;settings[key]=!settings[key];await saveSettings();renderSettings();return;}
    if(target.matches('[data-accent]')){settings.accent=target.dataset.accent;await saveSettings();renderSettings();return;}
    if(target.matches('[data-format]')){const editor=$('#document-editor');editor?.focus();const command=target.dataset.format;if(command==='createLink'){const url=prompt('Enter a link URL');if(url)document.execCommand(command,false,url);}else document.execCommand(command,false,null);if(editor)scheduleSave('editing');return;}
    if(target.matches('[data-slide-index]')){slideIndex=Number(target.dataset.slideIndex);renderSlide();broadcastPresence('selecting');return;}
    if(target.matches('[data-action]')){
      const action=target.dataset.action;
      if(action==='import')showImportModal();
      if(action==='explore')setActiveView('tools');
      if(action==='new-file')showModal(`<h2>What would you like to make?</h2><p>Choose a Flora workspace.</p><div class="app-grid" style="grid-template-columns:repeat(2,1fr)">${appCard('doc','Azalea Docs','Write and format')}${appCard('sheet','Amaryllis Sheets','Tables and formulas')}${appCard('slides','Iris Presentations','Present your ideas')}${appCard('note','Anemone Notes','Quick thoughts')}${appCard('board','Dahlia Boards','Arrange ideas')}</div><div class="form-foot"><button class="btn btn-ghost" data-modal-close>Cancel</button></div>`, 'Create a file', true);
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
    if(target.matches('[data-focus-mode]')){focusMode=target.dataset.focusMode;focusRunning=false;clearInterval(focusTimer);focusSeconds=(focusMode==='focus'?25:5)*60;renderFocus();}
    if(target.matches('[data-focus-toggle]')){if(focusRunning){focusRunning=false;clearInterval(focusTimer);}else{focusRunning=true;focusTimer=setInterval(()=>{focusSeconds=Math.max(0,focusSeconds-1);const output=$('#focus-time');if(output)output.textContent=`${Math.floor(focusSeconds/60).toString().padStart(2,'0')}:${(focusSeconds%60).toString().padStart(2,'0')}`;if(focusSeconds===0){focusRunning=false;clearInterval(focusTimer);toast('Your session is complete. Take a breath.','success');renderFocus();}},1000);}renderFocus();}
    if(target.matches('[data-focus-reset]')){focusRunning=false;clearInterval(focusTimer);focusSeconds=(focusMode==='focus'?25:5)*60;renderFocus();}
    if(target.matches('[data-board-delete]')){activeFile.content=activeFile.content.filter(note=>note.id!==target.dataset.boardDelete);renderBoard();scheduleSave('deleting');}
  });

  document.addEventListener('input', event=>{
    const target=event.target;
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
    if(event.target.id==='file-filter'){
      const query=$('#file-search')?.value||'';const type=event.target.value;
      const visible=[...files].sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)).filter(f=>(f.name.toLowerCase().includes(query.toLowerCase())||fileInfo[f.type].label.toLowerCase().includes(query.toLowerCase()))&&(type==='all'||f.type===type));
      $('#file-list-region').innerHTML=visible.length?`<div class="file-grid">${visible.map(file=>`<div class="file-card"><div class="file-card-head">${fileIcon(file)}<button class="btn btn-ghost btn-small" data-menu-file="${file.id}">Options</button></div><div class="file-card-title">${esc(file.name)}</div><div class="file-card-meta">${fileInfo[file.type].short} · ${prettyDate(file.updatedAt)}</div><div class="file-card-actions"><button class="btn btn-secondary btn-small" data-open="${file.id}">Open</button><button class="btn btn-ghost btn-small" data-export="${file.id}">Export</button></div></div>`).join('')}</div>`:`<div class="panel"><div class="empty-state"><h3>No matching files</h3><p>Try another filter.</p></div></div>`;
    }
    if(event.target.matches('[data-task-toggle]')){const index=Number(event.target.dataset.taskToggle);if(window._floraTasks[index]){window._floraTasks[index].done=event.target.checked;await setMeta('tasks',window._floraTasks);renderTasks();}return;}
    if(event.target.id==='storage-unit'){await populateStorageAmount();}
    if(event.target.id==='storage-amount'||event.target.id==='storage-unit'){
      const unit=$('#storage-unit').value,amount=Number($('#storage-amount').value);
      if(!amount){toast(`16 ${unit} is above the browser quota estimate. Choose a smaller unit.`,'error');return;}
      settings.storageUnit=unit;settings.storageAmount=amount;settings.storageLimitBytes=amount*(unit==='GB'?1024**3:unit==='MB'?1024**2:1024);
      await saveSettings();toast(`Storage limit set to ${amount} ${unit}`,'success');
    }
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

  async function boot() {
    try { db=await openDB(); }
    catch(error) { dbFallback=true; try{localStorage.setItem('flora:fallback-check','1');localStorage.removeItem('flora:fallback-check');}catch{document.body.innerHTML='<main style="max-width:600px;margin:10vh auto;padding:30px;font:16px Georgia"><h1>Flora could not access local storage</h1><p>Please open Flora in a normal browser window, not private browsing, and allow site storage.</p></main>';return;} }
    await loadAll();
    window._floraTasks=await getMeta('tasks',[]);
    const activeId=await getMeta('activeProfileId',null);
    profile=profiles.find(item=>item.id===activeId)||profiles[0]||null;
    if(profile){await setMeta('activeProfileId',profile.id);syncProfileHeader();setupChannel();updateStorageUI();setActiveView('home');}
    else {showSetupModal(false);}
    if(dbFallback)toast('Using browser localStorage fallback. Large workspaces may be limited.');
  }
  boot().catch(error=>{console.error(error);toast('Flora could not start. Check browser storage permissions.','error');});
})();

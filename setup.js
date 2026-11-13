/* Flora setup — a full-screen, step-by-step first-run experience. Every look-and-feel choice previews live.
   Also used to add another profile and to “run setup again”. */
(function () {
  'use strict';
  const C = window.FloraCore;
  if (!C || !C.icon) return;
  const { esc, $, $$ } = C, E = window.FloraEncoding, P = window.FloraPresets;

  const COLORS = ['#b89a50', '#c18d7c', '#8da1a0', '#78886c', '#8b79a8', '#c58a4e', '#7b8fb5', '#a56d5c'];
  const ACCENTS = ['#e9c96b', '#c8a1a0', '#9eafa0', '#9aa9bd', '#b3a0c2', '#d69c6c', '#8f9b6a'];
  const STEP_LABELS = { welcome: 'Welcome', profile: 'About you', mode: 'How you’ll use it', look: 'Look and feel', encoding: 'Text and encoding', storage: 'Storage', finish: 'All set' };
  const SAMPLE = 'Café – naïve “quotes” – 你好 😀';
  let W = null;

  function stepsFor(opts) {
    if (opts.newProfile) return ['profile', 'finish'];
    if (opts.reconfigure) return ['mode', 'look', 'encoding', 'storage', 'finish'];
    return ['welcome', 'profile', 'mode', 'look', 'encoding', 'storage', 'finish'];
  }
  function open(opts = {}) {
    close(true);
    const s = C.settings, mode = P.byId(s.modeId);
    W = {
      opts, steps: stepsFor(opts), i: 0, dir: 1, busy: false,
      name: opts.reconfigure ? C.profile.name : '', pronouns: '', bio: '', color: COLORS[Math.floor(Math.random() * COLORS.length)],
      modeId: opts.reconfigure ? s.modeId : 'standard', seed: !opts.reconfigure,
      patch: { ...pick(s), ...(opts.reconfigure ? {} : { ...mode.patch }) },
      limit: { amount: s.storageAmount, unit: s.storageUnit }
    };
    const el = document.createElement('div'); el.id = 'setup-root'; el.className = 'setup-root'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Set up Flora');
    el.innerHTML = '<div class="setup-orbs" aria-hidden="true"><i></i><i></i><i></i></div><div class="setup-frame"><aside class="setup-rail" id="setup-rail"></aside><section class="setup-main"><div class="setup-stage" id="setup-stage"></div><footer class="setup-foot" id="setup-foot"></footer></section></div>';
    document.body.append(el); document.body.classList.add('setup-open');
    el.addEventListener('click', onClick); el.addEventListener('input', onInput); el.addEventListener('change', onChange); el.addEventListener('keydown', onKey);
    render();
  }
  const KEYS = ['theme', 'accent', 'textScale', 'fontFamily', 'animLevel', 'exportEncoding', 'asciiFallback', 'lineEndings', 'csvBom', 'backupReminderDays', 'importEncoding', 'compactMode', 'density', 'examLock', 'quietToasts', 'focusMinutes', 'breakMinutes', 'highContrast', 'bigTargets', 'readableSpacing', 'underlineLinks'];
  const pick = s => Object.fromEntries(KEYS.filter(k => k in s).map(k => [k, s[k]]));
  function close(silent) {
    const el = $('#setup-root'); if (!el) return;
    document.body.classList.remove('setup-open');
    if (silent || C.animOff()) el.remove(); else { el.classList.add('leaving'); setTimeout(() => el.remove(), 420); }
  }
  function cancel() { C.previewSettings({}); close(); W = null; }
  const preview = () => C.previewSettings({ ...W.patch, accent: W.patch.accent || C.settings.accent });
  const stepId = () => W.steps[W.i];

  /* ---------------------------------------------------------------- rendering */
  function render(animate = true) {
    const id = stepId(), stage = $('#setup-stage'), foot = $('#setup-foot'), rail = $('#setup-rail');
    rail.innerHTML = `<div class="setup-brand">flora<span>.</span></div><ol class="setup-steps">${W.steps.map((s, i) => `<li class="${i === W.i ? 'current' : i < W.i ? 'done' : ''}"><span class="dot">${i < W.i ? '✓' : i + 1}</span><span>${STEP_LABELS[s]}</span></li>`).join('')}</ol><div class="setup-rail-note">Everything here can be changed later in Settings.</div>`;
    stage.innerHTML = `<div class="setup-step ${animate ? (W.dir > 0 ? 'enter-fwd' : 'enter-back') : ''}" data-step="${id}">${STEPS[id]()}</div>`;
    const first = W.i === 0, last = id === 'finish';
    foot.innerHTML = last ? '' : `<div class="setup-progress"><span style="width:${(W.i) / (W.steps.length - 1) * 100}%"></span></div><div class="setup-foot-row">${first ? (W.opts.newProfile || W.opts.reconfigure ? '<button class="btn btn-ghost" data-s="cancel">Cancel</button>' : '<span></span>') : '<button class="btn btn-ghost" data-s="back">Back</button>'}<div class="setup-foot-right">${W.i >= 3 && !W.opts.newProfile && W.steps.includes('finish') && id !== 'storage' ? '<button class="btn btn-ghost" data-s="skip">Use defaults and finish</button>' : ''}<button class="btn btn-primary" id="setup-next" data-s="next">${id === 'welcome' ? 'Get started' : id === 'storage' || (W.opts.newProfile && id === 'profile') ? (W.opts.newProfile ? 'Create profile' : 'Finish setup') : 'Continue'}</button></div></div>`;
    if (id === 'finish') runFinish();
    const focusEl = $('#setup-name') || $('.setup-step .focus-first'); if (focusEl && animate) setTimeout(() => focusEl.focus({ preventScroll: true }), 120);
  }

  const chip = (attr, value, label, current) => `<button class="choice-chip ${String(current) === String(value) ? 'active' : ''}" ${attr}="${esc(value)}">${esc(label)}</button>`;
  const STEPS = {
    welcome: () => `<div class="welcome-screen"><div class="welcome-mark" aria-label="flora">${'flora'.split('').map((ch, i) => `<span style="--i:${i}">${ch}</span>`).join('')}<span class="dot" style="--i:5">.</span></div><h1>A calm place to make things.</h1><p>Documents, spreadsheets, slides, study tools and more. Everything is saved on this device and works without a connection.</p><div class="welcome-chips"><span>Works offline</span><span>No account needed</span><span>Made for school, work and play</span></div></div>`,

    profile: () => `<h1 class="setup-title">${W.opts.newProfile ? 'Add a profile' : 'First, what should we call you?'}</h1><p class="setup-sub">Your name appears on Home and next to your edits when you share files. It is stored only in this browser.</p>
      <div class="setup-profile"><span class="avatar big setup-avatar" id="setup-avatar" style="--avatar-color:${esc(W.color)}">${esc((W.name.trim()[0] || 'F').toUpperCase())}</span><div class="setup-fields">
      <div class="form-field"><label for="setup-name">Your name</label><input id="setup-name" class="text-input" value="${esc(W.name)}" maxlength="40" placeholder="Alex Morgan" autocomplete="name"></div>
      <div class="form-field"><label for="setup-pronouns">Pronouns <small>(optional)</small></label><input id="setup-pronouns" class="text-input" value="${esc(W.pronouns)}" maxlength="24" placeholder="they/them"></div>
      <div class="form-field"><label for="setup-bio">A line about you <small>(optional)</small></label><input id="setup-bio" class="text-input" value="${esc(W.bio)}" maxlength="90" placeholder="Student, sketcher, tea drinker"></div>
      <div class="form-field"><label>Your colour</label><div class="swatches">${COLORS.map(c => `<button class="swatch ${c === W.color ? 'active' : ''}" style="background:${c}" data-color="${c}" aria-label="Colour ${c}"></button>`).join('')}</div></div></div></div>`,

    mode: () => `<h1 class="setup-title">How will you use Flora?</h1><p class="setup-sub">A mode sets up your sidebar, text size, focus timers and starter files. Pick the closest fit. You can switch any time.</p>
      <div class="setup-modes">${P.GROUPS.map(g => `<div class="mode-group"><h4>${g.label}</h4><div class="mode-list tight">${P.MODES.filter(m => m.group === g.id).map(m => `<button class="mode-card ${m.id === W.modeId ? 'active' : ''}" data-s-mode="${m.id}"><span class="mode-radio"></span><span class="mode-copy"><strong>${esc(m.name)}</strong><em>${esc(m.tag)}</em><small>${esc(m.blurb)}</small></span></button>`).join('')}</div></div>`).join('')}</div>
      ${seedBlock()}`,

    look: () => `<h1 class="setup-title">Make it feel right</h1><p class="setup-sub">Changes apply straight away, so you can see what you are choosing.</p>
      <div class="setup-block"><h4>Theme</h4><div class="theme-tiles">${[['light', 'Light'], ['dark', 'Dark'], ['paper', 'Paper'], ['auto', 'Match system']].map(([v, l]) => `<button class="theme-tile ${W.patch.theme === v ? 'active' : ''}" data-s-theme="${v}"><span class="tt-prev tt-${v}"><i></i><i></i><i></i></span><strong>${l}</strong></button>`).join('')}</div></div>
      <div class="setup-block"><h4>Accent colour</h4><div class="swatches">${ACCENTS.map(c => `<button class="swatch ${String(W.patch.accent || C.settings.accent).toLowerCase() === c ? 'active' : ''}" style="background:${c}" data-s-accent="${c}" aria-label="Accent ${c}"></button>`).join('')}</div></div>
      <div class="setup-block"><h4>Text size <span class="out" id="s-scale-out">${W.patch.textScale}%</span></h4><input type="range" class="a-range" id="s-scale" min="80" max="150" step="5" value="${W.patch.textScale}" aria-label="Text size"><p class="setup-sample">The quick brown fox jumps over the lazy dog.</p></div>
      <div class="setup-block"><h4>Font</h4><div class="chip-row">${[['serif', 'Newsreader'], ['sans', 'Clean sans'], ['mono', 'Monospace'], ['readable', 'Easy reading']].map(([v, l]) => chip('data-s-font', v, l, W.patch.fontFamily)).join('')}</div></div>
      <div class="setup-block"><h4>Animation</h4><div class="chip-row">${[['full', 'Full'], ['gentle', 'Gentle'], ['off', 'Off']].map(([v, l]) => chip('data-s-anim', v, l, W.patch.animLevel)).join('')}</div></div>`,

    encoding: () => `<h1 class="setup-title">How should your text be saved?</h1><p class="setup-sub">When you export text, HTML, CSV or code, Flora writes it in this encoding. <strong>UTF-8</strong> handles every language and emoji, so it is the right choice unless another program needs something older.</p>
      <div class="setup-block"><div class="enc-cards">${E.LIST.map(i => `<button class="enc-card ${W.patch.exportEncoding === i.id ? 'active' : ''}" data-s-enc="${i.id}"><span class="mode-radio"></span><span><strong>${esc(i.label)}${i.id === 'utf-8' ? ' <em class="badge">Recommended</em>' : ''}</strong><small>${esc(i.note)}</small></span></button>`).join('')}</div></div>
      <div class="setup-block" id="enc-extra" ${['ascii', 'iso-8859-1', 'windows-1252'].includes(W.patch.exportEncoding) ? '' : 'hidden'}><h4>If a character does not fit</h4><div class="chip-row">${[['transliterate', 'Simplify (é to e)'], ['replace', 'Replace with ?'], ['escape', 'Escape code']].map(([v, l]) => chip('data-s-fallback', v, l, W.patch.asciiFallback)).join('')}</div></div>
      <div class="setup-block"><h4>Line endings</h4><div class="chip-row">${[['keep', 'Keep as written'], ['lf', 'LF (Mac, Linux, web)'], ['crlf', 'CRLF (Windows)']].map(([v, l]) => chip('data-s-lines', v, l, W.patch.lineEndings)).join('')}</div></div>
      <div class="enc-live" id="enc-live">${encLive()}</div>`,

    storage: () => `<h1 class="setup-title">Set aside some room</h1><p class="setup-sub">Flora stores everything in this browser. Choose how much it may use. You can change this later and see exactly what takes space in Settings › Storage.</p>
      <div class="setup-block"><h4>Storage limit</h4><div class="chip-row">${[['64', 'MB', '64 MB'], ['256', 'MB', '256 MB'], ['1', 'GB', '1 GB'], ['4', 'GB', '4 GB']].map(([a, u, l]) => `<button class="choice-chip ${String(W.limit.amount) === a && W.limit.unit === u ? 'active' : ''}" data-s-limit="${a}:${u}">${l}</button>`).join('')}</div><p class="small-print">Currently ${W.limit.amount} ${W.limit.unit}. Your browser’s own allowance is the ceiling.</p></div>
      <div class="setup-block"><h4>Protect against automatic clearing</h4><p class="small-print" style="margin:0 0 8px">Browsers may clear site data when a device runs low on space. Asking for protection helps keep your files.</p><div class="persist-row"><button class="btn btn-secondary" data-s="persist" id="s-persist">Keep my data</button><span class="small-print" id="s-persist-status"></span></div></div>
      <div class="setup-block"><h4>Backup reminders</h4><div class="chip-row">${[[0, 'Never'], [7, 'Weekly'], [30, 'Monthly']].map(([v, l]) => chip('data-s-backup', v, l, W.patch.backupReminderDays ?? 0)).join('')}</div></div>`,

    finish: () => {
      const m = P.byId(W.modeId), items = W.opts.newProfile ? ['Creating your profile', 'Switching to it'] : [...(W.opts.reconfigure ? [] : ['Creating your profile']), `Applying ${m.name}`, ...(W.seed && P.seedLabels(m.id, { uid: C.uid }).length ? ['Adding starter files'] : []), 'Setting up storage', 'Getting everything ready'];
      return `<div class="finish-screen"><div class="finish-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="track" cx="60" cy="60" r="54"/><circle class="bar" id="finish-bar" cx="60" cy="60" r="54"/></svg><span class="finish-check" id="finish-check">✓</span></div><h1 id="finish-title" class="setup-title">Setting things up…</h1><ul class="finish-list" id="finish-list">${items.map((t, i) => `<li data-fi="${i}" style="--i:${i}"><span class="tick"></span>${esc(t)}</li>`).join('')}</ul><div id="finish-actions"></div></div>`;
    }
  };
  function seedBlock() {
    const names = P.seedLabels(W.modeId, { uid: C.uid });
    return `<div class="setup-block seed-block">${names.length ? `<label class="check-row"><input type="checkbox" id="s-seed" ${W.seed ? 'checked' : ''}><span>Add starter files: ${esc(names.join(', '))}</span></label>` : '<p class="small-print">This mode starts with a clean workspace.</p>'}</div>`;
  }
  function encLive() {
    const r = E.encode(SAMPLE, W.patch.exportEncoding, { unsupported: W.patch.asciiFallback, lineEndings: W.patch.lineEndings }), back = E.decode(r.bytes, W.patch.exportEncoding).text;
    return `<small>Try it: “${esc(SAMPLE)}” saved as ${esc(E.info(W.patch.exportEncoding).short)} (${r.bytes.length} bytes) reads back as</small><div class="enc-sample ${r.count ? 'lossy' : ''}">${esc(back)}</div>`;
  }

  /* ---------------------------------------------------------------- events */
  function onInput(e) {
    if (!W) return;
    if (e.target.id === 'setup-name') { W.name = e.target.value; $('#setup-avatar').textContent = (W.name.trim()[0] || 'F').toUpperCase(); e.target.classList.remove('invalid'); }
    if (e.target.id === 'setup-pronouns') W.pronouns = e.target.value;
    if (e.target.id === 'setup-bio') W.bio = e.target.value;
    if (e.target.id === 's-scale') { W.patch.textScale = Number(e.target.value); $('#s-scale-out').textContent = W.patch.textScale + '%'; preview(); }
  }
  function onChange(e) { if (e.target.id === 's-seed') W.seed = e.target.checked; }
  function onKey(e) {
    if (!W) return;
    if (e.key === 'Enter' && e.target.matches('input[type=text],input:not([type])')) { e.preventDefault(); next(); }
    if (e.key === 'Escape' && (W.opts.newProfile || W.opts.reconfigure)) cancel();
  }
  async function onClick(e) {
    if (!W) return;
    const t = e.target.closest('button'); if (!t) return;
    const d = t.dataset;
    if (d.s === 'next') return next();
    if (d.s === 'back') { W.dir = -1; W.i = Math.max(0, W.i - 1); return render(); }
    if (d.s === 'cancel') return cancel();
    if (d.s === 'skip') { W.dir = 1; W.i = W.steps.length - 1; return render(); }
    if (d.s === 'persist') { const ok = await C.requestPersist(); $('#s-persist-status').textContent = ok ? 'Protected. Thank you.' : 'Your browser did not grant it. That is fine.'; return; }
    if (d.color) { W.color = d.color; $$('[data-color]').forEach(b => b.classList.toggle('active', b === t)); $('#setup-avatar').style.setProperty('--avatar-color', W.color); return; }
    if (d.sMode) { W.modeId = d.sMode; const m = P.byId(d.sMode); W.patch = { ...W.patch, ...m.patch }; W.seed = true; $$('[data-s-mode]').forEach(b => b.classList.toggle('active', b === t)); $('.seed-block').outerHTML = seedBlock(); preview(); return; }
    if (d.sTheme) { W.patch.theme = d.sTheme; $$('[data-s-theme]').forEach(b => b.classList.toggle('active', b === t)); preview(); return; }
    if (d.sAccent) { W.patch.accent = d.sAccent; $$('[data-s-accent]').forEach(b => b.classList.toggle('active', b === t)); preview(); return; }
    if (d.sFont) { W.patch.fontFamily = d.sFont; $$('[data-s-font]').forEach(b => b.classList.toggle('active', b === t)); preview(); return; }
    if (d.sAnim) { W.patch.animLevel = d.sAnim; $$('[data-s-anim]').forEach(b => b.classList.toggle('active', b === t)); preview(); return; }
    if (d.sEnc) { W.patch.exportEncoding = d.sEnc; $$('[data-s-enc]').forEach(b => b.classList.toggle('active', b === t)); $('#enc-extra').hidden = !['ascii', 'iso-8859-1', 'windows-1252'].includes(d.sEnc); $('#enc-live').innerHTML = encLive(); return; }
    if (d.sFallback) { W.patch.asciiFallback = d.sFallback; $$('[data-s-fallback]').forEach(b => b.classList.toggle('active', b === t)); $('#enc-live').innerHTML = encLive(); return; }
    if (d.sLines) { W.patch.lineEndings = d.sLines; $$('[data-s-lines]').forEach(b => b.classList.toggle('active', b === t)); $('#enc-live').innerHTML = encLive(); return; }
    if (d.sLimit) { const [a, u] = d.sLimit.split(':'); W.limit = { amount: Number(a), unit: u }; $$('[data-s-limit]').forEach(b => b.classList.toggle('active', b === t)); $('.setup-step .small-print').textContent = `Currently ${a} ${u}. Your browser’s own allowance is the ceiling.`; return; }
    if (d.sBackup !== undefined) { W.patch.backupReminderDays = Number(d.sBackup); $$('[data-s-backup]').forEach(b => b.classList.toggle('active', b === t)); }
  }
  function next() {
    if (W.busy) return;
    if (stepId() === 'profile' && !W.name.trim()) { const el = $('#setup-name'); el.classList.add('invalid'); el.focus(); C.toast('Please enter your name to continue.', 'error'); return; }
    W.dir = 1; W.i++; render();
  }

  /* ---------------------------------------------------------------- finishing */
  async function runFinish() {
    W.busy = true;
    const items = $$('#finish-list li'), bar = $('#finish-bar'), circ = 2 * Math.PI * 54, fast = C.animOff();
    bar.style.strokeDasharray = circ; bar.style.strokeDashoffset = circ;
    const mult = { MB: 1024 ** 2, GB: 1024 ** 3, KB: 1024 }[W.limit.unit];
    const patch = { ...W.patch, storageAmount: W.limit.amount, storageUnit: W.limit.unit, storageLimitBytes: W.limit.amount * mult };
    const work = C.finishSetup(W.opts.reconfigure
      ? { settings: patch, modeId: W.modeId, seed: W.seed }
      : W.opts.newProfile ? { profile: { name: W.name, pronouns: W.pronouns, bio: W.bio, color: W.color }, newProfile: true }
        : { profile: { name: W.name, pronouns: W.pronouns, bio: W.bio, color: W.color }, settings: patch, modeId: W.modeId, seed: W.seed });
    const pause = ms => new Promise(r => setTimeout(r, fast ? 0 : ms));
    for (let i = 0; i < items.length; i++) {
      items[i].classList.add('active'); await pause(420); items[i].classList.remove('active'); items[i].classList.add('done');
      bar.style.strokeDashoffset = circ * (1 - (i + 1) / items.length);
    }
    await work;
    $('#finish-check').classList.add('show'); $('#finish-title').textContent = W.opts.newProfile ? `Welcome, ${W.name.split(' ')[0]}.` : W.opts.reconfigure ? 'Your setup is updated.' : `You’re all set, ${W.name.trim().split(' ')[0]}.`;
    $('#finish-actions').innerHTML = '<button class="btn btn-primary btn-large" id="finish-enter">Enter Flora</button>';
    $('#finish-enter').addEventListener('click', () => { W = null; close(); });
    $('#finish-enter').focus();
  }

  C.setup = { open };
})();

/* Flora settings — an Android 13 style settings app: a big title, a search pill, a list of sections,
   and drill-down pages with back arrows. Rows are described as data so search, rendering and syncing share one source. */
(function () {
  'use strict';
  const C = window.FloraCore;
  if (!C) return;
  const { esc, $, $$ } = C;
  const E = window.FloraEncoding, P = window.FloraPresets;

  /* ---------------------------------------------------------------- icons (24px monoline) */
  const ICONS = {
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>', chevron: '<path d="M9 6l6 6-6 6"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    profile: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.6-3.6 3.4-5.5 7-5.5s6.4 1.9 7 5.5"/>',
    modes: '<path d="M12 4l8 4.5-8 4.5-8-4.5z"/><path d="M4 12.5l8 4.5 8-4.5"/><path d="M4 16.5l8 4.5 8-4.5"/>',
    appearance: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 010 16z" fill="currentColor"/>',
    motion: '<path d="M3 12c2.5-6 4.5-6 6 0s3.5 6 6 0 4.5-6 6 0"/>',
    encoding: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 5l-3 14"/>',
    files: '<path d="M3.5 7.5a2 2 0 012-2h4l2 2.2h7a2 2 0 012 2V17.5a2 2 0 01-2 2h-13a2 2 0 01-2-2z"/>',
    storage: '<rect x="3.5" y="5" width="17" height="6" rx="2"/><rect x="3.5" y="13" width="17" height="6" rx="2"/><path d="M7 8h.01M7 16h.01"/>',
    focus: '<path d="M6 16.5V11a6 6 0 0112 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 004 0"/>',
    access: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="7.8" r="1.2"/><path d="M7.5 10.5l4.5.8 4.5-.8M12 11.3v3.2M9.8 18l2.2-3.5 2.2 3.5"/>',
    privacy: '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8.2 10.5V8a3.8 3.8 0 017.6 0v2.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.01"/>',
    system: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M12 8v6m-2.5-2.5L12 14l2.5-2.5"/>',
    doc: '<path d="M7 3.5h7l4 4V19a1.5 1.5 0 01-1.5 1.5h-9.5A1.5 1.5 0 015.5 19V5A1.5 1.5 0 017 3.5z"/><path d="M13.5 3.5V8H18M8.5 12h7M8.5 15.5h7"/>',
    sheet: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M4 15h16M10 4v16"/>',
    slides: '<rect x="3.5" y="5" width="17" height="11" rx="1.8"/><path d="M12 16v4M8 20h8"/>',
    note: '<path d="M5 4.5h14v11l-4.5 4.5H5z"/><path d="M14.5 20v-4.5H19M8.5 9h7M8.5 12.5h4"/>',
    board: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="5" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="11" width="7" height="9" rx="1.5"/>',
    code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/>', sketch: '<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>',
    cards: '<rect x="3.5" y="7" width="13" height="10" rx="2"/><path d="M7.5 7V5.5A1.5 1.5 0 019 4h10.5A1.5 1.5 0 0121 5.5V14a1.5 1.5 0 01-1.5 1.5H16.5"/>',
    kanban: '<rect x="4" y="4" width="4.5" height="16" rx="1.2"/><rect x="10" y="4" width="4.5" height="10" rx="1.2"/><rect x="16" y="4" width="4" height="13" rx="1.2"/>',
    journal: '<path d="M6 4.5h11.5V19H7.5A1.5 1.5 0 016 17.5z"/><path d="M6 17.5A1.5 1.5 0 007.5 19M9.5 8.5h5.5"/>',
    tools: '<path d="M14.5 6.5a4 4 0 01-5 5L4.5 16.5l3 3 5-5a4 4 0 005-5l-2.5 2.5-2.5-.5-.5-2.5z"/>',
    free: '<rect x="4" y="4" width="7" height="7" rx="1.6" fill="currentColor" opacity=".9"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6" fill="currentColor" opacity=".5"/>'
  };
  const icon = (name, size = 24) => `<svg class="ico" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.info}</svg>`;
  C.icon = icon;

  /* ---------------------------------------------------------------- option lists */
  const OPT = {
    theme: [{ v: 'light', label: 'Light', desc: 'Flora’s warm cream and gold.' }, { v: 'dark', label: 'Dark', desc: 'Low light, easy on the eyes at night.' }, { v: 'paper', label: 'Paper', desc: 'A warmer, sepia-toned light theme.' }, { v: 'auto', label: 'Match system', desc: 'Light or dark, following your device.' }],
    fontFamily: [{ v: 'serif', label: 'Newsreader', desc: 'Flora’s serif look. Falls back to Georgia.' }, { v: 'sans', label: 'Clean sans', desc: 'Your device’s standard interface font.' }, { v: 'mono', label: 'Monospace', desc: 'Fixed-width letters throughout.' }, { v: 'readable', label: 'Easy reading', desc: 'Verdana-style letters that are hard to confuse.' }],
    density: [{ v: 'comfortable', label: 'Comfortable' }, { v: 'compact', label: 'Compact', desc: 'Tighter rows so more fits on screen.' }],
    defaultView: [{ v: 'home', label: 'Home' }, { v: 'files', label: 'My files' }, { v: 'tools', label: 'Tools' }],
    animLevel: [{ v: 'full', label: 'Full', desc: 'Entrances, ripples, counting numbers and springy switches.' }, { v: 'gentle', label: 'Gentle', desc: 'Soft fades only. No movement.' }, { v: 'off', label: 'Off', desc: 'Nothing animates.' }],
    pageTransition: [{ v: 'rise', label: 'Rise', desc: 'Pages float up into place.' }, { v: 'fade', label: 'Fade' }, { v: 'slide', label: 'Slide', desc: 'Pages slide in from the right.' }, { v: 'zoom', label: 'Zoom', desc: 'Pages grow from slightly smaller.' }, { v: 'none', label: 'None' }],
    exportEncoding: E.LIST.map(item => ({ v: item.id, label: item.label, desc: item.note })),
    importEncoding: [{ v: 'auto', label: 'Detect automatically', desc: 'Uses a byte-order mark or checks for valid UTF-8, otherwise Windows-1252.' }, ...E.LIST.filter(i => i.id !== 'utf-8-bom').map(item => ({ v: item.id, label: item.label }))],
    asciiFallback: [{ v: 'transliterate', label: 'Simplify', desc: 'é becomes e, “quotes” become "quotes", ß becomes ss.' }, { v: 'replace', label: 'Replace with “?”', desc: 'Every character that does not fit becomes a question mark.' }, { v: 'escape', label: 'Escape code', desc: 'Written as \\u00E9 (or &#xE9; in HTML) so nothing is lost.' }],
    lineEndings: [{ v: 'keep', label: 'Keep as written' }, { v: 'lf', label: 'LF', desc: 'Mac, Linux and the web.' }, { v: 'crlf', label: 'CRLF', desc: 'Windows and Notepad.' }],
    autosaveDelay: [{ v: 300, label: 'Quick (0.3 seconds)' }, { v: 450, label: 'Normal (0.45 seconds)' }, { v: 1500, label: 'Relaxed (1.5 seconds)' }, { v: 3000, label: 'Slow (3 seconds)' }],
    sortFiles: [{ v: 'recent', label: 'Recently edited' }, { v: 'name', label: 'Name' }, { v: 'size', label: 'Size, largest first' }, { v: 'type', label: 'Type' }],
    devSmooth: [{ v: 'auto', label: 'Automatic' }, { v: 'antialiased', label: 'Grayscale', desc: 'Thinner, lighter letters on macOS and iOS.' }, { v: 'subpixel', label: 'Subpixel', desc: 'Uses coloured edges for sharper letters where supported.' }],
    devRender: [{ v: 'auto', label: 'Automatic' }, { v: 'optimizeSpeed', label: 'Optimise speed', desc: 'Skips kerning and ligatures for faster drawing.' }, { v: 'optimizeLegibility', label: 'Optimise legibility', desc: 'Kerning and ligatures always on.' }, { v: 'geometricPrecision', label: 'Geometric precision', desc: 'Accurate sizes that scale smoothly.' }],
    devStroke: [{ v: '0px', label: 'Off' }, { v: '0.15px', label: 'Light' }, { v: '0.3px', label: 'Medium' }, { v: '0.5px', label: 'Strong' }],
    devDir: [{ v: 'auto', label: 'Follow the language' }, { v: 'ltr', label: 'Left to right' }, { v: 'rtl', label: 'Right to left', desc: 'Mirrors the whole interface. Useful for testing layouts.' }],
    devLineHeight: [{ v: 0, label: 'Default' }, { v: 1.2, label: 'Tight (1.2)' }, { v: 1.4, label: 'Snug (1.4)' }, { v: 1.6, label: 'Relaxed (1.6)' }, { v: 1.8, label: 'Loose (1.8)' }, { v: 2.1, label: 'Very loose (2.1)' }],
    devAnimScale: [{ v: 0, label: 'Animations off' }, { v: 0.5, label: 'Twice as fast (0.5×)' }, { v: 1, label: 'Normal (1×)' }, { v: 2, label: 'Slower (2×)' }, { v: 5, label: 'Much slower (5×)' }, { v: 10, label: 'Slow motion (10×)', desc: 'Handy for inspecting transitions.' }],
    backupReminderDays: [{ v: 0, label: 'Never' }, { v: 7, label: 'Every week' }, { v: 14, label: 'Every two weeks' }, { v: 30, label: 'Every month' }]
  };
  const optLabel = (key, value) => (OPT[key].find(o => String(o.v) === String(value)) || {}).label || String(value);
  const ACCENTS = ['#e9c96b', '#c8a1a0', '#9eafa0', '#9aa9bd', '#b3a0c2', '#d69c6c', '#8f9b6a'];
  const on = v => (v ? 'On' : 'Off');

  /* ---------------------------------------------------------------- pages: rows are data */
  const sampleText = 'Café – naïve “quotes” – 你好 😀';
  const PAGES = [
    { id: 'profile', icon: 'profile', title: 'Profile', summary: () => `${C.profile?.name || 'You'} · ${C.profiles.length} on this browser`, rows: [
      { t: 'custom', kw: 'name colour avatar', render: () => `<div class="profile-hero"><span class="avatar big" style="--avatar-color:${esc(C.profile.color)}">${esc(C.profile.name.slice(0, 1).toUpperCase())}</span><div><strong>${esc(C.profile.name)}</strong><small>${esc(C.profile.pronouns || 'Local profile')}${C.profile.bio ? ' · ' + esc(C.profile.bio.slice(0, 80)) : ''}</small></div></div>` },
      { t: 'action', title: 'Edit profile', desc: 'Name, pronouns, bio and your cursor colour.', btn: 'Edit', run: () => C.showProfileEditor() },
      { t: 'action', title: 'Switch or add a profile', desc: 'Profiles are separate labels on this browser. They are not password protected.', btn: 'Open', run: () => $('#profile-switcher').click() }
    ] },
    { id: 'modes', icon: 'modes', title: 'Modes and presets', summary: () => P.byId(C.settings.modeId).name + (C.settings.examLock ? ' · exam lock on' : ''), rows: [{ t: 'custom', kw: 'school exam university work writer creative developer minimal easy reading preset junior secondary', render: () => modesHTML() }] },
    { id: 'appearance', icon: 'appearance', title: 'Appearance', summary: () => `${optLabel('theme', C.settings.theme)} · ${optLabel('fontFamily', C.settings.fontFamily)} · ${C.settings.textScale}%`, rows: [
      { t: 'custom', kw: 'preview', render: () => `<div class="appearance-preview"><div class="ap-card"><div class="ap-bar"><i></i><i></i><i></i></div><strong>Good to see you.</strong><span>This is how Flora looks with your choices.</span><button class="btn btn-primary btn-small" tabindex="-1">Primary</button></div></div>` },
      { t: 'toggle', key: 'androidUI', title: 'Android 13 style interface', desc: 'Large titles, tinted rounded cards and pill buttons everywhere. Turn off for classic Flora.', kw: 'material you rounded classic prototype' },
      { t: 'choice', key: 'theme', title: 'Theme', kw: 'dark light paper night mode' },
      { t: 'swatch', key: 'accent', title: 'Accent colour', desc: 'Buttons, switches and highlights.', kw: 'color colour' },
      { t: 'choice', key: 'fontFamily', title: 'Font', kw: 'typeface serif sans mono' },
      { t: 'range', key: 'textScale', title: 'Text and interface size', desc: 'Scales everything on screen.', min: 80, max: 150, step: 5, fmt: v => v + '%', kw: 'zoom large small' },
      { t: 'choice', key: 'density', title: 'Density', kw: 'compact spacing' },
      { t: 'toggle', key: 'compactMode', title: 'Compact sidebar', desc: 'A narrow rail that gives editors more room.' },
      { t: 'choice', key: 'defaultView', title: 'Start page', desc: 'What opens when Flora starts.' },
      { t: 'toggle', key: 'showHomeHero', title: 'Home banner', desc: 'The large welcome card on Home.' },
      { t: 'toggle', key: 'showToday', title: 'Today cards', desc: 'Timetable, countdown and task summaries on Home.' },
      { t: 'toggle', key: 'showHomeStats', title: 'File counts on Home', desc: 'Three small totals under the banner.' }
    ] },
    { id: 'motion', icon: 'motion', title: 'Motion and animations', summary: () => `${optLabel('animLevel', C.settings.animLevel)} · ${optLabel('pageTransition', C.settings.pageTransition)}`, rows: [
      { t: 'choice', key: 'animLevel', title: 'Animation level', kw: 'reduce motion off' },
      { t: 'range', key: 'animSpeed', title: 'Animation speed', desc: 'Lower is slower and gentler.', min: .5, max: 2, step: .25, fmt: v => v + '×' },
      { t: 'choice', key: 'pageTransition', title: 'Page transition', desc: 'How a new page arrives.' },
      { t: 'toggle', key: 'startupAnim', title: 'Startup animation', desc: 'A short flora. reveal when Flora opens.' },
      { t: 'toggle', key: 'ripple', title: 'Touch ripples', desc: 'A soft wave where you press a button or row.' },
      { t: 'toggle', key: 'countUp', title: 'Counting numbers', desc: 'Totals count up on the storage page and study results.' },
      { t: 'action', title: 'Preview the animations', desc: 'Replays the page transition and a notification.', btn: 'Play', run: () => { C.playViewEnter(); C.toast('This is how notifications arrive.', 'success'); } }
    ] },
    { id: 'encoding', icon: 'encoding', title: 'Text and encoding', summary: () => `${E.info(C.settings.exportEncoding).short} · ${optLabel('lineEndings', C.settings.lineEndings)}`, rows: [
      { t: 'custom', kw: 'preview utf ascii bytes', render: () => encodingPreviewHTML() },
      { t: 'choice', key: 'exportEncoding', title: 'Export encoding', desc: 'Used for text, HTML, CSV, JSON, Markdown and code exports.', kw: 'utf-8 utf-16 ascii latin windows unicode bom' },
      { t: 'choice', key: 'asciiFallback', title: 'When a character does not fit', desc: 'Applies to ASCII, Latin-1 and Windows-1252.', kw: 'unsupported lossy replace transliterate escape' },
      { t: 'choice', key: 'lineEndings', title: 'Line endings', kw: 'newline crlf lf windows' },
      { t: 'toggle', key: 'csvBom', title: 'Excel-friendly CSV', desc: 'Adds a UTF-8 byte-order mark to CSV exports so Excel shows accents correctly.' },
      { t: 'choice', key: 'importEncoding', title: 'Import encoding', desc: 'How text files are read when you import them.', kw: 'detect read open' },
      { t: 'info', title: 'Always UTF-8', desc: 'Word, Excel and PowerPoint exports, images and full backups always use UTF-8, so nothing is ever lost.' },
      { t: 'action', title: 'Open the Text Encoding Lab', desc: 'Compare sizes and see raw bytes for any text.', btn: 'Open', run: () => C.setActiveView('encoding') }
    ] },
    { id: 'files', icon: 'files', title: 'Files and editing', summary: () => `Autosave ${on(C.settings.autosave).toLowerCase()} · ${optLabel('sortFiles', C.settings.sortFiles)}`, rows: [
      { t: 'toggle', key: 'autosave', title: 'Automatic saving', desc: 'Save as you type. Ctrl+S always saves.' },
      { t: 'choice', key: 'autosaveDelay', title: 'Save delay', desc: 'How long Flora waits after you stop typing.' },
      { t: 'toggle', key: 'confirmDelete', title: 'Confirm before deleting', desc: 'Ask before removing a file from this device.' },
      { t: 'toggle', key: 'spellcheck', title: 'Spellcheck', desc: 'Use your browser’s spellcheck in writing areas.' },
      { t: 'choice', key: 'sortFiles', title: 'Sort My files by' }
    ] },
    { id: 'focus', icon: 'focus', title: 'Focus and notifications', summary: () => `${C.settings.focusMinutes} min focus · ${C.settings.breakMinutes} min break`, rows: [
      { t: 'range', key: 'focusMinutes', title: 'Focus session', desc: 'Length of a Camellia Focus session.', min: 5, max: 120, step: 5, fmt: v => v + ' min' },
      { t: 'range', key: 'breakMinutes', title: 'Break', min: 1, max: 30, step: 1, fmt: v => v + ' min' },
      { t: 'toggle', key: 'soundOn', title: 'Chime when a session ends' },
      { t: 'action', title: 'Play the chime', btn: 'Play', run: () => C.chime() },
      { t: 'toggle', key: 'quietToasts', title: 'Quiet mode', desc: 'Hide notifications except errors, and silence the chime.' },
      { t: 'range', key: 'toastSeconds', title: 'Notification time', desc: 'How long messages stay on screen.', min: 2, max: 10, step: .5, fmt: v => v + ' s' }
    ] },
    { id: 'access', icon: 'access', title: 'Accessibility', summary: () => [C.settings.highContrast && 'High contrast', C.settings.reduceMotion && 'Reduced motion', C.settings.bigTargets && 'Large targets'].filter(Boolean).join(' · ') || 'Standard', rows: [
      { t: 'range', key: 'textScale', title: 'Text and interface size', min: 80, max: 150, step: 5, fmt: v => v + '%' },
      { t: 'toggle', key: 'highContrast', title: 'Higher contrast', desc: 'Stronger text and borders.' },
      { t: 'toggle', key: 'reduceMotion', title: 'Remove animations', desc: 'Same as setting the animation level to Off. Flora also follows your device’s reduce-motion setting.' },
      { t: 'toggle', key: 'bigTargets', title: 'Large touch targets', desc: 'Bigger buttons and rows that are easier to tap.' },
      { t: 'toggle', key: 'readableSpacing', title: 'Roomier text', desc: 'More space between letters, words and lines.' },
      { t: 'toggle', key: 'underlineLinks', title: 'Underline links' },
      { t: 'choice', key: 'fontFamily', title: 'Font', desc: 'Easy reading uses a Verdana-style face.' },
      { t: 'info', title: 'Keyboard', desc: 'Press Ctrl+K to search everything. Tab moves between controls and Enter presses them.' }
    ] },
    { id: 'privacy', icon: 'privacy', title: 'Privacy and data', summary: () => 'On this device only', rows: [
      { t: 'info', title: 'Nothing leaves this browser', desc: 'No account, analytics or cloud storage. Amethyst sends files directly between two browsers when you ask it to.' },
      { t: 'custom', kw: 'persistent storage keep clear', render: () => `<div class="android-row static" data-persist><div class="android-row-body"><strong>Protect my data from automatic clearing</strong><small id="persist-status">Checking…</small></div><button class="btn btn-secondary btn-small" data-act="persist">Keep my data</button></div>` },
      { t: 'action', title: 'Download a backup', desc: 'Every file, profile and tool in one UTF-8 JSON file.', btn: 'Download', run: () => C.exportBackup() },
      { t: 'custom', kw: 'restore import backup', render: () => `<div class="android-row static"><div class="android-row-body"><strong>Restore from a backup</strong><small>Merges files by newest edit. Nothing is deleted.</small></div><label class="btn btn-secondary btn-small file-btn">Choose file<input type="file" id="restore-file" accept=".json,application/json" hidden></label></div>` },
      { t: 'choice', key: 'backupReminderDays', title: 'Backup reminder', desc: 'A gentle nudge when it has been a while.' },
      { t: 'action', title: 'Run setup again', desc: 'Walk through modes, look, encoding and storage once more.', btn: 'Start', run: () => C.setup?.open({ reconfigure: true }) },
      { t: 'action', title: 'Reset settings', desc: 'Restore Flora’s defaults. Your files stay.', btn: 'Reset', run: () => { if (confirm('Restore every setting to its default? Your files are not touched.')) C.resetSettings(); } },
      { t: 'action', title: 'Clear all Flora data', desc: 'Remove every profile, file, task and preference from this browser.', btn: 'Clear…', danger: true, run: () => { const b = document.createElement('button'); b.dataset.action = 'clear-data'; document.body.append(b); b.click(); b.remove(); } }
    ] },
    { id: 'developer', icon: 'encoding', title: 'Developer options', summary: () => (C.settings.devEnabled ? 'On' : 'Off'), after: root => window.FloraDev?.fillInfo(root), rows: [
      { t: 'toggle', key: 'devEnabled', title: 'Use developer options', desc: 'Switches every option below on or off without losing your choices.', kw: 'developer debug' },
      { t: 'heading', title: 'Text rendering', desc: 'Change how text is drawn across all of Flora. Saved on this device.' },
      { t: 'custom', kw: 'text sample preview', render: () => '<div class="text-lab"><div class="text-lab-big">Sphinx of black quartz, judge my vow</div><div>fi fl ffi · AV To · 0123456789 · “quotes” … ½</div><div dir="auto">مرحبا بالعالم · שלום עולם</div></div>' },
      { t: 'choice', key: 'devSmooth', title: 'Font smoothing', desc: 'How letter edges are anti-aliased.', kw: 'antialiasing text blur sharp' },
      { t: 'choice', key: 'devRender', title: 'Text rendering mode', kw: 'legibility speed precision' },
      { t: 'toggle', key: 'devLigatures', title: 'Ligatures', desc: 'Join letter pairs such as fi and fl.' },
      { t: 'toggle', key: 'devKerning', title: 'Kerning', desc: 'Tighten spacing between specific letter pairs.' },
      { t: 'toggle', key: 'devTabular', title: 'Tabular numbers', desc: 'Every digit the same width, so columns line up.' },
      { t: 'choice', key: 'devStroke', title: 'Text weight boost', desc: 'Thickens letters with an outline of the same colour.', kw: 'bold stroke heavier' },
      { t: 'range', key: 'devLetter', title: 'Letter spacing', min: -0.05, max: 0.2, step: 0.005, fmt: v => `${v > 0 ? '+' : ''}${Number(v).toFixed(3)} em` },
      { t: 'range', key: 'devWord', title: 'Word spacing', min: 0, max: 0.5, step: 0.01, fmt: v => `${Number(v).toFixed(2)} em` },
      { t: 'choice', key: 'devLineHeight', title: 'Line height', desc: 'Applies to body text and editors.' },
      { t: 'choice', key: 'devDir', title: 'Text direction', kw: 'rtl ltr arabic hebrew mirror' },
      { t: 'heading', title: 'Drawing', desc: 'Show how things are laid out.' },
      { t: 'toggle', key: 'devBounds', title: 'Show layout bounds', desc: 'Outlines every element.' },
      { t: 'toggle', key: 'devPointer', title: 'Pointer location', desc: 'Shows coordinates, input type and a ring that follows the pointer.', kw: 'touch taps' },
      { t: 'toggle', key: 'devShowIds', title: 'Show file IDs', desc: 'Adds each file’s internal ID to its card in My files.' },
      { t: 'heading', title: 'Monitoring' },
      { t: 'toggle', key: 'devPerf', title: 'Performance monitor', desc: 'Frames per second, page elements, memory and stored bytes.', kw: 'fps memory heap' },
      { t: 'choice', key: 'devAnimScale', title: 'Animation duration scale', desc: 'Slows or removes every animation.' },
      { t: 'toggle', key: 'devStayAwake', title: 'Stay awake', desc: 'Keeps the screen on while Flora is open, where the browser allows it.', kw: 'wake lock screen' },
      { t: 'heading', title: 'Debugging' },
      { t: 'action', title: 'Debug log', desc: 'Navigation, exports, warnings and errors since Flora started.', btn: 'View', run: () => window.FloraDev?.showLog() },
      { t: 'action', title: 'Inspect stored data', desc: 'See, copy, download and edit the raw JSON.', btn: 'Open', run: () => window.FloraDev?.showInspector() },
      { t: 'action', title: 'Copy settings as JSON', btn: 'Copy', run: () => window.FloraDev?.copySettings() },
      { t: 'custom', kw: 'build device info version browser service worker', render: () => '<h4 class="info-title">Build and device</h4><div id="dev-info" class="dev-info">Loading…</div>' },
      { t: 'heading', title: 'Maintenance' },
      { t: 'action', title: 'Clear offline cache and reload', desc: 'Unregisters the service worker and deletes cached files, then reloads. Your files stay.', btn: 'Clear', run: () => window.FloraDev?.clearCacheAndReload() },
      { t: 'action', title: 'Reset developer options', desc: 'Restore every option above to its default.', btn: 'Reset', rerender: true, run: () => C.saveSettings({ ...window.FloraDev.defaults, devEnabled: C.settings.devEnabled }) },
      { t: 'action', title: 'Turn off developer mode', desc: 'Hides this menu. Unlock it again from About › Build number.', btn: 'Turn off', danger: true, run: async () => { await C.saveSettings({ ...window.FloraDev.defaults, devUnlocked: false }); C.ui.settingsPage = 'home'; C.renderView(); } }
    ] },
    { id: 'about', icon: 'info', title: 'About Flora', summary: () => 'Version 3.0', rows: [
      { t: 'build' },
      { t: 'custom', render: () => `<div class="about-hero"><div class="splash-mark small">flora<span>.</span></div><small>Version 3.0 · offline-first creative workspace</small></div>` },
      { t: 'custom', kw: 'shortcuts keyboard', render: () => `<div class="shortcut-grid">${[['Ctrl K', 'Search everything'], ['Ctrl S', 'Save the open file'], ['Ctrl N', 'New document'], ['Ctrl ,', 'Open settings'], ['Esc', 'Close a dialog'], ['Ctrl /', 'Comment lines in Fern Code']].map(([k, d]) => `<div><span class="kbd">${k}</span><span>${d}</span></div>`).join('')}</div>` },
      { t: 'info', title: 'What’s new', desc: 'Setup that adapts to you, school and work modes, Android-style settings and storage, dark and paper themes, text encodings, five new applications and seven new tools.' }
    ] }
  ];
  const pageById = id => PAGES.find(p => p.id === id);
  C.settingsIndex = () => PAGES.filter(p => p.id !== 'developer' || C.settings.devUnlocked).map(p => ({ id: p.id, title: p.title }));
  C.openSettings = id => { C.ui.settingsPage = id || 'home'; C.setActiveView('settings', null, { keepPage: true }); };

  /* ---------------------------------------------------------------- custom blocks */
  function modesHTML() {
    const s = C.settings;
    return `${s.modeUndo ? `<div class="mode-undo"><span>Changed from ${esc(P.byId(s.modeUndo.from).name)}.</span><button class="btn btn-secondary btn-small" data-act="undo-mode">Undo</button></div>` : ''}` + P.GROUPS.map(g => `<div class="mode-group"><h4>${g.label}</h4><div class="mode-list">${P.MODES.filter(m => m.group === g.id).map(m => `<button class="mode-card ${m.id === s.modeId ? 'active' : ''}" data-mode="${m.id}"><span class="mode-radio"></span><span class="mode-copy"><strong>${esc(m.name)}</strong><em>${esc(m.tag)}</em><small>${esc(m.blurb)}</small></span></button>`).join('')}</div></div>`).join('');
  }
  function encodingPreviewHTML() {
    const s = C.settings, opts = { unsupported: s.asciiFallback, lineEndings: s.lineEndings };
    const r = E.encode(sampleText, s.exportEncoding, opts), back = E.decode(r.bytes, s.exportEncoding).text;
    return `<div class="enc-preview"><small>Sample text</small><div class="enc-sample">${esc(sampleText)}</div><small>Saved as ${esc(E.info(s.exportEncoding).label)} (${r.bytes.length} bytes) and read back</small><div class="enc-sample ${r.count ? 'lossy' : ''}">${esc(back)}</div><div class="enc-bytes">${E.hexDump(r.bytes, 48).split('\n')[0].slice(6, 54)}</div>${r.count ? `<p class="enc-warn">${r.count} character${r.count === 1 ? '' : 's'} do not fit in ${esc(E.info(s.exportEncoding).short)}.</p>` : '<p class="enc-ok">Every character fits.</p>'}</div>`;
  }

  /* ---------------------------------------------------------------- row rendering */
  const rowCache = {};
  function rowHTML(page, row, i) {
    const s = C.settings, id = `${page.id}:${i}`, base = `data-row="${id}"`;
    if (row.t === 'custom') return `<div class="android-custom" ${base}>${row.render()}</div>`;
    if (row.t === 'build') return `<button class="android-row" ${base} data-build><div class="android-row-body"><strong>Build number</strong><small>Flora 3.0 · static build${s.devUnlocked ? ' · developer mode is on' : ''}</small></div></button>`;
    if (row.t === 'info') return `<div class="android-row static info" ${base}><div class="android-row-body"><strong>${esc(row.title)}</strong><small>${esc(row.desc || '')}</small></div></div>`;
    if (row.t === 'action') return `<div class="android-row static" ${base}><div class="android-row-body"><strong>${esc(row.title)}</strong>${row.desc ? `<small>${esc(row.desc)}</small>` : ''}</div><button class="btn ${row.danger ? 'btn-danger' : 'btn-secondary'} btn-small" data-action-row="${id}">${esc(row.btn)}</button></div>`;
    if (row.t === 'toggle') return `<div class="android-row" ${base} data-key="${row.key}" role="button" tabindex="0" data-toggle="${row.key}"><div class="android-row-body"><strong>${esc(row.title)}</strong>${row.desc ? `<small>${esc(row.desc)}</small>` : ''}</div><span class="a-switch" role="switch" aria-checked="${!!s[row.key]}" aria-label="${esc(row.title)}"><i></i></span></div>`;
    if (row.t === 'choice') return `<button class="android-row" ${base} data-key="${row.key}" data-choice="${row.key}"><div class="android-row-body"><strong>${esc(row.title)}</strong><small data-summary>${esc(optLabel(row.key, s[row.key]))}</small></div>${icon('chevron', 20)}</button>`;
    if (row.t === 'range') return `<div class="android-row static range" ${base} data-key="${row.key}"><div class="android-row-body"><strong>${esc(row.title)}</strong>${row.desc ? `<small>${esc(row.desc)}</small>` : ''}<input type="range" class="a-range" data-range="${row.key}" min="${row.min}" max="${row.max}" step="${row.step}" value="${s[row.key]}" aria-label="${esc(row.title)}"></div><output class="a-value" data-out>${esc(row.fmt(s[row.key]))}</output></div>`;
    if (row.t === 'swatch') return `<div class="android-row static swatches-row" ${base} data-key="${row.key}"><div class="android-row-body"><strong>${esc(row.title)}</strong><small>${esc(row.desc || '')}</small><div class="swatches a-swatches">${ACCENTS.map(c => `<button class="swatch ${String(s.accent).toLowerCase() === c ? 'active' : ''}" style="background:${c}" data-accent="${c}" aria-label="Accent ${c}"></button>`).join('')}<label class="swatch custom ${ACCENTS.includes(String(s.accent).toLowerCase()) ? '' : 'active'}" title="Custom colour"><input type="color" value="${esc(s.accent)}" data-accent-custom aria-label="Custom accent colour"></label></div></div></div>`;
    return '';
  }
  function pageHTML(page) {
    let html = '', group = [];
    const flush = () => { if (group.length) html += `<div class="android-group">${group.join('')}</div>`; group = []; };
    page.rows.forEach((row, i) => {
      if (row.t === 'heading') { flush(); html += `<h2 class="android-section">${esc(row.title)}${row.desc ? `<small>${esc(row.desc)}</small>` : ''}</h2>`; return; }
      group.push(rowHTML(page, row, i));
    });
    flush();
    return page.id === 'developer' ? `<div class="dev-body ${C.settings.devEnabled ? '' : 'dev-off'}" id="dev-body">${html}</div>` : html;
  }
  function syncRows(root) {
    const s = C.settings;
    PAGES.forEach(page => page.rows.forEach((row, i) => {
      const el = $(`[data-row="${page.id}:${i}"]`, root); if (!el) return;
      if (row.t === 'toggle') $('.a-switch', el).setAttribute('aria-checked', String(!!s[row.key]));
      if (row.t === 'choice') $('[data-summary]', el).textContent = optLabel(row.key, s[row.key]);
      if (row.t === 'range') { $('[data-out]', el).textContent = row.fmt(s[row.key]); const r = $('input', el); if (document.activeElement !== r) r.value = s[row.key]; }
      if (row.t === 'swatch') { $$('.swatch', el).forEach(b => b.classList.toggle('active', b.dataset.accent === String(s.accent).toLowerCase())); const custom = $('.swatch.custom', el); if (custom) { custom.classList.toggle('active', !ACCENTS.includes(String(s.accent).toLowerCase())); $('input', custom).value = s.accent; } }
      if (row.t === 'custom' && /preview/i.test(row.kw || '') && row.render().includes('enc-preview')) el.innerHTML = row.render();
    }));
    const devBody = $('#dev-body', root); if (devBody) devBody.classList.toggle('dev-off', !s.devEnabled);
  }

  /* ---------------------------------------------------------------- chooser dialog (radio list) */
  function showChooser({ title, options, value, onPick }) {
    $('#modal-root').innerHTML = `<div class="modal-backdrop chooser-backdrop"><section class="chooser-card" role="dialog" aria-modal="true" aria-label="${esc(title)}"><h3>${esc(title)}</h3><div class="chooser-list">${options.map(o => `<button class="chooser-option ${String(o.v) === String(value) ? 'active' : ''}" data-pick="${esc(o.v)}"><span class="radio"></span><span><strong>${esc(o.label)}</strong>${o.desc ? `<small>${esc(o.desc)}</small>` : ''}</span></button>`).join('')}</div><div class="chooser-foot"><button class="btn btn-ghost" data-close>Cancel</button></div></section></div>`;
    const back = $('.chooser-backdrop');
    back.addEventListener('click', e => {
      if (e.target === back || e.target.closest('[data-close]')) { C.closeModal(); return; }
      const opt = e.target.closest('[data-pick]'); if (opt) { const picked = options.find(o => String(o.v) === opt.dataset.pick); C.closeModal(); onPick(picked.v); }
    });
    $('.chooser-option.active', back)?.focus();
  }

  /* ---------------------------------------------------------------- modes: choose with confirmation */
  function chooseMode(id) {
    const m = P.byId(id), s = C.settings;
    if (id === s.modeId && !s.examLock) { C.toast(`${m.name} is already on.`); return; }
    const seeds = P.seedLabels(id, { uid: C.uid });
    const changes = [m.patch.theme && m.patch.theme !== s.theme ? `${optLabel('theme', m.patch.theme)} theme` : '', m.patch.textScale && m.patch.textScale !== s.textScale ? `Text size ${m.patch.textScale}%` : '', `${m.apps.length} applications and ${m.tools.length} tools in the sidebar`, `Focus ${m.patch.focusMinutes} min, break ${m.patch.breakMinutes} min`, m.patch.quietToasts ? 'Notifications muted' : '', m.patch.examLock ? 'Navigation locked to revision tools' : ''].filter(Boolean);
    $('#modal-root').innerHTML = `<div class="modal-backdrop chooser-backdrop"><section class="chooser-card mode-confirm" role="dialog" aria-modal="true" aria-label="Switch mode"><div class="page-kicker">SWITCH MODE</div><h3>${esc(m.name)}</h3><p>${esc(m.blurb)}</p><ul class="mode-changes">${changes.map(c => `<li>${esc(c)}</li>`).join('')}</ul>${seeds.length ? `<label class="check-row"><input type="checkbox" id="mode-seed" checked><span>Add starter files: ${esc(seeds.join(', '))}</span></label>` : ''}<p class="small-print">You can undo this from Settings › Modes and presets.</p><div class="chooser-foot"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" data-apply>Switch to ${esc(m.name)}</button></div></section></div>`;
    const back = $('.chooser-backdrop');
    back.addEventListener('click', async e => {
      if (e.target === back || e.target.closest('[data-close]')) C.closeModal();
      if (e.target.closest('[data-apply]')) { const seed = !!$('#mode-seed')?.checked; C.closeModal(); await C.applyMode(id, { seed }); }
    });
  }
  C.chooseMode = chooseMode;
  C.showModePicker = () => {
    $('#modal-root').innerHTML = `<div class="modal-backdrop chooser-backdrop"><section class="chooser-card mode-picker" role="dialog" aria-modal="true" aria-label="Choose a mode"><h3>Choose a mode</h3><div class="mode-scroll">${modesHTML()}</div><div class="chooser-foot"><button class="btn btn-ghost" data-close>Close</button></div></section></div>`;
    const back = $('.chooser-backdrop');
    back.addEventListener('click', e => {
      if (e.target === back || e.target.closest('[data-close]')) { C.closeModal(); return; }
      const card = e.target.closest('[data-mode]'); if (card) { C.closeModal(); chooseMode(card.dataset.mode); }
      if (e.target.closest('[data-act="undo-mode"]')) { C.closeModal(); C.undoMode(); }
    });
  };

  /* ---------------------------------------------------------------- the view */
  let query = '';
  function render(root, opts = {}) {
    const page = C.ui.settingsPage;
    const dirClass = opts.dir ? (opts.dir === 'in' ? 'slide-in' : 'slide-back') : '';
    if (page === 'home') {
      const s = C.settings, storage = C.localDataSize();
      root.innerHTML = `<div class="android-screen ${dirClass}"><h1 class="android-title">Settings</h1>
        <label class="android-search"><span>${icon('search', 20)}</span><input id="set-search" type="search" placeholder="Search settings" value="${esc(query)}" autocomplete="off" aria-label="Search settings"></label>
        <button class="profile-card" data-set-open="profile"><span class="avatar big" style="--avatar-color:${esc(C.profile.color)}">${esc(C.profile.name.slice(0, 1).toUpperCase())}</span><span class="profile-card-copy"><strong>${esc(C.profile.name)}</strong><small>${esc(P.byId(s.modeId).name)} mode · Local profile</small></span>${icon('chevron', 20)}</button>
        <div id="set-results" class="android-group" hidden></div>
        <div id="set-groups" class="android-group list">${[...PAGES.slice(1, 5), 'storage', ...PAGES.slice(5)].filter(p => p === 'storage' || p.id !== 'developer' || C.settings.devUnlocked).map(p => p === 'storage'
          ? `<button class="android-row nav" data-set-storage>${icon('storage')}<div class="android-row-body"><strong>Storage</strong><small>${esc(C.formatBytes(storage))} used of ${esc(C.formatBytes(s.storageLimitBytes))}</small></div></button>`
          : `<button class="android-row nav" data-set-open="${p.id}">${icon(p.icon)}<div class="android-row-body"><strong>${esc(p.title)}</strong><small>${esc(p.summary())}</small></div></button>`).join('')}</div></div>`;
      if (query) runSearch(root);
    } else {
      const p = pageById(page) || pageById('modes');
      root.innerHTML = `<div class="android-screen ${dirClass}"><button class="round-back" data-set-back aria-label="Back">${icon('back')}</button><h1 class="android-title">${esc(p.title)}</h1>${pageHTML(p)}</div>`;
      if (p.id === 'privacy') persistStatus(root);
      p.after?.(root);
    }
  }
  async function persistStatus(root) {
    const el = $('#persist-status', root); if (!el) return;
    let persisted = false; try { persisted = await navigator.storage?.persisted?.(); } catch {}
    el.textContent = persisted ? 'Protected. Your browser will not clear Flora’s data on its own.' : 'Not protected. Browsers can clear site data when space runs low.';
    const btn = $('[data-act="persist"]', root); if (btn) btn.hidden = !!persisted;
  }
  function runSearch(root) {
    const q = query.trim().toLowerCase(), box = $('#set-results', root), groups = $('#set-groups', root); if (!box) return;
    if (!q) { box.hidden = true; groups.hidden = false; return; }
    const hits = [];
    PAGES.filter(page => page.id !== 'developer' || C.settings.devUnlocked).forEach(page => page.rows.forEach((row, i) => {
      const text = `${row.title || ''} ${row.desc || ''} ${row.kw || ''} ${page.title}`.toLowerCase();
      if ((row.title || row.kw) && q.split(/\s+/).every(w => text.includes(w))) hits.push({ page, row, i });
    }));
    PAGES.filter(page => page.id !== 'developer' || C.settings.devUnlocked).forEach(page => { if (page.title.toLowerCase().includes(q) && !hits.some(h => h.page === page)) hits.push({ page, row: { title: page.title, desc: 'Open this section' }, i: -1 }); });
    groups.hidden = true; box.hidden = false;
    box.innerHTML = hits.length ? hits.slice(0, 14).map(h => `<button class="android-row nav" data-hit="${h.page.id}:${h.i}">${icon(h.page.icon)}<div class="android-row-body"><strong>${esc(h.row.title || h.page.title)}</strong><small>${esc(h.page.title)}${h.row.desc ? ' · ' + esc(h.row.desc.slice(0, 70)) : ''}</small></div></button>`).join('') : `<div class="android-row static info"><div class="android-row-body"><strong>No settings found</strong><small>Try a different word, like “dark”, “text” or “storage”.</small></div></div>`;
  }
  function go(root, page, dir) { C.ui.settingsPage = page; query = ''; render(root, { dir }); window.scrollTo(0, 0); }
  function flash(root, key) { const el = $(`[data-row="${key}"]`, root); if (!el) return; el.scrollIntoView({ block: 'center', behavior: C.animOff() ? 'auto' : 'smooth' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1800); }
  let rangeTimer = null, buildTaps = 0, buildReset = null;
  async function buildTap(root) {
    if (C.settings.devUnlocked) { C.toast('No need, you are already a developer.'); return; }
    buildTaps++; clearTimeout(buildReset); buildReset = setTimeout(() => { buildTaps = 0; }, 4000);
    if (buildTaps >= 7) { buildTaps = 0; await C.saveSettings({ devUnlocked: true, devEnabled: true }); C.toast('You are now a developer!', 'success'); render(root); }
    else if (buildTaps >= 3) C.toast(`You are ${7 - buildTaps} step${7 - buildTaps === 1 ? '' : 's'} away from being a developer.`);
  }

  C.registerView('settings', {
    crumb: () => ['Workspace', C.ui.settingsPage === 'home' ? 'Settings' : (pageById(C.ui.settingsPage)?.title || 'Settings')],
    render: root => {
      render(root);
      C.bindRoot(root, {
        click: async e => {
          const open = e.target.closest('[data-set-open]'); if (open) { go(root, open.dataset.setOpen, 'in'); return; }
          if (e.target.closest('[data-set-storage]')) { C.setActiveView('storage'); return; }
          if (e.target.closest('[data-set-back]')) { go(root, 'home', 'back'); return; }
          const hit = e.target.closest('[data-hit]'); if (hit) { const [pid, idx] = hit.dataset.hit.split(':'); go(root, pid, 'in'); if (Number(idx) >= 0) setTimeout(() => flash(root, hit.dataset.hit), 60); return; }
          const tog = e.target.closest('[data-toggle]'); if (tog) { const key = tog.dataset.toggle; await C.saveSettings({ [key]: !C.settings[key] }); syncRows(root); if (key === 'compactMode' || key === 'reduceMotion') syncRows(root); return; }
          const ch = e.target.closest('[data-choice]'); if (ch) { const key = ch.dataset.choice, row = PAGES.flatMap(p => p.rows).find(r => r.key === key); showChooser({ title: row.title, options: OPT[key], value: C.settings[key], onPick: async v => { const typed = typeof OPT[key][0].v === 'number' ? Number(v) : v; await C.saveSettings({ [key]: typed }); syncRows(root); if (key === 'animLevel') C.playViewEnter(); } }); return; }
          const sw = e.target.closest('[data-accent]'); if (sw) { await C.saveSettings({ accent: sw.dataset.accent }); syncRows(root); return; }
          const build = e.target.closest('[data-build]'); if (build) { buildTap(root); return; }
          const rowAct = e.target.closest('[data-action-row]'); if (rowAct) { const [pid, idx] = rowAct.dataset.actionRow.split(':'), row = pageById(pid).rows[Number(idx)]; await row.run(); if (row.rerender) render(root); return; }
          const mode = e.target.closest('[data-mode]'); if (mode) { chooseMode(mode.dataset.mode); return; }
          const act = e.target.closest('[data-act]'); if (act) {
            if (act.dataset.act === 'undo-mode') { await C.undoMode(); render(root); }
            if (act.dataset.act === 'persist') { const ok = await C.requestPersist(); C.toast(ok ? 'Flora’s data is now protected.' : 'Your browser did not grant protection. Installing Flora as an app often helps.', ok ? 'success' : ''); persistStatus(root); }
          }
        },
        keydown: e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-toggle]')) { e.preventDefault(); e.target.click(); } },
        input: e => {
          if (e.target.id === 'set-search') { query = e.target.value; runSearch(root); return; }
          if (e.target.matches('[data-accent-custom]')) { C.saveSettings({ accent: e.target.value }).then(() => syncRows(root)); return; }
          const range = e.target.closest('[data-range]'); if (!range) return;
          const key = range.dataset.range, row = PAGES.flatMap(p => p.rows).find(r => r.key === key), v = Number(range.value);
          $('[data-out]', range.closest('[data-row]')).textContent = row.fmt(v);
          clearTimeout(rangeTimer); rangeTimer = setTimeout(() => C.saveSettings({ [key]: v }).then(() => syncRows(root)), key === 'textScale' ? 280 : 60);
        },
        change: async e => {
          if (e.target.id === 'restore-file' && e.target.files[0]) {
            try { const withSettings = confirm('Also restore the settings stored in this backup?\n\nOK: restore files and settings\nCancel: restore files only'); const r = await C.importBackup(e.target.files[0], { withSettings }); C.toast(`Restored: ${r.addedFiles} new, ${r.updatedFiles} updated file${r.addedFiles + r.updatedFiles === 1 ? '' : 's'}`, 'success'); }
            catch (err) { C.toast(err.message, 'error'); }
          }
        }
      });
    }
  });
})();

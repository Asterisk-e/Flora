/* Flora applications, part two: Fern Code, Lavender Sketch, Jasmine Flashcards, Marigold Kanban, Wisteria Journal.
   Each registers itself with FloraCore and stores its content inside an ordinary Flora file. */
(function () {
  'use strict';
  const C = window.FloraCore;
  if (!C) return;
  const { esc, $, $$, uid } = C;
  const live = () => C.activeFile();
  const changed = action => C.changed(action);
  const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const shortDate = iso => { try { return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso + 'T12:00:00')); } catch { return iso; } };

  /* =================================================================== Fern Code */
  const LANGS = {
    plaintext:  { label: 'Plain text', ext: 'txt',  comment: '' },
    javascript: { label: 'JavaScript', ext: 'js',   comment: '//' },
    typescript: { label: 'TypeScript', ext: 'ts',   comment: '//' },
    python:     { label: 'Python',     ext: 'py',   comment: '#' },
    html:       { label: 'HTML',       ext: 'html', comment: '' },
    css:        { label: 'CSS',        ext: 'css',  comment: '' },
    json:       { label: 'JSON',       ext: 'json', comment: '' },
    markdown:   { label: 'Markdown',   ext: 'md',   comment: '' },
    sql:        { label: 'SQL',        ext: 'sql',  comment: '--' },
    c:          { label: 'C',          ext: 'c',    comment: '//' },
    cpp:        { label: 'C++',        ext: 'cpp',  comment: '//' },
    java:       { label: 'Java',       ext: 'java', comment: '//' },
    rust:       { label: 'Rust',       ext: 'rs',   comment: '//' },
    go:         { label: 'Go',         ext: 'go',   comment: '//' },
    shell:      { label: 'Shell',      ext: 'sh',   comment: '#' },
    xml:        { label: 'XML',        ext: 'xml',  comment: '' },
    yaml:       { label: 'YAML',       ext: 'yml',  comment: '#' }
  };

  function insertText(area, start, end, text, selStart, selEnd) {
    area.focus(); area.setSelectionRange(start, end);
    let ok = false;
    try { ok = document.execCommand('insertText', false, text); } catch {}
    if (!ok) { area.setRangeText(text, start, end, 'end'); area.dispatchEvent(new Event('input', { bubbles: true })); }
    area.setSelectionRange(selStart ?? start + text.length, selEnd ?? selStart ?? start + text.length);
  }

  C.registerApp({
    type: 'code', label: 'Fern Code', short: 'Code', glyph: 'FC', color: '#dde8e6', extensions: ['txt', 'md', 'html'],
    blurb: 'Snippets and scripts with line numbers',
    landing: 'A plain, fast code editor with line numbers, smart indentation and export in the file type you need.',
    newContent: () => ({ lang: 'javascript', text: '', wrap: false, tab: 2 }),
    extensionsFor: file => [...new Set([(LANGS[file.content.lang] || LANGS.plaintext).ext, 'txt', 'md', 'html'])],
    renderBody: file => {
      const c = file.content;
      return `<div class="editor-toolbar code-toolbar"><span class="editor-toolbar-title">Fern Code</span>
        <select class="editor-select" id="code-lang" aria-label="Language">${Object.entries(LANGS).map(([id, l]) => `<option value="${id}" ${c.lang === id ? 'selected' : ''}>${l.label}</option>`).join('')}</select>
        <select class="editor-select" id="code-tab" aria-label="Indentation">${[[2, '2 spaces'], [4, '4 spaces'], [0, 'Tab']].map(([v, l]) => `<option value="${v}" ${Number(c.tab) === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <button class="tool-button ${c.wrap ? 'active' : ''}" data-code="wrap">Wrap</button>
        <button class="tool-button" data-code="format" ${c.lang === 'json' ? '' : 'hidden'}>Format JSON</button>
        <button class="tool-button" data-code="copy">Copy all</button>
        <span style="flex:1"></span><span class="small-print" id="code-status">Ln 1, Col 1</span></div>
        <div class="code-shell ${c.wrap ? 'wrapped' : ''}"><pre class="code-gutter" id="code-gutter" aria-hidden="true">1</pre><textarea id="code-area" class="code-area" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Code editor" wrap="${c.wrap ? 'soft' : 'off'}"></textarea></div>`;
    },
    mount: (file, host) => {
      const c = file.content, area = $('#code-area', host), gutter = $('#code-gutter', host), status = $('#code-status', host);
      const indent = () => (Number(c.tab) === 0 ? '\t' : ' '.repeat(Number(c.tab) || 2));
      area.value = c.text || '';
      const paint = () => {
        const lines = area.value.split('\n').length;
        gutter.textContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
        const before = area.value.slice(0, area.selectionStart).split('\n');
        status.textContent = `Ln ${before.length}, Col ${before[before.length - 1].length + 1} · ${lines} lines · ${area.value.length} chars`;
      };
      area.addEventListener('input', () => { c.text = area.value; paint(); changed('typing'); });
      area.addEventListener('scroll', () => { gutter.scrollTop = area.scrollTop; });
      ['keyup', 'click', 'focus'].forEach(ev => area.addEventListener(ev, paint));
      area.addEventListener('keydown', event => {
        const { selectionStart: s, selectionEnd: e, value } = area;
        const lineStart = value.lastIndexOf('\n', s - 1) + 1;
        if (event.key === 'Tab') {
          event.preventDefault();
          const multi = value.slice(s, e).includes('\n');
          if (!multi && !event.shiftKey) { insertText(area, s, e, indent()); return; }
          const endSel = (e > s && value[e - 1] === '\n') ? e - 1 : e, nl = value.indexOf('\n', endSel), blockEnd = nl === -1 ? value.length : nl;
          const block = value.slice(lineStart, blockEnd), pad = indent();
          const out = block.split('\n').map(line => event.shiftKey ? (line.startsWith(pad) ? line.slice(pad.length) : line.replace(/^ {1,4}|^\t/, '')) : pad + line).join('\n');
          insertText(area, lineStart, blockEnd, out, lineStart, lineStart + out.length);
        } else if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey) {
          const line = value.slice(lineStart, s), lead = line.match(/^[\t ]*/)[0];
          const opens = /[{[(:]\s*$/.test(line) && c.lang !== 'markdown' && c.lang !== 'plaintext';
          event.preventDefault(); insertText(area, s, e, '\n' + lead + (opens ? indent() : ''));
        } else if ((event.ctrlKey || event.metaKey) && event.key === '/') {
          const mark = (LANGS[c.lang] || {}).comment; if (!mark) return;
          event.preventDefault();
          const blockEnd = value.indexOf('\n', e) === -1 ? value.length : value.indexOf('\n', e);
          const lines = value.slice(lineStart, blockEnd).split('\n');
          const all = lines.every(l => !l.trim() || l.trim().startsWith(mark));
          const out = lines.map(l => !l.trim() ? l : all ? l.replace(new RegExp('^(\\s*)' + mark.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + ' ?'), '$1') : l.replace(/^(\s*)/, '$1' + mark + ' ')).join('\n');
          insertText(area, lineStart, blockEnd, out, lineStart, lineStart + out.length);
        }
      });
      host.addEventListener('change', event => {
        if (event.target.id === 'code-lang') { c.lang = event.target.value; $('[data-code="format"]', host).hidden = c.lang !== 'json'; changed('editing'); }
        if (event.target.id === 'code-tab') { c.tab = Number(event.target.value); changed('editing'); }
      });
      host.addEventListener('click', async event => {
        const btn = event.target.closest('[data-code]'); if (!btn) return;
        if (btn.dataset.code === 'wrap') {
          c.wrap = !c.wrap; btn.classList.toggle('active', c.wrap); $('.code-shell', host).classList.toggle('wrapped', c.wrap); area.setAttribute('wrap', c.wrap ? 'soft' : 'off'); changed('editing');
        }
        if (btn.dataset.code === 'copy') { try { await navigator.clipboard.writeText(area.value); C.toast('Code copied', 'success'); } catch { area.select(); C.toast('Press Ctrl+C to copy'); } }
        if (btn.dataset.code === 'format') {
          try { const pretty = JSON.stringify(JSON.parse(area.value), null, Number(c.tab) === 0 ? '\t' : Number(c.tab) || 2); insertText(area, 0, area.value.length, pretty, 0, 0); C.toast('JSON formatted', 'success'); }
          catch (error) { C.toast('That is not valid JSON: ' + error.message, 'error'); }
        }
      });
      paint();
    },
    exportFile: (file, ext, h) => {
      const text = String(file.content.text || ''), lang = LANGS[file.content.lang] || LANGS.plaintext;
      if (ext === 'md') return { text: '```' + (file.content.lang === 'plaintext' ? '' : file.content.lang) + '\n' + text + '\n```\n', mime: 'text/markdown;charset=utf-8' };
      if (ext === 'html' && file.content.lang !== 'html') return { text: `<!doctype html><meta charset="utf-8"><title>${esc(file.name)}</title><style>body{font:14px/1.5 ui-monospace,Menlo,Consolas,monospace;padding:24px;background:#faf8f1;color:#2b2a24}pre{white-space:pre-wrap}</style><pre>${esc(text)}</pre>`, mime: 'text/html;charset=utf-8' };
      return { text, mime: ext === 'json' ? 'application/json;charset=utf-8' : ext === 'html' ? 'text/html;charset=utf-8' : 'text/plain;charset=utf-8' };
    }
  });

  /* =================================================================== Lavender Sketch */
  const SKETCH_COLORS = ['#2b2a24', '#c0504d', '#e08a3c', '#e9c96b', '#6b9a5b', '#4b8de8', '#8b6bb8', '#ffffff'];
  C.registerApp({
    type: 'sketch', label: 'Lavender Sketch', short: 'Sketch', glyph: 'LS', color: '#ece4f2', extensions: ['png'],
    blurb: 'Draw, diagram and doodle',
    landing: 'A freehand drawing pad with pens, shapes, fill and unlimited undo for the session. Export as PNG.',
    newContent: () => ({ w: 960, h: 560, data: null }),
    renderBody: file => `<div class="editor-toolbar sketch-toolbar"><span class="editor-toolbar-title">Lavender Sketch</span>
        ${[['pen', 'Pen'], ['marker', 'Marker'], ['eraser', 'Eraser'], ['line', 'Line'], ['rect', 'Box'], ['ellipse', 'Oval'], ['fill', 'Fill']].map(([id, l]) => `<button class="tool-button ${id === 'pen' ? 'active' : ''}" data-sk-tool="${id}">${l}</button>`).join('')}
        <span class="toolbar-divider"></span>
        <span class="sk-swatches">${SKETCH_COLORS.map((col, i) => `<button class="sk-swatch ${i === 0 ? 'active' : ''}" style="background:${col}" data-sk-color="${col}" aria-label="Colour ${col}"></button>`).join('')}<input type="color" id="sk-color" value="#2b2a24" aria-label="Custom colour"></span>
        <label class="toolbar-color">Size <input type="range" id="sk-size" min="1" max="40" value="4" aria-label="Brush size"></label>
        <span class="toolbar-divider"></span>
        <button class="tool-button" data-sk="undo">Undo</button><button class="tool-button" data-sk="redo">Redo</button><button class="tool-button" data-sk="clear">Clear</button>
        <span style="flex:1"></span><button class="btn btn-secondary btn-small" data-sk="png">Download PNG</button></div>
      <div class="sketch-stage" tabindex="0"><canvas class="sketch-canvas" id="sk-canvas" width="${file.content.w || 960}" height="${file.content.h || 560}" aria-label="Drawing canvas"></canvas></div>`,
    mount: (file, host) => {
      const c = file.content, canvas = $('#sk-canvas', host), ctx = canvas.getContext('2d', { willReadFrequently: true });
      let tool = 'pen', color = '#2b2a24', size = 4, drawing = false, start = null, points = [], snapshot = null;
      const history = []; let hi = -1;
      const blank = () => { ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); };
      const pushHistory = () => { history.splice(hi + 1); history.push(ctx.getImageData(0, 0, canvas.width, canvas.height)); if (history.length > 16) history.shift(); hi = history.length - 1; };
      const persist = () => { c.data = canvas.toDataURL('image/png'); changed('editing'); };
      blank();
      if (c.data) { const img = new Image(); img.onload = () => { ctx.drawImage(img, 0, 0); pushHistory(); }; img.src = c.data; } else pushHistory();
      const pos = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * canvas.width / r.width, y: (e.clientY - r.top) * canvas.height / r.height }; };
      const style = () => { ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = tool === 'marker' ? size * 2.2 : size; ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color; ctx.fillStyle = color; ctx.globalAlpha = tool === 'marker' ? .38 : 1; };
      const strokePath = pts => { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length - 1; i++) { const mid = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 }; ctx.quadraticCurveTo(pts[i].x, pts[i].y, mid.x, mid.y); } const last = pts[pts.length - 1]; ctx.lineTo(last.x, last.y); ctx.stroke(); };
      const floodFill = (sx, sy) => {
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height), data = img.data, w = canvas.width, h = canvas.height;
        const idx = (x, y) => (y * w + x) * 4, x0 = Math.floor(sx), y0 = Math.floor(sy), i0 = idx(x0, y0);
        const target = [data[i0], data[i0 + 1], data[i0 + 2], data[i0 + 3]];
        const hex = color.replace('#', ''), fill = [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), 255];
        if (target.every((v, i) => Math.abs(v - fill[i]) < 6)) return;
        const near = i => Math.abs(data[i] - target[0]) + Math.abs(data[i + 1] - target[1]) + Math.abs(data[i + 2] - target[2]) + Math.abs(data[i + 3] - target[3]) < 70;
        const stack = [[x0, y0]];
        while (stack.length) {
          let [x, y] = stack.pop(); let i = idx(x, y);
          while (y >= 0 && near(idx(x, y))) y--; y++;
          let left = false, right = false;
          while (y < h && near(idx(x, y))) {
            i = idx(x, y); data[i] = fill[0]; data[i + 1] = fill[1]; data[i + 2] = fill[2]; data[i + 3] = 255;
            if (x > 0) { if (near(idx(x - 1, y))) { if (!left) { stack.push([x - 1, y]); left = true; } } else left = false; }
            if (x < w - 1) { if (near(idx(x + 1, y))) { if (!right) { stack.push([x + 1, y]); right = true; } } else right = false; }
            y++;
          }
        }
        ctx.putImageData(img, 0, 0);
      };
      canvas.addEventListener('pointerdown', e => {
        e.preventDefault(); canvas.setPointerCapture(e.pointerId); start = pos(e);
        if (tool === 'fill') { floodFill(start.x, start.y); pushHistory(); persist(); return; }
        drawing = true; points = [start]; snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height); style();
        if (tool === 'pen' || tool === 'eraser') { ctx.beginPath(); ctx.arc(start.x, start.y, ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fillStyle = ctx.strokeStyle; ctx.fill(); }
      });
      canvas.addEventListener('pointermove', e => {
        if (!drawing) return; const p = pos(e); points.push(p);
        if (tool === 'pen' || tool === 'eraser') { style(); const n = points.length; if (n > 2) { ctx.beginPath(); const a = points[n - 3], b = points[n - 2], m1 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, m2 = { x: (b.x + p.x) / 2, y: (b.y + p.y) / 2 }; ctx.moveTo(m1.x, m1.y); ctx.quadraticCurveTo(b.x, b.y, m2.x, m2.y); ctx.stroke(); } else { ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y); ctx.lineTo(p.x, p.y); ctx.stroke(); } return; }
        ctx.putImageData(snapshot, 0, 0); style();
        if (tool === 'marker') { if (points.length > 1) strokePath(points); }
        else if (tool === 'line') { ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
        else if (tool === 'rect') ctx.strokeRect(start.x, start.y, p.x - start.x, p.y - start.y);
        else if (tool === 'ellipse') { ctx.beginPath(); ctx.ellipse((start.x + p.x) / 2, (start.y + p.y) / 2, Math.abs(p.x - start.x) / 2, Math.abs(p.y - start.y) / 2, 0, 0, Math.PI * 2); ctx.stroke(); }
      });
      const finish = () => { if (!drawing) return; drawing = false; ctx.globalAlpha = 1; pushHistory(); persist(); };
      canvas.addEventListener('pointerup', finish); canvas.addEventListener('pointercancel', finish);
      const restore = () => { ctx.putImageData(history[hi], 0, 0); persist(); };
      const undo = () => { if (hi > 0) { hi--; restore(); } }, redo = () => { if (hi < history.length - 1) { hi++; restore(); } };
      host.addEventListener('click', e => {
        const t = e.target.closest('[data-sk-tool]'); if (t) { tool = t.dataset.skTool; $$('[data-sk-tool]', host).forEach(b => b.classList.toggle('active', b === t)); }
        const sw = e.target.closest('[data-sk-color]'); if (sw) { color = sw.dataset.skColor; $$('[data-sk-color]', host).forEach(b => b.classList.toggle('active', b === sw)); if (tool === 'eraser') { tool = 'pen'; $$('[data-sk-tool]', host).forEach(b => b.classList.toggle('active', b.dataset.skTool === 'pen')); } }
        const b = e.target.closest('[data-sk]'); if (!b) return;
        if (b.dataset.sk === 'undo') undo(); if (b.dataset.sk === 'redo') redo();
        if (b.dataset.sk === 'clear') { if (confirm('Clear the whole drawing?')) { blank(); pushHistory(); persist(); } }
        if (b.dataset.sk === 'png') C.exportFile(live(), 'png');
      });
      $('#sk-color', host).addEventListener('input', e => { color = e.target.value; $$('[data-sk-color]', host).forEach(b => b.classList.remove('active')); });
      $('#sk-size', host).addEventListener('input', e => { size = Number(e.target.value); });
      $('.sketch-stage', host).addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); } if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); } });
    },
    exportFile: file => {
      if (file.content.data) return { blob: C.dataURLToBlob(file.content.data) };
      const canvas = document.createElement('canvas'); canvas.width = file.content.w || 960; canvas.height = file.content.h || 560;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      return { blob: C.dataURLToBlob(canvas.toDataURL('image/png')) };
    }
  });

  /* =================================================================== Jasmine Flashcards */
  C.registerApp({
    type: 'cards', label: 'Jasmine Flashcards', short: 'Flashcards', glyph: 'JF', color: '#f3e2e0', extensions: ['csv', 'txt', 'json', 'html'],
    blurb: 'Make decks and study them',
    landing: 'Write cards, flip through them, and keep the ones you are still learning in a separate pile.',
    newContent: () => ({ cards: [{ id: uid(), q: 'Front of the first card', a: 'Back of the first card', known: false }] }),
    renderBody: () => `<div class="cards-app" id="cards-root"></div>`,
    mount: (file, host) => {
      const c = file.content; if (!Array.isArray(c.cards)) c.cards = [];
      const root = $('#cards-root', host);
      const S = { mode: 'edit', queue: [], i: 0, flipped: false, got: 0, again: 0, bulk: false, missed: [] };
      const shuffle = list => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
      const learning = () => c.cards.filter(card => !card.known && (card.q || card.a));
      function paintEdit() {
        root.innerHTML = `<div class="editor-toolbar"><span class="editor-toolbar-title">Jasmine Flashcards</span><div class="seg"><button class="seg-btn active" data-cd-mode="edit">Edit</button><button class="seg-btn" data-cd-mode="study">Study</button></div><button class="btn btn-secondary btn-small" data-cd="add">Add card</button><button class="btn btn-secondary btn-small" data-cd="bulk">Paste many</button><span style="flex:1"></span><span class="small-print">${c.cards.length} card${c.cards.length === 1 ? '' : 's'} · ${c.cards.filter(x => x.known).length} known</span></div>
          ${S.bulk ? `<div class="cards-bulk"><label class="amethyst-label" for="cd-bulk">One card per line: question, then a tab, semicolon or “ | ”, then the answer.</label><textarea id="cd-bulk" class="amethyst-code" rows="5" placeholder="Capital of France; Paris"></textarea><div><button class="btn btn-primary btn-small" data-cd="bulk-add">Add these cards</button> <button class="btn btn-ghost btn-small" data-cd="bulk">Cancel</button></div></div>` : ''}
          <div class="cards-list">${c.cards.map((card, i) => `<div class="card-row ${card.known ? 'known' : ''}" data-card="${card.id}"><span class="card-n">${i + 1}</span><textarea data-cd-q="${card.id}" rows="2" placeholder="Front" aria-label="Front of card ${i + 1}">${esc(card.q)}</textarea><textarea data-cd-a="${card.id}" rows="2" placeholder="Back" aria-label="Back of card ${i + 1}">${esc(card.a)}</textarea><div class="card-row-actions"><button class="btn btn-ghost btn-small" data-cd-known="${card.id}">${card.known ? 'Known' : 'Learning'}</button><button class="btn btn-ghost btn-small" data-cd-del="${card.id}">Remove</button></div></div>`).join('') || '<div class="empty-state"><h3>No cards yet</h3><p>Add a card to begin.</p></div>'}</div>`;
      }
      function startStudy(only) {
        S.mode = 'study'; S.queue = shuffle(only === 'learning' ? learning() : c.cards.filter(x => x.q || x.a)); S.i = 0; S.flipped = false; S.got = 0; S.again = 0; S.missed = []; paintStudy();
      }
      function paintStudy() {
        const total = S.queue.length;
        const head = `<div class="editor-toolbar"><span class="editor-toolbar-title">Jasmine Flashcards</span><div class="seg"><button class="seg-btn" data-cd-mode="edit">Edit</button><button class="seg-btn active" data-cd-mode="study">Study</button></div><span style="flex:1"></span><span class="small-print">${Math.min(S.i + 1, total)} of ${total}</span></div>`;
        if (!total) { root.innerHTML = head + `<div class="study-empty"><h3>Nothing to study</h3><p>Add some cards, or mark cards as “Learning” in the editor.</p><button class="btn btn-primary" data-cd-mode="edit">Back to editing</button></div>`; return; }
        if (S.i >= total) {
          root.innerHTML = head + `<div class="study-done"><div class="study-score" id="cd-score">0</div><h3>You knew ${S.got} of ${total}</h3><p>${S.again ? `${S.again} still to learn. Go through those again?` : 'Every card was a hit.'}</p><div class="study-actions">${S.again ? `<button class="btn btn-primary" data-cd="study-missed">Study the ${S.again} missed</button>` : ''}<button class="btn btn-secondary" data-cd="study-all">Study everything again</button><button class="btn btn-ghost" data-cd-mode="edit">Back to editing</button></div></div>`;
          C.countUp($('#cd-score', host), Math.round(S.got / total * 100), { format: v => Math.round(v) + '%' }); return;
        }
        const card = S.queue[S.i];
        root.innerHTML = head + `<div class="study-wrap"><div class="study-progress"><span style="width:${S.i / total * 100}%"></span></div><button class="flash ${S.flipped ? 'flipped' : ''}" data-cd="flip" aria-label="Flip card"><span class="flash-face front"><small>Question</small>${esc(card.q) || '<em>Empty</em>'}</span><span class="flash-face back"><small>Answer</small>${esc(card.a) || '<em>Empty</em>'}</span></button>
          <p class="study-hint">${S.flipped ? 'Did you know it?' : 'Click the card or press Space to flip it.'}</p>
          <div class="study-actions"><button class="btn btn-secondary" data-cd="again" ${S.flipped ? '' : 'disabled'}>Still learning</button><button class="btn btn-primary" data-cd="got" ${S.flipped ? '' : 'disabled'}>Got it</button></div></div>`;
        const wrap = $('.study-wrap', host); wrap.tabIndex = 0; wrap.focus({ preventScroll: true });
      }
      const grade = known => { const card = S.queue[S.i]; if (!card) return; const real = c.cards.find(x => x.id === card.id); if (real) real.known = known; known ? S.got++ : (S.again++, S.missed.push(card)); S.i++; S.flipped = false; changed('editing'); paintStudy(); };
      host.addEventListener('click', e => {
        const mode = e.target.closest('[data-cd-mode]'); if (mode) { if (mode.dataset.cdMode === 'study') startStudy(); else { S.mode = 'edit'; paintEdit(); } return; }
        const b = e.target.closest('[data-cd]'); const known = e.target.closest('[data-cd-known]'), del = e.target.closest('[data-cd-del]');
        if (known) { const card = c.cards.find(x => x.id === known.dataset.cdKnown); if (card) { card.known = !card.known; changed('editing'); paintEdit(); } return; }
        if (del) { c.cards = c.cards.filter(x => x.id !== del.dataset.cdDel); changed('deleting'); paintEdit(); return; }
        if (!b) return; const act = b.dataset.cd;
        if (act === 'add') { c.cards.push({ id: uid(), q: '', a: '', known: false }); changed('adding'); paintEdit(); const rows = $$('[data-cd-q]', host); rows[rows.length - 1]?.focus(); }
        if (act === 'bulk') { S.bulk = !S.bulk; paintEdit(); }
        if (act === 'bulk-add') { const lines = $('#cd-bulk', host).value.split(/\r?\n/).filter(l => l.trim()); lines.forEach(line => { const parts = line.split(/\t| \| |;/); if (parts.length >= 2) c.cards.push({ id: uid(), q: parts[0].trim(), a: parts.slice(1).join(';').trim(), known: false }); }); S.bulk = false; changed('adding'); paintEdit(); C.toast(`${lines.length} line${lines.length === 1 ? '' : 's'} read`, 'success'); }
        if (act === 'flip') { S.flipped = !S.flipped; $('.flash', host).classList.toggle('flipped', S.flipped); $$('[data-cd="again"],[data-cd="got"]', host).forEach(x => x.disabled = !S.flipped); $('.study-hint', host).textContent = S.flipped ? 'Did you know it?' : 'Click the card or press Space to flip it.'; }
        if (act === 'got') grade(true); if (act === 'again') grade(false);
        if (act === 'study-all') startStudy(); if (act === 'study-missed') { S.queue = shuffle(S.missed); S.i = 0; S.got = 0; S.again = 0; S.missed = []; S.flipped = false; paintStudy(); }
      });
      host.addEventListener('input', e => {
        const q = e.target.dataset.cdQ, a = e.target.dataset.cdA; const card = c.cards.find(x => x.id === (q || a)); if (!card) return;
        if (q) card.q = e.target.value; else card.a = e.target.value; changed('typing');
      });
      host.addEventListener('keydown', e => {
        if (S.mode !== 'study' || e.target.matches('textarea,input')) return;
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); $('[data-cd="flip"]', host)?.click(); }
        if (S.flipped && e.key === 'ArrowRight') grade(true); if (S.flipped && e.key === 'ArrowLeft') grade(false);
      });
      paintEdit();
    },
    exportFile: (file, ext, h) => {
      const cards = file.content.cards || [];
      if (ext === 'json') return { text: JSON.stringify(file.content, null, 2), mime: 'application/json;charset=utf-8' };
      if (ext === 'txt') return { text: cards.map(x => `${x.q}\t${x.a}`).join('\n'), mime: 'text/plain;charset=utf-8' };
      if (ext === 'html') return { text: `<!doctype html><meta charset="utf-8"><title>${esc(file.name)}</title><style>body{font-family:Georgia,serif;max-width:720px;margin:30px auto}div{border:1px solid #ddd;border-radius:10px;padding:14px 18px;margin:10px 0}b{display:block}</style><h1>${esc(file.name)}</h1>${cards.map(x => `<div><b>${esc(x.q)}</b>${esc(x.a)}</div>`).join('')}`, mime: 'text/html;charset=utf-8' };
      const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
      return { text: 'Front,Back\r\n' + cards.map(x => q(x.q) + ',' + q(x.a)).join('\r\n'), mime: 'text/csv;charset=utf-8' };
    }
  });

  /* =================================================================== Marigold Kanban */
  const LABELS = ['', 'gold', 'rose', 'blue', 'green'];
  C.registerApp({
    type: 'kanban', label: 'Marigold Kanban', short: 'Kanban', glyph: 'MK', color: '#e0e8f2', extensions: ['json', 'csv', 'md', 'html'],
    blurb: 'Track work in columns',
    landing: 'Move cards across columns as work progresses. Add due dates and labels, and drag cards between lists.',
    newContent: () => ({ columns: [{ id: uid(), title: 'To do', cards: [] }, { id: uid(), title: 'Doing', cards: [] }, { id: uid(), title: 'Done', cards: [] }] }),
    renderBody: () => `<div class="editor-toolbar"><span class="editor-toolbar-title">Marigold Kanban</span><button class="btn btn-secondary btn-small" data-k="add-col">Add column</button><span style="flex:1"></span><span class="small-print" id="k-summary"></span></div><div class="k-board" id="k-board"></div>`,
    mount: (file, host) => {
      const c = file.content; if (!Array.isArray(c.columns)) c.columns = [];
      const board = $('#k-board', host), today = todayISO();
      const findCard = id => { for (const col of c.columns) { const i = col.cards.findIndex(x => x.id === id); if (i >= 0) return { col, i, card: col.cards[i] }; } return null; };
      function paint() {
        const last = c.columns.length - 1;
        board.innerHTML = c.columns.map((col, ci) => `<section class="k-col" data-col="${col.id}"><header class="k-head"><input class="k-title" data-k-title="${col.id}" value="${esc(col.title)}" aria-label="Column name"><span class="k-count">${col.cards.length}</span><button class="btn btn-ghost btn-small" data-k-delcol="${col.id}" title="Remove column">Remove</button></header>
          <div class="k-cards" data-k-drop="${col.id}">${col.cards.map(card => {
            const overdue = card.due && card.due < today && ci !== last;
            return `<article class="k-card ${card.label ? 'label-' + card.label : ''} ${overdue ? 'overdue' : ''}" draggable="true" data-k-card="${card.id}"><textarea rows="2" data-k-text="${card.id}" aria-label="Card text">${esc(card.text)}</textarea><div class="k-meta"><button class="k-label" data-k-label="${card.id}" title="Change label">${card.label || 'no label'}</button><input type="date" data-k-due="${card.id}" value="${esc(card.due || '')}" aria-label="Due date"><span class="k-move"><button data-k-move="${card.id}" data-dir="-1" ${ci === 0 ? 'disabled' : ''} aria-label="Move left">‹</button><button data-k-move="${card.id}" data-dir="1" ${ci === last ? 'disabled' : ''} aria-label="Move right">›</button></span><button class="k-del" data-k-del="${card.id}" aria-label="Remove card">×</button></div></article>`;
          }).join('')}</div>
          <input class="k-new" data-k-new="${col.id}" placeholder="Add a card and press Enter" aria-label="New card"></section>`).join('') || '<div class="empty-state"><h3>No columns</h3><p>Add a column to begin.</p></div>';
        const total = c.columns.reduce((n, col) => n + col.cards.length, 0), overdue = c.columns.slice(0, -1).reduce((n, col) => n + col.cards.filter(x => x.due && x.due < today).length, 0);
        $('#k-summary', host).textContent = `${total} card${total === 1 ? '' : 's'}${overdue ? ` · ${overdue} overdue` : ''}`;
      }
      host.addEventListener('click', e => {
        const t = e.target.closest('button'); if (!t) return;
        if (t.dataset.k === 'add-col') { c.columns.push({ id: uid(), title: 'New column', cards: [] }); changed('adding'); paint(); }
        if (t.dataset.kDelcol) { const col = c.columns.find(x => x.id === t.dataset.kDelcol); if (col && (!col.cards.length || confirm(`Remove “${col.title}” and its ${col.cards.length} cards?`))) { c.columns = c.columns.filter(x => x !== col); changed('deleting'); paint(); } }
        if (t.dataset.kDel) { const f = findCard(t.dataset.kDel); if (f) { f.col.cards.splice(f.i, 1); changed('deleting'); paint(); } }
        if (t.dataset.kLabel) { const f = findCard(t.dataset.kLabel); if (f) { f.card.label = LABELS[(LABELS.indexOf(f.card.label || '') + 1) % LABELS.length]; changed('editing'); paint(); } }
        if (t.dataset.kMove) { const f = findCard(t.dataset.kMove); const ci = c.columns.indexOf(f.col), to = c.columns[ci + Number(t.dataset.dir)]; if (f && to) { f.col.cards.splice(f.i, 1); to.cards.push(f.card); changed('editing'); paint(); } }
      });
      host.addEventListener('input', e => {
        const d = e.target.dataset;
        if (d.kTitle) { const col = c.columns.find(x => x.id === d.kTitle); if (col) col.title = e.target.value; changed('typing'); }
        if (d.kText) { const f = findCard(d.kText); if (f) f.card.text = e.target.value; changed('typing'); }
      });
      host.addEventListener('change', e => { if (e.target.dataset.kDue) { const f = findCard(e.target.dataset.kDue); if (f) { f.card.due = e.target.value; changed('editing'); paint(); } } });
      host.addEventListener('keydown', e => {
        if (e.target.dataset.kNew && e.key === 'Enter' && e.target.value.trim()) { const col = c.columns.find(x => x.id === e.target.dataset.kNew); col.cards.push({ id: uid(), text: e.target.value.trim(), label: '', due: '' }); changed('adding'); const id = col.id; paint(); $(`[data-k-new="${id}"]`, host)?.focus(); }
      });
      let dragId = null;
      host.addEventListener('dragstart', e => { const card = e.target.closest('[data-k-card]'); if (!card) return; dragId = card.dataset.kCard; card.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', dragId); } catch {} });
      host.addEventListener('dragend', () => { dragId = null; $$('.dragging,.drag-over', host).forEach(x => x.classList.remove('dragging', 'drag-over')); });
      host.addEventListener('dragover', e => { const zone = e.target.closest('[data-k-drop]'); if (!zone || !dragId) return; e.preventDefault(); $$('.drag-over', host).forEach(x => x !== zone && x.classList.remove('drag-over')); zone.classList.add('drag-over'); });
      host.addEventListener('drop', e => {
        const zone = e.target.closest('[data-k-drop]'); if (!zone || !dragId) return; e.preventDefault();
        const f = findCard(dragId), to = c.columns.find(x => x.id === zone.dataset.kDrop); if (!f || !to) return;
        const cards = $$('[data-k-card]', zone).filter(x => x.dataset.kCard !== dragId); let index = cards.length;
        for (let i = 0; i < cards.length; i++) { const r = cards[i].getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { index = i; break; } }
        f.col.cards.splice(f.i, 1); to.cards.splice(index, 0, f.card); dragId = null; changed('editing'); paint();
      });
      paint();
    },
    exportFile: (file, ext, h) => {
      const cols = file.content.columns || [];
      if (ext === 'json') return { text: JSON.stringify(file.content, null, 2), mime: 'application/json;charset=utf-8' };
      if (ext === 'md') return { text: `# ${file.name}\n\n` + cols.map(col => `## ${col.title}\n\n` + (col.cards.map(x => `- [${col === cols[cols.length - 1] ? 'x' : ' '}] ${x.text}${x.due ? ` (due ${x.due})` : ''}`).join('\n') || '_Empty_')).join('\n\n') + '\n', mime: 'text/markdown;charset=utf-8' };
      if (ext === 'html') return { text: `<!doctype html><meta charset="utf-8"><title>${esc(file.name)}</title><style>body{font-family:Georgia,serif;padding:24px;background:#f6f4ee}.c{display:inline-block;vertical-align:top;width:230px;margin:0 10px 10px 0;background:#fff;border-radius:12px;padding:12px}.k{border:1px solid #e5e0d0;border-radius:8px;padding:8px;margin:6px 0;font-size:14px}</style>${cols.map(col => `<div class="c"><h3>${esc(col.title)}</h3>${col.cards.map(x => `<div class="k">${esc(x.text)}${x.due ? `<br><small>Due ${esc(x.due)}</small>` : ''}</div>`).join('')}</div>`).join('')}`, mime: 'text/html;charset=utf-8' };
      const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
      return { text: 'Column,Card,Label,Due\r\n' + cols.flatMap(col => col.cards.map(x => [col.title, x.text, x.label, x.due].map(q).join(','))).join('\r\n'), mime: 'text/csv;charset=utf-8' };
    }
  });

  /* =================================================================== Wisteria Journal */
  const MOODS = ['', 'Rough', 'Low', 'Okay', 'Good', 'Great'];
  C.registerApp({
    type: 'journal', label: 'Wisteria Journal', short: 'Journal', glyph: 'WJ', color: '#eae2ee', extensions: ['md', 'txt', 'html', 'json'],
    blurb: 'One page a day, with a streak',
    landing: 'A private daily journal. One entry per day, a simple mood note, and a streak to keep the habit going.',
    newContent: () => ({ entries: [{ id: uid(), date: todayISO(), mood: 0, text: '' }] }),
    renderBody: () => `<div class="editor-toolbar"><span class="editor-toolbar-title">Wisteria Journal</span><button class="btn btn-secondary btn-small" data-j="today">Today’s page</button><span style="flex:1"></span><span class="small-print" id="j-streak"></span></div><div class="journal-layout"><aside class="journal-list" id="j-list"></aside><section class="journal-page" id="j-page"></section></div>`,
    mount: (file, host) => {
      const c = file.content; if (!Array.isArray(c.entries)) c.entries = [];
      let sel = (c.entries.slice().sort((a, b) => b.date.localeCompare(a.date))[0] || {}).id, query = '';
      const words = text => (String(text).trim().match(/\S+/g) || []).length;
      function streak() {
        const dates = new Set(c.entries.filter(e => words(e.text) > 0).map(e => e.date)); let n = 0; const d = new Date();
        const iso = x => new Date(x.getTime() - x.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
        if (!dates.has(iso(d))) d.setDate(d.getDate() - 1);
        while (dates.has(iso(d))) { n++; d.setDate(d.getDate() - 1); } return n;
      }
      function paintList() {
        const list = c.entries.slice().sort((a, b) => b.date.localeCompare(a.date)).filter(e => !query || (e.text + e.date).toLowerCase().includes(query));
        $('#j-list', host).innerHTML = `<input class="text-input" id="j-search" placeholder="Search entries…" value="${esc(query)}" aria-label="Search entries">` + (list.map(e => `<button class="j-item ${e.id === sel ? 'active' : ''}" data-j-open="${e.id}"><strong>${esc(shortDate(e.date))}</strong><small>${esc((e.text.split('\n').find(l => l.trim()) || 'Empty page').slice(0, 60))}${e.mood ? ' · ' + MOODS[e.mood] : ''}</small></button>`).join('') || '<div class="small-print" style="padding:10px">No entries match.</div>');
        const n = streak(); $('#j-streak', host).textContent = n ? `${n}-day streak` : `${c.entries.length} entr${c.entries.length === 1 ? 'y' : 'ies'}`;
        if (query) { const input = $('#j-search', host); input.focus(); input.setSelectionRange(query.length, query.length); }
      }
      function paintPage() {
        const e = c.entries.find(x => x.id === sel), page = $('#j-page', host);
        if (!e) { page.innerHTML = `<div class="empty-state"><h3>No page open</h3><p>Start today’s page to begin.</p></div>`; return; }
        page.innerHTML = `<div class="j-head"><input type="date" id="j-date" value="${esc(e.date)}" aria-label="Entry date"><div class="seg" role="group" aria-label="Mood">${MOODS.slice(1).map((m, i) => `<button class="seg-btn ${e.mood === i + 1 ? 'active' : ''}" data-j-mood="${i + 1}">${m}</button>`).join('')}</div><button class="btn btn-ghost btn-small" data-j="delete">Delete</button></div><textarea id="j-text" class="journal-text" placeholder="What happened today? What is on your mind?" aria-label="Journal entry">${esc(e.text)}</textarea><div class="small-print" id="j-count">${words(e.text)} words</div>`;
      }
      host.addEventListener('click', ev => {
        const open = ev.target.closest('[data-j-open]'); if (open) { sel = open.dataset.jOpen; paintList(); paintPage(); return; }
        const mood = ev.target.closest('[data-j-mood]'); if (mood) { const e = c.entries.find(x => x.id === sel); e.mood = e.mood === Number(mood.dataset.jMood) ? 0 : Number(mood.dataset.jMood); changed('editing'); paintList(); paintPage(); return; }
        const b = ev.target.closest('[data-j]'); if (!b) return;
        if (b.dataset.j === 'today') { let e = c.entries.find(x => x.date === todayISO()); if (!e) { e = { id: uid(), date: todayISO(), mood: 0, text: '' }; c.entries.push(e); changed('adding'); } sel = e.id; query = ''; paintList(); paintPage(); $('#j-text', host)?.focus(); }
        if (b.dataset.j === 'delete') { const e = c.entries.find(x => x.id === sel); if (e && confirm(`Delete the entry for ${shortDate(e.date)}?`)) { c.entries = c.entries.filter(x => x !== e); sel = (c.entries[0] || {}).id; changed('deleting'); paintList(); paintPage(); } }
      });
      host.addEventListener('input', ev => {
        if (ev.target.id === 'j-search') { query = ev.target.value.toLowerCase(); paintList(); return; }
        const e = c.entries.find(x => x.id === sel); if (!e) return;
        if (ev.target.id === 'j-text') { e.text = ev.target.value; $('#j-count', host).textContent = `${words(e.text)} words`; changed('typing'); clearTimeout(host._jt); host._jt = setTimeout(paintList, 400); }
      });
      host.addEventListener('change', ev => { if (ev.target.id === 'j-date') { const e = c.entries.find(x => x.id === sel); if (e && ev.target.value) { e.date = ev.target.value; changed('editing'); paintList(); } } });
      paintList(); paintPage();
    },
    exportFile: (file, ext, h) => {
      const entries = (file.content.entries || []).slice().sort((a, b) => a.date.localeCompare(b.date));
      if (ext === 'json') return { text: JSON.stringify(file.content, null, 2), mime: 'application/json;charset=utf-8' };
      if (ext === 'html') return { text: `<!doctype html><meta charset="utf-8"><title>${esc(file.name)}</title><style>body{font-family:Georgia,serif;max-width:680px;margin:30px auto;line-height:1.6}small{color:#888}</style><h1>${esc(file.name)}</h1>${entries.map(e => `<h2>${esc(shortDate(e.date))}</h2>${e.mood ? `<small>Mood: ${MOODS[e.mood]}</small>` : ''}<p>${esc(e.text).replace(/\n/g, '<br>')}</p>`).join('')}`, mime: 'text/html;charset=utf-8' };
      if (ext === 'txt') return { text: entries.map(e => `${e.date}${e.mood ? ' (' + MOODS[e.mood] + ')' : ''}\n${e.text}`).join('\n\n----\n\n'), mime: 'text/plain;charset=utf-8' };
      return { text: `# ${file.name}\n\n` + entries.map(e => `## ${e.date}${e.mood ? ' · ' + MOODS[e.mood] : ''}\n\n${e.text}\n`).join('\n'), mime: 'text/markdown;charset=utf-8' };
    }
  });
})();

/* Flora tools, part two: Text Encoding Lab, Clover Calculator, Unit Converter, Grade Calculator,
   Timetable, Countdowns and Word Stats. Each registers with FloraCore; data lives in the Flora database. */
(function () {
  'use strict';
  const C = window.FloraCore;
  if (!C) return;
  const { esc, $, $$, uid } = C;
  const E = window.FloraEncoding;
  let gradeState = null, ttState = null, cdState = null;
  const store = { get: (key, fallback) => C.getMeta('tool:' + key, fallback), set: (key, value) => C.setMeta('tool:' + key, value) };
  const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const head = (kicker, title, sub, extra = '') => `<div class="welcome-row"><div><div class="page-kicker">${kicker}</div><h1 class="page-title">${title}</h1><p class="page-subtitle">${sub}</p></div><div class="welcome-actions">${extra}<button class="btn btn-secondary" data-view="tools">All tools</button></div></div>`;
  /* Route handlers through properties so each render replaces the last tool's handlers. */
  const bind = (root, h = {}) => { root.onclick = h.click || null; root.oninput = h.input || null; root.onchange = h.change || null; root.onkeydown = h.keydown || null; };
  C.bindRoot = bind;
  window.addEventListener('flora-tool-reset', () => { gradeState = ttState = cdState = null; });
  const timers = new Set();
  const stopTimers = () => { timers.forEach(clearInterval); timers.clear(); };

  /* =================================================================== Text Encoding Lab */
  const lab = { text: 'Café – naïve “quotes” – 你好 😀 – 5€', enc: 'utf-8', unsupported: null, lineEndings: null, loaded: '' };
  const SAMPLES = ['Café – naïve “quotes” – 你好 😀 – 5€', 'Plain English text, nothing fancy.', 'Zażółć gęślą jaźń — Привет, мир — مرحبا', 'Line one\r\nLine two\nLine three'];
  C.registerTool({
    id: 'encoding', title: 'Text Encoding Lab', short: 'EN', cat: 'Utilities', label: 'UTF-8, UTF-16, ASCII and more',
    desc: 'Paste or open text to see how many bytes each encoding needs, which characters would be lost, and the raw bytes.',
    leave: stopTimers,
    render: root => {
      const s = C.settings; if (!lab.unsupported) lab.unsupported = s.asciiFallback; if (!lab.lineEndings) lab.lineEndings = s.lineEndings;
      root.innerHTML = head('FLORA TOOL / TEXT', 'Text Encoding Lab', 'See exactly what happens to your text in each encoding before you export it.', `<button class="btn btn-secondary" data-view-settings="encoding">Encoding settings</button>`) + `
        <div class="lab-grid"><section class="panel lab-input"><label class="amethyst-label" for="enc-text">Your text</label><textarea id="enc-text" class="text-area" rows="7" spellcheck="false" aria-label="Text to analyse"></textarea>
          <div class="lab-actions"><button class="btn btn-secondary btn-small" data-lab="sample">Try a sample</button><label class="btn btn-secondary btn-small file-btn">Open a text file<input type="file" id="enc-file" accept=".txt,.csv,.md,.html,.json,.xml,.js,.css,.py,text/*" hidden></label><button class="btn btn-ghost btn-small" data-lab="clear">Clear</button></div>
          <p class="small-print" id="enc-loaded">${esc(lab.loaded)}</p>
          <div class="lab-options"><div class="form-field"><label for="enc-unsupported">If a character does not fit (ASCII, Latin-1, Windows-1252)</label><select id="enc-unsupported" class="select-control">${[['transliterate', 'Simplify (é becomes e)'], ['replace', 'Replace with a question mark'], ['escape', 'Write an escape code']].map(([v, l]) => `<option value="${v}" ${lab.unsupported === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="form-field"><label for="enc-lines">Line endings</label><select id="enc-lines" class="select-control">${[['keep', 'Keep as they are'], ['lf', 'LF (Mac, Linux)'], ['crlf', 'CRLF (Windows)']].map(([v, l]) => `<option value="${v}" ${lab.lineEndings === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div></section>
          <section class="panel" id="enc-results"></section></div>
        <div class="lab-grid lab-second"><section class="panel"><h3>Bytes</h3><p class="panel-subtitle" id="enc-bytes-sub"></p><pre class="hexdump" id="enc-hex"></pre></section><section class="panel"><h3>Characters outside ASCII</h3><p class="panel-subtitle">Each one and how UTF-8 stores it.</p><div id="enc-chars" class="char-list"></div></section></div>`;
      $('#enc-text', root).value = lab.text;
      const opts = () => ({ unsupported: lab.unsupported, lineEndings: lab.lineEndings });
      function paint() {
        const rows = E.compare(lab.text, opts());
        $('#enc-results', root).innerHTML = `<h3>Size and compatibility</h3><p class="panel-subtitle">${[...lab.text].length} characters. Choose a row to see its bytes.</p><div class="enc-table">${rows.map(r => `<div class="enc-row ${r.id === lab.enc ? 'active' : ''}" data-enc="${r.id}" role="button" tabindex="0"><div class="enc-name"><strong>${esc(r.label)}</strong><small>${esc(r.note)}</small></div><div class="enc-size">${r.size} B</div><div class="enc-status ${r.lostCount ? 'lossy' : 'safe'}">${r.lostCount ? `${r.lostCount} lost` : 'Lossless'}</div><button class="btn btn-ghost btn-small" data-enc-dl="${r.id}">Download</button></div>`).join('')}</div>`;
        const res = E.encode(lab.text, lab.enc, opts());
        $('#enc-hex', root).textContent = E.hexDump(res.bytes) || '(empty)';
        $('#enc-bytes-sub', root).textContent = `${E.info(lab.enc).label}: ${res.bytes.length} bytes${res.count ? ` · ${res.count} character${res.count === 1 ? '' : 's'} changed: ${[...res.lost].slice(0, 12).join(' ')}` : ''}`;
        const uniq = [...new Set([...lab.text].filter(ch => ch.codePointAt(0) > 127))].slice(0, 60);
        $('#enc-chars', root).innerHTML = uniq.length ? uniq.map(ch => `<span class="char-chip"><b>${esc(ch)}</b><small>${E.codePointLabel(ch)}</small><small>${[...new TextEncoder().encode(ch)].map(v => v.toString(16).toUpperCase().padStart(2, '0')).join(' ')}</small></span>`).join('') : '<p class="small-print">Only ASCII characters. Every encoding stores this text the same way.</p>';
      }
      paint();
      bind(root, {
        input: e => { if (e.target.id === 'enc-text') { lab.text = e.target.value; paint(); } },
        change: async e => {
          if (e.target.id === 'enc-unsupported') { lab.unsupported = e.target.value; paint(); }
          if (e.target.id === 'enc-lines') { lab.lineEndings = e.target.value; paint(); }
          if (e.target.id === 'enc-file' && e.target.files[0]) {
            const file = e.target.files[0], read = await C.readFileText(file);
            lab.text = read.text.slice(0, 200000); lab.loaded = `${file.name}: read as ${E.info(read.encoding).label} (${read.reason.toLowerCase()})${read.invalid ? ` · ${read.invalid} unreadable character${read.invalid === 1 ? '' : 's'}` : ''}`;
            $('#enc-text', root).value = lab.text; $('#enc-loaded', root).textContent = lab.loaded; paint();
          }
        },
        click: e => {
          const dl = e.target.closest('[data-enc-dl]');
          if (dl) { const r = E.encode(lab.text, dl.dataset.encDl, opts()); C.downloadBlob(new Blob([r.bytes], { type: 'text/plain; charset=' + r.charset }), `text-${dl.dataset.encDl}.txt`); C.toast(`Saved as ${E.info(dl.dataset.encDl).short}`, 'success'); return; }
          const row = e.target.closest('[data-enc]'); if (row) { lab.enc = row.dataset.enc; paint(); return; }
          const act = e.target.closest('[data-lab]');
          if (act?.dataset.lab === 'sample') { const i = (SAMPLES.indexOf(lab.text) + 1) % SAMPLES.length; lab.text = SAMPLES[i]; $('#enc-text', root).value = lab.text; paint(); }
          if (act?.dataset.lab === 'clear') { lab.text = ''; $('#enc-text', root).value = ''; paint(); }
          if (e.target.closest('[data-view-settings]')) C.openSettings('encoding');
        }
      });
    }
  });

  /* =================================================================== Clover Calculator */
  function evaluate(source, degrees) {
    const text = String(source).replace(/×/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-').replace(/π/g, 'pi').replace(/√/g, 'sqrt').replace(/\s+/g, '');
    const tokens = text.match(/\d+\.?\d*(?:e[+-]?\d+)?|\.\d+|[a-z]+|[-+*/^%!(),]/gi); if (!tokens) throw new Error('Empty');
    let p = 0; const peek = () => tokens[p], take = () => tokens[p++];
    const toRad = x => degrees ? x * Math.PI / 180 : x, fromRad = x => degrees ? x * 180 / Math.PI : x;
    const fns = { sin: x => Math.sin(toRad(x)), cos: x => Math.cos(toRad(x)), tan: x => Math.tan(toRad(x)), asin: x => fromRad(Math.asin(x)), acos: x => fromRad(Math.acos(x)), atan: x => fromRad(Math.atan(x)), ln: Math.log, log: Math.log10, sqrt: Math.sqrt, abs: Math.abs, exp: Math.exp, cbrt: Math.cbrt, round: Math.round, floor: Math.floor, ceil: Math.ceil };
    const consts = { pi: Math.PI, e: Math.E, ans: window._floraAns || 0 };
    const factorial = n => { if (n < 0 || n !== Math.floor(n) || n > 170) throw new Error('Factorial'); let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
    function expr() { let v = term(); while (peek() === '+' || peek() === '-') { const op = take(); const r = term(); v = op === '+' ? v + r : v - r; } return v; }
    function term() {
      let v = power();
      for (;;) {
        const t = peek();
        if (t === '*' || t === '/') { take(); const r = power(); v = t === '*' ? v * r : v / r; }
        else if (t && (t === '(' || /^[a-z.\d]/i.test(t))) v *= power();   // implicit multiplication: 2(3), 2pi
        else break;
      }
      return v;
    }
    function power() { const base = unary(); if (peek() === '^') { take(); return Math.pow(base, power()); } return base; }
    function unary() { if (peek() === '-') { take(); return -unary(); } if (peek() === '+') { take(); return unary(); } return postfix(); }
    function postfix() { let v = primary(); for (;;) { if (peek() === '%') { take(); v /= 100; } else if (peek() === '!') { take(); v = factorial(v); } else break; } return v; }
    function primary() {
      const t = take(); if (t === undefined) throw new Error('Unexpected end');
      if (/^[\d.]/.test(t)) return parseFloat(t);
      if (t === '(') { const v = expr(); if (take() !== ')') throw new Error('Missing )'); return v; }
      const name = t.toLowerCase();
      if (fns[name]) { if (take() !== '(') throw new Error('Needs ('); const v = expr(); if (take() !== ')') throw new Error('Missing )'); return fns[name](v); }
      if (name in consts) return consts[name];
      throw new Error('Unknown “' + t + '”');
    }
    const value = expr(); if (p < tokens.length) throw new Error('Unexpected “' + tokens[p] + '”');
    if (!Number.isFinite(value)) throw new Error('Not a number');
    return value;
  }
  const fmtNum = n => { const r = Number(n.toPrecision(12)); return Math.abs(r) >= 1e15 || (Math.abs(r) < 1e-9 && r !== 0) ? r.toExponential(6) : String(r); };
  const calc = { expr: '', history: [], sci: false, degrees: true };
  C.registerTool({
    id: 'calc', title: 'Clover Calculator', short: 'CC', cat: 'Utilities', label: 'Calculator',
    desc: 'A calculator that understands brackets, percentages and, when you want it, trigonometry and logarithms.',
    render: root => {
      const keys = [['C', 'clear'], ['(', '('], [')', ')'], ['÷', '÷'], ['7', '7'], ['8', '8'], ['9', '9'], ['×', '×'], ['4', '4'], ['5', '5'], ['6', '6'], ['−', '−'], ['1', '1'], ['2', '2'], ['3', '3'], ['+', '+'], ['0', '0'], ['.', '.'], ['⌫', 'back'], ['=', 'eval']];
      const sci = [['sin', 'sin('], ['cos', 'cos('], ['tan', 'tan('], ['ln', 'ln('], ['log', 'log('], ['√', 'sqrt('], ['x²', '^2'], ['xʸ', '^'], ['π', 'π'], ['e', 'e'], ['%', '%'], ['n!', '!']];
      root.innerHTML = head('FLORA TOOL / MATHS', 'Clover Calculator', 'Type or tap. Press Enter for the answer.') + `<div class="calc-layout"><section class="calc-card"><div class="calc-toggles"><button class="seg-btn ${calc.sci ? 'active' : ''}" data-calc-toggle="sci">Scientific</button><button class="seg-btn ${calc.degrees ? 'active' : ''}" data-calc-toggle="deg">${calc.degrees ? 'Degrees' : 'Radians'}</button></div>
        <input id="calc-input" class="calc-input" value="${esc(calc.expr)}" autocomplete="off" spellcheck="false" aria-label="Expression" inputmode="decimal"><div class="calc-preview" id="calc-preview"> </div>
        ${calc.sci ? `<div class="calc-sci">${sci.map(([l, v]) => `<button class="calc-key sci" data-k="${esc(v)}">${l}</button>`).join('')}</div>` : ''}
        <div class="calc-keys">${keys.map(([l, v]) => `<button class="calc-key ${/[÷×−+]/.test(l) ? 'op' : l === '=' ? 'eq' : l === 'C' || l === '⌫' ? 'util' : ''}" data-k="${v}">${l}</button>`).join('')}</div></section>
        <aside class="panel calc-history"><h3>History</h3><div id="calc-hist">${calc.history.length ? calc.history.map((h, i) => `<button class="calc-hist-item" data-hist="${i}"><span>${esc(h.e)}</span><strong>= ${esc(h.r)}</strong></button>`).join('') : '<p class="small-print">Your last calculations appear here.</p>'}</div></aside></div>`;
      const input = $('#calc-input', root), preview = $('#calc-preview', root);
      const live = () => { calc.expr = input.value; if (!calc.expr.trim()) { preview.textContent = ' '; return; } try { preview.textContent = '= ' + fmtNum(evaluate(calc.expr, calc.degrees)); preview.classList.remove('err'); } catch (err) { preview.textContent = ' '; } };
      const commit = () => {
        try { const r = evaluate(calc.expr, calc.degrees), shown = fmtNum(r); window._floraAns = r; calc.history.unshift({ e: calc.expr, r: shown }); calc.history = calc.history.slice(0, 12); calc.expr = shown; C.renderView(); setTimeout(() => $('#calc-input')?.focus(), 0); }
        catch (err) { preview.textContent = err.message; preview.classList.add('err'); }
      };
      live();
      bind(root, {
        input: e => { if (e.target.id === 'calc-input') live(); },
        keydown: e => { if (e.target.id === 'calc-input' && e.key === 'Enter') { e.preventDefault(); commit(); } },
        click: e => {
          const t = e.target.closest('[data-calc-toggle]'); if (t) { if (t.dataset.calcToggle === 'sci') calc.sci = !calc.sci; else calc.degrees = !calc.degrees; C.renderView(); return; }
          const h = e.target.closest('[data-hist]'); if (h) { calc.expr = calc.history[Number(h.dataset.hist)].r; input.value = calc.expr; live(); input.focus(); return; }
          const k = e.target.closest('[data-k]'); if (!k) return; const v = k.dataset.k;
          if (v === 'clear') { input.value = ''; } else if (v === 'back') { input.value = input.value.slice(0, -1); } else if (v === 'eval') { calc.expr = input.value; commit(); return; } else input.value += v;
          live(); input.focus();
        }
      });
    }
  });

  /* =================================================================== Unit Converter */
  const UNITS = {
    Length: { m: ['Metres', 1], km: ['Kilometres', 1000], cm: ['Centimetres', .01], mm: ['Millimetres', .001], in: ['Inches', .0254], ft: ['Feet', .3048], yd: ['Yards', .9144], mi: ['Miles', 1609.344] },
    Mass: { kg: ['Kilograms', 1], g: ['Grams', .001], mg: ['Milligrams', 1e-6], t: ['Tonnes', 1000], lb: ['Pounds', .45359237], oz: ['Ounces', .028349523125], st: ['Stone', 6.35029318] },
    Volume: { l: ['Litres', 1], ml: ['Millilitres', .001], tsp: ['Teaspoons (US)', .00492892159375], tbsp: ['Tablespoons (US)', .01478676478125], cup: ['Cups (US)', .2365882365], pt: ['Pints (US)', .473176473], gal: ['Gallons (US)', 3.785411784], floz: ['Fluid ounces (US)', .0295735295625] },
    Area: { m2: ['Square metres', 1], cm2: ['Square centimetres', 1e-4], km2: ['Square kilometres', 1e6], ha: ['Hectares', 1e4], ft2: ['Square feet', .09290304], ac: ['Acres', 4046.8564224], mi2: ['Square miles', 2589988.110336] },
    Speed: { ms: ['Metres per second', 1], kmh: ['Kilometres per hour', 1 / 3.6], mph: ['Miles per hour', .44704], kn: ['Knots', .514444444], fts: ['Feet per second', .3048] },
    Time: { s: ['Seconds', 1], ms: ['Milliseconds', .001], min: ['Minutes', 60], h: ['Hours', 3600], d: ['Days', 86400], wk: ['Weeks', 604800] },
    Data: { B: ['Bytes', 1], KB: ['Kilobytes (1024)', 1024], MB: ['Megabytes', 1048576], GB: ['Gigabytes', 1073741824], TB: ['Terabytes', 1099511627776], bit: ['Bits', .125] },
    Temperature: { C: ['Celsius'], F: ['Fahrenheit'], K: ['Kelvin'] }
  };
  const convert = (cat, value, from, to) => {
    if (cat === 'Temperature') { const c = from === 'C' ? value : from === 'F' ? (value - 32) * 5 / 9 : value - 273.15; return to === 'C' ? c : to === 'F' ? c * 9 / 5 + 32 : c + 273.15; }
    return value * UNITS[cat][from][1] / UNITS[cat][to][1];
  };
  const unit = { cat: 'Length', value: '1', from: 'm', to: 'ft' };
  C.registerTool({
    id: 'units', title: 'Unit Converter', short: 'UC', cat: 'Utilities', label: 'Convert',
    desc: 'Length, mass, volume, area, speed, time, data and temperature, converted as you type.',
    render: root => {
      root.innerHTML = head('FLORA TOOL / CONVERT', 'Unit Converter', 'Pick a kind of measurement, then type a number.') + `<div class="chip-row" id="unit-cats">${Object.keys(UNITS).map(cat => `<button class="choice-chip ${unit.cat === cat ? 'active' : ''}" data-unit-cat="${cat}">${cat}</button>`).join('')}</div><section class="panel unit-panel"><div class="unit-row"><input id="unit-value" class="text-input unit-input" type="number" step="any" value="${esc(unit.value)}" aria-label="Value"><select id="unit-from" class="select-control" aria-label="From"></select></div><button class="btn btn-secondary unit-swap" data-unit-swap>Swap</button><div class="unit-row"><div class="unit-result" id="unit-result">0</div><select id="unit-to" class="select-control" aria-label="To"></select></div></section><section class="panel" style="margin-top:12px"><h3>Everything at once</h3><div id="unit-all" class="unit-all"></div></section>`;
      const fill = () => { const opts = Object.entries(UNITS[unit.cat]).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join(''); $('#unit-from', root).innerHTML = opts; $('#unit-to', root).innerHTML = opts; if (!UNITS[unit.cat][unit.from]) unit.from = Object.keys(UNITS[unit.cat])[0]; if (!UNITS[unit.cat][unit.to]) unit.to = Object.keys(UNITS[unit.cat])[1]; $('#unit-from', root).value = unit.from; $('#unit-to', root).value = unit.to; };
      const paint = () => {
        const v = parseFloat(unit.value), ok = Number.isFinite(v);
        $('#unit-result', root).textContent = ok ? fmtNum(convert(unit.cat, v, unit.from, unit.to)) : '—';
        $('#unit-all', root).innerHTML = ok ? Object.entries(UNITS[unit.cat]).map(([k, d]) => `<div class="unit-all-row"><span>${d[0]}</span><strong>${fmtNum(convert(unit.cat, v, unit.from, k))}</strong></div>`).join('') : '<p class="small-print">Enter a number to see the conversions.</p>';
      };
      fill(); paint();
      bind(root, {
        input: e => { if (e.target.id === 'unit-value') { unit.value = e.target.value; paint(); } },
        change: e => { if (e.target.id === 'unit-from') unit.from = e.target.value; if (e.target.id === 'unit-to') unit.to = e.target.value; paint(); },
        click: e => {
          const c = e.target.closest('[data-unit-cat]'); if (c) { unit.cat = c.dataset.unitCat; const keys = Object.keys(UNITS[unit.cat]); unit.from = keys[0]; unit.to = keys[1]; C.renderView(); return; }
          if (e.target.closest('[data-unit-swap]')) { [unit.from, unit.to] = [unit.to, unit.from]; $('#unit-from', root).value = unit.from; $('#unit-to', root).value = unit.to; paint(); }
        }
      });
    }
  });

  /* =================================================================== Grade Calculator */
  const letter = pct => pct >= 90 ? ['A', 4] : pct >= 80 ? ['B', 3] : pct >= 70 ? ['C', 2] : pct >= 60 ? ['D', 1] : ['F', 0];
  C.registerTool({
    id: 'grades', title: 'Grade Calculator', short: 'GC', cat: 'Study', label: 'Weighted grades',
    desc: 'Enter your marks and how much each is worth. See your current grade and what you need on what is left.',
    render: async root => {
      if (!gradeState) gradeState = await store.get('grades', { active: null, courses: [] });
      if (C.currentView !== 'grades') return;
      const g = gradeState; if (!g.courses.length) { g.courses.push({ id: uid(), name: 'My course', target: 70, items: [{ id: uid(), name: 'Homework', score: '', max: 100, weight: 20 }, { id: uid(), name: 'Midterm', score: '', max: 100, weight: 30 }, { id: uid(), name: 'Final exam', score: '', max: 100, weight: 50 }] }); g.active = g.courses[0].id; }
      if (!g.courses.some(c => c.id === g.active)) g.active = g.courses[0].id;
      const course = () => g.courses.find(c => c.id === g.active);
      const save = () => store.set('grades', g);
      const draw = () => {
        const c = course();
        root.innerHTML = head('FLORA TOOL / STUDY', 'Grade Calculator', 'Weights do not have to add up to 100. Leave a mark blank for work you have not done yet.') + `
          <div class="chip-row">${g.courses.map(x => `<button class="choice-chip ${x.id === g.active ? 'active' : ''}" data-gcourse="${x.id}">${esc(x.name)}</button>`).join('')}<button class="choice-chip" data-g="add-course">New course</button></div>
          <div class="grade-layout"><section class="panel"><div class="grade-top"><input class="text-input" id="g-name" value="${esc(c.name)}" aria-label="Course name"><button class="btn btn-ghost btn-small" data-g="del-course">Delete course</button></div>
            <div class="grade-table"><div class="grade-head"><span>Assessment</span><span>Mark</span><span>Out of</span><span>Weight %</span><span></span></div>${c.items.map(it => `<div class="grade-row" data-item="${it.id}"><input class="text-input" data-f="name" value="${esc(it.name)}" aria-label="Assessment name"><input class="text-input" data-f="score" type="number" step="any" min="0" value="${esc(it.score)}" placeholder="—" aria-label="Mark"><input class="text-input" data-f="max" type="number" step="any" min="0" value="${esc(it.max)}" aria-label="Out of"><input class="text-input" data-f="weight" type="number" step="any" min="0" value="${esc(it.weight)}" aria-label="Weight"><button class="btn btn-ghost btn-small" data-g="del-item" data-id="${it.id}" aria-label="Remove">×</button></div>`).join('')}</div>
            <button class="btn btn-secondary btn-small" data-g="add-item" style="margin-top:10px">Add assessment</button></section>
            <aside class="panel grade-result" id="g-result"></aside></div>`;
        result();
      };
      const result = () => {
        const c = course(), box = $('#g-result', root); if (!box) return;
        let earned = 0, graded = 0, total = 0;
        c.items.forEach(it => { const w = parseFloat(it.weight) || 0, max = parseFloat(it.max) || 0; total += w; if (it.score !== '' && max > 0) { earned += (parseFloat(it.score) / max) * w; graded += w; } });
        const pending = total - graded, current = graded ? earned / graded * 100 : null, target = Number(c.target) || 70;
        const needed = pending > 0 ? (target / 100 * total - earned) / pending * 100 : null;
        const [l, gpa] = current === null ? ['—', null] : letter(current);
        box.innerHTML = `<div class="page-kicker">CURRENT GRADE</div><div class="grade-big" id="g-big">${current === null ? '—' : current.toFixed(1) + '%'}</div><div class="grade-meta"><span class="tag">${l}</span>${gpa === null ? '' : `<span class="tag">GPA about ${gpa.toFixed(1)}</span>`}</div>
          <div class="grade-bar"><span style="width:${Math.min(100, current || 0)}%"></span></div><p class="small-print">${graded}% of ${total}% of the weighting is marked.</p>
          <div class="form-field" style="margin-top:14px"><label for="g-target">Target for the whole course (%)</label><input id="g-target" class="text-input" type="number" min="0" max="100" value="${target}"></div>
          <div class="grade-need">${pending <= 0 ? 'Everything is marked.' : needed > 100 ? `Even full marks on the remaining ${pending}% would leave you short of ${target}%.` : needed <= 0 ? `You have already reached ${target}%.` : `You need about <strong>${needed.toFixed(1)}%</strong> on the remaining ${pending}%.`}</div>`;
      };
      draw();
      bind(root, {
        input: e => {
          const c = course();
          if (e.target.id === 'g-target') { c.target = e.target.value; result(); $('#g-target', root).focus(); save(); return; }
          if (e.target.id === 'g-name') { c.name = e.target.value; save(); return; }
          const row = e.target.closest('[data-item]'); if (!row) return;
          const it = c.items.find(x => x.id === row.dataset.item); it[e.target.dataset.f] = e.target.value; result(); save();
        },
        change: e => { if (e.target.id === 'g-name') draw(); },
        click: e => {
          const sw = e.target.closest('[data-gcourse]'); if (sw) { g.active = sw.dataset.gcourse; save(); draw(); return; }
          const b = e.target.closest('[data-g]'); if (!b) return; const c = course();
          if (b.dataset.g === 'add-item') { c.items.push({ id: uid(), name: 'New assessment', score: '', max: 100, weight: 10 }); save(); draw(); }
          if (b.dataset.g === 'del-item') { c.items = c.items.filter(x => x.id !== b.dataset.id); save(); draw(); }
          if (b.dataset.g === 'add-course') { const n = { id: uid(), name: 'New course', target: 70, items: [{ id: uid(), name: 'Assessment 1', score: '', max: 100, weight: 50 }, { id: uid(), name: 'Assessment 2', score: '', max: 100, weight: 50 }] }; g.courses.push(n); g.active = n.id; save(); draw(); }
          if (b.dataset.g === 'del-course' && confirm(`Delete “${c.name}”?`)) { g.courses = g.courses.filter(x => x !== c); g.active = g.courses[0]?.id; save(); C.renderView(); }
        }
      });
    }
  });

  /* =================================================================== Timetable */
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const defaultTimetable = () => ({ days: 5, periods: [['09:00', '10:00'], ['10:00', '11:00'], ['11:20', '12:20'], ['12:20', '13:20'], ['14:00', '15:00'], ['15:00', '16:00']].map(([s, e]) => ({ id: uid(), start: s, end: e })), cells: {} });
  const hue = text => { let h = 0; for (const ch of String(text).toLowerCase().trim()) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
  const toMin = t => { const [h, m] = String(t).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const dayIndex = () => (new Date().getDay() + 6) % 7;
  C.registerTool({
    id: 'timetable', title: 'Timetable', short: 'TT', cat: 'Study', label: 'Weekly planner',
    desc: 'A weekly grid of lessons or sessions. Today is highlighted, and today’s schedule appears on your home page.',
    leave: stopTimers,
    today: async () => {
      const t = await store.get('timetable', null); if (!t) return `<button class="today-card" data-view="timetable"><span class="today-kicker">Timetable</span><strong>Set up your week</strong><small>Add your lessons once and see today’s here.</small></button>`;
      const day = dayIndex(); if (day >= t.days) return `<button class="today-card" data-view="timetable"><span class="today-kicker">Timetable</span><strong>No lessons today</strong><small>Enjoy the day off.</small></button>`;
      const now = new Date().getHours() * 60 + new Date().getMinutes();
      const slots = t.periods.map(p => ({ ...p, text: (t.cells[`${day}-${p.id}`] || '').trim() })).filter(p => p.text);
      const next = slots.find(p => toMin(p.end) > now);
      return `<button class="today-card" data-view="timetable"><span class="today-kicker">Today</span><strong>${next ? esc(next.text) : slots.length ? 'Lessons are done' : 'Nothing scheduled'}</strong><small>${next ? `${toMin(next.start) <= now ? 'Now until' : 'Next at'} ${next.start === '' ? '' : toMin(next.start) <= now ? next.end : next.start} · ${slots.length} today` : slots.length ? `${slots.length} finished today` : 'Add lessons in your timetable.'}</small></button>`;
    },
    render: async root => {
      if (!ttState) ttState = await store.get('timetable', null) || defaultTimetable();
      if (C.currentView !== 'timetable') return;
      const t = ttState; let saveTimer = null;
      const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => store.set('timetable', t), 350); };
      const draw = () => {
        const day = dayIndex(), now = new Date().getHours() * 60 + new Date().getMinutes();
        root.innerHTML = head('FLORA TOOL / STUDY', 'Timetable', 'Type a subject into any slot. Matching subjects share a colour.', `<button class="btn btn-secondary" data-tt="sheet">Save as spreadsheet</button>`) + `
          <div class="tt-controls"><div class="seg"><button class="seg-btn ${t.days === 5 ? 'active' : ''}" data-tt-days="5">Mon to Fri</button><button class="seg-btn ${t.days === 6 ? 'active' : ''}" data-tt-days="6">Mon to Sat</button><button class="seg-btn ${t.days === 7 ? 'active' : ''}" data-tt-days="7">Full week</button></div><button class="btn btn-secondary btn-small" data-tt="add-period">Add period</button></div>
          <div class="tt-scroll"><table class="tt-table"><thead><tr><th>Time</th>${DAYS.slice(0, t.days).map((d, i) => `<th class="${i === day ? 'today' : ''}">${d}</th>`).join('')}<th></th></tr></thead><tbody>${t.periods.map(p => `<tr><td class="tt-time"><input type="time" data-tt-start="${p.id}" value="${p.start}" aria-label="Start time"><input type="time" data-tt-end="${p.id}" value="${p.end}" aria-label="End time"></td>${DAYS.slice(0, t.days).map((d, i) => { const v = t.cells[`${i}-${p.id}`] || ''; const live = i === day && toMin(p.start) <= now && now < toMin(p.end); return `<td class="${i === day ? 'today' : ''}"><input class="tt-cell ${v ? 'filled' : ''} ${live ? 'live' : ''}" style="--h:${hue(v)}" data-tt-cell="${i}-${p.id}" value="${esc(v)}" aria-label="${d} ${p.start}" placeholder="—"></td>`; }).join('')}<td><button class="btn btn-ghost btn-small" data-tt-del="${p.id}" aria-label="Remove period">×</button></td></tr>`).join('')}</tbody></table></div>`;
      };
      draw();
      const tick = setInterval(() => { if (C.currentView === 'timetable' && !document.activeElement?.matches('.tt-cell,input')) draw(); }, 60000); timers.add(tick);
      bind(root, {
        input: e => {
          const d = e.target.dataset;
          if (d.ttCell !== undefined) { t.cells[d.ttCell] = e.target.value; e.target.style.setProperty('--h', hue(e.target.value)); e.target.classList.toggle('filled', !!e.target.value.trim()); }
          if (d.ttStart) t.periods.find(p => p.id === d.ttStart).start = e.target.value;
          if (d.ttEnd) t.periods.find(p => p.id === d.ttEnd).end = e.target.value;
          save();
        },
        click: async e => {
          const days = e.target.closest('[data-tt-days]'); if (days) { t.days = Number(days.dataset.ttDays); store.set('timetable', t); draw(); return; }
          const del = e.target.closest('[data-tt-del]'); if (del) { if (t.periods.length > 1) { t.periods = t.periods.filter(p => p.id !== del.dataset.ttDel); store.set('timetable', t); draw(); } return; }
          const b = e.target.closest('[data-tt]'); if (!b) return;
          if (b.dataset.tt === 'add-period') { const last = t.periods[t.periods.length - 1]; t.periods.push({ id: uid(), start: last?.end || '09:00', end: last ? `${String(Math.min(23, Number(last.end.slice(0, 2)) + 1)).padStart(2, '0')}:${last.end.slice(3)}` : '10:00' }); store.set('timetable', t); draw(); }
          if (b.dataset.tt === 'sheet') {
            const cells = { A1: 'Time' }; DAYS.slice(0, t.days).forEach((d, i) => { cells[String.fromCharCode(66 + i) + '1'] = d; });
            t.periods.forEach((p, r) => { cells['A' + (r + 2)] = `${p.start}–${p.end}`; DAYS.slice(0, t.days).forEach((d, i) => { cells[String.fromCharCode(66 + i) + (r + 2)] = t.cells[`${i}-${p.id}`] || ''; }); });
            await C.addFiles([{ type: 'sheet', name: 'Timetable', content: { cells, rows: Math.max(20, t.periods.length + 4), cols: 12 } }]);
          }
        }
      });
    }
  });

  /* =================================================================== Countdowns */
  const span = ms => { const abs = Math.abs(ms), d = Math.floor(abs / 864e5), h = Math.floor(abs % 864e5 / 36e5), m = Math.floor(abs % 36e5 / 6e4), s = Math.floor(abs % 6e4 / 1e3); return { d, h, m, s }; };
  C.registerTool({
    id: 'countdown', title: 'Countdowns', short: 'CD', cat: 'Plan', label: 'Deadlines and events',
    desc: 'Count down to an exam, a deadline or a holiday. The nearest one shows on your home page.',
    leave: stopTimers,
    today: async () => {
      const list = await store.get('countdowns', []); const next = list.filter(x => new Date(x.at) > new Date()).sort((a, b) => new Date(a.at) - new Date(b.at))[0];
      if (!next) return `<button class="today-card" data-view="countdown"><span class="today-kicker">Countdowns</span><strong>Nothing coming up</strong><small>Add an exam, deadline or event to count down to.</small></button>`; const { d, h } = span(new Date(next.at) - new Date());
      return `<button class="today-card" data-view="countdown"><span class="today-kicker">Coming up</span><strong>${esc(next.name)}</strong><small>${d ? `${d} day${d === 1 ? '' : 's'}, ` : ''}${h} hour${h === 1 ? '' : 's'} to go</small></button>`;
    },
    render: async root => {
      if (!cdState) cdState = await store.get('countdowns', []);
      if (C.currentView !== 'countdown') return;
      const list = cdState, save = () => store.set('countdowns', list);
      const draw = () => {
        const sorted = [...list].sort((a, b) => new Date(a.at) - new Date(b.at));
        root.innerHTML = head('FLORA TOOL / PLAN', 'Countdowns', 'Add something to look forward to, or to prepare for.') + `
          <section class="panel cd-form"><div class="form-field"><label for="cd-name">What is it?</label><input id="cd-name" class="text-input" placeholder="Maths exam" maxlength="60"></div><div class="form-field"><label for="cd-date">Date</label><input id="cd-date" class="text-input" type="date" value="${todayISO()}"></div><div class="form-field"><label for="cd-time">Time</label><input id="cd-time" class="text-input" type="time" value="09:00"></div><button class="btn btn-primary" data-cd="add">Add countdown</button></section>
          <div class="cd-list">${sorted.map(x => `<article class="cd-card" data-cd-id="${x.id}"><div class="cd-info"><strong>${esc(x.name)}</strong><small>${new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' }).format(new Date(x.at))}</small></div><div class="cd-clock" data-at="${x.at}"></div><button class="btn btn-ghost btn-small" data-cd-del="${x.id}">Remove</button></article>`).join('') || '<div class="panel"><div class="empty-state"><h3>Nothing to count down to</h3><p>Add an exam, deadline or event above.</p></div></div>'}</div>`;
        paint();
      };
      const paint = () => $$('.cd-clock', root).forEach(el => {
        const ms = new Date(el.dataset.at) - new Date(), s = span(ms);
        if (ms <= 0) { el.innerHTML = `<span class="cd-past">${s.d ? s.d + ' day' + (s.d === 1 ? '' : 's') : s.h + ' hour' + (s.h === 1 ? '' : 's')} ago</span>`; el.closest('.cd-card').classList.add('past'); return; }
        el.innerHTML = [['d', s.d], ['h', s.h], ['m', s.m], ['s', s.s]].map(([l, v]) => `<span><b>${String(v).padStart(l === 'd' ? 1 : 2, '0')}</b><small>${l === 'd' ? 'days' : l === 'h' ? 'hrs' : l === 'm' ? 'min' : 'sec'}</small></span>`).join('');
      });
      draw(); timers.add(setInterval(paint, 1000));
      bind(root, {
        click: e => {
          const del = e.target.closest('[data-cd-del]'); if (del) { cdState.splice(0, cdState.length, ...cdState.filter(x => x.id !== del.dataset.cdDel)); save(); draw(); return; }
          if (e.target.closest('[data-cd="add"]')) {
            const name = $('#cd-name', root).value.trim(), date = $('#cd-date', root).value, time = $('#cd-time', root).value || '09:00';
            if (!name || !date) { C.toast('Give it a name and a date.', 'error'); return; }
            list.push({ id: uid(), name, at: `${date}T${time}` }); save(); draw();
          }
        },
        keydown: e => { if (e.key === 'Enter' && e.target.id === 'cd-name') $('[data-cd="add"]', root).click(); }
      });
    }
  });

  /* =================================================================== Word Stats */
  const STOP = new Set('the a an and or but of to in on at for with as by is are was were be been it this that these those from not no so if then than i you he she we they my your our his her their its will would can could should do does did have has had'.split(' '));
  const syllables = w => { w = w.toLowerCase().replace(/[^a-z]/g, ''); if (!w) return 0; if (w.length <= 3) return 1; w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, ''); const m = w.match(/[aeiouy]{1,2}/g); return m ? m.length : 1; };
  const docText = file => { if (file.type === 'doc') return new DOMParser().parseFromString(file.content, 'text/html').body.innerText || ''; if (file.type === 'note') return String(file.content || ''); if (file.type === 'code') return String(file.content.text || ''); if (file.type === 'journal') return file.content.entries.map(e => e.text).join('\n\n'); return ''; };
  const stats = { text: '' };
  C.registerTool({
    id: 'wordstats', title: 'Word Stats', short: 'WS', cat: 'Utilities', label: 'Writing',
    desc: 'Words, characters, reading time, readability and your most-used words, for any text or Flora document.',
    render: root => {
      const readable = C.files.filter(f => ['doc', 'note', 'journal', 'code'].includes(f.type));
      root.innerHTML = head('FLORA TOOL / WRITING', 'Word Stats', 'Paste text below, or analyse one of your files.') + `<div class="lab-grid"><section class="panel"><div class="lab-actions"><select id="ws-file" class="select-control" aria-label="Analyse a Flora file"><option value="">Analyse a file…</option>${readable.map(f => `<option value="${f.id}">${esc(f.name)} (${esc(C.fileInfo[f.type].short)})</option>`).join('')}</select></div><textarea id="ws-text" class="text-area" rows="12" placeholder="Paste or type here…" aria-label="Text to analyse"></textarea></section><section class="panel" id="ws-out"></section></div>`;
      $('#ws-text', root).value = stats.text;
      const paint = () => {
        const t = stats.text, words = t.match(/[\p{L}\p{N}'’-]+/gu) || [], sentences = (t.match(/[^.!?]+[.!?]+(\s|$)/g) || (t.trim() ? [t] : [])).length, paragraphs = t.split(/\n\s*\n/).filter(x => x.trim()).length;
        const syl = words.reduce((n, w) => n + syllables(w), 0), flesch = words.length && sentences ? 206.835 - 1.015 * (words.length / sentences) - 84.6 * (syl / words.length) : null;
        const freq = {}; words.forEach(w => { const k = w.toLowerCase(); if (k.length > 2 && !STOP.has(k)) freq[k] = (freq[k] || 0) + 1; });
        const top = Object.entries(freq).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8), max = top[0]?.[1] || 1;
        const level = flesch === null ? '' : flesch >= 80 ? 'Easy to read' : flesch >= 60 ? 'Plain English' : flesch >= 40 ? 'Fairly difficult' : 'Difficult';
        const mins = n => n < 1 ? 'under a minute' : `${Math.round(n)} min`;
        $('#ws-out', root).innerHTML = `<div class="ws-grid">${[['Words', words.length], ['Characters', t.length], ['No spaces', t.replace(/\s/g, '').length], ['Sentences', sentences], ['Paragraphs', paragraphs], ['Longest word', [...words].sort((a, b) => b.length - a.length)[0] || '—']].map(([l, v]) => `<div class="ws-stat"><small>${l}</small><strong>${esc(String(v))}</strong></div>`).join('')}</div>
          <div class="ws-times"><span>Reading time <b>${mins(words.length / 220)}</b></span><span>Speaking time <b>${mins(words.length / 130)}</b></span>${flesch === null ? '' : `<span>Readability <b>${Math.round(flesch)} · ${level}</b></span>`}</div>
          <h3 style="margin-top:16px">Most used words</h3>${top.length ? top.map(([w, n]) => `<div class="ws-bar"><span>${esc(w)}</span><i style="width:${n / max * 100}%"></i><b>${n}</b></div>`).join('') : '<p class="small-print">Common words like “the” are ignored.</p>'}`;
      };
      paint();
      bind(root, {
        input: e => { if (e.target.id === 'ws-text') { stats.text = e.target.value; paint(); } },
        change: e => { if (e.target.id === 'ws-file' && e.target.value) { const f = C.files.find(x => x.id === e.target.value); stats.text = f ? docText(f) : ''; $('#ws-text', root).value = stats.text; paint(); } }
      });
    }
  });
})();

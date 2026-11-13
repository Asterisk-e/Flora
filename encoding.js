/* Flora text encodings — pure functions, no DOM, no dependencies.
   Used for exports (encode), imports (decode / detect) and the Text Encoding Lab. */
(function (root) {
  'use strict';

  const LIST = [
    { id: 'utf-8',        label: 'UTF-8',                 short: 'UTF-8',   charset: 'utf-8',        note: 'Every language and emoji. The best choice for almost everything.' },
    { id: 'utf-8-bom',    label: 'UTF-8 with BOM',        short: 'UTF-8 BOM', charset: 'utf-8',      note: 'UTF-8 plus a marker some older Windows apps and Excel look for.' },
    { id: 'utf-16le',     label: 'UTF-16 LE',             short: 'UTF-16 LE', charset: 'utf-16le',   note: 'Two bytes per character. What Windows calls “Unicode”.' },
    { id: 'utf-16be',     label: 'UTF-16 BE',             short: 'UTF-16 BE', charset: 'utf-16be',   note: 'UTF-16 with the other byte order. Used by some Java and network tools.' },
    { id: 'ascii',        label: 'ASCII (7-bit)',         short: 'ASCII',   charset: 'us-ascii',     note: 'Plain English letters, digits and punctuation only.' },
    { id: 'iso-8859-1',   label: 'Latin-1 (ISO-8859-1)',  short: 'Latin-1', charset: 'iso-8859-1',   note: 'Western European accents such as é, ü and ñ.' },
    { id: 'windows-1252', label: 'Windows-1252',          short: 'Win-1252', charset: 'windows-1252', note: 'Latin-1 plus curly quotes, long dashes and the € sign.' }
  ];
  const BY_ID = Object.fromEntries(LIST.map(item => [item.id, item]));
  const info = id => BY_ID[id] || BY_ID['utf-8'];

  const W1252 = { 0x80:'€',0x82:'‚',0x83:'ƒ',0x84:'„',0x85:'…',0x86:'†',0x87:'‡',0x88:'ˆ',0x89:'‰',0x8A:'Š',0x8B:'‹',0x8C:'Œ',0x8E:'Ž',
    0x91:'‘',0x92:'’',0x93:'“',0x94:'”',0x95:'•',0x96:'–',0x97:'—',0x98:'˜',0x99:'™',0x9A:'š',0x9B:'›',0x9C:'œ',0x9E:'ž',0x9F:'Ÿ' };
  const W1252_REV = Object.fromEntries(Object.entries(W1252).map(([byte, ch]) => [ch.codePointAt(0), Number(byte)]));

  const TRANSLIT = { 'ß':'ss','æ':'ae','Æ':'AE','œ':'oe','Œ':'OE','ø':'o','Ø':'O','đ':'d','Đ':'D','ð':'d','Ð':'D','ł':'l','Ł':'L','þ':'th','Þ':'TH','ı':'i',
    '‘':"'",'’':"'",'‚':"'",'“':'"','”':'"','„':'"','‹':'<','›':'>','«':'<<','»':'>>','–':'-','—':'-','―':'-','−':'-','…':'...','•':'*','·':'.',
    '€':'EUR','£':'GBP','¥':'JPY','¢':'c','©':'(c)','®':'(R)','™':'(TM)','×':'x','÷':'/','±':'+/-','°':' deg','½':'1/2','¼':'1/4','¾':'3/4',
    '¿':'?','¡':'!','\u00a0':' ','\u2009':' ','\u200a':' ','\u202f':' ','\u200b':'','\ufeff':'','→':'->','←':'<-','↔':'<->','≤':'<=','≥':'>=','≠':'!=','✓':'v','✔':'v' };

  function transliterate(text) {
    let out = '';
    for (const ch of String(text)) {
      if (ch.codePointAt(0) < 128) { out += ch; continue; }
      if (Object.prototype.hasOwnProperty.call(TRANSLIT, ch)) { out += TRANSLIT[ch]; continue; }
      const stripped = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      out += [...stripped].every(c => c.codePointAt(0) < 128) ? stripped : '?';
    }
    return out;
  }

  const supports = {
    'ascii':        cp => cp < 128,
    'iso-8859-1':   cp => cp < 256,
    'windows-1252': cp => (cp < 128) || (cp >= 0xA0 && cp < 256) || Object.prototype.hasOwnProperty.call(W1252_REV, cp)
  };
  const isUnicode = id => id.startsWith('utf-');

  function escapeChar(ch, context) {
    const cp = ch.codePointAt(0);
    if (context === 'html') return `&#x${cp.toString(16).toUpperCase()};`;
    if (context === 'json') {
      if (cp > 0xFFFF) { const v = cp - 0x10000; return '\\u' + (0xD800 + (v >> 10)).toString(16).toUpperCase().padStart(4, '0') + '\\u' + (0xDC00 + (v & 0x3FF)).toString(16).toUpperCase().padStart(4, '0'); }
      return '\\u' + cp.toString(16).toUpperCase().padStart(4, '0');
    }
    return cp > 0xFFFF ? `\\u{${cp.toString(16).toUpperCase()}}` : '\\u' + cp.toString(16).toUpperCase().padStart(4, '0');
  }

  /* Prepare text for a single-byte target. Returns { text, lost: Set<char>, count } */
  function fit(text, id, mode, context) {
    const ok = supports[id];
    const lost = new Set(); let count = 0, out = '';
    for (const ch of String(text)) {
      const cp = ch.codePointAt(0);
      if (ok(cp)) { out += ch; continue; }
      lost.add(ch); count++;
      if (mode === 'escape') out += escapeChar(ch, context);
      else if (mode === 'transliterate') {
        const t = transliterate(ch);
        out += [...t].every(c => ok(c.codePointAt(0))) ? t : '?';
      } else out += '?';
    }
    return { text: out, lost, count };
  }

  function normaliseLines(text, mode) {
    if (mode === 'lf') return String(text).replace(/\r\n?/g, '\n');
    if (mode === 'crlf') return String(text).replace(/\r\n?|\n/g, '\r\n');
    return String(text);
  }

  function utf16(text, littleEndian) {
    const bytes = new Uint8Array(2 + text.length * 2);
    bytes[0] = littleEndian ? 0xFF : 0xFE; bytes[1] = littleEndian ? 0xFE : 0xFF;
    for (let i = 0; i < text.length; i++) {
      const unit = text.charCodeAt(i);
      bytes[2 + i * 2] = littleEndian ? unit & 255 : unit >> 8;
      bytes[3 + i * 2] = littleEndian ? unit >> 8 : unit & 255;
    }
    return bytes;
  }

  /* encode(text, id, { unsupported:'replace'|'transliterate'|'escape', context:'text'|'html'|'json', lineEndings:'keep'|'lf'|'crlf' })
     → { bytes, lost:Set, count, charset } */
  function encode(text, id, options = {}) {
    const opts = { unsupported: 'transliterate', context: 'text', lineEndings: 'keep', ...options };
    const encoding = info(id).id;
    let source = normaliseLines(text, opts.lineEndings);
    let lost = new Set(), count = 0, bytes;
    if (encoding === 'utf-8') bytes = new TextEncoder().encode(source);
    else if (encoding === 'utf-8-bom') {
      const body = new TextEncoder().encode(source); bytes = new Uint8Array(body.length + 3);
      bytes.set([0xEF, 0xBB, 0xBF]); bytes.set(body, 3);
    } else if (encoding === 'utf-16le') bytes = utf16(source, true);
    else if (encoding === 'utf-16be') bytes = utf16(source, false);
    else {
      const fitted = fit(source, encoding, opts.unsupported, opts.context);
      lost = fitted.lost; count = fitted.count; bytes = new Uint8Array(fitted.text.length);
      let n = 0;
      for (const ch of fitted.text) {
        const cp = ch.codePointAt(0);
        bytes[n++] = encoding === 'windows-1252' && W1252_REV[cp] !== undefined ? W1252_REV[cp] : (cp < 256 ? cp : 63);
      }
      bytes = bytes.slice(0, n);
    }
    return { bytes, lost, count, charset: info(encoding).charset, id: encoding };
  }

  /* decode(bytes, id) → { text, invalid:number } */
  function decode(input, id) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    const encoding = info(id).id; let invalid = 0, text;
    if (encoding === 'utf-8' || encoding === 'utf-8-bom') {
      const start = bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF ? 3 : 0;
      text = new TextDecoder('utf-8').decode(bytes.subarray(start)); invalid = (text.match(/\uFFFD/g) || []).length;
    } else if (encoding === 'utf-16le' || encoding === 'utf-16be') {
      const hasBom = bytes.length >= 2 && ((bytes[0] === 0xFF && bytes[1] === 0xFE) || (bytes[0] === 0xFE && bytes[1] === 0xFF));
      text = new TextDecoder(encoding).decode(hasBom ? bytes.subarray(2) : bytes);
    } else if (encoding === 'ascii') {
      let out = ''; for (const byte of bytes) { if (byte < 128) out += String.fromCharCode(byte); else { out += '\uFFFD'; invalid++; } } text = out;
    } else {
      let out = ''; for (const byte of bytes) { out += encoding === 'windows-1252' && W1252[byte] ? W1252[byte] : String.fromCharCode(byte); } text = out;
    }
    return { text, invalid };
  }

  /* detect(bytes) → { id, reason } — BOMs first, then “is it valid UTF-8?”, otherwise Windows-1252. */
  function detect(input) {
    const b = input instanceof Uint8Array ? input : new Uint8Array(input);
    if (b.length >= 3 && b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) return { id: 'utf-8-bom', reason: 'UTF-8 byte-order mark found' };
    if (b.length >= 2 && b[0] === 0xFF && b[1] === 0xFE) return { id: 'utf-16le', reason: 'UTF-16 LE byte-order mark found' };
    if (b.length >= 2 && b[0] === 0xFE && b[1] === 0xFF) return { id: 'utf-16be', reason: 'UTF-16 BE byte-order mark found' };
    if (b.every(byte => byte < 128)) return { id: 'utf-8', reason: 'Plain ASCII, which is also valid UTF-8' };
    try { new TextDecoder('utf-8', { fatal: true }).decode(b); return { id: 'utf-8', reason: 'Valid UTF-8 sequences' }; }
    catch { return { id: 'windows-1252', reason: 'Not valid UTF-8, so treated as Windows-1252' }; }
  }

  function hexDump(bytes, limit = 96) {
    const rows = [];
    for (let i = 0; i < Math.min(bytes.length, limit); i += 16) {
      const slice = [...bytes.subarray(i, Math.min(i + 16, limit, bytes.length))];
      rows.push(i.toString(16).padStart(4, '0') + '  ' + slice.map(v => v.toString(16).padStart(2, '0')).join(' ').padEnd(47) + '  ' + slice.map(v => v >= 32 && v < 127 ? String.fromCharCode(v) : '·').join(''));
    }
    if (bytes.length > limit) rows.push(`… ${bytes.length - limit} more bytes`);
    return rows.join('\n');
  }

  /* Rewrites (or inserts) the <meta charset> of an HTML export so it matches the file's real encoding. */
  function applyMetaCharset(html, id) {
    const charset = id === 'utf-16le' || id === 'utf-16be' ? 'utf-16' : info(id).charset;
    const tag = `<meta charset="${charset}">`;
    if (/<meta\s+charset=["']?[^"'>\s]+["']?\s*\/?>/i.test(html)) return html.replace(/<meta\s+charset=["']?[^"'>\s]+["']?\s*\/?>/i, tag);
    if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, match => match + tag);
    return tag + html;
  }

  function codePointLabel(ch) { return 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'); }

  /* Size and compatibility for every encoding — used by the Lab. */
  function compare(text, options = {}) {
    return LIST.map(item => {
      const result = encode(text, item.id, options);
      return { ...item, size: result.bytes.length, lostCount: result.count, lost: [...result.lost] };
    });
  }

  root.FloraEncoding = { LIST, info, encode, decode, detect, transliterate, hexDump, applyMetaCharset, codePointLabel, compare, isUnicode };
})(typeof window !== 'undefined' ? window : globalThis);

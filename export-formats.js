/* Native Office Open XML export helpers. Everything is generated locally, no library/CDN. */
(function (root) {
  'use strict';

  const textEncoder = new TextEncoder();
  const xml = value => String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const decodeHtml = value => String(value ?? '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

  let crcTable;
  function crc32(bytes) {
    if (!crcTable) {
      crcTable = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        crcTable[n] = c >>> 0;
      }
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function zipStore(entries) {
    const localParts = [], centralParts = [];
    let offset = 0, centralSize = 0;
    for (const [path, content] of entries) {
      const name = textEncoder.encode(path);
      const data = content instanceof Uint8Array ? content : textEncoder.encode(String(content));
      const crc = crc32(data);
      const local = new Uint8Array(30 + name.length + data.length);
      const lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034B50, true);
      lv.setUint16(4, 20, true); lv.setUint16(6, 0x0800, true); lv.setUint16(8, 0, true);
      lv.setUint16(10, 0, true); lv.setUint16(12, 0x0021, true);
      lv.setUint32(14, crc, true); lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true);
      lv.setUint16(26, name.length, true); lv.setUint16(28, 0, true);
      local.set(name, 30); local.set(data, 30 + name.length);
      localParts.push(local);

      const central = new Uint8Array(46 + name.length);
      const cv = new DataView(central.buffer);
      cv.setUint32(0, 0x02014B50, true);
      cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true); cv.setUint16(12, 0, true); cv.setUint16(14, 0x0021, true);
      cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true);
      cv.setUint16(28, name.length, true); cv.setUint16(30, 0, true); cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true); cv.setUint16(36, 0, true); cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true); central.set(name, 46);
      centralParts.push(central); centralSize += central.length; offset += local.length;
    }
    const end = new Uint8Array(22), ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054B50, true); ev.setUint16(4, 0, true); ev.setUint16(6, 0, true);
    ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true);
    ev.setUint32(12, centralSize, true); ev.setUint32(16, offset, true); ev.setUint16(20, 0, true);
    return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' });
  }

  function docxParagraphs(html) {
    const tokens = String(html || '').match(/<[^>]+>|[^<]+/g) || [];
    const paragraphs = [];
    let runs = [], block = 'p', styles = [], listType = null, sawContent = false;
    const flush = () => {
      if (!runs.length && !sawContent) return;
      const style = /^h([1-3])$/.exec(block);
      const props = style ? `<w:pPr><w:pStyle w:val="Heading${style[1]}"/></w:pPr>` : '';
      paragraphs.push(`<w:p>${props}${runs.join('') || '<w:r><w:t></w:t></w:r>'}</w:p>`);
      runs = []; sawContent = false; block = 'p';
    };
    const run = (value, forced = null) => {
      const current = forced || { bold:styles.some(s=>s==='strong'||s==='b'), italic:styles.some(s=>s==='em'||s==='i'), underline:styles.includes('u') };
      const rPr = `${current.bold?'<w:b/>':''}${current.italic?'<w:i/>':''}${current.underline?'<w:u w:val="single"/>':''}`;
      runs.push(`<w:r>${rPr?`<w:rPr>${rPr}</w:rPr>`:''}<w:t xml:space="preserve">${xml(value)}</w:t></w:r>`);
      if (value) sawContent = true;
    };
    for (const token of tokens) {
      if (!token.startsWith('<')) {
        const value = decodeHtml(token);
        if (value) run(value);
        continue;
      }
      const match = /^<\s*(\/)?\s*([a-z0-9]+)/i.exec(token);
      if (!match) continue;
      const closing = !!match[1], tag = match[2].toLowerCase();
      if (tag === 'br' && !closing) { runs.push('<w:r><w:br/></w:r>'); sawContent=true; continue; }
      if (['p','h1','h2','h3','blockquote','div','li'].includes(tag)) {
        if (!closing) {
          if (runs.length || sawContent) flush();
          block = tag;
          if (tag === 'li') run('• ', {bold:false,italic:false,underline:false});
        } else flush();
        continue;
      }
      if (tag === 'ul' || tag === 'ol') { if (!closing) listType=tag; else listType=null; continue; }
      if (['strong','b','em','i','u'].includes(tag)) {
        if (!closing) styles.push(tag);
        else { const index=styles.lastIndexOf(tag); if(index>=0) styles.splice(index,1); }
      }
    }
    if (runs.length || sawContent || !paragraphs.length) flush();
    return paragraphs.join('');
  }

  function createDocx(file, html) {
    const body = docxParagraphs(html);
    const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
    const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
    const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
    const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="30"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style></w:styles>`;
    return zipStore([['[Content_Types].xml',types],['_rels/.rels',rootRels],['word/document.xml',document],['word/_rels/document.xml.rels',docRels],['word/styles.xml',styles]]);
  }

  function createXlsx(file, getCellValue, cellName, colName) {
    const content = file.content || { cells:{}, rows:20, cols:12 };
    const rows = Math.max(1, Math.min(1000, Number(content.rows)||20));
    const cols = Math.max(1, Math.min(100, Number(content.cols)||12));
    const rowXml = [];
    for (let r=1; r<=rows; r++) {
      const cells=[];
      for (let c=1; c<=cols; c++) {
        const ref=cellName(r,c), raw=String(content.cells?.[ref] ?? '');
        if (raw === '') continue;
        if (raw.startsWith('=')) {
          const formula=raw.slice(1);
          const value=getCellValue(file.content,ref);
          if (typeof value === 'number' && Number.isFinite(value)) cells.push(`<c r="${ref}"><f>${xml(formula)}</f><v>${value}</v></c>`);
          else if (String(value).startsWith('#')) cells.push(`<c r="${ref}" t="e"><f>${xml(formula)}</f><v>${xml(value)}</v></c>`);
          else cells.push(`<c r="${ref}"><f>${xml(formula)}</f><v>0</v></c>`);
        } else if (raw.trim() !== '' && Number.isFinite(Number(raw))) {
          cells.push(`<c r="${ref}"><v>${Number(raw)}</v></c>`);
        } else {
          cells.push(`<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(raw)}</t></is></c>`);
        }
      }
      if (cells.length) rowXml.push(`<row r="${r}">${cells.join('')}</row>`);
    }
    const maxRef = `${colName(cols)}${rows}`;
    const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;
    const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Flora Data" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>`;
    const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;
    const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${maxRef}"/><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><sheetData>${rowXml.join('')}</sheetData></worksheet>`;
    return zipStore([['[Content_Types].xml',types],['_rels/.rels',rootRels],['xl/workbook.xml',workbook],['xl/_rels/workbook.xml.rels',workbookRels],['xl/worksheets/sheet1.xml',sheet]]);
  }

  function createPptx(file) {
    const slides = Array.isArray(file.content) && file.content.length ? file.content : [{ title:file.name, body:'' }];
    const A='http://schemas.openxmlformats.org/drawingml/2006/main';
    const R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    const P='http://schemas.openxmlformats.org/presentationml/2006/main';
    const PK='http://schemas.openxmlformats.org/package/2006/relationships';
    const group = `<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>`;
    const master = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}"><p:cSld><p:spTree>${group}</p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`;
    const layout = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>${group}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;
    const theme = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="${A}" name="Flora"><a:themeElements><a:clrScheme name="Flora"><a:dk1><a:srgbClr val="39372D"/></a:dk1><a:lt1><a:srgbClr val="FFFDF7"/></a:lt1><a:dk2><a:srgbClr val="655A43"/></a:dk2><a:lt2><a:srgbClr val="F8F5EB"/></a:lt2><a:accent1><a:srgbClr val="E9C96B"/></a:accent1><a:accent2><a:srgbClr val="C18D7C"/></a:accent2><a:accent3><a:srgbClr val="78886C"/></a:accent3><a:accent4><a:srgbClr val="8DA1A0"/></a:accent4><a:accent5><a:srgbClr val="A68CB6"/></a:accent5><a:accent6><a:srgbClr val="D79B64"/></a:accent6><a:hlink><a:srgbClr val="80652D"/></a:hlink><a:folHlink><a:srgbClr val="80652D"/></a:folHlink></a:clrScheme><a:fontScheme name="Flora"><a:majorFont><a:latin typeface="Georgia"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Georgia"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Flora"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;
    const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PK}"><Relationship Id="rId1" Type="${R}/officeDocument" Target="ppt/presentation.xml"/></Relationships>`;
    const presentation = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slides.map((_,i)=>`<p:sldId id="${256+i}" r:id="rId${2+i}"/>`).join('')}</p:sldIdLst><p:sldSz cx="9144000" cy="5143500" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`;
    const presentationRels = `<Relationships xmlns="${PK}"><Relationship Id="rId1" Type="${R}/slideMaster" Target="slideMasters/slideMaster1.xml"/>${slides.map((_,i)=>`<Relationship Id="rId${2+i}" Type="${R}/slide" Target="slides/slide${i+1}.xml"/>`).join('')}</Relationships>`;
    const masterRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PK}"><Relationship Id="rId1" Type="${R}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="${R}/theme" Target="../theme/theme1.xml"/></Relationships>`;
    const layoutRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PK}"><Relationship Id="rId1" Type="${R}/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`;
    const shape = (id,name,x,y,cx,cy,text,size,bold=false) => {
      const lines=String(text??'').split('\n');
      const paragraphs=lines.map(line=>`<a:p><a:pPr><a:defRPr sz="${size}"/></a:pPr><a:r><a:rPr lang="en-US" b="${bold?1:0}" sz="${size}"><a:solidFill><a:srgbClr val="493F2B"/></a:solidFill><a:latin typeface="Georgia"/></a:rPr><a:t>${xml(line)}</a:t></a:r><a:endParaRPr lang="en-US"/></a:p>`).join('');
      return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="square"><a:spAutoFit/></a:bodyPr><a:lstStyle/>${paragraphs}</p:txBody></p:sp>`;
    };
    const types = [`<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`,`<Default Extension="xml" ContentType="application/xml"/>`,`<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>`,`<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>`,`<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>`,`<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>`,...slides.map((_,i)=>`<Override PartName="/ppt/slides/slide${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`)].join('');
    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${types}</Types>`;
    const entries = [
      ['[Content_Types].xml',contentTypes],['_rels/.rels',rootRels],['ppt/presentation.xml',presentation],['ppt/_rels/presentation.xml.rels',presentationRels],
      ['ppt/slideMasters/slideMaster1.xml',master],['ppt/slideMasters/_rels/slideMaster1.xml.rels',masterRels],
      ['ppt/slideLayouts/slideLayout1.xml',layout],['ppt/slideLayouts/_rels/slideLayout1.xml.rels',layoutRels],['ppt/theme/theme1.xml',theme]
    ];
    slides.forEach((slide,index)=>{
      const title=slide.title || `Slide ${index+1}`;
      const body=slide.body || '';
      const slideXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="${A}" xmlns:p="${P}" xmlns:r="${R}"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFDF7"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree>${group}${shape(2,'Flora title',914400,850000,7315200,1000000,title,3400,true)}${shape(3,'Flora body',914400,2100000,7315200,2300000,body,1900,false)}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
      const rels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PK}"><Relationship Id="rId1" Type="${R}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`;
      entries.push([`ppt/slides/slide${index+1}.xml`,slideXml],[`ppt/slides/_rels/slide${index+1}.xml.rels`,rels]);
    });
    return zipStore(entries);
  }

  root.FloraExportFormats = { docx:createDocx, xlsx:createXlsx, pptx:createPptx };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.FloraExportFormats;
})(typeof window !== 'undefined' ? window : globalThis);

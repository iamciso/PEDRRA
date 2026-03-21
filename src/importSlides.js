/**
 * Import slides from PPTX and HTML files.
 * 100% client-side — no backend needed.
 */
import JSZip from 'jszip';

/* ================================================================
   PPTX IMPORT
   ================================================================
   PPTX files are ZIP archives containing:
   - ppt/slides/slide1.xml, slide2.xml, ...
   - ppt/slides/_rels/slide1.xml.rels (relationships for images)
   - ppt/media/image1.png, image2.jpg, ... (embedded media)
   - ppt/presentation.xml (slide order)
   ================================================================ */

/**
 * Parse a PPTX file (File or ArrayBuffer) into an array of slide objects.
 * Returns: [{ t, c, l, img, notes, ... }, ...]
 */
export async function importPptx(file) {
  const zip = await JSZip.loadAsync(file);

  // 1. Determine slide order from presentation.xml
  const presXml = await zip.file('ppt/presentation.xml')?.async('string');
  const slideOrder = getSlideOrder(presXml, zip);

  // 2. Parse each slide
  const slides = [];
  for (const slideFile of slideOrder) {
    try {
      const xml = await zip.file(slideFile)?.async('string');
      if (!xml) continue;

      const slide = parseSlideXml(xml);

      // 3. Try to extract notes
      const slideNum = slideFile.match(/slide(\d+)\.xml/)?.[1];
      const notesFile = `ppt/notesSlides/notesSlide${slideNum}.xml`;
      const notesXml = await zip.file(notesFile)?.async('string');
      if (notesXml) {
        slide.notes = extractTextFromXml(notesXml);
      }

      // 4. Try to extract first image from slide relationships
      const relsFile = slideFile.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
      const relsXml = await zip.file(relsFile)?.async('string');
      if (relsXml) {
        const imgPath = getFirstImageFromRels(relsXml);
        if (imgPath) {
          const imgFile = zip.file(`ppt/${imgPath}`);
          if (imgFile) {
            try {
              const imgData = await imgFile.async('base64');
              const ext = imgPath.split('.').pop().toLowerCase();
              const mime = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
              // Only embed if under 500KB
              if (imgData.length < 680000) { // ~500KB in base64
                slide.img = `data:${mime};base64,${imgData}`;
              }
            } catch { /* skip image */ }
          }
        }
      }

      slides.push(slide);
    } catch (err) {
      console.warn('Failed to parse slide:', slideFile, err);
      slides.push({ t: `Slide ${slides.length + 1}`, c: '(Could not parse this slide)', l: 'content' });
    }
  }

  return slides.length > 0 ? slides : [{ t: 'Imported Presentation', c: 'No slides could be extracted.', l: 'title' }];
}

/** Get ordered list of slide file paths */
function getSlideOrder(presXml, zip) {
  if (presXml) {
    // Extract rId references from sldIdLst
    const rIdMatches = [...presXml.matchAll(/r:id="(rId\d+)"/g)].map(m => m[1]);
    if (rIdMatches.length > 0) {
      // Parse presentation.xml.rels for actual file paths
      const relsStr = zip.file('ppt/_rels/presentation.xml.rels');
      if (relsStr) {
        return (async () => relsStr.async('string'))().then ? rIdMatches : rIdMatches; // fallback
      }
    }
  }
  // Fallback: find all slideN.xml files and sort numerically
  const slideFiles = [];
  zip.forEach((path) => {
    if (/^ppt\/slides\/slide\d+\.xml$/.test(path)) {
      slideFiles.push(path);
    }
  });
  slideFiles.sort((a, b) => {
    const na = parseInt(a.match(/slide(\d+)/)[1]);
    const nb = parseInt(b.match(/slide(\d+)/)[1]);
    return na - nb;
  });
  return slideFiles;
}

/** Parse a single slide XML to extract title and content */
function parseSlideXml(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');

  // Extract all text from shape tree
  const textBoxes = [];
  const spNodes = doc.querySelectorAll('sp');

  for (const sp of spNodes) {
    const texts = [];
    const pNodes = sp.querySelectorAll('p');
    for (const p of pNodes) {
      const runs = p.querySelectorAll('r');
      let line = '';
      for (const r of runs) {
        const t = r.querySelector('t');
        if (t) line += t.textContent;
      }
      // Also check for field elements (slide numbers, dates)
      const fields = p.querySelectorAll('fld');
      for (const fld of fields) {
        const t = fld.querySelector('t');
        if (t) line += t.textContent;
      }
      if (line.trim()) texts.push(line.trim());
    }

    if (texts.length === 0) continue;

    // Try to detect if this is a title placeholder
    const ph = sp.querySelector('ph');
    const phType = ph?.getAttribute('type') || '';
    const phIdx = ph?.getAttribute('idx') || '';

    textBoxes.push({
      type: phType,
      idx: phIdx,
      text: texts.join('\n'),
    });
  }

  // Categorize text boxes
  let title = '';
  let body = '';
  let subtitle = '';

  for (const tb of textBoxes) {
    if (tb.type === 'title' || tb.type === 'ctrTitle') {
      title = tb.text;
    } else if (tb.type === 'subTitle') {
      subtitle = tb.text;
    } else if (tb.type === 'body' || tb.idx === '1') {
      body += (body ? '\n' : '') + tb.text;
    } else {
      // Unknown placeholder — add to body
      if (!title) {
        title = tb.text;
      } else {
        body += (body ? '\n' : '') + tb.text;
      }
    }
  }

  if (subtitle && !body) body = subtitle;
  else if (subtitle) body = subtitle + '\n' + body;

  // Determine layout
  let layout = 'content';
  if (!body && title) layout = 'title';
  else if (body && body.split('\n').length > 3) layout = 'bullets';

  return {
    t: title || 'Untitled Slide',
    c: body,
    l: layout,
    notes: '',
  };
}

/** Extract plain text from any OOXML */
function extractTextFromXml(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const texts = [];
  const tNodes = doc.querySelectorAll('t');
  for (const t of tNodes) {
    if (t.textContent.trim()) texts.push(t.textContent.trim());
  }
  // Filter out slide number placeholders
  return texts.filter(t => !/^\d+$/.test(t)).join(' ');
}

/** Get first image path from slide relationships XML */
function getFirstImageFromRels(relsXml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(relsXml, 'text/xml');
  const rels = doc.querySelectorAll('Relationship');
  for (const rel of rels) {
    const type = rel.getAttribute('Type') || '';
    const target = rel.getAttribute('Target') || '';
    if (type.includes('/image') && /\.(png|jpg|jpeg|gif|svg|bmp|webp)$/i.test(target)) {
      // Target is relative to ppt/slides/, so normalize
      return target.replace('../', '');
    }
  }
  return null;
}


/* ================================================================
   HTML IMPORT
   ================================================================
   Converts HTML content into slides by splitting on headings,
   <section> tags, <hr>, or --- markers.
   Supports AI-generated HTML (ChatGPT, Claude, etc.)
   ================================================================ */

/**
 * Parse HTML string or File into an array of slide objects.
 * Returns: [{ t, c, l, img, notes, ... }, ...]
 */
export async function importHtml(input) {
  let html;
  if (input instanceof File) {
    html = await input.text();
  } else {
    html = input;
  }

  // Clean up: extract body if full HTML document
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) html = bodyMatch[1];

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild || doc.body;

  const slides = [];

  // Strategy 1: Split on <section> elements
  const sections = root.querySelectorAll('section');
  if (sections.length >= 2) {
    for (const section of sections) {
      slides.push(htmlSectionToSlide(section));
    }
    return cleanupSlides(slides);
  }

  // Strategy 2: Split on <h1> or <h2> elements
  const headings = root.querySelectorAll('h1, h2');
  if (headings.length >= 2) {
    let currentSlide = null;
    const childNodes = [...root.children];

    for (const node of childNodes) {
      const tag = node.tagName?.toLowerCase();
      if (tag === 'h1' || tag === 'h2') {
        if (currentSlide) slides.push(currentSlide);
        currentSlide = {
          t: node.textContent.trim(),
          c: '',
          l: tag === 'h1' ? 'title' : 'content',
          img: '',
          notes: '',
        };
      } else if (tag === 'hr') {
        // HR also starts a new slide
        if (currentSlide) slides.push(currentSlide);
        currentSlide = null;
      } else if (currentSlide) {
        const content = htmlNodeToMarkdown(node);
        if (content) {
          currentSlide.c += (currentSlide.c ? '\n' : '') + content;
        }
        // Extract images
        const img = node.querySelector?.('img');
        if (img?.src && !currentSlide.img) {
          currentSlide.img = img.src;
        }
      } else {
        // Content before first heading — make a title slide
        const text = node.textContent.trim();
        if (text) {
          currentSlide = { t: text, c: '', l: 'title', img: '', notes: '' };
        }
      }
    }
    if (currentSlide) slides.push(currentSlide);
    return cleanupSlides(slides);
  }

  // Strategy 3: Split on <hr> or --- markers
  const htmlContent = root.innerHTML;
  const parts = htmlContent.split(/(?:<hr\s*\/?>|---)/i).filter(p => p.trim());
  if (parts.length >= 2) {
    for (const part of parts) {
      const tempDoc = parser.parseFromString(`<div>${part}</div>`, 'text/html');
      const tempRoot = tempDoc.body.firstElementChild || tempDoc.body;
      slides.push(htmlSectionToSlide(tempRoot));
    }
    return cleanupSlides(slides);
  }

  // Strategy 4: Single slide from entire content
  const slide = htmlSectionToSlide(root);
  if (slide.t || slide.c) {
    return cleanupSlides([slide]);
  }

  return [{ t: 'Imported Content', c: root.textContent.trim().substring(0, 500), l: 'content' }];
}

/** Convert an HTML section/element to a slide object */
function htmlSectionToSlide(el) {
  const slide = { t: '', c: '', l: 'content', img: '', notes: '' };

  // Find title from first heading
  const heading = el.querySelector('h1, h2, h3');
  if (heading) {
    slide.t = heading.textContent.trim();
    if (heading.tagName === 'H1') slide.l = 'title';
  }

  // Collect content from other elements
  const contentParts = [];
  for (const child of el.children) {
    const tag = child.tagName?.toLowerCase();
    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      if (!slide.t) slide.t = child.textContent.trim();
      continue; // skip heading, already used as title
    }
    const md = htmlNodeToMarkdown(child);
    if (md) contentParts.push(md);

    // Extract image
    const img = child.querySelector?.('img') || (tag === 'img' ? child : null);
    if (img?.getAttribute?.('src') && !slide.img) {
      slide.img = img.getAttribute('src');
    }
  }
  slide.c = contentParts.join('\n');

  // Detect layout
  if (!slide.c && slide.t) slide.l = 'title';
  else if (slide.c.split('\n').filter(l => l.startsWith('- ')).length >= 3) slide.l = 'bullets';
  else if (slide.c.includes('> ')) slide.l = 'quote';

  return slide;
}

/** Convert an HTML node to simplified markdown-like text */
function htmlNodeToMarkdown(node) {
  const tag = node.tagName?.toLowerCase();

  if (tag === 'p') {
    return convertInline(node);
  }
  if (tag === 'ul' || tag === 'ol') {
    const items = [...node.querySelectorAll('li')];
    return items.map((li, i) => {
      const text = convertInline(li);
      return tag === 'ol' ? `${i + 1}. ${text}` : `- ${text}`;
    }).join('\n');
  }
  if (tag === 'blockquote') {
    return '> ' + convertInline(node);
  }
  if (tag === 'pre' || tag === 'code') {
    return node.textContent.trim();
  }
  if (tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
    return '**' + node.textContent.trim() + '**';
  }
  if (tag === 'img') {
    return ''; // images handled separately
  }
  if (tag === 'table') {
    return convertTable(node);
  }
  if (tag === 'div' || tag === 'article' || tag === 'aside' || tag === 'main') {
    // Recursively process children
    return [...node.children].map(c => htmlNodeToMarkdown(c)).filter(Boolean).join('\n');
  }

  // Fallback: plain text
  const text = node.textContent?.trim();
  return text || '';
}

/** Convert inline HTML to markdown-like text */
function convertInline(node) {
  let result = '';
  for (const child of node.childNodes) {
    if (child.nodeType === 3) { // Text node
      result += child.textContent;
    } else if (child.nodeType === 1) { // Element
      const tag = child.tagName.toLowerCase();
      const text = convertInline(child);
      if (tag === 'strong' || tag === 'b') result += `**${text}**`;
      else if (tag === 'em' || tag === 'i') result += `*${text}*`;
      else if (tag === 'del' || tag === 's') result += `~~${text}~~`;
      else if (tag === 'mark') result += `==${text}==`;
      else if (tag === 'a') result += `[${text}](${child.getAttribute('href') || ''})`;
      else if (tag === 'code') result += text;
      else if (tag === 'br') result += '\n';
      else result += text;
    }
  }
  return result.trim();
}

/** Convert HTML table to text */
function convertTable(table) {
  const rows = [...table.querySelectorAll('tr')];
  return rows.map(row => {
    const cells = [...row.querySelectorAll('td, th')];
    return cells.map(c => c.textContent.trim()).join(' | ');
  }).join('\n');
}

/** Clean up slide array */
function cleanupSlides(slides) {
  return slides
    .filter(s => s.t || s.c) // remove empty slides
    .map(s => ({
      ...s,
      t: s.t || 'Untitled',
      c: s.c?.trim() || '',
    }));
}

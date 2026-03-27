import { marked } from 'marked';

// Configure marked to NOT pass through raw HTML from user content.
// This prevents XSS when rendering markdown via v-html.
const renderer = new marked.Renderer();
const origHtml = renderer.html;
renderer.html = function (token) {
  // Escape any raw HTML blocks instead of rendering them
  const text = typeof token === 'string' ? token : (token.raw || token.text || '');
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

export function renderMarkdown(text) {
  if (!text) return '';
  try {
    return marked.parse(text, { breaks: true, async: false, renderer });
  } catch {
    return text;
  }
}

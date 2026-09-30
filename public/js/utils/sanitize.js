// Utility module for HTML escaping and sanitization (ESM)
// Protects against XSS (Cross-Site Scripting) and HTML Injection

/**
 * Escapes characters with special meaning in HTML to prevent XSS.
 * Safe for use in text nodes and HTML attribute values.
 * @param {any} str - The string or value to escape.
 * @returns {string} - The escaped string.
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Strips dangerous HTML tags (scripts, iframes, objects) and event handler attributes (onerror, onclick, etc.)
 * from an HTML string while preserving safe formatting markup.
 * Uses DOMParser in browser environments, and a fallback regex cleaner in Node/test environments.
 * @param {string} dirtyHtml - The untrusted HTML string.
 * @returns {string} - Sanitized HTML string.
 */
export function sanitizeHtml(dirtyHtml) {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';

  // In browser environments with DOMParser
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(dirtyHtml, 'text/html');

      const disallowedTags = new Set([
        'script', 'iframe', 'object', 'embed', 'link', 'style',
        'meta', 'base', 'applet', 'svg', 'math'
      ]);

      // Remove disallowed elements
      const elements = doc.body.querySelectorAll('*');
      for (const el of elements) {
        const tagName = el.tagName.toLowerCase();
        if (disallowedTags.has(tagName)) {
          el.remove();
          continue;
        }

        // Clean attributes
        for (const attr of Array.from(el.attributes)) {
          const attrName = attr.name.toLowerCase();
          const attrVal = attr.value.trim().toLowerCase();

          // Strip all event handlers (onclick, onerror, onload, etc.)
          if (attrName.startsWith('on')) {
            el.removeAttribute(attr.name);
            continue;
          }

          // Strip pseudo-protocols and dangerous schemes in URLs
          if (
            attrName === 'href' ||
            attrName === 'src' ||
            attrName === 'action' ||
            attrName === 'formaction'
          ) {
            if (
              attrVal.startsWith('javascript:') ||
              attrVal.startsWith('vbscript:') ||
              attrVal.startsWith('data:text/html')
            ) {
              el.removeAttribute(attr.name);
            }
          }
        }
      }

      return doc.body.innerHTML;
    } catch (e) {
      console.warn('[sanitizeHtml] DOMParser error, falling back to escapeHtml', e);
      return escapeHtml(dirtyHtml);
    }
  }

  // Fallback for Node/test environments without DOMParser
  return dirtyHtml
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?<\/embed>/gi, '')
    .replace(/\s*on\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\s*on\w+\s*=\s*[^>\s]+/gi, '')
    .replace(/(href|src)\s*=\s*(['"])\s*javascript:.*?\2/gi, '');
}

/**
 * Safely sets the innerHTML of an element after sanitizing the content.
 * @param {HTMLElement} element - Target element.
 * @param {string} content - HTML content to sanitize and inject.
 */
export function safeSetInnerHTML(element, content) {
  if (!element) return;
  element.innerHTML = sanitizeHtml(content);
}

/**
 * Safely sets the textContent of an element.
 * @param {HTMLElement} element - Target element.
 * @param {any} text - Text to set.
 */
export function safeSetText(element, text) {
  if (!element) return;
  element.textContent = text !== null && text !== undefined ? String(text) : '';
}

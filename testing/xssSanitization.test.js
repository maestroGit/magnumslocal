import { escapeHtml, sanitizeHtml } from '../public/js/utils/sanitize.js';
import { showModal, showModalForm, showProgressModal, safeModal } from '../public/js/ui/modals.js';

describe('XSS Sanitization & HTML Escaping Module', () => {
  describe('escapeHtml', () => {
    test('escapes HTML special characters (&, <, >, ", \')', () => {
      const payload = `<script>alert("XSS & 'attack'");</script>`;
      const escaped = escapeHtml(payload);
      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS &amp; &#39;attack&#39;&quot;);&lt;/script&gt;');
      expect(escaped).not.toContain('<');
      expect(escaped).not.toContain('>');
      expect(escaped).not.toContain('"');
      expect(escaped).not.toContain("'");
    });

    test('handles null, undefined, and non-string types safely', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
      expect(escapeHtml(12345)).toBe('12345');
      expect(escapeHtml(false)).toBe('false');
    });

    test('neutralizes malicious attribute breakout payloads', () => {
      const payload = `123" onfocus="alert('pwned')`;
      const escaped = escapeHtml(payload);
      expect(escaped).toBe('123&quot; onfocus=&quot;alert(&#39;pwned&#39;)');
    });
  });

  describe('sanitizeHtml', () => {
    test('removes <script> tags and malicious inline code', () => {
      const dirty = `<div>Safe text<script>alert('xss')</script></div>`;
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('<script');
      expect(clean).not.toContain("alert('xss')");
      expect(clean).toContain('Safe text');
    });

    test('strips dangerous inline event handlers like onerror and onclick', () => {
      const dirty = `<img src="invalid.jpg" onerror="alert('xss')" alt="photo"><button onclick="stealTokens()">Click</button>`;
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('onerror');
      expect(clean).not.toContain('onclick');
      expect(clean).not.toContain('stealTokens');
      expect(clean).toContain('src="invalid.jpg"');
    });

    test('strips javascript: and vbscript: URIs', () => {
      const dirty = `<a href="javascript:alert(1)">Click me</a>`;
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('javascript:');
    });

    test('preserves safe formatting tags', () => {
      const safe = `<h3>Title</h3><p>Paragraph with <strong>bold</strong> and <em>italic</em>.</p>`;
      const clean = sanitizeHtml(safe);
      expect(clean).toContain('<h3>Title</h3>');
      expect(clean).toContain('<strong>bold</strong>');
    });

    test('preserves form elements, inputs, and data attributes for dynamic modals', () => {
      const formHtml = `<form id="transactionForm"><div id="utxoSelectList"><input type="checkbox" class="utxo-checkbox" id="utxo_0" data-txid="tx123" data-amount="10"><label for="utxo_0">10 UTXO</label></div><button type="submit">Transfer</button></form>`;
      const clean = sanitizeHtml(formHtml);
      expect(clean).toContain('<form id="transactionForm"');
      expect(clean).toContain('class="utxo-checkbox"');
      expect(clean).toContain('data-txid="tx123"');
      expect(clean).toContain('data-amount="10"');
      expect(clean).toContain('Transfer');
    });
  });

  describe('Modals secure rendering', () => {
    let mockModalMessage;
    let mockModalTitle;
    let mockModalBody;

    beforeEach(() => {
      mockModalMessage = { innerHTML: '', textContent: '', replaceChildren: jest.fn() };
      mockModalTitle = { innerHTML: '', textContent: '' };
      mockModalBody = { innerHTML: '', textContent: '' };

      const mockErrorModal = {
        style: {},
        classList: { remove: jest.fn(), add: jest.fn() },
        querySelector: jest.fn((sel) => {
          if (sel === '.modal-title') return mockModalTitle;
          if (sel === '.modal-content') return { insertBefore: jest.fn() };
          if (sel === '.close') return {};
          return null;
        })
      };

      const mockLoteModal = {
        style: {},
        classList: { remove: jest.fn(), add: jest.fn() },
        querySelector: jest.fn(() => ({}))
      };

      global.document = {
        getElementById: jest.fn((id) => {
          if (id === 'errorModal') return mockErrorModal;
          if (id === 'modalMessage') return mockModalMessage;
          if (id === 'loteModal') return mockLoteModal;
          if (id === 'modalTitle') return mockModalTitle;
          if (id === 'modalBody') return mockModalBody;
          return null;
        }),
        createElement: jest.fn((tag) => ({
          tagName: tag,
          className: '',
          style: {},
          textContent: '',
          innerHTML: '',
          appendChild: jest.fn(),
          insertBefore: jest.fn()
        }))
      };
    });

    afterEach(() => {
      delete global.document;
    });

    test('showModal sanitizes HTML payloads in messages', () => {
      const xssPayload = `Notice: <img src=x onerror=alert('xss')> Error occurred`;
      showModal(xssPayload, 'Notice');

      expect(mockModalMessage.innerHTML).not.toContain('onerror');
      expect(mockModalTitle.textContent).toBe('Notice');
    });

    test('showModalForm strips script tags from bodyContent', () => {
      const dangerousForm = `<p>Data</p><script>alert('pwn')</script>`;
      showModalForm('Form Title', dangerousForm);

      expect(mockModalBody.innerHTML).not.toContain('<script');
      expect(mockModalBody.innerHTML).not.toContain("alert('pwn')");
      expect(mockModalTitle.textContent).toBe('Form Title');
    });

    test('showProgressModal escapes message and step parameters', () => {
      const dangerousStep = `<img src=x onerror=alert('step')>`;
      const dangerousMsg = `<script>alert('msg')</script>`;
      showProgressModal(dangerousMsg, 'Procesando', [dangerousStep]);

      expect(mockModalMessage.innerHTML).not.toContain('<script');
      expect(mockModalMessage.innerHTML).not.toContain('onerror');
      expect(mockModalMessage.innerHTML).toContain('&lt;img src=x');
    });
  });
});

// Minimal Buffer polyfill to satisfy esm-built modules in browser.
// Only exposes the bits typically used by crypto libs when bundled for ESM.

class BufferPolyfill extends Uint8Array {
  static from(input, encoding) {
    if (typeof input === 'string') {
      if (encoding === 'hex') {
        const bytes = new Uint8Array(input.length / 2);
        for (let i = 0; i < bytes.length; i++) {
          bytes[i] = parseInt(input.substr(i * 2, 2), 16);
        }
        return new BufferPolyfill(bytes);
      }
      // utf8 default
      const encoder = new TextEncoder();
      return new BufferPolyfill(encoder.encode(input));
    }
    if (ArrayBuffer.isView(input) || input instanceof ArrayBuffer) {
      return new BufferPolyfill(new Uint8Array(input.buffer || input));
    }
    if (Array.isArray(input)) {
      return new BufferPolyfill(Uint8Array.from(input));
    }
    throw new TypeError('Unsupported Buffer.from input');
  }

  static alloc(length) {
    return new BufferPolyfill(new Uint8Array(length));
  }

  toString(encoding = 'utf8') {
    if (encoding === 'hex') {
      return Array.from(this).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    const decoder = new TextDecoder();
    return decoder.decode(this);
  }
}

export default BufferPolyfill;
export { BufferPolyfill as Buffer };

# noble-secp256k1

Fastest 5KB JS implementation of secp256k1 signatures & ECDH.

- ✍️ [ECDSA](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm)
  signatures compliant with [RFC6979](https://www.rfc-editor.org/rfc/rfc6979)
- ➰ Schnorr
  signatures compliant with [BIP340](https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki)
- 🤝 Elliptic Curve Diffie-Hellman [ECDH](https://en.wikipedia.org/wiki/Elliptic-curve_Diffie–Hellman)
- 🔒 Supports [hedged signatures](https://paulmillr.com/posts/deterministic-signatures/) guarding against fault attacks
- 🦶 4.94KB (gzipped, elliptic.js is 10x larger, tiny-secp256k1 is 25x larger)

The module is a sister project of [noble-curves](https://github.com/paulmillr/noble-curves),
focusing on smaller attack surface & better auditability.
Curves are drop-in replacement and have more features:
MSM, DER encoding, endomorphism, prehashing, custom point precomputes, hash-to-curve, oprf.
To upgrade from earlier version, see [Upgrading](#upgrading).

898-byte version of the library is available for learning purposes in `test/misc/1kb.min.js`,
it was created for the article [Learning fast elliptic-curve cryptography](https://paulmillr.com/posts/noble-secp256k1-fast-ecc/).

### This library belongs to _noble_ cryptography

> **noble-cryptography** — high-security, easily auditable set of contained cryptographic libraries and tools.

- Zero or minimal dependencies
- Highly readable TypeScript / JS code
- PGP-signed releases and transparent NPM builds with provenance
- Check out [homepage](https://paulmillr.com/noble/) & all libraries:
  [ciphers](https://github.com/paulmillr/noble-ciphers),
  [curves](https://github.com/paulmillr/noble-curves),
  [hashes](https://github.com/paulmillr/noble-hashes),
  [post-quantum](https://github.com/paulmillr/noble-post-quantum),
  5kb [secp256k1](https://github.com/paulmillr/noble-secp256k1) /
  [ed25519](https://github.com/paulmillr/noble-ed25519)

## Usage

> `npm install @noble/secp256k1`

> `deno add jsr:@noble/secp256k1`

We support all major platforms and runtimes. For React Native, additional polyfills are needed: see below.

```js
import * as secp from '@noble/secp256k1';
(async () => {
  const { secretKey, publicKey } = secp.keygen();
  // const publicKey = secp.getPublicKey(secretKey);
  const msg = new TextEncoder().encode('hello noble');
  const sig = await secp.signAsync(msg, secretKey);
  const isValid = await secp.verifyAsync(sig, msg, publicKey);

  const bobsKeys = secp.keygen();
  const shared = secp.getSharedSecret(secretKey, bobsKeys.publicKey); // Diffie-Hellman
  const sigr = await secp.signAsync(msg, secretKey, { format: 'recovered' });
  const publicKey2 = secp.recoverPublicKey(sigr, msg);
})();

// Schnorr signatures from BIP340

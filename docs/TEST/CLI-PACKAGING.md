# Packaging `hardwareWallet.js` as a standalone CLI

This document explains how to produce a single executable from `wallet/test/hardwareWallet.js` so non-technical users can run the tool without installing Node.

Two popular tools are `pkg` and `nexe`. Below are example steps using `pkg`.

1. Install `pkg` globally (or use npx):

```bash
npm install -g pkg
# or
npx pkg --version
```

2. Prepare the entry point and package.json
- Ensure `wallet/test/hardwareWallet.js` is the entry and uses runtime `fs` read for package metadata (already done).
- Add a `bin` field in `package.json` or use `pkg` directly.

3. Build the binary (example for Windows x64):

```bash
npx pkg wallet/test/hardwareWallet.js --targets node18-win-x64 --output dist/hardwareWallet.exe
```

4. Distribute
- Provide a ZIP with `hardwareWallet.exe`, a `README` with checksums and usage steps.
- Encourage users to verify binary integrity (SHA256) before running.

Notes
- `pkg` bundles node runtime; compiled binaries are large (~20-50MB).
- Some native modules or dynamic requires may need special handling.
- Test the binary on a clean VM before distribution.

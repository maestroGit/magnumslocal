# Local Chain Storage Rotation - Technical Spec

## 1. Purpose
Define the official technical specification for local blockchain persistence in sequential binary files with automatic rotation in magnumslocal.

This document is implementation-oriented but code-agnostic. It establishes contracts, constraints, and operational behavior.

## 2. Scope
In scope:
- Binary persistence of blockchain blocks to local disk.
- Sequential append-only writes.
- Rotation policy for .dat files.
- Startup load and recovery behavior.
- Integrity checks and corruption handling.
- Operational conventions for backup, restore, and monitoring.

Out of scope:
- Network consensus rules.
- P2P propagation protocol.
- Wallet key management.
- API contract design.

## 3. Context and Alignment
This spec is subordinate to the global architecture manual in docs/IA/standards.md.

Key alignments:
- Minimal dependency policy: prefer Node.js core modules and existing internal components.
- Clean modular boundaries: persistence logic belongs to storage/domain layer, not HTTP layer.
- Secure defaults: no secret material in persisted chain files.

## 4. Storage Model

### 4.1 Physical location
Official base directory for chain binary files:
- storage/data/

File naming convention:
- blk00000.dat
- blk00001.dat
- blk00002.dat

Naming rules:
- Five-digit zero-padded incremental index.
- No gaps expected during normal operation.
- New files are created only by rotation logic.

### 4.2 Logical model
- Append-only ledger fragments across one or more .dat segment files.
- Each segment contains a stream of block records.
- Record order is canonical chain order at write time.

## 5. Binary Record Format
Each block record uses a length-prefixed frame:
1. Prefix: 4 bytes UInt32BE with payload length N.
2. Payload: N bytes block serialization.

Current payload serialization:
- JSON UTF-8 bytes (portable and debuggable).

Forward compatibility note:
- Payload format may evolve to compact binary in a future version, preserving the same 4-byte framing contract.

### 5.1 Block fields expected in payload
Expected block object fields:
- timestamp
- previousHash
- hash
- data
- body (optional)
- nonce
- difficulty
- processTime

Consumer behavior:
- Unknown fields must be ignored (forward-compatible read).
- Missing critical fields should mark record invalid for chain reconstruction.

## 6. Rotation Policy

### 6.1 Threshold
Rotation threshold per segment file:
- 128 MiB (134217728 bytes)

### 6.2 Trigger
Rotation must occur before writing a new record that would exceed the threshold:
- if current_size + record_size > threshold => rotate

### 6.3 Rotation behavior
- Close current file descriptor.
- Open next indexed file in append mode.
- Continue write without service restart.
- Keep append-only semantics.

### 6.4 Rationale
- Bound file size for faster backup and integrity scans.
- Prevent oversized files that degrade tooling and operations.
- Keep behavior predictable for long-running nodes.

## 7. Startup and Recovery Behavior

### 7.1 Normal startup
- Discover segment files in ascending index order.
- Read each file sequentially record by record.
- Reconstruct in-memory chain from valid records.
- Recompute or validate dependent state (for example UTXO) after load.

### 7.2 First boot behavior
If no segment file exists:
- Create genesis block in memory.
- Persist genesis as first record in blk00000.dat.

### 7.3 Corruption tolerance
Recommended minimum behavior:
- If a record prefix is unreadable or incomplete at EOF, treat as truncated tail.
- Stop at last valid record boundary.
- Do not load partial record.

Recommended strict behavior modes:
- strict mode: fail startup on any corruption.
- tolerant mode: start with last valid prefix and emit critical alert.

Default recommendation for local node operations:
- tolerant mode with explicit warning and operator action required.

## 8. Integrity and Consistency Rules

### 8.1 Chain-level validation during load
For each loaded block after genesis:
- previousHash must match prior block hash.
- hash must validate against block content and mining rules in active chain implementation.

### 8.2 Atomicity expectations
- Single record append is expected to be atomic at application level, not guaranteed at filesystem crash boundary.
- Recovery relies on framed records to detect and discard incomplete tail writes.

### 8.3 Replace-chain behavior
When replacing full chain state:
- Use write-to-temp then atomic rename pattern where supported.
- Never partially overwrite active segment set.
- Preserve rollback path until replacement is complete.

## 9. Operational Controls

### 9.1 Configuration knobs
Recommended config keys (names may map to project config conventions):
- CHAIN_DATA_DIR (default: storage/data)
- CHAIN_SEGMENT_MAX_BYTES (default: 134217728)
- CHAIN_RECOVERY_MODE (strict|tolerant, default: tolerant)
- CHAIN_SYNC_FLUSH (on|off, optional durability/performance tuning)

### 9.2 Logging requirements
Must log at minimum:
- active segment path at startup
- number of loaded segments
- number of loaded blocks
- each rotation event (from, to, size)
- corruption/truncation detection with severity and offset

Must not log:
- private keys, credentials, or secret environment values

### 9.3 Metrics (recommended)
- chain_storage_segment_count
- chain_storage_total_bytes
- chain_storage_last_rotation_timestamp
- chain_storage_recovery_truncated_records
- chain_storage_load_duration_ms

## 10. Backup and Restore

### 10.1 Backup guidance
- Prefer file-system snapshot or cold copy when node is stopped.
- If hot backup is required, snapshot all segment files consistently.
- Keep checksum manifest per backup set.

### 10.2 Restore guidance
- Restore full segment set preserving filenames and order.
- Run startup integrity scan before exposing write endpoints.
- If scan fails in strict mode, require operator intervention.

## 11. Capacity Planning

Given threshold 128 MiB:
- With average block size 2000 bytes: about 67108 blocks per segment.
- With average block size 800 bytes: about 167772 blocks per segment.
- With average block size 400 bytes: about 335544 blocks per segment.

Operational note:
- For low block frequency nodes, a single segment may hold weeks or months of history.

## 12. Testing Strategy

### 12.1 Mandatory tests
- append and reload end-to-end
- genesis creation when no files exist
- rotation on boundary and near-boundary sizes
- startup with truncated tail record
- startup with malformed length prefix
- replace-chain full rewrite safety

### 12.2 Failure injection tests
- process kill during append
- disk-full simulation
- permission-denied on segment creation

### 12.3 Non-functional checks
- load time with multi-segment history
- memory footprint during startup scan

## 13. Security Considerations
- Persisted chain data is considered integrity-sensitive, not secret by default.
- File permissions should follow least privilege for node process user.
- Do not store OAuth tokens, session secrets, or private keys in chain segment payloads.

## 14. Change Management
Any change to this spec should include:
- decision summary
- backward compatibility impact
- migration and rollback plan
- ADR reference update in docs/IA/standards.md when architectural decisions change

## 15. Status
- Document status: active
- Last update: 2026-09-14
- Owner: Arquitectura Backend / Plataforma y DevOps

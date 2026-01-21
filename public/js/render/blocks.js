// Blocks renderer (ESM)
// Exports: renderBlocks(blocks), showBlockTransactions(index)
// Depends on UI modal helpers. Caches last blocks on window._lastBlocks.

import { safeModal } from '../ui/modals.js';

export function showBlockTransactions(blockIndex) {
  try {
    const blocks = window._lastBlocks || [];
    const block = blocks[blockIndex];
    if (!block) {
      // Fallback directo usando safeModal (title, html)
      safeModal('Error', 'Block not found');
      return;
    }
    const txs = Array.isArray(block.data) ? block.data : [];
    const content = `
      <div class="modal-info">
        <p><strong>💸 Transactions of Block #${blockIndex}</strong></p>
        <p><strong>Hash:</strong> ${block.hash}</p>
        <p><strong>Timestamp:</strong> ${new Date(block.timestamp).toLocaleString()}</p>
        <p><strong>Total transactions:</strong> ${txs.length}</p>
      </div>
      <div class="modal-body">
        ${txs.length === 0 ? '<p>No transactions in this block.</p>' : '<ul>' + txs.map((tx, i) => {
            const txId = (tx && tx.id) ? tx.id : (typeof tx === 'string' ? tx : JSON.stringify(tx).substring(0,40));
            return `<li class=\"tx-item\">
              <div class=\"tx-header\">
                <strong class=\"tx-label\">Tx:</strong>
                <code class=\"tx-id\">${txId}</code>
                <button class=\"dashboard-btn secondary tx-copy-btn\" type=\"button\" data-copy-txid=\"${txId}\">COPY TXID</button>
              </div>
              <pre class=\"json-display\">${typeof tx === 'string' ? tx : JSON.stringify(tx, null, 2)}</pre>
            </li>`
          }).join('') + '</ul>'}
      </div>
    `;
  // Uso unificado de safeModal
    safeModal(`💸Transactions - Blocks #${blockIndex}`, content);
  } catch (err) {
    console.error('showBlockTransactions error', err);
    alert('Error showing transactions: ' + err.message);
  }
}

export function renderBlocks(blocks, options = {}) {
  const blocksContainer = document.getElementById('blocksContainer');
  if (!blocksContainer) return;
  blocksContainer.innerHTML = '';
  blocks.forEach((block) => {
    const blockDiv = document.createElement('div');
    blockDiv.className = 'block';
    const formatContent = (content) => { if (!content) return ''; return String(content).match(/.{1,80}/g)?.join('\n') || String(content); };
    const formattedBody = formatContent(block.body);
    const formattedHash = formatContent(block.hash);
    const formattedPreviousHash = formatContent(block.previousHash);
    const formattedData = formatContent(JSON.stringify(block.data, null, 2));
    blockDiv.innerHTML = `
          <div><strong>Timestamp:</strong> ${block.timestamp}</div>
          <div><strong>Previous Hash:</strong> ${formattedPreviousHash}</div>
          <div><strong>Hash:</strong> ${formattedHash}</div>
          <div><strong>Nonce:</strong> ${block.nonce}</div>
          <div><strong>Difficulty:</strong> ${block.difficulty}</div>
          <div><strong>Process Time:</strong> ${block.processTime}</div>
          <div><strong>Data:</strong> ${formattedData}</div>
          <div class="block-body"><strong>Body:</strong> ${formattedBody}</div>
      `;
    blocksContainer.appendChild(blockDiv);
  });

  try { window._lastBlocks = blocks; } catch(e) { console.warn('Could not cache blocks', e); }

  const blocksModalContent = `
    <div class="modal-info">
      <p><strong>✅ Blocks loaded</strong></p>
      <p><strong>Total blocks:</strong> ${blocks.length}</p>
      <p><strong>Last block:</strong> ${
        blocks.length > 0 ? new Date(blocks[blocks.length - 1].timestamp).toLocaleString() : 'N/A'
      }</p>
    </div>
    <div class="modal-body">
      <ul>
        ${blocks.map((block, index) => `
          <li>
            <strong>Block #${index}</strong><br>
            Hash: ${String(block.hash).substring(0,20)}...<br>
            Timestamp: ${new Date(block.timestamp).toLocaleString()}<br>
            Transactions: ${Array.isArray(block.data) ? block.data.length : 0}
            <div class=\"tx-actions\">
              <button class=\"dashboard-btn secondary show-block-txs-btn\" type=\"button\" data-block-index=\"${index}\">Block</button>
            </div>
          </li>`).join('')}
      </ul>
    </div>`;
  if (options.showModal !== false) {
    safeModal('Blockchain', blocksModalContent);
  }
}

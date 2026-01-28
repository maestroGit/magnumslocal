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
          <p><strong>Block #${blockIndex}</strong></p>
          <p><strong>Hash:</strong> ${block.hash}</p>
          <p><strong>Timestamp:</strong> ${new Date(block.timestamp).toLocaleString()}</p>
          <p><strong>Total transfers:</strong> ${txs.length}</p>
        </div>
        <div class="modal-body">
          ${txs.length === 0 ? '<p>No transfers in this block.</p>' : '<ul>' + txs.map((tx, i) => {
            if (typeof tx === 'string') {
              return `<li class=\"tx-item\"><pre class=\"json-display\">${tx}</pre></li>`;
            }
            const txId = tx.id || '';
            const inputs = Array.isArray(tx.inputs) ? tx.inputs : [];
            const outputs = Array.isArray(tx.outputs) ? tx.outputs : [];
            return `<li class=\"monitor-card transaction-modal-item\">\n\
              <ul>\n\
                <li>\n\
                  <strong>Transfer #${i + 1}</strong><br>\n\
                  <strong>ID:</strong> <span class=\"tx-id\">${txId}</span><br>\n\
                  <strong>Inputs:</strong> ${inputs.length} | <strong>Outputs:</strong> ${outputs.length}<br>\n\
                  <strong>Amount:</strong> ${tx.amount !== undefined ? tx.amount : ''}<br>\n\
                  <details><summary>View Input Details</summary><ul>\n\
                    ${inputs.map(input => `<li>\n\
                      <strong>txId:</strong> <span class=\"tx-id\">${input.txId || ''}</span><br>\n\
                      <strong>outputIndex:</strong> ${input.outputIndex !== undefined ? input.outputIndex : ''}<br>\n\
                      <strong>Address:</strong> <span class=\"tx-id\">${input.address || ''}</span><br>\n\
                      <strong>Amount:</strong> ${input.amount !== undefined ? input.amount : ''}<br>\n\
                      <strong>Signature R:</strong> <span class=\"tx-id\">${input.signatureR || ''}</span><br>\n\
                      <strong>Signature S:</strong> <span class=\"tx-id\">${input.signatureS || ''}</span><br>\n\
                      <strong>Signature Recovery Param:</strong> ${input.signatureRecovery !== undefined ? input.signatureRecovery : ''}\n\
                    </li>`).join('')}\n\
                  </ul></details>\n\
                  <details><summary>View Output Details</summary><ul>\n\
                    ${outputs.map(output => `<li>\n\
                      <strong>Amount:</strong> ${output.amount !== undefined ? output.amount : ''}<br>\n\
                      <strong>Address:</strong> <span class=\"tx-id\">${output.address || ''}</span>\n\
                    </li>`).join('')}\n\
                  </ul></details>\n\
                </li>\n\
              </ul>\n\
            </li>`;
          }).join('') + '</ul>'}
        </div>
      `;
  // Uso unificado de safeModal
    safeModal(`Block #${blockIndex}`, content);
  } catch (err) {
    console.error('showBlockTransactions error', err);
    alert('Error showing transfers: ' + err.message);
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
      <p><strong>Total Blocks:</strong> ${blocks.length}</p>
      <p><strong>Last Block:</strong> ${
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
            Transfers: ${Array.isArray(block.data) ? block.data.length : 0}
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

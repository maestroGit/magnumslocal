// Log capture helpers

export const initLogCapture = ({ historySize = 500 } = {}) => {
  const logHistory = [];
  const origConsoleLog = console.log;
  const origConsoleWarn = console.warn;
  const origConsoleError = console.error;

  const pushLog = (type, args) => {
    const msg = args
      .map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)))
      .join(' ');
    const entry = { ts: new Date().toISOString(), type, msg };
    logHistory.push(entry);
    if (logHistory.length > historySize) {
      logHistory.shift();
    }
  };

  console.log = (...args) => {
    pushLog('log', args);
    origConsoleLog.apply(console, args);
  };
  console.warn = (...args) => {
    pushLog('warn', args);
    origConsoleWarn.apply(console, args);
  };
  console.error = (...args) => {
    pushLog('error', args);
    origConsoleError.apply(console, args);
  };

  return {
    logHistory,
    restore: () => {
      console.log = origConsoleLog;
      console.warn = origConsoleWarn;
      console.error = origConsoleError;
    },
  };
};

export const buildLogHtml = (logStore) => {
  const entries = logStore && logStore.logHistory ? logStore.logHistory : [];
  const header = '<html><head><title>Logs magnumslocal</title>' +
    '<style>body{font-family:monospace;background:#222;color:#eee;} .log{margin-bottom:2px;} ' +
    '.log-warn{color:#ff0;} .log-error{color:#f66;} .log-log{color:#8f8;} .ts{color:#888;}</style>' +
    '</head><body>' +
    '<h2>Logs recientes (magnumslocal)</h2>';
  const rows = entries.map((l) => {
    const safeMsg = l.msg.replace(/\n/g, '<br>');
    return `<div class="log log-${l.type}"><span class="ts">[${l.ts}]</span> <span>${l.type.toUpperCase()}</span>: <span>${safeMsg}</span></div>`;
  }).join('');
  return `${header}${rows}</body></html>`;
};

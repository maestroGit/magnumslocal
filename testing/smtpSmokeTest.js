import 'dotenv/config';
import { sendEmailWithTrace } from '../app/utils/sendEmail.js';

const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);

if (missingEnvVars.length > 0) {
  console.error('[SMTP][SMOKE][FAIL] Faltan variables SMTP:', missingEnvVars.join(', '));
  process.exit(1);
}

const to = process.env.SMTP_SMOKE_TO || process.env.SMTP_USER;

if (!to) {
  console.error('[SMTP][SMOKE][FAIL] Define SMTP_SMOKE_TO o SMTP_USER para recibir el correo.');
  process.exit(1);
}

const timestamp = new Date().toISOString();
const subject = `[SMTP SMOKE] ${timestamp}`;
const text = [
  'Smoke test SMTP de magnumslocal.',
  `Fecha: ${timestamp}`,
  'Si recibes este correo, el transporte SMTP está funcionando.'
].join('\n');

try {
  const info = await sendEmailWithTrace({
    to,
    subject,
    text,
    html: `<p>${text.replace(/\n/g, '<br>')}</p>`,
    trace: {
      test: 'smtp-smoke',
      timestamp
    }
  });

  console.log('[SMTP][SMOKE][OK]', {
    messageId: info.messageId || null,
    accepted: info.accepted || [],
    rejected: info.rejected || [],
    response: info.response || null
  });
  process.exit(0);
} catch (error) {
  console.error('[SMTP][SMOKE][FAIL] Error enviando correo SMTP:', error);
  process.exit(1);
}
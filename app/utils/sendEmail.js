import nodemailer from 'nodemailer';

const SMTP_TRACE_PREFIX = '[SMTP][BURN]';

const logSmtpTrace = (stage, payload) => {
  console.log(`${SMTP_TRACE_PREFIX}[${stage}]`, payload);
};

const buildTransporter = () => {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error('Falta configurar SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS');
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
};

export const sendEmail = async ({ to, subject, text, html }) => {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transporter = buildTransporter();

  return transporter.sendMail({
    from,
    to,
    subject,
    text,
    html
  });
};

export const sendEmailWithTrace = async ({ to, subject, text, html, trace = {} }) => {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  logSmtpTrace('ATTEMPT', {
    from,
    to,
    subject,
    ...trace
  });

  const transporter = buildTransporter();
  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html
  });

  logSmtpTrace('DELIVERED', {
    to,
    subject,
    messageId: info.messageId || null,
    accepted: info.accepted || [],
    rejected: info.rejected || [],
    response: info.response || null,
    envelope: info.envelope || null,
    ...trace
  });

  return info;
};

export const sendBurnEmailNotification = async ({ txId, bodegaId, amount, fecha }) => {
  logSmtpTrace('LOOKUP', { txId, bodegaId, amount, fecha });

  const User = (await import('../models/User.js')).default;
  const winery = await User.findByPk(bodegaId);

  if (!winery?.email) {
    logSmtpTrace('SKIP', {
      txId,
      bodegaId,
      reason: 'recipient-not-found-or-missing-email'
    });
    return {
      sent: false,
      reason: 'recipient-not-found-or-missing-email',
      bodegaId,
      txId
    };
  }

  const subject = 'Nuevo evento BURN detectado';
  const text = `Se ha quemado un token.\nTx: ${txId}\nCantidad: ${amount}\nFecha: ${fecha}`;
  const html = `
    <p>Se ha quemado un token asociado a tu bodega.</p>
    <p><strong>Tx:</strong> ${txId}</p>
    <p><strong>Cantidad:</strong> ${amount}</p>
    <p><strong>Fecha:</strong> ${fecha}</p>
  `;

  const info = await sendEmailWithTrace({
    to: winery.email,
    subject,
    text,
    html,
    trace: {
      txId,
      bodegaId,
      amount,
      fecha,
      recipientUserId: winery.id,
      recipientEmail: winery.email
    }
  });

  return {
    sent: true,
    txId,
    bodegaId,
    recipientEmail: winery.email,
    messageId: info.messageId || null,
    accepted: info.accepted || [],
    rejected: info.rejected || [],
    response: info.response || null,
    envelope: info.envelope || null
  };
};

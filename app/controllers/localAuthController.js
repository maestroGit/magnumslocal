import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { generateResetToken, verifyResetToken } from '../utils/generateResetToken.js';
import { sendEmail } from '../utils/sendEmail.js';

const GENERIC_FORGOT_RESPONSE = {
  message: 'Si el correo esta registrado, recibiras instrucciones para restablecer tu contrasena.'
};

const SALT_ROUNDS = 12;

const hasMinimumPasswordStrength = (password) => {
  if (typeof password !== 'string') return false;
  if (password.length < 10) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
};

const buildResetUrl = (token) => {
  const appUrl = process.env.APP_URL || 'https://miapp.com';
  return `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
};

const shouldSendRecoveryEmailToUser = (user) => {
  if (!user) return false;
  const provider = String(user.provider || '').toLowerCase();
  if (provider && provider !== 'local' && provider !== 'email') return false;
  return !!user.password_hash;
};

const sendRecoveryEmail = async ({ to, resetUrl }) => {
  const subject = 'Recuperacion de contrasena - BlocksWine';
  const text = [
    'Hemos recibido una solicitud para restablecer tu contrasena.',
    `Enlace (valido 15 minutos): ${resetUrl}`,
    'Si no solicitaste este cambio, ignora este correo.'
  ].join('\n');

  const html = `
    <p>Hemos recibido una solicitud para restablecer tu contrasena.</p>
    <p>
      <a href="${resetUrl}" target="_blank" rel="noopener noreferrer">
        Restablecer contrasena
      </a>
    </p>
    <p>Este enlace vence en 15 minutos.</p>
    <p>Si no solicitaste este cambio, ignora este correo.</p>
  `;

  await sendEmail({
    to,
    subject,
    text,
    html
  });
};

export const postLocalForgotPassword = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return res.status(200).json(GENERIC_FORGOT_RESPONSE);
    }

    // Recomendacion OWASP: añadir rate limiting especifico para este endpoint.
    const user = await User.unscoped().findOne({
      where: { email }
    });

    if (shouldSendRecoveryEmailToUser(user)) {
      const token = generateResetToken(user.id);
      const resetUrl = buildResetUrl(token);
      await sendRecoveryEmail({ to: email, resetUrl });
    }

    return res.status(200).json(GENERIC_FORGOT_RESPONSE);
  } catch (error) {
    console.error('[localAuthController] Error en forgot-password:', error);
    return res.status(200).json(GENERIC_FORGOT_RESPONSE);
  }
};

export const postLocalResetPassword = async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    const newPassword = String(req.body?.newPassword || '');

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token y nueva contrasena son requeridos.' });
    }

    if (!hasMinimumPasswordStrength(newPassword)) {
      return res.status(400).json({
        error: 'La contrasena debe tener al menos 10 caracteres, mayuscula, minuscula, numero y simbolo.'
      });
    }

    let payload;
    try {
      payload = verifyResetToken(token);
    } catch {
      return res.status(400).json({ error: 'Token invalido o expirado.' });
    }

    if (payload.typ !== 'pwd_reset' || !payload.userId) {
      return res.status(400).json({ error: 'Token invalido o expirado.' });
    }

    const user = await User.unscoped().findByPk(payload.userId);

    if (!user) {
      return res.status(400).json({ error: 'Token invalido o expirado.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.password_hash = passwordHash;

    if (Object.prototype.hasOwnProperty.call(user.dataValues, 'password_updated_at')) {
      user.password_updated_at = new Date();
    }

    await user.save();

    return res.status(200).json({ message: 'Contrasena actualizada correctamente.' });
  } catch (error) {
    console.error('[localAuthController] Error en reset-password:', error);
    return res.status(500).json({ error: 'No se pudo procesar la solicitud.' });
  }
};

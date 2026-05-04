import jwt from 'jsonwebtoken';

const RESET_TOKEN_TTL_MINUTES = Number(process.env.RESET_TOKEN_TTL_MINUTES || 15);

export const generateResetToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no configurado');
  }

  return jwt.sign(
    { userId, typ: 'pwd_reset' },
    secret,
    { expiresIn: `${RESET_TOKEN_TTL_MINUTES}m` }
  );
};

export const verifyResetToken = (token) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no configurado');
  }

  return jwt.verify(token, secret);
};

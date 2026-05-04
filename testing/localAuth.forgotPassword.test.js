import { jest } from '@jest/globals';

const mockFindOne = jest.fn();
const mockFindByPk = jest.fn();
const mockSave = jest.fn();
const mockGenerateResetToken = jest.fn();
const mockVerifyResetToken = jest.fn();
const mockSendEmail = jest.fn();

jest.mock('../app/models/index.js', () => ({
  User: {
    unscoped: jest.fn(() => ({
      findOne: mockFindOne,
      findByPk: mockFindByPk
    }))
  }
}));

jest.mock('../app/utils/generateResetToken.js', () => ({
  generateResetToken: (...args) => mockGenerateResetToken(...args),
  verifyResetToken: (...args) => mockVerifyResetToken(...args)
}));

jest.mock('../app/utils/sendEmail.js', () => ({
  sendEmail: (...args) => mockSendEmail(...args)
}));

import {
  postLocalForgotPassword,
  postLocalResetPassword
} from '../app/controllers/localAuthController.js';

const createMockRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('localAuthController forgot/reset password', () => {
  const previousEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.APP_URL = 'https://miapp.com';

    mockGenerateResetToken.mockReturnValue('mock-reset-token');
  });

  afterAll(() => {
    process.env = previousEnv;
  });

  test('forgot-password responde generico aunque el email no exista', async () => {
    mockFindOne.mockResolvedValue(null);

    const req = { body: { email: 'noexiste@dominio.com' } };
    const res = createMockRes();

    await postLocalForgotPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Si el correo esta registrado, recibiras instrucciones para restablecer tu contrasena.'
    });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  test('forgot-password envia email si el usuario local existe', async () => {
    mockFindOne.mockResolvedValue({
      id: 'user-1',
      provider: 'local',
      password_hash: 'hash-presente'
    });

    const req = { body: { email: 'user@dominio.com' } };
    const res = createMockRes();

    await postLocalForgotPassword(req, res);

    expect(mockGenerateResetToken).toHaveBeenCalledWith('user-1');
    expect(mockSendEmail).toHaveBeenCalledTimes(1);

    const [emailPayload] = mockSendEmail.mock.calls[0];
    expect(emailPayload.to).toBe('user@dominio.com');
    expect(emailPayload.text).toContain('https://miapp.com/reset-password?token=mock-reset-token');

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('forgot-password no envia email para cuenta oauth sin password local', async () => {
    mockFindOne.mockResolvedValue({
      id: 'google-1',
      provider: 'google',
      password_hash: null
    });

    const req = { body: { email: 'oauth@dominio.com' } };
    const res = createMockRes();

    await postLocalForgotPassword(req, res);

    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('reset-password rechaza token invalido', async () => {
    mockVerifyResetToken.mockImplementation(() => {
      throw new Error('jwt malformed');
    });

    const req = {
      body: {
        token: 'token-invalido',
        newPassword: 'PasswordSegura!2026'
      }
    };
    const res = createMockRes();

    await postLocalResetPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token invalido o expirado.' });
  });

  test('reset-password actualiza password cuando token es valido', async () => {
    const user = {
      password_hash: 'hash-antiguo',
      dataValues: {},
      save: mockSave
    };

    mockVerifyResetToken.mockReturnValue({ typ: 'pwd_reset', userId: 'user-1' });
    mockFindByPk.mockResolvedValue(user);
    mockSave.mockResolvedValue(undefined);

    const req = {
      body: {
        token: 'token-valido',
        newPassword: 'PasswordSegura!2026'
      }
    };
    const res = createMockRes();

    await postLocalResetPassword(req, res);

    expect(mockFindByPk).toHaveBeenCalledWith('user-1');
    expect(user.password_hash).not.toBe('hash-antiguo');
    expect(user.password_hash).toMatch(/^\$2[aby]\$/);
    expect(mockSave).toHaveBeenCalledTimes(1);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Contrasena actualizada correctamente.'
    });
  });
});

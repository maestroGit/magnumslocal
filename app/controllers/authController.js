// app/controllers/authController.js
// Controlador para endpoints de autenticación OAuth y gestión de sesión

import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';

export const getAuthUser = (req, res) => {
  try {
    if (req.isAuthenticated && req.isAuthenticated()) {
      return res.json({ user: req.user });
    }

    if (req.session && req.session.user) {
      return res.json({ user: req.session.user });
    }

    return res.status(401).json({ user: null });
  } catch (error) {
    console.error("[authController] Error en getAuthUser:", error);
    res.status(500).json({ user: null, error: error.message });
  }
};

export const postAuthLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    const user = await User.findOne({
      where: { email: username }
    });

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const sessionUser = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      role: user.role
    };

    if (req.session) {
      req.session.user = sessionUser;
    }

    return res.json({ user: sessionUser });
  } catch (error) {
    console.error('[authController] Error en postAuthLogin:', error);
    return res.status(500).json({ error: 'Error al autenticar' });
  }
};

export const postAuthLogout = (req, res) => {
  try {
    if (req.session) {
      req.session.destroy(() => {
        res.json({ success: true });
      });
      return;
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('[authController] Error en postAuthLogout:', error);
    return res.status(500).json({ error: 'Error al cerrar sesión' });
  }
};

export const getGoogleCallback = (req, res) => {
  try {
    // Autenticación exitosa, redirigir a la página principal
    res.redirect("/");
  } catch (error) {
    console.error("[authController] Error en getGoogleCallback:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
};

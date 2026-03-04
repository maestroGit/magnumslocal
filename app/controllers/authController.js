// app/controllers/authController.js
// Controlador para endpoints de autenticación OAuth y gestión de sesión

import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';

const isGoogleProfileIncomplete = (user) => {
  if (!user || user.provider !== 'google') return false;

  const hasRole = ['user', 'winery', 'admin'].includes(user.role);
  const hasCity = typeof user.localizacion_direccion === 'string' && user.localizacion_direccion.trim().length > 0;
  const hasLat = user.localizacion_lat !== null && user.localizacion_lat !== undefined;
  const hasLng = user.localizacion_lng !== null && user.localizacion_lng !== undefined;

  return !(hasRole && hasCity && hasLat && hasLng);
};

const getAuthenticatedUserId = (req) => {
  if (req.user?.id) return req.user.id;
  if (req.session?.user?.id) return req.session.user.id;
  return null;
};

const normalizeSocialUrl = (rawValue, platform) => {
  if (rawValue === null || rawValue === undefined) return null;

  const trimmed = String(rawValue).trim();
  if (!trimmed) return null;

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(`URL inválida para ${platform}`);
  }

  const hostname = parsed.hostname.toLowerCase();

  if (platform === 'x') {
    const valid = hostname === 'x.com' || hostname.endsWith('.x.com') || hostname === 'twitter.com' || hostname.endsWith('.twitter.com');
    if (!valid) throw new Error('La URL de X debe apuntar a x.com o twitter.com');
  }

  if (platform === 'instagram') {
    const valid = hostname === 'instagram.com' || hostname.endsWith('.instagram.com');
    if (!valid) throw new Error('La URL de Instagram debe apuntar a instagram.com');
  }

  if (platform === 'youtube') {
    const valid = hostname === 'youtube.com' || hostname.endsWith('.youtube.com') || hostname === 'youtu.be';
    if (!valid) throw new Error('La URL de YouTube debe apuntar a youtube.com o youtu.be');
  }

  return parsed.toString();
};

export const getAuthUser = (req, res) => {
  try {
    const isAuthenticated = (req.isAuthenticated && req.isAuthenticated()) || !!req.session?.user;
    if (!isAuthenticated) {
      return res.status(401).json({ user: null, profileIncomplete: false });
    }

    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ user: null, profileIncomplete: false });
    }

    return User.findByPk(userId).then((freshUser) => {
      if (!freshUser) {
        return res.status(401).json({ user: null, profileIncomplete: false });
      }

      return res.json({
        user: freshUser,
        profileIncomplete: isGoogleProfileIncomplete(freshUser)
      });
    }).catch((dbError) => {
      console.error('[authController] Error consultando usuario en getAuthUser:', dbError);
      return res.status(500).json({ user: null, profileIncomplete: false, error: dbError.message });
    });
  } catch (error) {
    console.error("[authController] Error en getAuthUser:", error);
    res.status(500).json({ user: null, profileIncomplete: false, error: error.message });
  }
};

export const postAuthLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    // Usar unscoped() para ignorar defaultScope
    const user = await User.unscoped().findOne({
      where: { email: username }
    });

    console.log('[AUTH] User found:', !!user);
    console.log('[AUTH] Has password_hash:', !!user?.password_hash);

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    console.log('[AUTH] Password match:', isValid);
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
    if (!req.user) {
      return res.redirect('/login.html');
    }

    if (isGoogleProfileIncomplete(req.user)) {
      return res.redirect('/complete-profile.html');
    }

    return res.redirect('/');
  } catch (error) {
    console.error("[authController] Error en getGoogleCallback:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
};

export const postAuthCompleteProfile = async (req, res) => {
  try {
    const isAuthenticated = (req.isAuthenticated && req.isAuthenticated()) || !!req.session?.user;
    if (!isAuthenticated) {
      return res.status(401).json({ success: false, error: 'No autenticado' });
    }

    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Sesión inválida' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    if (user.provider !== 'google') {
      return res.status(400).json({ success: false, error: 'Este endpoint solo aplica a usuarios Google' });
    }

    const {
      role,
      city,
      localizacion_lat,
      localizacion_lng,
      social_x,
      social_instagram,
      social_youtube
    } = req.body || {};

    if (!role || !['user', 'winery'].includes(role)) {
      return res.status(400).json({ success: false, error: 'role debe ser user o winery' });
    }

    if (!city || typeof city !== 'string' || city.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'city es requerida (mínimo 2 caracteres)' });
    }

    const lat = Number(localizacion_lat);
    const lng = Number(localizacion_lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ success: false, error: 'Ubicación exacta requerida (lat/lng válidos)' });
    }

    let socialXNormalized;
    let socialInstagramNormalized;
    let socialYoutubeNormalized;

    try {
      socialXNormalized = normalizeSocialUrl(social_x, 'x');
      socialInstagramNormalized = normalizeSocialUrl(social_instagram, 'instagram');
      socialYoutubeNormalized = normalizeSocialUrl(social_youtube, 'youtube');
    } catch (validationError) {
      return res.status(400).json({ success: false, error: validationError.message });
    }

    await user.update({
      role,
      localizacion_direccion: city.trim(),
      localizacion_lat: lat,
      localizacion_lng: lng,
      social_x: socialXNormalized,
      social_instagram: socialInstagramNormalized,
      social_youtube: socialYoutubeNormalized
    });

    if (req.session?.user) {
      req.session.user = {
        ...req.session.user,
        role: user.role,
        localizacion_direccion: user.localizacion_direccion,
        localizacion_lat: user.localizacion_lat,
        localizacion_lng: user.localizacion_lng,
        social_x: user.social_x,
        social_instagram: user.social_instagram,
        social_youtube: user.social_youtube
      };
    }

    if (req.user) {
      req.user.role = user.role;
      req.user.localizacion_direccion = user.localizacion_direccion;
      req.user.localizacion_lat = user.localizacion_lat;
      req.user.localizacion_lng = user.localizacion_lng;
      req.user.social_x = user.social_x;
      req.user.social_instagram = user.social_instagram;
      req.user.social_youtube = user.social_youtube;
    }

    return res.json({
      success: true,
      data: user,
      profileIncomplete: isGoogleProfileIncomplete(user)
    });
  } catch (error) {
    console.error('[authController] Error en postAuthCompleteProfile:', error);
    return res.status(500).json({ success: false, error: 'Error al completar perfil', details: error.message });
  }
};

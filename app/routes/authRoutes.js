// app/routes/authRoutes.js
// Rutas de autenticación OAuth2 Google y gestión de sesión de usuario

import express from "express";
import passport from "passport";
import { getAuthUser, getGoogleCallback } from "../controllers/authController.js";

const router = express.Router();

/**
 * GET /auth/google
 * Inicia el flujo de autenticación con Google
 * Redirige a Google para que el usuario autorize la aplicación
 */
router.get("/auth/google",
  passport.authenticate("google", { 
    scope: ["profile", "email"] 
  })
);

/**
 * GET /auth/google/callback
 * Endpoint de callback después de que Google autentica al usuario
 * Si éxito → redirige a "/"
 * Si fallo → redirige a "/login"
 */
router.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  getGoogleCallback
);

/**
 * GET /auth/user
 * Devuelve info del usuario autenticado en sesión actual
 * Si autenticado → { user: {...} }
 * Si no autenticado → 401 { user: null }
 */
router.get("/auth/user", getAuthUser);

export default router;

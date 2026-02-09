// app/controllers/authController.js
// Controlador para endpoints de autenticación OAuth y gestión de sesión

export const getAuthUser = (req, res) => {
  try {
    if (req.isAuthenticated && req.isAuthenticated()) {
      res.json({ user: req.user });
    } else {
      res.status(401).json({ user: null });
    }
  } catch (error) {
    console.error("[authController] Error en getAuthUser:", error);
    res.status(500).json({ user: null, error: error.message });
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

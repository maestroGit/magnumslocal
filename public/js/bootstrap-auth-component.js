const redirectToLogin = () => {
  window.location.href = "login.html";
};

const initAuthComponent = async () => {
  const res = await fetch("/auth/user", { credentials: "include" });
  if (!res.ok) {
    redirectToLogin();
    return;
  }

  const data = await res.json().catch(() => ({}));
  if (!data.user) {
    redirectToLogin();
    return;
  }

  const { AuthComponent } = await import("./auth-component.js");
  new AuthComponent("#auth-container");
};

initAuthComponent().catch((error) => {
  console.error("[AUTH][BOOTSTRAP] Error inicializando AuthComponent:", error);
  redirectToLogin();
});

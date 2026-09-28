(() => {
  const link = document.getElementById("map-link");
  if (!link) return;

  const runtimeUrl = window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.MAP_SERVICE_URL;
  link.href = runtimeUrl || "#";
})();

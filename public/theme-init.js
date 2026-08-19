// Anti-flash de tema: aplica a classe .dark antes do CSS pintar.
// Arquivo externo (nao inline) para respeitar CSP script-src 'self' sem hash/nonce.
(function () {
  try {
    var stored = localStorage.getItem("faro.theme.v1");
    var pref = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    var isDark =
      pref === "dark" ||
      (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) document.documentElement.classList.add("dark");
  } catch (_) {
    document.documentElement.classList.add("dark");
  }
})();

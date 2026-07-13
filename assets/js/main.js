/* main.js — theme, nav, reveal, fiducial ticks */
(function () {
  // ----- theme -----
  const root = document.documentElement;
  const stored = localStorage.getItem("theme");
  const preferDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (stored === "dark" || (!stored && preferDark)) root.setAttribute("data-theme", "dark");

  window.toggleTheme = function () {
    const dark = root.getAttribute("data-theme") === "dark";
    if (dark) { root.removeAttribute("data-theme"); localStorage.setItem("theme", "light"); }
    else { root.setAttribute("data-theme", "dark"); localStorage.setItem("theme", "dark"); }
    document.dispatchEvent(new CustomEvent("themechange"));
  };

  // ----- current nav link -----
  const here = location.pathname.replace(/\/$/, "") || "/";
  document.querySelectorAll(".nav-links a").forEach((a) => {
    const path = new URL(a.href, location.origin).pathname.replace(/\/$/, "") || "/";
    const match = path === here || (path === "/index.html" && here === "/") || (here === "/index.html" && path === "/");
    if (match) a.setAttribute("aria-current", "page");
  });

  // ----- fiducial corner ticks -----
  document.querySelectorAll(".fid").forEach((el) => {
    ["tl", "tr", "bl", "br"].forEach((pos) => {
      const t = document.createElement("span");
      t.className = "tick " + pos;
      el.appendChild(t);
    });
  });

  // ----- reveal on scroll -----
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
    { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
  );
  window.observeReveals = function (scope) {
    (scope || document).querySelectorAll(".reveal:not(.in)").forEach((el) => io.observe(el));
  };
  window.observeReveals();
  // failsafe: never leave in-viewport content hidden
  setInterval(() => {
    document.querySelectorAll(".reveal:not(.in)").forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight + 40) el.classList.add("in");
    });
  }, 1500);

  // ----- footer year -----
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();

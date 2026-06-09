/* ============================================================
   CONFIG — cambia tu número de WhatsApp aquí (formato internacional,
   solo dígitos, sin + ni espacios). Ej. México: 5215512345678
   ============================================================ */
const WHATSAPP_NUMBER = "525573241649"; // Francisco Vega

/* ---- WhatsApp links ---- */
function buildWaLink(msg) {
  const text = encodeURIComponent(msg || "Hola Francisco, vi tu página.");
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}
document.querySelectorAll("[data-msg]").forEach((el) => {
  el.setAttribute("href", buildWaLink(el.getAttribute("data-msg")));
  el.setAttribute("target", "_blank");
  el.setAttribute("rel", "noopener");
});

/* ---- Year ---- */
document.getElementById("year").textContent = new Date().getFullYear();

/* ---- Nav scrolled state ---- */
const nav = document.getElementById("nav");
const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

/* ---- Mobile menu ---- */
const toggle = document.getElementById("navToggle");
const links = document.querySelector(".nav-links");
toggle?.addEventListener("click", () => links.classList.toggle("open"));
links?.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => links.classList.remove("open"))
);

/* ---- Reveal on scroll ---- */
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    });
  },
  { threshold: 0.12 }
);
document.querySelectorAll(".reveal").forEach((el, i) => {
  el.style.transitionDelay = `${Math.min(i % 5, 4) * 60}ms`;
  io.observe(el);
});

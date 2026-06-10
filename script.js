/* ============================================================
   CONFIG — número de WhatsApp (formato internacional, solo dígitos)
   ============================================================ */
const WHATSAPP_NUMBER = "525573241649"; // Francisco Vega

/* ---- WhatsApp links ---- */
function buildWaLink(msg) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg || "Hola Francisco")}`;
}
document.querySelectorAll("[data-msg]").forEach((el) => {
  el.setAttribute("href", buildWaLink(el.getAttribute("data-msg")));
  el.setAttribute("target", "_blank");
  el.setAttribute("rel", "noopener");
});

/* ---- Año ---- */
document.getElementById("year").textContent = new Date().getFullYear();

/* ---- Nav: estado al hacer scroll ---- */
const nav = document.getElementById("nav");
const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

/* ---- Menú móvil ---- */
const toggle = document.getElementById("navToggle");
const links = document.getElementById("navLinks");
toggle?.addEventListener("click", () => links.classList.toggle("open"));
links?.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => links.classList.remove("open"))
);

/* ---- Animaciones ---- */
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!window.gsap || reduceMotion) {
  // Fallback seguro: mostrar todo sin animar
  document.documentElement.classList.add("no-anim");
} else {
  gsap.registerPlugin(ScrollTrigger);

  // Reveal con stagger por lotes (entrada suave, ease-out, ~50-70ms entre items)
  ScrollTrigger.batch(".anim", {
    start: "top 88%",
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.07,
        overwrite: true,
      }),
  });

  // Parallax sutil del glow del hero
  gsap.to(".hero-glow", {
    yPercent: 22,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });

  // Deriva lenta del grid del hero (vida sin distraer)
  gsap.to(".hero-grid", {
    backgroundPositionY: "56px",
    duration: 14,
    ease: "none",
    repeat: -1,
  });

  // Refresh tras cargar fuentes/imágenes para posiciones correctas
  window.addEventListener("load", () => ScrollTrigger.refresh());
}

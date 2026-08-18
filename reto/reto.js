/* ============================================================
   Flow AI — landing del Reto 30 Días.

   Solo lo que es de esta página: el nav y la barra fija de compra.
   El precio y los links de pago los pone ../flowai.js, que corre
   en todo el sitio.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Año del footer ---------- */
  var y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());

  /* ---------- Nav ---------- */
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () { links.classList.toggle('open'); });
  }
  var nav = document.getElementById('nav');
  if (nav) {
    var alScrollNav = function () { nav.classList.toggle('scrolled', window.scrollY > 8); };
    alScrollNav();
    window.addEventListener('scroll', alScrollNav, { passive: true });
  }

  /* ---------- Barra fija ----------
     Aparece cuando el hero ya se fue de pantalla y se esconde al
     llegar al bloque de precio: ahí abajo ya hay un botón y dos
     botones de lo mismo en pantalla se ven a desesperado. */
  var barra = document.getElementById('barraCompra');
  var precio = document.getElementById('precio');
  if (barra) {
    var revisar = function () {
      var pasoElHero = window.scrollY > window.innerHeight * 0.85;
      var enElPrecio = false;
      if (precio) {
        var r = precio.getBoundingClientRect();
        enElPrecio = r.top < window.innerHeight && r.bottom > 0;
      }
      barra.classList.toggle('visible', pasoElHero && !enElPrecio);
    };
    revisar();
    window.addEventListener('scroll', revisar, { passive: true });
    window.addEventListener('resize', revisar, { passive: true });
  }
})();

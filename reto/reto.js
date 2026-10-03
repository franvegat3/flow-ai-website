/* ============================================================
   Flow AI — landing del Reto 30 Días.

   Solo lo que es de esta página: la barra fija de compra y el año
   del footer. El precio y los links de pago los pone ../flowai.js,
   que corre en todo el sitio.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Año del footer ---------- */
  var y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());

  /* ---------- Barra fija ----------
     Aparece cuando el hero ya se fue de pantalla y se esconde al
     llegar al bloque de precio: ahí abajo ya hay un botón, y dos
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

  /* ---------- Video del hero (R3, oct-2026) ----------
     Arranca mudo en loop, como un reel. El botón prende el sonido y
     reinicia para que se oiga desde el principio. */
  var CFG = window.FLOW || {};
  var hero = document.getElementById('videoHero');
  var btn = document.querySelector('.lp-sound');
  if (hero && CFG.VIDEO_HERO_URL && hero.getAttribute('src') !== CFG.VIDEO_HERO_URL) hero.src = CFG.VIDEO_HERO_URL;
  if (hero && btn) {
    btn.addEventListener('click', function () {
      var conSonido = hero.muted;
      hero.muted = !conSonido;
      if (conSonido) { try { hero.currentTime = 0; } catch (e) {} hero.play().catch(function () {}); }
      btn.setAttribute('aria-pressed', conSonido ? 'true' : 'false');
      btn.textContent = conSonido ? '🔊 Sonido activado' : '🔇 Activar sonido';
    });
    /* Si el navegador bloqueó el autoplay, el primer toque en el video lo arranca. */
    hero.addEventListener('click', function () { if (hero.paused) hero.play().catch(function () {}); });
  }

  /* ---------- VSL: no se descarga hasta que se ve o se toca ---------- */
  var vsl = document.getElementById('videoVsl');
  if (vsl && !vsl.getAttribute('src')) {
    var src = vsl.getAttribute('data-src') || CFG.VIDEO_VSL_URL;
    var cargar = function () { if (src && !vsl.getAttribute('src')) { vsl.src = src; vsl.load(); } };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { cargar(); io.disconnect(); } });
      }, { rootMargin: '400px' });
      io.observe(vsl);
    } else { cargar(); }
    vsl.addEventListener('play', cargar);
  }
})();

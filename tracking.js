/* ============================================================
   Flow AI — pixel de Meta, GA4 y los eventos del embudo.

   Se carga DESPUÉS de atribucion.js (necesita window.FLOW_ATRIB) y
   DESPUÉS de flowai-config.js (de ahí saca los IDs).

   Si PIXEL_ID o GA4_ID están vacíos, cada parte se apaga sola y no
   pasa nada: el sitio sigue funcionando igual. Eso permite subir
   este archivo antes de tener los IDs.

   Los eventos llevan `eventID`. No es decorativo: cuando el mismo
   Purchase llegue por el navegador y por la Conversions API, Meta usa
   ese id para contarlo UNA vez. Sin él, se duplica y el CPA reportado
   sale a la mitad del real.
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.FLOW || {};
  var ATRIB = window.FLOW_ATRIB;

  var PIXEL = (CFG.PIXEL_ID || '').trim();
  var GA4 = (CFG.GA4_ID || '').trim();

  /* ---------- Meta Pixel ---------- */
  if (PIXEL) {
    /* Snippet oficial de Meta, sin cambios. */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0;
      t.src = v; s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    window.fbq('init', PIXEL);
    window.fbq('track', 'PageView');
  }

  /* ---------- GA4 ---------- */
  if (GA4) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA4);
  }

  /* ---------- Un solo lugar para disparar a las dos plataformas ---------- */
  var yaDisparado = {};

  function evento(nombre, datos, opciones) {
    opciones = opciones || {};
    /* Casi todos los eventos del embudo deben contarse una vez por
       carga de página. ViewContent con scroll y con temporizador puede
       llamarse dos veces; esto lo evita. */
    if (opciones.unaVez !== false) {
      if (yaDisparado[nombre]) return;
      yaDisparado[nombre] = true;
    }
    datos = datos || {};

    if (PIXEL && window.fbq) {
      var id = ATRIB ? ATRIB.idEvento(nombre) : undefined;
      window.fbq('track', nombre, datos, id ? { eventID: id } : undefined);
    }
    if (GA4 && window.gtag) {
      window.gtag('event', nombre, datos);
    }
  }

  window.FLOW_TRACK = { evento: evento };

  /* ---------- ViewContent: leyó de verdad, no solo abrió ----------
     Se dispara al 50% de scroll o a los 30 s, lo que pase primero.
     Distinguir "abrió" de "leyó" es lo que hace que el número sirva
     para algo. */
  (function () {
    if (!PIXEL && !GA4) return;
    var listo = false;

    function marcar() {
      if (listo) return;
      listo = true;
      evento('ViewContent', { content_name: document.title, content_category: location.pathname });
      window.removeEventListener('scroll', alScroll);
    }

    function alScroll() {
      var alto = document.documentElement.scrollHeight - window.innerHeight;
      if (alto <= 0) return marcar();
      if ((window.scrollY || window.pageYOffset) / alto >= 0.5) marcar();
    }

    window.addEventListener('scroll', alScroll, { passive: true });
    setTimeout(marcar, 30000);
  })();

  /* ---------- InitiateCheckout: clic a pagar ----------
     Se engancha a [data-checkout], que es por donde pasan los 11 CTA
     de la landing y los de las guías. Un solo listener delegado en el
     documento: así también cubre los botones que se inyectan después
     con JS (los pop-ups), que un querySelectorAll al cargar no vería. */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('[data-checkout]');
    if (!a) return;
    evento('InitiateCheckout', {
      content_name: 'Reto 30 Días',
      value: Number(CFG.PRECIO || 0),
      currency: CFG.MONEDA || 'USD'
    }, { unaVez: false });
  }, true);
})();

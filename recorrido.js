/* ============================================================
   Flow AI — el recorrido: hasta dónde llega cada persona.

   Fran (29-oct-2026): "quiero saber dónde se están quedando los
   usuarios que no están pasando". El pixel sólo dice que alguien abrió
   la página; esto dice hasta qué sección bajó, qué botón tocó, cuánto
   vio de cada video y cuánto tiempo se quedó.

   Todo va a la tabla `eventos` de Supabase por FLOW_DATOS.evento(),
   con el lead_id del navegador. Así se sigue a la MISMA persona de la
   guía a la landing del reto y al clic que la manda a Skool
   (clic_checkout, que registra /ir/skool/).

   Eventos (tipo → datos, además de página y sesión):
     visita    titulo, referrer
     seccion   n, de, nombre        una vez por sección por vista
     clic      texto, bloque, checkout   botones y links al reto o a pagar
     video     video, hito (play | sonido | avance), pct, seg, mudo
     chat      abrió el chat del reto
     salida    seg (tiempo con la pestaña visible), max_n, de

   Lo carga tracking.js, que ya está en todas las páginas: no hay que
   tocar las 370 guías. Las páginas puente (/ir/, /r/) no lo usan; ya
   registran su propio evento.
   ============================================================ */
(function () {
  'use strict';

  var D = window.FLOW_DATOS;
  var ruta = location.pathname;
  if (!D || window.__flowRecorrido || /^\/(ir|r)\//.test(ruta)) return;
  window.__flowRecorrido = true;

  var vista = Math.random().toString(36).slice(2, 10);
  var tipoPagina = /^\/guias\/[^/]+\/?$/.test(ruta) ? 'guia'
    : /^\/reto\/?$/.test(ruta) ? 'reto'
    : ruta === '/' ? 'inicio' : 'otra';

  function ev(tipo, datos, destino) {
    datos = datos || {};
    datos.vista = vista;
    datos.tipo_pagina = tipoPagina;
    D.evento(tipo, { datos: datos, destino: destino || null });
  }

  function texto(el, max) {
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim().slice(0, max || 60);
  }

  ev('visita', { titulo: document.title.slice(0, 80), referrer: (document.referrer || '').slice(0, 200) });

  /* ---------- Secciones ----------
     Los marcadores son lo que la persona va pasando al bajar: en la
     landing del reto, cada <section>; en una guía, cada h2 y cada CTA al
     reto. Al final, el pie de página = "llegó al final". Una sección
     cuenta cuando su borde de arriba entra al 65% superior de la
     pantalla. Un brinco con un link (#precio) cuenta las de en medio:
     se registra hasta dónde bajó, no cada cosa que leyó. */
  var selector = tipoPagina === 'reto' ? 'section'
    : tipoPagina === 'guia' ? 'article h2, .cta-curso, .cta-reto'
    : 'main h2, section';
  var marcas = Array.prototype.filter.call(document.querySelectorAll(selector), function (el) {
    return !(el.tagName === 'SECTION' && el.parentElement && el.parentElement.closest('section'));
  });
  var pie = document.querySelector('footer');
  if (pie) marcas.push(pie);

  var nCta = 0;
  var nombres = marcas.map(function (el) {
    if (el === pie) return 'fin de la página';
    if (el.classList.contains('cta-curso')) return 'CTA ' + (++nCta) + ': ' + texto(el.querySelector('strong') || el, 50);
    if (el.classList.contains('cta-reto')) return 'CTA final';
    if (el.tagName === 'SECTION') {
      var h = el.querySelector('h1, h2, h3');
      return (el.id ? '#' + el.id + ' ' : '') + (h ? texto(h, 50) : (el.getAttribute('aria-label') || texto(el, 40) || 'sección'));
    }
    return texto(el, 60);
  });

  /* Con scroll y no con IntersectionObserver: Chrome no corre el
     observer en una ventana tapada, y en la prueba del 29-oct ninguna
     sección se registró. Se revisa al hacer scroll (cada 200 ms como
     mucho), al cargar y justo antes de mandar la salida. */
  var maxN = 0;
  var vistas = {};
  function revisar() {
    var corte = window.innerHeight * 0.65;
    for (var i = 0; i < marcas.length; i++) {
      if (vistas[i]) continue;
      if (marcas[i].getBoundingClientRect().top >= corte) continue;
      vistas[i] = 1;
      if (i + 1 > maxN) maxN = i + 1;
      ev('seccion', { n: i + 1, de: marcas.length, nombre: nombres[i] });
    }
  }
  var pendiente = null;
  window.addEventListener('scroll', function () {
    if (!pendiente) pendiente = setTimeout(function () { pendiente = null; revisar(); }, 200);
  }, { passive: true });
  setTimeout(revisar, 600);

  /* El bloque donde vive un botón: el último marcador que viene antes. */
  function bloqueDe(el) {
    var b = '';
    for (var i = 0; i < marcas.length; i++) {
      var m = marcas[i];
      if (m === el || m.contains(el) || (m.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) b = nombres[i];
      else break;
    }
    return b;
  }

  /* ---------- Clics ----------
     Sólo los que mueven el embudo: ir al reto, ir a pagar, Skool, y los
     botones con pinta de CTA. En captura, antes de que flowai.js o el
     navegador se lleven a la persona. */
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('a, button') : null;
    if (!el) return;
    if (el.classList.contains('cr-burbuja')) {
      var panel = document.querySelector('.cr-panel');
      if (!panel || panel.hidden) ev('chat', { bloque: bloqueDe(el) });
      return;
    }
    var href = el.href || '';
    var checkout = el.hasAttribute('data-checkout');
    var cuenta = checkout || /\/reto\/|\/ir\/|skool\.com/.test(href) ||
      /(^|\s|-)(cta|btn)/.test(typeof el.className === 'string' ? el.className : '');
    if (!cuenta) return;
    ev('clic', { texto: texto(el, 60), bloque: bloqueDe(el), checkout: checkout ? 1 : 0 }, href.slice(0, 300) || null);
  }, true);

  /* ---------- Videos ----------
     play (y si fue con sonido), cuándo le subieron el volumen, y cada
     5% visto. Sólo cuenta la reproducción continua: adelantar con la
     barra no es "verlo", así la curva de retención es real. Cada hito
     se manda una vez por vista, aunque el video esté en loop. */
  Array.prototype.forEach.call(document.querySelectorAll('video'), function (v, k) {
    var nombre = v.id || ('video' + (k + 1));
    var hechos = {};
    var ultimo = 0;

    function hito(h, pct) {
      var llave = h + (pct || '');
      if (hechos[llave]) return;
      hechos[llave] = 1;
      ev('video', { video: nombre, hito: h, pct: pct || null, seg: Math.round(v.currentTime || 0), mudo: v.muted ? 1 : 0 });
    }

    v.addEventListener('play', function () { hito('play'); });
    v.addEventListener('volumechange', function () { if (!v.muted && v.volume > 0) hito('sonido'); });
    v.addEventListener('timeupdate', function () {
      var t = v.currentTime, d = v.duration;
      if (!d || !isFinite(d)) { ultimo = t; return; }
      var salto = t - ultimo;
      if (salto > 0 && salto < 2.5 * Math.max(1, v.playbackRate || 1)) {
        for (var h = Math.floor(ultimo / d * 20) + 1; h <= Math.floor(t / d * 20); h++) {
          /* Sin el hito anterior no cuenta: quien brinca al minuto 4 y
             ve el final no "vio el 100%". */
          if (h === 1 || hechos['avance' + (h - 1) * 5]) hito('avance', h * 5);
        }
      }
      ultimo = t;
    });
    v.addEventListener('ended', function () { if (hechos.avance95) hito('avance', 100); });
  });

  /* ---------- Salida ----------
     Al esconderse la pestaña (cerrar, cambiar de app, volver a
     Instagram): cuánto tiempo la tuvo visible y hasta qué sección
     llegó. Si regresa y se vuelve a ir, se manda otra con el acumulado;
     el reporte se queda con la mayor. */
  var visibleMs = 0;
  var desde = document.visibilityState === 'visible' ? Date.now() : 0;
  var ultimaSalida = 0;
  function salida() {
    /* visibilitychange y pagehide llegan los dos al cerrar: una sola salida. */
    if (Date.now() - ultimaSalida < 1000) return;
    ultimaSalida = Date.now();
    revisar();
    if (desde) { visibleMs += Date.now() - desde; desde = 0; }
    ev('salida', { seg: Math.round(visibleMs / 1000), max_n: maxN, de: marcas.length });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') salida();
    else desde = Date.now();
  });
  /* Safari (y el navegador de Instagram en iPhone) no siempre avisa
     visibilitychange al cerrar la pestaña; pagehide sí. Sin esto, el
     30-oct hubo visitas a guías sin salida registrada. */
  window.addEventListener('pagehide', salida);
})();

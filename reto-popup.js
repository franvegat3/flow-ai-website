/* ============================================================
   Flow AI — pop-up del Reto 30 Días dentro de las guías.

   Abres una guía y, a los pocos segundos, sale un cuadrito que te
   manda al reto. Es el mismo movimiento que hace el sitio de Mariah
   con su masterclass, y por eso se ve como la landing del reto:
   papel claro, display en versalitas y un botón azul grande.

   Reglas:
   - Una sola aparición por ventana de 7 días, se haya cerrado a
     propósito o simplemente ignorado.
   - Si ya le dieron clic al botón, no vuelve nunca.
   - Nunca en la landing del reto ni en páginas con
     <body data-sin-popup>: una página de venta no se interrumpe
     a sí misma.
   - Nunca junto con el pop-up de correo (optin.js). El primero que
     abre en la sesión levanta una bandera y el otro se calla.

   Se carga DESPUÉS de flowai-config.js y ANTES de optin.js.
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.FLOW || {};
  var LLAVE = 'flowai_reto_popup';
  var LLAVE_SESION = 'flowai_popup_abierto';   /* la comparte optin.js */

  /* Fran lo quiere pronto: la idea es que se sienta "de la nada"
     poco después de abrir la guía, no al final de la lectura. */
  var ESPERA_MS = 7000;      /* 7 s leyendo */
  var SCROLL_PCT = 0.18;     /* o 18% de la guía */
  var DIAS_REINTENTO = 7;

  var COPY = {
    ojo:    'Flow AI · Reto 30 Días',
    titulo: '¿Quieres el reto completo?',
    sub:    'Las guías son la parte gratis. En el Reto de 30 Días construyes los sistemas conmigo, uno por día: agentes, flujos y automatizaciones para tu trabajo y tu negocio.',
    boton:  'Ver el reto',
    nota:   'Empiezas con la prueba gratis. Cancelas con un clic.',
    ahora:  'Ahora no'
  };

  /* ---------- Estado ---------- */
  function leer() {
    try { return JSON.parse(localStorage.getItem(LLAVE) || '{}'); }
    catch (e) { return {}; }
  }
  function guardar(s) {
    try { localStorage.setItem(LLAVE, JSON.stringify(s)); } catch (e) {}
  }
  function otroPopupYaAbrio() {
    try { return sessionStorage.getItem(LLAVE_SESION) === '1'; } catch (e) { return false; }
  }
  function marcarSesion() {
    try { sessionStorage.setItem(LLAVE_SESION, '1'); } catch (e) {}
  }

  function puedeAparecer() {
    var s = leer();
    if (s.entro) return false;                        /* ya fue al reto */
    if (otroPopupYaAbrio()) return false;
    if (s.mostradoEl && (Date.now() - s.mostradoEl) / 86400000 < DIAS_REINTENTO) return false;
    return true;
  }

  /* No se interrumpe a sí misma la venta, ni las páginas marcadas. */
  if (document.body.hasAttribute('data-sin-popup')) return;
  if (!puedeAparecer()) return;

  /* ---------- Estilos ----------
     Viajan con el JS: el modal solo existe si este script corre, así
     que su CSS no tiene por qué pesar en páginas que no lo usan. */
  var css =
    '.rp-fondo{position:fixed;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px;' +
      'background:rgba(3,6,14,.74);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity .22s ease;}' +
    '.rp-fondo.rp-visible{opacity:1;}' +
    '.rp-caja{position:relative;width:100%;max-width:460px;background:#f4f7fd;color:#0d1424;' +
      'border:1px solid rgba(13,20,36,.12);border-radius:14px;padding:34px 32px 22px;' +
      'box-shadow:0 30px 80px -20px rgba(0,0,0,.7);' +
      'font-family:"Plus Jakarta Sans",system-ui,-apple-system,Segoe UI,sans-serif;' +
      'transform:translateY(14px) scale(.985);transition:transform .22s ease;}' +
    '.rp-fondo.rp-visible .rp-caja{transform:none;}' +
    '.rp-x{position:absolute;top:8px;right:12px;background:none;border:0;color:rgba(13,20,36,.5);' +
      'font-size:28px;line-height:1;cursor:pointer;padding:6px;border-radius:8px;}' +
    '.rp-x:hover{color:#0d1424;}' +
    '.rp-ojo{font-family:"Oswald","Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:700;letter-spacing:.16em;' +
      'text-transform:uppercase;color:#2563eb;margin:0 0 10px;}' +
    '.rp-tit{font-family:"Anton","Plus Jakarta Sans",sans-serif;font-weight:400;font-size:30px;line-height:1.06;' +
      'letter-spacing:.005em;text-transform:uppercase;margin:0 0 12px;padding-top:.06em;}' +
    '.rp-sub{font-size:15.5px;line-height:1.62;color:rgba(13,20,36,.82);margin:0 0 22px;}' +
    '.rp-btn{display:flex;align-items:center;justify-content:center;width:100%;min-height:56px;padding:1rem 1.6rem;' +
      'border:2px solid #2563eb;border-radius:6px;background:#2563eb;color:#f2f6ff;text-decoration:none;' +
      'font-family:"Anton","Plus Jakarta Sans",sans-serif;font-size:1.2rem;letter-spacing:.06em;text-transform:uppercase;' +
      'box-shadow:0 12px 34px rgba(37,99,235,.32);transition:transform .16s ease,background .16s ease;}' +
    '.rp-btn:hover{background:#1d4ed8;border-color:#1d4ed8;transform:translateY(-2px);text-decoration:none;}' +
    '.rp-nota{font-family:"Oswald","Plus Jakarta Sans",sans-serif;font-size:11.5px;font-weight:700;letter-spacing:.08em;' +
      'text-transform:uppercase;color:rgba(13,20,36,.62);margin:12px 0 0;text-align:center;}' +
    '.rp-no{display:block;width:100%;margin-top:10px;background:none;border:0;color:rgba(13,20,36,.6);' +
      'font:inherit;font-size:14px;cursor:pointer;padding:8px;}' +
    '.rp-no:hover{color:#0d1424;}' +
    '.rp-caja :focus-visible{outline:3px solid #2563eb;outline-offset:3px;border-radius:6px;}' +
    '@media (max-width:480px){.rp-caja{padding:30px 22px 20px;}.rp-tit{font-size:25px;}}' +
    '@media (prefers-reduced-motion:reduce){.rp-fondo,.rp-caja,.rp-btn{transition:none;}}';

  var estilo = document.createElement('style');
  estilo.textContent = css;
  document.head.appendChild(estilo);

  /* Anton y Oswald solo se piden cuando el modal de verdad va a
     abrir. Las 368 guías no cargan esas fuentes para nada más. */
  function pedirFuentes() {
    if (document.getElementById('rp-fuentes')) return;
    var l = document.createElement('link');
    l.id = 'rp-fuentes';
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Anton&family=Oswald:wght@700&display=swap';
    document.head.appendChild(l);
  }

  var destino = (CFG.RETO_URL || '/reto/') + '?utm_source=guias&utm_medium=popup&utm_campaign=reto30';

  var fondo = document.createElement('div');
  fondo.className = 'rp-fondo';
  fondo.setAttribute('role', 'dialog');
  fondo.setAttribute('aria-modal', 'true');
  fondo.setAttribute('aria-label', COPY.titulo);
  fondo.innerHTML =
    '<div class="rp-caja">' +
      '<button class="rp-x" type="button" aria-label="Cerrar">&times;</button>' +
      '<p class="rp-ojo"></p>' +
      '<h2 class="rp-tit"></h2>' +
      '<p class="rp-sub"></p>' +
      '<a class="rp-btn" href="' + destino + '"></a>' +
      '<p class="rp-nota"></p>' +
      '<button class="rp-no" type="button"></button>' +
    '</div>';

  var q = function (sel) { return fondo.querySelector(sel); };
  q('.rp-ojo').textContent = COPY.ojo;
  q('.rp-tit').textContent = COPY.titulo;
  q('.rp-sub').textContent = COPY.sub;
  q('.rp-btn').textContent = COPY.boton;
  q('.rp-nota').textContent = COPY.nota;
  q('.rp-no').textContent = COPY.ahora;

  var abierto = false;
  var ultimoFoco = null;

  function abrir() {
    if (abierto || !puedeAparecer()) return;
    abierto = true;
    /* Se marca al abrir, no al cerrar: si recargan o se van con el
       modal abierto, ya cuenta como visto. */
    var s = leer(); s.mostradoEl = Date.now(); guardar(s);
    marcarSesion();
    pedirFuentes();
    ultimoFoco = document.activeElement;
    document.body.appendChild(fondo);
    requestAnimationFrame(function () { fondo.classList.add('rp-visible'); });
    document.addEventListener('keydown', alTeclado);
    var btn = q('.rp-btn');
    if (btn) setTimeout(function () { btn.focus(); }, 260);
  }

  function cerrar() {
    if (!abierto) return;
    abierto = false;
    fondo.classList.remove('rp-visible');
    setTimeout(function () { if (fondo.parentNode) fondo.parentNode.removeChild(fondo); }, 240);
    document.removeEventListener('keydown', alTeclado);
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  }

  function alTeclado(e) {
    if (e.key === 'Escape') { cerrar(); return; }
    if (e.key !== 'Tab') return;
    /* Trampa de foco: con el modal abierto el tabulador no se sale. */
    var focos = fondo.querySelectorAll('button, a[href]');
    if (!focos.length) return;
    var primero = focos[0], ultimo = focos[focos.length - 1];
    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  }

  q('.rp-x').addEventListener('click', function () { cerrar(); });
  q('.rp-no').addEventListener('click', function () { cerrar(); });
  fondo.addEventListener('click', function (e) { if (e.target === fondo) cerrar(); });
  q('.rp-btn').addEventListener('click', function () {
    var s = leer(); s.entro = true; s.entroEl = Date.now(); guardar(s);
  });

  /* ---------- Disparadores ---------- */
  var lanzado = false;
  function lanzar() { if (!lanzado) { lanzado = true; abrir(); } }

  setTimeout(lanzar, ESPERA_MS);

  var alScroll = function () {
    var alto = document.documentElement.scrollHeight - window.innerHeight;
    if (alto > 0 && window.scrollY / alto >= SCROLL_PCT) {
      window.removeEventListener('scroll', alScroll);
      lanzar();
    }
  };
  window.addEventListener('scroll', alScroll, { passive: true });
})();

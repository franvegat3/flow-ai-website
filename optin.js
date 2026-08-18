/* ============================================================
   Flow AI — captura de correo.

   Hace dos cosas, y las dos con el mismo estado:

   1. Un pop-up que pide el correo mientras la gente lee una guía.
      Sale UNA vez. Si lo cierran sin dar el correo, vuelve a los
      7 días. Si dan el correo, no vuelve nunca — ni el pop-up de
      captura ni ningún otro.
   2. Los formularios de correo que ya viven en el HTML
      (.optin-form). Mismo endpoint, mismo estado.

   El estado vive en localStorage. Es por navegador, no por persona:
   quien entre desde otro dispositivo lo va a ver otra vez. Es el
   mismo trato que hacen todos los sitios con esto y no vale la pena
   pagar el costo de identificar gente para arreglarlo.

   Nada de aquí debe romper la página si falla.
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.FLOW || {};
  var LLAVE = 'flowai_optin';
  /* La comparte reto-popup.js: el primer pop-up que abre en la sesión
     levanta esta bandera y el otro se calla. Dos modales en la misma
     lectura ahuyentan al lector y no capturan ninguno de los dos. */
  var LLAVE_SESION = 'flowai_popup_abierto';

  /* Cuándo aparece el pop-up: lo que ocurra primero. */
  var ESPERA_MS = 25000;      // 25 s leyendo
  var SCROLL_PCT = 0.35;      // o 35% de la guía
  var DIAS_REINTENTO = 7;     // si lo cerraron sin suscribirse

  /* Apps Script tarda 2 a 3 segundos en contestar. Es demasiado para
     dejar un botón muerto, así que ese rato se llena con la marca
     girando y frases que van rotando. La primera es la informativa; las
     demás son para que la espera se sienta corta. */
  var CARGANDO = [
    'Guardando tu correo…',
    'Cocinando la IA para sorprenderte…',
    'Un segundo, esto sí vale la pena…',
    'Acomodando las guías que te tocan…',
    'Ya casi, no cierres…'
  ];

  var COPY = {
    ojo:     'Guías gratis de Flow AI',
    titulo:  'Te mando la siguiente antes que a nadie',
    sub:     'Una guía nueva cada semana: el prompt completo, las herramientas y el tiempo que toma. Sin relleno. Se cancela con un clic.',
    boton:   'Mandármelas',
    ahora:   'Ahora no',
    nota:    'Tu correo no se comparte con nadie.',
    okTit:   'Listo, quedaste dentro.',
    okSub:   'Te llega la próxima guía en cuanto salga. Mientras tanto: las guías son la parte gratis. El Reto de 30 Días es donde de verdad construyes los sistemas, uno por día, conmigo.',
    okBoton: 'Ver el Reto de 30 Días',
    okCerrar:'Seguir leyendo'
  };

  /* ---------- Estado ---------- */
  function leer() {
    try { return JSON.parse(localStorage.getItem(LLAVE) || '{}'); }
    catch (e) { return {}; }
  }
  function guardar(s) {
    try { localStorage.setItem(LLAVE, JSON.stringify(s)); } catch (e) {}
  }
  function marcarSuscrito() {
    var s = leer(); s.suscrito = true; s.suscritoEl = Date.now(); guardar(s);
  }

  function otroPopupYaAbrio() {
    try { return sessionStorage.getItem(LLAVE_SESION) === '1'; } catch (e) { return false; }
  }

  function puedeAparecer() {
    var s = leer();
    if (s.suscrito) return false;                       // ya dio el correo: nunca más
    if (otroPopupYaAbrio()) return false;               // ya salió el del Reto
    /* Una sola aparición por ventana de DIAS_REINTENTO, se haya
       cerrado a propósito o simplemente ignorado. */
    if (s.mostradoEl && (Date.now() - s.mostradoEl) / 86400000 < DIAS_REINTENTO) return false;
    return true;
  }

  /* ---------- Envío ----------

     Dos modos, según dónde esté hosteado el sitio:

     a) OPTIN_ENDPOINT — hay backend propio (Vercel). Se manda JSON y
        el servidor decide a qué proveedores repartir.
     b) SHEETS_URL — no hay backend (GitHub Pages). Se escribe directo
        en la hoja con el Web App de Apps Script.

     En el modo (b) el Content-Type tiene que ser text/plain, no
     application/json. Con application/json el navegador manda antes un
     OPTIONS de preflight, y Apps Script no contesta OPTIONS: la
     petición muere en CORS sin llegar nunca a la hoja. Con text/plain
     cuenta como petición simple, viaja directo, y el cuerpo sigue
     siendo JSON que el script parsea igual. Probado en Chrome contra
     el Web App real. */
  function suscribir(email, fuente) {
    var registro = {
      fecha: new Date().toISOString(),
      email: email,
      fuente: fuente,
      pagina: location.pathname,
      referrer: document.referrer || '',
      utm: location.search || ''
    };

    var destino = CFG.OPTIN_ENDPOINT || CFG.SHEETS_URL;
    if (!destino) return Promise.reject(conMotivo('sin-destino'));

    var directo = !CFG.OPTIN_ENDPOINT;

    return fetch(destino, {
      method: 'POST',
      headers: { 'Content-Type': directo ? 'text/plain;charset=utf-8' : 'application/json' },
      body: JSON.stringify(registro)
    }).then(function (r) {
      return r.text().then(function (txt) {
        var data = {};
        try { data = JSON.parse(txt); } catch (e) {}
        if (!r.ok || !data.ok) throw conMotivo(data.motivo || ('HTTP ' + r.status));
        return data;
      });
    });
  }

  function conMotivo(motivo) {
    var err = new Error(motivo);
    err.motivo = motivo;
    return err;
  }

  function mensajeDeError(err) {
    /* 'sin-destino' = no hay lista conectada todavía. Decirlo tal cual
       es mejor que fingir que se guardó el correo. */
    if (err && err.motivo === 'sin-destino') {
      return 'La lista todavía no está conectada. Escríbeme y te agrego a mano.';
    }
    if (err && err.motivo === 'email-invalido') {
      return 'Revisa el correo, parece que le falta algo.';
    }
    return 'No se pudo guardar. Inténtalo otra vez en un momento.';
  }

  var VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* La marca de Flow AI dentro de un anillo que gira. */
  var GIRANDO =
    '<span class="fo-spin" aria-hidden="true">' +
      '<svg viewBox="0 0 44 44" width="20" height="20">' +
        '<circle class="fo-spin-pista" cx="22" cy="22" r="18" fill="none" stroke-width="4" />' +
        '<circle class="fo-spin-arco" cx="22" cy="22" r="18" fill="none" stroke-width="4" ' +
          'stroke-linecap="round" stroke-dasharray="30 84" />' +
      '</svg>' +
      '<svg class="fo-spin-marca" viewBox="0 0 100 100" width="11" height="11">' +
        '<path d="M28 26h44M28 50h30M28 74h18" stroke="currentColor" stroke-width="12" ' +
          'stroke-linecap="round" fill="none"/>' +
      '</svg>' +
    '</span>';

  /* Enciende el estado de carga y devuelve la función que lo apaga.
     El texto que rota va en un nodo aria-hidden y el anuncio para
     lectores de pantalla se hace una sola vez: cambiar una zona
     aria-live cada segundo y medio la vuelve insoportable. */
  function cargando(zonaMsg, btn) {
    var i = 0;
    var reloj = null;
    var textoBtn = btn ? btn.innerHTML : '';

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = GIRANDO + '<span>Guardando…</span>';
    }

    if (zonaMsg) {
      zonaMsg.textContent = '';
      var linea = document.createElement('span');
      linea.className = 'fo-rotando';
      linea.setAttribute('aria-hidden', 'true');
      linea.textContent = CARGANDO[0];
      zonaMsg.appendChild(linea);

      reloj = setInterval(function () {
        i = (i + 1) % CARGANDO.length;
        linea.style.opacity = '0';
        setTimeout(function () {
          linea.textContent = CARGANDO[i];
          linea.style.opacity = '1';
        }, 220);
      }, 1500);   /* con respuestas de 2-3 s, a 1.9 s casi nunca alcanzaba a salir la segunda frase */
    }

    return function apagar() {
      if (reloj) clearInterval(reloj);
      if (zonaMsg) zonaMsg.textContent = '';
      if (btn) { btn.disabled = false; btn.innerHTML = textoBtn; }
    };
  }

  /* ---------- Estilos del estado de carga ----------
     Van siempre, no solo con el pop-up: los formularios del HTML
     también giran, y viven en páginas donde el modal nunca aparece. */
  (function () {
    var css =
      '.fo-spin{position:relative;display:inline-grid;place-items:center;width:20px;height:20px;flex:0 0 auto;vertical-align:-4px;}' +
      '.fo-spin svg:first-child{animation:fo-gira 1s linear infinite;}' +
      '.fo-spin-pista{stroke:currentColor;opacity:.22;}' +
      '.fo-spin-arco{stroke:currentColor;}' +
      '.fo-spin-marca{position:absolute;opacity:.85;}' +
      '.fo-rotando{display:inline-block;transition:opacity .2s ease;}' +
      '.optin-msg .fo-spin,.fo-msg .fo-spin{margin-right:8px;color:#84b6ff;}' +
      /* .optin-msg es gris apagado por defecto; mientras carga se pone
         del azul de marca para que se lea que algo está pasando. */
      '.optin-msg .fo-rotando,.fo-msg .fo-rotando{color:#84b6ff;}' +
      '@keyframes fo-gira{to{transform:rotate(360deg);}}' +
      '@media (prefers-reduced-motion:reduce){.fo-spin svg:first-child{animation-duration:3s;}.fo-rotando{transition:none;}}';
    var el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
  })();

  /* ============================================================
     1. Formularios que ya están en el HTML
     ============================================================ */
  Array.prototype.forEach.call(document.querySelectorAll('.optin-form'), function (form) {
    var input = form.querySelector('input[type="email"]');
    var btn = form.querySelector('button[type="submit"]');
    /* El mensaje puede ser hermano del form o vivir en el mismo bloque. */
    var msg = (form.parentNode && form.parentNode.querySelector('.optin-msg')) || null;
    var decir = function (t) { if (msg) msg.textContent = t; };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (input && input.value || '').trim();

      if (!VALIDO.test(email)) { decir('Revisa el correo, parece que le falta algo.'); return; }

      var apagar = cargando(msg, btn);

      suscribir(email, form.getAttribute('data-fuente') || 'formulario')
        .then(function () {
          apagar();
          marcarSuscrito();
          form.reset();
          decir('Listo. Te llega la próxima guía en cuanto salga.');
        })
        .catch(function (err) {
          apagar();
          decir(mensajeDeError(err));
        });
    });
  });

  /* ============================================================
     2. El pop-up
     ============================================================ */
  if (document.body.hasAttribute('data-sin-popup')) return;
  if (!puedeAparecer()) return;

  /* Los estilos viajan con el JS a propósito: el modal solo existe
     si este script corre, así que su CSS no tiene por qué cargarse
     en páginas que nunca lo van a usar. */
  var css =
    '.fo-fondo{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;' +
      'background:rgba(3,6,14,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity .22s ease;}' +
    '.fo-fondo.fo-visible{opacity:1;}' +
    '.fo-caja{position:relative;width:100%;max-width:470px;background:#0b1120;color:#eaf0fb;border:1px solid rgba(255,255,255,.12);' +
      'border-radius:18px;padding:34px 30px 26px;box-shadow:0 30px 80px -20px rgba(0,0,0,.85);' +
      'font-family:"Plus Jakarta Sans",system-ui,-apple-system,Segoe UI,sans-serif;transform:translateY(14px) scale(.985);transition:transform .22s ease;}' +
    '.fo-fondo.fo-visible .fo-caja{transform:none;}' +
    '.fo-caja:before{content:"";position:absolute;inset:-1px;border-radius:18px;pointer-events:none;' +
      'background:linear-gradient(135deg,rgba(132,182,255,.35),transparent 45%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);' +
      '-webkit-mask-composite:xor;mask-composite:exclude;padding:1px;}' +
    '.fo-x{position:absolute;top:10px;right:12px;background:none;border:0;color:#8893ad;font-size:26px;line-height:1;cursor:pointer;padding:6px;border-radius:8px;}' +
    '.fo-x:hover{color:#eaf0fb;}' +
    '.fo-ojo{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#84b6ff;margin:0 0 10px;}' +
    '.fo-tit{font-size:26px;line-height:1.14;letter-spacing:-.025em;font-weight:700;margin:0 0 10px;}' +
    '.fo-sub{font-size:15px;line-height:1.6;color:#c2cce0;margin:0 0 20px;}' +
    '.fo-form{display:flex;gap:9px;flex-wrap:wrap;}' +
    '.fo-form input[type=email]{flex:1 1 200px;min-height:46px;padding:0 15px;border-radius:999px;border:1px solid rgba(255,255,255,.16);' +
      'background:rgba(255,255,255,.045);color:#eaf0fb;font:inherit;font-size:15px;}' +
    '.fo-form input[type=email]::placeholder{color:#8893ad;}' +
    '.fo-form input[type=email]:focus-visible{outline:3px solid #60a5fa;outline-offset:2px;}' +
    '.fo-btn{min-height:46px;padding:0 22px;border-radius:999px;border:0;cursor:pointer;font:inherit;font-size:15px;font-weight:600;' +
      'display:inline-flex;align-items:center;justify-content:center;gap:9px;' +
      'background:linear-gradient(100deg,#84b6ff 0%,#3b82f6 55%,#2563eb 110%);color:#04101f;transition:transform .16s ease,box-shadow .22s ease;}' +
    '.fo-btn:hover{transform:translateY(-1px);box-shadow:0 14px 34px -14px rgba(59,130,246,.8);}' +
    '.fo-btn[disabled]{opacity:.6;cursor:default;transform:none;}' +
    '.fo-btn-a{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;width:100%;}' +
    '.fo-msg{font-size:13.5px;color:#84b6ff;margin:12px 0 0;min-height:19px;}' +
    '.fo-nota{font-size:12.5px;color:#8893ad;margin:14px 0 0;}' +
    '.fo-no{display:block;width:100%;margin-top:12px;background:none;border:0;color:#8893ad;font:inherit;font-size:13px;cursor:pointer;padding:6px;}' +
    '.fo-no:hover{color:#c2cce0;}' +
    '.fo-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0;}' +
    '@media (max-width:480px){.fo-caja{padding:30px 20px 22px;}.fo-tit{font-size:22px;}}' +
    '@media (prefers-reduced-motion:reduce){.fo-fondo,.fo-caja{transition:none;}}';

  var estilo = document.createElement('style');
  estilo.textContent = css;
  document.head.appendChild(estilo);

  var fondo = document.createElement('div');
  fondo.className = 'fo-fondo';
  fondo.setAttribute('role', 'dialog');
  fondo.setAttribute('aria-modal', 'true');
  fondo.setAttribute('aria-label', COPY.titulo);
  fondo.innerHTML =
    '<div class="fo-caja">' +
      '<button class="fo-x" type="button" aria-label="Cerrar">&times;</button>' +
      '<p class="fo-ojo"></p>' +
      '<h2 class="fo-tit"></h2>' +
      '<p class="fo-sub"></p>' +
      '<form class="fo-form" novalidate>' +
        '<input type="email" name="email" placeholder="tu@correo.com" autocomplete="email" required aria-label="Tu correo" />' +
        '<input type="text" name="empresa" class="fo-hp" tabindex="-1" autocomplete="off" aria-hidden="true" />' +
        '<button type="submit" class="fo-btn"></button>' +
      '</form>' +
      '<p class="fo-msg" role="status" aria-live="polite"></p>' +
      '<p class="fo-nota"></p>' +
      '<button class="fo-no" type="button"></button>' +
    '</div>';

  var q = function (sel) { return fondo.querySelector(sel); };
  q('.fo-ojo').textContent = COPY.ojo;
  q('.fo-tit').textContent = COPY.titulo;
  q('.fo-sub').textContent = COPY.sub;
  q('.fo-btn').textContent = COPY.boton;
  q('.fo-nota').textContent = COPY.nota;
  q('.fo-no').textContent = COPY.ahora;

  var abierto = false;
  var ultimoFoco = null;

  function abrir() {
    if (abierto || !puedeAparecer()) return;
    abierto = true;
    /* Se marca de entrada, no al cerrar: aunque el visitante recargue
       o abandone la página con el modal abierto, ya cuenta como visto
       y no le vuelve a salir. */
    var s = leer(); s.mostradoEl = Date.now(); guardar(s);
    try { sessionStorage.setItem(LLAVE_SESION, '1'); } catch (e) {}
    ultimoFoco = document.activeElement;
    document.body.appendChild(fondo);
    requestAnimationFrame(function () { fondo.classList.add('fo-visible'); });
    document.addEventListener('keydown', alTeclado);
    var input = q('input[type=email]');
    if (input) setTimeout(function () { input.focus(); }, 260);
  }

  function cerrar() {
    if (!abierto) return;
    abierto = false;
    fondo.classList.remove('fo-visible');
    setTimeout(function () { if (fondo.parentNode) fondo.parentNode.removeChild(fondo); }, 240);
    document.removeEventListener('keydown', alTeclado);
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  }

  function alTeclado(e) {
    if (e.key === 'Escape') { cerrar(); return; }
    if (e.key !== 'Tab') return;
    /* Trampa de foco: mientras el modal está abierto, el tabulador
       no se sale de la caja. */
    var focos = fondo.querySelectorAll('button, input:not(.fo-hp), a[href]');
    if (!focos.length) return;
    var primero = focos[0], ultimo = focos[focos.length - 1];
    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  }

  /* Estado de éxito: mismo modal, ahora empujando al Reto. */
  function mostrarExito() {
    var caja = q('.fo-caja');
    caja.innerHTML =
      '<button class="fo-x" type="button" aria-label="Cerrar">&times;</button>' +
      '<p class="fo-ojo"></p>' +
      '<h2 class="fo-tit"></h2>' +
      '<p class="fo-sub"></p>' +
      '<a class="fo-btn fo-btn-a" href="' + (CFG.RETO_URL || '/reto/') + '"></a>' +
      '<button class="fo-no" type="button"></button>';
    caja.querySelector('.fo-ojo').textContent = 'Ya estás en la lista';
    caja.querySelector('.fo-tit').textContent = COPY.okTit;
    caja.querySelector('.fo-sub').textContent = COPY.okSub;
    caja.querySelector('.fo-btn-a').textContent = COPY.okBoton;
    caja.querySelector('.fo-no').textContent = COPY.okCerrar;
    caja.querySelector('.fo-x').addEventListener('click', function () { cerrar(); });
    caja.querySelector('.fo-no').addEventListener('click', function () { cerrar(); });
    var a = caja.querySelector('.fo-btn-a');
    if (a) setTimeout(function () { a.focus(); }, 60);
  }

  q('.fo-x').addEventListener('click', function () { cerrar(); });
  q('.fo-no').addEventListener('click', function () { cerrar(); });
  fondo.addEventListener('click', function (e) { if (e.target === fondo) cerrar(); });

  q('.fo-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = q('input[type=email]');
    var hp = q('input[name=empresa]');
    var btn = q('.fo-btn');
    var msg = q('.fo-msg');
    var email = (input.value || '').trim();

    /* Campo trampa: los humanos no lo ven, los bots sí lo llenan.
       Se les responde con éxito para que no reintenten. */
    if (hp && hp.value) { marcarSuscrito(); mostrarExito(); return; }

    if (!VALIDO.test(email)) { msg.textContent = 'Revisa el correo, parece que le falta algo.'; return; }

    var apagar = cargando(msg, btn);

    suscribir(email, 'popup')
      .then(function () { apagar(); marcarSuscrito(); mostrarExito(); })
      .catch(function (err) {
        apagar();
        msg.textContent = mensajeDeError(err);
      });
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

  /* Intención de salida, solo en desktop: el cursor sube fuera de la
     ventana. En móvil no existe el gesto y disparar por scroll basta. */
  if (window.matchMedia && window.matchMedia('(pointer:fine)').matches) {
    document.addEventListener('mouseout', function (e) {
      if (!e.relatedTarget && e.clientY <= 0) lanzar();
    });
  }
})();

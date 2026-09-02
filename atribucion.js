/* ============================================================
   Flow AI — atribución persistente.

   El problema que resuelve: hasta ahora el sitio guardaba
   `location.search` en el momento de dejar el correo. Si alguien
   llegaba por un anuncio a /guias/x/?fbclid=... y navegaba a otra
   página antes de suscribirse, el fbclid se perdía y la venta ya no
   se podía atribuir al anuncio que la pagó.

   Aquí se captura la atribución EN LA LLEGADA y se guarda 90 días,
   que es la misma ventana que usa Meta para la cookie _fbc.

   REGLA DE PRIMER TOQUE: lo que ya está guardado no se pisa, salvo
   que llegue un click id nuevo (fbclid/gclid/ttclid). Alguien que
   llega por un anuncio, se va, y vuelve por búsqueda orgánica sigue
   contando como del anuncio — que es lo correcto: el anuncio pagó
   por presentarlos.

   Se carga ANTES que cualquier otro script del sitio.
   ============================================================ */
(function () {
  'use strict';

  var LLAVE = 'flowai_atrib';
  var DIAS = 90;
  var MS_DIA = 86400000;

  /* Los click id de cada plataforma. Van aparte de los utm_ porque
     tienen un trato distinto: la presencia de uno nuevo sí reabre la
     atribución, un utm_ suelto no. */
  var CLICK_IDS = ['fbclid', 'gclid', 'ttclid', 'msclkid', 'li_fat_id'];
  var UTMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

  function leerGuardado() {
    try {
      var crudo = localStorage.getItem(LLAVE);
      if (!crudo) return null;
      var d = JSON.parse(crudo);
      /* Caducado: se trata como si no existiera, así el visitante que
         vuelve a los 4 meses se atribuye a lo que lo trajo esta vez. */
      if (!d.guardado_en || Date.now() - d.guardado_en > DIAS * MS_DIA) return null;
      return d;
    } catch (e) { return null; }
  }

  function guardar(d) {
    try { localStorage.setItem(LLAVE, JSON.stringify(d)); } catch (e) {}
  }

  function paramsDeLaUrl() {
    var out = {};
    try {
      var p = new URLSearchParams(location.search);
      CLICK_IDS.concat(UTMS).forEach(function (k) {
        var v = p.get(k);
        if (v) out[k] = v;
      });
    } catch (e) {}
    return out;
  }

  /* Lee una cookie por nombre. Se usa para _fbp, que la pone el pixel
     de Meta, no nosotros. */
  function cookie(nombre) {
    try {
      var m = document.cookie.match('(^|;)\\s*' + nombre + '\\s*=\\s*([^;]+)');
      return m ? m.pop() : '';
    } catch (e) { return ''; }
  }

  /* El formato de _fbc lo define Meta y no es negociable:
       fb.{indiceDeSubdominio}.{msDeCreacion}.{fbclid}
     El índice es 1 para flowaigroup.com (com=0, dominio=1, www=2).
     El fbclid distingue mayúsculas: se copia tal cual, sin tocar. */
  function armarFbc(fbclid, ts) {
    return fbclid ? 'fb.1.' + ts + '.' + fbclid : '';
  }

  function idNuevo() {
    try {
      if (crypto && crypto.randomUUID) return crypto.randomUUID();
    } catch (e) {}
    return 'lead-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  var ahora = Date.now();
  var entrantes = paramsDeLaUrl();
  var guardado = leerGuardado();

  var traeClickIdNuevo = CLICK_IDS.some(function (k) { return !!entrantes[k]; });

  var atrib;

  if (guardado && !traeClickIdNuevo) {
    /* Primer toque manda. Solo se rellenan huecos: si la visita
       original no traía utm_content y esta sí, se agrega, pero no se
       sobreescribe nada que ya tuviera valor. */
    atrib = guardado;
    UTMS.forEach(function (k) {
      if (!atrib[k] && entrantes[k]) atrib[k] = entrantes[k];
    });
  } else {
    atrib = {
      lead_id: (guardado && guardado.lead_id) || idNuevo(),
      guardado_en: ahora,
      landing_inicial: location.pathname,
      referrer_inicial: document.referrer || ''
    };
    CLICK_IDS.concat(UTMS).forEach(function (k) {
      if (entrantes[k]) atrib[k] = entrantes[k];
    });
    if (entrantes.fbclid) atrib.fbc = armarFbc(entrantes.fbclid, ahora);
  }

  /* _fbp lo escribe el pixel, que carga después que esto. Se relee en
     cada visita y en cada lectura para no quedarse con el vacío de la
     primera carga. */
  atrib.fbp = cookie('_fbp') || atrib.fbp || '';
  if (!atrib.fbc) atrib.fbc = cookie('_fbc') || '';

  guardar(atrib);

  window.FLOW_ATRIB = {
    /* Devuelve una copia con _fbp/_fbc frescos. Lo usan optin.js (al
       mandar el correo) y las páginas puente de /ir/ y /r/. */
    get: function () {
      var d = leerGuardado() || atrib;
      var copia = {};
      for (var k in d) if (Object.prototype.hasOwnProperty.call(d, k)) copia[k] = d[k];
      copia.fbp = cookie('_fbp') || copia.fbp || '';
      copia.fbc = copia.fbc || cookie('_fbc') || '';
      return copia;
    },

    /* Aplana la atribución a query params, para pegarla a una URL de
       salida (el checkout) sin perderla en el salto de dominio. */
    aQuery: function () {
      var d = this.get();
      var partes = [];
      UTMS.concat(['lead_id']).forEach(function (k) {
        if (d[k]) partes.push(encodeURIComponent(k) + '=' + encodeURIComponent(d[k]));
      });
      return partes.join('&');
    },

    /* Un id de evento estable por (lead, evento). Es lo que permite
       que el mismo Purchase que manda el navegador y el que manda el
       servidor por CAPI se cuenten UNA vez, no dos. */
    idEvento: function (nombre) {
      return nombre + '-' + (this.get().lead_id || 'anon');
    }
  };
})();

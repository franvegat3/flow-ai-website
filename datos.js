/* ============================================================
   Flow AI — a dónde se mandan los leads y los eventos.

   Una sola puerta para todo lo que el navegador escribe. Existe para
   que optin.js y las páginas puente no tengan que saber si hoy los
   datos van a Supabase o a una hoja de cálculo.

   Prioridad:
     1. Supabase, si SUPABASE_URL y SUPABASE_ANON_KEY están puestos.
     2. La hoja de Google por Apps Script (lo que había antes).

   Sobre la llave anónima: sí, va en el JS público, y está bien. La
   base tiene RLS con política de solo INSERT, así que lo único que
   puede hacer alguien con esa llave es agregar filas. No puede leer
   la lista, ni editarla, ni borrarla. Probado contra la base real.

   Se carga DESPUÉS de flowai-config.js y de atribucion.js.
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.FLOW || {};

  var SB_URL = (CFG.SUPABASE_URL || '').replace(/\/+$/, '');
  var SB_KEY = CFG.SUPABASE_ANON_KEY || '';
  var haySupabase = !!(SB_URL && SB_KEY);

  /* Las columnas que existen en la tabla `leads`. Mandar una clave que
     no existe hace que PostgREST rechace TODO el insert con 400, así
     que se filtra en vez de confiar en lo que traiga el objeto. */
  var COLS_LEAD = [
    'lead_id', 'email', 'fuente', 'pagina', 'referrer',
    'fbclid', 'fbc', 'fbp', 'gclid', 'ttclid',
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
    'landing_inicial', 'referrer_inicial'
  ];

  function soloColumnas(obj, permitidas) {
    var out = {};
    permitidas.forEach(function (k) {
      if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') out[k] = obj[k];
    });
    return out;
  }

  function cabecerasSB() {
    return {
      'apikey': SB_KEY,
      'Authorization': 'Bearer ' + SB_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    };
  }

  /* ---------- Lead: alguien dejó su correo ---------- */
  function lead(registro) {
    if (haySupabase) {
      var fila = soloColumnas(registro, COLS_LEAD);
      return fetch(SB_URL + '/rest/v1/leads', {
        method: 'POST',
        headers: cabecerasSB(),
        body: JSON.stringify(fila)
      }).then(function (r) {
        if (!r.ok) {
          return r.text().then(function (t) {
            var err = new Error(t || ('HTTP ' + r.status));
            err.motivo = 'supabase-' + r.status;
            throw err;
          });
        }
        return { ok: true };
      });
    }

    var destino = CFG.OPTIN_ENDPOINT || CFG.SHEETS_URL;
    if (!destino) {
      var e = new Error('sin-destino'); e.motivo = 'sin-destino';
      return Promise.reject(e);
    }
    var directo = !CFG.OPTIN_ENDPOINT;
    return fetch(destino, {
      method: 'POST',
      headers: { 'Content-Type': directo ? 'text/plain;charset=utf-8' : 'application/json' },
      body: JSON.stringify(registro)
    }).then(function (r) {
      return r.text().then(function (txt) {
        var data = {};
        try { data = JSON.parse(txt); } catch (e2) {}
        if (!r.ok || !data.ok) {
          var err = new Error(data.motivo || ('HTTP ' + r.status));
          err.motivo = data.motivo || ('HTTP ' + r.status);
          throw err;
        }
        return data;
      });
    });
  }

  /* ---------- Sesión: el ÚLTIMO toque ----------
     FLOW_ATRIB guarda el PRIMER toque por 90 días, que es lo que le cobra
     la venta a la pauta. Para saber por dónde entró ESTA visita (el DM de
     un reel, un anuncio, Google) hace falta el último, con la regla de
     GA: 30 min sin actividad cierran la sesión, y un utm_ distinto abre
     una nueva. Va en localStorage y no en sessionStorage porque los
     botones de pagar abren /ir/skool/ en pestaña nueva con noopener, y
     esa pestaña nace con sessionStorage vacío. */
  var LLAVE_SES = 'flow_sesion';
  var SES_UTMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
  var SES_MAX_MS = 30 * 60 * 1000;

  function sesion() {
    var ahora = Date.now();
    var s = null;
    try { s = JSON.parse(localStorage.getItem(LLAVE_SES) || 'null'); } catch (e) {}
    var q = {};
    try {
      var p = new URLSearchParams(location.search);
      SES_UTMS.forEach(function (k) { if (p.get(k)) q[k] = p.get(k); });
    } catch (e) {}
    /* /ir/skool/ recibe en la URL los utm del PRIMER toque (para que viajen
       a Skool): ahí no abren sesión nueva, o el clic a pagar se le
       acreditaría a la campaña vieja y no a la de esta visita. */
    var puente = /^\/ir\//.test(location.pathname);
    var vencida = !s || ahora - (s.ultimo || 0) > SES_MAX_MS;
    var otroOrigen = !puente && q.utm_source && (!s || SES_UTMS.some(function (k) { return (q[k] || '') !== (s['ses_' + k] || ''); }));
    if (vencida || otroOrigen) {
      s = {
        ses: ahora.toString(36) + Math.random().toString(36).slice(2, 7),
        ses_entrada: location.pathname,
        ses_referrer: (document.referrer || '').slice(0, 200)
      };
      SES_UTMS.forEach(function (k) { if (q[k]) s['ses_' + k] = q[k]; });
    }
    s.ultimo = ahora;
    try { localStorage.setItem(LLAVE_SES, JSON.stringify(s)); } catch (e) {}
    return s;
  }
  sesion();   /* al cargar: así la sesión nace con la URL de entrada aunque el primer evento llegue después */

  /* ---------- Evento: un peldaño del embudo ----------
     Va con sendBeacon porque casi siempre se dispara justo antes de que
     la página se descargue (el clic al checkout). Un fetch normal se
     cancela en ese momento y el registro se pierde siempre.

     `datos` lleva la atribución de primer toque, la sesión de último
     toque, la página y lo que mande quien llama en extra.datos (el
     recorrido: sección, video, botón). */
  function evento(tipo, extra) {
    extra = extra || {};
    var a = window.FLOW_ATRIB ? window.FLOW_ATRIB.get() : {};
    var s = sesion(), k;
    for (k in s) if (Object.prototype.hasOwnProperty.call(s, k) && k !== 'ultimo') a[k] = s[k];
    a.pagina = location.pathname;
    if (extra.datos) for (k in extra.datos) if (Object.prototype.hasOwnProperty.call(extra.datos, k)) a[k] = extra.datos[k];
    var cuerpo, url, headers;

    if (haySupabase) {
      url = SB_URL + '/rest/v1/eventos';
      cuerpo = JSON.stringify({
        lead_id: a.lead_id || null,
        tipo: tipo,
        destino: extra.destino || null,
        datos: a
      });
      headers = cabecerasSB();
    } else {
      url = CFG.SHEETS_URL;
      if (!url) return false;
      var carga = { tipo: tipo, fecha: new Date().toISOString(), destino: extra.destino || '' };
      for (var k in a) if (Object.prototype.hasOwnProperty.call(a, k)) carga[k] = a[k];
      cuerpo = JSON.stringify(carga);
      headers = null;
    }

    try {
      if (navigator.sendBeacon && !headers) {
        return navigator.sendBeacon(url, new Blob([cuerpo], { type: 'text/plain;charset=UTF-8' }));
      }
      /* Supabase necesita cabeceras de autenticación, y sendBeacon no
         las admite. keepalive:true le da a fetch la misma garantía de
         sobrevivir al unload. */
      fetch(url, { method: 'POST', headers: headers, body: cuerpo, keepalive: true })
        .catch(function () {});
      return true;
    } catch (e) { return false; }
  }

  window.FLOW_DATOS = { lead: lead, evento: evento, usaSupabase: haySupabase };
})();

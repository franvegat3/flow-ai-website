/**
 * Flow AI — Conversions API de Meta, leyendo de Supabase.
 *
 * POR QUÉ EXISTE: el pixel del navegador pierde eventos (bloqueadores,
 * ITP de Safari, la pestaña que se cierra antes de que salga la
 * petición), y cuando la compra ocurre en Skool se pierde más de la
 * mitad. Esto los manda desde el servidor, donde nada los bloquea.
 *
 * NO duplica: cada evento va con el mismo `event_id` que usa el
 * navegador, y Meta se queda con uno solo.
 *
 * DÓNDE CORRE: en un proyecto suelto de Apps Script (script.google.com).
 * Ya no necesita la hoja de cálculo: la fuente de verdad es Supabase.
 *
 * INSTALACIÓN
 *   1. script.google.com → Nuevo proyecto → pegar este archivo.
 *   2. Configuración del proyecto → Propiedades del script:
 *        META_PIXEL_ID    = 2601736186963525
 *        META_CAPI_TOKEN  = (el token de la Conversions API)
 *        SUPABASE_URL     = https://gtdelcbwazcgnzohxmcl.supabase.co
 *        SUPABASE_SERVICE = (la llave service_role — NO la anon)
 *      Van en Propiedades y no en el código: el código se puede
 *      compartir, esas llaves no.
 *   3. Activadores → función `enviarPendientes`, por tiempo, cada hora.
 *   4. Correr `probarConexion()` una vez a mano y revisar el log.
 */

var API_VERSION = 'v21.0';

function prop_(nombre) {
  return (PropertiesService.getScriptProperties().getProperty(nombre) || '').trim();
}

/** Meta exige el correo en SHA-256, minúsculas y sin espacios. */
function hash_(valor) {
  if (!valor) return '';
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, String(valor).trim().toLowerCase(), Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

/** Consulta a Supabase con la llave service_role, que se salta RLS. */
function sb_(ruta, opciones) {
  var url = prop_('SUPABASE_URL') + '/rest/v1/' + ruta;
  var llave = prop_('SUPABASE_SERVICE');
  var o = opciones || {};
  var res = UrlFetchApp.fetch(url, {
    method: o.method || 'get',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: {
      'apikey': llave,
      'Authorization': 'Bearer ' + llave,
      'Prefer': o.prefer || 'return=representation'
    },
    payload: o.payload ? JSON.stringify(o.payload) : undefined
  });
  var txt = res.getContentText();
  if (res.getResponseCode() >= 300) throw new Error('Supabase ' + res.getResponseCode() + ': ' + txt);
  try { return JSON.parse(txt); } catch (e) { return []; }
}

/**
 * Manda a Meta las compras que todavía no se han reportado.
 * Es lo que corre por activador cada hora.
 */
function enviarPendientes() {
  var pixel = prop_('META_PIXEL_ID'), token = prop_('META_CAPI_TOKEN');
  if (!pixel || !token) {
    Logger.log('Faltan META_PIXEL_ID o META_CAPI_TOKEN. No se envió nada.');
    return;
  }

  var pendientes = sb_('miembros?capi_enviado_en=is.null&select=id,email,transaction_id,monto,moneda,lead_id_casado,creado_en&limit=200');
  if (!pendientes.length) { Logger.log('Nada pendiente.'); return; }

  var enviados = 0;

  for (var i = 0; i < pendientes.length; i++) {
    var m = pendientes[i];
    var atrib = atribucionDe_(m.lead_id_casado, m.email);

    var userData = { em: [hash_(m.email)] };
    /* fbc y fbp son lo que le dice a Meta EXACTAMENTE qué clic en qué
       anuncio terminó en esta venta. Sin ellos el evento entra igual,
       pero la calidad de emparejamiento baja mucho. */
    if (atrib.fbc) userData.fbc = atrib.fbc;
    if (atrib.fbp) userData.fbp = atrib.fbp;

    var evento = {
      event_name: 'Purchase',                    // sensible a mayúsculas
      event_time: aEpoch_(m.creado_en),
      action_source: 'website',
      event_source_url: 'https://flowaigroup.com/reto/',
      event_id: 'skool-' + (m.transaction_id || m.email),
      user_data: userData,
      custom_data: {
        currency: m.moneda || 'USD',
        value: Number(m.monto || 49),
        content_name: 'Reto 30 Dias'
      }
    };

    if (mandarEvento_(pixel, token, evento)) {
      sb_('miembros?id=eq.' + m.id, {
        method: 'patch',
        prefer: 'return=minimal',
        payload: { capi_enviado_en: new Date().toISOString() }
      });
      enviados++;
    }
  }

  Logger.log('CAPI: ' + enviados + ' de ' + pendientes.length + ' evento(s) enviado(s).');
}

/** Recupera fbc/fbp del lead: primero por lead_id, si no por correo. */
function atribucionDe_(leadId, email) {
  var filas = [];
  if (leadId) {
    filas = sb_('leads?lead_id=eq.' + encodeURIComponent(leadId) + '&select=fbc,fbp&order=creado_en.asc&limit=1');
  }
  if (!filas.length && email) {
    filas = sb_('leads?email=eq.' + encodeURIComponent(email) + '&select=fbc,fbp&order=creado_en.asc&limit=1');
  }
  return filas.length ? filas[0] : {};
}

function aEpoch_(fecha) {
  var t = Date.parse(fecha);
  if (!t || isNaN(t)) t = Date.now();
  /* Meta rechaza eventos de más de 7 días. Antes de perder la
     conversión, se manda con fecha de hace 6 días. */
  var limite = Date.now() - 6 * 86400000;
  if (t < limite) t = limite;
  return Math.floor(t / 1000);
}

function mandarEvento_(pixel, token, evento) {
  var url = 'https://graph.facebook.com/' + API_VERSION + '/' + pixel + '/events';
  try {
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true,
      payload: JSON.stringify({ data: [evento], access_token: token })
    });
    if (res.getResponseCode() >= 200 && res.getResponseCode() < 300) return true;
    Logger.log('CAPI error ' + res.getResponseCode() + ': ' + res.getContentText());
    return false;
  } catch (err) {
    Logger.log('CAPI excepción: ' + err);
    return false;
  }
}

/** Correr a mano una vez para confirmar que las 4 propiedades sirven. */
function probarConexion() {
  try {
    var n = sb_('leads?select=id&limit=1');
    Logger.log('Supabase OK (respondió con ' + n.length + ' fila[s]).');
  } catch (e) {
    Logger.log('Supabase FALLÓ: ' + e);
    return;
  }
  var pixel = prop_('META_PIXEL_ID'), token = prop_('META_CAPI_TOKEN');
  if (!pixel || !token) { Logger.log('Falta el pixel o el token de CAPI.'); return; }
  var ok = mandarEvento_(pixel, token, {
    event_name: 'PageView',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    event_source_url: 'https://flowaigroup.com/',
    event_id: 'prueba-' + Date.now(),
    user_data: { em: [hash_('prueba@flowaigroup.com')] }
  });
  Logger.log(ok ? 'Meta OK: busca el evento en Events Manager → Test Events.'
                : 'Meta falló. Revisa el log de arriba.');
}

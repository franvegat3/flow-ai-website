/* ============================================================
   POST /api/suscribir  — captura de correos de Flow AI.

   Función serverless de Vercel. Sin dependencias: solo el runtime
   de Node, así que el sitio sigue sin build ni node_modules.

   Recibe  { email, fuente, pagina, referrer, utm }
   Devuelve { ok: true, destinos: [...] }  o  { ok:false, motivo }

   Por qué existe en vez de pegarle al proveedor desde el navegador:
     - Las llaves no se publican en el HTML de 368 páginas.
     - Cambiar de proveedor se hace aquí, no en el sitio entero.
     - El correo se valida y se limpia antes de guardarse.

   Destinos (se configuran con variables de entorno en Vercel;
   los que no estén configurados simplemente se saltan):

     SHEETS_WEBHOOK_URL   URL del Web App de Google Apps Script que
                          escribe en la hoja de cálculo. Es el registro
                          propio: el que nadie te puede quitar.
     KIT_API_KEY          v4 API key de Kit (antes ConvertKit).
     KIT_FORM_ID          formulario de Kit al que se suscribe.

   Si no hay NINGUNO configurado responde 503 con motivo
   'sin-destino' y el sitio se lo dice claro al visitante, en vez de
   fingir que guardó un correo que se está tirando a la basura.
   ============================================================ */

'use strict';

var VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* Corta cualquier campo que venga del navegador antes de guardarlo:
   son datos de un formulario público. */
function recorta(v, max) {
  return String(v == null ? '' : v).slice(0, max);
}

async function aGoogleSheet(url, registro) {
  var r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registro)
  });
  if (!r.ok) throw new Error('sheets HTTP ' + r.status);
  return 'sheets';
}

async function aKit(apiKey, formId, registro) {
  var r = await fetch('https://api.kit.com/v4/forms/' + formId + '/subscribers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': apiKey },
    body: JSON.stringify({ email_address: registro.email })
  });
  if (!r.ok) throw new Error('kit HTTP ' + r.status);
  return 'kit';
}

module.exports = async function (req, res) {
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, motivo: 'metodo-no-permitido' });
    return;
  }

  var cuerpo = req.body;
  if (typeof cuerpo === 'string') {
    try { cuerpo = JSON.parse(cuerpo); } catch (e) { cuerpo = {}; }
  }
  cuerpo = cuerpo || {};

  /* Campo trampa. Los bots llenan todo lo que encuentran; el visitante
     real nunca ve este campo. Se responde ok para que no reintenten,
     pero no se guarda nada. */
  if (cuerpo.empresa) { res.status(200).json({ ok: true, destinos: [] }); return; }

  var email = recorta(cuerpo.email, 254).trim().toLowerCase();
  if (!VALIDO.test(email)) {
    res.status(400).json({ ok: false, motivo: 'email-invalido' });
    return;
  }

  var registro = {
    fecha: new Date().toISOString(),
    email: email,
    fuente: recorta(cuerpo.fuente, 40),      // popup | formulario | landing-reto
    pagina: recorta(cuerpo.pagina, 300),     // de qué guía salió
    referrer: recorta(cuerpo.referrer, 300),
    utm: recorta(cuerpo.utm, 300),
    pais: recorta(req.headers['x-vercel-ip-country'], 8)
  };

  var tareas = [];
  if (process.env.SHEETS_WEBHOOK_URL) {
    tareas.push(aGoogleSheet(process.env.SHEETS_WEBHOOK_URL, registro));
  }
  if (process.env.KIT_API_KEY && process.env.KIT_FORM_ID) {
    tareas.push(aKit(process.env.KIT_API_KEY, process.env.KIT_FORM_ID, registro));
  }

  if (!tareas.length) {
    console.error('Correo perdido, no hay destino configurado:', email);
    res.status(503).json({ ok: false, motivo: 'sin-destino' });
    return;
  }

  var resultados = await Promise.allSettled(tareas);
  var ok = resultados.filter(function (r) { return r.status === 'fulfilled'; });
  var fallos = resultados.filter(function (r) { return r.status === 'rejected'; });

  fallos.forEach(function (f) {
    console.error('Destino falló para ' + email + ':', f.reason && f.reason.message);
  });

  /* Basta con que UN destino haya guardado. Si Kit se cae pero la hoja
     respondió, el correo está a salvo y no hay razón de mostrarle un
     error a alguien que sí quedó registrado. */
  if (!ok.length) {
    res.status(502).json({ ok: false, motivo: 'destinos-fallaron' });
    return;
  }

  res.status(200).json({ ok: true, destinos: ok.map(function (r) { return r.value; }) });
};

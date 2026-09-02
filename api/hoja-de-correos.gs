/**
 * Flow AI — receptor de eventos del embudo para Google Sheets.
 *
 * Esto NO corre en el sitio. Se pega en Apps Script y se publica como
 * Web App ("Ejecutar como: Yo" / "Quién tiene acceso: Cualquier usuario").
 *
 * Recibe tres tipos de POST, distinguidos por el campo `tipo`:
 *
 *   tipo:'lead'          → optin.js, cuando alguien deja su correo
 *   tipo:'clic_checkout' → /ir/skool/, cuando alguien pica "pagar"
 *   tipo:'pago'          → Zapier ("New paid member" de Skool)
 *
 * Sin `tipo` se asume 'lead', para que las llamadas viejas sigan
 * funcionando mientras se propaga el sitio nuevo.
 *
 * REDESPLIEGUE: al pegar esto hay que ir a Implementar → Administrar
 * implementaciones → editar la existente → Versión: Nueva. Si en vez
 * de eso se crea una implementación nueva, cambia la URL /exec y hay
 * que actualizar SHEETS_URL en flowai-config.js.
 */

var LIBRO_ID = '1Lo1it3kbCZqCLrW0433pmcAPfjsU3zmRlopHdCPxMzQ';  // Flow AI — Suscriptores

var HOJA_LEADS = 'Suscriptores';
var HOJA_CLICS = 'Clics';
var HOJA_PAGOS = 'Miembros';

/* Las 7 primeras son las columnas originales y NO se mueven de orden:
   hay ~12 filas viejas escritas con ese layout. Lo nuevo se agrega a
   la derecha. */
var COL_LEADS = [
  'fecha', 'email', 'fuente', 'pagina', 'referrer', 'utm', 'pais',
  'lead_id', 'fbclid', 'fbc', 'fbp', 'gclid', 'ttclid',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'landing_inicial', 'referrer_inicial',
  'clic_checkout_en', 'pago_en', 'transaction_id', 'baja_en', 'motivo_baja',
  'capi_enviado_en'
];

var COL_CLICS = [
  'fecha', 'lead_id', 'destino', 'fbclid', 'fbc', 'fbp',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'landing_inicial'
];

var COL_PAGOS = [
  'fecha', 'email', 'nombre', 'transaction_id', 'monto', 'moneda',
  'lead_id_casado', 'capi_enviado_en'
];

function doPost(e) {
  try {
    var datos = JSON.parse(e.postData.contents);
    var tipo = String(datos.tipo || 'lead');

    if (tipo === 'clic_checkout') return registrarClic(datos);
    if (tipo === 'pago') return registrarPago(datos);
    return registrarLead(datos);

  } catch (err) {
    return respuesta({ ok: false, motivo: String(err) });
  }
}

/* ---------- Leads ---------- */

function registrarLead(datos) {
  var email = String(datos.email || '').trim().toLowerCase();
  if (!email) return respuesta({ ok: false, motivo: 'sin-email' });

  var hoja = dameLaHoja(HOJA_LEADS, COL_LEADS);
  var fila = filaPorEmail(hoja, email);

  if (fila) {
    /* Repetido. Antes esto solo actualizaba la fecha y tiraba a la
       basura el utm/fuente nuevos — justo el peor caso, porque el
       segundo toque suele ser el del anuncio pagado y era el que se
       perdía.
       Ahora se rellenan las celdas VACÍAS con lo que traiga el toque
       nuevo, sin pisar lo que ya tenía valor: el primer toque sigue
       mandando, pero deja de perderse información. */
    hoja.getRange(fila, 1).setValue(datos.fecha || new Date().toISOString());
    rellenarVacias(hoja, fila, COL_LEADS, datos);
    return respuesta({ ok: true, repetido: true });
  }

  hoja.appendRow(COL_LEADS.map(function (c) { return valorPara(c, datos); }));
  return respuesta({ ok: true });
}

/* ---------- Clic al checkout ----------
   Se escribe en su propia pestaña (un lead puede picar varias veces) y
   además se marca en la fila del lead, que es donde se lee el embudo. */

function registrarClic(datos) {
  var hoja = dameLaHoja(HOJA_CLICS, COL_CLICS);
  hoja.appendRow(COL_CLICS.map(function (c) { return valorPara(c, datos); }));

  var leadId = String(datos.lead_id || '').trim();
  if (leadId) {
    var hLeads = dameLaHoja(HOJA_LEADS, COL_LEADS);
    var fila = filaPorColumna(hLeads, COL_LEADS, 'lead_id', leadId);
    if (fila) {
      ponSiVacia(hLeads, fila, COL_LEADS, 'clic_checkout_en',
                 datos.fecha || new Date().toISOString());
    }
  }
  return respuesta({ ok: true });
}

/* ---------- Pago (Zapier) ----------
   Zapier NO manda el monto: su trigger "New paid member" trae nombre,
   correo, transaction id y fecha, nada más. Por eso el monto se fija
   aquí y hay que actualizarlo a mano si cambia el precio. */

function registrarPago(datos) {
  var email = String(datos.email || '').trim().toLowerCase();
  if (!email) return respuesta({ ok: false, motivo: 'sin-email' });

  var hoja = dameLaHoja(HOJA_PAGOS, COL_PAGOS);

  /* Zapier hace polling cada 10-15 min y puede reenviar. El
     transaction_id evita filas duplicadas. */
  var tx = String(datos.transaction_id || '').trim();
  if (tx && filaPorColumna(hoja, COL_PAGOS, 'transaction_id', tx)) {
    return respuesta({ ok: true, repetido: true });
  }

  /* El match por correo es lo que cierra el círculo: recupera el
     fbclid del lead para que la Conversions API pueda decirle a Meta
     qué anuncio pagó esta venta. Si la persona pagó en Skool con OTRO
     correo, el match falla y queda sin lead_id. No tiene arreglo. */
  var hLeads = dameLaHoja(HOJA_LEADS, COL_LEADS);
  var filaLead = filaPorEmail(hLeads, email);
  var leadId = '';
  if (filaLead) {
    leadId = hLeads.getRange(filaLead, COL_LEADS.indexOf('lead_id') + 1).getValue();
    ponSiVacia(hLeads, filaLead, COL_LEADS, 'pago_en', datos.fecha || new Date().toISOString());
    ponSiVacia(hLeads, filaLead, COL_LEADS, 'transaction_id', tx);
  }

  var registro = {
    fecha: datos.fecha || new Date().toISOString(),
    email: email,
    nombre: [datos.nombre, datos.apellido].filter(String).join(' ').trim(),
    transaction_id: tx,
    monto: datos.monto || 49,
    moneda: datos.moneda || 'USD',
    lead_id_casado: leadId
  };
  hoja.appendRow(COL_PAGOS.map(function (c) { return valorPara(c, registro); }));

  return respuesta({ ok: true, casado: !!leadId });
}

/* ---------- Utilidades ---------- */

function valorPara(col, datos) {
  var v = datos[col];
  return (v === undefined || v === null) ? '' : v;
}

function filaPorEmail(hoja, email) {
  return filaPorColumna(hoja, COL_LEADS, 'email', email, true);
}

/** Devuelve el número de fila (1-indexado, con encabezado) o 0. */
function filaPorColumna(hoja, columnas, nombreCol, valor, insensible) {
  var idx = columnas.indexOf(nombreCol);
  if (idx < 0) return 0;
  var ultima = hoja.getLastRow();
  if (ultima < 2) return 0;
  var vals = hoja.getRange(2, idx + 1, ultima - 1, 1).getValues();
  var buscado = insensible ? String(valor).trim().toLowerCase() : String(valor).trim();
  for (var i = 0; i < vals.length; i++) {
    var actual = String(vals[i][0]).trim();
    if (insensible) actual = actual.toLowerCase();
    if (actual === buscado) return i + 2;
  }
  return 0;
}

function rellenarVacias(hoja, fila, columnas, datos) {
  var actuales = hoja.getRange(fila, 1, 1, columnas.length).getValues()[0];
  var cambio = false;
  for (var i = 0; i < columnas.length; i++) {
    var nuevo = datos[columnas[i]];
    if ((actuales[i] === '' || actuales[i] === null) && nuevo !== undefined && nuevo !== null && nuevo !== '') {
      actuales[i] = nuevo;
      cambio = true;
    }
  }
  if (cambio) hoja.getRange(fila, 1, 1, columnas.length).setValues([actuales]);
}

function ponSiVacia(hoja, fila, columnas, nombreCol, valor) {
  if (!valor) return;
  var idx = columnas.indexOf(nombreCol);
  if (idx < 0) return;
  var celda = hoja.getRange(fila, idx + 1);
  if (celda.getValue() === '' || celda.getValue() === null) celda.setValue(valor);
}

/** Crea la hoja si no existe, y le agrega columnas nuevas sin tocar los datos. */
function dameLaHoja(nombre, columnas) {
  var libro = SpreadsheetApp.openById(LIBRO_ID);
  var hoja = libro.getSheetByName(nombre);
  if (!hoja) {
    hoja = libro.insertSheet(nombre);
    hoja.appendRow(columnas);
    hoja.setFrozenRows(1);
    hoja.getRange(1, 1, 1, columnas.length).setFontWeight('bold');
    return hoja;
  }
  /* Migración en caliente: si la hoja trae el encabezado viejo de 7
     columnas, se completan las nuevas a la derecha. Las filas
     existentes se quedan como están, con las celdas nuevas vacías. */
  var anchoActual = hoja.getLastColumn();
  if (anchoActual < columnas.length) {
    hoja.getRange(1, 1, 1, columnas.length).setValues([columnas]);
    hoja.getRange(1, 1, 1, columnas.length).setFontWeight('bold');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

/** Para probar desde el navegador que la implementación está viva. */
function doGet() {
  return respuesta({
    ok: true,
    vivo: true,
    leads: Math.max(dameLaHoja(HOJA_LEADS, COL_LEADS).getLastRow() - 1, 0),
    clics: Math.max(dameLaHoja(HOJA_CLICS, COL_CLICS).getLastRow() - 1, 0),
    pagos: Math.max(dameLaHoja(HOJA_PAGOS, COL_PAGOS).getLastRow() - 1, 0)
  });
}

function respuesta(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

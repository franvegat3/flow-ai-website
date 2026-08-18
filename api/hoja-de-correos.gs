/**
 * Flow AI — receptor de correos para Google Sheets.
 *
 * Esto NO corre en el sitio. Se pega en Apps Script, dentro de la
 * hoja de cálculo donde quieres los correos, y se publica como
 * Web App. La URL que te da al publicar es la que va en la variable
 * de entorno SHEETS_WEBHOOK_URL de Vercel.
 *
 * Instalación (una sola vez, ~3 minutos):
 *   1. Abre la hoja de cálculo → Extensiones → Apps Script.
 *   2. Borra lo que haya y pega este archivo completo.
 *   3. Implementar → Nueva implementación → tipo "Aplicación web".
 *        Ejecutar como:  Yo
 *        Quién tiene acceso:  Cualquier usuario
 *      (Ese "cualquier usuario" es necesario: quien llama es el
 *       servidor de Vercel, que no tiene sesión de Google. La URL
 *       nunca se publica en el sitio, solo la conoce el endpoint.)
 *   4. Copia la URL /exec y pégala en Vercel como SHEETS_WEBHOOK_URL.
 */

var HOJA = 'Suscriptores';
var COLUMNAS = ['fecha', 'email', 'fuente', 'pagina', 'referrer', 'utm', 'pais'];

function doPost(e) {
  try {
    var datos = JSON.parse(e.postData.contents);
    var email = String(datos.email || '').trim().toLowerCase();
    if (!email) return respuesta({ ok: false, motivo: 'sin-email' });

    var hoja = dameLaHoja();

    /* Un correo, una fila. Si vuelve a suscribirse solo se actualiza
       la fecha: la lista es para mandar correos, no para contar
       cuántas veces le dio clic al mismo botón. */
    var existentes = hoja.getRange(2, 2, Math.max(hoja.getLastRow() - 1, 1), 1).getValues();
    for (var i = 0; i < existentes.length; i++) {
      if (String(existentes[i][0]).trim().toLowerCase() === email) {
        hoja.getRange(i + 2, 1).setValue(datos.fecha || new Date().toISOString());
        return respuesta({ ok: true, repetido: true });
      }
    }

    hoja.appendRow(COLUMNAS.map(function (c) { return datos[c] || ''; }));
    return respuesta({ ok: true });

  } catch (err) {
    return respuesta({ ok: false, motivo: String(err) });
  }
}

/** Para probar desde el navegador que la implementación está viva. */
function doGet() {
  return respuesta({ ok: true, vivo: true, filas: dameLaHoja().getLastRow() - 1 });
}

function dameLaHoja() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = libro.getSheetByName(HOJA);
  if (!hoja) {
    hoja = libro.insertSheet(HOJA);
    hoja.appendRow(COLUMNAS);
    hoja.setFrozenRows(1);
    hoja.getRange(1, 1, 1, COLUMNAS.length).setFontWeight('bold');
  }
  return hoja;
}

function respuesta(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ============================================================
   Flow AI — configuración compartida del sitio.

   Todo lo que cambia según la campaña vive aquí y en ningún otro
   lado: el link de pago, el precio, y si las ventas están abiertas.
   Cambiarlo aquí lo cambia en las 368 guías, en la landing y en
   los pop-ups a la vez.

   Se carga ANTES que cualquier otro script del sitio.
   ============================================================ */
window.FLOW = {

  /* Dónde se paga. Skool cobra en /about: ahí vive el botón de
     "START FREE TRIAL". No usar /classroom: para quien no es
     miembro devuelve 403, o sea que el que va a pagar ve un error. */
  CHECKOUT_URL: 'https://www.skool.com/flow-8356/about',

  /* La landing de venta dentro de este sitio. */
  RETO_URL: '/reto/',

  /* Precio mostrado. Solo texto: quien cobra es Skool. */
  PRECIO: '49',
  MONEDA: 'USD',
  PERIODO: 'al mes',

  /* Interruptor de campaña.
     true  -> los CTA dicen "Entrar al reto" y van al checkout.
     false -> los CTA dicen "Avísame cuando abra" y abren la captura
              de correo. Sirve para cerrar inscripciones sin tocar HTML. */
  VENTAS_ABIERTAS: true,

  /* ---------- Medición ----------

     El Pixel ID NO es secreto: vive en el JS público de cualquier
     sitio que lo use. El token de la Conversions API sí lo es, y por
     eso no está aquí: ese vive en Apps Script, del lado del servidor.

     Con estos dos vacíos, tracking.js se apaga solo y el sitio
     funciona igual. Se pueden llenar después sin tocar nada más. */
  PIXEL_ID: '2601736186963525',
  GA4_ID: '',

  /* La página puente por donde pasa todo clic a pagar. Existe para
     registrar el clic antes de saltar a otro dominio, que es
     justamente lo que se perdía cuando los botones iban directo a
     Skool. */
  IR_SKOOL_URL: '/ir/skool/',

  /* ---------- Base de leads (Supabase) ----------

     Esta llave es PÚBLICA a propósito. La base tiene RLS con política
     de solo INSERT: con esta llave se pueden agregar filas y nada más
     — no leer la lista, no editarla, no borrarla. Verificado contra la
     base real.

     Si estos dos quedan vacíos, datos.js cae solo a la hoja de Google
     y el sitio sigue funcionando igual. */
  SUPABASE_URL: 'https://gtdelcbwazcgnzohxmcl.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0ZGVsY2J3YXpjZ256b2h4bWNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjU2MjAsImV4cCI6MjEwMzgwMTYyMH0.O_tEk5K7QmH1B4ghHNfsriGjT0Gzs6gk8bZLfilw0uU',

  /* ---------- A dónde van los correos ----------

     El sitio está en GitHub Pages, que sirve archivos y nada más: no
     corre funciones serverless. Así que el navegador escribe directo
     en la hoja de cálculo, con el Web App de Apps Script
     (api/hoja-de-correos.gs).

     Tiene un costo que conviene tener claro: esta URL queda visible en
     el JS público, así que alguien decidido podría meter filas basura
     en la hoja. No puede leerla ni borrarla, solo agregar. Es el mismo
     trato que hace todo mundo con los formularios de newsletter
     (el sitio de Mariah expone así su endpoint de Klaviyo).

     El día que el sitio se mueva a Vercel: pon OPTIN_ENDPOINT en
     '/api/suscribir' y api/suscribir.js toma el relevo con la URL
     escondida en una variable de entorno. Si OPTIN_ENDPOINT tiene
     valor, gana sobre SHEETS_URL. */
  SHEETS_URL: 'https://script.google.com/macros/s/AKfycbxs6RIw9MM022krC14-kpKnPJn_tCuUo7Kl0XXDV0YNF_Uv6hOaXUwkpNl6gyg2FQJd/exec',
  OPTIN_ENDPOINT: ''
};

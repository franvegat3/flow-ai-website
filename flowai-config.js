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

  /* Endpoint propio de captura de correos (api/suscribir.js). */
  OPTIN_ENDPOINT: '/api/suscribir'
};

/* ============================================================
   Flow AI — aplica window.FLOW al HTML de cualquier página.

   Es lo que hace que el precio y el link de pago vivan en un solo
   archivo (flowai-config.js) y no repetidos en 368 guías. El HTML
   trae valores por defecto escritos a mano para que la página se
   lea bien aunque el JS no cargue; esto los sobreescribe.

   Se carga DESPUÉS de flowai-config.js.
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.FLOW || {};

  var pon = function (sel, valor) {
    if (!valor) return;
    Array.prototype.forEach.call(document.querySelectorAll(sel), function (el) {
      el.textContent = valor;
    });
  };

  pon('[data-precio]', CFG.PRECIO);
  pon('[data-periodo]', CFG.PERIODO);

  /* Botones que llevan a pagar. Con las ventas cerradas dejan de
     mandar a un checkout que no va a cobrar y se convierten en
     captura de correo. */
  var abiertas = CFG.VENTAS_ABIERTAS !== false;
  Array.prototype.forEach.call(document.querySelectorAll('[data-checkout]'), function (a) {
    if (abiertas) {
      a.href = CFG.CHECKOUT_URL || (CFG.RETO_URL || '/reto/');
      a.target = '_blank';
      a.rel = 'noopener';
    } else {
      a.href = (CFG.RETO_URL || '/reto/') + '#avisame';
      a.textContent = 'Avísame cuando abra';
      a.removeAttribute('target');
    }
  });
})();

/* ============================================================
   Flow AI — formulario "Cotiza tu proyecto" de la home.

   No hay servidor (GitHub Pages), así que el formulario arma un
   mensaje de WhatsApp con los cinco campos y lo abre. Usa
   WHATSAPP_NUMBER de script.js, que se carga antes que este.
   El clic en "Enviar por WhatsApp" lo registra recorrido.js como
   cualquier botón .btn.
   ============================================================ */
(function () {
  var form = document.getElementById("quoteForm");
  if (!form) return;
  var error = document.getElementById("quoteError");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = new FormData(form);
    var get = function (k) { return (data.get(k) || "").toString().trim(); };

    // Validación mínima: nombre, tipo y qué quiere resolver.
    var ok = true;
    ["nombre", "tipo", "reto"].forEach(function (name) {
      var field = form.elements[name].closest(".field");
      var valid = get(name).length > 0;
      field.classList.toggle("is-invalid", !valid);
      if (!valid) ok = false;
    });
    error.hidden = ok;
    if (!ok) return;

    var lines = [
      "Hola Francisco, quiero cotizar un proyecto de IA personalizada.",
      "",
      "Nombre: " + get("nombre"),
      "Empresa: " + (get("empresa") || "—"),
      "Tipo de proyecto: " + get("tipo"),
      "Qué quiero resolver: " + get("reto"),
      "Presupuesto aproximado: " + (get("presupuesto") || "por definir"),
    ];
    var url = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(lines.join("\n"));
    window.open(url, "_blank", "noopener");
  });

  // Quita el rojo en cuanto la persona corrige el campo.
  form.addEventListener("input", function (e) {
    var field = e.target.closest(".field");
    if (field && e.target.value.trim()) field.classList.remove("is-invalid");
  });
})();

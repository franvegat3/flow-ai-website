/* ============================================================
   GET/POST /api/guia?palabra=automation

   El puente entre ManyChat y las 368 guías.

   Por qué existe: ManyChat resuelve palabra→respuesta con una regla por
   palabra, hechas a mano en su interfaz. Con 368 guías eso son 368 reglas
   que nadie va a mantener. Aquí es UNA sola automatización: ManyChat manda
   la palabra que comentó la persona, esto devuelve el título y el link de
   la guía que toca, y el flow arma el DM con eso.

   Agregar una guía nueva = agregar una línea a palabras.json. Cero clics
   en ManyChat.

   Devuelve el formato de External Request de ManyChat: campos planos que
   se pueden meter directo en el mensaje.

     { encontrada: true, titulo: "...", url: "...", palabra: "..." }

   Si la palabra no existe devuelve encontrada:false con un mensaje de
   respaldo que manda a la biblioteca completa, en vez de dejar a la
   persona sin respuesta.
   ============================================================ */

'use strict';

var MAPA = require('./palabras.json');

/* Las palabras llegan como las escribió una persona en un comentario:
   con mayúsculas, acentos, emojis y espacios de sobra. */
function normaliza(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 40);
}

var INDICE = null;
function indice() {
  if (INDICE) return INDICE;
  INDICE = Object.create(null);
  for (var k in MAPA) INDICE[normaliza(k)] = MAPA[k];
  return INDICE;
}

module.exports = function (req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300');

  var q = req.query && req.query.palabra;
  if (!q && req.body) q = req.body.palabra || req.body.word || req.body.text;
  var clave = normaliza(q);
  var g = clave ? indice()[clave] : null;

  if (!g) {
    res.status(200).json({
      encontrada: false,
      palabra: clave,
      titulo: 'La biblioteca completa',
      url: 'https://flowaigroup.com/guias/',
      mensaje: 'No encontré esa guía, pero aquí están las 368 completas 👇'
    });
    return;
  }

  res.status(200).json({
    encontrada: true,
    palabra: clave,
    titulo: g.titulo,
    url: g.url,
    mensaje: 'Aquí está: ' + g.titulo
  });
};

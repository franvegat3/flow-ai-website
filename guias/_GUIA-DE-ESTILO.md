# Cómo se escribe una guía de Flow AI

Este archivo es el contrato. Si escribes una guía para `guias/_contenido/`, se
escribe así y no de otra forma. La referencia viva es
`guias/_contenido/plugins-cowork.html`: ábrela antes de escribir la tuya.

## Qué entregas

Un solo archivo: `guias/_contenido/<slug>.html`, donde `<slug>` es exactamente el
que trae la entrada del catálogo (`guias/_catalogo.json`).

Ese archivo es **solo el cuerpo del artículo**: lo que va adentro de
`<article class="prose">`. Nada de `<!DOCTYPE>`, `<html>`, `<head>`, `<body>`,
`<h1>`, nav, footer, ni el bloque de "Combínala con estas". Todo eso lo pone
`guias/_build.py`. Tampoco escribas el título ni el lead: el build los saca del
catálogo. Empiezas directo con el primer `<p>`.

No toques ningún otro archivo. Ni el catálogo, ni la plantilla, ni el build.

## La voz

Quien escribe es **Francisco Vega**, que monta sistemas de IA dentro de empresas
que están operando de verdad. No es un divulgador que leyó el anuncio: es alguien
que ya lo implementó y sabe dónde truena.

- Español de México, neutro. De "tú", nunca de "usted".
- Frases cortas. Un punto es mejor que una coma.
- El párrafo de apertura tiene que ganarse el segundo. Arranca con la tensión real
  del problema, no con "En el mundo de hoy, la inteligencia artificial…".
- Nombra el costo, el tiempo y el paso que la gente se salta. Eso es lo que
  distingue esta guía de un resumen.
- Se vale decir que algo no vale la pena, que está caro, o que hay un límite duro.
- Cero relleno de IA: nada de "en resumen", "es importante destacar", "en la era
  digital", "revolucionario", "sin duda", "soluciones integrales". Si una frase se
  puede borrar sin perder información, bórrala.
- Cero emojis. Cero signos de exclamación.

## El fondo

- **La redacción es tuya, los hechos pueden venir de la referencia.** Cada entrada
  del catálogo trae un campo `ref` con la guía original del tema. Si te falta un
  dato —qué herramienta es, qué endpoint, cuántos pasos, cómo se llama la función—
  **abre el `ref` con WebFetch y sácalo de ahí**. Es mucho más rápido que ponerte a
  investigar. Lo que no se hace es traducir: tomas los hechos y escribes el
  artículo con tus palabras, tu estructura y la voz de Fran.
- **Primero el `ref`, luego la búsqueda.** Solo sal a WebSearch cuando el `ref` no
  traiga el dato o cuando el tema sea de algo que cambia seguido (precios de
  modelos, endpoints, convocatorias). No investigues por deporte.
- **No inventes datos.** Nada de porcentajes, precios exactos, fechas ni nombres de
  estudio que no puedas sostener. Si el tema pide una cifra que no tienes ni en el
  `ref`, escribe el mecanismo sin la cifra. Un dato inventado quema la credibilidad
  de todo el sitio.
- **No inventes URLs ni comandos.** Enlaza solo a dominios oficiales que conozcas
  (claude.com, anthropic.com, docs de la herramienta). Si dudas de un comando
  exacto, describe dónde se encuentra la opción en lugar de inventar la sintaxis.
  Nunca enlaces al `ref`: es tu fuente, no una liga para el lector.
- **Prompts completos.** Cuando la guía prometa un prompt, ponlo entero dentro de
  `<pre><code>`, listo para copiar. Un prompt a medias no sirve de nada.
- **Aterriza a operación real.** Al menos un ejemplo debe sonar a empresa que
  factura: un equipo comercial, una operación de contenido, una cuenta de anuncios,
  un área de finanzas. No solo casos personales.

## La forma

Largo objetivo: el campo `min` del catálogo por 150 palabras. Una guía de `min: 9`
son ~1,350 palabras. Quédate en ±15%.

Estructura que funciona:

1. Dos o tres párrafos de entrada que planteen el problema y prometan lo concreto.
2. Un `<h2>` que defina el concepto en una frase, si el tema lo necesita.
3. Un `<h2>` de "cómo se hace" con los pasos reales.
4. El cuerpo grande: la lista, los 10 elementos, los 5 prompts, lo que prometa el
   título. Cada elemento con su `<h3>`.
5. Un `<h2>` de cierre con el error que comete todo el mundo, o el orden en que
   conviene hacerlo. Nunca un resumen de lo que ya dijiste.

### HTML permitido

Solo estas etiquetas y clases. El CSS del sitio no conoce otras:

```html
<p>Texto normal.</p>
<h2>Sección</h2>
<h3>Subsección</h3>
<ul><li>Punto con <strong>negrita</strong> y <em>énfasis</em>.</li></ul>
<ol><li>Paso numerado.</li></ol>
<p>Un identificador va en <code>código</code>.</p>
<pre><code>Bloque de código o prompt completo.
Puede tener varias líneas.</code></pre>
<a href="https://claude.com/" target="_blank" rel="noopener">enlace externo</a>
<a href="/guias/otro-slug/">enlace a otra guía</a>

<div class="callout-box">
  <p><strong>El paso que todo mundo se salta:</strong> una advertencia o un
  matiz que merece salirse del flujo. Máximo dos por guía.</p>
</div>

<div class="plugin-card">
  <h3>1. Nombre del elemento <code>identificador</code></h3>
  <p>Qué hace y por qué importa.</p>
  <p class="plugin-for"><strong>Para quién:</strong> a quién le sirve de verdad.</p>
</div>
```

`plugin-card` es el bloque para listas numeradas de cosas (los 10 plugins, las 5
skills, los 8 modelos). Úsalo cuando la guía enumere elementos comparables; si no,
`<h3>` normal.

Indentación: 6 espacios en el primer nivel, porque el cuerpo se inserta dentro de
`<article>`. Copia la indentación de `plugins-cowork.html`.

### Enlaces entre guías

Enlaza a otras guías del catálogo cuando venga al caso, con
`<a href="/guias/<slug>/">`. Verifica que el slug exista en `_catalogo.json`. Dos o
tres por guía es suficiente; el build ya agrega los relacionados al final.

## Antes de dar por terminada una

- El archivo abre con `<p>` y cierra con una etiqueta cerrada.
- No hay `<h1>`, ni el título repetido en el cuerpo.
- Los prompts prometidos están completos.
- No hay ninguna cifra, precio ni URL que no puedas sostener.
- Corre `python3 guias/_build.py` desde la raíz del repo: tiene que terminar sin
  error y contar tu guía como publicada.

# Francisco Vega · Flow AI — sitio web

Sitio de marca + consultora Flow AI, biblioteca de 368 guías gratuitas y la
landing de venta del Reto 30 Días. HTML/CSS/JS estático, sin build.

**Se publica en GitHub Pages** (rama `main`, dominio por `CNAME`). O sea: se
sirven archivos y nada más, **no corren funciones serverless**. El `vercel.json`
y `api/suscribir.js` están listos para el día que se mueva a Vercel, pero hoy no
se ejecutan.

**Publicar = hacer push a `main`.** GitHub Pages tarda un par de minutos.

## Mapa

| Ruta | Qué es |
|---|---|
| `index.html` | Home (B2B: soluciones, método, founder) + sección del Reto |
| `reto/` | Landing de venta del Reto 30 Días |
| `guias/` | Biblioteca: índice, plantilla, contenido y generador |
| `api/hoja-de-correos.gs` | Web App de Apps Script: escribe en la hoja de suscriptores |
| `api/suscribir.js` | Endpoint para cuando el sitio se mueva a Vercel (hoy no corre) |
| `flowai-config.js` | **Precio, link de pago y si las ventas están abiertas** |
| `flowai.js` | Aplica esa config al HTML de toda página |
| `optin.js` | Pop-up de captura + formularios de correo |

## Lo que se cambia más seguido

**Precio o link de pago:** `flowai-config.js`. Nada más. Se propaga a la landing,
a la home, al índice de guías y a las 368 guías.

**Cerrar inscripciones:** `VENTAS_ABIERTAS: false` en `flowai-config.js`. Los
botones de compra se convierten solos en captura de correo.

**Texto / secciones:** `index.html`, `reto/index.html`.

**Estilos:** `styles.css` (paleta en `:root`), `guias/guias.css`, `reto/reto.css`.

**Número de WhatsApp:** `script.js` → `WHATSAPP_NUMBER`.

## Guías

368 guías generadas desde `guias/_catalogo.json` + `guias/_contenido/<slug>.html`.
Para agregar una: escribe el contenido, agrega su entrada al catálogo y corre

```bash
python3 guias/_build.py     # genera páginas, guias-data.js y sitemap.xml
python3 guias/_revisar.py   # estructura, enlaces, cifras, largo, duplicados
```

El detalle está en `guias/_GUIA-DE-ESTILO.md`.

## Captura de correos

Como no hay backend, **el navegador escribe directo en la hoja de cálculo** a
través de un Web App de Apps Script. La URL está en `flowai-config.js` →
`SHEETS_URL`, y el código del receptor en `api/hoja-de-correos.gs` (trae sus
instrucciones de instalación adentro).

Cada correo se guarda con la página de la que salió y su UTM, así que se puede
ver qué guías convierten. Un correo, una fila: si alguien se suscribe otra vez
solo se actualiza la fecha.

Dos detalles que costaron encontrarse y conviene no deshacer:

1. El `Content-Type` del POST tiene que ser **`text/plain`**, no
   `application/json`. Con JSON el navegador manda antes un OPTIONS de
   preflight, Apps Script no contesta OPTIONS, y la petición muere en CORS sin
   llegar a la hoja. Con `text/plain` cuenta como petición simple y el cuerpo
   sigue siendo JSON, que el script parsea igual.
2. Apps Script tarda **2 a 3 segundos** en contestar. No es que esté roto.

El costo de este montaje: la URL del Web App queda visible en el JS público, así
que alguien decidido podría meter filas basura. No puede leer ni borrar la hoja,
solo agregar. Es el mismo trato que hacen todos los formularios de newsletter.
Se resuelve el día que el sitio esté en Vercel: se pone `OPTIN_ENDPOINT` en
`/api/suscribir` y la URL se esconde en una variable de entorno.

### Pop-up

Sale en las guías, no en la landing (una página de venta no se interrumpe a sí
misma). Aparece a los 25 segundos o al 35% de scroll, lo que pase primero, más
intención de salida en desktop. **Sale una vez cada 7 días, y si la persona deja
su correo no vuelve a salir nunca.** El estado vive en `localStorage`.

Para desactivarlo en una página: `<body data-sin-popup>` (los formularios
siguen funcionando).

## Ver local

```bash
npx serve .
```

La captura de correos sí funciona en local: le pega directo a Apps Script, que
no distingue de dónde viene. Ojo con eso — las pruebas caen en la hoja de verdad.

## Publicar

```bash
git push
```

GitHub Pages reconstruye solo. Un par de minutos.

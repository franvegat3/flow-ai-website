# Francisco Vega · Flow AI — sitio web

Sitio de marca + consultora Flow AI, biblioteca de 368 guías gratuitas y la
landing de venta del Reto 30 Días. HTML/CSS/JS estático, sin build, más una
función serverless para capturar correos.

## Mapa

| Ruta | Qué es |
|---|---|
| `index.html` | Home (B2B: soluciones, método, founder) + sección del Reto |
| `reto/` | Landing de venta del Reto 30 Días |
| `guias/` | Biblioteca: índice, plantilla, contenido y generador |
| `api/suscribir.js` | Endpoint que guarda los correos |
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

El navegador **nunca** habla con el proveedor de correo: le pega a
`/api/suscribir`, que reparte a los destinos configurados. Así las llaves no
quedan publicadas en 368 páginas y cambiar de proveedor es un archivo.

Se configura con variables de entorno en Vercel (Settings → Environment
Variables). Ninguna es obligatoria, pero **si no hay al menos una, el endpoint
responde 503 y el sitio le dice al visitante que la lista no está conectada**
en vez de tirar el correo a la basura.

| Variable | Para qué |
|---|---|
| `SHEETS_WEBHOOK_URL` | Web App de Apps Script que escribe en la hoja de cálculo. Es el registro propio. Instrucciones dentro de `api/hoja-de-correos.gs`. |
| `KIT_API_KEY` + `KIT_FORM_ID` | Kit (antes ConvertKit), para poder mandarles correos de verdad. |

Cada correo se guarda con la página de la que salió, así que se puede ver qué
guías convierten.

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

Ojo: `/api/suscribir` no corre con un servidor estático. Para probar la captura
completa hace falta `npx vercel dev`.

## Deploy (Vercel)

```bash
npx vercel --prod
```

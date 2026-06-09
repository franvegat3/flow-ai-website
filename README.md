# Francisco Vega · Flow AI — sitio web

Sitio personal de marca + consultora Flow AI. HTML/CSS/JS estático, sin build.

## Editar
- **Texto / secciones:** `index.html`
- **Estilos / colores:** `styles.css` (paleta en `:root`)
- **Número de WhatsApp:** `script.js` → constante `WHATSAPP_NUMBER` (formato internacional, solo dígitos, ej. `5215512345678`)

## Deploy (Vercel)
```bash
npx vercel --prod
```
La primera vez pide login (GitHub/email). Genera un link tipo `*.vercel.app`.

## Ver local
Abre `index.html` en el navegador, o:
```bash
npx serve .
```

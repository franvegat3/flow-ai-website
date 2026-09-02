#!/usr/bin/env python3
"""
Genera un link corto y trazable por cada video organico.

El problema que resuelve: hoy todos los reels mandan al mismo sitio, asi
que se sabe cuanta gente llego, pero no DE QUE VIDEO. Con esto cada video
tiene su propia puerta:

    flowaigroup.com/r/vuelos/   ->  /reto/?...&utm_content=vuelos

Y como los reels ya usan una palabra clave unica por video en ManyChat
(CONSEJO, CODIGOS, VUELOS...), el codigo del link es esa misma palabra.
No hay que inventar nada: el identificador ya existia, solo no se estaba
usando para medir.

Uso:  python3 r/_build.py
"""

import json
import re
from pathlib import Path

AQUI = Path(__file__).resolve().parent
FUENTE = AQUI / "_videos.json"

PLANTILLA = """<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Un momento...</title>
<meta name="robots" content="noindex, nofollow">
<style>
  :root { color-scheme: dark; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#0b1220; color:#e8eefc; text-align:center; padding:24px;
         font:500 16px/1.5 -apple-system,BlinkMacSystemFont,system-ui,sans-serif; }
  .anillo { width:40px; height:40px; margin:0 auto 18px; border:3px solid rgba(96,165,250,.25);
            border-top-color:#60a5fa; border-radius:50%; animation:girar .8s linear infinite; }
  @keyframes girar { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion:reduce) { .anillo { animation-duration:3s; } }
  a { color:#93c5fd; }
</style>
</head>
<body>
  <div>
    <div class="anillo" role="status" aria-label="Cargando"></div>
    <p>Un momento...</p>
    <p style="font-size:14px;opacity:.7">Si no avanza, <a id="manual" href="__DESTINO__">entra por aqui</a>.</p>
  </div>
<script src="../../flowai-config.js"></script>
<script src="../../atribucion.js"></script>
<script src="../../datos.js"></script>
<script>
/* Registra de que video vino esta persona y la manda al destino.
   Los utm_ van en la URL para que atribucion.js los capture y los
   persista 90 dias, igual que con un anuncio pagado. Asi lo organico y
   lo pagado se leen en la misma tabla, con las mismas columnas. */
(function () {
  var destino = __DESTINO_JS__;
  document.getElementById('manual').href = destino;
  if (window.FLOW_DATOS) window.FLOW_DATOS.evento('clic_video', { destino: 'r/__CODIGO__' });
  setTimeout(function () { location.replace(destino); }, 400);
})();
</script>
</body>
</html>
"""


def limpio(texto):
    """Codigo de link: minusculas, sin acentos ni espacios."""
    t = texto.strip().lower()
    for acc, base in zip("áéíóúñ", "aeioun"):
        t = t.replace(acc, base)
    return re.sub(r"[^a-z0-9-]+", "-", t).strip("-")


def main():
    if not FUENTE.exists():
        raise SystemExit("Falta %s" % FUENTE)

    videos = json.loads(FUENTE.read_text(encoding="utf-8"))
    hechos = 0

    for v in videos:
        codigo = limpio(v["codigo"])
        destino = (
            "%s?utm_source=%s&utm_medium=%s&utm_campaign=%s&utm_content=%s"
            % (
                v.get("destino", "/reto/"),
                v.get("red", "organico"),
                v.get("medio", "reel"),
                v.get("campana", "reto30"),
                codigo,
            )
        )
        html = (PLANTILLA
                .replace("__DESTINO_JS__", json.dumps(destino))
                .replace("__DESTINO__", destino)
                .replace("__CODIGO__", codigo))
        carpeta = AQUI / codigo
        carpeta.mkdir(parents=True, exist_ok=True)
        (carpeta / "index.html").write_text(html, encoding="utf-8")
        hechos += 1
        print("  /r/%s/  ->  %s" % (codigo, destino))

    print("\nGenerados %d links trazables." % hechos)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Revisión de la biblioteca de guías. Corre después de _build.py.

Comprueba, sobre todo lo que tiene cuerpo escrito:
  1. Estructura   — abre con <p>, sin <h1>, etiquetas balanceadas, clases del CSS
  2. Enlaces      — ningún href interno apunta a una página que no se generó
  3. Promesas     — si el título dice "10 X", que haya 10 cosas
  4. Largo        — dentro de min × 150 palabras, ±15%
  5. Duplicados   — dos guías que abren igual suelen ser la misma guía

Sale con código 1 si algo falla, para poder encadenarlo antes de un commit.

Uso:  python3 guias/_revisar.py
"""

import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

AQUI = Path(__file__).resolve().parent

ETIQUETAS_OK = {"p", "h2", "h3", "ul", "ol", "li", "strong", "em",
                "code", "pre", "a", "div", "span", "br"}
CLASES_OK = {"callout-box", "plugin-card", "plugin-for"}
VACIAS = {"br", "img", "hr"}


def sin_html(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s)).strip()


def revisa_estructura(nombre, cuerpo):
    fallos = []
    if "<h1" in cuerpo:
        fallos.append("trae <h1> (el título lo pone la plantilla)")
    if not cuerpo.lstrip().startswith("<p"):
        fallos.append("no abre con <p>")

    raras = {t for t in re.findall(r"</?([a-z0-9]+)", cuerpo)} - ETIQUETAS_OK
    if raras:
        fallos.append(f"etiquetas fuera del set: {sorted(raras)}")

    clases = {c for c in re.findall(r'class="([^"]+)"', cuerpo)} - CLASES_OK
    if clases:
        fallos.append(f"clases que no existen en el CSS: {sorted(clases)}")

    pila = []
    for m in re.finditer(r"<(/?)([a-z0-9]+)[^>]*?(/?)>", cuerpo):
        cierra, etiqueta, sola = m.groups()
        if etiqueta in VACIAS or sola:
            continue
        if cierra:
            if not pila or pila[-1] != etiqueta:
                fallos.append(f"cierre suelto </{etiqueta}>")
                break
            pila.pop()
        else:
            pila.append(etiqueta)
    else:
        if pila:
            fallos.append(f"quedaron abiertas: {pila}")

    return fallos


def cumple_la_promesa(titulo, cuerpo):
    """Si el título promete un número, comprueba que el cuerpo lo entregue."""
    m = re.match(r"^(\d+)\b", titulo)
    if not m:
        return True
    n = int(m.group(1))
    if n > 40:  # "100 palabras prohibidas" va en un solo bloque, no en 100 secciones
        return True

    encabezados = re.findall(r"<h[23][^>]*>(.*?)</h[23]>", cuerpo, re.S)
    numerados = len([h for h in encabezados
                     if re.match(r"\s*(<[^>]+>)*\s*\d+[\.\)]", h)])
    # los prompts numerados suelen vivir dentro de un solo <pre>
    en_bloques = len({int(x) for b in re.findall(r"<pre><code>(.*?)</code></pre>", cuerpo, re.S)
                      for x in re.findall(r"^\s*(\d+)[\.\)]", b, re.M)})

    return max(numerados, en_bloques, len(encabezados),
               len(re.findall(r"<pre>", cuerpo)),
               len(re.findall(r"<li>", cuerpo))) >= n


def main():
    catalogo = json.loads((AQUI / "_catalogo.json").read_text(encoding="utf-8"))
    contenido = AQUI / "_contenido"
    generadas = {d.name for d in AQUI.iterdir() if d.is_dir() and not d.name.startswith("_")}

    problemas = []
    aperturas = defaultdict(list)
    revisadas = 0
    con_numero = 0
    fuera_de_largo = []

    for guia in catalogo:
        ruta = contenido / f"{guia['slug']}.html"
        if not ruta.exists():
            continue
        revisadas += 1
        cuerpo = ruta.read_text(encoding="utf-8")
        slug = guia["slug"]

        for f in revisa_estructura(slug, cuerpo):
            problemas.append(f"{slug}: {f}")

        if re.match(r"^\d+\b", guia["titulo"]):
            con_numero += 1
            if not cumple_la_promesa(guia["titulo"], cuerpo):
                problemas.append(f"{slug}: el título promete un número que el cuerpo no entrega")

        palabras = len(sin_html(cuerpo).split())
        meta = guia.get("min", 8) * 150
        if not (meta * 0.85 <= palabras <= meta * 1.15):
            fuera_de_largo.append((slug, palabras, meta))

        aperturas[sin_html(cuerpo)[:90]].append(slug)

    # Enlaces rotos: se miden sobre el HTML ya generado, que es lo que ve la gente
    for pagina in AQUI.glob("*/index.html"):
        for destino in re.findall(r'href="/guias/([^/"]+)/"', pagina.read_text(encoding="utf-8")):
            if destino not in generadas:
                problemas.append(f"{pagina.parent.name}: enlace a /guias/{destino}/ que no existe")

    for apertura, slugs in aperturas.items():
        if len(slugs) > 1:
            problemas.append(f"arranque idéntico en: {', '.join(slugs)}")

    print(f"Revisadas {revisadas} guías con cuerpo.")
    print(f"  Promesas numéricas comprobadas: {con_numero}")
    print(f"  Fuera del largo objetivo (±15%): {len(fuera_de_largo)}")
    for slug, p, meta in sorted(fuera_de_largo, key=lambda x: -abs(x[1] - x[2]))[:10]:
        print(f"    {slug}: {p} palabras (objetivo {meta})")

    if problemas:
        print(f"\n{len(problemas)} problemas:")
        for p in problemas:
            print(f"  - {p}")
        sys.exit(1)

    print("\nSin problemas.")


if __name__ == "__main__":
    main()

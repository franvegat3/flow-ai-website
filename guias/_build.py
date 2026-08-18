#!/usr/bin/env python3
"""
Genera la biblioteca de guías de Flow AI.

Fuentes:
  _catalogo.json        el plan completo: una entrada por guía (metadatos)
  _contenido/<slug>.html  el cuerpo del artículo, solo HTML interno de <article class="prose">
  _plantilla.html       el cascarón compartido

Salidas:
  <slug>/index.html     una página por guía que ya tenga cuerpo escrito
  guias-data.js         las guías publicadas, para que el índice las pinte
  ../sitemap.xml        regenerado con todo lo publicado

Una guía existe en el índice solo si tiene cuerpo en _contenido/. El catálogo
puede ir muy por delante: es el plan, no lo que está live.

Uso:  python3 guias/_build.py
"""

import json
import re
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent
SITIO = "https://flowaigroup.com"

# Etiquetas legibles de la taxonomía. La clave es lo que va en data-tool /
# data-topic; el valor es lo que ve la gente. Si agregas una clave aquí,
# agrégala también a los chips de index.html.
HERRAMIENTAS = {
    "claude": "Claude",
    "cowork": "Cowork",
    "claude-code": "Claude Code",
    "chatgpt": "ChatGPT",
    "gemini": "Gemini",
    "perplexity": "Perplexity",
    "notion": "Notion",
    "canva": "Canva",
    "n8n": "n8n",
    "meta-ads": "Meta Ads",
    "video": "Video e imagen",
    "multi": "Multi-herramienta",
}

TEMAS = {
    "empezar": "Empezar",
    "prompts": "Prompts",
    "skills": "Skills",
    "agentes": "Agentes",
    "automatizacion": "Automatización",
    "contenido": "Contenido",
    "pauta": "Pauta",
    "ventas": "Ventas",
    "negocio": "Negocio",
    "carrera": "Carrera",
    "productividad": "Productividad",
    "creativo": "Creativo",
    "novedades": "Novedades",
}


def escapa(texto):
    """Escapa para meter texto dentro de un atributo HTML."""
    return (
        str(texto)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def carga_catalogo():
    ruta = AQUI / "_catalogo.json"
    if not ruta.exists():
        sys.exit("Falta guias/_catalogo.json")
    catalogo = json.loads(ruta.read_text(encoding="utf-8"))

    vistos = set()
    for i, g in enumerate(catalogo):
        for campo in ("slug", "titulo", "desc", "tool", "topic"):
            if not g.get(campo):
                sys.exit(f"Entrada {i} ({g.get('slug', '?')}) sin '{campo}'")
        if g["slug"] in vistos:
            sys.exit(f"Slug repetido: {g['slug']}")
        vistos.add(g["slug"])
        for t in g["tool"]:
            if t not in HERRAMIENTAS:
                sys.exit(f"{g['slug']}: herramienta desconocida '{t}'")
        for t in g["topic"]:
            if t not in TEMAS:
                sys.exit(f"{g['slug']}: tema desconocido '{t}'")
    return catalogo


def desactiva_links_pendientes(cuerpo, publicados):
    """Convierte en texto plano los enlaces a guías que todavía no existen.

    Las guías se escriben en desorden, así que una puede enlazar a otra que
    aún no tiene cuerpo. Dejar el <a> vivo sería un 404 en producción. Esto
    solo toca el HTML generado: el fuente en _contenido/ conserva el enlace,
    y en cuanto la guía destino se publica, el build lo restaura solo.
    """
    def resuelve(m):
        slug, texto = m.group(1), m.group(2)
        return texto if slug not in publicados else m.group(0)

    return re.sub(r'<a href="/guias/([^/"]+)/"[^>]*>(.*?)</a>', resuelve, cuerpo, flags=re.S)


def minutos_de_lectura(cuerpo):
    """Minutos calculados del texto real, no del plan.

    El `min` del catálogo es una estimación hecha antes de escribir, y varias
    guías terminaron bastante más largas. Anunciar los minutos planeados sería
    decirle al lector algo que no se cumple, así que se cuentan las palabras.
    150 por minuto: ritmo conservador para texto con prompts y bloques de código.
    """
    palabras = len(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", cuerpo)).split())
    return max(1, round(palabras / 150))


def relacionadas(guia, publicadas):
    """Dos guías publicadas que compartan tema, más el link a la biblioteca."""
    temas = set(guia["topic"])
    vecinas = [
        o for o in publicadas
        if o["slug"] != guia["slug"] and temas & set(o["topic"])
    ][:2]

    filas = []
    for v in vecinas:
        filas.append(
            f'          <a href="/guias/{v["slug"]}/" class="stack-link">\n'
            f'            <span>{v["titulo"]} →</span>\n'
            f'            <small>{v["desc"]}</small>\n'
            f'          </a>'
        )
    filas.append(
        '          <a href="/guias/" class="stack-link">\n'
        '            <span>Ver todas las guías →</span>\n'
        '            <small>La biblioteca completa de Flow AI, filtrable por herramienta y por tema.</small>\n'
        '          </a>'
    )
    return "\n".join(filas)


def main():
    catalogo = carga_catalogo()
    plantilla = (AQUI / "_plantilla.html").read_text(encoding="utf-8")
    dir_contenido = AQUI / "_contenido"

    publicadas = [g for g in catalogo if (dir_contenido / f"{g['slug']}.html").exists()]
    publicados = {g["slug"] for g in publicadas}
    apagados = 0

    for guia in publicadas:
        cuerpo = (dir_contenido / f"{guia['slug']}.html").read_text(encoding="utf-8").strip()
        vivos = len(re.findall(r'<a href="/guias/', cuerpo))
        cuerpo = desactiva_links_pendientes(cuerpo, publicados)
        apagados += vivos - len(re.findall(r'<a href="/guias/', cuerpo))
        desc = guia["desc"]
        minutos = minutos_de_lectura(cuerpo)

        tags = "".join(
            f'<span class="tag">{HERRAMIENTAS[t]}</span>' for t in guia["tool"]
        ) + "".join(
            f'<span class="tag">{TEMAS[t]}</span>' for t in guia["topic"]
        )

        pagina = plantilla
        for marca, valor in (
            ("{{SLUG}}", guia["slug"]),
            ("{{TITULO}}", escapa(guia["titulo"])),
            ("{{DESC}}", escapa(desc)),
            ("{{SEO}}", escapa(guia.get("seo", desc))),
            ("{{LEAD}}", guia.get("lead", desc)),
            ("{{MIN}}", str(minutos)),
            ("{{CRUMB}}", TEMAS[guia["topic"][0]]),
            ("{{TAGS}}", tags),
            ("{{RELACIONADAS}}", relacionadas(guia, publicadas)),
            ("{{CUERPO}}", cuerpo),
        ):
            pagina = pagina.replace(marca, valor)

        sobrante = re.findall(r"\{\{[A-Z]+\}\}", pagina)
        if sobrante:
            sys.exit(f"{guia['slug']}: quedaron marcas sin sustituir: {sobrante}")

        destino = AQUI / guia["slug"]
        destino.mkdir(exist_ok=True)
        (destino / "index.html").write_text(pagina, encoding="utf-8")

    # Datos para el índice
    minutos = {
        g["slug"]: minutos_de_lectura(
            (dir_contenido / f"{g['slug']}.html").read_text(encoding="utf-8")
        )
        for g in publicadas
    }
    datos = [
        {
            "slug": g["slug"],
            "titulo": g["titulo"],
            "desc": g["desc"],
            "badge": g.get("badge", ""),
            "tool": g["tool"],
            "topic": g["topic"],
            "min": minutos[g["slug"]],
            "meta": f'{minutos[g["slug"]]} min · {HERRAMIENTAS[g["tool"][0]]}',
        }
        for g in publicadas
    ]
    # Se escribe como .js y no como .json a propósito: así el índice se puede
    # abrir con doble clic desde el disco sin que fetch() truene por CORS.
    (AQUI / "guias-data.js").write_text(
        "window.GUIAS = " + json.dumps(datos, ensure_ascii=False, indent=1) + ";\n",
        encoding="utf-8",
    )

    # Sitemap
    urls = [f"{SITIO}/", f"{SITIO}/reto/", f"{SITIO}/guias/"] + [
        f"{SITIO}/guias/{g['slug']}/" for g in publicadas
    ]
    sitemap = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(
            f"  <url><loc>{u}</loc><changefreq>weekly</changefreq></url>\n" for u in urls
        )
        + "</urlset>\n"
    )
    (RAIZ / "sitemap.xml").write_text(sitemap, encoding="utf-8")

    print(f"Publicadas {len(publicadas)} de {len(catalogo)} guías del catálogo.")
    if apagados:
        print(f"Enlaces a guías aún no escritas, dejados como texto: {apagados}.")
    faltan = [g["slug"] for g in catalogo if g not in publicadas]
    if faltan:
        print(f"Sin cuerpo todavía: {len(faltan)}. Siguientes: {', '.join(faltan[:5])}")


if __name__ == "__main__":
    main()

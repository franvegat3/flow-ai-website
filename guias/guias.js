/* ============================================================
   Flow AI — Guías. Filtros del índice y nav.
   La captura de correo vive en ../optin.js, que corre en todo el
   sitio. Sin dependencias. Nada aquí debe romper la página si falla.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Año del footer ---------- */
  var y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());

  /* ---------- Nav móvil ---------- */
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });
  }

  var nav = document.getElementById('nav');
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle('scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ----------------------------------------------------------
     Índice de guías.

     Las tarjetas se pintan desde window.GUIAS (lo escribe
     guias/_build.py en guias-data.js). No se editan a mano:
     con cientos de guías el HTML escrito a mano no se sostiene.
     ---------------------------------------------------------- */
  var grid = document.getElementById('guideGrid');
  if (grid && Array.isArray(window.GUIAS)) {
    var guias = window.GUIAS;
    var empty = document.getElementById('guideEmpty');
    var countLine = document.querySelector('.lib-count');
    var search = document.getElementById('guideSearch');
    var state = { tool: 'all', topic: 'all', q: '' };

    /* Texto sobre el que busca el usuario: título, resumen y taxonomía,
       sin acentos, para que "automatizacion" encuentre "automatización". */
    var plano = function (s) {
      return String(s)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    };

    guias.forEach(function (g) {
      g._buscable = plano([g.titulo, g.desc, g.tool.join(' '), g.topic.join(' ')].join(' '));
    });

    var esc = function (s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    var tarjeta = function (g) {
      return '<a class="guide-card" href="/guias/' + esc(g.slug) + '/"' +
        ' data-tool="' + esc(g.tool.join(' ')) + '"' +
        ' data-topic="' + esc(g.topic.join(' ')) + '">' +
        (g.badge ? '<span class="guide-badge">' + esc(g.badge) + '</span>' : '') +
        '<h3>' + esc(g.titulo) + '</h3>' +
        '<p>' + esc(g.desc) + '</p>' +
        '<span class="guide-meta">' + esc(g.meta) + '</span>' +
        '<span class="guide-go">Leer la guía →</span>' +
        '</a>';
    };

    var setCount = function (n) {
      if (!countLine) return;
      countLine.innerHTML = '<span id="guideCount">' + n + '</span> ' +
        (n === 1 ? 'guía' : 'guías') + ' · nuevas cada semana';
    };

    var apply = function () {
      var visibles = guias.filter(function (g) {
        return (state.tool === 'all' || g.tool.indexOf(state.tool) > -1) &&
               (state.topic === 'all' || g.topic.indexOf(state.topic) > -1) &&
               (!state.q || g._buscable.indexOf(state.q) > -1);
      });

      /* Se reemplaza la rejilla completa y se vuelve a colgar el mensaje de
         vacío, que vive dentro del contenedor. */
      grid.innerHTML = visibles.map(tarjeta).join('');
      if (empty) {
        empty.hidden = visibles.length > 0;
        grid.appendChild(empty);
      }
      setCount(visibles.length);
    };

    Array.prototype.forEach.call(document.querySelectorAll('.chips'), function (chips) {
      var group = chips.getAttribute('data-group');
      chips.addEventListener('click', function (e) {
        var chip = e.target.closest('.chip');
        if (!chip || !chips.contains(chip)) return;
        Array.prototype.forEach.call(chips.querySelectorAll('.chip'), function (c) {
          c.setAttribute('aria-pressed', String(c === chip));
        });
        state[group] = chip.getAttribute('data-value');
        apply();
      });
    });

    if (search) {
      search.addEventListener('input', function () {
        state.q = plano(search.value.trim());
        apply();
      });
    }

    apply();
  }

})();

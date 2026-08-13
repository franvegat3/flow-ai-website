/* ============================================================
   Flow AI — Guías. Filtros del índice + captura de correo + nav.
   Sin dependencias. Nada aquí debe romper la página si falla.
   ============================================================ */
(function () {
  'use strict';

  /* --------------------------------------------------------
     CONFIGURA ESTO: endpoint del proveedor de correo.
     Pega aquí la URL del formulario de tu ESP (Klaviyo,
     ConvertKit/Kit, Beehiiv, Mailchimp…). Mientras esté vacío
     el formulario avisa que todavía no está conectado en vez
     de fingir que guardó el correo.
     -------------------------------------------------------- */
  var OPTIN_ENDPOINT = '';

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

  /* ---------- Filtros del índice ---------- */
  var grid = document.getElementById('guideGrid');
  if (grid) {
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.guide-card'));
    var empty = document.getElementById('guideEmpty');
    var count = document.getElementById('guideCount');
    var state = { tool: 'all', topic: 'all' };

    var setCount = function (n) {
      if (!count) return;
      count.textContent = String(n);
      var label = count.parentNode;
      if (label) {
        label.innerHTML = n === 1
          ? '<span id="guideCount">1</span> guía · nuevas cada semana'
          : '<span id="guideCount">' + n + '</span> guías · nuevas cada semana';
        count = document.getElementById('guideCount');
      }
    };

    setCount(cards.length);

    var values = function (card, group) {
      return (card.getAttribute('data-' + group) || '').split(/\s+/).filter(Boolean);
    };

    var apply = function () {
      var shown = 0;
      cards.forEach(function (card) {
        var ok = (state.tool === 'all' || values(card, 'tool').indexOf(state.tool) > -1) &&
                 (state.topic === 'all' || values(card, 'topic').indexOf(state.topic) > -1);
        card.hidden = !ok;
        if (ok) shown++;
      });
      if (empty) empty.hidden = shown > 0;
      setCount(shown);
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
  }

  /* ---------- Captura de correo ---------- */
  var form = document.getElementById('optinForm');
  if (form) {
    var input = document.getElementById('optinEmail');
    var msg = document.getElementById('optinMsg');
    var say = function (text) { if (msg) msg.textContent = text; };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (input && input.value || '').trim();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        say('Revisa el correo, parece que le falta algo.');
        return;
      }

      if (!OPTIN_ENDPOINT) {
        say('La lista todavía no está conectada. Escríbeme por WhatsApp y te agrego a mano.');
        return;
      }

      var btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      say('Un segundo…');

      var body = new FormData();
      body.append('email', email);

      fetch(OPTIN_ENDPOINT, { method: 'POST', body: body })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          form.reset();
          say('Listo. Te llega la próxima guía en cuanto salga.');
        })
        .catch(function () {
          say('No se pudo guardar. Inténtalo otra vez en un momento.');
        })
        .then(function () {
          if (btn) btn.disabled = false;
        });
    });
  }
})();

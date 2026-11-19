/* ============================================================
   Portafolio — filtros, visor de imágenes y la demo interactiva.
   Corre después de script.js (nav, WhatsApp, animaciones .anim).
   ============================================================ */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Analítica: solo en el dominio real ----------
     En local (servidor de prueba) no se cargan, para no ensuciar
     el recorrido medido con visitas de prueba. */
  var host = location.hostname;
  if (host && !/^(localhost|127\.|0\.0\.0\.0|192\.168\.)/.test(host)) {
    var base = document.body.getAttribute('data-root') || '../';
    ['flowai-config.js', 'atribucion.js', 'datos.js', 'tracking.js'].reduce(function (p, f) {
      return p.then(function () {
        return new Promise(function (ok) {
          var s = document.createElement('script');
          s.src = base + f; s.onload = ok; s.onerror = ok;
          document.body.appendChild(s);
        });
      });
    }, Promise.resolve());
  }

  /* ---------- Filtros de la portada ---------- */
  var filters = document.querySelectorAll('.pf-filter');
  var cards = document.querySelectorAll('.pf-card');
  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cat = btn.getAttribute('data-cat');
      filters.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      var shown = [];
      cards.forEach(function (c) {
        var ok = cat === 'todos' || c.getAttribute('data-cat') === cat;
        c.classList.toggle('is-hidden', !ok);
        if (ok) shown.push(c);
      });
      if (window.gsap && !reduce) {
        gsap.fromTo(shown, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .45, ease: 'power2.out', stagger: .06, overwrite: true });
      }
    });
  });

  /* ---------- Visor de imágenes ---------- */
  var lb = document.querySelector('.pf-lightbox');
  if (lb) {
    var lbImg = lb.querySelector('img');
    document.querySelectorAll('[data-zoom]').forEach(function (el) {
      el.addEventListener('click', function () {
        lbImg.src = el.getAttribute('data-zoom');
        lbImg.alt = el.querySelector('img') ? el.querySelector('img').alt : '';
        lb.classList.add('open');
      });
    });
    var close = function () { lb.classList.remove('open'); };
    lb.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  /* ---------- Demo: pestañas ---------- */
  var tabs = document.querySelectorAll('[data-pane]');
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      tabs.forEach(function (x) {
        var on = x === t;
        x.setAttribute('aria-selected', String(on));
        document.getElementById(x.getAttribute('data-pane')).hidden = !on;
      });
      if (t.getAttribute('data-pane') === 'pane-redes') drawBrand(currentBrand);
    });
  });

  /* ---------- Demo: calendario (datos de demostración) ---------- */
  var ROWS = [
    { t: 'Newsletter semanal', a: 'Contenido', c: '#3b82f6', w: 'AL', wc: '#ec4899', d: 'Hoy', s: 'r' },
    { t: 'Reporte de campaña', a: 'Ventas', c: '#10b981', w: 'MR', wc: '#8b5cf6', d: 'Hoy', s: 'r' },
    { t: 'Webinar de lanzamiento', a: 'Educación', c: '#8b5cf6', w: 'JC', wc: '#f59e0b', d: 'Jue 20', s: 'y' },
    { t: 'Carrusel de producto', a: 'Contenido', c: '#3b82f6', w: 'DP', wc: '#06b6d4', d: 'Vie 21', s: 'y' },
    { t: 'Lista de prospectos', a: 'Ventas', c: '#10b981', w: 'MR', wc: '#8b5cf6', d: 'Vie 21', s: 'y' },
    { t: 'Guion del episodio 14', a: 'Contenido', c: '#3b82f6', w: 'LF', wc: '#ef4444', d: 'Lun 24', s: 'g' },
    { t: 'Clase en vivo', a: 'Educación', c: '#8b5cf6', w: 'RS', wc: '#22c55e', d: 'Mar 25', s: 'g' },
    { t: 'Encuesta de alumnos', a: 'Educación', c: '#8b5cf6', w: 'JC', wc: '#f59e0b', d: 'Jue 27', s: 'g' }
  ];
  var PILL = { r: 'Vence hoy', y: 'Esta semana', g: 'En tiempo' };
  /* Fechas relativas a hoy, para que la demo siempre se vea al día */
  var OFF = [0, 0, 2, 3, 3, 6, 7, 9];
  ROWS.forEach(function (r, i) {
    if (!OFF[i]) return;
    var f = new Date(); f.setDate(f.getDate() + OFF[i]);
    var w = f.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '');
    r.d = w.charAt(0).toUpperCase() + w.slice(1, 3) + ' ' + f.getDate();
  });
  var list = document.getElementById('pf-rows');
  function drawRows(area) {
    if (!list) return;
    var rows = ROWS.filter(function (r) { return area === 'Todas' || r.a === area; });
    list.innerHTML = rows.map(function (r) {
      return '<li class="pf-row"><span class="dot" style="background:' + r.c + '"></span>' +
        '<span class="t">' + r.t + '</span><span class="a">' + r.a + '</span>' +
        '<span class="av" style="background:' + r.wc + '">' + r.w + '</span>' +
        '<span class="d">' + r.d + '</span><span class="pf-pill ' + r.s + '">' + PILL[r.s] + '</span></li>';
    }).join('');
    var n = function (s) { return rows.filter(function (r) { return r.s === s; }).length; };
    setNum('pf-k-hoy', n('r'));
    setNum('pf-k-sem', n('r') + n('y'));
    setNum('pf-k-mes', rows.length);
    if (window.gsap && !reduce) gsap.fromTo('#pf-rows .pf-row', { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: .35, stagger: .04, ease: 'power2.out' });
  }
  function setNum(id, v) {
    var el = document.getElementById(id);
    if (!el) return;
    if (!window.gsap || reduce) { el.textContent = v; return; }
    var o = { n: parseInt(el.textContent, 10) || 0 };
    gsap.to(o, { n: v, duration: .5, ease: 'power2.out', onUpdate: function () { el.textContent = Math.round(o.n); } });
  }
  var chips = document.querySelectorAll('#pf-areas button');
  chips.forEach(function (b) {
    b.addEventListener('click', function () {
      chips.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      drawRows(b.textContent.trim());
    });
  });
  drawRows('Todas');

  /* ---------- Demo: redes (datos de demostración) ---------- */
  var BRANDS = {
    personal: { tiles: [['Instagram · alcance', '182K', '+12%'], ['LinkedIn · impresiones', '64.3K', '+8%'], ['Newsletter · aperturas', '41%', '+2 pts'], ['Seguidores nuevos', '3,410', '+5%']], pts: [30, 34, 31, 40, 44, 42, 52, 58] },
    podcast: { tiles: [['Spotify · plays', '21.4K', '+9%'], ['YouTube · vistas', '12.9K', '+6%'], ['Apple y otras · descargas', '8.7K', '+3%'], ['Seguidores del show', '1,206', '+4%']], pts: [22, 25, 24, 30, 29, 35, 39, 46] },
    comunidad: { tiles: [['Instagram · alcance', '48.2K', '+18%'], ['Facebook · alcance', '19.5K', '+7%'], ['Interacciones', '6.1K', '+11%'], ['Seguidores nuevos', '892', '+3%']], pts: [18, 20, 26, 24, 31, 36, 34, 44] }
  };
  var currentBrand = 'personal';
  function drawBrand(key) {
    currentBrand = key;
    var b = BRANDS[key], tiles = document.getElementById('pf-tiles'), ln = document.getElementById('pf-line'), ar = document.getElementById('pf-area');
    if (!tiles || !ln) return;
    tiles.innerHTML = b.tiles.map(function (t) { return '<div class="pf-tile"><small>' + t[0] + '</small><b>' + t[1] + '</b><em>' + t[2] + '</em></div>'; }).join('');
    var W = 400, H = 150, max = 64, step = W / (b.pts.length - 1);
    var d = b.pts.map(function (v, i) { return (i ? 'L' : 'M') + (i * step).toFixed(1) + ' ' + (H - v / max * H).toFixed(1); }).join(' ');
    ln.setAttribute('d', d);
    ar.setAttribute('d', d + ' L' + W + ' ' + H + ' L0 ' + H + ' Z');
    if (window.gsap && !reduce) {
      var len = ln.getTotalLength();
      gsap.fromTo(ln, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: .9, ease: 'power2.out' });
      gsap.fromTo('#pf-tiles .pf-tile', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .35, stagger: .05 });
    }
  }
  var brandBtns = document.querySelectorAll('#pf-brands button');
  brandBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      brandBtns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      drawBrand(b.getAttribute('data-brand'));
    });
  });

  /* ---------- Fecha "actualizado hoy" ---------- */
  var hoy = document.getElementById('pf-hoy');
  if (hoy) {
    hoy.textContent = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  /* ---------- Diagrama: sin movimiento si el usuario lo pide ---------- */
  if (reduce) document.querySelectorAll('.pf-diagram svg').forEach(function (s) { if (s.pauseAnimations) s.pauseAnimations(); });
})();

/* ============================================================
   Chat del Reto 30 Días de IA · Flow AI
   Burbuja abajo a la derecha. Habla con el backend (CHAT_URL) que
   es el único que tiene la llave. Aquí NO hay secretos: solo la URL
   del backend y la site key pública de Turnstile.
   Todo lo que viene del servidor se pinta con textContent.
   ============================================================ */
(function () {
  'use strict';
  var CFG = window.FLOW || {};
  var me = document.currentScript;
  var API = (me && me.getAttribute('data-chat-url')) || CFG.CHAT_URL || '';
  var SITEKEY = (me && me.getAttribute('data-turnstile')) || CFG.TURNSTILE_SITE_KEY || '';
  if (!API) return;
  API = API.replace(/\/$/, '');

  var KEY = 'cr_estado_v1';
  var estado = leer();
  var abierto = false, ocupado = false, tsWidget = null;

  function leer() { try { return JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
  function guardar() { try { sessionStorage.setItem(KEY, JSON.stringify(estado)); } catch (e) {} }
  function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
  function evento(tipo) { try { if (window.FLOW_DATOS) window.FLOW_DATOS.evento(tipo); } catch (e) {} }

  /* ---------- UI ---------- */
  var burbuja = el('button', 'cr-burbuja');
  burbuja.type = 'button'; burbuja.setAttribute('aria-label', 'Abrir chat del Reto 30 Días'); burbuja.setAttribute('aria-expanded', 'false');
  burbuja.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-5.3A8 8 0 1 1 21 12z"/><path d="M8 11h8M8 14h5"/></svg>';

  var panel = el('div', 'cr-panel'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Chat del Reto 30 Días'); panel.hidden = true;
  var cab = el('div', 'cr-cab');
  cab.appendChild(el('div', 'cr-cab__logo', 'FA'));
  var cabTxt = el('div', 'cr-cab__txt'); cabTxt.appendChild(el('b', null, 'Flow AI · Reto 30 Días')); cabTxt.appendChild(el('span', null, 'Consultas sobre el reto, Flow AI o Fran'));
  cab.appendChild(cabTxt);
  var cerrar = el('button', 'cr-cerrar', '×'); cerrar.type = 'button'; cerrar.setAttribute('aria-label', 'Cerrar chat'); cab.appendChild(cerrar);
  var msgs = el('div', 'cr-msgs'); msgs.setAttribute('aria-live', 'polite');
  var chips = el('div', 'cr-chips');
  var ts = el('div', 'cr-turnstile');
  var form = el('form', 'cr-form');
  var input = el('input'); input.type = 'text'; input.maxLength = 600; input.placeholder = 'Escriba su pregunta…'; input.autocomplete = 'off'; input.setAttribute('aria-label', 'Tu pregunta');
  var enviar = el('button', null, 'Enviar'); enviar.type = 'submit';
  form.appendChild(input); form.appendChild(enviar);
  var pie = el('div', 'cr-pie'); pie.appendChild(document.createTextNode('Al usar el chat acepta el ')); var a = el('a', null, 'aviso de privacidad'); a.href = '/privacidad/'; a.target = '_blank'; a.rel = 'noopener'; pie.appendChild(a); pie.appendChild(document.createTextNode('.'));
  panel.appendChild(cab); panel.appendChild(msgs); panel.appendChild(chips); panel.appendChild(ts); panel.appendChild(form); panel.appendChild(pie);
  document.body.appendChild(panel); document.body.appendChild(burbuja);

  function pintar(rol, texto) { var m = el('div', 'cr-msg cr-msg--' + rol, texto); msgs.appendChild(m); msgs.scrollTop = msgs.scrollHeight; return m; }
  function escribiendo(on) {
    var e = msgs.querySelector('.cr-escribiendo');
    if (on && !e) { e = el('div', 'cr-escribiendo'); e.appendChild(el('i')); e.appendChild(el('i')); e.appendChild(el('i')); msgs.appendChild(e); msgs.scrollTop = msgs.scrollHeight; }
    if (!on && e) e.remove();
  }
  function ponerChips(lista) {
    chips.textContent = '';
    (lista || []).forEach(function (t) { var c = el('button', 'cr-chip', t); c.type = 'button'; c.addEventListener('click', function () { mandar(t); }); chips.appendChild(c); });
  }
  function repintar() {
    msgs.textContent = '';
    (estado.msgs || []).forEach(function (m) { pintar(m.r, m.t); });
    if (!(estado.msgs || []).length && estado.saludo) pintar('bot', estado.saludo);
    ponerChips((estado.msgs || []).length ? [] : estado.sugerencias);
  }

  /* ---------- Barra de compra: la burbuja sube cuando la barra aparece ---------- */
  var barra = document.getElementById('barraCompra');
  function revisarBarra() {
    if (!barra) return;
    var vis = barra.classList.contains('visible');
    document.body.classList.toggle('cr-barra', vis);
    if (vis) document.body.style.setProperty('--cr-barra', barra.offsetHeight + 'px');
  }
  if (barra && 'MutationObserver' in window) { new MutationObserver(revisarBarra).observe(barra, { attributes: true, attributeFilter: ['class'] }); revisarBarra(); }

  /* ---------- Sesión (Turnstile → /api/sesion) ---------- */
  function sesionVigente() { return estado.sid && estado.exp && estado.exp * 1000 > Date.now() + 15000; }
  function cargarTurnstile() {
    return new Promise(function (ok, no) {
      if (window.turnstile) return ok();
      var s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true; s.onload = function () { ok(); }; s.onerror = function () { no(new Error('turnstile')); };
      document.head.appendChild(s);
    });
  }
  function tokenTurnstile() {
    if (!SITEKEY) return Promise.resolve(null);
    return cargarTurnstile().then(function () {
      return new Promise(function (ok, no) {
        ts.textContent = '';
        tsWidget = window.turnstile.render(ts, { sitekey: SITEKEY, theme: 'light', appearance: 'interaction-only', language: 'es',
          callback: function (t) { ok(t); }, 'error-callback': function () { no(new Error('turnstile')); }, 'expired-callback': function () {} });
      });
    });
  }
  function nuevaSesion() {
    return tokenTurnstile().then(function (token) {
      return fetch(API + '/api/sesion', { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(token ? { turnstile: token } : {}) });
    }).then(function (r) { return r.json().then(function (d) { d.__status = r.status; return d; }); }).then(function (d) {
      if (tsWidget != null && window.turnstile) { try { window.turnstile.remove(tsWidget); } catch (e) {} tsWidget = null; ts.textContent = ''; }
      if (d.__status !== 200 || !d.sid) throw new Error(d.mensaje || 'No pude iniciar el chat. Intente más tarde.');
      estado.sid = d.sid; estado.exp = d.exp; estado.saludo = d.saludo; estado.sugerencias = d.sugerencias; estado.msgs = estado.msgs || [];
      guardar();
    });
  }
  function asegurarSesion() { return sesionVigente() ? Promise.resolve() : nuevaSesion(); }

  /* ---------- Mandar ---------- */
  function mandar(texto) {
    texto = (texto || '').trim(); if (!texto || ocupado) return;
    ocupado = true; enviar.disabled = true; input.value = '';
    estado.msgs = estado.msgs || []; estado.msgs.push({ r: 'yo', t: texto }); guardar();
    pintar('yo', texto); ponerChips([]); escribiendo(true);
    evento('chat_mensaje');
    var reintentado = false;
    function ir() {
      return asegurarSesion().then(function () {
        return fetch(API + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ sid: estado.sid, texto: texto }) });
      }).then(function (r) { return r.json().then(function (d) { d.__status = r.status; return d; }); }).then(function (d) {
        if (d.__status === 401 && !reintentado) { reintentado = true; estado.sid = null; guardar(); return ir(); }
        var t = d.__status === 200 ? d.respuesta : (d.mensaje || 'No pude responder. Intente de nuevo.');
        estado.msgs.push({ r: 'bot', t: t }); guardar();
        escribiendo(false); pintar('bot', t);
      });
    }
    ir().catch(function (e) { escribiendo(false); pintar('sys', (e && e.message) || 'Ocurrió un error. Intente de nuevo.'); })
      .then(function () { ocupado = false; enviar.disabled = false; input.focus(); });
  }

  /* ---------- Abrir / cerrar ---------- */
  function abrir() {
    abierto = true; panel.hidden = false; panel.classList.add('abierto'); burbuja.setAttribute('aria-expanded', 'true');
    repintar(); input.focus(); evento('chat_abierto');
    if (!sesionVigente()) {
      escribiendo(true);
      nuevaSesion().then(function () { escribiendo(false); repintar(); }).catch(function (e) { escribiendo(false); pintar('sys', (e && e.message) || 'No pude iniciar el chat.'); });
    }
  }
  function cerrarPanel() { abierto = false; panel.classList.remove('abierto'); panel.hidden = true; burbuja.setAttribute('aria-expanded', 'false'); burbuja.focus(); }
  burbuja.addEventListener('click', function () { abierto ? cerrarPanel() : abrir(); });
  cerrar.addEventListener('click', cerrarPanel);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && abierto) cerrarPanel(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); mandar(input.value); });
})();

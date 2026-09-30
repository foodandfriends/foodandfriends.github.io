/*
  Arma la carta a partir de los datos (window.MENU o window.pintarCarta(datos)). La usan la carta real
  (index.html) y los diseños de disenos/: cada uno trae su propio HTML y CSS con #cabecera, #nav > #chips,
  #carta y #pie.

  Ganchos para el CSS de cada diseño
  - h1 > img.logo si el negocio tiene logo; si no, h1 > .w por palabra y .y para el "and" / "&" / "y"
  - h2 > .num ("01") + .tit
  - .plato > .fila (.nombre > .marca, .puntos, .precio) + .desc (+ .foto)
  - p.historia (debajo del subtítulo) si el negocio tiene historia
  - body[data-subtitulo] cambia el "La carta" de la cabecera; body[data-botones="no"] quita los botones de arriba
  - body[data-fotos] pone la foto de cada plato; sin foto sale un espacio con un dibujo de la categoría.
    Con data-fotos="si-hay" solo salen las fotos que existen, sin espacio para las que faltan.
*/
(function () {
  // Se llama con los datos de la carta; si la página ya trae window.MENU, se pinta de una vez
  window.pintarCarta = function (M) {
    const N = M.negocio || {};
    const categorias = (M.categorias || []).filter(c => c.platos && c.platos.length);
    const fotos = document.body.dataset.fotos;

    const $ = id => document.getElementById(id);
    function el(tag, clase, texto) {
      const e = document.createElement(tag);
      if (clase) e.className = clase;
      if (texto) e.textContent = texto;
      return e;
    }
    const ICONOS = {
      pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
      tel: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/>',
      chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>'
    };
    // Dibujo para el espacio de la foto, según el nombre de la categoría
    const DIBUJOS = [
      [/hambur|burger/i, '<path d="M4 10.5C4 7 7.6 4.5 12 4.5s8 2.5 8 6Z"/><path d="M3 14h18"/><path d="M4 11.8c1.3 0 1.3 1 2.7 1s1.3-1 2.7-1 1.3 1 2.6 1 1.3-1 2.7-1 1.3 1 2.6 1"/><rect x="4.5" y="16.5" width="15" height="3.5" rx="1.75"/>'],
      [/pizza/i, '<path d="M12 21 3.5 6a15 15 0 0 1 17 0Z"/><path d="M5.3 9.2a12 12 0 0 1 13.4 0"/><circle cx="10" cy="12" r="1"/><circle cx="13.6" cy="15" r="1"/><circle cx="13.5" cy="11" r=".6"/>'],
      [/picar|picada|entrada/i, '<path d="M6 10h12l-1.6 11H7.6Z"/><path d="M8 10V4.5M10.7 10V3M13.3 10V3.5M16 10V5"/>'],
      [/mexic|taco/i, '<path d="M3 18a9 9 0 0 1 18 0Z"/><path d="M5.5 13.5c1.2-.8 2 .4 3.2-.4s2-.8 3.2-.4 2 .4 3.3-.4 1.8 0 3.3.4"/>'],
      [/parrill|asado|carne/i, '<path d="M12 22c4 0 7-2.7 7-6.5 0-4-3-6-4-9.5-1.5 2-2 3.5-2 5-1.5-1-2.5-3-2.5-5.5C7 8 5 11 5 15.5 5 19.3 8 22 12 22Z"/>'],
      [/cervez|beer/i, '<path d="M5 8h10v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z"/><path d="M15 11h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2"/><path d="M5 8a2.5 2.5 0 0 1 2-4 3 3 0 0 1 5 0 2.5 2.5 0 0 1 3 4"/><path d="M8.5 11.5v6M11.5 11.5v6"/>'],
      [/bebida|jugo|trago|coctel/i, '<path d="M6 3h12l-1.5 17a1.5 1.5 0 0 1-1.5 1.4H9a1.5 1.5 0 0 1-1.5-1.4Z"/><path d="M6.6 9h10.8"/><path d="M14 3l2-2"/>'],
      [/postre|dulce/i, '<path d="M6.5 10a5.5 5.5 0 0 1 11 0Z"/><path d="M6.5 10 12 21l5.5-11"/><path d="M9 14.5l5-3M10.5 17.5l4.2-2.6"/>'],
      [/./, '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/>']
    ];
    function foto(p, c) {
      if (p.foto) {
        const img = el('img', 'foto');
        img.src = p.foto;
        img.alt = p.nombre;
        img.loading = 'lazy';
        if (p.fotoId) img.dataset.foto = p.fotoId; // la página que la pinta carga la foto de verdad
        return img;
      }
      const vacia = el('div', 'foto vacia');
      const dibujo = DIBUJOS.find(([re]) => re.test(c.id + ' ' + c.nombre))[1];
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-hidden', 'true');
      svg.innerHTML = dibujo;
      vacia.append(svg, el('span', '', 'Foto'));
      return vacia;
    }
    function enlace(clase, texto, href) {
      const a = el('a', clase, texto);
      a.href = href;
      if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; }
      return a;
    }
    function boton(texto, href, icono, principal) {
      const a = enlace('btn' + (principal ? ' principal' : ''), '', href);
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-hidden', 'true');
      svg.innerHTML = ICONOS[icono];
      a.append(svg, el('span', '', texto));
      return a;
    }
    const digitos = t => String(t || '').replace(/\D/g, '');
    const formatoPrecio = p => typeof p === 'number'
      ? '$' + String(Math.round(p)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      : (p || '');

    document.title = (N.nombre || 'Carta') + ' · Carta';

    // Cabecera
    const cab = $('cabecera');
    if (N.lugar) cab.append(el('p', 'lugar', N.lugar));
    const h1 = el('h1');
    if (N.logo) {
      const logo = el('img', 'logo');
      logo.src = N.logo;
      logo.alt = N.nombre || 'Logo';
      h1.append(logo);
    } else {
      (N.nombre || 'Carta').split(/\s+/).forEach((w, i) => {
        if (i) h1.append(' ');
        h1.append(el('span', /^(and|&|y)$/i.test(w) ? 'w y' : 'w', w));
      });
    }
    cab.append(h1);
    cab.append(el('p', 'subtitulo', document.body.dataset.subtitulo || 'La carta'));
    if (N.historia) cab.append(el('p', 'historia', N.historia));
    // Con body[data-botones="no"] la cabecera no lleva "Cómo llegar" ni "Llamar" (quien la lee ya está en el local)
    if (document.body.dataset.botones !== 'no') {
      const acciones = el('div', 'acciones');
      if (N.mapa) acciones.append(boton('Cómo llegar', N.mapa, 'pin', true));
      if (digitos(N.telefono).length === 10) acciones.append(boton('Llamar', 'tel:+57' + digitos(N.telefono), 'tel'));
      if (digitos(N.whatsapp).length === 10) acciones.append(boton('WhatsApp', 'https://wa.me/57' + digitos(N.whatsapp), 'chat'));
      cab.append(acciones);
    }

    // Categorías y platos
    const chips = $('chips');
    const carta = $('carta');
    const enlaces = new Map();
    categorias.forEach((c, i) => {
      const id = 'cat-' + (c.id || i);
      const li = el('li');
      li.append(enlace('', c.nombre, '#' + id));
      chips.append(li);
      enlaces.set(id, li.firstChild);

      const sec = el('section', 'cat');
      sec.id = id;
      const h2 = el('h2');
      h2.append(el('span', 'num', String(i + 1).padStart(2, '0')), el('span', 'tit', c.nombre));
      sec.append(h2);
      if (c.nota) sec.append(el('p', 'nota-cat', c.nota));
      const lista = el('ul', 'platos');
      c.platos.forEach(p => {
        const item = el('li', 'plato' + (p.agotado ? ' agotado' : ''));
        const fila = el('div', 'fila');
        const nombre = el('span', 'nombre', p.nombre);
        const marca = p.agotado ? 'Agotado' : p.etiqueta;
        if (marca) nombre.append(' ', el('span', 'marca', marca));
        fila.append(nombre, el('span', 'puntos'));
        const precio = formatoPrecio(p.precio);
        if (precio) fila.append(el('span', 'precio', precio));
        item.append(fila);
        if (p.descripcion) item.append(el('p', 'desc', p.descripcion));
        if (fotos !== undefined && (p.foto || fotos !== 'si-hay')) item.append(foto(p, c));
        lista.append(item);
      });
      sec.append(lista);
      carta.append(sec);
    });
    if (!categorias.length) $('nav').hidden = true;

    // Pie
    const pie = $('pie');
    function bloque(titulo) {
      const b = el('div', 'bloque');
      b.append(el('h3', '', titulo));
      pie.append(b);
      return b;
    }
    if (N.direccion) {
      const b = bloque('Dónde estamos');
      b.append(el('p', '', N.direccion));
      if (N.mapa) b.append(enlace('', 'Ver en Google Maps', N.mapa));
    }
    if (N.horario && N.horario.length) {
      const b = bloque('Horario');
      const dl = el('dl', 'horario');
      N.horario.forEach(f => { dl.append(el('dt', '', f[0])); dl.append(el('dd', '', f[1])); });
      b.append(dl);
    }
    if (digitos(N.telefono)) bloque('Contacto').append(enlace('', N.telefono, 'tel:+57' + digitos(N.telefono)));
    if (N.instagram || N.facebook) {
      const redes = el('div', 'redes');
      [['Instagram', N.instagram], ['Facebook', N.facebook]].forEach(([nombre, url]) => {
        if (url) redes.append(enlace('btn', nombre, url));
      });
      bloque('Síganos').append(redes);
    }
    if (N.nota) pie.append(el('p', 'pie-nota', N.nota));
    if (N.legal) pie.append(el('p', 'pie-legal', N.legal));
    pie.append(enlace('arriba', 'Volver arriba ↑', '#arriba'));

    // Categoría resaltada según por dónde va la persona
    const nav = $('nav');
    const secciones = Array.from(document.querySelectorAll('.cat'));
    let activa = null;
    function medir() {
      document.documentElement.style.setProperty('--nav', nav.offsetHeight + 'px');
    }
    // Lleva el botón de la categoría al centro de la barra (sin categoría, al comienzo). La posición se
    // limita a lo que la barra de verdad puede correr: Safari de iPhone, si se le pide correr más allá
    // del borde (centrar la primera), se queda ahí y deja un hueco a la izquierda
    function centrar(a) {
      let izquierda = 0;
      if (a) {
        const r = a.getBoundingClientRect(), rc = chips.getBoundingClientRect();
        izquierda = chips.scrollLeft + r.left - rc.left - (rc.width - r.width) / 2;
      }
      const maximo = Math.max(0, chips.scrollWidth - chips.clientWidth);
      chips.scrollTo({ left: Math.round(Math.min(Math.max(izquierda, 0), maximo)), behavior: 'smooth' });
    }
    function marcar() {
      const limite = nav.offsetHeight + 40;
      let actual = null;
      secciones.forEach(s => { if (s.getBoundingClientRect().top <= limite) actual = s.id; });
      const alto = document.documentElement.scrollHeight;
      if (secciones.length && alto > window.innerHeight + 4 && window.innerHeight + window.scrollY >= alto - 4) {
        actual = secciones[secciones.length - 1].id;
      }
      if (actual === activa) return;
      if (activa) enlaces.get(activa).removeAttribute('aria-current');
      activa = actual;
      if (activa) enlaces.get(activa).setAttribute('aria-current', 'true');
      centrar(activa && enlaces.get(activa));
    }
    let pendiente = false;
    addEventListener('scroll', () => {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(() => { pendiente = false; marcar(); });
    }, { passive: true });
    addEventListener('resize', () => { medir(); marcar(); });
    medir();
    marcar();

    // Barra de la propuesta: solo cuando el diseño se abre desde la presentación (no dentro de un marco)
    const P = window.PROPUESTA;
    const pagina = location.pathname.split('/').pop().replace('.html', '');
    const i = P ? P.opciones.findIndex(o => o.id === pagina) : -1;
    if (i < 0 || window.top !== window) return;
    const total = P.opciones.length;
    const ir = n => P.opciones[(n + total) % total].id + '.html';
    const estilo = el('style');
    estilo.textContent = `
      .propuesta-barra { position: fixed; left: 50%; bottom: calc(12px + env(safe-area-inset-bottom)); z-index: 50;
        display: flex; align-items: center; gap: 6px; width: min(440px, calc(100% - 20px)); padding: 7px;
        transform: translateX(-50%); border: 1px solid rgba(255,255,255,.14); border-radius: 20px;
        background: rgba(22,19,17,.9); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
        box-shadow: 0 12px 30px rgba(0,0,0,.35); color: #fff; font: 600 14px/1.2 system-ui, -apple-system, sans-serif; }
      .propuesta-barra a { color: inherit; text-decoration: none; }
      .propuesta-barra .flecha { display: grid; place-items: center; flex: none; width: 42px; height: 44px; border-radius: 14px; background: rgba(255,255,255,.08); font-size: 20px; }
      .propuesta-barra .donde { flex: 1; min-width: 0; padding: 0 4px; text-align: center; }
      .propuesta-barra .donde small { display: block; color: rgba(255,255,255,.62); font-size: 11px; font-weight: 600; }
      .propuesta-barra .gusta { display: inline-flex; align-items: center; flex: none; height: 44px; padding: 0 16px; border-radius: 14px; background: #fff; color: #161311; font-weight: 800; }
      .propuesta-espacio { height: 88px; }`;
    const barra = el('nav', 'propuesta-barra');
    barra.setAttribute('aria-label', 'Opciones de diseño');
    const ant = enlace('flecha', '‹', ir(i - 1));
    ant.setAttribute('aria-label', 'Opción anterior');
    const sig = enlace('flecha', '›', ir(i + 1));
    sig.setAttribute('aria-label', 'Opción siguiente');
    const donde = enlace('donde', '', 'index.html#opcion-' + (i + 1));
    donde.append(el('small', '', (i + 1) + ' de ' + total + ' · ver todas'), el('span', '', P.opciones[i].nombre));
    const gusta = enlace('gusta', 'Me gusta ✓', P.enlaceWhatsApp(P.mensaje(i)));
    gusta.target = '_blank';
    barra.append(ant, donde, sig, gusta);
    document.head.append(estilo);
    document.body.append(el('div', 'propuesta-espacio'), barra);
  };

  if (window.MENU) window.pintarCarta(window.MENU);
})();

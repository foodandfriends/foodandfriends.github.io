/*
  Carta por secciones en cápsulas, como la de ¡No Mames! de TapNFCs. Debajo de la cabecera y de "Los más pedidos" salen
  las secciones en cápsulas, una debajo de otra, con la foto de su primer plato con foto. Al tocar una se abre esa
  sección sola: arriba, fija al bajar, una fila con las demás secciones para pasar a otra (la abierta queda a la
  izquierda, con un pedazo de la anterior asomado, para que se note que se puede devolver) y debajo sus platos, con sus
  fotos. La flecha, o el "atrás" del celular, vuelve a las cápsulas, a donde iba la persona.
  Deslizar el dedo de derecha a izquierda sobre los platos pasa a la sección siguiente, y de izquierda a derecha a la
  anterior (en la primera, vuelve a las cápsulas), como pasando páginas.
  No arma otra lista: usa la que pinta carta.js y solo esconde lo que no es de la sección abierta. Tocar un plato de
  "Los más pedidos" abre su sección y lo resalta. Los estilos van en index.html.
  Lo prende carta-publica.js después de pintar la carta: window.Capsulas.prender({ fotosSecciones }), con la foto propia
  de la cápsula de las secciones que no tienen fotos en sus platos.
*/
(function () {
  const ATRAS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const SEGUIR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  // Las secciones de trago: al final llevan el aviso legal del pie (el del alcohol), que la ley pide donde se ofrece
  const LICORES = /cervez|c[oó]ctel|licor|trago|\bvinos?\b|beer/i;
  let listo = false, capsulas = null, barra = null, fila = null, abierta = null, dondeIba = 0, deslizador = null;
  let primera = null;     // la sección que se abrió desde las cápsulas (o desde "Los más pedidos")
  let fotosSecciones = {}; // id de la sección → foto propia de su cápsula (js/config.js)

  const el = (tag, clase, texto) => {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto) e.textContent = texto;
    return e;
  };

  // Las secciones de la carta pintada, con la foto de su primer plato con foto
  function secciones() {
    return [...document.querySelectorAll('#carta .cat')].map(s => {
      const n = s.querySelectorAll('.platos > .plato').length;
      const nombre = (s.querySelector('h2 .tit') || s.querySelector('h2')).textContent;
      return { id: s.id, nombre, n, nodo: s, propia: fotosSecciones[s.id.replace(/^cat-/, '')], foto: s.querySelector('.plato img.foto[data-foto]') };
    }).filter(s => s.n);
  }

  function pintar() {
    const secs = secciones();
    const ul = el('ul', 'capsulas-lista');
    for (const s of secs) {
      const b = el('button', 'capsula');
      b.type = 'button';
      b.dataset.sec = s.id;
      if (s.propia) {
        // La foto que la sección tiene para su cápsula (las cervezas no tienen fotos en sus platos)
        const img = el('img');
        img.src = s.propia;
        img.alt = '';
        b.append(img);
      } else if (s.foto) {
        // La misma foto del plato: carta-publica.js la trae (del celular, si ya la había visto)
        const img = el('img');
        img.src = s.foto.getAttribute('src');
        img.dataset.foto = s.foto.dataset.foto;
        img.alt = '';
        b.append(img);
      } else {
        // Sin fotos (las cervezas): el dibujo de la sección, grande y a la derecha
        b.classList.add('sin-foto');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('class', 'capsula-dibujo');
        svg.innerHTML = window.dibujoDe ? window.dibujoDe(s.id + ' ' + s.nombre) : '';
        b.append(svg);
      }
      b.append(el('span', 'capsula-nombre', s.nombre), el('span', 'capsula-cuantos', s.n + (s.n === 1 ? ' plato' : ' platos')));
      b.insertAdjacentHTML('beforeend', '<span class="capsula-ir">' + SEGUIR + '</span>');
      const li = el('li');
      li.append(b);
      ul.append(li);
    }
    // El aviso va dentro de la sección (no es el pie de la página): al deslizar se corre con los platos y llega con ellos
    const legal = document.querySelector('#pie .pie-legal');
    for (const s of secs) if (legal && LICORES.test(s.nombre) && !s.nodo.querySelector('.aviso-seccion')) s.nodo.append(el('p', 'aviso-seccion', legal.textContent));
    // El título no se ve (no aporta y obliga a bajar más para llegar a los platos): queda para los lectores de pantalla
    const titulo = el('p', 'capsulas-titulo', 'Secciones de la carta');
    titulo.setAttribute('role', 'heading');
    titulo.setAttribute('aria-level', '2');
    // Sin replaceChildren: los iPhone con iOS 13 no lo tienen y la carta quedaba sin cápsulas
    capsulas.textContent = '';
    capsulas.append(titulo, ul);
    const carta = document.getElementById('carta'), mas = carta.querySelector(':scope > .mas-pedidos');
    if (mas) mas.after(capsulas); else carta.prepend(capsulas);
    if (window.vigilarFotos) window.vigilarFotos(capsulas);
    // La fila de secciones de arriba (con la sección abierta)
    fila.textContent = '';
    for (const s of secs) {
      const b = el('button', '', s.nombre);
      b.type = 'button';
      b.dataset.sec = s.id;
      fila.append(b);
    }
  }
  // Volver a las cápsulas: con el "atrás" si la sección se abrió desde ellas; si no (por ejemplo, una entrada vieja de
  // la historia), aquí mismo, sin salirse de la carta
  function salir() {
    if (history.state && history.state.seccion && history.state.desdeCapsulas) history.back();
    else { cerrar(); try { history.replaceState(null, ''); } catch { /* el navegador limita los cambios: se queda así */ } }
  }
  // Restos de un deslizamiento cortado (un segundo dedo, un cambio a la mitad): ninguna sección queda corrida ni encima
  function limpiarRestos() {
    document.querySelectorAll('#carta .cat.asomada').forEach(c => { c.classList.remove('asomada'); for (const k of ['top', 'left', 'width']) c.style[k] = ''; });
    document.querySelectorAll('#carta .cat').forEach(c => { if (c.style.transform || c.style.transition || c.style.willChange) c.style.transform = c.style.transition = c.style.willChange = ''; });
    document.querySelectorAll('#carta .cat[aria-hidden], #carta .cat[data-lado]').forEach(c => { c.removeAttribute('aria-hidden'); delete c.dataset.lado; c.style.maxHeight = c.style.overflow = ''; });
    document.getElementById('carta').style.minHeight = '';
  }

  // La abierta queda a la izquierda de la fila, pero con un pedazo de la anterior a la vista (ASOMA), y sin pasarse del
  // final: con la última abierta se siguen viendo las de antes, para que se sepa que se puede devolver. ASOMA es el mismo
  // scroll-padding-left de .seccion-fila (ahí se detiene la fila cuando la persona la desliza)
  const ASOMA = 36;
  // Hasta dónde se corre la fila para que la sección id quede en su sitio
  function sitioEnFila(id) {
    const b = fila.querySelector('button[data-sec="' + CSS.escape(id) + '"]');
    if (!b) return fila.scrollLeft;
    const max = fila.scrollWidth - fila.clientWidth;
    return Math.max(0, Math.min(max, b.offsetLeft - fila.firstElementChild.offsetLeft - ASOMA));
  }
  const resaltar = id => fila.querySelectorAll('button').forEach(b => b.setAttribute('aria-current', String(b.dataset.sec === id)));
  function marcar(id) {
    document.querySelectorAll('#carta .cat').forEach(c => c.classList.toggle('abierta', c.id === id));
    resaltar(id);
    // Al pasar de una sección a otra se ve cómo se corre la fila; al entrar desde las cápsulas ya está en su sitio (al
    // deslizar, la fila ya llegó con el dedo y aquí no se mueve)
    const left = sitioEnFila(id);
    if (Math.abs(fila.scrollLeft - left) > 1) fila.scrollTo({ left, behavior: abierta ? 'smooth' : 'instant' });
    bordes();
  }
  // El desvanecido de la fila solo va en el lado donde hay más secciones escondidas: nunca encima de la última. Son
  // capas quietas encima de la fila (en su marco): una máscara sobre la fila misma, en el iPhone, a ratos no se aplica
  // mientras la fila se corre
  function bordes() {
    const max = fila.scrollWidth - fila.clientWidth, marco = fila.parentElement;
    marco.classList.toggle('mas-izq', fila.scrollLeft > 2);
    marco.classList.toggle('mas-der', fila.scrollLeft < max - 2);
  }
  // Sube o baja la página de una vez (el html tiene scroll-behavior: smooth). El cambio a "auto" se tiene que aplicar antes
  // de mover (getComputedStyle lo obliga): si no, el navegador todavía lo tenía en suave y la página subía despacio
  // ("empieza desde abajo y sube") al cambiar de sección o al volver a las cápsulas
  function irA(y) {
    const html = document.documentElement, antes = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    void getComputedStyle(html).scrollBehavior;
    window.scrollTo(0, y);
    html.style.scrollBehavior = antes;
  }
  function abrir(id, empujar) {
    if (!document.body.classList.contains('con-capsulas') || !document.getElementById(id)) return; // apagadas (ver prender) o ya no existe
    if (!abierta) { dondeIba = scrollY; primera = id; }
    limpiarRestos();
    if (deslizador) { deslizador.olvidar(); deslizador.activo(true); deslizador.prepararLuego(); }
    // También en <html> y con el id de la sección en <body>: el CSS cambia lo que haga falta sin :has() (algunos
    // iPhone no lo entienden)
    document.body.classList.add('viendo-seccion');
    document.documentElement.classList.add('viendo-seccion');
    document.body.dataset.seccion = id;
    marcar(id);
    abierta = id;
    // Las fotos de esta sección y de las de al lado se piden de una vez (si no habían llegado): al deslizar ya están
    const ids = [...fila.querySelectorAll('button[data-sec]')].map(b => b.dataset.sec), i = ids.indexOf(id);
    if (window.cargarFotos) for (const v of [id, ids[i - 1], ids[i + 1]]) if (v) window.cargarFotos(document.getElementById(v));
    // Primero la historia (así el navegador recuerda dónde iba en las cápsulas) y después arriba del todo.
    // "desdeCapsulas": esa entrada la puso la carta, así que la flecha puede volver con el "atrás" del navegador
    try {
      if (empujar) history.pushState({ seccion: id, desdeCapsulas: true }, '');
      else history.replaceState(Object.assign({}, history.state || {}, { seccion: id }), '');
    } catch { /* el navegador limita los cambios de historia: la sección se abre igual */ }
    irA(0);
  }
  // A dónde vuelve la página al salir: a donde iba la persona. Pero si en la sección pasó a otra (deslizando o con la
  // fila) y desde ahí no se ve la cápsula de la última que vio (por ejemplo, Cervezas, al final), queda en esa cápsula
  function dondeDe(ultima) {
    const capsula = ultima && ultima !== primera && capsulas.querySelector('.capsula[data-sec="' + CSS.escape(ultima) + '"]');
    if (!capsula) return dondeIba;
    const r = capsula.getBoundingClientRect(), arriba = r.top + scrollY;
    if (arriba >= dondeIba + 12 && arriba + r.height <= dondeIba + innerHeight - 12) return dondeIba;
    return Math.max(0, arriba - (innerHeight - r.height) / 2);
  }
  function cerrar() {
    const ultima = abierta;
    // Lo que el deslizamiento tenía pendiente (terminar de correrse, la sección tocada en la fila) ya no se hace: si no,
    // la sección se volvía a abrir sola encima de las cápsulas o la pantalla quedaba en blanco
    if (deslizador) { deslizador.cancelar(); deslizador.activo(false); }
    limpiarRestos();
    abierta = null;
    document.body.classList.remove('viendo-seccion');
    document.documentElement.classList.remove('viendo-seccion');
    delete document.body.dataset.seccion;
    document.querySelectorAll('#carta .cat.abierta').forEach(c => c.classList.remove('abierta'));
    const y = dondeDe(ultima);
    // Si el enfoque estaba en la barra (con el teclado), vuelve a la cápsula de la última sección que se vio
    const conTeclado = barra.contains(document.activeElement);
    irA(y);
    requestAnimationFrame(() => irA(y));
    if (conTeclado) { const c = capsulas.querySelector('.capsula[data-sec="' + CSS.escape(ultima) + '"]'); if (c) c.focus({ preventScroll: true }); }
  }

  function preparar() {
    capsulas = el('section', 'capsulas');
    capsulas.setAttribute('aria-label', 'Secciones de la carta');
    barra = el('div', 'seccion-barra');
    barra.innerHTML = '<button type="button" class="seccion-volver" aria-label="Volver a las secciones">' + ATRAS + '</button>' +
      '<div class="seccion-fila-marco"><div class="seccion-fila"></div></div>';
    fila = barra.querySelector('.seccion-fila');
    document.getElementById('carta').before(barra);
    // "Los más pedidos": el plato está en una sección cerrada, así que se abre su sección y ahí se resalta (este aviso
    // llega antes que el de carta.js, que solo baja hasta el plato)
    document.addEventListener('click', ev => {
      const t = ev.target.closest('#carta .mas-pedidos .fav');
      if (!t || abierta || !document.body.classList.contains('con-capsulas')) return;
      const plato = document.querySelector('#carta .cat .plato[data-id="' + CSS.escape(t.dataset.id) + '"]');
      if (!plato) return;
      ev.stopPropagation();
      abrir(plato.closest('.cat').id, true);
      requestAnimationFrame(() => {
        const r = plato.getBoundingClientRect();
        irA(scrollY + r.top - (innerHeight - r.height) / 2);
        if (window.resaltarPlato) window.resaltarPlato(plato);
      });
    }, true);
    capsulas.addEventListener('click', ev => {
      const b = ev.target.closest('.capsula');
      if (!b) return;
      abrir(b.dataset.sec, true);
      // Con el teclado (Enter o espacio), el enfoque pasa a la sección abierta en la fila: la cápsula ya no se ve
      if (ev.detail === 0) { const actual = fila.querySelector('[aria-current="true"]'); if (actual) actual.focus({ preventScroll: true }); }
    });
    // Apenas el dedo toca una cápsula se piden las fotos de su sección: cuando se abre, ya van llegando
    capsulas.addEventListener('touchstart', ev => {
      const b = ev.target.closest('.capsula');
      if (b && window.cargarFotos) window.cargarFotos(document.getElementById(b.dataset.sec));
    }, { passive: true });
    fila.addEventListener('click', ev => {
      const b = ev.target.closest('[data-sec]');
      if (b && b.dataset.sec !== abierta) { if (deslizador) deslizador.pasarA(b.dataset.sec); else abrir(b.dataset.sec, false); }
    });
    const volver = barra.querySelector('.seccion-volver');
    volver.addEventListener('click', salir);
    // En el computador, con el teclado: Esc vuelve a las cápsulas y las flechas de lado pasan a la sección de al lado
    // (no si se está escribiendo o con una tecla de control apretada)
    document.addEventListener('keydown', ev => {
      if (!abierta || ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey || /input|textarea|select/i.test(ev.target.tagName)) return;
      if (ev.key === 'Escape') { ev.preventDefault(); salir(); return; }
      const paso = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
      if (!paso) return;
      const ids = [...fila.querySelectorAll('button[data-sec]')].map(b => b.dataset.sec), otra = ids[ids.indexOf(abierta) + paso];
      if (!otra) return;
      ev.preventDefault();
      if (deslizador) deslizador.pasarA(otra); else abrir(otra, false);
    });
    // "Volver arriba" del pie, con una sección abierta: sube dentro de la sección (el #arriba está escondido)
    document.addEventListener('click', ev => {
      if (!abierta || !ev.target.closest('a[href="#arriba"]')) return;
      ev.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    // La página ampliada con los dedos (zoom): deslizar de lado ya no cambia de sección, mueve la página
    if (window.visualViewport) visualViewport.addEventListener('resize', () => document.documentElement.classList.toggle('con-zoom', visualViewport.scale > 1.01));
    window.addEventListener('popstate', ev => {
      const id = ev.state && ev.state.seccion;
      if (id && document.getElementById(id)) { if (id !== abierta) abrir(id, false); }
      else if (abierta) cerrar();
    });
    let cuadro = 0;
    fila.addEventListener('scroll', () => { if (!cuadro) cuadro = requestAnimationFrame(() => { cuadro = 0; bordes(); }); }, { passive: true });
    deslizador = deslizar(volver);
    document.body.classList.add('con-capsulas');
  }

  // Deslizar de lado sobre los platos (o el espacio libre debajo, si la sección es corta): de derecha a izquierda, la
  // sección siguiente; de izquierda a derecha, la anterior (en la primera, de vuelta a las cápsulas). Como pasar páginas:
  // mientras el dedo se mueve, la otra sección ya está pegada al lado, con sus platos, a la altura en la que va a quedar;
  // al soltar, las dos terminan de correrse y la otra queda abierta sin saltos ni esperas. No se cuenta lo que empieza
  // pegado al borde izquierdo (es el "atrás" del celular, que ya vuelve a las cápsulas), en la fila de arriba ni en lo
  // que se desliza de lado por dentro.
  function deslizar(volver) {
    const carta = document.getElementById('carta');
    const ESPACIO = 24; // entre una sección y la otra mientras se corren
    // Lo que tardan en terminar de correrse (las secciones y la fila, juntas). Al tocar otra sección en la fila: todo el
    // camino, arrancando y frenando suave. Al soltar el dedo con impulso: sigue a la misma velocidad que traía el dedo y va
    // frenando (la curva arranca PENDIENTE veces más rápido que su promedio: con eso se calcula cuánto dura; si no alcanza
    // el tiempo, se ajusta la curva para que arranque a la velocidad del dedo). Al soltar con el dedo quieto: arranca y
    // frena suave, sin salir disparada
    const DURA_TOQUE = 440, CURVA_TOQUE = [.45, 0, .2, 1];
    const PENDIENTE = 2.8;
    const CURVA_QUIETO = [.35, 0, .25, 1];
    // La misma curva en el código, para que la fila se corra al mismo paso que las secciones
    const enCurva = ([x1, y1, x2, y2], t) => {
      let a = 0, b = 1, u = t;
      for (let i = 0; i < 24; i++) { u = (a + b) / 2; const x = 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u; if (x < t) a = u; else b = u; }
      return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
    };
    let x0 = 0, y0 = 0, dx = 0, modo = 'nada', sec = null, vecina = null, lado = 0, ocupado = false;
    // Medidas tomadas una vez al empezar: medir en cada movimiento del dedo obliga al iPhone a recalcular la página y el
    // movimiento salía a saltos. xSec es dónde está la abierta ahora (para saber cuánto le falta al soltar)
    let anchoFijo = 0, xSec = 0, desfase = 0;
    let muestras = []; // dónde iba el dedo en los últimos 100 ms: su velocidad al soltar
    // Las dos de al lado, listas desde que el dedo toca la pantalla: quedan armadas y pintadas justo debajo de la abierta
    // (que es lisa y las tapa), y al empezar a deslizar se corren a su lado ya pintadas. Antes se armaban en ese momento, o
    // quedaban por fuera de la pantalla sin pintar, y el movimiento daba un tirón al arrancar. Solo llegan hasta donde
    // termina la abierta: no se ven por debajo de ella ni alargan la página
    let preparadas = [], preparadasDe = null, relojPreparar = 0;
    function prepararVecinas() {
      const abiertaAhora = document.getElementById(abierta);
      if (!abiertaAhora || vecina || ocupado || modo === 'lado') return;
      if (preparadasDe !== abierta) {
        soltarPreparadas();
        preparadasDe = abierta;
        for (const paso of [1, -1]) {
          const id = idVecina(paso);
          const v = id && document.getElementById(id);
          if (!v) continue;
          v.classList.add('abierta', 'asomada');
          v.dataset.lado = paso;
          v.setAttribute('aria-hidden', 'true'); // tapada: los lectores de pantalla tampoco la leen
          Object.assign(v.style, { left: abiertaAhora.offsetLeft + 'px', width: abiertaAhora.offsetWidth + 'px', overflow: 'hidden', transform: 'none' });
          preparadas.push(v);
        }
      }
      // A la altura donde va la persona (solo se mueve la caja: lo de adentro ya está pintado)
      const top = abiertaAhora.offsetTop + scrollY, alto = Math.max(0, Math.min(innerHeight, abiertaAhora.offsetHeight - scrollY));
      for (const v of preparadas) { v.style.top = top + 'px'; v.style.maxHeight = alto + 'px'; v.style.transform = 'none'; }
    }
    // Un momento después de abrir una sección (con la página quieta) se preparan las de al lado
    function prepararLuego() {
      clearTimeout(relojPreparar);
      const mio = turno;
      relojPreparar = setTimeout(() => { if (mio === turno && abierta) prepararVecinas(); }, 350);
    }
    // Al empezar a deslizar, cada una a su lado (por fuera de la pantalla) y ya completa hasta abajo de la pantalla
    function correrPreparadas() {
      for (const v of preparadas) {
        v.style.maxHeight = innerHeight + 'px';
        v.style.transform = 'translateX(' + Number(v.dataset.lado) * ancho() + 'px)';
      }
    }
    function soltarPreparadas(menos) {
      for (const v of preparadas) if (v !== menos) { v.classList.remove('abierta'); soltarVecina(v); }
      preparadas = [];
      preparadasDe = null;
    }
    // La fila de arriba acompaña al dedo: va de donde estaba (fila0) a donde queda con la otra sección (fila1) en la
    // misma medida en que se corre la sección, y al soltar termina de correrse al mismo tiempo. Mientras tanto no se
    // ajusta sola a una sección (scroll-snap), para que no dé saltos
    let fila0 = 0, fila1 = 0, cuadroFila = 0;
    let siguiente = null; // la sección que se tocó en la fila mientras otra todavía se corría: se abre al terminar
    let turno = 0;        // cambia al volver a las cápsulas: lo que quedó pendiente de antes ya no se hace
    function correrFila(hasta, dura, curva) {
      cancelAnimationFrame(cuadroFila);
      const desde = fila.scrollLeft;
      let inicio = null; // el primer cuadro (la hora de un cuadro puede ser un poco anterior a este momento)
      const paso = ahora => {
        if (inicio === null) inicio = ahora;
        const t = Math.min(1, (ahora - inicio) / dura);
        fila.scrollLeft = desde + (hasta - desde) * enCurva(curva, t);
        if (t < 1) cuadroFila = requestAnimationFrame(paso); else fila.style.scrollSnapType = '';
      };
      cuadroFila = requestAnimationFrame(paso);
    }
    const orden = () => [...fila.querySelectorAll('button[data-sec]')].map(b => b.dataset.sec);
    const idVecina = paso => orden()[orden().indexOf(abierta) + paso];
    const ancho = () => anchoFijo || (anchoFijo = sec.offsetWidth + ESPACIO);
    const deLado = nodo => {
      for (; nodo && nodo !== carta; nodo = nodo.parentElement) if (nodo.scrollWidth > nodo.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(nodo).overflowX)) return true;
      return false;
    };
    const sirve = nodo => carta.contains(nodo) ? !deLado(nodo) : nodo === document.body || nodo === document.documentElement || !!nodo.closest('footer');
    // La vecina se ve igual que cuando esté abierta (con la marca "abierta") y queda arriba, donde va a quedar
    function ponerVecina(paso, id) {
      if (id === undefined) id = idVecina(paso);
      // La de antes (si el dedo cambió de dirección): si estaba preparada, vuelve a su lado; si no, se quita
      if (vecina && preparadas.indexOf(vecina) >= 0) { vecina.style.transform = 'translateX(' + lado * ancho() + 'px)'; vecina = null; }
      else quitarVecina();
      lado = paso;
      if (!id) return;
      vecina = document.getElementById(id);
      vecina.removeAttribute('aria-hidden');
      if (preparadas.indexOf(vecina) < 0) {
        vecina.classList.add('abierta', 'asomada');
        vecina.style.top = (sec.offsetTop + scrollY) + 'px';
        vecina.style.left = sec.offsetLeft + 'px';
        vecina.style.width = sec.offsetWidth + 'px';
        vecina.style.maxHeight = innerHeight + 'px';
        vecina.style.overflow = 'hidden';
      }
      fila1 = sitioEnFila(id);
      // Mientras tanto la carta crece si hace falta: en los iPhone con iOS 15 o menos (sin overflow-x: clip) recortaba lo
      // que la de al lado pasaba de su alto, y desde abajo de una sección larga se veía cortada. La de al lado solo se ve
      // hasta abajo de la pantalla mientras se corre (se completa al quedar abierta)
      const hasta = (sec.offsetTop + scrollY) + innerHeight;
      if (hasta > carta.offsetHeight) carta.style.minHeight = hasta + 'px';
    }
    const soltarVecina = v => {
      v.classList.remove('asomada');
      for (const k of ['top', 'left', 'width', 'transform', 'transition', 'willChange', 'maxHeight', 'overflow']) v.style[k] = '';
      delete v.dataset.lado;
      v.removeAttribute('aria-hidden');
      carta.style.minHeight = '';
    };
    function quitarVecina() {
      if (!vecina) return;
      vecina.classList.remove('abierta');
      soltarVecina(vecina);
      vecina = null;
    }
    function mover() {
      // Hacia donde no hay otra sección se corre poco, como un resorte
      xSec = vecina ? dx : dx * .3;
      sec.style.transform = 'translateX(' + xSec + 'px)';
      if (vecina) vecina.style.transform = 'translateX(' + (lado * ancho() + dx) + 'px)';
      fila.scrollLeft = vecina ? fila0 + (fila1 - fila0) * Math.min(1, Math.abs(dx) / ancho()) : fila0;
    }
    // Velocidad del dedo al final (px por ms; negativa hacia la izquierda), no el promedio desde que tocó la pantalla
    function velocidad() {
      if (muestras.length < 2) return 0;
      const a = muestras[0], b = muestras[muestras.length - 1];
      return (b[1] - a[1]) / Math.max(b[0] - a[0], 1);
    }
    // Las dos terminan de correrse (hasta xSec la abierta), y la fila hasta filaHasta, y después, fin(). Con toque, todo
    // el camino; si no, lo que falta desde donde soltó el dedo
    function terminar(hasta, filaHasta, fin, toque, v = 0) {
      ocupado = true;
      const falta = Math.abs(hasta - xSec);
      let dura, curva;
      if (toque) { dura = DURA_TOQUE; curva = CURVA_TOQUE; }
      else if (Math.abs(v) > .25 && Math.sign(v) === Math.sign(hasta - xSec)) {
        // Con impulso: arranca a la velocidad del dedo
        dura = Math.round(Math.min(420, Math.max(180, PENDIENTE * falta / Math.abs(v))));
        curva = [.25, Math.min(1, .25 * Math.abs(v) * dura / Math.max(falta, 1)), .35, 1];
      } else {
        curva = CURVA_QUIETO;
        dura = Math.round(Math.min(400, 220 + 180 * falta / ancho()));
      }
      const transicion = 'transform ' + dura + 'ms cubic-bezier(' + curva.join(', ') + ')';
      sec.style.transition = transicion;
      sec.style.transform = 'translateX(' + hasta + 'px)';
      if (vecina) { vecina.style.transition = transicion; vecina.style.transform = 'translateX(' + (hasta + lado * ancho()) + 'px)'; }
      xSec = hasta;
      correrFila(filaHasta, dura, curva);
      // Pase lo que pase en fin(), se puede volver a deslizar (si no, quedaba trabado para siempre)
      const mio = turno;
      setTimeout(() => {
        if (mio !== turno) return;
        try { fin(); } finally { ocupado = false; }
        if (siguiente) { const id = siguiente; siguiente = null; if (id !== abierta) pasarA(id); }
      }, dura + 10);
    }
    function aSuSitio() {
      sec.style.transform = sec.style.transition = sec.style.willChange = '';
      xSec = 0;
      if (vecina && preparadas.indexOf(vecina) >= 0) vecina = null; // la suelta soltarPreparadas
      else quitarVecina();
      soltarPreparadas();
      prepararLuego();
    }

    document.addEventListener('touchstart', ev => {
      // Un segundo dedo a mitad del deslizamiento (para ampliar): todo vuelve a su sitio
      if (modo === 'lado') { soltar({ type: 'touchcancel', timeStamp: ev.timeStamp }); return; }
      modo = 'nada';
      if (!abierta || ocupado || ev.touches.length !== 1) return;
      if (window.visualViewport && visualViewport.scale > 1.01) return; // con la página ampliada, el dedo la mueve
      const t = ev.touches[0];
      if (t.clientX < 24 || !sirve(ev.target)) return;
      x0 = t.clientX; y0 = t.clientY; dx = 0; lado = 0; modo = 'quizas';
      prepararVecinas();
    }, { passive: true });
    // No pasivo (mientras se desliza de lado la página no baja ni sube), y solo con una sección abierta: en las cápsulas
    // cada movimiento del dedo no tiene que esperar a este código
    const alMoverDedo = ev => {
      if (modo === 'nada') return;
      const t = ev.touches[0], mx = t.clientX - x0, my = t.clientY - y0;
      if (modo === 'quizas') {
        if (Math.abs(mx) < 10 && Math.abs(my) < 10) return;
        // Solo si va claramente de lado: si va de arriba abajo, es bajar por los platos
        if (Math.abs(mx) < Math.abs(my) * 1.4) { modo = 'nada'; return; }
        sec = document.getElementById(abierta);
        if (!sec) { modo = 'nada'; return; }
        modo = 'lado';
        sec.style.transition = 'none';
        sec.style.willChange = 'transform';
        cancelAnimationFrame(cuadroFila);
        fila.style.scrollSnapType = 'none';
        fila0 = fila1 = fila.scrollLeft;
        anchoFijo = sec.offsetWidth + ESPACIO;
        xSec = 0;
        correrPreparadas();
        // Los 10 px que el dedo avanzó antes de saber que iba de lado: la sección los alcanza en pocos cuadros, sin saltar
        desfase = mx;
        muestras = [];
      }
      if (ev.cancelable) ev.preventDefault();
      desfase *= .6;
      dx = mx - desfase;
      muestras.push([ev.timeStamp, t.clientX]);
      while (muestras.length > 2 && ev.timeStamp - muestras[0][0] > 100) muestras.shift();
      const paso = dx < 0 ? 1 : dx > 0 ? -1 : lado;
      if (paso && (paso !== lado || (!vecina && idVecina(paso)))) ponerVecina(paso);
      mover();
    };
    const soltar = ev => {
      if (modo !== 'lado') { modo = 'nada'; return; }
      modo = 'nada';
      // Pasa a la otra si el dedo llegó lejos o si la lanzó con impulso; no, si al final se devolvía
      const v = velocidad();
      const lejos = Math.abs(dx) > Math.min(90, innerWidth * .25);
      const impulso = Math.abs(v) > .35 && Math.abs(dx) > 16 && Math.sign(v) === Math.sign(dx);
      const devuelta = Math.abs(v) > .3 && Math.sign(v) === -Math.sign(dx);
      const paso = ev.type === 'touchend' && dx && (lejos || impulso) && !devuelta ? (dx < 0 ? 1 : -1) : 0;
      if (paso && vecina && paso === lado) {
        pasarALaVecina(false, v);
      } else if (paso === -1 && !idVecina(-1)) {
        aSuSitio();
        fila.scrollLeft = fila0;
        fila.style.scrollSnapType = '';
        volver.click();
      } else {
        terminar(0, fila0, aSuSitio, false, v);
      }
      lado = 0;
    };
    document.addEventListener('touchend', soltar);
    document.addEventListener('touchcancel', soltar);

    // La de al lado termina de entrar (y la fila de correrse) y queda abierta
    function pasarALaVecina(toque, v) {
      const destino = vecina.id, antes = sec, nueva = vecina;
      resaltar(destino); // la fila marca la nueva de una vez, mientras termina de correrse
      terminar(-lado * ancho(), fila1, () => {
        vecina = null;
        anchoFijo = 0;
        xSec = 0;
        // Si mientras tanto volvieron a las cápsulas (la flecha o el "atrás"), no se abre nada
        if (abierta !== antes.id) { soltarPreparadas(); soltarVecina(nueva); nueva.classList.remove('abierta'); antes.style.transform = antes.style.transition = ''; return; }
        // Todo en el mismo momento (sin dibujar en medio): la otra pasa a ser la abierta, arriba, donde ya estaba
        const arriba = nueva.getBoundingClientRect().top;
        soltarPreparadas(nueva);
        abrir(destino, false);
        soltarVecina(nueva);
        antes.style.transform = antes.style.transition = antes.style.willChange = '';
        // Si la página se había movido un poco mientras tanto, la nueva queda exactamente donde se veía: sin brinco
        const corrida = nueva.getBoundingClientRect().top - arriba;
        if (Math.abs(corrida) > 1) irA(scrollY + corrida);
      }, toque, v);
      lado = 0;
    }
    // Tocar otra sección en la fila de arriba: el mismo movimiento que al deslizar (entra por el lado en que está en la
    // fila), sin que los platos cambien de golpe
    const pasarA = id => {
      if (ocupado || modo !== 'nada') { siguiente = id; return; }
      const ids = orden(), de = ids.indexOf(abierta), a = ids.indexOf(id);
      if (de < 0 || a < 0 || de === a || !document.getElementById(abierta)) return abrir(id, false);
      sec = document.getElementById(abierta);
      sec.style.transition = 'none';
      cancelAnimationFrame(cuadroFila);
      fila.style.scrollSnapType = 'none';
      fila0 = fila.scrollLeft;
      anchoFijo = sec.offsetWidth + ESPACIO;
      xSec = 0;
      // Las preparadas, a la altura donde va la página ahora (en el computador no hay dedo que lo haga al tocar) y cada una
      // a su lado: si no, al correrse la abierta quedaba a la vista la del otro lado, con su texto encima
      prepararVecinas();
      correrPreparadas();
      ponerVecina(a > de ? 1 : -1, id);
      vecina.style.transition = 'none';
      vecina.style.transform = 'translateX(' + lado * ancho() + 'px)';
      // Arranca dos cuadros después: la otra sección ya quedó pintada en su capa, al lado, y el movimiento no da un
      // tirón al empezar
      ocupado = true;
      const mio = turno;
      requestAnimationFrame(() => requestAnimationFrame(() => { if (mio !== turno) return; ocupado = false; pasarALaVecina(true); }));
    };
    // Si cambia el ancho (el celular de lado), se vuelven a preparar a la medida nueva
    let anchoVentana = innerWidth;
    addEventListener('resize', () => {
      if (innerWidth === anchoVentana) return; // en el iPhone cambia el alto al esconderse la barra: eso no importa
      anchoVentana = innerWidth;
      if (abierta && modo === 'nada' && !ocupado && !vecina) { soltarPreparadas(); prepararLuego(); }
    });
    return {
      pasarA,
      prepararLuego,
      // abrir() ya limpió las marcas de todas las secciones: aquí solo se olvidan
      olvidar() { preparadas = []; preparadasDe = null; },
      cancelar() {
        turno++;
        clearTimeout(relojPreparar);
        siguiente = null;
        ocupado = false;
        modo = 'nada';
        lado = 0;
        cancelAnimationFrame(cuadroFila);
        anchoFijo = 0;
        xSec = 0;
        fila.style.scrollSnapType = '';
        soltarPreparadas();
        if (vecina) { vecina.classList.remove('abierta'); soltarVecina(vecina); vecina = null; }
      },
      activo(si) {
        if (si) document.addEventListener('touchmove', alMoverDedo, { passive: false });
        else document.removeEventListener('touchmove', alMoverDedo);
      }
    };
  }

  window.Capsulas = {
    // La carta se volvió a armar (llegó lo de hoy de Firebase): las cápsulas y la fila, otra vez
    repintar() {
      if (!listo || !document.body.classList.contains('con-capsulas')) return;
      if (abierta) cerrar();
      if (deslizador) deslizador.cancelar();
      pintar();
    },
    prender(opciones) {
      if (listo || !document.querySelector('#carta .cat')) return;
      listo = true;
      fotosSecciones = (opciones && opciones.fotosSecciones) || {};
      try {
        preparar();
        pintar();
      } catch (e) {
        // Si algo falla en este celular, la carta sale entera como antes (con la fila de categorías), nunca en blanco
        console.warn('Sin cápsulas:', e);
        document.body.classList.remove('con-capsulas');
        if (barra) barra.remove();
        if (capsulas) capsulas.remove();
        return;
      }
      // Si la persona recargó con una sección abierta, sigue en ella
      if (history.state && history.state.seccion) {
        if (document.getElementById(history.state.seccion)) abrir(history.state.seccion, false);
        else try { history.replaceState(null, ''); } catch { /* el navegador limita los cambios: se queda así */ }
      }
    }
  };
})();

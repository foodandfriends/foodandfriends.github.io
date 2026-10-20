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
    capsulas.replaceChildren(titulo, ul);
    const carta = document.getElementById('carta'), mas = carta.querySelector(':scope > .mas-pedidos');
    if (mas) mas.after(capsulas); else carta.prepend(capsulas);
    if (window.cargarFotos) window.cargarFotos(capsulas);
    // La fila de secciones de arriba (con la sección abierta)
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
    document.querySelectorAll('#carta .cat').forEach(c => { if (c.style.transform || c.style.transition) c.style.transform = c.style.transition = ''; });
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
  // Sube o baja la página de una vez (el html tiene scroll-behavior: smooth)
  function irA(y) {
    const estilo = document.documentElement.style, antes = estilo.scrollBehavior;
    estilo.scrollBehavior = 'auto';
    window.scrollTo(0, y);
    estilo.scrollBehavior = antes;
  }
  function abrir(id, empujar) {
    if (!abierta) { dondeIba = scrollY; primera = id; }
    limpiarRestos();
    if (deslizador) deslizador.activo(true);
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
    limpiarRestos();
    if (deslizador) deslizador.activo(false);
    abierta = null;
    document.body.classList.remove('viendo-seccion');
    document.documentElement.classList.remove('viendo-seccion');
    delete document.body.dataset.seccion;
    document.querySelectorAll('#carta .cat.abierta').forEach(c => c.classList.remove('abierta'));
    const y = dondeDe(ultima);
    irA(y);
    requestAnimationFrame(() => irA(y));
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
      if (!t || abierta) return;
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
    capsulas.addEventListener('click', ev => { const b = ev.target.closest('.capsula'); if (b) abrir(b.dataset.sec, true); });
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
    // "Volver arriba" del pie, con una sección abierta: sube dentro de la sección (el #arriba está escondido)
    document.addEventListener('click', ev => {
      if (!abierta || !ev.target.closest('a[href="#arriba"]')) return;
      ev.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    // La página ampliada con los dedos (zoom): deslizar de lado ya no cambia de sección, mueve la página
    if (window.visualViewport) visualViewport.addEventListener('resize', () => document.documentElement.classList.toggle('con-zoom', visualViewport.scale > 1.01));
    window.addEventListener('popstate', ev => {
      if (ev.state && ev.state.seccion) { if (ev.state.seccion !== abierta) abrir(ev.state.seccion, false); }
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
    // Lo que tardan en terminar de correrse (las secciones y la fila, juntas): al tocar otra sección en la fila, todo el
    // camino, arrancando y frenando suave; al soltar el dedo, lo que falta, más corto si ya iba cerca
    const DURA_TOQUE = 440, DURA_SOLTAR = 380;
    const CURVA_TOQUE = [.45, 0, .2, 1], CURVA_SOLTAR = [.22, .75, .3, 1];
    // La misma curva en el código, para que la fila se corra al mismo paso que las secciones
    const enCurva = ([x1, y1, x2, y2], t) => {
      let a = 0, b = 1, u = t;
      for (let i = 0; i < 24; i++) { u = (a + b) / 2; const x = 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u; if (x < t) a = u; else b = u; }
      return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
    };
    let x0 = 0, y0 = 0, t0 = 0, dx = 0, modo = 'nada', sec = null, vecina = null, lado = 0, ocupado = false;
    // La fila de arriba acompaña al dedo: va de donde estaba (fila0) a donde queda con la otra sección (fila1) en la
    // misma medida en que se corre la sección, y al soltar termina de correrse al mismo tiempo. Mientras tanto no se
    // ajusta sola a una sección (scroll-snap), para que no dé saltos
    let fila0 = 0, fila1 = 0, cuadroFila = 0;
    let siguiente = null; // la sección que se tocó en la fila mientras otra todavía se corría: se abre al terminar
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
    const ancho = () => sec.offsetWidth + ESPACIO;
    const deLado = nodo => {
      for (; nodo && nodo !== carta; nodo = nodo.parentElement) if (nodo.scrollWidth > nodo.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(nodo).overflowX)) return true;
      return false;
    };
    const sirve = nodo => carta.contains(nodo) ? !deLado(nodo) : nodo === document.body || nodo === document.documentElement || !!nodo.closest('footer');
    // La vecina se ve igual que cuando esté abierta (con la marca "abierta") y queda arriba, donde va a quedar
    function ponerVecina(paso, id) {
      if (id === undefined) id = idVecina(paso);
      quitarVecina();
      lado = paso;
      if (!id) return;
      vecina = document.getElementById(id);
      vecina.classList.add('abierta', 'asomada');
      // Las dos en su propia capa mientras se corren: el iPhone no las vuelve a pintar en cada cuadro
      vecina.style.willChange = sec.style.willChange = 'transform';
      vecina.style.top = (sec.offsetTop + scrollY) + 'px';
      vecina.style.left = sec.offsetLeft + 'px';
      vecina.style.width = sec.offsetWidth + 'px';
      fila1 = sitioEnFila(id);
    }
    const soltarVecina = v => { v.classList.remove('asomada'); for (const k of ['top', 'left', 'width', 'transform', 'transition', 'willChange']) v.style[k] = ''; };
    function quitarVecina() {
      if (!vecina) return;
      vecina.classList.remove('abierta');
      soltarVecina(vecina);
      vecina = null;
    }
    function mover() {
      // Hacia donde no hay otra sección se corre poco, como un resorte
      sec.style.transform = 'translateX(' + (vecina ? dx : dx * .3) + 'px)';
      if (vecina) vecina.style.transform = 'translateX(' + (lado * ancho() + dx) + 'px)';
      fila.scrollLeft = vecina ? fila0 + (fila1 - fila0) * Math.min(1, Math.abs(dx) / ancho()) : fila0;
    }
    // Las dos terminan de correrse (hasta xSec la abierta), y la fila hasta filaHasta, y después, fin(). Con toque, todo
    // el camino; si no, lo que falta desde donde soltó el dedo
    function terminar(xSec, filaHasta, fin, toque) {
      ocupado = true;
      const falta = Math.min(1, Math.abs(xSec - (parseFloat((sec.style.transform.match(/-?[\d.]+/) || [0])[0]) || 0)) / ancho());
      const dura = toque ? DURA_TOQUE : Math.round(200 + (DURA_SOLTAR - 200) * falta), curva = toque ? CURVA_TOQUE : CURVA_SOLTAR;
      const transicion = 'transform ' + dura + 'ms cubic-bezier(' + curva.join(', ') + ')';
      sec.style.transition = transicion;
      sec.style.transform = 'translateX(' + xSec + 'px)';
      if (vecina) { vecina.style.transition = transicion; vecina.style.transform = 'translateX(' + (xSec + lado * ancho()) + 'px)'; }
      correrFila(filaHasta, dura, curva);
      // Pase lo que pase en fin(), se puede volver a deslizar (si no, quedaba trabado para siempre)
      setTimeout(() => {
        try { fin(); } finally { ocupado = false; }
        if (siguiente) { const id = siguiente; siguiente = null; if (id !== abierta) pasarA(id); }
      }, dura + 10);
    }
    function aSuSitio() { sec.style.transform = sec.style.transition = sec.style.willChange = ''; quitarVecina(); }

    document.addEventListener('touchstart', ev => {
      // Un segundo dedo a mitad del deslizamiento (para ampliar): todo vuelve a su sitio
      if (modo === 'lado') { soltar({ type: 'touchcancel', timeStamp: ev.timeStamp }); return; }
      modo = 'nada';
      if (!abierta || ocupado || ev.touches.length !== 1) return;
      if (window.visualViewport && visualViewport.scale > 1.01) return; // con la página ampliada, el dedo la mueve
      const t = ev.touches[0];
      if (t.clientX < 24 || !sirve(ev.target)) return;
      x0 = t.clientX; y0 = t.clientY; t0 = ev.timeStamp; dx = 0; lado = 0; modo = 'quizas';
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
      }
      if (ev.cancelable) ev.preventDefault();
      dx = mx;
      const paso = dx < 0 ? 1 : -1;
      if (paso !== lado || (!vecina && idVecina(paso))) ponerVecina(paso);
      mover();
    };
    const soltar = ev => {
      if (modo !== 'lado') { modo = 'nada'; return; }
      modo = 'nada';
      const rapido = Math.abs(dx) > 30 && Math.abs(dx) / Math.max(ev.timeStamp - t0, 1) > .5;
      const paso = ev.type === 'touchend' && (Math.abs(dx) > Math.min(90, innerWidth * .25) || rapido) ? (dx < 0 ? 1 : -1) : 0;
      if (paso && vecina && paso === lado) {
        pasarALaVecina();
      } else if (paso === -1 && !idVecina(-1)) {
        aSuSitio();
        fila.scrollLeft = fila0;
        fila.style.scrollSnapType = '';
        volver.click();
      } else {
        terminar(0, fila0, aSuSitio);
      }
      lado = 0;
    };
    document.addEventListener('touchend', soltar);
    document.addEventListener('touchcancel', soltar);

    // La de al lado termina de entrar (y la fila de correrse) y queda abierta
    function pasarALaVecina(toque) {
      const destino = vecina.id, antes = sec, nueva = vecina;
      resaltar(destino); // la fila marca la nueva de una vez, mientras termina de correrse
      terminar(-lado * ancho(), fila1, () => {
        vecina = null;
        // Si mientras tanto volvieron a las cápsulas (la flecha o el "atrás"), no se abre nada
        if (abierta !== antes.id) { soltarVecina(nueva); nueva.classList.remove('abierta'); antes.style.transform = antes.style.transition = ''; return; }
        // Todo en el mismo momento (sin dibujar en medio): la otra pasa a ser la abierta, arriba, donde ya estaba
        abrir(destino, false);
        soltarVecina(nueva);
        antes.style.transform = antes.style.transition = antes.style.willChange = '';
      }, toque);
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
      ponerVecina(a > de ? 1 : -1, id);
      vecina.style.transition = 'none';
      vecina.style.transform = 'translateX(' + lado * ancho() + 'px)';
      // Arranca dos cuadros después: la otra sección ya quedó pintada en su capa, al lado, y el movimiento no da un
      // tirón al empezar
      ocupado = true;
      requestAnimationFrame(() => requestAnimationFrame(() => { ocupado = false; pasarALaVecina(true); }));
    };
    return {
      pasarA,
      activo(si) {
        if (si) document.addEventListener('touchmove', alMoverDedo, { passive: false });
        else document.removeEventListener('touchmove', alMoverDedo);
      }
    };
  }

  window.Capsulas = {
    prender(opciones) {
      if (listo || !document.querySelector('#carta .cat')) return;
      listo = true;
      fotosSecciones = (opciones && opciones.fotosSecciones) || {};
      preparar();
      pintar();
      // Si la persona recargó con una sección abierta, sigue en ella
      if (history.state && history.state.seccion && document.getElementById(history.state.seccion)) abrir(history.state.seccion, false);
    }
  };
})();

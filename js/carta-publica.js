/*
  Carta pública: la pinta con carta.js. Pide a la vez la copia de datos/<restaurante>.json (la tarea diaria de GitHub
  la mantiene al día, .github/workflows/respaldo.yml, y llega rápido) y la carta de Firebase (con lo de hoy, más lenta):
  sale con la que llegue primero y, si Firebase trae algo distinto, lo corrige apenas llega.
  Las fotos se cargan a medida que la persona baja por la carta.
  Después de pintarla prende las secciones en cápsulas (js/capsulas.js).
*/
(async function () {
  const C = window.CONFIG;
  const slug = C.restaurante;
  const aviso = document.getElementById('cargando');
  const TRANSPARENTE = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

  function conLimite(promesa, ms) {
    return Promise.race([promesa, new Promise((_, no) => setTimeout(() => no(new Error('Firebase no respondió')), ms))]);
  }

  async function deRespaldo() {
    // Sin cache: 'no-cache': así usa la que index.html ya pidió (preload). Si es de hace un rato, Firebase la corrige
    const r = await fetch(C.raiz + 'datos/' + slug + '.json');
    if (!r.ok) throw new Error('No hay copia de la carta');
    return r.json();
  }

  function aCarta(r) {
    return {
      // La "nota" del panel es la historia del restaurante, que va arriba. Al final va "Dónde estamos", el celular
      // del local (se toca para llamar) y los avisos legales; horario y redes no se muestran
      negocio: {
        nombre: r.nombre, logo: C.raiz + C.logo, lugar: r.lugar, direccion: r.direccion,
        mapa: r.mapa, telefono: r.telefono, historia: r.nota, legal: C.textoLegal
      },
      categorias: (r.categorias || []).map(c => ({
        id: c.id, nombre: c.nombre, nota: c.nota,
        platos: (c.platos || []).map(p => ({
          id: p.id, nombre: p.nombre, descripcion: p.descripcion, precio: p.precio, etiqueta: p.etiqueta,
          agotado: p.agotado, foto: p.foto ? TRANSPARENTE : '', fotoId: p.foto
        }))
      })),
      masPedidos: C.masPedidos
    };
  }

  // Los datos. La copia del sitio (la de la madrugada) llega en unos 0,2 s; Firebase, con lo de hoy (agotados, precios),
  // tarda cerca de 1 s. Se piden las dos a la vez: la carta sale con la que llegue primero (casi siempre la copia) y, si
  // Firebase trae algo distinto, se corrige apenas llega (ver corregir)
  const pedidoCopia = deRespaldo();
  const pedidoFirebase = BD.configurado ? conLimite(BD.carta(slug), 10000) : Promise.reject(new Error('Firebase sin configurar'));
  pedidoCopia.catch(() => {});
  pedidoFirebase.catch(e => console.warn('Firebase no respondió:', e.message));
  let datos, deFirebase = false;
  try {
    ({ datos, deFirebase } = await new Promise((ok, no) => {
      let fallas = 0;
      const falla = () => { if (++fallas === 2) no(new Error('Sin carta')); };
      pedidoCopia.then(d => ok({ datos: d, deFirebase: false }), falla);
      pedidoFirebase.then(d => ok({ datos: d, deFirebase: true }), falla);
    }));
  } catch {
    aviso.textContent = 'No pudimos cargar la carta. Revise el internet e intente otra vez.';
    const otra = document.createElement('button');
    otra.className = 'btn principal';
    otra.textContent = 'Intentar otra vez';
    otra.addEventListener('click', () => location.reload());
    aviso.after(otra);
    quitarPortada();
    return;
  }
  aviso.remove();
  let mostrada = aCarta(datos);
  window.pintarCarta(mostrada);
  quitarPortada();

  // La pantalla con el logo se desvanece cuando la carta ya tiene sus letras y su logo, y se deja ver al menos un momento
  // (0,4 s desde que se abrió la página) para que no parpadee; nunca espera más de 1,5 s
  function quitarPortada() {
    const portada = document.getElementById('portada');
    if (!portada) return;
    const espera = ms => new Promise(ok => setTimeout(ok, ms));
    const logo = document.querySelector('#cabecera .logo');
    const logoListo = logo && !logo.complete ? new Promise(ok => { logo.onload = logo.onerror = ok; }) : null;
    const lista = Promise.all([document.fonts.ready, logoListo, espera(Math.max(0, 400 - performance.now()))]);
    Promise.race([lista, espera(1500)]).then(() => {
      portada.classList.add('lista');
      document.body.classList.remove('entrando');
      setTimeout(() => portada.remove(), 450);
    });
  }

  // Cada foto se pide cuando está por aparecer en pantalla (o antes, si las cápsulas la piden: la de la sección que se
  // va a abrir y las de al lado, para que al deslizar ya estén). Si no se encuentra, se quita y el plato queda sin el
  // espacio de la foto
  function cargar(img) {
    if (img.dataset.pedida) return Promise.resolve();
    img.dataset.pedida = 'si';
    vista.unobserve(img);
    // Ya se pidió: que el navegador la termine de traer aunque esté escondida (con loading="lazy" esperaba a que se
    // viera, y al abrir o deslizar a una sección las fotos aparecían de a una)
    img.loading = 'eager';
    const promesa = BD.foto(slug, img.dataset.foto)
      .then(url => {
        if (!listas.has(img.dataset.foto)) listas.set(img.dataset.foto, url);
        img.src = url;
        // Se deja lista para pintar: al mostrarla no sale primero el recuadro vacío (sin esperar más de 3 s). Y ya cargada,
        // se dibuja sin espera: en el iPhone, al volver a mostrarse (al salir de una sección), salía un instante en blanco
        const lista = () => { img.decoding = 'sync'; };
        if (img.decode) return Promise.race([img.decode().catch(() => {}), new Promise(ok => setTimeout(ok, 3000))]).then(lista);
        lista();
      })
      .catch(e => {
        // Si fue la señal (no que la foto no exista), se vuelve a pedir en unos segundos, cuando se vea; a la tercera, o si
        // no existe, se quita y el plato queda sin el espacio de la foto
        const intentos = Number(img.dataset.intentos || 0) + 1;
        if (e && e.estado !== 404 && intentos < 3) {
          img.dataset.intentos = intentos;
          setTimeout(() => { delete img.dataset.pedida; vista.observe(img); }, 4000);
          return;
        }
        const plato = img.closest('.plato');
        if (plato) plato.classList.remove('con-foto');
        img.remove();
      });
    enCamino.add(promesa);
    promesa.then(() => enCamino.delete(promesa));
    return promesa;
  }
  const enCamino = new Set(); // las fotos que se están trayendo
  const listas = new Map(); // id de la foto → su dirección, ya traída (para volver a armar la carta sin que titilen)
  const vista = new IntersectionObserver(entradas => {
    for (const e of entradas) if (e.isIntersecting) cargar(e.target);
  }, { rootMargin: '400px 0px' });
  document.querySelectorAll('img[data-foto]').forEach(img => vista.observe(img));
  window.cargarFotos = nodo => nodo.querySelectorAll('img[data-foto]').forEach(cargar);
  // Las que se pintan después (las de las cápsulas) se piden igual: cuando están por aparecer
  window.vigilarFotos = nodo => nodo.querySelectorAll('img[data-foto]').forEach(img => { if (!img.dataset.pedida) vista.observe(img); });

  // Después, con calma y de a pocas, las fotos que todavía no se ven: primero las de "Los más pedidos" (la fila se desliza
  // de lado y las de la derecha aparecían tarde) y luego las de las secciones, primero las de arriba de cada una. Así, al
  // abrir una sección o deslizar a otra, las fotos ya están y no van apareciendo de a una (pesan unos 20 KB cada una). Lo
  // que está en pantalla va antes que todo esto: la cola arranca cuando llegaron las de la primera pantalla (o a los 1,5 s).
  // Si el celular pide ahorrar datos, solo se traen al verlas
  const tiempo = ms => new Promise(ok => setTimeout(ok, ms));
  if (!(navigator.connection && navigator.connection.saveData)) tiempo(150).then(() => Promise.race([Promise.all([...enCamino]), tiempo(1350)])).then(() => {
    const porSeccion = [...document.querySelectorAll('#carta .cat')].map(s => [...s.querySelectorAll('img[data-foto]')]);
    const cola = [...document.querySelectorAll('#carta .mas-pedidos img[data-foto]')];
    for (let k = 0; porSeccion.some(f => f[k]); k++) porSeccion.forEach(f => { if (f[k]) cola.push(f[k]); });
    let andando = 0;
    const seguir = () => {
      while (andando < 6 && cola.length) {
        andando++;
        cargar(cola.shift()).then(() => { andando--; seguir(); });
      }
    };
    seguir();
  });

  // Las secciones en cápsulas (js/capsulas.js); sin ese archivo, la carta sale entera como antes
  const fotosSecciones = {};
  for (const [id, archivo] of Object.entries(C.fotosSecciones || {})) fotosSecciones[id] = C.raiz + archivo;
  if (window.Capsulas) window.Capsulas.prender({ fotosSecciones });

  // Lo de hoy: si Firebase trae algo distinto de la copia, se corrige. Si solo cambiaron platos (un agotado, un precio),
  // esos platos en su sitio. Si cambió más (un plato o una sección nuevos, "Los más pedidos") y la persona todavía no ha
  // empezado a usar la carta, se vuelve a armar con las fotos que ya llegaron (no titilan); si ya empezó, solo los platos
  if (!deFirebase) pedidoFirebase.then(f => corregir(aCarta(f))).catch(() => {});
  let tocada = false;
  for (const t of ['touchstart', 'mousedown', 'keydown', 'wheel']) addEventListener(t, () => { tocada = true; }, { once: true, passive: true, capture: true });
  function corregir(nueva) {
    if (JSON.stringify(nueva) === JSON.stringify(mostrada)) return;
    const vieja = mostrada;
    mostrada = nueva;
    const favoritos = M => {
      const platos = new Map();
      for (const c of M.categorias) for (const p of c.platos) platos.set(p.id, p);
      return (M.masPedidos || []).filter(id => platos.has(id) && platos.get(id).fotoId && !platos.get(id).agotado);
    };
    const forma = M => JSON.stringify([M.negocio, M.categorias.map(c => [c.id, c.nombre, c.nota, c.platos.map(p => [p.id, !!p.fotoId])]), favoritos(M)]);
    const empezo = tocada || scrollY > 60 || document.body.classList.contains('viendo-seccion');
    if (forma(nueva) === forma(vieja) || empezo) {
      for (const img of window.actualizarPlatos(nueva)) cargar(img);
      return;
    }
    window.pintarCarta(nueva);
    if (window.Capsulas) window.Capsulas.repintar();
    document.querySelectorAll('img[data-foto]').forEach(img => {
      const url = listas.get(img.dataset.foto);
      if (url) { img.loading = 'eager'; img.src = url; img.dataset.pedida = 'si'; } else vista.observe(img);
    });
  }
})();

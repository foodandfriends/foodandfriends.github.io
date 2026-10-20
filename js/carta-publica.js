/*
  Carta pública: trae la carta del restaurante desde Firebase y la pinta con carta.js.
  Si Firebase no responde (o todavía no está configurado), usa la copia de datos/<restaurante>.json,
  que la tarea diaria de GitHub mantiene al día (.github/workflows/respaldo.yml).
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
    const r = await fetch(C.raiz + 'datos/' + slug + '.json', { cache: 'no-cache' });
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

  let datos;
  try {
    if (!BD.configurado) throw new Error('Firebase sin configurar');
    datos = await conLimite(BD.carta(slug), 6000);
  } catch (e) {
    console.warn('Carta desde la copia de respaldo:', e.message);
    try {
      datos = await deRespaldo();
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
  }
  aviso.remove();
  window.pintarCarta(aCarta(datos));
  quitarPortada();

  // La pantalla negra con el logo se desvanece cuando la carta ya tiene sus letras y su logo,
  // y se deja ver al menos un momento para que no parpadee (nunca espera más de 1,5 s)
  function quitarPortada() {
    const portada = document.getElementById('portada');
    if (!portada) return;
    const espera = ms => new Promise(ok => setTimeout(ok, ms));
    const logo = document.querySelector('#cabecera .logo');
    const logoListo = logo && !logo.complete ? new Promise(ok => { logo.onload = logo.onerror = ok; }) : null;
    const lista = Promise.all([document.fonts.ready, logoListo, espera(Math.max(0, 700 - performance.now()))]);
    Promise.race([lista, espera(1500)]).then(() => {
      portada.classList.add('lista');
      document.body.classList.remove('entrando');
      setTimeout(() => portada.remove(), 700);
    });
  }

  // Cada foto se pide cuando está por aparecer en pantalla (o antes, si las cápsulas la piden: las de la sección de al
  // lado, para que al deslizar ya esté). Si no se encuentra, se quita y el plato queda sin el espacio de la foto
  function cargar(img) {
    if (img.dataset.pedida) return;
    img.dataset.pedida = 'si';
    vista.unobserve(img);
    BD.foto(slug, img.dataset.foto)
      .then(url => { img.src = url; })
      .catch(() => { const plato = img.closest('.plato'); if (plato) plato.classList.remove('con-foto'); img.remove(); });
  }
  const vista = new IntersectionObserver(entradas => {
    for (const e of entradas) if (e.isIntersecting) cargar(e.target);
  }, { rootMargin: '400px 0px' });
  document.querySelectorAll('img[data-foto]').forEach(img => vista.observe(img));
  window.cargarFotos = nodo => nodo.querySelectorAll('img[data-foto]').forEach(cargar);

  // Las secciones en cápsulas (js/capsulas.js); sin ese archivo, la carta sale entera como antes
  if (window.Capsulas) window.Capsulas.prender();
})();

/*
  Carta pública: trae la carta del restaurante desde Firebase y la pinta con carta.js.
  Si Firebase no responde (o todavía no está configurado), usa la copia de datos/<restaurante>.json,
  que la tarea diaria de GitHub mantiene al día (.github/workflows/respaldo.yml).
  Las fotos se cargan a medida que la persona baja por la carta.
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
      // Al final de la carta solo va "Dónde estamos", la nota del dueño y los avisos legales:
      // quien la lee ya está en el local, así que no se muestran teléfono, horario ni redes
      negocio: {
        nombre: r.nombre, logo: C.raiz + C.logo, lugar: r.lugar, direccion: r.direccion,
        mapa: r.mapa, nota: r.nota, legal: C.textoLegal
      },
      categorias: (r.categorias || []).map(c => ({
        id: c.id, nombre: c.nombre, nota: c.nota,
        platos: (c.platos || []).map(p => ({
          nombre: p.nombre, descripcion: p.descripcion, precio: p.precio, etiqueta: p.etiqueta,
          agotado: p.agotado, foto: p.foto ? TRANSPARENTE : '', fotoId: p.foto
        }))
      }))
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
    Promise.race([lista, espera(1500)]).then(() => requestAnimationFrame(() => {
      portada.classList.add('lista');
      document.body.classList.remove('entrando');
      setTimeout(() => portada.remove(), 700);
    }));
  }

  // Cada foto se pide cuando está por aparecer en pantalla
  const vista = new IntersectionObserver(entradas => {
    for (const e of entradas) {
      if (!e.isIntersecting) continue;
      vista.unobserve(e.target);
      BD.foto(slug, e.target.dataset.foto)
        .then(url => { e.target.src = url; })
        .catch(() => e.target.remove());
    }
  }, { rootMargin: '400px 0px' });
  document.querySelectorAll('img[data-foto]').forEach(img => vista.observe(img));
})();

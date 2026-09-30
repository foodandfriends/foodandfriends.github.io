/*
  Carta pública: trae la carta del restaurante desde Supabase y la pinta con carta.js.
  Si Supabase no responde (o todavía no está configurado), usa la copia de datos/<restaurante>.json,
  que la tarea diaria de GitHub mantiene al día (.github/workflows/respaldo.yml).
*/
(async function () {
  const C = window.CONFIG;
  const slug = C.restaurante;
  const aviso = document.getElementById('cargando');

  function conLimite(promesa, ms) {
    return Promise.race([promesa, new Promise((_, no) => setTimeout(() => no(new Error('Supabase no respondió')), ms))]);
  }

  async function deSupabase() {
    const [r] = await SB.leer('restaurantes', 'slug=eq.' + encodeURIComponent(slug) + '&select=*', true);
    if (!r) throw new Error('No existe el restaurante ' + slug);
    const filtro = 'restaurante_id=eq.' + r.id + '&order=orden.asc,id.asc';
    const [categorias, platos] = await Promise.all([
      SB.leer('categorias', filtro + '&select=id,nombre,nota', true),
      SB.leer('platos', filtro + '&select=categoria_id,nombre,descripcion,precio,etiqueta,agotado,foto', true)
    ]);
    return { restaurante: r, categorias, platos };
  }

  async function deRespaldo() {
    const r = await fetch(C.raiz + 'datos/' + slug + '.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error('No hay copia de la carta');
    return r.json();
  }

  function aCarta({ restaurante: r, categorias, platos }) {
    return {
      negocio: {
        nombre: r.nombre, logo: C.raiz + C.logo, lugar: r.lugar, direccion: r.direccion,
        telefono: r.telefono, whatsapp: r.whatsapp, mapa: r.mapa, facebook: r.facebook,
        instagram: r.instagram, horario: r.horario, nota: r.nota
      },
      categorias: categorias.map(c => ({
        id: c.id, nombre: c.nombre, nota: c.nota,
        platos: platos.filter(p => p.categoria_id === c.id).map(p => ({
          nombre: p.nombre, descripcion: p.descripcion, precio: p.precio,
          etiqueta: p.etiqueta, agotado: p.agotado, foto: SB.fotoUrl(p.foto)
        }))
      }))
    };
  }

  let datos;
  try {
    if (!SB.configurado) throw new Error('Supabase sin configurar');
    datos = await conLimite(deSupabase(), 6000);
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
      return;
    }
  }
  aviso.remove();
  window.pintarCarta(aCarta(datos));
})();

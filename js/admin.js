/*
  Panel del dueño: entrar, y cambiar platos, precios, fotos y datos del local.
  Toda la carta de un restaurante es un solo documento: cada cambio se arma sobre una copia y se guarda
  con la versión que se leyó, así no se pisa lo que se haya cambiado desde otro celular.
  Los permisos no se deciden aquí sino en las reglas de Firestore (firebase/reglas.rules).
*/
(function () {
  // El panel no se deja mostrar dentro de otra página (evita que lo disfracen para robar clics)
  if (window.top !== window.self) { document.body.replaceChildren(); return; }

  const C = window.CONFIG;
  const $ = s => document.querySelector(s);
  const estado = { slugs: [], slug: null, datos: null, version: null };

  // ---------------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------------
  function el(tag, props = {}, ...hijos) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') e.className = v;
      else if (k === 'texto') e.textContent = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
    }
    e.append(...hijos.filter(h => h != null));
    return e;
  }
  const TRAZOS = {
    arriba: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    abajo: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    lapiz: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
    equis: '<path d="M6 6l12 12M18 6 6 18"/>'
  };
  function botonIcono(icono, etiqueta, deshabilitado, accion) {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = TRAZOS[icono];
    return el('button', { class: 'icono', type: 'button', 'aria-label': etiqueta, title: etiqueta, disabled: deshabilitado, onclick: accion }, s);
  }
  const miles = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const pesos = n => n == null ? 'Sin precio' : '$' + miles(n);
  const textoEstado = agotado => agotado ? 'Agotado' : 'Disponible';
  const texto = v => { const t = (v || '').trim(); return t || null; };
  const categorias = () => estado.datos.categorias;
  const categoria = (lista, id) => lista.find(c => c.id === id);

  let temporizador;
  function aviso(mensaje, error) {
    const a = $('#aviso');
    a.textContent = mensaje;
    a.className = 'aviso' + (error ? ' error' : '');
    a.hidden = false;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => { a.hidden = true; }, error ? 5000 : 2500);
  }
  function mostrar(vista) {
    for (const v of ['cargando', 'config', 'entrar', 'clave', 'panel']) $('#vista-' + v).hidden = v !== vista;
  }
  // Si la sesión venció se vuelve a entrar; si no, se muestra el error donde corresponda
  function fallo(e, dondeError) {
    if (e && (e.estado === 401 || /TOKEN_EXPIRED|INVALID_ID_TOKEN|INVALID_REFRESH_TOKEN|USER_NOT_FOUND/.test(e.codigo))) {
      BD.salir();
      mostrar('entrar');
      $('#entrar-error').textContent = 'La sesión terminó. Entre otra vez.';
      return;
    }
    const m = (e && e.message) || 'Algo salió mal.';
    if (dondeError) $(dondeError).textContent = m; else aviso(m, true);
  }
  async function ocupado(boton, tarea) {
    boton.disabled = true;
    try { return await tarea(); } finally { boton.disabled = false; }
  }
  // Borrar pide un segundo toque para confirmar
  function reiniciarBorrar(boton, etiqueta) {
    delete boton.dataset.confirmar;
    boton.classList.remove('confirmar');
    boton.textContent = etiqueta;
  }
  function confirmarDosVeces(boton, etiqueta, pregunta, accion) {
    if (boton.dataset.confirmar) return accion();
    boton.dataset.confirmar = '1';
    boton.classList.add('confirmar');
    boton.textContent = pregunta;
    setTimeout(() => reiniciarBorrar(boton, etiqueta), 5000);
  }
  function preferido(slug) {
    try { return slug ? localStorage.setItem('carta-restaurante', slug) : localStorage.getItem('carta-restaurante'); } catch { return null; }
  }
  function mostrarFoto(img, nombre) {
    BD.foto(estado.slug, nombre).then(url => { img.src = url; }).catch(() => {});
  }

  // La foto de un plato en la carta: 500 x 392 px (la forma del recuadro) y menos de 140 KB
  const FOTO = { ancho: 500, alto: 392, maximo: 140000 };

  // Abre la foto como venga (jpg, png, webp, heic en iPhone...). Si el navegador no puede de una forma, prueba la otra
  async function abrirImagen(archivo) {
    try {
      const imagen = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
      return { imagen, ancho: imagen.width, alto: imagen.height, soltar: () => imagen.close() };
    } catch { /* se intenta con una imagen normal */ }
    const url = URL.createObjectURL(archivo);
    const imagen = new Image();
    imagen.src = url;
    try {
      await imagen.decode();
    } catch {
      URL.revokeObjectURL(url);
      throw new Error('Esa foto no se pudo abrir en este navegador. Escójala desde el celular o guárdela como JPG.');
    }
    return { imagen, ancho: imagen.naturalWidth, alto: imagen.naturalHeight, soltar: () => URL.revokeObjectURL(url) };
  }

  // Cualquier foto, de cualquier peso, queda lista: se recorta al centro con la forma de la carta, se achica
  // (sin agrandar las pequeñas) y se baja la calidad, y si hace falta el tamaño, hasta que pese menos del máximo
  async function comprimir(archivo) {
    const { imagen, ancho, alto, soltar } = await abrirImagen(archivo);
    try {
      const forma = FOTO.ancho / FOTO.alto;
      const recorteAncho = Math.min(ancho, alto * forma), recorteAlto = recorteAncho / forma;
      const x = (ancho - recorteAncho) / 2, y = (alto - recorteAlto) / 2;
      const lienzo = document.createElement('canvas');
      const pincel = lienzo.getContext('2d');
      let ultimo = null;
      for (const escala of [1, 0.8, 0.6, 0.45]) {
        lienzo.width = Math.max(1, Math.round(Math.min(FOTO.ancho, recorteAncho) * escala));
        lienzo.height = Math.max(1, Math.round(lienzo.width / forma));
        pincel.fillStyle = '#fff'; // las fotos con fondo transparente no quedan negras
        pincel.fillRect(0, 0, lienzo.width, lienzo.height);
        pincel.imageSmoothingQuality = 'high';
        pincel.drawImage(imagen, x, y, recorteAncho, recorteAlto, 0, 0, lienzo.width, lienzo.height);
        for (const tipo of ['image/webp', 'image/jpeg']) {
          for (const calidad of [0.8, 0.7, 0.6, 0.5, 0.4]) {
            const blob = await new Promise(ok => lienzo.toBlob(ok, tipo, calidad));
            if (!blob || blob.type !== tipo) break; // este navegador no hace webp: se sigue con jpg
            if (blob.size <= FOTO.maximo) return blob;
            ultimo = blob;
          }
        }
      }
      if (ultimo && ultimo.size <= 150000) return ultimo;
      throw new Error('No se pudo achicar esa foto. Pruebe con otra.');
    } finally {
      soltar();
    }
  }

  // ---------------------------------------------------------------------------
  // Guardar: siempre sobre la versión que se leyó
  // ---------------------------------------------------------------------------
  async function guardar(cambios) {
    try {
      estado.version = await BD.guardarRestaurante(estado.slug, cambios, estado.version);
      Object.assign(estado.datos, cambios);
    } catch (e) {
      // Si la cambiaron desde otro celular, se trae lo último para no pisarlo
      if (/FAILED_PRECONDITION/.test(e.codigo)) await cargar().catch(() => {});
      throw e;
    }
  }
  async function cambiarCarta(modificar) {
    const nuevas = structuredClone(categorias());
    modificar(nuevas);
    await guardar({ categorias: nuevas });
    pintarPlatos();
  }

  // ---------------------------------------------------------------------------
  // Entrar, recordar contraseña, cambiar contraseña
  // ---------------------------------------------------------------------------
  $('#form-entrar').addEventListener('submit', async ev => {
    ev.preventDefault();
    const correo = $('#entrar-correo').value.trim(), clave = $('#entrar-clave').value;
    const error = $('#entrar-error');
    error.textContent = '';
    if (!correo || !clave) { error.textContent = 'Escriba el correo y la contraseña.'; return; }
    await ocupado(ev.target.querySelector('[type=submit]'), async () => {
      try {
        await BD.entrar(correo, clave);
        $('#entrar-clave').value = '';
        await abrirPanel();
      } catch (e) {
        error.textContent = e.message;
      }
    });
  });

  $('#ir-recordar').addEventListener('click', () => {
    $('#form-recordar').hidden = false;
    $('#recordar-correo').value = $('#entrar-correo').value;
    $('#recordar-correo').focus();
  });
  $('#form-recordar').addEventListener('submit', async ev => {
    ev.preventDefault();
    const correo = $('#recordar-correo').value.trim(), error = $('#recordar-error');
    error.textContent = '';
    if (!correo) { error.textContent = 'Escriba su correo.'; return; }
    await ocupado(ev.target.querySelector('[type=submit]'), async () => {
      try {
        await BD.recordar(correo);
        aviso('Si ese correo tiene cuenta, le llegó un enlace. Revise también el correo no deseado.');
        $('#form-recordar').hidden = true;
      } catch (e) {
        error.textContent = e.message;
      }
    });
  });

  $('#form-clave').addEventListener('submit', async ev => {
    ev.preventDefault();
    const a = $('#clave-1').value, b = $('#clave-2').value, error = $('#clave-error');
    error.textContent = '';
    if (a.length < 10) { error.textContent = 'Use al menos 10 caracteres.'; return; }
    if (a !== b) { error.textContent = 'Las dos contraseñas no son iguales.'; return; }
    await ocupado(ev.target.querySelector('[type=submit]'), async () => {
      try {
        await BD.cambiarClave(a);
        ev.target.reset();
        aviso('Contraseña guardada');
        mostrar('panel');
      } catch (e) {
        fallo(e, '#clave-error');
      }
    });
  });
  $('#ir-clave').addEventListener('click', () => { $('#clave-error').textContent = ''; mostrar('clave'); });
  $('#clave-volver').addEventListener('click', () => mostrar('panel'));
  $('#clave-volver').hidden = false;

  $('#salir').addEventListener('click', () => {
    BD.salir();
    estado.datos = null;
    $('#vista-entrar form').reset();
    mostrar('entrar');
  });

  // ---------------------------------------------------------------------------
  // Panel
  // ---------------------------------------------------------------------------
  async function abrirPanel() {
    mostrar('cargando');
    try {
      estado.slugs = await BD.misRestaurantes();
      if (!estado.slugs.length) {
        BD.salir();
        mostrar('entrar');
        $('#entrar-error').textContent = 'Esta cuenta no tiene un restaurante asignado.';
        return;
      }
      estado.slug = estado.slugs.includes(preferido()) ? preferido() : estado.slugs[0];
      await cargar();
      pintarSelector();
      $('#panel-correo').textContent = BD.usuario ? BD.usuario.email : '';
      mostrar('panel');
    } catch (e) {
      mostrar('entrar');
      fallo(e, '#entrar-error');
    }
  }

  async function cargar() {
    let r = await BD.leerRestaurante(estado.slug);
    if (!r) r = await BD.crearRestaurante(estado.slug, await cartaInicial());
    estado.datos = { horario: [], categorias: [], ...r.datos };
    estado.version = r.version;
    $('#panel-nombre').textContent = estado.datos.nombre;
    $('#ver-carta').href = C.raiz;
    pintarPlatos();
    pintarLocal();
  }

  // La primera vez: los datos del local que ya estaban en la copia del sitio, sin platos
  async function cartaInicial() {
    let copia = {};
    try {
      const r = await fetch(C.raiz + 'datos/' + estado.slug + '.json');
      if (r.ok) copia = await r.json();
    } catch { /* sin copia */ }
    const datos = { nombre: copia.nombre || estado.slug, horario: [], categorias: [] };
    for (const k of ['lugar', 'direccion', 'telefono', 'whatsapp', 'mapa', 'instagram', 'facebook']) {
      if (copia[k]) datos[k] = copia[k];
    }
    return datos;
  }

  function pintarSelector() {
    const s = $('#elegir-restaurante');
    s.hidden = estado.slugs.length < 2;
    s.replaceChildren(...estado.slugs.map(slug => el('option', { value: slug, texto: slug })));
    s.value = estado.slug;
  }
  $('#elegir-restaurante').addEventListener('change', async ev => {
    estado.slug = ev.target.value;
    preferido(estado.slug);
    try { await cargar(); } catch (e) { fallo(e); }
  });

  for (const [tab, panel] of [['#tab-platos', '#pestana-platos'], ['#tab-local', '#pestana-local']]) {
    $(tab).addEventListener('click', () => {
      for (const [t, p] of [['#tab-platos', '#pestana-platos'], ['#tab-local', '#pestana-local']]) {
        $(t).setAttribute('aria-selected', String(t === tab));
        $(p).hidden = p !== panel;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Platos y categorías
  // ---------------------------------------------------------------------------
  function pintarPlatos() {
    const cont = $('#categorias');
    const cats = categorias();
    if (!cats.length) {
      cont.replaceChildren(el('p', { class: 'vacio', texto: 'Todavía no hay categorías. Cree la primera, por ejemplo "Hamburguesas".' }));
      return;
    }
    cont.replaceChildren(...cats.map((c, i) => el('section', { class: 'categoria' },
      el('div', { class: 'categoria-cab' },
        el('h2', {}, c.nombre + ' ', el('small', { texto: '(' + c.platos.length + ')' })),
        botonIcono('arriba', 'Subir categoría', i === 0, () => moverCategoria(i, -1)),
        botonIcono('abajo', 'Bajar categoría', i === cats.length - 1, () => moverCategoria(i, 1)),
        botonIcono('lapiz', 'Editar categoría', false, () => editarCategoria(c))),
      c.platos.length
        ? el('ul', { class: 'lista' }, ...c.platos.map(p => filaPlato(c, p)))
        : el('p', { class: 'vacio', texto: 'Sin platos todavía.' }),
      el('button', { class: 'btn chico agregar', type: 'button', texto: '+ Agregar plato', onclick: () => editarPlato(c, null) }))));
  }

  function filaPlato(c, p) {
    let mini;
    if (p.foto) {
      mini = el('img', { class: 'miniatura', alt: '' });
      mostrarFoto(mini, p.foto);
    } else {
      mini = el('span', { class: 'miniatura vacia', texto: 'Foto' });
    }
    // Prendido = se está vendiendo; apagado = agotado. El texto dice el estado, no el nombre del botón
    const disponible = el('input', { type: 'checkbox', 'aria-label': 'Disponible: ' + p.nombre });
    disponible.checked = !p.agotado;
    const estado = el('span', { texto: textoEstado(p.agotado) });
    disponible.addEventListener('change', () => cambiarAgotado(c.id, p, disponible, estado));
    return el('li', { class: 'fila' + (p.agotado ? ' agotado' : '') },
      el('button', { class: 'abrir', type: 'button', onclick: () => editarPlato(c, p) },
        mini,
        el('span', { class: 'texto' },
          el('strong', { texto: p.nombre }),
          el('span', { texto: pesos(p.precio) + (p.etiqueta ? ' · ' + p.etiqueta : '') }))),
      el('label', { class: 'interruptor' }, disponible, estado));
  }

  async function cambiarAgotado(catId, p, input, estado) {
    const agotado = !input.checked, fila = input.closest('.fila');
    fila.classList.toggle('agotado', agotado);
    estado.textContent = textoEstado(agotado);
    try {
      await cambiarCarta(cs => { categoria(cs, catId).platos.find(x => x.id === p.id).agotado = agotado; });
      aviso(agotado ? p.nombre + ' quedó agotado' : p.nombre + ' está disponible otra vez');
    } catch (e) {
      input.checked = agotado;
      fila.classList.toggle('agotado', !agotado);
      estado.textContent = textoEstado(!agotado);
      fallo(e);
    }
  }

  async function moverCategoria(i, delta) {
    try {
      await cambiarCarta(cs => { [cs[i], cs[i + delta]] = [cs[i + delta], cs[i]]; });
    } catch (e) {
      fallo(e);
    }
  }

  // --- Editor de plato ---
  const ed = { catId: null, platoId: null, fotoNueva: null, fotoQuitada: false, subiendo: false, vista: null };
  const platoEditado = () => ed.platoId && categoria(categorias(), ed.catId).platos.find(p => p.id === ed.platoId);

  function editarPlato(c, p) {
    Object.assign(ed, { catId: c.id, platoId: p ? p.id : null, fotoNueva: null, fotoQuitada: false });
    $('#plato-titulo').textContent = p ? 'Editar plato' : 'Nuevo plato';
    $('#plato-nombre').value = p ? p.nombre : '';
    $('#plato-descripcion').value = (p && p.descripcion) || '';
    $('#plato-precio').value = p && p.precio != null ? miles(p.precio) : '';
    $('#plato-categoria').replaceChildren(...categorias().map(x => el('option', { value: x.id, texto: x.nombre })));
    $('#plato-categoria').value = c.id;
    $('#plato-etiqueta').value = (p && p.etiqueta) || '';
    $('#plato-disponible').checked = !(p && p.agotado);
    $('#plato-estado').textContent = textoEstado(!!(p && p.agotado));
    $('#plato-posicion').hidden = !p;
    $('#plato-borrar').hidden = !p;
    reiniciarBorrar($('#plato-borrar'), 'Borrar plato');
    $('#plato-error').textContent = '';
    pintarFoto(p && p.foto ? { nombre: p.foto } : null);
    actualizarPosicion();
    $('#editor-plato').showModal();
    if (!p) $('#plato-nombre').focus();
  }

  function pintarFoto(foto) {
    let nueva;
    if (foto) {
      nueva = el('img', { class: 'vista', id: 'plato-vista', alt: 'Foto del plato' });
      if (foto.url) nueva.src = foto.url; else mostrarFoto(nueva, foto.nombre);
    } else {
      nueva = el('div', { class: 'vista vacia', id: 'plato-vista', texto: 'Sin foto' });
    }
    $('#plato-vista').replaceWith(nueva);
    $('#plato-quitar-foto').hidden = !foto;
  }

  function actualizarPosicion() {
    const p = platoEditado();
    if (!p) return;
    const lista = categoria(categorias(), ed.catId).platos, i = lista.indexOf(p);
    $('#plato-subir').disabled = i <= 0;
    $('#plato-bajar').disabled = i >= lista.length - 1;
  }
  for (const [boton, delta] of [['#plato-subir', -1], ['#plato-bajar', 1]]) {
    $(boton).addEventListener('click', async () => {
      try {
        await cambiarCarta(cs => {
          const lista = categoria(cs, ed.catId).platos, i = lista.findIndex(p => p.id === ed.platoId);
          [lista[i], lista[i + delta]] = [lista[i + delta], lista[i]];
        });
      } catch (e) {
        fallo(e, '#plato-error');
      }
      actualizarPosicion();
    });
  }

  $('#plato-disponible').addEventListener('change', ev => {
    $('#plato-estado').textContent = textoEstado(!ev.target.checked);
  });

  $('#plato-precio').addEventListener('input', ev => {
    const d = ev.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 8);
    ev.target.value = d ? miles(d) : '';
  });

  $('#plato-elegir-foto').addEventListener('click', () => $('#plato-archivo').click());
  $('#plato-archivo').addEventListener('change', async ev => {
    const archivo = ev.target.files[0];
    ev.target.value = '';
    if (!archivo) return;
    const elegir = $('#plato-elegir-foto'), guardarBoton = $('#plato-guardar');
    ed.subiendo = true;
    guardarBoton.disabled = elegir.disabled = true;
    elegir.textContent = 'Preparando foto…';
    $('#plato-error').textContent = '';
    try {
      const blob = await comprimir(archivo);
      elegir.textContent = 'Subiendo foto…';
      const nombre = await BD.subirFoto(estado.slug, blob);
      // si cerraron el editor mientras subía, la foto no se usa
      if (!$('#editor-plato').open) { BD.borrarFotos(estado.slug, [nombre]); return; }
      if (ed.fotoNueva) BD.borrarFotos(estado.slug, [ed.fotoNueva]);
      ed.fotoNueva = nombre;
      ed.fotoQuitada = false;
      if (ed.vista) URL.revokeObjectURL(ed.vista);
      ed.vista = URL.createObjectURL(blob);
      pintarFoto({ url: ed.vista });
    } catch (e) {
      fallo(e, '#plato-error');
    } finally {
      ed.subiendo = false;
      guardarBoton.disabled = elegir.disabled = false;
      elegir.textContent = 'Tomar o escoger foto';
    }
  });
  $('#plato-quitar-foto').addEventListener('click', () => {
    if (ed.fotoNueva) { BD.borrarFotos(estado.slug, [ed.fotoNueva]); ed.fotoNueva = null; }
    ed.fotoQuitada = true;
    pintarFoto(null);
  });

  $('#form-plato').addEventListener('submit', async ev => {
    ev.preventDefault();
    if (ed.subiendo) return;
    const error = $('#plato-error');
    error.textContent = '';
    const nombre = $('#plato-nombre').value.trim();
    if (!nombre) { error.textContent = 'Escriba el nombre del plato.'; return; }
    const digitos = $('#plato-precio').value.replace(/\D/g, '');
    const datos = {
      nombre,
      descripcion: texto($('#plato-descripcion').value),
      precio: digitos ? Number(digitos) : null,
      etiqueta: texto($('#plato-etiqueta').value),
      agotado: !$('#plato-disponible').checked
    };
    const anterior = (platoEditado() || {}).foto || null;
    const foto = ed.fotoNueva || (ed.fotoQuitada ? null : anterior);
    const destino = $('#plato-categoria').value;
    await ocupado($('#plato-guardar'), async () => {
      try {
        await cambiarCarta(cs => {
          let plato;
          if (ed.platoId) {
            const origen = categoria(cs, ed.catId), i = origen.platos.findIndex(p => p.id === ed.platoId);
            plato = origen.platos[i];
            if (destino !== ed.catId) { origen.platos.splice(i, 1); categoria(cs, destino).platos.push(plato); }
          } else {
            plato = { id: crypto.randomUUID() };
            categoria(cs, destino).platos.push(plato);
          }
          Object.assign(plato, datos, { foto });
        });
        if (anterior && anterior !== foto) BD.borrarFotos(estado.slug, [anterior]);
        ed.fotoNueva = null; // ya quedó guardada: no se borra al cerrar
        $('#editor-plato').close();
        aviso('Guardado');
      } catch (e) {
        fallo(e, '#plato-error');
      }
    });
  });

  $('#plato-cancelar').addEventListener('click', () => $('#editor-plato').close());
  // Al cerrar sin guardar, la foto que se alcanzó a subir se borra
  $('#editor-plato').addEventListener('close', () => {
    if (ed.fotoNueva) { BD.borrarFotos(estado.slug, [ed.fotoNueva]); ed.fotoNueva = null; }
    if (ed.vista) { URL.revokeObjectURL(ed.vista); ed.vista = null; }
  });

  $('#plato-borrar').addEventListener('click', ev => {
    const boton = ev.currentTarget;
    confirmarDosVeces(boton, 'Borrar plato', '¿Seguro? Toque otra vez para borrar', () => ocupado(boton, async () => {
      const p = platoEditado();
      try {
        await cambiarCarta(cs => {
          const lista = categoria(cs, ed.catId).platos;
          lista.splice(lista.findIndex(x => x.id === p.id), 1);
        });
        BD.borrarFotos(estado.slug, [p.foto, ed.fotoNueva]);
        ed.fotoNueva = null;
        $('#editor-plato').close();
        aviso(p.nombre + ' se borró');
      } catch (e) {
        fallo(e, '#plato-error');
      }
    }));
  });

  // --- Editor de categoría ---
  let catEditadaId = null;

  function editarCategoria(c) {
    catEditadaId = c ? c.id : null;
    $('#categoria-titulo').textContent = c ? 'Editar categoría' : 'Nueva categoría';
    $('#categoria-nombre').value = c ? c.nombre : '';
    $('#categoria-nota').value = (c && c.nota) || '';
    $('#categoria-borrar').hidden = !c;
    reiniciarBorrar($('#categoria-borrar'), 'Borrar categoría');
    $('#categoria-error').textContent = '';
    $('#editor-categoria').showModal();
    if (!c) $('#categoria-nombre').focus();
  }
  $('#nueva-categoria').addEventListener('click', () => editarCategoria(null));
  $('#categoria-cancelar').addEventListener('click', () => $('#editor-categoria').close());

  $('#form-categoria').addEventListener('submit', async ev => {
    ev.preventDefault();
    const error = $('#categoria-error');
    error.textContent = '';
    const datos = { nombre: $('#categoria-nombre').value.trim(), nota: texto($('#categoria-nota').value) };
    if (!datos.nombre) { error.textContent = 'Escriba el nombre de la categoría.'; return; }
    await ocupado(ev.target.querySelector('[type=submit]'), async () => {
      try {
        await cambiarCarta(cs => {
          if (catEditadaId) Object.assign(categoria(cs, catEditadaId), datos);
          else cs.push({ id: crypto.randomUUID(), ...datos, platos: [] });
        });
        $('#editor-categoria').close();
        aviso('Guardado');
      } catch (e) {
        fallo(e, '#categoria-error');
      }
    });
  });

  $('#categoria-borrar').addEventListener('click', ev => {
    const boton = ev.currentTarget, c = categoria(categorias(), catEditadaId);
    const pregunta = c.platos.length
      ? '¿Seguro? Se borran también sus ' + c.platos.length + ' platos. Toque otra vez'
      : '¿Seguro? Toque otra vez para borrar';
    confirmarDosVeces(boton, 'Borrar categoría', pregunta, () => ocupado(boton, async () => {
      try {
        await cambiarCarta(cs => { cs.splice(cs.findIndex(x => x.id === c.id), 1); });
        BD.borrarFotos(estado.slug, c.platos.map(p => p.foto));
        $('#editor-categoria').close();
        aviso(c.nombre + ' se borró');
      } catch (e) {
        fallo(e, '#categoria-error');
      }
    }));
  });

  // ---------------------------------------------------------------------------
  // Datos del local
  // ---------------------------------------------------------------------------
  const CAMPOS = ['nombre', 'lugar', 'direccion', 'telefono', 'whatsapp', 'mapa', 'instagram', 'facebook', 'nota'];
  const NOMBRES = { mapa: 'Google Maps', instagram: 'Instagram', facebook: 'Facebook', telefono: 'teléfono', whatsapp: 'WhatsApp' };

  function pintarLocal() {
    for (const k of CAMPOS) $('#local-' + k).value = estado.datos[k] || '';
    $('#local-horario').replaceChildren(...estado.datos.horario.map(filaHorario));
    $('#local-error').textContent = '';
  }
  function filaHorario({ dias, horas } = {}) {
    const fila = el('div', { class: 'horario-fila' },
      el('input', { type: 'text', maxlength: 40, placeholder: 'Martes a jueves', 'aria-label': 'Días', value: dias || '' }),
      el('input', { type: 'text', maxlength: 40, placeholder: '4:00 – 10:30 p. m.', 'aria-label': 'Horas', value: horas || '' }),
      botonIcono('equis', 'Quitar este día', false, () => fila.remove()));
    return fila;
  }
  $('#agregar-horario').addEventListener('click', () => {
    const fila = filaHorario();
    $('#local-horario').append(fila);
    fila.querySelector('input').focus();
  });

  $('#form-local').addEventListener('submit', async ev => {
    ev.preventDefault();
    const error = $('#local-error');
    error.textContent = '';
    const datos = {};
    for (const k of CAMPOS) datos[k] = texto($('#local-' + k).value);
    if (!datos.nombre) { error.textContent = 'El nombre no puede quedar vacío.'; return; }
    for (const k of ['telefono', 'whatsapp']) {
      if (datos[k]) datos[k] = datos[k].replace(/[-().]/g, ' ').replace(/\s+/g, ' ').trim();
      if (datos[k] && !/^[0-9 +]{7,20}$/.test(datos[k])) { error.textContent = 'El ' + NOMBRES[k] + ' solo lleva números.'; return; }
    }
    for (const k of ['mapa', 'instagram', 'facebook']) {
      if (datos[k] && !/^https:\/\/[^\s"<>]+$/.test(datos[k])) { error.textContent = 'El enlace de ' + NOMBRES[k] + ' debe empezar por https://'; return; }
    }
    datos.horario = [...$('#local-horario').children]
      .map(f => { const [dias, horas] = [...f.querySelectorAll('input')].map(i => i.value.trim()); return { dias, horas }; })
      .filter(h => h.dias || h.horas);
    await ocupado(ev.target.querySelector('[type=submit]'), async () => {
      try {
        await guardar(datos);
        $('#panel-nombre').textContent = estado.datos.nombre;
        aviso('Datos guardados');
      } catch (e) {
        fallo(e, '#local-error');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Arranque
  // ---------------------------------------------------------------------------
  (async function arrancar() {
    if (!BD.configurado) return mostrar('config');
    if (await BD.sesionActiva()) return abrirPanel();
    mostrar('entrar');
  })();
})();

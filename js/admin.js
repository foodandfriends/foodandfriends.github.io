/*
  Panel del dueño: entrar, y cambiar platos, precios, fotos y datos del local.
  Los permisos no se deciden aquí: todo cambio pasa por las reglas de Supabase (supabase/esquema.sql).
*/
(function () {
  // El panel no se deja mostrar dentro de otra página (evita que lo disfracen para robar clics)
  if (window.top !== window.self) { document.body.replaceChildren(); return; }

  const C = window.CONFIG;
  const $ = s => document.querySelector(s);
  const estado = { restaurantes: [], restaurante: null, categorias: [], platos: [] };

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
  const texto = v => { const t = (v || '').trim(); return t || null; };
  const porOrden = (a, b) => a.orden - b.orden || (a.id < b.id ? -1 : 1);
  const siguienteOrden = lista => lista.reduce((m, x) => Math.max(m, x.orden), -10) + 10;
  const platosDe = categoriaId => estado.platos.filter(p => p.categoria_id === categoriaId).sort(porOrden);

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
    if (e && e.estado === 401) {
      SB.salir();
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
  function preferido(id) {
    try { return id ? localStorage.setItem('carta-restaurante', id) : localStorage.getItem('carta-restaurante'); } catch { return null; }
  }

  // Achica la foto en el celular antes de subirla: máximo 900 px y menos de 1 MB
  async function comprimir(archivo) {
    let imagen;
    try { imagen = await createImageBitmap(archivo); } catch {
      throw new Error('Esa imagen no se pudo abrir. Pruebe con otra foto.');
    }
    const escala = Math.min(1, 900 / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    lienzo.getContext('2d').drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    for (const [tipo, calidad] of [['image/webp', 0.82], ['image/jpeg', 0.82], ['image/jpeg', 0.6]]) {
      const blob = await new Promise(ok => lienzo.toBlob(ok, tipo, calidad));
      if (blob && blob.type === tipo && blob.size < 1000000) return blob;
    }
    throw new Error('La foto quedó muy pesada. Pruebe con otra.');
  }

  // ---------------------------------------------------------------------------
  // Entrar, recordar contraseña, contraseña nueva
  // ---------------------------------------------------------------------------
  $('#form-entrar').addEventListener('submit', async ev => {
    ev.preventDefault();
    const correo = $('#entrar-correo').value.trim(), clave = $('#entrar-clave').value;
    const error = $('#entrar-error');
    error.textContent = '';
    if (!correo || !clave) { error.textContent = 'Escriba el correo y la contraseña.'; return; }
    await ocupado(ev.target.querySelector('[type=submit]'), async () => {
      try {
        await SB.entrar(correo, clave);
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
        await SB.recordar(correo, location.origin + location.pathname);
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
        await SB.cambiarClave(a);
        ev.target.reset();
        aviso('Contraseña guardada');
        await abrirPanel();
      } catch (e) {
        fallo(e, '#clave-error');
      }
    });
  });
  $('#ir-clave').addEventListener('click', () => { $('#clave-volver').hidden = false; mostrar('clave'); });
  $('#clave-volver').addEventListener('click', () => mostrar('panel'));

  $('#salir').addEventListener('click', async () => {
    await SB.salir();
    estado.restaurante = null;
    $('#vista-entrar form').reset();
    mostrar('entrar');
  });

  // ---------------------------------------------------------------------------
  // Panel
  // ---------------------------------------------------------------------------
  async function abrirPanel() {
    mostrar('cargando');
    try {
      const duenos = await SB.leer('duenos', 'select=restaurante_id');
      if (!duenos.length) {
        await SB.salir();
        mostrar('entrar');
        $('#entrar-error').textContent = 'Esta cuenta no tiene un restaurante asignado.';
        return;
      }
      const ids = duenos.map(d => d.restaurante_id).join(',');
      estado.restaurantes = await SB.leer('restaurantes', 'id=in.(' + ids + ')&select=*&order=nombre.asc');
      estado.restaurante = estado.restaurantes.find(r => r.id === preferido()) || estado.restaurantes[0];
      pintarSelector();
      await cargarCarta();
      $('#panel-correo').textContent = SB.usuario ? SB.usuario.email : '';
      $('#clave-volver').hidden = true;
      mostrar('panel');
    } catch (e) {
      mostrar('entrar');
      fallo(e, '#entrar-error');
    }
  }

  async function cargarCarta() {
    const r = estado.restaurante;
    const filtro = 'restaurante_id=eq.' + r.id + '&order=orden.asc,id.asc&select=*';
    [estado.categorias, estado.platos] = await Promise.all([SB.leer('categorias', filtro), SB.leer('platos', filtro)]);
    $('#panel-nombre').textContent = r.nombre;
    $('#ver-carta').href = C.raiz;
    pintarPlatos();
    pintarLocal();
  }

  function pintarSelector() {
    const s = $('#elegir-restaurante');
    s.hidden = estado.restaurantes.length < 2;
    s.replaceChildren(...estado.restaurantes.map(r => el('option', { value: r.id, texto: r.nombre })));
    s.value = estado.restaurante.id;
  }
  $('#elegir-restaurante').addEventListener('change', async ev => {
    estado.restaurante = estado.restaurantes.find(r => r.id === ev.target.value);
    preferido(estado.restaurante.id);
    try { await cargarCarta(); } catch (e) { fallo(e); }
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
    const cats = estado.categorias.slice().sort(porOrden);
    if (!cats.length) {
      cont.replaceChildren(el('p', { class: 'vacio', texto: 'Todavía no hay categorías. Cree la primera, por ejemplo "Hamburguesas".' }));
      return;
    }
    cont.replaceChildren(...cats.map((c, i) => {
      const platos = platosDe(c.id);
      return el('section', { class: 'categoria' },
        el('div', { class: 'categoria-cab' },
          el('h2', {}, c.nombre + ' ', el('small', { texto: '(' + platos.length + ')' })),
          botonIcono('arriba', 'Subir categoría', i === 0, () => mover(cats, i, -1, 'categorias')),
          botonIcono('abajo', 'Bajar categoría', i === cats.length - 1, () => mover(cats, i, 1, 'categorias')),
          botonIcono('lapiz', 'Editar categoría', false, () => editarCategoria(c))),
        platos.length
          ? el('ul', { class: 'lista' }, ...platos.map(filaPlato))
          : el('p', { class: 'vacio', texto: 'Sin platos todavía.' }),
        el('button', { class: 'btn chico agregar', type: 'button', texto: '+ Agregar plato', onclick: () => editarPlato(null, c) }));
    }));
  }

  function filaPlato(p) {
    const mini = p.foto
      ? el('img', { class: 'miniatura', src: SB.fotoUrl(p.foto), alt: '', loading: 'lazy' })
      : el('span', { class: 'miniatura vacia', texto: 'Foto' });
    const agotado = el('input', { type: 'checkbox', 'aria-label': 'Agotado: ' + p.nombre });
    agotado.checked = p.agotado;
    agotado.addEventListener('change', () => cambiarAgotado(p, agotado));
    return el('li', { class: 'fila' + (p.agotado ? ' agotado' : '') },
      el('button', { class: 'abrir', type: 'button', onclick: () => editarPlato(p) },
        mini,
        el('span', { class: 'texto' },
          el('strong', { texto: p.nombre }),
          el('span', { texto: pesos(p.precio) + (p.etiqueta ? ' · ' + p.etiqueta : '') }))),
      el('label', { class: 'interruptor' }, agotado, 'Agotado'));
  }

  async function cambiarAgotado(p, input) {
    const valor = input.checked, fila = input.closest('.fila');
    fila.classList.toggle('agotado', valor);
    try {
      Object.assign(p, await SB.cambiar('platos', p.id, { agotado: valor }));
      aviso(valor ? p.nombre + ' quedó agotado' : p.nombre + ' está disponible otra vez');
    } catch (e) {
      input.checked = !valor;
      fila.classList.toggle('agotado', !valor);
      fallo(e);
    }
  }

  // Cambia el orden y guarda solo lo que se movió
  async function mover(lista, i, delta, tabla) {
    const j = i + delta;
    if (j < 0 || j >= lista.length) return;
    const nueva = lista.slice();
    [nueva[i], nueva[j]] = [nueva[j], nueva[i]];
    const cambios = nueva.map((x, k) => [x, k * 10]).filter(([x, orden]) => x.orden !== orden);
    try {
      await Promise.all(cambios.map(async ([x, orden]) => Object.assign(x, await SB.cambiar(tabla, x.id, { orden }))));
    } catch (e) {
      fallo(e);
      await cargarCarta().catch(() => {});
    }
    pintarPlatos();
  }

  // --- Editor de plato ---
  const ed = { plato: null, fotoNueva: null, fotoQuitada: false, subiendo: false, vista: null };

  function editarPlato(p, cat) {
    Object.assign(ed, { plato: p, fotoNueva: null, fotoQuitada: false });
    $('#plato-titulo').textContent = p ? 'Editar plato' : 'Nuevo plato';
    $('#plato-nombre').value = p ? p.nombre : '';
    $('#plato-descripcion').value = (p && p.descripcion) || '';
    $('#plato-precio').value = p && p.precio != null ? miles(p.precio) : '';
    $('#plato-categoria').replaceChildren(...estado.categorias.slice().sort(porOrden).map(c => el('option', { value: c.id, texto: c.nombre })));
    $('#plato-categoria').value = p ? p.categoria_id : cat.id;
    $('#plato-etiqueta').value = (p && p.etiqueta) || '';
    $('#plato-agotado').checked = !!(p && p.agotado);
    $('#plato-posicion').hidden = !p;
    $('#plato-borrar').hidden = !p;
    reiniciarBorrar($('#plato-borrar'), 'Borrar plato');
    $('#plato-error').textContent = '';
    pintarFoto(p && p.foto ? SB.fotoUrl(p.foto) : null);
    actualizarPosicion();
    $('#editor-plato').showModal();
    if (!p) $('#plato-nombre').focus();
  }

  function pintarFoto(url) {
    const nueva = url
      ? el('img', { class: 'vista', id: 'plato-vista', src: url, alt: 'Foto del plato' })
      : el('div', { class: 'vista vacia', id: 'plato-vista', texto: 'Sin foto' });
    $('#plato-vista').replaceWith(nueva);
    $('#plato-quitar-foto').hidden = !url;
  }

  function actualizarPosicion() {
    if (!ed.plato) return;
    const lista = platosDe(ed.plato.categoria_id), i = lista.indexOf(ed.plato);
    $('#plato-subir').disabled = i <= 0;
    $('#plato-bajar').disabled = i >= lista.length - 1;
  }
  for (const [boton, delta] of [['#plato-subir', -1], ['#plato-bajar', 1]]) {
    $(boton).addEventListener('click', async () => {
      const lista = platosDe(ed.plato.categoria_id);
      await mover(lista, lista.indexOf(ed.plato), delta, 'platos');
      actualizarPosicion();
    });
  }

  $('#plato-precio').addEventListener('input', ev => {
    const d = ev.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 8);
    ev.target.value = d ? miles(d) : '';
  });

  $('#plato-elegir-foto').addEventListener('click', () => $('#plato-archivo').click());
  $('#plato-archivo').addEventListener('change', async ev => {
    const archivo = ev.target.files[0];
    ev.target.value = '';
    if (!archivo) return;
    const elegir = $('#plato-elegir-foto'), guardar = $('#plato-guardar');
    ed.subiendo = true;
    guardar.disabled = elegir.disabled = true;
    elegir.textContent = 'Subiendo foto…';
    $('#plato-error').textContent = '';
    try {
      const blob = await comprimir(archivo);
      const ruta = estado.restaurante.id + '/' + crypto.randomUUID() + (blob.type === 'image/webp' ? '.webp' : '.jpg');
      await SB.subirFoto(ruta, blob);
      // si cerraron el editor mientras subía, la foto no se usa
      if (!$('#editor-plato').open) { SB.borrarFotos([ruta]); return; }
      if (ed.fotoNueva) SB.borrarFotos([ed.fotoNueva]);
      ed.fotoNueva = ruta;
      ed.fotoQuitada = false;
      if (ed.vista) URL.revokeObjectURL(ed.vista);
      ed.vista = URL.createObjectURL(blob);
      pintarFoto(ed.vista);
    } catch (e) {
      fallo(e, '#plato-error');
    } finally {
      ed.subiendo = false;
      guardar.disabled = elegir.disabled = false;
      elegir.textContent = 'Tomar o escoger foto';
    }
  });
  $('#plato-quitar-foto').addEventListener('click', () => {
    if (ed.fotoNueva) { SB.borrarFotos([ed.fotoNueva]); ed.fotoNueva = null; }
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
      categoria_id: $('#plato-categoria').value,
      etiqueta: texto($('#plato-etiqueta').value),
      agotado: $('#plato-agotado').checked
    };
    const anterior = ed.plato && ed.plato.foto;
    if (ed.fotoNueva) datos.foto = ed.fotoNueva;
    else if (ed.fotoQuitada) datos.foto = null;
    await ocupado($('#plato-guardar'), async () => {
      try {
        if (ed.plato) {
          if (datos.categoria_id !== ed.plato.categoria_id) datos.orden = siguienteOrden(platosDe(datos.categoria_id));
          Object.assign(ed.plato, await SB.cambiar('platos', ed.plato.id, datos));
        } else {
          datos.restaurante_id = estado.restaurante.id;
          datos.orden = siguienteOrden(platosDe(datos.categoria_id));
          estado.platos.push(await SB.crear('platos', datos));
        }
        if (anterior && 'foto' in datos && datos.foto !== anterior) SB.borrarFotos([anterior]);
        ed.fotoNueva = null; // ya quedó guardada: no se borra al cerrar
        $('#editor-plato').close();
        pintarPlatos();
        aviso('Guardado');
      } catch (e) {
        fallo(e, '#plato-error');
      }
    });
  });

  $('#plato-cancelar').addEventListener('click', () => $('#editor-plato').close());
  // Al cerrar sin guardar, la foto que se alcanzó a subir se borra
  $('#editor-plato').addEventListener('close', () => {
    if (ed.fotoNueva) { SB.borrarFotos([ed.fotoNueva]); ed.fotoNueva = null; }
    if (ed.vista) { URL.revokeObjectURL(ed.vista); ed.vista = null; }
  });

  $('#plato-borrar').addEventListener('click', ev => {
    const boton = ev.currentTarget;
    confirmarDosVeces(boton, 'Borrar plato', '¿Seguro? Toque otra vez para borrar', () => ocupado(boton, async () => {
      const p = ed.plato;
      try {
        await SB.borrar('platos', p.id);
        estado.platos = estado.platos.filter(x => x !== p);
        SB.borrarFotos([p.foto, ed.fotoNueva].filter(Boolean));
        ed.fotoNueva = null;
        $('#editor-plato').close();
        pintarPlatos();
        aviso(p.nombre + ' se borró');
      } catch (e) {
        fallo(e, '#plato-error');
      }
    }));
  });

  // --- Editor de categoría ---
  let catEditada = null;

  function editarCategoria(c) {
    catEditada = c;
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
        if (catEditada) {
          Object.assign(catEditada, await SB.cambiar('categorias', catEditada.id, datos));
        } else {
          datos.restaurante_id = estado.restaurante.id;
          datos.orden = siguienteOrden(estado.categorias);
          estado.categorias.push(await SB.crear('categorias', datos));
        }
        $('#editor-categoria').close();
        pintarPlatos();
        aviso('Guardado');
      } catch (e) {
        fallo(e, '#categoria-error');
      }
    });
  });

  $('#categoria-borrar').addEventListener('click', ev => {
    const boton = ev.currentTarget, c = catEditada, platos = platosDe(c.id);
    const pregunta = platos.length
      ? '¿Seguro? Se borran también sus ' + platos.length + ' platos. Toque otra vez'
      : '¿Seguro? Toque otra vez para borrar';
    confirmarDosVeces(boton, 'Borrar categoría', pregunta, () => ocupado(boton, async () => {
      try {
        await SB.borrar('categorias', c.id);
        estado.categorias = estado.categorias.filter(x => x !== c);
        estado.platos = estado.platos.filter(p => p.categoria_id !== c.id);
        SB.borrarFotos(platos.map(p => p.foto).filter(Boolean));
        $('#editor-categoria').close();
        pintarPlatos();
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
    const r = estado.restaurante;
    for (const k of CAMPOS) $('#local-' + k).value = r[k] || '';
    $('#local-horario').replaceChildren(...(r.horario || []).map(filaHorario));
    $('#local-error').textContent = '';
  }
  function filaHorario([dias, horas] = ['', '']) {
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
      .map(f => [...f.querySelectorAll('input')].map(i => i.value.trim()))
      .filter(([d, h]) => d || h);
    await ocupado(ev.target.querySelector('[type=submit]'), async () => {
      try {
        Object.assign(estado.restaurante, await SB.cambiar('restaurantes', estado.restaurante.id, datos));
        $('#panel-nombre').textContent = estado.restaurante.nombre;
        pintarSelector();
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
    if (!SB.configurado) return mostrar('config');
    const hash = new URLSearchParams(location.hash.slice(1));
    if (hash.get('error')) {
      history.replaceState(null, '', location.pathname + location.search);
      mostrar('entrar');
      $('#entrar-error').textContent = 'Ese enlace ya no sirve (vence rápido). Pida uno nuevo con "Olvidé mi contraseña".';
      return;
    }
    if (SB.sesionDelEnlace() === 'recovery') return mostrar('clave');
    if (await SB.sesionActiva()) return abrirPanel();
    mostrar('entrar');
  })();
})();

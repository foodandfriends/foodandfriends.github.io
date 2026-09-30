/*
  Conexión con Supabase sin librerías: sesión del dueño, datos de la carta y fotos.
  Expone window.SB. Los errores salen con mensajes en español para mostrárselos al dueño.
*/
(function () {
  const C = window.CONFIG;
  const BASE = (C.supabaseUrl || '').replace(/\/+$/, '');
  const LLAVE = 'carta-sesion';
  let sesion = leer();
  let renovando = null;

  function leer() {
    try { return JSON.parse(localStorage.getItem(LLAVE)); } catch { return null; }
  }
  function guardar(s) {
    sesion = s;
    try { s ? localStorage.setItem(LLAVE, JSON.stringify(s)) : localStorage.removeItem(LLAVE); } catch { /* sin almacenamiento */ }
  }
  function deRespuesta(d) {
    return {
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expira: Date.now() + (d.expires_in || 3600) * 1000,
      usuario: d.user ? { id: d.user.id, email: d.user.email } : sesion && sesion.usuario
    };
  }

  class ErrorCarta extends Error {
    constructor(estado, datos) {
      super(mensaje(estado, datos));
      this.estado = estado;
    }
  }
  function mensaje(estado, d) {
    const t = ((d && (d.error_description || d.msg || d.message || d.error || d.hint)) || '') + '';
    if (estado === 0) return 'No hay conexión. Revise el internet e intente otra vez.';
    if (/invalid login credentials|invalid_grant/i.test(t)) return 'El correo o la contraseña no son correctos.';
    if (estado === 429 || /rate limit|too many/i.test(t)) return 'Demasiados intentos. Espere unos minutos y vuelva a intentar.';
    if (/máximo de/i.test(t)) return t;
    if (/password.*(short|characters|weak)/i.test(t)) return 'La contraseña es muy corta o muy fácil. Use al menos 10 caracteres.';
    if (/payload too large|exceeded the maximum/i.test(t) || estado === 413) return 'La foto pesa demasiado.';
    if (estado === 401 || estado === 403 || /jwt|row-level security|permission denied/i.test(t)) return 'No tiene permiso para hacer eso. Vuelva a entrar.';
    if (/violates check constraint/i.test(t)) return 'Hay un dato que no es válido. Revise lo que escribió.';
    return 'Algo salió mal (' + (t || 'error ' + estado) + ').';
  }

  async function llamar(ruta, { metodo = 'GET', cuerpo, cabeceras = {}, token } = {}) {
    if (!BASE) throw new ErrorCarta(0, { message: 'Falta configurar Supabase en js/config.js' });
    // Sin sesión basta la clave pública; el token solo va cuando el dueño entró
    const h = { apikey: C.supabaseAnon, ...cabeceras };
    if (token) h.Authorization = 'Bearer ' + token;
    let body = cuerpo;
    if (cuerpo !== undefined && !(cuerpo instanceof Blob)) {
      h['Content-Type'] = 'application/json';
      body = JSON.stringify(cuerpo);
    }
    let r;
    try {
      r = await fetch(BASE + ruta, { method: metodo, headers: h, body });
    } catch {
      throw new ErrorCarta(0);
    }
    const texto = await r.text();
    let datos = null;
    try { datos = texto ? JSON.parse(texto) : null; } catch { datos = { message: texto }; }
    if (!r.ok) throw new ErrorCarta(r.status, datos);
    return datos;
  }

  // Token vigente del dueño; si está por vencer, lo renueva
  async function token() {
    if (!sesion) return null;
    if (Date.now() < sesion.expira - 60000) return sesion.access_token;
    if (!renovando) {
      renovando = llamar('/auth/v1/token?grant_type=refresh_token', { metodo: 'POST', cuerpo: { refresh_token: sesion.refresh_token } })
        .then(d => { guardar(deRespuesta(d)); return sesion.access_token; })
        .catch(e => { if (e.estado) guardar(null); throw e; })
        .finally(() => { renovando = null; });
    }
    return renovando;
  }
  async function conSesion(ruta, opciones = {}) {
    const t = await token();
    if (!t) throw new ErrorCarta(401, { message: 'jwt' });
    return llamar(ruta, { ...opciones, token: t });
  }

  const q = encodeURIComponent;

  window.SB = {
    ErrorCarta,
    configurado: !!BASE,
    get usuario() { return sesion && sesion.usuario; },

    async entrar(email, clave) {
      const d = await llamar('/auth/v1/token?grant_type=password', { metodo: 'POST', cuerpo: { email, password: clave } });
      guardar(deRespuesta(d));
      return sesion.usuario;
    },
    async salir() {
      const t = sesion && sesion.access_token;
      guardar(null);
      if (t) await llamar('/auth/v1/logout', { metodo: 'POST', token: t }).catch(() => {});
    },
    async recordar(email, volverA) {
      await llamar('/auth/v1/recover?redirect_to=' + q(volverA), { metodo: 'POST', cuerpo: { email } });
    },
    // Al abrir el enlace del correo, Supabase deja la sesión en el #hash de la dirección
    sesionDelEnlace() {
      const p = new URLSearchParams(location.hash.slice(1));
      if (!p.get('access_token')) return null;
      guardar(deRespuesta({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: +p.get('expires_in') }));
      history.replaceState(null, '', location.pathname + location.search);
      return p.get('type');
    },
    async cambiarClave(clave) {
      const d = await conSesion('/auth/v1/user', { metodo: 'PUT', cuerpo: { password: clave } });
      if (d && d.email) guardar({ ...sesion, usuario: { id: d.id, email: d.email } });
    },
    async sesionActiva() {
      try { return !!(await token()); } catch { return false; }
    },

    // Lectura con la sesión del dueño (el panel) o anónima (la carta pública)
    async leer(tabla, filtros, publico) {
      const ruta = '/rest/v1/' + tabla + '?' + filtros;
      return sesion && !publico ? conSesion(ruta) : llamar(ruta);
    },
    // Cambios: si las reglas no dejan, Supabase no da error sino 0 filas; aquí se vuelve error
    async crear(tabla, fila) {
      const d = await conSesion('/rest/v1/' + tabla, { metodo: 'POST', cuerpo: fila, cabeceras: { Prefer: 'return=representation' } });
      if (!d || !d.length) throw new ErrorCarta(403, {});
      return d[0];
    },
    async cambiar(tabla, id, cambios) {
      const d = await conSesion('/rest/v1/' + tabla + '?id=eq.' + q(id), { metodo: 'PATCH', cuerpo: cambios, cabeceras: { Prefer: 'return=representation' } });
      if (!d || !d.length) throw new ErrorCarta(403, {});
      return d[0];
    },
    async borrar(tabla, id) {
      const d = await conSesion('/rest/v1/' + tabla + '?id=eq.' + q(id), { metodo: 'DELETE', cabeceras: { Prefer: 'return=representation' } });
      if (!d || !d.length) throw new ErrorCarta(403, {});
    },

    fotoUrl(ruta) {
      if (!ruta || !BASE) return '';
      return BASE + '/storage/v1/object/public/fotos/' + ruta.split('/').map(q).join('/');
    },
    async subirFoto(ruta, blob) {
      await conSesion('/storage/v1/object/fotos/' + ruta, { metodo: 'POST', cuerpo: blob, cabeceras: { 'Content-Type': blob.type, 'x-upsert': 'false' } });
    },
    async borrarFotos(rutas) {
      if (!rutas.length) return;
      await conSesion('/storage/v1/object/fotos', { metodo: 'DELETE', cuerpo: { prefixes: rutas } }).catch(() => {});
    }
  };
})();

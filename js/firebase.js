/*
  Conexión con Firebase sin librerías (su API REST): sesión del dueño, la carta y las fotos.
  Expone window.BD. Los errores salen con mensajes en español para mostrárselos al dueño.

  Cada restaurante es un documento restaurantes/<slug> con toda la carta adentro, y las fotos van
  aparte en restaurantes/<slug>/fotos/<id>. Quién puede cambiar qué lo deciden las reglas
  (firebase/reglas.rules), no este archivo.
*/
(function () {
  const C = window.CONFIG;
  const LLAVE = C.firebaseApiKey || '';
  const AUTH = 'https://identitytoolkit.googleapis.com/v1/accounts:';
  const TOKEN = 'https://securetoken.googleapis.com/v1/token';
  const DOCS = 'https://firestore.googleapis.com/v1/projects/' + (C.firebaseProyecto || '') + '/databases/(default)/documents/';
  const GUARDADA = 'carta-sesion';
  const enc = encodeURIComponent;
  let sesion = leerSesion();
  let renovando = null;

  function leerSesion() {
    try { return JSON.parse(localStorage.getItem(GUARDADA)); } catch { return null; }
  }
  function guardarSesion(s) {
    sesion = s;
    try { s ? localStorage.setItem(GUARDADA, JSON.stringify(s)) : localStorage.removeItem(GUARDADA); } catch { /* sin almacenamiento */ }
  }
  // Sirve para la respuesta de entrar y para la de renovar el token
  function deRespuesta(d, email) {
    return {
      token: d.idToken || d.id_token,
      renovar: d.refreshToken || d.refresh_token,
      expira: Date.now() + Number(d.expiresIn || d.expires_in || 3600) * 1000,
      usuario: { id: d.localId || d.user_id, email: d.email || email }
    };
  }

  class ErrorCarta extends Error {
    constructor(estado, codigo) {
      super(mensaje(estado, codigo));
      this.estado = estado;
      this.codigo = String(codigo || '');
    }
  }
  function mensaje(estado, codigo) {
    const c = String(codigo || '');
    if (estado === 0) return 'No hay conexión. Revise el internet e intente otra vez.';
    if (/INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD|EMAIL_NOT_FOUND|INVALID_EMAIL/.test(c)) return 'El correo o la contraseña no son correctos.';
    if (/USER_DISABLED/.test(c)) return 'Esta cuenta está desactivada.';
    if (/TOO_MANY_ATTEMPTS|RESOURCE_EXHAUSTED/.test(c) || estado === 429) return 'Demasiados intentos. Espere unos minutos y vuelva a intentar.';
    if (/WEAK_PASSWORD|PASSWORD_DOES_NOT_MEET/.test(c)) return 'La contraseña es muy corta o muy fácil. Use al menos 10 caracteres.';
    if (/CREDENTIAL_TOO_OLD/.test(c)) return 'Por seguridad, salga, vuelva a entrar y cambie la contraseña apenas entre.';
    if (/TOKEN_EXPIRED|INVALID_ID_TOKEN|INVALID_REFRESH_TOKEN|USER_NOT_FOUND/.test(c) || estado === 401) return 'La sesión terminó. Entre otra vez.';
    if (/FAILED_PRECONDITION/.test(c)) return 'La carta cambió desde otro celular. Ya se cargó lo último: repita el cambio.';
    if (/PERMISSION_DENIED/.test(c) || estado === 403) return 'No tiene permiso para hacer eso, o hay un dato que no es válido.';
    return 'Algo salió mal (' + (c || 'error ' + estado) + ').';
  }

  async function llamar(url, { metodo = 'GET', cuerpo, formulario, token } = {}) {
    const h = {};
    let body;
    if (formulario) { h['Content-Type'] = 'application/x-www-form-urlencoded'; body = new URLSearchParams(formulario); }
    else if (cuerpo !== undefined) { h['Content-Type'] = 'application/json'; body = JSON.stringify(cuerpo); }
    if (token) h.Authorization = 'Bearer ' + token;
    let r;
    try {
      r = await fetch(url, { method: metodo, headers: h, body });
    } catch {
      throw new ErrorCarta(0);
    }
    const texto = await r.text();
    let d = null;
    try { d = texto ? JSON.parse(texto) : null; } catch { /* respuesta sin JSON */ }
    if (!r.ok) {
      const e = (d && d.error) || {};
      throw new ErrorCarta(r.status, (e.status || '') + ' ' + (e.message || ''));
    }
    return d;
  }

  // Token vigente del dueño; si está por vencer, lo renueva
  async function token() {
    if (!sesion) return null;
    if (Date.now() < sesion.expira - 60000) return sesion.token;
    if (!renovando) {
      renovando = llamar(TOKEN + '?key=' + LLAVE, { metodo: 'POST', formulario: { grant_type: 'refresh_token', refresh_token: sesion.renovar } })
        .then(d => { guardarSesion(deRespuesta(d, sesion.usuario.email)); return sesion.token; })
        .catch(e => { if (e.estado) guardarSesion(null); throw e; })
        .finally(() => { renovando = null; });
    }
    return renovando;
  }
  async function conSesion(url, opciones = {}) {
    const t = await token();
    if (!t) throw new ErrorCarta(401);
    return llamar(url, { ...opciones, token: t });
  }

  // Firestore guarda cada valor con su tipo: {stringValue: "..."}, {integerValue: "3"}, etc.
  function aValor(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === 'string') return { stringValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(aValor) } };
    return { mapValue: { fields: aCampos(v) } };
  }
  function aCampos(objeto) {
    const campos = {};
    for (const [k, v] of Object.entries(objeto)) if (v !== undefined) campos[k] = aValor(v);
    return campos;
  }
  function deValor(v) {
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(deValor);
    if ('mapValue' in v) return deCampos(v.mapValue.fields);
    if ('bytesValue' in v) return v.bytesValue;
    if ('timestampValue' in v) return v.timestampValue;
    return null;
  }
  function deCampos(campos = {}) {
    const objeto = {};
    for (const [k, v] of Object.entries(campos)) objeto[k] = deValor(v);
    return objeto;
  }
  const doc = (ruta, extra = '') => DOCS + ruta + '?key=' + LLAVE + extra;

  function aBase64(blob) {
    return new Promise((ok, no) => {
      const lector = new FileReader();
      lector.onload = () => ok(String(lector.result).split(',')[1]);
      lector.onerror = () => no(new Error('No se pudo leer la foto.'));
      lector.readAsDataURL(blob);
    });
  }
  function deBase64(texto) {
    const binario = atob(texto);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return bytes;
  }
  // Las fotos nunca cambian (una foto nueva tiene otro id), así que se guardan en el celular para siempre
  const cacheFotos = window.caches ? caches.open('carta-fotos').catch(() => null) : Promise.resolve(null);
  const urlFoto = (slug, nombre) => C.raiz + 'datos/fotos/' + slug + '/' + nombre;

  window.BD = {
    ErrorCarta,
    configurado: !!(LLAVE && C.firebaseProyecto),
    get usuario() { return sesion && sesion.usuario; },

    // --- Sesión del dueño ---
    async entrar(email, clave) {
      const d = await llamar(AUTH + 'signInWithPassword?key=' + LLAVE, { metodo: 'POST', cuerpo: { email, password: clave, returnSecureToken: true } });
      guardarSesion(deRespuesta(d, email));
      return sesion.usuario;
    },
    salir() {
      guardarSesion(null);
    },
    // Firebase manda un correo con un enlace a su propia página para poner la contraseña nueva
    async recordar(email) {
      await llamar(AUTH + 'sendOobCode?key=' + LLAVE, { metodo: 'POST', cuerpo: { requestType: 'PASSWORD_RESET', email } });
    },
    async cambiarClave(clave) {
      const t = await token();
      if (!t) throw new ErrorCarta(401);
      const d = await llamar(AUTH + 'update?key=' + LLAVE, { metodo: 'POST', cuerpo: { idToken: t, password: clave, returnSecureToken: true } });
      guardarSesion(deRespuesta(d, sesion.usuario.email));
    },
    async sesionActiva() {
      try { return !!(await token()); } catch { return false; }
    },

    // --- La carta ---
    async carta(slug) {
      return deCampos((await llamar(doc('restaurantes/' + enc(slug)))).fields);
    },
    async misRestaurantes() {
      try {
        return deCampos((await conSesion(doc('duenos/' + enc(sesion.usuario.id)))).fields).restaurantes || [];
      } catch (e) {
        if (e.estado === 404) return [];
        throw e;
      }
    },
    // Con la versión (updateTime) se evita pisar cambios hechos desde otro celular
    async leerRestaurante(slug) {
      try {
        const d = await conSesion(doc('restaurantes/' + enc(slug)));
        return { datos: deCampos(d.fields), version: d.updateTime };
      } catch (e) {
        if (e.estado === 404) return null;
        throw e;
      }
    },
    async crearRestaurante(slug, datos) {
      const d = await conSesion(DOCS + 'restaurantes?documentId=' + enc(slug) + '&key=' + LLAVE, { metodo: 'POST', cuerpo: { fields: aCampos(datos) } });
      return { datos: deCampos(d.fields), version: d.updateTime };
    },
    async guardarRestaurante(slug, cambios, version) {
      const campos = Object.keys(cambios).map(c => '&updateMask.fieldPaths=' + enc(c)).join('');
      const d = await conSesion(doc('restaurantes/' + enc(slug), campos + '&currentDocument.updateTime=' + enc(version)), { metodo: 'PATCH', cuerpo: { fields: aCampos(cambios) } });
      return d.updateTime;
    },

    // --- Fotos ---
    async subirFoto(slug, blob) {
      const nombre = crypto.randomUUID() + (blob.type === 'image/webp' ? '.webp' : '.jpg');
      await conSesion(DOCS + 'restaurantes/' + enc(slug) + '/fotos?documentId=' + enc(nombre) + '&key=' + LLAVE, {
        metodo: 'POST',
        cuerpo: { fields: { datos: { bytesValue: await aBase64(blob) }, tipo: { stringValue: blob.type } } }
      });
      const cache = await cacheFotos;
      if (cache) cache.put(urlFoto(slug, nombre), new Response(blob, { headers: { 'Content-Type': blob.type } })).catch(() => {});
      return nombre;
    },
    async borrarFotos(slug, nombres) {
      await Promise.all(nombres.filter(Boolean).map(n => conSesion(doc('restaurantes/' + enc(slug) + '/fotos/' + enc(n)), { metodo: 'DELETE' }).catch(() => {})));
    },
    // Dirección para mostrar una foto: primero la guardada en el celular, luego la copia del sitio
    // (gratis y rápida, la deja el respaldo diario) y, si todavía no está, Firebase
    async foto(slug, nombre) {
      const clave = urlFoto(slug, nombre);
      const cache = await cacheFotos;
      const guardada = cache && await cache.match(clave);
      if (guardada) return URL.createObjectURL(await guardada.blob());
      let blob = null;
      try {
        const r = await fetch(clave);
        if (r.ok && /^image\//.test(r.headers.get('Content-Type') || '')) blob = await r.blob();
      } catch { /* sin copia en el sitio */ }
      if (!blob) {
        if (!LLAVE) throw new ErrorCarta(404);
        const f = (await llamar(doc('restaurantes/' + enc(slug) + '/fotos/' + enc(nombre)))).fields;
        blob = new Blob([deBase64(f.datos.bytesValue)], { type: f.tipo.stringValue });
      }
      if (cache) cache.put(clave, new Response(blob, { headers: { 'Content-Type': blob.type } })).catch(() => {});
      return URL.createObjectURL(blob);
    }
  };
})();

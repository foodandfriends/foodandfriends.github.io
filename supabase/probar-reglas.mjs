// Ataca las reglas de seguridad en el Supabase real y confirma que todo lo indebido queda bloqueado.
// No instala nada: usa js/config.js y la API pública, como lo haría un intruso.
//
//   DUENO_CORREO=... DUENO_CLAVE=... node supabase/probar-reglas.mjs
//
// El correo y la clave son de un dueño del restaurante de js/config.js. Para probar que un dueño no
// se puede meter en otro restaurante, cree antes uno de mentiras en el SQL Editor:
//   insert into public.restaurantes (slug, nombre) values ('prueba-intrusion', 'Prueba');
// Lo que la prueba crea en el restaurante propio lo borra al final.
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import vm from 'node:vm';

const contexto = { URL, window: {}, document: { currentScript: { src: 'https://sitio/js/config.js' } } };
vm.createContext(contexto);
vm.runInContext(readFileSync(new URL('../js/config.js', import.meta.url), 'utf8'), contexto);
const { supabaseUrl, supabaseAnon, restaurante: slug } = contexto.window.CONFIG;
const BASE = supabaseUrl.replace(/\/+$/, '');
const { DUENO_CORREO, DUENO_CLAVE } = process.env;
if (!BASE || !DUENO_CORREO || !DUENO_CLAVE) {
  console.log('Falta supabaseUrl en js/config.js o DUENO_CORREO / DUENO_CLAVE');
  process.exit(1);
}

async function api(ruta, { metodo = 'GET', cuerpo, token, tipo, cabeceras = {} } = {}) {
  const h = { apikey: supabaseAnon, Prefer: 'return=representation', ...cabeceras };
  if (token) h.Authorization = 'Bearer ' + token;
  let body = cuerpo;
  if (cuerpo !== undefined && !(cuerpo instanceof Uint8Array)) { h['Content-Type'] = 'application/json'; body = JSON.stringify(cuerpo); }
  if (tipo) h['Content-Type'] = tipo;
  const r = await fetch(BASE + ruta, { method: metodo, headers: h, body });
  const texto = await r.text();
  let datos; try { datos = JSON.parse(texto); } catch { datos = texto; }
  return { ok: r.ok, estado: r.status, datos };
}
// Bloqueado = error de la API, o la API responde bien pero no tocó ninguna fila
const bloqueado = r => !r.ok || (Array.isArray(r.datos) && r.datos.length === 0);
const paso = r => r.ok;
let fallas = 0;
function espera(nombre, r, bien) {
  const ok = bien(r);
  if (!ok) fallas++;
  console.log((ok ? '  ok     ' : '  FALLA  ') + nombre + (ok ? '' : '  → ' + r.estado + ' ' + JSON.stringify(r.datos).slice(0, 200)));
}
// Una imagen webp de 1 x 1
const WEBP = Uint8Array.from(Buffer.from('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=', 'base64'));

const [propio] = (await api('/rest/v1/restaurantes?slug=eq.' + slug + '&select=id')).datos;
const [ajeno] = (await api('/rest/v1/restaurantes?slug=eq.prueba-intrusion&select=id')).datos;
if (!propio) { console.log('No existe el restaurante ' + slug); process.exit(1); }

console.log('Cliente sin sesión');
espera('lee la carta', await api('/rest/v1/platos?select=nombre&limit=1'), paso);
espera('no ve los dueños', await api('/rest/v1/duenos?select=*'), bloqueado);
espera('no crea categorías', await api('/rest/v1/categorias', { metodo: 'POST', cuerpo: { restaurante_id: propio.id, nombre: 'x' } }), bloqueado);
espera('no cambia precios', await api('/rest/v1/platos?restaurante_id=eq.' + propio.id, { metodo: 'PATCH', cuerpo: { precio: 1 } }), bloqueado);
espera('no borra platos', await api('/rest/v1/platos?restaurante_id=eq.' + propio.id, { metodo: 'DELETE' }), bloqueado);
espera('no cambia el restaurante', await api('/rest/v1/restaurantes?id=eq.' + propio.id, { metodo: 'PATCH', cuerpo: { nombre: 'hack' } }), bloqueado);
espera('no sube fotos', await api(`/storage/v1/object/fotos/${propio.id}/${randomUUID()}.webp`, { metodo: 'POST', cuerpo: WEBP, tipo: 'image/webp' }), bloqueado);
espera('no ve las funciones internas', await api('/rest/v1/rpc/es_dueno', { metodo: 'POST', cuerpo: { r: propio.id } }), bloqueado);

const sesion = await api('/auth/v1/token?grant_type=password', { metodo: 'POST', cuerpo: { email: DUENO_CORREO, password: DUENO_CLAVE } });
if (!sesion.ok) { console.log('No se pudo entrar como dueño: ' + JSON.stringify(sesion.datos)); process.exit(1); }
const token = sesion.datos.access_token;
const creados = { categorias: [], fotos: [] };

try {
  console.log('Dueño en su restaurante');
  const cat = await api('/rest/v1/categorias', { metodo: 'POST', token, cuerpo: { restaurante_id: propio.id, nombre: 'Prueba de reglas', orden: 9999 } });
  espera('crea una categoría', cat, paso);
  if (cat.ok) creados.categorias.push(cat.datos[0].id);
  const plato = cat.ok && await api('/rest/v1/platos', { metodo: 'POST', token, cuerpo: { restaurante_id: propio.id, categoria_id: cat.datos[0].id, nombre: 'Plato de prueba', precio: 1000 } });
  espera('crea un plato', plato, paso);
  if (plato.ok) espera('lo marca agotado', await api('/rest/v1/platos?id=eq.' + plato.datos[0].id, { metodo: 'PATCH', token, cuerpo: { agotado: true } }), r => r.ok && r.datos.length === 1);
  const ruta = `${propio.id}/${randomUUID()}.webp`;
  const subida = await api('/storage/v1/object/fotos/' + ruta, { metodo: 'POST', token, cuerpo: WEBP, tipo: 'image/webp' });
  espera('sube una foto a su carpeta', subida, paso);
  if (subida.ok) creados.fotos.push(ruta);
  espera('no cambia su slug', await api('/rest/v1/restaurantes?id=eq.' + propio.id, { metodo: 'PATCH', token, cuerpo: { slug: 'otro' } }), bloqueado);
  espera('no crea restaurantes', await api('/rest/v1/restaurantes', { metodo: 'POST', token, cuerpo: { slug: 'nuevo-' + Date.now(), nombre: 'x' } }), bloqueado);
  espera('no sube archivos que no son fotos', await api(`/storage/v1/object/fotos/${propio.id}/virus.html`, { metodo: 'POST', token, cuerpo: new TextEncoder().encode('<script>'), tipo: 'text/html' }), bloqueado);
  espera('no sube fotos de más de 1 MB', await api(`/storage/v1/object/fotos/${propio.id}/${randomUUID()}.jpg`, { metodo: 'POST', token, cuerpo: new Uint8Array(1_200_000), tipo: 'image/jpeg' }), bloqueado);
  espera('no pone un link javascript:', await api('/rest/v1/restaurantes?id=eq.' + propio.id, { metodo: 'PATCH', token, cuerpo: { mapa: 'javascript:alert(1)' } }), bloqueado);

  if (ajeno) {
    console.log('Dueño intentando meterse en otro restaurante');
    espera('no crea categorías allá', await api('/rest/v1/categorias', { metodo: 'POST', token, cuerpo: { restaurante_id: ajeno.id, nombre: 'x' } }), bloqueado);
    espera('no le cambia el nombre', await api('/rest/v1/restaurantes?id=eq.' + ajeno.id, { metodo: 'PATCH', token, cuerpo: { nombre: 'hack' } }), bloqueado);
    espera('no se vuelve dueño', await api('/rest/v1/duenos', { metodo: 'POST', token, cuerpo: { restaurante_id: ajeno.id, user_id: sesion.datos.user.id } }), bloqueado);
    espera('no sube fotos a su carpeta', await api(`/storage/v1/object/fotos/${ajeno.id}/${randomUUID()}.webp`, { metodo: 'POST', token, cuerpo: WEBP, tipo: 'image/webp' }), bloqueado);
  } else {
    console.log('(sin restaurante prueba-intrusion: no se probó la entrada a otro restaurante)');
  }
} finally {
  for (const id of creados.categorias) await api('/rest/v1/categorias?id=eq.' + id, { metodo: 'DELETE', token });
  if (creados.fotos.length) await api('/storage/v1/object/fotos', { metodo: 'DELETE', token, cuerpo: { prefixes: creados.fotos } });
  await api('/auth/v1/logout', { metodo: 'POST', token });
}

console.log(fallas ? `\n${fallas} FALLAS` : '\nTodo lo indebido quedó bloqueado');
process.exit(fallas ? 1 : 0);

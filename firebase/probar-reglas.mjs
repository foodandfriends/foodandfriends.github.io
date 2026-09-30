// Ataca las reglas de Firestore en el proyecto real y confirma que todo lo indebido queda bloqueado.
// No instala nada: usa js/config.js y la API pública, como lo haría un intruso.
//
//   DUENO_CORREO=correo@del-dueno.com node firebase/probar-reglas.mjs
//
// Pide la contraseña del dueño sin mostrarla. Correrlo después de haber entrado una vez al panel
// (la primera entrada crea la carta). Lo que la prueba crea lo borra al final.
import { randomUUID } from 'node:crypto';
import { CONFIG, firestore as api, entrar } from '../scripts/comun.mjs';

const slug = CONFIG.restaurante;
const correo = process.env.DUENO_CORREO;
if (!CONFIG.firebaseApiKey || !CONFIG.firebaseProyecto || !correo) {
  console.log('Falta firebaseApiKey / firebaseProyecto en js/config.js, o DUENO_CORREO');
  process.exit(1);
}

const texto = s => ({ stringValue: s });
const bytes = b => ({ bytesValue: Buffer.from(b).toString('base64') });
const mascara = (...c) => c.map(x => '&updateMask.fieldPaths=' + x).join('');

let fallas = 0;
function espera(nombre, r, bien) {
  const ok = bien(r);
  if (!ok) fallas++;
  console.log((ok ? '  ok     ' : '  FALLA  ') + nombre + (ok ? '' : '  → ' + r.estado + ' ' + JSON.stringify(r.datos).slice(0, 200)));
}
const paso = r => r.ok;
const bloqueado = r => r.estado === 403;
// Una imagen webp de 1 x 1
const WEBP = Buffer.from('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=', 'base64');
const fotoNueva = () => `restaurantes/${slug}/fotos/${randomUUID()}.webp`;
const crearFoto = (ruta, contenido, token, tipo = 'image/webp') => {
  const [padre, id] = [ruta.slice(0, ruta.lastIndexOf('/')), ruta.slice(ruta.lastIndexOf('/') + 1)];
  return api(padre, { metodo: 'POST', token, extra: '&documentId=' + encodeURIComponent(id), campos: { datos: bytes(contenido), tipo: texto(tipo) } });
};

console.log('Cliente sin sesión');
const carta = await api('restaurantes/' + slug);
espera('lee la carta', carta, paso);
espera('no cambia la carta', await api('restaurantes/' + slug, { metodo: 'PATCH', extra: mascara('nombre'), campos: { nombre: texto('hack') } }), bloqueado);
espera('no crea restaurantes', await api('restaurantes', { metodo: 'POST', extra: '&documentId=intruso-' + Date.now(), campos: { nombre: texto('x') } }), bloqueado);
espera('no ve los dueños', await api('duenos/' + randomUUID()), bloqueado);
espera('no sube fotos', await crearFoto(fotoNueva(), WEBP), bloqueado);
espera('no ve otras colecciones', await api('usuarios/cualquiera'), bloqueado);

let token, uid;
try {
  ({ token, uid } = await entrar(correo));
} catch (e) {
  console.log(e.message);
  process.exit(1);
}
const creadas = [];

try {
  console.log('Dueño en su restaurante');
  espera('ve su documento de dueño', await api('duenos/' + uid, { token }), paso);
  espera('no ve el de otro dueño', await api('duenos/' + randomUUID(), { token }), bloqueado);
  if (carta.ok) {
    const nombre = carta.datos.fields.nombre;
    espera('guarda la carta', await api('restaurantes/' + slug, { metodo: 'PATCH', token, extra: mascara('nombre'), campos: { nombre } }), paso);
  }
  espera('no agrega campos raros', await api('restaurantes/' + slug, { metodo: 'PATCH', token, extra: mascara('duenos'), campos: { duenos: { arrayValue: { values: [texto('x')] } } } }), bloqueado);
  espera('no pone un link javascript:', await api('restaurantes/' + slug, { metodo: 'PATCH', token, extra: mascara('mapa'), campos: { mapa: texto('javascript:alert(1)') } }), bloqueado);
  espera('no deja el nombre vacío', await api('restaurantes/' + slug, { metodo: 'PATCH', token, extra: mascara('nombre'), campos: { nombre: texto('') } }), bloqueado);
  espera('no borra la carta', await api('restaurantes/' + slug, { metodo: 'DELETE', token }), bloqueado);
  const ruta = fotoNueva();
  const subida = await crearFoto(ruta, WEBP, token);
  espera('sube una foto', subida, paso);
  if (subida.ok) {
    creadas.push(ruta);
    espera('no cambia una foto ya subida', await api(ruta, { metodo: 'PATCH', token, campos: { datos: bytes('x'), tipo: texto('image/webp') } }), bloqueado);
  }
  espera('no sube archivos con otro nombre', await crearFoto(`restaurantes/${slug}/fotos/virus.html`, WEBP, token), bloqueado);
  espera('no sube otro tipo de archivo', await crearFoto(fotoNueva(), WEBP, token, 'text/html'), bloqueado);
  espera('no sube fotos de más de 150 KB', await crearFoto(fotoNueva(), Buffer.alloc(160_000), token), bloqueado);

  console.log('Dueño intentando meterse en otro restaurante');
  const otro = 'intruso-' + Date.now();
  espera('no crea otro restaurante', await api('restaurantes', { metodo: 'POST', token, extra: '&documentId=' + otro, campos: { nombre: texto('x'), horario: { arrayValue: {} }, categorias: { arrayValue: {} } } }), bloqueado);
  espera('no cambia otro restaurante', await api('restaurantes/' + otro, { metodo: 'PATCH', token, extra: mascara('nombre'), campos: { nombre: texto('hack') } }), bloqueado);
  espera('no sube fotos a otro restaurante', await crearFoto(`restaurantes/${otro}/fotos/${randomUUID()}.webp`, WEBP, token), bloqueado);
  espera('no se vuelve dueño de otro', await api('duenos/' + uid, { metodo: 'PATCH', token, extra: mascara('restaurantes'), campos: { restaurantes: { arrayValue: { values: [texto(slug), texto(otro)] } } } }), bloqueado);
} finally {
  for (const ruta of creadas) await api(ruta, { metodo: 'DELETE', token });
}

console.log(fallas ? `\n${fallas} FALLAS` : '\nTodo lo indebido quedó bloqueado');
process.exit(fallas ? 1 : 0);

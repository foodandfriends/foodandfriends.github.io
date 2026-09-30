// Imita lo mínimo de Firebase (login, Firestore, fotos) para probar la carta y el panel en este computador,
// sin tocar el Firebase real. Sirve el sitio apuntando a sí mismo.
//
//   node herramientas/simulador.mjs      → http://localhost:3212 (carta) y /admin/ (panel)
//
// Entra con dueno@prueba.co / clave-de-prueba-123 (solo existen aquí). Empieza sin carta, como la primera
// vez de un dueño, y todo se borra al cerrarlo. No revisa las reglas de seguridad de verdad: eso se prueba
// en Firebase con firebase/probar-reglas.mjs.
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const PUERTO = 3212;
const SITIO = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
const ORIGEN = 'http://localhost:' + PUERTO;
const USUARIO = { id: randomUUID().replace(/-/g, ''), email: 'dueno@prueba.co', clave: 'clave-de-prueba-123' };
const docs = new Map(); // ruta → { fields, updateTime }
docs.set('duenos/' + USUARIO.id, { fields: { restaurantes: { arrayValue: { values: [{ stringValue: 'food-friends' }] } } }, updateTime: new Date().toISOString() });
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg' };

const enviar = (res, estado, datos, tipo = 'application/json') => {
  res.writeHead(estado, { 'Content-Type': tipo, 'Access-Control-Allow-Origin': '*' });
  res.end(datos === undefined ? '' : Buffer.isBuffer(datos) || typeof datos === 'string' ? datos : JSON.stringify(datos));
};
const error = (res, estado, status, message) => enviar(res, estado, { error: { code: estado, status, message } });
const cuerpo = req => new Promise(ok => { const p = []; req.on('data', x => p.push(x)); req.on('end', () => ok(Buffer.concat(p).toString())); });
const tokens = () => ({ idToken: 'tok-' + USUARIO.id + '-' + Date.now(), refreshToken: 'ref-' + randomUUID(), expiresIn: '3600', localId: USUARIO.id, email: USUARIO.email });
const usuarioDe = req => (req.headers.authorization || '').startsWith('Bearer tok-' + USUARIO.id) ? USUARIO : null;
const esDueno = (u, slug) => u && docs.get('duenos/' + u.id).fields.restaurantes.arrayValue.values.some(v => v.stringValue === slug);
const ahora = () => new Date(Date.now() + Math.random()).toISOString();

http.createServer(async (req, res) => {
  const url = new URL(req.url, ORIGEN);
  const ruta = decodeURIComponent(url.pathname);
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }); return res.end(); }
  const u = usuarioDe(req);

  // --- Login ---
  if (ruta === '/idt/v1/accounts:signInWithPassword') {
    const b = JSON.parse(await cuerpo(req));
    if (b.email === USUARIO.email && b.password === USUARIO.clave) return enviar(res, 200, tokens());
    return error(res, 400, 'INVALID_ARGUMENT', 'INVALID_LOGIN_CREDENTIALS');
  }
  if (ruta === '/idt/v1/accounts:sendOobCode') return enviar(res, 200, { email: JSON.parse(await cuerpo(req)).email });
  // Enlace de "Olvidé mi contraseña": aquí el código siempre es "codigo-de-prueba"
  if (ruta === '/idt/v1/accounts:resetPassword') {
    const b = JSON.parse(await cuerpo(req));
    if (b.oobCode !== 'codigo-de-prueba') return enviar(res, 400, { error: { message: 'INVALID_OOB_CODE' } });
    if (b.newPassword) USUARIO.clave = b.newPassword;
    return enviar(res, 200, { email: USUARIO.email, requestType: 'PASSWORD_RESET' });
  }
  if (ruta === '/idt/v1/accounts:update') {
    const b = JSON.parse(await cuerpo(req));
    if (!String(b.idToken).startsWith('tok-' + USUARIO.id)) return error(res, 400, 'INVALID_ARGUMENT', 'INVALID_ID_TOKEN');
    USUARIO.clave = b.password;
    return enviar(res, 200, tokens());
  }
  if (ruta === '/st/v1/token') { const t = tokens(); return enviar(res, 200, { id_token: t.idToken, refresh_token: t.refreshToken, expires_in: '3600', user_id: t.localId }); }

  // --- Firestore ---
  const m = /^\/fs\/v1\/projects\/[^/]+\/databases\/\(default\)\/documents\/(.+)$/.exec(ruta);
  if (m) {
    const camino = m[1];
    const partes = camino.split('/');
    const slug = partes[0] !== 'restaurantes' ? null : partes[1] || url.searchParams.get('documentId');
    if (req.method === 'GET') {
      if (partes[0] === 'duenos' && (!u || partes[1] !== u.id)) return error(res, 403, 'PERMISSION_DENIED', 'Missing or insufficient permissions.');
      const d = docs.get(camino);
      return d ? enviar(res, 200, { name: camino, ...d }) : error(res, 404, 'NOT_FOUND', 'No document');
    }
    if (!esDueno(u, slug)) return error(res, 403, 'PERMISSION_DENIED', 'Missing or insufficient permissions.');
    if (req.method === 'POST') {
      const nueva = camino + '/' + url.searchParams.get('documentId');
      if (docs.has(nueva)) return error(res, 409, 'ALREADY_EXISTS', 'exists');
      const { fields } = JSON.parse(await cuerpo(req));
      if (fields.datos && Buffer.from(fields.datos.bytesValue, 'base64').length > 150000) return error(res, 403, 'PERMISSION_DENIED', 'too big');
      docs.set(nueva, { fields, updateTime: ahora() });
      if (fields.datos) console.log('foto subida', nueva, Buffer.from(fields.datos.bytesValue, 'base64').length, 'bytes', fields.tipo.stringValue);
      return enviar(res, 200, { name: nueva, ...docs.get(nueva) });
    }
    if (req.method === 'PATCH') {
      const d = docs.get(camino);
      const version = url.searchParams.get('currentDocument.updateTime');
      if (!d || (version && version !== d.updateTime)) return error(res, 400, 'FAILED_PRECONDITION', 'the stored version does not match');
      const { fields } = JSON.parse(await cuerpo(req));
      for (const campo of url.searchParams.getAll('updateMask.fieldPaths')) d.fields[campo] = fields[campo];
      d.updateTime = ahora();
      return enviar(res, 200, { name: camino, ...d });
    }
    if (req.method === 'DELETE') {
      if (partes[2] !== 'fotos') return error(res, 403, 'PERMISSION_DENIED', 'no');
      docs.delete(camino);
      console.log('foto borrada', camino);
      return enviar(res, 200, {});
    }
  }

  // --- El sitio, apuntando a este simulador ---
  let archivo = join(SITIO, ruta);
  if (existsSync(archivo) && statSync(archivo).isDirectory()) archivo = join(archivo, 'index.html');
  if (!archivo.startsWith(SITIO) || !existsSync(archivo)) return enviar(res, 404, 'No existe', 'text/html');
  let contenido = readFileSync(archivo);
  if (ruta === '/js/config.js') {
    contenido = contenido.toString().replace(/firebaseApiKey: "[^"]*"/, 'firebaseApiKey: "local"').replace(/firebaseProyecto: "[^"]*"/, 'firebaseProyecto: "prueba"');
  } else if (ruta === '/js/firebase.js') {
    contenido = contenido.toString()
      .replace('https://identitytoolkit.googleapis.com', ORIGEN + '/idt')
      .replace('https://securetoken.googleapis.com', ORIGEN + '/st')
      .replace('https://firestore.googleapis.com', ORIGEN + '/fs');
  } else if (extname(archivo) === '.html') {
    contenido = contenido.toString().replaceAll('https://firestore.googleapis.com', 'https://firestore.googleapis.com ' + ORIGEN);
  }
  enviar(res, 200, contenido, TIPOS[extname(archivo)] || 'application/octet-stream');
}).listen(PUERTO, () => console.log('Simulador en ' + ORIGEN + ' — dueño: ' + USUARIO.email + ' / ' + USUARIO.clave));

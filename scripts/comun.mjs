// Lo que comparten los scripts de la terminal: la configuración, entrar como dueño y hablar con Firestore.
import { readFileSync } from 'node:fs';
import readline from 'node:readline';
import vm from 'node:vm';

const contexto = { URL, window: {}, document: { currentScript: { src: 'https://sitio/js/config.js' } } };
vm.createContext(contexto);
vm.runInContext(readFileSync(new URL('../js/config.js', import.meta.url), 'utf8'), contexto);
export const CONFIG = contexto.window.CONFIG;

const FIRESTORE = 'https://firestore.googleapis.com';
const AUTH = 'https://identitytoolkit.googleapis.com';
export const DOCS = `${FIRESTORE}/v1/projects/${CONFIG.firebaseProyecto}/databases/(default)/documents/`;

// Firestore guarda cada valor con su tipo: {stringValue: "..."}, {integerValue: "3"}, etc.
export function aValor(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Buffer.isBuffer(v)) return { bytesValue: v.toString('base64') };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(aValor) } };
  return { mapValue: { fields: aCampos(v) } };
}
export function aCampos(objeto) {
  return Object.fromEntries(Object.entries(objeto).filter(([, v]) => v !== undefined).map(([k, v]) => [k, aValor(v)]));
}
export function deValor(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(deValor);
  if ('mapValue' in v) return deCampos(v.mapValue.fields);
  if ('bytesValue' in v) return v.bytesValue;
  return null;
}
export function deCampos(campos = {}) {
  return Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, deValor(v)]));
}

// Llama a Firestore y devuelve { ok, estado, datos } sin lanzar errores
export async function firestore(ruta, { metodo = 'GET', campos, token, extra = '' } = {}) {
  const h = {};
  if (token) h.Authorization = 'Bearer ' + token;
  let body;
  if (campos) { h['Content-Type'] = 'application/json'; body = JSON.stringify({ fields: campos }); }
  const r = await fetch(DOCS + ruta + '?key=' + CONFIG.firebaseApiKey + extra, { method: metodo, headers: h, body });
  const texto = await r.text();
  let datos; try { datos = JSON.parse(texto); } catch { datos = texto; }
  return { ok: r.ok, estado: r.status, datos };
}

export function preguntar(pregunta, oculta = false) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const respuesta = new Promise(ok => rl.question(pregunta, ok));
  if (oculta) rl._writeToOutput = () => {}; // ya salió la pregunta: lo que se escriba no se muestra
  return respuesta.then(r => { rl.close(); if (oculta) process.stdout.write('\n'); return r; });
}

// Entra como dueño; la contraseña se pide sin mostrarla (o sale de DUENO_CLAVE)
export async function entrar(correo) {
  const clave = process.env.DUENO_CLAVE || await preguntar('Contraseña del dueño (no se ve al escribir): ', true);
  const r = await fetch(`${AUTH}/v1/accounts:signInWithPassword?key=${CONFIG.firebaseApiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: correo, password: clave, returnSecureToken: true })
  });
  const d = await r.json();
  if (!d.idToken) throw new Error('No se pudo entrar: ' + ((d.error && d.error.message) || r.status));
  return { token: d.idToken, uid: d.localId };
}

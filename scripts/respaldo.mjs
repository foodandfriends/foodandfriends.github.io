// Copia de la carta desde Firebase a datos/<restaurante>.json y de sus fotos a datos/fotos/<restaurante>/.
// La corre GitHub Actions todos los días (.github/workflows/respaldo.yml); a mano: node scripts/respaldo.mjs
// Sirve de respaldo (el plan gratis de Firebase no hace copias), la carta pública la usa si Firebase
// no responde, y las fotos se sirven desde aquí (gratis) en vez de gastar el límite de Firebase.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'node:fs';
import vm from 'node:vm';

const contexto = { URL, window: {}, document: { currentScript: { src: 'https://sitio/js/config.js' } } };
vm.createContext(contexto);
vm.runInContext(readFileSync(new URL('../js/config.js', import.meta.url), 'utf8'), contexto);
const { firebaseApiKey, firebaseProyecto, restaurante } = contexto.window.CONFIG;

if (!firebaseApiKey || !firebaseProyecto) {
  console.log('Firebase todavía no está configurado en js/config.js: no hay nada que respaldar.');
  process.exit(0);
}

const DOCS = `https://firestore.googleapis.com/v1/projects/${firebaseProyecto}/databases/(default)/documents/`;
async function leer(ruta) {
  const r = await fetch(DOCS + ruta + '?key=' + firebaseApiKey);
  if (!r.ok) throw new Error(`${ruta}: ${r.status} ${await r.text()}`);
  return r.json();
}
function valor(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(valor);
  if ('mapValue' in v) return campos(v.mapValue.fields);
  if ('bytesValue' in v) return v.bytesValue;
  return null;
}
function campos(f = {}) {
  return Object.fromEntries(Object.entries(f).map(([k, v]) => [k, valor(v)]));
}

const carta = campos((await leer('restaurantes/' + encodeURIComponent(restaurante))).fields);
mkdirSync(new URL('../datos/', import.meta.url), { recursive: true });
writeFileSync(new URL(`../datos/${restaurante}.json`, import.meta.url), JSON.stringify(carta, null, 2) + '\n');

// Fotos: solo se bajan las nuevas y se quitan las que ya no usa ningún plato
const carpeta = new URL(`../datos/fotos/${restaurante}/`, import.meta.url);
mkdirSync(carpeta, { recursive: true });
const usadas = new Set((carta.categorias || []).flatMap(c => (c.platos || []).map(p => p.foto)).filter(Boolean));
let nuevas = 0, quitadas = 0;
for (const nombre of usadas) {
  if (!/^[0-9a-f-]{36}\.(webp|jpg)$/.test(nombre) || existsSync(new URL(nombre, carpeta))) continue;
  const foto = campos((await leer(`restaurantes/${encodeURIComponent(restaurante)}/fotos/${nombre}`)).fields);
  writeFileSync(new URL(nombre, carpeta), Buffer.from(foto.datos, 'base64'));
  nuevas++;
}
for (const nombre of readdirSync(carpeta)) {
  if (!usadas.has(nombre)) { rmSync(new URL(nombre, carpeta)); quitadas++; }
}

const platos = (carta.categorias || []).reduce((n, c) => n + (c.platos || []).length, 0);
console.log(`Respaldo de ${restaurante}: ${(carta.categorias || []).length} categorías, ${platos} platos, ${usadas.size} fotos (${nuevas} nuevas, ${quitadas} quitadas)`);

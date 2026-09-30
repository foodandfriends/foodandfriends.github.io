// Copia de la carta desde Firebase a datos/<restaurante>.json y de sus fotos a datos/fotos/<restaurante>/.
// La corre GitHub Actions todos los días (.github/workflows/respaldo.yml); a mano: node scripts/respaldo.mjs
// Sirve de respaldo (el plan gratis de Firebase no hace copias), la carta pública la usa si Firebase
// no responde, y las fotos se sirven desde aquí (gratis) en vez de gastar el límite de Firebase.
import { writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { CONFIG, firestore, deCampos } from './comun.mjs';

const { firebaseApiKey, firebaseProyecto, restaurante } = CONFIG;
if (!firebaseApiKey || !firebaseProyecto) {
  console.log('Firebase todavía no está configurado en js/config.js: no hay nada que respaldar.');
  process.exit(0);
}

async function leer(ruta) {
  const r = await firestore(ruta);
  if (!r.ok) throw new Error(`${ruta}: ${r.estado} ${JSON.stringify(r.datos)}`);
  return deCampos(r.datos.fields);
}

const carta = await leer('restaurantes/' + encodeURIComponent(restaurante));
mkdirSync(new URL('../datos/', import.meta.url), { recursive: true });
// Firebase entrega los campos cada vez en otro orden: se ordenan para que el archivo solo cambie
// cuando cambia la carta (si no, habría una copia "nueva" todos los días sin ningún cambio)
const ordenado = v => Array.isArray(v) ? v.map(ordenado)
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, ordenado(v[k])])) : v;
writeFileSync(new URL(`../datos/${restaurante}.json`, import.meta.url), JSON.stringify(ordenado(carta), null, 2) + '\n');

// Fotos: solo se bajan las nuevas y se quitan las que ya no usa ningún plato
const carpeta = new URL(`../datos/fotos/${restaurante}/`, import.meta.url);
mkdirSync(carpeta, { recursive: true });
const usadas = new Set((carta.categorias || []).flatMap(c => (c.platos || []).map(p => p.foto)).filter(Boolean));
let nuevas = 0, quitadas = 0;
for (const nombre of usadas) {
  if (!/^[0-9a-f-]{36}\.(webp|jpg)$/.test(nombre) || existsSync(new URL(nombre, carpeta))) continue;
  const foto = await leer(`restaurantes/${encodeURIComponent(restaurante)}/fotos/${nombre}`);
  writeFileSync(new URL(nombre, carpeta), Buffer.from(foto.datos, 'base64'));
  nuevas++;
}
for (const nombre of readdirSync(carpeta)) {
  if (!usadas.has(nombre)) { rmSync(new URL(nombre, carpeta)); quitadas++; }
}

const platos = (carta.categorias || []).reduce((n, c) => n + (c.platos || []).length, 0);
console.log(`Respaldo de ${restaurante}: ${(carta.categorias || []).length} categorías, ${platos} platos, ${usadas.size} fotos (${nuevas} nuevas, ${quitadas} quitadas)`);

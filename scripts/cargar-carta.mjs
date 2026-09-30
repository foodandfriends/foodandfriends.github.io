// Carga una carta completa en Firebase desde un archivo, con sus fotos.
//
//   DUENO_CORREO=correo@del-dueno.com node scripts/cargar-carta.mjs [archivo]
//
// Sin archivo usa la carta de muestra de la propuesta (disenos/muestra.js: platos, precios y fotos de
// ejemplo). El archivo puede ser un .js con window.MENU, como ese, o un .json con el mismo formato.
// Las fotos con dirección https se bajan ya achicadas y se suben a Firebase. Si la carta ya tiene
// platos, pregunta antes de reemplazarla. Pide la contraseña del dueño sin mostrarla.
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { CONFIG, firestore, aCampos, deCampos, entrar, preguntar } from './comun.mjs';

const slug = CONFIG.restaurante;
const archivo = process.argv[2] || fileURLToPath(new URL('../disenos/muestra.js', import.meta.url));
const correo = process.env.DUENO_CORREO;
if (!correo) {
  console.log('Falta DUENO_CORREO. Uso: DUENO_CORREO=correo@del-dueno.com node scripts/cargar-carta.mjs [archivo]');
  process.exit(1);
}

function leerCarta(ruta) {
  const texto = readFileSync(ruta, 'utf8');
  if (ruta.endsWith('.json')) return JSON.parse(texto);
  const contexto = { window: {} };
  vm.createContext(contexto);
  vm.runInContext(texto, contexto);
  return contexto.window.MENU;
}

// Las fotos de Unsplash se piden ya del tamaño de la carta (500 px, webp); otras se usan si ya son livianas
async function bajarFoto(direccion) {
  const url = new URL(direccion);
  const intentos = url.hostname === 'images.unsplash.com'
    ? [70, 50].map(q => { const u = new URL(url); u.search = `?w=500&h=392&fit=crop&fm=webp&q=${q}`; return u; })
    : [url];
  for (const u of intentos) {
    const r = await fetch(u);
    if (!r.ok) throw new Error(`No se pudo bajar la foto ${direccion} (${r.status})`);
    const tipo = (r.headers.get('content-type') || '').split(';')[0];
    const datos = Buffer.from(await r.arrayBuffer());
    if (['image/webp', 'image/jpeg'].includes(tipo) && datos.length <= 140000) return { datos, tipo };
  }
  throw new Error('La foto ' + direccion + ' pesa más de 140 KB o no es webp/jpg');
}

const menu = leerCarta(archivo);
const { token } = await entrar(correo);

const actual = await firestore('restaurantes/' + slug, { token });
if (!actual.ok) throw new Error('No se pudo leer la carta: ' + JSON.stringify(actual.datos));
const anterior = deCampos(actual.datos.fields);
const platosAntes = (anterior.categorias || []).reduce((n, c) => n + (c.platos || []).length, 0);
if (platosAntes) {
  const r = await preguntar(`La carta ya tiene ${platosAntes} platos. ¿Reemplazarla? Escriba "si" para seguir: `);
  if (r.trim().toLowerCase() !== 'si') { console.log('No se cambió nada.'); process.exit(0); }
}

// Primero las fotos (si algo falla aquí, la carta queda como estaba)
const subidas = [];
const categorias = [];
for (const c of menu.categorias || []) {
  const platos = [];
  for (const p of c.platos || []) {
    let foto = null;
    if (p.foto) {
      const { datos, tipo } = await bajarFoto(p.foto);
      foto = randomUUID() + (tipo === 'image/webp' ? '.webp' : '.jpg');
      const r = await firestore(`restaurantes/${slug}/fotos`, { metodo: 'POST', token, extra: '&documentId=' + foto, campos: aCampos({ datos, tipo }) });
      if (!r.ok) throw new Error('No se pudo subir la foto de ' + p.nombre + ': ' + JSON.stringify(r.datos));
      subidas.push(foto);
      process.stdout.write(`  foto de ${p.nombre}: ${Math.round(datos.length / 1024)} KB\n`);
    }
    platos.push({
      id: randomUUID(), nombre: p.nombre, descripcion: p.descripcion || null,
      precio: typeof p.precio === 'number' ? p.precio : null, etiqueta: p.etiqueta || null,
      agotado: !!p.agotado, foto
    });
  }
  categorias.push({ id: randomUUID(), nombre: c.nombre, nota: c.nota || null, platos });
}

const cambios = { categorias };
const N = menu.negocio || {};
if (N.horario) cambios.horario = N.horario.map(([dias, horas]) => ({ dias, horas }));
if ('nota' in N) cambios.nota = N.nota || null;
const mascara = Object.keys(cambios).map(k => '&updateMask.fieldPaths=' + k).join('');
const guardada = await firestore('restaurantes/' + slug, { metodo: 'PATCH', token, extra: mascara, campos: aCampos(cambios) });
if (!guardada.ok) {
  for (const f of subidas) await firestore(`restaurantes/${slug}/fotos/${f}`, { metodo: 'DELETE', token });
  throw new Error('No se pudo guardar la carta: ' + JSON.stringify(guardada.datos));
}

// Las fotos de la carta anterior ya no se usan
const viejas = (anterior.categorias || []).flatMap(c => (c.platos || []).map(p => p.foto)).filter(Boolean);
for (const f of viejas) await firestore(`restaurantes/${slug}/fotos/${f}`, { metodo: 'DELETE', token });

const total = categorias.reduce((n, c) => n + c.platos.length, 0);
console.log(`\nListo: ${categorias.length} categorías, ${total} platos y ${subidas.length} fotos en la carta de ${slug}.`);

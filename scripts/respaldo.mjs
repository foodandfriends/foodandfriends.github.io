// Copia de la carta desde Supabase a datos/<restaurante>.json.
// La corre GitHub Actions todos los días (.github/workflows/respaldo.yml); a mano: node scripts/respaldo.mjs
// Sirve de respaldo (el plan gratis de Supabase no hace copias) y, si Supabase no responde,
// la carta pública se muestra desde este archivo. De paso mantiene activo el proyecto gratis,
// que Supabase pausa tras 7 días sin uso.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import vm from 'node:vm';

const contexto = { URL, window: {}, document: { currentScript: { src: 'https://sitio/js/config.js' } } };
vm.createContext(contexto);
vm.runInContext(readFileSync(new URL('../js/config.js', import.meta.url), 'utf8'), contexto);
const { supabaseUrl, supabaseAnon, restaurante } = contexto.window.CONFIG;

if (!supabaseUrl) {
  console.log('Supabase todavía no está configurado en js/config.js: no hay nada que respaldar.');
  process.exit(0);
}

async function leer(ruta) {
  const r = await fetch(supabaseUrl.replace(/\/+$/, '') + '/rest/v1/' + ruta, {
    headers: { apikey: supabaseAnon }
  });
  if (!r.ok) throw new Error(`${ruta}: ${r.status} ${await r.text()}`);
  return r.json();
}

const [datos] = await leer('restaurantes?slug=eq.' + encodeURIComponent(restaurante) + '&select=*');
if (!datos) throw new Error('No existe el restaurante ' + restaurante);
const filtro = 'restaurante_id=eq.' + datos.id + '&order=orden.asc,id.asc&select=*';
const [categorias, platos] = await Promise.all([leer('categorias?' + filtro), leer('platos?' + filtro)]);

// Sin fechas que cambian solas: así solo hay commit cuando la carta cambia de verdad
delete datos.creado;
for (const p of platos) delete p.actualizado;

mkdirSync(new URL('../datos/', import.meta.url), { recursive: true });
writeFileSync(new URL(`../datos/${restaurante}.json`, import.meta.url),
  JSON.stringify({ restaurante: datos, categorias, platos }, null, 2) + '\n');
console.log(`Respaldo de ${restaurante}: ${categorias.length} categorías, ${platos.length} platos`);

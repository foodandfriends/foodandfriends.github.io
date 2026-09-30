// Marca los archivos .js del sitio con una versión nueva (?v=...) en todas las páginas.
// Correrlo antes de publicar un cambio en js/: así el celular pide el código nuevo y no usa el
// que tenía guardado (GitHub Pages deja que el navegador guarde cada archivo 10 minutos).
//
//   node scripts/nueva-version.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const raiz = new URL('../', import.meta.url);
const version = new Date().toISOString().replace(/\D/g, '').slice(0, 12);
const paginas = ['index.html', 'admin/index.html', ...readdirSync(new URL('disenos/', raiz))
  .filter(f => f.endsWith('.html') && !f.startsWith('._')).map(f => 'disenos/' + f)]; // ._algo: basura del Mac en el disco externo

for (const pagina of paginas) {
  const ruta = new URL(pagina, raiz);
  const antes = readFileSync(ruta, 'utf8');
  // Solo los scripts propios (los que no empiezan por http)
  const despues = antes.replace(/(<script src="(?!https?:)[^"?]+\.js)(\?v=\d+)?"/g, `$1?v=${version}"`);
  if (despues !== antes) writeFileSync(ruta, despues);
}
console.log('Versión ' + version + ' en ' + paginas.length + ' páginas');

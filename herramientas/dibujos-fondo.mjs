// Arma los dibujitos de fondo de la carta (dibujos.svg, en la raíz del sitio) y una hoja para revisarlos en grande.
// Dibujos propios, hechos para Food and Friends. El fondo (FONDO) tiene que ser el mismo --pagina de index.html: lo de
// adelante va relleno de ese color y tapa las líneas de lo que queda detrás.
//
//   node herramientas/dibujos-fondo.mjs [color] [fondo] [opacidad] [hoja.svg]
//   (sin nada: amarillo #f5c400 sobre blanco, al 90 %: el que escogió el usuario)
import { writeFileSync } from 'node:fs';

const [, , COLOR = '#f5c400', FONDO = '#ffffff', OPACIDAD = '.9', hoja] = process.argv;
const mosaico = new URL('../dibujos.svg', import.meta.url);
const F = `fill="${FONDO}"`, LLENO = `fill="${COLOR}"`;

// Cada dibujo en su propio espacio, más o menos de -34 a 34. Se dibuja de atrás hacia adelante: lo de adelante va
// relleno del color del fondo y tapa las líneas de lo que queda detrás
const D = {
  hamburguesa: `
    <path ${F} d="M-27 22H27C27 28.5 22.5 33 16 33H-16C-22.5 33-27 28.5-27 22Z"/>
    <rect ${F} x="-29" y="12" width="58" height="11" rx="5.5"/>
    <path d="M-19 17.5h5M-5 16.8h5M9 17.5h5"/>
    <path ${F} d="M-27 7H27L23.5 12.5H11.5L8 19.5L4.5 12.5H-10L-13.5 17.5L-17 12.5H-24Z"/>
    <path ${F} d="M-30 6q3.75-5 7.5 0t7.5 0t7.5 0t7.5 0t7.5 0t7.5 0t7.5 0t7.5 0L28 1H-28Z"/>
    <path ${F} d="M-28-4C-28-19-16-27 0-27C16-27 28-19 28-4C28-1 26 1 23 1H-23C-26 1-28-1-28-4Z"/>
    <path d="M-18-17C-14-21-9-23-4-23.6"/>
    <path d="M-7-17.5l3.2-1.6M3-21l3.4.6M12-15.5l3 1.6M0-11.5l3.4-.5M-15-9.5l2.8-1.7M16-7.5l3 .6M-6-5.5l3 .3"/>`,
  doble: `
    <path ${F} d="M-24 30H24C24 35 20 38.5 15 38.5H-15C-20 38.5-24 35-24 30Z"/>
    <rect ${F} x="-26" y="20.5" width="52" height="10.5" rx="5.25"/>
    <path d="M-16 26h4.5M-3 25.2h4.5M9 26h4.5"/>
    <path ${F} d="M-24 16H24L21 21H8.5L5.5 27L2.5 21H-9L-12 25L-15 21H-21.5Z"/>
    <rect ${F} x="-26" y="6.5" width="52" height="10.5" rx="5.25"/>
    <path d="M-15 12h4.5M-2 11.2h4.5M10 12h4.5"/>
    <path ${F} d="M-25 2.5H25V7.5H-25Z"/><path d="M-12 2.5V7.5M0 2.5V7.5M12 2.5V7.5"/>
    <path ${F} d="M-27.5 2.5q3.44-4.6 6.88 0t6.88 0t6.88 0t6.88 0t6.88 0t6.88 0t6.88 0t6.88 0L25-2H-25Z"/>
    <path ${F} d="M-25-7C-25-24-14-33 0-33C14-33 25-24 25-7C25-4 23-2 20-2H-20C-23-2-25-4-25-7Z"/>
    <path d="M-15-22C-11-26.5-6-29-1.5-29.5"/>
    <path d="M-5-22l3.2-1.4M5-26l3.2.7M13-19l2.8 1.6M-1-15l3.2-.4M-14-13l2.7-1.7M14-11l3 .6"/>`,
  papas: `
    <g ${F}><rect x="-19" y="-30" width="6.5" height="34" rx="1.5" transform="rotate(-9 -16 -10)"/>
    <rect x="-11" y="-37" width="6.5" height="40" rx="1.5" transform="rotate(-3 -8 -15)"/>
    <rect x="-3" y="-33" width="6.5" height="36" rx="1.5" transform="rotate(4 0 -12)"/>
    <rect x="5" y="-38" width="6.5" height="40" rx="1.5" transform="rotate(8 8 -15)"/>
    <rect x="12" y="-28" width="6.5" height="30" rx="1.5" transform="rotate(16 15 -10)"/></g>
    <path ${F} d="M-21-4L-15.5 34H15.5L21-4Q10.5 4 0-4Q-10.5 4-21-4Z"/>
    <path ${LLENO} stroke="none" d="M-18.2 13H18.2L16.9 23H-16.9Z"/>
    <path ${F} stroke="none" d="M2.5 14.2L-5 19H-.6L-2.6 22.2L5 17H.6Z"/>`,
  jarra: `
    <path d="M14-5H21C25-5 27-2 27 2V13C27 17 25 20 21 20H14"/>
    <path d="M14 0H19.5C21 0 22 1 22 2.5V12.5C22 14 21 15 19.5 15H14"/>
    <path ${F} d="M-17-9V27C-17 31-14 33-10 33H8C12 33 14.5 31 14.5 27V-9Z"/>
    <path d="M-8 1V25M5.5 1V25"/>
    <circle cx="-1.2" cy="9" r="1.4"/><circle cx="-1.2" cy="17" r="1.1"/><circle cx="-1.2" cy="23" r=".9"/>
    <path ${F} d="M-19-9C-23.5-10-23.5-16.5-19-17.5C-19.5-24-12-26.5-8.5-22C-6.5-27.5 1-28.5 3-23C6-27.5 13.5-26 13.5-20.5C18.5-21 20.5-14.5 16-11C17-8 15-6.5 12.5-6.5V-2C12.5 1 9 1 8.5-2V-6.5H-17C-18.5-6.5-19.5-7.5-19-9Z"/>`,
  botella: `
    <path ${F} d="M-5-33H5V-21C5-16 12.5-13 12.5-5V28C12.5 31 10.5 33 7.5 33H-7.5C-10.5 33-12.5 31-12.5 28V-5C-12.5-13-5-16-5-21Z"/>
    <path ${F} d="M-6.5-38H6.5V-32.5H-6.5Z"/><path d="M-3.5-38V-32.5M0-38V-32.5M3.5-38V-32.5"/>
    <path d="M-5-26H5"/>
    <rect ${F} x="-10" y="3" width="20" height="17" rx="2.5"/>
    <path d="M-5.5 9H5.5M-3.5 14H3.5"/>
    <path d="M-8.5-3V-7"/>`,
  tomates: `
    <circle ${F} cx="15" cy="10" r="11.5"/><circle cx="15" cy="10" r="8.3"/><circle cx="15" cy="10" r="2.2"/>
    <circle ${F} cx="-5" cy="-3" r="15"/><circle cx="-5" cy="-3" r="11"/><circle cx="-5" cy="-3" r="2.8"/>
    ${[0, 60, 120, 180, 240, 300].map(a => `<ellipse cx="-5" cy="-10" rx="1.5" ry="2.6" transform="rotate(${a} -5 -3)"/>`).join('')}
    ${[0, 60, 120, 180, 240, 300].map(a => `<ellipse cx="15" cy="4.6" rx="1.1" ry="1.9" transform="rotate(${a} 15 10)"/>`).join('')}`,
  queso: `
    <path ${F} d="M-26 4L10-15L27-6V13L-26 19Z"/>
    <path d="M-26 4L27-6"/>
    <ellipse cx="7" cy="-7.5" rx="3.6" ry="1.8" transform="rotate(-10 7 -7.5)"/>
    <circle cx="-12" cy="11.5" r="3.4"/><circle cx="4" cy="7" r="2.4"/><circle cx="16" cy="8.5" r="3.6"/><circle cx="-1" cy="14.5" r="1.6"/>`,
  tocineta: `
    <path ${F} d="M-30-1C-23-8-16 6-8-1S7-8 14-1S25 6 30 1V12C25 17 19 3 12 10S-3 17-10 10S-24 3-30 11Z"/>
    <path d="M-28 6C-22 0-16 11-9 5S6 -1 13 5S24 11 29 7"/>`,
  salsa: `
    <path ${F} d="M-3.5-19L-2-30H2L3.5-19Z"/>
    <path ${F} d="M-8-19H8V-12H-8Z"/>
    <path ${F} d="M-10-12H10C12-12 13.5-10.5 13.5-8.5V25C13.5 29 10.5 32 6.5 32H-6.5C-10.5 32-13.5 29-13.5 25V-8.5C-13.5-10.5-12-12-10-12Z"/>
    <path d="M-13.5 6H13.5M-13.5 18H13.5"/>
    <path d="M-9 0V-6"/>
    <path ${F} d="M20-30C23-25 24-22 21.5-19.5C19-17 15.5-19 16.5-22.5Z"/>`,
  aji: `
    <path ${F} d="M-28 8C-16 11-3 6 8-3C14-8 18-13 22-11C25-9 23-4 19-1C9 8-6 17-26 13C-30 12-31 8-28 8Z"/>
    <path d="M21-11C22-16 25-18 29-17"/><path d="M15-7C17-9 19-10 21-9"/>
    <path d="M-17 11C-10 11-3 8 3 4"/>`
};

// El mosaico: pocos dibujos y bien separados, cada uno con su giro. Ninguno toca el borde, así no se cortan al repetirse
const ANCHO = 320, ALTO = 320;
const LUGARES = [
  ['hamburguesa', 62, 60, -8, .95],
  ['jarra', 182, 52, 9, .9],
  ['tomates', 272, 46, 0, .78],
  ['papas', 120, 160, -7, .9],
  ['queso', 248, 146, 12, .82],
  ['tocineta', 44, 196, -24, .78],
  ['doble', 236, 250, 8, .9],
  ['botella', 128, 268, -16, .85],
  ['aji', 44, 286, 18, .62]
  // La salsa está dibujada pero no va en el mosaico (para no llenarlo): se puede poner en lugar de otro
];
const grupo = (nombre, x, y, giro, escala) => `<g transform="translate(${x} ${y}) rotate(${giro}) scale(${escala})">${D[nombre]}</g>`;
const estilo = `fill="none" stroke="${COLOR}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"`;
writeFileSync(mosaico, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ANCHO} ${ALTO}" width="${ANCHO}" height="${ALTO}">` +
  `<!-- Dibujitos de fondo de la carta (index.html): hamburguesas, cerveza, papas, tomate, queso, tocineta y ají. Hechos para Food and Friends -->` +
  `<g opacity="${OPACIDAD}" ${estilo}>${LUGARES.map(l => grupo(...l)).join('')}</g></svg>\n`);
// La hoja de revisión (si se pide): cada dibujo grande, en dos columnas
const nombres = Object.keys(D), filas = Math.ceil(nombres.length / 2);
if (hoja) writeFileSync(hoja, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 ${filas * 100}" width="380" height="${filas * 190}">` +
  `<rect width="100%" height="100%" fill="${FONDO}"/><g ${estilo}>` +
  nombres.map((n, i) => grupo(n, 50 + (i % 2) * 100, 50 + Math.floor(i / 2) * 100, 0, 1.1)).join('') + `</g></svg>\n`);
console.log('listo', LUGARES.length, 'dibujos en el mosaico');

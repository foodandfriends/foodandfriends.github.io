// Arma un celular por cada opción de color con el comienzo de la carta real (mismos platos y fotos)
(function () {
  const OPCIONES = [
    { clase: 'naranja', titulo: '1. Naranja y negro', idea: 'El naranja del logo con negro. Sigue siendo "rock" y de pub, pero sin rojo.', colores: ['#1c1512', '#c2410c', '#fa7a0b'] },
    { clase: 'verde', titulo: '2. Verde y naranja', idea: 'El verde de la carta de bebidas y de las paredes del local, con el naranja del logo.', colores: ['#1d5c47', '#fa7a0b', '#f7f2ed'] },
    { clase: 'amarillo', titulo: '3. Amarillo y negro', idea: 'Como el menú impreso: títulos resaltados en amarillo sobre letra negra.', colores: ['#1c1512', '#f5c400', '#f7f2ed'] },
    { clase: 'cafe', titulo: '4. Café y ámbar', idea: 'Colores de parrilla y madera: café oscuro, terracota y ámbar.', colores: ['#3b2314', '#9a3412', '#f5a524'] },
    { clase: 'actual', titulo: 'La de ahora (rojo)', idea: 'Solo para comparar.', colores: ['#e30b00', '#fa7a0b', '#f7f2ed'] }
  ];
  const FOTOS = '../datos/fotos/food-friends/';
  const SECCIONES = [
    ['Parrilla', [['Lomo al carbón 250 g', '$39.000', '9f15bdaf-20c6-4340-91f5-98900ee5ecc6'], ['Churrasco 250 g', '$39.000', '2254e73f-8ae4-4a3d-9d85-49d6dd5c016d'], ['Churrasco de pollo', '$35.000', '12d12bfd-5018-4217-b951-dbe82740e6fa']]],
    ['Hamburguesas', [['Angus importada 200 g', '$32.000', 'ca9bf45d-42f2-4d01-a9f7-1590abf701b4'], ['De costilla', '$31.000', 'bb7b4ea4-f574-454e-8c33-3fc164cb997a'], ['Ranchera', '$31.000', 'b23dfd05-60b6-46c0-a2e5-468ba610f2f3']]]
  ];
  function el(tag, clase, texto) {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto) e.textContent = texto;
    return e;
  }
  function celular(clase) {
    const cel = el('div', 'cel ' + clase);
    cel.append(el('div', 'cinta', 'Rock · Food home made · Friends · Pub · Beer · Parrilla · Burgers · Since 2013'));
    const hero = el('div', 'hero');
    const logo = el('img');
    logo.src = '../logo.webp';
    logo.alt = 'Food and Friends';
    hero.append(logo, el('p', 'lugar', 'Parque Artesanal Loma de la Cruz · Cali'), el('p', 'sub', 'La carta'),
      el('p', 'historia', 'Nos inspiramos en brindarte platillos a la parrilla con historia, basados en momentos y experiencias de Cali, Colombia, a tu boca.'));
    const chips = el('div', 'chips');
    ['De la casa', 'Mex', 'Parrilla', 'Hamburguesas'].forEach(c => chips.append(el('span', c === 'Parrilla' ? 'activo' : '', c)));
    cel.append(hero, chips);
    for (const [titulo, platos] of SECCIONES) {
      const s = el('section', 'seccion');
      s.append(el('h3', '', titulo));
      for (const [nombre, precio, foto] of platos) {
        const p = el('div', 'plato');
        const fila = el('div', 'fila');
        fila.append(el('span', 'nombre', nombre), el('span', 'puntos'), el('span', 'precio', precio));
        const img = el('img');
        img.src = FOTOS + foto + '.webp';
        img.alt = '';
        img.loading = 'lazy';
        p.append(fila, img);
        s.append(p);
      }
      cel.append(s);
    }
    cel.append(el('div', 'fin'));
    return cel;
  }
  const cont = document.getElementById('opciones');
  for (const o of OPCIONES) {
    const caja = el('article', 'opcion');
    const muestras = el('div', 'muestras');
    o.colores.forEach(c => { const m = el('span'); m.style.background = c; muestras.append(m); });
    caja.append(el('h2', '', o.titulo), el('p', '', o.idea), muestras, celular(o.clase));
    cont.append(caja);
  }
})();

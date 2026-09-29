# Carta de Food and Friends

Página de la carta para los clientes del local (Parque Artesanal Loma de la Cruz, Cali). Está hecha
para el celular: botón "Cómo llegar" y "Llamar" arriba, categorías fijas que se resaltan al bajar
y el precio de cada plato a la derecha. Sin instalación ni dependencias: son dos archivos.

- `index.html`: el diseño. No hace falta tocarlo.
- `menu.js`: la carta (platos, precios, datos del local). **Es lo único que se edita**; las
  instrucciones están arriba en el mismo archivo.

## Propuestas de diseño

`disenos/index.html` es la presentación para el dueño, hecha para verla en el celular: portada,
las cinco opciones (Rock, Cartel, Terraza, Pizarra y Comanda) con un celular que recorre cada carta
(`disenos/previas/`), y botones "Me gusta esta" que le escriben por WhatsApp. El número al que
llegan esas respuestas y el orden de las opciones están en `disenos/propuesta.js`. Al abrir un
diseño desde la presentación sale una barra abajo para pasar a la opción anterior o siguiente.

Los diseños usan el logo (`logo.webp`) y una carta de muestra (`disenos/muestra.js`) con precios de
ejemplo y fotos de Unsplash. Todos comparten `disenos/carta.js`; cuando se escoja uno, pasa a
`index.html` leyendo `menu.js`.

`propuestas/` tiene las imágenes para mandarle al cliente: `0-todas-las-opciones.jpg` con las cinco
juntas, la primera pantalla de cada opción y, en `completas/`, cada carta de arriba a abajo.

## Ver la página

Abra `index.html` con doble clic. Para probarla como en internet:

```bash
python3 -m http.server 3210
```

y entre a http://localhost:3210 desde el computador (o desde el celular, en la misma red wifi,
con la IP del computador).

## Publicarla

Es una página estática: se sube la carpeta completa a cualquier hosting estático (Netlify,
Cloudflare Pages, GitHub Pages, Amplify). Con la dirección final se genera un QR para las mesas.

## Pendiente antes de publicar

- Cambiar los platos de ejemplo (precio `$00.000`) por la carta real.
- Confirmar el horario con el dueño: Google Maps dice que abre a las 4 p. m. y Rappi a las 3:30 p. m.
  Mientras `horario` esté vacío, la página no muestra horario.
- Confirmar si el 302 375 1571 también atiende por WhatsApp; si sí, ponerlo en `whatsapp`.
- Agregar el Instagram del local si tiene.

/*
  CARTA DE FOOD AND FRIENDS
  Este es el único archivo que se edita para cambiar la carta. La página (index.html) lo lee sola.

  Cómo llenarlo
  - Cada categoría sale como un botón arriba de la página y como una sección.
    Las categorías sin platos no se muestran.
  - Un plato lleva:
      nombre       obligatorio
      descripcion  opcional, una línea con los ingredientes o el detalle
      precio       opcional. Número sin puntos (25000 sale "$25.000") o texto ("$25.000 · $30.000 doble")
      etiqueta     opcional, una palabra destacada: "Nuevo", "Picante", "Para compartir"
      agotado      opcional, true si hoy no hay: sale apagado con la marca "Agotado"
  - Para quitar un plato o una categoría, bórrelos completos, con la coma del final.
  - Lo que esté vacío ("") no se muestra: el horario, el WhatsApp, Instagram, etc.

  Los platos de abajo son de EJEMPLO (con precio $00.000) para ver cómo queda el diseño.
  Reemplácelos por la carta real antes de publicar.
*/
window.MENU = {
  negocio: {
    nombre: "Food and Friends",
    lugar: "Parque Artesanal Loma de la Cruz · Cali",
    direccion: "Parque Artesanal, Cra. 16 #3-57, Cali, Valle del Cauca",
    telefono: "302 375 1571",   // el botón "Llamar" usa este número
    whatsapp: "",               // solo si atienden por WhatsApp, mismo formato: "302 375 1571"
    mapa: "https://maps.app.goo.gl/9h77zzrGRmh3XMmB6",
    facebook: "https://www.facebook.com/foodandfriendscali/",
    instagram: "",              // por ejemplo "https://www.instagram.com/su_usuario"
    // Confirmar con el dueño: Google Maps dice que abre a las 4 p. m. y Rappi dice 3:30 p. m.
    // Ejemplo: horario: [["Martes a miércoles", "3:30 – 10:30 p. m."], ["Jueves", "3:30 – 11:00 p. m."]],
    horario: [],
    nota: ""                    // por ejemplo "Precios en pesos colombianos."
  },

  categorias: [
    {
      id: "hamburguesas",
      nombre: "Hamburguesas",
      nota: "",
      platos: [
        { nombre: "Nombre de la hamburguesa", descripcion: "Carne, queso, vegetales y salsa de la casa", precio: "$00.000", etiqueta: "Nuevo" },
        { nombre: "Otra hamburguesa", descripcion: "Ingredientes en una sola línea", precio: "$00.000" },
        { nombre: "Hamburguesa agotada", descripcion: "Así se ve un plato que hoy no hay", precio: "$00.000", agotado: true }
      ]
    },
    {
      id: "para-picar",
      nombre: "Para picar",
      nota: "Ideal para compartir en la mesa.",
      platos: [
        { nombre: "Nombre de la picada", descripcion: "Qué trae y para cuántas personas", precio: "$00.000", etiqueta: "Para compartir" },
        { nombre: "Otro plato para picar", descripcion: "Ingredientes en una sola línea", precio: "$00.000" }
      ]
    },
    {
      id: "parrilla",
      nombre: "Parrilla",
      nota: "",
      platos: [
        { nombre: "Nombre del plato a la parrilla", descripcion: "Corte, acompañantes y salsa", precio: "$00.000" },
        { nombre: "Otro plato a la parrilla", descripcion: "Corte, acompañantes y salsa", precio: "$00.000", etiqueta: "Picante" }
      ]
    },
    {
      id: "bebidas",
      nombre: "Bebidas",
      nota: "",
      platos: [
        { nombre: "Nombre de la bebida", precio: "$00.000" },
        { nombre: "Otra bebida", descripcion: "Sabores disponibles", precio: "$00.000" }
      ]
    },
    {
      id: "postres",
      nombre: "Postres",
      nota: "",
      platos: [
        { nombre: "Nombre del postre", descripcion: "Con qué se sirve", precio: "$00.000" }
      ]
    }
  ]
};

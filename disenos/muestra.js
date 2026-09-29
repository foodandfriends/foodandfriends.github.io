/*
  CARTA DE MUESTRA, solo para las propuestas de diseño.
  Los platos salen del logo ("Burgers & Minipizzas", "Beer") y de lo que se ve en reseñas y en Rappi.
  Los precios son de ejemplo (en el rango de Rappi) y las fotos son de Unsplash (licencia libre),
  no de los platos del local. La carta de verdad va en ../menu.js.
*/
const FOTO = id => 'https://images.unsplash.com/' + id + '?w=240&h=188&fit=crop&q=70&auto=format';

window.MENU = {
  negocio: {
    nombre: "Food and Friends",
    logo: "../logo.webp",
    lugar: "Parque Artesanal Loma de la Cruz · Cali",
    direccion: "Parque Artesanal, Cra. 16 #3-57, Cali, Valle del Cauca",
    telefono: "302 375 1571",
    whatsapp: "",
    mapa: "https://maps.app.goo.gl/9h77zzrGRmh3XMmB6",
    facebook: "https://www.facebook.com/foodandfriendscali/",
    instagram: "",
    horario: [["Martes a jueves", "4:00 – 10:30 p. m."], ["Viernes a domingo", "4:00 – 11:30 p. m."]],
    nota: "Precios, fotos y horario de ejemplo."
  },

  categorias: [
    {
      id: "hamburguesas",
      nombre: "Hamburguesas",
      nota: "Pan artesanal y carne de res de 150 g.",
      platos: [
        { nombre: "Clásica de la casa", descripcion: "Queso, lechuga, tomate, cebolla y salsa de la casa", precio: 25000, etiqueta: "La más pedida", foto: FOTO("photo-1568901346375-23c9450c58cd") },
        { nombre: "Doble queso", descripcion: "Doble carne, doble cheddar y cebolla caramelizada", precio: 31000, foto: FOTO("photo-1572802419224-296b0aeee0d9") },
        { nombre: "BBQ con tocineta", descripcion: "Tocineta crocante, aros de cebolla y salsa BBQ", precio: 33000, agotado: true, foto: FOTO("photo-1553979459-d2229ba7433b") }
      ]
    },
    {
      id: "minipizzas",
      nombre: "Minipizzas",
      nota: "",
      platos: [
        { nombre: "Hawaiana", descripcion: "Jamón, piña y queso mozzarella", precio: 18000, foto: FOTO("photo-1562835155-a7c2a225e97d") },
        { nombre: "Pepperoni", descripcion: "Pepperoni y queso mozzarella", precio: 19000, etiqueta: "Nuevo", foto: FOTO("photo-1534308983496-4fabb1a015ee") },
        { nombre: "De la casa", descripcion: "Pollo, champiñones, maíz y tocineta", precio: 22000, foto: FOTO("photo-1604382354936-07c5d9983bd3") }
      ]
    },
    {
      id: "para-picar",
      nombre: "Para picar",
      nota: "",
      platos: [
        { nombre: "Picada de la casa", descripcion: "Carnes, chorizo, papa criolla, maduro y arepa. Para 2 o 3", precio: 52000, etiqueta: "Para compartir", foto: FOTO("photo-1555939594-58d7cb561ad1") },
        { nombre: "Chorizo con arepa", descripcion: "A la parrilla, con arepa y limón", precio: 14000, foto: FOTO("photo-1750461325721-4dea035dc0e1") },
        { nombre: "Nachos", descripcion: "Queso fundido, frijol, pico de gallo y guacamole", precio: 26000, foto: FOTO("photo-1570466199120-80bba1eabad7") },
        { nombre: "Alitas mango habanero", descripcion: "Bañadas en salsa de mango y habanero", precio: 28000, etiqueta: "Picante", foto: FOTO("photo-1567620832903-9fc6debc209f") }
      ]
    },
    {
      id: "mexicano",
      nombre: "Mexicano",
      nota: "",
      platos: [
        { nombre: "Tacos", descripcion: "Tres tortillas con carne, cebolla, cilantro y salsa", precio: 30000, foto: FOTO("photo-1599974579688-8dbdd335c77f") },
        { nombre: "Burrito", descripcion: "Tortilla de harina, carne, arroz, frijol y queso", precio: 34000, foto: FOTO("photo-1711488735428-27c6757beb5c") }
      ]
    },
    {
      id: "cervezas",
      nombre: "Cervezas",
      nota: "",
      platos: [
        { nombre: "Cerveza nacional", descripcion: "Bien fría", precio: 7000, foto: FOTO("photo-1608270586620-248524c67de9") },
        { nombre: "Cerveza artesanal", descripcion: "Pregunte las del día", precio: 12000, foto: FOTO("photo-1687771454203-97d0b08bbeb2") },
        { nombre: "Michelada", descripcion: "Limón, sal y la cerveza que prefiera", precio: 9000, foto: FOTO("photo-1750010274830-1155de5373cf") }
      ]
    },
    {
      id: "bebidas",
      nombre: "Bebidas",
      nota: "",
      platos: [
        { nombre: "Jugo natural", descripcion: "En agua o en leche. Pregunte los sabores del día", precio: 8000, foto: FOTO("photo-1600271886742-f049cd451bba") },
        { nombre: "Limonada natural", precio: 7000, foto: FOTO("photo-1621263764928-df1444c5e859") },
        { nombre: "Gaseosa", precio: 5000, foto: FOTO("photo-1629654613528-5d0a2e4166de") }
      ]
    },
    {
      id: "postres",
      nombre: "Postres",
      nota: "",
      platos: [
        { nombre: "Churros con chocolate", descripcion: "Con azúcar y canela, para untar", precio: 14000, foto: FOTO("photo-1505851498219-ee2449c18936") },
        { nombre: "Brownie", descripcion: "Tibio, con helado de vainilla", precio: 15000, foto: FOTO("photo-1606884285898-277317a7bf12") }
      ]
    }
  ]
};

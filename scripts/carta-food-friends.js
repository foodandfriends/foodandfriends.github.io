/*
  CARTA REAL de Food and Friends, pasada de las fotos del menú impreso que entregó Willy (30-sep-2026).
  Se carga en Firebase con:
    DUENO_CORREO=correo@del-dueno.com node scripts/cargar-carta.mjs scripts/carta-food-friends.js
  Después de cargada, los cambios se hacen desde el panel (admin/); este archivo no se vuelve a usar.
  Todavía no hay fotos de los platos: se suben desde el panel.
*/
window.MENU = {
  negocio: {
    // La "nota" del panel es la historia que sale al comienzo de la carta
    nota: "Nos inspiramos en brindarte platillos a la parrilla con historia, basados en momentos y experiencias de Cali, Colombia, a tu boca."
  },

  categorias: [
    {
      nombre: "De la casa",
      platos: [
        { nombre: "Especial de la casa", precio: 43000 },
        { nombre: "Tostada especial", precio: 35000 },
        { nombre: "Ensalada especial", precio: 27000 },
        { nombre: "Tornado de pollo", precio: 30500 },
        { nombre: "Sándwich", precio: 26000 },
        { nombre: "Desgranado mixto", precio: 26000 }
      ]
    },
    {
      nombre: "Mex",
      platos: [
        { nombre: "Burrito mixto especial", precio: 32000 },
        { nombre: "Burrito endiablado", precio: 33000 },
        { nombre: "Burrito vegetariano", precio: 30000 },
        { nombre: "Tortilla de pollo y jalapeño", precio: 28500 },
        { nombre: "Tortilla de chile con carne", precio: 28500 },
        { nombre: "Nachos de chile con carne", precio: 29000 },
        { nombre: "Nachos con salsa de queso", precio: 21000 }
      ]
    },
    {
      nombre: "Para compartir",
      platos: [
        { nombre: "Perro especial x2", precio: 32000 },
        { nombre: "Alitas BBQ x2", precio: 34000 },
        { nombre: "Arepa especial x2", precio: 34000 },
        { nombre: "Arepa especial x1", precio: 20000 },
        { nombre: "Arepa con queso", precio: 10000 },
        { nombre: "Lasaña x2", precio: 42000 }
      ]
    },
    {
      nombre: "Entradas",
      platos: [
        { nombre: "Papas a la francesa", precio: 9500 },
        { nombre: "Salchipapa especial", precio: 29000 },
        { nombre: "Salchipapa sencilla", precio: 22000 },
        { nombre: "Chicharrón con yuca", precio: 27000 },
        { nombre: "Empanadas x5", precio: 19000 },
        { nombre: "Yuca con chorizo", precio: 19900 },
        { nombre: "Papas con tocineta", precio: 15500 },
        { nombre: "Chorizo con arepa", precio: 15000 }
      ]
    },
    {
      nombre: "Parrilla",
      platos: [
        { nombre: "Lomo al carbón 250 g", precio: 39000 },
        { nombre: "Churrasco 250 g", precio: 39000 },
        { nombre: "Churrasco de pollo", precio: 35000 },
        { nombre: "Picada para dos", precio: 38500 },
        { nombre: "Picada para cuatro", precio: 71900 },
        { nombre: "Costilla San Luis 500 g", precio: 38000 },
        { nombre: "Pollo a la plancha 250 g", precio: 35000 }
      ]
    },
    {
      nombre: "Hamburguesas",
      platos: [
        { nombre: "Angus importada 200 g", precio: 32000 },
        { nombre: "De costilla", precio: 31000 },
        { nombre: "Ranchera", precio: 31000 },
        { nombre: "Montañera", precio: 29000 },
        { nombre: "Res fusión x2", precio: 33000 },
        // En el menú impreso dice "COMBO FAMILIAR X6 4PP"
        { nombre: "Combo familiar x6", descripcion: "Para 4 personas", precio: 86000 },
        { nombre: "Pollo fusión x2", precio: 35000 },
        { nombre: "Mini", precio: 13000 },
        { nombre: "Vegetariana", precio: 24000 }
      ]
    },
    {
      nombre: "Bebidas",
      nota: "Limonadas, jugos y gaseosas",
      platos: [
        { nombre: "Limonada de coco", precio: 13500 },
        { nombre: "Limonada de cereza", precio: 13500 },
        { nombre: "Limonada de mango biche", precio: 13500 },
        { nombre: "Limonada natural", precio: 9000 },
        { nombre: "Limonada de hierbabuena", precio: 11500 },
        { nombre: "Milo frío", precio: 14000 },
        { nombre: "Frapuchino", precio: 16000 },
        { nombre: "Soda italiana", precio: 15000 },
        { nombre: "Granizado de café", precio: 14000 },
        { nombre: "Piña colada sin licor", precio: 13000 },
        { nombre: "Jugo en agua", precio: 10000 },
        { nombre: "Jugo en leche", precio: 12000 },
        { nombre: "Gaseosa personal", precio: 4500 },
        { nombre: "Coca-Cola", precio: 5000 },
        { nombre: "Litrón Postobón 1,5 L", precio: 9000 },
        { nombre: "Litrón Coca-Cola", precio: 10000 },
        { nombre: "Hit 1,5 L", precio: 8500 },
        { nombre: "Agua en botella", precio: 4000 },
        { nombre: "Agua con gas", precio: 4500 },
        { nombre: "Vaso michelado", precio: 1500 }
      ]
    },
    {
      nombre: "Cócteles",
      platos: [
        { nombre: "Copa de sangría", precio: 25000 },
        { nombre: "Copa de vino", precio: 25000 },
        { nombre: "Vino (botella)", precio: 60000 },
        { nombre: "Piscina roja para 2", precio: 70000 },
        { nombre: "Coctel de la casa", descripcion: "2 por $45.000", precio: 25000 },
        { nombre: "Mojito", descripcion: "2 por $45.000", precio: 25000 },
        { nombre: "Margarita", precio: 25000 },
        { nombre: "Orgasmo", precio: 30000 },
        { nombre: "Tequila sunrise", descripcion: "2 por $45.000", precio: 25000 },
        { nombre: "Gin tonic", precio: 25000 },
        { nombre: "Cuba libre", precio: 25000 },
        { nombre: "Piña colada con licor", precio: 24000 },
        { nombre: "Shot de tequila", precio: 20000 }
      ]
    },
    {
      nombre: "Cervezas",
      platos: [
        { nombre: "Poker", precio: 6000 },
        { nombre: "Club Colombia", precio: 7000 },
        { nombre: "Águila Light", precio: 7000 },
        { nombre: "Sol (botella)", precio: 11000 },
        { nombre: "Sol (lata)", precio: 9000 },
        { nombre: "Heineken", precio: 11000 },
        { nombre: "Heineken pequeña", precio: 7000 },
        { nombre: "Coronita", precio: 7000 },
        { nombre: "3 Cordilleras", precio: 13000 },
        { nombre: "Andina o Tecate", precio: 6000 }
      ]
    }
  ]
};

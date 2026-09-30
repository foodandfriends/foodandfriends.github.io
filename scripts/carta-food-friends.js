/*
  CARTA REAL de Food and Friends, pasada de las fotos del menú impreso que entregó Willy (30-sep-2026).
  Se carga en Firebase con:
    DUENO_CORREO=correo@del-dueno.com node scripts/cargar-carta.mjs scripts/carta-food-friends.js
  Después de cargada, los cambios se hacen desde el panel (admin/); este archivo no se vuelve a usar.
  Las fotos son genéricas, de Unsplash (licencia libre: se pueden usar gratis, también en un negocio, sin
  pedir permiso). No son de los platos del local: Willy las puede cambiar por las suyas desde el panel.
  Las cervezas, gaseosas y aguas van sin foto (una foto de otra marca confundiría).
*/
const FOTO = id => 'https://images.unsplash.com/' + id;
window.MENU = {
  negocio: {
    // La "nota" del panel es la historia que sale al comienzo de la carta
    nota: "Nos inspiramos en brindarte platillos a la parrilla con historia, basados en momentos y experiencias de Cali, Colombia, a tu boca."
  },

  categorias: [
    {
      nombre: "De la casa",
      platos: [
        { nombre: "Especial de la casa", precio: 43000, foto: FOTO("photo-1702827488004-70bf0e878240") },
        { nombre: "Tostada especial", precio: 35000, foto: FOTO("photo-1702827482556-481adcd68f3b") },
        { nombre: "Ensalada especial", precio: 27000, foto: FOTO("photo-1605291535065-e1d52d2b264a") },
        { nombre: "Tornado de pollo", precio: 30500, foto: FOTO("photo-1647724394693-2c93af726785") },
        { nombre: "Sándwich", precio: 26000, foto: FOTO("photo-1553909489-cd47e0907980") },
        { nombre: "Desgranado mixto", precio: 26000, foto: FOTO("photo-1613585270345-5ddf6a78b7af") }
      ]
    },
    {
      nombre: "Mex",
      platos: [
        { nombre: "Burrito mixto especial", precio: 32000, foto: FOTO("photo-1662116765994-1e4200c43589") },
        { nombre: "Burrito endiablado", precio: 33000, foto: FOTO("photo-1731090389603-d63060ee08a6") },
        { nombre: "Burrito vegetariano", precio: 30000, foto: FOTO("photo-1711488735428-27c6757beb5c") },
        { nombre: "Tortilla de pollo y jalapeño", precio: 28500, foto: FOTO("photo-1618040996337-56904b7850b9") },
        { nombre: "Tortilla de chile con carne", precio: 28500, foto: FOTO("photo-1584398572810-43c36faba2ad") },
        { nombre: "Nachos de chile con carne", precio: 29000, foto: FOTO("photo-1655017977188-f192791f1ffd") },
        { nombre: "Nachos con salsa de queso", precio: 21000, foto: FOTO("photo-1789990646690-b5222896487c") }
      ]
    },
    {
      nombre: "Para compartir",
      platos: [
        { nombre: "Perro especial x2", precio: 32000, foto: FOTO("photo-1641246630294-c48c8aec58fc") },
        { nombre: "Alitas BBQ x2", precio: 34000, foto: FOTO("photo-1600555379765-f82335a7b1b0") },
        { nombre: "Arepa especial x2", precio: 34000, foto: FOTO("photo-1619683909099-03814b162136") },
        { nombre: "Arepa especial x1", precio: 20000, foto: FOTO("photo-1619683909216-820c3bc64b67") },
        { nombre: "Arepa con queso", precio: 10000, foto: FOTO("photo-1644753787067-d62ae70f303d") },
        { nombre: "Lasaña x2", precio: 42000, foto: FOTO("photo-1709429790175-b02bb1b19207") }
      ]
    },
    {
      nombre: "Entradas",
      platos: [
        { nombre: "Papas a la francesa", precio: 9500, foto: FOTO("photo-1688978181542-87a886a16fbe") },
        { nombre: "Salchipapa especial", precio: 29000, foto: FOTO("photo-1561701034-24ceb3e34433") },
        { nombre: "Salchipapa sencilla", precio: 22000, foto: FOTO("photo-1610340533405-43217a69ed99") },
        { nombre: "Chicharrón con yuca", precio: 27000, foto: FOTO("photo-1785735011447-9942c0ba0b13") },
        { nombre: "Empanadas x5", precio: 19000, foto: FOTO("photo-1619684269649-eaad26766c4e") },
        { nombre: "Yuca con chorizo", precio: 19900, foto: FOTO("photo-1553621044-b78d0bed9a65") },
        { nombre: "Papas con tocineta", precio: 15500, foto: FOTO("photo-1689151128603-4828c1c2838f") },
        { nombre: "Chorizo con arepa", precio: 15000, foto: FOTO("photo-1750461325551-02b7ea57625a") }
      ]
    },
    {
      nombre: "Parrilla",
      platos: [
        { nombre: "Lomo al carbón 250 g", precio: 39000, foto: FOTO("photo-1599458253959-5d2d95a60397") },
        { nombre: "Churrasco 250 g", precio: 39000, foto: FOTO("photo-1542365887-1149961dccc7") },
        { nombre: "Churrasco de pollo", precio: 35000, foto: FOTO("photo-1641898378548-ac93da99786a") },
        { nombre: "Picada para dos", precio: 38500, foto: FOTO("photo-1702827487086-9ab8a573d825") },
        { nombre: "Picada para cuatro", precio: 71900, foto: FOTO("photo-1702827487553-50f7c1a43931") },
        { nombre: "Costilla San Luis 500 g", precio: 38000, foto: FOTO("photo-1595507238835-bff863eb6edb") },
        { nombre: "Pollo a la plancha 250 g", precio: 35000, foto: FOTO("photo-1532550907401-a500c9a57435") }
      ]
    },
    {
      nombre: "Hamburguesas",
      platos: [
        { nombre: "Angus importada 200 g", precio: 32000, foto: FOTO("photo-1572802419224-296b0aeee0d9") },
        { nombre: "De costilla", precio: 31000, foto: FOTO("photo-1568901346375-23c9450c58cd") },
        { nombre: "Ranchera", precio: 31000, foto: FOTO("photo-1571116213508-2a5017ab1324") },
        { nombre: "Montañera", precio: 29000, foto: FOTO("photo-1549611016-3a70d82b5040") },
        { nombre: "Res fusión x2", precio: 33000, foto: FOTO("photo-1428660386617-8d277e7deaf2") },
        { nombre: "Combo familiar x6", precio: 86000, foto: FOTO("photo-1610614819513-58e34989848b") },
        { nombre: "Pollo fusión x2", precio: 35000, foto: FOTO("photo-1703219342329-fce8488cf443") },
        { nombre: "Mini", precio: 13000, foto: FOTO("photo-1630927575869-252b8d8c1c82") },
        { nombre: "Vegetariana", precio: 24000, foto: FOTO("photo-1576843776838-032ac46fbb93") }
      ]
    },
    {
      nombre: "Bebidas",
      nota: "Limonadas, jugos y gaseosas",
      platos: [
        { nombre: "Limonada de coco", precio: 13500, foto: FOTO("photo-1619898804188-e7bad4bd2127") },
        { nombre: "Limonada de cereza", precio: 13500, foto: FOTO("photo-1632315948192-850c9f925af7") },
        { nombre: "Limonada de mango biche", precio: 13500, foto: FOTO("photo-1625667893125-ca3b9492946c") },
        { nombre: "Limonada natural", precio: 9000, foto: FOTO("photo-1507281549113-040fcfef650e") },
        { nombre: "Limonada de hierbabuena", precio: 11500, foto: FOTO("photo-1651993737174-6890c1daef5b") },
        { nombre: "Milo frío", precio: 14000, foto: FOTO("photo-1586195831800-24f14c992cea") },
        { nombre: "Frapuchino", precio: 16000, foto: FOTO("photo-1608593432708-96e0343b996c") },
        { nombre: "Soda italiana", precio: 15000, foto: FOTO("photo-1512482017241-ccce0181a7fd") },
        { nombre: "Granizado de café", precio: 14000, foto: FOTO("photo-1461023058943-07fcbe16d735") },
        { nombre: "Piña colada sin licor", precio: 13000, foto: FOTO("photo-1607644536940-6c300b5784c5") },
        { nombre: "Jugo en agua", precio: 10000, foto: FOTO("photo-1613478223719-2ab802602423") },
        { nombre: "Jugo en leche", precio: 12000, foto: FOTO("photo-1662130187270-a4d52c700eb6") },
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
        { nombre: "Copa de sangría", precio: 25000, foto: FOTO("photo-1618688224904-0b77adb7d178") },
        { nombre: "Copa de vino", precio: 25000, foto: FOTO("photo-1638186095578-7e58f9f16d0d") },
        { nombre: "Vino (botella)", precio: 60000, foto: FOTO("photo-1638186095900-179bc805de09") },
        { nombre: "Piscina roja para 2", precio: 70000, foto: FOTO("photo-1693680501302-92c21ca086e0") },
        { nombre: "Coctel de la casa", descripcion: "2 por $45.000", precio: 25000, foto: FOTO("photo-1638884890569-b9af6dd7bbd8") },
        { nombre: "Mojito", descripcion: "2 por $45.000", precio: 25000, foto: FOTO("photo-1509448613959-44d527dd5d86") },
        { nombre: "Margarita", precio: 25000, foto: FOTO("photo-1682630064338-e114ade226a2") },
        { nombre: "Orgasmo", precio: 30000, foto: FOTO("photo-1649368187303-bd3c3248e24b") },
        { nombre: "Tequila sunrise", descripcion: "2 por $45.000", precio: 25000, foto: FOTO("photo-1778104959499-a44402b0a628") },
        { nombre: "Gin tonic", precio: 25000, foto: FOTO("photo-1453825012366-3738046cb6c7") },
        { nombre: "Cuba libre", precio: 25000, foto: FOTO("photo-1517959105821-eaf2591984ca") },
        { nombre: "Piña colada con licor", precio: 24000, foto: FOTO("photo-1681251282201-d3b78a867e47") },
        { nombre: "Shot de tequila", precio: 20000, foto: FOTO("photo-1635547018520-043b6f0e1a36") }
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

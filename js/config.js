/*
  Datos de conexión de la carta.

  El "apiKey" de Firebase es público a propósito: con él solo no se puede cambiar nada.
  Quién edita qué lo deciden las reglas de Firestore (firebase/reglas.rules).
  NUNCA poner aquí contraseñas ni archivos de "cuenta de servicio" de Firebase.

  Mientras firebaseApiKey esté vacío, la carta sale de la copia guardada en datos/<restaurante>.json.
*/
window.CONFIG = {
  firebaseApiKey: "AIzaSyBWi2lwUOZCibPTQCVeTb7HrwoYh9W8wS4",   // "apiKey" de la configuración web de Firebase
  firebaseProyecto: "cartas-574bf",                            // "projectId"
  restaurante: "food-friends",
  logo: "logo.webp",        // desde la raíz del sitio
  // "Los más pedidos", arriba de las secciones y en este orden (el id de cada plato en la carta). Si el dueño borra uno
  // o lo marca agotado, no sale
  masPedidos: [
    "9609608b-b3aa-4827-baf2-a3b3ec61425b", // Especial de la casa
    "fef62ac6-7bcc-463f-84d6-6fafa5ac8695", // Angus importada 200 g
    "45f4a2d6-1e9a-44e0-be5a-2507315214cc", // Costilla San Luis 500 g
    "24a9f836-bb09-4c61-9585-5362ce1e1a20", // Picada para dos
    "a2c0d386-9165-49cd-9d14-364671f1601d", // Burrito mixto especial
    "664a507f-5eb6-463b-a37c-ddc8f4481b59"  // Lomo al carbón 250 g
  ],
  // Avisos que pide la ley (SIC): va fijo al final de la carta. Confirmado con el dueño el 30-sep-2026
  textoLegal: "Precios en pesos colombianos, con impuestos incluidos. La propina es voluntaria. " +
    "Prohibido el expendio de bebidas alcohólicas a menores de edad. El exceso de alcohol es perjudicial para la salud."
};

// Raíz del sitio (la carpeta de arriba de js/), para armar rutas desde cualquier página
window.CONFIG.raiz = new URL("..", document.currentScript.src).href;

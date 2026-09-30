/*
  Datos de conexión de la carta.

  El "apiKey" de Firebase es público a propósito: con él solo no se puede cambiar nada.
  Quién edita qué lo deciden las reglas de Firestore (firebase/reglas.rules).
  NUNCA poner aquí contraseñas ni archivos de "cuenta de servicio" de Firebase.

  Mientras firebaseApiKey esté vacío, la carta sale de la copia guardada en datos/<restaurante>.json.
*/
window.CONFIG = {
  firebaseApiKey: "",       // "apiKey" de la configuración web de Firebase
  firebaseProyecto: "",     // "projectId"
  restaurante: "food-friends",
  logo: "logo.webp"         // desde la raíz del sitio
};

// Raíz del sitio (la carpeta de arriba de js/), para armar rutas desde cualquier página
window.CONFIG.raiz = new URL("..", document.currentScript.src).href;

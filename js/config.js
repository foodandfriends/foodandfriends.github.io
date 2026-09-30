/*
  Datos de conexión de la carta.

  La clave "anon" de Supabase es pública a propósito: con ella sola no se puede cambiar nada.
  Quién edita qué lo deciden las reglas de la base de datos (supabase/esquema.sql).
  NUNCA poner aquí la clave "service_role" ni la contraseña de la base de datos.

  Mientras supabaseUrl esté vacío, la carta sale de la copia guardada en datos/<restaurante>.json.
*/
window.CONFIG = {
  supabaseUrl: "",          // la "Project URL", por ejemplo https://abcdefgh.supabase.co
  supabaseAnon: "",         // la clave "anon public"
  restaurante: "food-friends",
  logo: "logo.webp"         // desde la raíz del sitio
};

// Raíz del sitio (la carpeta de arriba de js/), para armar rutas desde cualquier página
window.CONFIG.raiz = new URL("..", document.currentScript.src).href;

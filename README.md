# Carta digital de Food and Friends

La carta del restaurante para verla en el celular con el QR de la mesa, con el diseño "Rock", y un panel
donde el dueño cambia platos, precios, fotos y agotados desde su celular.

- **Carta pública:** https://roypitw3.github.io/menu-food-friends/
- **Panel del dueño:** https://roypitw3.github.io/menu-food-friends/admin/
- **Propuestas de diseño que se le mostraron al dueño:** https://roypitw3.github.io/menu-food-friends/disenos/

Costo: $0. La página vive en GitHub Pages y los datos en el plan gratis de Supabase.

## Cómo funciona

| Pieza | Dónde | Qué hace |
|---|---|---|
| Carta pública | `index.html`, `js/carta-publica.js` | Trae la carta de Supabase y la pinta con `js/carta.js` |
| Panel | `admin/index.html`, `js/admin.js` | Login del dueño; platos, categorías, fotos, agotados y datos del local |
| Conexión | `js/supabase.js`, `js/config.js` | Habla con Supabase sin librerías externas |
| Base de datos | `supabase/esquema.sql` | Tablas, reglas de seguridad y carpeta de fotos |
| Respaldo | `scripts/respaldo.mjs`, `.github/workflows/respaldo.yml` | Copia diaria de la carta en `datos/` |

Si Supabase no responde (o todavía no está configurado), la carta pública sale de la copia en
`datos/food-friends.json`, así que el QR nunca muestra una página vacía.

## Seguridad

- **Las reglas viven en la base de datos**, no en la página. Cualquiera puede leer la carta; solo la cuenta
  de un dueño puede cambiar la carta de *su* restaurante. Aunque alguien copie el código o use la API directo,
  Supabase rechaza el cambio. Ver `supabase/esquema.sql`.
- **Nadie se puede registrar.** Las cuentas de los dueños se crean a mano en Supabase.
- Contraseñas cifradas por Supabase, con límite de intentos. Mínimo 10 caracteres.
- Permisos columna por columna: el dueño no puede cambiar el slug, crear restaurantes ni hacerse dueño de otro.
- Fotos: solo webp o jpg, máximo 1 MB, solo en la carpeta de su restaurante y máximo 400. El panel las achica
  en el celular antes de subirlas (queda cada una en unos 50 a 150 KB).
- Datos validados en la base (links solo `https://`, teléfonos solo números, textos con largo máximo) y la
  página muestra todo como texto, nunca como código.
- Las páginas solo cargan código propio (Content-Security-Policy) y el panel no se deja mostrar dentro de otra página.
- En `js/config.js` va solo la clave pública. **La clave `service_role` y la contraseña de la base nunca van
  en el repositorio.**
- `supabase/probar-reglas.mjs` ataca las reglas en el Supabase real y confirma que todo lo indebido queda bloqueado.

## Conectar Supabase (una sola vez)

1. En [supabase.com](https://supabase.com) entrar con GitHub y crear un proyecto nuevo en el plan **Free**,
   región **São Paulo** (la más cerca de Colombia). Guardar la contraseña de la base en un lugar seguro.
2. **SQL Editor** → pegar todo `supabase/esquema.sql` → **Run**.
3. **Authentication → Sign In / Providers:** apagar **Allow new users to sign up** y poner la contraseña
   mínima en 10 caracteres.
4. **Authentication → URL Configuration:** en **Site URL** y en **Redirect URLs** poner
   `https://roypitw3.github.io/menu-food-friends/admin/` (para el enlace de "Olvidé mi contraseña").
5. **Authentication → Users → Add user → Create new user:** la cuenta del dueño y la suya, con
   **Auto Confirm User** marcado.
6. **SQL Editor** → `supabase/nuevo-restaurante.sql` con los correos de esas cuentas → **Run**.
7. **Project Settings → API Keys:** copiar la **Project URL** y la clave pública (**anon** o **publishable**)
   en `js/config.js`, hacer commit y push.
8. Probar las reglas:

```bash
DUENO_CORREO=correo@del-dueno.com DUENO_CLAVE='su-clave' node supabase/probar-reglas.mjs
```

## Otro restaurante

La base ya sirve para varios restaurantes. Para uno nuevo: crear la cuenta del dueño (paso 5), correr
`supabase/nuevo-restaurante.sql` con otro slug, y publicar una copia de esta página con ese slug en
`js/config.js` (y su logo).

## Límites del plan gratis

500 MB de datos, 1 GB de fotos y 50.000 usuarios al mes. Supabase pausa los proyectos gratis tras 7 días
sin uso: las visitas a la carta y el respaldo diario lo mantienen activo. GitHub apaga las tareas programadas
de un repositorio que pasa 60 días sin cambios; si llega un correo de GitHub avisándolo, se reactiva en la
pestaña **Actions**.

## Las propuestas de diseño

`disenos/` tiene la presentación con las cinco opciones (Rock, Cartel, Terraza, Pizarra y Comanda) que se le
mandó al dueño, con una carta de muestra (`disenos/muestra.js`, fotos de Unsplash y precios de ejemplo).
`disenos/propuesta.js` tiene el número de WhatsApp de "Me gusta esta". `propuestas/` tiene las imágenes
para mandar por WhatsApp.

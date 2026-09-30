# Carta digital de Food and Friends

La carta del restaurante para verla en el celular con el QR de la mesa, con el diseño "Rock", y un panel
donde el dueño cambia platos, precios, fotos y agotados desde su celular.

- **Carta pública:** https://roypitw3.github.io/menu-food-friends/
- **Panel del dueño:** https://roypitw3.github.io/menu-food-friends/admin/
- **Propuestas de diseño que se le mostraron al dueño:** https://roypitw3.github.io/menu-food-friends/disenos/

Costo: $0. La página vive en GitHub Pages y los datos en el plan gratis de Firebase (Spark), que no pide
tarjeta y no se apaga por falta de uso.

## Cómo funciona

| Pieza | Dónde | Qué hace |
|---|---|---|
| Carta pública | `index.html`, `js/carta-publica.js` | Trae la carta de Firebase y la pinta con `js/carta.js` |
| Panel | `admin/index.html`, `js/admin.js` | Login del dueño; platos, categorías, fotos, agotados y datos del local |
| Conexión | `js/firebase.js`, `js/config.js` | Habla con Firebase por su API, sin librerías externas |
| Reglas de seguridad | `firebase/reglas.rules` | Quién puede leer y cambiar qué |
| Respaldo | `scripts/respaldo.mjs`, `.github/workflows/respaldo.yml` | Copia diaria de la carta y sus fotos en `datos/` |

Toda la carta de un restaurante es un solo documento de Firestore (`restaurantes/<slug>`): abrir la carta
cuesta una sola lectura. Las fotos van comprimidas (máximo 500 px) en documentos aparte
(`restaurantes/<slug>/fotos/<id>`). La copia diaria las deja también en `datos/fotos/`, y la carta las pide
primero de ahí, que es gratis; Firebase solo se usa para las fotos del mismo día. Cada celular guarda las
fotos que ya vio.

Si Firebase no responde (o todavía no está configurado), la carta pública sale de la copia en
`datos/food-friends.json`, así que el QR nunca muestra una página vacía.

## Seguridad

- **Las reglas viven en Firebase**, no en la página. Cualquiera puede leer la carta; solo la cuenta de un
  dueño puede cambiar la carta de *su* restaurante. Aunque alguien copie el código o use la API directo,
  Firebase rechaza el cambio. Ver `firebase/reglas.rules`.
- **Nadie se puede registrar.** Las cuentas de los dueños se crean a mano en la consola de Firebase, y quién
  es dueño de qué (`duenos/<uid>`) solo se cambia desde la consola.
- Contraseñas cifradas por Firebase, con bloqueo por intentos. Mínimo 10 caracteres.
- El dueño no puede borrar la carta, crear otros restaurantes, agregar campos raros ni poner enlaces que no
  sean `https://`.
- Fotos: solo webp o jpg, máximo 150 KB, solo en su restaurante, y una foto subida no se puede reemplazar
  (solo borrar). El panel las achica en el celular antes de subirlas.
- Si el dueño cambia la carta desde dos celulares a la vez, el segundo cambio no pisa el primero: el panel
  recarga lo último y le pide repetirlo.
- La página muestra todo como texto, nunca como código; solo carga código propio (Content-Security-Policy),
  y el panel no se deja mostrar dentro de otra página.
- En `js/config.js` va solo el `apiKey` web, que es público por diseño. **Nunca va una contraseña ni un
  archivo de cuenta de servicio.**
- `firebase/probar-reglas.mjs` ataca las reglas en el Firebase real y confirma que todo lo indebido queda bloqueado.

## Conectar Firebase (una sola vez)

1. En [console.firebase.google.com](https://console.firebase.google.com) → **Crear un proyecto** (`cartas`),
   sin Google Analytics. Queda en el plan **Spark** (gratis).
2. **Authentication** → **Comenzar** → **Correo electrónico/contraseña** → activarlo (sin "vínculo de correo").
   En **Configuración**: en **Acciones del usuario** quitar **Habilitar la creación (registro)** y
   **Habilitar la eliminación**; en **Política de contraseñas**, mínimo 10 caracteres.
3. **Firestore Database** → **Crear base de datos** → ubicación `southamerica-east1 (São Paulo)` → modo de
   **producción**. En la pestaña **Reglas** pegar todo `firebase/reglas.rules` → **Publicar**.
4. **Authentication → Usuarios → Agregar usuario**: el correo y la contraseña de cada dueño. Copiar el
   **UID** que le asigna.
5. **Firestore → Iniciar colección** `duenos` → ID del documento: el **UID** → campo `restaurantes`, tipo
   **array**, con un valor string `food-friends`.
6. **Configuración del proyecto** (engranaje) → **Tus apps** → **Web** (`</>`) → registrarla sin Hosting →
   copiar `apiKey` y `projectId` en `js/config.js`, hacer commit y push.
7. Entrar al panel: la primera vez crea la carta con los datos del local.
8. Probar las reglas (pide la contraseña sin mostrarla):

```bash
DUENO_CORREO=correo@del-dueno.com node firebase/probar-reglas.mjs
```

Opcional: en Google Cloud → **APIs y servicios → Credenciales**, restringir el `apiKey` al sitio
(`https://roypitw3.github.io/*`) y a las APIs Identity Toolkit, Token Service y Cloud Firestore.

## Otro restaurante

Las reglas ya sirven para varios restaurantes. Para uno nuevo: crear la cuenta del dueño (paso 4), su
documento en `duenos` con el slug nuevo (paso 5), y publicar una copia de esta página con ese slug en
`js/config.js` (y su logo).

## Límites del plan gratis

Por proyecto: 1 GiB guardado, 50.000 lecturas y 20.000 escrituras al día, y 10 GiB de transferencia al mes.
Abrir la carta es 1 lectura; las fotos salen casi siempre del sitio. GitHub apaga las tareas programadas de
un repositorio que pasa 60 días sin cambios; si llega un correo de GitHub avisándolo, se reactiva en la
pestaña **Actions**.

## Las propuestas de diseño

`disenos/` tiene la presentación con las cinco opciones (Rock, Cartel, Terraza, Pizarra y Comanda) que se le
mandó al dueño, con una carta de muestra (`disenos/muestra.js`, fotos de Unsplash y precios de ejemplo).
`disenos/propuesta.js` tiene el número de WhatsApp de "Me gusta esta". `propuestas/` tiene las imágenes
para mandar por WhatsApp.

-- ============================================================================
-- DAR DE ALTA UN RESTAURANTE Y SU DUEÑO
--
-- Se corre en Supabase → SQL Editor, después de esquema.sql.
--
-- Antes de correrlo, crear la cuenta de cada dueño en:
--   Authentication → Users → Add user → Create new user
--   (correo y contraseña, con "Auto Confirm User" marcado)
--
-- Cambie los datos entre comillas y corra todo. Si el restaurante ya existe,
-- solo le agrega los dueños que falten.
-- ============================================================================
with restaurante as (
  insert into public.restaurantes (slug, nombre, lugar, direccion, telefono, mapa, facebook)
  values (
    'food-friends',                                            -- el mismo de js/config.js
    'Food and Friends',
    'Parque Artesanal Loma de la Cruz · Cali',
    'Parque Artesanal, Cra. 16 #3-57, Cali, Valle del Cauca',
    '302 375 1571',
    'https://maps.app.goo.gl/9h77zzrGRmh3XMmB6',
    'https://www.facebook.com/foodandfriendscali/'
  )
  on conflict (slug) do update set slug = excluded.slug
  returning id
)
insert into public.duenos (restaurante_id, user_id)
select restaurante.id, u.id
from restaurante, auth.users u
where u.email in (
  'correo-del-dueno@ejemplo.com',                              -- el dueño del restaurante
  'su-correo@ejemplo.com'                                      -- usted, para poder ayudarle
)
on conflict do nothing;

-- Para revisar quién es dueño de qué:
-- select r.slug, u.email from public.duenos d
--   join public.restaurantes r on r.id = d.restaurante_id
--   join auth.users u on u.id = d.user_id order by 1, 2;

-- ============================================================================
-- CARTA DIGITAL: tablas, reglas de seguridad y fotos
--
-- Se pega completo en Supabase → SQL Editor → Run. Se puede volver a correr sin
-- perder datos (sirve para aplicar cambios de este archivo).
--
-- Quién puede qué:
--   * Cualquiera (el cliente con el QR) puede LEER las cartas.
--   * El dueño de un restaurante puede cambiar SOLO la carta de su restaurante:
--     platos, categorías, fotos y los datos del local (no el slug).
--   * Nadie puede crear restaurantes ni dueños desde la página: eso se hace aquí,
--     en el SQL Editor (ver nuevo-restaurante.sql).
-- ============================================================================

-- Funciones internas: van en un esquema que la API no publica
create schema if not exists privado;
revoke all on schema privado from public;
grant usage on schema privado to authenticated;

-- ----------------------------------------------------------------------------
-- Tablas
-- ----------------------------------------------------------------------------
create table if not exists public.restaurantes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 40),
  nombre text not null check (char_length(btrim(nombre)) between 1 and 80),
  lugar text check (char_length(lugar) <= 120),
  direccion text check (char_length(direccion) <= 160),
  telefono text check (telefono ~ '^[0-9 +]{7,20}$'),
  whatsapp text check (whatsapp ~ '^[0-9 +]{7,20}$'),
  mapa text check (mapa ~ '^https://[^\s"<>]+$' and char_length(mapa) <= 300),
  instagram text check (instagram ~ '^https://[^\s"<>]+$' and char_length(instagram) <= 300),
  facebook text check (facebook ~ '^https://[^\s"<>]+$' and char_length(facebook) <= 300),
  horario jsonb not null default '[]'::jsonb
    check (jsonb_typeof(horario) = 'array' and jsonb_array_length(horario) <= 14 and pg_column_size(horario) <= 2000),
  nota text check (char_length(nota) <= 200),
  creado timestamptz not null default now()
);

create table if not exists public.duenos (
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (restaurante_id, user_id)
);
create index if not exists duenos_user_id on public.duenos(user_id);

create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 60),
  nota text check (char_length(nota) <= 200),
  orden integer not null default 0,
  unique (id, restaurante_id)
);
create index if not exists categorias_restaurante on public.categorias(restaurante_id, orden);

create table if not exists public.platos (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  categoria_id uuid not null,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 80),
  descripcion text check (char_length(descripcion) <= 240),
  precio integer check (precio between 0 and 99999999),
  etiqueta text check (char_length(etiqueta) <= 30),
  agotado boolean not null default false,
  -- la foto solo puede ser un archivo de la carpeta del mismo restaurante
  foto text check (
    foto ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg)$'
    and split_part(foto, '/', 1) = restaurante_id::text
  ),
  orden integer not null default 0,
  actualizado timestamptz not null default now(),
  -- un plato no se puede meter en una categoría de otro restaurante
  foreign key (categoria_id, restaurante_id) references public.categorias(id, restaurante_id) on delete cascade
);
create index if not exists platos_restaurante on public.platos(restaurante_id, orden);
create index if not exists platos_categoria on public.platos(categoria_id, restaurante_id);

-- ----------------------------------------------------------------------------
-- Funciones de apoyo
-- ----------------------------------------------------------------------------
create or replace function privado.es_dueno(r uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.duenos d
    where d.restaurante_id = r and d.user_id = (select auth.uid())
  );
$$;

-- ¿La foto va en la carpeta de un restaurante de este dueño?
create or replace function privado.dueno_de_carpeta(nombre text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.duenos d
    where d.user_id = (select auth.uid())
      and d.restaurante_id::text = (storage.foldername(nombre))[1]
  );
$$;

create or replace function privado.fotos_en_carpeta(nombre text) returns bigint
language sql stable security definer set search_path = ''
as $$
  select count(*) from storage.objects o
  where o.bucket_id = 'fotos' and (storage.foldername(o.name))[1] = (storage.foldername(nombre))[1];
$$;

-- Tope de platos y categorías por restaurante (por si una cuenta cae en malas manos)
create or replace function privado.limite_carta() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_table_name = 'platos'
     and (select count(*) from public.platos where restaurante_id = new.restaurante_id) >= 300 then
    raise exception 'Llegó al máximo de 300 platos';
  elsif tg_table_name = 'categorias'
     and (select count(*) from public.categorias where restaurante_id = new.restaurante_id) >= 40 then
    raise exception 'Llegó al máximo de 40 categorías';
  end if;
  return new;
end;
$$;

create or replace function privado.marcar_actualizado() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.actualizado := now();
  return new;
end;
$$;

revoke all on all functions in schema privado from public, anon;
grant execute on all functions in schema privado to authenticated;

drop trigger if exists limite on public.platos;
create trigger limite before insert on public.platos for each row execute function privado.limite_carta();
drop trigger if exists limite on public.categorias;
create trigger limite before insert on public.categorias for each row execute function privado.limite_carta();
drop trigger if exists actualizado on public.platos;
create trigger actualizado before update on public.platos for each row execute function privado.marcar_actualizado();

-- ----------------------------------------------------------------------------
-- Permisos: solo lo necesario, columna por columna
-- ----------------------------------------------------------------------------
revoke all on public.restaurantes, public.duenos, public.categorias, public.platos from anon, authenticated;

grant select on public.restaurantes, public.categorias, public.platos to anon, authenticated;
grant select on public.duenos to authenticated;

grant update (nombre, lugar, direccion, telefono, whatsapp, mapa, instagram, facebook, horario, nota)
  on public.restaurantes to authenticated;
grant insert (restaurante_id, nombre, nota, orden), update (nombre, nota, orden), delete
  on public.categorias to authenticated;
grant insert (restaurante_id, categoria_id, nombre, descripcion, precio, etiqueta, agotado, foto, orden),
      update (categoria_id, nombre, descripcion, precio, etiqueta, agotado, foto, orden), delete
  on public.platos to authenticated;

-- ----------------------------------------------------------------------------
-- Reglas por fila (Row Level Security)
-- ----------------------------------------------------------------------------
alter table public.restaurantes enable row level security;
alter table public.duenos enable row level security;
alter table public.categorias enable row level security;
alter table public.platos enable row level security;

drop policy if exists "carta publica" on public.restaurantes;
create policy "carta publica" on public.restaurantes for select to anon, authenticated using (true);
drop policy if exists "el dueno edita" on public.restaurantes;
create policy "el dueno edita" on public.restaurantes for update to authenticated
  using (privado.es_dueno(id)) with check (privado.es_dueno(id));

drop policy if exists "mis restaurantes" on public.duenos;
create policy "mis restaurantes" on public.duenos for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "carta publica" on public.categorias;
create policy "carta publica" on public.categorias for select to anon, authenticated using (true);
drop policy if exists "el dueno crea" on public.categorias;
create policy "el dueno crea" on public.categorias for insert to authenticated
  with check (privado.es_dueno(restaurante_id));
drop policy if exists "el dueno cambia" on public.categorias;
create policy "el dueno cambia" on public.categorias for update to authenticated
  using (privado.es_dueno(restaurante_id)) with check (privado.es_dueno(restaurante_id));
drop policy if exists "el dueno borra" on public.categorias;
create policy "el dueno borra" on public.categorias for delete to authenticated
  using (privado.es_dueno(restaurante_id));

drop policy if exists "carta publica" on public.platos;
create policy "carta publica" on public.platos for select to anon, authenticated using (true);
drop policy if exists "el dueno crea" on public.platos;
create policy "el dueno crea" on public.platos for insert to authenticated
  with check (privado.es_dueno(restaurante_id));
drop policy if exists "el dueno cambia" on public.platos;
create policy "el dueno cambia" on public.platos for update to authenticated
  using (privado.es_dueno(restaurante_id)) with check (privado.es_dueno(restaurante_id));
drop policy if exists "el dueno borra" on public.platos;
create policy "el dueno borra" on public.platos for delete to authenticated
  using (privado.es_dueno(restaurante_id));

-- ----------------------------------------------------------------------------
-- Fotos (Supabase Storage)
-- Carpeta pública para ver; para subir o borrar hay que ser dueño de la carpeta
-- (la carpeta es el id del restaurante). Máximo 1 MB por foto, solo webp o jpg,
-- y máximo 400 fotos por restaurante. El panel achica las fotos antes de subirlas.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 1048576, array['image/webp', 'image/jpeg'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "fotos: el dueno sube" on storage.objects;
create policy "fotos: el dueno sube" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotos'
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg)$'
    and privado.dueno_de_carpeta(name)
    and privado.fotos_en_carpeta(name) < 400
  );
drop policy if exists "fotos: el dueno ve las suyas" on storage.objects;
create policy "fotos: el dueno ve las suyas" on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and privado.dueno_de_carpeta(name));
drop policy if exists "fotos: el dueno borra" on storage.objects;
create policy "fotos: el dueno borra" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and privado.dueno_de_carpeta(name));

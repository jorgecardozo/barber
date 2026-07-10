-- ============================================================
--  Flow Site — Multi-sucursal (multi-tenant)
--  Aditivo y seguro: agrega `sucursales`, `sucursal_id` (nullable) y una
--  sucursal por defecto con backfill. No rompe las queries actuales
--  (mientras `sucursal_id` sea nullable, todo sigue funcionando).
--  Cuando el app-layer scopee por sucursal, se puede volver NOT NULL.
-- ============================================================

-- ----- Tabla de sucursales --------------------------------------------------
create table if not exists public.sucursales (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  direccion   text default '',
  telefono    text default '',
  activa      boolean default true,
  created_at  timestamptz default now()
);

-- Miembros del staff por sucursal (un barbero/admin puede estar en varias).
create table if not exists public.sucursal_members (
  sucursal_id uuid references public.sucursales(id) on delete cascade,
  profile_id  uuid references public.profiles(id)   on delete cascade,
  rol         text not null default 'barbero',  -- 'admin' | 'barbero'
  primary key (sucursal_id, profile_id)
);

-- ----- sucursal_id en las tablas que "viven" en una sucursal ----------------
do $$
declare t text;
begin
  foreach t in array array[
    'barbers','services','appointments','working_hours','time_off','payments','app_settings'
  ]
  loop
    execute format('alter table public.%I add column if not exists sucursal_id uuid references public.sucursales(id);', t);
    execute format('create index if not exists idx_%s_sucursal on public.%I(sucursal_id);', t, t);
  end loop;
end $$;

-- ----- Sucursal por defecto + backfill --------------------------------------
do $$
declare s uuid; t text;
begin
  select id into s from public.sucursales order by created_at limit 1;
  if s is null then
    insert into public.sucursales (nombre, direccion)
    values ('Flow Site — San José Obrero 993', 'San José Obrero 993')
    returning id into s;
  end if;

  foreach t in array array[
    'barbers','services','appointments','working_hours','time_off','payments','app_settings'
  ]
  loop
    execute format('update public.%I set sucursal_id = %L where sucursal_id is null;', t, s);
    -- default temporal para que lo nuevo se etiquete solo hasta que el front lo mande.
    execute format('alter table public.%I alter column sucursal_id set default %L;', t, s);
  end loop;

  -- Todos los barberos/admin actuales quedan como miembros de la sucursal default.
  insert into public.sucursal_members (sucursal_id, profile_id, rol)
  select s, p.id, p.role
  from public.profiles p
  where p.role in ('admin','barbero')
  on conflict do nothing;
end $$;

-- ----- RLS de las tablas nuevas (permisivo dev; afinar en producción) -------
alter table public.sucursales enable row level security;
alter table public.sucursal_members enable row level security;
drop policy if exists "sucursales_read" on public.sucursales;
create policy "sucursales_read" on public.sucursales for select using (true);
drop policy if exists "members_read" on public.sucursal_members;
create policy "members_read" on public.sucursal_members for select using (true);

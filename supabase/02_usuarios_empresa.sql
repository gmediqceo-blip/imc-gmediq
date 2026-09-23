-- =====================================================================
--  02 — EMPRESA EN USUARIOS + FUNCIONES DE PERMISO
--
--  Es aditivo y seguro: agrega una columna con valor por defecto 'IMC'
--  y crea funciones auxiliares. NO cambia ninguna política todavía,
--  así que la app sigue comportándose exactamente igual después de
--  ejecutarlo. Las políticas vienen en el paso 03, con el diagnóstico
--  en la mano.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Columna empresa
--    Todos los usuarios que ya existen quedan como 'IMC', que es la
--    realidad de hoy. La secretaria de Gmediq se creará con 'GMEDIQ'
--    y los dos gerentes pasan a 'AMBAS'.
-- ---------------------------------------------------------------------
alter table public.usuarios
  add column if not exists empresa text not null default 'IMC';

alter table public.usuarios
  drop constraint if exists usuarios_empresa_check;

alter table public.usuarios
  add constraint usuarios_empresa_check
  check (empresa in ('IMC', 'GMEDIQ', 'AMBAS'));

comment on column public.usuarios.empresa is
  'Sobre qué datos actúa el usuario. El rol dice qué puede hacer.';

-- ---------------------------------------------------------------------
-- 2. Funciones de permiso
--
--    Van con SECURITY DEFINER a propósito: así pueden consultar la
--    tabla usuarios sin quedar atrapadas en las políticas de esa misma
--    tabla (lo que provocaría recursión infinita al evaluarlas).
--    El search_path fijo evita que alguien las redirija a otro esquema.
-- ---------------------------------------------------------------------

create or replace function public.mi_rol()
returns text
language sql stable security definer set search_path = public
as $$
  select rol from public.usuarios where id = auth.uid() and activo;
$$;

create or replace function public.mi_empresa()
returns text
language sql stable security definer set search_path = public
as $$
  select empresa from public.usuarios where id = auth.uid() and activo;
$$;

-- Ve dinero: saldos, panel, reportes. Solo los gerentes.
create or replace function public.es_gerente()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select rol in ('admin', 'gerente') from public.usuarios
     where id = auth.uid() and activo),
    false);
$$;

-- Ve datos clínicos de pacientes. La secretaria de Gmediq NO entra aquí.
create or replace function public.ve_clinica()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((
    select (rol in ('admin', 'gerente', 'medico', 'nutricionista',
                    'fisioterapeuta', 'cosmetologa')
            and empresa in ('IMC', 'AMBAS'))
        or (rol = 'secretaria' and empresa in ('IMC', 'AMBAS'))
    from public.usuarios where id = auth.uid() and activo
  ), false);
$$;

-- Registra movimientos de caja: los cuatro.
create or replace function public.registra_caja()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select rol in ('admin', 'gerente', 'secretaria') from public.usuarios
     where id = auth.uid() and activo),
    false);
$$;

grant execute on function public.mi_rol, public.mi_empresa,
  public.es_gerente, public.ve_clinica, public.registra_caja
  to authenticated;

-- ---------------------------------------------------------------------
-- 3. Comprobación: mira cómo queda cada usuario
-- ---------------------------------------------------------------------
select nombre, apellido, rol, empresa, activo from public.usuarios order by rol;

-- ---------------------------------------------------------------------
-- 4. Pendiente tuyo: poner a los dos gerentes en 'AMBAS'.
--    Descomenta y pon los correos reales antes de ejecutar.
-- ---------------------------------------------------------------------
-- update public.usuarios set empresa = 'AMBAS'
--  where email in ('correo-gerente-1@...', 'correo-gerente-2@...');

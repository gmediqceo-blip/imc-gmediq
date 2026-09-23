-- =====================================================================
--  MÓDULO DE CAJA — IMC / Gmediq
--
--  Todo lleva prefijo caja_ y vive aparte de lo clínico. La pertenencia
--  al módulo se decide en caja_usuarios, NO en la tabla usuarios de la
--  clínica: así la secretaria de Gmediq nunca tiene rol_actual(), y las
--  131 políticas clínicas la rechazan solas, sin que toquemos ninguna.
--
--  Reglas que el esquema hace cumplir, no solo la pantalla:
--    · Las secretarias no ven saldos.        (caja_saldos exige gerente)
--    · Las secretarias no ven sueldos.       (categorías confidenciales)
--    · Nada se borra: se anula y queda rastro.
--    · Un traslado nunca es ingreso ni gasto.
--    · Las tarjetas no suman al disponible hasta liquidarse.
-- =====================================================================

begin;

-- =====================================================================
--  TIPOS
-- =====================================================================
do $$ begin
  create type caja_empresa      as enum ('IMC', 'GMEDIQ', 'COMPARTIDO');
  create type caja_rol          as enum ('gerente', 'secretaria');
  create type caja_tipo_cuenta  as enum ('banco', 'efectivo', 'transito');
  create type caja_tipo_mov     as enum ('ingreso', 'egreso', 'traslado');
  create type caja_estado_caso  as enum ('abierto', 'realizado', 'cancelado');
  create type caja_naturaleza   as enum ('fijo', 'variable');
exception when duplicate_object then null; end $$;

-- =====================================================================
--  QUIÉN ENTRA AL MÓDULO
-- =====================================================================
create table if not exists public.caja_usuarios (
  id        uuid primary key references auth.users on delete cascade,
  nombre    text not null,
  rol       caja_rol not null,
  empresa   caja_empresa not null,     -- la secretaria de Gmediq: 'GMEDIQ'
  activo    boolean not null default true,
  creado_en timestamptz not null default now()
);

comment on table public.caja_usuarios is
  'Pertenencia al módulo de caja. Separada a propósito de public.usuarios: '
  'estar aquí no da ningún acceso a datos clínicos.';

-- Con SECURITY DEFINER para que puedan consultar caja_usuarios sin quedar
-- atrapadas en las políticas de esa misma tabla (recursión infinita).
create or replace function public.caja_es_miembro()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.caja_usuarios
                 where id = auth.uid() and activo);
$$;

create or replace function public.caja_es_gerente()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select rol = 'gerente' from public.caja_usuarios
                   where id = auth.uid() and activo), false);
$$;

create or replace function public.caja_mi_empresa()
returns caja_empresa language sql stable security definer set search_path = public as $$
  select empresa from public.caja_usuarios where id = auth.uid() and activo;
$$;

-- =====================================================================
--  PARÁMETROS
-- =====================================================================
create table if not exists public.caja_parametros (
  clave       text primary key,
  valor       numeric(12,2) not null,
  descripcion text
);

insert into public.caja_parametros (clave, valor, descripcion) values
  ('tarifa_interbancaria', 0.41,
   'Lo que cobra Produbanco por transferir a otro banco'),
  ('abono_bariatrica', 500.00,
   'Reserva que se pide para manga o bypass')
on conflict (clave) do nothing;

-- =====================================================================
--  LAS SEIS CUENTAS
--  El saldo inicial va en tabla aparte: es lo que convierte los
--  movimientos en un saldo, y las secretarias no deben poder leerlo.
-- =====================================================================
create table if not exists public.caja_cuentas (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  tipo   caja_tipo_cuenta not null,
  orden  int not null default 0,
  activa boolean not null default true
);

create table if not exists public.caja_apertura (
  cuenta_id     uuid primary key references public.caja_cuentas on delete cascade,
  saldo_inicial numeric(12,2) not null,
  fecha         date not null default current_date
);

comment on table public.caja_apertura is
  'Saldo declarado el día de arranque. Solo gerentes: sin este número '
  'nadie puede deducir el saldo, aunque vea todos los movimientos.';

insert into public.caja_cuentas (nombre, tipo, orden) values
  ('Produbanco', 'banco',    1),
  ('Pichincha',  'banco',    2),
  ('Efectivo',   'efectivo', 3),
  ('Datafast',   'transito', 4),
  ('PayPhone',   'transito', 5),
  ('Bendo',      'transito', 6)
on conflict (nombre) do nothing;

-- =====================================================================
--  CATEGORÍAS
-- =====================================================================
create table if not exists public.caja_categorias (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  tipo             caja_tipo_mov not null check (tipo in ('ingreso','egreso')),
  naturaleza       caja_naturaleza,        -- solo egresos
  costo_directo    boolean not null default false,  -- se liga a un caso
  confidencial     boolean not null default false,  -- oculto a secretarias
  empresa_sugerida caja_empresa,
  monto_habitual   numeric(12,2),
  es_fija_mensual  boolean not null default false,
  activa           boolean not null default true,
  orden            int not null default 0,
  unique (nombre, tipo)
);

-- --- Servicios que generan ingreso ------------------------------------
insert into public.caja_categorias (nombre, tipo, orden) values
  ('Cirugía bariátrica',        'ingreso',  1),
  ('Balón gástrico',            'ingreso',  2),
  ('Endoscopía',                'ingreso',  3),
  ('Consulta medicina general', 'ingreso',  4),
  ('Medicina interna',          'ingreso',  5),
  ('Nutrición',                 'ingreso',  6),
  ('Psicología',                'ingreso',  7),
  ('Fisioterapia',              'ingreso',  8),
  ('Cosmetología',              'ingreso',  9),
  ('InBody',                    'ingreso', 10),
  ('Otro ingreso',              'ingreso', 99)
on conflict (nombre, tipo) do nothing;

-- --- Los 22 rubros del mes, con sus montos habituales ------------------
--     confidencial = true en sueldos e IESS: las secretarias no los ven.
insert into public.caja_categorias
  (nombre, tipo, naturaleza, monto_habitual, es_fija_mensual,
   empresa_sugerida, costo_directo, confidencial, orden) values
  ('Arriendo IMC',           'egreso','fijo',     739.00, true, 'IMC',       false,false, 1),
  ('Arriendo Gmediq',        'egreso','fijo',     586.50, true, 'GMEDIQ',    false,false, 2),
  ('Alícuota',               'egreso','fijo',      90.04, true, 'GMEDIQ',    false,false, 3),
  ('Luz IMC',                'egreso','fijo',      25.76, true, 'IMC',       false,false, 4),
  ('Luz Gmediq',             'egreso','fijo',      35.00, true, 'GMEDIQ',    false,false, 5),
  ('Internet IMC',           'egreso','fijo',      20.40, true, 'IMC',       false,false, 6),
  ('Internet Gmediq',        'egreso','fijo',      20.40, true, 'GMEDIQ',    false,false, 7),
  ('Office',                 'egreso','fijo',      13.00, true, 'COMPARTIDO',false,false, 8),
  ('Plan',                   'egreso','fijo',      23.00, true, 'COMPARTIDO',false,false, 9),
  ('InBody',                 'egreso','fijo',     317.01, true, 'IMC',       false,false,10),
  ('Sueldo nutrición',       'egreso','fijo',     800.00, true, null,        false,true, 11),
  ('Sueldo médico general',  'egreso','fijo',     700.00, true, null,        false,true, 12),
  ('Sueldo cosmetología',    'egreso','fijo',     450.00, true, 'IMC',       false,true, 13),
  ('Sueldo psicólogo',       'egreso','fijo',     400.00, true, null,        false,true, 14),
  ('Sueldo secretaria',      'egreso','fijo',     503.00, true, null,        false,true, 15),
  ('IESS empleador',         'egreso','fijo',     105.00, true, null,        false,true, 16),
  ('Publicidad',             'egreso','variable',1221.48, true, 'COMPARTIDO',false,false,17),
  ('Autosuturas',            'egreso','variable',1320.00, true, 'GMEDIQ',    true, false,18),
  ('ITECC (endoscopías)',    'egreso','variable', 840.00, true, 'GMEDIQ',    true, false,19),
  ('Laboratorios',           'egreso','variable', 500.00, true, 'GMEDIQ',    true, false,20),
  ('Medicina interna',       'egreso','variable', 150.00, true, 'GMEDIQ',    true, false,21),
  ('Honorarios fisioterapia','egreso','variable',  40.00, true, 'IMC',       true, false,22),
  ('Otros',                  'egreso','variable',   null, false,null,        false,false,99)
on conflict (nombre, tipo) do nothing;

-- =====================================================================
--  CASOS — un paciente, un procedimiento, su plata y sus costos
-- =====================================================================
create table if not exists public.caja_casos (
  id             uuid primary key default gen_random_uuid(),
  paciente       text not null,
  servicio       text not null,
  empresa        caja_empresa not null,
  valor_acordado numeric(12,2),          -- opcional: si se llena, hay "por cobrar"
  estado         caja_estado_caso not null default 'abierto',
  fecha_apertura date not null default current_date,
  fecha_cierre   date,
  notas          text,
  creado_por     uuid not null default auth.uid() references public.caja_usuarios,
  creado_en      timestamptz not null default now(),
  constraint caja_casos_cierre check (
    (estado = 'abierto' and fecha_cierre is null) or
    (estado <> 'abierto' and fecha_cierre is not null))
);

comment on table public.caja_casos is
  'Mientras está abierto, sus abonos son plata comprometida: entró a la '
  'cuenta pero todavía no es nuestra. Al realizarse se libera. Si se '
  'cancela también, porque no hay devolución.';

-- =====================================================================
--  MOVIMIENTOS — ingreso, egreso y traslado en una sola tabla
-- =====================================================================
create table if not exists public.caja_movimientos (
  id                uuid primary key default gen_random_uuid(),
  tipo              caja_tipo_mov not null,
  fecha             date not null default current_date,
  monto             numeric(12,2) not null check (monto > 0),
  monto_recibido    numeric(12,2) check (monto_recibido > 0),  -- solo traslado
  cuenta_id         uuid not null references public.caja_cuentas,
  cuenta_destino_id uuid references public.caja_cuentas,       -- solo traslado
  categoria_id      uuid references public.caja_categorias,
  caso_id           uuid references public.caja_casos,
  empresa           caja_empresa,
  contraparte       text,               -- quién paga / a quién se paga
  descripcion       text,
  interbancaria     boolean not null default false,
  comision          numeric(12,2) not null default 0 check (comision >= 0),
  anulado           boolean not null default false,
  motivo_anulacion  text,
  anulado_por       uuid references public.caja_usuarios,
  anulado_en        timestamptz,
  creado_por        uuid not null default auth.uid() references public.caja_usuarios,
  creado_en         timestamptz not null default now(),

  constraint caja_forma_ingreso check (tipo <> 'ingreso' or (
    cuenta_destino_id is null and monto_recibido is null
    and categoria_id is not null and empresa is not null)),

  constraint caja_forma_egreso check (tipo <> 'egreso' or (
    cuenta_destino_id is null and monto_recibido is null
    and categoria_id is not null and empresa is not null)),

  constraint caja_forma_traslado check (tipo <> 'traslado' or (
    cuenta_destino_id is not null and cuenta_destino_id <> cuenta_id
    and monto_recibido is not null and monto_recibido <= monto
    and categoria_id is null and caso_id is null)),

  constraint caja_anulacion check (not anulado or (
    motivo_anulacion is not null and anulado_por is not null
    and anulado_en is not null))
);

create index if not exists caja_mov_fecha    on public.caja_movimientos (fecha desc);
create index if not exists caja_mov_cuenta   on public.caja_movimientos (cuenta_id);
create index if not exists caja_mov_caso     on public.caja_movimientos (caso_id) where caso_id is not null;
create index if not exists caja_mov_empresa  on public.caja_movimientos (empresa);

-- --- La categoría debe corresponder al tipo, y la comisión se calcula --
create or replace function public.caja_mov_validar()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_tipo caja_tipo_mov; v_tarifa numeric;
begin
  if new.categoria_id is not null then
    select tipo into v_tipo from public.caja_categorias where id = new.categoria_id;
    if v_tipo is distinct from new.tipo then
      raise exception 'La categoría no corresponde a un movimiento de tipo %', new.tipo;
    end if;
  end if;

  -- Nadie escribe la comisión a mano: si hay que teclearla, no se teclea.
  if new.tipo = 'egreso' and new.interbancaria then
    select valor into v_tarifa from public.caja_parametros
     where clave = 'tarifa_interbancaria';
    new.comision := coalesce(v_tarifa, 0);
  elsif new.tipo = 'traslado' then
    new.comision := new.monto - new.monto_recibido;   -- lo que se quedó la plataforma
  else
    new.comision := 0;
  end if;

  return new;
end $$;

drop trigger if exists caja_mov_validar_trg on public.caja_movimientos;
create trigger caja_mov_validar_trg
  before insert or update on public.caja_movimientos
  for each row execute function public.caja_mov_validar();

-- =====================================================================
--  COMPROMISOS — "dejamos ese dinero ahí"
--  Plata que ya se debe y todavía no sale de la cuenta.
-- =====================================================================
create table if not exists public.caja_compromisos (
  id             uuid primary key default gen_random_uuid(),
  descripcion    text not null,
  monto          numeric(12,2) not null check (monto > 0),
  caso_id        uuid references public.caja_casos,
  empresa        caja_empresa,
  fecha_estimada date,
  movimiento_id  uuid references public.caja_movimientos,  -- al pagarse
  creado_por     uuid not null default auth.uid() references public.caja_usuarios,
  creado_en      timestamptz not null default now()
);

-- =====================================================================
--  LAS FIJAS DEL MES — para no volver a teclear el arriendo
-- =====================================================================
create table if not exists public.caja_fijas_mes (
  id             uuid primary key default gen_random_uuid(),
  periodo        date not null,          -- primer día del mes
  categoria_id   uuid not null references public.caja_categorias,
  monto_esperado numeric(12,2) not null,
  movimiento_id  uuid references public.caja_movimientos,   -- al marcarse pagada
  unique (periodo, categoria_id)
);

commit;

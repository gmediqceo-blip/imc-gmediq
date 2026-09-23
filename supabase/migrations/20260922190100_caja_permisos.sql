-- =====================================================================
--  MÓDULO DE CAJA — permisos y lecturas
--
--  Las reglas que acordamos, escritas en la base y no en la pantalla:
--  aunque alguien se salte la interfaz y pregunte directo a la API,
--  obtiene lo mismo que le muestra la app.
-- =====================================================================

begin;

alter table public.caja_usuarios    enable row level security;
alter table public.caja_parametros  enable row level security;
alter table public.caja_cuentas     enable row level security;
alter table public.caja_apertura    enable row level security;
alter table public.caja_categorias  enable row level security;
alter table public.caja_casos       enable row level security;
alter table public.caja_movimientos enable row level security;
alter table public.caja_compromisos enable row level security;
alter table public.caja_fijas_mes   enable row level security;

-- ---------------------------------------------------------------------
-- Quién es quién: cada uno se ve a sí mismo, los gerentes ven a todos
-- ---------------------------------------------------------------------
drop policy if exists caja_usuarios_select on public.caja_usuarios;
create policy caja_usuarios_select on public.caja_usuarios
  for select using (id = auth.uid() or caja_es_gerente());

drop policy if exists caja_usuarios_admin on public.caja_usuarios;
create policy caja_usuarios_admin on public.caja_usuarios
  for all using (caja_es_gerente()) with check (caja_es_gerente());

-- ---------------------------------------------------------------------
-- Parámetros y cuentas: todos los leen (hay que elegir cuenta al
-- registrar), solo los gerentes los cambian.
-- ---------------------------------------------------------------------
drop policy if exists caja_parametros_select on public.caja_parametros;
create policy caja_parametros_select on public.caja_parametros
  for select using (caja_es_miembro());

drop policy if exists caja_parametros_admin on public.caja_parametros;
create policy caja_parametros_admin on public.caja_parametros
  for all using (caja_es_gerente()) with check (caja_es_gerente());

drop policy if exists caja_cuentas_select on public.caja_cuentas;
create policy caja_cuentas_select on public.caja_cuentas
  for select using (caja_es_miembro());

drop policy if exists caja_cuentas_admin on public.caja_cuentas;
create policy caja_cuentas_admin on public.caja_cuentas
  for all using (caja_es_gerente()) with check (caja_es_gerente());

-- ---------------------------------------------------------------------
-- El saldo inicial: SOLO gerentes.
--
-- Aquí es donde "las secretarias no ven saldos" deja de ser una promesa
-- de la interfaz. Una secretaria puede ver los movimientos de su
-- empresa, pero sin el saldo de apertura no puede reconstruir cuánto
-- hay en ninguna cuenta.
-- ---------------------------------------------------------------------
drop policy if exists caja_apertura_gerente on public.caja_apertura;
create policy caja_apertura_gerente on public.caja_apertura
  for all using (caja_es_gerente()) with check (caja_es_gerente());

-- ---------------------------------------------------------------------
-- Categorías: las secretarias no ven las confidenciales (sueldos, IESS)
-- ---------------------------------------------------------------------
drop policy if exists caja_categorias_select on public.caja_categorias;
create policy caja_categorias_select on public.caja_categorias
  for select using (
    caja_es_gerente() or (caja_es_miembro() and not confidencial));

drop policy if exists caja_categorias_admin on public.caja_categorias;
create policy caja_categorias_admin on public.caja_categorias
  for all using (caja_es_gerente()) with check (caja_es_gerente());

-- ---------------------------------------------------------------------
-- Casos: cada secretaria trabaja los de su empresa
-- ---------------------------------------------------------------------
drop policy if exists caja_casos_select on public.caja_casos;
create policy caja_casos_select on public.caja_casos
  for select using (
    caja_es_gerente() or (caja_es_miembro() and empresa = caja_mi_empresa()));

drop policy if exists caja_casos_insert on public.caja_casos;
create policy caja_casos_insert on public.caja_casos
  for insert with check (
    caja_es_gerente() or (caja_es_miembro() and empresa = caja_mi_empresa()));

drop policy if exists caja_casos_update on public.caja_casos;
create policy caja_casos_update on public.caja_casos
  for update using (
    caja_es_gerente() or (caja_es_miembro() and empresa = caja_mi_empresa()));

-- ---------------------------------------------------------------------
-- Movimientos
--
--   Gerentes:    todo.
--   Secretarias: registran ingresos y egresos de su empresa;
--                ven los de su empresa salvo los confidenciales;
--                corrigen los que ellas registraron.
--   Traslados:   solo gerentes (liquidaciones, movimientos entre bancos).
--   Nadie borra: no existe política de DELETE. Se anula y queda rastro.
-- ---------------------------------------------------------------------
drop policy if exists caja_mov_select on public.caja_movimientos;
create policy caja_mov_select on public.caja_movimientos
  for select using (
    caja_es_gerente() or (
      caja_es_miembro()
      and tipo in ('ingreso', 'egreso')
      and empresa = caja_mi_empresa()
      and not coalesce((select c.confidencial from public.caja_categorias c
                        where c.id = categoria_id), false)));

drop policy if exists caja_mov_insert on public.caja_movimientos;
create policy caja_mov_insert on public.caja_movimientos
  for insert with check (
    caja_es_gerente() or (
      caja_es_miembro()
      and tipo in ('ingreso', 'egreso')
      and empresa = caja_mi_empresa()
      and creado_por = auth.uid()
      and not coalesce((select c.confidencial from public.caja_categorias c
                        where c.id = categoria_id), false)));

drop policy if exists caja_mov_update on public.caja_movimientos;
create policy caja_mov_update on public.caja_movimientos
  for update using (
    caja_es_gerente() or (caja_es_miembro() and creado_por = auth.uid()));

-- ---------------------------------------------------------------------
-- Compromisos y fijas del mes
-- Las fijas llevan los montos de sueldos: gerentes únicamente.
-- ---------------------------------------------------------------------
drop policy if exists caja_compromisos_select on public.caja_compromisos;
create policy caja_compromisos_select on public.caja_compromisos
  for select using (
    caja_es_gerente() or (caja_es_miembro() and empresa = caja_mi_empresa()));

drop policy if exists caja_compromisos_admin on public.caja_compromisos;
create policy caja_compromisos_admin on public.caja_compromisos
  for all using (caja_es_gerente()) with check (caja_es_gerente());

drop policy if exists caja_fijas_gerente on public.caja_fijas_mes;
create policy caja_fijas_gerente on public.caja_fijas_mes
  for all using (caja_es_gerente()) with check (caja_es_gerente());

-- =====================================================================
--  LECTURAS DE DINERO
--
--  Van como funciones y no como vistas a propósito: una vista con
--  security_invoker le devolvería a una secretaria un saldo calculado
--  sin el monto de apertura — es decir, un número equivocado en vez de
--  un "no autorizado". Un saldo mal es peor que ningún saldo.
-- =====================================================================

create or replace function public.caja_saldos()
returns table (cuenta text, tipo caja_tipo_cuenta, saldo numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.caja_es_gerente() then
    raise exception 'No autorizado: los saldos son solo para gerentes';
  end if;

  return query
    select c.nombre, c.tipo,
      coalesce(a.saldo_inicial, 0)
      + coalesce((select sum(m.monto) from public.caja_movimientos m
                  where m.cuenta_id = c.id and m.tipo = 'ingreso' and not m.anulado), 0)
      - coalesce((select sum(m.monto + m.comision) from public.caja_movimientos m
                  where m.cuenta_id = c.id and m.tipo = 'egreso' and not m.anulado), 0)
      - coalesce((select sum(m.monto) from public.caja_movimientos m
                  where m.cuenta_id = c.id and m.tipo = 'traslado' and not m.anulado), 0)
      + coalesce((select sum(m.monto_recibido) from public.caja_movimientos m
                  where m.cuenta_destino_id = c.id and m.tipo = 'traslado' and not m.anulado), 0)
    from public.caja_cuentas c
    left join public.caja_apertura a on a.cuenta_id = c.id
    where c.activa
    order by c.orden;
end $$;

-- ---------------------------------------------------------------------
-- El panel: disponible, comprometido y lo que de verdad está libre
-- ---------------------------------------------------------------------
create or replace function public.caja_panel()
returns table (
  disponible           numeric,   -- bancos + efectivo
  en_transito          numeric,   -- cobrado por tarjeta, aún no depositado
  abonos_comprometidos numeric,   -- de casos todavía abiertos
  costos_apartados     numeric,   -- ya se debe, no ha salido
  libre                numeric)   -- disponible − comprometido
language plpgsql stable security definer set search_path = public as $$
declare v_disp numeric; v_tran numeric; v_abonos numeric; v_costos numeric;
begin
  if not public.caja_es_gerente() then
    raise exception 'No autorizado: el panel es solo para gerentes';
  end if;

  select coalesce(sum(s.saldo) filter (where s.tipo in ('banco','efectivo')), 0),
         coalesce(sum(s.saldo) filter (where s.tipo = 'transito'), 0)
    into v_disp, v_tran
    from public.caja_saldos() s;

  -- Abonos de casos abiertos: el dinero está en la cuenta, pero el
  -- paciente todavía no se operó. "Es como que no existe."
  select coalesce(sum(m.monto), 0) into v_abonos
    from public.caja_movimientos m
    join public.caja_casos k on k.id = m.caso_id
   where m.tipo = 'ingreso' and not m.anulado and k.estado = 'abierto';

  select coalesce(sum(c.monto), 0) into v_costos
    from public.caja_compromisos c
   where c.movimiento_id is null;

  return query select v_disp, v_tran, v_abonos, v_costos,
                      v_disp - v_abonos - v_costos;
end $$;

-- ---------------------------------------------------------------------
-- Resultado por caso: la otra lectura, la que cruza meses.
-- La caja se mide por mes; el resultado de un caso, por caso.
-- ---------------------------------------------------------------------
create or replace function public.caja_resultado_casos()
returns table (
  caso_id   uuid,
  paciente  text,
  servicio  text,
  empresa   caja_empresa,
  estado    caja_estado_caso,
  cobrado   numeric,
  costo     numeric,
  aporte    numeric,
  por_cobrar numeric)
language sql stable security definer set search_path = public as $$
  select k.id, k.paciente, k.servicio, k.empresa, k.estado,
         coalesce(i.total, 0) as cobrado,
         coalesce(e.total, 0) as costo,
         coalesce(i.total, 0) - coalesce(e.total, 0) as aporte,
         case when k.valor_acordado is null then null
              else k.valor_acordado - coalesce(i.total, 0) end as por_cobrar
  from public.caja_casos k
  left join lateral (
    select sum(m.monto) total from public.caja_movimientos m
     where m.caso_id = k.id and m.tipo = 'ingreso' and not m.anulado) i on true
  left join lateral (
    select sum(m.monto + m.comision) total from public.caja_movimientos m
     where m.caso_id = k.id and m.tipo = 'egreso' and not m.anulado) e on true
  where public.caja_es_gerente()
     or (public.caja_es_miembro() and k.empresa = public.caja_mi_empresa())
  order by k.fecha_apertura desc;
$$;

grant execute on function public.caja_es_miembro, public.caja_es_gerente,
  public.caja_mi_empresa, public.caja_saldos, public.caja_panel,
  public.caja_resultado_casos to authenticated;

commit;

-- ---------------------------------------------------------------------
-- Comprobación
-- ---------------------------------------------------------------------
select tablename || ' | ' || policyname || ' | ' || cmd as resultado
from pg_policies
where schemaname = 'public' and tablename like 'caja_%'
order by tablename, policyname;

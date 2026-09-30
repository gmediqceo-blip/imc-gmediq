-- =====================================================================
--  REINICIO DE CAJA — 30 de septiembre de 2026
--
--  Se borra todo lo registrado hasta ahora y se declara de nuevo la
--  apertura con los saldos reales de hoy. No se pierde información de
--  dinero: los cobros que estaban cargados ya están contenidos dentro
--  de los saldos que se declaran aquí.
--
--  Saldos dados por Diego:
--    Produbanco  9.186,50
--    Pichincha      80,81
--    PayPhone    6.055,82   (en tránsito)
--    Bendo          40,00   (en tránsito)
--    Datafast           0
--    Efectivo           0   <-- NO lo dio; se asume cero
--
--  De ese dinero hay 1.000 comprometidos: dos abonos de 500, de Andrea
--  Pavón y Leslie Guarnizo, que se asumen recibidos en Produbanco.
--  Por eso Produbanco se declara en 8.186,50 y los 1.000 entran como
--  dos ingresos ligados a su paciente. Sumados dan los 9.186,50 reales.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Borrar todo. En este orden: primero lo que apunta a movimientos.
-- ---------------------------------------------------------------------
delete from public.caja_fijas_mes;
delete from public.caja_compromisos;
-- Los cobros apuntan a su traslado de liquidación; se suelta esa
-- referencia antes de borrar para que el orden no importe.
update public.caja_movimientos set liquidacion_id = null where liquidacion_id is not null;
delete from public.caja_movimientos;
delete from public.caja_casos;

-- ---------------------------------------------------------------------
-- 2. Apertura con fecha de hoy
-- ---------------------------------------------------------------------
insert into public.caja_apertura (cuenta_id, saldo_inicial, fecha)
select c.id, v.saldo, date '2026-09-30'
from public.caja_cuentas c
join (values
  ('Produbanco', 8186.50),   -- 9.186,50 reales menos los 1.000 de abonos
  ('Pichincha',    80.81),
  ('Efectivo',      0.00),   -- dato no proporcionado
  ('Datafast',      0.00),
  ('PayPhone',   6055.82),
  ('Bendo',        40.00)
) as v(nombre, saldo) on v.nombre = c.nombre
on conflict (cuenta_id) do update
  set saldo_inicial = excluded.saldo_inicial,
      fecha         = excluded.fecha;

-- ---------------------------------------------------------------------
-- 3. Los dos casos abiertos
-- ---------------------------------------------------------------------
insert into public.caja_casos
  (paciente, servicio, empresa, estado, fecha_apertura, notas, creado_por)
values
  ('Andrea Pavón',    'Cirugía bariátrica', 'GMEDIQ', 'abierto', date '2026-09-30',
   'Abono de reserva de 500. Falta definir si es manga o bypass.',
   'b2a2bf83-1c6c-4792-9580-099fde6fb58c'),
  ('Leslie Guarnizo', 'Cirugía bariátrica', 'GMEDIQ', 'abierto', date '2026-09-30',
   'Abono de reserva de 500. Falta definir si es manga o bypass.',
   'b2a2bf83-1c6c-4792-9580-099fde6fb58c');

-- ---------------------------------------------------------------------
-- 4. Sus abonos
-- ---------------------------------------------------------------------
insert into public.caja_movimientos
  (tipo, fecha, monto, cuenta_id, categoria_id, caso_id, empresa,
   contraparte, descripcion, creado_por)
select 'ingreso', date '2026-09-30', 500.00,
       (select id from public.caja_cuentas where nombre = 'Produbanco'),
       (select id from public.caja_categorias
         where nombre = 'Cirugía bariátrica' and tipo = 'ingreso'),
       k.id, 'GMEDIQ', k.paciente, 'Abono de reserva',
       'b2a2bf83-1c6c-4792-9580-099fde6fb58c'
from public.caja_casos k
where k.paciente in ('Andrea Pavón', 'Leslie Guarnizo');

commit;

-- ---------------------------------------------------------------------
-- Comprobación
-- ---------------------------------------------------------------------
select resultado from (

  select 1 as orden, (c.nombre || ' | ' || c.tipo::text || ' | saldo ' || to_char(
           coalesce(a.saldo_inicial, 0)
           + coalesce((select sum(m.monto) from public.caja_movimientos m
                       where m.cuenta_id = c.id and m.tipo = 'ingreso' and not m.anulado), 0),
           'FM999999.00'))::text as resultado
  from public.caja_cuentas c
  left join public.caja_apertura a on a.cuenta_id = c.id
  where c.activa

  union all

  select 2, ('COMPROMETIDO en abonos de casos abiertos: ' || to_char(
           coalesce(sum(m.monto), 0), 'FM999999.00'))::text
  from public.caja_movimientos m
  join public.caja_casos k on k.id = m.caso_id
  where m.tipo = 'ingreso' and not m.anulado and k.estado = 'abierto'

  union all

  select 3, ('MOVIMIENTOS EN TOTAL: ' || count(*)::text)::text
  from public.caja_movimientos

) t order by orden, resultado;

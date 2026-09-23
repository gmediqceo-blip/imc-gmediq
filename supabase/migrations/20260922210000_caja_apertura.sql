-- =====================================================================
--  Arranque: saldos de apertura y los dos abonos pendientes
--
--  Los abonos NO se suman encima del saldo: se separan de él.
--  Produbanco tiene hoy 8.454,76, de los cuales 1.000 son de dos
--  pacientes que aún no se operan. Entonces la apertura se declara en
--  7.454,76 y los dos abonos entran como movimientos reales ligados a
--  su caso. Sumados dan otra vez 8.454,76 — el saldo no cambia, pero
--  ahora el sistema sabe que 1.000 tienen dueño.
--
--  creado_por va explícito porque este script corre por la API de
--  administración, donde auth.uid() es nulo.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Saldos declarados hoy
-- ---------------------------------------------------------------------
insert into public.caja_apertura (cuenta_id, saldo_inicial, fecha)
select c.id, v.saldo, current_date
from public.caja_cuentas c
join (values
  ('Produbanco', 7454.76),   -- 8.454,76 reales menos los 1.000 de abonos
  ('Pichincha',     0.00),
  ('Efectivo',      0.00),
  ('Datafast',      0.00),
  ('PayPhone',    504.24),   -- cobrado, todavía no depositado
  ('Bendo',         0.00)
) as v(nombre, saldo) on v.nombre = c.nombre
on conflict (cuenta_id) do update
  set saldo_inicial = excluded.saldo_inicial,
      fecha         = excluded.fecha;

-- ---------------------------------------------------------------------
-- Los dos casos abiertos
-- ---------------------------------------------------------------------
insert into public.caja_casos
  (paciente, servicio, empresa, estado, notas, creado_por)
values
  ('Paciente por identificar 1', 'Cirugía bariátrica', 'GMEDIQ', 'abierto',
   'Abono de 500 recibido. Falta nombre y si es manga o bypass.',
   'b2a2bf83-1c6c-4792-9580-099fde6fb58c'),
  ('Paciente por identificar 2', 'Cirugía bariátrica', 'GMEDIQ', 'abierto',
   'Abono de 500 reciente. Falta nombre y si es manga o bypass.',
   'b2a2bf83-1c6c-4792-9580-099fde6fb58c');

-- ---------------------------------------------------------------------
-- Sus abonos, como ingresos ligados a cada caso
-- ---------------------------------------------------------------------
insert into public.caja_movimientos
  (tipo, fecha, monto, cuenta_id, categoria_id, caso_id, empresa,
   contraparte, descripcion, creado_por)
select 'ingreso', current_date, 500.00,
       (select id from public.caja_cuentas where nombre = 'Produbanco'),
       (select id from public.caja_categorias
         where nombre = 'Cirugía bariátrica' and tipo = 'ingreso'),
       k.id, 'GMEDIQ', k.paciente, 'Abono de reserva',
       'b2a2bf83-1c6c-4792-9580-099fde6fb58c'
from public.caja_casos k
where k.paciente in ('Paciente por identificar 1',
                     'Paciente por identificar 2');

commit;

-- ---------------------------------------------------------------------
-- Comprobación. No uso caja_panel() aquí porque esa función exige ser
-- gerente y por la API no hay sesión: el cálculo va a mano.
-- ---------------------------------------------------------------------
select c.nombre || ' | apertura ' || to_char(a.saldo_inicial, 'FM999999.00')
       || ' | movimientos ' || to_char(coalesce((
            select sum(m.monto) from public.caja_movimientos m
             where m.cuenta_id = c.id and m.tipo = 'ingreso' and not m.anulado
          ), 0), 'FM999999.00')
       || ' | saldo ' || to_char(a.saldo_inicial + coalesce((
            select sum(m.monto) from public.caja_movimientos m
             where m.cuenta_id = c.id and m.tipo = 'ingreso' and not m.anulado
          ), 0), 'FM999999.00') as resultado
from public.caja_cuentas c
join public.caja_apertura a on a.cuenta_id = c.id
order by c.orden;

-- =====================================================================
--  El dinero en tránsito ya llegó a Produbanco
--
--  PayPhone 6.055,82 y Bendo 40,00 estaban cobrados pero sin depositar.
--  Se registran como traslados: el dinero no es un ingreso nuevo, solo
--  cambió de bolsillo. El total de la caja no se mueve ni un centavo.
--
--  Va como traslado manual y no por el botón de confirmar depósito
--  porque, tras el reinicio, esos saldos son apertura: no hay cobros
--  individuales detrás que marcar.
--
--  PayPhone depositó completo. Bendo cobró 40,00 y depositó 36,96: esos
--  3,04 de diferencia son su comisión, y quedan registrados solos por
--  el trigger en vez de desaparecer sin explicación.
-- =====================================================================

begin;

insert into public.caja_movimientos
  (tipo, fecha, monto, monto_recibido, cuenta_id, cuenta_destino_id,
   descripcion, creado_por)
select 'traslado', date '2026-10-01', v.monto, v.recibido,
       co.id,
       (select id from public.caja_cuentas where nombre = 'Produbanco'),
       'Depósito de ' || v.cuenta || ' a Produbanco',
       'b2a2bf83-1c6c-4792-9580-099fde6fb58c'
from (values
  ('PayPhone', 6055.82, 6055.82),
  ('Bendo',      40.00,   36.96)
) as v(cuenta, monto, recibido)
join public.caja_cuentas co on co.nombre = v.cuenta;

commit;

-- ---------------------------------------------------------------------
-- Comprobación: tránsito en cero y Produbanco con todo adentro
-- ---------------------------------------------------------------------
select resultado from (

  select 1 as orden, (c.nombre || ' | ' || c.tipo::text || ' | saldo ' || to_char(
           coalesce(a.saldo_inicial, 0)
           + coalesce((select sum(m.monto) from public.caja_movimientos m
                       where m.cuenta_id = c.id and m.tipo = 'ingreso' and not m.anulado), 0)
           - coalesce((select sum(m.monto + m.comision) from public.caja_movimientos m
                       where m.cuenta_id = c.id and m.tipo = 'egreso' and not m.anulado), 0)
           - coalesce((select sum(m.monto) from public.caja_movimientos m
                       where m.cuenta_id = c.id and m.tipo = 'traslado' and not m.anulado), 0)
           + coalesce((select sum(m.monto_recibido) from public.caja_movimientos m
                       where m.cuenta_destino_id = c.id and m.tipo = 'traslado' and not m.anulado), 0),
           'FM999999.00'))::text as resultado
  from public.caja_cuentas c
  left join public.caja_apertura a on a.cuenta_id = c.id
  where c.activa

  union all

  select 2, ('COMISIONES retenidas: ' || to_char(
           coalesce(sum(comision), 0), 'FM999999.00'))::text
  from public.caja_movimientos where tipo = 'traslado' and not anulado

) t order by orden, resultado;

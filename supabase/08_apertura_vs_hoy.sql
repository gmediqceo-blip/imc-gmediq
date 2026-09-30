-- =====================================================================
--  Cómo empezamos y cómo vamos, cuenta por cuenta
--  Solo lectura.
-- =====================================================================

select (c.nombre
        || ' | apertura ' || to_char(coalesce(a.saldo_inicial, 0), 'FM999999.00')
        || ' | hoy ' || to_char(s.saldo, 'FM999999.00')
        || ' | diferencia ' || to_char(s.saldo - coalesce(a.saldo_inicial, 0), 'FM999999.00')
       )::text as resultado
from public.caja_cuentas c
left join public.caja_apertura a on a.cuenta_id = c.id
cross join lateral (
  select coalesce(a.saldo_inicial, 0)
    + coalesce((select sum(m.monto) from public.caja_movimientos m
                where m.cuenta_id = c.id and m.tipo = 'ingreso' and not m.anulado), 0)
    - coalesce((select sum(m.monto + m.comision) from public.caja_movimientos m
                where m.cuenta_id = c.id and m.tipo = 'egreso' and not m.anulado), 0)
    - coalesce((select sum(m.monto) from public.caja_movimientos m
                where m.cuenta_id = c.id and m.tipo = 'traslado' and not m.anulado), 0)
    + coalesce((select sum(m.monto_recibido) from public.caja_movimientos m
                where m.cuenta_destino_id = c.id and m.tipo = 'traslado' and not m.anulado), 0)
    as saldo
) s
where c.activa
order by c.orden;

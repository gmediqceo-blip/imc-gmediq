-- =====================================================================
--  Borrado puntual de un traslado mal registrado
--
--  30 sep · traslado · 2.055,82 · PayPhone -> Produbanco
--  id: 01062e00-eaa9-4b6a-90d3-982996c1496c
--
--  Se borra de verdad, a pedido de Diego, en vez de anularlo: fue un
--  error de tecleo del mismo día, sin valor contable que conservar.
--
--  Antes de borrar devuelve la fila completa, para poder recrearla si
--  resultara ser la equivocada. GUARDA ESA SALIDA.
-- =====================================================================

with fila_borrada as (
  delete from public.caja_movimientos
   where id = '01062e00-eaa9-4b6a-90d3-982996c1496c'
  returning *
)
select 'BORRADO: ' || fecha::text
       || ' | ' || tipo::text
       || ' | sale ' || to_char(monto, 'FM999999.00')
       || ' | llega ' || to_char(coalesce(monto_recibido, 0), 'FM999999.00')
       || ' | comision ' || to_char(comision, 'FM999999.00')
       || ' | ' || coalesce(descripcion, 'sin nota') as resultado
from fila_borrada

union all

-- Cómo quedan las cuentas después
select c.nombre || ' | saldo ' || to_char(
         coalesce(a.saldo_inicial, 0)
         + coalesce((select sum(m.monto) from public.caja_movimientos m
                     where m.cuenta_id = c.id and m.tipo = 'ingreso' and not m.anulado), 0)
         - coalesce((select sum(m.monto + m.comision) from public.caja_movimientos m
                     where m.cuenta_id = c.id and m.tipo = 'egreso' and not m.anulado), 0)
         - coalesce((select sum(m.monto) from public.caja_movimientos m
                     where m.cuenta_id = c.id and m.tipo = 'traslado' and not m.anulado), 0)
         + coalesce((select sum(m.monto_recibido) from public.caja_movimientos m
                     where m.cuenta_destino_id = c.id and m.tipo = 'traslado' and not m.anulado), 0),
         'FM999999.00')
from public.caja_cuentas c
left join public.caja_apertura a on a.cuenta_id = c.id
where c.activa and c.nombre in ('PayPhone', 'Produbanco');

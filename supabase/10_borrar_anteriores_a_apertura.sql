-- =====================================================================
--  Borra los movimientos anteriores a la apertura
--
--  Son doble conteo: el saldo declarado el 22 de septiembre ya incluía
--  todo lo cobrado hasta esa fecha. Registrarlos encima lo sumaba otra vez.
--
--  Se borran por criterio y no por identificador, para que no quede
--  ninguno suelto. Los dos abonos de 500 tienen fecha 22 y NO entran:
--  la condición es estrictamente anterior a la apertura.
--
--  Devuelve cada fila borrada con todos sus datos. GUARDA ESA SALIDA:
--  es lo único que permite recrearlas si alguna hacía falta.
-- =====================================================================

with borradas as (
  delete from public.caja_movimientos m
   where not m.anulado
     and m.fecha < (select max(fecha) from public.caja_apertura)
  returning m.*
)
select resultado from (

  select 1 as orden,
         ('BORRADO ' || b.fecha::text
          || ' | ' || b.tipo::text
          || ' | ' || to_char(b.monto, 'FM999999.00')
          || ' | ' || coalesce(b.contraparte, '-')
          || ' | ' || coalesce(b.empresa::text, '-')
          || ' | ' || coalesce(b.descripcion, '-'))::text as resultado
  from borradas b

  union all

  select 2,
         ('TOTAL: ' || count(*)::text || ' movimientos, '
          || to_char(coalesce(sum(monto), 0), 'FM999999.00') || ' en conjunto')::text
  from borradas

  union all

  select 3,
         (c.nombre || ' | saldo ahora ' || to_char(
            coalesce(a.saldo_inicial, 0)
            + coalesce((select sum(m.monto) from public.caja_movimientos m
                        where m.cuenta_id = c.id and m.tipo = 'ingreso' and not m.anulado), 0)
            - coalesce((select sum(m.monto + m.comision) from public.caja_movimientos m
                        where m.cuenta_id = c.id and m.tipo = 'egreso' and not m.anulado), 0)
            - coalesce((select sum(m.monto) from public.caja_movimientos m
                        where m.cuenta_id = c.id and m.tipo = 'traslado' and not m.anulado), 0)
            + coalesce((select sum(m.monto_recibido) from public.caja_movimientos m
                        where m.cuenta_destino_id = c.id and m.tipo = 'traslado' and not m.anulado), 0),
            'FM999999.00'))::text
  from public.caja_cuentas c
  left join public.caja_apertura a on a.cuenta_id = c.id
  where c.activa

) t order by orden, resultado;

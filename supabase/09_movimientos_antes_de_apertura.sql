-- =====================================================================
--  Movimientos anteriores a la apertura — posible doble conteo
--  Solo lectura.
--
--  El saldo de apertura ya contenía todo lo cobrado hasta esa fecha.
--  Un movimiento con fecha anterior lo suma otra vez.
-- =====================================================================

select resultado from (

  select 0 as orden,
         ('APERTURA declarada el ' || max(fecha)::text)::text as resultado
  from public.caja_apertura

  union all

  select 1,
         (m.fecha::text
          || ' | ' || m.tipo::text
          || ' | ' || to_char(m.monto, 'FM999999.00')
          || ' | ' || co.nombre
          || ' | ' || coalesce(cat.nombre, '-')
          || ' | ' || coalesce(m.contraparte, '-')
          || ' | ' || coalesce(m.empresa::text, '-')
          || ' | ' || m.id::text)::text
  from public.caja_movimientos m
  join public.caja_cuentas co on co.id = m.cuenta_id
  left join public.caja_categorias cat on cat.id = m.categoria_id
  where not m.anulado
    and m.fecha < (select max(fecha) from public.caja_apertura)

  union all

  select 2,
         ('SUMAN ' || count(*)::text || ' movimientos por '
          || to_char(coalesce(sum(case when m.tipo = 'ingreso' then m.monto
                                       when m.tipo = 'egreso' then -m.monto
                                       else 0 end), 0), 'FM999999.00')
          || ' de efecto neto')::text
  from public.caja_movimientos m
  where not m.anulado
    and m.fecha < (select max(fecha) from public.caja_apertura)

) t order by orden, resultado;

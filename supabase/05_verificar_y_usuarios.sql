-- =====================================================================
--  05 — Quién tiene cuenta hoy
--  Solo lectura.
--
--  Nota: todas las ramas van con ::text a propósito. En un UNION el
--  tipo lo fija la primera rama, y pg_class.relname es de tipo 'name',
--  que corta a 63 caracteres — eso truncaba las filas siguientes.
-- =====================================================================

select seccion, detalle from (

  select 1 as orden, 'CUENTA'::text as seccion,
         (u.id::text || ' | ' || u.nombre || ' ' || u.apellido
          || ' | ' || u.email || ' | rol=' || u.rol
          || ' | activo=' || coalesce(u.activo::text, 'null'))::text as detalle
  from public.usuarios u

  union all

  select 2, 'MIEMBRO CAJA'::text,
         (nombre || ' | ' || rol::text || ' | ' || empresa::text)::text
  from public.caja_usuarios

  union all

  select 3, 'SEMBRADO'::text,
         ('cuentas: ' || (select count(*) from public.caja_cuentas)
          || ' | fijas del mes: '
          || (select count(*) from public.caja_categorias where es_fija_mensual)
          || ' | confidenciales: '
          || (select count(*) from public.caja_categorias where confidencial))::text

) t order by orden, detalle;

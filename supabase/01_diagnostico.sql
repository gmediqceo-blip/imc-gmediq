-- =====================================================================
--  01 — DIAGNÓSTICO  (solo lectura: no modifica nada)
--
--  Pégalo completo en el SQL Editor de Supabase, ejecútalo, y copia
--  el resultado. Devuelve una sola tabla de dos columnas.
--
--  Para qué: el archivo supabase_schema.sql de este repo está
--  desactualizado — producción tiene tablas que él no conoce. Escribir
--  políticas de seguridad a ciegas dejaría huecos abiertos o dejaría
--  gente fuera de la app. Esto nos dice qué hay realmente.
-- =====================================================================

select seccion, detalle from (

  -- Tablas, si tienen RLS activa y cuántas políticas
  select 1 as orden, 'TABLA' as seccion,
         c.relname
         || '  | rls=' || c.relrowsecurity::text
         || ' | politicas=' || (
              select count(*) from pg_policies p
              where p.schemaname = 'public' and p.tablename = c.relname
            )::text as detalle
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'

  union all

  -- Qué dice cada política
  select 2, 'POLITICA',
         tablename || ' | ' || policyname || ' | ' || cmd
         || ' | para=' || array_to_string(roles, ',')
         || ' | using=' || coalesce(qual, '-')
         || ' | check=' || coalesce(with_check, '-')
  from pg_policies
  where schemaname = 'public'

  union all

  -- Columnas actuales de usuarios
  select 3, 'COLUMNA usuarios',
         column_name || ' | ' || data_type
         || ' | default=' || coalesce(column_default, '-')
         || ' | nulo=' || is_nullable
  from information_schema.columns
  where table_schema = 'public' and table_name = 'usuarios'

  union all

  -- Restricciones de usuarios (aquí veremos si 'secretaria' está permitido)
  select 4, 'CONSTRAINT usuarios',
         conname || ' | ' || pg_get_constraintdef(oid)
  from pg_constraint
  where conrelid = 'public.usuarios'::regclass

  union all

  -- Qué roles existen hoy y cuánta gente hay en cada uno
  select 5, 'ROL EN USO', rol || ' | ' || count(*)::text
  from public.usuarios group by rol

) t
order by orden, detalle;

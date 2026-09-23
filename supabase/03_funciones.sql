-- =====================================================================
--  03 — QUÉ HACEN LAS FUNCIONES DE PERMISO QUE YA EXISTEN
--
--  Solo lectura. Producción ya tiene un sistema de permisos armado
--  (rol_actual, current_user_is_staff, etc.) y 131 políticas montadas
--  sobre él. Antes de agregar nada hay que leer cómo deciden, para
--  engancharnos ahí en vez de inventar un sistema paralelo.
-- =====================================================================

select seccion, detalle from (

  select 1 as orden, 'FUNCION' as seccion,
         p.proname || '  ->  ' || pg_get_function_result(p.oid)
         || '  |  ' || replace(replace(p.prosrc, chr(10), ' '), chr(9), ' ') as detalle
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('rol_actual', 'current_user_rol', 'current_user_is_staff',
                      'current_user_is_staff_full', 'paciente_actual',
                      'current_user_paciente_id')

  union all

  -- Valores posibles del tipo user_role (aparece en varias políticas)
  select 2, 'ENUM user_role', e.enumlabel
  from pg_type t join pg_enum e on e.enumtypid = t.oid
  where t.typname = 'user_role'

  union all

  -- La tabla profiles: ¿es de pacientes o de personal?
  select 3, 'COLUMNA profiles', column_name || ' | ' || data_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles'

) t order by orden, detalle;

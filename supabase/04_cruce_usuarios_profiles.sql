-- =====================================================================
--  04 — ¿CÓMO SE RELACIONAN 'usuarios' Y 'profiles'?
--
--  Solo lectura. Hay dos sistemas de permisos conviviendo:
--    rol_actual()            lee public.usuarios
--    current_user_is_staff() lee public.profiles
--
--  Para arreglar las 4 políticas abiertas sin dejar a nadie fuera,
--  necesito saber si el personal está en las dos tablas o solo en una.
-- =====================================================================

select seccion, detalle from (

  -- Cuánta gente hay en cada tabla, por rol
  select 1 as orden, 'PROFILES por rol' as seccion,
         rol::text || ' | ' || count(*)::text || ' | activos=' ||
         count(*) filter (where activo)::text as detalle
  from public.profiles group by rol

  union all

  select 2, 'USUARIOS por rol',
         rol || ' | ' || count(*)::text || ' | activos=' ||
         count(*) filter (where activo)::text
  from public.usuarios group by rol

  union all

  -- ¿El personal de 'usuarios' tiene también fila en 'profiles'?
  select 3, 'CRUCE',
         'usuarios con profile: ' || count(*) filter (where p.id is not null)::text
         || ' de ' || count(*)::text
  from public.usuarios u left join public.profiles p on p.id = u.id

  union all

  -- ¿Hay profiles que no sean de pacientes y no estén en usuarios?
  select 4, 'PROFILES SIN USUARIO',
         p.rol::text || ' | ' || count(*)::text
  from public.profiles p
  left join public.usuarios u on u.id = p.id
  where u.id is null
  group by p.rol

  union all

  -- ¿Cuántos pacientes pueden iniciar sesión hoy?
  select 5, 'PACIENTES CON LOGIN',
         'profiles rol=paciente: ' || count(*)::text
  from public.profiles where rol = 'paciente'

) t order by orden, detalle;

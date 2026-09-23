-- =====================================================================
--  06 — Cuentas de acceso reales (auth.users)
--
--  auth.users es la lista de quién puede iniciar sesión.
--  public.usuarios es quién es personal de la clínica.
--  La secretaria de Gmediq debe estar en la primera y NO en la segunda.
-- =====================================================================

select
  a.id::text                                            as id,
  a.email::text                                         as email,
  to_char(a.created_at, 'YYYY-MM-DD HH24:MI')           as creada,
  coalesce(u.rol, '— sin rol clínico —')::text          as rol_clinico,
  coalesce(c.rol::text, '— no está en caja —')::text    as rol_caja
from auth.users a
left join public.usuarios u      on u.id = a.id
left join public.caja_usuarios c on c.id = a.id
order by a.created_at desc;

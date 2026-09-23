-- =====================================================================
--  Quiénes entran al módulo de caja
--
--  Tres cuentas, cada una con lo justo:
--
--    Administración (Diego y Sebastián)  gerente     → ve todo
--    Lissette Navia                      secretaria  → IMC
--    Secretaria Gmediq                   secretaria  → GMEDIQ
--
--  Lissette conserva intacto su acceso clínico como cosmetóloga: estar
--  en caja_usuarios no le quita ni le agrega nada de ese lado.
--
--  La secretaria de Gmediq NO está en public.usuarios, así que
--  rol_actual() le devuelve nulo y todas las políticas clínicas la
--  rechazan. Es lo que queríamos: registra plata y nada más.
-- =====================================================================

begin;

insert into public.caja_usuarios (id, nombre, rol, empresa) values
  ('b2a2bf83-1c6c-4792-9580-099fde6fb58c',
   'Administración (Diego y Sebastián)', 'gerente',    'COMPARTIDO'),

  ('a6edbf31-f77d-40eb-8512-a2544b3c10d6',
   'Lissette Navia',                     'secretaria', 'IMC'),

  ('fa316629-12b1-4915-a2f8-a45126b91ca9',
   'Secretaria Gmediq',                  'secretaria', 'GMEDIQ')

on conflict (id) do update
  set nombre  = excluded.nombre,
      rol     = excluded.rol,
      empresa = excluded.empresa,
      activo  = true;

commit;

select c.nombre || ' | ' || c.rol::text || ' | ' || c.empresa::text
       || ' | ' || a.email as resultado
from public.caja_usuarios c
join auth.users a on a.id = c.id
order by c.rol, c.nombre;

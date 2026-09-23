-- =====================================================================
--  Cierra las políticas que solo exigían estar logueado
--
--  Antes:  auth.uid() IS NOT NULL   → cualquier cuenta autenticada
--  Ahora:  rol_actual() IS NOT NULL → solo personal con rol activo
--                                     en la tabla public.usuarios
--
--  rol_actual() es:
--    SELECT rol FROM public.usuarios WHERE id = auth.uid() AND activo
--
--  Es el mismo patrón que ya usan otras 12 políticas de este esquema
--  (pacientes_select, pacientes_update, etc.), así que no introduce
--  una forma nueva de decidir: alinea estas cuatro tablas con el
--  criterio que el resto del sistema ya aplica.
--
--  Los 7 usuarios actuales no notan ningún cambio: todos tienen rol
--  activo en 'usuarios'. Lo que deja de poder entrar es una cuenta que
--  exista en auth pero no sea personal de la clínica — por ejemplo, la
--  secretaria de Gmediq, o un paciente cuando empiecen a invitarlos.
--
--  Las políticas '*_select_paciente' NO se tocan: son las que dejan a
--  cada paciente ver lo suyo, y están bien hechas.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- citas — la agenda completa estaba abierta a lectura, cambio y borrado
-- ---------------------------------------------------------------------
drop policy if exists citas_select on public.citas;
create policy citas_select on public.citas
  for select using (rol_actual() is not null);

drop policy if exists citas_insert on public.citas;
create policy citas_insert on public.citas
  for insert with check (rol_actual() is not null);

drop policy if exists citas_update on public.citas;
create policy citas_update on public.citas
  for update using (rol_actual() is not null);

drop policy if exists citas_delete on public.citas;
create policy citas_delete on public.citas
  for delete using (rol_actual() is not null);

-- ---------------------------------------------------------------------
-- sesiones_cosmetologia — sesiones de pacientes reales
-- ---------------------------------------------------------------------
drop policy if exists ses_cosm_select on public.sesiones_cosmetologia;
create policy ses_cosm_select on public.sesiones_cosmetologia
  for select using (rol_actual() is not null);

drop policy if exists ses_cosm_insert on public.sesiones_cosmetologia;
create policy ses_cosm_insert on public.sesiones_cosmetologia
  for insert with check (rol_actual() is not null);

drop policy if exists ses_cosm_update on public.sesiones_cosmetologia;
create policy ses_cosm_update on public.sesiones_cosmetologia
  for update using (rol_actual() is not null);

drop policy if exists ses_cosm_delete on public.sesiones_cosmetologia;
create policy ses_cosm_delete on public.sesiones_cosmetologia
  for delete using (rol_actual() is not null);

-- ---------------------------------------------------------------------
-- registro_paciente — peso, dolor, energía del día a día
-- ---------------------------------------------------------------------
drop policy if exists equipo_imc_all on public.registro_paciente;
create policy equipo_imc_all on public.registro_paciente
  for all using (rol_actual() is not null);

-- ---------------------------------------------------------------------
-- plan_ejercicios — renglones del plan de cada paciente
-- ---------------------------------------------------------------------
drop policy if exists equipo_imc_all on public.plan_ejercicios;
create policy equipo_imc_all on public.plan_ejercicios
  for all using (rol_actual() is not null);

commit;

-- ---------------------------------------------------------------------
-- Comprobación: no debe quedar ninguna fila con auth.uid()/auth.role()
-- en estas cuatro tablas.
-- ---------------------------------------------------------------------
select tablename || ' | ' || policyname || ' | ' || cmd
       || ' | using=' || coalesce(qual, '-')
       || ' | check=' || coalesce(with_check, '-') as resultado
from pg_policies
where schemaname = 'public'
  and tablename in ('citas', 'sesiones_cosmetologia',
                    'registro_paciente', 'plan_ejercicios')
order by tablename, policyname;

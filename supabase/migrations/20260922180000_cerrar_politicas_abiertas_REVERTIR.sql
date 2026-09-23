-- =====================================================================
--  REVERTIR — deja las 4 tablas exactamente como estaban antes
--
--  Solo por si algo del equipo deja de funcionar y hay que volver
--  atrás rápido mientras se investiga. Restaura las definiciones
--  originales, copiadas tal cual del diagnóstico de producción.
--
--  Ojo: al revertir vuelve el acceso abierto a cualquier cuenta
--  autenticada. Es un paso temporal, no un destino.
-- =====================================================================

begin;

drop policy if exists citas_select on public.citas;
create policy citas_select on public.citas
  for select using (auth.uid() is not null);

drop policy if exists citas_insert on public.citas;
create policy citas_insert on public.citas
  for insert with check (auth.uid() is not null);

drop policy if exists citas_update on public.citas;
create policy citas_update on public.citas
  for update using (auth.uid() is not null);

drop policy if exists citas_delete on public.citas;
create policy citas_delete on public.citas
  for delete using (auth.uid() is not null);

drop policy if exists ses_cosm_select on public.sesiones_cosmetologia;
create policy ses_cosm_select on public.sesiones_cosmetologia
  for select using (auth.uid() is not null);

drop policy if exists ses_cosm_insert on public.sesiones_cosmetologia;
create policy ses_cosm_insert on public.sesiones_cosmetologia
  for insert with check (auth.uid() is not null);

drop policy if exists ses_cosm_update on public.sesiones_cosmetologia;
create policy ses_cosm_update on public.sesiones_cosmetologia
  for update using (auth.uid() is not null);

drop policy if exists ses_cosm_delete on public.sesiones_cosmetologia;
create policy ses_cosm_delete on public.sesiones_cosmetologia
  for delete using (auth.uid() is not null);

drop policy if exists equipo_imc_all on public.registro_paciente;
create policy equipo_imc_all on public.registro_paciente
  for all using (auth.role() = 'authenticated');

drop policy if exists equipo_imc_all on public.plan_ejercicios;
create policy equipo_imc_all on public.plan_ejercicios
  for all using (auth.role() = 'authenticated');

commit;

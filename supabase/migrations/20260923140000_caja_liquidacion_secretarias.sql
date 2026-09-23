-- =====================================================================
--  CONFIRMAR DEPÓSITOS: TAMBIÉN LAS SECRETARIAS
--
--  Quien registra el cobro con tarjeta es quien está pendiente de que
--  la plataforma lo deposite. Obligar a que un gerente confirme cada
--  lote era poner un cuello de botella donde no hacía falta.
--
--  La regla queda: cada quien confirma depósitos de cobros de SU
--  empresa. Un gerente, de las dos.
--
--  Lo que NO cambia: las secretarias siguen sin ver saldos y sin ver
--  traslados. Confirman el depósito y ven el cobro quedar "Depositado",
--  pero el traslado que eso creó no les aparece — y por lo tanto no lo
--  pueden anular. Deshacer un depósito sigue siendo cosa de gerentes.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- El sello de depositado sigue sin poder escribirse a mano.
--
-- Antes eso se resolvía exigiendo ser gerente; ahora que una secretaria
-- también liquida, la marca es haber pasado por caja_liquidar(): la
-- función levanta una bandera local a la transacción y el trigger solo
-- acepta el cambio mientras esa bandera esté puesta. Por la API, sin
-- pasar por la función, no hay bandera y el update se rechaza.
-- ---------------------------------------------------------------------
create or replace function public.caja_mov_validar()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_tipo caja_tipo_mov; v_tarifa numeric;
begin
  if new.categoria_id is not null then
    select tipo into v_tipo from public.caja_categorias where id = new.categoria_id;
    if v_tipo is distinct from new.tipo then
      raise exception 'La categoría no corresponde a un movimiento de tipo %', new.tipo;
    end if;
  end if;

  -- Nadie escribe la comisión a mano: si hay que teclearla, no se teclea.
  if new.tipo = 'egreso' and new.interbancaria then
    select valor into v_tarifa from public.caja_parametros
     where clave = 'tarifa_interbancaria';
    new.comision := coalesce(v_tarifa, 0);
  elsif new.tipo = 'traslado' then
    new.comision := new.monto - new.monto_recibido;   -- lo que se quedó la plataforma
  else
    new.comision := 0;
  end if;

  if tg_op = 'UPDATE'
     and new.liquidacion_id is distinct from old.liquidacion_id
     and coalesce(current_setting('caja.liquidando', true), '') <> '1' then
    raise exception 'El sello de depositado lo pone la confirmación del depósito, no se escribe a mano';
  end if;

  return new;
end $$;

-- ---------------------------------------------------------------------
-- Confirmar el depósito
-- ---------------------------------------------------------------------
create or replace function public.caja_liquidar(
  p_ingresos       uuid[],
  p_cuenta_destino uuid,
  p_monto_recibido numeric,
  p_fecha          date default current_date)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_cuantos  int;
  v_cuentas  int;
  v_ajenos   int;
  v_esperado numeric;
  v_origen   uuid;
  v_traslado uuid;
begin
  if not public.caja_es_miembro() then
    raise exception 'No autorizado';
  end if;

  if p_ingresos is null or cardinality(p_ingresos) = 0 then
    raise exception 'No hay cobros que depositar';
  end if;

  -- Solo cuentan los que de verdad están esperando depósito. Si alguno
  -- ya se depositó, está anulado o no es de tarjeta, no cuadra el conteo
  -- y no se hace nada.
  select count(*), count(distinct m.cuenta_id), coalesce(sum(m.monto), 0)
    into v_cuantos, v_cuentas, v_esperado
    from public.caja_movimientos m
    join public.caja_cuentas c on c.id = m.cuenta_id
   where m.id = any(p_ingresos)
     and m.tipo = 'ingreso'
     and not m.anulado
     and m.liquidacion_id is null
     and c.tipo = 'transito';

  if v_cuantos <> cardinality(p_ingresos) then
    raise exception 'Alguno de esos cobros ya está depositado, está anulado o no es de una cuenta en tránsito';
  end if;

  -- Un depósito viene de una sola plataforma.
  if v_cuentas > 1 then
    raise exception 'Los cobros marcados son de plataformas distintas: confirma un depósito por plataforma';
  end if;

  -- Cada quien liquida lo de su empresa. El gerente, las dos.
  if not public.caja_es_gerente() then
    select count(*) into v_ajenos
      from public.caja_movimientos m
     where m.id = any(p_ingresos)
       and m.empresa is distinct from public.caja_mi_empresa();
    if v_ajenos > 0 then
      raise exception 'Solo puedes confirmar depósitos de cobros de tu empresa';
    end if;
  end if;

  select cuenta_id into v_origen
    from public.caja_movimientos where id = p_ingresos[1];

  if not exists (select 1 from public.caja_cuentas c
                  where c.id = p_cuenta_destino and c.activa and c.tipo <> 'transito') then
    raise exception 'El depósito tiene que llegar a un banco o a efectivo';
  end if;

  if p_monto_recibido is null or p_monto_recibido <= 0 then
    raise exception 'Pon cuánto llegó de verdad a la cuenta';
  end if;

  if p_monto_recibido > v_esperado then
    raise exception 'Llegó más de lo que suman los cobros marcados (% contra %). Marca también los otros cobros que venían en ese mismo depósito.',
      to_char(p_monto_recibido, 'FM999999.00'), to_char(v_esperado, 'FM999999.00');
  end if;

  insert into public.caja_movimientos
    (tipo, fecha, monto, monto_recibido, cuenta_id, cuenta_destino_id,
     descripcion, creado_por)
  values
    ('traslado', coalesce(p_fecha, current_date), v_esperado, p_monto_recibido,
     v_origen, p_cuenta_destino,
     'Depósito de ' || v_cuantos || ' cobro' ||
       case when v_cuantos = 1 then '' else 's' end || ' con tarjeta',
     auth.uid())
  returning id into v_traslado;

  perform set_config('caja.liquidando', '1', true);
  update public.caja_movimientos
     set liquidacion_id = v_traslado
   where id = any(p_ingresos);
  perform set_config('caja.liquidando', '', true);

  return v_traslado;
end $$;

-- ---------------------------------------------------------------------
-- Deshacer: anular el depósito devuelve sus cobros a tránsito.
-- Necesita la misma bandera, porque también toca liquidacion_id.
-- ---------------------------------------------------------------------
create or replace function public.caja_liquidacion_anulada()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.anulado and not old.anulado then
    if new.liquidacion_id is not null then
      raise exception 'Ese cobro ya está depositado en el banco. Anula primero el depósito.';
    end if;
    perform set_config('caja.liquidando', '1', true);
    update public.caja_movimientos
       set liquidacion_id = null
     where liquidacion_id = new.id;
    perform set_config('caja.liquidando', '', true);
  end if;
  return new;
end $$;

grant execute on function public.caja_liquidar to authenticated;

commit;

-- ---------------------------------------------------------------------
-- Comprobación
-- ---------------------------------------------------------------------
select c.nombre || ' | ' || count(m.id) || ' cobro(s) esperando | $'
       || to_char(coalesce(sum(m.monto), 0), 'FM999999.00') as resultado
from public.caja_cuentas c
left join public.caja_movimientos m
  on m.cuenta_id = c.id and m.tipo = 'ingreso'
 and not m.anulado and m.liquidacion_id is null
where c.tipo = 'transito'
group by c.nombre, c.orden
order by c.orden;

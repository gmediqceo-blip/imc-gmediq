-- =====================================================================
--  LIQUIDACIÓN DE COBROS CON TARJETA
--
--  Un cobro con tarjeta entra a Datafast, PayPhone o Bendo: está
--  cobrado, pero todavía no es nuestro. Queda "en tránsito" hasta que
--  la plataforma lo deposita en el banco.
--
--  Confirmar ese depósito NO es editar el cobro: es un traslado de la
--  cuenta en tránsito al banco. Así el cobro original queda intacto
--  (mismo monto, mismo paciente, mismo servicio) y lo que se quedó la
--  plataforma sale solo de la diferencia entre lo cobrado y lo que
--  llegó de verdad — nadie teclea una comisión.
--
--  Un cobro sabe si ya se depositó por liquidacion_id: apunta al
--  traslado que lo bajó al banco. Nulo = sigue en tránsito.
-- =====================================================================

begin;

alter table public.caja_movimientos
  add column if not exists liquidacion_id uuid references public.caja_movimientos;

comment on column public.caja_movimientos.liquidacion_id is
  'En un cobro con tarjeta: el traslado que lo depositó en el banco. '
  'Nulo = todavía en tránsito. Lo escribe caja_liquidar(), nunca la mano.';

-- Lo que se consulta siempre es "qué falta por depositar de esta cuenta".
create index if not exists caja_mov_transito_pendiente
  on public.caja_movimientos (cuenta_id)
  where tipo = 'ingreso' and liquidacion_id is null and not anulado;

-- ---------------------------------------------------------------------
-- El sello de depositado lo pone un gerente, y solo por caja_liquidar().
-- Se agrega a la validación que ya existía para no repartir la regla en
-- dos triggers: lo que decide si un movimiento es válido vive aquí.
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
     and not public.caja_es_gerente() then
    raise exception 'No autorizado: el depósito de tarjeta lo confirma un gerente';
  end if;

  return new;
end $$;

-- ---------------------------------------------------------------------
-- Confirmar el depósito
--
-- Recibe los cobros que venían en ese depósito, a qué cuenta llegó y
-- cuánto llegó de verdad. Todo o nada: o se crea el traslado y quedan
-- los cobros sellados, o no pasa nada.
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
  v_esperado numeric;
  v_origen   uuid;
  v_traslado uuid;
begin
  if not public.caja_es_gerente() then
    raise exception 'No autorizado: confirmar depósitos es cosa de gerentes';
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

  update public.caja_movimientos
     set liquidacion_id = v_traslado
   where id = any(p_ingresos);

  return v_traslado;
end $$;

-- ---------------------------------------------------------------------
-- Deshacer
--
-- Anular el depósito devuelve sus cobros a tránsito: el dinero vuelve a
-- estar cobrado y sin depositar, que es la verdad. Y al revés no: un
-- cobro ya depositado no se anula suelto, porque dejaría al traslado
-- moviendo dinero que ya no existe.
-- ---------------------------------------------------------------------
create or replace function public.caja_liquidacion_anulada()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.anulado and not old.anulado then
    if new.liquidacion_id is not null then
      raise exception 'Ese cobro ya está depositado en el banco. Anula primero el depósito.';
    end if;
    update public.caja_movimientos
       set liquidacion_id = null
     where liquidacion_id = new.id;
  end if;
  return new;
end $$;

-- "of anulado" a propósito: el update de adentro solo toca
-- liquidacion_id, así que no se vuelve a disparar.
drop trigger if exists caja_liquidacion_anulada_trg on public.caja_movimientos;
create trigger caja_liquidacion_anulada_trg
  after update of anulado on public.caja_movimientos
  for each row execute function public.caja_liquidacion_anulada();

grant execute on function public.caja_liquidar to authenticated;

commit;

-- ---------------------------------------------------------------------
-- Comprobación: qué quedó en tránsito esperando depósito
-- ---------------------------------------------------------------------
select c.nombre || ' | ' || count(m.id) || ' cobro(s) | esperando $'
       || to_char(coalesce(sum(m.monto), 0), 'FM999999.00') as resultado
from public.caja_cuentas c
left join public.caja_movimientos m
  on m.cuenta_id = c.id and m.tipo = 'ingreso'
 and not m.anulado and m.liquidacion_id is null
where c.tipo = 'transito'
group by c.nombre, c.orden
order by c.orden;

-- ============================================================
-- IMC – Instituto Metabólico Corporal
-- Esquema de base de datos completo
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ── EXTENSIONES ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── USUARIOS DEL EQUIPO IMC ──────────────────────────────────
create table public.usuarios (
  id uuid references auth.users on delete cascade primary key,
  nombre text not null,
  apellido text not null,
  email text not null unique,
  rol text not null check (rol in ('admin','fisioterapeuta','medico','nutricionista')),
  activo boolean default true,
  created_at timestamp with time zone default timezone('utc', now())
);

-- ── PACIENTES ────────────────────────────────────────────────
create table public.pacientes (
  id uuid default uuid_generate_v4() primary key,
  cedula text unique,
  historia_clinica text unique,
  nombre text not null,
  apellido text not null,
  fecha_nacimiento date,
  sexo text check (sexo in ('M','F','O')),
  telefono text,
  email text,
  ocupacion text,
  direccion text,
  -- Perfil IMC
  grupo text not null default 'transformacion' check (grupo in ('transformacion','prequirurgico','postquirurgico')),
  plan text not null default 'starter' check (plan in ('starter','standard','imc360')),
  -- Datos clínicos
  diagnostico_principal text,
  cirugia text,
  fecha_cirugia date,
  medico_tratante text,
  antecedentes_personales text,
  antecedentes_familiares text,
  alergias text,
  medicamentos_actuales text,
  -- Control
  activo boolean default true,
  notas text,
  created_by uuid references public.usuarios(id),
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now())
);

-- Auto-generar número de historia clínica
create sequence if not exists historia_clinica_seq start 1000;

create or replace function generar_historia_clinica()
returns trigger as $$
begin
  if new.historia_clinica is null then
    new.historia_clinica := 'IMC-' || lpad(nextval('historia_clinica_seq')::text, 5, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trigger_historia_clinica
  before insert on public.pacientes
  for each row execute function generar_historia_clinica();

-- ── VALORACIONES FISIOTERAPÉUTICAS ───────────────────────────
create table public.valoraciones (
  id uuid default uuid_generate_v4() primary key,
  paciente_id uuid references public.pacientes(id) on delete cascade not null,
  fecha date not null default current_date,
  terapeuta_id uuid references public.usuarios(id),
  terapeuta_nombre text,
  -- Signos vitales
  fc_reposo integer,
  pa_sistolica integer,
  pa_diastolica integer,
  spo2 numeric(4,1),
  fr integer,
  -- Composición corporal InBody
  peso numeric(6,2),
  talla numeric(5,1),
  bmi numeric(5,2),
  pct_grasa numeric(5,2),
  masa_muscular numeric(6,2),
  masa_grasa numeric(6,2),
  agua_corporal numeric(5,2),
  cintura numeric(5,1),
  cadera numeric(5,1),
  inbody_score_muscular integer,
  inbody_score_grasa integer,
  -- Medidas segmentales
  cuello numeric(5,1),
  hombros numeric(5,1),
  pecho numeric(5,1),
  abdomen numeric(5,1),
  brazo_d numeric(5,1),
  brazo_i numeric(5,1),
  muslo_d numeric(5,1),
  muslo_i numeric(5,1),
  pantorrilla_d numeric(5,1),
  pantorrilla_i numeric(5,1),
  -- Dinamometría
  dina_d numeric(5,1),
  dina_i numeric(5,1),
  orm_superior numeric(6,1),
  orm_inferior numeric(6,1),
  -- Test funcional
  sit_stand integer,
  borg integer,
  fc_pre integer,
  fc_post integer,
  spo2_pre numeric(4,1),
  spo2_post numeric(4,1),
  -- VO2max y zonas
  vo2max numeric(5,2),
  vo2max_clasificacion text,
  fc_max integer,
  fc_reserva integer,
  zona1_lo integer,
  zona1_hi integer,
  zona2_lo integer,
  zona2_hi integer,
  zona3_lo integer,
  zona3_hi integer,
  -- Diagnóstico
  diagnostico text,
  fortalezas text,
  limitantes text,
  aptitud text default 'apto' check (aptitud in ('apto','apto_rest','no_apto')),
  plan_aerobico text,
  plan_resistencia text,
  notas text,
  created_at timestamp with time zone default timezone('utc', now())
);

-- ── BANCO DE EJERCICIOS ───────────────────────────────────────
create table public.ejercicios (
  id uuid default uuid_generate_v4() primary key,
  nombre text not null,
  categoria text not null check (categoria in ('aerobico','tren_inferior','tren_superior','core','respiratorio','movilidad')),
  entorno text not null check (entorno in ('gym','casa','ambos')),
  musculos text,
  nivel text default 'bajo' check (nivel in ('bajo','medio','alto')),
  unidad text default 'reps',
  descripcion text,
  video_url text,
  activo boolean default true,
  created_at timestamp with time zone default timezone('utc', now())
);

-- ── PLANES DE EJERCICIO ───────────────────────────────────────
create table public.planes_ejercicio (
  id uuid default uuid_generate_v4() primary key,
  paciente_id uuid references public.pacientes(id) on delete cascade not null,
  valoracion_id uuid references public.valoraciones(id),
  fecha date not null default current_date,
  terapeuta_id uuid references public.usuarios(id),
  terapeuta_nombre text,
  fase text default '1',
  entorno text default 'gym' check (entorno in ('gym','casa')),
  semanas integer default 4,
  activo boolean default true,
  notas_generales text,
  notas_alarma text,
  created_at timestamp with time zone default timezone('utc', now())
);

-- ── EJERCICIOS DEL PLAN (por día) ────────────────────────────
create table public.plan_ejercicios (
  id uuid default uuid_generate_v4() primary key,
  plan_id uuid references public.planes_ejercicio(id) on delete cascade not null,
  dia text not null check (dia in ('Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo')),
  ejercicio_id uuid references public.ejercicios(id),
  orden integer default 0,
  series text,
  repeticiones text,
  carga text,
  zona_fc text,
  nota text
);

-- ── CONSULTAS MÉDICAS ─────────────────────────────────────────
create table public.consultas_medicas (
  id uuid default uuid_generate_v4() primary key,
  paciente_id uuid references public.pacientes(id) on delete cascade not null,
  fecha date not null default current_date,
  medico_id uuid references public.usuarios(id),
  medico_nombre text,
  -- Medidas
  peso numeric(6,2),
  bmi numeric(5,2),
  cintura numeric(5,1),
  pa_sistolica integer,
  pa_diastolica integer,
  fc integer,
  -- Laboratorios
  glucosa numeric(6,1),
  hba1c numeric(4,2),
  colesterol_total numeric(6,1),
  colesterol_ldl numeric(6,1),
  colesterol_hdl numeric(6,1),
  trigliceridos numeric(6,1),
  insulina numeric(6,2),
  tsh numeric(6,3),
  -- Medicamentos
  glp1 text,
  metformina text,
  otros_medicamentos text,
  -- Diagnóstico
  diagnostico text,
  plan_tratamiento text,
  proxima_visita date,
  notas text,
  created_at timestamp with time zone default timezone('utc', now())
);

-- ── CONSULTAS NUTRICIONALES ───────────────────────────────────
create table public.consultas_nutricion (
  id uuid default uuid_generate_v4() primary key,
  paciente_id uuid references public.pacientes(id) on delete cascade not null,
  fecha date not null default current_date,
  nutricionista_id uuid references public.usuarios(id),
  nutricionista_nombre text,
  -- Medidas
  peso numeric(6,2),
  pct_grasa numeric(5,2),
  masa_muscular numeric(6,2),
  -- Prescripción
  kcal_objetivo integer,
  proteina_g integer,
  carbohidratos_g integer,
  grasas_g integer,
  frecuencia_comidas integer,
  agua_litros numeric(4,1),
  -- Indicaciones
  suplementos text,
  restricciones text,
  alergias text,
  plan_nutricional text,
  objetivos text,
  notas text,
  created_at timestamp with time zone default timezone('utc', now())
);

-- ── REGISTRO DIARIO DEL PACIENTE ─────────────────────────────
create table public.registro_paciente (
  id uuid default uuid_generate_v4() primary key,
  paciente_id uuid references public.pacientes(id) on delete cascade not null,
  fecha date not null default current_date,
  -- Ejercicio
  ejercicios_completados jsonb default '[]',
  minutos_ejercicio integer,
  zona_fc_alcanzada text,
  borg_percibido integer,
  -- Medidas
  peso numeric(6,2),
  -- Nutrición
  comidas_completadas integer,
  agua_litros numeric(4,1),
  -- Bienestar
  energia integer check (energia between 1 and 10),
  dolor integer check (dolor between 0 and 10),
  notas text,
  created_at timestamp with time zone default timezone('utc', now()),
  unique(paciente_id, fecha)
);

-- ── SEGURIDAD (Row Level Security) ───────────────────────────

alter table public.usuarios enable row level security;
alter table public.pacientes enable row level security;
alter table public.valoraciones enable row level security;
alter table public.ejercicios enable row level security;
alter table public.planes_ejercicio enable row level security;
alter table public.plan_ejercicios enable row level security;
alter table public.consultas_medicas enable row level security;
alter table public.consultas_nutricion enable row level security;
alter table public.registro_paciente enable row level security;

-- Políticas: equipo IMC ve todo
create policy "equipo_imc_all" on public.usuarios for all using (auth.role() = 'authenticated');
create policy "equipo_imc_all" on public.pacientes for all using (auth.role() = 'authenticated');
create policy "equipo_imc_all" on public.valoraciones for all using (auth.role() = 'authenticated');
create policy "equipo_imc_all" on public.ejercicios for all using (auth.role() = 'authenticated');
create policy "equipo_imc_all" on public.planes_ejercicio for all using (auth.role() = 'authenticated');
create policy "equipo_imc_all" on public.plan_ejercicios for all using (auth.role() = 'authenticated');
create policy "equipo_imc_all" on public.consultas_medicas for all using (auth.role() = 'authenticated');
create policy "equipo_imc_all" on public.consultas_nutricion for all using (auth.role() = 'authenticated');
create policy "equipo_imc_all" on public.registro_paciente for all using (auth.role() = 'authenticated');

-- ── DATOS INICIALES — Banco de ejercicios ────────────────────
insert into public.ejercicios (nombre, categoria, entorno, musculos, nivel, unidad) values
-- Aeróbico
('Caminadora', 'aerobico', 'gym', 'Tren inferior, cardiovascular', 'bajo', 'min'),
('Bicicleta estática', 'aerobico', 'gym', 'Tren inferior, cardiovascular', 'bajo', 'min'),
('Elíptica', 'aerobico', 'gym', 'Cuerpo completo, cardiovascular', 'bajo', 'min'),
('Caminata exterior', 'aerobico', 'casa', 'Tren inferior, cardiovascular', 'bajo', 'min'),
('Marcha en el lugar', 'aerobico', 'casa', 'Tren inferior, cardiovascular', 'bajo', 'min'),
('Trote suave', 'aerobico', 'casa', 'Cardiovascular', 'medio', 'min'),
('Saltar cuerda', 'aerobico', 'casa', 'Cuerpo completo', 'medio', 'min'),
-- Tren inferior
('Sentadilla libre', 'tren_inferior', 'gym', 'Cuádriceps, glúteos, isquiotibiales', 'medio', 'reps'),
('Prensa de piernas', 'tren_inferior', 'gym', 'Cuádriceps, glúteos', 'medio', 'reps'),
('Peso muerto rumano', 'tren_inferior', 'gym', 'Isquiotibiales, glúteos, lumbar', 'medio', 'reps'),
('Extensión de cuádriceps', 'tren_inferior', 'gym', 'Cuádriceps', 'bajo', 'reps'),
('Curl femoral', 'tren_inferior', 'gym', 'Isquiotibiales', 'bajo', 'reps'),
('Zancadas', 'tren_inferior', 'gym', 'Cuádriceps, glúteos', 'medio', 'reps'),
('Sentadilla con silla', 'tren_inferior', 'casa', 'Cuádriceps, glúteos', 'bajo', 'reps'),
('Sentadilla en pared', 'tren_inferior', 'casa', 'Cuádriceps, glúteos', 'bajo', 'seg'),
('Puente de glúteos', 'tren_inferior', 'casa', 'Glúteos, isquiotibiales', 'bajo', 'reps'),
('Elevaciones de talón', 'tren_inferior', 'casa', 'Pantorrillas', 'bajo', 'reps'),
-- Tren superior
('Press pecho máquina', 'tren_superior', 'gym', 'Pectoral, tríceps, hombros', 'medio', 'reps'),
('Jalón al pecho', 'tren_superior', 'gym', 'Dorsal, bíceps', 'medio', 'reps'),
('Remo en máquina', 'tren_superior', 'gym', 'Dorsal, bíceps, trapecio', 'medio', 'reps'),
('Elevaciones laterales', 'tren_superior', 'gym', 'Hombros', 'bajo', 'reps'),
('Curl bíceps con mancuerna', 'tren_superior', 'gym', 'Bíceps', 'bajo', 'reps'),
('Extensión tríceps polea', 'tren_superior', 'gym', 'Tríceps', 'bajo', 'reps'),
('Flexiones en pared', 'tren_superior', 'casa', 'Pectoral, tríceps', 'bajo', 'reps'),
('Flexiones en rodillas', 'tren_superior', 'casa', 'Pectoral, tríceps', 'bajo', 'reps'),
('Flexiones completas', 'tren_superior', 'casa', 'Pectoral, tríceps, hombros', 'medio', 'reps'),
('Curl bíceps con banda', 'tren_superior', 'casa', 'Bíceps', 'bajo', 'reps'),
('Remo con banda', 'tren_superior', 'casa', 'Dorsal, bíceps', 'bajo', 'reps'),
-- Core
('Plancha en codos', 'core', 'ambos', 'Core completo', 'bajo', 'seg'),
('Crunch abdominal', 'core', 'ambos', 'Recto abdominal', 'bajo', 'reps'),
('Plancha lateral', 'core', 'ambos', 'Oblicuos, core', 'medio', 'seg'),
('Dead bug', 'core', 'ambos', 'Core, estabilizadores', 'medio', 'reps'),
('Elevación de piernas', 'core', 'casa', 'Abdomen inferior', 'medio', 'reps'),
-- Respiratorio / Movilidad
('Respiración diafragmática', 'respiratorio', 'ambos', 'Diafragma, pulmones', 'bajo', 'resp'),
('Movilidad de cadera', 'movilidad', 'ambos', 'Cadera, flexores', 'bajo', 'reps'),
('Estiramiento cuádriceps', 'movilidad', 'ambos', 'Cuádriceps', 'bajo', 'seg'),
('Estiramiento isquiotibiales', 'movilidad', 'ambos', 'Isquiotibiales', 'bajo', 'seg'),
('Rotación torácica', 'movilidad', 'ambos', 'Columna torácica', 'bajo', 'reps'),
('Movilidad de hombros', 'movilidad', 'ambos', 'Hombros, manguito rotador', 'bajo', 'reps');

-- ── FUNCIÓN updated_at automático ────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

create trigger update_pacientes_updated_at
  before update on public.pacientes
  for each row execute function update_updated_at();

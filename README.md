# IMC – Instituto Metabólico Corporal
## App Clínica Web

### Pasos para desplegar

#### 1. Ejecutar el schema en Supabase
- Ve a tu proyecto en supabase.com
- Clic en "SQL Editor"
- Copia y pega el contenido de `supabase_schema.sql`
- Clic en "Run"

#### 2. Crear el primer usuario
- En Supabase ve a Authentication → Users
- Clic en "Add user"
- Ingresa email y contraseña del primer miembro del equipo
- Luego en SQL Editor ejecuta:
```sql
INSERT INTO public.usuarios (id, nombre, apellido, email, rol)
VALUES ('UUID-DEL-USUARIO', 'Nombre', 'Apellido', 'email@ejemplo.com', 'admin');
```
(El UUID lo ves en Authentication → Users)

#### 3. Subir a GitHub
```bash
cd imc-app
git init
git add .
git commit -m "IMC App - versión inicial"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/imc-gmediq.git
git push -u origin main
```

#### 4. Desplegar en Vercel
- Ve a vercel.com
- "New Project" → importar desde GitHub
- Selecciona el repositorio imc-gmediq
- En "Environment Variables" agrega:
  - `REACT_APP_SUPABASE_URL` = https://serxzmpibljfqtuyazel.supabase.co
  - `REACT_APP_SUPABASE_ANON_KEY` = tu-anon-key
- Clic en "Deploy"

### Estructura del proyecto
```
src/
  App.js              → Autenticación y routing principal
  lib/supabase.js     → Cliente de base de datos
  pages/
    Login.js          → Pantalla de login
    Dashboard.js      → Navegación principal + Banco ejercicios
  components/
    Pacientes.js      → Lista y búsqueda de pacientes
    PacienteDetalle.js → Historia clínica, valoraciones, consultas
```
# imc-gmediq

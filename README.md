# Reclutamiento movil con selfie y GPS

Aplicacion web responsive y lista para uso desde celular. Solicita camara frontal, ubicacion GPS y guarda la postulacion en Supabase.

## Estructura
- `index.html`
- `style.css`
- `app.js`

## 1) Crear cuenta y proyecto en Supabase
1. Entra a https://supabase.com y crea una cuenta.
2. Crea un nuevo proyecto (elige region cercana).
3. Espera a que termine la provision.

## 2) Crear tabla `postulaciones`
En el SQL Editor de Supabase, ejecuta:

```sql
create extension if not exists "pgcrypto";

create table public.postulaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null default 'Sin nombre',
  telefono text not null default 'Sin telefono',
  selfie_url text not null,
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now(),
  user_agent text not null
);

alter table public.postulaciones enable row level security;

create policy "insert postulaciones"
  on public.postulaciones
  for insert
  to anon
  with check (true);
```

## 3) Crear bucket `selfies`
1. Ve a Storage -> Create bucket.
2. Nombre: `selfies`.
3. Marca el bucket como **Public** (para poder guardar URL publica).
4. Luego, en SQL Editor, agrega politicas:

```sql
create policy "public upload selfies"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'selfies');

create policy "public read selfies"
  on storage.objects
  for select
  to anon
  using (bucket_id = 'selfies');
```

## 4) Configurar variables de entorno
Supabase expone 2 valores:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Pasos:
1. En Supabase: Project Settings -> API.
2. Copia **Project URL** y **anon public key**.
3. Abre `app.js` y reemplaza:
   - `YOUR_SUPABASE_URL`
   - `YOUR_SUPABASE_ANON_KEY`

En Vercel tambien agrega estas variables en: Project Settings -> Environment Variables.

## 5) Probar localmente
En PC, puedes usar `localhost` (es contexto seguro):

```bash
python -m http.server 5173
```

Luego abre `http://localhost:5173`.

En celular necesitas HTTPS: usa Vercel Preview o el deploy final.

> Nota: en HTTP no funcionaran camara y geolocalizacion. Usa siempre HTTPS.

## 6) Subir a GitHub
1. Crea un repo en GitHub.
2. En tu carpeta local:

```bash
git init
git add .
git commit -m "init reclutamiento movil"
git branch -M main
git remote add origin <TU_REPO>
git push -u origin main
```

## 7) Deploy gratis en Vercel
1. Ve a https://vercel.com y crea cuenta.
2. Importa tu repo de GitHub.
3. Framework: **Other**.
4. Build Command: (vacio).
5. Output Directory: (vacio).
6. Agrega `SUPABASE_URL` y `SUPABASE_ANON_KEY` en Environment Variables.
7. Deploy.

## Uso
Desde el celular:
1. Abre la URL HTTPS.
2. Permite camara y ubicacion.
3. Toma la selfie y el envio se realiza automaticamente.

## Notas de seguridad
- Se usa el anon key de Supabase desde el frontend, es normal para apps publicas.
- Las politicas RLS solo permiten insert y lectura del bucket `selfies`.
- Si necesitas mas seguridad, agrega validaciones en servidor o usa funciones edge.

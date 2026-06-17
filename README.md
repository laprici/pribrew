# Pribrew

Bitácora de extracción de café, **multiusuario con recetas compartidas por grupo**. PWA responsive (web con sidebar / móvil con bottom-nav, instalable).

**Stack:** Vite · React · TypeScript · Tailwind · TanStack Router · TanStack Query · Zustand · Zod · Supabase. IA (Fase 3): DeepSeek vía Edge Function.

---

## Requisitos

- **Node 20+**
- **Docker Desktop** (lo usa Supabase para el stack local)
- **Supabase CLI** — instalación: https://supabase.com/docs/guides/cli

```bash
# macOS
brew install supabase/tap/supabase
# o con npm (cualquier SO)
npm install -g supabase
```

---

## 1) Supabase local

Desde la raíz del proyecto (donde está la carpeta `supabase/` con `migrations/` y `seed.sql`):

```bash
# genera supabase/config.toml para tu versión de CLI (no toca tus migraciones)
supabase init

# levanta el stack local (Postgres, Auth, Storage, Studio…) — requiere Docker
supabase start

# aplica migraciones + seed (crea tablas, RLS, RPCs y siembra los 7 métodos)
supabase db reset
```

> **Auth local sin fricción:** en `supabase/config.toml`, bajo `[auth.email]`, pon
> `enable_confirmations = false`. Así "Crear cuenta" te deja la sesión iniciada sin
> tener que confirmar el correo. (Los correos locales igual quedan en Inbucket/Mailpit,
> normalmente en http://localhost:54324.)

Toma las credenciales locales:

```bash
supabase status
# Copia "API URL" (http://localhost:54321) y "anon key"
```

## 2) Frontend

```bash
cp .env.example .env.local
# pega en .env.local:
#   VITE_SUPABASE_URL=http://localhost:54321
#   VITE_SUPABASE_ANON_KEY=<anon key de supabase status>

npm install
npm run dev          # http://localhost:5173
```

Crea dos cuentas (en dos navegadores o ventanas privadas) para probar el flujo de grupo:
crear grupo → "Invitar" (copia el link `/invite/<token>`) → abrir con la otra cuenta →
"Unirme". A partir de ahí ambos ven las recetas y granos del otro.

### Scripts
- `npm run dev` — desarrollo
- `npm run build` — genera el árbol de rutas, typecheck y build de producción (con PWA)
- `npm run preview` — sirve el build
- `npm run typecheck` — solo chequeo de tipos

---

## 3) Subir a producción (cuando estés listo)

Tu servidor Supabase (o un proyecto en supabase.com):

```bash
supabase link --project-ref <tu-project-ref>
supabase db push            # aplica las migraciones al servidor remoto
# (opcional) sembrar métodos: psql <connection-string> -f supabase/seed.sql
```

Frontend (build estático, va en cualquier hosting o tu propio servidor):

```bash
npm run build               # genera dist/
# sirve dist/ en Netlify / Vercel / Cloudflare Pages / Nginx…
# configura las env VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY del entorno de producción
```

La **Edge Function de IA (DeepSeek)** es de la Fase 3; cuando llegue:
`supabase functions deploy suggest-adjustments` + `supabase secrets set DEEPSEEK_API_KEY=...`.

---

## Estado actual (Fase 0 + arranque de Fase 1)

Hecho y verificado:
- Migración SQL completa (enums, grupos, inventario, brews, funciones, RPCs, **RLS**, índices) **validada contra Postgres 16**, incluyendo prueba funcional de compartición por grupo.
- Semilla de los 7 métodos.
- App responsive: shell (sidebar/bottom-nav), auth (registro/login), **grupos** (crear, invitar por link, aceptar), dashboard. PWA instalable con service worker. Build y typecheck en verde.

Siguiente paso (resto de Fase 1): CRUD de granos y moledores, asistente de extracción
(form dinámico por método), timer, historial y detalle de receta.

## Estructura

```
supabase/
  migrations/0001_init.sql   # esquema + RLS + RPCs (validado)
  seed.sql                   # 7 métodos
src/
  lib/        supabase, queryClient, auth
  domain/     schemas Zod (bean, grinder, brew + method params, group) y cálculos
  data/       hooks TanStack Query (groups)
  components/ AppShell responsive
  routes/     login, index (dashboard), invite.$token, groups, beans, brews
```

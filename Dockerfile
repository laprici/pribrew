# syntax=docker/dockerfile:1.7

FROM node:22.16.0-alpine AS build

WORKDIR /app

# pnpm vía corepack (el repo usa pnpm-lock.yaml; el package-lock.json está obsoleto)
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Las VITE_* se hornean en el bundle durante el build (así lo lee import.meta.env
# en src/lib/supabase.ts). Hay que pasarlas como build args en CapRover.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN pnpm build

FROM nginx:1.27-alpine AS runtime

# Config mínima de nginx con fallback SPA (rutas profundas de TanStack Router → index.html)
RUN printf 'server {\n\
    listen 80;\n\
    server_name _;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    # El service worker y el manifest no deben cachearse de forma agresiva\n\
    location = /sw.js { add_header Cache-Control "no-cache"; }\n\
    location = /manifest.webmanifest { add_header Cache-Control "no-cache"; }\n\
\n\
    # Assets con hash: cache larga e inmutable\n\
    location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }\n\
\n\
    # Fallback SPA\n\
    location / { try_files $uri $uri/ /index.html; }\n\
}\n' > /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

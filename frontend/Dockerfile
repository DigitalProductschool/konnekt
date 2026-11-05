FROM node:26-alpine AS builder

# The npm workspace: the root manifest and lockfile, and the frontend with the
# packages it imports (api-types, rules)
WORKDIR /app

COPY package.json package-lock.json ./
COPY api-types/package.json api-types/
COPY rules/package.json rules/
COPY frontend/package.json frontend/

# No .git in the image: skip the root's `prepare` (the pre-commit hook install)
RUN npm ci -w frontend --ignore-scripts

# The packages' tsconfig.json files extend the root's
COPY tsconfig.base.json ./
COPY api-types ./api-types
COPY rules ./rules
COPY frontend ./frontend

# VITE_API_URL is intentionally not set: the build falls back to the relative
# '/api' path, which nginx proxies to the backend container.
RUN npm run build -w frontend

FROM nginx:alpine AS runner

# Installed as a template: the image's entrypoint runs envsubst over
# /etc/nginx/templates/*.template into /etc/nginx/conf.d/ at container start,
# resolving ${BACKEND_HOST}. Overridden per environment (Coolify previews get
# a suffixed backend service name); defaults to the compose service name.
ENV BACKEND_HOST=backend
COPY frontend/nginx.conf /etc/nginx/templates/default.conf.template
# Writes the /api/connect/ allow-list and the trusted proxies at container start,
# from SERVICEBW_ALLOWED_CIDRS and TRUSTED_PROXY_CIDRS (research R13)
COPY frontend/nginx/40-servicebw-access.sh /docker-entrypoint.d/40-servicebw-access.sh
RUN chmod 755 /docker-entrypoint.d/40-servicebw-access.sh
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

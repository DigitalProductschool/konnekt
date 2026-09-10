FROM node:22-alpine AS builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./

# No .git in the image: skip the husky hook install that `prepare` would run
ENV HUSKY=0
RUN npm install

COPY frontend ./

# VITE_API_URL is intentionally not set: the build falls back to the relative
# '/api' path, which nginx proxies to the backend container.
RUN npm run build

FROM nginx:alpine AS runner

# Installed as a template: the image's entrypoint runs envsubst over
# /etc/nginx/templates/*.template into /etc/nginx/conf.d/ at container start,
# resolving ${BACKEND_HOST}. Overridden per environment (Coolify previews get
# a suffixed backend service name); defaults to the compose service name.
ENV BACKEND_HOST=backend
COPY frontend/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

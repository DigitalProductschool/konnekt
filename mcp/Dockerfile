# The MCP server (research R1, R3). Context: the repository root (docker-compose.prod.yml)
FROM node:26-alpine AS builder

# The npm workspace: the root manifest and lockfile, and the four packages' manifests,
# so that the lockfile matches the workspace
WORKDIR /app

COPY package.json package-lock.json ./
COPY api-types/package.json api-types/
COPY rules/package.json rules/
COPY frontend/package.json frontend/
COPY mcp/package.json mcp/

# No .git in the image: skip the root's `prepare` (the pre-commit hook install)
RUN npm ci -w mcp --ignore-scripts

# The packages' tsconfig.json files extend the root's
COPY tsconfig.base.json ./
COPY api-types ./api-types
COPY rules ./rules
COPY mcp ./mcp

# Vite's SSR build bundles api-types/, rules/ and the skills of mcp/plugin/ into mcp/dist/
RUN npm run build -w mcp

FROM node:26-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

# Only the server's runtime dependencies (the SDK and zod); api-types and rules are bundled
COPY package.json package-lock.json ./
COPY api-types/package.json api-types/
COPY rules/package.json rules/
COPY frontend/package.json frontend/
COPY mcp/package.json mcp/
RUN npm ci -w mcp --omit=dev --ignore-scripts && npm cache clean --force

# mcp/plugin/ is not copied: the skills are embedded in the bundle
COPY --from=builder /app/mcp/dist ./mcp/dist

USER node

EXPOSE 3100

CMD ["node", "mcp/dist/main.js"]

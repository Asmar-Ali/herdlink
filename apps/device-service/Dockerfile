# Build context must be the monorepo root so `file:../../libs/*` deps resolve.
# See docker-compose.yml `device-service.build.context`.
FROM node:22-alpine

WORKDIR /workspace

# Shared libs first — npm install follows file:../../libs/{auth,observability}
COPY libs/auth ./libs/auth
COPY libs/observability ./libs/observability

COPY apps/device-service/package.json apps/device-service/package-lock.json ./apps/device-service/

WORKDIR /workspace/apps/device-service
RUN npm ci

COPY apps/device-service ./

EXPOSE 3000

CMD ["npm", "run", "start:dev"]

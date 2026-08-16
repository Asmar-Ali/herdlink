# Build context must be the monorepo root so `file:../../libs/*` deps resolve.
# See docker-compose.yml `device-simulator.build.context`.
FROM node:22-alpine

WORKDIR /workspace

# Shared libs first — npm install follows file:../../libs/observability
COPY libs/observability ./libs/observability

COPY apps/device-simulator/package.json apps/device-simulator/package-lock.json ./apps/device-simulator/

WORKDIR /workspace/apps/device-simulator
RUN npm ci

COPY apps/device-simulator ./

EXPOSE 3010

CMD ["node", "dist/main.js"]

# Base stage
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Common install stage
FROM base AS build
WORKDIR /usr/src/app
# Copy only the server folder contents
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --filter=seon-server --frozen-lockfile
RUN pnpm --filter=seon-server run build

# Seon-server deploy
FROM build AS posts-deploy
RUN pnpm deploy --filter=seon-server --prod /prod/seon-server

# Seon-server stage
FROM base AS seon-server
COPY --from=build /prod/seon-server /prod/seon-server
WORKDIR /prod/seon-server
EXPOSE 3000
CMD [ "pnpm", "start" ]

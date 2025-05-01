FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app

# Copy package management files first for better caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/server/package.json ./packages/server/

# Install all dependencies (including devDependencies)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Copy source files
COPY packages/server/src ./packages/server/src
COPY packages/server/tsconfig.json ./packages/server/
COPY tsconfig.json .

# Build the application
RUN cd packages/server && pnpm build

# Create a clean production deployment using pnpm deploy
RUN pnpm deploy --filter=seon-server --prod /prod/server

FROM base AS runner
WORKDIR /app

# Copy only the deployed production files
COPY --from=builder /prod/server .

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["pnpm", "start"]

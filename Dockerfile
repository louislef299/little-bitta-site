# syntax=docker/dockerfile:1
# check=error=true

FROM oven/bun:1.3.10-alpine AS build

WORKDIR /app
COPY . ./

RUN bun i --no-cache && bun b

FROM oven/bun:1.3.10-alpine

WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./

# Anti-pattern, need to fix
COPY .env.production .
RUN bun i -p --no-cache

ARG ENV_TARGET=".env.production"
EXPOSE 3000
CMD ["bun", "--env-file", "${ENV_TARGET}", "./build/index.js"]

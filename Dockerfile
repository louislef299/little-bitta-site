# syntax=docker/dockerfile:1
# check=error=true

FROM oven/bun:1.3.6-alpine AS build

WORKDIR /app
COPY . ./

RUN bun i --no-cache && bun run build

FROM oven/bun:1.3.6-alpine

WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./
RUN bun i -p --no-cache

EXPOSE 3000
CMD ["bun", "--env-file", ".env", "./build/index.js"]

# syntax=docker/dockerfile:1
# check=error=true

FROM oven/bun:1.3.6-alpine

WORKDIR /app
COPY . ./
RUN bun install

CMD ["bun", "dev"]

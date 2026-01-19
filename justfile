bun := require("bun")

# https://cheatography.com/linux-china/cheat-sheets/justfile/
[doc('List out available recipes')]
default: 
    @just --list
    @echo "\nAvailable bun scripts:"
    @jq '.scripts' package.json

# Run the vite dev server using bun runtime
run:
    {{bun}} -b run dev

# Build the Svelte project using vite
build:
    {{bun}} clean && {{bun}} b

# Run the production version of the application
prod: build
    docker compose up -d --wait db
    {{bun}} serve

# Clean local development dependencies
clean:
    {{bun}} clean
    docker compose down -v

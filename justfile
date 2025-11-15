# List available recipes
default:
    @just --list

# Run the development server with hot reload
run:
    bun index.ts

# Run the development server with hot reload
run-hot:
    bun --hot index.ts

# Build for production
build:
    bun build index.ts --outdir=dist --minify --target=browser

# Run tests
test:
    bun test

# Run tests in watch mode
test-watch:
    bun test --watch

# Run linter (requires: bun add -d @biomejs/biome)
lint:
    bun biome check .

# Fix linting issues automatically
lint-fix:
    bun biome check --write .

# Install dependencies
install:
    bun install

# Update all packages
update:
    bun update

# Clean build artifacts
clean:
    rm -rf dist node_modules .bun

# Install Biome linter
setup-lint:
    bun add -d @biomejs/biome

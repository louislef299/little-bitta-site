# little-bitta-site
the little bitta website

## Learning Log

### 2025-11-15: Bun CLI Basics

**Running Programs**
```bash
# Run a TypeScript/JavaScript file directly
bun run index.ts
bun index.ts

# Run with hot reload (restarts on file changes)
bun --hot index.ts

# Run with watch mode (rebuilds on file changes)
bun --watch index.ts
```

**Building Programs**
```bash
# Build a single file (outputs to stdout by default)
bun build index.ts

# Build with output file
bun build index.ts --outfile=dist/index.js

# Build HTML files (bundles all imports)
bun build index.html --outdir=dist

# Build with minification
bun build index.ts --minify --outfile=dist/index.js

# Build for production (minified, optimized)
bun build index.ts --minify --target=browser --outfile=dist/index.js
```

**Package Management**
```bash
# Install all dependencies from package.json
bun install

# Add a package
bun add <package-name>

# Add a dev dependency
bun add -d <package-name>

# Remove a package
bun remove <package-name>

# Update all packages
bun update

# Update a specific package
bun update <package-name>
```

**Testing**
```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run a specific test file
bun test path/to/test.test.ts

# Run tests with coverage
bun test --coverage
```

**Linting**
```bash
# Bun doesn't include a built-in linter
# Use ESLint or Biome for linting:

# Install ESLint
bun add -d eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Or install Biome (faster alternative)
bun add -d @biomejs/biome

# Run ESLint
bun eslint .

# Run Biome
bun biome check .
```

**Other Useful Commands**
```bash
# Initialize a new project
bun init

# Run a script from package.json
bun run <script-name>

# Run a shell command
bun x <command>  # or bunx <command>

# Check Bun version
bun --version

# Upgrade Bun itself
bun upgrade
```

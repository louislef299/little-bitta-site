# little-bitta-site
the little bitta website

## Learning Log

### 2025-11-15: just - Command Runner

`just` is a modern command runner that improves on Make in several key ways. Unlike Make, which was designed for building files with complex dependency tracking, just is purpose-built for running project commands. It eliminates Make's quirks like needing `.PHONY` declarations, provides better error messages with source context, works consistently across platforms (Linux, macOS, Windows), and has a cleaner syntax with features like documentation comments that appear in help output. Just also loads `.env` files automatically and validates recipes before running them, catching errors like circular dependencies or typos upfront.

**Essential Commands**

```bash
# List all available recipes with their descriptions
just --list
# or simply
just

# Run a specific recipe
just build
just test
just run

# Show a recipe's commands without executing them
just --show build

# Run recipes from a different directory
just --working-directory /path/to/project build

# Run multiple recipes in sequence
just build test lint

# Pass arguments to a recipe (if the recipe accepts them)
just deploy production

# Choose a different justfile
just --justfile custom.justfile build

# Set variables for a recipe
just --set variable value recipe-name

# See what just would do without running it (dry-run)
just --dry-run build
```

**Key Syntax Features**

- Recipes are commands stored in a `justfile`
- Use `@` before commands to suppress echoing them
- Add `# comments` above recipes to document them (shown in `--list`)
- No tabs required (unlike Make) - use any consistent indentation
- First recipe or `default:` recipe runs when you type `just` with no arguments

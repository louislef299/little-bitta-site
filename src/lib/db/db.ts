import { SQL } from "bun";
import { DATABASE_URL } from "$env/static/private";

// Always connect to PostgreSQL via DATABASE_URL.
// Local dev uses Docker Compose Postgres (docker compose up -d db).
// The updated_at = DEFAULT pattern in UPDATE queries relies on
// column defaults defined in config/init-db/01-schema.sql:
//   updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
// See: https://www.morling.dev/blog/last-updated-columns-with-postgres/
export const sql = new SQL(DATABASE_URL);

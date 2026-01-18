import { sql, SQL } from "bun";

// PostgreSQL (default)
const users = await sql`
  SELECT * FROM users
  WHERE active = ${true}
  LIMIT ${10}
`;

// With MySQL
const mysql = new SQL("mysql://user:pass@localhost:3306/mydb");
const mysqlResults = await mysql`
  SELECT * FROM users 
  WHERE active = ${true}
`;

// With SQLite
const sqlite = new SQL("sqlite://myapp.db");
const sqliteResults = await sqlite`
  SELECT * FROM users 
  WHERE active = ${1}
`;

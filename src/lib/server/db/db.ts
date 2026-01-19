import mysql from "mysql2/promise";
import { DATABASE_URL } from "$env/static/private";

// Create a connection pool for better performance
export const pool = mysql.createPool(DATABASE_URL);

export async function checkConnection(): Promise<boolean> {
  console.log(`using database connection string ${DATABASE_URL}`);
  try {
    await pool.execute("SELECT 1");
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`couldn't connect to database: ${message}`);
    return false;
  }
}

import { pool } from "./db";
import type { RowDataPacket } from "mysql2";

export interface Granola {
  id: number;
  slug: string;
  name: string;
  description: string;
  ingredients: string;
  price: number;
  image_url: string;
}

interface GranolaRow extends RowDataPacket, Granola {}

export async function getGranolaBySlug(slug: string): Promise<Granola | null> {
  const [rows] = await pool.execute<GranolaRow[]>(
    `SELECT id, slug, name, description, ingredients, price, image_url
		 FROM granola
		 WHERE slug = ?
		 LIMIT 1`,
    [slug],
  );

  return rows[0] ?? null;
}

export async function getAllGranola(): Promise<Granola[]> {
  const [rows] = await pool.execute<GranolaRow[]>(
    `SELECT id, slug, name, description, ingredients, price, image_url
		 FROM granola
		 ORDER BY name`,
  );

  return rows;
}

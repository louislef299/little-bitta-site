import { sql } from "./db";

export interface Granola {
  id: number;
  slug: string;
  name: string;
  description: string;
  ingredients: string;
  price: number;
  image_url: string;
}

export async function getGranolaBySlug(slug: string): Promise<Granola | null> {
  const rows = await sql`
    SELECT id, slug, name, description, ingredients, price, image_url
    FROM granola
    WHERE slug = ${slug}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getAllGranola(): Promise<Granola[]> {
  return await sql`
    SELECT id, slug, name, description, ingredients, price, image_url
    FROM granola
    ORDER BY name
  `;
}

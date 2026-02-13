import { sql } from "./db";

export interface Product {
    id: number;
    slug: string;
    name: string;
    description: string;
    ingredients: string;
    price: number;
    image_url: string;
    product_type: string;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
    const rows = await sql`
        SELECT id, slug, name, description, ingredients, price, image_url, product_type
        FROM products WHERE slug = ${slug} LIMIT 1
    `;
    return rows[0] ?? null;
}

export async function getAllProducts(): Promise<Product[]> {
    return await sql`
        SELECT id, slug, name, description, ingredients, price, image_url, product_type
        FROM products ORDER BY name
    `;
}

export async function getProductsByType(type: string): Promise<Product[]> {
    return await sql`
        SELECT id, slug, name, description, ingredients, price, image_url, product_type
        FROM products WHERE product_type = ${type} ORDER BY name
    `;
}
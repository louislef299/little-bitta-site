import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  mock,
} from "bun:test";
import { getTestSql, setupSchema, truncateAll, teardown } from "./test-utils";

const sql = await getTestSql();
mock.module("../../../src/lib/db/db", () => ({ sql }));

const { getProductBySlug, getAllProducts, getProductsByType } =
  await import("../../../src/lib/db/product");

beforeAll(async () => {
  await setupSchema(sql);
});

beforeEach(async () => {
  await truncateAll(sql);
});

afterAll(async () => {
  await teardown(sql);
});

async function insertProduct(opts: {
  slug: string;
  name: string;
  price?: number;
  product_type?: string;
  description?: string;
  ingredients?: string;
}): Promise<number> {
  const rows = await sql`
    INSERT INTO products (slug, name, description, ingredients, price, product_type)
    VALUES (${opts.slug}, ${opts.name}, ${opts.description ?? null},
            ${opts.ingredients ?? null}, ${opts.price ?? 12.0},
            ${opts.product_type ?? "granola"})
    RETURNING id
  `;
  return (rows[0] as { id: number }).id;
}

describe("getProductBySlug", () => {
  test("returns a product by slug", async () => {
    await insertProduct({
      slug: "peanut-butter",
      name: "Peanut Butter",
      price: 12.0,
      description: "Delicious PB",
      ingredients: "Oats, PB",
    });

    const product = await getProductBySlug("peanut-butter");
    expect(product).not.toBeNull();
    expect(product!.slug).toBe("peanut-butter");
    expect(product!.name).toBe("Peanut Butter");
    expect(Number(product!.price)).toBeCloseTo(12.0);
    expect(product!.description).toBe("Delicious PB");
    expect(product!.ingredients).toBe("Oats, PB");
    expect(product!.product_type).toBe("granola");
  });

  test("returns null for non-existent slug", async () => {
    const product = await getProductBySlug("does-not-exist");
    expect(product).toBeNull();
  });

  test("returns correct product when multiple exist", async () => {
    await insertProduct({ slug: "honey-bear", name: "Honey Bear" });
    await insertProduct({ slug: "pistachio", name: "Pistachio" });

    const product = await getProductBySlug("pistachio");
    expect(product).not.toBeNull();
    expect(product!.name).toBe("Pistachio");
  });
});

describe("getAllProducts", () => {
  test("returns all products ordered by name", async () => {
    await insertProduct({ slug: "pistachio", name: "Pistachio" });
    await insertProduct({ slug: "almond", name: "Almond Crunch" });
    await insertProduct({ slug: "honey", name: "Honey Bear" });

    const products = await getAllProducts();
    expect(products).toHaveLength(3);
    expect(products[0].name).toBe("Almond Crunch");
    expect(products[1].name).toBe("Honey Bear");
    expect(products[2].name).toBe("Pistachio");
  });

  test("returns empty array when no products exist", async () => {
    const products = await getAllProducts();
    expect(products).toHaveLength(0);
  });
});

describe("getProductsByType", () => {
  test("returns only products of the given type", async () => {
    await insertProduct({
      slug: "pb",
      name: "PB Granola",
      product_type: "granola",
    });
    await insertProduct({
      slug: "trail",
      name: "Trail Mix",
      product_type: "mix",
    });
    await insertProduct({
      slug: "honey",
      name: "Honey Granola",
      product_type: "granola",
    });

    const granola = await getProductsByType("granola");
    expect(granola).toHaveLength(2);
    expect(granola.every((p) => p.product_type === "granola")).toBe(true);
  });

  test("returns empty array when no products match type", async () => {
    await insertProduct({
      slug: "pb",
      name: "PB Granola",
      product_type: "granola",
    });

    const bars = await getProductsByType("bar");
    expect(bars).toHaveLength(0);
  });

  test("returns products ordered by name", async () => {
    await insertProduct({
      slug: "z-granola",
      name: "Zesty Granola",
      product_type: "granola",
    });
    await insertProduct({
      slug: "a-granola",
      name: "Almond Granola",
      product_type: "granola",
    });

    const granola = await getProductsByType("granola");
    expect(granola[0].name).toBe("Almond Granola");
    expect(granola[1].name).toBe("Zesty Granola");
  });
});

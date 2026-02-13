-- Seed granola products
INSERT INTO products (slug, name, description, ingredients, price, image_url, product_type) VALUES
(
  'peanut-butter-chocolate-chip',
  'Peanut Butter Chocolate Chip',
  'Rich, creamy peanut butter granola studded with generous chocolate chips. A perfect balance of salty and sweet that makes breakfast feel like dessert.',
  'Rolled oats, peanut butter, chocolate chips, honey, coconut oil, brown sugar, vanilla extract, sea salt',
  12.00,
  '/images/granola-generic.jpg',
  'granola'
),
(
  'peanut-butter-nutella',
  'Peanut Butter Nutella',
  'The ultimate indulgence - smooth peanut butter meets rich hazelnut chocolate spread in every crunchy cluster. Warning: highly addictive.',
  'Rolled oats, peanut butter, Nutella, honey, coconut oil, hazelnuts, cocoa powder, vanilla extract',
  12.00,
  '/images/granola-generic.jpg',
  'granola'
),
(
  'honey-bear',
  'Honey Bear',
  'Sweet golden honey kissed granola with a gentle warmth. Simple, classic, and perfectly balanced for those who appreciate the pure taste of nature.',
  'Rolled oats, local honey, sliced almonds, coconut oil, vanilla extract, cinnamon, sea salt',
  12.00,
  '/images/granola-generic.jpg',
  'granola'
),
(
  'pistachio',
  'Pistachio',
  'Elegant and nutty with generous chunks of premium pistachios throughout. A sophisticated granola for the discerning palate.',
  'Rolled oats, roasted pistachios, honey, coconut oil, almond extract, cardamom, sea salt',
  12.00,
  '/images/granola-generic.jpg',
  'granola'
);

-- Seed drops
-- Date ranges are wide so the first drop is active for local development.
INSERT INTO drops (display_name, year, status, max_capacity, start_date, end_date, description) VALUES
(
  'First Half',
  2026,
  'active',
  50,
  '2026-01-01',
  '2026-06-01',
  'Start the new year with delicious granola!'
),
(
  'Second Half',
  2026,
  'upcoming',
  50,
  '2026-06-01',
  '2026-12-01',
  'Summer special coming soon!'
);

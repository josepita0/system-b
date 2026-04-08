ALTER TABLE products ADD COLUMN show_in_sales INTEGER NOT NULL DEFAULT 1;

-- POS filtering uses (is_active, show_in_sales, category_id) frequently.
CREATE INDEX IF NOT EXISTS idx_products_active_show_category
  ON products(is_active, show_in_sales, category_id);


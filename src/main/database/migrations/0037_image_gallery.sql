CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_name TEXT NOT NULL,
  stored_relpath TEXT NOT NULL UNIQUE,
  mime TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  sha256 TEXT,
  name TEXT,
  description TEXT,
  category TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_images_name ON images (name);
CREATE INDEX IF NOT EXISTS idx_images_category ON images (category);
CREATE INDEX IF NOT EXISTS idx_images_created_at ON images (created_at);

CREATE TABLE IF NOT EXISTS product_images (
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_id INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (product_id, image_id)
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_sort ON product_images (product_id, sort_order, created_at);
CREATE INDEX IF NOT EXISTS idx_product_images_image ON product_images (image_id);

-- Enforce at most 1 primary image per product.
CREATE UNIQUE INDEX IF NOT EXISTS ux_product_images_primary_per_product
ON product_images (product_id)
WHERE is_primary = 1;

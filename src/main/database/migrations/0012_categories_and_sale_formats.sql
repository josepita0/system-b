CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories(id)
);

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_active_sort ON categories(is_active, sort_order, name);

INSERT INTO categories (name, slug, parent_id, sort_order)
VALUES
  ('General', 'general', NULL, 0),
  ('Refrescos', 'refrescos', NULL, 10),
  ('Cervezas', 'cervezas', NULL, 20),
  ('Cafes', 'cafes', NULL, 30),
  ('Licores', 'licores', NULL, 40);

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT 'Ron', 'ron', id, 10
FROM categories
WHERE slug = 'licores';

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT 'Vodka', 'vodka', id, 20
FROM categories
WHERE slug = 'licores';

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT 'Ginebra', 'ginebra', id, 30
FROM categories
WHERE slug = 'licores';

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT 'Whisky', 'whisky', id, 40
FROM categories
WHERE slug = 'licores';

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT 'Vinos', 'vinos', id, 50
FROM categories
WHERE slug = 'licores';

CREATE TABLE IF NOT EXISTS sale_formats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  requires_complement INTEGER NOT NULL DEFAULT 0 CHECK (requires_complement IN (0, 1)),
  complement_category_root_id INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (complement_category_root_id) REFERENCES categories(id)
);

CREATE INDEX IF NOT EXISTS idx_sale_formats_active_sort ON sale_formats(is_active, sort_order, name);
CREATE INDEX IF NOT EXISTS idx_sale_formats_complement_root ON sale_formats(complement_category_root_id);

INSERT INTO sale_formats (code, name, sort_order, requires_complement, complement_category_root_id)
VALUES
  ('copa', 'Copa', 10, 0, NULL),
  ('chupito', 'Chupito', 20, 0, NULL),
  ('combinado', 'Combinado', 30, 1, (SELECT id FROM categories WHERE slug = 'refrescos')),
  ('piedra', 'Piedra', 40, 0, NULL),
  ('vaquerito', 'Vaquerito', 50, 0, NULL);

CREATE TABLE IF NOT EXISTS category_sale_formats (
  category_id INTEGER NOT NULL,
  sale_format_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (category_id, sale_format_id),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (sale_format_id) REFERENCES sale_formats(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_category_sale_formats_sale_format_id ON category_sale_formats(sale_format_id);

ALTER TABLE products ADD COLUMN category_id INTEGER REFERENCES categories(id);

UPDATE products
SET category_id = (SELECT id FROM categories WHERE slug = 'general')
WHERE category_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

INSERT INTO category_sale_formats (category_id, sale_format_id)
SELECT categories.id, sale_formats.id
FROM categories
CROSS JOIN sale_formats
WHERE categories.slug IN ('licores', 'ron', 'vodka', 'ginebra', 'whisky', 'vinos');

CREATE TRIGGER IF NOT EXISTS trg_products_category_required_insert
BEFORE INSERT ON products
FOR EACH ROW
WHEN NEW.category_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'La categoria es obligatoria.');
END;

CREATE TRIGGER IF NOT EXISTS trg_products_category_required_update
BEFORE UPDATE OF category_id ON products
FOR EACH ROW
WHEN NEW.category_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'La categoria es obligatoria.');
END;

CREATE TABLE IF NOT EXISTS ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'unit',
  min_stock INTEGER NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ingredient_id INTEGER NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entry', 'exit', 'adjustment', 'recipe_discount')),
  quantity REAL NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id INTEGER,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
);

CREATE VIEW IF NOT EXISTS inventory_balance_view AS
SELECT
  i.id AS ingredient_id,
  i.name AS ingredient_name,
  i.min_stock AS min_stock,
  COALESCE(SUM(im.quantity), 0) AS stock
FROM ingredients i
LEFT JOIN inventory_movements im ON im.ingredient_id = i.id
GROUP BY i.id, i.name, i.min_stock;

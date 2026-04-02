-- Inventario basado en productos (solo products.type = 'simple')

ALTER TABLE products ADD COLUMN consumption_mode TEXT NOT NULL DEFAULT 'unit' CHECK (consumption_mode IN ('unit', 'progressive'));
ALTER TABLE products ADD COLUMN capacity_quantity REAL;
ALTER TABLE products ADD COLUMN capacity_unit TEXT;

CREATE TABLE IF NOT EXISTS product_inventory_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entry', 'exit', 'adjustment', 'sale')),
  quantity REAL NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id INTEGER,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_product_inventory_movements_product_id ON product_inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_product_inventory_movements_reference ON product_inventory_movements(reference_type, reference_id);

CREATE VIEW IF NOT EXISTS product_inventory_balance_view AS
SELECT
  p.id AS product_id,
  p.sku AS sku,
  p.name AS product_name,
  p.min_stock AS min_stock,
  p.type AS product_type,
  p.consumption_mode AS consumption_mode,
  p.capacity_quantity AS capacity_quantity,
  p.capacity_unit AS capacity_unit,
  COALESCE(SUM(m.quantity), 0) AS stock
FROM products p
LEFT JOIN product_inventory_movements m ON m.product_id = p.id
WHERE p.is_active = 1
GROUP BY p.id;

CREATE TABLE IF NOT EXISTS product_lots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'sealed' CHECK (status IN ('sealed', 'open', 'depleted')),
  capacity_quantity REAL NOT NULL,
  remaining_quantity REAL NOT NULL,
  opened_at TEXT,
  depleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_product_lots_product_status ON product_lots(product_id, status, created_at);

CREATE TABLE IF NOT EXISTS product_lot_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lot_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity REAL NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lot_id) REFERENCES product_lots(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_product_lot_movements_lot_id ON product_lot_movements(lot_id);
CREATE INDEX IF NOT EXISTS idx_product_lot_movements_reference ON product_lot_movements(reference_type, reference_id);

CREATE TABLE IF NOT EXISTS sale_format_product_consumptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  sale_format_id INTEGER,
  consume_quantity REAL NOT NULL CHECK (consume_quantity > 0),
  unit TEXT NOT NULL DEFAULT 'ml',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (product_id, sale_format_id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (sale_format_id) REFERENCES sale_formats(id)
);

CREATE INDEX IF NOT EXISTS idx_sale_format_product_consumptions_product_format ON sale_format_product_consumptions(product_id, sale_format_id);


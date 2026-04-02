ALTER TABLE ingredients ADD COLUMN consumption_mode TEXT NOT NULL DEFAULT 'unit' CHECK (consumption_mode IN ('unit', 'progressive'));
ALTER TABLE ingredients ADD COLUMN capacity_quantity REAL;
ALTER TABLE ingredients ADD COLUMN capacity_unit TEXT;

CREATE TABLE IF NOT EXISTS inventory_lots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ingredient_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'sealed' CHECK (status IN ('sealed', 'open', 'depleted')),
  capacity_quantity REAL NOT NULL,
  remaining_quantity REAL NOT NULL,
  opened_at TEXT,
  depleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_lots_ingredient_status ON inventory_lots(ingredient_id, status, created_at);

CREATE TABLE IF NOT EXISTS inventory_lot_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lot_id INTEGER NOT NULL,
  ingredient_id INTEGER NOT NULL,
  quantity REAL NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lot_id) REFERENCES inventory_lots(id),
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_lot_movements_lot_id ON inventory_lot_movements(lot_id);
CREATE INDEX IF NOT EXISTS idx_inventory_lot_movements_reference ON inventory_lot_movements(reference_type, reference_id);

CREATE TABLE IF NOT EXISTS sale_format_consumptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  sale_format_id INTEGER,
  ingredient_id INTEGER NOT NULL,
  consume_quantity REAL NOT NULL CHECK (consume_quantity > 0),
  unit TEXT NOT NULL DEFAULT 'ml',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (product_id, sale_format_id, ingredient_id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (sale_format_id) REFERENCES sale_formats(id),
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
);

CREATE INDEX IF NOT EXISTS idx_sale_format_consumptions_product_format ON sale_format_consumptions(product_id, sale_format_id);


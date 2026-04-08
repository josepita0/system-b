-- Consumos internos (no venta): documento + líneas.
-- Se reflejan en inventario vía product_inventory_movements con:
--   movement_type = 'exit'
--   reference_type = 'internal_consumption'
--   reference_id = internal_consumptions.id

CREATE TABLE IF NOT EXISTS internal_consumptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cash_session_id INTEGER,
  created_by_employee_id INTEGER,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  cancelled_at TEXT,
  cancelled_by_employee_id INTEGER,
  cancel_reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cash_session_id) REFERENCES cash_sessions(id),
  FOREIGN KEY (created_by_employee_id) REFERENCES employees(id),
  FOREIGN KEY (cancelled_by_employee_id) REFERENCES employees(id)
);

CREATE INDEX IF NOT EXISTS idx_internal_consumptions_session ON internal_consumptions(cash_session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_internal_consumptions_status ON internal_consumptions(status, created_at);

CREATE TABLE IF NOT EXISTS internal_consumption_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  internal_consumption_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity REAL NOT NULL CHECK (quantity > 0),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (internal_consumption_id) REFERENCES internal_consumptions(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_internal_consumption_items_doc ON internal_consumption_items(internal_consumption_id);
CREATE INDEX IF NOT EXISTS idx_internal_consumption_items_product ON internal_consumption_items(product_id, created_at);


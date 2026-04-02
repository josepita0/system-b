CREATE TABLE IF NOT EXISTS vip_customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  document_id TEXT,
  phone TEXT,
  notes TEXT,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('discount_manual', 'exempt')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vip_customers_active_name ON vip_customers(is_active, name);

ALTER TABLE sales ADD COLUMN vip_customer_id INTEGER REFERENCES vip_customers(id);
ALTER TABLE sales ADD COLUMN real_total REAL;
ALTER TABLE sales ADD COLUMN charged_total REAL;
ALTER TABLE sales ADD COLUMN vip_condition_snapshot TEXT;

CREATE INDEX IF NOT EXISTS idx_sales_vip_customer_id ON sales(vip_customer_id);

ALTER TABLE sale_items ADD COLUMN real_unit_price REAL;
ALTER TABLE sale_items ADD COLUMN charged_unit_price REAL;

UPDATE sales
SET real_total = total,
    charged_total = total
WHERE real_total IS NULL OR charged_total IS NULL;

UPDATE sale_items
SET real_unit_price = unit_price,
    charged_unit_price = unit_price
WHERE real_unit_price IS NULL OR charged_unit_price IS NULL;


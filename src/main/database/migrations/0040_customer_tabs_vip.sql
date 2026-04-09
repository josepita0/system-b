ALTER TABLE customer_tabs ADD COLUMN vip_customer_id INTEGER REFERENCES vip_customers(id);

CREATE INDEX IF NOT EXISTS idx_customer_tabs_vip_customer ON customer_tabs(vip_customer_id);

ALTER TABLE sale_items ADD COLUMN sale_format_id INTEGER REFERENCES sale_formats(id);
ALTER TABLE sale_items ADD COLUMN complement_product_id INTEGER REFERENCES products(id);

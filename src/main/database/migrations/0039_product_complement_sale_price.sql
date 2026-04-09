ALTER TABLE products ADD COLUMN complement_sale_price REAL NULL CHECK (complement_sale_price IS NULL OR complement_sale_price >= 0);

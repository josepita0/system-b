ALTER TABLE categories ADD COLUMN image_relpath TEXT;
ALTER TABLE categories ADD COLUMN image_mime TEXT;
ALTER TABLE categories ADD COLUMN pdf_relpath TEXT;
ALTER TABLE categories ADD COLUMN pdf_mime TEXT;
ALTER TABLE categories ADD COLUMN pdf_original_name TEXT;

ALTER TABLE products ADD COLUMN image_relpath TEXT;
ALTER TABLE products ADD COLUMN image_mime TEXT;
ALTER TABLE products ADD COLUMN pdf_relpath TEXT;
ALTER TABLE products ADD COLUMN pdf_mime TEXT;
ALTER TABLE products ADD COLUMN pdf_original_name TEXT;

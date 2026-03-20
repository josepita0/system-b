ALTER TABLE categories ADD COLUMN supports_children INTEGER NOT NULL DEFAULT 0 CHECK (supports_children IN (0, 1));
ALTER TABLE categories ADD COLUMN inherits_sale_formats INTEGER NOT NULL DEFAULT 0 CHECK (inherits_sale_formats IN (0, 1));

UPDATE categories
SET supports_children = CASE
  WHEN parent_id IS NULL AND slug <> 'general' THEN 1
  WHEN EXISTS (SELECT 1 FROM categories children WHERE children.parent_id = categories.id) THEN 1
  ELSE 0
END;

UPDATE categories
SET inherits_sale_formats = CASE
  WHEN parent_id IS NOT NULL THEN 1
  ELSE 0
END;

DELETE FROM category_sale_formats
WHERE category_id IN (
  SELECT id
  FROM categories
  WHERE parent_id IS NOT NULL
    AND inherits_sale_formats = 1
);

CREATE INDEX IF NOT EXISTS idx_categories_supports_children ON categories(supports_children, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_inherits_sale_formats ON categories(inherits_sale_formats, parent_id);

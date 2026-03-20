ALTER TABLE categories ADD COLUMN structure_locked INTEGER NOT NULL DEFAULT 0 CHECK (structure_locked IN (0, 1));

UPDATE categories
SET structure_locked = 1
WHERE id IN (
  SELECT c.id
  FROM categories c
  WHERE EXISTS (
      SELECT 1
      FROM categories child
      WHERE child.parent_id = c.id
        AND child.is_active = 1
    )
    OR EXISTS (
      SELECT 1
      FROM products p
      WHERE p.category_id = c.id
        AND p.is_active = 1
    )
    OR EXISTS (
      SELECT 1
      FROM category_sale_formats csf
      WHERE csf.category_id = c.id
    )
);

CREATE INDEX IF NOT EXISTS idx_categories_structure_locked
ON categories(structure_locked, is_active, sort_order);

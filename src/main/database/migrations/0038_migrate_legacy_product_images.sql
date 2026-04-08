-- Migrate legacy `products.image_relpath` into the new image gallery tables.
-- We keep legacy columns as-is for backward compatibility, but new UI/queries should use `product_images`.

INSERT OR IGNORE INTO images (original_name, stored_relpath, mime, size_bytes, name, created_at, updated_at)
SELECT
  COALESCE(p.image_relpath, '') AS original_name,
  p.image_relpath AS stored_relpath,
  COALESCE(p.image_mime, 'application/octet-stream') AS mime,
  0 AS size_bytes,
  p.name AS name,
  COALESCE(p.created_at, CURRENT_TIMESTAMP) AS created_at,
  COALESCE(p.updated_at, CURRENT_TIMESTAMP) AS updated_at
FROM products p
WHERE p.image_relpath IS NOT NULL
  AND TRIM(p.image_relpath) <> '';

INSERT OR IGNORE INTO product_images (product_id, image_id, sort_order, is_primary, created_at)
SELECT
  p.id AS product_id,
  i.id AS image_id,
  0 AS sort_order,
  1 AS is_primary,
  CURRENT_TIMESTAMP AS created_at
FROM products p
JOIN images i ON i.stored_relpath = p.image_relpath
WHERE p.image_relpath IS NOT NULL
  AND TRIM(p.image_relpath) <> '';

-- Saldo en vista: para consumo progresivo, el "stock" es la cantidad de lotes con remanente > 0 (no la suma de movimientos en ml).

DROP VIEW IF EXISTS product_inventory_balance_view;

CREATE VIEW product_inventory_balance_view AS
SELECT
  p.id AS product_id,
  p.sku AS sku,
  p.name AS product_name,
  p.min_stock AS min_stock,
  p.type AS product_type,
  p.consumption_mode AS consumption_mode,
  p.capacity_quantity AS capacity_quantity,
  p.capacity_unit AS capacity_unit,
  CASE
    WHEN p.consumption_mode = 'progressive' THEN (
      SELECT COUNT(1)
      FROM product_lots pl
      WHERE pl.product_id = p.id
        AND pl.remaining_quantity > 0.0000001
    )
    ELSE (
      SELECT COALESCE(SUM(m.quantity), 0)
      FROM product_inventory_movements m
      WHERE m.product_id = p.id
    )
  END AS stock
FROM products p
WHERE p.is_active = 1;

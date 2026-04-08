-- BOM / receta producto→producto para stock virtual y descuento automático.
-- El producto "parent" (derivado) consume componentes al venderse.
-- Las cantidades se expresan en unidades del componente por 1 unidad del parent.

CREATE TABLE IF NOT EXISTS product_bom_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_product_id INTEGER NOT NULL,
  component_product_id INTEGER NOT NULL,
  quantity_per_unit REAL NOT NULL CHECK (quantity_per_unit > 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (parent_product_id, component_product_id),
  CHECK (parent_product_id != component_product_id),
  FOREIGN KEY (parent_product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (component_product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_product_bom_items_parent ON product_bom_items(parent_product_id);
CREATE INDEX IF NOT EXISTS idx_product_bom_items_component ON product_bom_items(component_product_id);


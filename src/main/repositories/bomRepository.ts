import type Database from 'better-sqlite3'

export class BomRepository {
  constructor(private readonly db: Database.Database) {}

  listItems(parentProductId: number) {
    return this.db
      .prepare(
        `SELECT bi.id AS id,
                bi.parent_product_id AS parent_product_id,
                bi.component_product_id AS component_product_id,
                p.sku AS component_sku,
                p.name AS component_name,
                bi.quantity_per_unit AS quantity_per_unit
         FROM product_bom_items bi
         INNER JOIN products p ON p.id = bi.component_product_id
         WHERE bi.parent_product_id = ?
         ORDER BY p.name ASC, bi.id ASC`,
      )
      .all(parentProductId) as Array<{
      id: number
      parent_product_id: number
      component_product_id: number
      component_sku: string
      component_name: string
      quantity_per_unit: number
    }>
  }

  replaceAll(parentProductId: number, items: Array<{ componentProductId: number; quantityPerUnit: number }>) {
    const run = this.db.transaction(() => {
      this.db.prepare('DELETE FROM product_bom_items WHERE parent_product_id = ?').run(parentProductId)
      const ins = this.db.prepare(
        `INSERT INTO product_bom_items (parent_product_id, component_product_id, quantity_per_unit)
         VALUES (?, ?, ?)`,
      )
      for (const it of items) {
        ins.run(parentProductId, it.componentProductId, it.quantityPerUnit)
      }
    })
    run()
  }

  removeAll(parentProductId: number) {
    this.db.prepare('DELETE FROM product_bom_items WHERE parent_product_id = ?').run(parentProductId)
  }
}


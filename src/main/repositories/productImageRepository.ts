import type Database from 'better-sqlite3'

export class ProductImageRepository {
  constructor(private readonly db: Database.Database) {}

  linkMany(productId: number, imageIds: number[]) {
    if (imageIds.length === 0) return
    const stmt = this.db.prepare(
      `INSERT OR IGNORE INTO product_images (product_id, image_id, sort_order, is_primary)
       VALUES (?, ?, 0, 0)`,
    )
    const runMany = this.db.transaction((ids: number[]) => {
      for (const imageId of ids) {
        stmt.run(productId, imageId)
      }
    })
    runMany(imageIds)
  }

  unlink(productId: number, imageId: number) {
    this.db.prepare('DELETE FROM product_images WHERE product_id = ? AND image_id = ?').run(productId, imageId)
  }

  setPrimary(productId: number, imageId: number) {
    const tx = this.db.transaction(() => {
      this.db.prepare('UPDATE product_images SET is_primary = 0 WHERE product_id = ?').run(productId)
      this.db
        .prepare('UPDATE product_images SET is_primary = 1 WHERE product_id = ? AND image_id = ?')
        .run(productId, imageId)
    })
    tx()
  }

  getPrimaryRelPathByProductId(productId: number) {
    const row = this.db
      .prepare(
        `SELECT i.stored_relpath AS relpath
         FROM product_images pi
         INNER JOIN images i ON i.id = pi.image_id
         WHERE pi.product_id = ? AND pi.is_primary = 1
         LIMIT 1`,
      )
      .get(productId) as { relpath: string } | undefined

    return row?.relpath ?? null
  }
}


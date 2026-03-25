import type Database from 'better-sqlite3'

export type RecipeWithItems = {
  recipeId: number
  yieldQuantity: number
  items: Array<{ ingredientId: number; quantity: number }>
}

export class RecipeRepository {
  constructor(private readonly db: Database.Database) {}

  getByProductId(productId: number): RecipeWithItems | null {
    const recipe = this.db
      .prepare('SELECT id, yield_quantity FROM recipes WHERE product_id = ?')
      .get(productId) as { id: number; yield_quantity: number } | undefined
    if (!recipe) {
      return null
    }

    const rows = this.db
      .prepare('SELECT ingredient_id, quantity FROM recipe_items WHERE recipe_id = ? ORDER BY id ASC')
      .all(recipe.id) as Array<{ ingredient_id: number; quantity: number }>

    return {
      recipeId: recipe.id,
      yieldQuantity: recipe.yield_quantity,
      items: rows.map((row) => ({
        ingredientId: row.ingredient_id,
        quantity: row.quantity,
      })),
    }
  }
}

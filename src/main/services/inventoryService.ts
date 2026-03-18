import { InventoryRepository } from '../repositories/inventoryRepository'

export class InventoryService {
  constructor(private readonly repository: InventoryRepository) {}

  getInventorySnapshot() {
    return this.repository.getInventoryBalance()
  }

  getReplenishmentList() {
    return this.repository.getReplenishmentList()
  }
}

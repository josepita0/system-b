import type { CategoryTreeNode } from '@shared/types/product'

export function findCategoryNode(nodes: CategoryTreeNode[], id: number): CategoryTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node
    }
    const child = findCategoryNode(node.children, id)
    if (child) {
      return child
    }
  }
  return null
}

/** Padre directo de la categoría en el árbol, o null si es raíz o no existe. */
export function findParentCategoryNode(tree: CategoryTreeNode[], categoryId: number): CategoryTreeNode | null {
  const node = findCategoryNode(tree, categoryId)
  if (!node || node.parentId == null) {
    return null
  }
  return findCategoryNode(tree, node.parentId)
}

/** Categoria raiz del arbol que contiene el id dado. */
export function findRootAncestor(tree: CategoryTreeNode[], categoryId: number): CategoryTreeNode | null {
  const node = findCategoryNode(tree, categoryId)
  if (!node) {
    return null
  }
  let current: CategoryTreeNode | null = node
  while (current && current.parentId != null) {
    const parent = findCategoryNode(tree, current.parentId)
    current = parent
  }
  return current
}

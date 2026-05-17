import { byField, FIRESTORE_LIMITS, getCollection, patchDocument, setDocument, orderedBy } from '@/services/firestore/base'
import type { Product } from '@/types/models'

const collectionPath = (fairId: string) => `fairs/${fairId}/products`

const sortProducts = (products: Product[]) =>
  products.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))

export const listCloudProducts = async (fairId: string, includeInactive = true) => {
  const products = await getCollection<Product>(
    collectionPath(fairId),
    FIRESTORE_LIMITS.products,
    includeInactive ? [orderedBy('sortOrder', 'asc')] : [byField('active', '==', true)],
  )

  return includeInactive ? products : sortProducts(products)
}

export const saveCloudProduct = (product: Product) => setDocument(collectionPath(product.fairId), product)

export const updateCloudProduct = (productId: string, product: Partial<Product>) =>
  patchDocument<Product>(collectionPath(product.fairId ?? ''), productId, {
    ...product,
    updatedAt: new Date().toISOString(),
  })

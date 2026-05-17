import { byField, FIRESTORE_LIMITS, getCollection, patchDocument, setDocument } from '@/services/firestore/base'
import type { Sale } from '@/types/models'

const collectionPath = (fairId: string) => `fairs/${fairId}/sales`

export const listCloudSales = async (fairId: string, max = FIRESTORE_LIMITS.salesPerFair) => {
  const sales = await getCollection<Sale>(collectionPath(fairId), max)
  return sales.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export const listCloudSalesByDate = async (fairId: string, dateKey: string, max = FIRESTORE_LIMITS.salesPerDay) => {
  const sales = await getCollection<Sale>(collectionPath(fairId), max, [byField('dateKey', '==', dateKey)])
  return sales.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export const saveCloudSale = (sale: Sale) => setDocument(collectionPath(sale.fairId), sale)

export const updateCloudSale = (saleId: string, sale: Partial<Sale>) =>
  patchDocument<Sale>(collectionPath(sale.fairId ?? ''), saleId, sale)

export const cancelCloudSale = (fairId: string, saleId: string) =>
  patchDocument<Sale>(collectionPath(fairId), saleId, {
    status: 'cancelled',
    cancelledAt: new Date().toISOString(),
  })

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '@/services/db'
import { getDateKey } from '@/services/date'
import { cancelCloudSale, saveCloudSale, updateCloudSale } from '@/services/firestore/sales'
import { useFairsStore } from '@/stores/fairs'
import type { CartItem, PaymentMethod, Sale } from '@/types/models'

interface CreateSaleInput {
  items: CartItem[]
  paymentMethod: PaymentMethod
  amountReceived?: number
}

interface UpdateSaleInput {
  saleId: string
  items: CartItem[]
  paymentMethod: PaymentMethod
  amountReceived?: number
}

export const paymentLabels: Record<PaymentMethod, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  card: 'Cartão',
}

export const useSalesStore = defineStore('sales', () => {
  const sales = ref<Sale[]>([])
  const loading = ref(false)

  const todaySales = computed(() => {
    const today = getDateKey()
    return sales.value
      .filter((sale) => sale.dateKey === today)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const loadSales = async () => {
    const fairsStore = useFairsStore()
    if (!fairsStore.selectedFairId) {
      sales.value = []
      return
    }

    loading.value = true
    sales.value = (await db.sales.where('fairId').equals(fairsStore.selectedFairId).toArray()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    loading.value = false
  }

  const createSale = async ({ items, paymentMethod, amountReceived }: CreateSaleInput) => {
    const fairsStore = useFairsStore()
    if (!fairsStore.selectedFairId) {
      throw new Error('Selecione uma feira.')
    }

    if (items.length === 0) {
      throw new Error('Adicione pelo menos um item.')
    }

    const total = items.reduce((sum, item) => sum + item.total, 0)
    if (paymentMethod === 'cash' && (amountReceived ?? 0) < total) {
      throw new Error('Valor recebido menor que o total.')
    }

    const createdAt = new Date().toISOString()
    const sale: Sale = {
      id: crypto.randomUUID(),
      fairId: fairsStore.selectedFairId,
      createdAt,
      dateKey: getDateKey(new Date(createdAt)),
      items: items.map((item) => ({ ...item })),
      subtotal: total,
      total,
      paymentMethod,
      amountReceived: paymentMethod === 'cash' ? amountReceived : undefined,
      change: paymentMethod === 'cash' ? (amountReceived ?? 0) - total : undefined,
      status: 'confirmed',
    }

    await db.sales.add(sale)
    void saveCloudSale(sale).catch(() => {
      // Offline-first: venda fica local e pode ser sincronizada depois.
    })
    await loadSales()
    return sale
  }

  const cancelSale = async (saleId: string) => {
    const sale = await db.sales.get(saleId)
    await db.sales.update(saleId, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
    })
    if (sale) {
      void cancelCloudSale(sale.fairId, saleId).catch(() => {
        // Mantem local e sincroniza depois.
      })
    }
    await loadSales()
  }

  const updateSale = async ({ saleId, items, paymentMethod, amountReceived }: UpdateSaleInput) => {
    const sale = await db.sales.get(saleId)
    if (!sale) {
      throw new Error('Venda não encontrada.')
    }

    if (sale.status === 'cancelled') {
      throw new Error('Venda cancelada não pode ser editada.')
    }

    if (items.length === 0) {
      throw new Error('O pedido precisa ter pelo menos um item.')
    }

    const normalizedItems = items
      .filter((item) => item.quantity > 0)
      .map((item) => ({
        ...item,
        total: item.unitPrice * item.quantity,
      }))
    const total = normalizedItems.reduce((sum, item) => sum + item.total, 0)

    if (paymentMethod === 'cash' && (amountReceived ?? 0) < total) {
      throw new Error('Valor recebido menor que o total.')
    }

    const updatedSale = {
      fairId: sale.fairId,
      items: normalizedItems,
      subtotal: total,
      total,
      paymentMethod,
      amountReceived: paymentMethod === 'cash' ? amountReceived : undefined,
      change: paymentMethod === 'cash' ? (amountReceived ?? 0) - total : undefined,
    }

    await db.sales.update(saleId, updatedSale)
    void updateCloudSale(saleId, updatedSale).catch(() => {
      // Mantem local e sincroniza depois.
    })
    await loadSales()
  }

  const salesByDate = (dateKey: string) =>
    sales.value
      .filter((sale) => sale.dateKey === dateKey)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return {
    sales,
    todaySales,
    loading,
    loadSales,
    createSale,
    cancelSale,
    updateSale,
    salesByDate,
  }
})

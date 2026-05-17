import type { PaymentMethod, Sale } from '@/types/models'

export interface ProductReportRow {
  productId: string
  productName: string
  quantity: number
  total: number
}

export interface SalesReport {
  label: string
  total: number
  saleCount: number
  averageTicket: number
  byPayment: Record<PaymentMethod, number>
  products: ProductReportRow[]
}

const emptyPaymentTotals = (): Record<PaymentMethod, number> => ({
  cash: 0,
  pix: 0,
  card: 0,
})

export const calculateSalesReport = (sales: Sale[], label: string): SalesReport => {
  const confirmedSales = sales.filter((sale) => sale.status === 'confirmed')
  const productMap = new Map<string, ProductReportRow>()
  const byPayment = emptyPaymentTotals()
  const total = confirmedSales.reduce((sum, sale) => {
    byPayment[sale.paymentMethod] += sale.total

    sale.items.forEach((item) => {
      const current = productMap.get(item.productId) ?? {
        productId: item.productId,
        productName: item.productName,
        quantity: 0,
        total: 0,
      }

      current.quantity += item.quantity
      current.total += item.total
      productMap.set(item.productId, current)
    })

    return sum + sale.total
  }, 0)

  const products = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity || b.total - a.total)

  return {
    label,
    total,
    saleCount: confirmedSales.length,
    averageTicket: confirmedSales.length ? total / confirmedSales.length : 0,
    byPayment,
    products,
  }
}

export const calculateDailyReport = (sales: Sale[], dateKey: string) =>
  calculateSalesReport(sales.filter((sale) => sale.dateKey === dateKey), dateKey)

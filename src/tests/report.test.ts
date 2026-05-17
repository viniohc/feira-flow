import { describe, expect, it } from 'vitest'
import { calculateDailyReport } from '@/services/report'
import type { Sale } from '@/types/models'

const makeSale = (overrides: Partial<Sale>): Sale => ({
  id: crypto.randomUUID(),
  fairId: 'fair-1',
  createdAt: '2026-05-16T12:00:00.000Z',
  dateKey: '2026-05-16',
  items: [
    {
      productId: 'pastel',
      productName: 'Pastel',
      unitPrice: 8,
      quantity: 2,
      total: 16,
    },
  ],
  subtotal: 16,
  total: 16,
  paymentMethod: 'pix',
  status: 'confirmed',
  ...overrides,
})

describe('calculateDailyReport', () => {
  it('sums confirmed sales and ignores cancelled sales', () => {
    const report = calculateDailyReport(
      [
        makeSale({ paymentMethod: 'cash', amountReceived: 20, change: 4 }),
        makeSale({ id: 'cancelled', status: 'cancelled', paymentMethod: 'card' }),
      ],
      '2026-05-16',
    )

    expect(report.total).toBe(16)
    expect(report.saleCount).toBe(1)
    expect(report.byPayment.cash).toBe(16)
    expect(report.byPayment.card).toBe(0)
    expect(report.products[0]).toMatchObject({
      productName: 'Pastel',
      quantity: 2,
      total: 16,
    })
  })
})

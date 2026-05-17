export type ProductCategory = 'Comidas' | 'Bebidas' | 'Sobremesas' | 'Outros'

export type PaymentMethod = 'cash' | 'pix' | 'card'

export type SaleStatus = 'confirmed' | 'cancelled'

export interface Product {
  id: string
  fairId: string
  name: string
  price: number
  category: ProductCategory
  active: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface SaleItem {
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  total: number
}

export interface Sale {
  id: string
  fairId: string
  createdAt: string
  dateKey: string
  items: SaleItem[]
  subtotal: number
  total: number
  paymentMethod: PaymentMethod
  amountReceived?: number
  change?: number
  status: SaleStatus
  cancelledAt?: string
}

export interface Settings {
  id: string
  fairId: string
  storeName: string
  currency: 'BRL'
}

export interface Fair {
  id: string
  name: string
  ownerId: string
  members: Record<string, true>
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CartItem {
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  total: number
}

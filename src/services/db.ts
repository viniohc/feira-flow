import Dexie, { type Table } from 'dexie'
import type { Fair, Product, Sale, Settings } from '@/types/models'

const nowIso = () => new Date().toISOString()

export class FeiraDatabase extends Dexie {
  products!: Table<Product, string>
  sales!: Table<Sale, string>
  settings!: Table<Settings, string>
  fairs!: Table<Fair, string>

  constructor() {
    super('caixa-da-feira')
    this.version(1).stores({
      products: 'id, category, active, sortOrder',
      sales: 'id, dateKey, createdAt, status, paymentMethod',
      settings: 'id',
    })
    this.version(2).stores({
      products: 'id, fairId, [fairId+category], [fairId+active], sortOrder',
      sales: 'id, fairId, [fairId+dateKey], createdAt, status, paymentMethod',
      settings: 'id, fairId',
      fairs: 'id, ownerId, active',
    })
    this.version(3).stores({
      products: 'id, fairId, [fairId+category], [fairId+active], deleted, sortOrder',
      sales: 'id, fairId, [fairId+dateKey], createdAt, status, paymentMethod',
      settings: 'id, fairId',
      fairs: 'id, ownerId, active',
    })
  }
}

export const db = new FeiraDatabase()

export const migrateLegacyDataToFair = async (fairId: string) => {
  const [products, sales, settings] = await Promise.all([
    db.products.toArray(),
    db.sales.toArray(),
    db.settings.toArray(),
  ])

  await Promise.all([
    ...products
      .filter((product) => !product.fairId)
      .map((product) => db.products.update(product.id, { fairId })),
    ...sales
      .filter((sale) => !sale.fairId)
      .map((sale) => db.sales.update(sale.id, { fairId })),
    ...settings
      .filter((setting) => !setting.fairId)
      .map((setting) => db.settings.update(setting.id, { fairId })),
  ])
}

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const exampleProducts = [
  { slug: 'pastel', name: 'Pastel', price: 8, category: 'Comidas' as const, sortOrder: 1 },
  { slug: 'bolo', name: 'Bolo', price: 6, category: 'Sobremesas' as const, sortOrder: 2 },
  { slug: 'refrigerante', name: 'Refrigerante', price: 5, category: 'Bebidas' as const, sortOrder: 3 },
  { slug: 'suco', name: 'Suco', price: 4, category: 'Bebidas' as const, sortOrder: 4 },
  { slug: 'cachorro-quente', name: 'Cachorro-quente', price: 10, category: 'Comidas' as const, sortOrder: 5 },
]

export const cleanupDuplicateProducts = async (fairId: string) => {
  const products = await db.products.where('fairId').equals(fairId).toArray()
  const groupedProducts = new Map<string, Product[]>()

  products
    .filter((product) => !product.deleted)
    .forEach((product) => {
      const key = `${slugify(product.name)}|${product.category}|${product.price}`
      groupedProducts.set(key, [...(groupedProducts.get(key) ?? []), product])
    })

  const timestamp = nowIso()
  await Promise.all(
    Array.from(groupedProducts.values()).flatMap((group) => {
      const sortedGroup = group.sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))
      return sortedGroup.slice(1).map((product) =>
        db.products.update(product.id, {
          active: false,
          deleted: true,
          deletedAt: timestamp,
          updatedAt: timestamp,
        }),
      )
    }),
  )
}

export const seedDatabase = async (fairId: string) => {
  const productCount = await db.products.where('fairId').equals(fairId).and((product) => !product.deleted).count()
  const createdAt = nowIso()

  if (productCount === 0) {
    await db.products.bulkPut(
      exampleProducts.map((product) => ({
        id: `${fairId}-${product.slug}`,
        fairId,
        name: product.name,
        price: product.price,
        category: product.category,
        active: true,
        sortOrder: product.sortOrder,
        createdAt,
        updatedAt: createdAt,
      })),
    )
  }

  const settingsId = `default-${fairId}`
  const settings = await db.settings.get(settingsId)
  if (!settings) {
    await db.settings.add({
      id: settingsId,
      fairId,
      storeName: 'Caixa da Feira',
      currency: 'BRL',
    })
  }
}

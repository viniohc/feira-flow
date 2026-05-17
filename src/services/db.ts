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

export const seedDatabase = async (fairId: string) => {
  const productCount = await db.products.where('fairId').equals(fairId).count()
  const createdAt = nowIso()

  if (productCount === 0) {
    await db.products.bulkAdd([
      {
        id: crypto.randomUUID(),
        fairId,
        name: 'Pastel',
        price: 8,
        category: 'Comidas',
        active: true,
        sortOrder: 1,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: crypto.randomUUID(),
        fairId,
        name: 'Bolo',
        price: 6,
        category: 'Sobremesas',
        active: true,
        sortOrder: 2,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: crypto.randomUUID(),
        fairId,
        name: 'Refrigerante',
        price: 5,
        category: 'Bebidas',
        active: true,
        sortOrder: 3,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: crypto.randomUUID(),
        fairId,
        name: 'Suco',
        price: 4,
        category: 'Bebidas',
        active: true,
        sortOrder: 4,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: crypto.randomUUID(),
        fairId,
        name: 'Cachorro-quente',
        price: 10,
        category: 'Comidas',
        active: true,
        sortOrder: 5,
        createdAt,
        updatedAt: createdAt,
      },
    ])
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

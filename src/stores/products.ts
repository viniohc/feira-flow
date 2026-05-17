import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '@/services/db'
import { saveCloudProduct, updateCloudProduct } from '@/services/firestore/products'
import { useFairsStore } from '@/stores/fairs'
import type { Product, ProductCategory } from '@/types/models'

export const productCategories: ProductCategory[] = ['Comidas', 'Bebidas', 'Sobremesas', 'Outros']

const sortProducts = (products: Product[]) =>
  [...products].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))

export const useProductsStore = defineStore('products', () => {
  const products = ref<Product[]>([])
  const loading = ref(false)

  const activeProducts = computed(() => sortProducts(products.value.filter((product) => product.active && !product.deleted)))

  const loadProducts = async () => {
    const fairsStore = useFairsStore()
    if (!fairsStore.selectedFairId) {
      products.value = []
      return
    }

    loading.value = true
    products.value = sortProducts(
      (await db.products.where('fairId').equals(fairsStore.selectedFairId).toArray()).filter((product) => !product.deleted),
    )
    loading.value = false
  }

  const saveProduct = async (input: Omit<Product, 'id' | 'fairId' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    const fairsStore = useFairsStore()
    if (!fairsStore.selectedFairId) {
      throw new Error('Selecione uma feira.')
    }

    if (input.price < 0) {
      throw new Error('Preço não pode ser negativo.')
    }

    const timestamp = new Date().toISOString()
    const existing = input.id ? await db.products.get(input.id) : undefined
    const product: Product = {
      id: input.id ?? crypto.randomUUID(),
      fairId: fairsStore.selectedFairId,
      name: input.name.trim(),
      price: input.price,
      category: input.category,
      active: input.active,
      sortOrder: input.sortOrder,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }

    await db.products.put(product)
    try {
      await saveCloudProduct(product)
    } catch {
      // Offline-first: o dado local fica salvo e pode ser sincronizado depois.
    }
    await loadProducts()
  }

  const toggleProduct = async (product: Product) => {
    const updated = {
      active: !product.active,
      updatedAt: new Date().toISOString(),
    }
    await db.products.update(product.id, updated)
    try {
      await updateCloudProduct(product.id, { ...updated, fairId: product.fairId })
    } catch {
      // Mantem local e sincroniza depois.
    }
    await loadProducts()
  }

  const deleteProduct = async (product: Product) => {
    const updated = {
      active: false,
      deleted: true,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await db.products.update(product.id, updated)
    try {
      await updateCloudProduct(product.id, { ...updated, fairId: product.fairId })
    } catch {
      // Mantem local e sincroniza depois.
    }
    await loadProducts()
  }

  return {
    products,
    activeProducts,
    loading,
    loadProducts,
    saveProduct,
    toggleProduct,
    deleteProduct,
  }
})

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { db, migrateLegacyDataToFair, seedDatabase } from '@/services/db'
import { listCloudFairs, saveCloudFair, updateCloudFair } from '@/services/firestore/fairs'
import { listCloudProducts, saveCloudProduct } from '@/services/firestore/products'
import { listCloudSales, saveCloudSale } from '@/services/firestore/sales'
import { getCloudSettings, saveCloudSettings } from '@/services/firestore/settings'
import { useAuthStore } from '@/stores/auth'
import type { Fair } from '@/types/models'

const SELECTED_FAIR_KEY = 'caixa-feira:selectedFairId'

export const useFairsStore = defineStore('fairs', () => {
  const fairs = ref<Fair[]>([])
  const selectedFairId = ref(localStorage.getItem(SELECTED_FAIR_KEY) ?? '')
  const loading = ref(false)
  const syncMessage = ref('')

  const selectedFair = computed(() => fairs.value.find((fair) => fair.id === selectedFairId.value))
  const hasSelectedFair = computed(() => Boolean(selectedFairId.value))

  const loadFairs = async () => {
    const authStore = useAuthStore()
    if (!authStore.user) return

    loading.value = true
    try {
      const cloudFairs = await listCloudFairs(authStore.user.uid)
      fairs.value = cloudFairs
      await db.fairs.bulkPut(cloudFairs)
    } catch {
      fairs.value = await db.fairs.where('ownerId').equals(authStore.user.uid).toArray()
    } finally {
      loading.value = false
    }
  }

  const selectFair = async (fairId: string) => {
    selectedFairId.value = fairId
    localStorage.setItem(SELECTED_FAIR_KEY, fairId)
    await migrateLegacyDataToFair(fairId)
  }

  const createFair = async (name: string) => {
    const authStore = useAuthStore()
    if (!authStore.user) {
      throw new Error('Faça login para criar uma feira.')
    }

    const timestamp = new Date().toISOString()
    const fair: Fair = {
      id: crypto.randomUUID(),
      name: name.trim(),
      ownerId: authStore.user.uid,
      members: {
        [authStore.user.uid]: true,
      },
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    await db.fairs.put(fair)
    fairs.value = [fair, ...fairs.value.filter((item) => item.id !== fair.id)]
    await saveCloudFair(fair)
    await selectFair(fair.id)
    await seedDatabase(fair.id)
    return fair
  }

  const syncSelectedFairFromCloud = async () => {
    if (!selectedFairId.value) {
      throw new Error('Selecione uma feira para sincronizar.')
    }

    syncMessage.value = 'Baixando dados...'
    const [cloudProducts, cloudSales, cloudSettings] = await Promise.all([
      listCloudProducts(selectedFairId.value),
      listCloudSales(selectedFairId.value),
      getCloudSettings(selectedFairId.value),
    ])

    await Promise.all([
      cloudProducts.length ? db.products.bulkPut(cloudProducts) : Promise.resolve(),
      cloudSales.length ? db.sales.bulkPut(cloudSales) : Promise.resolve(),
      cloudSettings ? db.settings.put(cloudSettings) : Promise.resolve(),
    ])

    syncMessage.value = 'Dados atualizados'
  }

  const syncSelectedFairToCloud = async () => {
    if (!selectedFairId.value) {
      throw new Error('Selecione uma feira para sincronizar.')
    }

    syncMessage.value = 'Enviando dados...'
    const fair = await db.fairs.get(selectedFairId.value)
    if (fair) {
      await saveCloudFair(fair)
    }

    const [products, sales, settings] = await Promise.all([
      db.products.where('fairId').equals(selectedFairId.value).toArray(),
      db.sales.where('fairId').equals(selectedFairId.value).toArray(),
      db.settings.where('fairId').equals(selectedFairId.value).toArray(),
    ])

    await Promise.all([
      ...products.map(saveCloudProduct),
      ...sales.map(saveCloudSale),
      ...settings.map(saveCloudSettings),
    ])

    await syncSelectedFairFromCloud()
    syncMessage.value = 'Sincronizado'
  }

  const addMemberToSelectedFair = async (memberUid: string) => {
    const cleanUid = memberUid.trim()
    if (!selectedFairId.value || !cleanUid) {
      throw new Error('Informe o ID do usuário.')
    }

    const fair = await db.fairs.get(selectedFairId.value)
    if (!fair) {
      throw new Error('Feira não encontrada.')
    }

    const updatedFair: Fair = {
      ...fair,
      members: {
        ...fair.members,
        [cleanUid]: true,
      },
      updatedAt: new Date().toISOString(),
    }

    await db.fairs.put(updatedFair)
    fairs.value = fairs.value.map((item) => (item.id === updatedFair.id ? updatedFair : item))
    await updateCloudFair(updatedFair.id, {
      members: updatedFair.members,
    })
  }

  const clearSelection = () => {
    selectedFairId.value = ''
    localStorage.removeItem(SELECTED_FAIR_KEY)
  }

  return {
    fairs,
    selectedFairId,
    selectedFair,
    hasSelectedFair,
    loading,
    syncMessage,
    loadFairs,
    selectFair,
    createFair,
    syncSelectedFairFromCloud,
    syncSelectedFairToCloud,
    addMemberToSelectedFair,
    clearSelection,
  }
})

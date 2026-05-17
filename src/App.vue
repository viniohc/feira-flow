<script setup lang="ts">
import { onMounted } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import { seedDatabase } from '@/services/db'
import { useAuthStore } from '@/stores/auth'
import { useFairsStore } from '@/stores/fairs'
import { useProductsStore } from '@/stores/products'
import { useSalesStore } from '@/stores/sales'
import { useSettingsStore } from '@/stores/settings'

const productsStore = useProductsStore()
const salesStore = useSalesStore()
const settingsStore = useSettingsStore()
const authStore = useAuthStore()
const fairsStore = useFairsStore()

onMounted(async () => {
  await authStore.initAuth()
  if (!authStore.user) return

  await fairsStore.loadFairs()
  if (!fairsStore.selectedFairId) return

  try {
    await fairsStore.syncSelectedFairFromCloud()
  } catch {
    // Offline-first: inicia com os dados locais quando não conseguir baixar.
  }
  await seedDatabase(fairsStore.selectedFairId)
  await Promise.all([
    productsStore.loadProducts(),
    salesStore.loadSales(),
    settingsStore.loadSettings(),
  ])
})
</script>

<template>
  <AppLayout />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { seedDatabase } from '@/services/db'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useFairsStore } from '@/stores/fairs'
import { useProductsStore } from '@/stores/products'
import { useSalesStore } from '@/stores/sales'
import { useSettingsStore } from '@/stores/settings'

const router = useRouter()
const authStore = useAuthStore()
const fairsStore = useFairsStore()
const productsStore = useProductsStore()
const salesStore = useSalesStore()
const settingsStore = useSettingsStore()
const cartStore = useCartStore()
const newFairName = ref('')
const errorMessage = ref('')

onMounted(async () => {
  await fairsStore.loadFairs()
})

const openFair = async (fairId: string) => {
  await fairsStore.selectFair(fairId)
  cartStore.clearCart()
  try {
    await fairsStore.syncSelectedFairFromCloud()
  } catch {
    // Offline-first: abre com os dados locais quando não conseguir baixar.
  }
  await seedDatabase(fairId)
  await Promise.all([
    productsStore.loadProducts(),
    salesStore.loadSales(),
    settingsStore.loadSettings(),
  ])
  router.push('/sale')
}

const createFair = async () => {
  errorMessage.value = ''
  try {
    const fair = await fairsStore.createFair(newFairName.value || 'Nova feira')
    newFairName.value = ''
    await openFair(fair.id)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Não foi possível criar a feira.'
  }
}

const logout = async () => {
  fairsStore.clearSelection()
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <section class="mx-auto min-h-dvh max-w-3xl px-4 py-5">
    <header class="mb-5 flex items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-black">Escolha a feira</h1>
        <p class="text-sm font-semibold text-slate-500">Produtos, vendas e relatórios ficam separados por feira.</p>
      </div>
      <button type="button" class="rounded-lg bg-white px-3 py-2 text-sm font-black shadow-sm" @click="logout">
        Sair
      </button>
    </header>

    <form class="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" @submit.prevent="createFair">
      <label class="block">
        <span class="text-sm font-bold text-slate-600">Nova feira/festa</span>
        <input v-model.trim="newFairName" class="mt-1 h-12 w-full rounded-lg border border-slate-300 px-3 font-semibold outline-none focus:border-slate-950" placeholder="Ex: Festa Junina 2026">
      </label>
      <button type="submit" class="mt-3 w-full rounded-lg bg-slate-950 py-3 font-black text-white">
        Criar e usar
      </button>
      <p v-if="errorMessage" class="mt-3 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{{ errorMessage }}</p>
    </form>

    <div class="space-y-3">
      <button
        v-for="fair in fairsStore.fairs"
        :key="fair.id"
        type="button"
        class="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm"
        @click="openFair(fair.id)"
      >
        <span class="block text-lg font-black text-slate-950">{{ fair.name }}</span>
        <span class="text-sm font-semibold text-slate-500">Abrir caixa desta feira</span>
      </button>
    </div>

    <p v-if="fairsStore.fairs.length === 0 && !fairsStore.loading" class="mt-8 text-center font-semibold text-slate-500">
      Crie sua primeira feira para começar.
    </p>
  </section>
</template>

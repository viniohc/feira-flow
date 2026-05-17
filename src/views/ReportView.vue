<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ReportCard from '@/components/ReportCard.vue'
import { buildReportCsv, downloadCsv } from '@/services/csv'
import { formatCurrency } from '@/services/currency'
import { getDateKey } from '@/services/date'
import { calculateDailyReport, calculateSalesReport } from '@/services/report'
import { useSalesStore } from '@/stores/sales'

const salesStore = useSalesStore()
const selectedDate = ref(getDateKey())
const reportMode = ref<'day' | 'all'>('day')
const report = computed(() =>
  reportMode.value === 'day'
    ? calculateDailyReport(salesStore.sales, selectedDate.value)
    : calculateSalesReport(salesStore.sales, 'Toda a festa'),
)

onMounted(async () => {
  if (salesStore.sales.length === 0) {
    await salesStore.loadSales()
  }
})

const exportReport = () => {
  const suffix = reportMode.value === 'day' ? selectedDate.value : 'toda-festa'
  downloadCsv(`relatorio-${suffix}.csv`, buildReportCsv(report.value))
}
</script>

<template>
  <section class="mx-auto min-h-dvh max-w-5xl px-4 py-4">
    <header class="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-black">Relatório</h1>
        <p class="text-sm font-semibold text-slate-500">Totais ignoram vendas canceladas</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <div class="grid grid-cols-2 rounded-lg border border-slate-200 bg-white p-1">
          <button type="button" class="rounded-md px-3 py-2 text-sm font-black" :class="reportMode === 'day' ? 'bg-slate-950 text-white' : 'text-slate-600'" @click="reportMode = 'day'">
            Dia
          </button>
          <button type="button" class="rounded-md px-3 py-2 text-sm font-black" :class="reportMode === 'all' ? 'bg-slate-950 text-white' : 'text-slate-600'" @click="reportMode = 'all'">
            Festa
          </button>
        </div>
        <input v-if="reportMode === 'day'" v-model="selectedDate" type="date" class="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold">
        <button type="button" class="rounded-lg bg-slate-950 px-3 py-2 text-sm font-black text-white" @click="exportReport">
          CSV
        </button>
      </div>
    </header>

    <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
      <ReportCard label="Total" :value="formatCurrency(report.total)" />
      <ReportCard label="Vendas" :value="String(report.saleCount)" />
      <ReportCard label="Ticket médio" :value="formatCurrency(report.averageTicket)" />
      <ReportCard label="Dinheiro" :value="formatCurrency(report.byPayment.cash)" />
      <ReportCard label="Pix" :value="formatCurrency(report.byPayment.pix)" />
      <ReportCard label="Cartão" :value="formatCurrency(report.byPayment.card)" />
    </div>

    <section class="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 class="mb-3 text-lg font-black">Produtos vendidos</h2>
      <div class="space-y-3">
        <article v-for="(product, index) in report.products" :key="product.productId" class="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
          <div class="flex items-center gap-3">
            <span class="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-sm font-black text-slate-700">{{ index + 1 }}</span>
            <div>
              <p class="font-black text-slate-950">{{ product.productName }}</p>
              <p class="text-sm font-semibold text-slate-500">{{ product.quantity }} unidades</p>
            </div>
          </div>
          <p class="font-black text-emerald-700">{{ formatCurrency(product.total) }}</p>
        </article>
      </div>
      <p v-if="report.products.length === 0" class="py-8 text-center font-semibold text-slate-500">
        Sem vendas confirmadas neste período.
      </p>
    </section>
  </section>
</template>

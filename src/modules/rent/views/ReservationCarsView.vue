<script setup>
import StandardTablePager from '@/modules/rent/components/StandardTablePager.vue'
import { ref, watch, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
const router = useRouter(),
  { locale } = useI18n(),
  tr = (en, ar) => (locale.value === 'ar' ? ar : en)
const rows = ref([]),
  search = ref(''),
  page = ref(1),
  perPage = ref(50),
  meta = ref({ last_page: 1, total: 0 }),
  loading = ref(false),
  error = ref('')
let timer
async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/rent/car-reservations/cars', {
      params: { search: search.value, page: page.value, per_page: perPage.value },
    })
    rows.value = data.data || []
    meta.value = { last_page: data.last_page || 1, total: data.total || 0 }
  } catch (e) {
    error.value = e.response?.data?.message || tr('Could not load vehicles', 'تعذر تحميل المركبات')
  } finally {
    loading.value = false
  }
}
watch([search, perPage], () => {
  page.value = 1
  clearTimeout(timer)
  timer = setTimeout(load, 250)
})
watch(page, load)
onMounted(load)

function uiTableGoToPage(n) {
  if (n < 1 || n > Number(meta.last_page) || n === page.value) return
  page.value = n
}
</script>
<template>
  <section class="rv-page" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <header>
      <h2>{{ tr('Reservation Cars', 'حجوزات السيارات') }}</h2>
      <button class="primary" @click="router.push('/rent/booking/create')">
        + {{ tr('New Booking', 'حجز جديد') }}
      </button>
    </header>
    <div class="tools ui-table-toolbar">
      <input
        v-model="search"
        :placeholder="
          tr('Search by vehicle number, brand or model', 'ابحث برقم السيارة أو الماركة أو الموديل')
        "
      /><select v-model.number="perPage">
        <option :value="10">10</option>
        <option :value="15">15</option>
        <option :value="25">25</option>
        <option :value="50">50</option>
      </select>
    </div>
    <div v-if="error" class="error">
      {{ error }} <button @click="load">{{ tr('Retry', 'إعادة المحاولة') }}</button>
    </div>
    <div class="table-scroll">
      <table class="ui-standardized-table">
        <thead>
          <tr>
            <th>{{ tr('Vehicle No.', 'رقم السيارة') }}</th>
            <th>{{ tr('Vehicle Category', 'ماركة السيارة') }}</th>
            <th>{{ tr('Vehicle Type', 'نوع السيارة') }}</th>
            <th>{{ tr('Vehicle Model', 'سنة الموديل') }}</th>
            <th>{{ tr('Action', 'الإجراء') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="empty">{{ tr('Loading...', 'جاري التحميل...') }}</td>
          </tr>
          <template v-else
            ><tr v-for="car in rows" :key="car.id">
              <td>{{ car.number }}</td>
              <td>{{ car.brand?.name }}</td>
              <td>{{ car.model?.name }}</td>
              <td>{{ car.model_year }}</td>
              <td>
                <button class="action" @click="router.push(`/rent/car-rentered/${car.id}`)">
                  ◉ {{ tr('View', 'عرض') }}
                </button>
                <button class="action" @click="router.push(`/rent/car-rentered/${car.id}`)">
                  ✎ {{ tr('Edit', 'تعديل') }}
                </button>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="5" class="empty">{{ tr('No vehicles found', 'لا توجد مركبات') }}</td>
            </tr></template
          >
        </tbody>
      </table>
    </div>
    <footer class="ui-legacy-pager">
      <span>{{ meta.total }} {{ tr('records', 'سجل') }}</span>
      <div>
        <button :disabled="page <= 1" @click="page--">‹</button> {{ page }} / {{ meta.last_page }}
        <button :disabled="page >= meta.last_page" @click="page++">›</button>
      </div>
    </footer>
    <StandardTablePager
      :page="page"
      :last-page="meta.last_page"
      :disabled="loading"
      @change="uiTableGoToPage"
    />
  </section>
</template>
<style scoped>
.rv-page {
  padding: 17px 20px;
  color: #102846;
}
.rv-page header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.rv-page h2 {
  font-size: 25px;
}
.primary {
  border: 0;
  border-radius: 22px;
  background: #6da2c3;
  color: white;
  padding: 10px 23px;
  cursor: pointer;
}
.tools {
  display: flex;
  justify-content: space-between;
  margin: 22px 0;
  gap: 15px;
}
.tools input,
.tools select {
  height: 32px;
  border: 1px solid #d9e1eb;
  border-radius: 8px;
  padding: 0 12px;
  color: #102846;
  background: #fff;
}
.tools input {
  min-width: min(280px, 65vw);
}
.table-scroll {
  border: 1px solid #dce3ea;
  border-radius: 11px;
  overflow: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th,
td {
  padding: 15px 12px;
  border-bottom: 1px solid #e4e8ed;
  text-align: start;
}
th {
  color: #8796ab;
  font-weight: 500;
}
.action {
  background: none;
  border: 0;
  color: #122e4e;
  cursor: pointer;
  margin-inline: 5px;
}
.action:hover {
  text-decoration: underline;
}
footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 15px;
  color: #677b94;
}
footer button {
  background: white;
  border: 1px solid #dce3ea;
  border-radius: 7px;
  padding: 5px 13px;
  cursor: pointer;
}
footer button:disabled {
  opacity: 0.4;
}
.error {
  padding: 14px;
  color: #bd2439;
}
.empty {
  text-align: center;
  padding: 35px;
  color: #7a8798;
}

/* Shared table presentation: physical left/search, middle/page size, right/action in both languages. */
.ui-table-toolbar {
  direction: ltr !important;
  display: grid !important;
  grid-template-columns: minmax(160px, 1fr) auto minmax(160px, 1fr) !important;
  align-items: center !important;
  column-gap: 16px !important;
  row-gap: 10px !important;
  justify-content: stretch !important;
  width: 100% !important;
  margin-bottom: 16px !important;
}
.ui-table-toolbar > input:first-child,
.ui-table-toolbar > .search:first-child,
.ui-table-toolbar > .search-box:first-child {
  grid-column: 1;
  grid-row: 1;
  justify-self: start !important;
  min-width: 0;
  max-width: 360px;
  width: 100%;
}
.ui-table-toolbar > select,
.ui-table-toolbar > .per-page,
.ui-table-toolbar > .toolbar-right {
  grid-column: 2;
  grid-row: 1;
  justify-self: center !important;
  margin-inline: auto !important;
}
.ui-table-toolbar > .toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ui-table-toolbar > .toolbar-right .per-page {
  margin: auto;
}
.ui-table-toolbar > .toolbar-right .count {
  font-size: 12px;
  color: #68788b;
}
.ui-table-toolbar > .filters {
  display: contents;
}
.ui-table-toolbar > .filters > input:first-child {
  grid-column: 1;
  grid-row: 1;
  justify-self: start !important;
  max-width: 360px;
  width: 100%;
}
.ui-table-toolbar > .filters > select {
  grid-column: 2;
  grid-row: 1;
  justify-self: center !important;
}
.ui-table-toolbar > .toolbar-right > button,
.ui-table-toolbar > button.primary,
.ui-table-toolbar > .primary,
.ui-table-toolbar > .btn-new {
  grid-column: 3;
  grid-row: 1;
  justify-self: end !important;
}
.ui-table-toolbar > select:not(:first-child) {
  width: auto;
  min-width: 105px;
}
.ui-table-toolbar > input[type='search'],
.ui-table-toolbar > input:not([type]),
.ui-table-toolbar .search-box input {
  height: 34px !important;
  min-height: 34px !important;
  box-sizing: border-box;
}
.ui-table-toolbar > select {
  height: 34px !important;
  min-height: 34px !important;
  box-sizing: border-box;
}
.ui-table-toolbar
  > :not(input):not(select):not(.per-page):not(.toolbar-right):not(.search-box):not(.filters):not(
    button
  ) {
  justify-self: center;
}
.ui-table-toolbar > input:only-child {
  grid-column: 1;
}
.ui-table-toolbar > input:nth-child(1) {
  grid-column: 1;
}
.ui-table-toolbar > select:nth-child(2) {
  grid-column: 2;
}
.ui-table-toolbar > select:nth-child(3) {
  grid-column: 2;
}
.ui-table-toolbar > button:last-child {
  grid-column: 3;
  justify-self: end;
}
.ui-legacy-pager {
  display: none !important;
}
/* Keep the physical toolbar arrangement LTR, but type Arabic search terms naturally. */
:global(html[dir='rtl']) .ui-table-toolbar input {
  direction: rtl;
}
/* Center table values independent of dir=auto/ltr on individual cells. */
.ui-standardized-table th,
.ui-standardized-table td {
  text-align: center !important;
  vertical-align: middle !important;
}
.ui-standardized-table td[dir],
.ui-standardized-table th[dir] {
  text-align: center !important;
}
.ui-standardized-table td .actions,
.ui-standardized-table td .action-group,
.ui-standardized-table td .row-actions {
  justify-content: center !important;
}
.ui-standardized-table td input,
.ui-standardized-table td textarea {
  text-align: inherit;
}
@media (max-width: 680px) {
  .ui-table-toolbar {
    grid-template-columns: minmax(0, 1fr) auto !important;
    gap: 8px !important;
  }
  .ui-table-toolbar > input:first-child,
  .ui-table-toolbar > .search-box:first-child {
    grid-column: 1;
  }
  .ui-table-toolbar > select,
  .ui-table-toolbar > .per-page,
  .ui-table-toolbar > .toolbar-right {
    grid-column: 2;
  }
  .ui-table-toolbar > button.primary,
  .ui-table-toolbar > .primary {
    grid-column: 1/-1;
    grid-row: auto;
    justify-self: end;
  }
}
</style>

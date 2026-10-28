<script setup>
import StandardTablePager from '@/modules/rent/components/StandardTablePager.vue'
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
const router = useRouter()
const { locale } = useI18n()
const t = (en, ar) => (locale.value === 'ar' ? ar : en)
const rows = ref([]),
  loading = ref(true),
  error = ref(''),
  search = ref(''),
  page = ref(1),
  perPage = ref(50),
  total = ref(0),
  lastPage = ref(1)
let timer
async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/rent/rental-contracts', {
      params: { search: search.value, page: page.value, per_page: perPage.value },
    })
    rows.value = data.data || []
    total.value = data.total || 0
    lastPage.value = data.last_page || 1
  } catch (e) {
    error.value = e.response?.data?.message || t('Could not load contracts', 'تعذر تحميل العقود')
  } finally {
    loading.value = false
  }
}
watch(search, () => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
})
watch(perPage, () => {
  page.value = 1
  load()
})
onMounted(load)
function customerName(b) {
  return b?.customer?.name || b?.customer_company?.name || '—'
}
function vehicleName(b) {
  return (
    [b?.car?.brand?.name, b?.car?.model?.name, b?.car?.model_year].filter(Boolean).join(' ') || '—'
  )
}
function navigate(id, action) {
  router.push(`/rent/contracts/rental/${id}/${action}`)
}
const invoiceLoading = ref(null)
const detailsLoading = ref(null)
async function openInvoice(id) {
  if (invoiceLoading.value !== null) return
  invoiceLoading.value = id
  const tab = window.open('', '_blank')
  if (tab)
    tab.document.write(
      '<p style="font-family:sans-serif;padding:20px">Generating invoice PDF...</p>',
    )
  try {
    const response = await api.get(`/rent/rental-contracts/${id}/invoice/pdf`, {
      responseType: 'blob',
      headers: { Accept: 'application/pdf' },
    })
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
    if (tab) tab.location.replace(url)
    else window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 120000)
  } catch (e) {
    if (tab) tab.close()
    error.value = t('Invoice PDF could not be generated.', 'تعذر إنشاء فاتورة PDF.')
  } finally {
    invoiceLoading.value = null
  }
}
async function openDetailsPdf(id) {
  if (detailsLoading.value !== null) return
  detailsLoading.value = id
  const tab = window.open('', '_blank')
  if (tab)
    tab.document.write(
      '<p style="font-family:sans-serif;padding:20px">Generating contract PDF...</p>',
    )
  try {
    const response = await api.get(`/rent/rental-contracts/${id}/details/pdf`, {
      responseType: 'blob',
      headers: { Accept: 'application/pdf' },
    })
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
    if (tab) tab.location.replace(url)
    else window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 120000)
  } catch (e) {
    if (tab) tab.close()
    error.value = t('Contract PDF could not be generated.', 'تعذر إنشاء PDF العقد.')
  } finally {
    detailsLoading.value = null
  }
}
function goPreviousPage() {
  if (page.value <= 1 || loading.value) return
  page.value -= 1
  load()
}
function goNextPage() {
  if (page.value >= lastPage.value || loading.value) return
  page.value += 1
  load()
}

function uiTableGoToPage(n) {
  if (n < 1 || n > Number(lastPage) || n === page.value) return
  page.value = n
  load()
}
</script>
<template>
  <section class="contracts-page" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <h2>{{ t('Rental Car Contracts', 'عقود تأجير السيارات') }}</h2>
    <div class="toolbar ui-table-toolbar">
      <input v-model="search" :placeholder="t('Search contracts...', 'بحث في العقود...')" /><select
        v-model.number="perPage"
      >
        <option :value="15">15 {{ t('per page', 'لكل صفحة') }}</option>
        <option :value="30">30 {{ t('per page', 'لكل صفحة') }}</option>
        <option :value="50">50 {{ t('per page', 'لكل صفحة') }}</option>
      </select>
    </div>
    <div class="table-wrap">
      <table class="ui-standardized-table">
        <thead>
          <tr>
            <th>{{ t('Contract ID', 'رقم العقد') }}</th>
            <th>{{ t('Status', 'الحالة') }}</th>
            <th>{{ t('Customer / Company', 'العميل / الشركة') }}</th>
            <th>{{ t('Vehicle', 'السيارة') }}</th>
            <th>{{ t('Actions', 'الإجراءات') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="empty">{{ t('Loading...', 'جاري التحميل...') }}</td>
          </tr>
          <tr v-else-if="error">
            <td colspan="5" class="empty bad">
              {{ error }} <button @click="load">{{ t('Retry', 'إعادة المحاولة') }}</button>
            </td>
          </tr>
          <tr v-else-if="!rows.length">
            <td colspan="5" class="empty">{{ t('No contracts found.', 'لا توجد عقود.') }}</td>
          </tr>
          <tr v-for="c in !loading && !error ? rows : []" :key="c.id">
            <td>{{ c.id }}</td>
            <td>
              <span class="status" :class="c.status">{{
                c.status === 'closed' ? t('Closed', 'مغلق') : t('Open', 'مفتوح')
              }}</span>
            </td>
            <td>{{ customerName(c.booking) }}</td>
            <td>{{ vehicleName(c.booking) }}</td>
            <td>
              <div class="actions">
                <button @click="openDetailsPdf(c.id)" :disabled="detailsLoading !== null">
                  <svg
                    class="action-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 11v5M12 8h.01" />
                  </svg>
                  {{ t('Details', 'التفاصيل') }}
                </button>
                <button @click="openInvoice(c.id)" :disabled="invoiceLoading !== null">
                  <svg
                    class="action-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <rect x="5" y="3" width="14" height="18" rx="2" />
                    <path d="M8 8h8M8 12h8M8 16h5" />
                  </svg>
                  {{ t('Invoice', 'الفاتورة') }}
                </button>
                <button v-if="c.status === 'open'" @click="navigate(c.id, 'edit')">
                  <svg
                    class="action-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="m15 5 4 4M4 20l4-.8L19 8a2.8 2.8 0 0 0-4-4L4 15l-.8 5Z" />
                  </svg>
                  {{ t('Edit', 'تعديل') }}
                </button>
                <button @click="navigate(c.id, 'view')">
                  <svg
                    class="action-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  {{ t('View', 'عرض') }}
                </button>
                <button @click="navigate(c.id, 'video')">
                  <svg
                    class="action-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <rect x="2" y="5" width="14" height="14" rx="2" />
                    <path d="m16 10 6-4v12l-6-4" />
                  </svg>
                  {{ t('Take Video', 'تصوير فيديو') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="ui-legacy-pager footer">
      <span>{{ total }} {{ t('records', 'سجل') }}</span>
      <div>
        <button :disabled="page <= 1" @click="goPreviousPage">{{ t('Previous', 'السابق') }}</button>
        {{ page }} / {{ lastPage }}
        <button :disabled="page >= lastPage" @click="goNextPage">{{ t('Next', 'التالي') }}</button>
      </div>
    </div>
    <StandardTablePager
      :page="page"
      :last-page="lastPage"
      :disabled="loading"
      @change="uiTableGoToPage"
    />
  </section>
</template>
<style scoped>
.contracts-page {
  padding: 18px 22px;
  color: #102846;
}
.contracts-page h2 {
  font-size: 24px;
  margin: 0 0 30px;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}
.toolbar input,
.toolbar select {
  height: 34px;
  border: 1px solid #d7e0e9;
  border-radius: 8px;
  padding: 0 13px;
  background: #fff;
  color: #15304e;
}
.toolbar input {
  width: 250px;
}
.table-wrap {
  border: 1px solid #d6e0e8;
  border-radius: 14px;
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th,
td {
  padding: 15px 16px;
  text-align: start;
  border-bottom: 1px solid #e0e6ec;
}
th {
  color: #8696ae;
  font-weight: 500;
}
tr:last-child td {
  border-bottom: 0;
}
.actions {
  display: flex;
  gap: 13px;
  white-space: nowrap;
  align-items: center;
  flex-wrap: wrap;
}
.action-icon {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  vertical-align: middle;
  margin-inline-end: 3px;
}
.actions button {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border: 0;
  background: transparent;
  color: #163351;
  cursor: pointer;
  font-size: 12px;
  padding: 3px 0;
  font-weight: 500;
}
.actions button:hover {
  text-decoration: underline;
}
.status {
  padding: 5px 9px;
  border-radius: 14px;
  background: #e8f5ed;
  color: #28724a;
}
.status.closed {
  background: #eff2f6;
  color: #66758b;
}
.empty {
  text-align: center;
  padding: 32px;
}
.bad {
  color: #b4233d;
}
.footer {
  display: flex;
  justify-content: space-between;
  margin-top: 14px;
  font-size: 13px;
  color: #6f829c;
}
.footer button {
  background: #fff;
  border: 1px solid #dae2ea;
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
}
.footer button:disabled {
  opacity: 0.4;
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

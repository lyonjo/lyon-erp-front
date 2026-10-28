<script setup>
import StandardTablePager from '@/modules/rent/components/StandardTablePager.vue'
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
const router = useRouter()
const { locale } = useI18n()
const tr = (en, ar) => (locale.value === 'ar' ? ar : en)
const rows = ref([]),
  search = ref(''),
  perPage = ref(50),
  page = ref(1),
  meta = ref({ total: 0, last_page: 1 })
const loading = ref(false),
  error = ref(''),
  deleting = ref(false),
  toDelete = ref(null)
let timer
async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get('/rent/lawsuits', {
      params: { search: search.value, page: page.value, per_page: perPage.value },
    })
    rows.value = res.data.data || []
    meta.value = res.data.meta || { total: 0, last_page: 1 }
  } catch (e) {
    error.value = e.response?.data?.message || tr('Cannot load lawsuits', 'تعذر تحميل القضايا')
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
function go(p) {
  if (p < 1 || p > meta.value.last_page) return
  page.value = p
  load()
}
async function remove() {
  if (!toDelete.value) return
  deleting.value = true
  error.value = ''
  try {
    await api.delete(`/rent/lawsuits/${toDelete.value.id}`)
    toDelete.value = null
    await load()
  } catch (e) {
    error.value = e.response?.data?.message || tr('Deletion failed', 'فشل الحذف')
  } finally {
    deleting.value = false
  }
}
onMounted(load)

function uiTableGoToPage(n) {
  if (n < 1 || n > Number(meta.value.last_page) || n === page.value) return
  go(n)
}
</script>
<template>
  <section class="law-page">
    <div class="law-head">
      <h2>{{ tr('Lawsuits', 'القضايا') }}</h2>
    </div>
    <div class="law-toolbar ui-table-toolbar">
      <input v-model="search" :placeholder="tr('Search...', 'بحث...')" /><select
        v-model.number="perPage"
      >
        <option :value="15">15</option>
        <option :value="30">30</option>
        <option :value="50">50</option>
      </select>
      <button class="primary" @click="router.push('/rent/lawsuits/create')">
        + {{ tr('New Lawsuit', 'قضية جديدة') }}
      </button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="law-card">
      <div class="scroll">
        <table class="ui-standardized-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{{ tr('Suit Type', 'نوع القضية') }}</th>
              <th>{{ tr('Vehicle No.', 'رقم المركبة') }}</th>
              <th>{{ tr('Company Name', 'اسم الشركة') }}</th>
              <th>{{ tr('Party', 'الطرف') }}</th>
              <th>{{ tr('Date', 'التاريخ') }}</th>
              <th>{{ tr('Status', 'الحالة') }}</th>
              <th>{{ tr('Actions', 'الإجراءات') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="8" class="center">{{ tr('Loading...', 'جاري التحميل...') }}</td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="8" class="center">{{ tr('No lawsuits', 'لا توجد قضايا') }}</td>
            </tr>
            <tr v-for="r in rows" :key="r.id">
              <td>{{ r.id }}</td>
              <td>
                {{
                  r.type === 'customer'
                    ? tr('Customer', 'العميل')
                    : tr('Ongoing against us', 'مرفوعة ضدنا')
                }}
              </td>
              <td>{{ r.vehicle_number || '—' }}</td>
              <td>{{ r.company_name || '—' }}</td>
              <td>{{ r.party || r.customer_display_name || '—' }}</td>
              <td>{{ r.date?.slice(0, 10) || '—' }}</td>
              <td>
                <span class="status" :class="r.status">{{
                  r.status === 'closed' ? tr('Closed', 'مغلقة') : tr('Open', 'مفتوحة')
                }}</span>
              </td>
              <td class="actions">
                <button @click="router.push(`/rent/lawsuits/${r.id}/view`)">
                  ◉ {{ tr('View', 'عرض') }}</button
                ><button
                  v-if="r.status !== 'closed'"
                  @click="router.push(`/rent/lawsuits/${r.id}/edit`)"
                >
                  ✎ {{ tr('Edit', 'تعديل') }}</button
                ><button v-if="r.status !== 'closed'" class="danger" @click="toDelete = r">
                  ▤ {{ tr('Delete', 'حذف') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="ui-legacy-pager footer">
        <span>{{ meta.total }} {{ tr('records', 'سجل') }}</span>
        <div>
          <button :disabled="page <= 1" @click="go(page - 1)">{{ tr('Previous', 'السابق') }}</button
          ><span>{{ page }} / {{ meta.last_page }}</span
          ><button :disabled="page >= meta.last_page" @click="go(page + 1)">
            {{ tr('Next', 'التالي') }}
          </button>
        </div>
      </div>
      <StandardTablePager
        :page="page"
        :last-page="meta.last_page"
        :disabled="loading"
        @change="uiTableGoToPage"
      />
    </div>
    <div v-if="toDelete" class="overlay" @click.self="toDelete = null">
      <div class="modal">
        <h3>{{ tr('Delete lawsuit?', 'حذف القضية؟') }}</h3>
        <p>
          {{
            tr(
              'This will delete the case and all its court sessions.',
              'سيتم حذف القضية وجميع جلساتها.',
            )
          }}
        </p>
        <div class="modal-actions">
          <button @click="toDelete = null">{{ tr('Cancel', 'إلغاء') }}</button
          ><button class="danger-btn" :disabled="deleting" @click="remove">
            {{ tr('Delete', 'حذف') }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
<style scoped>
.law-page {
  padding: 16px;
  color: #102445;
}
.law-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 34px;
}
.law-head h2 {
  font-size: 24px;
  margin: 0;
}
.primary {
  background: #5f9dc5;
  color: white;
  border: 0;
  border-radius: 24px;
  padding: 10px 20px;
  cursor: pointer;
}
.law-toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 30px;
}
.law-toolbar input,
.law-toolbar select {
  height: 35px;
  border: 1px solid #d4dfeb;
  border-radius: 8px;
  padding: 5px 12px;
  background: white;
  color: inherit;
  box-sizing: border-box;
}
.law-toolbar input {
  min-width: 240px;
}
.law-card {
  background: white;
  border: 1px solid #d8e0ea;
  border-radius: 15px;
  overflow: hidden;
}
.scroll {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  text-align: start;
  padding: 13px 14px;
  border-bottom: 1px solid #dde4ec;
  white-space: nowrap;
}
th {
  font-size: 12px;
  color: #9ba9ba;
  font-weight: 500;
}
td {
  font-size: 13px;
}
.center {
  text-align: center;
  padding: 25px;
}
.actions button {
  border: 0;
  background: none;
  cursor: pointer;
  color: #102445;
  font-size: 12px;
  margin-inline-end: 12px;
}
.actions .danger {
  color: #db2333;
}
.status {
  padding: 5px 10px;
  border-radius: 18px;
  background: #eaf6ed;
  color: #277547;
}
.status.closed {
  background: #f2f3f6;
  color: #697688;
}
.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px;
  color: #7085a0;
  font-size: 12px;
}
.footer div {
  display: flex;
  align-items: center;
  gap: 10px;
}
.footer button {
  border: 1px solid #dce4ec;
  border-radius: 7px;
  padding: 6px 10px;
  background: white;
  cursor: pointer;
}
.footer button:disabled {
  opacity: 0.45;
}
.error {
  color: #d92835;
}
.overlay {
  position: fixed;
  inset: 0;
  background: #0008;
  display: grid;
  place-items: center;
  z-index: 4000;
}
.modal {
  background: white;
  padding: 24px;
  border-radius: 15px;
  width: min(430px, 92vw);
}
.modal-actions {
  display: flex;
  justify-content: end;
  gap: 12px;
}
.modal-actions button {
  border: 1px solid #d5dfeb;
  border-radius: 20px;
  background: white;
  padding: 8px 18px;
  cursor: pointer;
}
.modal-actions .danger-btn {
  background: #dc2626;
  color: white;
  border-color: #dc2626;
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

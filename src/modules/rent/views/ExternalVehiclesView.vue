<script setup>
import StandardTablePager from '@/modules/rent/components/StandardTablePager.vue'
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const router = useRouter()
const { locale } = useI18n()
const tr = (en, ar) => (locale.value === 'ar' ? ar : en)
const search = ref('')
const page = ref(1)
const perPage = ref(50)
const rows = ref([])
const meta = ref({ current_page: 1, last_page: 1, total: 0 })
const loading = ref(false)
const error = ref('')
const pendingDelete = ref(null)
const deleting = ref(false)
const deleteError = ref('')
let debounce = null
let revision = 0

async function load() {
  const current = ++revision
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/rent/external-vehicles', {
      params: { search: search.value, page: page.value, per_page: perPage.value },
    })
    if (current !== revision) return
    rows.value = data.data || []
    meta.value = data.meta || { current_page: 1, last_page: 1, total: 0 }
  } catch (e) {
    if (current === revision)
      error.value =
        e.response?.data?.message ||
        tr('Failed to load external vehicles.', 'تعذر تحميل المركبات الخارجية.')
  } finally {
    if (current === revision) loading.value = false
  }
}
watch(search, () => {
  clearTimeout(debounce)
  debounce = setTimeout(() => {
    page.value = 1
    load()
  }, 350)
})
watch(perPage, () => {
  page.value = 1
  load()
})
watch(page, load)
onMounted(load)
onBeforeUnmount(() => {
  clearTimeout(debounce)
  revision++
})

const pagesText = computed(
  () => `${meta.value.current_page} / ${meta.value.last_page} · ${meta.value.total}`,
)
function show(row) {
  router.push(`/rent/external-vehicle/${row.id}`)
}
function edit(row) {
  router.push(`/rent/external-vehicle/${row.id}/edit`)
}
function askDelete(row) {
  pendingDelete.value = row
  deleteError.value = ''
}
function closeDelete() {
  if (!deleting.value) pendingDelete.value = null
}
async function confirmDelete() {
  if (!pendingDelete.value || deleting.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await api.delete(`/rent/external-vehicles/${pendingDelete.value.id}`)
    pendingDelete.value = null
    if (rows.value.length === 1 && page.value > 1) page.value--
    else await load()
  } catch (e) {
    deleteError.value = e.response?.data?.message || tr('Delete failed.', 'تعذر الحذف.')
  } finally {
    deleting.value = false
  }
}

function uiTableGoToPage(n) {
  if (n < 1 || n > Number(meta.last_page) || n === page.value) return
  page.value = n
}
</script>

<template>
  <main class="external-page" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <h1>{{ tr('External Vehicles', 'المركبات الخارجية') }}</h1>
    <section class="card">
      <div class="toolbar ui-table-toolbar">
        <input
          v-model="search"
          class="search"
          :placeholder="
            tr(
              'Search number, supplier, brand or model',
              'بحث بالرقم أو المورد أو الماركة أو الموديل',
            )
          "
          :aria-label="tr('Search', 'بحث')"
        />
        <div class="toolbar-right">
          <select
            v-model.number="perPage"
            class="page-size"
            :aria-label="tr('Rows per page', 'عدد السجلات')"
          >
            <option v-for="n in [10, 15, 25, 50, 100]" :key="n" :value="n">
              {{ n }} {{ tr('per page', 'لكل صفحة') }}
            </option>
          </select>
          <button class="primary" @click="router.push('/rent/external-vehicle/create')">
            + {{ tr('New External Vehicle', 'مركبة خارجية جديدة') }}
          </button>
        </div>
      </div>
      <p v-if="error" class="alert">
        {{ error }} <button @click="load">{{ tr('Retry', 'إعادة المحاولة') }}</button>
      </p>
      <p v-if="loading" class="loading" role="status">
        {{ tr('Loading vehicles...', 'جارٍ تحميل المركبات...') }}
      </p>
      <div class="table-wrap">
        <table class="ui-standardized-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{{ tr('Supplier Name', 'اسم المورد') }}</th>
              <th>{{ tr('Vehicle No.', 'رقم المركبة') }}</th>
              <th>{{ tr('Brand', 'الماركة') }}</th>
              <th>{{ tr('Model', 'الموديل') }}</th>
              <th>{{ tr('Model Year', 'سنة الصنع') }}</th>
              <th>{{ tr('Actions', 'الإجراءات') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <td>{{ row.id }}</td>
              <td dir="auto">{{ row.supplier?.supplier_name || '—' }}</td>
              <td dir="ltr">{{ row.number }}</td>
              <td>{{ row.brand?.name || '—' }}</td>
              <td>{{ row.model?.name || '—' }}</td>
              <td>{{ row.model_year }}</td>
              <td class="actions">
                <button @click="show(row)" :aria-label="tr('View', 'عرض')">
                  <span aria-hidden="true">◉</span> {{ tr('View', 'عرض') }}
                </button>
                <button @click="edit(row)" :aria-label="tr('Edit', 'تعديل')">
                  <span aria-hidden="true">✎</span> {{ tr('Edit', 'تعديل') }}
                </button>
                <button
                  class="danger-text"
                  @click="askDelete(row)"
                  :aria-label="tr('Delete', 'حذف')"
                >
                  <span aria-hidden="true">♧</span> {{ tr('Delete', 'حذف') }}
                </button>
              </td>
            </tr>
            <tr v-if="!loading && !rows.length">
              <td colspan="7" class="empty">
                {{ tr('No external vehicles found.', 'لا توجد مركبات خارجية.') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <nav class="ui-legacy-pager pagination" :aria-label="tr('Pagination', 'الصفحات')">
        <button :disabled="loading || page <= 1" @click="page--">
          {{ tr('Previous', 'السابق') }}
        </button>
        <span dir="ltr">{{ pagesText }}</span>
        <button :disabled="loading || page >= meta.last_page" @click="page++">
          {{ tr('Next', 'التالي') }}
        </button>
      </nav>
      <StandardTablePager
        :page="page"
        :last-page="meta.last_page"
        :disabled="loading"
        @change="uiTableGoToPage"
      />
    </section>

    <div v-if="pendingDelete" class="overlay" @click.self="closeDelete" @keydown.esc="closeDelete">
      <section
        class="modal"
        role="dialog"
        aria-modal="true"
        :aria-label="tr('Confirm deletion', 'تأكيد الحذف')"
      >
        <div class="delete-icon">✕</div>
        <h2>{{ tr('Delete External Vehicle?', 'حذف المركبة الخارجية؟') }}</h2>
        <p>
          {{ tr('Are you sure you want to delete vehicle', 'هل أنت متأكد من حذف المركبة') }}
          <strong dir="ltr">{{ pendingDelete.number }}</strong
          >?
        </p>
        <p class="muted">{{ tr('This cannot be undone.', 'لا يمكن التراجع عن هذه العملية.') }}</p>
        <p v-if="deleteError" class="alert">{{ deleteError }}</p>
        <div class="modal-actions">
          <button class="outline" :disabled="deleting" @click="closeDelete">
            {{ tr('Cancel', 'إلغاء') }}</button
          ><button class="danger" :disabled="deleting" @click="confirmDelete">
            {{ deleting ? tr('Deleting...', 'جارٍ الحذف...') : tr('Delete', 'حذف') }}
          </button>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.external-page {
  padding: 16px 22px 50px;
  color: #152238;
  font-family: 'Segoe UI', Arial, sans-serif;
}
.external-page h1 {
  font-size: 29px;
  margin: 0 0 48px;
}
.card {
  background: #fff;
  border: 1px solid #d9e2ec;
  border-radius: 17px;
  padding: 30px 32px;
  box-shadow: 0 2px 6px #1222330e;
}
.toolbar,
.toolbar-right {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.toolbar {
  margin-bottom: 23px;
}
.search,
.page-size {
  height: 34px;
  box-sizing: border-box;
  border: 1px solid #ced7e4;
  border-radius: 9px;
  padding: 0 11px;
  background: white;
  color: #273750;
  font-size: 13px;
}
.search {
  width: min(315px, 100%);
}
.page-size {
  min-width: 120px;
}
.primary {
  border: 0;
  border-radius: 24px;
  background: #70a1c0;
  color: white;
  font-weight: 650;
  padding: 10px 20px;
  cursor: pointer;
}
.primary:hover {
  background: #568bb0;
}
.table-wrap {
  overflow-x: auto;
}
table {
  border-collapse: collapse;
  width: 100%;
  min-width: 790px;
  font-size: 14px;
}
th,
td {
  border-bottom: 1px solid #e1e7ee;
  padding: 17px 12px;
  text-align: start;
}
th {
  color: #9aa7b9;
  font-weight: 550;
  font-size: 12px;
}
td {
  color: #22314a;
}
.actions {
  white-space: nowrap;
}
.actions button {
  background: transparent;
  border: 0;
  padding: 5px 7px;
  font-size: 13px;
  color: #263a57;
  cursor: pointer;
}
.actions button:hover {
  color: #568db1;
}
.actions .danger-text {
  color: #c44851;
}
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 25px;
}
.pagination button,
.outline {
  border: 1px solid #dce4ec;
  border-radius: 9px;
  padding: 8px 14px;
  background: white;
  cursor: pointer;
}
.pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.empty,
.loading {
  text-align: center;
  padding: 28px;
  color: #8d9bae;
}
.alert {
  background: #fff4f4;
  border-radius: 10px;
  color: #a82733;
  padding: 12px;
}
.alert button {
  border: 0;
  background: none;
  text-decoration: underline;
  color: inherit;
  cursor: pointer;
}
.overlay {
  position: fixed;
  inset: 0;
  background: #09162b88;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}
.modal {
  background: white;
  border-radius: 18px;
  width: min(440px, 100%);
  padding: 30px;
  text-align: center;
  box-shadow: 0 15px 45px #0002;
}
.modal h2 {
  margin: 12px 0;
  font-size: 22px;
}
.modal p {
  color: #43546d;
}
.modal .muted {
  font-size: 13px;
  color: #8692a5;
}
.delete-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  margin: auto;
  border-radius: 50%;
  background: #ffeaec;
  color: #d13c4e;
  font-size: 22px;
}
.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 22px;
  justify-content: center;
}
.danger {
  background: #c9434f;
  color: white;
  border: 0;
  border-radius: 10px;
  padding: 10px 22px;
  cursor: pointer;
}
.danger:disabled {
  opacity: 0.6;
}
@media (max-width: 700px) {
  .external-page {
    padding: 12px;
  }
  .external-page h1 {
    margin-bottom: 20px;
  }
  .card {
    padding: 15px;
  }
  .toolbar {
    align-items: stretch;
  }
  .search {
    width: 100%;
  }
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

.ui-table-toolbar > .tool-right {
  grid-column: 2 / 4;
  grid-row: 1;
  display: contents !important;
}
.ui-table-toolbar > .tool-right select {
  grid-column: 2;
  grid-row: 1;
  justify-self: center;
  margin: auto !important;
}
.ui-table-toolbar > .tool-right button {
  grid-column: 3;
  grid-row: 1;
  justify-self: end !important;
}
</style>

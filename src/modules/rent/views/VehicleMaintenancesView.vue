<script setup>
import StandardTablePager from '@/modules/rent/components/StandardTablePager.vue'
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const router = useRouter()
const { locale } = useI18n()
const ar = computed(() => locale.value === 'ar')
const t = (en, arabic) => (ar.value ? arabic : en)
const records = ref([])
const meta = ref({ current_page: 1, last_page: 1, total: 0 })
const loading = ref(false)
const error = ref('')
const search = ref('')
const page = ref(1)
const perPage = ref(50)
const removing = ref(null)
const deleteTarget = ref(null)
const deleteError = ref('')
const deleteDialog = ref(null)
let requestCounter = 0
let debounce

async function load() {
  const id = ++requestCounter
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/rent/vehicle-maintenances', {
      params: { search: search.value, page: page.value, per_page: perPage.value },
    })
    if (requestCounter !== id) return
    records.value = data.data ?? []
    meta.value = data.meta ?? { current_page: 1, last_page: 1, total: 0 }
  } catch (e) {
    if (requestCounter === id)
      error.value =
        e.response?.data?.message ||
        t('Failed to load maintenance records.', 'تعذر تحميل سجلات الصيانة.')
  } finally {
    if (requestCounter === id) loading.value = false
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
onMounted(() => {
  load()
  document.addEventListener('keydown', onDeleteKeydown)
})
onBeforeUnmount(() => {
  clearTimeout(debounce)
  ++requestCounter
  document.removeEventListener('keydown', onDeleteKeydown)
})

function openDeleteModal(record) {
  deleteTarget.value = record
  deleteError.value = ''
  nextTick(() => deleteDialog.value?.focus())
}
function closeDeleteModal() {
  if (removing.value !== null) return
  deleteTarget.value = null
  deleteError.value = ''
}
function onDeleteKeydown(event) {
  if (event.key === 'Escape') closeDeleteModal()
}
async function confirmDelete() {
  const record = deleteTarget.value
  if (!record || removing.value !== null) return
  removing.value = record.id
  deleteError.value = ''
  try {
    await api.delete(`/rent/vehicle-maintenances/${record.id}`)
    deleteTarget.value = null
    if (records.value.length === 1 && page.value > 1) page.value -= 1
    else await load()
  } catch (e) {
    deleteError.value =
      e.response?.data?.message ||
      t('Delete failed. Please try again.', 'فشل الحذف. يرجى المحاولة مرة أخرى.')
  } finally {
    removing.value = null
  }
}
const serviceName = (row) => (ar.value ? row.service_ar : row.service)

function uiTableGoToPage(n) {
  if (n < 1 || n > Number(meta.last_page) || n === page.value) return
  page.value = n
}
</script>

<template>
  <div class="maintenance-page">
    <header class="heading">
      <h1>{{ t('Vehicles Maintenance', 'صيانة المركبات') }}</h1>
      <button class="primary" @click="router.push('/rent/vehicles-maintenance/create')">
        + {{ t('Add Vehicles Maintenance', 'إضافة صيانة مركبة') }}
      </button>
    </header>
    <div class="toolbar ui-table-toolbar">
      <input
        v-model="search"
        :placeholder="
          t(
            'Search vehicle, brand, model, company, service...',
            'ابحث برقم المركبة أو الماركة أو الموديل أو الشركة أو الخدمة...',
          )
        "
      />
      <select v-model.number="perPage" :aria-label="t('Rows per page', 'عدد الصفوف')">
        <option v-for="n in [10, 15, 25, 50, 100]" :key="n" :value="n">
          {{ n }} {{ t('per page', 'لكل صفحة') }}
        </option>
      </select>
    </div>
    <p v-if="error" class="error" role="alert">
      {{ error }} <button @click="load">{{ t('Retry', 'إعادة المحاولة') }}</button>
    </p>
    <div class="table-wrap">
      <table class="ui-standardized-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>{{ t('Vehicle No.', 'رقم المركبة') }}</th>
            <th>{{ t('Brand', 'الماركة') }}</th>
            <th>{{ t('Model', 'الموديل') }}</th>
            <th>{{ t('Model Year', 'سنة الصنع') }}</th>
            <th>{{ t('Company Name', 'اسم الشركة') }}</th>
            <th>{{ t('Service', 'الخدمة') }}</th>
            <th>{{ t('Date', 'التاريخ') }}</th>
            <th>{{ t('Num of Km', 'عدد الكيلومترات') }}</th>
            <th>{{ t('Actions', 'الإجراءات') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="10" class="empty">{{ t('Loading...', 'جار التحميل...') }}</td>
          </tr>
          <tr v-else-if="!records.length">
            <td colspan="10" class="empty">
              {{ t('No maintenance records found.', 'لا توجد سجلات صيانة.') }}
            </td>
          </tr>
          <template v-else
            ><tr v-for="r in records" :key="r.id">
              <td>{{ r.id }}</td>
              <td dir="ltr">{{ r.vehicle_no || '—' }}</td>
              <td>{{ r.brand || '—' }}</td>
              <td>{{ r.model || '—' }}</td>
              <td>{{ r.model_year || '—' }}</td>
              <td>{{ r.company_name || '—' }}</td>
              <td>{{ serviceName(r) || '—' }}</td>
              <td dir="ltr">{{ r.date }}</td>
              <td dir="ltr">{{ r.counter_km }}</td>
              <td>
                <div class="actions">
                  <button
                    class="action-link"
                    type="button"
                    @click="router.push(`/rent/vehicles-maintenance/${r.id}`)"
                    :aria-label="t('View', 'عرض')"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="3" /></svg
                    >{{ t('View', 'عرض') }}
                  </button>
                  <button
                    class="action-link"
                    type="button"
                    @click="router.push(`/rent/vehicles-maintenance/${r.id}/edit`)"
                    :aria-label="t('Edit', 'تعديل')"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path
                        d="M16.9 3.5a2.5 2.5 0 0 1 3.5 3.5l-1.4 1.4-3.5-3.5 1.4-1.4ZM14.4 6l3.5 3.5L8 19.4l-4.5 1 1-4.5L14.4 6Z"
                      /></svg
                    >{{ t('Edit', 'تعديل') }}
                  </button>
                  <button
                    class="action-link delete-link"
                    type="button"
                    :disabled="removing === r.id"
                    @click="openDeleteModal(r)"
                    :aria-label="t('Delete', 'حذف')"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.9"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" /></svg
                    >{{ removing === r.id ? t('Deleting...', 'جار الحذف...') : t('Delete', 'حذف') }}
                  </button>
                </div>
              </td>
            </tr></template
          >
        </tbody>
      </table>
    </div>
    <footer class="ui-legacy-pager pagination">
      <button :disabled="loading || page <= 1" @click="page--">
        {{ t('Previous', 'السابق') }}
      </button>
      <span dir="ltr"
        >{{ meta.current_page }} / {{ meta.last_page }} · {{ meta.total }}
        {{ t('records', 'سجل') }}</span
      >
      <button :disabled="loading || page >= meta.last_page" @click="page++">
        {{ t('Next', 'التالي') }}
      </button>
    </footer>
    <StandardTablePager
      :page="page"
      :last-page="meta.last_page"
      :disabled="loading"
      @change="uiTableGoToPage"
    />

    <div v-if="deleteTarget" class="modal-backdrop" @click.self="closeDeleteModal">
      <section
        class="delete-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        aria-describedby="delete-description"
        tabindex="-1"
        ref="deleteDialog"
      >
        <button
          class="dialog-close"
          type="button"
          :disabled="removing !== null"
          :aria-label="t('Close', 'إغلاق')"
          @click="closeDeleteModal"
        >
          ×
        </button>
        <div class="dialog-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" />
          </svg>
        </div>
        <h2 id="delete-title">{{ t('Delete maintenance record?', 'حذف سجل الصيانة؟') }}</h2>
        <p id="delete-description">
          {{
            t(
              'Are you sure you want to delete maintenance record',
              'هل أنت متأكد من حذف سجل الصيانة رقم',
            )
          }}
          <strong dir="ltr">#{{ deleteTarget.id }}</strong
          >{{ ar ? '؟' : '?' }}
        </p>
        <p class="warning">
          {{ t('This action cannot be undone.', 'لا يمكن التراجع عن هذا الإجراء.') }}
        </p>
        <p v-if="deleteError" class="delete-error" role="alert">{{ deleteError }}</p>
        <div class="dialog-actions">
          <button
            type="button"
            class="cancel-button"
            :disabled="removing !== null"
            @click="closeDeleteModal"
          >
            {{ t('Cancel', 'إلغاء') }}
          </button>
          <button
            type="button"
            class="confirm-button"
            :disabled="removing !== null"
            @click="confirmDelete"
          >
            {{ removing !== null ? t('Deleting...', 'جار الحذف...') : t('Delete', 'حذف') }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.maintenance-page {
  padding: 24px 28px;
  color: #15233b;
  font-family: 'Segoe UI', Arial, sans-serif;
}
.heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 0 0 28px;
}
h1 {
  font-size: 26px;
  margin: 0;
  font-weight: 700;
}
.primary {
  background: #609fc7;
  border: 0;
  color: white;
  padding: 12px 24px;
  border-radius: 24px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 3px 8px #0002;
}
.toolbar {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.toolbar input,
.toolbar select {
  border: 1px solid #cfd8e5;
  border-radius: 9px;
  background: white;
  padding: 5px 11px;
  color: #34445c;
  height: 34px;
  min-height: 34px;
  font-size: 13px;
  box-sizing: border-box;
}
.toolbar input {
  width: min(350px, 100%);
}
.table-wrap {
  border: 1px solid #e0e6ef;
  border-radius: 15px;
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap;
  font-size: 13px;
}
th {
  color: #98a5b8;
  font-weight: 600;
}
th,
td {
  padding: 17px 14px;
  border-bottom: 1px solid #e9edf3;
  text-align: start;
}
tbody tr:last-child td {
  border-bottom: 0;
}
.empty {
  text-align: center;
  color: #94a3b8;
  padding: 46px;
}
.actions {
  display: flex;
  align-items: center;
  gap: 14px;
  white-space: nowrap;
}
.actions .action-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 0;
  border: 0;
  background: none;
  color: #10243c;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  line-height: 1.3;
}
.actions .action-link svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}
.actions .action-link:hover {
  color: #397eaa;
}
.actions .delete-link svg {
  color: #e22d38;
}
.actions .delete-link:hover {
  color: #bf2030;
}
.actions .action-link:focus-visible {
  outline: 2px solid #609fc7;
  outline-offset: 3px;
  border-radius: 2px;
}
.actions .action-link:disabled {
  opacity: 0.5;
  cursor: wait;
}
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
  color: #63748c;
  font-size: 13px;
}
.pagination button {
  background: white;
  border: 1px solid #e1e7ef;
  border-radius: 9px;
  padding: 10px 14px;
  cursor: pointer;
}
.pagination button:disabled {
  opacity: 0.4;
  cursor: default;
}
.error {
  color: #b91c1c;
}
.error button {
  margin-inline-start: 8px;
}
@media (max-width: 650px) {
  .maintenance-page {
    padding: 16px;
  }
  .heading {
    align-items: flex-start;
    flex-direction: column;
  }
  .toolbar {
    justify-content: stretch;
  }
  .toolbar input {
    flex: 1;
  }
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(18, 30, 47, 0.48);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  box-sizing: border-box;
}
.delete-dialog {
  position: relative;
  width: min(440px, 100%);
  background: #fff;
  border-radius: 18px;
  padding: 30px 28px 26px;
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.18);
  text-align: center;
  outline: none;
  box-sizing: border-box;
}
.dialog-close {
  position: absolute;
  inset-block-start: 10px;
  inset-inline-end: 16px;
  font-size: 26px;
  line-height: 1;
  background: none;
  border: 0;
  color: #78879a;
  cursor: pointer;
}
.dialog-close:disabled {
  opacity: 0.45;
  cursor: wait;
}
.dialog-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #fff1f2;
  color: #d22c3b;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 18px;
}
.dialog-icon svg {
  width: 25px;
  height: 25px;
}
.delete-dialog h2 {
  font-size: 19px;
  margin: 0 0 12px;
  color: #15233b;
}
.delete-dialog p {
  font-size: 14px;
  line-height: 1.65;
  color: #52627a;
  margin: 0;
}
.delete-dialog .warning {
  font-size: 12px;
  color: #9a6570;
  margin-top: 6px;
}
.delete-dialog .delete-error {
  margin-top: 12px;
  color: #b91c1c;
}
.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 24px;
}
.dialog-actions button {
  flex: 1;
  max-width: 180px;
  min-height: 40px;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  font-size: 14px;
}
.cancel-button {
  border: 1px solid #cfd8e5;
  background: #fff;
  color: #253850;
}
.confirm-button {
  background: #d93444;
  color: white;
  border: 1px solid #d93444;
}
.dialog-actions button:disabled {
  opacity: 0.65;
  cursor: wait;
}
.dialog-actions button:focus-visible,
.dialog-close:focus-visible {
  outline: 2px solid #609fc7;
  outline-offset: 3px;
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

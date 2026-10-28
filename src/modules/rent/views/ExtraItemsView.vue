<script setup>
import StandardTablePager from '@/modules/rent/components/StandardTablePager.vue'
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const { locale } = useI18n()
const t = (en, ar) => (locale.value === 'ar' ? ar : en)
const rows = ref([])
const search = ref('')
const perPage = ref(50)
const page = ref(1)
const meta = ref({ total: 0, last_page: 1, current_page: 1 })
const loading = ref(true)
const listError = ref('')
const modal = ref(null) // { mode: 'create'|'view'|'edit'|'delete', id: number|null }
const modalLoading = ref(false)
const modalError = ref('')
const errors = ref({})
const working = ref(false)
const dialog = ref(null)
const form = ref({ name: '', price: '', is_daily: false })
let debounceId,
  sequence = 0
const showEditor = computed(() => ['create', 'edit'].includes(modal.value?.mode))
const isReadOnly = computed(() => modal.value?.mode === 'view')
const numberOfPages = computed(() => Math.max(1, Number(meta.value.last_page || 1)))

function numberFormat(value) {
  return Number(value ?? 0).toLocaleString(locale.value === 'ar' ? 'ar-JO' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

async function load() {
  const n = ++sequence
  loading.value = true
  listError.value = ''
  try {
    const { data } = await api.get('/rent/extra-items', {
      params: { search: search.value, per_page: perPage.value, page: page.value },
    })
    if (n !== sequence) return
    rows.value = data.data || []
    meta.value = data.meta || { total: 0, last_page: 1, current_page: 1 }
  } catch (e) {
    if (n === sequence)
      listError.value =
        e.response?.data?.message || t('Unable to load extra items.', 'تعذر تحميل الإضافات.')
  } finally {
    if (n === sequence) loading.value = false
  }
}
function resetPage() {
  if (page.value !== 1) page.value = 1
  else load()
}
watch(search, () => {
  clearTimeout(debounceId)
  debounceId = setTimeout(resetPage, 300)
})
watch(perPage, resetPage)
watch(page, load)
onMounted(() => {
  load()
  document.addEventListener('keydown', onEscape)
})
onBeforeUnmount(() => {
  ++sequence
  clearTimeout(debounceId)
  document.removeEventListener('keydown', onEscape)
})

function openCreate() {
  form.value = { name: '', price: '', is_daily: false }
  errors.value = {}
  modalError.value = ''
  modal.value = { mode: 'create', id: null }
  nextTick(() => dialog.value?.focus())
}
async function openRecord(row, mode) {
  modalError.value = ''
  errors.value = {}
  modal.value = { mode, id: row.id }
  form.value = { name: '', price: '', is_daily: false }
  modalLoading.value = true
  nextTick(() => dialog.value?.focus())
  try {
    const { data } = await api.get(`/rent/extra-items/${row.id}`)
    if (modal.value?.id !== row.id || modal.value?.mode !== mode) return
    form.value = {
      name: data.data.name || '',
      price: data.data.price ?? '',
      is_daily: Boolean(data.data.is_daily),
    }
  } catch (e) {
    modalError.value =
      e.response?.data?.message || t('Unable to load the record.', 'تعذر تحميل السجل.')
  } finally {
    modalLoading.value = false
  }
}
function askDelete(row) {
  modalError.value = ''
  modal.value = { mode: 'delete', id: row.id, name: row.name }
  nextTick(() => dialog.value?.focus())
}
function closeModal() {
  if (!working.value) modal.value = null
}
function onBackdrop(event) {
  if (event.target === event.currentTarget) closeModal()
}
function onEscape(event) {
  if (event.key === 'Escape') closeModal()
}
async function save() {
  if (!showEditor.value || working.value || modalLoading.value) return
  errors.value = {}
  modalError.value = ''
  working.value = true
  const payload = {
    name: form.value.name.trim(),
    price: form.value.price,
    is_daily: form.value.is_daily,
  }
  try {
    if (modal.value.mode === 'create') await api.post('/rent/extra-items', payload)
    else await api.put(`/rent/extra-items/${modal.value.id}`, payload)
    modal.value = null
    if (page.value !== 1) page.value = 1
    else await load()
  } catch (e) {
    errors.value = e.response?.data?.errors || {}
    modalError.value =
      e.response?.data?.message || t('Unable to save extra item.', 'تعذر حفظ الإضافة.')
  } finally {
    working.value = false
  }
}
async function confirmDelete() {
  if (working.value || modal.value?.mode !== 'delete') return
  working.value = true
  modalError.value = ''
  try {
    await api.delete(`/rent/extra-items/${modal.value.id}`)
    modal.value = null
    if (rows.value.length === 1 && page.value > 1) page.value -= 1
    else await load()
  } catch (e) {
    modalError.value =
      e.response?.data?.message || t('Unable to delete extra item.', 'تعذر حذف الإضافة.')
  } finally {
    working.value = false
  }
}

function uiTableGoToPage(n) {
  if (n < 1 || n > Number(numberOfPages) || n === page.value) return
  page.value = n
}
</script>

<template>
  <main class="extra-items-page">
    <header class="heading">
      <h1>{{ t('Extra Items', 'الإضافات') }}</h1>
      <button type="button" class="primary" @click="openCreate">
        + {{ t('New Extra Item', 'إضافة جديدة') }}
      </button>
    </header>

    <div class="toolbar ui-table-toolbar">
      <input
        v-model="search"
        :aria-label="t('Search extra items', 'البحث عن الإضافات')"
        :placeholder="t('Search by name...', 'بحث بالاسم...')"
      />
      <select v-model.number="perPage" :aria-label="t('Rows per page', 'عدد السجلات في الصفحة')">
        <option v-for="n in [10, 15, 25, 50, 100]" :key="n" :value="n">
          {{ n }} {{ t('per page', 'لكل صفحة') }}
        </option>
      </select>
    </div>

    <div v-if="listError" class="error-box" role="alert">
      {{ listError }}
      <button type="button" @click="load">{{ t('Retry', 'إعادة المحاولة') }}</button>
    </div>
    <div class="table-wrap">
      <table class="ui-standardized-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>{{ t('Name', 'الاسم') }}</th>
            <th>{{ t('Price', 'السعر') }}</th>
            <th>{{ t('Charge Type', 'نوع الرسوم') }}</th>
            <th>{{ t('Actions', 'الإجراءات') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="empty">
              {{ t('Loading extra items...', 'جاري تحميل الإضافات...') }}
            </td>
          </tr>
          <tr v-else-if="!rows.length">
            <td colspan="5" class="empty">{{ t('No extra items found.', 'لا توجد إضافات.') }}</td>
          </tr>
          <tr v-for="row in loading ? [] : rows" :key="row.id">
            <td>{{ row.id }}</td>
            <td dir="auto">{{ row.name }}</td>
            <td class="price">{{ numberFormat(row.price) }}</td>
            <td>
              <span class="type-chip" :class="row.is_daily ? 'daily' : ''">{{
                row.is_daily ? t('Daily', 'يومي') : t('One-time', 'مرة واحدة')
              }}</span>
            </td>
            <td>
              <div class="actions">
                <button type="button" class="action-link" @click="openRecord(row, 'view')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" /></svg
                  >{{ t('View', 'عرض') }}
                </button>
                <button type="button" class="action-link" @click="openRecord(row, 'edit')">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M16.9 3.5a2.5 2.5 0 0 1 3.5 3.5l-1.4 1.4-3.5-3.5 1.4-1.4ZM14.4 6l3.5 3.5L8 19.4l-4.5 1 1-4.5L14.4 6Z"
                    /></svg
                  >{{ t('Edit', 'تعديل') }}
                </button>
                <button type="button" class="action-link delete-link" @click="askDelete(row)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" /></svg
                  >{{ t('Delete', 'حذف') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <footer class="ui-legacy-pager pagination">
      <span>{{ t('Total', 'الإجمالي') }}: {{ meta.total || 0 }}</span>
      <div class="pager">
        <button type="button" :disabled="page <= 1 || loading" @click="page--">
          {{ t('Previous', 'السابق') }}
        </button>
        <span>{{ page }} / {{ numberOfPages }}</span>
        <button type="button" :disabled="page >= numberOfPages || loading" @click="page++">
          {{ t('Next', 'التالي') }}
        </button>
      </div>
    </footer>
    <StandardTablePager
      :page="page"
      :last-page="numberOfPages"
      :disabled="loading"
      @change="uiTableGoToPage"
    />

    <div v-if="modal" class="modal-backdrop" @mousedown.self="onBackdrop">
      <section
        ref="dialog"
        class="dialog"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        :aria-label="t('Extra Item', 'الإضافة')"
      >
        <div class="dialog-title">
          <h2>
            {{
              modal.mode === 'create'
                ? t('Add Extra Item', 'إضافة جديدة')
                : modal.mode === 'edit'
                  ? t('Edit Extra Item', 'تعديل الإضافة')
                  : modal.mode === 'view'
                    ? t('Extra Item Details', 'تفاصيل الإضافة')
                    : t('Delete Extra Item', 'حذف الإضافة')
            }}
          </h2>
          <button
            type="button"
            class="close"
            :disabled="working"
            @click="closeModal"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div v-if="modal.mode === 'delete'">
          <p>
            {{ t('Are you sure you want to delete', 'هل أنت متأكد أنك تريد حذف') }}
            <strong dir="auto">{{ modal.name }}</strong
            >?
          </p>
          <p class="muted">
            {{ t('This action cannot be undone.', 'لا يمكن التراجع عن هذا الإجراء.') }}
          </p>
          <p v-if="modalError" class="error-box" role="alert">{{ modalError }}</p>
          <div class="dialog-actions">
            <button type="button" class="secondary" :disabled="working" @click="closeModal">
              {{ t('Cancel', 'إلغاء') }}</button
            ><button type="button" class="danger" :disabled="working" @click="confirmDelete">
              {{ working ? t('Deleting...', 'جاري الحذف...') : t('Delete', 'حذف') }}
            </button>
          </div>
        </div>
        <div v-else-if="modalLoading" class="empty">
          {{ t('Loading record...', 'جاري تحميل السجل...') }}
        </div>
        <div v-else>
          <div v-if="modalError" class="error-box" role="alert">{{ modalError }}</div>
          <form @submit.prevent="save">
            <div class="field">
              <label for="extra-name">{{ t('Name', 'الاسم') }} *</label
              ><input
                id="extra-name"
                v-model="form.name"
                maxlength="190"
                required
                :disabled="isReadOnly || working || (!!modalError && isReadOnly)"
              /><small v-if="errors.name" class="field-error">{{ errors.name[0] }}</small>
            </div>
            <div class="field">
              <label for="extra-price">{{ t('Price', 'السعر') }} *</label
              ><input
                id="extra-price"
                v-model="form.price"
                type="number"
                step="0.01"
                min="0"
                required
                :disabled="isReadOnly || working"
              /><small v-if="errors.price" class="field-error">{{ errors.price[0] }}</small>
            </div>
            <div class="field">
              <label for="extra-daily">{{ t('Charge Type', 'نوع الرسوم') }} *</label
              ><select id="extra-daily" v-model="form.is_daily" :disabled="isReadOnly || working">
                <option :value="false">{{ t('One-time', 'مرة واحدة') }}</option>
                <option :value="true">{{ t('Daily', 'يومي') }}</option></select
              ><small v-if="errors.is_daily" class="field-error">{{ errors.is_daily[0] }}</small>
            </div>
            <div class="dialog-actions">
              <button type="button" class="secondary" :disabled="working" @click="closeModal">
                {{ isReadOnly ? t('Close', 'إغلاق') : t('Cancel', 'إلغاء') }}</button
              ><button
                v-if="showEditor"
                type="submit"
                class="primary"
                :disabled="working || modalLoading"
              >
                {{ working ? t('Saving...', 'جاري الحفظ...') : t('Save', 'حفظ') }}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.extra-items-page {
  padding: 16px 20px;
  color: #092043;
}
.heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 18px;
}
.heading h1 {
  font-size: 25px;
  margin: 0;
  font-weight: 700;
}
.primary {
  border: 0;
  background: #70a4c4;
  color: white;
  border-radius: 22px;
  padding: 9px 23px;
  font-weight: 600;
  cursor: pointer;
}
.primary:disabled,
.secondary:disabled,
.danger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.toolbar input,
.toolbar select {
  box-sizing: border-box;
  height: 34px;
  border: 1px solid #dbe2eb;
  border-radius: 9px;
  background: white;
  color: #092043;
  font-size: 12px;
  padding: 0 11px;
}
.toolbar input {
  width: min(360px, 70%);
}
.table-wrap {
  border: 1px solid #e3e8ef;
  border-radius: 12px;
  overflow: auto;
  background: white;
}
table {
  width: 100%;
  border-collapse: collapse;
  text-align: start;
}
th,
td {
  padding: 13px 14px;
  border-bottom: 1px solid #ecf0f4;
  text-align: start;
  font-size: 13px;
}
th {
  background: #f8fafc;
  font-weight: 700;
  white-space: nowrap;
}
tr:last-child td {
  border-bottom: 0;
}
.empty {
  text-align: center;
  color: #718096;
  padding: 32px;
}
.price {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.type-chip {
  display: inline-block;
  padding: 4px 11px;
  background: #f1f4f8;
  border-radius: 20px;
  font-size: 12px;
  color: #56657a;
}
.type-chip.daily {
  color: #236e85;
  background: #e7f4f8;
}
.actions {
  display: flex;
  align-items: center;
  gap: 15px;
  white-space: nowrap;
}
.action-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: 0;
  cursor: pointer;
  font: inherit;
  color: #152c4b;
  font-size: 12px;
  padding: 4px 0;
}
.action-link svg {
  width: 15px;
  height: 15px;
}
.delete-link {
  color: #c43e4c;
}
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #718096;
  margin-top: 13px;
}
.pager {
  display: flex;
  gap: 12px;
  align-items: center;
}
.pager button {
  background: white;
  border: 1px solid #dce3eb;
  border-radius: 8px;
  padding: 6px 12px;
  color: #092043;
  cursor: pointer;
}
.pager button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: #0715288a;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.dialog {
  background: white;
  width: min(470px, 100%);
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 15px 50px #0003;
  max-height: 90vh;
  overflow: auto;
  outline: none;
}
.dialog-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 20px;
}
.dialog-title h2 {
  font-size: 20px;
  margin: 0;
}
.close {
  background: none;
  border: 0;
  font-size: 26px;
  cursor: pointer;
  color: #607085;
}
.field {
  margin-bottom: 16px;
}
.field label {
  display: block;
  font-size: 13px;
  font-weight: 650;
  margin-bottom: 7px;
}
.field input,
.field select {
  box-sizing: border-box;
  width: 100%;
  height: 40px;
  border: 1px solid #d8e0e9;
  border-radius: 10px;
  padding: 0 12px;
  color: #092043;
  background: white;
}
.field input:disabled,
.field select:disabled {
  background: #f2f5f8;
  cursor: not-allowed;
}
.field-error {
  color: #b42336;
}
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}
.secondary {
  background: white;
  border: 1px solid #d8e0e9;
  border-radius: 21px;
  padding: 8px 20px;
  cursor: pointer;
}
.danger {
  background: #c43e4c;
  color: white;
  border: 0;
  border-radius: 21px;
  padding: 8px 20px;
  cursor: pointer;
}
.error-box {
  padding: 12px;
  background: #fff3f5;
  color: #ad2635;
  border-radius: 8px;
  margin: 12px 0;
  font-size: 13px;
}
.error-box button {
  border: 0;
  background: none;
  text-decoration: underline;
  color: inherit;
  cursor: pointer;
}
.muted {
  color: #66768b;
  font-size: 13px;
}
@media (max-width: 650px) {
  .heading h1 {
    font-size: 20px;
  }
  .extra-items-page {
    padding: 12px;
  }
  .toolbar input {
    width: 100%;
  }
  .actions {
    gap: 9px;
  }
  .table-wrap {
    overflow-x: auto;
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
</style>

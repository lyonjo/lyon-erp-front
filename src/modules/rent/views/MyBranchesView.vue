<script setup>
import StandardTablePager from '@/modules/rent/components/StandardTablePager.vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const { locale } = useI18n({ useScope: 'global' })
const isAr = computed(() => locale.value.toLowerCase().startsWith('ar'))
const labels = {
  en: {
    title: 'My Branches',
    new: '+ Add Branch',
    search: 'Search by branch name or address...',
    perPage: 'per page',
    id: 'ID',
    name: 'Branch Name',
    address: 'Address',
    actions: 'Actions',
    edit: 'Edit',
    remove: 'Delete',
    empty: 'No branches found',
    loading: 'Loading branches...',
    prev: 'Prev',
    next: 'Next',
    records: 'records',
    addTitle: 'Add Branch',
    editTitle: 'Edit Branch',
    namePlaceholder: 'Enter branch name',
    addressPlaceholder: 'Enter branch address',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...',
    add: 'Add Branch',
    retry: 'Retry',
    loadFailed: 'Could not load branches.',
    saveFailed: 'Could not save branch.',
    deleteFailed: 'Could not delete branch.',
    required: 'Name and address are required.',
    confirm: 'Delete branch "{name}"? This cannot be undone.',
    deleting: 'Deleting...',
    close: 'Close',
  },
  ar: {
    title: 'فروعي',
    new: '+ إضافة فرع',
    search: 'ابحث باسم الفرع أو العنوان...',
    perPage: 'لكل صفحة',
    id: 'الرقم',
    name: 'اسم الفرع',
    address: 'العنوان',
    actions: 'الإجراءات',
    edit: 'تعديل',
    remove: 'حذف',
    empty: 'لا توجد فروع',
    loading: 'جارٍ تحميل الفروع...',
    prev: 'السابق',
    next: 'التالي',
    records: 'سجل',
    addTitle: 'إضافة فرع',
    editTitle: 'تعديل الفرع',
    namePlaceholder: 'أدخل اسم الفرع',
    addressPlaceholder: 'أدخل عنوان الفرع',
    cancel: 'إلغاء',
    save: 'حفظ',
    saving: 'جارٍ الحفظ...',
    add: 'إضافة فرع',
    retry: 'إعادة المحاولة',
    loadFailed: 'تعذّر تحميل الفروع.',
    saveFailed: 'تعذّر حفظ الفرع.',
    deleteFailed: 'تعذّر حذف الفرع.',
    required: 'اسم الفرع والعنوان مطلوبان.',
    confirm: 'هل تريد حذف الفرع "{name}"؟ لا يمكن التراجع عن الحذف.',
    deleting: 'جارٍ الحذف...',
    close: 'إغلاق',
  },
}
const tr = (key, args = {}) => {
  let result = (isAr.value ? labels.ar : labels.en)[key] ?? key
  for (const [name, value] of Object.entries(args))
    result = result.replace(`{${name}}`, String(value))
  return result
}

const rows = ref([])
const loading = ref(false)
const error = ref('')
const search = ref('')
const perPage = ref(50)
const page = ref(1)
const meta = ref({ current_page: 1, last_page: 1, total: 0 })
let loadSeq = 0
let debounce = null

async function load() {
  const seq = ++loadSeq
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/rent/branches', {
      params: { page: page.value, per_page: perPage.value, search: search.value.trim() },
    })
    if (seq !== loadSeq) return
    rows.value = Array.isArray(data.data) ? data.data : []
    meta.value = data.meta ?? { current_page: page.value, last_page: 1, total: rows.value.length }
    // If the last row on the final page was deleted, fetch the preceding page.
    if (page.value > 1 && page.value > meta.value.last_page) {
      page.value = Math.max(1, meta.value.last_page)
    }
  } catch (e) {
    if (seq !== loadSeq) return
    error.value = e.response?.data?.message || tr('loadFailed')
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

watch([page, perPage], load)
watch(search, () => {
  clearTimeout(debounce)
  debounce = setTimeout(() => {
    if (page.value !== 1) page.value = 1
    else load()
  }, 350)
})
onMounted(load)
onBeforeUnmount(() => {
  clearTimeout(debounce)
  loadSeq += 1
  document.body.style.overflow = ''
})

const open = ref(false)
const selected = ref(null)
const branchName = ref('')
const branchAddress = ref('')
const nameInput = ref(null)
const saving = ref(false)
const formError = ref('')
const fieldErrors = ref({})
const deletingId = ref(null)

watch(open, (value) => {
  document.body.style.overflow = value ? 'hidden' : ''
})

async function showModal(branch = null) {
  selected.value = branch
  branchName.value = branch?.name ?? ''
  branchAddress.value = branch?.address ?? ''
  fieldErrors.value = {}
  formError.value = ''
  open.value = true
  await nextTick()
  nameInput.value?.focus()
}
function closeModal() {
  if (!saving.value) open.value = false
}

async function submit() {
  if (saving.value) return
  formError.value = ''
  fieldErrors.value = {}
  const payload = { name: branchName.value.trim(), address: branchAddress.value.trim() }
  if (!payload.name || !payload.address) {
    formError.value = tr('required')
    return
  }
  saving.value = true
  try {
    if (selected.value) await api.put(`/rent/branches/${selected.value.id}`, payload)
    else await api.post('/rent/branches', payload)
    open.value = false
    await load()
  } catch (e) {
    fieldErrors.value = e.response?.status === 422 ? (e.response?.data?.errors ?? {}) : {}
    formError.value = e.response?.data?.message || tr('saveFailed')
  } finally {
    saving.value = false
  }
}

async function remove(branch) {
  if (deletingId.value !== null || !window.confirm(tr('confirm', { name: branch.name }))) return
  deletingId.value = branch.id
  error.value = ''
  try {
    await api.delete(`/rent/branches/${branch.id}`)
    await load()
  } catch (e) {
    error.value = e.response?.data?.message || tr('deleteFailed')
  } finally {
    deletingId.value = null
  }
}

function uiTableGoToPage(n) {
  if (n < 1 || n > Number(meta.last_page) || n === page.value) return
  page.value = n
}
</script>

<template>
  <div class="branches-page">
    <div class="page-heading">
      <h1>{{ tr('title') }}</h1>
      <button type="button" class="new-button" @click="showModal()">{{ tr('new') }}</button>
    </div>

    <div class="filters ui-table-toolbar">
      <input
        v-model="search"
        type="search"
        :placeholder="tr('search')"
        :aria-label="tr('search')"
      />
      <label class="per-page">
        <select v-model.number="perPage" :aria-label="tr('perPage')">
          <option v-for="size in [5, 10, 15, 25, 50, 100]" :key="size" :value="size">
            {{ size }} {{ tr('perPage') }}
          </option>
        </select>
      </label>
    </div>

    <div v-if="error" class="error" role="alert">
      {{ error }} <button type="button" @click="load">{{ tr('retry') }}</button>
    </div>

    <div class="table-wrapper" :class="{ muted: loading }">
      <table class="ui-standardized-table">
        <thead>
          <tr>
            <th>{{ tr('id') }}</th>
            <th>{{ tr('name') }}</th>
            <th>{{ tr('address') }}</th>
            <th>{{ tr('actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="branch in rows" :key="branch.id">
            <td class="id-cell" dir="ltr">{{ branch.id }}</td>
            <td class="name-cell" dir="auto">{{ branch.name }}</td>
            <td class="address-cell" dir="auto">{{ branch.address }}</td>
            <td>
              <div class="row-actions">
                <button type="button" :disabled="deletingId !== null" @click="showModal(branch)">
                  {{ tr('edit') }}
                </button>
                <button
                  type="button"
                  class="delete-action"
                  :disabled="deletingId !== null"
                  @click="remove(branch)"
                >
                  {{ deletingId === branch.id ? tr('deleting') : tr('remove') }}
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!loading && !error && rows.length === 0">
            <td colspan="4" class="empty">{{ tr('empty') }}</td>
          </tr>
          <tr v-if="loading && rows.length === 0">
            <td colspan="4" class="empty">{{ tr('loading') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="ui-legacy-pager pagination" dir="ltr">
      <button type="button" :disabled="loading || page <= 1" @click="page -= 1">
        {{ tr('prev') }}
      </button>
      <span
        >{{ meta.current_page }} / {{ meta.last_page }} · {{ meta.total }} {{ tr('records') }}</span
      >
      <button type="button" :disabled="loading || page >= meta.last_page" @click="page += 1">
        {{ tr('next') }}
      </button>
    </div>
    <StandardTablePager
      :page="page"
      :last-page="meta.last_page"
      :disabled="loading"
      @change="uiTableGoToPage"
    />

    <div v-if="open" class="backdrop" @click.self="closeModal" @keydown.esc="closeModal">
      <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="branch-dialog-title">
        <button
          type="button"
          class="dismiss"
          :aria-label="tr('close')"
          :disabled="saving"
          @click="closeModal"
        >
          ×
        </button>
        <h2 id="branch-dialog-title">{{ selected ? tr('editTitle') : tr('addTitle') }}</h2>
        <form @submit.prevent="submit">
          <label class="field">
            <span>{{ tr('name') }} <b>*</b></span>
            <input
              ref="nameInput"
              v-model="branchName"
              maxlength="255"
              required
              :placeholder="tr('namePlaceholder')"
            />
            <small v-if="fieldErrors.name" class="field-error">{{ fieldErrors.name[0] }}</small>
          </label>
          <label class="field">
            <span>{{ tr('address') }} <b>*</b></span>
            <textarea
              v-model="branchAddress"
              rows="3"
              maxlength="1000"
              required
              :placeholder="tr('addressPlaceholder')"
            ></textarea>
            <small v-if="fieldErrors.address" class="field-error">{{
              fieldErrors.address[0]
            }}</small>
          </label>
          <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
          <div class="form-actions">
            <button type="button" class="cancel" :disabled="saving" @click="closeModal">
              {{ tr('cancel') }}
            </button>
            <button type="submit" class="submit" :disabled="saving">
              {{ saving ? tr('saving') : selected ? tr('save') : tr('add') }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped>
.branches-page {
  padding: 8px 4px 48px;
  color: #101b2b;
}
.page-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 38px;
}
.page-heading h1 {
  font-size: 32px;
  font-weight: 650;
  margin: 0;
}
.new-button {
  border: 0;
  border-radius: 999px;
  background: #5a9ec9;
  color: white;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 24px;
  cursor: pointer;
  box-shadow: 0 2px 5px #0001;
}
.new-button:hover {
  background: #488db8;
}
.filters {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 22px;
}
.filters input,
.filters select {
  height: 38px;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  background: white;
  color: #34445c;
  padding: 0 13px;
  font-size: 13px;
  outline: none;
}
.filters input {
  min-width: 180px;
  width: min(100%, 315px);
}
.filters input:focus,
.filters select:focus {
  border-color: #5a9ec9;
  box-shadow: 0 0 0 3px #5a9ec927;
}
.table-wrapper {
  border: 1px solid #dbe1e8;
  border-radius: 14px;
  overflow-x: auto;
  background: #fff;
}
.table-wrapper.muted {
  opacity: 0.65;
}
table {
  width: 100%;
  border-collapse: collapse;
  white-space: normal;
  text-align: start;
}
th {
  color: #95a2b9;
  font-size: 12px;
  font-weight: 600;
  border-bottom: 1px solid #e4e8ef;
  padding: 15px 18px;
  text-align: start;
  white-space: nowrap;
}
td {
  font-size: 13px;
  padding: 16px 18px;
  border-bottom: 1px solid #edf1f5;
  text-align: start;
}
tbody tr:last-child td {
  border-bottom: 0;
}
.name-cell {
  font-weight: 600;
  min-width: 150px;
}
.address-cell {
  min-width: 210px;
  overflow-wrap: anywhere;
}
.id-cell {
  width: 85px;
  text-align: start;
}
.row-actions {
  display: flex;
  gap: 16px;
  align-items: center;
  white-space: nowrap;
}
.row-actions button {
  background: none;
  border: 0;
  color: #1e293b;
  cursor: pointer;
  font-size: 13px;
  padding: 4px 0;
}
.row-actions button:hover {
  text-decoration: underline;
  color: #287cad;
}
.row-actions .delete-action:hover {
  color: #c62828;
}
.row-actions button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.empty {
  text-align: center;
  color: #95a2b9;
  padding: 40px;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 22px;
  color: #64748b;
  font-size: 13px;
}
.pagination button {
  background: #fff;
  border: 1px solid #e4e8ef;
  border-radius: 9px;
  padding: 9px 15px;
  color: #64748b;
  cursor: pointer;
}
.pagination button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #fff1f2;
  color: #be123c;
  border-radius: 9px;
  padding: 12px 15px;
  margin-bottom: 16px;
  font-size: 13px;
}
.error button {
  border: 0;
  background: transparent;
  color: inherit;
  text-decoration: underline;
  cursor: pointer;
}
.backdrop {
  position: fixed;
  inset: 0;
  background: #0007;
  display: grid;
  place-items: center;
  z-index: 3000;
  padding: 20px;
  overflow-y: auto;
}
.dialog {
  position: relative;
  width: min(100%, 512px);
  box-sizing: border-box;
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 12px 35px #0003;
  max-height: calc(100vh - 40px);
  overflow: auto;
}
.dialog h2 {
  text-align: center;
  font-size: 20px;
  margin: 0 0 24px;
  font-weight: 650;
}
.dismiss {
  position: absolute;
  inset-inline-end: 15px;
  top: 10px;
  border: 0;
  background: transparent;
  color: #64748b;
  font-size: 25px;
  cursor: pointer;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 18px;
}
.field span {
  font-size: 13px;
  font-weight: 600;
}
.field b {
  color: #dc2626;
}
.field input,
.field textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 10px 14px;
  font: inherit;
  font-size: 14px;
  outline: none;
  background: #fff;
}
.field input {
  height: 42px;
}
.field textarea {
  resize: vertical;
}
.field input:focus,
.field textarea:focus {
  border-color: #5a9ec9;
  box-shadow: 0 0 0 3px #5a9ec927;
}
.field-error,
.form-error {
  font-size: 12px;
  color: #b91c1c;
}
.form-error {
  margin-bottom: 18px;
}
.form-actions {
  display: flex;
  gap: 12px;
}
.cancel,
.submit {
  flex: 1;
  border-radius: 999px;
  border: 0;
  height: 42px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
}
.cancel {
  background: #eff3f7;
  color: #475569;
}
.submit {
  background: #5a9ec9;
  color: #fff;
}
.submit:hover:not(:disabled) {
  background: #488db8;
}
.form-actions button:disabled {
  opacity: 0.55;
  cursor: wait;
}
@media (max-width: 650px) {
  .page-heading h1 {
    font-size: 25px;
  }
  .new-button {
    padding: 9px 13px;
  }
  .filters {
    flex-wrap: wrap;
  }
  .filters input {
    width: 100%;
  }
  .row-actions {
    gap: 10px;
  }
  .dialog {
    padding: 20px;
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

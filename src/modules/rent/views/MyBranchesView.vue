<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/api'
import { useRouter } from 'vue-router'

const router = useRouter()
const { locale } = useI18n({ useScope: 'global' })
const isAr = computed(() => locale.value.toLowerCase().startsWith('ar'))
const labels = {
  en: {
    title: 'My Branches',
    new: '+ Add Branch',
    search: 'Search by branch name...',
    perPage: 'per page',
    id: 'ID',
    name: 'Branch Name',
    actions: 'Actions',
    edit: 'Edit',
    view: 'View',
    destinations: 'Destinations',
    remove: 'Delete',
    empty: 'No branches found',
    loading: 'Loading branches...',
    prev: 'Prev',
    next: 'Next',
    records: 'records',
    addTitle: 'Add Branch',
    editTitle: 'Edit Branch',
    namePlaceholder: 'Enter branch name',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...',
    add: 'Add Branch',
    retry: 'Retry',
    loadFailed: 'Could not load branches.',
    saveFailed: 'Could not save branch.',
    deleteFailed: 'Could not delete branch.',
    required: 'Branch name is required.',
    confirm: 'Delete branch "{name}"? This cannot be undone.',
    deleting: 'Deleting...',
    close: 'Close',
  },
  ar: {
    title: 'فروعي',
    new: '+ إضافة فرع',
    search: 'ابحث باسم الفرع...',
    perPage: 'لكل صفحة',
    id: 'الرقم',
    name: 'اسم الفرع',
    actions: 'الإجراءات',
    edit: 'تعديل',
    view: 'عرض',
    destinations: 'الوجهات',
    remove: 'حذف',
    empty: 'لا توجد فروع',
    loading: 'جارٍ تحميل الفروع...',
    prev: 'السابق',
    next: 'التالي',
    records: 'سجل',
    addTitle: 'إضافة فرع',
    editTitle: 'تعديل الفرع',
    namePlaceholder: 'أدخل اسم الفرع',
    cancel: 'إلغاء',
    save: 'حفظ',
    saving: 'جارٍ الحفظ...',
    add: 'إضافة فرع',
    retry: 'إعادة المحاولة',
    loadFailed: 'تعذّر تحميل الفروع.',
    saveFailed: 'تعذّر حفظ الفرع.',
    deleteFailed: 'تعذّر حذف الفرع.',
    required: 'اسم الفرع مطلوب.',
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
const pagerItems = computed(() => {
  const total = Math.max(1, Number(meta.value.last_page) || 1)
  const current = Math.min(total, Math.max(1, page.value))
  const keep = new Set([1, total])
  for (let index = Math.max(1, current - 1); index <= Math.min(total, current + 1); index++)
    keep.add(index)
  // Keep the first and last few pages visible to avoid a lone ellipsis.
  if (current <= 3) for (let index = 1; index <= Math.min(total, 4); index++) keep.add(index)
  if (current >= total - 2)
    for (let index = Math.max(1, total - 3); index <= total; index++) keep.add(index)
  const pages = [...keep].sort((a, b) => a - b)
  const items = []
  pages.forEach((number, index) => {
    if (index && number > pages[index - 1] + 1) items.push('ellipsis-' + index)
    items.push(number)
  })
  return items
})
function goToPage(target) {
  if (loading.value) return
  const max = Math.max(1, Number(meta.value.last_page) || 1)
  if (target >= 1 && target <= max && target !== page.value) page.value = target
}

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
const nameInput = ref(null)
const saving = ref(false)
const formError = ref('')
const fieldErrors = ref({})
const deletingId = ref(null)
const deleteTarget = ref(null)
function requestDelete(branch) {
  if (deletingId.value !== null) return
  deleteTarget.value = branch
}
function cancelDelete() {
  if (deletingId.value === null) deleteTarget.value = null
}

watch(open, (value) => {
  document.body.style.overflow = value ? 'hidden' : ''
})

async function showModal(branch = null) {
  selected.value = branch
  branchName.value = branch?.name ?? ''
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
  const payload = { name: branchName.value.trim() }
  if (!payload.name) {
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

async function remove() {
  const branch = deleteTarget.value
  if (!branch || deletingId.value !== null) return
  deletingId.value = branch.id
  error.value = ''
  try {
    await api.delete(`/rent/branches/${branch.id}`)
    deleteTarget.value = null
    await load()
  } catch (e) {
    error.value = e.response?.data?.message || tr('deleteFailed')
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="branches-page">
    <div class="page-heading">
      <h1>{{ tr('title') }}</h1>
    </div>

    <div class="filters">
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
      <button type="button" class="new-button" @click="showModal()">{{ tr('new') }}</button>
    </div>

    <div v-if="error" class="error" role="alert">
      {{ error }} <button type="button" @click="load">{{ tr('retry') }}</button>
    </div>

    <div class="table-wrapper" :class="{ muted: loading }">
      <table>
        <thead>
          <tr>
            <th>{{ tr('id') }}</th>
            <th>{{ tr('name') }}</th>
            <th>{{ tr('actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="branch in rows" :key="branch.id">
            <td class="id-cell" dir="ltr">{{ branch.id }}</td>
            <td class="name-cell" dir="auto">{{ branch.name }}</td>
            <td>
              <div class="row-actions">
                <button type="button" @click="router.push(`/rent/branches/${branch.id}/view`)">
                  {{ tr('view') }}
                </button>
                <button
                  type="button"
                  :disabled="deletingId !== null"
                  @click="router.push(`/rent/branches/${branch.id}/edit`)"
                >
                  {{ tr('edit') }}
                </button>
                <button
                  type="button"
                  class="delete-action"
                  :disabled="deletingId !== null"
                  @click="requestDelete(branch)"
                >
                  {{ deletingId === branch.id ? tr('deleting') : tr('remove') }}
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!loading && !error && rows.length === 0">
            <td colspan="3" class="empty">{{ tr('empty') }}</td>
          </tr>
          <tr v-if="loading && rows.length === 0">
            <td colspan="3" class="empty">{{ tr('loading') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <nav class="pagination" dir="ltr" :aria-label="isAr ? 'صفحات الفروع' : 'Branch pages'">
      <button
        type="button"
        class="page-arrow"
        :aria-label="tr('prev')"
        :disabled="loading || page <= 1"
        @click="goToPage(page - 1)"
      >
        ‹
      </button>
      <template v-for="item in pagerItems" :key="item">
        <span v-if="typeof item === 'string'" class="page-ellipsis">…</span>
        <button
          v-else
          type="button"
          class="page-number"
          :class="{ active: page === item }"
          :aria-current="page === item ? 'page' : undefined"
          :disabled="loading"
          @click="goToPage(item)"
        >
          {{ item }}
        </button>
      </template>
      <button
        type="button"
        class="page-arrow"
        :aria-label="tr('next')"
        :disabled="loading || page >= meta.last_page"
        @click="goToPage(page + 1)"
      >
        ›
      </button>
    </nav>

    <div
      v-if="deleteTarget"
      class="backdrop"
      @click.self="cancelDelete"
      @keydown.esc="cancelDelete"
    >
      <section
        class="dialog delete-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="branch-delete-title"
        aria-describedby="branch-delete-description"
      >
        <h2 id="branch-delete-title">{{ tr('remove') }} {{ tr('name') }}</h2>
        <p id="branch-delete-description">{{ tr('confirm', { name: deleteTarget.name }) }}</p>
        <div class="form-actions">
          <button
            type="button"
            class="cancel"
            :disabled="deletingId !== null"
            @click="cancelDelete"
          >
            {{ tr('cancel') }}
          </button>
          <button
            type="button"
            class="confirm-delete"
            :disabled="deletingId !== null"
            @click="remove"
          >
            {{ deletingId !== null ? tr('deleting') : tr('remove') }}
          </button>
        </div>
      </section>
    </div>

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
  margin-bottom: 24px;
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
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  margin: 0 0 22px;
  direction: ltr;
}
.filters > input {
  justify-self: start;
}
.filters > .per-page {
  justify-self: center;
}
.filters > .new-button {
  justify-self: end;
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
  text-align: center;
}
th {
  color: #95a2b9;
  font-size: 12px;
  font-weight: 600;
  border-bottom: 1px solid #e4e8ef;
  padding: 15px 18px;
  text-align: center;
  white-space: nowrap;
}
td {
  font-size: 13px;
  padding: 16px 18px;
  border-bottom: 1px solid #edf1f5;
  text-align: center;
}
tbody tr:last-child td {
  border-bottom: 0;
}
.name-cell {
  font-weight: 600;
  min-width: 150px;
}
.id-cell {
  width: 85px;
  text-align: center;
}
.row-actions {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: center;
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
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 24px;
}
.pagination button {
  width: 36px;
  height: 36px;
  display: inline-grid;
  place-items: center;
  border: 1px solid #e4e8ef;
  background: #f5f6f9;
  color: #334155;
  border-radius: 999px;
  cursor: pointer;
  padding: 0;
  font-size: 13px;
}
.pagination button.active {
  color: #fff;
  background: #3983ef;
  border-color: #3983ef;
}
.pagination button:disabled:not(.active) {
  opacity: 0.45;
  cursor: default;
}
.page-ellipsis {
  color: #64748b;
  padding: 0 5px;
}
@media (max-width: 600px) {
  .filters {
    grid-template-columns: minmax(0, 1fr) auto;
    row-gap: 12px;
  }
  .filters > input {
    grid-column: 1 / -1;
    width: 100%;
  }
  .filters > .per-page {
    grid-column: 1;
    justify-self: start;
  }
  .filters > .new-button {
    grid-column: 2;
    justify-self: end;
  }
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
</style>

<style scoped>
.delete-dialog p {
  line-height: 1.65;
  color: #495b72;
  margin: 8px 0 22px;
}
.confirm-delete {
  border: 0;
  border-radius: 24px;
  background: #c43643;
  color: #fff;
  padding: 10px 23px;
  cursor: pointer;
}
.confirm-delete:disabled {
  opacity: 0.55;
  cursor: default;
}
</style>

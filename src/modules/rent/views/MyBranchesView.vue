<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/api'

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
    viewTitle: 'View Branch',
    branchInfo: 'Branch Information',
    branchDestinations: 'Branch Destinations',
    addDestination: '+ Add Destination',
    destBranch: 'Destination Branch',
    destPrice: 'Price',
    noneDestinations: 'No destinations configured.',
    destSearch: 'Search destinations...',
    destSelect: 'Select destination branch',
    destCreate: 'New Destination',
    destEdit: 'Edit Destination',
    destDelete: 'Delete Destination',
    destConfirm: 'Delete destination "{name}"? This cannot be undone.',
    destSaveError: 'Could not save destination.',
    destLoadError: 'Could not load branch destinations.',
    destDeleteError: 'Could not delete destination.',
    destRequired: 'Choose a destination and enter a valid price.',
    editBranch: 'Edit Branch',
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
    viewTitle: 'عرض الفرع',
    branchInfo: 'معلومات الفرع',
    branchDestinations: 'وجهات الفرع',
    addDestination: '+ إضافة وجهة',
    destBranch: 'الفرع الوجهة',
    destPrice: 'السعر',
    noneDestinations: 'لا توجد وجهات.',
    destSearch: 'بحث عن وجهة...',
    destSelect: 'اختر فرع الوجهة',
    destCreate: 'إضافة وجهة',
    destEdit: 'تعديل الوجهة',
    destDelete: 'حذف الوجهة',
    destConfirm: 'هل تريد حذف الوجهة "{name}"؟ لا يمكن التراجع عن الحذف.',
    destSaveError: 'تعذر حفظ الوجهة.',
    destLoadError: 'تعذر تحميل الوجهات.',
    destDeleteError: 'تعذر حذف الوجهة.',
    destRequired: 'اختر وجهة وسعراً صحيحاً.',
    editBranch: 'تعديل الفرع',
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
const modalMode = ref('create')
const branchDestinations = ref([])
const destinationOptions = ref([])
const destinationsLoading = ref(false)
const destinationDialog = ref(false)
const editingDestination = ref(null)
const destinationBranchId = ref('')
const destinationPrice = ref('0')
const destinationError = ref('')
const destinationSaving = ref(false)
const destinationDeleteTarget = ref(null)
const destinationDeleting = ref(false)
const destinationDeleteError = ref('')
const displayPrice = (value) =>
  Number.isFinite(Number(value)) ? String(Math.round(Number(value))) : '—'

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
  document.body.style.overflow = value || !!deleteTarget.value ? 'hidden' : ''
})

async function fetchDestinations(branchId) {
  destinationsLoading.value = true
  try {
    const [list, options] = await Promise.all([
      api.get(`/rent/branches/${branchId}/destinations`),
      api.get(`/rent/branches/${branchId}/destinations/options`),
    ])
    if (!open.value || selected.value?.id !== branchId) return
    branchDestinations.value = list.data.data ?? []
    destinationOptions.value = options.data.data ?? []
  } catch (e) {
    formError.value = e.response?.data?.message || tr('destLoadError')
  } finally {
    destinationsLoading.value = false
  }
}
async function reloadDestinations() {
  if (!selected.value) return
  const { data } = await api.get(`/rent/branches/${selected.value.id}/destinations`)
  branchDestinations.value = data.data ?? []
}
async function showModal(branch = null, mode = 'create') {
  modalMode.value = mode
  selected.value = branch
  branchName.value = branch?.name ?? ''
  fieldErrors.value = {}
  formError.value = ''
  branchDestinations.value = []
  destinationOptions.value = []
  open.value = true
  if (branch) await fetchDestinations(branch.id)
  else {
    await nextTick()
    nameInput.value?.focus()
  }
}
function closeModal() {
  if (saving.value || destinationSaving.value || destinationDeleting.value) return
  destinationDialog.value = false
  destinationDeleteTarget.value = null
  open.value = false
}
function editDestination(row = null) {
  if (modalMode.value !== 'edit') return
  editingDestination.value = row
  destinationBranchId.value = row ? String(row.destination_branch_id) : ''
  destinationPrice.value = row ? String(row.price) : '0'
  destinationError.value = ''
  destinationDialog.value = true
}
async function saveDestination() {
  if (destinationSaving.value || !selected.value) return
  destinationError.value = ''
  if (
    !destinationBranchId.value ||
    destinationPrice.value === '' ||
    !Number.isFinite(Number(destinationPrice.value)) ||
    Number(destinationPrice.value) < 0
  ) {
    destinationError.value = tr('destRequired')
    return
  }
  destinationSaving.value = true
  try {
    const prefix = `/rent/branches/${selected.value.id}/destinations`
    const payload = {
      destination_branch_id: Number(destinationBranchId.value),
      price: Number(destinationPrice.value),
    }
    if (editingDestination.value) await api.put(`${prefix}/${editingDestination.value.id}`, payload)
    else await api.post(prefix, payload)
    destinationDialog.value = false
    await reloadDestinations()
  } catch (e) {
    destinationError.value =
      Object.values(e.response?.data?.errors ?? {})
        .flat()
        .join(' ') ||
      e.response?.data?.message ||
      tr('destSaveError')
  } finally {
    destinationSaving.value = false
  }
}
function requestDestinationDelete(row) {
  if (modalMode.value === 'edit' && !destinationDeleting.value) {
    destinationDeleteError.value = ''
    destinationDeleteTarget.value = row
  }
}
async function confirmDestinationDelete() {
  if (!destinationDeleteTarget.value || destinationDeleting.value || !selected.value) return
  destinationDeleting.value = true
  destinationDeleteError.value = ''
  try {
    await api.delete(
      `/rent/branches/${selected.value.id}/destinations/${destinationDeleteTarget.value.id}`,
    )
    destinationDeleteTarget.value = null
    await reloadDestinations()
  } catch (e) {
    destinationDeleteError.value = e.response?.data?.message || tr('destDeleteError')
  } finally {
    destinationDeleting.value = false
  }
}

async function submit() {
  if (saving.value || modalMode.value === 'view') return
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
                <button type="button" @click="showModal(branch, 'view')">{{ tr('view') }}</button>
                <button
                  type="button"
                  :disabled="deletingId !== null"
                  @click="showModal(branch, 'edit')"
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
      <section
        class="dialog"
        :class="{ 'branch-detail-dialog': !!selected }"
        role="dialog"
        aria-modal="true"
        aria-labelledby="branch-dialog-title"
      >
        <button
          type="button"
          class="dismiss"
          :aria-label="tr('close')"
          :disabled="saving"
          @click="closeModal"
        >
          ×
        </button>
        <h2 id="branch-dialog-title">
          {{ modalMode === 'view' ? tr('viewTitle') : selected ? tr('editTitle') : tr('addTitle') }}
        </h2>
        <form class="branch-detail-form" @submit.prevent="submit">
          <label class="field">
            <span>{{ tr('name') }} <b>*</b></span>
            <input
              ref="nameInput"
              v-model="branchName"
              maxlength="255"
              required
              :readonly="modalMode === 'view'"
              :placeholder="tr('namePlaceholder')"
            />
            <small v-if="fieldErrors.name" class="field-error">{{ fieldErrors.name[0] }}</small>
          </label>
          <section v-if="selected" class="destinations-inside">
            <h3>{{ tr('branchDestinations') }}</h3>
            <div class="destination-toolbar">
              <button
                v-if="modalMode === 'edit'"
                type="button"
                class="new-button"
                @click="editDestination()"
              >
                {{ tr('addDestination') }}
              </button>
            </div>
            <div class="destination-table-wrapper">
              <table class="destination-table">
                <thead>
                  <tr>
                    <th>{{ tr('id') }}</th>
                    <th>{{ tr('destBranch') }}</th>
                    <th>{{ tr('destPrice') }}</th>
                    <th v-if="modalMode === 'edit'">{{ tr('actions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in branchDestinations" :key="row.id">
                    <td>{{ row.id }}</td>
                    <td>{{ row.destination_branch?.name || '—' }}</td>
                    <td>{{ displayPrice(row.price) }}</td>
                    <td v-if="modalMode === 'edit'">
                      <div class="row-actions">
                        <button type="button" @click="editDestination(row)">{{ tr('edit') }}</button
                        ><button
                          type="button"
                          class="delete-action"
                          @click="requestDestinationDelete(row)"
                        >
                          {{ tr('remove') }}
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!destinationsLoading && !branchDestinations.length">
                    <td :colspan="modalMode === 'edit' ? 4 : 3">{{ tr('noneDestinations') }}</td>
                  </tr>
                  <tr v-if="destinationsLoading">
                    <td :colspan="modalMode === 'edit' ? 4 : 3">{{ tr('loading') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
          <div
            class="form-actions branch-modal-actions"
            :class="{ 'branch-detail-footer': !!selected }"
          >
            <button type="button" class="cancel" :disabled="saving" @click="closeModal">
              {{ tr('cancel') }}
            </button>
            <button v-if="modalMode !== 'view'" type="submit" class="submit" :disabled="saving">
              {{ saving ? tr('saving') : selected ? tr('save') : tr('add') }}
            </button>
          </div>
        </form>
      </section>
    </div>
    <div
      v-if="destinationDialog"
      class="backdrop overlay-top"
      @click.self="!destinationSaving && (destinationDialog = false)"
    >
      <form class="dialog destination-editor" @submit.prevent="saveDestination">
        <h2>{{ editingDestination ? tr('destEdit') : tr('destCreate') }}</h2>
        <label class="field"
          ><span>{{ tr('destBranch') }}</span
          ><select v-model="destinationBranchId" required>
            <option value="">{{ tr('destSelect') }}</option>
            <option v-for="opt in destinationOptions" :key="opt.id" :value="String(opt.id)">
              {{ opt.name }}
            </option>
          </select></label
        >
        <label class="field"
          ><span>{{ tr('destPrice') }}</span
          ><input
            v-model="destinationPrice"
            type="number"
            min="0"
            max="9999999999.99"
            step="0.01"
            required
        /></label>
        <p v-if="destinationError" class="form-error">{{ destinationError }}</p>
        <div class="form-actions">
          <button
            type="button"
            class="cancel"
            :disabled="destinationSaving"
            @click="destinationDialog = false"
          >
            {{ tr('cancel') }}</button
          ><button type="submit" class="submit" :disabled="destinationSaving">
            {{ destinationSaving ? tr('saving') : tr('save') }}
          </button>
        </div>
      </form>
    </div>
    <div
      v-if="destinationDeleteTarget"
      class="backdrop overlay-top"
      @click.self="!destinationDeleting && (destinationDeleteTarget = null)"
    >
      <section class="dialog delete-dialog" role="alertdialog" aria-modal="true">
        <h2>{{ tr('destDelete') }}</h2>
        <p>
          {{
            tr('destConfirm', {
              name:
                destinationDeleteTarget.destination_branch?.name ||
                destinationDeleteTarget.destination_branch_id,
            })
          }}
        </p>
        <p v-if="destinationDeleteError" class="form-error">{{ destinationDeleteError }}</p>
        <div class="form-actions">
          <button
            type="button"
            class="cancel"
            :disabled="destinationDeleting"
            @click="destinationDeleteTarget = null"
          >
            {{ tr('cancel') }}</button
          ><button
            type="button"
            class="confirm-delete"
            :disabled="destinationDeleting"
            @click="confirmDestinationDelete"
          >
            {{ destinationDeleting ? tr('deleting') : tr('remove') }}
          </button>
        </div>
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

<style scoped>
/* Branch detail and destination CRUD are all contained within the table page. */
.dialog:has(.destinations-inside) {
  box-sizing: border-box;
}
.destinations-inside {
  margin: 24px 0 18px;
  border-top: 1px solid #e4e8ef;
  padding-top: 18px;
}
.destinations-inside h3 {
  margin: 0 0 16px;
  font-size: 17px;
}
.destination-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  direction: ltr;
  margin-bottom: 14px;
}
.destination-toolbar input {
  justify-self: start;
  width: min(100%, 260px);
  min-width: 0;
}
.destination-toolbar .new-button {
  margin-left: auto;
  flex-shrink: 0;
}
.destination-toolbar input,
.destination-toolbar select,
.destination-editor select {
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  padding: 9px;
  background: #fff;
  color: #34445c;
  font: inherit;
}
.destination-table-wrapper {
  border: 1px solid #dbe1e8;
  border-radius: 10px;
  overflow-x: auto;
}
.overlay-top {
  z-index: 4000;
}
.destination-editor {
  width: min(460px, calc(100vw - 36px));
  box-sizing: border-box;
}
.destination-editor .field {
  display: block;
  margin: 14px 0;
}
.destination-editor .field span {
  display: block;
  margin-bottom: 7px;
}
.destination-editor .field select {
  width: 100%;
  box-sizing: border-box;
}
@media (max-width: 650px) {
  .destination-toolbar {
    flex-wrap: wrap;
  }
  .destination-toolbar input,
  .destination-toolbar .new-button {
    width: 100%;
  }
  .dialog:has(.destinations-inside) {
    max-height: 94vh;
  }
}
</style>

<style scoped>
/* Compact actions in the branch create/edit/view modal only. */
.branch-modal-actions {
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
}
.branch-modal-actions .cancel,
.branch-modal-actions .submit {
  flex: 0 0 auto;
  min-width: 100px;
  width: auto;
  height: 38px;
  padding: 0 20px;
}
.destination-toolbar {
  justify-content: flex-end;
}
@media (max-width: 650px) {
  .branch-modal-actions .cancel,
  .branch-modal-actions .submit {
    min-width: 90px;
  }
  .destination-toolbar .new-button {
    width: auto;
  }
}
</style>

<style scoped>
/* Full-width Branch View/Edit dialog matching the supplied reference. */
.branch-detail-dialog {
  width: min(1480px, calc(100vw - 72px));
  max-width: none;
  height: min(930px, calc(100dvh - 72px));
  max-height: calc(100dvh - 72px);
  display: flex;
  flex-direction: column;
  padding: 0;
  border-radius: 16px;
  overflow: hidden;
}
.branch-detail-dialog > h2 {
  flex: 0 0 auto;
  margin: 0;
  padding: 30px 72px 22px;
  font-size: 24px;
  text-align: center;
}
.branch-detail-dialog .dismiss {
  top: 12px;
  right: 22px;
  z-index: 1;
}
.branch-detail-form {
  min-height: 0;
}
.branch-detail-dialog .branch-detail-form {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.branch-detail-dialog .branch-detail-form > .field {
  flex: 0 0 auto;
  margin: 0 28px;
}
.branch-detail-dialog .destinations-inside {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin: 22px 28px 0;
  padding-top: 17px;
}
.branch-detail-dialog .destinations-inside h3 {
  margin: 0;
  font-size: 19px;
}
.branch-detail-dialog .destination-toolbar {
  margin: -32px 0 18px;
  min-height: 38px;
}
.branch-detail-dialog .destination-table-wrapper {
  flex: 1 1 auto;
  min-height: 200px;
  overflow: auto;
  border: 1px solid #dbe2ec;
  border-radius: 10px;
}
.branch-detail-dialog .destination-table {
  width: 100%;
}
.branch-detail-dialog .destination-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #f6f9fc;
}
.branch-detail-dialog .branch-detail-footer {
  flex: 0 0 auto;
  justify-content: flex-end;
  padding: 16px 27px;
  margin-top: 22px;
  border-top: 1px solid #e5eaf0;
  background: #fff;
}
.branch-detail-dialog .branch-detail-footer .cancel,
.branch-detail-dialog .branch-detail-footer .submit {
  flex: 0 0 auto;
  width: auto;
  min-width: 100px;
  padding: 0 22px;
  height: 38px;
}
@media (max-width: 700px) {
  .branch-detail-dialog {
    width: calc(100vw - 24px);
    height: calc(100dvh - 24px);
    max-height: calc(100dvh - 24px);
  }
  .branch-detail-dialog > h2 {
    padding: 22px 45px 18px;
    font-size: 20px;
  }
  .branch-detail-dialog .branch-detail-form > .field {
    margin: 0 14px;
  }
  .branch-detail-dialog .destinations-inside {
    margin: 18px 14px 0;
  }
  .branch-detail-dialog .destination-toolbar {
    margin: 10px 0 12px;
  }
  .branch-detail-dialog .branch-detail-footer {
    margin-top: 12px;
    padding: 12px 14px;
  }
}
</style>

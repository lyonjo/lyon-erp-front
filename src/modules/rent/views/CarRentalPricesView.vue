<script setup>
// Compact numbered pagination, with ellipses for large result sets.
function visiblePages(current, last) {
  const total = Math.max(1, Number(last) || 1)
  const currentPage = Math.min(total, Math.max(1, Number(current) || 1))
  const pages = new Set([1, total])
  for (let n = Math.max(1, currentPage - 1); n <= Math.min(total, currentPage + 1); n++)
    pages.add(n)
  const result = []
  for (const n of [...pages].sort((a, b) => a - b)) {
    if (result.length && n - result[result.length - 1] > 1) result.push('…')
    result.push(n)
  }
  return result
}

import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
const router = useRouter(),
  { locale } = useI18n(),
  tr = (en, ar) => (locale.value === 'ar' ? ar : en)
const imageBlobs = ref({}),
  rows = ref([]),
  loading = ref(false),
  error = ref(''),
  search = ref(''),
  page = ref(1),
  perPage = ref(50),
  meta = ref({ current_page: 1, last_page: 1, total: 0 }),
  pendingDelete = ref(null),
  deleting = ref(false),
  deleteError = ref('')
let debounce,
  revision = 0
async function load() {
  const r = ++revision
  loading.value = true
  error.value = ''
  rows.value = []
  try {
    const { data } = await api.get('/rent/car-rental-prices', {
      params: {
        client_type: 'customer',
        search: search.value,
        page: page.value,
        per_page: perPage.value,
      },
    })
    if (r !== revision) return
    rows.value = data.data || []
    meta.value = data.meta || {
      current_page: data.current_page || 1,
      last_page: data.last_page || 1,
      total: data.total || 0,
    }
    Promise.all(
      rows.value
        .filter((x) => x.main_image)
        .map(async (x) => {
          try {
            const result = await api.get(
              `/rent/car-rental-prices/${x.id}/images/${x.main_image.id}`,
              { responseType: 'blob' },
            )
            if (r !== revision) return
            const old = imageBlobs.value[x.id]
            if (old) URL.revokeObjectURL(old)
            imageBlobs.value[x.id] = URL.createObjectURL(result.data)
          } catch (e) {}
        }),
    ).catch(() => {})
  } catch (e) {
    if (r === revision)
      error.value = e.response?.data?.message || tr('Could not load prices', 'تعذر تحميل الأسعار')
  } finally {
    if (r === revision) loading.value = false
  }
}
watch(search, () => {
  clearTimeout(debounce)
  debounce = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
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
  Object.values(imageBlobs.value).forEach(URL.revokeObjectURL)
})
async function deleteRecord() {
  if (!pendingDelete.value || deleting.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await api.delete(`/rent/car-rental-prices/${pendingDelete.value.id}`)
    pendingDelete.value = null
    if (rows.value.length === 1 && page.value > 1) page.value--
    else await load()
  } catch (e) {
    deleteError.value = e.response?.data?.message || tr('Delete failed', 'فشل الحذف')
  } finally {
    deleting.value = false
  }
}
function imageUrl(row) {
  return imageBlobs.value[row.id] || ''
}
function goCreate() {
  router.push('/rent/car-rental-price/create')
}
function goView(row) {
  router.push('/rent/car-rental-price/' + row.id)
}
function goEdit(row) {
  router.push('/rent/car-rental-price/' + row.id + '/edit')
}
function openDelete(row) {
  pendingDelete.value = row
  deleteError.value = ''
}
function closeDelete() {
  if (!deleting.value) {
    pendingDelete.value = null
    deleteError.value = ''
  }
}
function previousPage() {
  if (page.value > 1 && !loading.value) page.value--
}
function nextPage() {
  if (page.value < (meta.value.last_page || 1) && !loading.value) page.value++
}
</script>
<template>
  <section class="cr-list">
    <div class="top">
      <h2>{{ tr('Car Rental Price Customer', 'أسعار تأجير السيارات للعملاء') }}</h2>
    </div>
    <div class="toolbar">
      <input
        v-model="search"
        :placeholder="
          tr('Search brand, model or year...', 'ابحث عن الماركة أو الموديل أو السنة...')
        "
      /><select v-model.number="perPage" class="per-page">
        <option :value="10">10</option>
        <option :value="15">15</option>
        <option :value="25">25</option>
        <option :value="50">50</option>
      </select>
      <button class="primary" @click="goCreate">+ {{ tr('New Car', 'سيارة جديدة') }}</button>
    </div>
    <p v-if="error" class="error">
      {{ error }} <button @click="load">{{ tr('Retry', 'إعادة المحاولة') }}</button>
    </p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>{{ tr('Image', 'الصورة') }}</th>
            <th>{{ tr('Vehicle Brand', 'ماركة السيارة') }}</th>
            <th>{{ tr('Vehicle Name', 'اسم السيارة') }}</th>
            <th>{{ tr('Vehicle Model', 'سنة الموديل') }}</th>
            <th>{{ tr('Action', 'الإجراءات') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="center">{{ tr('Loading...', 'جاري التحميل...') }}</td>
          </tr>
          <tr v-for="r in !loading ? rows : []" :key="r.id">
            <td>{{ r.id }}</td>
            <td>
              <img v-if="imageUrl(r)" :src="imageUrl(r)" alt="" class="thumb" /><span v-else
                >—</span
              >
            </td>
            <td>{{ r.brand?.name || '—' }}</td>
            <td>{{ r.model?.name || '—' }}</td>
            <td>{{ r.model_year }}</td>
            <td class="actions">
              <button @click="goView(r)">◉ {{ tr('View', 'عرض') }}</button
              ><button @click="goEdit(r)">✎ {{ tr('Edit', 'تعديل') }}</button
              ><button class="danger" @click="openDelete(r)">
                <svg
                  class="trash-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 6h18M8 6V4h8v2M5 6l1 14h12l1-14M10 10v7M14 10v7" />
                </svg>
                {{ tr('Delete', 'حذف') }}
              </button>
            </td>
          </tr>
          <tr v-if="!loading && !error && !rows.length">
            <td colspan="6" class="center">{{ tr('No records found', 'لا توجد سجلات') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="pagination">
      <button class="page-arrow" :disabled="loading || page <= 1" @click="previousPage">‹</button>
      <template v-for="(p, i) in visiblePages(page, meta.last_page)" :key="`${p}-${i}`">
        <span v-if="p === '…'" class="page-ellipsis">…</span>
        <button
          v-else
          class="page-number"
          :class="{ active: p === page }"
          :disabled="loading"
          @click="page = p"
        >
          {{ p }}
        </button>
      </template>
      <button
        class="page-arrow"
        :disabled="loading || page >= (meta.last_page || 1)"
        @click="nextPage"
      >
        ›
      </button>
    </div>
    <div v-if="pendingDelete" class="backdrop" @click.self="closeDelete">
      <div class="modal" role="dialog" aria-modal="true">
        <h3>{{ tr('Delete rental pricing record?', 'حذف سجل تسعير التأجير؟') }}</h3>
        <p>
          {{
            tr(
              'This deletes pricing periods and their intervals and images. This cannot be undone.',
              'سيتم حذف فترات التسعير وشرائح الأسعار والصور ولا يمكن التراجع.',
            )
          }}
        </p>
        <p v-if="deleteError" class="error">{{ deleteError }}</p>
        <div class="modal-actions">
          <button :disabled="deleting" @click="closeDelete">{{ tr('Cancel', 'إلغاء') }}</button
          ><button class="danger-filled" :disabled="deleting" @click="deleteRecord">
            {{ deleting ? tr('Deleting...', 'جاري الحذف...') : tr('Delete', 'حذف') }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
<style scoped>
.cr-list {
  padding: 14px 12px;
  color: #092143;
}
.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 26px;
}
.top h2 {
  font-size: 24px;
  margin: 0;
  font-weight: 750;
}
.primary,
.danger-filled {
  border: 0;
  background: #639cc1;
  color: white;
  padding: 9px 23px;
  border-radius: 25px;
  cursor: pointer;
  font-weight: 600;
}
.toolbar {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-bottom: 12px;
}
.toolbar input,
.toolbar select {
  height: 30px;
  box-sizing: border-box;
  font-size: 12px;
  padding: 3px 9px;
  border: 1px solid #d5dde5;
  border-radius: 8px;
  background: white;
  color: #092143;
}
.toolbar input {
  min-width: 250px;
}
.table-wrap {
  overflow-x: auto;
  border: 1px solid #dbe0e6;
  border-radius: 12px;
  background: #fff;
}
table {
  width: 100%;
  border-collapse: collapse;
  min-width: 780px;
  font-size: 13px;
}
th {
  text-align: center;
  font-weight: 500;
  color: #9a9db3;
}
th,
td {
  padding: 15px 18px;
  border-bottom: 1px solid #e2e6eb;
}
tr:last-child td {
  border-bottom: 0;
}
.thumb {
  width: 70px;
  height: 46px;
  object-fit: cover;
  border-radius: 6px;
}
.actions {
  white-space: nowrap;
}
.actions button {
  border: 0;
  background: none;
  cursor: pointer;
  font-size: 12px;
  color: #142d4f;
  margin-inline-end: 12px;
  padding: 3px;
}
.actions .danger {
  color: #da1524;
}
.center {
  text-align: center;
  padding: 30px;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 15px;
}
.pagination button {
  background: white;
  border: 1px solid #d5dde5;
  border-radius: 7px;
  cursor: pointer;
  padding: 4px 10px;
}
.pagination button:disabled {
  opacity: 0.4;
}
.backdrop {
  position: fixed;
  inset: 0;
  background: #0006;
  display: grid;
  place-items: center;
  z-index: 999;
}
.modal {
  width: min(430px, 95vw);
  background: white;
  padding: 28px;
  border-radius: 15px;
  box-shadow: 0 10px 35px #0003;
}
.modal h3 {
  margin-top: 0;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 22px;
}
.modal-actions > button:first-child {
  background: white;
  border: 1px solid #dae0e5;
  padding: 9px 16px;
  border-radius: 22px;
  cursor: pointer;
}
.danger-filled {
  background: #d72335;
}
.error {
  color: #b91c1c;
}

/* Consistent Customer-section table layout; independent of page direction. */
.toolbar {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  column-gap: 14px;
  direction: ltr;
}
.toolbar .search-box,
.toolbar > input {
  grid-column: 1;
  grid-row: 1;
  justify-self: start;
}
.toolbar .per-page,
.toolbar > select {
  grid-column: 2;
  grid-row: 1;
  justify-self: center;
  margin: 0 !important;
}
.toolbar .btn-new,
.toolbar .primary {
  grid-column: 3;
  grid-row: 1;
  justify-self: end;
}
.toolbar .type-filter {
  grid-column: 3;
  grid-row: 1;
  justify-self: end;
}
.table-card th,
.table-card td,
.table-wrap th,
.table-wrap td,
.table-box th,
.table-box td {
  text-align: center !important;
}
.table-card td[dir='auto'],
.table-card td[dir='ltr'],
.table-wrap td[dir],
.table-box td[dir] {
  text-align: center !important;
}
.pagination {
  display: flex !important;
  direction: ltr;
  align-items: center;
  justify-content: center !important;
  gap: 7px !important;
  padding: 16px 0 !important;
  flex-wrap: wrap;
}
.pagination .page-number {
  width: 35px;
  height: 35px;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 50% !important;
  background: #f1f3f6;
  color: #142d4f;
  cursor: pointer;
}
.pagination .page-number.active {
  background: #3b82f6 !important;
  color: white !important;
}
.pagination .page-ellipsis {
  padding: 0 5px;
  color: #6b7280;
}
.pagination .page-arrow {
  border: 0 !important;
  background: transparent !important;
  padding: 6px 10px !important;
  cursor: pointer;
}
@media (max-width: 640px) {
  .toolbar {
    grid-template-columns: minmax(0, 1fr) auto !important;
    row-gap: 10px;
  }
  .toolbar .search-box,
  .toolbar > input {
    width: 100%;
    min-width: 0;
    grid-column: 1 / -1;
    grid-row: 1;
  }
  .toolbar .per-page,
  .toolbar > select {
    grid-column: 1;
    grid-row: 2;
    justify-self: start;
  }
  .toolbar .btn-new,
  .toolbar .primary,
  .toolbar .type-filter {
    grid-column: 2;
    grid-row: 2;
    justify-self: end;
  }
}
</style>

<style scoped>
.trash-icon {
  width: 14px;
  height: 14px;
  vertical-align: -2px;
  margin-inline-end: 3px;
}
</style>

<script setup>
import StandardTablePager from '@/modules/rent/components/StandardTablePager.vue'
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const router = useRouter()
const { locale } = useI18n()
const ar = computed(() => locale.value === 'ar')
const t = (en, arabic) => (ar.value ? arabic : en)
const rows = ref([])
const meta = ref({ current_page: 1, last_page: 1, total: 0 })
const search = ref('')
const status = ref('')
const perPage = ref(50)
const page = ref(1)
const loading = ref(false)
const error = ref('')
const target = ref(null)
const deleteError = ref('')
const deleting = ref(false)
const dialog = ref(null)
let debounce,
  sequence = 0

async function load() {
  const requestId = ++sequence
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/rent/drivers', {
      params: {
        search: search.value,
        per_page: perPage.value,
        page: page.value,
        ...(status.value ? { status: status.value } : {}),
      },
    })
    if (requestId !== sequence) return
    rows.value = data.data || []
    meta.value = data.meta || { current_page: 1, last_page: 1, total: 0 }
  } catch (e) {
    if (requestId === sequence)
      error.value =
        e.response?.data?.message || t('Failed to load drivers.', 'تعذر تحميل السائقين.')
  } finally {
    if (requestId === sequence) loading.value = false
  }
}
function resetPage() {
  if (page.value !== 1) page.value = 1
  else load()
}
watch(search, () => {
  clearTimeout(debounce)
  debounce = setTimeout(resetPage, 300)
})
watch([status, perPage], resetPage)
watch(page, load)
onMounted(() => {
  load()
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  ++sequence
  clearTimeout(debounce)
  document.removeEventListener('keydown', onKeydown)
})
function askDelete(row) {
  target.value = row
  deleteError.value = ''
  nextTick(() => dialog.value?.focus())
}
function closeDelete() {
  if (!deleting.value) {
    target.value = null
    deleteError.value = ''
  }
}
function onKeydown(e) {
  if (e.key === 'Escape') closeDelete()
}
async function confirmDelete() {
  if (!target.value || deleting.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await api.delete(`/rent/drivers/${target.value.id}`)
    target.value = null
    if (rows.value.length === 1 && page.value > 1) page.value -= 1
    else await load()
  } catch (e) {
    deleteError.value =
      e.response?.data?.message || t('Failed to delete driver.', 'تعذر حذف السائق.')
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
  <main class="drivers-page">
    <header class="heading">
      <h1>{{ t('Drivers', 'السائقون') }}</h1>
      <button class="primary" type="button" @click="router.push('/rent/drivers/create')">
        + {{ t('New Driver', 'إضافة سائق') }}
      </button>
    </header>
    <div class="toolbar ui-table-toolbar">
      <input
        v-model="search"
        :aria-label="t('Search', 'بحث')"
        :placeholder="
          t('Search name, license, phone, email...', 'ابحث بالاسم أو الرخصة أو الهاتف أو البريد...')
        "
      />
      <select v-model="status" :aria-label="t('Filter by status', 'تصفية حسب الحالة')">
        <option value="">{{ t('All statuses', 'جميع الحالات') }}</option>
        <option value="active">{{ t('Active', 'نشط') }}</option>
        <option value="inactive">{{ t('Inactive', 'غير نشط') }}</option>
      </select>
      <select v-model.number="perPage" :aria-label="t('Rows per page', 'عدد الصفوف')">
        <option v-for="size in [10, 15, 25, 50, 100]" :key="size" :value="size">
          {{ size }} {{ t('per page', 'لكل صفحة') }}
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
            <th>{{ t('Driver Name', 'اسم السائق') }}</th>
            <th>{{ t('License Number', 'رقم الرخصة') }}</th>
            <th>{{ t('Phone', 'الهاتف') }}</th>
            <th>{{ t('Email', 'البريد الإلكتروني') }}</th>
            <th>{{ t('Status', 'الحالة') }}</th>
            <th>{{ t('Actions', 'الإجراءات') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="empty">{{ t('Loading...', 'جار التحميل...') }}</td>
          </tr>
          <tr v-else-if="!rows.length">
            <td colspan="7" class="empty">{{ t('No drivers found.', 'لا يوجد سائقون.') }}</td>
          </tr>
          <tr v-for="row in loading ? [] : rows" :key="row.id">
            <td>{{ row.id }}</td>
            <td dir="auto">{{ row.name }}</td>
            <td dir="ltr">{{ row.license_number }}</td>
            <td dir="ltr">{{ row.phone || '—' }}</td>
            <td dir="ltr">{{ row.email || '—' }}</td>
            <td>
              <span class="status" :class="row.status ? 'active' : 'inactive'">{{
                row.status ? t('Active', 'نشط') : t('Inactive', 'غير نشط')
              }}</span>
            </td>
            <td>
              <div class="actions">
                <button
                  class="action-link"
                  type="button"
                  @click="router.push(`/rent/drivers/${row.id}`)"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" /></svg
                  >{{ t('View', 'عرض') }}
                </button>
                <button
                  class="action-link"
                  type="button"
                  @click="router.push(`/rent/drivers/${row.id}/edit`)"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path
                      d="M16.9 3.5a2.5 2.5 0 0 1 3.5 3.5l-1.4 1.4-3.5-3.5 1.4-1.4ZM14.4 6l3.5 3.5L8 19.4l-4.5 1 1-4.5L14.4 6Z"
                    /></svg
                  >{{ t('Edit', 'تعديل') }}
                </button>
                <button class="action-link delete-link" type="button" @click="askDelete(row)">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.9"
                    aria-hidden="true"
                  >
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
      <button :disabled="loading || page <= 1" @click="page--">{{ t('Previous', 'السابق') }}</button
      ><span dir="ltr">{{ meta.current_page }} / {{ meta.last_page }} · {{ meta.total }}</span
      ><button :disabled="loading || page >= meta.last_page" @click="page++">
        {{ t('Next', 'التالي') }}
      </button>
    </footer>
    <StandardTablePager
      :page="page"
      :last-page="meta.last_page"
      :disabled="loading"
      @change="uiTableGoToPage"
    />
    <div v-if="target" class="modal-backdrop" @click.self="closeDelete">
      <section
        ref="dialog"
        class="delete-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        tabindex="-1"
      >
        <button
          class="dialog-close"
          type="button"
          :disabled="deleting"
          :aria-label="t('Close', 'إغلاق')"
          @click="closeDelete"
        >
          ×
        </button>
        <h2 id="delete-title">{{ t('Delete driver?', 'حذف السائق؟') }}</h2>
        <p>
          {{ t('Are you sure you want to delete', 'هل تريد حذف') }}
          <strong>{{ target.name }}</strong
          >{{ ar ? '؟' : '?' }}
        </p>
        <p class="warning">
          {{ t('This action cannot be undone.', 'لا يمكن التراجع عن هذا الإجراء.') }}
        </p>
        <p v-if="deleteError" class="error" role="alert">{{ deleteError }}</p>
        <div class="dialog-actions">
          <button class="cancel-button" :disabled="deleting" @click="closeDelete">
            {{ t('Cancel', 'إلغاء') }}</button
          ><button class="confirm-button" :disabled="deleting" @click="confirmDelete">
            {{ deleting ? t('Deleting...', 'جار الحذف...') : t('Delete', 'حذف') }}
          </button>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.drivers-page {
  padding: 24px 28px;
  color: #15233b;
  font-family: 'Segoe UI', Arial, sans-serif;
}
.heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
}
h1 {
  font-size: 26px;
  margin: 0;
  font-weight: 700;
}
.primary {
  background: #609fc7;
  color: white;
  border: 0;
  border-radius: 24px;
  padding: 12px 24px;
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
  box-sizing: border-box;
  border: 1px solid #cfd8e5;
  border-radius: 9px;
  background: white;
  color: #34445c;
  height: 34px;
  padding: 5px 11px;
  font-size: 13px;
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
  border-collapse: collapse;
  width: 100%;
  min-width: 920px;
  font-size: 13px;
}
th {
  padding: 17px 12px;
  color: #98a6bf;
  font-weight: 600;
  border-bottom: 1px solid #e3e7ee;
  text-align: start;
}
td {
  padding: 15px 12px;
  border-bottom: 1px solid #e7eaf0;
  text-align: start;
}
tr:last-child td {
  border-bottom: 0;
}
.empty {
  text-align: center;
  padding: 32px;
  color: #8a98a8;
}
.status {
  border-radius: 30px;
  padding: 5px 10px;
  font-size: 12px;
}
.active {
  background: #e6f7ed;
  color: #168047;
}
.inactive {
  background: #fff0f0;
  color: #b63a3a;
}
.actions {
  display: flex;
  align-items: center;
  gap: 14px;
  white-space: nowrap;
}
.action-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #15233b;
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  font: inherit;
}
.action-link svg {
  width: 14px;
  height: 14px;
}
.action-link:hover {
  text-decoration: underline;
}
.delete-link svg {
  color: #d52230;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  padding: 22px;
  color: #7b8da7;
  font-size: 13px;
}
.pagination button {
  padding: 9px 16px;
  border: 1px solid #e3e7ee;
  background: white;
  border-radius: 9px;
  color: #8795aa;
  cursor: pointer;
}
.pagination button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.error {
  color: #cb2938;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: #0006;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
}
.delete-dialog {
  position: relative;
  width: min(440px, 100%);
  box-sizing: border-box;
  background: white;
  border-radius: 18px;
  padding: 30px;
  box-shadow: 0 20px 65px #0003;
  text-align: center;
  outline: none;
}
.dialog-close {
  position: absolute;
  top: 10px;
  inset-inline-end: 16px;
  background: none;
  border: 0;
  font-size: 24px;
  cursor: pointer;
}
.delete-dialog h2 {
  font-size: 20px;
}
.delete-dialog p {
  line-height: 1.6;
}
.warning {
  color: #8795aa;
  font-size: 13px;
}
.dialog-actions {
  display: flex;
  gap: 10px;
  margin-top: 25px;
}
.dialog-actions button {
  flex: 1;
  border-radius: 22px;
  padding: 12px;
  border: 0;
  cursor: pointer;
  font-weight: 600;
}
.cancel-button {
  background: #f1f4f7;
  color: #34445c;
}
.confirm-button {
  background: #db3544;
  color: white;
}
.dialog-actions button:disabled {
  opacity: 0.55;
  cursor: wait;
}
@media (max-width: 700px) {
  .drivers-page {
    padding: 15px;
  }
  .heading h1 {
    font-size: 21px;
  }
  .toolbar input {
    flex: 1;
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

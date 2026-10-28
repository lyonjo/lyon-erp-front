<script setup>
import StandardTablePager from '@/modules/rent/components/StandardTablePager.vue'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const { t, locale } = useI18n({
  useScope: 'local',
  inheritLocale: true,
  messages: {
    en: {
      title: 'Banks Management',
      subtitle: 'Manage company banks and their payment purposes.',
      add: 'Add Bank',
      search: 'Search bank or company...',
      id: 'ID',
      name: 'Bank Name',
      company: 'Company Name',
      paymentFor: 'Payment For',
      actions: 'Actions',
      edit: 'Edit',
      delete: 'Delete',
      empty: 'No banks found',
      none: 'None',
      loading: 'Loading banks...',
      previous: 'Previous',
      next: 'Next',
      records: 'records',
      perPage: '{n} per page',
      createTitle: 'Create Bank',
      editTitle: 'Edit Bank',
      bankName: 'Bank name',
      chooseCompany: 'Select a company',
      account: 'Account',
      accountUnavailable: 'No accounts available yet',
      purposes: 'Payment purposes',
      cancel: 'Cancel',
      save: 'Save',
      saving: 'Saving...',
      retry: 'Retry',
      confirmDelete: 'Delete bank "{name}"? This cannot be undone.',
      deleteFailed: 'Could not delete bank.',
      loadFailed: 'Could not load banks.',
      companiesFailed: 'Could not load companies. Please retry.',
      saveFailed: 'Could not save bank.',
      required: 'Please enter a bank name and select a company.',
      soldCar: 'Sold Cars',
      lawsuits: 'Lawsuits',
      companies: 'Companies',
      booking: 'Booking',
      contracts: 'Contracts',
      unavailable: '—',
    },
    ar: {
      title: 'إدارة البنوك',
      subtitle: 'إدارة البنوك المرتبطة بالشركات وأغراض الدفع الخاصة بها.',
      add: 'إضافة بنك',
      search: 'ابحث باسم البنك أو الشركة...',
      id: 'الرقم',
      name: 'اسم البنك',
      company: 'اسم الشركة',
      paymentFor: 'الدفع مقابل',
      actions: 'الإجراءات',
      edit: 'تعديل',
      delete: 'حذف',
      empty: 'لا توجد بنوك',
      none: 'لا يوجد',
      loading: 'جارٍ تحميل البنوك...',
      previous: 'السابق',
      next: 'التالي',
      records: 'سجل',
      perPage: '{n} لكل صفحة',
      createTitle: 'إضافة بنك',
      editTitle: 'تعديل البنك',
      bankName: 'اسم البنك',
      chooseCompany: 'اختر الشركة',
      account: 'الحساب',
      accountUnavailable: 'لا توجد حسابات متاحة حالياً',
      purposes: 'أغراض الدفع',
      cancel: 'إلغاء',
      save: 'حفظ',
      saving: 'جارٍ الحفظ...',
      retry: 'إعادة المحاولة',
      confirmDelete: 'هل تريد حذف البنك "{name}"؟ لا يمكن التراجع عن الحذف.',
      deleteFailed: 'تعذر حذف البنك.',
      loadFailed: 'تعذر تحميل البنوك.',
      companiesFailed: 'تعذر تحميل الشركات، حاول مرة أخرى.',
      saveFailed: 'تعذر حفظ البنك.',
      required: 'يرجى إدخال اسم البنك واختيار الشركة.',
      soldCar: 'السيارات المباعة',
      lawsuits: 'القضايا',
      companies: 'الشركات',
      booking: 'الحجوزات',
      contracts: 'العقود',
      unavailable: '—',
    },
  },
})

const purposeFields = [
  { key: 'for_sold_car', label: 'soldCar' },
  { key: 'for_lawsuits', label: 'lawsuits' },
  { key: 'for_companies', label: 'companies' },
  { key: 'for_booking', label: 'booking' },
  { key: 'for_contracts', label: 'contracts' },
]

const rows = ref([])
const companies = ref([])
const meta = ref({ current_page: 1, last_page: 1, per_page: 50, total: 0 })
const page = ref(1)
const perPage = ref(50)
const searchText = ref('')
const search = ref('')
const loading = ref(false)
const error = ref('')
const companyLoading = ref(false)
const companyError = ref('')
const isOpen = ref(false)
const editingId = ref(null)
const saving = ref(false)
const formError = ref('')
const fieldErrors = ref({})
const deletingId = ref(null)
let searchTimer = null
let requestCounter = 0

const isArabic = computed(() => locale.value === 'ar')
const isEditing = computed(() => editingId.value !== null)
const form = reactive(emptyForm())

function emptyForm() {
  return {
    name: '',
    company_id: '',
    account_id: null,
    for_sold_car: false,
    for_lawsuits: false,
    for_companies: false,
    for_booking: false,
    for_contracts: false,
  }
}

function paymentLabels(row) {
  return purposeFields.filter(({ key }) => Boolean(row[key])).map(({ label }) => t(label))
}

function readableError(exception, fallback) {
  if (exception?.response?.status === 422) return exception.response.data?.message || fallback
  return exception?.response?.data?.message || fallback
}

async function fetchBanks() {
  const id = ++requestCounter
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/rent/banks', {
      params: { page: page.value, per_page: perPage.value, search: search.value || undefined },
    })
    if (id !== requestCounter) return
    rows.value = Array.isArray(data.data) ? data.data : []
    meta.value = {
      current_page: Number(data.meta?.current_page || 1),
      last_page: Number(data.meta?.last_page || 1),
      per_page: Number(data.meta?.per_page || perPage.value),
      total: Number(data.meta?.total || 0),
    }
    if (page.value > meta.value.last_page) page.value = meta.value.last_page
  } catch (e) {
    if (id !== requestCounter) return
    error.value = readableError(e, t('loadFailed'))
  } finally {
    if (id === requestCounter) loading.value = false
  }
}

async function fetchCompanies() {
  companyLoading.value = true
  companyError.value = ''
  try {
    const { data } = await api.get('/rent/companies')
    companies.value = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []
  } catch (e) {
    companyError.value = readableError(e, t('companiesFailed'))
  } finally {
    companyLoading.value = false
  }
}

function openCreate() {
  editingId.value = null
  Object.assign(form, emptyForm())
  formError.value = ''
  fieldErrors.value = {}
  isOpen.value = true
  if (!companies.value.length) fetchCompanies()
}

function openEdit(bank) {
  editingId.value = bank.id
  Object.assign(
    form,
    emptyForm(),
    {
      name: bank.name,
      company_id: bank.company_id,
      account_id: bank.account_id,
    },
    Object.fromEntries(purposeFields.map(({ key }) => [key, Boolean(bank[key])])),
  )
  formError.value = ''
  fieldErrors.value = {}
  isOpen.value = true
  if (!companies.value.length) fetchCompanies()
}

function closeModal() {
  if (saving.value) return
  isOpen.value = false
}

async function saveBank() {
  if (saving.value) return
  fieldErrors.value = {}
  formError.value = ''
  if (!form.name.trim() || !form.company_id) {
    formError.value = t('required')
    return
  }
  saving.value = true
  const payload = {
    name: form.name.trim(),
    company_id: Number(form.company_id),
    ...Object.fromEntries(purposeFields.map(({ key }) => [key, Boolean(form[key])])),
    // account_id intentionally omitted: server preserves existing values on update.
  }
  try {
    if (isEditing.value) await api.put(`/rent/banks/${editingId.value}`, payload)
    else await api.post('/rent/banks', payload)
    isOpen.value = false
    if (page.value !== 1) page.value = 1
    else await fetchBanks()
  } catch (e) {
    fieldErrors.value = e.response?.data?.errors || {}
    formError.value = readableError(e, t('saveFailed'))
  } finally {
    saving.value = false
  }
}

async function deleteBank(bank) {
  if (deletingId.value || !window.confirm(t('confirmDelete', { name: bank.name }))) return
  deletingId.value = bank.id
  error.value = ''
  try {
    await api.delete(`/rent/banks/${bank.id}`)
    await fetchBanks()
  } catch (e) {
    error.value = readableError(e, t('deleteFailed'))
  } finally {
    deletingId.value = null
  }
}

function onEscape(event) {
  if (event.key === 'Escape' && isOpen.value) closeModal()
}

watch(searchText, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    search.value = value.trim()
  }, 350)
})
watch([search, perPage], () => {
  if (page.value !== 1) page.value = 1
  else fetchBanks()
})
watch(page, fetchBanks)
onMounted(() => {
  fetchBanks()
  fetchCompanies()
  document.addEventListener('keydown', onEscape)
})
onUnmounted(() => {
  clearTimeout(searchTimer)
  requestCounter++
  document.removeEventListener('keydown', onEscape)
})

function uiTableGoToPage(n) {
  if (n < 1 || n > Number(meta.last_page) || n === page.value) return
  page.value = n
}
</script>

<template>
  <section class="banks-page" :dir="isArabic ? 'rtl' : 'ltr'">
    <div class="heading">
      <div>
        <h1>{{ t('title') }}</h1>
        <p>{{ t('subtitle') }}</p>
      </div>
      <button class="btn-new" type="button" @click="openCreate">+ {{ t('add') }}</button>
    </div>

    <div class="toolbar ui-table-toolbar">
      <input
        v-model="searchText"
        class="search"
        type="search"
        :placeholder="t('search')"
        :aria-label="t('search')"
      />
      <select v-model.number="perPage" class="selector per-page" :aria-label="t('records')">
        <option v-for="size in [10, 15, 25, 50, 100]" :key="size" :value="size">
          {{ t('perPage', { n: size }) }}
        </option>
      </select>
    </div>

    <div v-if="error" class="alert" role="alert">
      {{ error }} <button type="button" @click="fetchBanks">{{ t('retry') }}</button>
    </div>
    <div class="table-card" :class="{ loading }" :aria-busy="loading">
      <div class="table-scroll">
        <table class="ui-standardized-table">
          <thead>
            <tr>
              <th>{{ t('id') }}</th>
              <th>{{ t('name') }}</th>
              <th>{{ t('company') }}</th>
              <th>{{ t('paymentFor') }}</th>
              <th>{{ t('actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="bank in rows" :key="bank.id">
              <td class="id-cell" dir="ltr">{{ bank.id }}</td>
              <td class="bank-name" dir="auto">{{ bank.name }}</td>
              <td dir="auto">{{ bank.company_name || t('unavailable') }}</td>
              <td>
                <div class="purpose-list">
                  <span
                    v-for="purpose in paymentLabels(bank)"
                    :key="purpose"
                    class="badge purpose-pill"
                    >{{ purpose }}</span
                  >
                  <span v-if="!paymentLabels(bank).length" class="muted">{{ t('none') }}</span>
                </div>
              </td>
              <td>
                <div class="actions">
                  <button class="action edit-button" type="button" @click="openEdit(bank)">
                    {{ t('edit') }}
                  </button>
                  <button
                    class="action delete-button"
                    type="button"
                    :disabled="deletingId === bank.id"
                    @click="deleteBank(bank)"
                  >
                    {{ t('delete') }}
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="loading && !rows.length">
              <td class="empty" colspan="5">{{ t('loading') }}</td>
            </tr>
            <tr v-else-if="!loading && !error && !rows.length">
              <td class="empty" colspan="5">{{ t('empty') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="ui-legacy-pager pagination">
      <button type="button" :disabled="loading || page <= 1" @click="page--">
        {{ t('previous') }}
      </button>
      <span
        ><bdi>{{ meta.current_page }} / {{ meta.last_page }}</bdi> · {{ meta.total }}
        {{ t('records') }}</span
      >
      <button type="button" :disabled="loading || page >= meta.last_page" @click="page++">
        {{ t('next') }}
      </button>
    </div>
    <StandardTablePager
      :page="page"
      :last-page="meta.last_page"
      :disabled="loading"
      @change="uiTableGoToPage"
    />

    <div v-if="isOpen" class="backdrop" @click.self="closeModal">
      <div
        class="dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="isEditing ? t('editTitle') : t('createTitle')"
      >
        <div class="dialog-heading">
          <h2>{{ isEditing ? t('editTitle') : t('createTitle') }}</h2>
          <button
            type="button"
            class="dismiss"
            :disabled="saving"
            :aria-label="t('cancel')"
            @click="closeModal"
          >
            ×
          </button>
        </div>
        <form @submit.prevent="saveBank">
          <div v-if="formError" class="alert" role="alert">{{ formError }}</div>
          <label class="field"
            ><span>{{ t('bankName') }} <em>*</em></span>
            <input v-model="form.name" maxlength="255" required type="text" autocomplete="off" />
            <small v-if="fieldErrors.name">{{ fieldErrors.name[0] }}</small>
          </label>
          <label class="field"
            ><span>{{ t('company') }} <em>*</em></span>
            <select v-model="form.company_id" required :disabled="companyLoading || !!companyError">
              <option value="" disabled>{{ t('chooseCompany') }}</option>
              <option v-for="company in companies" :key="company.id" :value="company.id">
                {{ company.name }}
              </option>
            </select>
            <small v-if="fieldErrors.company_id">{{ fieldErrors.company_id[0] }}</small>
          </label>
          <div v-if="companyError" class="alert" role="alert">
            {{ companyError }}
            <button type="button" @click="fetchCompanies">{{ t('retry') }}</button>
          </div>
          <label class="field"
            ><span>{{ t('account') }}</span>
            <select disabled :value="''">
              <option value="">{{ t('accountUnavailable') }}</option>
            </select>
          </label>
          <fieldset class="purposes">
            <legend>{{ t('purposes') }}</legend>
            <label v-for="purpose in purposeFields" :key="purpose.key" class="checkbox-row">
              <input v-model="form[purpose.key]" type="checkbox" />
              <span>{{ t(purpose.label) }}</span>
            </label>
          </fieldset>
          <div class="dialog-actions">
            <button type="button" class="secondary" :disabled="saving" @click="closeModal">
              {{ t('cancel') }}
            </button>
            <button
              class="submit"
              type="submit"
              :disabled="saving || companyLoading || !!companyError"
            >
              {{ saving ? t('saving') : t('save') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Match Customers / Customer Companies table and My Companies modal. */
.banks-page {
  padding: 8px 4px 40px;
  color: #1f2937;
  font-family: inherit;
}
.heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin: 0 0 28px;
  flex-wrap: wrap;
}
.heading h1 {
  font-size: 32px;
  font-weight: 600;
  line-height: 1.25;
  margin: 0;
  color: #1e2433;
}
.heading p {
  font-size: 13px;
  color: #6b7280;
  margin: 7px 0 0;
}
button,
input,
select {
  font: inherit;
}
button {
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-new,
.submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: #4f93b8;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-new {
  padding: 10px 22px;
  white-space: nowrap;
  box-shadow: 0 2px 5px #0001;
}
.btn-new:hover:not(:disabled),
.submit:hover:not(:disabled) {
  background: #3f83a8;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.search {
  width: 300px;
  max-width: 100%;
  height: 36px;
  box-sizing: border-box;
  border: 2px solid #9ca3af;
  border-radius: 8px;
  padding: 0 14px;
  background: #fff;
  font-size: 14px;
  color: #1f2937;
}
.search:focus-visible,
.selector:focus-visible,
.field input:focus-visible,
.field select:focus-visible {
  outline: 2px solid #5c9fc8;
  outline-offset: 2px;
}
.selector {
  height: 36px;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  padding: 0 12px;
  color: #6b7280;
  font-size: 14px;
}
.per-page {
  margin-inline-start: auto;
}
.table-card {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #fff;
  overflow: hidden;
}
.table-card.loading {
  opacity: 0.6;
}
.table-scroll {
  overflow-x: auto;
}
table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
}
th,
td {
  padding: 14px 16px;
  text-align: center;
  font-size: 14px;
  border-bottom: 1px solid #eef0f3;
}
thead th {
  color: #9ca3af;
  background: #fff;
  font-weight: 500;
  font-size: 13px;
}
tbody tr:last-child td {
  border-bottom: 0;
}
.bank-name {
  font-weight: 600;
  text-align: start;
}
.id-cell {
  font-variant-numeric: tabular-nums;
  color: #374151;
}
.purpose-list {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
}
.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  white-space: nowrap;
}
.purpose-pill {
  background: #e0f2fe;
  color: #2563eb;
}
.muted {
  color: #9ca3af;
}
.actions {
  display: flex;
  justify-content: center;
  gap: 14px;
  white-space: nowrap;
}
.action {
  border: 0;
  background: transparent;
  color: #111827;
  padding: 6px 2px;
  font-weight: 400;
  font-size: 14px;
}
.action:hover:not(:disabled) {
  color: #4f93b8;
}
.delete-button:hover:not(:disabled) {
  color: #dc2626;
}
.empty {
  padding: 32px;
  text-align: center;
  color: #6b7280;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px;
  color: #6b7280;
  font-size: 13px;
  flex-wrap: wrap;
}
.pagination button,
.secondary {
  padding: 8px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #374151;
}
.pagination button:hover:not(:disabled),
.secondary:hover:not(:disabled) {
  background: #f8fafc;
}
.alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding: 14px 18px;
  background: #fef2f2;
  color: #b91c1c;
  border-radius: 8px;
  font-size: 13px;
}
.alert button {
  padding: 7px 12px;
  border: 1px solid #dc2626;
  border-radius: 6px;
  background: #fff;
  color: #b91c1c;
}
/* Modal: same centered white dialog, close icon, fields and pill submit as My Companies. */
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(0, 0, 0, 0.46);
  display: grid;
  place-items: center;
  padding: 20px;
  overflow-y: auto;
}
.dialog {
  position: relative;
  width: min(100%, 512px);
  box-sizing: border-box;
  max-height: calc(100vh - 40px);
  overflow: auto;
  border-radius: 16px;
  background: #fff;
  padding: 20px 24px 24px;
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.18);
  color: #202936;
}
.dialog-heading {
  margin: 0 0 24px;
}
.dialog-heading h2 {
  margin: 0;
  text-align: center;
  font-size: 20px;
  font-weight: 650;
  padding-inline: 26px;
}
.dismiss {
  position: absolute;
  inset-inline-end: 15px;
  top: 10px;
  border: 0;
  background: transparent;
  color: #64748b;
  font-size: 25px;
  line-height: 1;
  cursor: pointer;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 17px;
  font-size: 13px;
  font-weight: 600;
}
.field input,
.field select {
  box-sizing: border-box;
  width: 100%;
  height: 40px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  background: #fff;
  padding: 0 16px;
  color: #202936;
  font-size: 14px;
}
.field select:disabled {
  background: #f8fafc;
  color: #94a3b8;
}
.field em {
  color: #dc2626;
  font-style: normal;
}
.field small {
  color: #b91c1c;
  font-size: 12px;
}
.purposes {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  margin: 4px 0 20px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  background: #fafbfc;
}
.purposes legend {
  padding: 0 6px;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}
.checkbox-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
}
.checkbox-row input {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
  accent-color: #5a9ec9;
}
.dialog-actions {
  display: flex;
  flex-direction: column-reverse;
  gap: 10px;
  margin-top: 8px;
}
.dialog-actions .submit {
  width: 100%;
  min-height: 40px;
  padding: 9px 18px;
}
.dialog-actions .secondary {
  width: 100%;
  height: 40px;
  border-radius: 999px;
}
@media (max-width: 650px) {
  .banks-page {
    padding: 8px 4px 32px;
  }
  .heading h1 {
    font-size: 25px;
  }
  .heading {
    margin-bottom: 24px;
  }
  .search {
    width: 100%;
    flex: 1 1 220px;
  }
  .per-page {
    margin-inline-start: 0;
  }
  .dialog {
    padding: 20px 18px 22px;
  }
  .purposes {
    grid-template-columns: 1fr;
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

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const { t, locale } = useI18n({
  useScope: 'local',
  inheritLocale: true,
  messages: {
    en: {
      title: 'Banks Management', subtitle: 'Manage company banks and their payment purposes.',
      add: 'Add Bank', search: 'Search bank or company...', id: 'ID', name: 'Bank Name',
      company: 'Company Name', paymentFor: 'Payment For', actions: 'Actions', edit: 'Edit',
      delete: 'Delete', empty: 'No banks found', none: 'None', loading: 'Loading banks...',
      previous: 'Previous', next: 'Next', records: 'records', perPage: '{n} per page',
      createTitle: 'Create Bank', editTitle: 'Edit Bank', bankName: 'Bank name',
      chooseCompany: 'Select a company', account: 'Account', accountUnavailable: 'No accounts available yet',
      purposes: 'Payment purposes', cancel: 'Cancel', save: 'Save', saving: 'Saving...',
      retry: 'Retry', confirmDelete: 'Delete bank "{name}"? This cannot be undone.',
      deleteFailed: 'Could not delete bank.', loadFailed: 'Could not load banks.',
      companiesFailed: 'Could not load companies. Please retry.', saveFailed: 'Could not save bank.',
      required: 'Please enter a bank name and select a company.',
      soldCar: 'Sold Cars', lawsuits: 'Lawsuits', companies: 'Companies', booking: 'Booking', contracts: 'Contracts',
      unavailable: '—',
    },
    ar: {
      title: 'إدارة البنوك', subtitle: 'إدارة البنوك المرتبطة بالشركات وأغراض الدفع الخاصة بها.',
      add: 'إضافة بنك', search: 'ابحث باسم البنك أو الشركة...', id: 'الرقم', name: 'اسم البنك',
      company: 'اسم الشركة', paymentFor: 'الدفع مقابل', actions: 'الإجراءات', edit: 'تعديل',
      delete: 'حذف', empty: 'لا توجد بنوك', none: 'لا يوجد', loading: 'جارٍ تحميل البنوك...',
      previous: 'السابق', next: 'التالي', records: 'سجل', perPage: '{n} لكل صفحة',
      createTitle: 'إضافة بنك', editTitle: 'تعديل البنك', bankName: 'اسم البنك',
      chooseCompany: 'اختر الشركة', account: 'الحساب', accountUnavailable: 'لا توجد حسابات متاحة حالياً',
      purposes: 'أغراض الدفع', cancel: 'إلغاء', save: 'حفظ', saving: 'جارٍ الحفظ...',
      retry: 'إعادة المحاولة', confirmDelete: 'هل تريد حذف البنك "{name}"؟ لا يمكن التراجع عن الحذف.',
      deleteFailed: 'تعذر حذف البنك.', loadFailed: 'تعذر تحميل البنوك.',
      companiesFailed: 'تعذر تحميل الشركات، حاول مرة أخرى.', saveFailed: 'تعذر حفظ البنك.',
      required: 'يرجى إدخال اسم البنك واختيار الشركة.',
      soldCar: 'السيارات المباعة', lawsuits: 'القضايا', companies: 'الشركات', booking: 'الحجوزات', contracts: 'العقود',
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
const meta = ref({ current_page: 1, last_page: 1, per_page: 15, total: 0 })
const page = ref(1)
const perPage = ref(15)
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
    name: '', company_id: '', account_id: null,
    for_sold_car: false, for_lawsuits: false, for_companies: false,
    for_booking: false, for_contracts: false,
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
    companies.value = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : [])
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
  Object.assign(form, emptyForm(), {
    name: bank.name,
    company_id: bank.company_id,
    account_id: bank.account_id,
  }, Object.fromEntries(purposeFields.map(({ key }) => [key, Boolean(bank[key])])))
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
    name: form.name.trim(), company_id: Number(form.company_id),
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
  searchTimer = setTimeout(() => { search.value = value.trim() }, 350)
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
</script>

<template>
  <section class="banks-page" :dir="isArabic ? 'rtl' : 'ltr'">
    <div class="heading">
      <div><h1>{{ t('title') }}</h1><p>{{ t('subtitle') }}</p></div>
      <button class="primary" type="button" @click="openCreate">+ {{ t('add') }}</button>
    </div>

    <div class="toolbar">
      <input v-model="searchText" class="search" type="search" :placeholder="t('search')" :aria-label="t('search')" />
      <select v-model.number="perPage" class="page-size" :aria-label="t('records')">
        <option v-for="size in [10, 15, 25, 50, 100]" :key="size" :value="size">{{ t('perPage', { n: size }) }}</option>
      </select>
    </div>

    <div v-if="error" class="alert" role="alert">{{ error }} <button type="button" @click="fetchBanks">{{ t('retry') }}</button></div>
    <div class="table-shell" :aria-busy="loading">
      <div class="table-scroll">
        <table>
          <thead><tr>
            <th>{{ t('id') }}</th><th>{{ t('name') }}</th><th>{{ t('company') }}</th>
            <th>{{ t('paymentFor') }}</th><th>{{ t('actions') }}</th>
          </tr></thead>
          <tbody>
            <tr v-for="bank in rows" :key="bank.id">
              <td class="id-cell" dir="ltr">{{ bank.id }}</td>
              <td class="bank-name" dir="auto">{{ bank.name }}</td>
              <td dir="auto">{{ bank.company_name || t('unavailable') }}</td>
              <td><div class="purpose-list">
                <span v-for="purpose in paymentLabels(bank)" :key="purpose" class="purpose-pill">{{ purpose }}</span>
                <span v-if="!paymentLabels(bank).length" class="muted">{{ t('none') }}</span>
              </div></td>
              <td><div class="actions">
                <button class="edit-button" type="button" @click="openEdit(bank)">{{ t('edit') }}</button>
                <button class="delete-button" type="button" :disabled="deletingId === bank.id" @click="deleteBank(bank)">{{ t('delete') }}</button>
              </div></td>
            </tr>
            <tr v-if="loading && !rows.length"><td class="empty" colspan="5">{{ t('loading') }}</td></tr>
            <tr v-else-if="!loading && !error && !rows.length"><td class="empty" colspan="5">{{ t('empty') }}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="pagination">
      <button type="button" :disabled="loading || page <= 1" @click="page--">{{ t('previous') }}</button>
      <span><bdi>{{ meta.current_page }} / {{ meta.last_page }}</bdi> · {{ meta.total }} {{ t('records') }}</span>
      <button type="button" :disabled="loading || page >= meta.last_page" @click="page++">{{ t('next') }}</button>
    </div>

    <div v-if="isOpen" class="modal-backdrop" @click.self="closeModal">
      <div class="modal" role="dialog" aria-modal="true" :aria-label="isEditing ? t('editTitle') : t('createTitle')">
        <div class="modal-top"><h2>{{ isEditing ? t('editTitle') : t('createTitle') }}</h2><button type="button" class="close" :disabled="saving" aria-label="Close" @click="closeModal">×</button></div>
        <form @submit.prevent="saveBank">
          <div v-if="formError" class="alert" role="alert">{{ formError }}</div>
          <label class="field"><span>{{ t('bankName') }} <em>*</em></span>
            <input v-model="form.name" maxlength="255" required type="text" autocomplete="off" />
            <small v-if="fieldErrors.name">{{ fieldErrors.name[0] }}</small>
          </label>
          <label class="field"><span>{{ t('company') }} <em>*</em></span>
            <select v-model="form.company_id" required :disabled="companyLoading || !!companyError">
              <option value="" disabled>{{ t('chooseCompany') }}</option>
              <option v-for="company in companies" :key="company.id" :value="company.id">{{ company.name }}</option>
            </select>
            <small v-if="fieldErrors.company_id">{{ fieldErrors.company_id[0] }}</small>
          </label>
          <div v-if="companyError" class="alert" role="alert">{{ companyError }} <button type="button" @click="fetchCompanies">{{ t('retry') }}</button></div>
          <label class="field"><span>{{ t('account') }}</span>
            <select disabled :value="''"><option value="">{{ t('accountUnavailable') }}</option></select>
          </label>
          <fieldset class="purposes"><legend>{{ t('purposes') }}</legend>
            <label v-for="purpose in purposeFields" :key="purpose.key" class="checkbox-row">
              <input v-model="form[purpose.key]" type="checkbox" />
              <span>{{ t(purpose.label) }}</span>
            </label>
          </fieldset>
          <div class="modal-actions">
            <button type="button" class="secondary" :disabled="saving" @click="closeModal">{{ t('cancel') }}</button>
            <button class="primary" type="submit" :disabled="saving || companyLoading || !!companyError">{{ saving ? t('saving') : t('save') }}</button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.banks-page{padding:24px;max-width:1500px;margin:0 auto;color:#263446;font-family:inherit}
.heading{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:24px;flex-wrap:wrap}
h1{font-size:27px;font-weight:750;letter-spacing:-.4px;margin:0 0 5px}
h2{font-size:20px;margin:0;font-weight:700}
p{margin:0;color:#77869a;font-size:14px}
button,input,select{font:inherit}button{cursor:pointer}button:disabled{opacity:.5;cursor:not-allowed}
.primary{background:#27658b;color:white;border:1px solid #27658b;border-radius:11px;padding:11px 18px;font-weight:650;white-space:nowrap}
.primary:hover:not(:disabled){background:#1d5579}
.toolbar{display:flex;align-items:center;gap:12px;margin-bottom:17px;flex-wrap:wrap}
.search{height:44px;padding:0 14px;flex:1;min-width:190px;max-width:420px;border-radius:11px;border:1px solid #d5e0e8;background:#fff;outline:0}
.search:focus,input:focus,select:focus{border-color:#5598c2;outline:2px solid #5598c233;outline-offset:0}
.page-size{height:44px;padding:0 12px;background:#fff;border:1px solid #d5e0e8;border-radius:11px;color:#32475a}
.table-shell{background:white;border:1px solid #e5edf3;border-radius:14px;box-shadow:0 5px 20px #283d5008;overflow:hidden}
.table-scroll{overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:790px;text-align:start}
th{background:#f3f7fa;color:#577187;font-size:12px;text-transform:uppercase;letter-spacing:.3px;font-weight:700}
th,td{padding:16px 18px;text-align:start;border-bottom:1px solid #edf2f6}tbody tr:last-child td{border-bottom:0}td{font-size:14px}
.id-cell{font-variant-numeric:tabular-nums;color:#6b7b8d}.bank-name{font-weight:700}
.purpose-list{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.purpose-pill{display:inline-flex;background:#eaf3f9;color:#2b678d;border:1px solid #d7e9f4;border-radius:999px;padding:4px 9px;font-size:12px;font-weight:600;white-space:nowrap}
.muted{color:#8794a5}.actions{display:flex;gap:8px;white-space:nowrap}
.actions button{padding:7px 12px;border-radius:8px;font-size:13px;font-weight:600}
.edit-button{background:#eaf3fa;color:#25668d;border:1px solid #d8e9f3}
.delete-button{background:#fff1f0;color:#ba3e37;border:1px solid #f2dad7}
.empty{padding:42px;text-align:center;color:#7f8c9c}
.pagination{display:flex;align-items:center;justify-content:flex-end;gap:14px;margin-top:18px;flex-wrap:wrap;color:#63778b;font-size:13px}
.pagination button,.secondary{border:1px solid #d5e0e8;background:white;color:#425971;border-radius:9px;padding:9px 14px}
.alert{padding:12px 15px;margin-bottom:14px;background:#fff0ef;border:1px solid #fad2d0;color:#a63c37;border-radius:10px;font-size:13px}
.alert button{border:0;background:transparent;text-decoration:underline;color:inherit}
.modal-backdrop{position:fixed;inset:0;z-index:10000;background:#162d408c;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto}
.modal{width:min(100%,560px);max-height:calc(100vh - 32px);overflow-y:auto;background:#fff;border-radius:17px;box-shadow:0 24px 70px #0c253e42;padding:24px}
.modal-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.close{border:0;background:#f0f4f7;color:#526779;border-radius:8px;width:33px;height:33px;font-size:22px}
.field{display:flex;flex-direction:column;gap:8px;margin-bottom:16px;font-size:13px;font-weight:650}
.field input,.field select{height:44px;border:1px solid #d5e0e8;border-radius:9px;background:#fff;padding:0 12px;color:#2d3e50}
.field select:disabled{background:#f3f6f9;color:#93a0ad}
.field em{color:#c64444;font-style:normal}.field small{color:#c64444}
.purposes{border:1px solid #e1e8ee;border-radius:11px;padding:15px;margin:4px 0 20px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}
.purposes legend{padding:0 5px;font-size:13px;font-weight:700;color:#40586d}
.checkbox-row{display:flex;gap:10px;align-items:center;font-size:13px;cursor:pointer}
.checkbox-row input{width:17px;height:17px;accent-color:#27658b;flex-shrink:0}
.modal-actions{display:flex;justify-content:flex-end;gap:10px}
@media(max-width:650px){.banks-page{padding:14px}.heading h1{font-size:22px}.modal{padding:18px}.purposes{grid-template-columns:1fr}.pagination{justify-content:center}}
</style>

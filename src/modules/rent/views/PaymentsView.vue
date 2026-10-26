<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const { locale } = useI18n()
const router = useRouter()
const ar = computed(() => locale.value.startsWith('ar'))
const tr = (en, arabic) => (ar.value ? arabic : en)
const tab = ref('payments')
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const success = ref('')
const rows = ref([])
const page = ref(1)
const lastPage = ref(1)
const total = ref(0)
const perPage = ref(15)
const search = ref('')
const paymentFor = ref('contract')
const refId = ref('')
const customerCompanySearch = ref('')
const customerCompanies = ref([])
const companyListOpen = ref(false)
const data = ref(null)
const banks = ref([])
const form = ref(blankForm())
const showDetails = ref(null)
const deleteTarget = ref(null)
const deleting = ref(false)
const reportTab = ref('box')
const report = ref({ from: '', to: '', company_id: '', user_id: '' })
const reportCompanies = ref([])
const reportEmployees = ref([])
const reportBusy = ref(false)
const reportNotice = ref('')
async function loadReportOptions() {
  reportBusy.value = true
  try {
    const r = await api.get('/rent/payments/report-options')
    reportCompanies.value = r.data.companies || []
    reportEmployees.value = r.data.employees || []
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    reportBusy.value = false
  }
}
function openNewPayment() {
  router.push('/rent/payments/new')
}
function editPayment(row) {
  router.push(`/rent/payments/${row.id}/edit`)
}
function askDelete(row) {
  deleteTarget.value = row
}
function cancelDelete() {
  if (!deleting.value) deleteTarget.value = null
}
async function confirmDelete() {
  if (!deleteTarget.value || deleting.value) return
  deleting.value = true
  error.value = ''
  success.value = ''
  try {
    await api.delete(`/rent/payments/${deleteTarget.value.id}`)
    deleteTarget.value = null
    success.value = tr('Payment deleted successfully.', 'تم حذف الدفعة بنجاح.')
    await loadPayments()
    if (page.value > lastPage.value) {
      page.value = lastPage.value
      await loadPayments()
    }
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    deleting.value = false
  }
}
function reportNotReady() {
  reportNotice.value = tr(
    'The report PDF will be implemented in the next phase.',
    'سيتم تنفيذ تقرير PDF في المرحلة القادمة.',
  )
}

function blankForm() {
  return {
    date: new Date().toLocaleDateString('en-CA'),
    payment_value: '',
    payment_type: 'cash',
    bank_id: '',
    is_bank_transferee: false,
    auth_number: '',
    credit_card_number: '',
    check_bank: '',
    check_no: '',
    check_due_date: '',
  }
}
const fmt = (n) => Number(n || 0).toFixed(2)
const money = (n) => `${fmt(n)} JOD`
const remaining = computed(() => Math.max(0, Number(data.value?.remaining || 0)))
const bankOptions = computed(() => banks.value || [])
const paymentMethods = [
  { value: 'cash', name: 'Cash', ar: 'نقداً' },
  { value: 'credit_card', name: 'Credit Card', ar: 'بطاقة ائتمان' },
  { value: 'check', name: 'Check', ar: 'شيك' },
]
const types = [
  { value: 'contract', name: 'Contracts', ar: 'العقود' },
  { value: 'booking', name: 'Booking', ar: 'الحجوزات' },
  { value: 'company', name: 'Companies', ar: 'شركات العملاء' },
  { value: 'lawsuits', name: 'Lawsuits', ar: 'القضايا' },
  { value: 'sold car', name: 'Sold Car', ar: 'السيارات المباعة' },
]
const readableType = (v) => types.find((x) => x.value === v)?.[ar.value ? 'ar' : 'name'] || v
function focusCompanyList() {
  companyListOpen.value = true
  loadCompanies()
}
function searchCompanyList() {
  companyListOpen.value = true
  refId.value = ''
  loadCompanies()
}
function chooseCompany(c) {
  refId.value = String(c.id)
  customerCompanySearch.value = c.name
  companyListOpen.value = false
  lookup()
}
function resetSource() {
  data.value = null
  refId.value = ''
  banks.value = []
  form.value = blankForm()
  error.value = ''
  success.value = ''
}
watch(paymentFor, resetSource)
watch(refId, () => {
  data.value = null
  banks.value = []
})
function goToTab(v) {
  tab.value = v
  error.value = ''
  success.value = ''
  if (v === 'payments') loadPayments()
  else loadReportOptions()
}
async function loadPayments() {
  loading.value = true
  error.value = ''
  try {
    const r = await api.get('/rent/payments', {
      params: { search: search.value, page: page.value, per_page: perPage.value },
    })
    const p = r.data
    rows.value = p.data || []
    lastPage.value = p.last_page || 1
    total.value = p.total || 0
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
function errorMessage(e) {
  const obj = e?.response?.data
  return (
    Object.values(obj?.errors || {})?.flat()?.[0] || obj?.message || e?.message || 'Request failed'
  )
}
async function loadCompanies() {
  try {
    const r = await api.get('/rent/payments/customer-companies', {
      params: { search: customerCompanySearch.value },
    })
    customerCompanies.value = r.data.data || []
  } catch (e) {
    error.value = errorMessage(e)
  }
}
async function loadBanks(companyId = null) {
  try {
    const r = await api.get('/rent/payments/banks', {
      params: { payment_for: paymentFor.value, ...(companyId ? { company_id: companyId } : {}) },
    })
    banks.value = r.data.data || []
    if (!banks.value.some((x) => String(x.id) === String(form.value.bank_id)))
      form.value.bank_id = ''
  } catch (e) {
    error.value = errorMessage(e)
  }
}
async function lookup() {
  if (!refId.value) return
  busy.value = true
  error.value = ''
  success.value = ''
  data.value = null
  try {
    const r = await api.get('/rent/payments/lookup', {
      params: { payment_for: paymentFor.value, reference_id: refId.value },
    })
    data.value = r.data.data
    await loadBanks(data.value.company_id)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}
async function save() {
  if (!data.value) return
  if (Number(form.value.payment_value) <= 0 || Number(form.value.payment_value) > remaining.value) {
    error.value = tr(
      'Enter a valid amount within the remaining balance.',
      'أدخل مبلغاً صحيحاً لا يتجاوز الرصيد المتبقي.',
    )
    return
  }
  busy.value = true
  error.value = ''
  success.value = ''
  try {
    const r = await api.post('/rent/payments', {
      payment_for: paymentFor.value,
      reference_id: Number(refId.value),
      ...form.value,
      payment_value: Number(form.value.payment_value),
    })
    success.value = tr('Payment saved successfully.', 'تم حفظ الدفعة بنجاح.')
    form.value = blankForm()
    await lookup()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}
function changePage(v) {
  if (v < 1 || v > lastPage.value) return
  page.value = v
  loadPayments()
}
watch([search, perPage], () => {
  page.value = 1
  loadPayments()
})
onMounted(loadPayments)
</script>

<template>
  <main class="pay-page" :dir="ar ? 'rtl' : 'ltr'">
    <h2>{{ tr('Payments', 'المدفوعات') }}</h2>
    <section class="pay-card">
      <div class="pay-tabs">
        <button :class="{ active: tab === 'payments' }" @click="goToTab('payments')">
          {{ tr('Payments', 'المدفوعات') }}</button
        ><button :class="{ active: tab === 'entry' }" @click="goToTab('entry')">
          {{ tr('Payment Box', 'صندوق الدفع') }}
        </button>
      </div>
      <p v-if="error" class="pay-error">{{ error }}</p>
      <p v-if="success" class="pay-success">{{ success }}</p>
      <template v-if="tab === 'payments'">
        <div class="pay-toolbar">
          <input
            v-model="search"
            :placeholder="tr('Search payments...', 'بحث في المدفوعات...')"
          /><select v-model.number="perPage">
            <option :value="15">15</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
        </div>
        <div class="pay-overflow">
          <table class="pay-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>{{ tr('Reference', 'المرجع') }}</th>
                <th>{{ tr('Customer / Company', 'العميل / الشركة') }}</th>
                <th>{{ tr('Payment For', 'الدفع مقابل') }}</th>
                <th>{{ tr('Payment Value', 'المبلغ') }}</th>
                <th>{{ tr('Bank', 'البنك') }}</th>
                <th>{{ tr('User', 'المستخدم') }}</th>
                <th>{{ tr('Actions', 'الإجراءات') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="8" class="pay-empty">{{ tr('Loading...', 'جاري التحميل...') }}</td>
              </tr>
              <tr v-else-if="!rows.length">
                <td colspan="8" class="pay-empty">
                  {{ tr('No payments found.', 'لا توجد مدفوعات.') }}
                </td>
              </tr>
              <tr v-else v-for="p in rows" :key="p.id">
                <td>{{ p.id }}</td>
                <td>
                  {{
                    p.contract_id
                      ? `C-${p.contract_id}`
                      : p.booking_id
                        ? `B-${p.booking_id}`
                        : p.sold_car_id
                          ? `S-${p.sold_car_id}`
                          : p.customer_company_id
                            ? `CO-${p.customer_company_id}`
                            : '—'
                  }}
                </td>
                <td>
                  {{
                    p.customer_name ||
                    p.sold_car_customer_name ||
                    p.customer?.name ||
                    p.customer_company?.name ||
                    '—'
                  }}
                </td>
                <td>{{ readableType(p.payment_for) }}</td>
                <td>{{ money(p.company_value) }}</td>
                <td>{{ p.bank?.name || '—' }}</td>
                <td>{{ p.user_name || '—' }}</td>
                <td>
                  <div class="pay-actions">
                    <button type="button" class="pay-action" @click="showDetails = p">
                      ◉ {{ tr('Details', 'تفاصيل') }}</button
                    ><button type="button" class="pay-action" @click="editPayment(p)">
                      ✎ {{ tr('Edit', 'تعديل') }}</button
                    ><button type="button" class="pay-action pay-danger" @click="askDelete(p)">
                      ▤ {{ tr('Delete', 'حذف') }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pay-footer">
          <span>{{ total }} {{ tr('records', 'سجل') }}</span>
          <div>
            <button @click="changePage(page - 1)" :disabled="page === 1">‹</button> {{ page }} /
            {{ lastPage }}
            <button @click="changePage(page + 1)" :disabled="page === lastPage">›</button>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="report-box">
          <div class="report-heading">
            <button class="pay-blue" @click="openNewPayment">
              + {{ tr('New Payment', 'دفعة جديدة') }}
            </button>
          </div>
          <div class="report-tabs">
            <button
              type="button"
              :class="{ active: reportTab === 'box' }"
              @click="reportTab = 'box'"
            >
              {{ tr('Payment Box', 'صندوق الدفع') }}</button
            ><button
              type="button"
              :class="{ active: reportTab === 'daily' }"
              @click="reportTab = 'daily'"
            >
              {{ tr('Daily Report', 'التقرير اليومي') }}
            </button>
          </div>
          <div class="report-form">
            <div class="pay-grid">
              <div class="pay-field">
                <label>{{ tr('From', 'من') }}</label
                ><input v-model="report.from" type="date" />
              </div>
              <div class="pay-field">
                <label>{{ tr('To', 'إلى') }}</label
                ><input v-model="report.to" type="date" :min="report.from || undefined" />
              </div>
              <div class="pay-field">
                <label>{{ tr('Company', 'الشركة') }}</label
                ><select v-model="report.company_id">
                  <option value="">{{ tr('Select company', 'اختر الشركة') }}</option>
                  <option v-for="c in reportCompanies" :key="c.id" :value="String(c.id)">
                    {{ c.name }}
                  </option>
                </select>
              </div>
              <div class="pay-field">
                <label>{{ tr('Employee', 'الموظف') }}</label
                ><select v-model="report.user_id">
                  <option value="">{{ tr('All', 'الكل') }}</option>
                  <option v-for="e in reportEmployees" :key="e.id" :value="String(e.id)">
                    {{ e.name }}
                  </option>
                </select>
              </div>
            </div>
            <button type="button" class="report-submit" @click="reportNotReady">
              {{ tr('View Report', 'عرض التقرير') }}
            </button>
            <p v-if="reportNotice" class="report-notice">{{ reportNotice }}</p>
          </div>
        </div>
      </template>
    </section>
    <div v-if="showDetails" class="pay-modal" @click.self="showDetails = null">
      <section>
        <div class="pay-modal-header">
          <h3>{{ tr('Payment Details', 'تفاصيل الدفعة') }} #{{ showDetails.id }}</h3>
          <button @click="showDetails = null">×</button>
        </div>
        <p>{{ readableType(showDetails.payment_for) }} — {{ money(showDetails.company_value) }}</p>
        <p>{{ tr('Date', 'التاريخ') }}: {{ String(showDetails.date || '').slice(0, 10) }}</p>
        <p>{{ tr('Payment method', 'طريقة الدفع') }}: {{ showDetails.payment_type }}</p>
        <p>{{ tr('Bank', 'البنك') }}: {{ showDetails.bank?.name || '—' }}</p>
        <button class="pay-blue" @click="showDetails = null">{{ tr('Close', 'إغلاق') }}</button>
      </section>
    </div>
    <div v-if="deleteTarget" class="pay-modal" @click.self="cancelDelete">
      <section>
        <div class="pay-modal-header">
          <h3>{{ tr('Delete Payment', 'حذف الدفعة') }} #{{ deleteTarget.id }}</h3>
          <button type="button" @click="cancelDelete">×</button>
        </div>
        <p>
          {{
            tr(
              'Are you sure you want to delete this payment? This will change the outstanding balance.',
              'هل أنت متأكد من حذف هذه الدفعة؟ سيؤثر الحذف على المبلغ المتبقي.',
            )
          }}
        </p>
        <div class="pay-delete-footer">
          <button type="button" class="pay-cancel" :disabled="deleting" @click="cancelDelete">
            {{ tr('Cancel', 'إلغاء') }}</button
          ><button
            type="button"
            class="pay-delete-confirm"
            :disabled="deleting"
            @click="confirmDelete"
          >
            {{ deleting ? tr('Deleting...', 'جارٍ الحذف...') : tr('Delete', 'حذف') }}
          </button>
        </div>
      </section>
    </div>
  </main>
</template>
<style scoped>
.pay-page {
  padding: 24px 18px;
  color: #0a2544;
}
.pay-page h2 {
  font-size: 24px;
  margin: 0 0 28px;
}
.pay-card {
  border: 1px solid #d6dfe9;
  border-radius: 16px;
  background: white;
  overflow: hidden;
}
.pay-tabs {
  display: flex;
  gap: 48px;
  justify-content: center;
  padding: 30px;
}
.pay-tabs button {
  border: 0;
  background: none;
  color: #94a3b8;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}
.pay-tabs button.active {
  color: #0b2340;
}
.pay-toolbar {
  padding: 12px 22px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.pay-toolbar input {
  width: 255px;
  max-width: 70%;
  height: 34px;
}
.pay-toolbar select {
  height: 34px;
  width: 130px;
}
.pay-page input,
.pay-page select {
  border: 1px solid #cfdae6;
  border-radius: 9px;
  padding: 7px 12px;
  box-sizing: border-box;
  background: #fff;
  color: #102e4d;
  font-family: inherit;
}
.pay-table {
  border-collapse: collapse;
  width: 100%;
  min-width: 950px;
}
.pay-overflow {
  overflow-x: auto;
}
.pay-table th {
  background: #fafcff;
  color: #8a9bb0;
  text-align: start;
  font-size: 12px;
  font-weight: 500;
}
.pay-table th,
.pay-table td {
  padding: 13px;
  border-top: 1px solid #dce5ef;
  font-size: 13px;
}
.pay-table tr:hover td {
  background: #fafcfe;
}
.pay-action {
  border: 0;
  background: none;
  font-size: 13px;
  cursor: pointer;
  color: #14517c;
}
.pay-empty {
  text-align: center !important;
  padding: 24px !important;
}
.pay-footer {
  padding: 16px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #64748b;
}
.pay-footer button {
  padding: 4px 10px;
  border: 1px solid #e1e7ed;
  border-radius: 8px;
  background: white;
  cursor: pointer;
}
.pay-footer button:disabled {
  opacity: 0.35;
}
.pay-form {
  max-width: 760px;
  margin: auto;
  padding: 12px 20px 36px;
}
.pay-types {
  display: flex;
  justify-content: center;
  gap: 22px;
  flex-wrap: wrap;
  margin: 12px 0 35px;
  font-size: 13px;
}
.pay-types label {
  white-space: nowrap;
  cursor: pointer;
}
.pay-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}
.pay-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 16px;
}
.pay-field label {
  font-weight: 600;
  font-size: 13px;
}
.pay-field input,
.pay-field select {
  width: 100%;
  min-height: 37px;
}
.pay-field input[readonly] {
  background: #f5f8fb;
}
.pay-field small {
  color: #b15c15;
}
.pay-form h3 {
  font-size: 15px;
  margin: 14px 0 25px;
}
.pay-inline {
  display: flex;
  gap: 6px;
}
.pay-inline button,
.pay-submit button,
.pay-blue {
  border: 0;
  border-radius: 20px;
  background: #629fc4;
  color: #fff;
  padding: 7px 26px;
  cursor: pointer;
}
.pay-submit {
  text-align: end;
  margin-top: 20px;
}
.pay-submit button:disabled {
  opacity: 0.5;
}
.pay-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 20px;
  font-size: 13px;
}
.pay-note {
  padding: 32px;
  text-align: center;
  color: #64748b;
}
.pay-error,
.pay-success {
  padding: 10px 20px;
  border-radius: 8px;
  margin: 0 22px 12px;
  font-size: 13px;
}
.pay-error {
  background: #fff0f0;
  color: #ac2222;
}
.pay-success {
  background: #edfff1;
  color: #15803d;
}
.pay-modal {
  position: fixed;
  inset: 0;
  background: #0006;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.pay-modal section {
  width: min(450px, 90vw);
  background: white;
  padding: 24px;
  border-radius: 15px;
}
.pay-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pay-modal-header button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
}
@media (max-width: 700px) {
  .pay-grid {
    grid-template-columns: 1fr;
  }
  .pay-toolbar {
    padding: 12px;
  }
  .pay-form {
    padding: 12px;
  }
  .pay-page {
    padding: 15px;
  }
}
</style>

<style scoped>
.pay-options {
  border: 1px solid #ced8e3;
  border-radius: 8px;
  max-height: 170px;
  overflow-y: auto;
  background: white;
}
.pay-options button {
  display: block;
  width: 100%;
  padding: 9px 12px;
  text-align: start;
  background: white;
  border: 0;
  cursor: pointer;
}
.pay-options button:hover {
  background: #eff6ff;
}
</style>

<style scoped>
.report-box {
  border: 1px solid #d6dfe9;
  border-radius: 16px;
  margin: 8px 24px 24px;
  padding: 18px 32px 34px;
  position: relative;
}
.report-heading {
  display: flex;
  justify-content: flex-end;
  min-height: 34px;
}
.report-tabs {
  display: flex;
  justify-content: center;
  gap: 36px;
  margin: 8px 0 32px;
}
.report-tabs button {
  background: none;
  border: 0;
  color: #a2aec0;
  font-weight: 700;
  cursor: pointer;
  font-size: 15px;
}
.report-tabs button.active {
  color: #0b2340;
}
.report-form {
  max-width: 780px;
  margin: auto;
}
.report-submit {
  width: 100%;
  border: 0;
  border-radius: 22px;
  background: #629fc4;
  color: white;
  padding: 10px 20px;
  cursor: pointer;
  font-weight: 700;
  margin-top: 6px;
}
.report-submit:hover {
  background: #4d8fb7;
}
.report-notice {
  text-align: center;
  color: #64748b;
  font-size: 13px;
  margin-top: 15px;
}
@media (max-width: 650px) {
  .report-box {
    margin: 8px 10px 18px;
    padding: 18px;
  }
  .report-heading {
    justify-content: center;
  }
}
</style>

<style scoped>
.pay-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
  flex-wrap: wrap;
}
.pay-actions .pay-action {
  padding: 0;
  color: #122d4a;
}
.pay-actions .pay-danger {
  color: #c92336;
}
.pay-delete-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}
.pay-delete-footer button {
  padding: 8px 19px;
  border-radius: 18px;
  cursor: pointer;
}
.pay-cancel {
  border: 1px solid #ced9e6;
  background: #fff;
}
.pay-delete-confirm {
  border: 0;
  background: #cb293b;
  color: #fff;
}
.pay-delete-footer button:disabled {
  opacity: 0.5;
}
</style>

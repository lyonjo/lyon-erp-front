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
  { value: 'bank_transfer', name: 'Bank Transfer', ar: 'حوالة بنكية' },
  { value: 'smart_link', name: 'Smart Link', ar: 'رابط دفع ذكي' },
  { value: 'online', name: 'Online', ar: 'دفع إلكتروني' },
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
  else if (paymentFor.value === 'company') loadCompanies()
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
    <div class="new-header">
      <h2>{{ tr('New Payment', 'دفعة جديدة') }}</h2>
      <button type="button" class="pay-back" @click="router.push('/rent/payments')">
        {{ tr('Back to Payments', 'العودة للمدفوعات') }}
      </button>
    </div>
    <section class="pay-card">
      <p v-if="error" class="pay-error">{{ error }}</p>
      <p v-if="success" class="pay-success">{{ success }}</p>
      <div class="pay-form">
        <div class="pay-types">
          <label v-for="t in types" :key="t.value"
            ><input type="radio" v-model="paymentFor" :value="t.value" />
            {{ ar ? t.ar : t.name }}</label
          >
        </div>
        <div v-if="paymentFor === 'lawsuits'" class="pay-note">
          {{ tr('Lawsuit payments are under development.', 'مدفوعات القضايا قيد التطوير.') }}
        </div>
        <template v-else>
          <div class="pay-grid">
            <div class="pay-field" v-if="paymentFor !== 'company'">
              <label
                >{{
                  paymentFor === 'contract'
                    ? tr('Contract ID', 'رقم العقد')
                    : paymentFor === 'booking'
                      ? tr('Booking ID', 'رقم الحجز')
                      : tr('Sold Car ID', 'رقم السيارة المباعة')
                }}
                *</label
              >
              <div class="pay-inline">
                <input v-model="refId" inputmode="numeric" type="number" min="1" /><button
                  @click="lookup"
                  :disabled="busy || !refId"
                >
                  {{ tr('Load', 'عرض') }}
                </button>
              </div>
            </div>
            <div class="pay-field" v-else>
              <label>{{ tr('Customer Company', 'شركة العميل') }} *</label
              ><input
                v-model="customerCompanySearch"
                :placeholder="tr('Search and select company...', 'بحث واختيار الشركة...')"
                @focus="focusCompanyList"
                @input="searchCompanyList"
              />
              <div v-if="companyListOpen" class="pay-options">
                <button
                  type="button"
                  v-for="c in customerCompanies"
                  :key="c.id"
                  @click="chooseCompany(c)"
                >
                  {{ c.name }}
                </button>
              </div>
            </div>
            <div class="pay-field">
              <label>{{ tr('Date', 'التاريخ') }} *</label><input v-model="form.date" type="date" />
            </div>
          </div>
          <template v-if="data">
            <div class="pay-field">
              <label>{{ tr('Customer / Company Name', 'اسم العميل / الشركة') }}</label
              ><input :value="data.name" readonly />
            </div>
            <div class="pay-field">
              <label>{{
                tr('Contract / Booking / Sale Value', 'قيمة العقد / الحجز / البيع')
              }}</label
              ><input :value="money(data.total_value)" readonly />
            </div>
            <div class="pay-field">
              <label>{{ tr('Remaining Amount', 'المبلغ المتبقي') }}</label
              ><input :value="money(remaining)" readonly />
            </div>
            <h3>{{ tr('Payment Details', 'تفاصيل الدفع') }}</h3>
            <div class="pay-grid">
              <div class="pay-field">
                <label>{{ tr('Payment Value', 'قيمة الدفعة') }} *</label
                ><input v-model="form.payment_value" type="number" min="0.01" step="0.01" />
              </div>
              <div class="pay-field">
                <label>{{ tr('Payment Method', 'طريقة الدفع') }} *</label
                ><select v-model="form.payment_type">
                  <option v-for="x in paymentMethods" :key="x.value" :value="x.value">
                    {{ ar ? x.ar : x.name }}
                  </option>
                </select>
              </div>
            </div>
            <div class="pay-field">
              <label>{{ tr('Bank', 'البنك') }} *</label
              ><select v-model="form.bank_id">
                <option value="">{{ tr('Select Bank', 'اختر البنك') }}</option>
                <option v-for="bank in bankOptions" :key="bank.id" :value="String(bank.id)">
                  {{ bank.name }}
                </option></select
              ><small v-if="!banks.length">{{
                tr(
                  'No eligible banks. Configure the Banks module first.',
                  'لا توجد بنوك مؤهلة؛ يرجى ضبط صفحة البنوك أولاً.',
                )
              }}</small>
            </div>
            <div v-if="form.payment_type === 'credit_card'" class="pay-grid">
              <div class="pay-field">
                <label>{{ tr('Authorization Number', 'رقم التفويض') }} *</label
                ><input v-model="form.auth_number" />
              </div>
              <div class="pay-field">
                <label>{{ tr('Credit Card Number', 'رقم بطاقة الائتمان') }} *</label
                ><input v-model="form.credit_card_number" />
              </div>
            </div>
            <div v-if="form.payment_type === 'check'" class="pay-grid">
              <div class="pay-field">
                <label>{{ tr('Check Bank', 'بنك الشيك') }} *</label
                ><input v-model="form.check_bank" />
              </div>
              <div class="pay-field">
                <label>{{ tr('Check Number', 'رقم الشيك') }} *</label
                ><input v-model="form.check_no" />
              </div>
              <div class="pay-field">
                <label>{{ tr('Check Due Date', 'تاريخ استحقاق الشيك') }} *</label
                ><input v-model="form.check_due_date" type="date" />
              </div>
            </div>
            <label class="pay-checkbox"
              ><input v-model="form.is_bank_transferee" type="checkbox" />
              {{ tr('Transferred to bank', 'محول إلى البنك') }}</label
            >
            <div class="pay-field">
              <label>{{ tr('Total Paid So Far', 'إجمالي المدفوعات السابقة') }}</label
              ><input :value="money(data.paid)" readonly />
            </div>
            <div class="pay-submit">
              <button @click="save" :disabled="busy || remaining <= 0 || !form.bank_id">
                {{ busy ? tr('Saving...', 'جاري الحفظ...') : tr('Save Payment', 'حفظ الدفعة') }}
              </button>
            </div>
          </template>
        </template>
      </div>
    </section>
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
.new-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.pay-back {
  background: white;
  border: 1px solid #ccdae7;
  border-radius: 22px;
  padding: 9px 18px;
  cursor: pointer;
  color: #193653;
  font-weight: 600;
}
.pay-back:hover {
  background: #eef6fc;
}
</style>

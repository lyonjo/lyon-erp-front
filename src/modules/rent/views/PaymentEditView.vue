<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const route = useRoute()
const router = useRouter()
const { locale } = useI18n()
const ar = computed(() => locale.value.startsWith('ar'))
const tr = (en, arabic) => (ar.value ? arabic : en)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const payment = ref(null)
const banks = ref([])
const balance = ref(null)
const form = ref({
  date: '',
  payment_value: '',
  payment_type: 'cash',
  bank_id: '',
  is_bank_transferee: false,
  auth_number: '',
  credit_card_number: '',
  check_bank: '',
  check_no: '',
  check_due_date: '',
})
const paymentMethods = [
  { value: 'cash', name: 'Cash', ar: 'نقداً' },
  { value: 'credit_card', name: 'Credit Card', ar: 'بطاقة ائتمان' },
  { value: 'check', name: 'Check', ar: 'شيك' },
  { value: 'bank_transfer', name: 'Bank Transfer', ar: 'حوالة بنكية' },
  { value: 'smart_link', name: 'Smart Link', ar: 'رابط دفع ذكي' },
  { value: 'online', name: 'Online', ar: 'دفع إلكتروني' },
]
const types = {
  contract: ['Contracts', 'العقود'],
  booking: ['Booking', 'الحجوزات'],
  company: ['Companies', 'شركات العملاء'],
  'sold car': ['Sold Car', 'السيارات المباعة'],
}
const readableType = computed(
  () =>
    (types[payment.value?.payment_for] || [
      payment.value?.payment_for || '',
      payment.value?.payment_for || '',
    ])[ar.value ? 1 : 0],
)
const reference = computed(() => {
  const p = payment.value
  if (!p) return ''
  return p.payment_for === 'contract'
    ? p.contract_id
    : p.payment_for === 'booking'
      ? p.booking_id
      : p.payment_for === 'company'
        ? p.customer_company_id
        : p.sold_car_id
})
const name = computed(
  () =>
    payment.value?.customer_name ||
    payment.value?.sold_car_customer_name ||
    payment.value?.customer?.name ||
    payment.value?.customer_company?.name ||
    '—',
)
const maxValue = computed(() =>
  Math.max(
    0,
    Number(payment.value?.editable_remaining ?? balance.value?.remaining ?? 0) +
      Number(payment.value?.company_value || 0),
  ),
)
const fmt = (n) => Number(n || 0).toFixed(2)
function errorMessage(e) {
  const d = e?.response?.data
  return Object.values(d?.errors || {}).flat()[0] || d?.message || e.message || 'Request failed'
}
function back() {
  router.push('/rent/payments')
}
async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await api.get(`/rent/payments/${route.params.id}`)
    const p = response.data.data
    payment.value = p
    form.value = {
      date: String(p.date || '').slice(0, 10),
      payment_value: String(p.company_value ?? p.payment_value ?? ''),
      payment_type: p.payment_type,
      bank_id: String(p.bank_id || ''),
      is_bank_transferee: Boolean(p.is_bank_transferee),
      auth_number: p.auth_number || '',
      credit_card_number: p.credit_card_number || '',
      check_bank: p.check_bank || '',
      check_no: p.check_no || '',
      check_due_date: String(p.check_due_date || '').slice(0, 10),
    }
    const referenceId = reference.value
    const isCompanyAllocation =
      p.customer_company_id && ['booking', 'contract'].includes(p.payment_for)
    const bankResponse = await api.get('/rent/payments/banks', {
      params: { payment_for: isCompanyAllocation ? 'company' : p.payment_for },
    })
    banks.value = bankResponse.data.data || []
    if (!isCompanyAllocation) {
      const balanceResponse = await api.get('/rent/payments/lookup', {
        params: { payment_for: p.payment_for, reference_id: referenceId },
      })
      balance.value = balanceResponse.data.data
    }
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
async function save() {
  if (!payment.value || saving.value) return
  error.value = ''
  const value = Number(form.value.payment_value)
  if (!Number.isFinite(value) || value <= 0 || value > maxValue.value + 0.00001) {
    error.value = tr(
      'Enter an amount greater than zero and no more than the remaining balance plus this payment.',
      'أدخل مبلغاً أكبر من صفر ولا يتجاوز الرصيد المتبقي مضافاً إليه هذه الدفعة.',
    )
    return
  }
  saving.value = true
  try {
    await api.put(`/rent/payments/${payment.value.id}`, {
      ...form.value,
      payment_value: value,
      bank_id: Number(form.value.bank_id),
    })
    back()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}
onMounted(load)
</script>

<template>
  <main class="payment-edit" :dir="ar ? 'rtl' : 'ltr'">
    <header class="edit-header">
      <h2>
        {{ tr('Edit Payment', 'تعديل الدفعة') }} <small v-if="payment">#{{ payment.id }}</small>
      </h2>
      <button type="button" class="back-btn" @click="back">
        {{ tr('Back to Payments', 'العودة إلى المدفوعات') }}
      </button>
    </header>
    <div v-if="loading" class="edit-card msg">
      {{ tr('Loading payment...', 'جارٍ تحميل الدفعة...') }}
    </div>
    <section v-else class="edit-card">
      <div v-if="error" role="alert" class="error">{{ error }}</div>
      <template v-if="payment">
        <div class="readonly-heading">
          {{ tr('Payment Reference — cannot be changed', 'مرجع الدفعة — لا يمكن تغييره') }}
        </div>
        <div class="grid">
          <div class="field">
            <label>{{ tr('Payment For', 'الدفع مقابل') }}</label
            ><input :value="readableType" readonly />
          </div>
          <div class="field">
            <label>{{ tr('Reference ID', 'رقم المرجع') }}</label
            ><input :value="reference" readonly />
          </div>
          <div class="field full">
            <label>{{ tr('Customer / Company', 'العميل / الشركة') }}</label
            ><input :value="name" readonly />
          </div>
          <div class="field">
            <label>{{ tr('Original Payment Amount', 'قيمة الدفعة الأصلية') }}</label
            ><input :value="fmt(payment.company_value)" readonly />
          </div>
          <div class="field">
            <label>{{ tr('Maximum Allowed Amount', 'أقصى مبلغ مسموح') }}</label
            ><input :value="fmt(maxValue)" readonly />
          </div>
        </div>
        <h3>{{ tr('Payment Details', 'تفاصيل الدفع') }}</h3>
        <form @submit.prevent="save">
          <div class="grid">
            <div class="field">
              <label>{{ tr('Date', 'التاريخ') }} *</label
              ><input v-model="form.date" type="date" required />
            </div>
            <div class="field">
              <label>{{ tr('Payment Value', 'قيمة الدفعة') }} *</label
              ><input
                v-model="form.payment_value"
                type="number"
                min="0.01"
                step="0.01"
                :max="maxValue"
                required
              />
            </div>
            <div class="field">
              <label>{{ tr('Payment Method', 'طريقة الدفع') }} *</label
              ><select v-model="form.payment_type">
                <option v-for="method in paymentMethods" :key="method.value" :value="method.value">
                  {{ ar ? method.ar : method.name }}
                </option>
              </select>
            </div>
            <div class="field">
              <label>{{ tr('Bank', 'البنك') }} *</label
              ><select v-model="form.bank_id" required>
                <option value="">{{ tr('Select bank', 'اختر البنك') }}</option>
                <option v-for="bank in banks" :key="bank.id" :value="String(bank.id)">
                  {{ bank.name }}
                </option>
              </select>
            </div>
            <template v-if="form.payment_type === 'credit_card'">
              <div class="field">
                <label>{{ tr('Authorization Number', 'رقم التفويض') }} *</label
                ><input v-model="form.auth_number" required />
              </div>
              <div class="field">
                <label>{{ tr('Credit Card Number', 'رقم بطاقة الائتمان') }} *</label
                ><input v-model="form.credit_card_number" required />
              </div>
            </template>
            <template v-if="form.payment_type === 'check'">
              <div class="field">
                <label>{{ tr('Check Bank', 'بنك الشيك') }} *</label
                ><input v-model="form.check_bank" required />
              </div>
              <div class="field">
                <label>{{ tr('Check Number', 'رقم الشيك') }} *</label
                ><input v-model="form.check_no" required />
              </div>
              <div class="field">
                <label>{{ tr('Check Due Date', 'تاريخ استحقاق الشيك') }} *</label
                ><input v-model="form.check_due_date" type="date" required />
              </div>
            </template>
          </div>
          <label class="checkbox"
            ><input v-model="form.is_bank_transferee" type="checkbox" />
            {{ tr('Transferred to Bank', 'محول إلى البنك') }}</label
          >
          <div class="actions">
            <button type="button" class="back-btn" @click="back">{{ tr('Cancel', 'إلغاء') }}</button
            ><button type="submit" class="save-btn" :disabled="saving">
              {{
                saving ? tr('Updating...', 'جارٍ التحديث...') : tr('Update Payment', 'تحديث الدفعة')
              }}
            </button>
          </div>
        </form>
      </template>
    </section>
  </main>
</template>

<style scoped>
.payment-edit {
  padding: 24px 18px;
  color: #0a2544;
}
.edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-bottom: 25px;
}
.edit-header h2 {
  font-size: 24px;
  margin: 0;
}
.edit-header small {
  font-size: 15px;
  color: #72849b;
}
.edit-card {
  border: 1px solid #d6dfe9;
  background: white;
  border-radius: 16px;
  padding: 30px;
  max-width: 870px;
  margin: auto;
}
.msg {
  text-align: center;
  color: #64748b;
}
.readonly-heading {
  font-weight: 700;
  color: #64748b;
  margin-bottom: 18px;
  font-size: 14px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.field.full {
  grid-column: 1/-1;
}
.field label {
  font-weight: 600;
  font-size: 13px;
}
.field input,
.field select {
  height: 37px;
  box-sizing: border-box;
  width: 100%;
  border: 1px solid #cdd9e6;
  border-radius: 9px;
  background: white;
  color: #102d4d;
  padding: 7px 11px;
  font: inherit;
  font-size: 13px;
}
.field input[readonly] {
  background: #f3f7fb;
  cursor: not-allowed;
}
.edit-card h3 {
  font-size: 17px;
  margin: 28px 0 20px;
}
.checkbox {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 20px;
  font-size: 13px;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 27px;
}
.back-btn {
  border: 1px solid #cbd9e7;
  border-radius: 22px;
  padding: 9px 19px;
  background: white;
  color: #153755;
  cursor: pointer;
  font-weight: 600;
}
.save-btn {
  background: #629fc4;
  color: #fff;
  border: 0;
  border-radius: 22px;
  padding: 9px 25px;
  font-weight: 700;
  cursor: pointer;
}
.save-btn:disabled {
  opacity: 0.55;
}
.error {
  margin-bottom: 22px;
  padding: 12px;
  background: #fff0f0;
  border-radius: 8px;
  color: #b42333;
  font-size: 13px;
}
@media (max-width: 650px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .edit-card {
    padding: 18px;
  }
  .edit-header {
    align-items: flex-start;
  }
}
</style>

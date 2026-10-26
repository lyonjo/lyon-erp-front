<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
const route = useRoute(),
  router = useRouter()
const { locale } = useI18n()
const t = (en, ar) => (locale.value === 'ar' ? ar : en)
const tabs = ['customer', 'license', 'driver', 'car', 'extras', 'summary']
const tab = ref('customer'),
  loading = ref(true),
  saving = ref(false),
  error = ref(''),
  data = ref(null)
const chosen = ref([])
const dropoffDate = ref(''),
  dropoffTime = ref('')
const driver = ref({
  name: '',
  license_number: '',
  date_of_issue: '',
  expiry_date: '',
  place_of_issue: '',
})
const record = computed(() => data.value?.booking || {})
const customer = computed(() => data.value?.customer || {})
const vehicle = computed(() => record.value.car || {})
const money = (v) => `${Number(v || 0).toFixed(2)} ${data.value?.currency || 'JOD'}`
const text = (v) => (v === null || v === undefined || v === '' ? '—' : v)
const get = (obj, keys) => {
  for (const key of keys) {
    const val = obj?.[key]
    if (val !== undefined && val !== null && val !== '') return val
  }
  return '—'
}
const carDescription = computed(() =>
  [
    vehicle.value.brand?.name || record.value.rental_price?.brand?.name,
    vehicle.value.model?.name || record.value.rental_price?.model?.name,
    vehicle.value.model_year || record.value.rental_price?.model_year,
  ]
    .filter(Boolean)
    .join(' '),
)
const details = computed(() => data.value?.customer_details || {})
const customerFields = computed(() => [
  [t('Booking Number', 'رقم الحجز'), record.value.id],
  [
    t('Customer Name', 'اسم العميل'),
    details.value.name ?? get(customer.value, ['name', 'customer_name', 'company_name']),
  ],
  [t('Email', 'البريد الإلكتروني'), details.value.email ?? get(customer.value, ['email'])],
  [t('Nationality', 'الجنسية'), details.value.nationality],
  [t('Mobile Number', 'رقم الهاتف'), details.value.phone],
  [t('Address', 'العنوان'), details.value.address],
  [t('ID Number', 'رقم الهوية'), details.value.id_number],
  [t('ID Date of Issue', 'تاريخ إصدار الهوية'), details.value.id_issue_date],
  [t('ID Expiry Date', 'تاريخ انتهاء الهوية'), details.value.id_expiry_date],
  [t('ID Place of Issue', 'مكان إصدار الهوية'), details.value.id_issue_place],
  [t('Date of Birth', 'تاريخ الميلاد'), details.value.date_of_birth],
  [t('Place of Birth', 'مكان الميلاد'), details.value.place_of_birth],
])
const licenseFields = computed(() => {
  const d = details.value,
    c = customer.value,
    l = data.value?.customer_license || {}
  return [
    [
      t('License Number', 'رقم الرخصة'),
      d.license_number ?? get(l, ['license_number', 'number']) ?? get(c, ['license_number']),
    ],
    [
      t('Date of Issue', 'تاريخ الإصدار'),
      d.license_issue_date ?? get(l, ['date_of_issue', 'issue_date']),
    ],
    [
      t('Expiry Date', 'تاريخ الانتهاء'),
      d.license_expiry_date ?? get(l, ['expiry_date', 'expiration_date']),
    ],
    [
      t('Place of Issue', 'مكان الإصدار'),
      d.license_issue_place ?? get(l, ['place_of_issue', 'issue_place']),
    ],
  ]
})
const carFields = computed(() => [
  [t('Car Number', 'رقم السيارة'), vehicle.value.number],
  [t('Brand', 'الماركة'), vehicle.value.brand?.name],
  [t('Model', 'الموديل'), vehicle.value.model?.name],
  [t('Year', 'سنة الصنع'), vehicle.value.model_year],
  [t('Pickup Date', 'تاريخ الاستلام'), record.value.start_date],
  [t('Pickup Time', 'وقت الاستلام'), record.value.start_time],
  [t('Pickup Location', 'مكان الاستلام'), record.value.pick_up_location],
  [t('Return Location', 'مكان التسليم'), record.value.return_location],
  [t('Rental Period', 'مدة الإيجار'), rentalDays.value],
  [t('Km Out', 'كيلومترات الخروج'), vehicle.value.current_km],
  [t('Km In', 'كيلومترات العودة'), '—'],
])
const rentalDays = computed(() => {
  const startDate = record.value.start_date,
    startTime = record.value.start_time
  if (!startDate || !startTime || !dropoffDate.value || !dropoffTime.value)
    return Number(record.value.total_days || 0)
  const start = new Date(`${String(startDate).slice(0, 10)}T${String(startTime).slice(0, 5)}:00`)
  const end = new Date(`${dropoffDate.value}T${dropoffTime.value}:00`)
  const millis = end.getTime() - start.getTime()
  return Number.isFinite(millis) && millis > 0 ? Math.max(1, Math.ceil(millis / 86400000)) : 0
})
const pickedItems = computed(() =>
  (data.value?.extra_items || []).filter((x) => chosen.value.includes(x.id)),
)
const extrasTotal = computed(() =>
  pickedItems.value.reduce(
    (sum, i) => sum + Number(i.price || 0) * (i.is_daily ? rentalDays.value : 1),
    0,
  ),
)
const total = computed(
  () =>
    Number(record.value.day_price || 0) * rentalDays.value +
    extrasTotal.value +
    Number(record.value.tax || 0) +
    Number(record.value.branch_fee || 0) +
    Number(record.value.extra_km_price || 0),
)
const companyTotal = computed(
  () =>
    Number(record.value.day_company_price || 0) * rentalDays.value +
    extrasTotal.value +
    Number(record.value.tax || 0) +
    Number(record.value.branch_fee || 0) +
    Number(record.value.extra_km_price || 0),
)
const summaryFields = computed(() => [
  [t('Daily Rental Price', 'سعر الإيجار اليومي'), money(record.value.day_price)],
  [t('Number of Days', 'عدد الأيام'), rentalDays.value],
  [t('Extra Items', 'الإضافات'), money(extrasTotal.value)],
  [t('Extra Km Price', 'سعر الكيلومترات الإضافية'), money(record.value.extra_km_price)],
  [t('Tax', 'الضريبة'), money(record.value.tax)],
  [t('Branch Fee', 'رسوم الفرع'), money(record.value.branch_fee)],
  [t('Payment Method', 'طريقة الدفع'), record.value.payment_method],
  [t('Currency', 'العملة'), data.value?.currency],
  [t('Total Price', 'السعر الإجمالي'), money(total.value)],
])
async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await api.get(`/rent/bookings/${route.params.id}/relay`)
    data.value = response.data.data
    chosen.value = (record.value.extra_items || []).map((i) => i.id)
    dropoffDate.value = String(record.value.end_date || '').slice(0, 10)
    dropoffTime.value = String(record.value.end_time || '').slice(0, 5)
  } catch (e) {
    error.value = e.response?.data?.message || t('Could not load booking', 'تعذر تحميل الحجز')
  } finally {
    loading.value = false
  }
}
onMounted(load)
function goBack() {
  router.push('/rent/booking')
}
async function submit() {
  if (saving.value) return
  error.value = ''
  if (rentalDays.value < 1) {
    error.value = t(
      'Drop-off must be later than pickup.',
      'يجب أن يكون وقت التسليم بعد وقت الاستلام.',
    )
    tab.value = 'car'
    return
  }
  saving.value = true
  try {
    await api.post(`/rent/bookings/${route.params.id}/relay`, {
      extra_item_ids: chosen.value,
      additional_driver: driver.value,
      end_date: dropoffDate.value,
      end_time: dropoffTime.value,
    })
    goBack()
  } catch (e) {
    const errors = e.response?.data?.errors
    error.value = errors
      ? Object.values(errors).flat().join(' · ')
      : e.response?.data?.message || t('Could not relay booking', 'تعذر تسليم الحجز')
    tab.value = errors?.additional_driver ? 'driver' : tab.value
  } finally {
    saving.value = false
  }
}
</script>
<template>
  <section class="relay-page" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <div class="relay-heading">
      <h2>{{ t('Add Contract', 'إضافة عقد') }}</h2>
      <div class="actions">
        <button class="secondary" @click="goBack">
          {{ t('Back to Bookings', 'العودة للحجوزات') }}</button
        ><button
          class="primary"
          :disabled="loading || saving || data?.contract_exists"
          @click="submit"
        >
          {{
            saving
              ? t('Saving...', 'جاري الحفظ...')
              : t('Create Contract & Relay', 'إنشاء العقد وتسليم السيارة')
          }}
        </button>
      </div>
    </div>
    <div v-if="loading" class="state">
      {{ t('Loading booking data...', 'جاري تحميل بيانات الحجز...') }}
    </div>
    <div v-else-if="error && !data" class="state error">
      {{ error }} <button @click="load">{{ t('Retry', 'إعادة المحاولة') }}</button>
    </div>
    <div v-else class="workspace">
      <nav class="tabs" aria-label="Contract sections">
        <button
          v-for="name in tabs"
          :key="name"
          :class="{ active: tab === name }"
          @click="tab = name"
        >
          {{
            {
              customer: t('Customer Details', 'بيانات العميل'),
              license: t('Customer License', 'رخصة العميل'),
              driver: t('Add Driver', 'إضافة سائق'),
              car: t('Car Details', 'بيانات السيارة'),
              extras: t('Extra Items', 'الإضافات'),
              summary: t('Summary', 'الملخص'),
            }[name]
          }}
        </button>
      </nav>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="data.contract_exists" class="error">
        {{ t('This booking already has a contract.', 'يوجد عقد لهذا الحجز بالفعل.') }}
      </p>
      <div v-if="tab === 'customer'" class="form-grid">
        <div v-for="[label, value] in customerFields" :key="label" class="field">
          <label>{{ label }}</label
          ><input :value="text(value)" readonly />
        </div>
      </div>
      <div v-else-if="tab === 'license'" class="form-grid">
        <div v-for="[label, value] in licenseFields" :key="label" class="field">
          <label>{{ label }}</label
          ><input :value="text(value)" readonly />
        </div>
      </div>
      <div v-else-if="tab === 'driver'" class="form-grid">
        <div class="field wide">
          <label>{{ t('Driver Name', 'اسم السائق') }}</label
          ><input v-model="driver.name" />
        </div>
        <div class="field">
          <label>{{ t('License Date of Issue', 'تاريخ إصدار الرخصة') }}</label
          ><input v-model="driver.date_of_issue" type="date" />
        </div>
        <div class="field">
          <label>{{ t('License Expiry Date', 'تاريخ انتهاء الرخصة') }}</label
          ><input v-model="driver.expiry_date" type="date" />
        </div>
        <div class="field">
          <label>{{ t('Place of Issue', 'مكان الإصدار') }}</label
          ><input v-model="driver.place_of_issue" />
        </div>
        <div class="field">
          <label>{{ t('Driver License Number', 'رقم رخصة السائق') }}</label
          ><input v-model="driver.license_number" />
        </div>
        <p class="note wide">
          {{
            t(
              'All driver fields must be completed, or all left empty.',
              'يجب تعبئة جميع حقول السائق أو تركها كلها فارغة.',
            )
          }}
        </p>
      </div>
      <div v-else-if="tab === 'car'" class="form-grid">
        <div v-for="[label, value] in carFields" :key="label" class="field">
          <label>{{ label }}</label
          ><input :value="text(value)" readonly />
        </div>
        <div class="field">
          <label>{{ t('Drop-off Date', 'تاريخ التسليم') }}</label
          ><input
            v-model="dropoffDate"
            type="date"
            :min="String(record.start_date || '').slice(0, 10)"
          />
        </div>
        <div class="field">
          <label>{{ t('Drop-off Time', 'وقت التسليم') }}</label
          ><input v-model="dropoffTime" type="time" />
        </div>
        <p v-if="rentalDays < 1" class="error wide">
          {{
            t('Drop-off must be later than pickup.', 'يجب أن يكون وقت التسليم بعد وقت الاستلام.')
          }}
        </p>
      </div>
      <div v-else-if="tab === 'extras'" class="extra-list">
        <label v-for="item in data.extra_items" :key="item.id" class="extra-row"
          ><input v-model="chosen" type="checkbox" :value="item.id" /><span>{{ item.name }}</span
          ><span
            >{{ money(item.price) }}
            {{ item.is_daily ? t('/ day', '/ يوم') : t('once', 'مرة واحدة') }}</span
          ></label
        >
      </div>
      <div v-else class="summary-form">
        <div class="summary-grid">
          <div class="summary-field">
            <label>{{ t('Number of Days', 'عدد الأيام') }}</label
            ><input :value="rentalDays" readonly />
          </div>
          <div class="summary-field">
            <label>{{ t('Currency', 'العملة') }}</label
            ><input :value="data.currency" readonly />
          </div>
          <div class="summary-field">
            <label>{{ t('Cars Price / Day', 'سعر السيارة / اليوم') }}</label
            ><input :value="Number(record.day_price || 0).toFixed(2)" readonly />
          </div>
          <div class="summary-field">
            <label>{{ t('Currency', 'العملة') }}</label
            ><input :value="data.currency" readonly />
          </div>
          <div class="summary-field">
            <label>{{ t('Extra Items', 'الإضافات') }}</label
            ><input :value="extrasTotal.toFixed(2)" readonly />
          </div>
          <div class="summary-field">
            <label>{{ t('Currency', 'العملة') }}</label
            ><input :value="data.currency" readonly />
          </div>
          <div class="summary-field">
            <label>{{ t('Extra Km Price', 'سعر الكيلومتر الإضافي') }}</label
            ><input :value="Number(record.extra_km_price || 0).toFixed(2)" readonly />
          </div>
          <div class="summary-field">
            <label>{{ t('Currency', 'العملة') }}</label
            ><input :value="data.currency" readonly />
          </div>
          <div class="summary-field">
            <label>{{ t('Total Price', 'السعر الإجمالي') }}</label
            ><input :value="total.toFixed(2)" readonly />
          </div>
          <div class="summary-field">
            <label>{{ t('Company Total', 'إجمالي الشركة') }}</label
            ><input :value="companyTotal.toFixed(2)" readonly />
          </div>
          <div class="summary-field">
            <label>{{ t('Pickup Branch', 'فرع الاستلام') }}</label
            ><input :value="text(record.pick_up_location)" readonly />
          </div>
          <div class="summary-field">
            <label>{{ t('Receiving Branch', 'فرع التسليم') }}</label
            ><input :value="text(record.return_location)" readonly />
          </div>
        </div>
      </div>
      <div class="bottom">
        <button
          class="secondary"
          :disabled="tab === 'customer'"
          @click="tab = tabs[Math.max(0, tabs.indexOf(tab) - 1)]"
        >
          {{ t('Previous', 'السابق') }}</button
        ><button
          v-if="tab !== 'summary'"
          class="primary"
          @click="tab = tabs[Math.min(5, tabs.indexOf(tab) + 1)]"
        >
          {{ t('Next', 'التالي') }}</button
        ><button v-else class="primary" :disabled="saving || data.contract_exists" @click="submit">
          {{ t('Create Contract & Relay', 'إنشاء العقد وتسليم السيارة') }}
        </button>
      </div>
    </div>
  </section>
</template>
<style scoped>
.relay-page {
  padding: 18px 22px;
  color: #0b2344;
}
.relay-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}
.relay-heading h2 {
  font-size: 24px;
  margin: 0;
}
.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.primary,
.secondary {
  border-radius: 23px;
  padding: 10px 21px;
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
}
.primary {
  background: #629bc0;
  border: 0;
  color: white;
}
.secondary {
  background: white;
  border: 1px solid #d6e0e9;
  color: #153455;
}
.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.workspace {
  min-height: 480px;
  border: 1px solid #dbe3eb;
  background: #fff;
  border-radius: 15px;
  padding: 32px 22px;
  box-shadow: 0 2px 4px #1020350c;
}
.tabs {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 42px;
}
.tabs button {
  border: 0;
  background: transparent;
  color: #9ba9bf;
  font-weight: 650;
  cursor: pointer;
  padding: 7px 1px;
}
.tabs button.active {
  color: #102845;
  border-bottom: 2px solid #629bc0;
}
.form-grid {
  width: min(710px, 100%);
  margin: auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.field.wide,
.note.wide,
.error.wide {
  grid-column: 1/-1;
}
.field label {
  font-size: 13px;
  font-weight: 650;
}
.field input {
  box-sizing: border-box;
  width: 100%;
  height: 39px;
  border: 1px solid #d3dce8;
  border-radius: 9px;
  padding: 0 12px;
  color: #123151;
  background: #fff;
}
.field input[readonly] {
  background: #f6f8fa;
  color: #495d78;
}
.note {
  font-size: 12px;
  color: #7d8ca2;
}
.extra-list {
  width: min(710px, 100%);
  margin: auto;
}
.extra-row {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 13px 15px;
  border: 1px solid #e0e6ee;
  border-radius: 10px;
  margin-bottom: 8px;
  cursor: pointer;
}
.extra-row span:last-child {
  margin-inline-start: auto;
  font-size: 12px;
  color: #6c829e;
}
.summary {
  width: min(710px, 100%);
  margin: auto;
}
.summary-form {
  width: min(710px, 100%);
  margin: auto;
}
.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px 18px;
}
.summary-field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.summary-field label {
  font-size: 13px;
  font-weight: 650;
}
.summary-field input {
  box-sizing: border-box;
  width: 100%;
  height: 40px;
  border: 1px solid #cbd5df;
  border-radius: 12px;
  padding: 0 12px;
  background: #f8fafc;
  color: #133352;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 6px;
  border-bottom: 1px solid #e1e8ef;
  font-size: 14px;
}
.summary-row.muted {
  background: #eff5fb;
}
.bottom {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  width: min(710px, 100%);
  margin: 40px auto 0;
}
.state {
  text-align: center;
  padding: 65px;
}
.error {
  color: #ae2338;
  background: #fff3f4;
  padding: 12px;
  border-radius: 8px;
}
@media (max-width: 640px) {
  .form-grid,
  .summary-grid {
    grid-template-columns: 1fr;
  }
  .tabs {
    gap: 8px;
  }
  .workspace {
    padding: 20px 12px;
  }
}
</style>

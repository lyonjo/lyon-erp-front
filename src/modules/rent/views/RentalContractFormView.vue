<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
const route = useRoute(),
  router = useRouter(),
  { locale } = useI18n()
const t = (en, ar) => (locale.value === 'ar' ? ar : en)
const readOnly = computed(() => route.path.endsWith('/view'))
const tabs = ['customer', 'license', 'driver', 'car', 'extras', 'summary'],
  tab = ref('customer')
const loading = ref(true),
  saving = ref(false),
  error = ref(''),
  info = ref(null)
const customer = ref({}),
  driver = ref({
    name: '',
    license_number: '',
    date_of_issue: '',
    expiry_date: '',
    place_of_issue: '',
  })
const endDate = ref(''),
  endTime = ref(''),
  kmIn = ref(''),
  picked = ref([])
const contract = computed(() => info.value?.contract || {}),
  booking = computed(() => contract.value.booking || {}),
  car = computed(() => booking.value.car || {}),
  cfg = computed(() => info.value?.settings || {})
const currency = computed(() => cfg.value.currency || booking.value.currency || 'JOD')
const money = (x) => `${Number(x || 0).toFixed(2)} ${currency.value}`
const rdate = (x) => String(x || '').slice(0, 10)
const rtime = (x) => String(x || '').slice(0, 5)
const customerFields = [
  ['name', 'Customer Name', 'اسم العميل'],
  ['email', 'Email', 'البريد الإلكتروني'],
  ['phone_number', 'Phone Number', 'رقم الهاتف'],
  ['country_code', 'Country Code', 'رمز الدولة'],
  ['address', 'Address', 'العنوان'],
  ['nationality', 'Nationality', 'الجنسية'],
  ['date_of_birth', 'Date of Birth', 'تاريخ الميلاد'],
  ['place_of_birth', 'Place of Birth', 'مكان الميلاد'],
  ['passport_place_of_issue', 'ID/Passport Place of Issue', 'مكان إصدار الهوية / الجواز'],
  ['passport_date_of_issue', 'ID/Passport Date of Issue', 'تاريخ إصدار الهوية / الجواز'],
  ['passport_date_of_expire', 'ID/Passport Expiry Date', 'تاريخ انتهاء الهوية / الجواز'],
]
const licenseFields = [
  ['license_no', 'License Number', 'رقم الرخصة'],
  ['license_date_of_issue', 'License Issue Date', 'تاريخ إصدار الرخصة'],
  ['license_date_of_expire', 'License Expiry Date', 'تاريخ انتهاء الرخصة'],
  ['license_place_of_issue', 'License Place of Issue', 'مكان إصدار الرخصة'],
]
const dateKeys = [
  'date_of_birth',
  'passport_date_of_issue',
  'passport_date_of_expire',
  'license_date_of_issue',
  'license_date_of_expire',
]
const days = computed(() => {
  const s = `${rdate(booking.value.start_date)}T${rtime(booking.value.start_time)}:00`
  const e = `${endDate.value}T${endTime.value}:00`
  const n = (new Date(e).getTime() - new Date(s).getTime()) / 86400000
  return Number.isFinite(n) && n > 0 ? Math.max(1, Math.ceil(n)) : 0
})
const pricing = computed(() => {
  const periods = booking.value.rental_price?.periods || []
  const p = [...periods]
    .filter(
      (x) =>
        rdate(x.start_date) <= rdate(booking.value.start_date) &&
        rdate(x.end_date) >= endDate.value,
    )
    .sort((a, b) => Number(b.id) - Number(a.id))[0]
  const i = p
    ? [...(p.intervals || [])]
        .filter((x) => Number(x.start) <= days.value && Number(x.end) >= days.value)
        .sort((a, b) => Number(b.id) - Number(a.id))[0]
    : null
  return i ? Number(i.price) : null
})
const changedInvalid = computed(() => days.value < 1 || days.value > 365 || pricing.value === null)
const selectedExtras = computed(() =>
  (info.value?.extra_items || []).filter((x) => picked.value.includes(x.id)),
)
const extrasPrice = computed(() =>
  selectedExtras.value.reduce((sum, x) => sum + Number(x.price) * (x.is_daily ? days.value : 1), 0),
)
const excessKm = computed(() => {
  if (kmIn.value === '' || kmIn.value === null) return 0
  const diff =
    Number(kmIn.value) -
    Number(contract.value.km_out || 0) -
    Number(cfg.value.km_daily || 0) * days.value
  return Math.max(0, diff) * Number(cfg.value.price_per_km || 0)
})
const sumTotal = computed(
  () =>
    Number(pricing.value || 0) * days.value +
    extrasPrice.value +
    excessKm.value +
    Number(booking.value.branch_fee || 0) +
    Number(booking.value.tax || 0),
)
const carFields = computed(() => [
  [t('Car Number', 'رقم السيارة'), car.value.number],
  [t('Brand', 'الماركة'), car.value.brand?.name],
  [t('Model', 'الموديل'), car.value.model?.name],
  [t('Year', 'سنة الصنع'), car.value.model_year],
  [t('Pickup Date', 'تاريخ الاستلام'), rdate(booking.value.start_date)],
  [t('Pickup Time', 'وقت الاستلام'), booking.value.start_time],
  [t('Pickup Location', 'مكان الاستلام'), booking.value.pick_up_location],
  [t('Return Location', 'مكان التسليم'), booking.value.return_location],
  [t('KM Out', 'كيلومترات الخروج'), contract.value.km_out],
])
async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get(`/rent/rental-contracts/${route.params.id}`)
    info.value = data.data
    customer.value = { ...data.data.customer_details }
    const d = data.data.contract.additional_drivers?.[0]
    driver.value = {
      name: d?.name || '',
      license_number: d?.license_number || '',
      date_of_issue: rdate(d?.date_of_issue),
      expiry_date: rdate(d?.expiry_date),
      place_of_issue: d?.place_of_issue || '',
    }
    endDate.value = rdate(booking.value.end_date)
    endTime.value = rtime(booking.value.end_time)
    kmIn.value = contract.value.km_in ?? ''
    picked.value = (booking.value.extra_items || []).map((x) => x.id)
  } catch (e) {
    error.value = e.response?.data?.message || t('Could not load contract.', 'تعذر تحميل العقد.')
  } finally {
    loading.value = false
  }
}
onMounted(load)
function payload() {
  return {
    end_date: endDate.value,
    end_time: endTime.value,
    km_in: kmIn.value === '' ? null : Number(kmIn.value),
    extra_item_ids: picked.value,
    additional_driver: driver.value,
    customer_details: booking.value.customer_id ? customer.value : undefined,
  }
}
async function save(close) {
  if (saving.value || readOnly.value || contract.value.status === 'closed') return
  error.value = ''
  if (changedInvalid.value) {
    error.value = t(
      'This rental duration is not covered by the booking price.',
      'المدة الجديدة غير مشمولة بتسعيرة الحجز.',
    )
    tab.value = 'car'
    return
  }
  const kmOutNumber = Number(contract.value.km_out || 0)
  const kmInProvided = kmIn.value !== '' && kmIn.value !== null && kmIn.value !== undefined
  const kmInNumber = kmInProvided ? Number(kmIn.value) : null
  if (kmInProvided && (!Number.isInteger(kmInNumber) || kmInNumber < 0)) {
    error.value = t(
      'KM In must be a non-negative whole number.',
      'يجب أن تكون كيلومترات العودة رقمًا صحيحًا غير سالب.',
    )
    tab.value = 'car'
    return
  }
  if (close && (!kmInProvided || kmInNumber <= kmOutNumber)) {
    error.value = t(
      'To close the contract, KM In must be greater than KM Out.',
      'لإغلاق العقد يجب أن تكون كيلومترات العودة أكبر من كيلومترات الخروج.',
    )
    tab.value = 'car'
    return
  }
  if (!close && kmInProvided && kmInNumber !== 0 && kmInNumber < kmOutNumber) {
    error.value = t(
      'KM In cannot be less than KM Out unless empty or zero.',
      'لا يمكن أن تقل كيلومترات العودة عن كيلومترات الخروج إلا إذا كانت فارغة أو صفرًا.',
    )
    tab.value = 'car'
    return
  }
  if (
    close &&
    !window.confirm(
      t(
        'Close this contract? This cannot be edited afterward.',
        'إغلاق العقد؟ لا يمكن تعديله بعد ذلك.',
      ),
    )
  )
    return
  saving.value = true
  try {
    await (close
      ? api.post(`/rent/rental-contracts/${route.params.id}/close`, payload())
      : api.put(`/rent/rental-contracts/${route.params.id}`, payload()))
    router.push('/rent/contracts/rental')
  } catch (e) {
    error.value = e.response?.data?.errors
      ? Object.values(e.response.data.errors).flat().join(' · ')
      : e.response?.data?.message || t('Save failed.', 'فشل الحفظ.')
  } finally {
    saving.value = false
  }
}
const contractCanEdit = computed(() => !readOnly.value && contract.value.status === 'open')
const tabLabels = {
  customer: ['Customer Details', 'بيانات العميل'],
  license: ['Customer License', 'رخصة العميل'],
  driver: ['Add Driver', 'إضافة سائق'],
  car: ['Car Details', 'بيانات السيارة'],
  extras: ['Extra Items', 'الإضافات'],
  summary: ['Summary', 'الملخص'],
}
</script>
<template>
  <section class="contract-form" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <div class="top">
      <h2>{{ readOnly ? t('View Contract', 'عرض العقد') : t('Edit Contract', 'تعديل العقد') }}</h2>
      <div class="top-actions">
        <button class="outline" @click="router.push('/rent/contracts/rental')">
          {{ t('Exit', 'خروج') }}</button
        ><template v-if="contractCanEdit"
          ><button class="primary" :disabled="saving" @click="save(false)">
            {{ t('Update', 'تحديث') }}</button
          ><button class="warning" :disabled="saving" @click="save(true)">
            {{ t('Close Contract', 'إغلاق العقد') }}
          </button></template
        >
      </div>
    </div>
    <div v-if="loading" class="state">{{ t('Loading contract...', 'جاري تحميل العقد...') }}</div>
    <div v-else-if="!info" class="state error">
      {{ error }} <button @click="load">{{ t('Retry', 'إعادة المحاولة') }}</button>
    </div>
    <template v-else>
      <div class="booking">
        <b>{{ t('Booking Number', 'رقم الحجز') }}</b
        ><input :value="booking.id" readonly /><span
          v-if="contract.status === 'closed'"
          class="closed"
          >{{ t('Closed — read only', 'مغلق — عرض فقط') }}</span
        >
      </div>
      <div class="panel">
        <nav class="tabs">
          <button v-for="k in tabs" :key="k" :class="{ active: tab === k }" @click="tab = k">
            {{ t(...tabLabels[k]) }}
          </button>
        </nav>
        <p v-if="error" class="error">{{ error }}</p>
        <div v-if="tab === 'customer'" class="form-grid">
          <div class="field">
            <label>{{ t('Contract ID', 'رقم العقد') }}</label
            ><input :value="contract.id" readonly />
          </div>
          <div class="field">
            <label>{{ t('Booking No.', 'رقم الحجز') }}</label
            ><input :value="booking.id" readonly />
          </div>
          <div v-if="!booking.customer_id" class="note wide">
            {{ t('Customer-company identity is read-only.', 'بيانات الشركة العميلة للعرض فقط.') }}
          </div>
          <div v-for="[key, en, ar] in customerFields" :key="key" class="field">
            <label>{{ t(en, ar) }}</label
            ><input
              v-model="customer[key]"
              :type="dateKeys.includes(key) ? 'date' : 'text'"
              :readonly="!contractCanEdit || !booking.customer_id"
            />
          </div>
        </div>
        <div v-else-if="tab === 'license'" class="form-grid">
          <div v-for="[key, en, ar] in licenseFields" :key="key" class="field">
            <label>{{ t(en, ar) }}</label
            ><input
              v-model="customer[key]"
              :type="dateKeys.includes(key) ? 'date' : 'text'"
              :readonly="!contractCanEdit || !booking.customer_id"
            />
          </div>
        </div>
        <div v-else-if="tab === 'driver'" class="form-grid">
          <div class="field wide">
            <label>{{ t('Driver Name', 'اسم السائق') }}</label
            ><input v-model="driver.name" :readonly="!contractCanEdit" />
          </div>
          <div class="field">
            <label>{{ t('License Number', 'رقم الرخصة') }}</label
            ><input v-model="driver.license_number" :readonly="!contractCanEdit" />
          </div>
          <div class="field">
            <label>{{ t('Date of Issue', 'تاريخ الإصدار') }}</label
            ><input v-model="driver.date_of_issue" type="date" :readonly="!contractCanEdit" />
          </div>
          <div class="field">
            <label>{{ t('Expiry Date', 'تاريخ الانتهاء') }}</label
            ><input v-model="driver.expiry_date" type="date" :readonly="!contractCanEdit" />
          </div>
          <div class="field">
            <label>{{ t('Place of Issue', 'مكان الإصدار') }}</label
            ><input v-model="driver.place_of_issue" :readonly="!contractCanEdit" />
          </div>
          <div class="note wide">
            {{
              t(
                'All additional driver fields must be filled, or all left blank.',
                'جميع حقول السائق الإضافي مطلوبة معًا، أو تترك فارغة.',
              )
            }}
          </div>
        </div>
        <div v-else-if="tab === 'car'" class="form-grid">
          <div v-for="[label, value] in carFields" :key="label" class="field">
            <label>{{ label }}</label
            ><input :value="value ?? '—'" readonly />
          </div>
          <div class="field">
            <label>{{ t('Drop-off Date', 'تاريخ التسليم') }}</label
            ><input v-model="endDate" type="date" :readonly="!contractCanEdit" />
          </div>
          <div class="field">
            <label>{{ t('Drop-off Time', 'وقت التسليم') }}</label
            ><input :value="booking.end_time" readonly />
          </div>
          <div class="field">
            <label>{{ t('Rental Days', 'أيام الإيجار') }}</label
            ><input :value="days" readonly />
          </div>
          <div class="field">
            <label>{{ t('KM Out', 'كيلومترات الخروج') }}</label
            ><input :value="contract.km_out" readonly />
          </div>
          <div class="field wide">
            <label>{{ t('KM In', 'كيلومترات العودة') }}</label
            ><input v-model="kmIn" type="number" min="0" step="1" :readonly="!contractCanEdit" />
          </div>
          <div class="note wide">
            {{
              t(
                'Drop-off time remains unchanged. Price and days update when the date changes.',
                'وقت التسليم يبقى كما هو. يتم تحديث السعر والأيام عند تعديل التاريخ.',
              )
            }}
          </div>
          <p v-if="changedInvalid" class="error wide">
            {{
              t(
                'The new period has no valid pricing interval.',
                'المدة الجديدة لا تغطيها تسعيرة صالحة.',
              )
            }}
          </p>
        </div>
        <div v-else-if="tab === 'extras'" class="extra-list">
          <label v-for="x in info.extra_items" :key="x.id" class="extra"
            ><input
              v-model="picked"
              type="checkbox"
              :value="x.id"
              :disabled="!contractCanEdit"
            /><span>{{ x.name }}</span
            ><span
              >{{ money(x.price) }}
              {{ x.is_daily ? t('/day', '/يوم') : t('once', 'مرة واحدة') }}</span
            ></label
          >
          <p class="note">{{ t('No extra items is allowed.', 'يمكن ترك الإضافات فارغة.') }}</p>
        </div>
        <div v-else class="summary-grid">
          <div
            v-for="[label, value] in [
              [t('Tax', 'الضريبة'), money(booking.tax)],
              [t('Number of Days', 'عدد الأيام'), days],
              [t('Car Price / Day', 'سعر السيارة / اليوم'), money(pricing || 0)],
              [t('Currency', 'العملة'), currency],
              [t('Extra Items', 'الإضافات'), money(extrasPrice)],
              [t('Included KM', 'الكيلومترات المشمولة'), Number(cfg.km_daily || 0) * days],
              [t('Extra KM Price', 'سعر الكيلومترات الإضافية'), money(excessKm)],
              [t('Branch Fee', 'رسوم الفرع'), money(booking.branch_fee)],
              [t('Total Price', 'السعر الإجمالي'), money(sumTotal)],
              [t('Company Total', 'إجمالي الشركة'), money(sumTotal)],
            ]"
            :key="label"
            class="field"
          >
            <label>{{ label }}</label
            ><input :value="value" readonly />
          </div>
        </div>
        <div class="bottom">
          <button
            class="outline"
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
          ><button
            v-else-if="contractCanEdit"
            class="primary"
            :disabled="saving || changedInvalid"
            @click="save(false)"
          >
            {{ t('Update Contract', 'تحديث العقد') }}
          </button>
        </div>
      </div></template
    >
  </section>
</template>
<style scoped>
.contract-form {
  padding: 20px;
  color: #102746;
}
.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.top h2 {
  font-size: 25px;
  margin: 0;
}
.top-actions {
  display: flex;
  gap: 8px;
}
.primary,
.warning,
.outline {
  padding: 9px 19px;
  border-radius: 22px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 650;
}
.primary {
  background: #629fc3;
  border: 1px solid #629fc3;
  color: #fff;
}
.warning {
  background: #f0a211;
  border: 1px solid #f0a211;
  color: #fff;
}
.outline {
  background: white;
  border: 1px solid #d0deeb;
  color: #17344d;
}
.primary:disabled,
.warning:disabled {
  opacity: 0.5;
}
.booking {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 12px 0 20px;
}
.booking input {
  width: 100px;
  height: 35px;
  border: 1px solid #d1dce8;
  border-radius: 9px;
  padding: 0 10px;
  background: #f8fafc;
}
.closed {
  color: #777;
}
.panel {
  border: 1px solid #d7e2eb;
  border-radius: 16px;
  padding: 28px 22px;
  min-height: 420px;
}
.tabs {
  display: flex;
  justify-content: center;
  gap: 23px;
  flex-wrap: wrap;
  margin-bottom: 38px;
}
.tabs button {
  background: none;
  border: 0;
  color: #9ba9be;
  font-weight: 650;
  padding: 8px 0;
  cursor: pointer;
}
.tabs button.active {
  color: #112d4a;
  border-bottom: 2px solid #629fc3;
}
.form-grid,
.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: min(740px, 100%);
  gap: 14px 17px;
  margin: auto;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.field label {
  font-weight: 650;
  font-size: 13px;
}
.field input {
  height: 40px;
  border: 1px solid #cfd9e4;
  border-radius: 9px;
  box-sizing: border-box;
  padding: 0 11px;
  width: 100%;
  color: #102b4b;
  background: #fff;
}
.field input[readonly] {
  background: #f5f7f9;
  color: #405978;
}
.wide {
  grid-column: 1/-1;
}
.note {
  font-size: 12px;
  color: #7c8da4;
}
.extra-list {
  width: min(740px, 100%);
  margin: auto;
}
.extra {
  display: flex;
  gap: 12px;
  align-items: center;
  border: 1px solid #dce4ed;
  border-radius: 20px;
  padding: 12px 16px;
  margin-bottom: 10px;
}
.extra span:last-child {
  margin-inline-start: auto;
  color: #7790a8;
  font-size: 12px;
}
.bottom {
  display: flex;
  justify-content: space-between;
  width: min(740px, 100%);
  margin: 35px auto 0;
}
.error {
  background: #fff2f3;
  border-radius: 8px;
  padding: 12px;
  color: #b52940;
}
.state {
  text-align: center;
  padding: 65px;
}
@media (max-width: 680px) {
  .form-grid,
  .summary-grid {
    grid-template-columns: 1fr;
  }
  .panel {
    padding: 20px 12px;
  }
}
</style>

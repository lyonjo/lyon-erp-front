<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
const route = useRoute()
const router = useRouter()
const { locale } = useI18n()
const tr = (en, ar) => (locale.value === 'ar' ? ar : en)
const id = computed(() => route.params.id)
const isView = computed(() => route.path.endsWith('/view'))
const isEdit = computed(() => !!id.value)
const title = computed(() =>
  isView.value
    ? tr('View Traffic Violation', 'عرض مخالفة مرورية')
    : isEdit.value
      ? tr('Edit Traffic Violation', 'تعديل مخالفة مرورية')
      : tr('Add Traffic Violation', 'إضافة مخالفة مرورية'),
)
const form = ref({
  car_id: '',
  violation_date: '',
  violation_time: '',
  violation_no: '',
  violation_value: '',
  violation_reason: '',
  manual_customer_name: '',
})
const vehicles = ref([])
const carSearch = ref('')
const dropdown = ref(false)
const customer = ref({
  customer_name: null,
  contract_id: null,
  matched: false,
  can_bill_contract: false,
  message: null,
})
const file = ref(null)
const imageUrl = ref(null)
const loading = ref(false)
const saving = ref(false)
const resolving = ref(false)
const error = ref('')
const fieldErrors = ref({})
let searchTimer,
  resolutionKey = 0
const selectedCar = computed(() =>
  vehicles.value.find((v) => Number(v.id) === Number(form.value.car_id)),
)
const customerMatched = computed(() => !!customer.value.customer_name)
function fileChanged(event) {
  file.value = event.target.files?.[0] || null
}
async function findCars() {
  try {
    const { data } = await api.get('/rent/traffic-violations/vehicles', {
      params: { search: carSearch.value },
    })
    vehicles.value = data.data || []
  } catch (e) {
    error.value =
      e.response?.data?.message || tr('Unable to search vehicles', 'تعذر البحث عن المركبات')
  }
}
function selectCar(car) {
  form.value.car_id = car.id
  carSearch.value = car.label
  dropdown.value = false
}
function openCars() {
  dropdown.value = true
  findCars()
}
watch(carSearch, () => {
  if (!dropdown.value) return
  clearTimeout(searchTimer)
  searchTimer = setTimeout(findCars, 250)
})
async function resolveContract() {
  const seq = ++resolutionKey
  customer.value = {
    customer_name: null,
    contract_id: null,
    matched: false,
    can_bill_contract: false,
    message: null,
  }
  if (!form.value.car_id || !form.value.violation_date || !form.value.violation_time) return
  resolving.value = true
  try {
    const { data } = await api.get('/rent/traffic-violations/resolve', {
      params: {
        car_id: form.value.car_id,
        violation_date: form.value.violation_date,
        violation_time: form.value.violation_time,
      },
    })
    if (seq === resolutionKey) customer.value = data.data || customer.value
  } catch (e) {
    if (seq === resolutionKey)
      error.value =
        e.response?.data?.message || tr('Unable to resolve renter', 'تعذر تحديد المستأجر')
  } finally {
    if (seq === resolutionKey) resolving.value = false
  }
}
watch(
  () => [form.value.car_id, form.value.violation_date, form.value.violation_time],
  resolveContract,
)
async function load() {
  if (!isEdit.value) {
    await findCars()
    return
  }
  loading.value = true
  try {
    const { data } = await api.get(`/rent/traffic-violations/${id.value}`)
    const v = data.data
    form.value = {
      car_id: v.car_id,
      violation_date: v.violation_date || '',
      violation_time: v.violation_time?.slice(0, 5) || '',
      violation_no: v.violation_no,
      violation_value: v.violation_value,
      violation_reason: v.violation_reason || '',
      manual_customer_name: v.manual_customer_name || '',
    }
    await findCars()
    const car = vehicles.value.find((c) => Number(c.id) === Number(v.car_id))
    carSearch.value = car?.label || v.car_number || ''
    if (v.has_image) {
      const resp = await api.get(`/rent/traffic-violations/${id.value}/image`, {
        responseType: 'blob',
      })
      imageUrl.value = URL.createObjectURL(resp.data)
    }
  } catch (e) {
    error.value = e.response?.data?.message || tr('Unable to load violation', 'تعذر تحميل المخالفة')
  } finally {
    loading.value = false
  }
}
async function save() {
  if (saving.value || isView.value) return
  error.value = ''
  fieldErrors.value = {}
  saving.value = true
  const fd = new FormData()
  for (const [key, value] of Object.entries(form.value)) fd.append(key, value ?? '')
  if (file.value) fd.append('image', file.value)
  try {
    if (isEdit.value) {
      fd.append('_method', 'PUT')
      await api.post(`/rent/traffic-violations/${id.value}`, fd)
    } else await api.post('/rent/traffic-violations', fd)
    router.push('/rent/traffic-violations')
  } catch (e) {
    fieldErrors.value = e.response?.data?.errors || {}
    error.value = e.response?.data?.message || tr('Unable to save violation', 'تعذر حفظ المخالفة')
  } finally {
    saving.value = false
  }
}
function back() {
  router.push('/rent/traffic-violations')
}
onMounted(load)
</script>
<template>
  <section class="tf-page">
    <div class="tf-top">
      <h2>{{ title }}</h2>
      <div class="tf-buttons">
        <button class="tf-back" type="button" @click="back">{{ tr('← Back', 'عودة') }}</button
        ><button v-if="!isView" type="button" class="tf-save" :disabled="saving" @click="save">
          {{
            saving
              ? tr('Saving...', 'جاري الحفظ...')
              : tr(
                  isEdit ? 'Update Violation' : 'Add Traffic Violation',
                  isEdit ? 'تحديث المخالفة' : 'إضافة مخالفة مرورية',
                )
          }}
        </button>
      </div>
    </div>
    <div class="tf-card">
      <p v-if="error" class="tf-error">{{ error }}</p>
      <p v-if="loading">{{ tr('Loading...', 'جاري التحميل...') }}</p>
      <div v-else class="tf-grid">
        <div class="tf-field tf-full tf-selector">
          <label>{{ tr('Plate No.', 'رقم المركبة') }} *</label
          ><input
            v-model="carSearch"
            :disabled="isView"
            :placeholder="tr('Search vehicle number...', 'ابحث برقم المركبة...')"
            @focus="openCars"
            @input="dropdown = true"
          />
          <div v-if="dropdown && !isView" class="tf-options">
            <button v-for="v in vehicles" :key="v.id" type="button" @click="selectCar(v)">
              {{ v.label }}
            </button>
            <p v-if="!vehicles.length">{{ tr('No matches', 'لا توجد نتائج') }}</p>
          </div>
          <small v-if="fieldErrors.car_id" class="tf-error">{{ fieldErrors.car_id[0] }}</small>
        </div>
        <div class="tf-field">
          <label>{{ tr('Date', 'التاريخ') }} *</label
          ><input v-model="form.violation_date" type="date" :disabled="isView" />
        </div>
        <div class="tf-field">
          <label>{{ tr('Time', 'الوقت') }} *</label
          ><input v-model="form.violation_time" type="time" :disabled="isView" />
        </div>
        <div class="tf-field">
          <label>{{ tr('Violation No.', 'رقم المخالفة') }} *</label
          ><input v-model="form.violation_no" :disabled="isView" maxlength="100" />
        </div>
        <div class="tf-field">
          <label>{{ tr('Violation Value', 'قيمة المخالفة') }} *</label
          ><input
            v-model="form.violation_value"
            type="number"
            min="0"
            step="0.01"
            :disabled="isView"
          />
        </div>
        <div class="tf-field tf-full">
          <label>{{ tr('Violation Reason', 'سبب المخالفة') }}</label
          ><input v-model="form.violation_reason" :disabled="isView" />
        </div>
        <div class="tf-field tf-full">
          <label>{{ tr('Violation Image', 'صورة المخالفة') }}</label
          ><input
            v-if="!isView"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            @change="fileChanged"
          /><a v-if="imageUrl" :href="imageUrl" target="_blank" rel="noopener">{{
            tr('View existing image', 'عرض الصورة الحالية')
          }}</a
          ><small>{{
            tr('JPG, PNG, WEBP — maximum 5MB', 'JPG، PNG، WEBP — الحد الأقصى 5 ميغابايت')
          }}</small>
        </div>
        <div class="tf-field tf-full">
          <label>{{ tr('Customer / Customer Company', 'العميل / شركة العميل') }}</label>
          <input
            v-if="customerMatched"
            :value="customer.customer_name"
            readonly
            class="tf-readonly"
          />
          <input
            v-else
            v-model="form.manual_customer_name"
            :disabled="isView || resolving || customer.matched"
            :placeholder="
              tr('Enter name if no rental is found', 'اكتب الاسم إذا لم يوجد عقد في هذا الوقت')
            "
          />
          <small v-if="resolving">{{ tr('Finding renter...', 'جاري البحث عن المستأجر...') }}</small
          ><small v-else-if="customer.contract_id"
            >{{ tr('Linked contract', 'العقد المرتبط') }} #{{ customer.contract_id }}</small
          ><small v-else-if="customer.message" class="tf-error">{{ customer.message }}</small>
          <small v-else-if="!customerMatched">{{
            tr(
              'If no contract covers this date and time, enter the name manually.',
              'إذا لم يوجد عقد يغطي هذا التاريخ والوقت، أدخل الاسم يدوياً.',
            )
          }}</small>
        </div>
      </div>
    </div>
  </section>
</template>
<style scoped>
.tf-page {
  padding: 18px;
  color: #0a2146;
}
.tf-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 28px;
}
.tf-top h2 {
  font-size: 23px;
  margin: 0;
}
.tf-buttons {
  display: flex;
  gap: 10px;
}
.tf-save {
  background: #5e9ec6;
  color: #fff;
  border: 0;
  border-radius: 22px;
  padding: 10px 22px;
  cursor: pointer;
}
.tf-back {
  border: 1px solid #d5dfed;
  background: white;
  border-radius: 22px;
  padding: 10px 18px;
  cursor: pointer;
}
.tf-card {
  border: 1px solid #d5dfed;
  border-radius: 14px;
  padding: 30px;
  min-height: 440px;
  background: white;
}
.tf-grid {
  max-width: 720px;
  margin: auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px 24px;
}
.tf-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}
.tf-full {
  grid-column: 1/-1;
}
.tf-field label {
  font-weight: 600;
  font-size: 13px;
}
.tf-field input {
  height: 41px;
  border: 1px solid #cdd6e3;
  border-radius: 9px;
  padding: 8px 13px;
  background: white;
  color: #13284a;
  min-width: 0;
}
.tf-field input:disabled,
.tf-readonly {
  background: #f4f7fb !important;
}
.tf-field small {
  font-size: 11px;
  color: #8594ae;
}
.tf-selector {
  position: relative;
}
.tf-options {
  position: absolute;
  top: 72px;
  z-index: 10;
  background: white;
  border: 1px solid #cdd6e3;
  border-radius: 8px;
  width: 100%;
  max-height: 240px;
  overflow: auto;
  box-shadow: 0 10px 25px #1d35521a;
}
.tf-options button {
  display: block;
  width: 100%;
  padding: 11px;
  text-align: start;
  background: none;
  border: 0;
  cursor: pointer;
}
.tf-options button:hover {
  background: #f1f6fa;
}
.tf-error {
  color: #bd2020 !important;
  background: #fff1f1;
  border-radius: 6px;
  padding: 7px;
}
@media (max-width: 700px) {
  .tf-grid {
    grid-template-columns: 1fr;
  }
  .tf-top {
    flex-wrap: wrap;
  }
}
</style>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const route = useRoute()
const router = useRouter()
const { locale } = useI18n()
const ar = computed(() => locale.value === 'ar')
const t = (en, arabic) => ar.value ? arabic : en
const id = computed(() => route.params.id)
const editing = computed(() => Boolean(id.value))
const today = () => new Date().toLocaleDateString('en-CA')
const form = ref({ car_id: '', service_key: '', date: today(), price: '', counter_km: '', details: '' })
const services = ref([])
const vehicles = ref([])
const vehicleSearch = ref('')
const loadingVehicles = ref(false)
const saving = ref(false)
const loading = ref(false)
const error = ref('')
const fieldErrors = ref({})
let timer
let searchSeq = 0
const chosenVehicle = computed(() => vehicles.value.find(v => String(v.id) === String(form.value.car_id)))

async function searchVehicles() {
  const seq = ++searchSeq
  loadingVehicles.value = true
  try {
    const { data } = await api.get('/rent/vehicle-maintenances/vehicle-options', { params: { search: vehicleSearch.value } })
    if (seq !== searchSeq) return
    const list = data.data ?? []
    // Retain the currently selected vehicle when the user changes search text.
    if (chosenVehicle.value && !list.some(v => String(v.id) === String(chosenVehicle.value.id))) list.unshift(chosenVehicle.value)
    vehicles.value = list
  } catch (e) { if (seq === searchSeq) error.value = e.response?.data?.message || t('Cannot load vehicles.', 'تعذر تحميل المركبات.') }
  finally { if (seq === searchSeq) loadingVehicles.value = false }
}
watch(vehicleSearch, () => { clearTimeout(timer); timer = setTimeout(searchVehicles, 300) })
onBeforeUnmount(() => { clearTimeout(timer); ++searchSeq })

async function init() {
  loading.value = true
  error.value = ''
  try {
    const [{ data: serviceResponse }] = await Promise.all([api.get('/rent/vehicle-maintenances/services'), searchVehicles()])
    services.value = serviceResponse.data ?? []
    if (editing.value) {
      const { data } = await api.get(`/rent/vehicle-maintenances/${id.value}`)
      const r = data.data
      form.value = { car_id: r.car_id, service_key: r.service_key, date: r.date, price: r.price, counter_km: r.counter_km, details: r.details ?? '' }
      // Current selection may not be among the first 50 returned vehicles.
      if (!vehicles.value.some(v => String(v.id) === String(r.car_id))) {
        vehicles.value.unshift({ id: r.car_id, number: r.vehicle_no, brand: r.brand, model: r.model, model_year: r.model_year, company_name: r.company_name })
      }
    }
  } catch (e) { error.value = e.response?.data?.message || t('Failed to load form.', 'تعذر تحميل النموذج.') }
  finally { loading.value = false }
}
onMounted(init)
function clearError(key) { if (fieldErrors.value[key]) delete fieldErrors.value[key] }
async function submit() {
  if (saving.value) return
  saving.value = true
  error.value = ''
  fieldErrors.value = {}
  try {
    const payload = {
      car_id: Number(form.value.car_id),
      service_key: form.value.service_key,
      date: form.value.date,
      price: Number(form.value.price),
      counter_km: Number(form.value.counter_km),
      details: form.value.details || null,
    }
    if (editing.value) await api.put(`/rent/vehicle-maintenances/${id.value}`, payload)
    else await api.post('/rent/vehicle-maintenances', payload)
    router.push('/rent/vehicles-maintenance')
  } catch (e) {
    fieldErrors.value = e.response?.data?.errors ?? {}
    error.value = e.response?.data?.message || t('Could not save maintenance record.', 'تعذر حفظ سجل الصيانة.')
  } finally { saving.value = false }
}
const firstError = k => fieldErrors.value[k]?.[0] ?? ''
const serviceLabel = s => ar.value ? s.name_ar : s.name
const vehicleLabel = v => `${v.number} — ${v.brand ?? ''} ${v.model ?? ''} (${v.model_year ?? ''})`
</script>

<template>
  <div class="maintenance-form">
    <header class="top">
      <h1>{{ editing ? t('Edit Vehicles Maintenance', 'تعديل صيانة المركبة') : t('Add Vehicles Maintenance', 'إضافة صيانة مركبة') }}</h1>
      <div class="top-actions"><button type="button" class="back" @click="router.push('/rent/vehicles-maintenance')">{{ t('Back', 'رجوع') }}</button><button class="primary" type="submit" form="maintenance-form" :disabled="saving || loading">{{ saving ? t('Saving...', 'جار الحفظ...') : editing ? t('Save', 'حفظ') : t('Add Vehicles Maintenance', 'إضافة صيانة المركبة') }}</button></div>
    </header>
    <div class="panel">
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <form id="maintenance-form" class="fields" @submit.prevent="submit">
        <div class="field">
          <label for="vehicle-search">{{ t('Vehicle No.', 'رقم المركبة') }} *</label>
          <input id="vehicle-search" v-model="vehicleSearch" type="search" :placeholder="t('Search vehicle number or model...', 'ابحث برقم المركبة أو الموديل...')" autocomplete="off" />
          <select v-model="form.car_id" required @change="clearError('car_id')">
            <option value="" disabled>{{ loadingVehicles ? t('Loading vehicles...', 'جار تحميل المركبات...') : t('Select vehicle', 'اختر المركبة') }}</option>
            <option v-for="v in vehicles" :key="v.id" :value="v.id">{{ vehicleLabel(v) }}</option>
          </select>
          <small v-if="firstError('car_id')" class="error">{{ firstError('car_id') }}</small>
        </div>
        <div class="field">
          <label for="service">{{ t('Service', 'الخدمة') }} *</label>
          <select id="service" v-model="form.service_key" required @change="clearError('service_key')"><option disabled value="">{{ t('Select service', 'اختر الخدمة') }}</option><option v-for="s in services" :key="s.key" :value="s.key">{{ serviceLabel(s) }}</option></select>
          <small v-if="firstError('service_key')" class="error">{{ firstError('service_key') }}</small>
        </div>
        <div class="field"><label for="date">{{ t('Date', 'التاريخ') }} *</label><input id="date" v-model="form.date" type="date" required /><small v-if="firstError('date')" class="error">{{ firstError('date') }}</small></div>
        <div class="field"><label for="price">{{ t('Price', 'السعر') }} *</label><input id="price" v-model="form.price" type="number" min="0" step="0.01" required :placeholder="t('Enter price', 'أدخل السعر')" /><small v-if="firstError('price')" class="error">{{ firstError('price') }}</small></div>
        <div class="field"><label for="km">{{ t('Num of Km', 'عدد الكيلومترات') }} *</label><input id="km" v-model="form.counter_km" type="number" min="0" step="1" required :placeholder="t('Enter number of km', 'أدخل عدد الكيلومترات')" /><small v-if="firstError('counter_km')" class="error">{{ firstError('counter_km') }}</small></div>
        <div class="field"><label for="details">{{ t('Details', 'التفاصيل') }}</label><textarea id="details" v-model="form.details" rows="3" :placeholder="t('Enter details', 'أدخل التفاصيل')" /><small v-if="firstError('details')" class="error">{{ firstError('details') }}</small></div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.maintenance-form{padding:20px 30px 35px;font-family:'Segoe UI',Arial,sans-serif;color:#15233b}
.top{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:25px}.top h1{font-size:24px;margin:0}.top-actions{display:flex;gap:10px}.back,.primary{border-radius:24px;padding:12px 25px;cursor:pointer;font-weight:600}.back{background:white;color:#24445c;border:1px solid #d3deea}.primary{background:#609fc7;color:white;border:0;box-shadow:0 3px 8px #0002}.primary:disabled{opacity:.6;cursor:default}
.panel{border:1px solid #dae3ec;border-radius:17px;box-shadow:0 2px 5px #0000000c;padding:26px 22px;background:white}
.fields{max-width:720px;margin:auto;display:grid;grid-template-columns:1fr;gap:18px}.field{display:flex;flex-direction:column;gap:6px}label{font-size:13px;font-weight:700}.field input,.field select,.field textarea{box-sizing:border-box;width:100%;padding:10px 15px;min-height:42px;border:1px solid #cfd8e5;border-radius:11px;background:white;color:#1b2c43;font:inherit;font-size:14px}.field input:focus,.field select:focus,.field textarea:focus{outline:2px solid #a8cce2;outline-offset:1px}.field textarea{resize:vertical}.error{color:#d23b3b;font-size:13px}#vehicle-search{margin-bottom:5px}
@media(max-width:650px){.maintenance-form{padding:16px}.top{align-items:flex-start;flex-direction:column}.panel{padding:16px}}
</style>

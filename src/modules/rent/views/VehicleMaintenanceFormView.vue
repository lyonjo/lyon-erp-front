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
const selectedVehicle = ref(null)
const dropdownOpen = ref(false)
const vehiclePicker = ref(null)
const activeOption = ref(-1)
const loadingVehicles = ref(false)
const saving = ref(false)
const loading = ref(false)
const loaded = ref(false)
const error = ref('')
const fieldErrors = ref({})
let timer
let searchSeq = 0
let skipNextSearch = false

const vehicleLabel = v => [v.number, v.brand, v.model].filter(value => value !== null && value !== undefined && String(value).trim() !== '').join(' — ')

async function searchVehicles() {
  const seq = ++searchSeq
  loadingVehicles.value = true
  try {
    const { data } = await api.get('/rent/vehicle-maintenances/vehicle-options', {
      params: { search: vehicleSearch.value.trim() },
    })
    if (seq !== searchSeq) return
    vehicles.value = data.data ?? []
    activeOption.value = -1
  } catch (e) {
    if (seq === searchSeq) {
      error.value = e.response?.data?.message || t('Cannot load vehicles.', 'تعذر تحميل المركبات.')
    }
  } finally {
    if (seq === searchSeq) loadingVehicles.value = false
  }
}

watch(vehicleSearch, () => {
  if (skipNextSearch) { skipNextSearch = false; return }
  // A typed query is not a confirmed vehicle selection.
  form.value.car_id = ''
  selectedVehicle.value = null
  clearError('car_id')
  dropdownOpen.value = true
  clearTimeout(timer)
  timer = setTimeout(searchVehicles, 250)
})

function setVehicleInput(text) {
  skipNextSearch = true
  vehicleSearch.value = String(text ?? '')
}

function chooseVehicle(vehicle) {
  clearTimeout(timer)
  ++searchSeq
  loadingVehicles.value = false
  selectedVehicle.value = vehicle
  form.value.car_id = vehicle.id
  setVehicleInput(vehicle.number)
  dropdownOpen.value = false
  activeOption.value = -1
  clearError('car_id')
}

function openVehicles() {
  dropdownOpen.value = true
  if (!vehicles.value.length) searchVehicles()
}

function onPickerKeydown(e) {
  if (e.key === 'Escape') {
    dropdownOpen.value = false
    activeOption.value = -1
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    dropdownOpen.value = true
    activeOption.value = Math.min(activeOption.value + 1, vehicles.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeOption.value = Math.max(activeOption.value - 1, 0)
  } else if (e.key === 'Enter' && dropdownOpen.value && activeOption.value >= 0) {
    e.preventDefault()
    chooseVehicle(vehicles.value[activeOption.value])
  }
}

function outsidePicker(e) {
  if (vehiclePicker.value && !vehiclePicker.value.contains(e.target)) dropdownOpen.value = false
}

onMounted(() => document.addEventListener('pointerdown', outsidePicker))
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', outsidePicker)
  clearTimeout(timer)
  ++searchSeq
})

async function init() {
  loaded.value = false
  loading.value = true
  error.value = ''
  try {
    const [{ data: serviceResponse }] = await Promise.all([api.get('/rent/vehicle-maintenances/services'), searchVehicles()])
    services.value = serviceResponse.data ?? []
    if (editing.value) {
      const { data } = await api.get(`/rent/vehicle-maintenances/${id.value}`)
      const r = data.data
      form.value = { car_id: r.car_id, service_key: r.service_key, date: r.date, price: r.price, counter_km: r.counter_km, details: r.details ?? '' }
      // Keep edit-mode selection even if the vehicle is outside the first 50 options.
      const existingVehicle = vehicles.value.find(v => String(v.id) === String(r.car_id)) || {
        id: r.car_id, number: r.vehicle_no, brand: r.brand, model: r.model,
        model_year: r.model_year, company_name: r.company_name,
      }
      selectedVehicle.value = existingVehicle
      setVehicleInput(existingVehicle.number)
    }
  } catch (e) { error.value = e.response?.data?.message || t('Failed to load form.', 'تعذر تحميل النموذج.') }
  finally { loading.value = false; loaded.value = !error.value }
}
onMounted(init)
watch(id, init)
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
</script>

<template>
  <div class="maintenance-form">
    <header class="top">
      <h1>{{ editing ? t('Edit Vehicles Maintenance', 'تعديل صيانة المركبة') : t('Add Vehicles Maintenance', 'إضافة صيانة مركبة') }}</h1>
      <div class="top-actions"><button type="button" class="back" @click="router.push('/rent/vehicles-maintenance')">{{ t('Back', 'رجوع') }}</button><button class="primary" type="submit" form="maintenance-form" :disabled="saving || loading || !loaded">{{ saving ? t('Saving...', 'جار الحفظ...') : editing ? t('Save', 'حفظ') : t('Add Vehicles Maintenance', 'إضافة صيانة المركبة') }}</button></div>
    </header>
    <div class="panel" :aria-busy="loading">
      <div v-if="loading" class="loading-panel" role="status" aria-live="polite"><span class="spinner" aria-hidden="true"></span>{{ t('Loading maintenance data...', 'جار تحميل بيانات الصيانة...') }}</div>
      <div v-else-if="error && !loaded" class="loading-error" role="alert"><p class="error">{{ error }}</p><button type="button" class="back" @click="init">{{ t('Retry', 'إعادة المحاولة') }}</button></div>
      <template v-else>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <form id="maintenance-form" class="fields" @submit.prevent="submit">
        <div class="field">
          <label for="vehicle-search">{{ t('Vehicle No.', 'رقم المركبة') }} *</label>
          <div ref="vehiclePicker" class="vehicle-picker">
            <div class="picker-input-wrap">
              <input
                id="vehicle-search"
                v-model="vehicleSearch"
                type="text"
                role="combobox"
                aria-autocomplete="list"
                aria-controls="vehicle-option-list"
                :aria-expanded="dropdownOpen"
                :placeholder="t('Search vehicle number, brand or model...', 'ابحث برقم المركبة أو الماركة أو الموديل...')"
                autocomplete="off"
                required
                @focus="openVehicles"
                @keydown="onPickerKeydown"
              />
              <button class="picker-toggle" type="button" :aria-label="t('Show vehicles', 'عرض المركبات')" @click="dropdownOpen = !dropdownOpen; if (dropdownOpen && !vehicles.length) searchVehicles()">⌄</button>
            </div>
            <div v-if="dropdownOpen" id="vehicle-option-list" role="listbox" class="picker-options">
              <div v-if="loadingVehicles" class="picker-message">{{ t('Searching vehicles...', 'جار البحث عن المركبات...') }}</div>
              <template v-else-if="vehicles.length">
                <button
                  v-for="(v, index) in vehicles"
                  :key="v.id"
                  type="button"
                  role="option"
                  class="picker-option"
                  :class="{ highlighted: index === activeOption, selected: String(form.car_id) === String(v.id) }"
                  :aria-selected="String(form.car_id) === String(v.id)"
                  @mousedown.prevent
                  @click="chooseVehicle(v)"
                >
                  <span class="vehicle-number" dir="ltr">{{ v.number }}</span>
                  <span class="vehicle-description" dir="auto">{{ [v.brand, v.model].filter(Boolean).join(' — ') }}</span>
                </button>
              </template>
              <div v-else class="picker-message">{{ t('No vehicles found', 'لا توجد مركبات مطابقة') }}</div>
            </div>
          </div>
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
      </template>
    </div>
  </div>
</template>

<style scoped>
.maintenance-form{padding:20px 30px 35px;font-family:'Segoe UI',Arial,sans-serif;color:#15233b}
.top{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:25px}.top h1{font-size:24px;margin:0}.top-actions{display:flex;gap:10px}.back,.primary{border-radius:24px;padding:12px 25px;cursor:pointer;font-weight:600}.back{background:white;color:#24445c;border:1px solid #d3deea}.primary{background:#609fc7;color:white;border:0;box-shadow:0 3px 8px #0002}.primary:disabled{opacity:.6;cursor:default}
.panel{border:1px solid #dae3ec;border-radius:17px;box-shadow:0 2px 5px #0000000c;padding:26px 22px;background:white}
.fields{max-width:720px;margin:auto;display:grid;grid-template-columns:1fr;gap:18px}.field{display:flex;flex-direction:column;gap:6px}label{font-size:13px;font-weight:700}.field input,.field select,.field textarea{box-sizing:border-box;width:100%;padding:10px 15px;min-height:42px;border:1px solid #cfd8e5;border-radius:11px;background:white;color:#1b2c43;font:inherit;font-size:14px}.field input:focus,.field select:focus,.field textarea:focus{outline:2px solid #a8cce2;outline-offset:1px}.field textarea{resize:vertical}.error{color:#d23b3b;font-size:13px}
.vehicle-picker{position:relative;width:100%}
.picker-input-wrap{position:relative}
#vehicle-search{padding-inline-end:43px;margin:0}
.picker-toggle{position:absolute;inset-inline-end:5px;top:4px;height:34px;width:34px;border:0;background:transparent;color:#526579;cursor:pointer;font-size:21px}
.picker-options{position:absolute;top:calc(100% + 5px);inset-inline:0;max-height:250px;overflow-y:auto;background:#fff;border:1px solid #d5dfe9;border-radius:12px;box-shadow:0 10px 25px #15233b21;z-index:30;padding:5px}
.picker-option{width:100%;display:flex;align-items:center;gap:12px;text-align:start;border:0;border-radius:8px;background:transparent;color:#15233b;padding:11px 13px;font:inherit;font-size:13px;cursor:pointer}
.picker-option:hover,.picker-option.highlighted{background:#edf5fa}
.picker-option.selected{background:#e4f0f8}
.vehicle-number{font-weight:700;min-width:68px;flex-shrink:0}
.vehicle-description{color:#53657c;min-width:0;overflow-wrap:anywhere}
.picker-message{padding:14px;color:#7a8899;text-align:center;font-size:13px}

.loading-panel{min-height:290px;display:flex;align-items:center;justify-content:center;gap:12px;color:#64748b;font-size:14px}
.loading-error{min-height:210px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}
.spinner{display:inline-block;width:23px;height:23px;border:3px solid #d9e6ef;border-top-color:#609fc7;border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:650px){.maintenance-form{padding:16px}.top{align-items:flex-start;flex-direction:column}.panel{padding:16px}}
</style>

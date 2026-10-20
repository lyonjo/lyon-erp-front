<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const router = useRouter()
const route = useRoute()
const { locale } = useI18n()
const tr = (en, ar) => locale.value === 'ar' ? ar : en
const recordId = computed(() => route.params.id)
const isEdit = computed(() => Boolean(recordId.value))
const readOnly = computed(() => isEdit.value && !route.path.endsWith('/edit'))
const loading = ref(true)
const loaded = ref(false)
const saving = ref(false)
const error = ref('')
const fieldErrors = ref({})
const activeTab = ref(0)
const brands = ref([])
const models = ref([])
const suppliers = ref([])
const branches = ref([])

const defaults = () => ({
  number: '', brand_id: '', model_id: '', model_year: new Date().getFullYear(),
  supplier_id: '', branch_id: '', vin_number: '', engine_number: '',
  registration_number: '', fuel_type: '', engine_size: '', passenger_number: 4,
  gearbox_type: '', camera: false, bluetooth: false, license_expiration: '',
  insurance_expiration: '', current_km: 0, odometer: 0, status: true,
})
const form = ref(defaults())
const availableModels = computed(() => models.value.filter(x => String(x.brand_id) === String(form.value.brand_id)))
const location = computed(() => branches.value.find(x => String(x.id) === String(form.value.branch_id))?.name || '—')
watch(() => form.value.brand_id, () => {
  if (form.value.model_id && !availableModels.value.some(x => String(x.id) === String(form.value.model_id))) form.value.model_id = ''
})

async function initialize() {
  loading.value = true
  loaded.value = false
  error.value = ''
  try {
    const jobs = [api.get('/rent/external-vehicles/options')]
    if (recordId.value) jobs.push(api.get(`/rent/external-vehicles/${recordId.value}`))
    const [optionsResult, vehicleResult] = await Promise.all(jobs)
    const data = optionsResult.data.data || {}
    brands.value = data.brands || []
    models.value = data.models || []
    suppliers.value = data.suppliers || []
    branches.value = data.branches || []
    if (vehicleResult) {
      const v = vehicleResult.data.data
      const next = defaults()
      Object.keys(next).forEach(key => {
        if (v[key] !== undefined && v[key] !== null) next[key] = v[key]
      })
      next.license_expiration = String(v.license_expiration || '').slice(0, 10)
      next.insurance_expiration = String(v.insurance_expiration || '').slice(0, 10)
      form.value = next
    }
    loaded.value = true
  } catch (e) {
    error.value = e.response?.data?.message || tr('Unable to load vehicle information.', 'تعذر تحميل معلومات المركبة.')
  } finally { loading.value = false }
}
onMounted(initialize)

function validateInfo() {
  const keys = ['number', 'brand_id', 'model_id', 'model_year', 'supplier_id', 'branch_id']
  if (keys.some(key => form.value[key] === '' || form.value[key] === null || form.value[key] === undefined)) {
    error.value = tr('Complete the required vehicle information first.', 'أكمل معلومات المركبة المطلوبة أولاً.')
    return false
  }
  error.value = ''
  return true
}
function goNext() { if (readOnly.value || validateInfo()) activeTab.value = 1 }
function normalize() {
  const payload = { ...form.value }
  for (const key of ['vin_number', 'engine_number', 'registration_number', 'engine_size', 'license_expiration', 'insurance_expiration']) {
    if (payload[key] === '') payload[key] = null
  }
  payload.odometer = payload.odometer === '' ? null : payload.odometer
  return payload
}
async function save() {
  if (readOnly.value || loading.value || saving.value || !validateInfo()) return
  saving.value = true
  error.value = ''
  fieldErrors.value = {}
  try {
    if (isEdit.value) await api.put(`/rent/external-vehicles/${recordId.value}`, normalize())
    else await api.post('/rent/external-vehicles', normalize())
    router.push('/rent/external-vehicle')
  } catch (e) {
    fieldErrors.value = e.response?.data?.errors || {}
    error.value = e.response?.data?.message || tr('Could not save external vehicle.', 'تعذر حفظ المركبة الخارجية.')
  } finally { saving.value = false }
}
function firstError(key) { return fieldErrors.value[key]?.[0] || '' }
</script>

<template>
  <main class="form-page" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <header class="heading">
      <h1>{{ readOnly ? tr('External Vehicle Details','تفاصيل المركبة الخارجية') : isEdit ? tr('Edit External Vehicle','تعديل مركبة خارجية') : tr('Add External Vehicle','إضافة مركبة خارجية') }}</h1>
      <div class="header-actions">
        <button class="secondary" @click="router.push('/rent/external-vehicle')">{{ tr('Back','رجوع') }}</button>
        <button v-if="!readOnly" class="primary" :disabled="loading || saving" @click="save">{{ saving ? tr('Saving...','جارٍ الحفظ...') : tr('Save','حفظ') }}</button>
      </div>
    </header>
    <section class="form-card">
      <div class="tabs">
        <button :class="{ active: activeTab === 0 }" @click="activeTab = 0">{{ tr('Vehicle Information','معلومات المركبة') }}</button>
        <button :class="{ active: activeTab === 1 }" @click="goNext">{{ tr('Vehicle Specifications','مواصفات المركبة') }}</button>
      </div>
      <div v-if="loading" class="center-message" role="status"><div class="spinner"></div>{{ tr('Loading vehicle and dropdown information...', 'جارٍ تحميل معلومات المركبة والقوائم...') }}</div>
      <div v-else-if="!loaded" class="center-message error">{{ error }} <button @click="initialize">{{ tr('Retry','إعادة المحاولة') }}</button></div>
      <template v-else>
        <p v-if="error" class="error-banner">{{ error }}</p>
        <fieldset :disabled="readOnly || saving" class="fieldset">
          <div v-show="activeTab === 0" class="fields">
            <label>{{ tr('Vehicle No.', 'رقم المركبة') }} *<input v-model.trim="form.number" maxlength="100" required /><small v-if="firstError('number')">{{ firstError('number') }}</small></label>
            <label>{{ tr('Brand', 'الماركة') }} *<select v-model="form.brand_id" required><option value="">{{ tr('Select brand','اختر الماركة') }}</option><option v-for="x in brands" :key="x.id" :value="x.id">{{ x.name }}</option></select><small v-if="firstError('brand_id')">{{ firstError('brand_id') }}</small></label>
            <label>{{ tr('Model', 'الموديل') }} *<select v-model="form.model_id" required><option value="">{{ tr('Select model','اختر الموديل') }}</option><option v-for="x in availableModels" :key="x.id" :value="x.id">{{ x.name }}</option></select><small v-if="firstError('model_id')">{{ firstError('model_id') }}</small></label>
            <label>{{ tr('Model Year', 'سنة الصنع') }} *<input v-model.number="form.model_year" type="number" min="1950" max="2100" /></label>
            <label>{{ tr('Supplier', 'المورد') }} *<select v-model="form.supplier_id" required><option value="">{{ tr('Select supplier','اختر المورد') }}</option><option v-for="x in suppliers" :key="x.id" :value="x.id">{{ x.supplier_name }}</option></select><small v-if="firstError('supplier_id')">{{ firstError('supplier_id') }}</small></label>
            <label>{{ tr('Branch', 'الفرع') }} *<select v-model="form.branch_id" required><option value="">{{ tr('Select branch','اختر الفرع') }}</option><option v-for="x in branches" :key="x.id" :value="x.id">{{ x.name }}</option></select><small v-if="firstError('branch_id')">{{ firstError('branch_id') }}</small></label>
            <label>{{ tr('Current Location', 'الموقع الحالي') }}<input :value="location" disabled /></label>
            <label>{{ tr('VIN Number', 'رقم الهيكل') }}<input v-model.trim="form.vin_number" /></label>
            <label>{{ tr('Engine Number', 'رقم المحرك') }}<input v-model.trim="form.engine_number" /></label>
            <label>{{ tr('Registration Number', 'رقم التسجيل') }}<input v-model.trim="form.registration_number" /></label>
            <label>{{ tr('License Expiration', 'انتهاء الترخيص') }}<input v-model="form.license_expiration" type="date" /></label>
            <label>{{ tr('Insurance Expiration', 'انتهاء التأمين') }}<input v-model="form.insurance_expiration" type="date" /></label>
            <label>{{ tr('Status', 'الحالة') }}<select v-model="form.status"><option :value="true">{{ tr('Active','نشطة') }}</option><option :value="false">{{ tr('Inactive','غير نشطة') }}</option></select></label>
          </div>
          <div v-show="activeTab === 1" class="fields">
            <label>{{ tr('Engine Size', 'حجم المحرك') }}<input v-model.trim="form.engine_size" :placeholder="tr('e.g. 2000 cc','مثال 2000 سي سي')" /></label>
            <label>{{ tr('Fuel Type', 'نوع الوقود') }} *<select v-model="form.fuel_type"><option value="">{{ tr('Select fuel type','اختر نوع الوقود') }}</option><option value="gasoline">{{ tr('Gasoline','بنزين') }}</option><option value="diesel">{{ tr('Diesel','ديزل') }}</option><option value="electric">{{ tr('Electric','كهربائي') }}</option><option value="hyprid">{{ tr('Hybrid','هجين') }}</option></select></label>
            <label>{{ tr('Passengers Number', 'عدد الركاب') }} *<input v-model.number="form.passenger_number" type="number" min="1" max="100" /></label>
            <label>{{ tr('Gearbox', 'ناقل الحركة') }} *<select v-model="form.gearbox_type"><option value="">{{ tr('Select gearbox','اختر ناقل الحركة') }}</option><option value="manual">{{ tr('Manual','يدوي') }}</option><option value="automatic">{{ tr('Automatic','أوتوماتيكي') }}</option></select></label>
            <label>{{ tr('Current KM', 'الكيلومترات الحالية') }} *<input v-model.number="form.current_km" type="number" min="0" /></label>
            <label>{{ tr('Odometer', 'عداد المسافة') }}<input v-model.number="form.odometer" type="number" min="0" /></label>
            <label class="check-label"><span>{{ tr('Camera','كاميرا') }}</span><input v-model="form.camera" type="checkbox" /></label>
            <label class="check-label"><span>{{ tr('Bluetooth','بلوتوث') }}</span><input v-model="form.bluetooth" type="checkbox" /></label>
          </div>
        </fieldset>
        <div v-if="Object.keys(fieldErrors).length" class="error-list"><p v-for="(messages, key) in fieldErrors" :key="key">{{ key }}: {{ messages.join(', ') }}</p></div>
        <div class="bottom-actions">
          <button v-if="activeTab === 1" class="secondary" @click="activeTab = 0">{{ tr('Previous','السابق') }}</button>
          <button v-if="activeTab === 0" class="primary" @click="goNext">{{ tr('Next: Specifications','التالي: المواصفات') }}</button>
          <button v-else-if="!readOnly" :disabled="saving" class="primary" @click="save">{{ saving ? tr('Saving...','جارٍ الحفظ...') : tr('Save Vehicle','حفظ المركبة') }}</button>
        </div>
      </template>
    </section>
  </main>
</template>

<style scoped>
.form-page{padding:16px 22px 50px;color:#152238;font-family:'Segoe UI',Arial,sans-serif}.heading{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:45px}.heading h1{margin:0;font-size:28px}.header-actions,.bottom-actions{display:flex;gap:12px;align-items:center;justify-content:flex-end}.primary{border:0;border-radius:26px;background:#70a1c0;color:white;font-size:14px;font-weight:650;padding:11px 23px;cursor:pointer;box-shadow:0 2px 6px #17263222}.primary:disabled{opacity:.55}.secondary{background:white;border:1px solid #d7e0e9;border-radius:25px;padding:10px 23px;cursor:pointer}.form-card{border:1px solid #d6e0ea;border-radius:17px;box-shadow:0 2px 6px #14273b10;padding:25px 30px 32px;min-height:360px}.tabs{display:flex;justify-content:center;gap:55px;margin-bottom:46px;flex-wrap:wrap}.tabs button{border:0;background:none;color:#a4aebf;font-size:17px;font-weight:650;cursor:pointer}.tabs button.active{color:#14223b}.fieldset{border:0;padding:0;margin:0}.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;max-width:790px;margin:0 auto}.fields label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:650}.fields input:not([type=checkbox]),.fields select{box-sizing:border-box;width:100%;height:43px;border:1px solid #d3dce7;border-radius:12px;background:#fff;color:#25344b;padding:10px 13px;font:inherit;font-weight:400}.fields input:disabled{background:#f4f6f9}.fields :is(input,select):focus{outline:2px solid #c8e3f4}.fields small{color:#b73540;font-size:12px}.fields .check-label{flex-direction:row;align-items:center;justify-content:space-between;background:#f7f9fc;border:1px solid #e0e6ee;border-radius:12px;padding:13px 15px}.check-label input{width:18px;height:18px;accent-color:#70a1c0}.bottom-actions{max-width:790px;margin:28px auto 0}.center-message{min-height:230px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#8794a5}.center-message button{border:0;background:none;color:#447ba6;cursor:pointer}.spinner{width:28px;height:28px;border:3px solid #d9e8f1;border-top-color:#5f96b6;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.error-banner,.error-list{max-width:790px;margin:0 auto 20px;color:#b52d3e;background:#fff3f4;border-radius:10px;padding:10px 13px}.error-list{margin-top:18px}.error-list p{margin:4px 0}@media(max-width:700px){.form-page{padding:12px}.heading{align-items:flex-start;flex-direction:column;margin-bottom:20px}.form-card{padding:18px 14px}.fields{grid-template-columns:1fr}.tabs{gap:18px;margin-bottom:30px}}
</style>

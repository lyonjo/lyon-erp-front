<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
import SoldCarSearchSelect from '../components/SoldCarSearchSelect.vue'

const route = useRoute()
const router = useRouter()
const { locale } = useI18n()
const ar = computed(() => locale.value === 'ar')
const t = (en, arabic) => ar.value ? arabic : en
const editing = computed(() => Boolean(route.params.id))
const form = ref({ vehicle_id: null, company_id: null, buyer_name: '', phone: '', price: '' })
const vehicles = ref([])
const companies = ref([])
const vehicleText = ref('')
const companyText = ref('')
const busy = ref(false)
const loaded = ref(false)
const saving = ref(false)
const error = ref('')
const fields = ref({})
const vehicleLoading = ref(false)
const companyLoading = ref(false)
let vehicleSequence = 0
let companySequence = 0
let active = true

const vehicleLabel = (row, short = false) => short ? String(row.number ?? '') : [row.number, row.brand, row.model].filter(Boolean).join(' — ')
const companyLabel = (row) => row.name || ''

async function findVehicles(query = '') {
  const seq = ++vehicleSequence
  vehicleLoading.value = true
  try {
    const { data } = await api.get('/rent/sold-cars/vehicle-options', { params: { search: query, include_id: editing.value ? form.value.vehicle_id : undefined } })
    if (seq === vehicleSequence && active) vehicles.value = data.data ?? []
  } catch (e) { if (seq === vehicleSequence && active) error.value = e.response?.data?.message || t('Cannot load vehicles.', 'تعذر تحميل المركبات.') }
  finally { if (seq === vehicleSequence && active) vehicleLoading.value = false }
}
async function findCompanies(query = '') {
  const seq = ++companySequence
  companyLoading.value = true
  try {
    const { data } = await api.get('/rent/sold-cars/company-options', { params: { search: query } })
    if (seq === companySequence && active) companies.value = data.data ?? []
  } catch (e) { if (seq === companySequence && active) error.value = e.response?.data?.message || t('Cannot load companies.', 'تعذر تحميل الشركات.') }
  finally { if (seq === companySequence && active) companyLoading.value = false }
}
async function load() {
  busy.value = true
  loaded.value = false
  error.value = ''
  try {
    if (editing.value) {
      const { data } = await api.get(`/rent/sold-cars/${route.params.id}`)
      if (!active) return
      const row = data.data
      form.value = { vehicle_id: row.vehicle_id, company_id: row.company_id, buyer_name: row.buyer_name ?? '', phone: row.phone ?? '', price: row.price ?? '' }
      vehicleText.value = String(row.vehicle_no ?? '')
      companyText.value = row.company_name ?? ''
    }
    await Promise.all([findVehicles(), findCompanies()])
    if (active) loaded.value = true
  } catch (e) { if (active) error.value = e.response?.data?.message || t('Failed to load sale.', 'تعذر تحميل عملية البيع.') }
  finally { if (active) busy.value = false }
}
async function save() {
  if (saving.value || !loaded.value) return
  saving.value = true
  error.value = ''
  fields.value = {}
  try {
    const payload = { ...form.value }
    if (editing.value) await api.put(`/rent/sold-cars/${route.params.id}`, payload)
    else await api.post('/rent/sold-cars', payload)
    router.push('/rent/vehicles-sold')
  } catch (e) {
    fields.value = e.response?.data?.errors || {}
    error.value = e.response?.data?.message || t('Could not save sold vehicle.', 'تعذر حفظ المركبة المباعة.')
  } finally { saving.value = false }
}
function selectVehicle(row) { vehicleText.value = String(row.number); fields.value.vehicle_id = null }
function selectCompany(row) { companyText.value = row.name; fields.value.company_id = null }
watch(() => route.params.id, load)
onMounted(load)
onBeforeUnmount(() => { active = false; vehicleSequence++; companySequence++ })
</script>

<template>
  <div class="sold-form-page">
    <header class="heading">
      <h1>{{ editing ? t('Edit Sold Car', 'تعديل مركبة مباعة') : t('Add Sold Car', 'إضافة مركبة مباعة') }}</h1>
      <div class="head-actions">
        <button class="secondary" @click="router.push('/rent/vehicles-sold')">{{ t('Back', 'رجوع') }}</button>
        <button class="primary" :disabled="!loaded || saving" @click="save">{{ saving ? t('Saving…', 'جار الحفظ...') : editing ? t('Save Changes', 'حفظ التغييرات') : t('Add Sold Car', 'إضافة مركبة مباعة') }}</button>
      </div>
    </header>
    <section class="panel">
      <div v-if="busy || !loaded && !error" class="state" role="status"><span class="spinner"></span>{{ t('Loading data...', 'جار تحميل البيانات...') }}</div>
      <div v-else-if="!loaded" class="state danger">{{ error }} <button type="button" @click="load">{{ t('Retry', 'إعادة المحاولة') }}</button></div>
      <form v-else class="fields" @submit.prevent="save">
        <p v-if="error" class="danger" role="alert">{{ error }}</p>
        <label>{{ t('Buyer Name', 'اسم المشتري') }} *
          <input v-model="form.buyer_name" maxlength="200" required :placeholder="t('Enter buyer name', 'أدخل اسم المشتري')" />
          <small v-if="fields.buyer_name" class="danger">{{ fields.buyer_name[0] }}</small>
        </label>
        <label>{{ t('Car No.', 'رقم المركبة') }} *
          <SoldCarSearchSelect v-model="form.vehicle_id" :display-value="vehicleText" :results="vehicles" :loading="vehicleLoading" :option-label="vehicleLabel" :placeholder="t('Search vehicle number, brand or model...', 'ابحث برقم المركبة أو الماركة أو الموديل...')" :error="fields.vehicle_id?.[0]" @search="findVehicles" @select="selectVehicle">
            <template #empty>{{ t('No available vehicles', 'لا توجد مركبات متاحة') }}</template>
          </SoldCarSearchSelect>
        </label>
        <label>{{ t('Company', 'الشركة') }} *
          <SoldCarSearchSelect v-model="form.company_id" :display-value="companyText" :results="companies" :loading="companyLoading" :option-label="companyLabel" :placeholder="t('Search company...', 'ابحث عن الشركة...')" :error="fields.company_id?.[0]" @search="findCompanies" @select="selectCompany">
            <template #empty>{{ t('No companies found', 'لا توجد شركات') }}</template>
          </SoldCarSearchSelect>
        </label>
        <label>{{ t('Phone Number', 'رقم الهاتف') }} *
          <input v-model="form.phone" type="tel" maxlength="40" required dir="ltr" :placeholder="t('Enter phone number', 'أدخل رقم الهاتف')" />
          <small v-if="fields.phone" class="danger">{{ fields.phone[0] }}</small>
        </label>
        <label>{{ t('Price', 'السعر') }} *
          <input v-model="form.price" type="number" step="0.01" min="0" required dir="ltr" :placeholder="t('Enter price', 'أدخل السعر')" />
          <small v-if="fields.price" class="danger">{{ fields.price[0] }}</small>
        </label>
        <div class="tax-field">
          <strong>{{ t('Tax Status', 'الحالة الضريبية') }}</strong>
          <p><input type="checkbox" checked disabled /> {{ t('Non-Taxable — Tax is fixed at 0', 'غير خاضع للضريبة — قيمة الضريبة ثابتة 0') }}</p>
        </div>
        <button type="submit" class="primary mobile-save" :disabled="saving">{{ saving ? t('Saving...', 'جار الحفظ...') : t('Save', 'حفظ') }}</button>
      </form>
    </section>
  </div>
</template>

<style scoped>
.sold-form-page{padding:24px 28px;color:#15233b;font-family:'Segoe UI',Arial,sans-serif}.heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:36px}.heading h1{font-size:26px;margin:0}.head-actions{display:flex;gap:10px}.primary{border:0;background:#609fc7;color:white;border-radius:25px;padding:12px 24px;font-weight:600;cursor:pointer;box-shadow:0 3px 8px #0002}.primary:disabled{opacity:.6;cursor:not-allowed}.secondary{border:1px solid #d2deec;background:white;border-radius:25px;padding:12px 24px;cursor:pointer}.panel{border:1px solid #dce3eb;border-radius:16px;box-shadow:0 2px 6px #0001;padding:32px;min-height:420px}.fields{max-width:860px;margin:auto;display:grid;gap:22px}.fields label{font-weight:600;font-size:14px;display:block}.fields label>input{display:block;width:100%;height:42px;margin-top:8px;box-sizing:border-box;padding:0 14px;border:1px solid #cdd7e4;border-radius:11px;background:#fff;font:inherit;font-weight:400;color:#15233b}.fields label>input:focus{outline:2px solid #d4e8f4}.fields label :deep(.picker){margin-top:8px;font-weight:400}.tax-field strong{font-size:14px}.tax-field p{font-size:13px;font-weight:400;display:flex;align-items:center;gap:8px}.state{min-height:260px;display:flex;align-items:center;justify-content:center;gap:12px;color:#7c8da5}.spinner{width:22px;height:22px;border:3px solid #dbeaf3;border-top-color:#5d9cc7;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.danger{color:#c82929}.mobile-save{display:none}@media(max-width:700px){.sold-form-page{padding:15px}.heading h1{font-size:21px}.panel{padding:18px}.mobile-save{display:block}}
</style>

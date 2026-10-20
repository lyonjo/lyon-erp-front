<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const route = useRoute()
const router = useRouter()
const { locale } = useI18n()
const ar = computed(() => locale.value === 'ar')
const t = (en, arabic) => ar.value ? arabic : en
const record = ref(null)
const loading = ref(true)
const error = ref('')
let requestId = 0

async function load() {
  const seq = ++requestId
  loading.value = true
  record.value = null
  error.value = ''
  try {
    const { data } = await api.get(`/rent/vehicle-maintenances/${route.params.id}`)
    if (seq === requestId) {
      if (!data?.data) throw new Error('No maintenance record in response')
      record.value = data.data
    }
  } catch (e) {
    if (seq === requestId) error.value = e.response?.data?.message || t('Could not load maintenance details.', 'تعذر تحميل تفاصيل الصيانة.')
  } finally {
    if (seq === requestId) loading.value = false
  }
}
watch(() => route.params.id, load, { immediate: true })

const fields = computed(() => {
  const r = record.value
  if (!r) return []
  return [
    [t('Vehicle No.', 'رقم المركبة'), r.vehicle_no],
    [t('Brand', 'الماركة'), r.brand],
    [t('Model', 'الموديل'), r.model],
    [t('Model Year', 'سنة الصنع'), r.model_year],
    [t('Company Name', 'اسم الشركة'), r.company_name],
    [t('Service', 'الخدمة'), ar.value ? (r.service_ar || r.service) : r.service],
    [t('Date', 'التاريخ'), r.date],
    [t('Price', 'السعر'), r.price],
    [t('Num of Km', 'عدد الكيلومترات'), r.counter_km],
    [t('Details', 'التفاصيل'), r.details],
  ]
})
</script>

<template>
  <div class="details-page">
    <header class="top">
      <h1>{{ t('Vehicles Maintenance Details', 'تفاصيل صيانة المركبة') }}</h1>
      <div class="top-actions">
        <button type="button" class="back" @click="router.push('/rent/vehicles-maintenance')">{{ t('Back', 'رجوع') }}</button>
        <button v-if="record && !loading" type="button" class="primary" @click="router.push(`/rent/vehicles-maintenance/${record.id}/edit`)">{{ t('Edit', 'تعديل') }}</button>
      </div>
    </header>
    <section class="panel" :aria-busy="loading">
      <div v-if="loading" class="loading-panel" role="status" aria-live="polite"><span class="spinner" aria-hidden="true"></span>{{ t('Loading maintenance data...', 'جار تحميل بيانات الصيانة...') }}</div>
      <div v-else-if="error" class="loading-error" role="alert"><p>{{ error }}</p><button type="button" class="back" @click="load">{{ t('Retry', 'إعادة المحاولة') }}</button></div>
      <div v-else-if="record" class="info-grid">
        <div v-for="[label, value] in fields" :key="label" class="field">
          <div class="field-label">{{ label }}</div>
          <div class="field-value" dir="auto">{{ value === null || value === undefined || value === '' ? '—' : value }}</div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.details-page{padding:20px 30px 35px;font-family:'Segoe UI',Arial,sans-serif;color:#15233b}
.top{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:25px}.top h1{font-size:24px;margin:0}.top-actions{display:flex;gap:10px}
.back,.primary{border-radius:24px;padding:12px 25px;cursor:pointer;font-weight:600}.back{background:white;color:#24445c;border:1px solid #d3deea}.primary{background:#609fc7;color:#fff;border:0;box-shadow:0 3px 8px #0002}
.panel{border:1px solid #dae3ec;border-radius:17px;box-shadow:0 2px 5px #0000000c;padding:28px 24px;background:#fff;min-height:200px}
.info-grid{max-width:900px;margin:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 30px}
.field-label{font-size:13px;color:#718096;margin-bottom:8px;font-weight:600}.field-value{font-size:15px;font-weight:500;overflow-wrap:anywhere;white-space:pre-wrap}
.loading-panel{min-height:290px;display:flex;align-items:center;justify-content:center;gap:12px;color:#64748b;font-size:14px}.loading-error{min-height:210px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#b91c1c}
.spinner{display:inline-block;width:23px;height:23px;border:3px solid #d9e6ef;border-top-color:#609fc7;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:650px){.details-page{padding:16px}.top{align-items:flex-start;flex-direction:column}.panel{padding:18px}.info-grid{grid-template-columns:1fr}}
</style>

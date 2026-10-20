<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
const route = useRoute()
const router = useRouter()
const { locale } = useI18n()
const ar = computed(() => locale.value === 'ar')
const t = (en, arabic) => ar.value ? arabic : en
const row = ref(null)
const loading = ref(true)
const error = ref('')
let alive = true
async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get(`/rent/sold-cars/${route.params.id}`)
    if (alive) row.value = data.data
  } catch (e) { if (alive) error.value = e.response?.data?.message || t('Could not load sold vehicle.', 'تعذر تحميل المركبة المباعة.') }
  finally { if (alive) loading.value = false }
}
onMounted(load)
onBeforeUnmount(() => { alive = false })
const pairs = computed(() => row.value ? [
  [t('Sale ID', 'رقم البيع'), row.value.id],
  [t('Vehicle No.', 'رقم المركبة'), row.value.vehicle_no],
  [t('Brand', 'الماركة'), row.value.brand],
  [t('Model', 'الموديل'), row.value.model],
  [t('Model Year', 'سنة الصنع'), row.value.model_year],
  [t('Company', 'الشركة'), row.value.company_name],
  [t('Buyer Name', 'اسم المشتري'), row.value.buyer_name],
  [t('Phone Number', 'رقم الهاتف'), row.value.phone],
  [t('Price', 'السعر'), row.value.price],
  [t('Tax', 'الضريبة'), '0'],
] : [])
</script>

<template>
  <main class="page">
    <header><h1>{{ t('Sold Vehicle Details', 'تفاصيل المركبة المباعة') }}</h1><div class="buttons"><button class="secondary" @click="router.push('/rent/vehicles-sold')">{{ t('Back', 'رجوع') }}</button><button v-if="row" class="primary" @click="router.push(`/rent/vehicles-sold/${row.id}/edit`)">{{ t('Edit', 'تعديل') }}</button></div></header>
    <section class="panel">
      <div v-if="loading" class="state" role="status"><span class="spinner"></span>{{ t('Loading details...', 'جار تحميل التفاصيل...') }}</div>
      <div v-else-if="error" class="state error" role="alert">{{ error }} <button @click="load">{{ t('Retry', 'إعادة المحاولة') }}</button></div>
      <div v-else class="details"><div v-for="[label,value] in pairs" :key="label" class="detail"><span>{{ label }}</span><strong dir="auto">{{ value ?? '—' }}</strong></div></div>
    </section>
  </main>
</template>

<style scoped>
.page{padding:24px 28px;color:#15233b;font-family:'Segoe UI',Arial,sans-serif}header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:30px}h1{font-size:26px;margin:0}.buttons{display:flex;gap:10px}.primary,.secondary{padding:11px 22px;border-radius:25px;cursor:pointer}.primary{background:#609fc7;color:white;border:0}.secondary{background:white;color:#15233b;border:1px solid #d8e1eb}.panel{border:1px solid #dce3eb;border-radius:16px;box-shadow:0 2px 6px #0001;padding:30px;min-height:270px}.details{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 36px;max-width:920px;margin:auto}.detail{display:flex;flex-direction:column;gap:7px;border-bottom:1px solid #e8ecf0;padding:15px 5px}.detail span{font-size:13px;color:#8795aa}.detail strong{font-weight:600;font-size:15px;overflow-wrap:anywhere}.state{display:flex;align-items:center;justify-content:center;gap:12px;min-height:250px;color:#7c8da5}.spinner{width:22px;height:22px;border:3px solid #dbeaf3;border-top-color:#5d9cc7;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.error{color:#c82929}@media(max-width:650px){.page{padding:15px}.details{grid-template-columns:1fr}h1{font-size:21px}}
</style>

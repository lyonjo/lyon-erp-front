<script setup>
import { ref, computed, onMounted } from 'vue'
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
async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get(`/rent/drivers/${route.params.id}`)
    record.value = data.data
  } catch (e) { error.value = e.response?.data?.message || t('Unable to load driver.', 'تعذر تحميل السائق.') }
  finally { loading.value = false }
}
onMounted(load)
</script>

<template>
  <main class="show-page">
    <header class="heading"><h1>{{ t('Driver Details', 'تفاصيل السائق') }}</h1><div class="actions"><button class="back" @click="router.push('/rent/drivers')">{{ t('Back', 'رجوع') }}</button><button v-if="record" class="primary" @click="router.push(`/rent/drivers/${record.id}/edit`)">{{ t('Edit Driver', 'تعديل السائق') }}</button></div></header>
    <section class="panel">
      <div v-if="loading" class="loading" role="status"><span class="spinner"></span>{{ t('Loading driver details...', 'جار تحميل بيانات السائق...') }}</div>
      <div v-else-if="error" class="loading"><p class="error">{{ error }}</p><button class="back" @click="load">{{ t('Retry', 'إعادة المحاولة') }}</button></div>
      <div v-else-if="record" class="info-grid">
        <div><span>ID</span><strong>{{ record.id }}</strong></div>
        <div><span>{{ t('Driver Name', 'اسم السائق') }}</span><strong dir="auto">{{ record.name }}</strong></div>
        <div><span>{{ t('License Number', 'رقم الرخصة') }}</span><strong dir="ltr">{{ record.license_number }}</strong></div>
        <div><span>{{ t('Phone Number', 'رقم الهاتف') }}</span><strong dir="ltr">{{ record.phone || '—' }}</strong></div>
        <div><span>{{ t('Email', 'البريد الإلكتروني') }}</span><strong dir="ltr">{{ record.email || '—' }}</strong></div>
        <div><span>{{ t('Status', 'الحالة') }}</span><strong :class="record.status ? 'active' : 'inactive'">{{ record.status ? t('Active', 'نشط') : t('Inactive', 'غير نشط') }}</strong></div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.show-page{padding:24px 28px;color:#15233b;font-family:'Segoe UI',Arial,sans-serif}.heading{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:32px}.heading h1{font-size:26px;margin:0}.actions{display:flex;gap:10px}.primary,.back{cursor:pointer;border-radius:24px;padding:11px 24px;font-weight:600}.primary{background:#609fc7;color:white;border:0}.back{background:white;border:1px solid #d7e0ec;color:#15233b}.panel{border:1px solid #dbe2eb;border-radius:16px;padding:32px;background:white}.info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;max-width:900px;margin:auto}.info-grid>div{display:flex;flex-direction:column;gap:9px;padding:10px 0;border-bottom:1px solid #edf0f4}.info-grid span{font-size:13px;color:#8b9bb0}.info-grid strong{font-size:15px;font-weight:600}.active{color:#168047}.inactive{color:#b63a3a}.loading{min-height:220px;display:flex;justify-content:center;align-items:center;flex-direction:column;gap:12px;color:#7c8fa6}.error{color:#c62828}.spinner{display:block;border:3px solid #dfecf3;border-top-color:#609fc7;width:27px;height:27px;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:700px){.show-page{padding:16px}.heading h1{font-size:21px}.info-grid{grid-template-columns:1fr}.panel{padding:20px}}
</style>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const route = useRoute(), router = useRouter()
const { locale } = useI18n()
const tr = (en, ar) => locale.value === 'ar' ? ar : en
const companyId = computed(() => route.query.company_id)
const baseId = computed(() => route.query.base_price_id)
const loading = ref(true), saving = ref(false), error = ref(''), fieldErrors = ref({})
const car = ref(null), tab = ref('pricing'), periods = ref([])
const imageUrls = ref({})
const newInterval = () => ({ start: 1, end: 2, price: '' })
const newPeriod = () => ({ start_date: '', end_date: '', intervals: [newInterval()] })
const back = () => router.push('/rent/car-rental-price-company')

async function loadImage(image) {
  if (!image || !car.value) return
  try {
    const { data } = await api.get(`/rent/car-rental-prices/${car.value.base_price_id}/images/${image.id}`, { responseType: 'blob' })
    imageUrls.value[image.id] = URL.createObjectURL(data)
  } catch (_) { /* Image is optional for rendering, never writable here. */ }
}
async function init() {
  loading.value = true; error.value = ''
  if (!companyId.value || !baseId.value) { error.value = tr('Missing company or car.', 'الشركة أو السيارة غير محددة.'); loading.value = false; return }
  try {
    const { data } = await api.get('/rent/car-rental-prices/company/edit-data', { params: { company_id: companyId.value, base_price_id: baseId.value } })
    car.value = data.data
    periods.value = (car.value.periods || []).map(p => ({
      start_date: String(p.start_date || '').slice(0, 10), end_date: String(p.end_date || '').slice(0, 10),
      intervals: (p.intervals || []).map(i => ({ start: i.start, end: i.end, price: i.price })),
    }))
    if (!periods.value.length) periods.value = [newPeriod()]
    await Promise.all([car.value.main_image, ...(car.value.gallery_images || [])].filter(Boolean).map(loadImage))
  } catch (e) { error.value = e.response?.data?.message || tr('Unable to load pricing.', 'تعذر تحميل التسعير.') }
  finally { loading.value = false }
}
async function save() {
  if (!car.value || saving.value) return
  saving.value = true; error.value = ''; fieldErrors.value = {}
  try {
    await api.post('/rent/car-rental-prices/company/save', {
      company_id: Number(companyId.value), base_price_id: Number(baseId.value), periods: periods.value,
    })
    back()
  } catch (e) {
    fieldErrors.value = e.response?.data?.errors || {}
    error.value = e.response?.data?.message || tr('Save failed.', 'تعذر الحفظ.')
    tab.value = 'pricing'
  } finally { saving.value = false }
}
function addPeriod() { periods.value.push(newPeriod()) }
function removePeriod(i) { if (periods.value.length > 1) periods.value.splice(i, 1) }
function addInterval(p) { p.intervals.push(newInterval()) }
function removeInterval(p, i) { if (p.intervals.length > 1) p.intervals.splice(i, 1) }
onMounted(init)
onBeforeUnmount(() => Object.values(imageUrls.value).forEach(URL.revokeObjectURL))
</script>

<template>
  <section class="company-editor">
    <div class="head"><h2>{{ tr('Edit Car', 'تعديل السيارة') }}</h2><div class="head-buttons">
      <button class="secondary" @click="back">{{ tr('Back', 'رجوع') }}</button>
      <button class="primary" :disabled="loading || saving || !car" @click="save">{{ saving ? tr('Saving...', 'جاري الحفظ...') : tr('Save', 'حفظ') }}</button>
    </div></div>
    <div v-if="loading" class="loading">{{ tr('Loading company pricing...', 'جاري تحميل تسعير الشركة...') }}</div>
    <div v-else-if="error && !car" class="error">{{ error }} <button @click="init">{{ tr('Retry', 'إعادة المحاولة') }}</button></div>
    <template v-else-if="car">
      <div class="car-line"><div class="car-name">{{ car.brand?.name }} {{ car.model?.name }} {{ car.model_year }}</div>
        <strong class="company-name">{{ car.company?.name }}</strong></div>
      <p v-if="!car.customized" class="info">{{ tr('Base customer prices are prefilled. Saving creates pricing for this company only.', 'تم تعبئة أسعار العملاء الأساسية. الحفظ ينشئ تسعيراً خاصاً بهذه الشركة فقط.') }}</p>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-for="(msgs, key) in fieldErrors" :key="key" class="error">{{ key }}: {{ msgs.join(', ') }}</p>
      <div class="workspace">
        <nav class="tabs"><button :class="{ active: tab === 'pricing' }" @click="tab = 'pricing'">{{ tr('Rental Pricing', 'أسعار التأجير') }}</button>
          <button :class="{ active: tab === 'images' }" @click="tab = 'images'">{{ tr('Car Images', 'صور السيارة') }}</button></nav>
        <div v-if="tab === 'pricing'" class="plans">
          <article v-for="(p, i) in periods" :key="i" class="plan">
            <div class="plan-title"><strong>{{ tr('Pricing Plan', 'خطة التسعير') }} {{ i + 1 }}</strong>
              <button v-if="periods.length > 1" class="danger" @click="removePeriod(i)">{{ tr('Remove Plan', 'حذف الخطة') }}</button></div>
            <div class="dates"><div class="field"><label>{{ tr('Start Date', 'تاريخ البداية') }}</label><input v-model="p.start_date" type="date" /></div>
              <div class="field"><label>{{ tr('End Date', 'تاريخ النهاية') }}</label><input v-model="p.end_date" type="date" /></div></div>
            <div v-for="(range, j) in p.intervals" :key="j" class="interval"><strong>{{ tr('Internal', 'الفترة') }} ({{ j + 1 }}) {{ tr('Price', 'السعر') }}</strong>
              <div class="ranges"><div class="field"><label>{{ tr('From (days)', 'من (أيام)') }}</label><input v-model.number="range.start" type="number" min="1" /></div>
                <div class="field"><label>{{ tr('To (days)', 'إلى (أيام)') }}</label><input v-model.number="range.end" type="number" min="2" /></div>
                <div class="field"><label>{{ tr('Price', 'السعر') }}</label><input v-model.number="range.price" type="number" min="0" step="0.01" /></div>
                <button v-if="p.intervals.length > 1" class="danger remove" @click="removeInterval(p, j)">▤</button></div></div>
            <div class="add-interval"><button @click="addInterval(p)">+ {{ tr('New Internal', 'فترة جديدة') }}</button></div>
          </article>
          <button class="primary add-plan" @click="addPeriod">+ {{ tr('New Pricing Plan', 'خطة تسعير جديدة') }}</button>
        </div>
        <div v-else class="images-panel">
          <p class="image-notice">{{ tr('Images are inherited from Customer Pricing. They cannot be edited here.', 'الصور مأخوذة من تسعير العملاء ولا يمكن تعديلها هنا.') }}</p>
          <label>{{ tr('Main Image', 'الصورة الرئيسية') }}</label>
          <div class="image-box"><img v-if="car.main_image && imageUrls[car.main_image.id]" :src="imageUrls[car.main_image.id]" alt="Main car" /><span v-else>—</span></div>
          <label>{{ tr('Gallery Images', 'صور المعرض') }}</label>
          <div class="gallery"><div v-for="img in car.gallery_images" :key="img.id" class="gallery-item">
            <img v-if="imageUrls[img.id]" :src="imageUrls[img.id]" alt="Gallery car" /><span v-else>—</span></div></div>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.company-editor{padding:16px 20px;color:#092143}.head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:25px}.head h2{margin:0;font-size:26px}.head-buttons{display:flex;gap:10px}button{cursor:pointer}.primary{border:0;background:#70a4c4;color:white;border-radius:25px;padding:9px 26px;min-width:110px;font-weight:600}.primary:disabled{opacity:.5}.secondary{border:1px solid #d7dfe7;background:white;border-radius:25px;padding:9px 22px}.car-line{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:22px;flex-wrap:wrap}.car-name{border:1px solid #d6dfe8;border-radius:11px;background:#f8f9fa;padding:11px 20px;font-size:13px;min-width:230px}.company-name{font-size:13px}.info{font-size:12px;color:#476789}.workspace{border:1px solid #d9e1e9;border-radius:14px;background:white;min-height:420px;padding:25px 20px 45px}.tabs{display:flex;justify-content:center;gap:35px;margin-bottom:25px}.tabs button{border:0;background:none;color:#a2a9bb;font-weight:600;font-size:15px}.tabs button.active{color:#092143}.plans{display:flex;flex-direction:column;align-items:center;gap:20px}.plan{border:1px solid #dce3eb;border-radius:12px;box-shadow:0 2px 5px #0001;width:min(850px,100%);box-sizing:border-box;padding:24px}.plan-title{display:flex;justify-content:space-between;margin-bottom:25px}.dates,.ranges{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:20px}.ranges{grid-template-columns:1.2fr 1.2fr .85fr 28px;align-items:end;gap:14px}.field{min-width:0}.field label{display:block;font-weight:600;font-size:12px;margin-bottom:9px}.field input{box-sizing:border-box;width:100%;height:42px;padding:7px 12px;border:1px solid #d9e0e8;border-radius:12px;color:#092143;background:white}.interval{margin-top:20px}.interval>strong{display:block;margin-bottom:20px;font-size:13px}.danger{border:0;background:none;color:#c33846}.remove{height:42px}.add-interval{display:flex;justify-content:flex-end}.add-interval button{border:0;background:none;color:#092143;font-weight:650}.add-plan{margin-top:12px}.images-panel{width:min(850px,100%);margin:auto}.images-panel label{display:block;font-weight:650;margin:22px 0 10px}.image-notice{font-size:12px;color:#6b7890}.image-box{border:1px dashed #8295a9;min-height:180px;display:flex;justify-content:center;align-items:center}.image-box img{max-height:185px;max-width:100%;object-fit:contain}.gallery{display:flex;gap:12px;flex-wrap:wrap;border:1px dashed #8295a9;padding:14px;min-height:100px}.gallery-item{width:150px;height:100px;border:1px solid #d7dfe8;border-radius:8px;display:flex;align-items:center;justify-content:center}.gallery img{max-width:100%;max-height:100%;object-fit:contain}.error{padding:12px;color:#b42336;background:#fff3f5;border-radius:8px}.loading{text-align:center;padding:80px}@media(max-width:650px){.dates,.ranges{grid-template-columns:1fr}.head h2{font-size:20px}.workspace{padding:15px}.head{flex-wrap:wrap}}
</style>

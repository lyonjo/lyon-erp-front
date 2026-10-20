<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const router = useRouter()
const { locale } = useI18n()
const tr = (en, ar) => locale.value === 'ar' ? ar : en
const companies = ref([])
const companyId = ref('')
const companyQuery = ref('')
const companyOpen = ref(false)
const companiesLoading = ref(false)
const rows = ref([])
const busy = ref(false)
const error = ref('')
const search = ref('')
const perPage = ref(10)
const page = ref(1)
const lastPage = ref(1)
const total = ref(0)
const images = ref({})
let timer, companyTimer, revision = 0

async function loadCompanies() {
  companiesLoading.value = true
  try {
    const { data } = await api.get('/rent/car-rental-prices/company/companies', { params: { search: companyQuery.value } })
    companies.value = data.data || []
  } catch (e) { error.value = e.response?.data?.message || tr('Could not load companies.', 'تعذر تحميل الشركات.') }
  finally { companiesLoading.value = false }
}
function chooseCompany(c) {
  companyId.value = String(c.id)
  companyQuery.value = c.name
  companyOpen.value = false
  page.value = 1
  load()
}
async function load() {
  const r = ++revision
  rows.value = []
  Object.values(images.value).forEach(URL.revokeObjectURL)
  images.value = {}
  if (!companyId.value) { busy.value = false; total.value = 0; lastPage.value = 1; return }
  busy.value = true; error.value = ''
  try {
    const { data } = await api.get('/rent/car-rental-prices/company/cars', { params: {
      company_id: companyId.value, search: search.value, page: page.value, per_page: perPage.value,
    } })
    if (r !== revision) return
    rows.value = data.data || []
    total.value = data.total ?? 0
    lastPage.value = data.last_page || 1
    // Images always belong to the BASE customer pricing record.
    for (const row of rows.value) {
      if (!row.main_image) continue
      api.get(`/rent/car-rental-prices/${row.base_price_id}/images/${row.main_image.id}`, { responseType: 'blob' })
        .then(({ data: blob }) => { if (r === revision) images.value[row.base_price_id] = URL.createObjectURL(blob) })
        .catch(() => {})
    }
  } catch (e) { if (r === revision) error.value = e.response?.data?.message || tr('Could not load prices.', 'تعذر تحميل الأسعار.') }
  finally { if (r === revision) busy.value = false }
}
function edit(row) {
  router.push({ path: '/rent/car-rental-price-company/edit', query: {
    company_id: companyId.value, base_price_id: row.base_price_id,
  } })
}
watch(search, () => { clearTimeout(timer); timer = setTimeout(() => { page.value = 1; load() }, 300) })
watch(perPage, () => { page.value = 1; load() })
watch(page, load)
watch(companyQuery, () => { clearTimeout(companyTimer); if (companyOpen.value) companyTimer = setTimeout(loadCompanies, 250) })
onMounted(loadCompanies)
onBeforeUnmount(() => { revision++; clearTimeout(timer); clearTimeout(companyTimer); Object.values(images.value).forEach(URL.revokeObjectURL) })
</script>

<template>
  <section class="company-prices">
    <h2>{{ tr('Car Rental Price Company', 'أسعار تأجير السيارات للشركات') }}</h2>
    <div class="company-line">
      <label>{{ tr('Search By', 'بحث حسب') }}</label>
      <div class="company-picker">
        <input v-model="companyQuery" :placeholder="tr('Select customer company', 'اختر شركة العميل')"
          :aria-label="tr('Customer company', 'شركة العميل')" @focus="companyOpen = true; loadCompanies()"
          @input="companyId = ''; companyOpen = true" />
        <button type="button" @click="companyOpen = !companyOpen; if (companyOpen) loadCompanies()">⌄</button>
        <div v-if="companyOpen" class="options">
          <button v-for="c in companies" :key="c.id" type="button" @click="chooseCompany(c)">{{ c.name }}</button>
          <div v-if="!companiesLoading && !companies.length" class="empty">{{ tr('No companies found', 'لا توجد شركات') }}</div>
          <div v-if="companiesLoading" class="empty">{{ tr('Loading...', 'جاري التحميل...') }}</div>
        </div>
      </div>
    </div>
    <p v-if="!companyId" class="hint">{{ tr('Select a company to display cars.', 'اختر شركة لعرض السيارات.') }}</p>
    <template v-else>
      <div class="toolbar">
        <input v-model="search" :placeholder="tr('Search brand, model or year...', 'بحث بالماركة أو الموديل أو السنة...')" />
        <select v-model.number="perPage"><option :value="10">10</option><option :value="15">15</option><option :value="25">25</option><option :value="50">50</option></select>
      </div>
      <p v-if="error" class="error">{{ error }} <button @click="load">{{ tr('Retry', 'إعادة المحاولة') }}</button></p>
      <div class="table-box"><table><thead><tr>
        <th>ID</th><th>{{ tr('Image', 'الصورة') }}</th><th>{{ tr('Vehicle Brand', 'ماركة السيارة') }}</th>
        <th>{{ tr('Vehicle Name', 'اسم السيارة') }}</th><th>{{ tr('Vehicle Model', 'سنة الموديل') }}</th>
        <th>{{ tr('Pricing', 'التسعير') }}</th><th>{{ tr('Action', 'الإجراء') }}</th>
      </tr></thead><tbody>
        <tr v-if="busy"><td colspan="7" class="center">{{ tr('Loading...', 'جاري التحميل...') }}</td></tr>
        <tr v-for="row in (busy ? [] : rows)" :key="row.base_price_id">
          <td>{{ row.base_price_id }}</td><td><img v-if="images[row.base_price_id]" class="thumb" :src="images[row.base_price_id]" alt="" /><span v-else>—</span></td>
          <td>{{ row.brand?.name || '—' }}</td><td>{{ row.model?.name || '—' }}</td><td>{{ row.model_year }}</td>
          <td>{{ row.customized ? tr('Customized', 'مخصص') : tr('Base pricing', 'السعر الأساسي') }}</td>
          <td><button class="action" @click="edit(row)">✎ {{ row.customized ? tr('Edit', 'تعديل') : tr('Customize', 'تخصيص') }}</button></td>
        </tr>
        <tr v-if="!busy && !error && !rows.length"><td colspan="7" class="center">{{ tr('No records found', 'لا توجد سجلات') }}</td></tr>
      </tbody></table></div>
      <div class="pagination"><span>{{ total }} {{ tr('records', 'سجل') }}</span>
        <button :disabled="page <= 1 || busy" @click="page--">‹</button><span>{{ page }} / {{ lastPage }}</span>
        <button :disabled="page >= lastPage || busy" @click="page++">›</button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.company-prices{padding:14px 12px;color:#092143}.company-prices h2{font-size:24px;margin:0 0 24px}.company-line{display:flex;align-items:center;gap:18px;margin-bottom:22px}.company-line label{font-size:13px}.company-picker{position:relative;display:flex;width:min(395px,85vw);height:34px;border:1px solid #d3dce5;border-radius:9px;background:white}.company-picker input{min-width:0;flex:1;border:0;background:none;outline:none;padding:0 12px;color:#092143;font-size:12px}.company-picker>button{background:none;border:0;padding:0 14px;cursor:pointer}.options{position:absolute;top:36px;left:0;right:0;max-height:240px;overflow:auto;border:1px solid #d4dce4;background:white;z-index:30;border-radius:9px;box-shadow:0 10px 25px #0002}.options button{display:block;width:100%;text-align:start;padding:10px 12px;border:0;background:white;cursor:pointer;color:#092143}.options button:hover{background:#eef6fb}.empty{padding:10px;color:#798499}.hint{color:#748096;font-size:13px}.toolbar{display:flex;gap:10px;justify-content:flex-end;margin-bottom:12px}.toolbar input,.toolbar select{height:30px;box-sizing:border-box;border:1px solid #d3dce5;border-radius:8px;background:white;padding:4px 9px;font-size:12px}.toolbar input{width:min(275px,70vw)}.table-box{overflow-x:auto;border:1px solid #dbe0e6;border-radius:12px;background:white}table{width:100%;min-width:780px;border-collapse:collapse;font-size:13px}th,td{text-align:start;padding:14px 18px;border-bottom:1px solid #e2e6eb}th{color:#929bb2;font-weight:500}tr:last-child td{border:0}.thumb{width:65px;height:44px;object-fit:cover;border-radius:6px}.action{background:none;border:0;padding:5px;color:#193b62;cursor:pointer;font-size:12px}.center{text-align:center;padding:30px}.pagination{display:flex;align-items:center;justify-content:flex-end;gap:12px;margin-top:15px}.pagination button{border:1px solid #d6dee6;border-radius:7px;background:white;padding:5px 12px;cursor:pointer}.pagination button:disabled{opacity:.4}.error{color:#bb2435}
</style>

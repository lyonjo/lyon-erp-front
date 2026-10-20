<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const router = useRouter()
const { locale } = useI18n()
const ar = computed(() => locale.value === 'ar')
const t = (en, arabic) => ar.value ? arabic : en
const records = ref([])
const meta = ref({ current_page: 1, last_page: 1, total: 0 })
const loading = ref(false)
const error = ref('')
const search = ref('')
const page = ref(1)
const perPage = ref(15)
const removing = ref(null)
let requestCounter = 0
let debounce

async function load() {
  const id = ++requestCounter
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/rent/vehicle-maintenances', {
      params: { search: search.value, page: page.value, per_page: perPage.value },
    })
    if (requestCounter !== id) return
    records.value = data.data ?? []
    meta.value = data.meta ?? { current_page: 1, last_page: 1, total: 0 }
  } catch (e) {
    if (requestCounter === id) error.value = e.response?.data?.message || t('Failed to load maintenance records.', 'تعذر تحميل سجلات الصيانة.')
  } finally {
    if (requestCounter === id) loading.value = false
  }
}
watch(search, () => { clearTimeout(debounce); debounce = setTimeout(() => { page.value = 1; load() }, 350) })
watch(perPage, () => { page.value = 1; load() })
watch(page, load)
onMounted(load)
onBeforeUnmount(() => { clearTimeout(debounce); ++requestCounter })

async function removeRecord(record) {
  if (!window.confirm(t(`Delete maintenance #${record.id}?`, `هل تريد حذف سجل الصيانة رقم ${record.id}؟`))) return
  removing.value = record.id
  try {
    await api.delete(`/rent/vehicle-maintenances/${record.id}`)
    if (records.value.length === 1 && page.value > 1) page.value -= 1
    else await load()
  } catch (e) {
    error.value = e.response?.data?.message || t('Delete failed.', 'فشل الحذف.')
  } finally { removing.value = null }
}
const serviceName = row => ar.value ? row.service_ar : row.service
</script>

<template>
  <div class="maintenance-page">
    <header class="heading">
      <h1>{{ t('Vehicles Maintenance', 'صيانة المركبات') }}</h1>
      <button class="primary" @click="router.push('/rent/vehicles-maintenance/create')">+ {{ t('Add Vehicles Maintenance', 'إضافة صيانة مركبة') }}</button>
    </header>
    <div class="toolbar">
      <input v-model="search" :placeholder="t('Search vehicle, brand, model, company, service...', 'ابحث برقم المركبة أو الماركة أو الموديل أو الشركة أو الخدمة...')" />
      <select v-model.number="perPage" :aria-label="t('Rows per page', 'عدد الصفوف')">
        <option v-for="n in [10,15,25,50,100]" :key="n" :value="n">{{ n }} {{ t('per page', 'لكل صفحة') }}</option>
      </select>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }} <button @click="load">{{ t('Retry', 'إعادة المحاولة') }}</button></p>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>ID</th><th>{{ t('Vehicle No.', 'رقم المركبة') }}</th><th>{{ t('Brand', 'الماركة') }}</th><th>{{ t('Model', 'الموديل') }}</th>
          <th>{{ t('Model Year', 'سنة الصنع') }}</th><th>{{ t('Company Name', 'اسم الشركة') }}</th><th>{{ t('Service', 'الخدمة') }}</th>
          <th>{{ t('Date', 'التاريخ') }}</th><th>{{ t('Num of Km', 'عدد الكيلومترات') }}</th><th>{{ t('Actions', 'الإجراءات') }}</th>
        </tr></thead>
        <tbody>
          <tr v-if="loading"><td colspan="10" class="empty">{{ t('Loading...', 'جار التحميل...') }}</td></tr>
          <tr v-else-if="!records.length"><td colspan="10" class="empty">{{ t('No maintenance records found.', 'لا توجد سجلات صيانة.') }}</td></tr>
          <template v-else><tr v-for="r in records" :key="r.id">
            <td>{{ r.id }}</td><td dir="ltr">{{ r.vehicle_no || '—' }}</td><td>{{ r.brand || '—' }}</td><td>{{ r.model || '—' }}</td>
            <td>{{ r.model_year || '—' }}</td><td>{{ r.company_name || '—' }}</td><td>{{ serviceName(r) || '—' }}</td>
            <td dir="ltr">{{ r.date }}</td><td dir="ltr">{{ r.counter_km }}</td>
            <td><div class="actions">
              <button @click="router.push(`/rent/vehicles-maintenance/${r.id}/edit`)">{{ t('Edit', 'تعديل') }}</button>
              <button class="danger" :disabled="removing === r.id" @click="removeRecord(r)">{{ t('Delete', 'حذف') }}</button>
            </div></td>
          </tr></template>
        </tbody>
      </table>
    </div>
    <footer class="pagination">
      <button :disabled="loading || page <= 1" @click="page--">{{ t('Previous', 'السابق') }}</button>
      <span dir="ltr">{{ meta.current_page }} / {{ meta.last_page }} · {{ meta.total }} {{ t('records', 'سجل') }}</span>
      <button :disabled="loading || page >= meta.last_page" @click="page++">{{ t('Next', 'التالي') }}</button>
    </footer>
  </div>
</template>

<style scoped>
.maintenance-page{padding:24px 28px;color:#15233b;font-family:'Segoe UI',Arial,sans-serif}
.heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 0 28px}
h1{font-size:26px;margin:0;font-weight:700}
.primary{background:#609fc7;border:0;color:white;padding:12px 24px;border-radius:24px;font-weight:600;cursor:pointer;box-shadow:0 3px 8px #0002}
.toolbar{display:flex;gap:12px;justify-content:flex-end;margin-bottom:20px;flex-wrap:wrap}
.toolbar input,.toolbar select{border:1px solid #cfd8e5;border-radius:9px;background:white;padding:10px 12px;color:#34445c;min-height:40px}
.toolbar input{width:min(350px,100%)}
.table-wrap{border:1px solid #e0e6ef;border-radius:15px;overflow-x:auto}
table{width:100%;border-collapse:collapse;white-space:nowrap;font-size:13px}th{color:#98a5b8;font-weight:600}th,td{padding:17px 14px;border-bottom:1px solid #e9edf3;text-align:start}tbody tr:last-child td{border-bottom:0}
.empty{text-align:center;color:#94a3b8;padding:46px}
.actions{display:flex;gap:12px}.actions button{background:none;border:0;color:#18324b;cursor:pointer;font-size:13px}.actions .danger{color:#d13d45}
.pagination{display:flex;justify-content:center;align-items:center;gap:16px;margin-top:20px;color:#63748c;font-size:13px}.pagination button{background:white;border:1px solid #e1e7ef;border-radius:9px;padding:10px 14px;cursor:pointer}.pagination button:disabled{opacity:.4;cursor:default}
.error{color:#b91c1c}.error button{margin-inline-start:8px}
@media(max-width:650px){.maintenance-page{padding:16px}.heading{align-items:flex-start;flex-direction:column}.toolbar{justify-content:stretch}.toolbar input{flex:1}}
</style>

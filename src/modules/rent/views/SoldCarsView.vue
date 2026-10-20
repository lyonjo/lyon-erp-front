<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
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
const deleting = ref(false)
const deleteTarget = ref(null)
const deleteError = ref('')
const dialog = ref(null)
let sequence = 0
let debounce

async function load() {
  const id = ++sequence
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/rent/sold-cars', { params: { search: search.value, per_page: perPage.value, page: page.value } })
    if (id !== sequence) return
    records.value = data.data ?? []
    meta.value = data.meta ?? { current_page: 1, last_page: 1, total: 0 }
  } catch (e) {
    if (id === sequence) error.value = e.response?.data?.message || t('Failed to load sold vehicles.', 'تعذر تحميل المركبات المباعة.')
  } finally { if (id === sequence) loading.value = false }
}
watch(search, () => { clearTimeout(debounce); debounce = setTimeout(() => { if (page.value !== 1) page.value = 1; else load() }, 350) })
watch(perPage, () => { if (page.value !== 1) page.value = 1; else load() })
watch(page, load)
onMounted(() => { load(); document.addEventListener('keydown', keydown) })
onBeforeUnmount(() => { clearTimeout(debounce); ++sequence; document.removeEventListener('keydown', keydown) })
function askDelete(row) { deleteTarget.value = row; deleteError.value = ''; nextTick(() => dialog.value?.focus()) }
function closeDelete() { if (!deleting.value) { deleteTarget.value = null; deleteError.value = '' } }
function keydown(e) { if (e.key === 'Escape') closeDelete() }
async function confirmDelete() {
  if (!deleteTarget.value || deleting.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await api.delete(`/rent/sold-cars/${deleteTarget.value.id}`)
    deleteTarget.value = null
    if (records.value.length === 1 && page.value > 1) page.value -= 1
    else await load()
  } catch (e) { deleteError.value = e.response?.data?.message || t('Unable to delete record.', 'تعذر حذف السجل.') }
  finally { deleting.value = false }
}
</script>

<template>
  <div class="sold-page">
    <header class="heading">
      <h1>{{ t('Sold Vehicles', 'المركبات المباعة') }}</h1>
      <button type="button" class="primary" @click="router.push('/rent/vehicles-sold/create')">+ {{ t('Add Sold Car', 'إضافة مركبة مباعة') }}</button>
    </header>
    <div class="toolbar">
      <input v-model="search" :placeholder="t('Search vehicle, buyer, company...', 'ابحث عن المركبة أو المشتري أو الشركة...')" :aria-label="t('Search', 'بحث')" />
      <select v-model.number="perPage" :aria-label="t('Rows per page', 'عدد الصفوف')">
        <option v-for="n in [10,15,25,50,100]" :key="n" :value="n">{{ n }} {{ t('per page', 'لكل صفحة') }}</option>
      </select>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }} <button type="button" @click="load">{{ t('Retry', 'إعادة المحاولة') }}</button></p>
    <div class="table-wrap"><table>
      <thead><tr>
        <th>ID</th><th>{{ t('Vehicle No.', 'رقم المركبة') }}</th><th>{{ t('Brand', 'الماركة') }}</th><th>{{ t('Model', 'الموديل') }}</th>
        <th>{{ t('Model Year', 'سنة الصنع') }}</th><th>{{ t('Company', 'الشركة') }}</th><th>{{ t('Buyer', 'المشتري') }}</th>
        <th>{{ t('Phone', 'الهاتف') }}</th><th>{{ t('Price', 'السعر') }}</th><th>{{ t('Actions', 'الإجراءات') }}</th>
      </tr></thead>
      <tbody>
        <tr v-if="loading"><td colspan="10" class="empty">{{ t('Loading...', 'جار التحميل...') }}</td></tr>
        <tr v-else-if="!records.length"><td colspan="10" class="empty">{{ t('No sold vehicles found.', 'لا توجد مركبات مباعة.') }}</td></tr>
        <tr v-for="r in loading ? [] : records" :key="r.id">
          <td>{{ r.id }}</td><td dir="ltr">{{ r.vehicle_no ?? '—' }}</td><td>{{ r.brand || '—' }}</td><td>{{ r.model || '—' }}</td>
          <td>{{ r.model_year || '—' }}</td><td>{{ r.company_name || '—' }}</td><td>{{ r.buyer_name }}</td>
          <td dir="ltr">{{ r.phone }}</td><td dir="ltr">{{ r.price }}</td>
          <td><div class="actions">
            <button type="button" class="action-link" @click="router.push(`/rent/vehicles-sold/${r.id}`)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>{{ t('View', 'عرض') }}
            </button>
            <button type="button" class="action-link" @click="router.push(`/rent/vehicles-sold/${r.id}/edit`)">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.9 3.5a2.5 2.5 0 0 1 3.5 3.5l-1.4 1.4-3.5-3.5 1.4-1.4ZM14.4 6l3.5 3.5L8 19.4l-4.5 1 1-4.5L14.4 6Z"/></svg>{{ t('Edit', 'تعديل') }}
            </button>
            <button type="button" class="action-link delete-link" @click="askDelete(r)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/></svg>{{ t('Delete', 'حذف') }}
            </button>
          </div></td>
        </tr>
      </tbody>
    </table></div>
    <footer class="pagination">
      <button :disabled="loading || page <= 1" @click="page--">{{ t('Previous', 'السابق') }}</button>
      <span dir="ltr">{{ meta.current_page }} / {{ meta.last_page }} · {{ meta.total }}</span>
      <button :disabled="loading || page >= meta.last_page" @click="page++">{{ t('Next', 'التالي') }}</button>
    </footer>

    <div v-if="deleteTarget" class="modal-backdrop" @click.self="closeDelete">
      <section ref="dialog" class="delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description" tabindex="-1">
        <button class="dialog-close" type="button" :disabled="deleting" @click="closeDelete" :aria-label="t('Close', 'إغلاق')">×</button>
        <div class="dialog-icon">⚠</div>
        <h2 id="delete-title">{{ t('Delete sold vehicle?', 'حذف المركبة المباعة؟') }}</h2>
        <p id="delete-description">{{ t('Delete sale record for vehicle', 'هل تريد حذف سجل بيع المركبة') }} <strong dir="ltr">{{ deleteTarget.vehicle_no }}</strong>{{ ar ? '؟' : '?' }}</p>
        <p class="warning">{{ t('This action cannot be undone. The vehicle itself will not be deleted.', 'لا يمكن التراجع عن هذا الإجراء. لن يتم حذف المركبة نفسها.') }}</p>
        <p v-if="deleteError" class="error" role="alert">{{ deleteError }}</p>
        <div class="dialog-actions">
          <button class="cancel-button" :disabled="deleting" @click="closeDelete">{{ t('Cancel', 'إلغاء') }}</button>
          <button class="confirm-button" :disabled="deleting" @click="confirmDelete">{{ deleting ? t('Deleting...', 'جار الحذف...') : t('Delete', 'حذف') }}</button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.sold-page{padding:24px 28px;color:#15233b;font-family:'Segoe UI',Arial,sans-serif}.heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 0 28px}h1{font-size:26px;margin:0;font-weight:700}.primary{background:#609fc7;border:0;color:white;padding:12px 24px;border-radius:24px;font-weight:600;cursor:pointer;box-shadow:0 3px 8px #0002}.toolbar{display:flex;gap:12px;justify-content:flex-end;margin-bottom:20px;flex-wrap:wrap}.toolbar input,.toolbar select{border:1px solid #cfd8e5;border-radius:9px;background:white;padding:5px 11px;color:#34445c;height:34px;min-height:34px;font-size:13px;box-sizing:border-box}.toolbar input{width:min(350px,100%)}.table-wrap{border:1px solid #e0e6ef;border-radius:15px;overflow-x:auto}table{border-collapse:collapse;width:100%;min-width:1100px;font-size:13px}th{padding:17px 12px;color:#98a6bf;font-weight:600;border-bottom:1px solid #e3e7ee;text-align:start}td{padding:15px 12px;border-bottom:1px solid #e7eaf0;text-align:start}tr:last-child td{border-bottom:0}.empty{text-align:center;padding:32px;color:#8a98a8}.actions{display:flex;align-items:center;gap:14px;white-space:nowrap}.action-link{display:inline-flex;align-items:center;gap:4px;color:#15233b;background:transparent;border:0;padding:0;cursor:pointer;font:inherit}.action-link svg{width:14px;height:14px}.action-link:hover{text-decoration:underline}.delete-link svg{color:#d52230}.pagination{display:flex;align-items:center;justify-content:center;gap:15px;padding:22px;color:#7b8da7;font-size:13px}.pagination button{padding:9px 16px;border:1px solid #e3e7ee;background:white;border-radius:9px;color:#8795aa;cursor:pointer}.pagination button:disabled{opacity:.45;cursor:not-allowed}.error{color:#cb2938}.modal-backdrop{position:fixed;inset:0;background:#0006;z-index:1000;display:flex;justify-content:center;align-items:center;padding:16px}.delete-dialog{position:relative;width:min(440px,100%);box-sizing:border-box;background:white;border-radius:18px;padding:30px;box-shadow:0 20px 65px #0003;text-align:center;outline:none}.dialog-close{position:absolute;top:10px;inset-inline-end:16px;background:none;border:none;font-size:24px;cursor:pointer}.dialog-icon{font-size:28px;color:#d83540}.delete-dialog h2{font-size:20px}.delete-dialog p{line-height:1.6}.warning{color:#8795aa;font-size:13px}.dialog-actions{display:flex;gap:10px;margin-top:25px}.dialog-actions button{flex:1;border-radius:22px;padding:12px;border:0;cursor:pointer;font-weight:600}.cancel-button{background:#f1f4f7;color:#34445c}.confirm-button{background:#db3544;color:#fff}.dialog-actions button:disabled{opacity:.55;cursor:wait}
@media(max-width:700px){.sold-page{padding:15px}.heading h1{font-size:21px}.toolbar input{flex:1}}
</style>

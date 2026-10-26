<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
const router = useRouter()
const { locale } = useI18n()
const t = (en, ar) => (locale.value === 'ar' ? ar : en)
const rows = ref([]),
  loading = ref(true),
  error = ref(''),
  search = ref(''),
  page = ref(1),
  perPage = ref(15),
  total = ref(0),
  lastPage = ref(1)
let timer
async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/rent/rental-contracts', {
      params: { search: search.value, page: page.value, per_page: perPage.value },
    })
    rows.value = data.data || []
    total.value = data.total || 0
    lastPage.value = data.last_page || 1
  } catch (e) {
    error.value = e.response?.data?.message || t('Could not load contracts', 'تعذر تحميل العقود')
  } finally {
    loading.value = false
  }
}
watch(search, () => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
})
watch(perPage, () => {
  page.value = 1
  load()
})
onMounted(load)
function customerName(b) {
  return b?.customer?.name || b?.customer_company?.name || '—'
}
function vehicleName(b) {
  return (
    [b?.car?.brand?.name, b?.car?.model?.name, b?.car?.model_year].filter(Boolean).join(' ') || '—'
  )
}
function navigate(id, action) {
  router.push(`/rent/contracts/rental/${id}/${action}`)
}
function goPreviousPage() {
  if (page.value <= 1 || loading.value) return
  page.value -= 1
  load()
}
function goNextPage() {
  if (page.value >= lastPage.value || loading.value) return
  page.value += 1
  load()
}
</script>
<template>
  <section class="contracts-page" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <h2>{{ t('Rental Car Contracts', 'عقود تأجير السيارات') }}</h2>
    <div class="toolbar">
      <input v-model="search" :placeholder="t('Search contracts...', 'بحث في العقود...')" /><select
        v-model.number="perPage"
      >
        <option :value="15">15 {{ t('per page', 'لكل صفحة') }}</option>
        <option :value="30">30 {{ t('per page', 'لكل صفحة') }}</option>
        <option :value="50">50 {{ t('per page', 'لكل صفحة') }}</option>
      </select>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{{ t('Contract ID', 'رقم العقد') }}</th>
            <th>{{ t('Status', 'الحالة') }}</th>
            <th>{{ t('Customer / Company', 'العميل / الشركة') }}</th>
            <th>{{ t('Vehicle', 'السيارة') }}</th>
            <th>{{ t('Actions', 'الإجراءات') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="empty">{{ t('Loading...', 'جاري التحميل...') }}</td>
          </tr>
          <tr v-else-if="error">
            <td colspan="5" class="empty bad">
              {{ error }} <button @click="load">{{ t('Retry', 'إعادة المحاولة') }}</button>
            </td>
          </tr>
          <tr v-else-if="!rows.length">
            <td colspan="5" class="empty">{{ t('No contracts found.', 'لا توجد عقود.') }}</td>
          </tr>
          <tr v-for="c in !loading && !error ? rows : []" :key="c.id">
            <td>{{ c.id }}</td>
            <td>
              <span class="status" :class="c.status">{{
                c.status === 'closed' ? t('Closed', 'مغلق') : t('Open', 'مفتوح')
              }}</span>
            </td>
            <td>{{ customerName(c.booking) }}</td>
            <td>{{ vehicleName(c.booking) }}</td>
            <td>
              <div class="actions">
                <button @click="navigate(c.id, 'view')">
                  <span>ⓘ</span> {{ t('Details', 'التفاصيل') }}
                </button>
                <button @click="navigate(c.id, 'invoice')">
                  <span>▣</span> {{ t('Invoice', 'الفاتورة') }}
                </button>
                <button v-if="c.status === 'open'" @click="navigate(c.id, 'edit')">
                  <span>✎</span> {{ t('Edit', 'تعديل') }}
                </button>
                <button @click="navigate(c.id, 'view')">
                  <span>◉</span> {{ t('View', 'عرض') }}
                </button>
                <button @click="navigate(c.id, 'video')">
                  <span>▣</span> {{ t('Take Video', 'تصوير فيديو') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="footer">
      <span>{{ total }} {{ t('records', 'سجل') }}</span>
      <div>
        <button :disabled="page <= 1" @click="goPreviousPage">{{ t('Previous', 'السابق') }}</button>
        {{ page }} / {{ lastPage }}
        <button :disabled="page >= lastPage" @click="goNextPage">{{ t('Next', 'التالي') }}</button>
      </div>
    </div>
  </section>
</template>
<style scoped>
.contracts-page {
  padding: 18px 22px;
  color: #102846;
}
.contracts-page h2 {
  font-size: 24px;
  margin: 0 0 30px;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}
.toolbar input,
.toolbar select {
  height: 34px;
  border: 1px solid #d7e0e9;
  border-radius: 8px;
  padding: 0 13px;
  background: #fff;
  color: #15304e;
}
.toolbar input {
  width: 250px;
}
.table-wrap {
  border: 1px solid #d6e0e8;
  border-radius: 14px;
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th,
td {
  padding: 15px 16px;
  text-align: start;
  border-bottom: 1px solid #e0e6ec;
}
th {
  color: #8696ae;
  font-weight: 500;
}
tr:last-child td {
  border-bottom: 0;
}
.actions {
  display: flex;
  gap: 13px;
  white-space: nowrap;
  align-items: center;
  flex-wrap: wrap;
}
.actions button {
  border: 0;
  background: transparent;
  color: #163351;
  cursor: pointer;
  font-size: 12px;
  padding: 3px 0;
}
.actions button:hover {
  text-decoration: underline;
}
.status {
  padding: 5px 9px;
  border-radius: 14px;
  background: #e8f5ed;
  color: #28724a;
}
.status.closed {
  background: #eff2f6;
  color: #66758b;
}
.empty {
  text-align: center;
  padding: 32px;
}
.bad {
  color: #b4233d;
}
.footer {
  display: flex;
  justify-content: space-between;
  margin-top: 14px;
  font-size: 13px;
  color: #6f829c;
}
.footer button {
  background: #fff;
  border: 1px solid #dae2ea;
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
}
.footer button:disabled {
  opacity: 0.4;
}
</style>

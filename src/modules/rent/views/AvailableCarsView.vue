<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const { locale } = useI18n()
const t = (en, ar) => (locale.value === 'ar' ? ar : en)
const tab = ref('available')
const rows = ref([])
const companies = ref([])
const branches = ref([])
const search = ref('')
const perPage = ref(15)
const page = ref(1)
const meta = ref({ total: 0, current_page: 1, last_page: 1 })
const loading = ref(false)
const error = ref('')
const optionsError = ref('')
const transferCar = ref(null)
const transferBranch = ref('')
const transferError = ref('')
const transferring = ref(false)
const reportCompanyId = ref('')
const reportBranchId = ref('')
const exporting = ref(false)
const reportError = ref('')
let serial = 0
let debounce

const currentBranch = computed(() => transferCar.value?.branch_id)
const displayRows = computed(() => rows.value)
function errorMessage(e) {
  return e?.response?.data?.message || t('Request failed. Try again.', 'فشل الطلب، حاول مجدداً.')
}
async function loadOptions() {
  try {
    const { data } = await api.get('/rent/available-cars/options')
    companies.value = data?.data?.companies || []
    branches.value = data?.data?.branches || []
  } catch (e) {
    optionsError.value = errorMessage(e)
  }
}
async function load() {
  const requestId = ++serial
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/rent/available-cars', {
      params: { search: search.value, per_page: perPage.value, page: page.value },
    })
    if (requestId !== serial) return
    rows.value = data.data || []
    meta.value = {
      total: data.total ?? 0,
      current_page: data.current_page ?? 1,
      last_page: data.last_page ?? 1,
    }
  } catch (e) {
    if (requestId === serial) {
      rows.value = []
      error.value = errorMessage(e)
    }
  } finally {
    if (requestId === serial) loading.value = false
  }
}
watch([page, perPage], () => load())
watch(search, () => {
  clearTimeout(debounce)
  debounce = setTimeout(() => {
    if (page.value !== 1) page.value = 1
    else load()
  }, 320)
})
onMounted(() => {
  loadOptions()
  load()
})
onBeforeUnmount(() => {
  serial++
  clearTimeout(debounce)
})

function openTransfer(car) {
  transferCar.value = car
  transferBranch.value = String(car.branch_id ?? '')
  transferError.value = ''
}
function closeTransfer() {
  if (!transferring.value) transferCar.value = null
}
async function submitTransfer() {
  if (!transferCar.value || transferring.value) return
  transferError.value = ''
  if (!transferBranch.value) {
    transferError.value = t('Choose a branch.', 'اختر فرعاً.')
    return
  }
  transferring.value = true
  try {
    await api.put(`/rent/available-cars/${transferCar.value.id}/transfer`, {
      branch_id: Number(transferBranch.value),
    })
    transferCar.value = null
    await load()
  } catch (e) {
    transferError.value = e.response?.data?.errors?.vehicle?.[0] || errorMessage(e)
  } finally {
    transferring.value = false
  }
}
async function downloadReport() {
  if (!reportCompanyId.value || exporting.value) return
  exporting.value = true
  reportError.value = ''
  try {
    const { data } = await api.get('/rent/available-cars/report', {
      params: {
        company_id: reportCompanyId.value,
        ...(reportBranchId.value ? { branch_id: reportBranchId.value } : {}),
      },
      responseType: 'blob',
    })
    const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'available-cars.pdf'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  } catch (e) {
    reportError.value = errorMessage(e)
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <main class="available-page">
    <h1>{{ t('Available Cars', 'السيارات المتاحة') }}</h1>
    <section class="panel">
      <nav class="tabs" :aria-label="t('Available cars sections', 'أقسام السيارات المتاحة')">
        <button type="button" :class="{ active: tab === 'available' }" @click="tab = 'available'">
          {{ t('Available Cars', 'السيارات المتاحة') }}
        </button>
        <button type="button" :class="{ active: tab === 'report' }" @click="tab = 'report'">
          {{ t('Available Cars Report', 'تقرير السيارات المتاحة') }}
        </button>
      </nav>

      <template v-if="tab === 'available'">
        <div class="toolbar">
          <input
            v-model.trim="search"
            class="search"
            type="search"
            :placeholder="
              t(
                'Search vehicle, brand, model or branch...',
                'بحث برقم السيارة أو الماركة أو الموديل أو الفرع...',
              )
            "
          />
          <div class="toolbar-right">
            <label class="per-page"
              >{{ t('Per page', 'لكل صفحة') }}
              <select v-model.number="perPage">
                <option v-for="n in [10, 15, 25, 50, 100]" :key="n" :value="n">{{ n }}</option>
              </select></label
            >
            <span class="count"
              >{{ t('Number of Vehicles', 'عدد المركبات') }}:
              <strong>{{ meta.total }}</strong></span
            >
          </div>
        </div>
        <div v-if="error" class="notice error">
          {{ error }}
          <button type="button" @click="load">{{ t('Retry', 'إعادة المحاولة') }}</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{{ t('Vehicle No.', 'رقم السيارة') }}</th>
                <th>{{ t('Vehicle Brand', 'ماركة السيارة') }}</th>
                <th>{{ t('Vehicle Model', 'موديل السيارة') }}</th>
                <th>{{ t('Model Year', 'سنة الموديل') }}</th>
                <th>{{ t('Location', 'الموقع') }}</th>
                <th>{{ t('Company', 'الشركة') }}</th>
                <th>{{ t('Action', 'الإجراء') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="7" class="state">
                  {{ t('Loading available cars...', 'جارٍ تحميل السيارات المتاحة...') }}
                </td>
              </tr>
              <template v-else>
                <tr v-for="car in displayRows" :key="car.id">
                  <td dir="ltr">{{ car.number }}</td>
                  <td>{{ car.brand?.name || '—' }}</td>
                  <td>{{ car.model?.name || '—' }}</td>
                  <td>{{ car.model_year }}</td>
                  <td>{{ car.branch?.name || car.current_location || '—' }}</td>
                  <td>{{ car.company?.name || '—' }}</td>
                  <td>
                    <button type="button" class="transfer-link" @click="openTransfer(car)">
                      ⇄ {{ t('Transfer', 'نقل') }}
                    </button>
                  </td>
                </tr>
                <tr v-if="!displayRows.length">
                  <td colspan="7" class="state">
                    {{
                      t(
                        'No available cars found at this time.',
                        'لا توجد سيارات متاحة في الوقت الحالي.',
                      )
                    }}
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <div class="pagination">
          <button type="button" :disabled="page <= 1 || loading" @click="page--">
            {{ t('Previous', 'السابق') }}</button
          ><span>{{ meta.current_page }} / {{ meta.last_page }}</span
          ><button type="button" :disabled="page >= meta.last_page || loading" @click="page++">
            {{ t('Next', 'التالي') }}
          </button>
        </div>
      </template>

      <template v-else>
        <form class="report-form" @submit.prevent="downloadReport">
          <div class="report-fields">
            <label
              >{{ t('Company', 'الشركة') }} <span>*</span>
              <select v-model="reportCompanyId" required>
                <option value="">{{ t('Select Company', 'اختر الشركة') }}</option>
                <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select> </label
            ><label
              >{{ t('Branch', 'الفرع') }}
              <select v-model="reportBranchId">
                <option value="">{{ t('All', 'الكل') }}</option>
                <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
            </label>
          </div>
          <div class="report-actions">
            <button class="primary" type="submit" :disabled="exporting || !reportCompanyId">
              {{
                exporting
                  ? t('Generating PDF...', 'جارٍ إنشاء التقرير...')
                  : t('Download PDF Report', 'تحميل تقرير PDF')
              }}
            </button>
          </div>
          <p v-if="optionsError || reportError" class="notice error">
            {{ reportError || optionsError }}
          </p>
          <p class="hint">
            {{
              t(
                'The PDF lists cars available right now, filtered by the selected company and branch.',
                'يعرض التقرير السيارات المتاحة الآن حسب الشركة والفرع المحددين.',
              )
            }}
          </p>
        </form>
      </template>
    </section>

    <div v-if="transferCar" class="overlay" @click.self="closeTransfer">
      <form class="modal" @submit.prevent="submitTransfer" role="dialog" aria-modal="true">
        <button type="button" class="close" :disabled="transferring" @click="closeTransfer">
          ×
        </button>
        <h2>{{ t('Transfer Car', 'نقل السيارة') }}</h2>
        <p class="vehicle-label">
          {{ transferCar.number }} — {{ transferCar.brand?.name }} {{ transferCar.model?.name }}
        </p>
        <label
          >{{ t('Destination Branch', 'الفرع الجديد') }}
          <select v-model="transferBranch" required>
            <option value="" disabled>{{ t('Select Branch', 'اختر الفرع') }}</option>
            <option v-for="b in branches" :key="b.id" :value="String(b.id)">
              {{ b.name
              }}{{ Number(currentBranch) === Number(b.id) ? t(' (current)', ' (الحالي)') : '' }}
            </option>
          </select>
        </label>
        <p v-if="transferError" class="notice error">{{ transferError }}</p>
        <div class="modal-actions">
          <button type="button" class="secondary" :disabled="transferring" @click="closeTransfer">
            {{ t('Cancel', 'إلغاء') }}</button
          ><button
            type="submit"
            class="primary"
            :disabled="
              transferring || !transferBranch || String(currentBranch) === String(transferBranch)
            "
          >
            {{ transferring ? t('Transferring...', 'جارٍ النقل...') : t('Transfer', 'نقل') }}
          </button>
        </div>
      </form>
    </div>
  </main>
</template>

<style scoped>
.available-page {
  padding: 16px 22px 46px;
  color: #0b2041;
  font-family: 'Segoe UI', Arial, sans-serif;
}
.available-page h1 {
  font-size: 28px;
  margin: 0 0 42px;
}
.panel {
  border: 1px solid #d7e0e8;
  background: #fff;
  border-radius: 16px;
  padding: 26px 18px 30px;
  box-shadow: 0 2px 7px #0e254112;
  min-height: 280px;
}
.tabs {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin: 10px 0 48px;
}
.tabs button {
  background: none;
  border: 0;
  color: #9ca8bd;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
}
.tabs button.active {
  color: #081f3f;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  margin: 0 12px 18px;
  flex-wrap: wrap;
}
.search {
  height: 34px;
  border: 1px solid #d6dee9;
  border-radius: 8px;
  padding: 0 12px;
  width: min(310px, 100%);
  font-size: 12px;
  color: #173250;
}
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 25px;
}
.per-page {
  color: #7889a2;
  font-size: 12px;
}
.per-page select {
  height: 34px;
  border-radius: 7px;
  border: 1px solid #d8e0e9;
  padding: 0 9px;
  margin-inline-start: 6px;
  background: white;
}
.count {
  font-size: 13px;
}
.table-wrap {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  min-width: 840px;
}
th,
td {
  padding: 15px 12px;
  border-bottom: 1px solid #dce3ed;
  text-align: start;
  font-size: 13px;
}
th {
  color: #9da9bc;
  font-weight: 500;
  font-size: 12px;
}
td {
  color: #102745;
}
.transfer-link {
  border: 0;
  background: none;
  color: #143052;
  cursor: pointer;
  font-weight: 600;
}
.transfer-link:hover {
  color: #5c9ac1;
}
.state {
  text-align: center;
  color: #8190a8;
  padding: 35px;
}
.pagination {
  display: flex;
  gap: 15px;
  align-items: center;
  justify-content: center;
  margin-top: 24px;
  font-size: 13px;
}
.pagination button {
  background: white;
  border: 1px solid #dce3ec;
  border-radius: 8px;
  padding: 7px 14px;
  cursor: pointer;
}
.pagination button:disabled {
  opacity: 0.45;
  cursor: default;
}
.report-form {
  max-width: 600px;
  margin: auto;
}
.report-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
.report-fields label,
.modal label {
  font-size: 13px;
  font-weight: 600;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.report-fields label span {
  color: #c63844;
}
.report-fields select,
.modal select {
  height: 38px;
  border: 1px solid #d4dce8;
  border-radius: 9px;
  padding: 0 12px;
  background: #fff;
  color: #152a46;
  max-width: 100%;
}
.report-actions {
  margin-top: 55px;
}
.primary {
  background: #6da3c5;
  color: white;
  border: 0;
  border-radius: 25px;
  padding: 10px 20px;
  font-weight: 600;
  cursor: pointer;
}
.report-actions .primary {
  width: 100%;
}
.primary:disabled {
  opacity: 0.5;
  cursor: default;
}
.hint {
  color: #8492a9;
  font-size: 12px;
  margin-top: 20px;
  text-align: center;
}
.overlay {
  position: fixed;
  inset: 0;
  background: #0007;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 15px;
  z-index: 1000;
}
.modal {
  background: white;
  width: min(440px, 100%);
  padding: 35px 38px;
  border-radius: 16px;
  position: relative;
  box-shadow: 0 12px 36px #0002;
}
.modal h2 {
  font-size: 19px;
  text-align: center;
  margin: 0 0 15px;
}
.vehicle-label {
  text-align: center;
  color: #8795ab;
  font-size: 13px;
  margin: 0 0 25px;
}
.close {
  position: absolute;
  top: 12px;
  inset-inline-end: 16px;
  background: none;
  border: 0;
  font-size: 22px;
  cursor: pointer;
}
.modal-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 35px;
  gap: 10px;
}
.modal-actions .primary,
.modal-actions .secondary {
  min-width: 105px;
}
.secondary {
  background: white;
  border: 1px solid #d7e0e9;
  border-radius: 25px;
  padding: 10px 20px;
  cursor: pointer;
}
.notice {
  font-size: 13px;
  padding: 12px;
  border-radius: 8px;
}
.error {
  background: #fff1f1;
  color: #ac3040;
}
@media (max-width: 680px) {
  .available-page {
    padding: 14px 10px;
  }
  .available-page h1 {
    margin-bottom: 20px;
  }
  .panel {
    padding: 16px 10px;
  }
  .report-fields {
    grid-template-columns: 1fr;
  }
  .tabs {
    margin-bottom: 25px;
  }
  .modal {
    padding: 30px 20px;
  }
}
</style>

<script setup>
import StandardTablePager from '@/modules/rent/components/StandardTablePager.vue'
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
const router = useRouter(),
  { locale } = useI18n(),
  tr = (en, ar) => (locale.value === 'ar' ? ar : en)
const tab = ref('pending'),
  search = ref(''),
  perPage = ref(50),
  page = ref(1),
  loading = ref(false),
  error = ref(''),
  records = ref([]),
  meta = ref({ current_page: 1, last_page: 1, total: 0 })
let token = 0
const lastPage = computed(() => meta.value.last_page || 1)
async function load() {
  const current = ++token
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/rent/bookings', {
      params: { tab: tab.value, search: search.value, per_page: perPage.value, page: page.value },
    })
    if (current !== token) return
    records.value = data.data || []
    meta.value = {
      current_page: data.current_page || 1,
      last_page: data.last_page || 1,
      total: data.total || 0,
    }
  } catch (e) {
    if (current === token)
      error.value = e.response?.data?.message || tr('Cannot load bookings', 'تعذر تحميل الحجوزات')
  } finally {
    if (current === token) loading.value = false
  }
}
watch([tab, perPage], () => {
  page.value = 1
  load()
})
watch(search, () => {
  page.value = 1
  load()
})
watch(page, load)
onMounted(load)
const rejectTarget = ref(null),
  rejecting = ref(false),
  rejectError = ref('')
function openReject(booking) {
  rejectTarget.value = booking
  rejectError.value = ''
}
function closeReject() {
  if (rejecting.value) return
  rejectTarget.value = null
  rejectError.value = ''
}
async function confirmReject() {
  if (!rejectTarget.value || rejecting.value) return
  rejecting.value = true
  rejectError.value = ''
  try {
    await api.patch(`/rent/bookings/${rejectTarget.value.id}/reject`)
    rejectTarget.value = null
    await load()
  } catch (e) {
    rejectError.value =
      e.response?.data?.errors?.status?.[0] ||
      e.response?.data?.message ||
      tr('Could not reject booking', 'تعذر رفض الحجز')
  } finally {
    rejecting.value = false
  }
}
const availabilityOpen = ref(false),
  availabilityLoading = ref(false),
  availabilityError = ref('')
const availabilityCompanies = ref([])
const companyPickerOpen = ref(false)
const companyPickerQuery = ref('')
const companyPickerRef = ref(null)
const companyChoices = computed(() =>
  availabilityCompanies.value.filter((c) =>
    String(c.name || c.company_name || '')
      .toLocaleLowerCase()
      .includes(companyPickerQuery.value.trim().toLocaleLowerCase()),
  ),
)
function selectReportCompany(company) {
  availabilityForm.value.customer_company_id = company.id
  companyPickerQuery.value = company.name || company.company_name || ''
  companyPickerOpen.value = false
}
function onReportCompanyInput(event) {
  companyPickerQuery.value = event.target.value
  availabilityForm.value.customer_company_id = ''
  companyPickerOpen.value = true
}
function onCompanyPickerOutside(event) {
  if (companyPickerRef.value && !companyPickerRef.value.contains(event.target))
    companyPickerOpen.value = false
}
function onCompanyPickerKeydown(event) {
  if (event.key === 'Escape') companyPickerOpen.value = false
  if (event.key === 'Enter' && companyPickerOpen.value && companyChoices.value.length) {
    event.preventDefault()
    selectReportCompany(companyChoices.value[0])
  }
}
onMounted(() => document.addEventListener('pointerdown', onCompanyPickerOutside))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onCompanyPickerOutside))
const availabilityForm = ref({
  client_type: 'customer',
  customer_company_id: '',
  start_date: '',
  start_time: '09:00',
  end_date: '',
  end_time: '09:00',
})
function openAvailability() {
  availabilityError.value = ''
  availabilityOpen.value = true
  companyPickerOpen.value = false
  companyPickerQuery.value =
    availabilityCompanies.value.find(
      (c) => String(c.id) === String(availabilityForm.value.customer_company_id),
    )?.name || ''
  if (!availabilityCompanies.value.length) loadAvailabilityCompanies()
}
async function loadAvailabilityCompanies() {
  try {
    const { data } = await api.get('/rent/bookings/options')
    availabilityCompanies.value = data.data?.customer_companies || []
    const selectedCompany = availabilityCompanies.value.find(
      (c) => String(c.id) === String(availabilityForm.value.customer_company_id),
    )
    if (selectedCompany)
      companyPickerQuery.value = selectedCompany.name || selectedCompany.company_name || ''
  } catch (e) {
    availabilityError.value =
      e.response?.data?.message || tr('Could not load companies', 'تعذر تحميل الشركات')
  }
}
function closeAvailability() {
  if (!availabilityLoading.value) {
    availabilityOpen.value = false
    companyPickerOpen.value = false
  }
}
async function openAvailabilityReport() {
  const f = availabilityForm.value
  if (f.client_type === 'company' && !f.customer_company_id) {
    availabilityError.value = tr('Select a customer company.', 'اختر شركة العميل.')
    return
  }
  if (
    !f.start_date ||
    !f.start_time ||
    !f.end_date ||
    !f.end_time ||
    new Date(`${f.end_date}T${f.end_time}`) <= new Date(`${f.start_date}T${f.start_time}`)
  ) {
    availabilityError.value = tr(
      'Enter a valid start and end date/time.',
      'أدخل وقت وتاريخ بداية ونهاية صحيحين.',
    )
    return
  }
  // Open synchronously inside the user click event to avoid popup blockers.
  const pdfTab = window.open('', '_blank')
  if (!pdfTab) {
    availabilityError.value = tr(
      'Allow popups for the PDF report.',
      'اسمح بالنوافذ المنبثقة لعرض التقرير.',
    )
    return
  }
  pdfTab.document.title = 'Available Cars Report'
  pdfTab.document.body.textContent = 'Loading PDF...'
  availabilityLoading.value = true
  availabilityError.value = ''
  try {
    const { data } = await api.get('/rent/bookings/available-cars/report', {
      params: {
        client_type: f.client_type,
        customer_company_id: f.client_type === 'company' ? f.customer_company_id : undefined,
        start_date: f.start_date,
        start_time: f.start_time,
        end_date: f.end_date,
        end_time: f.end_time,
      },
      responseType: 'blob',
    })
    const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
    pdfTab.location.replace(url)
    availabilityOpen.value = false
    // Do not revoke immediately: the PDF viewer may still be reading the URL.
    setTimeout(() => URL.revokeObjectURL(url), 120000)
  } catch (e) {
    pdfTab.close()
    availabilityError.value = tr(
      'Unable to generate available cars report.',
      'تعذر إنشاء تقرير السيارات المتاحة.',
    )
  } finally {
    availabilityLoading.value = false
  }
}
const client = (b) =>
  b.customer?.name ||
  b.customer?.customer_name ||
  b.customer_company?.name ||
  b.customer_company?.company_name ||
  '—'

function uiTableGoToPage(n) {
  if (n < 1 || n > Number(lastPage) || n === page.value) return
  page.value = n
}
</script>
<template>
  <section class="bk-page" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <div class="bk-head">
      <h2>{{ tr('Booking', 'الحجوزات') }}</h2>
      <div class="bk-header-actions">
        <button class="bk-secondary" type="button" @click="openAvailability">
          {{ tr('Available Cars', 'السيارات المتاحة') }}</button
        ><button class="bk-primary" @click="router.push('/rent/booking/create')">
          + {{ tr('New Booking', 'حجز جديد') }}
        </button>
      </div>
    </div>
    <div class="bk-card">
      <nav class="bk-tabs">
        <button :class="{ active: tab === 'pending' }" @click="tab = 'pending'">
          {{ tr('Pending Booking', 'الحجوزات المعلقة') }}</button
        ><button :class="{ active: tab === 'reservations' }" @click="tab = 'reservations'">
          {{ tr('Booking Reservations', 'حجوزات مؤكدة') }}
        </button>
      </nav>
      <div class="bk-tools ui-table-toolbar">
        <input v-model="search" :placeholder="tr('Search', 'بحث')" /><select
          v-model.number="perPage"
        >
          <option :value="10">10 {{ tr('per page', 'لكل صفحة') }}</option>
          <option :value="15">15 {{ tr('per page', 'لكل صفحة') }}</option>
          <option :value="25">25 {{ tr('per page', 'لكل صفحة') }}</option>
          <option :value="50">50 {{ tr('per page', 'لكل صفحة') }}</option>
        </select>
      </div>
      <div v-if="error" class="bk-error">
        {{ error }} <button @click="load">{{ tr('Retry', 'إعادة المحاولة') }}</button>
      </div>
      <div class="bk-scroll">
        <table class="ui-standardized-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{{ tr('Customer / Company', 'العميل / الشركة') }}</th>
              <th>{{ tr('Service', 'الخدمة') }}</th>
              <th>{{ tr('Vehicle', 'السيارة') }}</th>
              <th>{{ tr('Date', 'التاريخ') }}</th>
              <th>{{ tr('Total Price', 'السعر الإجمالي') }}</th>
              <th>{{ tr('Status', 'الحالة') }}</th>
              <th>{{ tr('Action', 'الإجراء') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="8" class="bk-empty">{{ tr('Loading...', 'جاري التحميل...') }}</td>
            </tr>
            <template v-else
              ><tr v-for="r in records" :key="r.id">
                <td>{{ r.id }}</td>
                <td>{{ client(r) }}</td>
                <td>{{ tr('Rent A Car', 'تأجير سيارة') }}</td>
                <td>
                  {{ r.rental_price?.brand?.name || r.car?.brand?.name }}
                  {{ r.rental_price?.model?.name || r.car?.model?.name }}
                  {{ r.rental_price?.model_year || r.car?.model_year }}
                  <span v-if="r.car?.number">({{ r.car.number }})</span><span v-else>—</span>
                </td>
                <td>{{ r.start_date }}</td>
                <td>{{ r.total }} {{ r.currency }}</td>
                <td>{{ r.status }}</td>
                <td>
                  <button class="bk-action" @click="router.push(`/rent/booking/${r.id}`)">
                    ◉ {{ tr('View', 'عرض') }}</button
                  ><button
                    v-if="tab === 'reservations' && r.status === 'approved'"
                    class="bk-action bk-relay"
                    @click="router.push(`/rent/booking/${r.id}/relay`)"
                  >
                    ⇄ {{ tr('Relay', 'تسليم') }}</button
                  ><button
                    v-if="tab === 'pending' && ['pending', 'online_pending'].includes(r.status)"
                    class="bk-action bk-danger"
                    @click="openReject(r)"
                  >
                    ▤ {{ tr('Reject', 'رفض') }}
                  </button>
                </td>
              </tr>
              <tr v-if="!records.length">
                <td colspan="8" class="bk-empty">
                  {{ tr('No bookings found.', 'لا توجد حجوزات.') }}
                </td>
              </tr></template
            >
          </tbody>
        </table>
      </div>
      <div class="ui-legacy-pager bk-pagination">
        <span>{{ meta.total }} {{ tr('records', 'سجل') }}</span>
        <div>
          <button :disabled="page <= 1" @click="page--">‹</button
          ><span>{{ page }} / {{ lastPage }}</span
          ><button :disabled="page >= lastPage" @click="page++">›</button>
        </div>
      </div>
      <StandardTablePager
        :page="page"
        :last-page="lastPage"
        :disabled="loading"
        @change="uiTableGoToPage"
      />
    </div>
    <div v-if="availabilityOpen" class="bk-overlay" @click.self="closeAvailability">
      <div
        class="bk-modal bk-availability-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="tr('Available cars report', 'تقرير السيارات المتاحة')"
      >
        <div class="bk-modal-title">
          <h3>{{ tr('Available Cars Report', 'تقرير السيارات المتاحة') }}</h3>
          <button
            class="bk-close"
            type="button"
            :disabled="availabilityLoading"
            @click="closeAvailability"
          >
            ×
          </button>
        </div>
        <div class="bk-client-types">
          <label
            ><input v-model="availabilityForm.client_type" type="radio" value="customer" />
            {{ tr('Customer', 'عميل') }}</label
          ><label
            ><input v-model="availabilityForm.client_type" type="radio" value="company" />
            {{ tr('Company', 'شركة') }}</label
          >
        </div>
        <div v-if="availabilityForm.client_type === 'company'" class="bk-field">
          <label class="bk-company-label"
            >{{ tr('Customer Company', 'شركة العميل') }} <span class="bk-required">*</span></label
          >
          <div ref="companyPickerRef" class="bk-company-picker">
            <input
              :value="companyPickerQuery"
              type="text"
              role="combobox"
              aria-autocomplete="list"
              :aria-expanded="companyPickerOpen"
              :placeholder="tr('Search or select a company...', 'ابحث عن شركة أو اخترها...')"
              autocomplete="off"
              @focus="companyPickerOpen = true"
              @input="onReportCompanyInput"
              @keydown="onCompanyPickerKeydown"
            />
            <button
              type="button"
              class="bk-company-toggle"
              :aria-label="tr('Show companies', 'عرض الشركات')"
              @click="companyPickerOpen = !companyPickerOpen"
            >
              ⌄
            </button>
            <div v-if="companyPickerOpen" class="bk-company-options" role="listbox">
              <button
                v-for="c in companyChoices"
                :key="c.id"
                type="button"
                role="option"
                :aria-selected="String(availabilityForm.customer_company_id) === String(c.id)"
                @click="selectReportCompany(c)"
              >
                {{ c.name || c.company_name }}
              </button>
              <div v-if="!companyChoices.length" class="bk-company-empty">
                {{ tr('No companies found', 'لا توجد شركات مطابقة') }}
              </div>
            </div>
          </div>
        </div>
        <div class="bk-availability-grid">
          <label class="bk-field"
            >{{ tr('Start Date', 'تاريخ البداية') }} *<input
              v-model="availabilityForm.start_date"
              type="date"
          /></label>
          <label class="bk-field"
            >{{ tr('Start Time', 'وقت البداية') }} *<input
              v-model="availabilityForm.start_time"
              type="time"
          /></label>
          <label class="bk-field"
            >{{ tr('End Date', 'تاريخ النهاية') }} *<input
              v-model="availabilityForm.end_date"
              type="date"
          /></label>
          <label class="bk-field"
            >{{ tr('End Time', 'وقت النهاية') }} *<input
              v-model="availabilityForm.end_time"
              type="time"
          /></label>
        </div>
        <p v-if="availabilityError" class="bk-error">{{ availabilityError }}</p>
        <div class="bk-modal-actions">
          <button class="bk-cancel" :disabled="availabilityLoading" @click="closeAvailability">
            {{ tr('Cancel', 'إلغاء') }}</button
          ><button
            class="bk-primary"
            :disabled="availabilityLoading"
            @click="openAvailabilityReport"
          >
            {{
              availabilityLoading
                ? tr('Generating...', 'جاري الإنشاء...')
                : tr('Open PDF Report', 'فتح تقرير PDF')
            }}
          </button>
        </div>
      </div>
    </div>
    <div v-if="rejectTarget" class="bk-overlay" @click.self="closeReject">
      <div
        class="bk-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="tr('Reject booking', 'رفض الحجز')"
      >
        <h3>{{ tr('Reject booking?', 'هل تريد رفض الحجز؟') }}</h3>
        <p>
          {{ tr('Reject booking #', 'رفض الحجز رقم') }}{{ rejectTarget.id }}?
          {{
            tr(
              'This booking will no longer be eligible for vehicle reservation.',
              'لن يكون هذا الحجز مؤهلاً لربطه بسيارة بعد الرفض.',
            )
          }}
        </p>
        <p v-if="rejectError" class="bk-error">{{ rejectError }}</p>
        <div class="bk-modal-actions">
          <button :disabled="rejecting" class="bk-cancel" @click="closeReject">
            {{ tr('Cancel', 'إلغاء') }}</button
          ><button :disabled="rejecting" class="bk-confirm" @click="confirmReject">
            {{
              rejecting ? tr('Rejecting...', 'جاري الرفض...') : tr('Reject booking', 'رفض الحجز')
            }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
<style scoped>
.bk-page {
  padding: 16px 20px;
  color: #0c2345;
}
.bk-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
}
.bk-head h2 {
  font-size: 26px;
}
.bk-primary {
  border: 0;
  background: #6da2c3;
  border-radius: 23px;
  color: white;
  padding: 10px 24px;
  cursor: pointer;
}
.bk-card {
  border: 1px solid #dce3ea;
  border-radius: 14px;
  background: white;
  overflow: hidden;
}
.bk-tabs {
  display: flex;
  justify-content: center;
  gap: 25px;
  padding: 30px 10px 18px;
}
.bk-tabs button {
  border: 0;
  background: none;
  cursor: pointer;
  color: #9aa7bb;
  font-weight: 650;
}
.bk-tabs button.active {
  color: #0b2241;
}
.bk-tools {
  display: flex;
  gap: 15px;
  justify-content: space-between;
  padding: 10px 20px 14px;
}
.bk-tools input,
.bk-tools select {
  height: 32px;
  border: 1px solid #d8e0e9;
  border-radius: 8px;
  background: white;
  padding: 0 10px;
  color: #19375a;
}
.bk-tools input {
  width: min(290px, 60%);
}
.bk-scroll {
  overflow-x: auto;
}
table {
  border-collapse: collapse;
  width: 100%;
  font-size: 12px;
}
th,
td {
  text-align: start;
  padding: 14px 12px;
  border-top: 1px solid #e3e9f0;
}
th {
  color: #91a0b3;
  font-weight: 500;
}
td {
  white-space: nowrap;
}
.bk-empty {
  text-align: center;
  color: #8b98a9;
  padding: 44px;
}
.bk-action {
  border: 0;
  background: none;
  cursor: pointer;
  color: #1a3557;
}
.bk-pagination {
  padding: 14px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #5e7390;
}
.bk-pagination > div {
  display: flex;
  gap: 12px;
  align-items: center;
}
.bk-pagination button {
  background: white;
  border: 1px solid #e2e7ef;
  border-radius: 7px;
  padding: 5px 12px;
  cursor: pointer;
}
.bk-pagination button:disabled {
  opacity: 0.4;
}
.bk-error {
  padding: 15px;
  color: #b91c1c;
}
.bk-relay {
  color: #2175a1;
  font-weight: 650;
  margin-inline-start: 8px;
}
.bk-danger {
  color: #cf2739;
  margin-inline-start: 12px;
}
.bk-overlay {
  position: fixed;
  inset: 0;
  background: #0007;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 18px;
}
.bk-modal {
  background: white;
  border-radius: 15px;
  width: min(460px, 100%);
  box-shadow: 0 20px 75px #0003;
  padding: 26px;
}
.bk-modal h3 {
  margin: 0 0 14px;
  font-size: 19px;
}
.bk-modal p {
  line-height: 1.7;
  font-size: 14px;
  color: #475569;
}
.bk-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}
.bk-modal-actions button {
  border-radius: 22px;
  padding: 10px 18px;
  cursor: pointer;
}
.bk-cancel {
  border: 1px solid #d9e1ea;
  background: white;
  color: #123;
}
.bk-confirm {
  border: 0;
  background: #cf2739;
  color: white;
  font-weight: 600;
}
.bk-modal-actions button:disabled {
  opacity: 0.55;
  cursor: wait;
}
.bk-header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}
.bk-secondary {
  background: #f1f7fb;
  border: 1px solid #b4d2e6;
  border-radius: 23px;
  padding: 10px 20px;
  color: #245b7e;
  font-weight: 600;
  cursor: pointer;
}
.bk-modal-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.bk-close {
  background: none;
  border: 0;
  font-size: 26px;
  cursor: pointer;
}
.bk-availability-modal {
  width: min(650px, 100%);
}
.bk-client-types {
  display: flex;
  gap: 25px;
  margin: 16px 0 20px;
}
.bk-availability-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.bk-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 13px;
}
.bk-field input,
.bk-field select {
  height: 36px;
  border: 1px solid #d5e0eb;
  border-radius: 8px;
  padding: 0 10px;
  background: #fff;
  color: #18395d;
}
.bk-field select {
  width: 100%;
}
.bk-company-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
}
.bk-required {
  color: #c12437;
}
.bk-company-picker {
  position: relative;
  width: 100%;
}
.bk-company-picker input {
  width: 100%;
  padding-inline-end: 42px;
  box-sizing: border-box;
  outline: none;
}
.bk-company-picker input:focus {
  border-color: #6da2c3;
  box-shadow: 0 0 0 2px #6da2c31c;
}
.bk-company-toggle {
  position: absolute;
  inset-inline-end: 1px;
  top: 1px;
  height: 34px;
  width: 38px;
  border: 0;
  background: transparent;
  color: #526579;
  cursor: pointer;
}
.bk-company-options {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid #d5e0eb;
  background: white;
  border-radius: 9px;
  box-shadow: 0 9px 25px #091f3522;
  z-index: 215;
  padding: 4px;
}
.bk-company-options button {
  display: block;
  width: 100%;
  padding: 10px 12px;
  text-align: start;
  border: 0;
  background: white;
  color: #18395d;
  cursor: pointer;
  border-radius: 6px;
  font: inherit;
  font-weight: 400;
}
.bk-company-options button:hover,
.bk-company-options button[aria-selected='true'] {
  background: #eaf3f9;
}
.bk-company-empty {
  padding: 12px;
  color: #7a899c;
  font-weight: 400;
}
.bk-modal .bk-error {
  background: #fff2f2;
  border-radius: 7px;
  font-size: 13px;
}
@media (max-width: 600px) {
  .bk-availability-grid {
    grid-template-columns: 1fr;
  }
  .bk-head {
    align-items: flex-start;
  }
  .bk-header-actions {
    flex-wrap: wrap;
  }
}

/* Shared table presentation: physical left/search, middle/page size, right/action in both languages. */
.ui-table-toolbar {
  direction: ltr !important;
  display: grid !important;
  grid-template-columns: minmax(160px, 1fr) auto minmax(160px, 1fr) !important;
  align-items: center !important;
  column-gap: 16px !important;
  row-gap: 10px !important;
  justify-content: stretch !important;
  width: 100% !important;
  margin-bottom: 16px !important;
}
.ui-table-toolbar > input:first-child,
.ui-table-toolbar > .search:first-child,
.ui-table-toolbar > .search-box:first-child {
  grid-column: 1;
  grid-row: 1;
  justify-self: start !important;
  min-width: 0;
  max-width: 360px;
  width: 100%;
}
.ui-table-toolbar > select,
.ui-table-toolbar > .per-page,
.ui-table-toolbar > .toolbar-right {
  grid-column: 2;
  grid-row: 1;
  justify-self: center !important;
  margin-inline: auto !important;
}
.ui-table-toolbar > .toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ui-table-toolbar > .toolbar-right .per-page {
  margin: auto;
}
.ui-table-toolbar > .toolbar-right .count {
  font-size: 12px;
  color: #68788b;
}
.ui-table-toolbar > .filters {
  display: contents;
}
.ui-table-toolbar > .filters > input:first-child {
  grid-column: 1;
  grid-row: 1;
  justify-self: start !important;
  max-width: 360px;
  width: 100%;
}
.ui-table-toolbar > .filters > select {
  grid-column: 2;
  grid-row: 1;
  justify-self: center !important;
}
.ui-table-toolbar > .toolbar-right > button,
.ui-table-toolbar > button.primary,
.ui-table-toolbar > .primary,
.ui-table-toolbar > .btn-new {
  grid-column: 3;
  grid-row: 1;
  justify-self: end !important;
}
.ui-table-toolbar > select:not(:first-child) {
  width: auto;
  min-width: 105px;
}
.ui-table-toolbar > input[type='search'],
.ui-table-toolbar > input:not([type]),
.ui-table-toolbar .search-box input {
  height: 34px !important;
  min-height: 34px !important;
  box-sizing: border-box;
}
.ui-table-toolbar > select {
  height: 34px !important;
  min-height: 34px !important;
  box-sizing: border-box;
}
.ui-table-toolbar
  > :not(input):not(select):not(.per-page):not(.toolbar-right):not(.search-box):not(.filters):not(
    button
  ) {
  justify-self: center;
}
.ui-table-toolbar > input:only-child {
  grid-column: 1;
}
.ui-table-toolbar > input:nth-child(1) {
  grid-column: 1;
}
.ui-table-toolbar > select:nth-child(2) {
  grid-column: 2;
}
.ui-table-toolbar > select:nth-child(3) {
  grid-column: 2;
}
.ui-table-toolbar > button:last-child {
  grid-column: 3;
  justify-self: end;
}
.ui-legacy-pager {
  display: none !important;
}
/* Keep the physical toolbar arrangement LTR, but type Arabic search terms naturally. */
:global(html[dir='rtl']) .ui-table-toolbar input {
  direction: rtl;
}
/* Center table values independent of dir=auto/ltr on individual cells. */
.ui-standardized-table th,
.ui-standardized-table td {
  text-align: center !important;
  vertical-align: middle !important;
}
.ui-standardized-table td[dir],
.ui-standardized-table th[dir] {
  text-align: center !important;
}
.ui-standardized-table td .actions,
.ui-standardized-table td .action-group,
.ui-standardized-table td .row-actions {
  justify-content: center !important;
}
.ui-standardized-table td input,
.ui-standardized-table td textarea {
  text-align: inherit;
}
@media (max-width: 680px) {
  .ui-table-toolbar {
    grid-template-columns: minmax(0, 1fr) auto !important;
    gap: 8px !important;
  }
  .ui-table-toolbar > input:first-child,
  .ui-table-toolbar > .search-box:first-child {
    grid-column: 1;
  }
  .ui-table-toolbar > select,
  .ui-table-toolbar > .per-page,
  .ui-table-toolbar > .toolbar-right {
    grid-column: 2;
  }
  .ui-table-toolbar > button.primary,
  .ui-table-toolbar > .primary {
    grid-column: 1/-1;
    grid-row: auto;
    justify-self: end;
  }
}
</style>

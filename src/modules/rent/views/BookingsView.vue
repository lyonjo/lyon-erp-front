<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
const router = useRouter(),
  { locale } = useI18n(),
  tr = (en, ar) => (locale.value === 'ar' ? ar : en)
const tab = ref('pending'),
  search = ref(''),
  perPage = ref(15),
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
const client = (b) =>
  b.customer?.name ||
  b.customer?.customer_name ||
  b.customer_company?.name ||
  b.customer_company?.company_name ||
  '—'
</script>
<template>
  <section class="bk-page" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <div class="bk-head">
      <h2>{{ tr('Booking', 'الحجوزات') }}</h2>
      <button class="bk-primary" @click="router.push('/rent/booking/create')">
        + {{ tr('New Booking', 'حجز جديد') }}
      </button>
    </div>
    <div class="bk-card">
      <nav class="bk-tabs">
        <button :class="{ active: tab === 'pending' }" @click="tab = 'pending'">
          {{ tr('Pending Booking', 'الحجوزات المعلقة') }}</button
        ><button :class="{ active: tab === 'reservations' }" @click="tab = 'reservations'">
          {{ tr('Booking Reservations', 'حجوزات مؤكدة') }}
        </button>
      </nav>
      <div class="bk-tools">
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
        <table>
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
      <div class="bk-pagination">
        <span>{{ meta.total }} {{ tr('records', 'سجل') }}</span>
        <div>
          <button :disabled="page <= 1" @click="page--">‹</button
          ><span>{{ page }} / {{ lastPage }}</span
          ><button :disabled="page >= lastPage" @click="page++">›</button>
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
</style>

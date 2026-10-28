<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
const route = useRoute(),
  router = useRouter(),
  { locale } = useI18n(),
  tr = (en, ar) => (locale.value === 'ar' ? ar : en)
const carId = computed(() => route.params.id),
  data = ref({ car: {}, reservations: [] }),
  bookings = ref([]),
  loading = ref(true),
  saving = ref(false),
  error = ref(''),
  modal = ref(false),
  record = ref(null)
const form = ref({ booking_id: '', ticket_number: '' })
const chosen = computed(
  () =>
    bookings.value.find((b) => String(b.id) === String(form.value.booking_id)) ||
    record.value?.booking ||
    null,
)
const airport = computed(() => Boolean(chosen.value?.requires_ticket))
const money = (v, c) => `${Number(v || 0).toFixed(2)} ${c || 'JOD'}`
async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data: response } = await api.get(`/rent/car-reservations/cars/${carId.value}`)
    data.value = response.data
  } catch (e) {
    error.value =
      e.response?.data?.message || tr('Could not load reservations', 'تعذر تحميل الحجوزات')
  } finally {
    loading.value = false
  }
}
async function edit(row = null) {
  error.value = ''
  record.value = row
  form.value = {
    booking_id: row?.booking_id || '',
    ticket_number: row?.booking?.ticket_number || '',
  }
  try {
    const { data: response } = await api.get(
      `/rent/car-reservations/cars/${carId.value}/booking-options`,
    )
    bookings.value = response.data || []
    if (row?.booking && !bookings.value.some((x) => x.id === row.booking_id))
      bookings.value.unshift(row.booking)
    modal.value = true
  } catch (e) {
    error.value =
      e.response?.data?.message ||
      tr('Could not load booking options', 'تعذر تحميل الحجوزات المتاحة')
  }
}
async function save() {
  if (!form.value.booking_id || saving.value) return
  saving.value = true
  error.value = ''
  try {
    const url = record.value
      ? `/rent/car-reservations/cars/${carId.value}/${record.value.id}`
      : `/rent/car-reservations/cars/${carId.value}`
    if (record.value) await api.put(url, form.value)
    else await api.post(url, form.value)
    modal.value = false
    await load()
  } catch (e) {
    error.value = e.response?.data?.message || tr('Save failed', 'فشل الحفظ')
  } finally {
    saving.value = false
  }
}
async function remove(row) {
  if (
    !window.confirm(
      tr(
        'Remove this assignment? The booking will be kept.',
        'إلغاء ربط السيارة؟ سيتم الاحتفاظ بالحجز.',
      ),
    )
  )
    return
  try {
    await api.delete(`/rent/car-reservations/cars/${carId.value}/${row.id}`)
    await load()
  } catch (e) {
    error.value = e.response?.data?.message || tr('Removal failed', 'تعذر الحذف')
  }
}
onMounted(load)
</script>
<template>
  <section class="rc-page" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <div class="top">
      <h2>{{ tr('Edit Vehicle Bookings', 'إدارة حجوزات السيارة') }}</h2>
      <div class="top-actions">
        <button class="primary" :disabled="loading" @click="edit()">
          + {{ tr('Add Reservation', 'إضافة حجز') }}</button
        ><button class="primary" @click="router.push('/rent/car-rentered')">
          {{ tr('Back to Reservations', 'العودة للحجوزات') }}
        </button>
      </div>
    </div>
    <div v-if="loading" class="status">{{ tr('Loading...', 'جاري التحميل...') }}</div>
    <template v-else
      ><div class="car-info">
        <strong>{{ tr('Vehicle Number', 'رقم السيارة') }}: {{ data.car?.number }}</strong> —
        {{ data.car?.brand?.name }} {{ data.car?.model?.name }} {{ data.car?.model_year }}
      </div>
      <div v-if="error" class="error">{{ error }}</div>
      <div class="scroll">
        <table>
          <thead>
            <tr>
              <th>{{ tr('Booking Number', 'رقم الحجز') }}</th>
              <th>{{ tr('Customer Name', 'اسم العميل') }}</th>
              <th>{{ tr('Service', 'الخدمة') }}</th>
              <th>{{ tr('Booking Period', 'مدة الحجز') }}</th>
              <th>{{ tr('Ticket Number', 'رقم التذكرة') }}</th>
              <th>{{ tr('Action', 'الإجراء') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in data.reservations" :key="row.id">
              <td>{{ row.booking_id }}</td>
              <td>{{ row.booking?.customer_name }}</td>
              <td>{{ row.booking?.service }}</td>
              <td>{{ row.booking?.total_days }}</td>
              <td>{{ row.booking?.ticket_number || '—' }}</td>
              <td>
                <button class="action" @click="edit(row)">✎ {{ tr('Edit', 'تعديل') }}</button
                ><button class="action danger delete-action" @click="remove(row)">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 10v6M14 10v6" /></svg
                  >{{ tr('Delete', 'حذف') }}
                </button>
              </td>
            </tr>
            <tr v-if="!data.reservations?.length">
              <td colspan="6" class="status">
                {{
                  tr(
                    'No reservations linked to this vehicle.',
                    'لا توجد حجوزات مرتبطة بهذه السيارة.',
                  )
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </div></template
    >
    <div v-if="modal" class="shade" @click.self="modal = false">
      <div class="dialog">
        <button class="close" @click="modal = false">×</button>
        <h3>
          {{ record ? tr('Edit Booking', 'تعديل الحجز') : tr('Add Reservation', 'إضافة حجز') }}
        </h3>
        <label
          >{{ tr('Booking Number', 'رقم الحجز')
          }}<select v-model="form.booking_id">
            <option value="">{{ tr('Choose booking', 'اختر الحجز') }}</option>
            <option v-for="b in bookings" :key="b.id" :value="b.id">
              #{{ b.id }} — {{ b.customer_name || '—' }}
            </option>
          </select></label
        ><template v-if="chosen"
          ><div class="two">
            <label
              >{{ tr('Pickup Date', 'تاريخ الاستلام')
              }}<input :value="chosen.start_date" disabled /></label
            ><label
              >{{ tr('Pickup Time', 'وقت الاستلام')
              }}<input :value="chosen.start_time" disabled /></label
            ><label
              >{{ tr('Dropoff Date', 'تاريخ التسليم')
              }}<input :value="chosen.end_date" disabled /></label
            ><label
              >{{ tr('Dropoff Time', 'وقت التسليم') }}<input :value="chosen.end_time" disabled
            /></label>
          </div>
          <label
            >{{ tr('Pickup Location', 'موقع الاستلام')
            }}<input :value="chosen.pick_up_location" disabled /></label
          ><label
            >{{ tr('Dropoff Location', 'موقع التسليم')
            }}<input :value="chosen.return_location" disabled
          /></label>
          <div class="two">
            <label>{{ tr('Days', 'الأيام') }}<input :value="chosen.total_days" disabled /></label
            ><label
              >{{ tr('Price', 'السعر')
              }}<input :value="money(chosen.total, chosen.currency)" disabled
            /></label>
          </div>
          <label v-if="airport"
            >{{ tr('Ticket Number', 'رقم التذكرة')
            }}<input
              v-model="form.ticket_number"
              :placeholder="tr('Enter ticket number', 'أدخل رقم التذكرة')" /></label
        ></template>
        <p v-if="error" class="error">{{ error }}</p>
        <button class="primary full" :disabled="saving || !chosen" @click="save">
          {{ saving ? tr('Saving...', 'جاري الحفظ...') : tr('Save Changes', 'حفظ التغييرات') }}
        </button>
      </div>
    </div>
  </section>
</template>
<style scoped>
.rc-page {
  padding: 18px;
  color: #102846;
}
.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.top h2 {
  font-size: 24px;
}
.top-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  direction: ltr;
}
.delete-action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.car-info {
  flex-wrap: wrap;
}
.primary {
  border: 0;
  background: #6da2c3;
  color: #fff;
  border-radius: 22px;
  padding: 10px 20px;
  cursor: pointer;
}
.primary:disabled {
  opacity: 0.5;
}
.car-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin: 24px 0;
}
.scroll {
  overflow: auto;
  border: 1px solid #dce3ea;
  border-radius: 12px;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th,
td {
  padding: 15px 12px;
  border-bottom: 1px solid #dce3ea;
  text-align: start;
}
th {
  color: #8e9bad;
}
.action {
  border: 0;
  background: none;
  cursor: pointer;
  color: #183655;
}
.danger,
.error {
  color: #bb3040;
}
.status {
  text-align: center;
  padding: 32px;
  color: #8290a2;
}
.shade {
  position: fixed;
  inset: 0;
  background: #0006;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 150;
  padding: 14px;
}
.dialog {
  position: relative;
  background: white;
  border-radius: 15px;
  width: min(460px, 95vw);
  padding: 25px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 65px #0002;
}
.dialog h3 {
  text-align: center;
}
.close {
  position: absolute;
  top: 8px;
  right: 15px;
  border: 0;
  background: none;
  font-size: 27px;
  cursor: pointer;
}
.dialog label {
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 12px;
  font-weight: 600;
  margin: 10px 0;
}
.dialog input,
.dialog select {
  width: 100%;
  height: 37px;
  box-sizing: border-box;
  border: 1px solid #d9e0e7;
  border-radius: 8px;
  padding: 0 10px;
  background: white;
}
.dialog input:disabled {
  background: #f4f6f8;
  color: #475569;
}
.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.full {
  width: 100%;
  margin-top: 15px;
}
.error {
  padding: 12px;
  background: #fff2f2;
  border-radius: 8px;
}
</style>

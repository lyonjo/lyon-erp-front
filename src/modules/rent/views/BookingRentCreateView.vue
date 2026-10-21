<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
import BookingSearchSelect from '../components/BookingSearchSelect.vue'

const router = useRouter()
const { locale } = useI18n()
const tr = (en, ar) => (locale.value === 'ar' ? ar : en)
const initLoading = ref(true),
  searching = ref(false),
  saving = ref(false),
  error = ref(''),
  errors = ref({})
const options = ref({
  customers: [],
  customer_companies: [],
  branches: [],
  extra_items: [],
  settings: { tax_percent: 0, currency: 'JOD' },
})
const form = ref({
  client_type: 'customer',
  customer_id: '',
  customer_company_id: '',
  start_date: '',
  start_time: '10:00',
  end_date: '',
  end_time: '10:00',
  pick_up_branch_id: '',
  return_branch_id: '',
  extra_item_ids: [],
  is_taxable: false,
  payment_method: 'cash',
})
const selection = ref(null),
  cars = ref([]),
  didSearch = ref(false)
const choices = computed(() =>
  form.value.client_type === 'customer'
    ? options.value.customers
    : options.value.customer_companies,
)
const chosenClient = computed(() =>
  form.value.client_type === 'customer' ? form.value.customer_id : form.value.customer_company_id,
)
const clientLabel = computed(() =>
  form.value.client_type === 'customer'
    ? tr('Customer', 'العميل')
    : tr('Customer Company', 'شركة العميل'),
)
const pickup = computed(() =>
  options.value.branches.find((x) => String(x.id) === String(form.value.pick_up_branch_id)),
)
const selectedItems = computed(() =>
  options.value.extra_items.filter((x) => form.value.extra_item_ids.includes(x.id)),
)
const days = computed(() => selection.value?.total_days ?? 0)
const currency = computed(() => options.value.settings.currency || 'JOD')
const extra = computed(() =>
  selectedItems.value.reduce((sum, x) => sum + Number(x.price) * (x.is_daily ? days.value : 1), 0),
)
const branchFee = computed(() =>
  selection.value && pickup.value && String(selection.value.branch_id) !== String(pickup.value.id)
    ? 5
    : 0,
)
const taxableBase = computed(
  () => (Number(selection.value?.day_price) || 0) * days.value + extra.value,
)
const tax = computed(() =>
  form.value.is_taxable
    ? Math.round(taxableBase.value * Number(options.value.settings.tax_percent || 0)) / 100
    : 0,
)
const total = computed(() => taxableBase.value + tax.value + branchFee.value)
const companyTotal = computed(
  () =>
    (Number(selection.value?.day_company_price) || 0) * days.value +
    extra.value +
    tax.value +
    branchFee.value,
)
const money = (n) => Number(n || 0).toFixed(2) + ' ' + currency.value
const dirtySearch = () => {
  selection.value = null
  cars.value = []
  didSearch.value = false
  form.value.extra_item_ids = []
}
watch(
  () => [
    form.value.client_type,
    form.value.customer_id,
    form.value.customer_company_id,
    form.value.start_date,
    form.value.start_time,
    form.value.end_date,
    form.value.end_time,
    form.value.pick_up_branch_id,
    form.value.return_branch_id,
  ],
  dirtySearch,
)
watch(
  () => form.value.client_type,
  () => {
    form.value.customer_id = ''
    form.value.customer_company_id = ''
  },
)
async function load() {
  initLoading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/rent/bookings/options')
    options.value = data.data
  } catch (e) {
    error.value =
      e.response?.data?.message || tr('Cannot load booking options', 'تعذر تحميل البيانات')
  } finally {
    initLoading.value = false
  }
}
onMounted(load)
const valid = () => {
  if (
    !chosenClient.value ||
    !form.value.start_date ||
    !form.value.start_time ||
    !form.value.end_date ||
    !form.value.end_time ||
    !form.value.pick_up_branch_id ||
    !form.value.return_branch_id
  ) {
    error.value = tr('Fill in all required fields.', 'أدخل جميع الحقول المطلوبة.')
    return false
  }
  if (
    new Date(`${form.value.end_date}T${form.value.end_time}`) <=
    new Date(`${form.value.start_date}T${form.value.start_time}`)
  ) {
    error.value = tr(
      'End date/time must be after start.',
      'يجب أن يكون تاريخ ووقت النهاية بعد البداية.',
    )
    return false
  }
  return true
}
async function searchCars() {
  if (!valid()) return
  searching.value = true
  error.value = ''
  selection.value = null
  cars.value = []
  didSearch.value = false
  try {
    const { data } = await api.get('/rent/bookings/available-cars', { params: { ...form.value } })
    cars.value = data.data || []
    didSearch.value = true
  } catch (e) {
    error.value =
      e.response?.data?.message || tr('Vehicle search failed.', 'فشل البحث عن المركبات.')
  } finally {
    searching.value = false
  }
}
function toggleItem(id) {
  const a = form.value.extra_item_ids
  form.value.extra_item_ids = a.includes(id) ? a.filter((x) => x !== id) : [...a, id]
}
async function save() {
  if (!selection.value || saving.value) return
  error.value = ''
  errors.value = {}
  saving.value = true
  try {
    await api.post('/rent/bookings', {
      ...form.value,
      car_id: selection.value.car_id,
      customer_id: form.value.client_type === 'customer' ? form.value.customer_id : null,
      customer_company_id:
        form.value.client_type === 'company' ? form.value.customer_company_id : null,
    })
    await router.push('/rent/booking')
  } catch (e) {
    errors.value = e.response?.data?.errors || {}
    error.value = e.response?.data?.message || tr('Could not create booking.', 'تعذر إنشاء الحجز.')
  } finally {
    saving.value = false
  }
}
</script>
<template>
  <section class="br-page" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <div class="br-top">
      <h2>{{ tr('Create Booking', 'إنشاء حجز') }}</h2>
      <button
        type="button"
        class="br-back"
        @click="router.push('/rent/booking')"
        :aria-label="tr('Back to bookings', 'العودة إلى الحجوزات')"
      >
        <svg
          class="br-back-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" /></svg
        ><span>{{ tr('Back to Bookings', 'العودة للحجوزات') }}</span>
      </button>
    </div>
    <div v-if="initLoading" class="br-state">{{ tr('Loading...', 'جاري التحميل...') }}</div>
    <div v-else class="br-container">
      <div v-if="error" class="br-error">
        {{ error }}
        <button
          v-if="Object.keys(errors).length === 0 && options.branches.length === 0"
          @click="load"
        >
          {{ tr('Retry', 'إعادة المحاولة') }}
        </button>
      </div>
      <div v-for="(messages, key) in errors" :key="key" class="br-error">
        {{ key }}: {{ messages.join(', ') }}
      </div>
      <div class="br-card">
        <div class="br-radio">
          <label
            ><input v-model="form.client_type" type="radio" value="customer" />
            {{ tr('Customer', 'عميل') }}</label
          ><label
            ><input v-model="form.client_type" type="radio" value="company" />
            {{ tr('Company', 'شركة') }}</label
          >
        </div>
        <div class="br-grid">
          <label
            >{{ clientLabel }} *<BookingSearchSelect
              v-model="
                form[form.client_type === 'customer' ? 'customer_id' : 'customer_company_id']
              "
              :items="choices"
              :placeholder="tr('Search and select...', 'ابحث واختر...')"
          /></label>
          <label
            >{{ tr('Start Date', 'تاريخ البداية') }} *<input v-model="form.start_date" type="date"
          /></label>
          <label
            >{{ tr('Start Time', 'وقت البداية') }} *<input v-model="form.start_time" type="time"
          /></label>
          <label
            >{{ tr('End Date', 'تاريخ النهاية') }} *<input v-model="form.end_date" type="date"
          /></label>
          <label
            >{{ tr('End Time', 'وقت النهاية') }} *<input v-model="form.end_time" type="time"
          /></label>
          <label
            >{{ tr('Pick Up Location', 'موقع الاستلام') }} *<select
              v-model="form.pick_up_branch_id"
            >
              <option value="">{{ tr('Choose branch', 'اختر فرعاً') }}</option>
              <option v-for="b in options.branches" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select></label
          >
          <label
            >{{ tr('Return Location', 'موقع التسليم') }} *<select v-model="form.return_branch_id">
              <option value="">{{ tr('Choose branch', 'اختر فرعاً') }}</option>
              <option v-for="b in options.branches" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select></label
          >
          <label
            >{{ tr('Payment Method', 'طريقة الدفع')
            }}<select v-model="form.payment_method">
              <option value="cash">{{ tr('Cash', 'نقداً') }}</option>
              <option value="online">{{ tr('Online', 'إلكتروني') }}</option>
            </select></label
          >
          <button class="br-primary br-search" :disabled="searching" @click="searchCars">
            {{
              searching ? tr('Searching...', 'جاري البحث...') : tr('Search Cars', 'بحث عن السيارات')
            }}
          </button>
        </div>
      </div>
      <div v-if="didSearch || searching" class="br-card br-results">
        <div class="br-section-head">
          <h3>{{ tr('Available Cars', 'السيارات المتاحة') }}</h3>
          <small>{{ cars.length }} {{ tr('cars', 'سيارات') }}</small>
        </div>
        <div class="br-scroll">
          <table>
            <thead>
              <tr>
                <th>{{ tr('Vehicle No.', 'رقم السيارة') }}</th>
                <th>{{ tr('Brand', 'العلامة') }}</th>
                <th>{{ tr('Model', 'الموديل') }}</th>
                <th>{{ tr('Year', 'السنة') }}</th>
                <th>{{ tr('Location', 'الموقع') }}</th>
                <th>{{ tr('Company', 'الشركة') }}</th>
                <th>{{ tr('Day Price', 'السعر اليومي') }}</th>
                <th>{{ tr('Company Day Price', 'سعر الشركة') }}</th>
                <th>{{ tr('Action', 'الإجراء') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="searching">
                <td colspan="9" class="br-state">{{ tr('Searching...', 'جاري البحث...') }}</td>
              </tr>
              <tr v-else-if="!cars.length">
                <td colspan="9" class="br-state">
                  {{
                    tr(
                      'No available vehicles with matching pricing.',
                      'لا توجد مركبات متاحة بتسعير مناسب.',
                    )
                  }}
                </td>
              </tr>
              <tr
                v-for="v in cars"
                :key="v.car_id"
                :class="{ 'br-selected': selection?.car_id === v.car_id }"
              >
                <td>{{ v.number }}</td>
                <td>{{ v.brand }}</td>
                <td>{{ v.model }}</td>
                <td>{{ v.model_year }}</td>
                <td>{{ v.current_location }}</td>
                <td>{{ v.company_name }}</td>
                <td>{{ money(v.day_price) }}</td>
                <td>{{ money(v.day_company_price) }}</td>
                <td>
                  <button
                    class="br-small"
                    @click="
                      selection = v
                      form.extra_item_ids = []
                    "
                  >
                    {{
                      selection?.car_id === v.car_id
                        ? tr('Selected', 'محددة')
                        : tr('Select Car', 'اختر سيارة')
                    }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-if="selection" class="br-bottom">
        <div class="br-card">
          <div class="br-section-head">
            <h3>{{ tr('Extra Items', 'الإضافات') }}</h3>
            <label class="br-tax"
              ><input v-model="form.is_taxable" type="checkbox" />
              {{ tr('Taxable', 'خاضع للضريبة') }}</label
            >
          </div>
          <table>
            <thead>
              <tr>
                <th></th>
                <th>{{ tr('Item', 'الصنف') }}</th>
                <th>{{ tr('Price', 'السعر') }}</th>
                <th>{{ tr('Type', 'النوع') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in options.extra_items" :key="item.id">
                <td>
                  <input
                    type="checkbox"
                    :checked="form.extra_item_ids.includes(item.id)"
                    @change="toggleItem(item.id)"
                  />
                </td>
                <td>{{ item.name }}</td>
                <td>{{ money(item.price) }}</td>
                <td>{{ item.is_daily ? tr('Daily', 'يومي') : tr('One-time', 'مرة واحدة') }}</td>
              </tr>
              <tr v-if="!options.extra_items.length">
                <td colspan="4">{{ tr('No extra items', 'لا توجد إضافات') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="br-card br-summary">
          <h3>{{ tr('Booking Summary', 'ملخص الحجز') }}</h3>
          <div>
            <span>{{ tr('Total Days', 'عدد الأيام') }}</span
            ><strong>{{ days }}</strong>
          </div>
          <div>
            <span>{{ tr('Day Price', 'السعر اليومي') }}</span
            ><strong>{{ money(selection.day_price) }}</strong>
          </div>
          <div>
            <span>{{ tr('Company Day Price', 'سعر الشركة اليومي') }}</span
            ><strong>{{ money(selection.day_company_price) }}</strong>
          </div>
          <div>
            <span>{{ tr('Extras', 'الإضافات') }}</span
            ><strong>{{ money(extra) }}</strong>
          </div>
          <div>
            <span
              >{{ tr('Tax', 'الضريبة') }} ({{
                form.is_taxable ? options.settings.tax_percent : 0
              }}%)</span
            ><strong>{{ money(tax) }}</strong>
          </div>
          <div>
            <span>{{ tr('Branch Fee', 'رسوم الفرع') }}</span
            ><strong>{{ money(branchFee) }}</strong>
          </div>
          <div class="br-total">
            <span>{{ tr('Total', 'الإجمالي') }}</span
            ><strong>{{ money(total) }}</strong>
          </div>
          <div class="br-total">
            <span>{{ tr('Company Total', 'إجمالي الشركة') }}</span
            ><strong>{{ money(companyTotal) }}</strong>
          </div>
          <p class="br-help">
            {{
              tr(
                'Branch fee is 5 JOD if pickup differs from the vehicle current branch.',
                'رسوم الفرع 5 دنانير إذا اختلف فرع الاستلام عن الفرع الحالي للسيارة.',
              )
            }}
          </p>
        </div>
      </div>
      <button v-if="selection" class="br-primary br-create" :disabled="saving" @click="save">
        {{ saving ? tr('Creating...', 'جاري الإنشاء...') : tr('Create Booking', 'إنشاء الحجز') }}
      </button>
    </div>
  </section>
</template>
<style scoped>
.br-page {
  padding: 18px 20px;
  color: #0c2546;
}
.br-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 22px;
}
.br-top h2 {
  font-size: 25px;
}
.br-container {
  display: grid;
  gap: 16px;
}
.br-card {
  border: 1px solid #d9e2eb;
  border-radius: 15px;
  background: white;
  padding: 20px;
  box-shadow: 0 2px 5px #00000006;
}
.br-radio {
  display: flex;
  gap: 25px;
  margin-bottom: 20px;
}
.br-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 17px;
}
.br-grid > label {
  font-size: 12px;
  font-weight: 650;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.br-grid input,
.br-grid select {
  height: 36px;
  width: 100%;
  min-width: 0;
  border: 1px solid #d6e0eb;
  background: #fff;
  border-radius: 9px;
  padding: 0 10px;
  color: #0c2546;
  box-sizing: border-box;
}
.br-grid label:first-child {
  grid-column: span 2;
}
.br-input-search {
  appearance: auto;
}
.br-primary {
  border: 0;
  border-radius: 21px;
  background: #6b9fc0;
  color: white;
  padding: 11px 24px;
  font-weight: 650;
  cursor: pointer;
}
.br-primary:disabled,
.br-small:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.br-search {
  align-self: end;
  height: 36px;
}
.br-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.br-section-head h3,
.br-summary h3 {
  margin: 0;
  font-size: 17px;
}
.br-scroll {
  overflow: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
th,
td {
  text-align: start;
  padding: 12px;
  border-bottom: 1px solid #e5ebf0;
  white-space: nowrap;
}
th {
  color: #8692a7;
  font-weight: 550;
}
tr.br-selected {
  background: #edf6fc;
}
.br-small {
  background: white;
  color: #407da4;
  border: 1px solid #81aed1;
  border-radius: 7px;
  padding: 6px 10px;
  cursor: pointer;
}
.br-bottom {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, 1fr);
  gap: 16px;
}
.br-tax {
  font-size: 13px;
}
.br-summary > div {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 7px 0;
  font-size: 13px;
}
.br-summary > div span {
  color: #65758e;
}
.br-summary .br-total {
  border-top: 1px solid #e0e5ed;
  font-weight: 700;
  font-size: 15px;
}
.br-help {
  font-size: 12px;
  color: #6383a1;
  background: #eff6fb;
  border-radius: 8px;
  padding: 12px;
}
.br-create {
  width: 100%;
  border-radius: 8px;
}
.br-error {
  padding: 13px;
  color: #a32336;
  background: #fff0f0;
  border-radius: 8px;
}
.br-state {
  text-align: center;
  padding: 30px;
  color: #7b8799;
}
@media (max-width: 950px) {
  .br-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .br-bottom {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 520px) {
  .br-grid {
    grid-template-columns: 1fr;
  }
  .br-grid label:first-child {
    grid-column: auto;
  }
}
.br-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 38px;
  padding: 8px 17px;
  border: 1px solid #bfd5e7;
  border-radius: 999px;
  background: #f1f7fc;
  color: #285b80;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 2px 6px #163b5b12;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.16s,
    border-color 0.16s,
    transform 0.16s,
    box-shadow 0.16s;
}
.br-back:hover {
  background: #dfeefa;
  border-color: #8cb9d7;
  box-shadow: 0 4px 10px #163b5b20;
  transform: translateY(-1px);
}
.br-back:focus-visible {
  outline: 3px solid #77abd0;
  outline-offset: 2px;
}
.br-back-icon {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
}
.br-page[dir='rtl'] .br-back-icon {
  transform: rotate(180deg);
}
@media (max-width: 520px) {
  .br-back {
    padding: 8px 12px;
    font-size: 12px;
  }
}
</style>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
const route = useRoute(),
  router = useRouter(),
  { locale } = useI18n()
const tr = (en, ar) => (locale.value === 'ar' ? ar : en)
const id = computed(() => route.params.id)
const viewing = computed(() => route.path.endsWith('/view'))
const editing = computed(() => Boolean(id.value) && !viewing.value)
const readonly = computed(() => viewing.value || data.value.status === 'closed')
const loading = ref(Boolean(id.value)),
  saving = ref(false),
  closing = ref(false),
  error = ref(''),
  errors = ref({}),
  success = ref('')
const options = ref({
  customers: [],
  customer_companies: [],
  companies: [],
  lawyers: [],
  drivers: [],
})
const search = ref(''),
  customerKind = ref('customer'),
  customerInput = ref(''),
  companyInput = ref(''),
  lawyerInput = ref('')
const data = ref(defaultData())
function defaultData() {
  return {
    type: 'customer',
    customer_id: null,
    customer_company_id: null,
    customer_name: '',
    company_id: null,
    suit_number: '',
    party: '',
    extra_money_id: null,
    vehicle_number: '',
    croka_number: '',
    lawyer_id: null,
    driver_id: null,
    contract_id: null,
    amount: 0,
    fees: 0,
    court: '',
    date: new Date().toISOString().slice(0, 10),
    note: '',
    status: 'open',
    sessions: [{ date: '', note: '' }],
  }
}
const activeOptions = computed(() =>
  customerKind.value === 'customer' ? options.value.customers : options.value.customer_companies,
)
function customerPicked(item) {
  if (customerKind.value === 'customer') {
    data.value.customer_id = item.id
    data.value.customer_company_id = null
  } else {
    data.value.customer_company_id = item.id
    data.value.customer_id = null
  }
  customerInput.value = item.name
}
function switchCustomerKind() {
  data.value.customer_id = null
  data.value.customer_company_id = null
  customerInput.value = ''
}
function filterItems(items, q) {
  const s = q.toLocaleLowerCase().trim()
  return s
    ? items.filter((i) => (i.name || '').toLocaleLowerCase().includes(s)).slice(0, 70)
    : items.slice(0, 70)
}
function companyPicked(c) {
  data.value.company_id = c.id
  companyInput.value = c.name
}
function lawyerPicked(c) {
  data.value.lawyer_id = c.id
  lawyerInput.value = c.name
}
async function loadOptions() {
  try {
    const r = await api.get('/rent/lawsuits/options')
    options.value = r.data.data || options.value
  } catch (e) {
    error.value = e.response?.data?.message || tr('Failed to load options', 'تعذر تحميل الخيارات')
  }
}
async function load() {
  if (!id.value) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const r = await api.get(`/rent/lawsuits/${id.value}`)
    let obj = r.data.data || {}
    data.value = {
      ...defaultData(),
      ...obj,
      sessions: (obj.sessions || []).map((s) => ({
        date: (s.date || '').slice(0, 10),
        note: s.note || '',
      })),
    }
    if (!data.value.sessions.length) data.value.sessions = []
    customerKind.value = obj.customer_company_id ? 'customer_company' : 'customer'
    customerInput.value = obj.customer_display_name || ''
    companyInput.value = obj.company_name || ''
    lawyerInput.value = obj.lawyer_name || ''
  } catch (e) {
    error.value = e.response?.data?.message || tr('Failed to load lawsuit', 'تعذر تحميل القضية')
  } finally {
    loading.value = false
  }
}
watch(
  () => data.value.type,
  () => {
    if (!id.value) {
      data.value.customer_id = null
      data.value.customer_company_id = null
      data.value.customer_name = ''
      customerInput.value = ''
    }
  },
)
function addSession() {
  data.value.sessions.push({ date: '', note: '' })
}
function removeSession(i) {
  data.value.sessions.splice(i, 1)
}
function payload() {
  const v = { ...data.value }
  delete v.id
  delete v.created_at
  delete v.updated_at
  delete v.customer
  delete v.customerCompany
  delete v.company
  delete v.lawyer
  delete v.driver
  delete v.customer_display_name
  delete v.company_name
  delete v.lawyer_name
  delete v.contract
  v.amount = Number(v.amount || 0)
  v.fees = Number(v.fees || 0)
  v.sessions = v.sessions.map((s) => ({ date: s.date, note: s.note || '' }))
  if (v.type === 'customer') v.customer_name = null
  else {
    v.customer_id = null
    v.customer_company_id = null
  }
  return v
}
async function save() {
  if (readonly.value) return
  saving.value = true
  error.value = ''
  errors.value = {}
  try {
    const v = payload()
    if (editing.value) await api.put(`/rent/lawsuits/${id.value}`, v)
    else await api.post('/rent/lawsuits', v)
    router.push('/rent/lawsuits')
  } catch (e) {
    errors.value = e.response?.data?.errors || {}
    error.value =
      Object.values(errors.value).flat().join(' ') ||
      e.response?.data?.message ||
      tr('Could not save', 'تعذر الحفظ')
  } finally {
    saving.value = false
  }
}
async function close() {
  if (
    !editing.value ||
    !confirm(
      tr(
        'Close this lawsuit? It cannot be edited afterward.',
        'إغلاق القضية؟ لن يمكن تعديلها بعد ذلك.',
      ),
    )
  )
    return
  closing.value = true
  error.value = ''
  try {
    await api.patch(`/rent/lawsuits/${id.value}/close`)
    router.push('/rent/lawsuits')
  } catch (e) {
    error.value = e.response?.data?.message || tr('Close failed', 'فشل الإغلاق')
  } finally {
    closing.value = false
  }
}
onMounted(async () => {
  await loadOptions()
  await load()
})
</script>
<template>
  <section class="ls-page">
    <div class="ls-top">
      <h2>
        {{
          viewing
            ? tr('View Lawsuit', 'عرض القضية')
            : editing
              ? tr('Edit Lawsuit', 'تعديل قضية')
              : tr('Add Lawsuit', 'إضافة قضية')
        }}
      </h2>
      <div class="ls-buttons">
        <button class="outline" @click="router.push('/rent/lawsuits')">
          {{ tr('Back', 'رجوع') }}</button
        ><button v-if="editing && !readonly" class="close" :disabled="closing" @click="close">
          {{ tr('Close Lawsuit', 'إغلاق القضية') }}</button
        ><button v-if="!readonly" class="primary" :disabled="saving" @click="save">
          {{
            saving
              ? tr('Saving...', 'جاري الحفظ')
              : editing
                ? tr('Update', 'تحديث')
                : tr('Add Lawsuit', 'إضافة قضية')
          }}
        </button>
      </div>
    </div>
    <p v-if="error" class="ls-error">{{ error }}</p>
    <div v-if="loading" class="ls-card loading">{{ tr('Loading...', 'جاري التحميل...') }}</div>
    <div v-else class="ls-card">
      <div class="ls-fields">
        <div class="ls-notice">
          {{
            editing || viewing
              ? tr('Lawsuit ID', 'رقم القضية') + ': ' + id
              : tr(
                  'Lawsuit ID will be generated after saving.',
                  'سيتم إنشاء رقم القضية بعد الحفظ.',
                )
          }}<span v-if="readonly && data.status === 'closed'">
            • {{ tr('Closed — read only', 'مغلقة — للعرض فقط') }}</span
          >
        </div>
        <div class="ls-grid">
          <label
            ><span>{{ tr('Suit Type', 'نوع القضية') }} *</span
            ><select v-model="data.type" :disabled="readonly">
              <option value="customer">{{ tr('Customer', 'عميل') }}</option>
              <option value="ongoing_against_us">
                {{ tr('Ongoing — against us', 'مرفوعة ضدنا') }}
              </option>
            </select></label
          >
          <label
            ><span>{{ tr('Company Name', 'اسم الشركة') }} *</span
            ><select v-model="data.company_id" :disabled="readonly">
              <option :value="null">{{ tr('Select company', 'اختر الشركة') }}</option>
              <option v-for="c in options.companies" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select></label
          >
          <div class="wide" v-if="data.type === 'customer'">
            <label
              ><span>{{ tr('Customer Type', 'نوع العميل') }}</span
              ><select v-model="customerKind" :disabled="readonly" @change="switchCustomerKind">
                <option value="customer">{{ tr('Customer', 'عميل') }}</option>
                <option value="customer_company">{{ tr('Customer Company', 'شركة عميلة') }}</option>
              </select></label
            >
            <label
              ><span>{{ tr('Customer / Company', 'العميل / الشركة') }} *</span
              ><input
                v-model="customerInput"
                :disabled="readonly"
                :placeholder="tr('Search by name...', 'ابحث بالاسم...')"
              />
              <div
                v-if="
                  !readonly &&
                  customerInput &&
                  !(
                    (data.customer_id || data.customer_company_id) &&
                    activeOptions.some(
                      (c) =>
                        c.id === (data.customer_id || data.customer_company_id) &&
                        c.name === customerInput,
                    )
                  )
                "
                class="choices"
              >
                <button
                  v-for="c in filterItems(activeOptions, customerInput)"
                  :key="c.id"
                  @click="customerPicked(c)"
                >
                  {{ c.name }}
                </button>
              </div></label
            >
          </div>
          <label v-else class="span2"
            ><span>{{ tr('Customer Name', 'اسم العميل') }} *</span
            ><input
              v-model="data.customer_name"
              :disabled="readonly"
              :placeholder="tr('Enter name', 'أدخل الاسم')"
          /></label>
          <label
            ><span>{{ tr('Lawyer', 'المحامي') }}</span
            ><select v-model="data.lawyer_id" :disabled="readonly">
              <option :value="null">{{ tr('Select lawyer', 'اختر المحامي') }}</option>
              <option v-for="l in options.lawyers" :key="l.id" :value="l.id">{{ l.name }}</option>
            </select></label
          >
          <label
            ><span>{{ tr('Date', 'التاريخ') }} *</span
            ><input v-model="data.date" type="date" :disabled="readonly"
          /></label>
          <label
            ><span>{{ tr('Suit No.', 'رقم الدعوى') }}</span
            ><input v-model="data.suit_number" :disabled="readonly"
          /></label>
          <label
            ><span>{{ tr('Court Name', 'اسم المحكمة') }}</span
            ><input v-model="data.court" :disabled="readonly"
          /></label>
          <label
            ><span>{{ tr('Amount', 'المبلغ') }} *</span
            ><input
              v-model.number="data.amount"
              type="number"
              min="0"
              step="0.01"
              :disabled="readonly"
          /></label>
          <label
            ><span>{{ tr('Lawyer Fees', 'أتعاب المحامي') }} *</span
            ><input
              v-model.number="data.fees"
              type="number"
              min="0"
              step="0.01"
              :disabled="readonly"
          /></label>
          <label
            ><span>{{ tr('Party', 'الطرف') }}</span
            ><input v-model="data.party" :disabled="readonly"
          /></label>
          <label
            ><span>{{ tr('Vehicle No.', 'رقم السيارة') }}</span
            ><input v-model="data.vehicle_number" :disabled="readonly"
          /></label>
          <label
            ><span>{{ tr('Croka No.', 'رقم الكروكا') }}</span
            ><input v-model="data.croka_number" :disabled="readonly"
          /></label>
          <label
            ><span>{{ tr('Contract ID', 'رقم العقد') }}</span
            ><input v-model.number="data.contract_id" type="number" min="1" :disabled="readonly"
          /></label>
          <label
            ><span>{{ tr('Driver', 'السائق') }}</span
            ><select v-model="data.driver_id" :disabled="readonly">
              <option :value="null">{{ tr('None', 'لا يوجد') }}</option>
              <option v-for="driver in options.drivers" :key="driver.id" :value="driver.id">
                {{ driver.name }}
              </option>
            </select></label
          >
          <label
            ><span>{{ tr('Extra Money ID', 'رقم المبلغ الإضافي') }}</span
            ><input v-model.number="data.extra_money_id" type="number" min="1" :disabled="readonly"
          /></label>
          <label class="span2"
            ><span>{{ tr('Notes', 'ملاحظات') }}</span
            ><textarea v-model="data.note" rows="3" :disabled="readonly" />
          </label>
        </div>
        <div class="sessions">
          <h3>{{ tr('Court Sessions', 'جلسات المحكمة') }}</h3>
          <div v-for="(s, i) in data.sessions" :key="i" class="session">
            <div class="session-head">
              <b>{{ tr('Session', 'جلسة') }} {{ i + 1 }}</b
              ><button v-if="!readonly" @click="removeSession(i)">{{ tr('Remove', 'حذف') }}</button>
            </div>
            <div class="ls-grid">
              <label
                ><span>{{ tr('Date', 'التاريخ') }} *</span
                ><input v-model="s.date" type="date" :disabled="readonly" /></label
              ><label
                ><span>{{ tr('Note', 'ملاحظة') }}</span
                ><input v-model="s.note" :disabled="readonly"
              /></label>
            </div>
          </div>
          <button v-if="!readonly" class="add-session" @click="addSession">
            + {{ tr('New Session', 'جلسة جديدة') }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
<style scoped>
.ls-page {
  padding: 16px;
  color: #102445;
}
.ls-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 28px;
}
.ls-top h2 {
  font-size: 24px;
}
.ls-buttons {
  display: flex;
  gap: 10px;
}
.ls-buttons button {
  border-radius: 24px;
  padding: 9px 20px;
  border: 1px solid #d3deea;
  background: white;
  cursor: pointer;
}
.ls-buttons .primary {
  background: #5f9dc5;
  color: white;
  border: 0;
}
.ls-buttons .close {
  background: #ef9b0e;
  color: white;
  border: 0;
}
.ls-card {
  background: white;
  border: 1px solid #d5dfe9;
  border-radius: 16px;
  min-height: 320px;
  padding: 30px;
}
.ls-fields {
  max-width: 730px;
  margin: auto;
}
.ls-notice {
  text-align: center;
  color: #6f829c;
  font-size: 12px;
  margin-bottom: 26px;
}
.ls-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 22px;
}
.ls-grid label,
.wide label {
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
  position: relative;
}
.ls-grid label span,
.wide label span {
  font-size: 13px;
}
.ls-grid input,
.ls-grid select,
.ls-grid textarea,
.wide input,
.wide select {
  font: inherit;
  font-weight: 400;
  background: white;
  color: #102445;
  padding: 10px 14px;
  border: 1px solid #ced8e5;
  border-radius: 10px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  min-height: 41px;
}
.ls-grid :disabled,
.wide :disabled {
  background: #f5f7fa;
  color: #455e7c;
}
.span2,
.wide {
  grid-column: 1/-1;
}
.wide {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px;
}
.choices {
  position: absolute;
  top: 100%;
  inset-inline: 0;
  z-index: 15;
  background: white;
  border: 1px solid #d5dfe9;
  max-height: 220px;
  overflow: auto;
  box-shadow: 0 8px 20px #1229;
  border-radius: 9px;
}
.choices button {
  display: block;
  background: white;
  border: 0;
  text-align: start;
  padding: 8px 12px;
  width: 100%;
  cursor: pointer;
  color: #102445;
}
.choices button:hover {
  background: #eaf4fb;
}
.sessions {
  margin-top: 30px;
}
.sessions h3 {
  font-size: 15px;
  margin-bottom: 20px;
}
.session {
  padding: 14px 0 18px;
  border-bottom: 1px solid #e2e6ed;
}
.session-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}
.session-head button,
.add-session {
  border: 0;
  background: white;
  cursor: pointer;
  color: #174d77;
}
.add-session {
  display: block;
  margin: 16px 0 0 auto;
  font-weight: 700;
}
.ls-error {
  color: #b91c1c;
  background: #fff0f0;
  padding: 12px;
  border-radius: 10px;
}
.loading {
  text-align: center;
  padding-top: 60px;
}
@media (max-width: 620px) {
  .ls-grid,
  .wide {
    grid-template-columns: 1fr;
  }
  .ls-top {
    flex-wrap: wrap;
  }
}
</style>

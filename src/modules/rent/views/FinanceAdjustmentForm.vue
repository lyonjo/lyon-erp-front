<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
import FinanceSearchSelect from '../components/FinanceSearchSelect.vue'
const props = defineProps({ kind: { type: String, required: true } })
const route = useRoute(),
  router = useRouter(),
  { locale } = useI18n()
const tr = (en, ar) => (locale.value === 'ar' ? ar : en)
const names = {
  refunds: ['Refund', 'استرداد'],
  discounts: ['Discount', 'خصم'],
  gasoline: ['Gasoline', 'وقود'],
}
const id = computed(() => Number(route.params.id) || null),
  view = computed(() => route.path.endsWith('/view')),
  readonly = computed(() => view.value || (props.kind === 'discounts' && !!form.value.is_approved))
const form = ref({
    contract_id: '',
    car_id: '',
    transportation_id: null,
    date: new Date().toLocaleDateString('en-CA'),
    amount: '',
    note: '',
    is_approved: false,
  }),
  contracts = ref([]),
  cars = ref([]),
  contractSearch = ref(''),
  carSearch = ref(''),
  context = ref(null),
  loading = ref(false),
  saving = ref(false),
  error = ref('')
const base = computed(() => `/rent/${props.kind}`)
async function loadContracts() {
  try {
    contracts.value =
      (await api.get(`${base.value}/contracts`, { params: { search: contractSearch.value } })).data
        .data || []
  } catch (e) {
    error.value = e.response?.data?.message || 'Load failed'
  }
}
async function loadCars() {
  if (props.kind !== 'gasoline') return
  cars.value =
    (await api.get('/rent/gasoline/vehicles', { params: { search: carSearch.value } })).data.data ||
    []
}
async function load() {
  loading.value = true
  try {
    if (id.value) {
      const r = await api.get(`${base.value}/${id.value}`)
      const v = r.data.data || {}
      form.value = { ...form.value, ...v, date: String(v.date || '').slice(0, 10) }
      context.value = {
        id: v.contract_id,
        customer_name: v.customer_name,
        company_name: v.company_name,
      }
    }
    await loadContracts()
    await loadCars()
    syncContext()
  } catch (e) {
    error.value = e.response?.data?.message || 'Load failed'
  } finally {
    loading.value = false
  }
}
function syncContext() {
  context.value =
    contracts.value.find((c) => Number(c.id) === Number(form.value.contract_id)) ||
    (Number(context.value?.id) === Number(form.value.contract_id) ? context.value : null)
}
async function resolveRental() {
  if (props.kind !== 'gasoline' || !form.value.car_id || !form.value.date || readonly.value) return
  try {
    const r = (
      await api.get('/rent/gasoline/resolve', {
        params: { car_id: form.value.car_id, date: form.value.date },
      })
    ).data.data
    if (r?.contract_id) {
      form.value.contract_id = r.contract_id
      contractSearch.value = String(r.contract_id)
      await loadContracts()
      syncContext()
    } else {
      form.value.contract_id = ''
      context.value = null
    }
  } catch (e) {
    error.value = e.response?.data?.message || 'Lookup failed'
  }
}
async function save() {
  if (readonly.value) return
  saving.value = true
  error.value = ''
  try {
    const payload = {
      contract_id: Number(form.value.contract_id),
      transportation_id: form.value.transportation_id || null,
      amount: Number(form.value.amount),
      date: form.value.date,
      note: form.value.note || null,
    }
    if (props.kind === 'gasoline') payload.car_id = Number(form.value.car_id)
    if (id.value) await api.put(`${base.value}/${id.value}`, payload)
    else await api.post(base.value, payload)
    router.push(base.value)
  } catch (e) {
    error.value =
      Object.values(e.response?.data?.errors || {})
        .flat()
        .join(' ') ||
      e.response?.data?.message ||
      'Save failed'
  } finally {
    saving.value = false
  }
}
const contractLabel = (c) => `#${c.id} — ${c.customer_name || ''} — ${c.vehicle_number || ''}`
const carLabel = (c) => String(c.number || c.id)
let timer
watch(contractSearch, () => {
  clearTimeout(timer)
  timer = setTimeout(loadContracts, 250)
})
watch(carSearch, () => {
  clearTimeout(timer)
  timer = setTimeout(loadCars, 250)
})
watch(() => form.value.contract_id, syncContext)
watch([() => form.value.car_id, () => form.value.date], resolveRental)
onMounted(load)
</script>
<template>
  <section class="wrap" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <header>
      <h2>
        {{ tr(view ? 'View' : id ? 'Edit' : 'Add', view ? 'عرض' : id ? 'تعديل' : 'إضافة') }}
        {{ tr(...names[kind]) }}
      </h2>
      <div>
        <button class="back" @click="router.push(base)">{{ tr('Back', 'عودة') }}</button
        ><button v-if="!readonly" class="primary" :disabled="saving || loading" @click="save">
          {{ tr('Save', 'حفظ') }}
        </button>
      </div>
    </header>
    <div class="panel">
      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="loading">{{ tr('Loading...', 'جار التحميل...') }}</p>
      <div v-else class="fields">
        <label
          >{{ tr('Contract ID', 'رقم العقد') }} *<FinanceSearchSelect
            v-model="form.contract_id"
            :options="contracts"
            :disabled="readonly"
            :label-of="contractLabel"
            :placeholder="tr('Search contracts...', 'ابحث عن العقود...')"
            @search="contractSearch = $event"
        /></label>
        <label
          >{{ tr('Customer / Company', 'العميل / الشركة')
          }}<input :value="context?.customer_name || form.customer_name || '—'" disabled
        /></label>
        <label
          >{{ tr('Fleet Company', 'الشركة المالكة')
          }}<input :value="context?.company_name || form.company_name || '—'" disabled
        /></label>
        <template v-if="kind === 'gasoline'"
          ><label
            >{{ tr('Vehicle No.', 'رقم السيارة') }} *<FinanceSearchSelect
              v-model="form.car_id"
              :options="cars"
              :disabled="readonly"
              :label-of="carLabel"
              :placeholder="tr('Search car...', 'ابحث عن السيارة...')"
              @search="carSearch = $event" /></label
        ></template>
        <label v-if="kind !== 'discounts'"
          >{{ tr('Date', 'التاريخ') }} *<input
            type="date"
            v-model="form.date"
            :disabled="readonly"
            required
        /></label>
        <label
          >{{ tr('Amount', 'المبلغ') }} *<input
            type="number"
            v-model="form.amount"
            :disabled="readonly"
            min="0"
            step="0.01"
            required
        /></label>
        <label v-if="kind !== 'refunds'"
          >{{ tr('Note', 'ملاحظات') }}<textarea rows="3" v-model="form.note" :disabled="readonly" />
        </label>
        <div v-if="kind === 'discounts'" class="approval">
          <strong>{{ tr('Approval status', 'حالة الاعتماد') }}:</strong>
          {{ form.is_approved ? tr('Approved', 'معتمد') : tr('Pending', 'بانتظار الاعتماد') }}
        </div>
      </div>
    </div>
  </section>
</template>
<style scoped>
.wrap {
  padding: 17px;
  color: #102447;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}
h2 {
  font-size: 24px;
}
.back {
  background: white;
  border: 1px solid #d1dcea;
  border-radius: 24px;
  padding: 10px 20px;
  cursor: pointer;
}
.primary {
  background: #609fc4;
  color: white;
  border: 0;
  border-radius: 24px;
  padding: 10px 26px;
  margin-inline-start: 10px;
  cursor: pointer;
}
.panel {
  border: 1px solid #d8e2ed;
  border-radius: 16px;
  padding: 34px;
}
.fields {
  max-width: 780px;
  margin: auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 19px;
}
label {
  display: flex;
  flex-direction: column;
  font-size: 13px;
  font-weight: 600;
  gap: 7px;
}
label input,
label select,
label textarea {
  height: 39px;
  border: 1px solid #ced8e5;
  border-radius: 8px;
  padding: 8px 12px;
  background: white;
  min-width: 0;
}
label textarea {
  height: auto;
}
label:has(textarea),
.approval {
  grid-column: span 2;
}
label input:disabled {
  background: #f7f9fc;
}
.error {
  color: #c22;
}
@media (max-width: 650px) {
  .fields {
    grid-template-columns: 1fr;
  }
  label:has(textarea),
  .approval {
    grid-column: auto;
  }
}
</style>

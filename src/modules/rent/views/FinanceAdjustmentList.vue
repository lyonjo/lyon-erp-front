<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
const props = defineProps({ kind: { type: String, required: true } })
const router = useRouter(),
  { locale } = useI18n()
const t = (en, ar) => (locale.value === 'ar' ? ar : en)
const meta = {
  refunds: ['Refunds', 'الاستردادات', 'Refund', 'استرداد'],
  discounts: ['Discounts', 'الخصومات', 'Discount', 'خصم'],
  gasoline: ['Gasoline', 'الوقود', 'Gasoline', 'وقود'],
}
const name = computed(() => meta[props.kind] || meta.refunds)
const rows = ref([]),
  search = ref(''),
  perPage = ref(15),
  page = ref(1),
  lastPage = ref(1),
  total = ref(0),
  loading = ref(false),
  error = ref(''),
  del = ref(null),
  busy = ref(false)
const url = computed(() => `/rent/${props.kind}`)
async function load() {
  loading.value = true
  error.value = ''
  try {
    const r = (
      await api.get(url.value, {
        params: { search: search.value, per_page: perPage.value, page: page.value },
      })
    ).data
    rows.value = r.data || []
    total.value = r.total || 0
    lastPage.value = r.last_page || 1
  } catch (e) {
    error.value = e.response?.data?.message || String(e)
  } finally {
    loading.value = false
  }
}
function nav(s) {
  router.push(`/rent/${props.kind}${s}`)
}
async function remove() {
  if (del.value == null) return
  busy.value = true
  try {
    await api.delete(`${url.value}/${del.value}`)
    del.value = null
    await load()
  } catch (e) {
    error.value = e.response?.data?.message || 'Delete failed'
  } finally {
    busy.value = false
  }
}
async function approve(id) {
  if (!confirm(t('Approve this discount?', 'هل تريد اعتماد هذا الخصم؟'))) return
  busy.value = true
  try {
    await api.post(`/rent/discounts/${id}/approve`)
    await load()
  } catch (e) {
    error.value = e.response?.data?.message || 'Approval failed'
  } finally {
    busy.value = false
  }
}
function prev() {
  if (page.value > 1) {
    page.value--
    load()
  }
}
function next() {
  if (page.value < lastPage.value) {
    page.value++
    load()
  }
}
let delay
watch(search, () => {
  clearTimeout(delay)
  delay = setTimeout(() => {
    page.value = 1
    load()
  }, 280)
})
watch(perPage, () => {
  page.value = 1
  load()
})
onMounted(load)
</script>
<template>
  <section class="wrap" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <div class="heading">
      <h2>{{ t(name[0], name[1]) }}</h2>
      <button class="primary" @click="nav('/create')">
        + {{ t('New', 'إضافة') }} {{ t(name[2], name[3]) }}
      </button>
    </div>
    <div class="card">
      <div class="toolbar">
        <input v-model="search" :placeholder="t('Search', 'بحث')" /><select
          v-model.number="perPage"
        >
          <option :value="15">15</option>
          <option :value="30">30</option>
          <option :value="50">50</option>
        </select>
      </div>
      <div v-if="error" class="error">{{ error }}</div>
      <div class="scroll">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th v-if="kind === 'gasoline'">{{ t('Vehicle No.', 'رقم السيارة') }}</th>
              <th v-else>{{ t('Contract ID', 'رقم العقد') }}</th>
              <th>{{ t('Customer / Company', 'العميل / الشركة') }}</th>
              <th>{{ t('Amount', 'المبلغ') }}</th>
              <th v-if="kind !== 'discounts'">{{ t('Date', 'التاريخ') }}</th>
              <th v-else>{{ t('Approval', 'الاعتماد') }}</th>
              <th v-if="kind === 'discounts'">{{ t('Created By', 'أنشأه') }}</th>
              <th v-if="kind === 'discounts'">{{ t('Approved By', 'اعتمده') }}</th>
              <th>{{ t('Actions', 'الإجراءات') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td :colspan="kind === 'discounts' ? 8 : 6">
                {{ t('Loading...', 'جار التحميل...') }}
              </td>
            </tr>
            <tr v-else-if="!rows.length">
              <td :colspan="kind === 'discounts' ? 8 : 6">
                {{ t('No records', 'لا توجد بيانات') }}
              </td>
            </tr>
            <tr v-for="r in rows" :key="r.id">
              <td>{{ r.id }}</td>
              <td>{{ kind === 'gasoline' ? r.car?.number : r.contract_id }}</td>
              <td>{{ r.customer_name || r.company_name || '—' }}</td>
              <td>{{ r.amount }}</td>
              <td v-if="kind !== 'discounts'">{{ String(r.date || '').slice(0, 10) }}</td>
              <td v-else>
                {{ r.is_approved ? t('Approved', 'معتمد') : t('Pending', 'بانتظار الاعتماد') }}
              </td>
              <td v-if="kind === 'discounts'">{{ r.creator_name || '—' }}</td>
              <td v-if="kind === 'discounts'">{{ (r.approver_names || []).join(', ') || '—' }}</td>
              <td class="actions">
                <button @click="nav(`/${r.id}/view`)">◉ {{ t('View', 'عرض') }}</button
                ><button
                  v-if="kind !== 'discounts' || !r.is_approved"
                  @click="nav(`/${r.id}/edit`)"
                >
                  ✎ {{ t('Edit', 'تعديل') }}</button
                ><button v-if="kind === 'discounts' && !r.is_approved" @click="approve(r.id)">
                  ✓ {{ t('Approve', 'اعتماد') }}</button
                ><button
                  v-if="kind !== 'discounts' || !r.is_approved"
                  class="red"
                  @click="del = r.id"
                >
                  ▤ {{ t('Delete', 'حذف') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <footer>
        <span>{{ total }} {{ t('records', 'سجل') }}</span>
        <div>
          <button :disabled="page <= 1" @click="prev">{{ t('Previous', 'السابق') }}</button>
          {{ page }} / {{ lastPage }}
          <button :disabled="page >= lastPage" @click="next">{{ t('Next', 'التالي') }}</button>
        </div>
      </footer>
    </div>
    <div v-if="del !== null" class="backdrop" @click.self="del = null">
      <div class="modal">
        <h3>{{ t('Delete record?', 'هل تريد حذف السجل؟') }}</h3>
        <p>{{ t('This cannot be undone.', 'لا يمكن التراجع عن هذا الإجراء.') }}</p>
        <div>
          <button @click="del = null">{{ t('Cancel', 'إلغاء') }}</button
          ><button class="red-btn" :disabled="busy" @click="remove">
            {{ t('Delete', 'حذف') }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
<style scoped>
.wrap {
  padding: 14px;
  color: #102447;
}
.heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}
.heading h2 {
  font-size: 23px;
}
.primary {
  background: #5f9fc7;
  color: white;
  border: 0;
  border-radius: 24px;
  padding: 10px 20px;
  cursor: pointer;
}
.card {
  border: 1px solid #d5dfeb;
  border-radius: 15px;
  overflow: hidden;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  padding: 18px;
}
.toolbar input,
.toolbar select {
  border: 1px solid #d1dae7;
  border-radius: 7px;
  padding: 8px 12px;
  height: 35px;
  background: white;
}
.scroll {
  overflow: auto;
}
table {
  border-collapse: collapse;
  width: 100%;
}
th,
td {
  border-top: 1px solid #dee5ef;
  padding: 13px;
  text-align: start;
  font-size: 13px;
}
th {
  color: #9aa9c0;
  font-weight: 500;
}
.actions {
  white-space: nowrap;
}
.actions button {
  border: 0;
  background: none;
  cursor: pointer;
  margin-inline-end: 12px;
  color: #102447;
}
.actions .red {
  color: #e11d48;
}
footer {
  padding: 14px;
  display: flex;
  justify-content: space-between;
  color: #8695ad;
}
footer button {
  border: 1px solid #d4dce6;
  background: #fff;
  border-radius: 6px;
  padding: 7px;
}
.error {
  color: #c22;
  padding: 12px;
}
.backdrop {
  position: fixed;
  inset: 0;
  background: #0006;
  display: grid;
  place-items: center;
  z-index: 1000;
}
.modal {
  padding: 24px;
  border-radius: 14px;
  background: white;
  min-width: 300px;
}
.modal > div {
  display: flex;
  justify-content: end;
  gap: 10px;
}
.modal button {
  padding: 9px 18px;
  border: 1px solid #ddd;
  border-radius: 20px;
  cursor: pointer;
}
.modal .red-btn {
  background: #dc2626;
  color: white;
  border: 0;
}
</style>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
const router = useRouter(),
  { locale } = useI18n()
const tr = (en, ar) => (locale.value === 'ar' ? ar : en)
const tab = ref('money'),
  rows = ref([]),
  services = ref([]),
  search = ref(''),
  page = ref(1),
  perPage = ref(15),
  total = ref(0),
  last = ref(1),
  loading = ref(false),
  error = ref(''),
  deleting = ref(false),
  target = ref(null)
const serviceForm = ref({ id: null, name: '', price: 0 }),
  serviceEditing = ref(false)
const go = (path) => router.push(path)
async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get('/rent/extra-money', {
      params: { search: search.value, page: page.value, per_page: perPage.value },
    })
    rows.value = res.data.data || []
    total.value = res.data.total ?? res.data.meta?.total ?? 0
    last.value = res.data.last_page ?? res.data.meta?.last_page ?? 1
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to load'
  } finally {
    loading.value = false
  }
}
async function loadServices() {
  try {
    services.value = (await api.get('/rent/extra-money-services')).data.data || []
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to load services'
  }
}
function changeTab(t) {
  tab.value = t
  error.value = ''
  if (t === 'services') loadServices()
  else load()
}
function editService(s) {
  serviceForm.value = { id: s.id, name: s.name, price: Number(s.price) }
  serviceEditing.value = true
}
function resetService() {
  serviceForm.value = { id: null, name: '', price: 0 }
  serviceEditing.value = false
}
async function saveService() {
  try {
    const f = serviceForm.value
    if (f.id) await api.put(`/rent/extra-money-services/${f.id}`, f)
    else await api.post('/rent/extra-money-services', f)
    resetService()
    await loadServices()
  } catch (e) {
    error.value =
      Object.values(e.response?.data?.errors || {})
        ?.flat()
        ?.join(' ') ||
      e.response?.data?.message ||
      'Save failed'
  }
}
async function destroy() {
  if (!target.value) return
  deleting.value = true
  try {
    if (target.value.kind === 'money') {
      await api.delete(`/rent/extra-money/${target.value.id}`)
      await load()
    } else {
      await api.delete(`/rent/extra-money-services/${target.value.id}`)
      await loadServices()
    }
    target.value = null
  } catch (e) {
    error.value = e.response?.data?.message || 'Delete failed'
  } finally {
    deleting.value = false
  }
}
function previous() {
  if (page.value > 1) {
    page.value--
    load()
  }
}
function next() {
  if (page.value < last.value) {
    page.value++
    load()
  }
}
let searchTimeout
watch(search, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
})
watch(perPage, () => {
  page.value = 1
  load()
})
onMounted(load)
</script>
<template>
  <section class="em-root">
    <header class="em-title">
      <h2>{{ tr('Extra Money', 'المبالغ الإضافية') }}</h2>
      <button class="primary" v-if="tab === 'money'" @click="go('/rent/extra-money/create')">
        + {{ tr('New Extra Money', 'إضافة مبلغ جديد') }}
      </button>
    </header>
    <div class="em-card">
      <nav class="tabs">
        <button :class="{ active: tab === 'money' }" @click="changeTab('money')">
          {{ tr('Extra Money', 'المبالغ الإضافية') }}</button
        ><button :class="{ active: tab === 'services' }" @click="changeTab('services')">
          {{ tr('Extra Money Services', 'خدمات المبالغ الإضافية') }}
        </button>
      </nav>
      <p v-if="error" class="error">{{ error }}</p>
      <template v-if="tab === 'money'"
        ><div class="toolbar">
          <input v-model="search" :placeholder="tr('Search...', 'بحث...')" /><select
            v-model.number="perPage"
          >
            <option :value="15">15</option>
            <option :value="30">30</option>
            <option :value="50">50</option>
          </select>
        </div>
        <div class="scroll">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>{{ tr('Plate No.', 'رقم المركبة') }}</th>
                <th>{{ tr('Customer Name', 'اسم العميل') }}</th>
                <th>{{ tr('Total Price', 'السعر الإجمالي') }}</th>
                <th>{{ tr('Actions', 'الإجراءات') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="5" class="center">{{ tr('Loading...', 'جار التحميل') }}</td>
              </tr>
              <tr v-else-if="!rows.length">
                <td colspan="5" class="center">{{ tr('No records', 'لا توجد سجلات') }}</td>
              </tr>
              <tr v-for="r in rows" :key="r.id">
                <td>{{ r.id }}</td>
                <td>{{ r.car_number }}</td>
                <td>{{ r.customer_name }}</td>
                <td>{{ r.value }}</td>
                <td class="actions">
                  <button @click="go(`/rent/extra-money/${r.id}/view`)">
                    ◉ {{ tr('View', 'عرض') }}</button
                  ><button @click="go(`/rent/extra-money/${r.id}/edit`)">
                    ✎ {{ tr('Edit', 'تعديل') }}</button
                  ><button class="danger" @click="target = { kind: 'money', id: r.id }">
                    ▤ {{ tr('Delete', 'حذف') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <footer>
          {{ total }} {{ tr('records', 'سجل') }}
          <div>
            <button :disabled="page === 1" @click="previous">{{ tr('Previous', 'السابق') }}</button>
            {{ page }} / {{ last }}
            <button :disabled="page >= last" @click="next">{{ tr('Next', 'التالي') }}</button>
          </div>
        </footer></template
      >
      <template v-else
        ><form class="service-form" @submit.prevent="saveService">
          <strong>{{
            serviceEditing ? tr('Edit Service', 'تعديل خدمة') : tr('New Service', 'خدمة جديدة')
          }}</strong
          ><label
            >{{ tr('Name', 'الاسم')
            }}<input v-model.trim="serviceForm.name" required maxlength="190" /></label
          ><label
            >{{ tr('Price', 'السعر')
            }}<input
              v-model.number="serviceForm.price"
              type="number"
              step="0.01"
              min="0"
              required /></label
          ><button class="primary" type="submit">{{ tr('Save', 'حفظ') }}</button
          ><button v-if="serviceEditing" type="button" @click="resetService">
            {{ tr('Cancel', 'إلغاء') }}
          </button>
        </form>
        <div class="scroll">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>{{ tr('Name', 'الاسم') }}</th>
                <th>{{ tr('Price', 'السعر') }}</th>
                <th>{{ tr('Actions', 'الإجراءات') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in services" :key="s.id">
                <td>{{ s.id }}</td>
                <td>{{ s.name }}</td>
                <td>{{ s.price }}</td>
                <td class="actions">
                  <button @click="editService(s)">✎ {{ tr('Edit', 'تعديل') }}</button
                  ><button class="danger" @click="target = { kind: 'service', id: s.id }">
                    ▤ {{ tr('Delete', 'حذف') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div></template
      >
    </div>
    <div v-if="target" class="overlay" @click.self="target = null">
      <div class="dialog">
        <h3>{{ tr('Delete this record?', 'حذف هذا السجل؟') }}</h3>
        <p>{{ tr('This action cannot be undone.', 'لا يمكن التراجع عن الحذف.') }}</p>
        <div class="buttons">
          <button @click="target = null">{{ tr('Cancel', 'إلغاء') }}</button
          ><button class="danger-bg" :disabled="deleting" @click="destroy">
            {{ tr('Delete', 'حذف') }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
<style scoped>
.em-root {
  padding: 16px;
  color: #102447;
}
.em-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 30px;
}
.em-title h2 {
  font-size: 24px;
}
.primary {
  background: #5d9fc5;
  color: #fff;
  border: 0;
  border-radius: 25px;
  padding: 10px 22px;
  cursor: pointer;
}
.em-card {
  border: 1px solid #d6e0eb;
  border-radius: 14px;
  background: #fff;
  overflow: hidden;
}
.tabs {
  display: flex;
  justify-content: center;
  gap: 30px;
  padding: 30px;
}
.tabs button {
  background: none;
  border: 0;
  color: #9ba8bf;
  cursor: pointer;
  font-weight: 600;
}
.tabs .active {
  color: #071e45;
  border-bottom: 2px solid #5d9fc5;
  padding-bottom: 10px;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  padding: 16px 22px;
}
.toolbar input,
.toolbar select,
.service-form input {
  height: 34px;
  border: 1px solid #d6e0eb;
  border-radius: 7px;
  padding: 5px 12px;
}
.scroll {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  border-top: 1px solid #d8e1eb;
  padding: 13px 15px;
  text-align: start;
  white-space: nowrap;
  font-size: 13px;
}
th {
  color: #9ba8bf;
  font-weight: 500;
}
.center {
  text-align: center;
}
.actions button {
  background: none;
  border: 0;
  margin-inline-end: 12px;
  cursor: pointer;
  color: #102447;
}
.actions .danger,
.danger {
  color: #e11d48;
}
footer {
  display: flex;
  justify-content: space-between;
  padding: 15px;
  color: #8092b1;
}
footer button {
  border: 1px solid #d6e0eb;
  background: #fff;
  border-radius: 6px;
  padding: 6px;
}
.error {
  color: #c00;
  padding: 10px;
}
.service-form {
  display: flex;
  align-items: end;
  flex-wrap: wrap;
  gap: 14px;
  padding: 22px;
}
.service-form label {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.service-form label.check {
  flex-direction: row;
  align-items: center;
}
.service-form .check input {
  height: auto;
}
.overlay {
  position: fixed;
  inset: 0;
  background: #0007;
  z-index: 1000;
  display: grid;
  place-items: center;
}
.dialog {
  background: white;
  padding: 25px;
  border-radius: 15px;
  min-width: 320px;
}
.buttons {
  display: flex;
  justify-content: end;
  gap: 10px;
}
.buttons button {
  cursor: pointer;
  padding: 9px 18px;
  border-radius: 20px;
  border: 1px solid #ddd;
}
.buttons .danger-bg {
  background: #e11d48;
  color: white;
  border: 0;
}
</style>

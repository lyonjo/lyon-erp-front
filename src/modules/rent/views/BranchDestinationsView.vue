<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const route = useRoute()
const router = useRouter()
const { locale } = useI18n({ useScope: 'global' })
const tr = (en, ar) => (locale.value.startsWith('ar') ? ar : en)
const branchId = computed(() => route.params.id)
const branch = ref(null)
const rows = ref([])
const options = ref([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const formError = ref('')
const open = ref(false)
const editing = ref(null)
const destinationId = ref('')
const price = ref('0')
const page = ref(1)
const perPage = ref(50)
const search = ref('')
const filtered = computed(() =>
  rows.value.filter((row) => {
    const name = row.destination_branch?.name || ''
    return (
      name.toLowerCase().includes(search.value.toLowerCase()) ||
      String(row.id).includes(search.value.trim())
    )
  }),
)
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / perPage.value)))
const visible = computed(() =>
  filtered.value.slice((page.value - 1) * perPage.value, page.value * perPage.value),
)
async function load() {
  loading.value = true
  error.value = ''
  try {
    const [list, opts] = await Promise.all([
      api.get(`/rent/branches/${branchId.value}/destinations`),
      api.get(`/rent/branches/${branchId.value}/destinations/options`),
    ])
    rows.value = list.data.data || []
    branch.value = list.data.branch
    options.value = opts.data.data || []
    page.value = Math.min(page.value, Math.max(1, Math.ceil(rows.value.length / perPage.value)))
  } catch (e) {
    error.value =
      e.response?.data?.message || tr('Unable to load destinations.', 'تعذر تحميل الوجهات.')
  } finally {
    loading.value = false
  }
}
function edit(row = null) {
  editing.value = row
  destinationId.value = row ? String(row.destination_branch_id) : ''
  price.value = row ? String(row.price) : '0'
  formError.value = ''
  open.value = true
}
async function save() {
  if (saving.value) return
  if (
    !destinationId.value ||
    price.value === '' ||
    !Number.isFinite(Number(price.value)) ||
    Number(price.value) < 0
  ) {
    formError.value = tr(
      'Choose a destination and enter a valid price.',
      'اختر الوجهة وأدخل سعراً صحيحاً.',
    )
    return
  }
  saving.value = true
  formError.value = ''
  try {
    const payload = {
      destination_branch_id: Number(destinationId.value),
      price: Number(price.value),
    }
    if (editing.value)
      await api.put(`/rent/branches/${branchId.value}/destinations/${editing.value.id}`, payload)
    else await api.post(`/rent/branches/${branchId.value}/destinations`, payload)
    open.value = false
    await load()
  } catch (e) {
    const errs = e.response?.data?.errors
    formError.value = errs
      ? Object.values(errs).flat().join(' ')
      : e.response?.data?.message || tr('Save failed.', 'فشل الحفظ.')
  } finally {
    saving.value = false
  }
}
async function remove(row) {
  if (!window.confirm(tr('Delete this destination?', 'هل تريد حذف هذه الوجهة؟'))) return
  try {
    await api.delete(`/rent/branches/${branchId.value}/destinations/${row.id}`)
    await load()
  } catch (e) {
    error.value = e.response?.data?.message || tr('Delete failed.', 'فشل الحذف.')
  }
}
onMounted(load)
</script>

<template>
  <section class="destination-page">
    <header class="heading">
      <h1>{{ tr('Branch Destinations', 'وجهات الفرع') }} — {{ branch?.name }}</h1>
      <button class="secondary" @click="router.push('/rent/my-branches')">
        {{ tr('Back to Branches', 'العودة للفروع') }}
      </button>
    </header>
    <div class="toolbar" dir="ltr">
      <input
        v-model="search"
        :placeholder="tr('Search destination...', 'ابحث عن وجهة...')"
        @input="page = 1"
      />
      <select v-model.number="perPage" @change="page = 1">
        <option v-for="n in [10, 25, 50, 100]" :key="n" :value="n">
          {{ n }} {{ tr('per page', 'لكل صفحة') }}
        </option>
      </select>
      <button class="primary" @click="edit()">+ {{ tr('New Destination', 'وجهة جديدة') }}</button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>{{ tr('Destination Branch', 'الفرع الوجهة') }}</th>
            <th>{{ tr('Price', 'السعر') }}</th>
            <th>{{ tr('Actions', 'الإجراءات') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in visible" :key="row.id">
            <td>{{ row.id }}</td>
            <td>{{ row.destination_branch?.name }}</td>
            <td>{{ Number(row.price).toFixed(2) }}</td>
            <td>
              <button class="link" @click="edit(row)">{{ tr('Edit', 'تعديل') }}</button
              ><button class="link danger" @click="remove(row)">{{ tr('Delete', 'حذف') }}</button>
            </td>
          </tr>
          <tr v-if="!loading && !visible.length">
            <td colspan="4">{{ tr('No destinations found.', 'لا توجد وجهات.') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="pager" dir="ltr">
      <button :disabled="page === 1" @click="page--">‹</button
      ><button v-for="n in pages" :key="n" :class="{ active: n === page }" @click="page = n">
        {{ n }}</button
      ><button :disabled="page === pages" @click="page++">›</button>
    </div>
    <div v-if="open" class="backdrop" @click.self="open = false">
      <form class="dialog" @submit.prevent="save">
        <h2>
          {{
            editing ? tr('Edit Destination', 'تعديل الوجهة') : tr('New Destination', 'وجهة جديدة')
          }}
        </h2>
        <label
          >{{ tr('Destination Branch', 'الفرع الوجهة')
          }}<select v-model="destinationId" required>
            <option value="">{{ tr('Choose branch', 'اختر فرعاً') }}</option>
            <option v-for="b in options" :key="b.id" :value="String(b.id)">{{ b.name }}</option>
          </select></label
        >
        <label
          >{{ tr('Price', 'السعر')
          }}<input v-model="price" type="number" min="0" max="9999999999.99" step="0.01" required
        /></label>
        <p v-if="formError" class="error">{{ formError }}</p>
        <div class="buttons">
          <button type="button" class="secondary" @click="open = false">
            {{ tr('Cancel', 'إلغاء') }}</button
          ><button class="primary" :disabled="saving" type="submit">{{ tr('Save', 'حفظ') }}</button>
        </div>
      </form>
    </div>
  </section>
</template>

<style scoped>
.destination-page {
  padding: 18px 24px 48px;
  color: #102342;
}
.heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
  gap: 20px;
}
.heading h1 {
  font-size: 27px;
  margin: 0;
}
.toolbar {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}
.toolbar input {
  justify-self: start;
  max-width: 340px;
  width: 100%;
}
.toolbar select {
  justify-self: center;
}
.toolbar .primary {
  justify-self: end;
}
.toolbar input,
.toolbar select,
.dialog input,
.dialog select {
  height: 40px;
  border: 1px solid #d1dce6;
  border-radius: 9px;
  padding: 0 11px;
  background: white;
  color: #20334f;
}
.primary {
  background: #6ea5c7;
  color: white;
  border: 0;
  padding: 11px 22px;
  border-radius: 24px;
  cursor: pointer;
}
.secondary {
  background: white;
  border: 1px solid #d1dce6;
  padding: 10px 20px;
  border-radius: 24px;
  cursor: pointer;
}
.table-wrap {
  border: 1px solid #dce5ed;
  border-radius: 13px;
  overflow: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  padding: 16px;
  border-bottom: 1px solid #eaf0f5;
  text-align: center;
}
th {
  color: #8292a5;
  font-size: 13px;
}
.link {
  border: 0;
  background: none;
  cursor: pointer;
  color: #3984b6;
  margin: 0 9px;
}
.danger {
  color: #c33;
}
.pager {
  display: flex;
  gap: 6px;
  justify-content: center;
  margin-top: 20px;
}
.pager button {
  background: white;
  border: 1px solid #dae2e8;
  border-radius: 8px;
  padding: 7px 13px;
  cursor: pointer;
}
.pager button.active {
  background: #6ea5c7;
  color: white;
}
.pager button:disabled {
  opacity: 0.4;
  cursor: default;
}
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: #0006;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dialog {
  width: min(440px, 90vw);
  background: white;
  padding: 26px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.dialog h2 {
  margin: 0;
}
.dialog label {
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
}
.buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.error {
  color: #c02e42;
}
@media (max-width: 650px) {
  .toolbar {
    grid-template-columns: 1fr;
  }
  .toolbar input,
  .toolbar select,
  .toolbar .primary {
    justify-self: stretch;
    max-width: none;
  }
}
</style>

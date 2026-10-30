<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api'

const route = useRoute()
const router = useRouter()
const { locale } = useI18n({ useScope: 'global' })
const tr = (en, ar) => (locale.value.startsWith('ar') ? ar : en)
const id = computed(() => route.params.id)
const branch = ref({ name: '' })
const destinations = ref([])
const options = ref([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const branchError = ref('')
const dialog = ref(false)
const editing = ref(null)
const destinationId = ref('')
const price = ref('0')
const destinationError = ref('')
const destinationSaving = ref(false)
const destinationToDelete = ref(null)
const deletingDestination = ref(false)
function requestDeleteDestination(row) {
  if (!deletingDestination.value) destinationToDelete.value = row
}
function cancelDeleteDestination() {
  if (!deletingDestination.value) destinationToDelete.value = null
}
const search = ref('')
const perPage = ref(50)
const page = ref(1)
const matches = computed(() =>
  destinations.value.filter(
    (d) =>
      (d.destination_branch?.name || '').toLowerCase().includes(search.value.toLowerCase()) ||
      String(d.id).includes(search.value),
  ),
)
const totalPages = computed(() => Math.max(1, Math.ceil(matches.value.length / perPage.value)))
const visible = computed(() =>
  matches.value.slice((page.value - 1) * perPage.value, page.value * perPage.value),
)
const displayPrice = (value) =>
  Number.isFinite(Number(value)) ? Math.round(Number(value)).toString() : '—'
const back = () => router.push('/rent/branches')
async function load() {
  loading.value = true
  error.value = ''
  try {
    const [b, list, opts] = await Promise.all([
      api.get(`/rent/branches/${id.value}`),
      api.get(`/rent/branches/${id.value}/destinations`),
      api.get(`/rent/branches/${id.value}/destinations/options`),
    ])
    branch.value = { name: b.data.data?.name ?? '' }
    destinations.value = list.data.data ?? []
    options.value = opts.data.data ?? []
    page.value = Math.min(page.value, Math.max(1, Math.ceil(matches.value.length / perPage.value)))
  } catch (e) {
    error.value = e.response?.data?.message || tr('Could not load branch.', 'تعذر تحميل الفرع.')
  } finally {
    loading.value = false
  }
}
async function reloadDestinations() {
  const { data } = await api.get(`/rent/branches/${id.value}/destinations`)
  destinations.value = data.data ?? []
  page.value = Math.min(page.value, totalPages.value)
}
async function saveBranch() {
  if (saving.value) return
  branchError.value = ''
  if (!branch.value.name.trim()) {
    branchError.value = tr('Branch name is required.', 'اسم الفرع مطلوب.')
    return
  }
  saving.value = true
  try {
    await api.put(`/rent/branches/${id.value}`, { name: branch.value.name.trim() })
    back()
  } catch (e) {
    branchError.value =
      Object.values(e.response?.data?.errors ?? {})
        .flat()
        .join(' ') ||
      e.response?.data?.message ||
      tr('Could not save branch.', 'تعذر حفظ الفرع.')
  } finally {
    saving.value = false
  }
}
function openDialog(row = null) {
  editing.value = row
  destinationId.value = row ? String(row.destination_branch_id) : ''
  price.value = row ? String(row.price) : '0'
  destinationError.value = ''
  dialog.value = true
}
async function saveDestination() {
  if (destinationSaving.value) return
  destinationError.value = ''
  if (
    !destinationId.value ||
    !Number.isFinite(Number(price.value)) ||
    price.value === '' ||
    Number(price.value) < 0
  ) {
    destinationError.value = tr(
      'Select a destination and enter a valid price.',
      'اختر وجهة وأدخل سعراً صحيحاً.',
    )
    return
  }
  destinationSaving.value = true
  try {
    const payload = {
      destination_branch_id: Number(destinationId.value),
      price: Number(price.value),
    }
    if (editing.value)
      await api.put(`/rent/branches/${id.value}/destinations/${editing.value.id}`, payload)
    else await api.post(`/rent/branches/${id.value}/destinations`, payload)
    dialog.value = false
    await reloadDestinations()
  } catch (e) {
    destinationError.value =
      Object.values(e.response?.data?.errors ?? {})
        .flat()
        .join(' ') ||
      e.response?.data?.message ||
      tr('Could not save destination.', 'تعذر حفظ الوجهة.')
  } finally {
    destinationSaving.value = false
  }
}
async function deleteDestination() {
  const row = destinationToDelete.value
  if (!row || deletingDestination.value) return
  deletingDestination.value = true
  try {
    await api.delete(`/rent/branches/${id.value}/destinations/${row.id}`)
    destinationToDelete.value = null
    await reloadDestinations()
  } catch (e) {
    error.value =
      e.response?.data?.message || tr('Could not delete destination.', 'تعذر حذف الوجهة.')
  } finally {
    deletingDestination.value = false
  }
}
onMounted(load)
</script>

<template>
  <section class="branch-detail">
    <header class="head">
      <h1>{{ tr('Edit Branch', 'تعديل الفرع') }}</h1>
      <div class="head-actions">
        <button class="secondary" type="button" @click="back">
          {{ tr('Back to Branches', 'العودة للفروع') }}</button
        ><button class="primary" type="button" :disabled="loading || saving" @click="saveBranch">
          {{ saving ? tr('Saving...', 'جارٍ الحفظ...') : tr('Save Changes', 'حفظ التغييرات') }}
        </button>
      </div>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <template v-if="!loading">
      <section class="panel info-panel">
        <h2>{{ tr('Branch Information', 'معلومات الفرع') }}</h2>
        <div class="fields">
          <label
            >{{ tr('Branch Name', 'اسم الفرع')
            }}<input v-model="branch.name" maxlength="255" required
          /></label>
        </div>
        <p v-if="branchError" class="error">{{ branchError }}</p>
      </section>
      <section class="panel destinations-panel">
        <h2>{{ tr('Branch Destinations', 'وجهات الفرع') }}</h2>
        <div class="toolbar" dir="ltr">
          <input
            v-model="search"
            type="search"
            :placeholder="tr('Search destinations...', 'البحث عن الوجهات...')"
            @input="page = 1"
          /><select v-model.number="perPage" @change="page = 1">
            <option v-for="n in [10, 25, 50, 100]" :key="n" :value="n">
              {{ n }} {{ tr('per page', 'لكل صفحة') }}
            </option></select
          ><button class="primary" type="button" @click="openDialog()">
            + {{ tr('New Destination', 'إضافة وجهة') }}
          </button>
        </div>
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
                <td>{{ row.destination_branch?.name || '—' }}</td>
                <td>{{ displayPrice(row.price) }}</td>
                <td class="actions">
                  <button type="button" @click="openDialog(row)">{{ tr('Edit', 'تعديل') }}</button
                  ><button type="button" class="danger" @click="requestDeleteDestination(row)">
                    {{ tr('Delete', 'حذف') }}
                  </button>
                </td>
              </tr>
              <tr v-if="!visible.length">
                <td colspan="4">{{ tr('No destinations found.', 'لا توجد وجهات.') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <nav class="pager" dir="ltr">
          <button :disabled="page <= 1" @click="page--">‹</button
          ><button
            v-for="n in totalPages"
            :key="n"
            :class="{ active: page === n }"
            @click="page = n"
          >
            {{ n }}</button
          ><button :disabled="page >= totalPages" @click="page++">›</button>
        </nav>
      </section>
    </template>
    <div
      v-if="destinationToDelete"
      class="backdrop"
      @click.self="cancelDeleteDestination"
      @keydown.esc="cancelDeleteDestination"
    >
      <section
        class="modal delete-confirmation"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="destination-delete-title"
        aria-describedby="destination-delete-description"
      >
        <h2 id="destination-delete-title">{{ tr('Delete Destination', 'حذف الوجهة') }}</h2>
        <p id="destination-delete-description">
          {{ tr('Delete destination', 'هل تريد حذف الوجهة') }} "{{
            destinationToDelete.destination_branch?.name ||
            destinationToDelete.destination_branch_id
          }}"? {{ tr('This cannot be undone.', 'لا يمكن التراجع عن الحذف.') }}
        </p>
        <div class="modal-actions">
          <button
            class="secondary"
            type="button"
            :disabled="deletingDestination"
            @click="cancelDeleteDestination"
          >
            {{ tr('Cancel', 'إلغاء') }}
          </button>
          <button
            class="confirm-delete"
            type="button"
            :disabled="deletingDestination"
            @click="deleteDestination"
          >
            {{ deletingDestination ? tr('Deleting...', 'جارٍ الحذف...') : tr('Delete', 'حذف') }}
          </button>
        </div>
      </section>
    </div>
    <div v-if="dialog" class="backdrop" @click.self="dialog = false">
      <form class="modal" @submit.prevent="saveDestination">
        <h2>
          {{
            editing ? tr('Edit Destination', 'تعديل الوجهة') : tr('New Destination', 'إضافة وجهة')
          }}
        </h2>
        <label
          >{{ tr('Destination Branch', 'الفرع الوجهة')
          }}<select v-model="destinationId" required>
            <option value="">{{ tr('Select branch', 'اختر فرعاً') }}</option>
            <option v-for="opt in options" :key="opt.id" :value="String(opt.id)">
              {{ opt.name }}
            </option>
          </select></label
        ><label
          >{{ tr('Price', 'السعر')
          }}<input v-model="price" type="number" min="0" max="9999999999.99" step="0.01" required
        /></label>
        <p v-if="destinationError" class="error">{{ destinationError }}</p>
        <div class="modal-actions">
          <button class="secondary" type="button" @click="dialog = false">
            {{ tr('Cancel', 'إلغاء') }}</button
          ><button class="primary" type="submit" :disabled="destinationSaving">
            {{ tr('Save', 'حفظ') }}
          </button>
        </div>
      </form>
    </div>
  </section>
</template>

<style scoped>
.branch-detail {
  padding: 16px 22px 50px;
  color: #102342;
}
.head {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  margin-bottom: 24px;
}
.head h1 {
  font-size: 28px;
  margin: 0;
}
.head-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}
.panel {
  border: 1px solid #dce4ed;
  border-radius: 14px;
  padding: 24px;
  margin: 18px 0;
  background: white;
}
.panel h2 {
  font-size: 19px;
  margin: 0 0 22px;
}
.fields {
  max-width: 720px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.fields label,
.modal label {
  font-size: 13px;
  font-weight: 600;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.fields input,
.fields textarea,
.toolbar input,
.toolbar select,
.modal input,
.modal select {
  border: 1px solid #cad7e6;
  border-radius: 9px;
  padding: 10px;
  font: inherit;
  background: #fff;
  color: #102342;
}
.primary {
  background: #609ec1;
  color: #fff;
  border: 0;
  border-radius: 25px;
  padding: 10px 20px;
  cursor: pointer;
}
.secondary {
  background: #fff;
  border: 1px solid #d1dce6;
  border-radius: 25px;
  padding: 10px 18px;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
.toolbar {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.toolbar input {
  justify-self: start;
  max-width: 320px;
  width: 100%;
  box-sizing: border-box;
}
.toolbar select {
  justify-self: center;
}
.toolbar .primary {
  justify-self: end;
}
.table-wrap {
  overflow: auto;
  border: 1px solid #dce4ed;
  border-radius: 12px;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  text-align: center;
  border-bottom: 1px solid #e7edf4;
  padding: 14px;
}
tr:last-child td {
  border-bottom: 0;
}
th {
  color: #8a9ab0;
  font-size: 12px;
}
.actions {
  white-space: nowrap;
}
.actions button {
  border: 0;
  background: none;
  color: #2679b1;
  cursor: pointer;
  margin: 0 7px;
}
.actions button.danger {
  color: #c43643;
}
.pager {
  display: flex;
  justify-content: center;
  gap: 7px;
  margin-top: 18px;
}
.pager button {
  border: 1px solid #e3e9f1;
  border-radius: 100%;
  background: #f5f7fa;
  height: 35px;
  width: 35px;
  cursor: pointer;
}
.pager button.active {
  background: #3983ef;
  color: white;
  border-color: #3983ef;
}
.backdrop {
  position: fixed;
  inset: 0;
  background: #0006;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal {
  width: min(440px, 92vw);
  border-radius: 15px;
  background: white;
  padding: 25px;
  display: flex;
  flex-direction: column;
  gap: 17px;
}
.modal h2 {
  margin: 0;
  font-size: 20px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.error {
  color: #be3546;
}
@media (max-width: 700px) {
  .fields,
  .toolbar {
    grid-template-columns: 1fr;
  }
  .toolbar input,
  .toolbar select,
  .toolbar .primary {
    justify-self: stretch;
    max-width: none;
  }
  .head {
    flex-wrap: wrap;
  }
}
</style>

<style scoped>
.delete-confirmation p {
  line-height: 1.65;
  color: #495b72;
  margin: 0;
}
.confirm-delete {
  border: 0;
  border-radius: 25px;
  background: #c43643;
  color: #fff;
  padding: 10px 22px;
  cursor: pointer;
}
.confirm-delete:disabled {
  opacity: 0.55;
  cursor: default;
}
</style>

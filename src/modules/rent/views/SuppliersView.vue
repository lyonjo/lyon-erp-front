<script setup>
import StandardTablePager from '@/modules/rent/components/StandardTablePager.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const { locale } = useI18n()
const language = computed(() => (locale.value === 'ar' ? 'ar' : 'en'))
const labels = {
  en: {
    title: 'Suppliers',
    suppliers: 'Suppliers',
    services: 'Services',
    addSupplier: '+ New Supplier',
    addService: '+ New Service',
    search: 'Search...',
    pageSize: 'per page',
    id: 'ID',
    name: 'Supplier Name',
    serviceName: 'Service Name',
    country: 'Country Code',
    phone: 'Phone Number',
    rep: 'Representative Name',
    repCountry: 'Representative Country Code',
    repPhone: 'Representative Phone',
    note: 'Note',
    linkedServices: 'Services',
    linkedCount: 'Suppliers',
    actions: 'Actions',
    view: 'View',
    edit: 'Edit',
    del: 'Delete',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...',
    back: 'Back',
    next: 'Next',
    loading: 'Loading...',
    empty: 'No records found',
    retry: 'Retry',
    selectServices: 'Select services',
    close: 'Close',
    createSupplier: 'Add Supplier',
    updateSupplier: 'Edit Supplier',
    supplierDetails: 'Supplier Details',
    createService: 'Add Service',
    updateService: 'Edit Service',
    deleteTitle: 'Delete record?',
    deleteMsg: 'Are you sure you want to delete this record? This action cannot be undone.',
    required: 'Name is required',
    error: 'Unable to load records',
    saveError: 'Could not save the record',
    deleteError: 'Could not delete the record',
    none: 'None',
    assigned: 'suppliers linked',
    selected: 'selected',
    serviceHint:
      'Choose one or more services. You can manage the available services in the Services tab.',
  },
  ar: {
    title: 'الموردون',
    suppliers: 'الموردون',
    services: 'الخدمات',
    addSupplier: '+ مورد جديد',
    addService: '+ خدمة جديدة',
    search: 'بحث...',
    pageSize: 'لكل صفحة',
    id: 'الرقم',
    name: 'اسم المورد',
    serviceName: 'اسم الخدمة',
    country: 'رمز الدولة',
    phone: 'رقم الهاتف',
    rep: 'اسم المندوب',
    repCountry: 'رمز دولة المندوب',
    repPhone: 'هاتف المندوب',
    note: 'ملاحظات',
    linkedServices: 'الخدمات',
    linkedCount: 'الموردون',
    actions: 'الإجراءات',
    view: 'عرض',
    edit: 'تعديل',
    del: 'حذف',
    cancel: 'إلغاء',
    save: 'حفظ',
    saving: 'جارٍ الحفظ...',
    back: 'السابق',
    next: 'التالي',
    loading: 'جارٍ التحميل...',
    empty: 'لا توجد سجلات',
    retry: 'إعادة المحاولة',
    selectServices: 'اختر الخدمات',
    close: 'إغلاق',
    createSupplier: 'إضافة مورد',
    updateSupplier: 'تعديل مورد',
    supplierDetails: 'تفاصيل المورد',
    createService: 'إضافة خدمة',
    updateService: 'تعديل خدمة',
    deleteTitle: 'حذف السجل؟',
    deleteMsg: 'هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء.',
    required: 'الاسم مطلوب',
    error: 'تعذر تحميل السجلات',
    saveError: 'تعذر حفظ السجل',
    deleteError: 'تعذر حذف السجل',
    none: 'لا يوجد',
    assigned: 'مورد مرتبط',
    selected: 'محدد',
    serviceHint: 'يمكنك اختيار أكثر من خدمة، وإدارة الخدمات من تبويب الخدمات.',
  },
}
const tr = (key) => labels[language.value][key] ?? key
const tab = ref('suppliers')
const search = ref('')
const page = ref(1)
const perPage = ref(50)
const rows = ref([])
const meta = ref({ current_page: 1, last_page: 1, total: 0 })
const loading = ref(false)
const error = ref('')
const serviceOptions = ref([])
const modal = ref('') // edit, view, delete
const current = ref(null)
const form = ref({})
const formError = ref('')
const fieldErrors = ref({})
const busy = ref(false)
let requestSequence = 0
let debounceTimer
const base = computed(() => (tab.value === 'suppliers' ? '/rent/suppliers' : '/rent/services'))
const blankSupplier = () => ({
  supplier_name: '',
  country_code: '',
  phone_number: '',
  representative_name: '',
  representative_country_code: '',
  representative_phone: '',
  note: '',
  service_ids: [],
})
const blankService = () => ({ name: '' })

async function load() {
  const sequence = ++requestSequence
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get(base.value, {
      params: { search: search.value, page: page.value, per_page: perPage.value },
    })
    if (sequence !== requestSequence) return
    rows.value = data.data ?? []
    meta.value = data.meta ?? { current_page: 1, last_page: 1, total: rows.value.length }
  } catch (e) {
    if (sequence !== requestSequence) return
    error.value = e.response?.data?.message || tr('error')
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}
async function fetchOptions() {
  try {
    const { data } = await api.get('/rent/services/options')
    serviceOptions.value = data.data ?? []
  } catch (e) {
    formError.value = e.response?.data?.message || tr('error')
  }
}
watch(tab, () => {
  search.value = ''
  page.value = 1
  load()
})
watch([page, perPage], () => load())
watch(search, () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
})
onMounted(load)

async function openModal(mode, item = null) {
  modal.value = mode
  current.value = item
  formError.value = ''
  fieldErrors.value = {}
  form.value = tab.value === 'suppliers' ? blankSupplier() : blankService()
  if (mode === 'delete' || !item) {
    if (mode === 'edit' && tab.value === 'suppliers') await fetchOptions()
    return
  }
  if (mode === 'view' || mode === 'edit') {
    busy.value = true
    try {
      const { data } = await api.get(`${base.value}/${item.id}`)
      const record = data.data
      current.value = record
      if (tab.value === 'suppliers') {
        form.value = {
          ...blankSupplier(),
          ...record,
          service_ids: (record.services ?? []).map((s) => s.id),
        }
        if (mode === 'edit') await fetchOptions()
      } else form.value = { name: record.name }
    } catch (e) {
      formError.value = e.response?.data?.message || tr('error')
    } finally {
      busy.value = false
    }
  }
}
function newRecord() {
  modal.value = 'edit'
  current.value = null
  formError.value = ''
  fieldErrors.value = {}
  form.value = tab.value === 'suppliers' ? blankSupplier() : blankService()
  if (tab.value === 'suppliers') fetchOptions()
}
function closeModal() {
  if (!busy.value) {
    modal.value = ''
    current.value = null
  }
}
function toggleService(id) {
  const ids = form.value.service_ids ?? []
  form.value.service_ids = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
}
async function submit() {
  if (busy.value) return
  formError.value = ''
  fieldErrors.value = {}
  busy.value = true
  const endpoint = current.value ? `${base.value}/${current.value.id}` : base.value
  const payload =
    tab.value === 'suppliers'
      ? {
          supplier_name: form.value.supplier_name,
          country_code: form.value.country_code || null,
          phone_number: form.value.phone_number || null,
          representative_name: form.value.representative_name || null,
          representative_country_code: form.value.representative_country_code || null,
          representative_phone: form.value.representative_phone || null,
          note: form.value.note || null,
          service_ids: form.value.service_ids ?? [],
        }
      : { name: form.value.name }
  try {
    if (current.value) await api.put(endpoint, payload)
    else await api.post(endpoint, payload)
    modal.value = ''
    current.value = null
    await load()
  } catch (e) {
    fieldErrors.value = e.response?.data?.errors ?? {}
    formError.value = e.response?.data?.message || tr('saveError')
  } finally {
    busy.value = false
  }
}
async function confirmDelete() {
  if (!current.value || busy.value) return
  busy.value = true
  formError.value = ''
  try {
    await api.delete(`${base.value}/${current.value.id}`)
    modal.value = ''
    current.value = null
    if (rows.value.length === 1 && page.value > 1) page.value--
    else await load()
  } catch (e) {
    formError.value = e.response?.data?.message || tr('deleteError')
  } finally {
    busy.value = false
  }
}
const detailFields = computed(() => [
  ['name', 'supplier_name'],
  ['country', 'country_code'],
  ['phone', 'phone_number'],
  ['rep', 'representative_name'],
  ['repCountry', 'representative_country_code'],
  ['repPhone', 'representative_phone'],
  ['note', 'note'],
])

function uiTableGoToPage(n) {
  if (n < 1 || n > Number(meta.last_page) || n === page.value) return
  page.value = n
}
</script>

<template>
  <div class="supplier-page">
    <h1>{{ tr('title') }}</h1>
    <section class="panel">
      <div class="tabs" role="tablist">
        <button type="button" :class="{ active: tab === 'suppliers' }" @click="tab = 'suppliers'">
          {{ tr('suppliers') }}
        </button>
        <button type="button" :class="{ active: tab === 'services' }" @click="tab = 'services'">
          {{ tr('services') }}
        </button>
      </div>
      <div class="toolbar ui-table-toolbar">
        <div class="filters">
          <input v-model="search" :placeholder="tr('search')" class="small-control" type="search" />
          <select v-model.number="perPage" class="small-control">
            <option v-for="n in [10, 15, 25, 50, 100]" :key="n" :value="n">
              {{ n }} {{ tr('pageSize') }}
            </option>
          </select>
        </div>
        <button type="button" class="primary" @click="newRecord">
          {{ tab === 'suppliers' ? tr('addSupplier') : tr('addService') }}
        </button>
      </div>
      <p v-if="error" class="error">
        {{ error }} <button type="button" @click="load">{{ tr('retry') }}</button>
      </p>
      <div class="table-wrap">
        <table class="ui-standardized-table">
          <thead>
            <tr v-if="tab === 'suppliers'">
              <th>{{ tr('id') }}</th>
              <th>{{ tr('name') }}</th>
              <th>{{ tr('phone') }}</th>
              <th>{{ tr('rep') }}</th>
              <th>{{ tr('repPhone') }}</th>
              <th>{{ tr('linkedServices') }}</th>
              <th>{{ tr('actions') }}</th>
            </tr>
            <tr v-else>
              <th>{{ tr('id') }}</th>
              <th>{{ tr('serviceName') }}</th>
              <th>{{ tr('linkedCount') }}</th>
              <th>{{ tr('actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td :colspan="tab === 'suppliers' ? 7 : 4" class="empty">
                <span class="spinner"></span> {{ tr('loading') }}
              </td>
            </tr>
            <tr v-else-if="!rows.length">
              <td :colspan="tab === 'suppliers' ? 7 : 4" class="empty">{{ tr('empty') }}</td>
            </tr>
            <template v-else>
              <tr v-for="item in rows" :key="item.id">
                <template v-if="tab === 'suppliers'">
                  <td>{{ item.id }}</td>
                  <td dir="auto">{{ item.supplier_name }}</td>
                  <td dir="ltr">
                    {{ [item.country_code, item.phone_number].filter(Boolean).join(' ') || '—' }}
                  </td>
                  <td dir="auto">{{ item.representative_name || '—' }}</td>
                  <td dir="ltr">
                    {{
                      [item.representative_country_code, item.representative_phone]
                        .filter(Boolean)
                        .join(' ') || '—'
                    }}
                  </td>
                  <td>
                    <div class="chips">
                      <span v-for="s in item.services" :key="s.id" class="chip">{{ s.name }}</span
                      ><span v-if="!item.services?.length">—</span>
                    </div>
                  </td>
                </template>
                <template v-else>
                  <td>{{ item.id }}</td>
                  <td dir="auto">{{ item.name }}</td>
                  <td>{{ item.suppliers_count ?? 0 }}</td>
                </template>
                <td>
                  <div class="actions">
                    <button type="button" @click="openModal('view', item)" :title="tr('view')">
                      <span>◉</span> {{ tr('view') }}
                    </button>
                    <button type="button" @click="openModal('edit', item)" :title="tr('edit')">
                      <span>✎</span> {{ tr('edit') }}
                    </button>
                    <button
                      type="button"
                      class="danger-link"
                      @click="openModal('delete', item)"
                      :title="tr('del')"
                    >
                      <span>▤</span> {{ tr('del') }}
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <div class="ui-legacy-pager pagination">
        <button type="button" :disabled="loading || page <= 1" @click="page--">
          {{ tr('back') }}
        </button>
        <span dir="ltr">{{ meta.current_page }} / {{ meta.last_page }} · {{ meta.total }}</span>
        <button type="button" :disabled="loading || page >= meta.last_page" @click="page++">
          {{ tr('next') }}
        </button>
      </div>
      <StandardTablePager
        :page="page"
        :last-page="meta.last_page"
        :disabled="loading"
        @change="uiTableGoToPage"
      />
    </section>

    <div v-if="modal" class="overlay" @click.self="closeModal" @keydown.esc="closeModal">
      <div class="dialog" role="dialog" aria-modal="true" :dir="language === 'ar' ? 'rtl' : 'ltr'">
        <button
          type="button"
          class="x"
          :disabled="busy"
          :aria-label="tr('close')"
          @click="closeModal"
        >
          ×
        </button>
        <h2>
          {{
            modal === 'delete'
              ? tr('deleteTitle')
              : modal === 'view'
                ? tab === 'suppliers'
                  ? tr('supplierDetails')
                  : tr('serviceName')
                : tab === 'suppliers'
                  ? current
                    ? tr('updateSupplier')
                    : tr('createSupplier')
                  : current
                    ? tr('updateService')
                    : tr('createService')
          }}
        </h2>
        <p v-if="formError" class="error">{{ formError }}</p>
        <div
          v-if="
            busy &&
            (modal === 'view' || modal === 'edit') &&
            current &&
            !form.supplier_name &&
            !form.name
          "
          class="empty"
        >
          <span class="spinner"></span> {{ tr('loading') }}
        </div>
        <template v-else-if="modal === 'delete'">
          <p class="confirm-message">{{ tr('deleteMsg') }}</p>
          <div class="dialog-buttons">
            <button type="button" class="outline" :disabled="busy" @click="closeModal">
              {{ tr('cancel') }}</button
            ><button type="button" class="danger" :disabled="busy" @click="confirmDelete">
              {{ busy ? tr('loading') : tr('del') }}
            </button>
          </div>
        </template>
        <template v-else-if="modal === 'view'">
          <div v-if="tab === 'suppliers'" class="details">
            <div v-for="[label, field] in detailFields" :key="field">
              <span>{{ tr(label) }}</span
              ><strong dir="auto">{{ current?.[field] || '—' }}</strong>
            </div>
            <div>
              <span>{{ tr('services') }}</span
              ><strong>{{ (current?.services ?? []).map((s) => s.name).join(', ') || '—' }}</strong>
            </div>
          </div>
          <div v-else class="details">
            <div>
              <span>{{ tr('serviceName') }}</span
              ><strong>{{ current?.name }}</strong>
            </div>
            <div>
              <span>{{ tr('linkedCount') }}</span
              ><strong>{{ current?.suppliers_count ?? 0 }}</strong>
            </div>
          </div>
          <button type="button" class="outline bottom" @click="closeModal">
            {{ tr('close') }}
          </button>
        </template>
        <form v-else @submit.prevent="submit">
          <template v-if="tab === 'suppliers'">
            <div class="field">
              <label>{{ tr('name') }} *</label
              ><input v-model.trim="form.supplier_name" maxlength="255" required /><small
                v-if="fieldErrors.supplier_name"
                >{{ fieldErrors.supplier_name[0] }}</small
              >
            </div>
            <div class="two">
              <div class="field">
                <label>{{ tr('country') }}</label
                ><input v-model.trim="form.country_code" maxlength="12" placeholder="+962" />
              </div>
              <div class="field">
                <label>{{ tr('phone') }}</label
                ><input v-model.trim="form.phone_number" maxlength="30" />
              </div>
            </div>
            <div class="field">
              <label>{{ tr('rep') }}</label
              ><input v-model.trim="form.representative_name" maxlength="255" />
            </div>
            <div class="two">
              <div class="field">
                <label>{{ tr('repCountry') }}</label
                ><input
                  v-model.trim="form.representative_country_code"
                  maxlength="12"
                  placeholder="+962"
                />
              </div>
              <div class="field">
                <label>{{ tr('repPhone') }}</label
                ><input v-model.trim="form.representative_phone" maxlength="30" />
              </div>
            </div>
            <div class="field">
              <label>{{ tr('note') }}</label
              ><textarea v-model="form.note" rows="3" maxlength="5000" />
            </div>
            <div class="field">
              <label>{{ tr('selectServices') }}</label>
              <p class="help">{{ tr('serviceHint') }}</p>
              <div class="service-choices">
                <label v-for="service in serviceOptions" :key="service.id" class="service-choice"
                  ><input
                    type="checkbox"
                    :checked="form.service_ids?.includes(service.id)"
                    @change="toggleService(service.id)"
                  /><span>{{ service.name }}</span></label
                ><span v-if="!serviceOptions.length">{{ tr('none') }}</span>
              </div>
              <small v-if="fieldErrors.service_ids">{{ fieldErrors.service_ids[0] }}</small>
            </div>
          </template>
          <div v-else class="field">
            <label>{{ tr('serviceName') }} *</label
            ><input v-model.trim="form.name" required maxlength="255" /><small
              v-if="fieldErrors.name"
              >{{ fieldErrors.name[0] }}</small
            >
          </div>
          <div class="dialog-buttons">
            <button type="button" class="outline" :disabled="busy" @click="closeModal">
              {{ tr('cancel') }}</button
            ><button type="submit" class="primary" :disabled="busy">
              {{ busy ? tr('saving') : tr('save') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.supplier-page {
  padding: 22px 28px 36px;
  color: #101c35;
  font-family: 'Segoe UI', Arial, sans-serif;
}
h1 {
  font-size: 27px;
  font-weight: 700;
  margin: 0 0 28px;
}
.panel {
  background: #fff;
  border: 1px solid #dce3eb;
  border-radius: 17px;
  box-shadow: 0 2px 6px #15253c0a;
  padding: 24px 32px;
}
.tabs {
  display: flex;
  justify-content: center;
  gap: 45px;
  margin: 0 0 34px;
  flex-wrap: wrap;
}
.tabs button {
  border: 0;
  background: transparent;
  font-size: 17px;
  font-weight: 600;
  color: #9aa6ba;
  cursor: pointer;
  padding: 8px 6px;
}
.tabs button.active {
  color: #101c35;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.small-control {
  box-sizing: border-box;
  height: 34px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px solid #cdd6e2;
  background: #fff;
  color: #354865;
  font: inherit;
  font-size: 13px;
  min-width: 135px;
}
.primary {
  background: #6fa1c1;
  border: 0;
  color: #fff;
  border-radius: 25px;
  padding: 11px 22px;
  cursor: pointer;
  font-weight: 600;
  box-shadow: 0 3px 7px #2033491c;
}
.primary:hover {
  background: #578fb4;
}
.table-wrap {
  width: 100%;
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  min-width: 730px;
  text-align: start;
  font-size: 13px;
}
th {
  color: #9ba6b8;
  font-weight: 500;
  font-size: 12px;
  padding: 13px 12px;
  border-block: 1px solid #dbe2e9;
  text-align: start;
}
td {
  padding: 15px 12px;
  border-bottom: 1px solid #e5e9ef;
  vertical-align: middle;
}
.empty {
  text-align: center !important;
  padding: 30px;
  color: #8996aa;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.chip {
  border-radius: 16px;
  padding: 4px 9px;
  background: #e8f2ff;
  color: #2771cf;
  font-size: 11px;
}
.actions {
  display: flex;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
}
.actions button {
  border: 0;
  background: none;
  color: #142642;
  cursor: pointer;
  padding: 2px;
  font-size: 12px;
}
.actions button:hover {
  text-decoration: underline;
}
.actions .danger-link {
  color: #b62129;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
  color: #65768e;
  font-size: 13px;
}
.pagination button,
.outline {
  background: #fff;
  border: 1px solid #d9e2ee;
  border-radius: 9px;
  padding: 9px 16px;
  color: #65768e;
  cursor: pointer;
}
.pagination button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: #15213785;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.dialog {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 18px 55px #0003;
  width: min(100%, 610px);
  max-height: 90vh;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 26px 32px;
  position: relative;
}
.dialog h2 {
  text-align: center;
  font-size: 20px;
  margin: 3px 25px 24px;
}
.x {
  position: absolute;
  inset-inline-end: 18px;
  top: 12px;
  font-size: 25px;
  border: 0;
  background: transparent;
  cursor: pointer;
  color: #334155;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 16px;
}
.field label {
  font-weight: 600;
  font-size: 13px;
}
.field input:not([type='checkbox']),
.field textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 40px;
  padding: 9px 12px;
  border: 1px solid #d2dce8;
  border-radius: 10px;
  background: #fff;
  color: #1b293c;
  font: inherit;
  font-size: 13px;
}
.field textarea {
  resize: vertical;
}
.field input:focus,
.field textarea:focus {
  outline: 2px solid #8bb9d833;
}
.field small,
.error {
  color: #c32929;
  font-size: 12px;
}
.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.dialog-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 22px;
}
.dialog-buttons .primary {
  min-width: 110px;
}
.danger {
  background: #d7333d;
  color: #fff;
  border: 0;
  border-radius: 25px;
  padding: 9px 20px;
  cursor: pointer;
}
.help {
  margin: 0;
  color: #8492a4;
  font-size: 12px;
}
.service-choices {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 13px;
  border: 1px solid #e2e9ef;
  border-radius: 10px;
  max-height: 190px;
  overflow: auto;
}
.service-choice {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  font-weight: 400 !important;
}
.service-choice input {
  accent-color: #609bc3;
}
.details {
  display: grid;
  gap: 11px;
}
.details > div {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  border-bottom: 1px solid #edf0f4;
  padding: 8px 0;
  font-size: 13px;
}
.details span {
  color: #7d8b9f;
}
.details strong {
  font-weight: 600;
  text-align: end;
}
.bottom {
  margin-top: 18px;
}
.confirm-message {
  text-align: center;
  color: #5b697a;
  font-size: 14px;
}
.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid #b0d1e5;
  border-top-color: #3976a5;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  vertical-align: middle;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 700px) {
  .supplier-page {
    padding: 16px;
  }
  .panel {
    padding: 15px;
  }
  .two {
    grid-template-columns: 1fr;
  }
  .service-choices {
    grid-template-columns: 1fr;
  }
  .dialog {
    padding: 22px 18px;
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

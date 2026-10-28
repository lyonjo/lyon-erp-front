<script setup>
import StandardTablePager from '@/modules/rent/components/StandardTablePager.vue'
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
import VehicleTabs from '../components/VehicleTabs.vue'
const route = useRoute(),
  router = useRouter(),
  { locale } = useI18n()
const ar = computed(() => locale.value === 'ar')
const text = (en, arabic) => (ar.value ? arabic : en)
const allowed = ['vehicles', 'brands', 'models', 'features']
const active = computed(() => (allowed.includes(route.query.tab) ? route.query.tab : 'vehicles'))
const rows = ref([]),
  brands = ref([]),
  loading = ref(false),
  error = ref(''),
  page = ref(1),
  perPage = ref(50),
  search = ref('')
const meta = ref({ current_page: 1, last_page: 1, total: 0 })
const showModal = ref(false),
  saving = ref(false),
  formError = ref(''),
  fieldErrors = ref({}),
  editingId = ref(null)
const entry = ref({ name: '', brand_id: '', image: null })
const fileInput = ref(null)
let requestSerial = 0,
  searchTimer
function startModal(row = null) {
  editingId.value = row?.id ?? null
  entry.value = { name: row?.name ?? '', brand_id: row?.brand_id ?? '', image: null }
  fieldErrors.value = {}
  formError.value = ''
  showModal.value = true
}
function errorText(e) {
  return e.response?.data?.message || text('Request failed', 'فشل الطلب')
}
async function loadBrands() {
  try {
    const { data } = await api.get('/rent/vehicle-catalog/brands')
    brands.value = data.data ?? []
  } catch {
    brands.value = []
  }
}
async function load() {
  const id = ++requestSerial
  loading.value = true
  error.value = ''
  try {
    const kind = active.value
    if (kind === 'vehicles') {
      const { data } = await api.get('/rent/vehicles', {
        params: { page: page.value, per_page: perPage.value, search: search.value },
      })
      if (id !== requestSerial) return
      rows.value = data.data ?? []
      meta.value = data.meta ?? meta.value
    } else {
      const { data } = await api.get(`/rent/vehicle-catalog/${kind}`, {
        params: { search: search.value },
      })
      if (id !== requestSerial) return
      rows.value = data.data ?? []
      meta.value = { current_page: 1, last_page: 1, total: rows.value.length }
    }
  } catch (e) {
    if (id === requestSerial) error.value = errorText(e)
  } finally {
    if (id === requestSerial) loading.value = false
  }
}
watch([active, perPage], () => {
  page.value = 1
  search.value = ''
  load()
})
watch(page, load)
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 350)
})
onMounted(() => {
  loadBrands()
  load()
})
const title = computed(
  () =>
    ({
      vehicles: text('Vehicles', 'المركبات'),
      brands: text('Vehicle Brands', 'ماركات المركبات'),
      models: text('Vehicle Models', 'موديلات المركبات'),
      features: text('Extra Features', 'الميزات الإضافية'),
    })[active.value],
)
const addLabel = computed(
  () =>
    ({
      vehicles: text('+ New Vehicle', '+ مركبة جديدة'),
      brands: text('+ New Brand', '+ ماركة جديدة'),
      models: text('+ New Model', '+ موديل جديد'),
      features: text('+ New Feature', '+ ميزة جديدة'),
    })[active.value],
)
function add() {
  if (active.value === 'vehicles') router.push('/rent/cars/create')
  else startModal()
}
async function save() {
  saving.value = true
  formError.value = ''
  fieldErrors.value = {}
  try {
    const kind = active.value,
      id = editingId.value,
      endpoint = `/rent/vehicle-catalog/${kind}${id ? '/' + id : ''}`
    let body = { name: entry.value.name }
    let headers = {}
    if (kind === 'models') body.brand_id = entry.value.brand_id
    if (kind === 'features' && entry.value.image) {
      const fd = new FormData()
      fd.append('name', body.name)
      fd.append('image', entry.value.image)
      body = fd
      headers = { 'Content-Type': 'multipart/form-data' }
    }
    // Multipart method spoofing: Laravel parses file uploads on POST.
    if (id && body instanceof FormData) {
      body.append('_method', 'PUT')
      await api.post(endpoint, body, { headers })
    } else if (id) await api.put(endpoint, body)
    else await api.post(endpoint, body, { headers })
    showModal.value = false
    await load()
    if (kind === 'brands') await loadBrands()
  } catch (e) {
    fieldErrors.value = e.response?.data?.errors ?? {}
    formError.value = errorText(e)
  } finally {
    saving.value = false
  }
}
async function remove(row) {
  if (
    !window.confirm(
      text(`Delete ${row.name || row.number}?`, `هل تريد حذف ${row.name || row.number}؟`),
    )
  )
    return
  try {
    if (active.value === 'vehicles') await api.delete(`/rent/vehicles/${row.id}`)
    else await api.delete(`/rent/vehicle-catalog/${active.value}/${row.id}`)
    await load()
    if (active.value === 'brands') await loadBrands()
  } catch (e) {
    window.alert(errorText(e))
  }
}
function edit(row) {
  if (active.value === 'vehicles') router.push(`/rent/cars/${row.id}/edit`)
  else startModal(row)
}
const featureImg = ref({})
async function featurePreview(id) {
  if (featureImg.value[id]) return
  try {
    const { data } = await api.get(`/rent/vehicle-features/${id}/image`, { responseType: 'blob' })
    featureImg.value[id] = URL.createObjectURL(data)
  } catch {}
}
watch(rows, (items) => {
  if (active.value === 'features')
    items.forEach((x) => {
      if (x.image) featurePreview(x.id)
    })
})
import { onBeforeUnmount } from 'vue'
onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  requestSerial++
  Object.values(featureImg.value).forEach((u) => URL.revokeObjectURL(u))
})

function uiTableGoToPage(n) {
  if (n < 1 || n > Number(meta.last_page) || n === page.value) return
  page.value = n
}
</script>
<template>
  <main class="vehicles-page">
    <h1>{{ text('Vehicles', 'المركبات') }}</h1>
    <section class="content-card">
      <VehicleTabs :active="active" />
      <div class="tools ui-table-toolbar">
        <input
          v-if="
            active === 'vehicles' ||
            active === 'brands' ||
            active === 'models' ||
            active === 'features'
          "
          v-model="search"
          class="search"
          :placeholder="text('Search', 'بحث')"
        />
        <div class="tool-right">
          <select v-if="active === 'vehicles'" v-model.number="perPage" class="page-size">
            <option v-for="n in [10, 15, 25, 50, 100]" :key="n" :value="n">
              {{ n }} {{ text('per page', 'لكل صفحة') }}
            </option></select
          ><button class="blue" @click="add">{{ addLabel }}</button>
        </div>
      </div>
      <p v-if="error" class="message error">
        {{ error }} <button @click="load">{{ text('Retry', 'إعادة المحاولة') }}</button>
      </p>
      <p v-if="loading" class="message">{{ text('Loading...', 'جارٍ التحميل...') }}</p>
      <div v-if="active === 'vehicles'" class="table-scroll">
        <table class="ui-standardized-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{{ text('Vehicle Number', 'رقم المركبة') }}</th>
              <th>{{ text('Car Brand', 'الماركة') }}</th>
              <th>{{ text('Car Name', 'الموديل') }}</th>
              <th>{{ text('Model Year', 'سنة الصنع') }}</th>
              <th>{{ text('Active', 'نشطة') }}</th>
              <th>{{ text('Action', 'الإجراءات') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in rows" :key="v.id">
              <td>{{ v.id }}</td>
              <td dir="ltr">{{ v.number }}</td>
              <td>{{ v.brand?.name || '—' }}</td>
              <td>{{ v.model?.name || '—' }}</td>
              <td>{{ v.model_year }}</td>
              <td>{{ v.status ? text('Yes', 'نعم') : text('No', 'لا') }}</td>
              <td class="actions">
                <button @click="router.push(`/rent/cars/${v.id}`)">
                  ◉ {{ text('View', 'عرض') }}</button
                ><button @click="edit(v)">✎ {{ text('Edit', 'تعديل') }}</button
                ><button @click="remove(v)">{{ text('Delete', 'حذف') }}</button>
              </td>
            </tr>
            <tr v-if="!loading && !rows.length">
              <td colspan="7">{{ text('No vehicles found', 'لا توجد مركبات') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="cards" :class="{ models: active === 'models' }">
        <article v-for="item in rows" :key="item.id" class="item-card">
          <template v-if="active === 'models'"
            ><div class="brand-note">
              {{ text('Brand', 'الماركة') }}: {{ item.brand?.name || '—' }}
            </div></template
          >
          <template v-if="active === 'features'"
            ><img
              v-if="featureImg[item.id]"
              :src="featureImg[item.id]"
              class="feature-img"
              alt=""
            />
            <div v-else class="feature-icon">◈</div></template
          >
          <h3>{{ item.name }}</h3>
          <div class="card-actions">
            <button class="blue" @click="edit(item)">✎ {{ text('Edit', 'تعديل') }}</button
            ><button class="delete" @click="remove(item)">{{ text('Delete', 'حذف') }}</button>
          </div>
        </article>
        <p v-if="!loading && !rows.length" class="message">
          {{ text('No records found', 'لا توجد سجلات') }}
        </p>
      </div>
      <div v-if="active === 'vehicles'" class="ui-legacy-pager pager">
        <button :disabled="page <= 1 || loading" @click="page--">
          {{ text('Previous', 'السابق') }}</button
        ><span dir="ltr">{{ meta.current_page }} / {{ meta.last_page }} · {{ meta.total }}</span
        ><button :disabled="page >= meta.last_page || loading" @click="page++">
          {{ text('Next', 'التالي') }}
        </button>
      </div>
      <StandardTablePager
        v-if="active === 'vehicles'"
        :page="page"
        :last-page="meta.last_page"
        :disabled="loading"
        @change="uiTableGoToPage"
      />
    </section>
    <div v-if="showModal" class="overlay" @click.self="showModal = false">
      <form class="modal" @submit.prevent="save">
        <button type="button" class="close" @click="showModal = false">×</button>
        <h2>{{ editingId ? text('Edit', 'تعديل') : text('Add New', 'إضافة') }} {{ title }}</h2>
        <label
          >{{ text('Name', 'الاسم')
          }}<input
            v-model.trim="entry.name"
            required
            maxlength="150"
            :placeholder="text('Enter name', 'أدخل الاسم')" /></label
        ><small v-if="fieldErrors.name" class="error">{{ fieldErrors.name[0] }}</small>
        <label v-if="active === 'models'"
          >{{ text('Brand', 'الماركة')
          }}<select v-model="entry.brand_id" required>
            <option value="" disabled>{{ text('Select Brand', 'اختر الماركة') }}</option>
            <option v-for="b in brands" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select></label
        >
        <small v-if="fieldErrors.brand_id" class="error">{{ fieldErrors.brand_id[0] }}</small>
        <label v-if="active === 'features'"
          >{{ text('Feature Image (optional)', 'صورة الميزة (اختياري)')
          }}<input
            ref="fileInput"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            @change="entry.image = $event.target.files?.[0] || null"
        /></label>
        <p v-if="formError" class="error">{{ formError }}</p>
        <button type="submit" :disabled="saving" class="blue submit">
          {{ saving ? text('Saving...', 'جارٍ الحفظ...') : text('Save', 'حفظ') }}
        </button>
      </form>
    </div>
  </main>
</template>
<style scoped>
.vehicles-page {
  padding: 16px 22px 50px;
  font-family: 'Segoe UI', Arial, sans-serif;
  color: #101d32;
}
.vehicles-page h1 {
  margin: 0 0 55px;
  font-size: 29px;
}
.content-card {
  border: 1px solid #d8e0e9;
  border-radius: 17px;
  box-shadow: 0 2px 5px #12212c15;
  padding: 8px 38px 34px;
  min-height: 365px;
}
.tools {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}
.tool-right {
  display: flex;
  align-items: center;
  gap: 14px;
}
.search,
.page-size,
.modal input,
.modal select {
  border: 1px solid #ced7e4;
  border-radius: 9px;
  background: white;
  padding: 10px 12px;
  color: #15213c;
  font: inherit;
}
.search {
  width: 205px;
}
.blue {
  border: 0;
  border-radius: 25px;
  background: #70a1c0;
  color: white;
  font-weight: 650;
  padding: 11px 22px;
  cursor: pointer;
  box-shadow: 0 3px 7px #10213422;
}
.blue:hover {
  background: #578eaf;
}
.table-scroll {
  overflow: auto;
}
table {
  border-collapse: collapse;
  width: 100%;
  min-width: 750px;
  font-size: 14px;
}
th,
td {
  padding: 18px 15px;
  text-align: start;
  border-bottom: 1px solid #dbe2eb;
}
th {
  font-size: 12px;
  color: #9ba6ba;
  font-weight: 500;
}
td:last-child {
  text-align: center;
}
.actions {
  white-space: nowrap;
}
.actions button {
  border: 0;
  background: none;
  color: #14233b;
  cursor: pointer;
  padding: 5px;
}
.actions button:hover {
  color: #4a91bd;
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 22px;
  padding: 22px 0 0;
}
.item-card {
  background: linear-gradient(#fff, #f4f5f7);
  border-radius: 14px;
  min-height: 150px;
  padding: 20px 15px;
  text-align: center;
  box-shadow: 0 3px 7px #132a3b1f;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 22px;
}
.item-card h3 {
  margin: auto 0;
  font-size: 19px;
}
.brand-note {
  text-align: start;
  color: #8494b0;
  font-size: 13px;
}
.card-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}
.delete {
  border: 0;
  background: transparent;
  cursor: pointer;
  color: #ae4550;
}
.feature-img {
  width: 62px;
  height: 62px;
  object-fit: contain;
  align-self: center;
}
.feature-icon {
  font-size: 44px;
  color: #899aaa;
}
.pager {
  display: flex;
  gap: 14px;
  justify-content: center;
  align-items: center;
  margin-top: 22px;
}
.pager button {
  background: white;
  border: 1px solid #e4e9ee;
  border-radius: 8px;
  padding: 9px 15px;
  cursor: pointer;
}
.pager button:disabled {
  opacity: 0.4;
}
.message {
  text-align: center;
  color: #8794ac;
  padding: 20px;
}
.error {
  color: #c33b3b;
}
.overlay {
  position: fixed;
  inset: 0;
  background: #0007;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 15px;
  z-index: 500;
}
.modal {
  background: white;
  width: min(450px, 100%);
  padding: 32px 40px 25px;
  border-radius: 17px;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.modal h2 {
  text-align: center;
  margin: 13px 0 15px;
  font-size: 19px;
}
.modal label {
  display: flex;
  flex-direction: column;
  gap: 9px;
  font-weight: 600;
  font-size: 13px;
}
.modal .close {
  position: absolute;
  top: 12px;
  inset-inline-end: 15px;
  border: 0;
  background: none;
  font-size: 25px;
  cursor: pointer;
}
.submit {
  width: 100%;
}
@media (max-width: 700px) {
  .content-card {
    padding: 10px 12px;
  }
  .vehicles-page {
    padding: 15px 10px;
  }
  .vehicles-page h1 {
    margin-bottom: 20px;
  }
  .tools {
    margin-bottom: 15px;
  }
  .modal {
    padding: 28px 18px;
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

.ui-table-toolbar > .tool-right {
  grid-column: 2 / 4;
  grid-row: 1;
  display: contents !important;
}
.ui-table-toolbar > .tool-right select {
  grid-column: 2;
  grid-row: 1;
  justify-self: center;
  margin: auto !important;
}
.ui-table-toolbar > .tool-right button {
  grid-column: 3;
  grid-row: 1;
  justify-self: end !important;
}
</style>

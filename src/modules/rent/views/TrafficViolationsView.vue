<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
const router = useRouter()
const { locale } = useI18n()
const tr = (en, ar) => (locale.value === 'ar' ? ar : en)
const rows = ref([])
const meta = ref({ total: 0, last_page: 1 })
const search = ref('')
const page = ref(1)
const perPage = ref(15)
const loading = ref(false)
const error = ref('')
const deleteTarget = ref(null)
const deleting = ref(false)
let searchTimer
async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/rent/traffic-violations', {
      params: { search: search.value, page: page.value, per_page: perPage.value },
    })
    rows.value = data.data || []
    meta.value = data.meta || { total: data.total || 0, last_page: data.last_page || 1 }
  } catch (e) {
    error.value =
      e.response?.data?.message || tr('Failed to load violations', 'تعذر تحميل المخالفات')
  } finally {
    loading.value = false
  }
}
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
})
watch(perPage, () => {
  page.value = 1
  load()
})
async function deleteRecord() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await api.delete(`/rent/traffic-violations/${deleteTarget.value.id}`)
    deleteTarget.value = null
    await load()
  } catch (e) {
    error.value = e.response?.data?.message || tr('Deletion failed', 'فشل الحذف')
  } finally {
    deleting.value = false
  }
}
function navigate(path) {
  router.push(path)
}
function nextPage() {
  if (page.value < meta.value.last_page) {
    page.value++
    load()
  }
}
function previousPage() {
  if (page.value > 1) {
    page.value--
    load()
  }
}
onMounted(load)
</script>

<template>
  <section class="tv-page">
    <header class="tv-titlebar">
      <h2>{{ tr('Traffic Violations', 'المخالفات المرورية') }}</h2>
      <button class="tv-primary" type="button" @click="navigate('/rent/traffic-violations/create')">
        + {{ tr('New Traffic Violation', 'مخالفة مرورية جديدة') }}
      </button>
    </header>
    <div class="tv-card">
      <div class="tv-toolbar">
        <input v-model="search" class="tv-control" :placeholder="tr('Search...', 'بحث...')" />
        <select v-model.number="perPage" class="tv-control">
          <option :value="15">15</option>
          <option :value="30">30</option>
          <option :value="50">50</option>
        </select>
      </div>
      <p v-if="error" class="tv-error">{{ error }}</p>
      <div class="tv-scroll">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>{{ tr('Violation No.', 'رقم المخالفة') }}</th>
              <th>{{ tr('Plate No.', 'رقم المركبة') }}</th>
              <th>{{ tr('On', 'على') }}</th>
              <th>{{ tr('Customer / Driver', 'العميل / السائق') }}</th>
              <th>{{ tr('Violation Value', 'قيمة المخالفة') }}</th>
              <th>{{ tr('Actions', 'الإجراءات') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="tv-center">{{ tr('Loading...', 'جاري التحميل...') }}</td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="7" class="tv-center">
                {{ tr('No violations found', 'لا توجد مخالفات') }}
              </td>
            </tr>
            <tr v-for="v in rows" :key="v.id">
              <td>{{ v.id }}</td>
              <td>{{ v.violation_no }}</td>
              <td>{{ v.car_number || '—' }}</td>
              <td>{{ tr('Customer', 'العميل') }}</td>
              <td>{{ v.customer_name || '—' }}</td>
              <td>{{ v.violation_value }}</td>
              <td class="tv-actions">
                <button type="button" @click="navigate(`/rent/traffic-violations/${v.id}/view`)">
                  ◉ {{ tr('View', 'عرض') }}
                </button>
                <button type="button" @click="navigate(`/rent/traffic-violations/${v.id}/edit`)">
                  ✎ {{ tr('Edit', 'تعديل') }}
                </button>
                <button type="button" class="tv-danger-text" @click="deleteTarget = v">
                  ▤ {{ tr('Delete', 'حذف') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="tv-footer">
        <span>{{ meta.total }} {{ tr('records', 'سجل') }}</span>
        <div>
          <button :disabled="page <= 1" @click="previousPage">
            {{ tr('Previous', 'السابق') }}
          </button>
          {{ page }} / {{ meta.last_page }}
          <button :disabled="page >= meta.last_page" @click="nextPage">
            {{ tr('Next', 'التالي') }}
          </button>
        </div>
      </div>
    </div>
    <div v-if="deleteTarget" class="tv-overlay" @click.self="deleteTarget = null">
      <div class="tv-modal">
        <h3>{{ tr('Delete violation?', 'حذف المخالفة؟') }}</h3>
        <p>
          {{
            tr(
              'This permanently deletes the record and its image.',
              'سيتم حذف السجل وصورته نهائياً.',
            )
          }}
        </p>
        <div class="tv-modalactions">
          <button @click="deleteTarget = null">{{ tr('Cancel', 'إلغاء') }}</button
          ><button class="tv-danger" :disabled="deleting" @click="deleteRecord">
            {{ tr('Delete', 'حذف') }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
<style scoped>
.tv-page {
  padding: 16px;
  color: #0a2146;
}
.tv-titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 38px;
}
.tv-titlebar h2 {
  font-size: 24px;
  margin: 0;
}
.tv-primary {
  background: #5e9ec6;
  border: none;
  border-radius: 25px;
  padding: 10px 20px;
  color: white;
  cursor: pointer;
  font-weight: 600;
}
.tv-card {
  border: 1px solid #d5dfed;
  border-radius: 14px;
  background: white;
  overflow: hidden;
}
.tv-toolbar {
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
}
.tv-control {
  height: 34px;
  border: 1px solid #d5dfed;
  border-radius: 7px;
  padding: 5px 12px;
  background: white;
  color: #0a2146;
}
.tv-scroll {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  text-align: start;
}
th {
  color: #9ba8bf;
  font-size: 12px;
  font-weight: 500;
}
td,
th {
  padding: 14px 15px;
  border-top: 1px solid #d9e1eb;
  text-align: start;
  white-space: nowrap;
}
td {
  font-size: 13px;
}
.tv-center {
  text-align: center;
  padding: 30px;
}
.tv-actions {
  white-space: nowrap;
}
.tv-actions button {
  background: none;
  border: 0;
  cursor: pointer;
  color: #0a2146;
  font-size: 12px;
  margin-inline-end: 12px;
}
.tv-actions .tv-danger-text {
  color: #dc2626;
}
.tv-footer {
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  color: #8091b0;
  font-size: 12px;
}
.tv-footer button {
  background: white;
  border: 1px solid #d5dfed;
  border-radius: 6px;
  padding: 6px;
  cursor: pointer;
}
.tv-error {
  color: #b91c1c;
  padding: 10px;
}
.tv-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  background: #0007;
}
.tv-modal {
  background: white;
  padding: 26px;
  border-radius: 16px;
  width: min(440px, 95vw);
}
.tv-modalactions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.tv-modalactions button {
  border-radius: 18px;
  padding: 8px 16px;
  cursor: pointer;
  border: 1px solid #ddd;
}
.tv-danger {
  background: #dc2626;
  color: white;
  border: 0 !important;
}
</style>

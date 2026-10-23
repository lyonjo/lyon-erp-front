<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
const router = useRouter(),
  { locale } = useI18n(),
  tr = (en, ar) => (locale.value === 'ar' ? ar : en)
const rows = ref([]),
  search = ref(''),
  page = ref(1),
  perPage = ref(15),
  meta = ref({ last_page: 1, total: 0 }),
  loading = ref(false),
  error = ref('')
let timer
async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/rent/car-reservations/cars', {
      params: { search: search.value, page: page.value, per_page: perPage.value },
    })
    rows.value = data.data || []
    meta.value = { last_page: data.last_page || 1, total: data.total || 0 }
  } catch (e) {
    error.value = e.response?.data?.message || tr('Could not load vehicles', 'تعذر تحميل المركبات')
  } finally {
    loading.value = false
  }
}
watch([search, perPage], () => {
  page.value = 1
  clearTimeout(timer)
  timer = setTimeout(load, 250)
})
watch(page, load)
onMounted(load)
</script>
<template>
  <section class="rv-page" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <header>
      <h2>{{ tr('Reservation Cars', 'حجوزات السيارات') }}</h2>
      <button class="primary" @click="router.push('/rent/booking/create')">
        + {{ tr('New Booking', 'حجز جديد') }}
      </button>
    </header>
    <div class="tools">
      <input
        v-model="search"
        :placeholder="
          tr('Search by vehicle number, brand or model', 'ابحث برقم السيارة أو الماركة أو الموديل')
        "
      /><select v-model.number="perPage">
        <option :value="10">10</option>
        <option :value="15">15</option>
        <option :value="25">25</option>
        <option :value="50">50</option>
      </select>
    </div>
    <div v-if="error" class="error">
      {{ error }} <button @click="load">{{ tr('Retry', 'إعادة المحاولة') }}</button>
    </div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>{{ tr('Vehicle No.', 'رقم السيارة') }}</th>
            <th>{{ tr('Vehicle Category', 'ماركة السيارة') }}</th>
            <th>{{ tr('Vehicle Type', 'نوع السيارة') }}</th>
            <th>{{ tr('Vehicle Model', 'سنة الموديل') }}</th>
            <th>{{ tr('Action', 'الإجراء') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="empty">{{ tr('Loading...', 'جاري التحميل...') }}</td>
          </tr>
          <template v-else
            ><tr v-for="car in rows" :key="car.id">
              <td>{{ car.number }}</td>
              <td>{{ car.brand?.name }}</td>
              <td>{{ car.model?.name }}</td>
              <td>{{ car.model_year }}</td>
              <td>
                <button class="action" @click="router.push(`/rent/car-rentered/${car.id}`)">
                  ◉ {{ tr('View', 'عرض') }}
                </button>
                <button class="action" @click="router.push(`/rent/car-rentered/${car.id}`)">
                  ✎ {{ tr('Edit', 'تعديل') }}
                </button>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="5" class="empty">{{ tr('No vehicles found', 'لا توجد مركبات') }}</td>
            </tr></template
          >
        </tbody>
      </table>
    </div>
    <footer>
      <span>{{ meta.total }} {{ tr('records', 'سجل') }}</span>
      <div>
        <button :disabled="page <= 1" @click="page--">‹</button> {{ page }} / {{ meta.last_page }}
        <button :disabled="page >= meta.last_page" @click="page++">›</button>
      </div>
    </footer>
  </section>
</template>
<style scoped>
.rv-page {
  padding: 17px 20px;
  color: #102846;
}
.rv-page header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.rv-page h2 {
  font-size: 25px;
}
.primary {
  border: 0;
  border-radius: 22px;
  background: #6da2c3;
  color: white;
  padding: 10px 23px;
  cursor: pointer;
}
.tools {
  display: flex;
  justify-content: space-between;
  margin: 22px 0;
  gap: 15px;
}
.tools input,
.tools select {
  height: 32px;
  border: 1px solid #d9e1eb;
  border-radius: 8px;
  padding: 0 12px;
  color: #102846;
  background: #fff;
}
.tools input {
  min-width: min(280px, 65vw);
}
.table-scroll {
  border: 1px solid #dce3ea;
  border-radius: 11px;
  overflow: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th,
td {
  padding: 15px 12px;
  border-bottom: 1px solid #e4e8ed;
  text-align: start;
}
th {
  color: #8796ab;
  font-weight: 500;
}
.action {
  background: none;
  border: 0;
  color: #122e4e;
  cursor: pointer;
  margin-inline: 5px;
}
.action:hover {
  text-decoration: underline;
}
footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 15px;
  color: #677b94;
}
footer button {
  background: white;
  border: 1px solid #dce3ea;
  border-radius: 7px;
  padding: 5px 13px;
  cursor: pointer;
}
footer button:disabled {
  opacity: 0.4;
}
.error {
  padding: 14px;
  color: #bd2439;
}
.empty {
  text-align: center;
  padding: 35px;
  color: #7a8798;
}
</style>

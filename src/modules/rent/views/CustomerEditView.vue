<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api'
import CustomerForm from '../components/CustomerForm.vue'

const route = useRoute()
const router = useRouter()
const id = route.params.id

const customer = ref(null)
const loading = ref(true)
const loadError = ref('')

const saving = ref(false)
const errors = ref({})
const banner = ref('')

onMounted(async () => {
  try {
    const { data } = await api.get(`/rent/customers/${id}`)
    customer.value = data.data
  } catch (e) {
    loadError.value =
      e.response?.status === 404 ? 'Customer not found.' : 'Could not load this customer.'
  } finally {
    loading.value = false
  }
})

async function save(fd) {
  saving.value = true
  errors.value = {}
  banner.value = ''
  fd.append('_method', 'PUT') // multipart + PUT: send POST and let Laravel spoof the method
  try {
    await api.post(`/rent/customers/${id}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    router.push(`/rent/customers/${id}`)
  } catch (e) {
    if (e.response?.status === 422) {
      errors.value = e.response.data.errors ?? {}
      banner.value = 'Please fix the highlighted fields.'
    } else {
      banner.value = e.response?.data?.message || 'Something went wrong. Please try again.'
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <p v-if="loading" class="state">Loading…</p>
  <div v-else-if="loadError" class="state">
    <p>{{ loadError }}</p>
    <button type="button" @click="router.push('/rent/customers')">← Customers</button>
  </div>
  <CustomerForm
    v-else
    mode="edit"
    :customer="customer"
    :saving="saving"
    :errors="errors"
    :banner="banner"
    @submit="save"
  />
</template>

<style scoped>
.state {
  padding: 40px;
  text-align: center;
  color: #6b7280;
}
.state button {
  margin-top: 8px;
  background: none;
  border: 0;
  color: #4f93b8;
  cursor: pointer;
  font-size: 14px;
}
</style>

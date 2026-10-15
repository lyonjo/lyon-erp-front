<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/api'
import CustomerCompanyForm from '../components/CustomerCompanyForm.vue'
import { useCustomerCompany } from '@/composables/useCustomerCompany'

const router = useRouter()
const route = useRoute()
const { company, loading, error, fetchCustomerCompany } = useCustomerCompany()

const saving = ref(false)
const errors = ref({})
const banner = ref('')

onMounted(() => fetchCustomerCompany(route.params.id))

// Watch for route changes (when navigating to same route with different ID)
watch(
  () => route.params.id,
  (newId) => {
    if (newId) fetchCustomerCompany(newId)
  },
)

async function save(fd) {
  saving.value = true
  errors.value = {}
  banner.value = ''
  try {
    await api.post(`/rent/customer-companies/${route.params.id}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { _method: 'PUT' },
    })
    router.push('/rent/customer-companies')
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
  <CustomerCompanyForm
    v-if="!loading && company"
    mode="edit"
    :company="company"
    :saving="saving"
    :errors="errors"
    :banner="banner"
    @submit="save"
  />
  <div v-else-if="loading" class="loading">Loading...</div>
  <div v-else class="error">
    <p>{{ error || 'Failed to load company.' }}</p>
    <button type="button" @click="fetchCustomerCompany(route.params.id)">Try again</button>
  </div>
</template>

<style scoped>
.loading,
.error {
  padding: 40px;
  text-align: center;
  color: #6b7280;
}
.error {
  color: #dc2626;
}
</style>

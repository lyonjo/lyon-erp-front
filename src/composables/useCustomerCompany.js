import { ref } from 'vue'
import api from '@/api'

export function useCustomerCompany() {
  const company = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function fetchCustomerCompany(id) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get(`/rent/customer-companies/${id}`)
      company.value = data
    } catch (e) {
      error.value = e.response?.data?.message || 'Failed to load company'
      throw e
    } finally {
      loading.value = false
    }
  }

  return { company, loading, error, fetchCustomerCompany }
}

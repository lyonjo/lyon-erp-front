import { ref, onScopeDispose } from 'vue'
import api from '@/api'

export function useCustomerCompany() {
  const company = ref(null)
  const loading = ref(false)
  const error = ref(null)

  let controller = null
  let requestId = 0
  let disposed = false

  async function fetchCustomerCompany(id) {
    if (disposed) return

    controller?.abort()

    const currentId = ++requestId
    const currentController = new AbortController()
    controller = currentController

    loading.value = true
    error.value = null
    company.value = null

    try {
      const { data } = await api.get(`/rent/customer-companies/${encodeURIComponent(id)}`, {
        signal: currentController.signal,
      })

      if (currentId !== requestId || currentController.signal.aborted) return

      company.value = data.data
    } catch (e) {
      if (currentId !== requestId || currentController.signal.aborted) return

      if (e.response?.status === 404) {
        error.value = 'Company not found.'
      } else {
        error.value = e.response?.data?.message || 'Failed to load company. Please try again.'
      }
    } finally {
      if (currentId === requestId && !disposed) {
        loading.value = false
        controller = null
      }
    }
  }

  onScopeDispose(() => {
    disposed = true
    controller?.abort()
    requestId++
  })

  return {
    company,
    loading,
    error,
    fetchCustomerCompany,
  }
}

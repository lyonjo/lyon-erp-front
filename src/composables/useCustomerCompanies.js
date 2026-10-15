import { ref, watch, onScopeDispose } from 'vue'
import api from '@/api'

export function useCustomerCompanies() {
  const rows = ref([])
  const meta = ref({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 50,
  })

  const search = ref('')
  const page = ref(1)
  const perPage = ref(50)
  const loading = ref(false)
  const error = ref('')

  let controller = null
  let timer = null
  let requestId = 0
  let disposed = false

  async function fetchCustomerCompanies() {
    if (disposed) return

    controller?.abort()

    const id = ++requestId
    const currentController = new AbortController()
    controller = currentController

    loading.value = true
    error.value = ''

    try {
      const { data } = await api.get('/rent/customer-companies', {
        params: {
          page: page.value,
          per_page: perPage.value,
          search: search.value || undefined,
        },
        signal: currentController.signal,
      })

      if (id !== requestId || currentController.signal.aborted) return

      rows.value = data.data
      meta.value = data.meta
    } catch (e) {
      if (id !== requestId || currentController.signal.aborted) return

      error.value = e.response?.data?.message || 'Failed to load companies. Please try again.'
    } finally {
      if (id === requestId && !disposed) {
        loading.value = false
        controller = null
      }
    }
  }

  watch(search, () => {
    clearTimeout(timer)

    timer = setTimeout(() => {
      if (page.value !== 1) {
        page.value = 1
      } else {
        fetchCustomerCompanies()
      }
    }, 350)
  })

  watch(perPage, () => {
    clearTimeout(timer)

    if (page.value !== 1) {
      page.value = 1
    } else {
      fetchCustomerCompanies()
    }
  })

  watch(page, fetchCustomerCompanies)

  onScopeDispose(() => {
    disposed = true
    clearTimeout(timer)
    controller?.abort()
    requestId++
  })

  return {
    rows,
    meta,
    search,
    page,
    perPage,
    loading,
    error,
    fetchCustomerCompanies,
  }
}

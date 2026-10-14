import { ref, watch } from 'vue'
import api from '@/api'

export function useCustomerCompanies() {
  const rows = ref([])
  const meta = ref({ current_page: 1, last_page: 1, total: 0, per_page: 50 })
  const search = ref('')
  const page = ref(1)
  const perPage = ref(50)
  const loading = ref(false)

  let controller = null
  let timer = null

  async function fetchCustomerCompanies() {
    controller?.abort()
    controller = new AbortController()
    loading.value = true

    try {
      const { data } = await api.get('/rent/customer-companies', {
        params: {
          page: page.value,
          per_page: perPage.value,
          search: search.value || undefined,
        },
        signal: controller.signal,
      })
      rows.value = data.data
      meta.value = data.meta
    } catch (e) {
      if (e.name !== 'CanceledError' && !e.message?.includes('canceled')) throw e
    } finally {
      loading.value = false
    }
  }

  watch(search, () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      page.value = 1
      fetchCustomerCompanies()
    }, 350)
  })

  watch(perPage, () => {
    page.value = 1
    fetchCustomerCompanies()
  })

  watch(page, fetchCustomerCompanies)

  return { rows, meta, search, page, perPage, loading, fetchCustomerCompanies }
}

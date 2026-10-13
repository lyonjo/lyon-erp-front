import { ref, watch } from 'vue'
import api from '@/api'

export function useCustomers() {
  const rows = ref([])
  const meta = ref({ current_page: 1, last_page: 1, total: 0, per_page: 15 })
  const search = ref('')
  const page = ref(1)
  const loading = ref(false)

  let controller = null
  let timer = null

  async function fetchCustomers() {
    controller?.abort()               // cancel the previous in-flight request
    controller = new AbortController()
    loading.value = true

    try {
      const { data } = await api.get('/rent/customers', {
        params: {
          page: page.value,
          per_page: meta.value.per_page,
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

  // Debounce typing, and go back to page 1 when the search changes
  watch(search, () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      page.value = 1
      fetchCustomers()
    }, 350)
  })

  watch(page, fetchCustomers)

  return { rows, meta, search, page, loading, fetchCustomers }
}

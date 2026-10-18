import { ref, watch, onScopeDispose } from 'vue'
import api from '@/api'

export function useAdminLogs() {
  const rows = ref([])
  const meta = ref({ current_page: 1, last_page: 1, per_page: 15, total: 0 })
  const search = ref('')
  const appliedSearch = ref('')
  const page = ref(1)
  const perPage = ref(15)
  const loading = ref(false)
  const error = ref('')

  let debounceTimer = null
  let controller = null
  let requestId = 0
  let disposed = false

  async function fetchAdminLogs() {
    if (disposed) return
    controller?.abort()

    const currentRequestId = ++requestId
    const currentController = new AbortController()
    controller = currentController
    loading.value = true
    error.value = ''

    try {
      const { data } = await api.get('/rent/admin-logs', {
        params: {
          page: page.value,
          per_page: perPage.value,
          search: appliedSearch.value || undefined,
        },
        signal: currentController.signal,
      })

      if (disposed || currentController.signal.aborted || currentRequestId !== requestId) return
      rows.value = Array.isArray(data.data) ? data.data : []
      meta.value = data.meta ?? { current_page: 1, last_page: 1, per_page: perPage.value, total: 0 }
    } catch (e) {
      if (disposed || currentController.signal.aborted || currentRequestId !== requestId) return
      error.value = e.response?.data?.message || 'Failed to load admin logs.'
      rows.value = []
    } finally {
      if (!disposed && currentRequestId === requestId) {
        loading.value = false
        controller = null
      }
    }
  }

  watch(search, (value) => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      // Batch the search term and page reset into one query-state update.
      page.value = 1
      appliedSearch.value = value.trim()
    }, 350)
  })

  watch(perPage, () => {
    page.value = 1
  }, { flush: 'sync' })

  watch([page, perPage, appliedSearch], fetchAdminLogs, { immediate: true })

  onScopeDispose(() => {
    disposed = true
    clearTimeout(debounceTimer)
    controller?.abort()
    requestId++
  })

  return { rows, meta, search, page, perPage, loading, error, fetchAdminLogs }
}

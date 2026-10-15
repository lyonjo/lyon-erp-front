import { ref, watch, onScopeDispose } from 'vue'
import api from '@/api'

export function useBlackList() {
  const rows = ref([])
  const meta = ref({
    current_page: 1,
    last_page: 1,
    per_page: 50,
    total: 0,
  })

  const search = ref('')
  const appliedSearch = ref('')
  const type = ref('all')
  const page = ref(1)
  const perPage = ref(50)
  const loading = ref(false)
  const error = ref('')

  let controller = null
  let timer = null
  let requestId = 0
  let disposed = false

  async function fetchBlackList() {
    if (disposed) return

    controller?.abort()

    const id = ++requestId
    const currentController = new AbortController()
    controller = currentController

    loading.value = true
    error.value = ''

    try {
      const { data } = await api.get('/rent/blacklist', {
        params: {
          page: page.value,
          per_page: perPage.value,
          search: appliedSearch.value || undefined,
          type: type.value,
        },
        signal: currentController.signal,
      })

      if (id !== requestId || currentController.signal.aborted) {
        return
      }

      rows.value = data.data ?? []
      meta.value = data.meta ?? {
        current_page: page.value,
        last_page: 1,
        per_page: perPage.value,
        total: rows.value.length,
      }
    } catch (e) {
      if (id !== requestId || currentController.signal.aborted) {
        return
      }

      error.value = e.response?.data?.message || 'Failed to load blacklisted records.'

      rows.value = []
    } finally {
      if (id === requestId && !disposed) {
        loading.value = false
        controller = null
      }
    }
  }

  // Debounce searching and reset pagination
  watch(search, (value) => {
    clearTimeout(timer)

    timer = setTimeout(() => {
      page.value = 1
      appliedSearch.value = value.trim()
    }, 350)
  })

  // Reset page when changing type or page size
  watch(
    [type, perPage],
    () => {
      page.value = 1
    },
    { flush: 'sync' },
  )

  // One fetch for each settled parameter change
  watch([page, perPage, type, appliedSearch], fetchBlackList, { immediate: true })

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
    type,
    page,
    perPage,
    loading,
    error,
    fetchBlackList,
  }
}

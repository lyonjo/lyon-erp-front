import { onScopeDispose, ref, watch, toValue } from 'vue'
import api from '@/api'

// Image requests go through Axios so X-Tenant-Domain is included even before login.
// A 404 (no tenant override) is expected; fallbackSrc stays visible.
export function useTenantLoginImage(slot, fallbackSrc, revision = ref(0)) {
  const src = ref('')
  const loading = ref(false)
  const custom = ref(false)
  const error = ref('')
  let controller = null
  let objectUrl = null
  let generation = 0
  let disposed = false

  function cleanup() {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    objectUrl = null
  }

  async function refresh() {
    const current = ++generation
    controller?.abort()
    cleanup()
    src.value = toValue(fallbackSrc) || ''
    custom.value = false
    error.value = ''
    const imageSlot = toValue(slot)
    if (!['logo', 'illustration'].includes(imageSlot) || disposed) return

    const next = new AbortController()
    controller = next
    loading.value = true
    try {
      const { data } = await api.get(`/login-branding/${imageSlot}?v=${Date.now()}`, {
        responseType: 'blob', signal: next.signal,
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (current !== generation || disposed || next.signal.aborted) return
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(data.type)) {
        throw new Error('Unsupported image response')
      }
      objectUrl = URL.createObjectURL(data)
      src.value = objectUrl
      custom.value = true
    } catch (e) {
      if (current !== generation || disposed || next.signal.aborted) return
      if (e?.response?.status !== 404) error.value = 'Could not load the tenant image.'
    } finally {
      if (current === generation && !disposed) {
        loading.value = false
        controller = null
      }
    }
  }

  watch(() => [toValue(slot), toValue(fallbackSrc), toValue(revision)], refresh, { immediate: true })
  onScopeDispose(() => {
    disposed = true
    generation += 1
    controller?.abort()
    cleanup()
  })

  return { src, loading, custom, error, refresh }
}

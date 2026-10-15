import { ref, watch, onScopeDispose, toValue } from 'vue'
import api from '@/api'

/**
 * Fetch an image through the authenticated Axios instance, rather than a
 * direct /storage URL (which cannot resolve tenant-specific storage).
 * `endpoint` may be a ref, a getter or a plain string.
 */
export function useProtectedImage(endpoint) {
  const imageUrl = ref('')
  const loading = ref(false)
  const error = ref('')

  let controller = null
  let objectUrl = null
  let requestId = 0
  let disposed = false

  function releaseUrl() {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    objectUrl = null
    imageUrl.value = ''
  }

  async function load() {
    controller?.abort()
    controller = null
    const id = ++requestId
    releaseUrl()
    error.value = ''

    const url = toValue(endpoint)
    if (!url || disposed) {
      loading.value = false
      return
    }

    const currentController = new AbortController()
    controller = currentController
    loading.value = true

    try {
      const { data } = await api.get(url, {
        responseType: 'blob',
        signal: currentController.signal,
      })

      if (disposed || id !== requestId || currentController.signal.aborted) return
      if (
        !(data instanceof Blob) ||
        !['image/jpeg', 'image/png', 'image/webp'].includes(data.type)
      ) {
        throw new Error('The server did not return a supported image.')
      }

      objectUrl = URL.createObjectURL(data)
      imageUrl.value = objectUrl
    } catch (e) {
      if (disposed || id !== requestId || currentController.signal.aborted) return
      error.value = e.response?.status === 404 ? 'Image not found' : 'Failed to load image'
    } finally {
      if (!disposed && id === requestId) {
        loading.value = false
        controller = null
      }
    }
  }

  watch(() => toValue(endpoint), load, { immediate: true })

  onScopeDispose(() => {
    disposed = true
    requestId++
    controller?.abort()
    releaseUrl()
  })

  return { imageUrl, loading, error, reload: load }
}

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import api from '@/api'
const props = defineProps({
  file: { type: Object, default: null },
  attachment: { type: Object, default: null },
  companyId: { type: [Number, String], default: null },
})
const thumbnail = ref('')
const loading = ref(false)
const error = ref('')
const opened = ref(false)
let activeUrl = ''
let sequence = 0
const imageMime = (mime) =>
  ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes((mime || '').toLowerCase())
const isImage = () => {
  const name = props.file?.name || props.attachment?.original_name || props.attachment?.name || ''
  return (
    imageMime(props.file?.type || props.attachment?.mime_type) ||
    /\.(png|jpe?g|webp|gif)$/i.test(name)
  )
}
function dispose() {
  if (activeUrl) URL.revokeObjectURL(activeUrl)
  activeUrl = ''
  thumbnail.value = ''
}
watch(
  () => [props.file, props.attachment?.id, props.companyId],
  async () => {
    const thisRequest = ++sequence
    opened.value = false
    error.value = ''
    dispose()
    if (!isImage()) return
    if (props.file) {
      activeUrl = URL.createObjectURL(props.file)
      thumbnail.value = activeUrl
      return
    }
    if (!props.attachment?.id || !props.companyId) return
    loading.value = true
    try {
      const response = await api.get(
        `/rent/customer-companies/${props.companyId}/attachments/${props.attachment.id}/download`,
        { responseType: 'blob' },
      )
      if (thisRequest !== sequence) return
      const blob = response.data
      if (!imageMime(blob.type) && !isImage()) return
      activeUrl = URL.createObjectURL(blob)
      thumbnail.value = activeUrl
    } catch (e) {
      if (thisRequest === sequence) error.value = e.response?.data?.message || 'Preview unavailable'
    } finally {
      if (thisRequest === sequence) loading.value = false
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  ++sequence
  dispose()
})
function close() {
  opened.value = false
}
</script>
<template>
  <div v-if="isImage()" class="image-preview">
    <button
      v-if="thumbnail"
      type="button"
      class="thumbnail-button"
      title="Click to zoom"
      @click="opened = true"
    >
      <img :src="thumbnail" alt="Attachment preview" class="thumbnail" />
      <span class="zoom-icon">⌕</span>
    </button>
    <span v-else-if="loading" class="preview-state">Loading image…</span>
    <span v-else-if="error" class="preview-state">{{ error }}</span>
    <Teleport to="body">
      <div
        v-if="opened && thumbnail"
        class="lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="Image preview"
        @click.self="close"
      >
        <button type="button" class="close-lightbox" aria-label="Close preview" @click="close">
          ×
        </button>
        <img :src="thumbnail" alt="Full size attachment" class="full-image" @click.stop />
      </div>
    </Teleport>
  </div>
</template>
<style scoped>
.image-preview {
  flex: 0 0 auto;
}
.thumbnail-button {
  position: relative;
  width: 72px;
  height: 60px;
  padding: 0;
  border: 1px solid #dbe2ea;
  border-radius: 8px;
  background: #f8fafc;
  cursor: zoom-in;
  overflow: hidden;
}
.thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.zoom-icon {
  position: absolute;
  right: 3px;
  bottom: 2px;
  background: rgba(0, 0, 0, 0.55);
  color: white;
  border-radius: 4px;
  padding: 0 5px;
  font-size: 16px;
}
.preview-state {
  font-size: 11px;
  color: #64748b;
}
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  background: rgba(8, 17, 32, 0.92);
  cursor: zoom-out;
}
.full-image {
  max-width: 94vw;
  max-height: 90vh;
  object-fit: contain;
  cursor: default;
}
.close-lightbox {
  position: absolute;
  top: 16px;
  right: 20px;
  border: 0;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  font-size: 32px;
  border-radius: 8px;
  min-width: 48px;
  min-height: 48px;
  cursor: pointer;
}
</style>

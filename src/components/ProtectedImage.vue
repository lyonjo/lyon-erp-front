<script setup>
import { toRef } from 'vue'
import { useProtectedImage } from '@/composables/useProtectedImage'

const props = defineProps({
  endpoint: { type: String, default: '' },
  alt: { type: String, default: '' },
})

const { imageUrl, loading, error } = useProtectedImage(toRef(props, 'endpoint'))
</script>

<template>
  <div class="protected-image">
    <img v-if="imageUrl" :src="imageUrl" :alt="alt" />
    <span v-else-if="loading" class="placeholder">Loading…</span>
    <span v-else-if="error" class="placeholder">Image unavailable</span>
    <span v-else class="placeholder">No image</span>
  </div>
</template>

<style scoped>
.protected-image {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}
.protected-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.placeholder {
  color: #9ca3af;
  font-size: 12px;
  text-align: center;
}
</style>

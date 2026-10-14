<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: File, default: null },
  label: { type: String, required: true },
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const MAX = 5 * 1024 * 1024
const input = ref(null)
const preview = ref('')
const localError = ref('')
const dragging = ref(false)

watch(
  () => props.modelValue,
  (file) => {
    if (preview.value) URL.revokeObjectURL(preview.value)
    preview.value = file ? URL.createObjectURL(file) : ''
  },
)
onBeforeUnmount(() => preview.value && URL.revokeObjectURL(preview.value))

function pick(file) {
  localError.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) return (localError.value = 'Images only')
  if (file.size > MAX) return (localError.value = 'Max size is 5MB')
  emit('update:modelValue', file)
}
function onChange(e) {
  pick(e.target.files[0])
  e.target.value = ''
}
function onDrop(e) {
  dragging.value = false
  pick(e.dataTransfer.files[0])
}
function clear() {
  localError.value = ''
  emit('update:modelValue', null)
}
</script>

<template>
  <div class="doc">
    <span class="doc-label"> {{ label }}<b v-if="required" class="req"> *</b> </span>

    <div
      class="drop"
      :class="{ dragging, invalid: error || localError, filled: preview }"
      @click="input.click()"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <img v-if="preview" :src="preview" alt="" />
      <template v-else>
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="#4f93b8"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
        </svg>
        <strong>Click or drop to upload</strong>
        <small>Images only. Max 5MB</small>
      </template>

      <button v-if="preview" type="button" class="remove" title="Remove" @click.stop="clear">
        ×
      </button>
    </div>

    <p v-if="localError || error" class="err">{{ localError || error }}</p>
    <input ref="input" type="file" accept="image/*" hidden @change="onChange" />
  </div>
</template>

<style scoped>
.doc {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.doc-label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.drop {
  position: relative;
  height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 1.5px dashed #cbd5e1;
  border-radius: 12px;
  background: #fafbfc;
  cursor: pointer;
  overflow: hidden;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.drop:hover,
.drop.dragging {
  border-color: #4f93b8;
  background: #f1f7fb;
}
.drop.invalid {
  border-color: #dc2626;
}
.drop.filled {
  border-style: solid;
  background: #fff;
}
.drop img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.drop strong {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
}
.drop small {
  font-size: 11px;
  color: #9ca3af;
}

.remove {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 50%;
  background: rgba(17, 24, 39, 0.75);
  color: #fff;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}
.remove:hover {
  background: #dc2626;
}
.err {
  margin: 0;
  font-size: 12px;
  color: #dc2626;
}
.req {
  color: #dc2626;
}
</style>
